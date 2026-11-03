<template>
  <div v-loading="loading">
    <div class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <div class="icon" :style="{ background: s.color }">{{ s.icon }}</div>
        <div>
          <div class="value">{{ s.value }}</div>
          <div class="label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <el-card shadow="never">
        <template #header><b>近 7 日订单趋势</b></template>
        <div class="chart">
          <div v-for="d in data.weekStats || []" :key="d.day" class="bar-col">
            <span class="num">{{ d.orderCount }}</span>
            <div class="bar" :style="{ height: barHeight(d.orderCount) }" />
            <span class="day">{{ d.day }}</span>
          </div>
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header><b>订单状态分布</b></template>
        <div v-for="s in data.orderStatuses || []" :key="s.status" class="status-row">
          <span>{{ statusText(s.status) }}</span>
          <span class="status-count">{{ s.count }}</span>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchDashboard } from '../../api/admin'

const data = ref({})
const loading = ref(false)

const stats = computed(() => [
  { icon: '💰', label: '今日成交额', value: '¥' + (data.value.todaySales ?? 0), color: '#ff4b2b' },
  { icon: '📦', label: '今日订单', value: data.value.todayOrderCount ?? 0, color: '#396afc' },
  { icon: '👤', label: '注册用户', value: data.value.totalUsers ?? 0, color: '#11998e' },
  { icon: '🛍️', label: '在售商品', value: data.value.totalProducts ?? 0, color: '#fc4a1a' },
  { icon: '🏪', label: '营业店铺', value: data.value.totalShops ?? 0, color: '#8e2de2' },
  { icon: '✅', label: '待审核', value: data.value.pendingAudits ?? 0, color: '#e6a23c' }
])

const maxCount = computed(() =>
  Math.max(1, ...(data.value.weekStats || []).map((d) => d.orderCount)))

function barHeight(count) {
  return `${Math.round((count / maxCount.value) * 170)}px`
}

const statusText = (s) => ({
  UNPAID: '待付款', PAID: '待发货', SHIPPED: '待收货', COMPLETED: '已完成',
  AFTER_SALE: '售后中', REFUNDED: '已退款', CANCELLED: '已取消'
}[s] || s)

onMounted(async () => {
  loading.value = true
  try {
    const res = await fetchDashboard()
    data.value = res.data || {}
  } catch { /* ignore */ } finally { loading.value = false }
})
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.value {
  font-size: 20px;
  font-weight: 700;
}
.label {
  font-size: 12px;
  color: #999;
}
.two-col {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 16px;
  margin-top: 16px;
}
.chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 220px;
}
.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
.num {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
.bar {
  width: 32px;
  background: linear-gradient(180deg, #396afc, #6a9bff);
  border-radius: 6px 6px 0 0;
}
.day {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}
.status-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 4px;
  border-bottom: 1px dashed #f0f0f0;
  font-size: 14px;
}
.status-count {
  color: #ff4b2b;
  font-weight: 600;
}
</style>
