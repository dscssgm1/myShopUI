<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>促销管理</b>
        <div class="filters">
          <el-radio-group v-model="status" size="small" @change="load">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="active">进行中</el-radio-button>
            <el-radio-button value="ENDED">已结束</el-radio-button>
          </el-radio-group>
          <el-button type="primary" size="small" @click="openAdd">+ 新建活动</el-button>
        </div>
      </div>
    </template>

    <el-tabs v-model="tab" @tab-change="onTabChange">
      <!-- ==================== 活动管理 ==================== -->
      <el-tab-pane label="活动管理" name="promotions">
        <el-table :data="rows" size="small" v-loading="loading">
          <el-table-column label="活动" min-width="220">
            <template #default="{ row }">
              <span class="dot" :style="{ background: row.color || '#ff4b2b' }" />
              <b>{{ row.title }}</b>
              <div class="sub">
                {{ row.shopId > 0 ? `商家「${row.shopName}」自建` : (row.type || '平台促销') }}
                ｜ {{ row.description || '无描述' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="优惠规则" min-width="180">
            <template #default="{ row }">{{ ruleText(row) }}</template>
          </el-table-column>
          <el-table-column label="适用范围" min-width="130">
            <template #default="{ row }">{{ scopeText(row) }}</template>
          </el-table-column>
          <el-table-column label="参与方式 / 承担" min-width="150">
            <template #default="{ row }">
              <template v-if="row.shopId > 0">商家自建 · 商家承担</template>
              <template v-else-if="row.enrollRequired">
                <el-tag size="small" type="warning">商家报名制</el-tag>
                <div class="sub">{{ bearText(row) }}</div>
              </template>
              <template v-else>全场生效 · {{ bearText(row) }}</template>
            </template>
          </el-table-column>
          <el-table-column label="活动时间" width="210">
            <template #default="{ row }">{{ shortTime(row.startTime) }} ~ {{ shortTime(row.endTime) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.statusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <template v-if="row.shopId === 0">
                <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button v-if="row.status === 'ACTIVE'" link type="danger" size="small" @click="end(row)">结束</el-button>
              </template>
              <span v-else class="sub">商家维护</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ==================== 报名审核 ==================== -->
      <el-tab-pane :label="`报名审核${pendingCount ? `（${pendingCount}）` : ''}`" name="enrollments">
        <div class="pane-head">
          <el-radio-group v-model="enrollStatus" size="small" @change="loadEnrollments">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="PENDING">待审核</el-radio-button>
            <el-radio-button value="APPROVED">已通过</el-radio-button>
            <el-radio-button value="REJECTED">已驳回</el-radio-button>
          </el-radio-group>
        </div>
        <el-table :data="enrollments" size="small" v-loading="enrollLoading">
          <el-table-column label="活动" min-width="160">
            <template #default="{ row }">{{ row.promotionTitle || `#${row.promotionId}` }}</template>
          </el-table-column>
          <el-table-column prop="shopName" label="报名店铺" min-width="120" />
          <el-table-column prop="productName" label="商品" min-width="180" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="STATUS_TAG[row.status]">{{ row.statusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="驳回原因" min-width="140">
            <template #default="{ row }">{{ row.reason || '—' }}</template>
          </el-table-column>
          <el-table-column label="报名时间" width="150">
            <template #default="{ row }">{{ shortTime(row.appliedAt) }}</template>
          </el-table-column>
          <el-table-column label="审核时间" width="150">
            <template #default="{ row }">{{ shortTime(row.reviewedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 'PENDING'">
                <el-button link type="success" size="small" @click="approve(row)">通过</el-button>
                <el-button link type="danger" size="small" @click="reject(row)">驳回</el-button>
              </template>
              <span v-else class="sub">已处理</span>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="enrollPage"
          :page-size="enrollSize"
          :total="enrollTotal"
          layout="total, prev, pager, next"
          class="pager"
          @current-change="loadEnrollments"
        />
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dialog" :title="editing ? '编辑活动' : '新建活动'" width="680px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="活动名称" required>
          <el-input v-model="form.title" placeholder="如：双 11 全场满减" />
        </el-form-item>
        <el-form-item label="展示类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option v-for="t in TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="优惠规则" required>
          <el-radio-group v-model="form.ruleType">
            <el-radio-button value="FULL_REDUCTION">满减</el-radio-button>
            <el-radio-button value="DISCOUNT">折扣</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.ruleType === 'FULL_REDUCTION'">
          <el-form-item label="满">
            <el-input-number v-model="form.thresholdAmount" :min="0" :precision="2" /> 元
          </el-form-item>
          <el-form-item label="减">
            <el-input-number v-model="form.discountAmount" :min="0" :precision="2" /> 元
          </el-form-item>
          <el-form-item label="每满">
            <el-input-number v-model="form.perEvery" :min="0" /> 元（阶梯满减，0 表示不启用）
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="满">
            <el-input-number v-model="form.thresholdAmount" :min="0" :precision="2" /> 元可用
          </el-form-item>
          <el-form-item label="折扣">
            <el-input-number v-model="form.discountRate" :min="0.1" :max="0.99" :step="0.05" :precision="2" /> 折
          </el-form-item>
          <el-form-item label="优惠上限">
            <el-input-number v-model="form.maxDiscount" :min="0" :precision="2" /> 元（0 表示不限）
          </el-form-item>
        </template>
        <el-form-item label="活动商品范围">
          <el-radio-group v-model="form.scopeType">
            <el-radio-button value="ALL">全场</el-radio-button>
            <el-radio-button value="CATEGORY">指定分类</el-radio-button>
            <el-radio-button value="PRODUCT">指定商品</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.scopeType !== 'ALL'" label="范围 ID">
          <el-input v-model="form.scopeIdsText" placeholder="多个 ID 用英文逗号分隔，如：1,2,3" />
        </el-form-item>
        <el-form-item label="可叠加券">
          <el-switch v-model="form.couponStackable" />
          <span class="tip-inline">开启后商品可用优惠券叠加本活动</span>
        </el-form-item>
        <el-form-item label="商家报名制">
          <el-switch v-model="form.enrollRequired" />
          <span class="tip-inline">
            开启后活动不在全场自动生效，商家在「活动报名」页提交商品、平台审核通过后才享受活动价
          </span>
        </el-form-item>
        <el-form-item label="平台承担比例">
          <el-input-number v-model="form.platformBearRate" :min="0" :max="100" :precision="0" /> %
          <span class="tip-inline">优惠中平台补贴的百分比，0 表示商家全额承担（商家自建活动固定商家承担）</span>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="活动描述">
          <el-input v-model="form.description" />
        </el-form-item>
        <el-form-item label="主题色">
          <el-color-picker v-model="form.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveEnrollment, createPromotion, endPromotion, fetchAdminPromotions,
  fetchEnrollments, rejectEnrollment, updatePromotion
} from '../../api/admin'

const TYPES = ['平台大促', '品类促销', '限时秒杀', '领券中心']
const STATUS_TAG = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }

const tab = ref('promotions')
const rows = ref([])
const status = ref('all')
const loading = ref(false)
const dialog = ref(false)
const editing = ref(null)
const form = reactive({
  title: '', type: '平台大促', ruleType: 'FULL_REDUCTION',
  thresholdAmount: 0, discountAmount: 0, perEvery: 0,
  discountRate: 0.8, maxDiscount: 0,
  scopeType: 'ALL', scopeIdsText: '', couponStackable: false,
  enrollRequired: false, platformBearRate: 0,
  startTime: '', endTime: '', description: '', color: '#ff4b2b'
})

const enrollments = ref([])
const enrollStatus = ref('')
const enrollPage = ref(1)
const enrollSize = 10
const enrollTotal = ref(0)
const enrollLoading = ref(false)
const pendingCount = ref(0)

onMounted(load)

const shortTime = (t) => (t ? String(t).replace('T', ' ').slice(5, 16) : '不限')

function ruleText(row) {
  if (row.ruleType === 'FULL_REDUCTION') {
    const base = `满 ${row.thresholdAmount} 减 ${row.discountAmount}`
    return row.perEvery ? `${base}（每满 ${row.perEvery} 可叠加）` : base
  }
  const base = `满 ${row.thresholdAmount} 打 ${Math.round(row.discountRate * 100) / 10} 折`
  return row.maxDiscount ? `${base}，封顶 ${row.maxDiscount} 元` : base
}

function scopeText(row) {
  const label = { ALL: '全场', CATEGORY: '指定分类', PRODUCT: '指定商品', SHOP: '本店商品' }[row.scopeType] || row.scopeType
  if (row.scopeType === 'ALL' || row.scopeType === 'SHOP') return label
  if (row.enrollRequired) return `${label}（报名审核后生效）`
  return `${label} #${(row.scopeIds || []).join(', #')}`
}

function bearText(row) {
  const rate = Number(row.platformBearRate || 0)
  return rate > 0 ? `平台承担 ${rate}%` : '商家全额承担'
}

async function load() {
  loading.value = true
  try {
    const res = await fetchAdminPromotions(status.value)
    rows.value = res.data || []
  } catch { rows.value = [] } finally { loading.value = false }
}

async function loadEnrollments() {
  enrollLoading.value = true
  try {
    const res = await fetchEnrollments({
      status: enrollStatus.value || undefined,
      page: enrollPage.value, size: enrollSize
    })
    enrollments.value = res.data?.list || []
    enrollTotal.value = res.data?.total || 0
    pendingCount.value = enrollStatus.value === 'PENDING' ? enrollTotal.value : pendingCount.value
  } catch { enrollments.value = [] } finally { enrollLoading.value = false }
}

// 切到报名审核页时拉取列表并刷新待审核角标
async function onTabChange() {
  if (tab.value === 'enrollments') {
    if (enrollStatus.value !== 'PENDING') {
      const res = await fetchEnrollments({ status: 'PENDING', page: 1, size: 1 }).catch(() => null)
      pendingCount.value = res?.data?.total || 0
    }
    loadEnrollments()
  }
}

function resetForm() {
  Object.assign(form, {
    title: '', type: '平台大促', ruleType: 'FULL_REDUCTION',
    thresholdAmount: 0, discountAmount: 0, perEvery: 0,
    discountRate: 0.8, maxDiscount: 0,
    scopeType: 'ALL', scopeIdsText: '', couponStackable: false,
    enrollRequired: false, platformBearRate: 0,
    startTime: '', endTime: '', description: '', color: '#ff4b2b'
  })
}

function openAdd() {
  editing.value = null
  resetForm()
  dialog.value = true
}

function openEdit(row) {
  editing.value = row
  Object.assign(form, {
    title: row.title, type: row.type || '平台大促', ruleType: row.ruleType,
    thresholdAmount: Number(row.thresholdAmount || 0),
    discountAmount: Number(row.discountAmount || 0),
    perEvery: row.perEvery || 0,
    discountRate: Number(row.discountRate || 0.8),
    maxDiscount: Number(row.maxDiscount || 0),
    scopeType: row.scopeType || 'ALL',
    scopeIdsText: (row.scopeIds || []).join(','),
    couponStackable: !!row.couponStackable,
    enrollRequired: !!row.enrollRequired,
    platformBearRate: Number(row.platformBearRate || 0),
    startTime: row.startTime || '', endTime: row.endTime || '',
    description: row.description || '', color: row.color || '#ff4b2b'
  })
  dialog.value = true
}

function buildPayload() {
  const scopeIds = form.scopeIdsText
    ? form.scopeIdsText.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0)
    : []
  const payload = {
    title: form.title,
    type: form.type,
    ruleType: form.ruleType,
    scopeType: form.scopeType,
    scopeIds,
    couponStackable: form.couponStackable,
    enrollRequired: form.enrollRequired,
    platformBearRate: form.enrollRequired || form.platformBearRate > 0 ? form.platformBearRate : null,
    startTime: form.startTime || null,
    endTime: form.endTime || null,
    status: 'ACTIVE',
    description: form.description,
    color: form.color
  }
  if (form.ruleType === 'FULL_REDUCTION') {
    payload.thresholdAmount = form.thresholdAmount
    payload.discountAmount = form.discountAmount
    payload.perEvery = form.perEvery || 0
  } else {
    payload.thresholdAmount = form.thresholdAmount
    payload.discountRate = form.discountRate
    payload.maxDiscount = form.maxDiscount || null
  }
  return payload
}

async function save() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写活动名称')
    return
  }
  const payload = buildPayload()
  if (editing.value) await updatePromotion(editing.value.id, payload)
  else await createPromotion(payload)
  dialog.value = false
  ElMessage.success('已保存')
  load()
}

function end(row) {
  ElMessageBox.confirm(`确认结束活动「${row.title}」？`, '提示', { type: 'warning' }).then(async () => {
    await endPromotion(row.id)
    ElMessage.success('已结束')
    load()
  }).catch(() => {})
}

function approve(row) {
  ElMessageBox.confirm(
    `通过「${row.shopName}」商品「${row.productName}」的报名？`,
    '报名审核', { type: 'success' }
  ).then(async () => {
    await approveEnrollment(row.id)
    ElMessage.success('已通过')
    loadEnrollments()
  }).catch(() => {})
}

function reject(row) {
  ElMessageBox.prompt('请填写驳回原因', `驳回「${row.productName}」的报名`, {
    inputPlaceholder: '如：商品不在活动品类范围',
    type: 'warning'
  }).then(async ({ value }) => {
    await rejectEnrollment(row.id, value)
    ElMessage.success('已驳回')
    loadEnrollments()
  }).catch(() => {})
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}
.sub {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.pane-head {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}
.pager {
  margin-top: 12px;
  justify-content: flex-end;
}
.tip-inline {
  font-size: 12px;
  color: #999;
  margin-left: 10px;
}
</style>
