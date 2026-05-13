<template>
  <div class="admin-panel">
    <div class="admin-container">
      <h1>管理员面板</h1>

      <!-- 钱包连接状态 -->
      <div class="wallet-status">
        <ConnectWallet />
      </div>

      <!-- 管理员验证 -->
      <div v-if="!isWalletConnected" class="warning-message">
        ⚠️ 请先连接钱包
      </div>
      <div v-else-if="!isAdmin && !isLoadingAdmin" class="warning-message">
        ⚠️ 当前钱包地址不是管理员，无法使用管理功能
      </div>

      <!-- 管理功能（仅管理员可见） -->
      <div v-if="isAdmin && isWalletConnected" class="admin-content">
        <!-- 添加生产商 -->
        <div class="action-card">
          <h3>添加生产商</h3>
          <div class="action-form">
            <input
              v-model="addProducerAddress"
              type="text"
              placeholder="请输入生产商钱包地址"
              class="address-input"
            />
            <button
              @click="handleAddProducer"
              :disabled="isAddingProducer"
              class="action-btn add-btn"
            >
              {{ isAddingProducer ? "添加中..." : "添加生产商" }}
            </button>
          </div>
        </div>

        <!-- 移除生产商 -->
        <div class="action-card">
          <h3>移除生产商</h3>
          <div class="action-form">
            <input
              v-model="removeProducerAddress"
              type="text"
              placeholder="请输入生产商钱包地址"
              class="address-input"
            />
            <button
              @click="handleRemoveProducer"
              :disabled="isRemovingProducer"
              class="action-btn remove-btn"
            >
              {{ isRemovingProducer ? "移除中..." : "移除生产商" }}
            </button>
          </div>
        </div>

        <!-- 提示信息 -->
        <div v-if="message" :class="['message', messageType]">
          {{ message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
// 只导入 useContractStore，不导入 getOwner
import { addProducer, removeProducer } from "@/composables/useContract";
import ConnectWallet from "@/components/ConnectWallet.vue";
import { useContractStore } from "@/stores/contract";

const contractStore = useContractStore();

const addProducerAddress = ref("");
const removeProducerAddress = ref("");
const isAddingProducer = ref(false);
const isRemovingProducer = ref(false);
const isAdmin = ref(false);
const isLoadingAdmin = ref(false);
const message = ref("");
const messageType = ref("success");
const contractOwner = ref(null);

// 注意：store 中使用的是 account 字段，不是 address
const isWalletConnected = computed(() => {
  return contractStore.isConnected && contractStore.account;
});

// 获取合约 owner（直接从合约读取，不依赖 getOwner）
const fetchOwner = async () => {
  try {
    const contract = contractStore.contract;
    if (!contract) {
      console.error("合约未初始化");
      return null;
    }

    // 直接调用合约的 owner() 方法
    const owner = await contract.read.owner();
    contractOwner.value = owner;
    return owner;
  } catch (err) {
    console.error("获取合约 owner 失败:", err);
    return null;
  }
};

// 验证是否为管理员
const verifyAdmin = async () => {
  if (!isWalletConnected.value) {
    isAdmin.value = false;
    return;
  }

  isLoadingAdmin.value = true;
  try {
    // 获取合约 owner
    const owner = await fetchOwner();
    if (owner) {
      isAdmin.value =
        owner.toLowerCase() === contractStore.account.toLowerCase();
    } else {
      isAdmin.value = false;
    }
  } catch (err) {
    console.error("验证管理员失败:", err);
    isAdmin.value = false;
  } finally {
    isLoadingAdmin.value = false;
  }
};

// 监听钱包连接状态变化
watch(
  isWalletConnected,
  () => {
    if (isWalletConnected.value) {
      verifyAdmin();
    } else {
      isAdmin.value = false;
    }
  },
  { immediate: true },
);

// 监听 store 中合约实例的变化（当合约初始化后重新验证）
watch(
  () => contractStore.contract,
  (newContract) => {
    if (newContract && contractStore.account) {
      verifyAdmin();
    }
  },
);

// 监听 store 中 account 的变化
watch(
  () => contractStore.account,
  (newAccount) => {
    if (newAccount && contractStore.contract) {
      verifyAdmin();
    } else if (!newAccount) {
      isAdmin.value = false;
    }
  },
);

// 显示提示消息
const showMessage = (text, type = "success") => {
  message.value = text;
  messageType.value = type;
  setTimeout(() => {
    message.value = "";
  }, 5000);
};

// 添加生产商
const handleAddProducer = async () => {
  if (!addProducerAddress.value.trim()) {
    showMessage("请输入生产商地址", "error");
    return;
  }

  if (!isValidAddress(addProducerAddress.value.trim())) {
    showMessage("请输入有效的以太坊地址", "error");
    return;
  }

  isAddingProducer.value = true;
  try {
    await addProducer(addProducerAddress.value.trim());
    showMessage("✅ 生产商添加成功！", "success");
    addProducerAddress.value = "";
    // 重新验证管理员状态
    await verifyAdmin();
  } catch (err) {
    console.error("添加生产商失败:", err);
    showMessage(`❌ 添加失败: ${err.message || "未知错误"}`, "error");
  } finally {
    isAddingProducer.value = false;
  }
};

// 移除生产商
const handleRemoveProducer = async () => {
  if (!removeProducerAddress.value.trim()) {
    showMessage("请输入生产商地址", "error");
    return;
  }

  if (!isValidAddress(removeProducerAddress.value.trim())) {
    showMessage("请输入有效的以太坊地址", "error");
    return;
  }

  isRemovingProducer.value = true;
  try {
    await removeProducer(removeProducerAddress.value.trim());
    showMessage("✅ 生产商移除成功！", "success");
    removeProducerAddress.value = "";
    await verifyAdmin();
  } catch (err) {
    console.error("移除生产商失败:", err);
    showMessage(`❌ 移除失败: ${err.message || "未知错误"}`, "error");
  } finally {
    isRemovingProducer.value = false;
  }
};

// 验证以太坊地址格式
const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// 在组件挂载时，如果已有合约实例和账户，则验证
onMounted(() => {
  if (contractStore.contract && contractStore.account) {
    verifyAdmin();
  }
});
</script>

<style scoped>
/* 样式保持不变 */
.admin-panel {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 40px 20px;
}

.admin-container {
  max-width: 700px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 24px;
  font-size: 28px;
}

.wallet-status {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.warning-message {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
  padding: 14px 20px;
  border-radius: 8px;
  text-align: center;
  margin: 20px 0;
}

.admin-content {
  margin-top: 24px;
}

.action-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.action-card h3 {
  color: #2c3e50;
  margin-bottom: 16px;
  font-size: 20px;
}

.action-form {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.address-input {
  flex: 1;
  min-width: 250px;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
}

.address-input:focus {
  outline: none;
  border-color: #3498db;
}

.action-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-btn {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
}

.remove-btn {
  background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  color: white;
}

.remove-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(235, 51, 73, 0.3);
}

.message {
  margin-top: 20px;
  padding: 14px 20px;
  border-radius: 8px;
  text-align: center;
  animation: fadeIn 0.3s ease;
}

.message.success {
  background: #d4edda;
  border: 1px solid #28a745;
  color: #155724;
}

.message.error {
  background: #f8d7da;
  border: 1px solid #dc3545;
  color: #721c24;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .admin-container {
    padding: 20px;
  }

  .action-form {
    flex-direction: column;
  }

  .address-input {
    width: 100%;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
// 管理员管理生产商权限
