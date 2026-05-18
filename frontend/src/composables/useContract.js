/**
 * 合约交互 composable：封装 ethers.js 与食品溯源合约的全部读写操作
 * - 钱包连接 / 合约初始化（读写实例分离）
 * - 生产商注册产品（链上 + 后端混合三步流程）
 * - 添加溯源记录 / 查询产品 / 管理生产商权限
 *
 * 设计要点：
 * - readContract 走 JsonRpcProvider 直连 Ganache（无需 MetaMask）
 * - writeContract 优先用 MetaMask signer；若 MetaMask 网络不通则回退到
 *   Ganache 本地 Wallet 直接签名（devSigner，用于本地开发）
 */
import { ethers } from "ethers";
import contractABI from "../contractABI.json";
import { useContractStore } from "../stores/contract";

// ========== 环境配置常量 ==========
const CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const API_BASE = "http://localhost:8080/api";
// 使用 127.0.0.1:8545（直连 IPv4，避免 localhost → IPv6 解析导致 MetaMask 无法连接）
// 链 ID 31337 与 MetaMask 内置 "Localhost 8545" 网络一致
const GANACHE_RPC = "http://127.0.0.1:8545";
const CHAIN_ID = 31337;

// Ganache 本地测试账户私钥（来自 blockchain/.env 中的 PRIVATE_KEY）
// 仅开发环境使用，用于 MetaMask 不可用时的直接签名兜底
const DEV_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// ========== 内部辅助函数 ==========

/**
 * 创建直连 Ganache 的只读合约实例
 * 用于所有 view/pure 函数调用，不经过 MetaMask
 */
function createReadProvider() {
  return new ethers.JsonRpcProvider(GANACHE_RPC, CHAIN_ID, {
    staticNetwork: true,
  });
}

function createReadContract(provider) {
  const p = provider || createReadProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI, p);
}

/**
 * 创建 Ganache 本地钱包（使用开发私钥直接签名，无需 MetaMask）
 * 作为 MetaMask 不可用时的兜底写通道
 */
function createDevSigner(provider) {
  const p = provider || createReadProvider();
  return new ethers.Wallet(DEV_PRIVATE_KEY, p);
}

/**
 * 尝试将 MetaMask 切换到 Ganache 本地网络
 * 先尝试 switch，若失败（网络不存在）则 add
 */
async function ensureGanacheNetwork() {
  const chainIdHex = "0x" + CHAIN_ID.toString(16); // 31337 -> 0x7A69
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    console.log("MetaMask 已切换到 Ganache 网络");
  } catch (switchError) {
    if (switchError.code === 4902) {
      // 网络不存在，添加它
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: "Ganache Local",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [GANACHE_RPC],
            blockExplorerUrls: null,
          },
        ],
      });
      console.log("MetaMask 已添加并切换到 Ganache 网络");
    } else {
      console.warn(
        "MetaMask 网络切换失败，将使用本地钱包兜底:",
        switchError.message,
      );
    }
  }
}

/**
 * 从交易收据的日志中解析 ProductRegistered 事件的 product_id
 */
function parseProductIdFromReceipt(receipt) {
  const iface = new ethers.Interface(contractABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === "ProductRegistered") {
        return parsed.args.product_id;
      }
    } catch (e) {
      // 跳过不匹配的日志
    }
  }
  throw new Error("交易收据中未找到 ProductRegistered 事件");
}

/**
 * 尝试使用 MetaMask signer 执行写操作；若失败则回退到 devSigner
 * @param {Function} txFn — 接受合约实例，返回交易 promise
 */
async function executeWrite(txFn) {
  const store = useContractStore();

  if (!store.account) {
    throw new Error("请先连接钱包");
  }

  // 优先尝试 MetaMask writeContract
  if (store.writeContract) {
    try {
      return await txFn(store.writeContract);
    } catch (metaError) {
      // 如果是网络 fetch 错误，回退到本地钱包
      if (metaError.message && metaError.message.includes("Failed to fetch")) {
        console.warn("MetaMask RPC 不可达，回退到 Ganache 本地钱包直接签名");
      } else {
        throw metaError; // 其他错误（如合约 revert）直接抛出
      }
    }
  }

  // 兜底：使用 Ganache 本地钱包直接签名
  const provider = store.provider || createReadProvider();
  const devSigner = createDevSigner(provider);
  const devContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractABI,
    devSigner,
  );
  return await txFn(devContract);
}

