/**
 * Pinia 合约状态管理
 * 管理钱包连接、ethers.js 合约实例（读写分离）与生产商角色状态
 * - readContract：JsonRpcProvider，用于 view/pure 读调用，无须签名
 * - writeContract：MetaMask signer，用于写交易
 *
 * 注意：ethers.js 的 Contract / Signer / Provider 实例内部使用 Proxy，
 * 必须用 shallowRef 存储，避免 Vue 的深层响应式代理与 ethers Proxy 冲突
 * （否则会报 "Receiver must be an instance of class anonymous"）
 */
import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";

export const useContractStore = defineStore("contract", () => {
  // ========== 响应式状态 ==========
  const account = ref(null); // 当前 MetaMask 钱包地址（简单值，可用 ref）
  const chainId = ref(null); // 当前连接的链 ID (31337 = Ganache/Hardhat 本地链)
  // 以下为 ethers.js 对象，内部含 Proxy，必须用 shallowRef
  const browserProvider = shallowRef(null); // ethers.BrowserProvider
  const provider = shallowRef(null); // ethers.JsonRpcProvider — 只读 JSON-RPC
  const signer = shallowRef(null); // ethers.JsonRpcSigner — 可签名交易
  const isConnected = ref(false); // 是否已连接钱包
  const readContract = shallowRef(null); // ethers.Contract (provider) — 只读查询
  const writeContract = shallowRef(null); // ethers.Contract (signer) — 写交易
  const isProducer = ref(false); // 当前钱包地址是否为生产商

  // ========== 状态写入方法 ==========

  function setAccount(addr) {
    account.value = addr;
    isConnected.value = !!addr;
  }

  function setChainId(id) {
    chainId.value = id;
  }

  function setBrowserProvider(bp) {
    browserProvider.value = bp;
  }

  function setProvider(p) {
    provider.value = p;
  }

  function setSigner(s) {
    signer.value = s;
  }

  function setReadContract(c) {
    readContract.value = c;
  }

  function setWriteContract(c) {
    writeContract.value = c;
  }

  function setIsProducer(val) {
    isProducer.value = val;
  }

  /** 重置所有状态 — 断开钱包时调用 */
  function reset() {
    account.value = null;
    chainId.value = null;
    browserProvider.value = null;
    provider.value = null;
    signer.value = null;
    isConnected.value = false;
    readContract.value = null;
    writeContract.value = null;
    isProducer.value = false;
  }

  return {
    account,
    chainId,
    browserProvider,
    provider,
    signer,
    isConnected,
    readContract,
    writeContract,
    isProducer,
    setAccount,
    setChainId,
    setBrowserProvider,
    setProvider,
    setSigner,
    setReadContract,
    setWriteContract,
    setIsProducer,
    reset,
  };
});
