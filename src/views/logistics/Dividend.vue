<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>分红账户</b>
        <span class="tip">正向运单签收后，平台按配置比例与本公司分成订单运费</span>
      </div>
    </template>

    <div class="stat-row" v-loading="summaryLoading">
      <div class="stat-card">
        <p class="stat-label">账户余额</p>
        <p class="stat-value">¥{{ fmt(summary.balance) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">累计分成</p>
        <p class="stat-value">¥{{ fmt(summary.totalCompanyAmount) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">平台累计分成</p>
        <p class="stat-value">¥{{ fmt(summary.totalPlatformAmount) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">分红运单数</p>
        <p class="stat-value">{{ summary.dividendCount }}</p>
      </div>
    </div>

    <el-table :data="items" size="small" v-loading="loading">
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'ADJUST' ? 'warning' : 'success'">{{ row.typeText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="trackingNo" label="运单号" width="180">
        <template #default="{ row }">{{ row.trackingNo || '—' }}</template>
      </el-table-column>
      <el-table-column prop="orderNo" label="订单号" width="180" />
      <el-table-column prop="shopName" label="店铺" min-width="120" show-overflow-tooltip />
      <el-table-column label="订单运费" width="100" align="right">
        <template #default="{ row }">¥{{ fmt(row.freightAmount) }}</template>
      </el-table-column>
      <el-table-column label="平台比例" width="90" align="right">
        <template #default="{ row }">{{ row.type === 'DIVIDEND' ? row.platformRatio + '%' : '—' }}</template>
      </el-table-column>
      <el-table-column label="平台分成" width="100" align="right">
        <template #default="{ row }">¥{{ fmt(row.platformAmount) }}</template>
      </el-table-column>
      <el-table-column label="本司分成" width="110" align="right">
        <template #default="{ row }">
          <span :class="row.companyAmount < 0 ? 'neg' : ''">¥{{ fmt(row.companyAmount) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="原因" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.reason || '—' }}</template>
      </el-table-column>
      <el-table-column label="时间" width="150">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size"
      v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchDividendPage, fetchDividendSummary } from '../../api/logistics'

const summary = ref({})
const summaryLoading = ref(false)
const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const loading = ref(false)

onMounted(() => {
  loadSummary()
  load()
})

const fmt = (v) => Number(v || 0).toFixed(2)
const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function loadSummary() {
  summaryLoading.value = true
  try {
    const res = await fetchDividendSummary({ silent: true })
    summary.value = res.data || {}
  } catch { summary.value = {} } finally {
    summaryLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const res = await fetchDividendPage({ page: page.value, size })
    items.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.tip {
  font-size: 12px;
  color: #999;
}
.stat-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.stat-card {
  flex: 1;
  min-width: 160px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 14px 18px;
}
.stat-label {
  font-size: 12px;
  color: #999;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #ff4b2b;
  margin-top: 4px;
}
.neg {
  color: #f56c6c;
}
</style>
