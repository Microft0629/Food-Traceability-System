<!--
  管理员面板：添加 / 移除生产商钱包地址（链上操作）
  需要连接 MetaMask 并验证为管理员身份
-->
<template>
  <div class="admin-panel">
    <div class="admin-container">
      <h1>管理员面板</h1>

      <!-- 钱包连接状态 -->
      <div class="wallet-status">
        <ConnectWallet />
      </div>

      <!-- 未连接钱包或非管理员的警告提示 -->
      <div v-if="!isWalletConnected" class="warning-message">
        ⚠️ 请先连接钱包
      </div>
      <div v-else-if="!isAdmin && !isLoadingAdmin" class="warning-message">
        ⚠️ 当前钱包地址不是管理员，无法使用管理功能
      </div>

      <!-- 管理功能区域（仅管理员可见） -->
      <div v-if="isAdmin && isWalletConnected" class="admin-content">

        <!-- 添加生产商卡片 -->
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

        <!-- 移除生产商卡片 -->
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

        <!-- 操作结果反馈消息 -->
        <div v-if="message" :class="['message', messageType]">
          {{ message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { addProducer, removeProducer, getOwner } from "@/composables/useContract";
import { translateError } from "@/utils/errors";
import ConnectWallet from "@/components/ConnectWallet.vue";
import { useContractStore } from "@/stores/contract";

const contractStore = useContractStore();

// ========== 表单与状态 ==========
const addProducerAddress = ref(""); // 要添加的生产商地址
const removeProducerAddress = ref(""); // 要移除的生产商地址
const isAddingProducer = ref(false); // 添加操作加载状态
const isRemovingProducer = ref(false); // 移除操作加载状态
const isAdmin = ref(false); // 当前用户是否为管理员
const isLoadingAdmin = ref(false); // 管理员身份验证加载中
const message = ref(""); // 操作反馈消息文本
const messageType = ref("success"); // 消息类型（控制样式）

// ========== 计算属性 ==========

/** 检查钱包是否已连接（store.isConnected && 有 account 地址） */
const isWalletConnected = computed(() => {
  return contractStore.isConnected && contractStore.account;
});

// ========== 管理员身份验证 ==========

/**
 * 验证当前账户是否为合约 owner（管理员）
 * 从合约读取 owner() 并与已连接的钱包地址比对
 */
const verifyAdmin = async () => {
  if (!isWalletConnected.value || !contractStore.account) {
    isAdmin.value = false;
    return;
  }
  isLoadingAdmin.value = true;
  try {
    const owner = await getOwner();
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

// ========== 监听器：自动触发身份验证 ==========

/** 监听钱包连接状态变化 */
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

/** 监听合约实例初始化 */
watch(
  () => contractStore.writeContract,
  (newContract) => {
    if (newContract && contractStore.account) {
      verifyAdmin();
    }
  },
);

/** 监听账户地址切换 */
watch(
  () => contractStore.account,
  (newAccount) => {
    if (newAccount && contractStore.writeContract) {
      verifyAdmin();
    } else if (!newAccount) {
      isAdmin.value = false;
    }
  },
);

// ========== 操作方法 ==========

/** 显示 5 秒自动消失的反馈消息 */
const showMessage = (text, type = "success") => {
  message.value = text;
  messageType.value = type;
  setTimeout(() => {
    message.value = "";
  }, 5000);
};

/**
 * 处理添加生产商
 * 校验地址格式 → 调用合约 add_producer → 显示结果
 */
const handleAddProducer = async () => {
  // 前后端双重校验
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
    await verifyAdmin();
  } catch (err) {
    console.error("添加生产商失败:", err);
    showMessage(`❌ ${translateError(err)}`, "error");
  } finally {
    isAddingProducer.value = false;
  }
};

/**
 * 处理移除生产商
 * 校验地址格式 → 调用合约 remove_producer → 显示结果
 */
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
    showMessage(`❌ ${translateError(err)}`, "error");
  } finally {
    isRemovingProducer.value = false;
  }
};

/** 验证以太坊地址格式（0x 开头 + 40 位十六进制字符） */
const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// ========== 生命周期 ==========

/** 组件挂载时，如果已有合约和账户则立即验证身份 */
onMounted(() => {
  if (contractStore.writeContract && contractStore.account) {
    verifyAdmin();
  }
});
</script>

<style scoped>
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
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 移动端响应式 */
@media (max-width: 600px) {
  .admin-container { padding: 20px; }
  .action-form    { flex-direction: column; }
  .address-input  { width: 100%; }
  .action-btn     { width: 100%; }
}
</style>
