<template>
  <div class="checkout">
    <h3>📋 确认订单</h3>

    <el-card shadow="never" class="block">
      <template #header>
        <b>收货地址</b>
        <el-button link type="primary" size="small" class="change" @click="pickerVisible = true">
          {{ current ? '更换地址' : '选择地址' }} ›
        </el-button>
      </template>

      <div v-if="current" class="addr-show">
        <div class="as-line">
          <span class="as-name">{{ current.receiverName }}</span>
          <span class="as-phone">{{ current.receiverPhone }}</span>
          <el-tag v-if="current.isDefault" type="danger" size="small">默认</el-tag>
        </div>
        <div class="as-text">{{ current.address }}</div>
      </div>
      <el-empty v-else :image-size="60" description="请选择收货地址" />
    </el-card>

    <el-card v-loading="loading" shadow="never" class="block">
      <template #header>
        <b>商品清单</b>
        <span class="hint">已按店铺拆分为 {{ preview.shops?.length || 0 }} 个独立订单</span>
      </template>

      <div v-for="shop in preview.shops || []" :key="shop.shopId" class="shop-block">
        <div class="shop-head">
          🏪 {{ shop.shopName }}
          <span class="shop-amount">小计 ¥{{ shop.payAmount }}</span>
        </div>
        <div v-for="item in shop.items" :key="`${item.productId}-${item.skuId}`" class="item-row">
          <img v-if="item.productCoverImage" :src="item.productCoverImage" class="g-photo" alt="" />
          <div v-else class="g-img" :style="{ background: item.productColor }">{{ item.productEmoji }}</div>
          <div class="item-mid">
            <div class="item-name">{{ item.productName }}</div>
            <div v-if="item.skuSpecs" class="item-sku">{{ item.skuSpecs }}</div>
            <div v-if="(item.itemPromotions || []).length || (item.itemCoupons || []).length" class="item-tags">
              <el-tag
                v-for="p in item.itemPromotions || []"
                :key="`ip-${p.id}`"
                size="small"
                effect="plain"
                type="danger"
              >
                活动「{{ p.title }}」-¥{{ p.amount }}
              </el-tag>
              <el-tag
                v-for="c in item.itemCoupons || []"
                :key="`ic-${c.id}`"
                size="small"
                effect="plain"
                type="warning"
              >
                券「{{ c.title }}」-¥{{ c.amount }}
              </el-tag>
            </div>
          </div>
          <div class="item-price">¥{{ item.price }} × {{ item.quantity }}</div>
          <div class="item-sub">
            <span v-if="itemDiscounted(item)" class="item-orig">¥{{ item.subtotal }}</span>
            <span>¥{{ item.finalSubtotal ?? item.subtotal }}</span>
          </div>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <b>促销活动</b>
        <span class="hint">默认自动勾选本单最省组合；平台侧与同一店铺各只生效一个活动，范围冲突时保留优惠更大的一方，勾选后以实际计价为准</span>
      </template>
      <el-empty
        v-if="!(preview.promotionOptions || []).length"
        :image-size="60"
        description="本单暂无可用促销活动"
      />
      <el-checkbox-group
        v-else
        v-model="selectedPromotionIds"
        class="coupon-list"
        @change="onPromotionChange"
      >
        <el-checkbox
          v-for="p in preview.promotionOptions"
          :key="p.promotionId"
          :value="p.promotionId"
          class="coupon-item"
        >
          <div class="coupon-body">
            <span class="c-title">{{ p.title }}</span>
            <el-tag v-if="p.shopId > 0" size="small" type="warning">{{ p.shopName || '商家活动' }}</el-tag>
            <el-tag v-else size="small">平台活动</el-tag>
            <el-tag v-if="p.couponStackable === false" size="small" type="warning">不可与券同用</el-tag>
            <span class="c-desc">{{ p.ruleText }} · {{ p.scopeText }}</span>
            <span class="c-apply">本单可减 ¥{{ p.discount }}</span>
          </div>
        </el-checkbox>
      </el-checkbox-group>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <b>优惠券</b>
        <span class="hint">打开页面已自动勾选最省钱组合；手动调整后按所选算价，全部取消则回到自动匹配</span>
      </template>
      <el-empty v-if="!availableCoupons.length" :image-size="60" description="暂无可用优惠券，可领取下方本单可领券" />
      <el-checkbox-group v-else v-model="selectedCouponIds" class="coupon-list" @change="onCouponChange">
        <el-checkbox
          v-for="c in availableCoupons"
          :key="c.userCouponId"
          :value="c.userCouponId"
          :disabled="couponDisabled(c)"
          class="coupon-item"
        >
          <div class="coupon-body">
            <span class="c-title">{{ c.title }}</span>
            <el-tag v-if="c.shopId > 0" size="small" type="warning">商家券</el-tag>
            <el-tag v-if="c.stackable === false" size="small" type="warning">不可叠加</el-tag>
            <el-tag v-if="c.couponStackable === false" size="small" type="warning">不可与活动同用</el-tag>
            <span class="c-desc">满 {{ c.thresholdAmount }} 减 {{ c.discountAmount }} · {{ c.scopeText }}</span>
            <span v-if="Number(c.applicableAmount) > 0" class="c-apply">本单可抵 ¥{{ c.applicableAmount }}</span>
            <span v-else class="c-no">未满足使用门槛</span>
            <span class="c-exp">{{ shortTime(c.expiredAt) }} 前有效</span>
          </div>
        </el-checkbox>
      </el-checkbox-group>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <b>本单可领优惠券</b>
        <span class="hint">按当前商品明细筛选，满足门槛的券可领取后立即用于本单</span>
      </template>
      <el-empty v-if="!claimableCoupons.length" :image-size="60" description="暂无可领取的优惠券" />
      <div v-else class="coupon-list">
        <div v-for="c in claimableCoupons" :key="c.id" class="coupon-item claim-row">
          <div class="coupon-body">
            <span class="c-title">{{ c.title }}</span>
            <el-tag v-if="c.shopId > 0" size="small" type="warning">{{ c.shopName || '商家券' }}</el-tag>
            <el-tag v-else size="small">平台券</el-tag>
            <el-tag v-if="c.claimed" size="small" type="success">已领过</el-tag>
            <el-tag v-if="c.couponStackable === false" size="small" type="warning">不可与活动同用</el-tag>
            <span class="c-desc">满 {{ c.thresholdAmount }} 减 {{ c.discountAmount }} · {{ c.scopeText }}</span>
            <span class="c-apply">本单可抵 ¥{{ c.applicableAmount }}</span>
            <span class="c-exp">{{ shortTime(c.validEnd) }} 前有效</span>
          </div>
          <el-button type="danger" size="small" plain @click="claim(c)">领取</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <b>积分抵现</b>
        <span v-if="pointsEnabled" class="hint">{{ preview.pointsPerYuan || 100 }} 积分抵 1 元，最多抵应付金额的一半（比例以平台配置为准）</span>
      </template>
      <template v-if="pointsEnabled">
        <el-checkbox v-model="usePoints" class="points-check" @change="loadPreview">
          使用积分抵现（当前 {{ preview.pointsAvailable || 0 }} 积分
          <template v-if="Number(preview.pointsDeduction) > 0">
            ，本单最多抵 ¥{{ preview.pointsDeduction }}，用 {{ preview.pointsUsed }} 积分
          </template>
          <template v-else>，本单暂不可抵</template>）
        </el-checkbox>
        <div class="points-tip">抵扣部分由平台补贴承担，退款时按单退回积分</div>
      </template>
      <el-empty v-else :image-size="50" description="积分抵现暂未开启或积分不足" />
    </el-card>

    <el-card shadow="never" class="block">
      <template #header><b>结算信息</b></template>
      <div class="summary">
        <p>商品总额：<span>¥{{ preview.originalAmount || 0 }}</span></p>
        <p>活动优惠：<span>-¥{{ preview.promotionDiscount || 0 }}</span></p>
        <p>优惠券：<span>-¥{{ preview.couponDiscount || 0 }}</span></p>
        <p v-for="u in preview.appliedCoupons || []" :key="u.couponId" class="used">
          已用「{{ u.title }}」：<span>-¥{{ u.discount }}</span>
        </p>
        <p>运费：<span>¥{{ preview.freightAmount || 0 }}</span></p>
        <p v-if="Number(preview.pointsDeduction) > 0" class="used">
          积分抵扣（{{ preview.pointsUsed }} 积分）：<span>-¥{{ preview.pointsDeduction }}</span>
        </p>
        <p v-if="Number(preview.platformBearAmount) > 0 || Number(preview.merchantBearAmount) > 0" class="bear">
          优惠构成：平台承担 ¥{{ preview.platformBearAmount || 0 }} · 商家承担 ¥{{ preview.merchantBearAmount || 0 }}
        </p>
        <p class="final">应付金额：<span class="amt">¥{{ preview.payAmount || 0 }}</span></p>
      </div>
    </el-card>

    <div class="submit">
      <el-button size="large" @click="$router.back()">返回</el-button>
      <el-button type="danger" size="large" :loading="submitting" @click="submit">提交订单</el-button>
    </div>

    <AddressPickerDialog v-model="pickerVisible" :model-id="current?.id" @confirm="current = $event" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createOrder, fetchAddresses, previewOrder } from '../api/trade'
