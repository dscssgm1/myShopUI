<template>
  <div class="mall-page">
    <div class="mall-head">
      <h3>🎁 积分商城</h3>
      <div class="mall-meta">
        <span>我的积分：<b>{{ points }}</b></span>
        <span class="tip">订单完成后按实付 1 元得 1 积分，会员等级可加成；积分可兑换优惠券，下单时还能抵现金</span>
        <el-button size="small" plain @click="openExchanges">我的兑换</el-button>
      </div>
    </div>

    <el-empty v-if="!loading && !items.length" description="积分商城暂无可兑换的优惠券" />

    <div v-loading="loading" class="mall-grid">
      <div v-for="i in items" :key="i.templateId" class="mall-coupon">
        <div class="mc-top">
          <div class="mc-left">
            <div class="mc-amount">¥<b>{{ i.discountAmount }}</b></div>
            <div class="mc-threshold">{{ i.thresholdAmount > 0 ? `满 ${i.thresholdAmount} 可用` : '无门槛' }}</div>
          </div>
          <div class="mc-right">
            <div class="mc-title">
              {{ i.title }}
              <el-tag v-if="i.shopId > 0" size="small" type="warning">商家券</el-tag>
              <el-tag v-else size="small" type="danger">平台券</el-tag>
            </div>
            <div class="mc-scope">适用：{{ i.scopeText || '全场通用' }}</div>
            <div class="mc-time">{{ validEndText(i) }}</div>
          </div>
        </div>
        <div class="mc-bottom">
          <div class="mc-points">
            <b>{{ i.pointsPrice }}</b> 积分
            <span class="mc-stock">剩余 {{ i.remaining ?? i.totalStock }} 张</span>
            <el-tag v-if="i.perUserLimit > 1" size="small" type="info" effect="plain">限兑 {{ i.perUserLimit }} 张</el-tag>
          </div>
          <el-button
            type="danger" size="small"
            :disabled="!canExchange(i)"
            @click="openExchange(i)"
          >{{ buttonText(i) }}</el-button>
        </div>
      </div>
    </div>

    <!-- 兑换确认 -->
    <el-dialog v-model="dialog.visible" title="积分兑换" width="420px">
      <template v-if="!dialog.success">
        <div class="ex-item">
          <div class="ex-coupon">
            <div class="ex-amount">¥<b>{{ dialog.item?.discountAmount }}</b></div>
            <div class="ex-threshold">{{ dialog.item?.thresholdAmount > 0 ? `满 ${dialog.item?.thresholdAmount} 可用` : '无门槛' }}</div>
          </div>
          <div class="ex-info">
            <div class="ex-name">{{ dialog.item?.title }}</div>
            <div class="ex-cost">消耗 <b>{{ dialog.item?.pointsPrice }}</b> 积分</div>
            <div class="ex-balance">当前积分：{{ points }}，兑换后剩余 {{ Math.max(points - (dialog.item?.pointsPrice || 0), 0) }}</div>
          </div>
        </div>
        <div class="ex-tip">兑换成功后优惠券直接放入「我的优惠券」，下单时可用积分抵现</div>
      </template>
      <template v-else>
        <el-result icon="success" title="兑换成功" sub-title="优惠券已放入我的优惠券">
          <template #extra>
            <el-button type="danger" @click="goMyCoupons">去我的优惠券</el-button>
            <el-button @click="dialog.visible = false">继续逛逛</el-button>
          </template>
        </el-result>
      </template>
      <!-- #footer 必须是 el-dialog 的直接子节点，不能嵌在 v-if 的 template 里 -->
      <template #footer>
        <template v-if="!dialog.success">
          <el-button @click="dialog.visible = false">取消</el-button>
          <el-button type="danger" :loading="dialog.submitting" @click="submitExchange">确认兑换</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 我的兑换记录 -->
    <el-drawer v-model="drawer.visible" title="我的兑换记录" size="420px">
      <el-empty v-if="!drawer.list.length" description="还没有兑换记录" />
      <div v-for="e in drawer.list" :key="e.id" class="ex-record">
        <span class="ex-emoji">{{ e.itemEmoji }}</span>
        <div class="ex-info">
          <div class="ex-name">{{ e.itemName }}</div>
          <div class="ex-meta">
            <span>{{ e.createdAt }}</span>
            <span class="ex-points">-{{ e.points }} 积分</span>
          </div>
          <div class="ex-order">优惠券已放入「我的优惠券」</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { fetchMemberProfile, fetchPointsMallItems, exchangePointsCoupon, fetchMyExchanges } from '../api/user'

