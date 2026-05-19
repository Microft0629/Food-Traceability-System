// 合约交互 composable：封装 ethers.js 与食品溯源合约的全部读写操作
// readContract 走 JsonRpcProvider 直连 Ganache（无需 MetaMask）
// writeContract 走 MetaMask signer（需用户签名确认交易）

import { ethers } from "ethers";
import contractABI from "../contractABI.json";
import { useContractStore } from "../stores/contract";

// ========== 环境配置常量 ==========
const CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const API_BASE = "http://localhost:8080/api";
const GANACHE_RPC = "http://127.0.0.1:8545";
const CHAIN_ID = 31337;

// ========== 内部辅助函数 ==========

// 创建直连 Ganache 的只读 JSON-RPC 提供者
function createReadProvider() {
  return new ethers.JsonRpcProvider(GANACHE_RPC, CHAIN_ID, { staticNetwork: true });
}

// 创建只读合约实例（用于 view 调用，无需签名）
function createReadContract(provider) {
  const p = provider || createReadProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI, p);
}

// 将 MetaMask 切换到 Ganache 网络（switch 失败则 add）
async function ensureGanacheNetwork() {
  const chainIdHex = "0x" + CHAIN_ID.toString(16); // 0x7A69
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: chainIdHex,
          chainName: "Ganache Local",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [GANACHE_RPC],
          blockExplorerUrls: null,
        }],
      });
    }
  }
}

// 从交易收据日志中解析 ProductRegistered 事件的 product_id
function parseProductIdFromReceipt(receipt) {
  const iface = new ethers.Interface(contractABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === "ProductRegistered") {
        return parsed.args.product_id;
      }
    } catch (e) { /* 跳过不匹配的日志 */ }
  }
  throw new Error("交易收据中未找到 ProductRegistered 事件");
}

// 执行写操作：用 MetaMask signer 发起交易
async function executeWrite(txFn) {
  const store = useContractStore();
  if (!store.writeContract || !store.account) {
    throw new Error("请先连接钱包");
  }
  return await txFn(store.writeContract);
}

// ========== 导出函数 ==========

// 初始化合约实例：创建 readContract（只读）和 writeContract（MetaMask 签名）
export async function initContract() {
  const store = useContractStore();
  if (!window.ethereum) throw new Error("请先安装 MetaMask");

  await ensureGanacheNetwork();

  const browserProvider = new ethers.BrowserProvider(window.ethereum);
  const signer = await browserProvider.getSigner();
  const provider = createReadProvider();
  const readContract = createReadContract(provider);
  const writeContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
  const network = await provider.getNetwork();

  store.setBrowserProvider(browserProvider);
  store.setProvider(provider);
  store.setSigner(signer);
  store.setReadContract(readContract);
  store.setWriteContract(writeContract);
  store.setChainId(Number(network.chainId));

  console.log("合约初始化成功！");
  return { readContract, writeContract };
}

// 连接 MetaMask 钱包并初始化合约
export async function connectWallet() {
  if (!window.ethereum) {
    alert("请先安装 MetaMask 钱包！");
    return null;
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
  const account = accounts[0];
  const chainId = parseInt(chainIdHex, 16);

  const store = useContractStore();
  store.setAccount(account);
  store.setChainId(chainId);
  console.log("钱包已连接：", account, "| 链 ID:", chainId);

  await initContract();
  return account;
}

// 查询指定地址是否为已注册的生产商
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

// 产品注册混合三步流程：后端预处理 → 合约注册 → 后端入库
export async function registerProductFlow(name, detail) {
  // 步骤 1：后端计算 SHA-256 数据哈希
  const preResponse = await fetch(`${API_BASE}/prepare-add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, detail }),
  });
  if (!preResponse.ok) throw new Error("预处理请求失败");
  const { data_hash } = await preResponse.json();

  // 步骤 2：合约写入（MetaMask 签名）
  const store = useContractStore();
  const result = await executeWrite(async (contract) => {
    const tx = await contract.register_product(name, data_hash, detail);
    const receipt = await tx.wait();
    const productId = parseProductIdFromReceipt(receipt);
    console.log("产品 ID：", productId, "| 交易哈希：", tx.hash);
    return { txHash: tx.hash, productId };
  });

  // 步骤 3：元数据存入 MySQL
  const saveResponse = await fetch(`${API_BASE}/save-after-chain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name, detail, data_hash,
      product_id_on_chain: Number(result.productId),
      tx_hash: result.txHash,
      producer_wallet: store.account,
    }),
  });
  if (!saveResponse.ok) throw new Error("入库失败");

  console.log("产品信息已存入数据库");
  return { txHash: result.txHash, productId: result.productId };
}

// 为产品添加溯源记录（哈希 = SHA-256(productId + description + 时间戳)）
export async function addRecord(productId, description) {
  const content = `${productId}:${description}:${Date.now()}`;
  const dataHash = ethers.sha256(ethers.toUtf8Bytes(content));

  const result = await executeWrite(async (contract) => {
    const tx = await contract.add_record(productId, dataHash, description);
    console.log("记录已添加，交易哈希：", tx.hash);
    const receipt = await tx.wait();
    return { txHash: tx.hash, receipt, dataHash };
  });

  // 通知后端更新产品 updated_at
  fetch(`${API_BASE}/update-product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id_on_chain: productId }),
  }).catch((e) => console.warn("更新时间戳失败（不影响主流程）:", e));

  return result;
}

// 查询产品完整信息与溯源记录（view 调用，无需钱包）
export async function queryProduct(productId) {
  const store = useContractStore();
  const contract = store.readContract || createReadContract();
  return await contract.get_product(productId);
}

// 管理员：将指定地址添加为生产商
export async function addProducer(address) {
  return await executeWrite(async (contract) => {
    const tx = await contract.add_producer(address);
    await tx.wait();
    return { txHash: tx.hash };
  });
}

// 管理员：移除指定地址的生产商权限
export async function removeProducer(address) {
  return await executeWrite(async (contract) => {
    const tx = await contract.remove_producer(address);
    await tx.wait();
    return { txHash: tx.hash };
  });
}

// 获取合约 owner 地址（管理员身份验证）
export async function getOwner() {
  const store = useContractStore();
  const contract = store.readContract || createReadContract();
  return await contract.owner();
}

// 获取全部已注册产品列表（ID + 名称 + 生产商）
export async function fetchAllProducts() {
  const store = useContractStore();
  const contract = store.readContract || createReadContract();
  const count = Number(await contract.get_product_count());
  if (count === 0) return [];

  const promises = [];
  for (let i = 1; i <= count; i++) promises.push(contract.products(i));
  const results = await Promise.all(promises);
  return results.map((p, idx) => ({
    id: idx + 1,
    name: p.name || p[1],
    producer: p.producer || p[2],
  }));
}

// 获取指定生产商地址注册的全部产品列表
export async function fetchProducerProducts(producerAddress) {
  const all = await fetchAllProducts();
  return all.filter((p) => p.producer.toLowerCase() === producerAddress.toLowerCase());
}

// 重新导出错误翻译函数
export { translateError } from "../utils/errors.js";
