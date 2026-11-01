<template>
  <div class="orders-page">
    <h3>📦 我的订单 <span class="sub">每个店铺一个独立订单</span></h3>

    <el-tabs v-model="status">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane label="待付款" name="UNPAID" />
      <el-tab-pane label="待发货" name="PAID" />
      <el-tab-pane label="待收货" name="SHIPPED" />
      <el-tab-pane label="已完成" name="COMPLETED" />
      <el-tab-pane label="已取消" name="CANCELLED" />
    </el-tabs>

    <div v-loading="loading">
      <el-empty v-if="!loading && !orders.length" description="暂无相关订单" />

      <div v-for="o in orders" :key="o.orderNo" class="order-card">
        <div class="o-head">
          <span class="time">{{ o.createdAt }}</span>
          <span class="no">订单号：{{ o.orderNo }}</span>
          <span class="shop">🏪 {{ o.shopName }}</span>
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
              <el-button size="small" @click="cancel(o)">取消订单</el-button>
            </template>
            <el-button v-if="o.status === 'SHIPPED'" type="primary" size="small" @click="confirm(o)">确认收货</el-button>
            <span v-if="o.status === 'PAID'" class="done">待商家发货</span>
            <span v-if="o.status === 'COMPLETED'" class="done">已完成</span>
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
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cancelOrder, confirmShopOrder, fetchOrders } from '../api/trade'

const orders = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('')
const loading = ref(false)

onMounted(load)
watch(status, () => { page.value = 1; load() })

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
  ElMessageBox.confirm('确定取消该订单吗？', '提示', { type: 'warning' }).then(async () => {
    await cancelOrder(order.orderNo)
    ElMessage.success('订单已取消')
    load()
  })
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
</style>
