<template>
  <div class="consumer-query">
    <div class="query-container">
      <h1>产品溯源查询</h1>
      
      <div class="search-section">
        <input 
          v-model="productId" 
          type="text" 
          placeholder="请输入产品ID"
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

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

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
          <TimelineView :events="timelineEvents" />
        </div>
        <div v-else-if="productInfo" class="no-timeline">
          暂无溯源记录
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
// 修改：直接导入 queryProduct 函数，而不是 useContract
import { queryProduct } from '@/composables/useContract'
import TimelineView from '@/components/TimelineView.vue'

const productId = ref('')
const isLoading = ref(false)
const error = ref(null)
const productInfo = ref(null)
const timelineEvents = ref([])

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
    // 修改：直接调用 queryProduct 函数
    const result = await queryProduct(productId.value.trim())
    
    if (result) {
      // 根据合约返回的数据结构调整
      // 假设 result 是一个数组或对象，根据您的实际合约调整
      let productData
      if (Array.isArray(result)) {
        // 如果是数组格式 [name, producer, records]
        productData = {
          name: result[0] || '未知',
          producerAddress: result[1] || '未知'
        }
        // 处理溯源记录
        if (result[2] && Array.isArray(result[2])) {
          timelineEvents.value = result[2]
        }
      } else if (typeof result === 'object') {
        // 如果是对象格式
        productData = {
          name: result.name || result[0] || '未知',
          producerAddress: result.producer || result.producerAddress || result[1] || '未知'
        }
        timelineEvents.value = result.traceRecords || result.records || []
      } else {
        productData = {
          name: '未知',
          producerAddress: '未知'
        }
      }
      
      productInfo.value = productData
    } else {
      error.value = '未找到该产品信息'
    }
  } catch (err) {
    console.error('查询失败:', err)
    error.value = err.message || '查询失败，请稍后重试'
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

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 32px;
  font-size: 28px;
}

.search-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.product-input {
  flex: 1;
  padding: 14px 18px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.product-input:focus {
  outline: none;
  border-color: #3498db;
}

.query-btn {
  padding: 14px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.query-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.query-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.product-info {
  margin-top: 24px;
}

.info-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.info-card h3 {
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #3498db;
}

.info-row {
  margin-bottom: 12px;
  font-size: 16px;
}

.label {
  font-weight: 600;
  color: #555;
}

.value {
  color: #333;
}

.address {
  font-family: monospace;
  font-size: 14px;
  word-break: break-all;
}

.timeline-section h3 {
  color: #2c3e50;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #3498db;
}

.no-timeline {
  text-align: center;
  color: #999;
  padding: 32px;
  background: #f8f9fa;
  border-radius: 8px;
}
</style>// 消费者查询页
