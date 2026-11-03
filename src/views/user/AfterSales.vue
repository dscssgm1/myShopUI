<template>
  <div class="page-card">
    <div class="head">
      <h3>🔄 我的售后</h3>
      <el-select v-model="status" size="small" placeholder="全部状态" clearable style="width: 150px">
        <el-option v-for="s in STATUS_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
      </el-select>
    </div>

    <div v-loading="loading">
      <el-empty v-if="!loading && !items.length" description="暂无售后记录">
        <el-button type="primary" @click="$router.push('/user/orders')">查看我的订单</el-button>
      </el-empty>

      <div v-for="a in items" :key="a.afterSaleNo" class="as-card" @click="openDetail(a.afterSaleNo)">
        <div class="as-head">
          <span class="no">售后单号：{{ a.afterSaleNo }}</span>
          <span class="shop">🏪 {{ a.shopName }}</span>
          <el-tag size="small" :type="tagType(a.status)">{{ a.statusText }}</el-tag>
          <span class="time">{{ fmt(a.createdAt) }}</span>
        </div>
        <div class="as-body">
          <div class="as-type">{{ a.typeText }}</div>
          <div class="as-reason">{{ a.reason }}</div>
          <div class="as-order">订单：{{ a.orderNo }}</div>
          <div class="as-amount">退款金额 <b>¥{{ a.amount }}</b></div>
        </div>
        <div
          v-if="a.status === 'PENDING_MERCHANT' && a.deadlineAt"
          class="as-tip countdown" :class="{ danger: remainingMs(a.deadlineAt) < WARNING_MS }"
        >
          ⏳ 商家剩余处理时间：{{ remainingText(a.deadlineAt) }}
        </div>
        <div v-if="a.status === 'MERCHANT_REJECTED'" class="as-tip danger">
          商家已拒绝：{{ a.merchantReason || '未填写原因' }}，你可以申请平台介入
        </div>
        <div v-else-if="a.status === 'APPEAL_APPROVED'" class="as-tip danger">
          平台判定退货不满足退款条件，已生成补款订单 {{ a.recoveryOrderNo }}，请尽快支付
        </div>
        <div v-else-if="a.status === 'REFUNDED'" class="as-tip success">
          已于 {{ fmt(a.refundedAt) }} 退款 ¥{{ a.amount }}，款项将原路退回
        </div>
      </div>

      <el-pagination
        v-if="total > size"
        v-model:current-page="page" :page-size="size" :total="total"
        layout="prev, pager, next" style="justify-content: center; margin-top: 20px"
        @current-change="load"
      />
    </div>

    <!-- 详情 -->
    <el-drawer v-model="drawer" title="售后详情" size="640px">
      <div v-if="detail" v-loading="detailLoading" class="detail">
        <el-alert
          :title="detail.statusText" :type="alertType(detail.status)" :closable="false" show-icon
          :description="statusHint(detail)"
          style="margin-bottom: 16px"
        />

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="售后单号" :span="2">{{ detail.afterSaleNo }}</el-descriptions-item>
          <el-descriptions-item label="订单号" :span="2">
            {{ detail.orderNo }}
            <el-button link type="primary" size="small" @click="$router.push('/user/orders')">查看订单</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="店铺">{{ detail.shopName }}</el-descriptions-item>
          <el-descriptions-item label="售后类型">{{ detail.typeText }}</el-descriptions-item>
          <el-descriptions-item label="退款金额">
            <span class="amount">¥{{ detail.amount }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="发起方">{{ detail.initiatorText }}</el-descriptions-item>
          <el-descriptions-item label="售后原因" :span="2">{{ detail.reason }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.description" label="问题描述" :span="2">
            {{ detail.description }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ fmt(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.deadlineAt" label="商家处理截止">
            {{ fmt(detail.deadlineAt) }}
            <span
              v-if="detail.status === 'PENDING_MERCHANT'"
              class="cd" :class="{ danger: remainingMs(detail.deadlineAt) < WARNING_MS }"
            >（{{ remainingText(detail.deadlineAt) }}）</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.merchantReason" label="商家说明" :span="2">
            {{ detail.merchantReason }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.platformReason" label="平台说明" :span="2">
            {{ detail.platformReason }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.refundedAt" label="退款时间">
            {{ fmt(detail.refundedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="detail.items?.length" class="section">
          <div class="section-title">售后商品</div>
          <div v-for="it in detail.items" :key="`${it.productId}-${it.skuId}`" class="item">
            <div class="g-img" :style="{ background: it.productColor }">{{ it.productEmoji }}</div>
            <div class="g-info">
              <div class="g-name">{{ it.productName }}</div>
              <div v-if="it.skuSpecs" class="g-sku">{{ it.skuSpecs }}</div>
              <div class="g-price">¥{{ it.price }} × {{ it.quantity }}</div>
            </div>
          </div>
        </div>

        <!-- 退货物流 -->
        <div v-if="detail.returnTrackingNo" class="section">
          <div class="section-title">退货物流</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="退货运单号">{{ detail.returnTrackingNo }}</el-descriptions-item>
            <el-descriptions-item label="物流公司">{{ detail.returnShipmentCompany || '待分配' }}</el-descriptions-item>
            <el-descriptions-item label="物流状态">
              {{ detail.returnShipmentStatusText || '待快递员上门取件' }}
            </el-descriptions-item>
            <el-descriptions-item label="取件码">
              <span class="pickup-code">{{ detail.pickupCode }}</span>
            </el-descriptions-item>
          </el-descriptions>
          <div class="hint">请将商品包装好交给快递员，并告知取件码 {{ detail.pickupCode }}。</div>

          <template v-if="canAppoint">
            <div v-if="detail.appointmentTime" class="hint success">
              已预约上门取件：{{ fmt(detail.appointmentTime) }}
            </div>
            <div v-else class="appoint-box">
              <div class="section-title">预约上门取件</div>
              <el-date-picker
                v-model="appointmentTime" type="datetime" placeholder="选择上门时间"
                value-format="YYYY-MM-DDTHH:mm:ss" :disabled-date="disabledDate"
                style="width: 240px"
              />
              <el-button type="primary" size="small" :loading="appointing" @click="appoint">
                确认预约
              </el-button>
              <div class="hint">仅支持预约两天以内的上门时间。</div>
            </div>
          </template>
          <div v-else-if="detail.appointmentTime" class="hint">
            预约上门时间：{{ fmt(detail.appointmentTime) }}
          </div>
        </div>

        <!-- 补款订单 -->
        <div v-if="detail.recoveryOrderNo" class="section recovery">
          <div class="section-title">补款订单</div>
          <p>
            平台审核确认退货不满足退款条件，已为你生成补款订单
            <b>{{ detail.recoveryOrderNo }}</b>。请支付该订单，商家将把退回的商品重新寄给你。
          </p>
          <el-alert
            type="warning" :closable="false" show-icon
            title="支付该补款订单前，你的下单、加购与支付功能将被限制。"
          />
          <el-button type="danger" style="margin-top: 10px" @click="$router.push(`/pay/${detail.recoveryOrderNo}`)">
            去支付补款订单
          </el-button>
        </div>

        <div class="drawer-actions">
          <el-button
            v-if="detail.status === 'MERCHANT_REJECTED'"
            type="danger" @click="escalate"
          >申请平台介入</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  appointAfterSale, escalateAfterSale, fetchAfterSale, fetchMyAfterSales, timeoutEscalateAfterSale
} from '../../api/afterSale'

const route = useRoute()

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
    ElMessage.success(`售后单 ${no} 商家审核超时，已自动转交平台审核`)
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

const STATUS_OPTIONS = [
  { value: 'PENDING_MERCHANT', label: '待商家审核' },
  { value: 'MERCHANT_REJECTED', label: '商家已拒绝' },
  { value: 'PENDING_PLATFORM', label: '待平台审核' },
  { value: 'APPROVED', label: '待退款' },
  { value: 'REFUNDED', label: '已退款' },
  { value: 'PLATFORM_REJECTED', label: '平台已拒绝' },
  { value: 'APPEALING', label: '商家申诉中' },
  { value: 'APPEAL_APPROVED', label: '补款订单待支付' }
]

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('')
const loading = ref(false)

const drawer = ref(false)
const detail = ref(null)
const detailLoading = ref(false)
const appointmentTime = ref('')
const appointing = ref(false)

// 商家可能先退款后退货，已退款/申诉中但仍需上门取件时也可以预约
const canAppoint = computed(() => {
  const d = detail.value
  return !!d && d.type === 'RETURN_REFUND' && !!d.returnTrackingNo
    && ['APPROVED', 'REFUNDED', 'APPEALING', 'APPEAL_APPROVED'].includes(d.status)
})

onMounted(async () => {
  countdownTimer = setInterval(() => { nowTick.value = Date.now() }, 30_000)
  await load()
  items.value.forEach(escalateIfTimeout)
  if (route.query.no) {
    openDetail(route.query.no)
  } else if (route.query.orderNo) {
    try {
      const res = await fetchMyAfterSales({ page: 1, size: 100 })
      const found = (res.data?.list || []).find((a) => a.orderNo === route.query.orderNo)
      if (found) openDetail(found.afterSaleNo)
    } catch { /* ignore */ }
  }
})

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

watch(status, () => { page.value = 1; load() })

async function load() {
  loading.value = true
  try {
    const res = await fetchMyAfterSales({ status: status.value || undefined, page: page.value, size })
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
  appointmentTime.value = ''
  try {
    const res = await fetchAfterSale(afterSaleNo)
    detail.value = res.data
  } catch {
    drawer.value = false
  } finally {
    detailLoading.value = false
  }
}

function escalate() {
  ElMessageBox.confirm('商家已拒绝本次售后，确定申请平台介入审核吗？', '申请平台介入', { type: 'warning' })
    .then(async () => {
      try {
        const res = await escalateAfterSale(detail.value.afterSaleNo)
        detail.value = res.data
        ElMessage.success('已提交平台审核')
        load()
      } catch { /* 后端已提示 */ }
    })
    .catch(() => {})
}

async function appoint() {
  if (!appointmentTime.value) {
    ElMessage.warning('请选择上门取件时间')
    return
  }
  appointing.value = true
  try {
    const res = await appointAfterSale(detail.value.afterSaleNo, appointmentTime.value)
    detail.value = res.data
    ElMessage.success('预约成功，请等待快递员联系')
    load()
  } catch { /* 后端已提示 */ } finally {
    appointing.value = false
  }
}

function disabledDate(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limit = new Date()
  limit.setDate(limit.getDate() + 2)
  limit.setHours(23, 59, 59, 999)
  return date.getTime() < today.getTime() || date.getTime() > limit.getTime()
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

function alertType(s) {
  return {
    REFUNDED: 'success',
    MERCHANT_REJECTED: 'error',
    PLATFORM_REJECTED: 'error',
    APPEAL_APPROVED: 'error',
    APPEALING: 'warning'
  }[s] || 'info'
}

function statusHint(a) {
  switch (a.status) {
    case 'PENDING_MERCHANT':
      return `商家将在 24 小时内审核，剩余 ${remainingText(a.deadlineAt)}，超时未处理将自动转交平台审核。`
    case 'MERCHANT_REJECTED':
      return '商家已拒绝本次售后，你可以申请平台介入。'
    case 'PENDING_PLATFORM':
      return '平台正在审核，请耐心等待。'
    case 'APPROVED':
      return a.type === 'RETURN_REFUND'
        ? '商家已同意退货退款，请预约快递上门取件；商家收到退货并确认后将触发退款。'
        : '商家已同意退款，等待商家触发退款。'
    case 'REFUNDED':
      return '退款已完成，款项将原路退回。'
    case 'PLATFORM_REJECTED':
      return '平台审核未通过，本次售后已结束。如有疑问请联系客服。'
    case 'APPEALING':
      return '商家对退货情况发起申诉，平台正在处理。'
    case 'APPEAL_APPROVED':
      return '平台判定退货不满足退款条件，已生成补款订单，请支付后将商品寄回给你。'
    default:
      return ''
  }
}
</script>

<style scoped>
.page-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.head h3 {
  margin: 0;
}
.as-card {
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 14px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.as-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}
.as-head {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  background: #fafafa;
  padding: 10px 16px;
  font-size: 13px;
  color: #666;
}
.as-head .no {
  color: #999;
}
.as-head .shop {
  font-weight: 600;
  color: #333;
}
.as-head .time {
  margin-left: auto;
  color: #999;
  font-size: 12px;
}
.as-body {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  font-size: 13px;
  color: #666;
}
.as-type {
  font-weight: 600;
  color: #333;
}
.as-reason {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.as-order {
  color: #999;
  font-size: 12px;
}
.as-amount b {
  color: #ff4b2b;
}
.as-tip {
  padding: 8px 16px;
  font-size: 12px;
  background: #fafafa;
  border-top: 1px dashed #eee;
}
.as-tip.danger {
  color: #f56c6c;
}
.as-tip.success {
  color: #67c23a;
}
.as-tip.countdown {
  color: #e6a23c;
}
.as-tip.countdown.danger {
  color: #f56c6c;
}
.cd {
  font-size: 12px;
  color: #e6a23c;
}
.cd.danger {
  color: #f56c6c;
}
.detail {
  padding-bottom: 20px;
}
.amount {
  color: #ff4b2b;
  font-weight: 600;
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
.pickup-code {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #ff4b2b;
}
.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}
.hint.success {
  color: #67c23a;
}
.appoint-box {
  margin-top: 16px;
  padding: 14px;
  background: #fafafa;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.appoint-box .section-title {
  width: 100%;
  margin-bottom: 0;
}
.appoint-box .hint {
  width: 100%;
  margin-top: 0;
}
.recovery {
  border: 1px solid #fde2e2;
  background: #fef7f7;
  border-radius: 8px;
  padding: 14px;
}
.recovery p {
  font-size: 13px;
  color: #666;
  line-height: 1.7;
  margin: 0 0 8px;
}
.drawer-actions {
  margin-top: 24px;
  text-align: right;
}
</style>
