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
          <div class="g-img" :style="{ background: item.productColor }">{{ item.productEmoji }}</div>
          <div class="item-mid">
            <div class="item-name">{{ item.productName }}</div>
            <div v-if="item.skuSpecs" class="item-sku">{{ item.skuSpecs }}</div>
          </div>
          <div class="item-price">¥{{ item.price }} × {{ item.quantity }}</div>
          <div class="item-sub">¥{{ item.subtotal }}</div>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <b>优惠券</b>
        <span class="hint">不选则自动匹配最优组合，可叠加多张（受平台规则限制）</span>
      </template>
      <div v-if="multiShop" class="coupon-tip">跨店铺结算暂不支持使用优惠券，请分店铺结算后再选券</div>
      <el-empty v-else-if="!availableCoupons.length" :image-size="60" description="暂无可用优惠券，去领券中心逛逛" />
      <el-checkbox-group v-else v-model="selectedCouponIds" class="coupon-list" @change="loadPreview">
        <el-checkbox
          v-for="c in availableCoupons"
          :key="c.userCouponId"
          :value="c.userCouponId"
          :disabled="Number(c.applicableAmount) <= 0"
          class="coupon-item"
        >
          <div class="coupon-body">
            <span class="c-title">{{ c.title }}</span>
            <el-tag v-if="c.shopId > 0" size="small" type="warning">商家券</el-tag>
            <span class="c-desc">满 {{ c.thresholdAmount }} 减 {{ c.discountAmount }} · {{ c.scopeText }}</span>
            <span v-if="Number(c.applicableAmount) > 0" class="c-apply">本单可抵 ¥{{ c.applicableAmount }}</span>
            <span v-else class="c-no">未满足使用门槛</span>
            <span class="c-exp">{{ shortTime(c.expiredAt) }} 前有效</span>
          </div>
        </el-checkbox>
      </el-checkbox-group>
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
import { fetchAvailableCoupons } from '../api/promotion'
import AddressPickerDialog from '../components/AddressPickerDialog.vue'

const router = useRouter()
const items = ref([])
const preview = ref({ shops: [] })
const availableCoupons = ref([])
const selectedCouponIds = ref([])
const loading = ref(false)
const submitting = ref(false)
const pickerVisible = ref(false)
const current = ref(null)

const multiShop = computed(() => (preview.value.shops?.length || 0) > 1)

onMounted(async () => {
  items.value = JSON.parse(sessionStorage.getItem('ms_checkout_items') || '[]')
  if (!items.value.length) {
    ElMessage.warning('请先选择要结算的商品')
    router.replace('/cart')
    return
  }
  await Promise.all([loadDefaultAddress(), loadPreview()])
  loadCoupons()
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

async function loadPreview() {
  loading.value = true
  try {
    const res = await previewOrder({
      items: orderItems(),
      couponIds: selectedCouponIds.value.length ? selectedCouponIds.value : null
    })
    preview.value = res.data || { shops: [] }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
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
      items: orderItems(),
      couponIds: selectedCouponIds.value.length ? selectedCouponIds.value : null,
      receiverName: current.value.receiverName,
      receiverPhone: current.value.receiverPhone,
      receiverAddress: current.value.address
    })
    sessionStorage.removeItem('ms_checkout_items')
    const orders = res.data.orders || []
    ElMessage.success(orders.length > 1
      ? `已按店铺生成 ${orders.length} 个订单，去支付`
      : '订单已创建，去支付')
    if (orders.length > 1) {
      router.push({ path: '/pay', query: { orders: orders.map((o) => o.orderNo).join(',') } })
    } else {
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
.coupon-tip {
  font-size: 13px;
  color: #999;
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
