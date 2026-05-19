<!--
  时间线展示组件：按时间升序展示产品溯源记录
  每条记录显示：时间、环节描述、操作者地址、数据哈希
-->
<template>
  <div class="timeline">
    <!-- 空状态：无记录时显示占位 -->
    <div v-if="!records || records.length === 0" class="empty-timeline">
      暂无溯源记录
    </div>
    <!-- 时间线列表 -->
    <div v-else class="timeline-items">
      <!-- 每条记录是一个时间线节点：原点 + 内容卡片 -->
      <div v-for="(record, index) in sortedRecords" :key="index" class="timeline-item">
        <!-- 左侧圆点指示器 -->
        <div class="timeline-dot"></div>
        <!-- 右侧内容卡片 -->
        <div class="timeline-content card">
          <div class="timeline-time">{{ formatTime(record.timestamp) }}</div>
          <div class="timeline-desc"><strong>📝 描述：</strong><span class="desc-text">{{ record.description }}</span></div>
          <div class="timeline-operator"><strong>👤 操作者：</strong>{{ truncateAddress(record.operator) }}</div>
          <div class="timeline-hash"><strong>🔗 数据哈希：</strong>{{ truncateHash(record.data_hash) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// props.records 数组每项: { description, operator, timestamp, data_hash }
const props = defineProps({
  records: {
    type: Array,
    default: () => [],
  }
})

// 按时间戳升序排序（ethers v6 返回 bigint，sort 回调必须返回 number）
const sortedRecords = computed(() => {
  if (!props.records) return []
  return [...props.records].sort((a, b) => {
    const ta = typeof a.timestamp === "bigint" ? a.timestamp : BigInt(a.timestamp || 0);
    const tb = typeof b.timestamp === "bigint" ? b.timestamp : BigInt(b.timestamp || 0);
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  })
})

// Unix 秒数（bigint 或 number）→ 本地日期时间字符串
const formatTime = (timestamp) => {
  if (!timestamp) return '未知时间'
  // 转换为 Number 后创建 Date（BigInt * Number 会报错，需显式 Number()）
  const sec = Number(timestamp);
  const date = new Date(sec * 1000);
  return date.toLocaleString()
}

// 截断以太坊地址为 0x12..ab 格式
const truncateAddress = (addr) => {
  if (!addr) return '未知'
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// 截断哈希值为前 10 + ... + 后 8 位格式
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
/* 保留产品描述中的换行符 */
.desc-text {
  white-space: pre-wrap;
}
.empty-timeline {
  padding: 40px;
  text-align: center;
  color: var(--text-light);
  background: var(--card-bg);
  border-radius: 12px;
}
</style>
