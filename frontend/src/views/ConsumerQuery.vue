<!--
  消费者查询页：产品列表 + 搜索 + 溯源记录时间线
  无需连接钱包，所有查询走 readContract（JsonRpcProvider 直连）
-->
<template>
  <div class="consumer-query">
    <div class="query-container">
      <h1>产品溯源查询</h1>

      <!-- ========== 产品列表 ========== -->
      <div class="product-list-section">
        <h3>
          📋 现有产品列表
          <button class="refresh-btn" @click="loadProductList" :disabled="listLoading">
            {{ listLoading ? '加载中...' : '刷新' }}
          </button>
        </h3>
        <div v-if="listError" class="error-message">{{ listError }}</div>
        <div v-if="productList.length === 0 && !listLoading" class="list-empty">
          暂无产品，请等待生产商注册
        </div>
        <div v-else class="product-grid">
          <div
            v-for="item in productList"
            :key="item.id"
            class="product-item"
            :class="{ active: productId === String(item.id) }"
            @click="selectProduct(item.id)"
          >
            <span class="product-id">#{{ item.id }}</span>
            <span class="product-name">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- ========== 搜索输入区 ========== -->
      <div class="search-section">
        <input
          v-model="productId"
          type="text"
          placeholder="输入产品ID 或点击上方列表"
          class="product-input"
          @keyup.enter="handleQuery"
        />
        <button
          @click="handleQuery"
          :disabled="isLoading"
          class="query-btn"
        >
          {{ isLoading ? '查询中...' : '查询' }}
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- ========== 产品详情展示区 ========== -->
      <div v-if="productInfo" class="product-info">
        <div class="info-card">
          <h3>产品信息</h3>
          <div class="info-row">
            <span class="label">产品ID：</span>
            <span class="value">{{ productId }}</span>
          </div>
          <div class="info-row">
            <span class="label">产品名称：</span>
            <span class="value">{{ productInfo.name }}</span>
          </div>
          <div class="info-row">
            <span class="label">生产商地址：</span>
            <span class="value address">{{ productInfo.producerAddress }}</span>
          </div>
        </div>

        <div v-if="timelineEvents.length > 0" class="timeline-section">
          <h3>溯源记录</h3>
          <TimelineView :records="timelineEvents" />
        </div>
        <div v-else-if="productInfo" class="no-timeline">
          暂无溯源记录
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { queryProduct, fetchAllProducts } from '@/composables/useContract'
import { translateError } from '@/utils/errors'
import TimelineView from '@/components/TimelineView.vue'

// ========== 页面状态 ==========
const productId = ref('') // 用户输入/选择的产品 ID
const isLoading = ref(false) // 查询加载中
const error = ref(null) // 查询错误消息
const productInfo = ref(null) // 产品基本信息
const timelineEvents = ref([]) // 溯源记录数组

// 产品列表状态
const productList = ref([]) // [{ id, name, producer }]
const listLoading = ref(false)
const listError = ref(null)

// ========== 产品列表加载 ==========

// 加载全部已注册产品
async function loadProductList() {
  listLoading.value = true
  listError.value = null
  try {
    productList.value = await fetchAllProducts()
  } catch (err) {
    listError.value = '加载产品列表失败'
  } finally {
    listLoading.value = false
  }
}

// 点击列表中的产品 → 自动填入 ID 并查询
function selectProduct(id) {
  productId.value = String(id)
  handleQuery()
}

// 页面挂载时自动加载产品列表
onMounted(() => {
  loadProductList()
})

// ========== 产品查询 ==========

// 调用合约 get_product 读取链上数据，返回 (id, name, producer, exists, records)
const handleQuery = async () => {
  if (!productId.value.trim()) {
    error.value = '请输入产品ID'
    return
  }

  isLoading.value = true
  error.value = null
  productInfo.value = null
  timelineEvents.value = []

  try {
    const result = await queryProduct(productId.value.trim())

    if (result) {
      productInfo.value = {
        name: result.name || result[1] || '未知',
        producerAddress: result.producer || result[2] || '未知',
      }

      const raw = result.records || result[4]
      if (raw && raw.length) {
        timelineEvents.value = raw.map((r) => ({
          description: r.description,
          operator: r.operator,
          timestamp: Number(r.timestamp),
          data_hash: r.data_hash,
        }))
      }
    } else {
      error.value = '未找到该产品信息'
    }
  } catch (err) {
    console.error('查询失败:', err)
    error.value = translateError(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.consumer-query {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.query-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

h1 { text-align: center; color: #2c3e50; margin-bottom: 32px; font-size: 28px; }

/* ===== 产品列表 ===== */
.product-list-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}
.product-list-section h3 {
  display: flex; justify-content: space-between; align-items: center;
  color: #2c3e50; margin-bottom: 12px;
}
.refresh-btn {
  font-size: 13px; padding: 4px 12px; border: 1px solid #3498db;
  background: white; color: #3498db; border-radius: 4px; cursor: pointer;
}
.refresh-btn:hover { background: #3498db; color: white; }
.list-empty { text-align: center; color: #999; padding: 16px; }
.product-grid {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.product-item {
  padding: 8px 16px; background: #f0f4ff; border: 2px solid transparent;
  border-radius: 8px; cursor: pointer; transition: all 0.15s;
  display: flex; gap: 8px; align-items: center;
}
.product-item:hover { background: #dbeafe; border-color: #93c5fd; }
.product-item.active { background: #dbeafe; border-color: #3b82f6; }
.product-id { font-weight: 700; color: #3b82f6; }
.product-name { color: #333; }

/* ===== 搜索 ===== */
.search-section { display: flex; gap: 16px; margin-bottom: 24px; }
.product-input {
  flex: 1; padding: 14px 18px; border: 2px solid #e0e0e0;
  border-radius: 8px; font-size: 16px; transition: border-color 0.3s;
}
.product-input:focus { outline: none; border-color: #3498db; }
.query-btn {
  padding: 14px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;
}
.query-btn:hover:not(:disabled) { transform: translateY(-2px); }
.query-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ===== 错误 ===== */
.error-message { background: #fee; color: #c33; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }

/* ===== 产品详情 ===== */
.product-info { margin-top: 24px; }
.info-card { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
.info-card h3 { color: #2c3e50; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #3498db; }
.info-row { margin-bottom: 12px; font-size: 16px; }
.label { font-weight: 600; color: #555; }
.value { color: #333; }
.address { font-family: monospace; font-size: 14px; word-break: break-all; }
.timeline-section h3 { color: #2c3e50; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #3498db; }
.no-timeline { text-align: center; color: #999; padding: 32px; background: #f8f9fa; border-radius: 8px; }
</style>
