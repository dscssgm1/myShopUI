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
        <span>待支付订单 {{ orders.length }} 个{{ isGroup ? '（跨店合单 · 整组一次付清）' : '' }}</span>
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
        <el-empty
          v-if="!enabledMethods.length" description="平台暂未启用任何支付方式，请联系客服"
          :image-size="60"
        />
        <template v-else>
          <el-radio-group v-model="method" class="pay-methods">
            <el-radio v-for="m in enabledMethods" :key="m.code" :value="m.code" border>
              <span class="method">{{ m.icon }} {{ m.label }}</span>
            </el-radio>
          </el-radio-group>
          <div class="qr">
            <div class="qr-box">{{ currentMethod?.icon || '💳' }}</div>
            <p>请使用{{ methodName }}扫码完成支付（演示环境点击按钮即视为支付成功）</p>
          </div>
        </template>
      </el-card>

      <div class="actions">
        <el-button size="large" @click="$router.push('/user/orders')">稍后支付</el-button>
        <el-button
          type="danger" size="large" :loading="paying" :disabled="!enabledMethods.length"
          @click="doPay"
        >确认支付 ¥{{ totalAmount }}</el-button>
      </div>
    </template>

    <el-empty v-else-if="!loading" description="订单不存在" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createGroupPayment, createPayment, fetchOrderDetail, fetchOrderGroup, payOrder } from '../api/trade'
import { fetchPublicConfigMap, parseConfigJson } from '../api/config'

const route = useRoute()
// 售后中/已退款订单同样属于已付款，不能重复支付
const PAID_STATUSES = ['PAID', 'SHIPPED', 'COMPLETED', 'AFTER_SALE', 'REFUNDED']

const PAY_DEFS = [
  { code: 'ALIPAY', key: 'alipay', label: '支付宝', icon: '🔵' },
  { code: 'WECHAT', key: 'wechat', label: '微信支付', icon: '🟢' },
  { code: 'CARD', key: 'card', label: '银行卡', icon: '💳' }
]

const orders = ref([])
const groupNo = ref('')
const group = ref(null)
const loading = ref(false)
const paying = ref(false)
const paid = ref(false)
const methods = ref(PAY_DEFS.map((m) => ({ ...m, enabled: true })))
const method = ref('ALIPAY')
const seconds = ref(15 * 60)

const timer = setInterval(() => seconds.value > 0 && seconds.value--, 1000)
onUnmounted(() => clearInterval(timer))

const enabledMethods = computed(() => methods.value.filter((m) => m.enabled))
const currentMethod = computed(() => methods.value.find((m) => m.code === method.value))
const methodName = computed(() => currentMethod.value?.label || '支付方式')
const isGroup = computed(() => !!groupNo.value)
const totalAmount = computed(() => isGroup.value
  ? Number(group.value?.payAmount || 0).toFixed(2)
  : orders.value.reduce((n, o) => n + Number(o.payAmount || 0), 0).toFixed(2))
const countdown = computed(() => {
  const m = String(Math.floor(seconds.value / 60)).padStart(2, '0')
  const s = String(seconds.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

onMounted(() => {
  loadPayConfig()
  load()
})

/** 支付方式与待支付超时均由平台配置中心维护 */
async function loadPayConfig() {
  try {
    const map = await fetchPublicConfigMap('pay-method', { silent: true })
    methods.value = PAY_DEFS.map((def) => {
      const parsed = parseConfigJson(map[def.key], {})
      return {
        ...def,
        label: parsed?.name || def.label,
        enabled: parsed?.enabled !== false
      }
    })
    if (!enabledMethods.value.some((m) => m.code === method.value)) {
      method.value = enabledMethods.value[0]?.code || ''
    }
  } catch { /* 保留默认支付方式 */ }

  try {
    const map = await fetchPublicConfigMap('system', { silent: true })
    const minutes = Number(map.orderTimeoutMinutes)
    if (Number.isFinite(minutes) && minutes > 0) seconds.value = Math.round(minutes * 60)
  } catch { /* ignore */ }
}

async function load() {
  loading.value = true
  try {
    if (route.query.group) {
      // 跨店合单：按订单组（父订单）加载，收银台一次付清
      groupNo.value = String(route.query.group)
      const res = await fetchOrderGroup(groupNo.value)
      group.value = res.data
      orders.value = res.data?.orders || []
      paid.value = res.data?.status === 'PAID'
      return
    }
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
      results.every((o) => PAID_STATUSES.includes(o.status))
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
  if (!enabledMethods.value.length) {
    ElMessage.warning('平台暂未启用任何支付方式')
    return
  }
  paying.value = true
  try {
    if (isGroup.value) {
      // 合单：一张支付单整组一次付清
      const created = await createGroupPayment(groupNo.value, method.value)
      await payOrder(created.data.paymentNo)
    } else {
      for (const order of orders.value) {
        if (PAID_STATUSES.includes(order.status)) continue
        const created = await createPayment(order.orderNo, method.value)
        await payOrder(created.data.paymentNo)
      }
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
