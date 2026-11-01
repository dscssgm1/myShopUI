<template>
  <div class="pay-page">
    <el-result
      v-if="paid" icon="success" title="支付成功！"
      :sub-title="`共 ${orders.length} 个订单，我们将尽快为您发货`"
    >
      <template #extra>
        <el-button type="primary" @click="$router.push('/user/orders')">查看订单</el-button>
        <el-button @click="$router.push('/')">返回首页</el-button>
      </template>
    </el-result>

    <template v-else-if="orders.length">
      <h3>💰 收银台</h3>
      <div class="order-brief">
        <span>待支付订单 {{ orders.length }} 个</span>
        <span class="amt">¥{{ totalAmount }}</span>
        <span class="countdown">支付剩余时间：{{ countdown }}</span>
      </div>

      <el-card shadow="never" class="block">
        <template #header><b>订单明细（按店铺）</b></template>
        <div v-for="o in orders" :key="o.orderNo" class="order-line">
          <span class="shop">🏪 {{ o.shopName }}</span>
          <span class="no">{{ o.orderNo }}</span>
          <span class="amt-sm">¥{{ o.payAmount }}</span>
        </div>
      </el-card>

      <el-card shadow="never" class="block">
        <template #header><b>选择支付方式</b></template>
        <el-radio-group v-model="method" class="pay-methods">
          <el-radio value="ALIPAY" border><span class="method">🔵 支付宝</span></el-radio>
          <el-radio value="WECHAT" border><span class="method">🟢 微信支付</span></el-radio>
          <el-radio value="CARD" border><span class="method">💳 银行卡</span></el-radio>
        </el-radio-group>
        <div class="qr">
          <div class="qr-box">{{ method === 'ALIPAY' ? '🔵' : method === 'WECHAT' ? '🟢' : '💳' }}</div>
          <p>请使用{{ methodName }}扫码完成支付（演示环境点击按钮即视为支付成功）</p>
        </div>
      </el-card>

      <div class="actions">
        <el-button size="large" @click="$router.push('/user/orders')">稍后支付</el-button>
        <el-button type="danger" size="large" :loading="paying" @click="doPay">确认支付 ¥{{ totalAmount }}</el-button>
      </div>
    </template>

    <el-empty v-else-if="!loading" description="订单不存在" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPayment, fetchOrderDetail, payOrder } from '../api/trade'

const route = useRoute()
const orders = ref([])
const loading = ref(false)
const paying = ref(false)
const paid = ref(false)
const method = ref('ALIPAY')
const seconds = ref(15 * 60)

const timer = setInterval(() => seconds.value > 0 && seconds.value--, 1000)
onUnmounted(() => clearInterval(timer))

const methodName = computed(() => ({ ALIPAY: '支付宝', WECHAT: '微信', CARD: '银行卡' }[method.value]))
const totalAmount = computed(() => orders.value
  .reduce((n, o) => n + Number(o.payAmount || 0), 0).toFixed(2))
const countdown = computed(() => {
  const m = String(Math.floor(seconds.value / 60)).padStart(2, '0')
  const s = String(seconds.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    const list = orderNos()
    const results = []
    for (const no of list) {
      try {
        const res = await fetchOrderDetail(no)
        if (res.data) results.push(res.data)
      } catch { /* ignore */ }
    }
    orders.value = results
    paid.value = results.length > 0 &&
      results.every((o) => ['PAID', 'SHIPPED', 'COMPLETED'].includes(o.status))
  } finally {
    loading.value = false
  }
}

function orderNos() {
  if (route.params.orderNo) return [route.params.orderNo]
  const raw = route.query.orders
  return raw ? String(raw).split(',').filter(Boolean) : []
}

async function doPay() {
  paying.value = true
  try {
    for (const order of orders.value) {
      if (['PAID', 'SHIPPED', 'COMPLETED'].includes(order.status)) continue
      const created = await createPayment(order.orderNo, method.value)
      await payOrder(created.data.paymentNo)
    }
    paid.value = true
    ElMessage.success('支付成功')
  } catch { /* ignore */ } finally {
    paying.value = false
  }
}
</script>

<style scoped>
.pay-page {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  min-height: 50vh;
}
h3 {
  margin-bottom: 14px;
}
.order-brief {
  display: flex;
  align-items: center;
  gap: 24px;
  background: #fff5f3;
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 16px;
}
.amt {
  color: #ff4b2b;
  font-size: 22px;
  font-weight: 700;
}
.countdown {
  margin-left: auto;
  color: #999;
  font-size: 13px;
}
.block {
  margin-bottom: 16px;
}
.order-line {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px dashed #f0f0f0;
  font-size: 14px;
}
.order-line:last-child {
  border-bottom: none;
}
.shop {
  font-weight: 600;
  width: 160px;
}
.no {
  color: #999;
  font-size: 13px;
  flex: 1;
}
.amt-sm {
  color: #ff4b2b;
  font-weight: 600;
}
.pay-methods {
  display: flex;
  gap: 16px;
}
.method {
  font-size: 15px;
  padding: 0 8px;
}
.qr {
  margin-top: 20px;
  text-align: center;
  color: #999;
  font-size: 13px;
}
.qr-box {
  width: 160px;
  height: 160px;
  margin: 0 auto 12px;
  border: 1px dashed #ddd;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