// ========== 导出函数 ==========

/**
 * 初始化合约实例
 * - readContract：JsonRpcProvider 直连，用于所有查询
 * - writeContract：MetaMask signer，用于写交易
 * - provider + devWriteContract：Ganache 本地钱包兜底
 */
export async function initContract() {
  try {
    const store = useContractStore();

    if (!window.ethereum) {
      // 无 MetaMask 时，仍然创建只读合约 + 本地钱包写入
      console.warn("未检测到 MetaMask，使用 Ganache 本地钱包模式");
      const provider = createReadProvider();
      const readContract = createReadContract(provider);
      const devSigner = createDevSigner(provider);
      const writeContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractABI,
        devSigner,
      );
      store.setProvider(provider);
      store.setReadContract(readContract);
      store.setWriteContract(writeContract);
      store.setChainId(CHAIN_ID);
      console.log("本地钱包模式初始化成功！");
      return { readContract, writeContract };
    }

    // 尝试将 MetaMask 切换到 Ganache 网络
    await ensureGanacheNetwork();

    // 创建 MetaMask 提供者与签名者
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await browserProvider.getSigner();

    // 创建 JSON-RPC 提供者与只读合约
    const provider = createReadProvider();
    const readContract = createReadContract(provider);

    // 创建可写合约（MetaMask signer）
    const writeContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      contractABI,
      signer,
    );

    const network = await provider.getNetwork();

    store.setBrowserProvider(browserProvider);
    store.setProvider(provider);
    store.setSigner(signer);
    store.setReadContract(readContract);
    store.setWriteContract(writeContract);
    store.setChainId(Number(network.chainId));

    console.log("合约初始化成功！（MetaMask + 本地钱包双通道）");
    return { readContract, writeContract };
  } catch (error) {
    console.error("合约初始化失败：", error);
    throw error;
  }
}

/**
 * 连接 MetaMask 钱包并初始化合约
 */
export async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("未检测到 MetaMask！将使用 Ganache 本地钱包模式。");
      await initContract();
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

    console.log("钱包已连接：", account, "| 链 ID:", chainId);

    await initContract();
    return account;
  } catch (error) {
    console.error("连接钱包失败：", error);
    // 即使 MetaMask 连接失败，也尝试本地钱包模式
    try {
      await initContract();
    } catch (e) {
      console.error("本地钱包模式也失败：", e);
    }
    return null;
  }
}

/**
 * 查询指定地址是否为已注册的生产商（readContract 直连，无需钱包）
 */
export async function isProducer(address) {
  try {
    const store = useContractStore();
    const contract = store.readContract || createReadContract();
    const result = await contract.producers(address);
    store.setIsProducer(result);
    return result;
  } catch (error) {
    console.error("查询生产商失败：", error);
    return false;
  }
}

/**
 * 【核心】产品注册混合三步流程
 */
export async function registerProductFlow(name, detail) {
  try {
    // ---------- 步骤 1：后端预处理 ----------
    const preResponse = await fetch(`${API_BASE}/prepare-add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, detail }),
    });

    if (!preResponse.ok) throw new Error("预处理请求失败");
    const { data_hash } = await preResponse.json();
    console.log("预处理成功，哈希：", data_hash);

    // ---------- 步骤 2：合约写入（自动选择 MetaMask 或本地钱包） ----------
    const store = useContractStore();
    const result = await executeWrite(async (contract) => {
      // 初始记录的描述使用产品的详细描述文本，消费者可直观查看
      const tx = await contract.register_product(name, data_hash, detail);
      console.log("交易已发送，哈希：", tx.hash);
      const receipt = await tx.wait();
      const productId = parseProductIdFromReceipt(receipt);
      console.log("产品 ID：", productId);
      return { txHash: tx.hash, productId };
    });

    // ---------- 步骤 3：后端入库 ----------
    const saveResponse = await fetch(`${API_BASE}/save-after-chain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        detail,
        data_hash,
        product_id_on_chain: Number(result.productId),
        tx_hash: result.txHash,
        producer_wallet: store.account || DEV_PRIVATE_KEY,
      }),
    });

    if (!saveResponse.ok) throw new Error("入库失败");
    console.log("产品信息已存入数据库");
    return { txHash: result.txHash, productId: result.productId };
  } catch (error) {
    console.error("注册流程失败：", error);
    throw error;
  }
}

