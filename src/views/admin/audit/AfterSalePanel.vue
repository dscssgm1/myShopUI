<template>
  <div>
    <div class="toolbar">
      <el-radio-group v-model="status" size="small">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="PENDING_PLATFORM">待平台审核</el-radio-button>
        <el-radio-button value="APPEALING">待处理申诉</el-radio-button>
        <el-radio-button value="PENDING_MERCHANT">商家待审核</el-radio-button>
      </el-radio-group>
      <el-button v-perm="'admin:audit:aftersale'" size="small" type="primary" class="create-btn" @click="openCreate">代用户发起售后</el-button>
    </div>

    <el-table :data="items" size="small" v-loading="loading">
      <el-table-column prop="afterSaleNo" label="售后单号" width="190" />
      <el-table-column prop="shopName" label="店铺" width="130" show-overflow-tooltip />
      <el-table-column prop="orderNo" label="订单号" width="190" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'RETURN_REFUND' ? 'warning' : 'info'">
            {{ row.typeText }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="退款金额" width="100">
        <template #default="{ row }">¥{{ row.amount }}</template>
      </el-table-column>
      <el-table-column label="状态" width="130">
        <template #default="{ row }">
          <el-tag size="small" :type="tagType(row.status)">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="140" show-overflow-tooltip />
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row.afterSaleNo)">详情</el-button>
          <el-button
            v-if="row.status === 'PENDING_PLATFORM'"
            v-perm="'admin:audit:aftersale'"
            link type="warning" size="small" @click="openReview(row, 'platform')"
          >审核</el-button>
          <el-button
            v-if="row.status === 'APPEALING'"
            v-perm="'admin:audit:aftersale'"
            link type="danger" size="small" @click="openReview(row, 'appeal')"
          >处理申诉</el-button>
          <el-button
            v-if="row.status === 'APPROVED'"
            v-perm="'admin:audit:aftersale'"
            link type="danger" size="small" @click="refund(row)"
          >退款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />

    <!-- 审核 / 申诉处理 -->
    <el-dialog v-model="reviewDialog" :title="reviewKind === 'appeal' ? '处理商家申诉' : '平台审核售后'" width="500px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px">
        {{ reviewOrder?.afterSaleNo }} ｜ {{ reviewOrder?.shopName }} ｜ {{ reviewOrder?.typeText }}
        ｜ 退款 ¥{{ reviewOrder?.amount }}
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="reviewForm.approved">
            <el-radio :value="true">{{ reviewKind === 'appeal' ? '申诉成立' : '同意售后' }}</el-radio>
            <el-radio :value="false">{{ reviewKind === 'appeal' ? '驳回申诉' : '拒绝售后' }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="平台说明" :required="reviewKind === 'appeal' || !reviewForm.approved">
          <template v-if="reviewKind !== 'appeal' && !reviewForm.approved">
            <el-select
              v-model="reviewForm.category" filterable allow-create default-first-option
              placeholder="选择拒绝原因类别" style="width: 100%; margin-bottom: 8px"
            >
              <el-option v-for="r in rejectReasons" :key="r" :label="r" :value="r" />
            </el-select>
          </template>
          <el-input
            v-model="reviewForm.detail" type="textarea" :rows="3" maxlength="300" show-word-limit
            :placeholder="reviewKind === 'appeal' ? '请说明申诉处理依据' : '请填写具体原因，用户与商家将看到该说明'"
          />
        </el-form-item>
        <el-alert
          v-if="reviewKind === 'appeal' && reviewForm.approved"
          type="warning" :closable="false" show-icon
          title="申诉成立后将给用户生成补款订单，用户支付前无法继续购物。"
        />
      </el-form>
      <template #footer>
        <el-button @click="reviewDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReview">提交</el-button>
      </template>
    </el-dialog>

    <!-- 代用户发起售后 -->
    <el-dialog v-model="createDialog" title="代用户发起售后" width="520px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px">
        用于客服与用户协商后由平台代发起。请确认订单已发货或已完成。
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="订单号" required>
          <el-input v-model="createForm.orderNo" placeholder="请输入订单号" />
        </el-form-item>
        <el-form-item label="用户 ID" required>
          <el-input v-model.number="createForm.userId" placeholder="售后归属用户 ID" />
        </el-form-item>
        <el-form-item label="售后类型" required>
          <el-radio-group v-model="createForm.type">
            <el-radio value="REFUND_ONLY">仅退款</el-radio>
            <el-radio value="RETURN_REFUND">退货退款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="售后原因" required>
          <el-select
            v-model="createForm.reason" filterable allow-create default-first-option
            placeholder="选择或输入协商确认的售后原因" style="width: 100%"
          >
            <el-option v-for="r in afterSaleReasons" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题描述">
          <el-input
            v-model="createForm.description" type="textarea" :rows="3" maxlength="500" show-word-limit
            placeholder="客服协商记录（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">提交</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawer" title="售后详情" size="620px">
      <div v-if="detail" v-loading="detailLoading">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="售后单号" :span="2">{{ detail.afterSaleNo }}</el-descriptions-item>
          <el-descriptions-item label="订单号" :span="2">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="店铺">{{ detail.shopName }}</el-descriptions-item>
          <el-descriptions-item label="用户 ID">{{ detail.userId }}</el-descriptions-item>
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
          <el-descriptions-item label="处理截止">{{ fmt(detail.deadlineAt) }}</el-descriptions-item>
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
            :title="`补款订单：${detail.recoveryOrderNo}`"
          />
        </div>

        <div class="drawer-actions">
          <el-button
            v-if="detail.status === 'PENDING_PLATFORM'"
            v-perm="'admin:audit:aftersale'"
            type="primary" @click="openReview(detail, 'platform')"
          >审核</el-button>
          <el-button
            v-if="detail.status === 'APPEALING'"
            v-perm="'admin:audit:aftersale'"
            type="danger" @click="openReview(detail, 'appeal')"
          >处理申诉</el-button>
          <el-button
            v-if="detail.status === 'APPROVED'"
            v-perm="'admin:audit:aftersale'"
            type="danger" @click="refund(detail)"
          >代为退款</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  appealReviewAfterSale, createAfterSale, fetchAfterSale, fetchPlatformAfterSales,
  platformReviewAfterSale, refundAfterSale
} from '../../../api/afterSale'
import { fetchPublicConfigMap, parseConfigJson } from '../../../api/config'

