<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>店铺营销</b>
        <span class="tip">活动与优惠券仅限本店商品，发布即生效，优惠费用由店铺承担</span>
      </div>
    </template>

    <el-tabs v-model="tab">
      <!-- ==================== 店铺活动 ==================== -->
      <el-tab-pane label="店铺活动" name="promotions">
        <div class="pane-head">
          <span class="tip">限时折扣 / 满减活动，进行中的活动会在商品列表展示角标</span>
          <el-button v-perm="'merchant:marketing:promo-create'" type="primary" size="small" @click="openPromo()">+ 新建活动</el-button>
        </div>
        <el-table :data="promos" size="small" v-loading="promoLoading">
          <el-table-column label="活动" min-width="220">
            <template #default="{ row }">
              <span class="dot" :style="{ background: row.color || '#ff4b2b' }" />
              <b>{{ row.title }}</b>
              <div class="sub">{{ row.description || '限时促销' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="优惠规则" min-width="180">
            <template #default="{ row }">{{ ruleText(row) }}</template>
          </el-table-column>
          <el-table-column label="适用范围" width="120">
            <template #default="{ row }">{{ scopeText(row) }}</template>
          </el-table-column>
          <el-table-column label="可叠加券" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.couponStackable ? 'success' : 'info'">
                {{ row.couponStackable ? '可叠' : '不可叠' }}
              </el-tag>
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
              <el-button v-perm="'merchant:marketing:promo-update'" link type="primary" size="small" @click="openPromo(row)">编辑</el-button>
              <el-button v-if="row.status === 'ACTIVE'" v-perm="'merchant:marketing:promo-end'" link type="danger" size="small" @click="endPromo(row)">结束</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ==================== 店铺优惠券 ==================== -->
      <el-tab-pane label="店铺优惠券" name="coupons">
        <div class="pane-head">
          <span class="tip">买家在领券中心领取，仅限本店商品使用；设置积分价的券在积分商城售卖，优惠费用由店铺承担</span>
          <el-button v-perm="'merchant:marketing:coupon-create'" type="primary" size="small" @click="openCoupon()">+ 发放优惠券</el-button>
        </div>
        <el-table :data="coupons" size="small" v-loading="couponLoading">
          <el-table-column label="优惠券" min-width="180">
            <template #default="{ row }"><b>{{ row.title }}</b></template>
          </el-table-column>
          <el-table-column label="面额" width="120">
            <template #default="{ row }">满 {{ row.thresholdAmount }} 减 {{ row.discountAmount }}</template>
          </el-table-column>
          <el-table-column label="适用范围" width="130">
            <template #default="{ row }">{{ scopeText(row) }}</template>
          </el-table-column>
          <el-table-column label="库存" width="110">
            <template #default="{ row }">已领 {{ row.claimedCount }} / {{ row.totalStock }}</template>
          </el-table-column>
          <el-table-column label="每人限领" width="90">
            <template #default="{ row }">{{ row.perUserLimit }} 张</template>
          </el-table-column>
          <el-table-column label="积分价" width="90">
            <template #default="{ row }">
              <span v-if="Number(row.pointsPrice) > 0" class="points">{{ row.pointsPrice }} 积分</span>
              <span v-else class="sub">免费领取</span>
            </template>
          </el-table-column>
          <el-table-column label="叠加规则" width="150">
            <template #default="{ row }">
              <template v-if="row.couponStackable === false || row.stackable === false">
                <el-tag v-if="row.couponStackable === false" size="small" type="warning" class="tag-mr">不可与活动同用</el-tag>
                <el-tag v-if="row.stackable === false" size="small" type="warning">不可叠加</el-tag>
              </template>
              <span v-else class="sub">可与活动、多券同用</span>
            </template>
          </el-table-column>
          <el-table-column label="有效期" width="210">
            <template #default="{ row }">{{ shortTime(row.validStart) }} ~ {{ shortTime(row.validEnd) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                {{ row.status === 'ACTIVE' ? '发放中' : '已结束' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 'ACTIVE'" v-perm="'merchant:marketing:coupon-end'" link type="danger" size="small" @click="endCoupon(row)">下架</el-button>
              <span v-else class="sub">—</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- ==================== 活动编辑弹窗 ==================== -->
    <el-dialog v-model="promoDialog" :title="promoEditing ? '编辑活动' : '新建活动'" width="640px">
      <el-form :model="promoForm" label-width="110px">
        <el-form-item label="活动名称" required>
          <el-input v-model="promoForm.title" placeholder="如：数码焕新周 · 爆款直降" />
        </el-form-item>
        <el-form-item label="优惠规则" required>
          <el-radio-group v-model="promoForm.ruleType">
            <el-radio-button value="FULL_REDUCTION">满减</el-radio-button>
            <el-radio-button value="DISCOUNT">折扣</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <template v-if="promoForm.ruleType === 'FULL_REDUCTION'">
          <el-form-item label="满">
            <el-input-number v-model="promoForm.thresholdAmount" :min="0" :precision="2" /> 元
          </el-form-item>
          <el-form-item label="减">
            <el-input-number v-model="promoForm.discountAmount" :min="0" :precision="2" /> 元
          </el-form-item>
          <el-form-item label="每满">
            <el-input-number v-model="promoForm.perEvery" :min="0" /> 元（阶梯满减，0 表示不启用）
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="满">
            <el-input-number v-model="promoForm.thresholdAmount" :min="0" :precision="2" /> 元可用
          </el-form-item>
          <el-form-item label="折扣">
            <el-input-number v-model="promoForm.discountRate" :min="0.1" :max="0.99" :step="0.05" :precision="2" /> 折
          </el-form-item>
          <el-form-item label="优惠上限">
            <el-input-number v-model="promoForm.maxDiscount" :min="0" :precision="2" /> 元（0 表示不限）
          </el-form-item>
        </template>
        <el-form-item label="活动商品">
          <el-radio-group v-model="promoForm.scopeType">
            <el-radio-button value="SHOP">本店全部商品</el-radio-button>
            <el-radio-button value="CATEGORY">指定分类</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="promoForm.scopeType === 'CATEGORY'" label="选择分类">
          <el-select v-model="promoForm.scopeIds" multiple filterable placeholder="选择参加活动的分类（大类）" style="width: 100%">
            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <div class="tip-block">只对本店属于所选分类的商品生效</div>
        </el-form-item>
        <el-form-item label="可叠加券">
          <el-switch v-model="promoForm.couponStackable" />
          <span class="tip-inline">开启后买家下单可用优惠券叠加本活动（还需券自身允许「与活动同用」）</span>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker v-model="promoForm.startTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker v-model="promoForm.endTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="活动描述">
          <el-input v-model="promoForm.description" />
        </el-form-item>
        <el-form-item label="主题色">
          <el-color-picker v-model="promoForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="promoDialog = false">取消</el-button>
        <el-button type="primary" @click="savePromo">保存并发布</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 优惠券编辑弹窗 ==================== -->
    <el-dialog v-model="couponDialog" title="发放店铺优惠券" width="560px">
      <el-form :model="couponForm" label-width="110px">
        <el-form-item label="券名称" required>
          <el-input v-model="couponForm.title" placeholder="如：本店立减券" />
        </el-form-item>
        <el-form-item label="使用门槛" required>
          <el-input-number v-model="couponForm.thresholdAmount" :min="0" :precision="2" /> 元（0 表示无门槛）
        </el-form-item>
        <el-form-item label="优惠金额" required>
          <el-input-number v-model="couponForm.discountAmount" :min="0.01" :precision="2" /> 元
        </el-form-item>
        <el-form-item label="适用范围">
          <el-radio-group v-model="couponForm.scopeType">
            <el-radio-button value="SHOP">本店全部商品</el-radio-button>
            <el-radio-button value="CATEGORY">指定分类</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="couponForm.scopeType === 'CATEGORY'" label="选择分类">
          <el-select v-model="couponForm.scopeIds" multiple filterable placeholder="选择可用券的分类（大类）" style="width: 100%">
            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <div class="tip-block">券只对本店属于所选分类的商品生效</div>
        </el-form-item>
        <el-form-item label="发放总量" required>
          <el-input-number v-model="couponForm.totalStock" :min="1" /> 张
        </el-form-item>
        <el-form-item label="每人限领" required>
          <el-input-number v-model="couponForm.perUserLimit" :min="1" /> 张
        </el-form-item>
        <el-form-item label="积分价">
          <el-input-number v-model="couponForm.pointsPrice" :min="0" :step="100" />
          积分
          <div class="tip-block">填 0 为免费领取的普通券；大于 0 则不上领券中心，只在积分商城用积分兑换</div>
        </el-form-item>
        <el-form-item label="与活动同用">
          <el-switch v-model="couponForm.couponStackable" />
          <span class="tip-inline">关闭后此券不能与任何促销活动叠加</span>
        </el-form-item>
        <el-form-item label="与其他券叠加">
          <el-switch v-model="couponForm.stackable" />
          <span class="tip-inline">关闭后此券一单只能单独使用</span>
        </el-form-item>
        <el-form-item label="可领时间">
          <el-date-picker v-model="couponForm.validStart" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker v-model="couponForm.validEnd" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="couponDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCoupon">发放</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createMerchantCouponTemplate, createMerchantPromotion, endMerchantCouponTemplate,
  endMerchantPromotion, fetchMerchantCouponTemplates, fetchMerchantPromotions,
  updateMerchantPromotion
} from '../../api/promotion'
import { categoryNames, loadTopCategories } from '../../utils/categoryOptions'

const tab = ref('promotions')
const promos = ref([])
const promoLoading = ref(false)
const coupons = ref([])
const couponLoading = ref(false)
const categoryOptions = ref([])

const promoDialog = ref(false)
const promoEditing = ref(null)
const promoForm = reactive({
  title: '', ruleType: 'FULL_REDUCTION',
  thresholdAmount: 0, discountAmount: 0, perEvery: 0,
  discountRate: 0.8, maxDiscount: 0,
  scopeType: 'SHOP', scopeIds: [], couponStackable: true,
  startTime: '', endTime: '', description: '', color: '#ff4b2b'
})

const couponDialog = ref(false)
const couponForm = reactive({
  title: '', thresholdAmount: 0, discountAmount: 10,
  scopeType: 'SHOP', scopeIds: [],
  totalStock: 100, perUserLimit: 1, pointsPrice: 0, couponStackable: true, stackable: true,
  validStart: '', validEnd: ''
})

onMounted(() => {
  loadPromos()
  loadCoupons()
  loadTopCategories().then((list) => (categoryOptions.value = list))
})

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
  if (row.scopeType === 'CATEGORY') return `指定分类：${categoryNames(row.scopeIds, categoryOptions.value).join('、')}`
  return { SHOP: '本店全部', PRODUCT: '指定商品' }[row.scopeType] || row.scopeType
}

