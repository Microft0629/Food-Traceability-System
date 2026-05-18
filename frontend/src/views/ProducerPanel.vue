<!--
  生产商操作面板：我的产品列表 + 注册新产品 + 添加溯源记录
  连接钱包后根据当前地址显示该生产商已注册的全部产品
-->
<template>
  <div class="producer-panel">
    <h2>🏭 生产商操作面板</h2>

    <!-- 1. 钱包连接按钮 -->
    <div class="wallet-section">
      <ConnectWallet />
    </div>

    <!-- 2. 未连接钱包时显示提示 -->
    <div v-if="!store.account" class="empty-state">
      <p>请先连接 MetaMask 钱包以使用生产商功能</p>
    </div>

    <!-- 3. 已连接钱包后显示操作区 -->
    <div v-else class="operations">

      <!-- 3.0 我的产品列表（仅显示当前生产商注册的产品） -->
      <div class="card">
        <h3>
          📋 我的产品列表
          <button class="refresh-btn" @click="loadMyProducts" :disabled="listLoading">
            {{ listLoading ? '加载中...' : '刷新' }}
          </button>
        </h3>
        <div v-if="myProducts.length === 0 && !listLoading" class="list-empty">
          暂无产品，请先注册新产品
        </div>
        <div v-else class="product-list">
          <div
            v-for="item in myProducts"
            :key="item.id"
            class="product-item"
            @click="prodId = item.id"
          >
            <span class="product-id">#{{ item.id }}</span>
            <span class="product-name">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- 3.1 注册新产品 -->
      <div class="card">
        <h3>📦 注册新产品</h3>
        <div class="form-group">
          <label>产品名称</label>
          <input v-model="productName" type="text" placeholder="例如：有机番茄" class="form-input" />
        </div>
        <div class="form-group">
          <label>产品详细描述</label>
          <textarea v-model="productDetail" rows="4" placeholder="如：产地、种植方式、采摘日期等详细溯源信息" class="form-input"></textarea>
        </div>
        <button class="btn btn-primary" :disabled="loading" @click="handleRegisterFlow">
          {{ loading ? "注册中..." : "注册产品（上链+入库）" }}
        </button>
        <p v-if="registerResult" class="result-msg success">
          ✅ 注册成功！<br />
          产品ID: {{ registerResult.productId }}<br />
          <small>交易哈希: {{ registerResult.txHash }}</small>
        </p>
        <p v-if="registerError" class="result-msg error">❌ {{ registerError }}</p>
      </div>

      <!-- 3.2 添加溯源记录 -->
      <div class="card">
        <h3>📝 添加溯源记录</h3>
        <div class="form-group">
          <label>产品ID</label>
          <input v-model.number="prodId" type="number" placeholder="输入数字ID（可从上方列表点击选择）" class="form-input" />
        </div>
        <div class="form-group">
          <label>环节描述</label>
          <input v-model="stage" type="text" placeholder="如：种植、采摘、包装" class="form-input" />
        </div>
        <button class="btn btn-primary" :disabled="loading" @click="handleAddRecord">
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
import { ref, watch } from "vue";
import ConnectWallet from "../components/ConnectWallet.vue";
import { useContractStore } from "../stores/contract";
import { registerProductFlow, addRecord, fetchProducerProducts } from "../composables/useContract";
import { translateError } from "../utils/errors";

const store = useContractStore();
const loading = ref(false);

// ========== 我的产品列表 ==========
const myProducts = ref([]);
const listLoading = ref(false);

async function loadMyProducts() {
  if (!store.account) { myProducts.value = []; return; }
  listLoading.value = true;
  try {
    myProducts.value = await fetchProducerProducts(store.account);
  } catch (e) {
    console.error("加载产品列表失败", e);
  } finally {
    listLoading.value = false;
  }
}

// 监听钱包地址变化自动加载产品列表
watch(() => store.account, (addr) => {
  if (addr) loadMyProducts();
  else myProducts.value = [];
}, { immediate: true });

// ========== 注册产品表单 ==========
const productName = ref("");
const productDetail = ref("");
const registerResult = ref(null);
const registerError = ref("");

async function handleRegisterFlow() {
  registerError.value = "";
  registerResult.value = null;
  if (!productName.value.trim()) { registerError.value = "请输入产品名称"; return; }
  if (!productDetail.value.trim()) { registerError.value = "请输入产品详细描述"; return; }
  if (!store.account) { registerError.value = "请先连接钱包"; return; }

  loading.value = true;
  try {
    const result = await registerProductFlow(productName.value.trim(), productDetail.value.trim());
    if (result?.txHash && result.productId) {
      registerResult.value = { productId: result.productId, txHash: result.txHash };
      productName.value = "";
      productDetail.value = "";
      // 注册成功后自动刷新产品列表
      await loadMyProducts();
    } else {
      registerError.value = "注册失败，请查看控制台";
    }
  } catch (e) {
    registerError.value = translateError(e);
  } finally {
    loading.value = false;
  }
}

// ========== 添加追溯记录表单 ==========
const prodId = ref("");
const stage = ref("");
const recordResult = ref(null);
const recordError = ref("");

async function handleAddRecord() {
  recordError.value = "";
  recordResult.value = null;
  if (!prodId.value || !stage.value.trim()) { recordError.value = "请填写产品ID和环节描述"; return; }
  if (!store.account) { recordError.value = "请先连接钱包"; return; }

  loading.value = true;
  try {
    const result = await addRecord(Number(prodId.value), stage.value.trim());
    if (result?.txHash) {
      recordResult.value = { txHash: result.txHash };
      stage.value = "";
      prodId.value = "";
    } else {
      recordError.value = "交易失败，请查看控制台";
    }
  } catch (e) {
    recordError.value = translateError(e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.producer-panel { max-width: 640px; margin: 0 auto; padding: 24px 20px; }
h2 { text-align: center; margin-bottom: 24px; }
.wallet-section { text-align: center; margin-bottom: 32px; }
.empty-state { text-align: center; color: #888; padding: 40px 0; }
.operations { display: flex; flex-direction: column; gap: 24px; }

.card { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; }
.card h3 { margin-top: 0; margin-bottom: 16px; border-bottom: 2px solid #4caf50; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }

/* 产品列表 */
.refresh-btn { font-size: 13px; padding: 4px 12px; border: 1px solid #4caf50; background: white; color: #4caf50; border-radius: 4px; cursor: pointer; }
.refresh-btn:hover { background: #4caf50; color: white; }
.list-empty { text-align: center; color: #999; padding: 16px; }
.product-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
.product-item { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #f0fff0; border: 1px solid #c8e6c9; border-radius: 6px; cursor: pointer; transition: background 0.15s; }
.product-item:hover { background: #c8e6c9; }
.product-id { font-weight: 700; color: #2e7d32; min-width: 32px; }
.product-name { flex: 1; color: #333; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #555; }
.form-input { width: 100%; padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
textarea.form-input { resize: vertical; font-family: inherit; }

.result-msg { margin-top: 12px; padding: 10px; border-radius: 6px; }
.result-msg.success { background: #e8f5e9; color: #2e7d32; }
.result-msg.error { background: #ffebee; color: #c62828; }
</style>
