<template>
  <div class="orders-page">
    <h3>📦 我的订单 <span class="sub">每个店铺一个独立订单</span></h3>

    <el-tabs v-model="status">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane label="待付款" name="UNPAID" />
      <el-tab-pane label="待发货" name="PAID" />
      <el-tab-pane label="待收货" name="SHIPPED" />
      <el-tab-pane label="已完成" name="COMPLETED" />
      <el-tab-pane label="售后中" name="AFTER_SALE" />
      <el-tab-pane label="已退款" name="REFUNDED" />
      <el-tab-pane label="已取消" name="CANCELLED" />
    </el-tabs>

    <div v-loading="loading">
      <el-empty v-if="!loading && !orders.length" description="暂无相关订单" />

      <div v-for="o in orders" :key="o.orderNo" class="order-card">
        <div class="o-head">
          <span class="time">{{ o.createdAt }}</span>
          <span class="no">订单号：{{ o.orderNo }}</span>
          <span class="shop">🏪 {{ o.shopName }}</span>
          <el-tag v-if="o.bizType === 'RECOVERY'" size="small" type="warning">补款订单</el-tag>
          <el-tag v-if="o.bizType === 'POINTS'" size="small" type="danger">积分兑换</el-tag>
          <span v-if="o.sourceOrderNo" class="source">原订单：{{ o.sourceOrderNo }}</span>
          <span class="status-tag" :class="'s-' + o.status">{{ o.statusText }}</span>
          <span class="addr">📍 {{ o.receiverName }} {{ o.receiverPhone }}</span>
        </div>

        <div class="o-body">
          <div class="items">
            <div v-for="item in o.items" :key="`${item.productId}-${item.skuId}`" class="item">
              <div class="g-img" :style="{ background: item.productColor }">{{ item.productEmoji }}</div>
              <div class="g-info">
                <div class="g-name">{{ item.productName }}</div>
                <div v-if="item.skuSpecs" class="g-sku">{{ item.skuSpecs }}</div>
                <div class="g-price">¥{{ item.price }} × {{ item.quantity }}</div>
              </div>
            </div>
          </div>
          <div class="amount">
            实付<br /><b>¥{{ o.payAmount }}</b>
          </div>
          <div class="actions">
            <template v-if="o.status === 'UNPAID'">
              <el-button type="danger" size="small" @click="$router.push(`/pay/${o.orderNo}`)">去支付</el-button>
              <el-button v-if="o.bizType !== 'RECOVERY'" size="small" @click="cancel(o)">取消订单</el-button>
            </template>
            <template v-if="o.status === 'PAID'">
              <el-button v-if="o.bizType !== 'RECOVERY'" size="small" @click="cancel(o)">取消订单</el-button>
              <span class="done">待商家发货</span>
            </template>
            <el-button v-if="o.status === 'SHIPPED'" type="primary" size="small" @click="confirm(o)">确认收货</el-button>
            <el-button
              v-if="o.status === 'SHIPPED' || o.status === 'COMPLETED'"
              size="small" plain @click="openTracking(o)"
            >查看物流</el-button>
            <el-button
              v-if="o.status === 'SHIPPED' || o.status === 'COMPLETED'"
              size="small" type="warning" plain @click="openAfterSale(o)"
            >申请售后</el-button>
            <el-button v-if="o.status === 'COMPLETED'" type="warning" size="small" plain @click="openReview(o)">去评价</el-button>
            <el-button v-if="o.status === 'AFTER_SALE'" size="small" @click="goAfterSale(o)">查看售后</el-button>
            <span v-if="o.status === 'COMPLETED'" class="done">已完成</span>
            <span v-if="o.status === 'REFUNDED'" class="done">已退款</span>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="total > size"
        v-model:current-page="page" :page-size="size" :total="total"
        layout="prev, pager, next" style="justify-content: center; margin-top: 20px"
        @current-change="load"
      />
    </div>

    <el-dialog v-model="reviewDialog" title="商品评价" width="580px">
      <div v-loading="reviewLoading">
        <el-empty v-if="!reviewItems.length" description="暂无可评价商品" />
        <div v-for="it in reviewItems" :key="it.productId" class="review-row">
          <div class="review-name">
            {{ it.productName }}
            <span v-if="it.skuSpecs" class="sku">{{ it.skuSpecs }}</span>
          </div>
          <el-tag v-if="it.reviewed" size="small" type="success">已评价</el-tag>
          <div v-else class="review-form">
            <div v-for="d in REVIEW_DIMENSIONS" :key="d.key" class="dim-rate">
              <span class="dim-label">{{ d.label }}</span>
              <el-rate v-model="it[d.key]" allow-half />
            </div>
            <div class="overall-line">综合评分：<b>{{ overallScore(it) }}</b> 分</div>
            <el-input
              v-model="it.content" type="textarea" :rows="2" maxlength="500" show-word-limit
              placeholder="至少 5 个字，分享真实使用体验（含敏感词将被拒绝）"
            />
            <ImageUpload v-model="it.images" :limit="9" />
            <el-button type="primary" size="small" :loading="it.submitting" @click="submitReview(it)">
              提交评价
            </el-button>
          </div>
        </div>
        <p class="review-tip">仅已完成订单可评价；同一商品终身只能评价一次，订单完成后 30 天内有效。</p>
      </div>
    </el-dialog>

    <!-- 查看物流 -->
    <el-dialog v-model="trackingDialog" title="物流信息" width="520px">
      <div v-loading="trackingLoading">
        <el-empty v-if="!trackingLoading && !tracking" description="暂无物流信息，商家发货后可查看" />
        <template v-else-if="tracking">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="运单号">{{ tracking.trackingNo }}</el-descriptions-item>
            <el-descriptions-item label="物流公司">{{ tracking.companyName }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag size="small" :type="tracking.status === 'SIGNED' ? 'success' : 'primary'">
                {{ tracking.statusText }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="发货时间">{{ fmtTime(tracking.createdAt) }}</el-descriptions-item>
          </el-descriptions>
          <el-divider content-position="left">物流轨迹</el-divider>
          <el-timeline style="padding-left: 8px">
            <el-timeline-item
              v-for="(t, i) in tracking.traces" :key="i"
              :type="i === 0 ? 'primary' : ''" :hollow="i !== 0" :timestamp="fmtTime(t.createdAt)"
            >{{ t.content }}</el-timeline-item>
          </el-timeline>
        </template>
      </div>
    </el-dialog>

    <!-- 申请售后 -->
    <el-dialog v-model="afterSaleDialog" title="申请售后" width="520px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px">
        订单 {{ afterSaleOrder?.orderNo }} ｜ {{ afterSaleOrder?.shopName }}
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="售后类型" required>
          <el-radio-group v-model="afterSaleForm.type">
            <el-radio value="REFUND_ONLY">仅退款</el-radio>
            <el-radio value="RETURN_REFUND">退货退款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="售后原因" required>
          <el-select
            v-model="afterSaleForm.reason" filterable allow-create default-first-option
            placeholder="请选择或输入原因" style="width: 100%"
          >
            <el-option v-for="r in afterSaleReasons" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题描述">
          <el-input
            v-model="afterSaleForm.description" type="textarea" :rows="3"
            maxlength="500" show-word-limit placeholder="请补充说明问题（选填）"
          />
        </el-form-item>
        <el-form-item>
          <div class="as-tip">
            退货退款审核通过后将生成退货运单与取件码，请在两天内预约快递上门取件。
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="afterSaleDialog = false">取消</el-button>
        <el-button type="primary" :loading="afterSaleSubmitting" @click="submitAfterSale">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cancelOrder, confirmShopOrder, fetchOrders } from '../api/trade'
import { createReview, fetchReviewable } from '../api/review'
import { createAfterSale } from '../api/afterSale'
import { fetchShipmentByOrder } from '../api/logistics'
import { fetchPublicConfigMap, parseConfigJson } from '../api/config'
import ImageUpload from '../components/ImageUpload.vue'

const router = useRouter()
const DEFAULT_AFTER_SALE_REASONS = ['商品质量问题', '商品与描述不符', '少件/漏发', '包装破损', '不想要了', '其他原因']
const afterSaleReasons = ref(DEFAULT_AFTER_SALE_REASONS)

const orders = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('')
const loading = ref(false)

onMounted(() => {
  load()
  loadAfterSaleReasons()
})
watch(status, () => { page.value = 1; load() })

/** 售后原因由平台配置中心维护，未配置时使用默认列表 */
async function loadAfterSaleReasons() {
  try {
    const map = await fetchPublicConfigMap('aftersale-reason', { silent: true })
    const list = parseConfigJson(map.default, [])
    if (Array.isArray(list) && list.length) afterSaleReasons.value = list
  } catch { /* 保留默认售后原因 */ }
}

async function load() {
  loading.value = true
  try {
    const res = await fetchOrders({ status: status.value || undefined, page: page.value, size })
    orders.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { orders.value = [] } finally { loading.value = false }
}

function confirm(order) {
  ElMessageBox.confirm(`确认已收到「${order.shopName}」的包裹？`, '确认收货', { type: 'info' }).then(async () => {
    await confirmShopOrder(order.orderNo)
    ElMessage.success('已确认收货')
    load()
  })
}

function cancel(order) {
  const paid = order.status === 'PAID'
  ElMessageBox.confirm(
    paid ? '商家尚未发货，取消后将原路退款，确定取消该订单吗？' : '确定取消该订单吗？',
    '提示', { type: 'warning' }
  ).then(async () => {
    await cancelOrder(order.orderNo)
    ElMessage.success(paid ? '订单已取消，退款将原路退回' : '订单已取消')
    load()
  })
}

// ==================== 查看物流 ====================

const trackingDialog = ref(false)
const trackingLoading = ref(false)
const tracking = ref(null)

const fmtTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function openTracking(order) {
  trackingDialog.value = true
  trackingLoading.value = true
  tracking.value = null
  try {
    const res = await fetchShipmentByOrder(order.orderNo)
    tracking.value = res.data
  } catch {
    tracking.value = null
  } finally {
    trackingLoading.value = false
  }
}

// ==================== 售后 ====================

const afterSaleDialog = ref(false)
const afterSaleSubmitting = ref(false)
const afterSaleOrder = ref(null)
const afterSaleForm = reactive({ type: 'REFUND_ONLY', reason: '', description: '' })

function openAfterSale(order) {
  afterSaleOrder.value = order
  Object.assign(afterSaleForm, { type: 'REFUND_ONLY', reason: '', description: '' })
  afterSaleDialog.value = true
}

async function submitAfterSale() {
  if (!afterSaleForm.reason) {
    ElMessage.warning('请选择或填写售后原因')
    return
  }
  afterSaleSubmitting.value = true
  try {
    const res = await createAfterSale({
      orderNo: afterSaleOrder.value.orderNo,
      type: afterSaleForm.type,
      reason: afterSaleForm.reason,
      description: afterSaleForm.description
    })
    afterSaleDialog.value = false
    ElMessage.success('售后申请已提交，商家将在 24 小时内处理')
    router.push({ path: '/user/after-sales', query: { no: res.data?.afterSaleNo } })
  } catch { /* 后端已提示具体原因 */ } finally {
    afterSaleSubmitting.value = false
  }
}

function goAfterSale(order) {
  router.push({ path: '/user/after-sales', query: { orderNo: order.orderNo } })
}

// ==================== 评价 ====================

const reviewDialog = ref(false)
const reviewLoading = ref(false)
const reviewItems = ref([])
const currentOrder = ref(null)

async function openReview(order) {
  currentOrder.value = order
  reviewItems.value = []
  reviewDialog.value = true
  reviewLoading.value = true
  try {
    const res = await fetchReviewable(order.orderNo)
    reviewItems.value = (res.data || []).map((it) => ({
      ...it, quality: 5, service: 5, logistics: 5, content: '', images: [], submitting: false
    }))
  } catch {
    reviewItems.value = []
  } finally {
    reviewLoading.value = false
  }
}

// 评价三维度（与原型一致）：综合分 = 三者平均
const REVIEW_DIMENSIONS = [
  { key: 'quality', label: '商品质量' },
  { key: 'service', label: '服务态度' },
  { key: 'logistics', label: '物流速度' }
]
const overallScore = (it) => (((it.quality + it.service + it.logistics) / 3).toFixed(1))

async function submitReview(item) {
  const content = (item.content || '').trim()
  if (content.length < 5) {
    ElMessage.warning('评价内容至少 5 个字')
    return
  }
  item.submitting = true
  try {
    const res = await createReview({
      productId: item.productId,
      orderNo: currentOrder.value.orderNo,
      rating: Math.round((item.quality + item.service + item.logistics) / 3),
      qualityRating: item.quality,
      serviceRating: item.service,
      logisticsRating: item.logistics,
      content,
      images: (item.images || []).filter(Boolean)
    })
    item.reviewed = true
    ElMessage.success(res.data?.status === 'PENDING'
      ? '评价已提交，待平台审核后展示（审核通过后发放奖励积分）'
      : '评价成功，奖励积分已发放')
  } catch { /* 后端已提示具体原因 */ } finally {
    item.submitting = false
  }
}
</script>

<style scoped>
.orders-page {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
h3 {
  margin-bottom: 8px;
}
.sub {
  font-size: 13px;
  color: #999;
  font-weight: 400;
}
.order-card {
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 14px;
  overflow: hidden;
}
.o-head {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fafafa;
  padding: 10px 16px;
  font-size: 13px;
  color: #666;
  flex-wrap: wrap;
}
.no {
  color: #999;
}
.shop {
  font-weight: 600;
  color: #333;
}
.addr {
  margin-left: auto;
  color: #999;
  font-size: 12px;
}
.status-tag {
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #f0f2f5;
  color: #666;
}
.status-tag.s-UNPAID {
  background: #fef0f0;
  color: #f56c6c;
}
.status-tag.s-PAID {
  background: #fdf6ec;
  color: #e6a23c;
}
.status-tag.s-SHIPPED {
  background: #ecf5ff;
  color: #409eff;
}
.status-tag.s-COMPLETED {
  background: #f0f9eb;
  color: #67c23a;
}
.status-tag.s-CANCELLED {
  background: #f4f4f5;
  color: #909399;
}
.status-tag.s-AFTER_SALE {
  background: #fdf6ec;
  color: #e6a23c;
}
.status-tag.s-REFUNDED {
  background: #f4f4f5;
  color: #909399;
}
.source {
  font-size: 12px;
  color: #999;
}
.as-tip {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}
.o-body {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 16px;
}
.items {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item {
  display: flex;
  gap: 12px;
  align-items: center;
}
.g-img {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
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
.amount {
  width: 100px;
  text-align: center;
  font-size: 13px;
  color: #666;
  line-height: 1.8;
}
.amount b {
  color: #ff4b2b;
  font-size: 16px;
}
.actions {
  width: 120px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}
.done {
  font-size: 12px;
  color: #bbb;
}
.review-row {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.review-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
  min-width: 220px;
}
.review-name .sku {
  font-weight: 400;
  font-size: 12px;
  color: #999;
  margin-left: 6px;
}
.review-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.dim-rate {
  display: flex;
  align-items: center;
  gap: 12px;
}
.dim-label {
  width: 60px;
  font-size: 13px;
  color: #666;
}
.overall-line {
  font-size: 13px;
  color: #666;
}
.overall-line b {
  color: #ff4b2b;
  font-size: 16px;
}
.review-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