async function loadPromos() {
  promoLoading.value = true
  try {
    const res = await fetchMerchantPromotions()
    promos.value = res.data || []
  } catch { promos.value = [] } finally { promoLoading.value = false }
}

async function loadCoupons() {
  couponLoading.value = true
  try {
    const res = await fetchMerchantCouponTemplates()
    coupons.value = res.data || []
  } catch { coupons.value = [] } finally { couponLoading.value = false }
}

function resetPromoForm() {
  Object.assign(promoForm, {
    title: '', ruleType: 'FULL_REDUCTION',
    thresholdAmount: 0, discountAmount: 0, perEvery: 0,
    discountRate: 0.8, maxDiscount: 0,
    scopeType: 'SHOP', scopeIds: [], couponStackable: true,
    startTime: '', endTime: '', description: '', color: '#ff4b2b'
  })
}

function openPromo(row) {
  promoEditing.value = row || null
  if (row) {
    Object.assign(promoForm, {
      title: row.title, ruleType: row.ruleType,
      thresholdAmount: Number(row.thresholdAmount || 0),
      discountAmount: Number(row.discountAmount || 0),
      perEvery: row.perEvery || 0,
      discountRate: Number(row.discountRate || 0.8),
      maxDiscount: Number(row.maxDiscount || 0),
      scopeType: row.scopeType === 'CATEGORY' ? 'CATEGORY' : 'SHOP',
      scopeIds: [...(row.scopeIds || [])],
      couponStackable: !!row.couponStackable,
      startTime: row.startTime || '', endTime: row.endTime || '',
      description: row.description || '', color: row.color || '#ff4b2b'
    })
  } else {
    resetPromoForm()
  }
  promoDialog.value = true
}

