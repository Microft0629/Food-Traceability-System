<!--
  钱包连接按钮：调用 MetaMask 连接钱包，连接后显示缩短的地址
-->
<template>
  <button
    class="btn"
    :class="{ 'btn-outline': !account, 'btn-primary': account }"
    @click="handleConnect"
    :disabled="loading"
  >
    {{ buttonText }}
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import { connectWallet } from '../composables/useContract'
import { useContractStore } from '../stores/contract'

const store = useContractStore()
const loading = ref(false) // 连接进行中标识，防止重复点击

// 从 store 中读取当前钱包地址（响应式）
const account = computed(() => store.account)

// 根据连接状态动态切换按钮文本：未连接/连接中/已连接显示缩短地址
const buttonText = computed(() => {
  if (loading.value) return '连接中...'
  if (account.value) {
    const addr = account.value
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }
  return '连接钱包'
})

// 点击按钮触发钱包连接流程
const handleConnect = async () => {
  if (loading.value) return
  loading.value = true
  try {
    await connectWallet()
  } catch (error) {
    console.error('连接钱包失败', error)
    alert('连接钱包失败，请确保已安装 MetaMask')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.btn {
  min-width: 130px;
}
</style>