// 审核动作完成后通知壳子刷新各 Tab 角标
const emit = defineEmits(['changed'])

// 原因快选均来自平台配置中心，未配置时用默认列表
const DEFAULT_AFTER_SALE_REASONS = ['不想要了', '商品质量问题', '商品与描述不符', '发错货/漏发', '其他原因']
const afterSaleReasons = ref(DEFAULT_AFTER_SALE_REASONS)
const DEFAULT_REJECT_REASONS = ['凭证不足', '商品已使用影响二次销售', '超出售后期限', '商品无质量问题', '其他']
const rejectReasons = ref(DEFAULT_REJECT_REASONS)

async function loadReasonPresets() {
  try {
    const map = await fetchPublicConfigMap('aftersale-reason', { silent: true })
    const list = parseConfigJson(map.default, [])
    if (Array.isArray(list) && list.length) afterSaleReasons.value = list
  } catch { /* 保留默认售后原因 */ }
  try {
    const map = await fetchPublicConfigMap('aftersale-reject-reason', { silent: true })
    const list = parseConfigJson(map.default, [])
    if (Array.isArray(list) && list.length) rejectReasons.value = list
  } catch { /* 保留默认拒绝原因 */ }
}

const items = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('')
const loading = ref(false)
const submitting = ref(false)

const drawer = ref(false)
const detail = ref(null)
const detailLoading = ref(false)

const reviewDialog = ref(false)
const reviewKind = ref('platform')
const reviewOrder = ref(null)
const reviewForm = reactive({ approved: true, category: '', detail: '' })

const createDialog = ref(false)
const createForm = reactive({ orderNo: '', userId: null, type: 'REFUND_ONLY', reason: '', description: '' })

onMounted(() => {
  load()
  loadReasonPresets()
})
watch(status, () => { page.value = 1; load() })

async function load() {
  loading.value = true
  try {
    const res = await fetchPlatformAfterSales({ status: status.value || undefined, page: page.value, size })
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

function openReview(row, kind) {
  reviewOrder.value = row
  reviewKind.value = kind
  Object.assign(reviewForm, { approved: true, category: '', detail: '' })
  reviewDialog.value = true
}

async function submitReview() {
  const detail = reviewForm.detail.trim()
  const isAppeal = reviewKind.value === 'appeal'
  // 拒绝售后按「【类别】详细原因」提交；申诉处理与同意说明为纯文本
  if (!isAppeal && !reviewForm.approved) {
    if (!reviewForm.category) {
      ElMessage.warning('请选择拒绝原因类别')
      return
    }
    if (!detail) {
      ElMessage.warning('请填写平台说明')
      return
    }
  } else if (!reviewForm.approved || isAppeal) {
    if (!detail) {
      ElMessage.warning('请填写平台说明')
      return
    }
  }
  const reason = !isAppeal && !reviewForm.approved ? `【${reviewForm.category}】${detail}` : detail
  submitting.value = true
  try {
    if (isAppeal) {
      await appealReviewAfterSale(reviewOrder.value.afterSaleNo, reviewForm.approved, reason)
    } else {
      await platformReviewAfterSale(reviewOrder.value.afterSaleNo, reviewForm.approved, reason)
    }
    reviewDialog.value = false
    ElMessage.success('处理完成')
    reloadDetail(reviewOrder.value.afterSaleNo)
    load()
    emit('changed')
  } catch { /* 后端已提示 */ } finally {
    submitting.value = false
  }
}

function refund(row) {
  ElMessageBox.confirm(`确认代商家退款 ¥${row.amount}？`, '代为退款', { type: 'warning' })
    .then(async () => {
      try {
        await refundAfterSale(row.afterSaleNo)
        ElMessage.success('退款成功')
        reloadDetail(row.afterSaleNo)
        load()
        emit('changed')
      } catch { /* 后端已提示 */ }
    })
    .catch(() => {})
}

function openCreate() {
  Object.assign(createForm, { orderNo: '', userId: null, type: 'REFUND_ONLY', reason: '', description: '' })
  createDialog.value = true
}

async function submitCreate() {
  if (!createForm.orderNo.trim() || !createForm.userId || !createForm.reason.trim()) {
    ElMessage.warning('请填写订单号、用户 ID 和售后原因')
    return
  }
  submitting.value = true
  try {
    const res = await createAfterSale({
      orderNo: createForm.orderNo.trim(),
      userId: createForm.userId,
      type: createForm.type,
      reason: createForm.reason.trim(),
      description: createForm.description
    })
    createDialog.value = false
    ElMessage.success('售后已代用户发起')
    load()
    emit('changed')
    if (res.data?.afterSaleNo) openDetail(res.data.afterSaleNo)
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
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.create-btn {
  margin-left: auto;
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