import { claimCoupon, fetchAvailableCoupons, fetchClaimableCoupons } from '../api/promotion'
import AddressPickerDialog from '../components/AddressPickerDialog.vue'

const router = useRouter()
const items = ref([])
const preview = ref({ shops: [] })
const availableCoupons = ref([])
const claimableCoupons = ref([])
/** 勾选状态：打开页面即由引擎最优组合自动填入 */
const selectedCouponIds = ref([])
const selectedPromotionIds = ref([])
/** auto = 不带选择交给引擎选最优；manual = 用户手动指定的精确集合 */
const couponMode = ref('auto')
const promotionMode = ref('auto')
const loading = ref(false)
const submitting = ref(false)
const pickerVisible = ref(false)
const current = ref(null)
const usePoints = ref(false)

/** 积分抵现是否可用：后端开启（比例已配置）且账户有积分 */
const pointsEnabled = computed(() =>
  Number(preview.value.pointsPerYuan) > 0 && Number(preview.value.pointsAvailable) > 0
)

// 抵现开关打开但不可抵时自动回落，避免提交带上无效参数
const effectiveUsePoints = computed(() => usePoints.value && pointsEnabled.value && Number(preview.value.pointsDeduction) > 0)

/** 当前预览中生效的活动优惠（>0 时「不可与活动同用」的券需禁用） */
const activePromotionDiscount = computed(() => Number(preview.value.promotionDiscount) || 0)

