<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>运单管理</b>
        <el-radio-group v-model="status" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="WAITING_PICKUP">待揽收</el-radio-button>
          <el-radio-button value="PICKED">已揽收</el-radio-button>
          <el-radio-button value="IN_TRANSIT">运输中</el-radio-button>
          <el-radio-button value="DELIVERING">派送中</el-radio-button>
          <el-radio-button value="SIGNED">已签收</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <el-table :data="rows" size="small" v-loading="loading">
      <el-table-column prop="trackingNo" label="运单号" width="170" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.type === 'RETURN' ? 'warning' : 'info'">
            {{ row.typeText || '正向运单' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="orderNo" label="订单号" width="190" />
      <el-table-column prop="shopName" label="店铺" width="110" />
      <el-table-column prop="itemsText" label="商品" min-width="200" show-overflow-tooltip />
      <el-table-column prop="pickupRegion" label="揽收区域" width="120" />
      <el-table-column prop="receiverRegion" label="派送区域" width="120" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="tagType(row.status)">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="showDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'WAITING_PICKUP'" link type="success" size="small" @click="pickup(row)">揽收</el-button>
          <el-button v-if="row.status === 'PICKED'" link type="warning" size="small" @click="transit(row)">转运</el-button>
          <el-button v-if="row.status === 'IN_TRANSIT'" link type="warning" size="small" @click="deliverStart(row)">派送</el-button>
          <el-button v-if="row.status === 'DELIVERING'" link type="success" size="small" @click="sign(row)">签收</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />

    <el-dialog v-model="detailVisible" :title="`运单 ${current?.trackingNo || ''}`" width="520px">
      <template v-if="current">
        <p class="line"><b>订单：</b>{{ current.orderNo }} ｜ <b>店铺：</b>{{ current.shopName }}</p>
        <p class="line">
          <b>类型：</b>{{ current.typeText || '正向运单' }}
          <template v-if="current.type === 'RETURN'"> ｜ <b>售后单：</b>{{ current.afterSaleNo }}</template>
        </p>
        <p class="line"><b>揽收：</b>{{ current.pickupAddress }}（{{ current.pickupRegion }}）</p>
        <p class="line"><b>收货：</b>{{ current.receiverName }} {{ current.receiverPhone }} {{ current.receiverAddress }}</p>
        <p v-if="current.type === 'RETURN'" class="line">
          <b>取件码：</b><span class="code">{{ current.pickupCode }}</span>
          ｜ <b>预约时间：</b>{{ formatTime(current.appointmentTime) || '买家未预约' }}
        </p>
        <el-divider content-position="left">物流轨迹</el-divider>
        <el-timeline>
          <el-timeline-item
            v-for="(t, i) in current.traces" :key="i"
            :type="i === 0 ? 'primary' : ''" :hollow="i !== 0" :timestamp="formatTime(t.createdAt)"
          >{{ t.content }}</el-timeline-item>
        </el-timeline>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deliverShipment, fetchShipment, fetchShipments, outForDelivery, pickupShipment, transitShipment
} from '../../api/logistics'

const rows = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const status = ref('')
const loading = ref(false)
const detailVisible = ref(false)
const current = ref(null)

onMounted(load)
watch(status, () => { page.value = 1; load() })

const tagType = (s) => ({
  WAITING_PICKUP: 'warning', PICKED: 'primary', IN_TRANSIT: 'primary',
  DELIVERING: 'danger', SIGNED: 'success'
}[s] || 'info')
const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function load() {
  loading.value = true
  try {
    const res = await fetchShipments({ status: status.value || undefined, page: page.value, size })
    rows.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { rows.value = [] } finally { loading.value = false }
}

async function showDetail(row) {
  const res = await fetchShipment(row.id)
  current.value = res.data
  detailVisible.value = true
}

function pickup(row) {
  if (row.type === 'RETURN') {
    ElMessageBox.prompt('退货件揽收需核对买家取件码', '输入取件码', {
      inputPlaceholder: '请输入 6 位取件码',
      inputPattern: /^\d{6}$/,
      inputErrorMessage: '取件码为 6 位数字'
    }).then(async ({ value }) => {
      try {
        await pickupShipment(row.id, null, value)
        ElMessage.success('已揽收退货件')
        load()
      } catch { /* 后端已提示 */ }
    }).catch(() => {})
    return
  }
  pickupShipment(row.id).then(() => {
    ElMessage.success('已揽收')
    load()
  }).catch(() => {})
}

function transit(row) {
  ElMessageBox.prompt('请输入运输节点说明', '发往转运', { inputValue: '快件已到达转运中心' })
    .then(async ({ value }) => {
      await transitShipment(row.id, value)
      ElMessage.success('运输信息已更新')
      load()
    }).catch(() => {})
}

async function deliverStart(row) {
  await outForDelivery(row.id)
  ElMessage.success('已开始派送')
  load()
}

function sign(row) {
  ElMessageBox.prompt('请输入签收人', '确认签收', { inputValue: '本人' })
    .then(async ({ value }) => {
      await deliverShipment(row.id, value)
      ElMessage.success('已签收')
      load()
    }).catch(() => {})
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.line {
  font-size: 13px;
  color: #666;
  line-height: 1.9;
}
.code {
  font-weight: 700;
  color: #ff4b2b;
  letter-spacing: 2px;
}
</style>
