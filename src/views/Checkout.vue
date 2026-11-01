<template>
  <div class="checkout">
    <h3>📋 确认订单</h3>

    <el-card shadow="never" class="block">
      <template #header><b>收货地址</b></template>
      <el-form :model="addr" label-width="90px" style="max-width: 560px">
        <el-form-item label="收货人" required>
          <el-input v-model="addr.name" placeholder="姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="addr.phone" placeholder="11 位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="收货地址" required>
          <el-input v-model="addr.address" type="textarea" :rows="2" placeholder="省 / 市 / 区 + 详细地址" />
        </el-form-item>
      </el-form>
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
      <template #header><b>结算信息</b></template>
      <div class="summary">
        <p>商品总额：<span>¥{{ preview.originalAmount || 0 }}</span></p>
        <p>活动优惠：<span>-¥{{ preview.promotionDiscount || 0 }}</span></p>
        <p>优惠券：<span>-¥{{ preview.couponDiscount || 0 }}</span></p>
        <p>运费：<span>¥{{ preview.freightAmount || 0 }}</span></p>
        <p class="final">应付金额：<span class="amt">¥{{ preview.payAmount || 0 }}</span></p>
      </div>
    </el-card>

    <div class="submit">
      <el-button size="large" @click="$router.back()">返回</el-button>
      <el-button type="danger" size="large" :loading="submitting" @click="submit">提交订单</el-button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createOrder, previewOrder } from '../api/trade'

const router = useRouter()
const items = ref([])
const preview = ref({ shops: [] })
const loading = ref(false)
const submitting = ref(false)
const addr = reactive({
  name: '张三',
  phone: '13800000000',
  address: '北京市朝阳区望京 SOHO T1'
})

onMounted(async () => {
  items.value = JSON.parse(sessionStorage.getItem('ms_checkout_items') || '[]')
  if (!items.value.length) {
    ElMessage.warning('请先选择要结算的商品')
    router.replace('/cart')
    return
  }
  await loadPreview()
})

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
    const res = await previewOrder({ items: orderItems(), couponId: null })
    preview.value = res.data || { shops: [] }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function submit() {
  if (!addr.name || !/^1\d{10}$/.test(addr.phone) || !addr.address) {
    ElMessage.warning('请完整填写收货信息')
    return
  }
  submitting.value = true
  try {
    const res = await createOrder({
      items: orderItems(),
      receiverName: addr.name,
      receiverPhone: addr.phone,
      receiverAddress: addr.address
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
.hint {
  font-size: 12px;
  color: #999;
  margin-left: 10px;
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