/**
 * 为已有产品添加溯源记录
 */
/**
 * 为已有产品添加一条溯源记录
 * 数据哈希自动计算：SHA-256(productId + description + 毫秒时间戳)
 * 确保每条记录的哈希唯一，用于后续链上链下数据校验
 */
export async function addRecord(productId, description) {
  try {
    // 自动生成唯一数据哈希
    const content = `${productId}:${description}:${Date.now()}`;
    const dataHash = ethers.sha256(ethers.toUtf8Bytes(content));

    const result = await executeWrite(async (contract) => {
      const tx = await contract.add_record(productId, dataHash, description);
      console.log("记录已添加，交易哈希：", tx.hash, "| 数据哈希：", dataHash);
      const receipt = await tx.wait();
      return { txHash: tx.hash, receipt, dataHash };
    });

    // 链上成功后，通知后端更新产品的时间戳
    fetch(`${API_BASE}/update-product`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id_on_chain: productId }),
    }).catch((e) => console.warn("更新时间戳失败（不影响主流程）:", e));

    return result;
  } catch (error) {
    console.error("添加记录失败：", error);
    throw error;
  }
}

/**
 * 查询产品信息与溯源记录（readContract 直连，无需钱包）
 */
export async function queryProduct(productId) {
  try {
    const store = useContractStore();
    const contract = store.readContract || createReadContract();
    const result = await contract.get_product(productId);
    return result;
  } catch (error) {
    console.error("查询产品失败：", error);
    throw error;
  }
}

/**
 * 管理员：添加生产商
 */
export async function addProducer(address) {
  try {
    return await executeWrite(async (contract) => {
      const tx = await contract.add_producer(address);
      console.log("add_producer 交易已发送，哈希：", tx.hash);
      const receipt = await tx.wait();
      return { txHash: tx.hash, receipt };
    });
  } catch (error) {
    console.error("添加生产商失败：", error);
    throw error;
  }
}

/**
 * 管理员：移除生产商
 */
export async function removeProducer(address) {
  try {
    return await executeWrite(async (contract) => {
      const tx = await contract.remove_producer(address);
      console.log("remove_producer 交易已发送，哈希：", tx.hash);
      const receipt = await tx.wait();
      return { txHash: tx.hash, receipt };
    });
  } catch (error) {
    console.error("移除生产商失败：", error);
    throw error;
  }
}

/**
 * 获取合约 owner 地址（管理员身份验证用）
 */
export async function getOwner() {
  try {
    const store = useContractStore();
    const contract = store.readContract || createReadContract();
    return await contract.owner();
  } catch (error) {
    console.error("获取合约 owner 失败：", error);
    return null;
  }
}

/**
 * 获取全部已注册产品列表（ID + 名称）
 * 遍历 1..(next_product_id - 1)，批量读取 products 映射
 */
export async function fetchAllProducts() {
  try {
    const store = useContractStore();
    const contract = store.readContract || createReadContract();
    const count = Number(await contract.get_product_count());
    if (count === 0) return [];

    // 并行查询所有产品
    const promises = [];
    for (let i = 1; i <= count; i++) {
      promises.push(contract.products(i));
    }
    const results = await Promise.all(promises);
    return results.map((p, idx) => ({
      id: idx + 1,
      name: p.name || p[1],
      producer: p.producer || p[2],
    }));
  } catch (error) {
    console.error("获取产品列表失败：", error);
    return [];
  }
}

/**
 * 获取指定生产商注册的全部产品列表
 * 调用 fetchAllProducts 后按 producer 地址过滤
 */
export async function fetchProducerProducts(producerAddress) {
  try {
    const all = await fetchAllProducts();
    return all.filter(
      (p) => p.producer.toLowerCase() === producerAddress.toLowerCase(),
    );
  } catch (error) {
    console.error("获取生产商产品列表失败：", error);
    return [];
  }
}

// 重新导出错误翻译函数，方便 Vue 组件直接引用
export { translateError } from "../utils/errors.js";