/** 选中的券里是否已含「不可与其他券叠加」的券（是则其余券全部禁选） */
const hasSoloCouponSelected = computed(() => selectedCouponIds.value.some((id) => {
  const picked = availableCoupons.value.find((x) => x.userCouponId === id)
  return picked && picked.stackable === false
}))

/**
 * 券可否勾选：不满足门槛、与进行中活动冲突的券直接禁用；
 * 「不可叠加」券与其他券互斥——选了它，其余券禁选；选了其他券，它禁选。
 */
function couponDisabled(c) {
  if (Number(c.applicableAmount) <= 0) return true
  if (activePromotionDiscount.value > 0 && c.couponStackable === false) return true
  if (c.stackable === false) return hasSoloCouponSelected.value
  return hasSoloCouponSelected.value && !selectedCouponIds.value.includes(c.userCouponId)
}

onMounted(async () => {
  items.value = JSON.parse(sessionStorage.getItem('ms_checkout_items') || '[]')
  if (!items.value.length) {
    ElMessage.warning('请先选择要结算的商品')
    router.replace('/cart')
    return
  }
  await Promise.all([loadDefaultAddress(), loadPreview()])
  await Promise.all([loadCoupons(), loadClaimable()])
})

/** 进入结算页默认选中用户设置的默认地址（无默认则取第一条） */
async function loadDefaultAddress() {
  try {
    const res = await fetchAddresses()
    const list = res.data || []
    current.value = list.find((a) => a.isDefault) || list[0] || null
    if (!current.value) pickerVisible.value = true
  } catch {
    current.value = null
  }
}

