// 合约交互工具函数（读/写/事件）
import {
  createPublicClient,
  createWalletClient,
  custom,
  getContract,
  parseAbi,
  defineChain,
  decodeEventLog,
} from "viem";
import contractABI from "../contractABI.json";
import { useContractStore } from "../stores/contract";

// 自定义 Ganache 链
export const ganache = defineChain({
  id: 1337,
  name: "Ganache Local",
  network: "ganache",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    public: { http: ["http://127.0.0.1:7545"] },
    default: { http: ["http://127.0.0.1:7545"] },
  },
});

// 合约地址（与部署后地址一致）
const CONTRACT_ADDRESS = "0x3Ad438090D6CA3c26f2e4C4c2E7833066B87e709";

// 后端 API 基础地址
const API_BASE = "http://localhost:8080/api";

// ========== 辅助函数：从交易收据中解析 product_id ==========
function parseProductIdFromReceipt(receipt) {
  // 事件签名：ProductRegistered(uint256,string,address)
  const eventSignature = "ProductRegistered(uint256,string,address)";
  // 也可以用 viem 的 decodeEventLog，这里简单遍历 logs
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: contractABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "ProductRegistered") {
        return decoded.args.product_id; // 注意参数名与合约一致
      }
    } catch (e) {
      // 跳过非目标事件
    }
  }
  throw new Error("交易收据中未找到 ProductRegistered 事件");
}

// ========== 1. 初始化合约实例（不变） ==========
export async function initContract() {
  try {
    const store = useContractStore();

    if (!window.ethereum) {
      console.error("请先安装 MetaMask");
      return null;
    }

    const publicClient = createPublicClient({
      transport: custom(window.ethereum),
    });

    const walletClient = createWalletClient({
      transport: custom(window.ethereum),
    });

    const chainId = await walletClient.getChainId();

    const contractInstance = getContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });

    store.setContract(contractInstance);
    store.setProvider(publicClient);
    store.setSigner(walletClient);
    store.setChainId(chainId);

    console.log("合约初始化成功！");
    return contractInstance;
  } catch (error) {
    console.error("合约初始化失败：", error);
    return null;
  }
}

// ========== 2. 连接钱包（不变） ==========
export async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("请先安装 MetaMask 钱包！");
      return null;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const chainIdHex = await window.ethereum.request({
      method: "eth_chainId",
    });

    const account = accounts[0];
    const chainId = parseInt(chainIdHex, 16);

    const store = useContractStore();
    store.setAccount(account);
    store.setChainId(chainId);

    console.log("钱包已连接：", account);

    await initContract();
    return account;
  } catch (error) {
    console.error("连接钱包失败：", error);
    return null;
  }
}

// ========== 3. 检查生产商（不变） ==========
export async function isProducer(address) {
  try {
    const store = useContractStore();
    const contract = store.contract;
    if (!contract) return false;

    const result = await contract.read.producers([address]);
    store.setIsProducer(result);
    return result;
  } catch (error) {
    console.error("查询生产商失败：", error);
    return false;
  }
}

// ========== 4. 核心：完整的产品注册流程（混合架构） ==========
export async function registerProductFlow(name, detail) {
  try {
    // ---------- 第一步：调用后端预处理接口 ----------
    const preResponse = await fetch(`${API_BASE}/prepare-add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, detail }),
    });

    if (!preResponse.ok) {
      throw new Error("预处理请求失败");
    }

    const { data_hash, business_no } = await preResponse.json();
    console.log("预处理成功，哈希：", data_hash, "业务编号：", business_no);

    // ---------- 第二步：调用合约注册（新接口三个参数） ----------
    const store = useContractStore();
    if (!store.contract || !store.signer || !store.account) {
      throw new Error("合约未初始化或钱包未连接");
    }

    // 调用修改后的 register_product(name, dataHash, description)
    const txHash = await store.contract.write.register_product(
      [name, data_hash, "初始记录"], // description 可先写“初始记录”
      {
        account: store.account,
        chain: ganache,
      },
    );
    console.log("交易已发送，哈希：", txHash);

    // 等待交易确认
    const receipt = await store.provider.waitForTransactionReceipt({
      hash: txHash,
    });

    // 从事件中解析出 product_id
    const productId = parseProductIdFromReceipt(receipt);
    console.log("产品 ID：", productId);

    // ---------- 第三步：调用后端入库接口 ----------
    const saveResponse = await fetch(`${API_BASE}/save-after-chain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_no,
        name,
        detail,
        data_hash,
        product_id_on_chain: Number(productId), // 转为普通数字
        tx_hash: txHash,
        producer_wallet: store.account,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error("入库失败");
    }

    console.log("产品信息已存入数据库");
    return { txHash, productId, business_no };
  } catch (error) {
    console.error("注册流程失败：", error);
    throw error;
  }
}

// ========== 5. 添加后续流转记录（不变，但参数名需注意） ==========
export async function addRecord(productId, dataHash, description) {
  try {
    const store = useContractStore();
    if (!store.contract || !store.signer || !store.account) {
      throw new Error("合约未初始化或钱包未连接");
    }

    const txHash = await store.contract.write.add_record(
      [productId, dataHash, description],
      {
        account: store.account,
        chain: ganache,
      },
    );
    console.log("记录已添加，交易哈希：", txHash);

    const receipt = await store.provider.waitForTransactionReceipt({
      hash: txHash,
    });
    return { txHash, receipt };
  } catch (error) {
    console.error("添加记录失败：", error);
    throw error;
  }
}

// ========== 6. 查询产品信息（不变） ==========
export async function queryProduct(productId) {
  try {
    const store = useContractStore();
    if (!store.contract) return null;

    const result = await store.contract.read.get_product(BigInt(productId));
    return result;
  } catch (error) {
    console.error("查询产品失败：", error);
    throw error;
  }
}

// ========== 7. 添加生产商（管理员操作，不变） ==========
export async function addProducer(address) {
  try {
    const store = useContractStore();
    if (!store.contract || !store.signer || !store.account) {
      throw new Error("合约未初始化或钱包未连接");
    }

    const txHash = await store.contract.write.add_producer([address], {
      account: store.account,
      chain: ganache,
    });
    const receipt = await store.provider.waitForTransactionReceipt({
      hash: txHash,
    });
    return { txHash, receipt };
  } catch (error) {
    console.error("添加生产商失败：", error);
    throw error;
  }
}

// ========== 8. 移除生产商（不变） ==========
export async function removeProducer(address) {
  try {
    const store = useContractStore();
    if (!store.contract || !store.signer || !store.account) {
      throw new Error("合约未初始化或钱包未连接");
    }

    const txHash = await store.contract.write.remove_producer([address], {
      account: store.account,
      chain: ganache,
    });
    const receipt = await store.provider.waitForTransactionReceipt({
      hash: txHash,
    });
    return { txHash, receipt };
  } catch (error) {
    console.error("移除生产商失败：", error);
    throw error;
  }
}