async function savePromo() {
  if (!promoForm.title.trim()) {
    ElMessage.warning('请填写活动名称')
    return
  }
  if (promoForm.scopeType === 'CATEGORY' && !promoForm.scopeIds.length) {
    ElMessage.warning('请选择参加活动的分类')
    return
  }
  const payload = {
    title: promoForm.title,
    ruleType: promoForm.ruleType,
    scopeType: promoForm.scopeType,
    scopeIds: promoForm.scopeType === 'CATEGORY' ? promoForm.scopeIds : [],
    couponStackable: promoForm.couponStackable,
    startTime: promoForm.startTime || null,
    endTime: promoForm.endTime || null,
    status: 'ACTIVE',
    description: promoForm.description,
    color: promoForm.color
  }
  if (promoForm.ruleType === 'FULL_REDUCTION') {
    payload.thresholdAmount = promoForm.thresholdAmount
    payload.discountAmount = promoForm.discountAmount
    payload.perEvery = promoForm.perEvery || 0
  } else {
    payload.thresholdAmount = promoForm.thresholdAmount
    payload.discountRate = promoForm.discountRate
    payload.maxDiscount = promoForm.maxDiscount || null
  }
  if (promoEditing.value) await updateMerchantPromotion(promoEditing.value.id, payload)
  else await createMerchantPromotion(payload)
  promoDialog.value = false
  ElMessage.success(promoEditing.value ? '已保存' : '活动已发布')
  loadPromos()
}