function orderItems() {
  return items.value.map((i) => ({
    productId: i.productId,
    skuId: i.skuId || null,
    quantity: i.quantity
  }))
}

/** 用户勾选券：清空的语义是「回到自动最优」（后端空数组=自动），非空则精确使用 */
function onCouponChange(ids) {
  couponMode.value = ids.length ? 'manual' : 'auto'
  loadPreview()
}

/**
 * 用户勾选活动：空数组表示不使用活动（后端明确支持），非空为精确集合；
 * 勾选的活动不可与券同用时，券退回自动最优，由引擎比较「活动 vs 仅用券」取更省方案。
 */
function onPromotionChange(ids) {
  promotionMode.value = 'manual'
  const options = preview.value.promotionOptions || []
  const blocksCoupon = ids.some((id) => {
    const picked = options.find((p) => p.promotionId === id)
    return !!picked && picked.couponStackable === false
  })
  if (blocksCoupon) couponMode.value = 'auto'
  loadPreview()
}

/** 算价请求的选择参数：auto 传 null 由引擎选最优，manual 传精确集合 */
function selectionPayload() {
  return {
    items: orderItems(),
    couponIds: couponMode.value === 'manual' ? selectedCouponIds.value.slice() : null,
    promotionIds: promotionMode.value === 'manual' ? selectedPromotionIds.value.slice() : null
  }
}

async function loadPreview() {
  loading.value = true
  try {
    const res = await previewOrder({ ...selectionPayload(), usePoints: usePoints.value || null })
    applyPreview(res.data || { shops: [] })
  } catch {
    // 手动组合失效（如券与刚选的活动冲突被后端拒绝）：退回全自动重新算价
    if (couponMode.value === 'manual' || promotionMode.value === 'manual') {
      couponMode.value = 'auto'
      promotionMode.value = 'auto'
      try {
        const res = await previewOrder({ ...selectionPayload(), usePoints: usePoints.value || null })
        applyPreview(res.data || { shops: [] })
      } catch { /* ignore */ }
    }
  } finally {
    loading.value = false
  }
}

/** 用引擎实际生效项回填勾选状态：自动模式下即「打开页面自动勾选最便宜的券组合」 */
function applyPreview(data) {
  preview.value = data
  if (couponMode.value === 'auto') {
    selectedCouponIds.value = (data.appliedCoupons || []).map((u) => u.couponId)
  }
  // 手动选活动时，范围冲突的活动被引擎保留较大一侧，勾选以最终生效集合为准，避免与计价展示不一致
  selectedPromotionIds.value = data.appliedPromotionIds || []
}

/** 可用券列表按预览返回的商品明细计算（含 categoryId/shopId/单价），券抵扣金额才准确 */
function discountItems() {
  return (preview.value.shops || []).flatMap((s) =>
    (s.items || []).map((i) => ({
      productId: i.productId,
      categoryId: i.categoryId,
      shopId: i.shopId,
      price: Number(i.price),
      quantity: i.quantity
    }))
  )
}

async function loadCoupons() {
  if (!discountItems().length) return
  try {
    const res = await fetchAvailableCoupons(discountItems())
    availableCoupons.value = res.data || []
  } catch { availableCoupons.value = [] }
}

/** 本单可领券：按当前明细过滤（范围命中 + 达门槛 + 未达限领/未领完） */
async function loadClaimable() {
  if (!discountItems().length) return
  try {
    const res = await fetchClaimableCoupons(discountItems())
    claimableCoupons.value = res.data || []
  } catch { claimableCoupons.value = [] }
}

