<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>售后管理</b>
        <el-radio-group v-model="status" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="PENDING_MERCHANT">待审核</el-radio-button>
          <el-radio-button value="APPROVED">待退款</el-radio-button>
          <el-radio-button value="REFUNDED">已退款</el-radio-button>
          <el-radio-button value="APPEALING">申诉中</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <el-table :data="items" size="small" v-loading="loading">
      <el-table-column prop="afterSaleNo" label="售后单号" width="190" />
      <el-table-column prop="orderNo" label="订单号" width="190" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'RETURN_REFUND' ? 'warning' : 'info'">
            {{ row.typeText }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="售后原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="退款金额" width="100">
        <template #default="{ row }">¥{{ row.amount }}</template>
      </el-table-column>
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <el-tag size="small" :type="tagType(row.status)">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="剩余时间" width="150">
        <template #default="{ row }">
          <span
            v-if="row.status === 'PENDING_MERCHANT' && row.deadlineAt"
            class="cd" :class="{ danger: remainingMs(row.deadlineAt) < WARNING_MS }"
          >⏰ {{ remainingText(row.deadlineAt) }}</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row.afterSaleNo)">详情</el-button>
          <el-button
            v-if="row.status === 'PENDING_MERCHANT'"
            v-perm="'merchant:after-sales:review'"
            link type="warning" size="small" @click="openReview(row)"
          >审核</el-button>
          <el-button
            v-if="row.status === 'APPROVED'"
            v-perm="'merchant:after-sales:refund'"
            link type="danger" size="small" @click="refund(row)"
          >退款</el-button>
          <el-button
            v-if="row.status === 'REFUNDED' && row.type === 'RETURN_REFUND'"
            v-perm="'merchant:after-sales:appeal'"
            link type="danger" size="small" @click="openAppeal(row)"
          >申诉</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />

    <!-- 审核 -->
    <el-dialog v-model="reviewDialog" title="售后审核" width="480px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px">
        {{ reviewOrder?.afterSaleNo }} ｜ {{ reviewOrder?.typeText }} ｜ 退款 ¥{{ reviewOrder?.amount }}
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="reviewForm.approved">
            <el-radio :value="true">同意</el-radio>
            <el-radio :value="false">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="reviewForm.approved ? '审核说明' : '拒绝原因'" :required="!reviewForm.approved">
          <template v-if="!reviewForm.approved">
            <el-select
              v-model="reviewForm.category" filterable allow-create default-first-option
              placeholder="选择拒绝原因类别" style="width: 100%; margin-bottom: 8px"
            >
              <el-option v-for="r in rejectReasons" :key="r" :label="r" :value="r" />
            </el-select>
          </template>
          <el-input
            v-model="reviewForm.detail" type="textarea" :rows="3" maxlength="300" show-word-limit
            :placeholder="reviewForm.approved ? '选填' : '请填写具体原因，用户将看到该说明'"
          />
        </el-form-item>
        <el-form-item v-if="reviewForm.approved && reviewOrder?.type === 'RETURN_REFUND'">
          <div class="tip">同意后将生成退货运单和取件码，用户需在两天内预约快递上门取件。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReview">提交审核</el-button>
      </template>
    </el-dialog>

    <!-- 申诉 -->
    <el-dialog v-model="appealDialog" title="发起申诉" width="480px">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 14px">
        已退款 ¥{{ appealOrder?.amount }}。如收到的退货不满足退款条件，可提交平台仲裁；
        平台审核成立后将给用户生成补款订单。
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="申诉原因" required>
          <el-input
            v-model="appealReason" type="textarea" :rows="4" maxlength="300" show-word-limit
            placeholder="请说明退货存在的问题及不满足退款条件的依据"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="appealDialog = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitAppeal">提交申诉</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawer" title="售后详情" size="620px">
      <div v-if="detail" v-loading="detailLoading">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="售后单号" :span="2">{{ detail.afterSaleNo }}</el-descriptions-item>
          <el-descriptions-item label="订单号" :span="2">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="售后类型">{{ detail.typeText }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" :type="tagType(detail.status)">{{ detail.statusText }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="退款金额">
            <span class="amount">¥{{ detail.amount }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="发起方">{{ detail.initiatorText }}</el-descriptions-item>
          <el-descriptions-item label="售后原因" :span="2">{{ detail.reason }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.description" label="问题描述" :span="2">
            {{ detail.description }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ fmt(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="处理截止">
            {{ fmt(detail.deadlineAt) }}
            <span
              v-if="detail.status === 'PENDING_MERCHANT' && detail.deadlineAt"
              class="cd" :class="{ danger: remainingMs(detail.deadlineAt) < WARNING_MS }"
            >（{{ remainingText(detail.deadlineAt) }}）</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.merchantReason" label="商家说明" :span="2">
            {{ detail.merchantReason }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.platformReason" label="平台说明" :span="2">
            {{ detail.platformReason }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.refundedAt" label="退款时间" :span="2">
            {{ fmt(detail.refundedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="detail.items?.length" class="section">
          <div class="section-title">售后商品</div>
          <div v-for="it in detail.items" :key="`${it.productId}-${it.skuId}`" class="item">
            <img v-if="it.productCoverImage" :src="it.productCoverImage" class="g-photo" alt="" />
            <div v-else class="g-img" :style="{ background: it.productColor }">{{ it.productEmoji }}</div>
            <div>
              <div class="g-name">{{ it.productName }}</div>
              <div v-if="it.skuSpecs" class="g-sku">{{ it.skuSpecs }}</div>
              <div class="g-price">¥{{ it.price }} × {{ it.quantity }}</div>
            </div>
          </div>
        </div>

        <div v-if="detail.returnTrackingNo" class="section">
          <div class="section-title">退货物流</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="退货运单号">{{ detail.returnTrackingNo }}</el-descriptions-item>
            <el-descriptions-item label="物流公司">{{ detail.returnShipmentCompany || '待分配' }}</el-descriptions-item>
            <el-descriptions-item label="物流状态">
              {{ detail.returnShipmentStatusText || '待上门取件' }}
            </el-descriptions-item>
            <el-descriptions-item label="取件码">{{ detail.pickupCode }}</el-descriptions-item>
            <el-descriptions-item label="预约时间" :span="2">
              {{ fmt(detail.appointmentTime) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="detail.recoveryOrderNo" class="section">
          <div class="section-title">补款订单</div>
          <el-alert type="info" :closable="false" show-icon
            :title="`平台已判定申诉成立，补款订单：${detail.recoveryOrderNo}`"
          />
        </div>

        <div class="drawer-actions">
          <el-button
            v-if="detail.status === 'PENDING_MERCHANT'"
            v-perm="'merchant:after-sales:review'"
            type="primary" @click="openReview(detail)"
          >审核</el-button>
          <el-button
            v-if="detail.status === 'APPROVED'"
            v-perm="'merchant:after-sales:refund'"
            type="danger" @click="refund(detail)"
          >触发退款</el-button>
          <el-button
            v-if="detail.status === 'REFUNDED' && detail.type === 'RETURN_REFUND'"
            v-perm="'merchant:after-sales:appeal'"
            type="danger" plain @click="openAppeal(detail)"
          >申诉</el-button>
        </div>
      </div>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  appealAfterSale, fetchAfterSale, fetchMerchantAfterSales,
  refundAfterSale, reviewAfterSale, timeoutEscalateAfterSale
} from '../../api/afterSale'
import { fetchPublicConfigMap, parseConfigJson } from '../../api/config'

// 拒绝原因快选：平台配置中心 aftersale-reject-reason 组，未配置时用默认列表
const DEFAULT_REJECT_REASONS = ['凭证不足', '商品已使用影响二次销售', '超出售后期限', '商品无质量问题', '其他']
const rejectReasons = ref(DEFAULT_REJECT_REASONS)

async function loadRejectReasons() {
  try {
    const map = await fetchPublicConfigMap('aftersale-reject-reason', { silent: true })
    const list = parseConfigJson(map.default, [])
    if (Array.isArray(list) && list.length) rejectReasons.value = list
  } catch { /* 保留默认拒绝原因 */ }
}

// ==================== 超时倒计时 ====================

// 剩余不足 4 小时标红；倒计时结束后调用后端接口触发转平台（服务端校验截止时间）
const WARNING_MS = 4 * 3600 * 1000
const nowTick = ref(Date.now())
let countdownTimer = null
// 升级失败（多为客户端时钟略快）后 60 秒内不重试
const escalateRetryAfter = new Map()

function remainingMs(deadline) {
  if (!deadline) return Number.MAX_SAFE_INTEGER
  return new Date(String(deadline).slice(0, 19).replace(' ', 'T')).getTime() - nowTick.value
}

function remainingText(deadline) {
  if (!deadline) return ''
  const ms = remainingMs(deadline)
  if (ms <= 0) return '已超时'
  const totalMin = Math.floor(ms / 60000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d} 天 ${h} 小时 ${m} 分`
  if (h > 0) return `${h} 小时 ${m} 分`
  return `${m} 分钟`
}

async function escalateIfTimeout(afterSale) {
  if (!afterSale || afterSale.status !== 'PENDING_MERCHANT' || !afterSale.deadlineAt) return
  if (remainingMs(afterSale.deadlineAt) > 0) return
  const no = afterSale.afterSaleNo
  if (escalateRetryAfter.has(no) && Date.now() < escalateRetryAfter.get(no)) return
  escalateRetryAfter.set(no, Date.now() + 60_000)
  try {
    await timeoutEscalateAfterSale(no)
    ElMessage.success(`售后单 ${no} 审核超时，已自动转交平台审核`)
    if (detail.value?.afterSaleNo === no) {
      const res = await fetchAfterSale(no)
      detail.value = res.data
    }
    load()
  } catch { /* 服务端判定未超时或状态已变化，等待下次刷新 */ }
}

watch(nowTick, () => {
  items.value.forEach(escalateIfTimeout)
  escalateIfTimeout(detail.value)
})

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('')
const loading = ref(false)

const drawer = ref(false)
const detail = ref(null)
const detailLoading = ref(false)

const reviewDialog = ref(false)
const reviewOrder = ref(null)
const reviewForm = reactive({ approved: true, category: '', detail: '' })

const appealDialog = ref(false)
const appealOrder = ref(null)
const appealReason = ref('')
const submitting = ref(false)

onMounted(() => {
  countdownTimer = setInterval(() => { nowTick.value = Date.now() }, 30_000)
  load().then(() => items.value.forEach(escalateIfTimeout))
  loadRejectReasons()
})

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
watch(status, () => { page.value = 1; load() })

async function load() {
  loading.value = true
  try {
    const res = await fetchMerchantAfterSales({ status: status.value || undefined, page: page.value, size })
    items.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function openDetail(afterSaleNo) {
  drawer.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const res = await fetchAfterSale(afterSaleNo)
    detail.value = res.data
  } catch {
    drawer.value = false
  } finally {
    detailLoading.value = false
  }
}

function openReview(row) {
  reviewOrder.value = row
  Object.assign(reviewForm, { approved: true, category: '', detail: '' })
  reviewDialog.value = true
}

async function submitReview() {
  // 拒绝时按「【类别】详细原因」提交；同意时说明为纯文本
  const detail = reviewForm.detail.trim()
  if (!reviewForm.approved) {
    if (!reviewForm.category) {
      ElMessage.warning('请选择拒绝原因类别')
      return
    }
    if (!detail) {
      ElMessage.warning('请填写拒绝原因')
      return
    }
  }
  const reason = reviewForm.approved ? detail : `【${reviewForm.category}】${detail}`
  submitting.value = true
  try {
    await reviewAfterSale(reviewOrder.value.afterSaleNo, reviewForm.approved, reason)
    reviewDialog.value = false
    ElMessage.success(reviewForm.approved ? '已同意售后' : '已拒绝售后')
    reloadDetail(reviewOrder.value.afterSaleNo)
    load()
  } catch { /* 后端已提示 */ } finally {
    submitting.value = false
  }
}

function refund(row) {
  ElMessageBox.confirm(
    `确认为售后单 ${row.afterSaleNo} 退款 ¥${row.amount}？退款后订单状态将变为已退款。`,
    '触发退款', { type: 'warning' }
  ).then(async () => {
    try {
      await refundAfterSale(row.afterSaleNo)
      ElMessage.success('退款成功')
      reloadDetail(row.afterSaleNo)
      load()
    } catch { /* 后端已提示 */ }
  }).catch(() => {})
}

function openAppeal(row) {
  appealOrder.value = row
  appealReason.value = ''
  appealDialog.value = true
}

async function submitAppeal() {
  if (!appealReason.value.trim()) {
    ElMessage.warning('请填写申诉原因')
    return
  }
  submitting.value = true
  try {
    await appealAfterSale(appealOrder.value.afterSaleNo, appealReason.value.trim())
    appealDialog.value = false
    ElMessage.success('申诉已提交，等待平台处理')
    reloadDetail(appealOrder.value.afterSaleNo)
    load()
  } catch { /* 后端已提示 */ } finally {
    submitting.value = false
  }
}

async function reloadDetail(afterSaleNo) {
  if (!drawer.value || detail.value?.afterSaleNo !== afterSaleNo) return
  try {
    const res = await fetchAfterSale(afterSaleNo)
    detail.value = res.data
  } catch { /* ignore */ }
}

function fmt(t) {
  return t ? String(t).replace('T', ' ').slice(0, 19) : '—'
}

function tagType(s) {
  return {
    PENDING_MERCHANT: 'warning',
    MERCHANT_REJECTED: 'danger',
    PENDING_PLATFORM: 'warning',
    APPROVED: 'primary',
    REFUNDED: 'success',
    PLATFORM_REJECTED: 'info',
    APPEALING: 'warning',
    APPEAL_APPROVED: 'danger'
  }[s] || 'info'
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tip {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}
.amount {
  color: #ff4b2b;
  font-weight: 600;
}
.cd {
  font-size: 12px;
  color: #e6a23c;
}
.cd.danger {
  color: #f56c6c;
}
.section {
  margin-top: 20px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}
.item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.g-img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.g-photo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.g-name {
  font-size: 14px;
}
.g-sku {
  font-size: 12px;
  color: #396afc;
  margin-top: 2px;
}
.g-price {
  font-size: 12px;
  color: #999;
  margin-top: 3px;
}
.drawer-actions {
  margin-top: 24px;
  text-align: right;
}
</style>
