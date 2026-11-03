<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>分红结算</b>
        <span class="tip">正向运单签收后，平台与物流公司按比例分成订单运费；比例可在运营配置「dividend / platform-ratio」调整</span>
        <el-button type="primary" size="small" style="margin-left: auto" @click="openAdjust">平台调账</el-button>
      </div>
    </template>

    <div class="stat-row" v-loading="summaryLoading">
      <div class="stat-card">
        <p class="stat-label">平台累计分成</p>
        <p class="stat-value">¥{{ fmt(summary.totalPlatformAmount) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">物流累计分成</p>
        <p class="stat-value">¥{{ fmt(summary.totalCompanyAmount) }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">分红运单数</p>
        <p class="stat-value">{{ summary.dividendCount }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">调账笔数</p>
        <p class="stat-value">{{ summary.adjustCount }}</p>
      </div>
    </div>

    <h4 class="block-title">各公司账户</h4>
    <el-table :data="summary.companies || []" size="small" v-loading="summaryLoading">
      <el-table-column prop="companyName" label="物流公司" min-width="140" />
      <el-table-column label="账户余额" width="130" align="right">
        <template #default="{ row }">¥{{ fmt(row.balance) }}</template>
      </el-table-column>
      <el-table-column label="累计分成" width="130" align="right">
        <template #default="{ row }">¥{{ fmt(row.companyAmount) }}</template>
      </el-table-column>
      <el-table-column label="平台分成" width="130" align="right">
        <template #default="{ row }">¥{{ fmt(row.platformAmount) }}</template>
      </el-table-column>
      <el-table-column prop="dividendCount" label="分红单数" width="100" align="right" />
    </el-table>

    <h4 class="block-title">分红流水</h4>
    <div class="filter-row">
      <el-select v-model="filterCompanyId" clearable placeholder="全部物流公司" style="width: 200px" @change="reload">
        <el-option v-for="c in summary.companies || []" :key="c.companyId" :label="c.companyName" :value="c.companyId" />
      </el-select>
    </div>
    <el-table :data="items" size="small" v-loading="loading">
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'ADJUST' ? 'warning' : 'success'">{{ row.typeText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="companyName" label="物流公司" min-width="120" show-overflow-tooltip />
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
      <el-table-column label="公司分成" width="110" align="right">
        <template #default="{ row }">
          <span :class="row.companyAmount < 0 ? 'neg' : ''">¥{{ fmt(row.companyAmount) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="原因" min-width="130" show-overflow-tooltip>
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

    <el-dialog v-model="adjustDialog" title="平台调账" width="460px">
      <el-form label-width="90px">
        <el-form-item label="物流公司" required>
          <el-select v-model="adjustForm.companyId" placeholder="请选择物流公司" style="width: 100%">
            <el-option v-for="c in summary.companies || []" :key="c.companyId" :label="c.companyName" :value="c.companyId" />
          </el-select>
        </el-form-item>
        <el-form-item label="调整金额" required>
          <el-input-number v-model="adjustForm.amount" :precision="2" :step="10" style="width: 100%" />
          <div class="as-tip">正数入账、负数扣减（如考核扣罚），将同步增减该公司账户余额</div>
        </el-form-item>
        <el-form-item label="调账原因" required>
          <el-input
            v-model="adjustForm.reason" type="textarea" :rows="3" maxlength="200" show-word-limit
            placeholder="如：配送超时考核扣罚 / 活动奖励"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialog = false">取消</el-button>
        <el-button type="primary" :loading="adjustSubmitting" @click="submitAdjust">确认调账</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adjustDividend, fetchDividendAdminPage, fetchDividendAdminSummary } from '../../api/logistics'

const summary = ref({})
const summaryLoading = ref(false)
const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const loading = ref(false)
const filterCompanyId = ref(null)

const adjustDialog = ref(false)
const adjustSubmitting = ref(false)
const adjustForm = reactive({ companyId: null, amount: 0, reason: '' })

onMounted(() => {
  loadSummary()
  load()
})

const fmt = (v) => Number(v || 0).toFixed(2)
const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function loadSummary() {
  summaryLoading.value = true
  try {
    const res = await fetchDividendAdminSummary({ silent: true })
    summary.value = res.data || {}
  } catch { summary.value = {} } finally {
    summaryLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const res = await fetchDividendAdminPage({ companyId: filterCompanyId.value || undefined, page: page.value, size })
    items.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

function openAdjust() {
  Object.assign(adjustForm, { companyId: null, amount: 0, reason: '' })
  adjustDialog.value = true
}

async function submitAdjust() {
  if (!adjustForm.companyId) {
    ElMessage.warning('请选择物流公司')
    return
  }
  if (!adjustForm.amount) {
    ElMessage.warning('调整金额不能为 0')
    return
  }
  if (!adjustForm.reason.trim()) {
    ElMessage.warning('请填写调账原因')
    return
  }
  adjustSubmitting.value = true
  try {
    await adjustDividend({
      companyId: adjustForm.companyId,
      amount: adjustForm.amount,
      reason: adjustForm.reason.trim()
    })
    adjustDialog.value = false
    ElMessage.success('调账已完成')
    loadSummary()
    reload()
  } catch { /* 后端已提示具体原因 */ } finally {
    adjustSubmitting.value = false
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
.filter-row {
  margin-bottom: 12px;
}
.neg {
  color: #f56c6c;
}
.as-tip {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
  margin-top: 4px;
}
</style>
