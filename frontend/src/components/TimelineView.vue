// 时间线展示组件（可复用）
<!-- src/components/TimelineView.vue -->
<template>
  <div class="timeline">
    <div v-if="!records || records.length === 0" class="empty-timeline">
      暂无溯源记录
    </div>
    <div v-else class="timeline-items">
      <div v-for="(record, index) in sortedRecords" :key="index" class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content card">
          <div class="timeline-time">{{ formatTime(record.timestamp) }}</div>
          <div class="timeline-desc"><strong>📝 描述：</strong>{{ record.description }}</div>
          <div class="timeline-operator"><strong>👤 操作者：</strong>{{ truncateAddress(record.operator) }}</div>
          <div class="timeline-hash"><strong>🔗 数据哈希：</strong>{{ truncateHash(record.data_hash) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  records: {
    type: Array,
    default: () => [],
    // 每条记录格式示例：
    // {
    //   description: "种植阶段",
    //   operator: "0x1234...",
    //   timestamp: 1678901234,  // Unix 时间戳（秒）
    //   data_hash: "0xabcd..."
    // }
  }
})

// 按时间戳升序排序（旧的在上，新的在下）
const sortedRecords = computed(() => {
  if (!props.records) return []
  return [...props.records].sort((a, b) => a.timestamp - b.timestamp)
})

// 格式化时间：Unix 秒 → 本地日期时间字符串
const formatTime = (timestamp) => {
  if (!timestamp) return '未知时间'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}

// 截断地址
const truncateAddress = (addr) => {
  if (!addr) return '未知'
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// 截断哈希
const truncateHash = (hash) => {
  if (!hash) return '无'
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}
</script>

<style scoped>
.timeline {
  position: relative;
  padding-left: 20px;
}
.timeline-items {
  position: relative;
}
.timeline-item {
  display: flex;
  margin-bottom: 24px;
  position: relative;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  background-color: var(--primary-color);
  border-radius: 50%;
  position: relative;
  top: 20px;
  left: -6px;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px white, 0 0 0 5px var(--primary-color);
}
.timeline-content {
  flex: 1;
  margin-left: 12px;
  padding: 16px;
}
.timeline-time {
  font-size: 0.85rem;
  color: var(--text-light);
  margin-bottom: 8px;
}
.timeline-desc,
.timeline-operator,
.timeline-hash {
  margin-top: 6px;
  word-break: break-all;
}
.empty-timeline {
  padding: 40px;
  text-align: center;
  color: var(--text-light);
  background: var(--card-bg);
  border-radius: 12px;
}
</style>// 时间线展示组件（可复用）
