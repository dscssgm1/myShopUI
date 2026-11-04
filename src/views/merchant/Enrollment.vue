<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>活动报名</b>
        <span class="tip">挑选本店商品报名平台招商活动，平台审核通过后商品即可享受活动价</span>
      </div>
    </template>

    <!-- ==================== 可报名活动 ==================== -->
    <div class="section-title">可报名活动</div>
    <el-empty v-if="!activities.length" description="暂无可报名的活动" :image-size="80" />
    <el-row :gutter="12">
      <el-col v-for="a in activities" :key="a.id" :span="12" class="card-col">
        <el-card shadow="never" class="activity-card">
          <div class="activity-head">
            <span class="dot" :style="{ background: a.color || '#ff4b2b' }" />
            <b>{{ a.title }}</b>
            <el-tag size="small" :type="a.couponStackable ? 'success' : 'info'" class="ml8">
              {{ a.couponStackable ? '可叠加优惠券' : '不可叠加优惠券' }}
            </el-tag>
          </div>
          <div class="activity-line">优惠方式：{{ ruleText(a) }}</div>
          <div class="activity-line">
            活动商品：{{ scopeText(a) }}
            <span v-if="Number(a.platformBearRate) > 0" class="bear">· 平台承担 {{ a.platformBearRate }}%</span>
            <span v-else class="bear">· 优惠由商家全额承担</span>
          </div>
          <div class="activity-line">活动时间：{{ shortTime(a.startTime) }} ~ {{ shortTime(a.endTime) }}</div>
          <div v-if="a.description" class="activity-line desc">{{ a.description }}</div>
          <div class="activity-foot">
            <el-button v-perm="'merchant:enrollment:apply'" type="primary" size="small" @click="openApply(a)">为商品报名</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ==================== 我的报名记录 ==================== -->
    <div class="section-title mt24">我的报名记录</div>
    <el-table :data="records" size="small" v-loading="loading">
      <el-table-column label="活动" min-width="160">
        <template #default="{ row }">{{ row.promotionTitle || `#${row.promotionId}` }}</template>
      </el-table-column>
      <el-table-column prop="productName" label="报名商品" min-width="180" />
      <el-table-column label="状态" width="100">
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
    </el-table>

    <!-- ==================== 选商品报名弹窗 ==================== -->
    <el-dialog v-model="applyDialog" :title="`报名活动「${applyTarget?.title}」`" width="640px">
      <div class="tip-block">仅展示本店在售商品；同一活动同一商品只能提交一次，被驳回后可重新提交。</div>
      <el-table
        ref="applyTable"
        :data="applyProducts"
        size="small"
        max-height="360"
        @selection-change="(rows) => (applySelection = rows)"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="name" label="商品" min-width="200">
          <template #default="{ row }">
            <div class="p-cell">
              <img v-if="row.coverImage" :src="row.coverImage" class="p-photo" alt="" />
              <span v-else class="p-emoji">{{ row.emoji }}</span>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="110">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column label="已报名" width="90">
          <template #default="{ row }">
            <el-tag v-if="enrolledProductIds.has(row.id)" size="small" type="info">已报名</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="applyDialog = false">取消</el-button>
        <el-button type="primary" @click="submitApply">提交报名</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchProducts } from '../../api/product'
import { applyEnrollment, fetchEnrollablePromotions, fetchMyEnrollments } from '../../api/promotion'
import { categoryNames, loadTopCategories } from '../../utils/categoryOptions'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()
const shopId = computed(() => userStore.user?.shopId)

const STATUS_TAG = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }

const activities = ref([])
const records = ref([])
const loading = ref(false)
const myProducts = ref([])
const categoryOptions = ref([])

const applyDialog = ref(false)
const applyTarget = ref(null)
const applySelection = ref([])

onMounted(() => {
  load()
  loadProducts()
  loadTopCategories().then((list) => (categoryOptions.value = list))
})

const shortTime = (t) => (t ? String(t).replace('T', ' ').slice(5, 16) : '不限')

/** 当前活动已提交过报名的商品（含被驳回，驳回后可重新提交） */
const enrolledProductIds = computed(() => {
  if (!applyTarget.value) return new Set()
  return new Set(
    records.value
      .filter((r) => r.promotionId === applyTarget.value.id && r.status !== 'REJECTED')
      .map((r) => r.productId)
  )
})

/** 可报名弹窗里只出现在售商品 */
const applyProducts = computed(() => myProducts.value.filter((p) => p.status === 1))

function ruleText(a) {
  if (a.ruleType === 'FULL_REDUCTION') {
    const base = `满 ${a.thresholdAmount} 减 ${a.discountAmount}`
    return a.perEvery ? `${base}（每满 ${a.perEvery} 可叠加）` : base
  }
  const base = `满 ${a.thresholdAmount} 打 ${Math.round(a.discountRate * 100) / 10} 折`
  return a.maxDiscount ? `${base}，封顶 ${a.maxDiscount} 元` : base
}

function scopeText(a) {
  if (a.scopeType === 'ALL') return '全场商品'
  if (a.scopeType === 'CATEGORY') {
    return `指定分类：${categoryNames(a.scopeIds, categoryOptions.value).join('、')}（仅范围内商品可报名）`
  }
  const label = { PRODUCT: '指定商品' }[a.scopeType] || a.scopeType
  return `${label} #${(a.scopeIds || []).join(', #')}（仅范围内商品可报名）`
}

async function load() {
  loading.value = true
  try {
    const [actRes, recRes] = await Promise.all([fetchEnrollablePromotions(), fetchMyEnrollments()])
    activities.value = actRes.data || []
    records.value = recRes.data || []
  } catch {
    activities.value = []
    records.value = []
  } finally { loading.value = false }
}

async function loadProducts() {
  if (!shopId.value) return
  try {
    const res = await fetchProducts({ shopId: shopId.value, includeAll: true, page: 1, size: 200 })
    myProducts.value = res.data?.list || []
  } catch { myProducts.value = [] }
}

function openApply(activity) {
  applyTarget.value = activity
  applySelection.value = []
  applyDialog.value = true
}

async function submitApply() {
  const selectable = applySelection.value.map((p) => p.id)
  if (!selectable.length) {
    ElMessage.warning('请勾选要报名的商品')
    return
  }
  const fresh = selectable.filter((id) => !enrolledProductIds.value.has(id))
  if (!fresh.length) {
    ElMessage.warning('所选商品均已报名，被驳回的商品可等驳回后再重新提交')
    return
  }
  await applyEnrollment(applyTarget.value.id, fresh)
  applyDialog.value = false
  ElMessage.success(`已提交 ${fresh.length} 个商品的报名，等待平台审核`)
  load()
}
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 12px;
}
/* 报名弹窗里的商品行：主图 + 名称（无图商品回退 emoji 占位） */
.p-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.p-photo {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}
.p-emoji {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: #f7f8fa;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.head .tip {
  flex: 1;
  font-size: 12px;
  color: #999;
}
.section-title {
  font-weight: bold;
  margin-bottom: 12px;
}
.mt24 {
  margin-top: 24px;
}
.card-col {
  margin-bottom: 12px;
}
.activity-card {
  height: 100%;
}
.activity-head {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.ml8 {
  margin-left: 8px;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}
.activity-line {
  font-size: 13px;
  color: #555;
  margin-top: 4px;
}
.activity-line.desc {
  color: #999;
}
.bear {
  color: #e6a23c;
}
.activity-foot {
  margin-top: 10px;
  text-align: right;
}
.tip-block {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
}
</style>
