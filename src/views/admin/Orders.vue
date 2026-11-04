<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>订单管理</b>
        <el-radio-group v-model="status" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="UNPAID">待付款</el-radio-button>
          <el-radio-button value="PAID">待发货</el-radio-button>
          <el-radio-button value="SHIPPED">待收货</el-radio-button>
          <el-radio-button value="COMPLETED">已完成</el-radio-button>
          <el-radio-button value="AFTER_SALE">售后中</el-radio-button>
          <el-radio-button value="REFUNDED">已退款</el-radio-button>
          <el-radio-button value="CANCELLED">已取消</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <el-table :data="orders" size="small" v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" width="200" />
      <el-table-column prop="shopName" label="店铺" width="120" />
      <el-table-column label="商品" min-width="220">
        <template #default="{ row }">{{ row.items.map((i) => i.productName).join('、') }}</template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ row.payAmount }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="tagType(row.status)">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="下单时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'PAID'" v-perm="'admin:orders:ship'" link type="primary" size="small" @click="ship(row)">发货</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />
  </el-card>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminOrders, shipOrder } from '../../api/admin'

const orders = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('')
const loading = ref(false)

onMounted(load)
watch(status, () => { page.value = 1; load() })

const tagType = (s) => ({
  UNPAID: 'danger', PAID: 'warning', SHIPPED: 'primary', COMPLETED: 'success',
  AFTER_SALE: 'warning', REFUNDED: 'info', CANCELLED: 'info'
}[s] || 'info')

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function load() {
  loading.value = true
  try {
    const res = await fetchAdminOrders({ status: status.value || undefined, page: page.value, size })
    orders.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { orders.value = [] } finally { loading.value = false }
}

function ship(row) {
  ElMessageBox.confirm(`确认订单 ${row.orderNo} 已发货？`, '发货', { type: 'info' }).then(async () => {
    await shipOrder(row.orderNo)
    ElMessage.success('已发货')
    load()
  })
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
