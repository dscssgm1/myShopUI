<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>佣金账单</b>
        <span class="tip">订单完成时平台按商品类目费率抽佣；发生售后退款会生成一笔负数冲销流水，净额与平台两清</span>
      </div>
    </template>

    <div class="stat-row" v-loading="summaryLoading">
      <div class="stat-card">
        <p class="stat-label">计佣商品总额</p>
        <p class="stat-value">¥{{ fmt(summary.totalGoodsAmount) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">累计佣金（平台收取）</p>
        <p class="stat-value">¥{{ fmt(summary.totalCommissionAmount) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">累计净得</p>
        <p class="stat-value">¥{{ fmt(summary.totalMerchantAmount) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">计佣笔数 / 冲销笔数</p>
        <p class="stat-value">{{ summary.commissionCount }} / {{ summary.reversalCount }}</p>
      </div>
    </div>

    <h4 class="block-title">佣金流水</h4>
    <el-table :data="items" size="small" v-loading="loading">
      <el-table-column label="类型" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'REVERSAL' ? 'warning' : 'success'">{{ row.typeText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="orderNo" label="订单号" width="180" />
      <el-table-column label="商品金额" width="110" align="right">
        <template #default="{ row }">
          <span :class="row.goodsAmount < 0 ? 'neg' : ''">¥{{ fmt(row.goodsAmount) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="综合费率" width="90" align="right">
        <template #default="{ row }">{{ row.commissionRate }}%</template>
      </el-table-column>
      <el-table-column label="佣金" width="100" align="right">
        <template #default="{ row }">
          <span :class="row.commissionAmount < 0 ? 'neg' : ''">¥{{ fmt(row.commissionAmount) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="净得" width="100" align="right">
        <template #default="{ row }">
          <span :class="row.merchantAmount < 0 ? 'neg' : ''">¥{{ fmt(row.merchantAmount) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="detail" label="计佣明细" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.detail || '—' }}</template>
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
import { fetchCommissionSummary, fetchMyCommissionRecords } from '../../api/trade'

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
    const res = await fetchCommissionSummary({ silent: true })
    summary.value = res.data || {}
  } catch { summary.value = {} } finally {
    summaryLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const res = await fetchMyCommissionRecords({ page: page.value, size })
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
.block-title {
  margin: 6px 0 10px;
  font-size: 15px;
}
.neg {
  color: #f56c6c;
}
</style>