const router = useRouter()
const userStore = useUserStore()
const loggedIn = computed(() => userStore.isLogin)

const loading = ref(false)
const items = ref([])
const points = ref(0)

onMounted(() => {
  loadItems()
  if (loggedIn.value) {
    loadPoints()
  }
})

function loadItems() {
  loading.value = true
  fetchPointsMallItems()
    .then((res) => (items.value = res.data || []))
    .catch(() => {})
    .finally(() => (loading.value = false))
}

function loadPoints() {
  fetchMemberProfile({ silent: true })
    .then((res) => (points.value = res.data?.points || 0))
    .catch(() => {})
}

function validEndText(item) {
  if (!item.validEnd) return '长期有效'
  return `${String(item.validEnd).slice(0, 10).replace('T', ' ')} 前有效`
}

function canExchange(item) {
  if (!loggedIn.value) return true // 未登录也给点，点了再引导登录
  if ((item.remaining ?? item.totalStock) <= 0) return false
  if (item.claimed) return false
  return points.value >= item.pointsPrice
}

function buttonText(item) {
  if (!loggedIn.value) return '登录后兑换'
  if ((item.remaining ?? item.totalStock) <= 0) return '已兑完'
  if (item.claimed) return item.perUserLimit > 1 ? '已达限兑' : '已兑换'
  if (points.value < item.pointsPrice) return '积分不足'
  return '立即兑换'
}

const dialog = reactive({ visible: false, item: null, submitting: false, success: false })

function openExchange(item) {
  if (!loggedIn.value) {
    router.push({ name: 'login', query: { redirect: '/points-mall' } })
    return
  }
  dialog.item = item
  dialog.success = false
  dialog.visible = true
}

function submitExchange() {
  dialog.submitting = true
  exchangePointsCoupon({ templateId: dialog.item.templateId })
    .then(() => {
      dialog.success = true
      ElMessage.success('兑换成功')
      loadPoints()
      loadDrawer()
      loadItems() // 剩余量/限兑状态刷新
    })
    .catch(() => {})
    .finally(() => (dialog.submitting = false))
}

function goMyCoupons() {
  dialog.visible = false
  router.push('/user/coupons')
}

const drawer = reactive({ visible: false, list: [] })

function openExchanges() {
  drawer.visible = true
  loadDrawer()
}

function loadDrawer() {
  if (!loggedIn.value) return
  fetchMyExchanges({ silent: true })
    .then((res) => (drawer.list = res.data || []))
    .catch(() => {})
}
</script>

<style scoped>
.mall-page {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 60vh;
}
.mall-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.mall-head h3 {
  margin: 0;
}
.mall-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mall-meta b {
  color: #ff4b2b;
  font-size: 20px;
}
.tip {
  font-size: 12px;
  color: #999;
}
.mall-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  min-height: 120px;
}
.mall-coupon {
  border: 1px solid #ffddd5;
  border-radius: 10px;
  padding: 14px 16px;
  background: linear-gradient(90deg, #fff8f6, #fff);
}
.mc-top {
  display: flex;
  gap: 14px;
}
.mc-left {
  text-align: center;
  color: #ff4b2b;
  min-width: 92px;
  border-right: 1px dashed #ffd0c4;
  padding-right: 14px;
  align-self: center;
}
.mc-amount b {
  font-size: 28px;
}
.mc-threshold {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.mc-right {
  flex: 1;
  min-width: 0;
}
.mc-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.mc-scope {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.mc-time {
  font-size: 12px;
  color: #bbb;
  margin-top: 4px;
}
.mc-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #ffd0c4;
}
.mc-points {
  color: #ff4b2b;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mc-points b {
  font-size: 18px;
}
.mc-stock {
  color: #999;
  font-size: 12px;
}
.ex-item {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ex-coupon {
  text-align: center;
  color: #ff4b2b;
  background: #fff3f0;
  border-radius: 8px;
  padding: 12px 16px;
  flex-shrink: 0;
}
.ex-amount b {
  font-size: 24px;
}
.ex-threshold {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.ex-info {
  flex: 1;
  min-width: 0;
}
.ex-name {
  font-size: 14px;
  font-weight: 600;
}
.ex-cost {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}
.ex-cost b {
  color: #ff4b2b;
  font-size: 16px;
}
.ex-balance {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.ex-tip {
  font-size: 12px;
  color: #999;
  background: #f7f8fa;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 14px;
}
.ex-record {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.ex-emoji {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #fff3f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.ex-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #999;
  margin: 4px 0;
}
.ex-points {
  color: #ff4b2b;
}
.ex-order {
  font-size: 12px;
  color: #666;
}
</style>