/** 领取本单可领券：刷新可领/可用列表，自动模式下重新算价让新券参与最优组合 */
async function claim(c) {
  try {
    await claimCoupon(c.id)
    ElMessage.success(`已领取「${c.title}」`)
    await Promise.all([loadClaimable(), loadCoupons()])
    if (couponMode.value === 'auto') await loadPreview()
  } catch { /* 错误提示由请求层统一处理 */ }
}

/** 本行是否享优惠（决定是否展示划线原价） */
const itemDiscounted = (item) =>
  Number(item.promotionDiscount) + Number(item.couponDiscount) > 0

const shortTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 10) : '')

async function submit() {
  if (!current.value) {
    ElMessage.warning('请选择收货地址')
    pickerVisible.value = true
    return
  }
  submitting.value = true
  try {
    const res = await createOrder({
      ...selectionPayload(),
      usePoints: effectiveUsePoints.value || null,
      receiverName: current.value.receiverName,
      receiverPhone: current.value.receiverPhone,
      receiverAddress: current.value.address
    })
    sessionStorage.removeItem('ms_checkout_items')
    const orders = res.data.orders || []
    if (res.data.groupNo) {
      // 跨店合单：生成订单组（父订单），收银台整组一次付清
      ElMessage.success(`已按店铺生成 ${orders.length} 个订单并合并支付，去支付`)
      router.push({ path: '/pay', query: { group: res.data.groupNo } })
    } else {
      ElMessage.success('订单已创建，去支付')
      router.push(`/pay/${res.data.orderNo}`)
    }
  } catch { /* ignore */ } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.checkout {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
}
h3 {
  margin-bottom: 16px;
}
.block {
  margin-bottom: 16px;
}
.change {
  float: right;
  font-weight: 400;
}
.hint {
  font-size: 12px;
  color: #999;
  margin-left: 10px;
}
.addr-show {
  padding: 2px 0;
}
.as-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.as-name {
  font-weight: 600;
  color: #333;
}
.as-phone {
  color: #999;
  font-size: 13px;
}
.as-text {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
}
.shop-block {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}
.shop-head {
  background: #fafafa;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
}
.shop-amount {
  float: right;
  color: #ff4b2b;
  font-weight: 600;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px dashed #f0f0f0;
}
.g-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}
.g-photo {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.item-mid {
  flex: 1;
}
.item-name {
  font-size: 14px;
}
.item-sku {
  font-size: 12px;
  color: #396afc;
  margin-top: 3px;
}
.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.item-orig {
  color: #bbb;
  text-decoration: line-through;
  margin-right: 6px;
}
.item-price {
  color: #999;
  font-size: 13px;
  width: 130px;
  text-align: right;
}
.item-sub {
  color: #ff4b2b;
  font-weight: 600;
  width: 90px;
  text-align: right;
}
.summary {
  text-align: right;
  line-height: 2.2;
  color: #666;
}
.summary p {
  display: flex;
  justify-content: flex-end;
  gap: 40px;
}
.summary span {
  width: 120px;
  color: #333;
}
.summary .used {
  color: #ff4b2b;
  font-size: 13px;
}
.summary .bear {
  color: #e6a23c;
  font-size: 12px;
}
.coupon-list {
  display: block;
}
.coupon-item {
  display: flex;
  align-items: flex-start;
  height: auto;
  padding: 8px 0;
  border-bottom: 1px dashed #f0f0f0;
  margin-right: 0;
}
.coupon-body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
}
.claim-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.c-title {
  font-weight: 600;
  color: #333;
}
.c-desc {
  color: #666;
}
.c-apply {
  color: #ff4b2b;
  font-weight: 600;
}
.c-no {
  color: #bbb;
}
.c-exp {
  color: #bbb;
  font-size: 12px;
}
.points-check {
  display: flex;
  align-items: flex-start;
  height: auto;
}
.points-check :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.6;
}
.points-tip {
  font-size: 12px;
  color: #bbb;
  margin-top: 6px;
}
.final {
  font-weight: 700;
}
.amt {
  color: #ff4b2b !important;
  font-size: 24px;
}
.submit {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
