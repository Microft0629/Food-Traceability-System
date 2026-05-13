// 钱包连接按钮组件
<!-- src/components/ConnectWallet.vue -->
<template>
  <button class="btn" :class="{ 'btn-outline': !account, 'btn-primary': account }" @click="handleConnect" :disabled="loading">
    {{ buttonText }}
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import { connectWallet } from '../composables/useContract'
import { useContractStore } from '../stores/contract'

const store = useContractStore()
const loading = ref(false)

// 从 store 中获取当前钱包地址
const account = computed(() => store.account)

// 按钮显示文字
const buttonText = computed(() => {
  if (loading.value) return '连接中...'
  if (account.value) {
    const addr = account.value
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }
  return '连接钱包'
})

const handleConnect = async () => {
  if (loading.value) return
  loading.value = true
  try {
    await connectWallet()   // 调用高中倩写的 connectWallet 函数
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
</style>// 钱包连接按钮组件
