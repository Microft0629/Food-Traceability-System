// Pinia store：钱包状态、合约实例、角色
import { defineStore } from "pinia";
import { ref } from "vue";

export const useContractStore = defineStore("contract", () => {
  // ========== 钱包连接状态 ==========
  const account = ref(null); // 当前用户钱包地址，如 0x1234...
  const chainId = ref(null); // 当前连接的链 ID
  const provider = ref(null); // 读数据的通道
  const signer = ref(null); // 写数据的通道（需要签名）
  const isConnected = ref(false); // 是否已连接钱包

  // ========== 合约相关 ==========
  const contract = ref(null); // 合约实例（遥控器）
  const isProducer = ref(false); // 当前用户是不是生产商

  // ========== 修改数据的方法 ==========
  function setAccount(addr) {
    account.value = addr;
    isConnected.value = !!addr;
  }

  function setChainId(id) {
    chainId.value = id;
  }

  function setProvider(p) {
    provider.value = p;
  }

  function setSigner(s) {
    signer.value = s;
  }

  function setContract(c) {
    contract.value = c;
  }

  function setIsProducer(val) {
    isProducer.value = val;
  }

  // 重置所有状态（断开钱包时用）
  function reset() {
    account.value = null;
    chainId.value = null;
    provider.value = null;
    signer.value = null;
    isConnected.value = false;
    contract.value = null;
    isProducer.value = false;
  }

  // ========== 导出 ==========
  return {
    account,
    chainId,
    provider,
    signer,
    isConnected,
    contract,
    isProducer,
    setAccount,
    setChainId,
    setProvider,
    setSigner,
    setContract,
    setIsProducer,
    reset,
  };
});
// Pinia store：钱包状态、合约实例、角色