function endPromo(row) {
  ElMessageBox.confirm(`确认结束活动「${row.title}」？结束后商品不再享受活动价。`, '提示', { type: 'warning' })
    .then(async () => {
      await endMerchantPromotion(row.id)
      ElMessage.success('已结束')
      loadPromos()
    }).catch(() => {})
}

function openCoupon() {
  Object.assign(couponForm, {
    title: '', thresholdAmount: 0, discountAmount: 10,
    scopeType: 'SHOP', scopeIds: [],
    totalStock: 100, perUserLimit: 1, pointsPrice: 0, couponStackable: true, stackable: true,
    validStart: '', validEnd: ''
  })
  couponDialog.value = true
}

async function saveCoupon() {
  if (!couponForm.title.trim()) {
    ElMessage.warning('请填写券名称')
    return
  }
  if (couponForm.scopeType === 'CATEGORY' && !couponForm.scopeIds.length) {
    ElMessage.warning('请选择可用券的分类')
    return
  }
  await createMerchantCouponTemplate({
    title: couponForm.title,
    thresholdAmount: couponForm.thresholdAmount,
    discountAmount: couponForm.discountAmount,
    scopeType: couponForm.scopeType,
    scopeIds: couponForm.scopeType === 'CATEGORY' ? couponForm.scopeIds : [],
    totalStock: couponForm.totalStock,
    perUserLimit: couponForm.perUserLimit,
    pointsPrice: couponForm.pointsPrice > 0 ? couponForm.pointsPrice : null,
    couponStackable: couponForm.couponStackable,
    stackable: couponForm.stackable,
    validStart: couponForm.validStart || null,
    validEnd: couponForm.validEnd || null,
    status: 'ACTIVE'
  })
  couponDialog.value = false
  ElMessage.success('优惠券已发放')
  loadCoupons()
}

function endCoupon(row) {
  ElMessageBox.confirm(`确认下架优惠券「${row.title}」？已领取的买家仍可在有效期内使用。`, '提示', { type: 'warning' })
    .then(async () => {
      await endMerchantCouponTemplate(row.id)
      ElMessage.success('已下架')
      loadCoupons()
    }).catch(() => {})
}
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.head .tip {
  flex: 1;
  font-size: 12px;
  color: #999;
}
.pane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.pane-head .tip {
  font-size: 12px;
  color: #999;
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
.tip-inline {
  font-size: 12px;
  color: #999;
  margin-left: 10px;
}
.tip-block {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}
.points {
  color: #ff4b2b;
  font-weight: 600;
}
.tag-mr {
  margin-right: 6px;
}
</style>
