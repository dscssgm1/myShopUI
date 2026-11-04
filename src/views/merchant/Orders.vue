<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>店铺订单</b>
        <el-radio-group v-model="status" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="PAID">待发货</el-radio-button>
          <el-radio-button value="SHIPPED">待收货</el-radio-button>
          <el-radio-button value="COMPLETED">已完成</el-radio-button>
          <el-radio-button value="AFTER_SALE">售后中</el-radio-button>
          <el-radio-button value="REFUNDED">已退款</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <el-table :data="orders" size="small" v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" width="200" />
      <el-table-column label="商品" min-width="220">
        <template #default="{ row }">{{ row.items.map((i) => i.productName).join('、') }}</template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ row.payAmount }}</template>
      </el-table-column>
      <el-table-column prop="receiverName" label="收货人" width="90" />
      <el-table-column prop="receiverAddress" label="收货地址" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="tagType(row.status)">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'PAID'" v-perm="'merchant:orders:ship'" link type="primary" size="small" @click="ship(row)">发货</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />

    <!-- 发货：选择物流公司，由订单服务统一编排创建运单 -->
    <el-dialog v-model="shipDialog" :title="`发货 - ${shippingOrder?.orderNo || ''}`" width="420px">
      <el-alert
        v-if="shippingOrder" type="info" :closable="false" show-icon style="margin-bottom: 14px"
        :title="`${shippingOrder.shopName} ｜ 收货：${shippingOrder.receiverName}`"
        :description="shippingOrder.receiverAddress"
      />
      <el-select v-model="companyId" placeholder="选择物流公司" style="width: 100%">
        <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <p class="ship-tip">确认后订单转为待收货，并生成物流运单。</p>
      <template #footer>
        <el-button @click="shipDialog = false">取消</el-button>
        <el-button type="primary" :loading="shipping" :disabled="!companyId" @click="confirmShip">确认发货</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchMerchantOrders, shipOrder } from '../../api/admin'
import { fetchCompanies } from '../../api/logistics'

const orders = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('')
const loading = ref(false)

const shipDialog = ref(false)
const shipping = ref(false)
const shippingOrder = ref(null)
const companies = ref([])
const companyId = ref(null)

onMounted(load)
watch(status, () => { page.value = 1; load() })

const tagType = (s) => ({
  UNPAID: 'danger', PAID: 'warning', SHIPPED: 'primary', COMPLETED: 'success',
  AFTER_SALE: 'warning', REFUNDED: 'info', CANCELLED: 'info'
}[s] || 'info')

async function load() {
  loading.value = true
  try {
    const res = await fetchMerchantOrders({ status: status.value || undefined, page: page.value, size })
    orders.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { orders.value = [] } finally { loading.value = false }
}

/** 发货：弹窗选择物流公司后由后端统一编排 */
async function ship(order) {
  shippingOrder.value = order
  companyId.value = null
  shipDialog.value = true
  try {
    const res = await fetchCompanies()
    companies.value = res.data || []
    if (companies.value.length) {
      companyId.value = companies.value[0].id
    } else {
      ElMessage.warning('暂无入驻物流公司，请联系平台')
    }
  } catch { companies.value = [] }
}

async function confirmShip() {
  if (!shippingOrder.value || !companyId.value) return
  shipping.value = true
  try {
    await shipOrder(shippingOrder.value.orderNo, companyId.value)
    shipDialog.value = false
    ElMessage.success('已发货并生成运单')
    load()
  } catch { /* 后端已提示具体原因 */ } finally {
    shipping.value = false
  }
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
