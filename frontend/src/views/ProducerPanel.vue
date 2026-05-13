<template>
  <div class="producer-panel">
    <h2>🏭 生产商操作面板</h2>

    <!-- 1. 钱包连接按钮（复用王慧研的组件） -->
    <div class="wallet-section">
      <ConnectWallet />
    </div>

    <!-- 2. 未连接钱包时的提示 -->
    <div v-if="!store.account" class="empty-state">
      <p>请先连接 MetaMask 钱包以使用生产商功能</p>
    </div>

    <!-- 3. 已连接钱包后显示的操作区 -->
    <div v-else class="operations">
      <!-- 3.1 注册新产品（混合架构三步流程） -->
      <div class="card">
        <h3>📦 注册新产品</h3>
        <div class="form-group">
          <label>产品名称</label>
          <input
            v-model="productName"
            type="text"
            placeholder="例如：有机番茄"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>产品详细描述</label>
          <textarea
            v-model="productDetail"
            rows="4"
            placeholder="如：产地、种植方式、采摘日期等详细溯源信息"
            class="form-input"
          ></textarea>
        </div>
        <button
          class="btn btn-primary"
          :disabled="loading"
          @click="handleRegisterFlow"
        >
          {{ loading ? "注册中..." : "注册产品（上链+入库）" }}
        </button>
        <!-- 注册成功后的反馈 -->
        <p v-if="registerResult" class="result-msg success">
          ✅ 注册成功！<br />
          产品ID: {{ registerResult.productId }}<br />
          业务编号: {{ registerResult.business_no }}<br />
          <small>交易哈希: {{ registerResult.txHash }}</small>
        </p>
        <p v-if="registerError" class="result-msg error">
          ❌ {{ registerError }}
        </p>
      </div>

      <!-- 3.2 添加溯源记录（保留原有逻辑） -->
      <div class="card">
        <h3>📝 添加溯源记录</h3>
        <div class="form-group">
          <label>产品ID</label>
          <input
            v-model.number="prodId"
            type="number"
            placeholder="输入数字ID"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>环节描述</label>
          <input
            v-model="stage"
            type="text"
            placeholder="如：种植、采摘、包装"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>数据哈希（可选）</label>
          <input
            v-model="dataHash"
            type="text"
            placeholder="可留空，将使用默认哈希"
            class="form-input"
          />
        </div>
        <button
          class="btn btn-primary"
          :disabled="loading"
          @click="handleAddRecord"
        >
          {{ loading ? "提交中..." : "提交记录" }}
        </button>
        <p v-if="recordResult" class="result-msg success">
          ✅ 记录添加成功！<br />
          <small>交易哈希: {{ recordResult.txHash }}</small>
        </p>
        <p v-if="recordError" class="result-msg error">❌ {{ recordError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import ConnectWallet from "../components/ConnectWallet.vue";
import { useContractStore } from "../stores/contract";
import { registerProductFlow, addRecord } from "../composables/useContract";

const store = useContractStore();
const loading = ref(false);

// ---------- 注册产品相关状态 ----------
const productName = ref("");
const productDetail = ref(""); // 新增：详细描述
const registerResult = ref(null); // 存储 { txHash, productId, business_no }
const registerError = ref("");

// ---------- 添加记录相关状态 ----------
const prodId = ref(""); // 产品ID（number）
const stage = ref(""); // 环节描述
const dataHash = ref(""); // 数据哈希（可留空）
const recordResult = ref(null);
const recordError = ref("");

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/** 新：混合架构注册流程 */
async function handleRegisterFlow() {
  registerError.value = "";
  registerResult.value = null;

  if (!productName.value.trim()) {
    registerError.value = "请输入产品名称";
    return;
  }
  if (!productDetail.value.trim()) {
    registerError.value = "请输入产品详细描述";
    return;
  }
  if (!store.account) {
    registerError.value = "请先连接钱包";
    return;
  }

  loading.value = true;
  try {
    // 调用新的三步流程函数
    const result = await registerProductFlow(
      productName.value.trim(),
      productDetail.value.trim(),
    );
    if (result && result.txHash && result.productId) {
      registerResult.value = {
        productId: result.productId,
        business_no: result.business_no,
        txHash: result.txHash,
      };
      // 清空表单
      productName.value = "";
      productDetail.value = "";
    } else {
      registerError.value = "注册失败，请查看控制台";
    }
  } catch (e) {
    registerError.value = e.message || "注册流程失败";
  } finally {
    loading.value = false;
  }
}

/** 添加溯源记录（保留原逻辑，使用 addRecord） */
async function handleAddRecord() {
  recordError.value = "";
  recordResult.value = null;

  if (!prodId.value || !stage.value.trim()) {
    recordError.value = "请填写产品ID和环节描述";
    return;
  }
  if (!store.account) {
    recordError.value = "请先连接钱包";
    return;
  }

  const hashToUse = dataHash.value.trim() || ZERO_HASH;
  loading.value = true;
  try {
    const result = await addRecord(
      Number(prodId.value),
      hashToUse,
      stage.value.trim(),
    );
    if (result && result.txHash) {
      recordResult.value = { txHash: result.txHash };
      stage.value = "";
      dataHash.value = "";
      prodId.value = "";
    } else {
      recordError.value = "交易失败，请查看控制台";
    }
  } catch (e) {
    recordError.value = e.message || "交易失败";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* 样式与原文件相同，略作调整适配 textarea */
.producer-panel {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 20px;
}

h2 {
  text-align: center;
  margin-bottom: 24px;
}

.wallet-section {
  text-align: center;
  margin-bottom: 32px;
}

.empty-state {
  text-align: center;
  color: #888;
  padding: 40px 0;
}

.operations {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
}

.card h3 {
  margin-top: 0;
  margin-bottom: 16px;
  border-bottom: 2px solid #4caf50;
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #555;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

/* textarea 继承同样样式 */
textarea.form-input {
  resize: vertical;
  font-family: inherit;
}

.result-msg {
  margin-top: 12px;
  padding: 10px;
  border-radius: 6px;
}

.result-msg.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.result-msg.error {
  background: #ffebee;
  color: #c62828;
}
</style>
