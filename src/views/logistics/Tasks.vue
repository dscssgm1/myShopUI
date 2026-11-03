<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>我的任务</b>
        <el-radio-group v-model="type" size="small" @change="load">
          <el-radio-button value="pickup">揽收任务</el-radio-button>
          <el-radio-button value="delivery">派送任务</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <el-empty v-if="!rows.length" :description="type === 'pickup' ? '暂无待揽收任务' : '暂无派送任务'" />
    <div v-for="s in rows" :key="s.id" class="task">
      <div class="main">
        <div class="no">
          <b>{{ s.trackingNo }}</b>
          <span class="tag" :class="'t-' + s.status">{{ s.statusText }}</span>
          <span class="tag t-RETURN">{{ s.type === 'RETURN' ? '退货件' : '正向件' }}</span>
          <span class="region">{{ type === 'pickup' ? s.pickupRegion : s.receiverRegion }}</span>
        </div>
        <div class="line">店铺：{{ s.shopName }} ｜ 订单：{{ s.orderNo }}</div>
        <div v-if="type === 'pickup'" class="line">揽收地址：{{ s.pickupAddress }}</div>
        <div v-else class="line">收货：{{ s.receiverName }} {{ s.receiverAddress }}</div>
        <div v-if="type === 'pickup' && s.type === 'RETURN'" class="line">
          售后单：{{ s.afterSaleNo }} ｜ 预约时间：{{ formatTime(s.appointmentTime) }}
          ｜ 取件码：<b class="code">{{ s.pickupCode }}</b>
        </div>
      </div>
      <div class="actions">
        <el-button v-if="type === 'pickup'" type="primary" size="small" @click="pickup(s)">揽收</el-button>
        <template v-else>
          <el-button v-if="s.status === 'IN_TRANSIT'" type="warning" size="small" @click="startDelivery(s)">开始派送</el-button>
          <el-button v-if="s.status === 'DELIVERING'" type="success" size="small" @click="sign(s)">确认签收</el-button>
        </template>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deliverShipment, fetchCourierTasks, outForDelivery, pickupShipment } from '../../api/logistics'

const type = ref('pickup')
const rows = ref([])

onMounted(load)

async function load() {
  try {
    const res = await fetchCourierTasks(type.value)
    rows.value = res.data || []
  } catch { rows.value = [] }
}

function formatTime(t) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : ''
}

function pickup(s) {
  if (s.type === 'RETURN') {
    ElMessageBox.prompt('退货件揽收需核对买家取件码', '输入取件码', {
      inputPlaceholder: '请输入 6 位取件码',
      inputPattern: /^\d{6}$/,
      inputErrorMessage: '取件码为 6 位数字'
    }).then(async ({ value }) => {
      try {
        await pickupShipment(s.id, null, value)
        ElMessage.success('已揽收退货件')
        load()
      } catch { /* 后端已提示 */ }
    }).catch(() => {})
    return
  }
  pickupShipment(s.id).then(() => {
    ElMessage.success('已揽收')
    load()
  }).catch(() => {})
}

async function startDelivery(s) {
  await outForDelivery(s.id)
  ElMessage.success('已开始派送')
  load()
}

function sign(s) {
  ElMessageBox.prompt('请输入签收人', '确认签收', { inputValue: '本人' })
    .then(async ({ value }) => {
      await deliverShipment(s.id, value)
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
.task {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 10px;
}
.main {
  flex: 1;
}
.no {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tag {
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #f0f2f5;
  color: #666;
}
.tag.t-WAITING_PICKUP {
  background: #fdf6ec;
  color: #e6a23c;
}
.tag.t-IN_TRANSIT {
  background: #ecf5ff;
  color: #409eff;
}
.tag.t-DELIVERING {
  background: #fef0f0;
  color: #f56c6c;
}
.tag.t-RETURN {
  background: #fdf6ec;
  color: #e6a23c;
}
.code {
  color: #ff4b2b;
  letter-spacing: 1px;
}
.region {
  font-size: 12px;
  color: #999;
}
.line {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}
</style>
