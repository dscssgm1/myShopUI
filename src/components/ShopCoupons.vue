<template>
  <!-- 无可领券时整个组件不渲染 -->
  <div v-if="coupons.length" :class="compact ? 'sc-row row' : 'sc-section'">
    <span v-if="compact" class="label sc-label">优&nbsp;&nbsp;惠</span>
    <h3 v-else>🎟️ 店铺优惠券</h3>
    <div class="sc-list">
      <div v-for="t in coupons" :key="t.id" class="sc-item">
        <div class="sc-amount">¥<b>{{ t.discountAmount }}</b></div>
        <div class="sc-mid">
          <div class="sc-title" :title="t.title">{{ t.title }}</div>
          <div class="sc-threshold">满 {{ t.thresholdAmount }} 可用</div>
        </div>
        <el-button v-if="t.claimed" size="small" disabled>已领取</el-button>
        <el-button v-else type="danger" size="small" :loading="claiming === t.id" @click="claim(t)">
          领取
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { claimCoupon, fetchCouponTemplates } from '../api/user'
import { useUserStore } from '../store/user'

/**
 * 店铺优惠券领取条：复用领券中心的模板接口，按 shopId 过滤出本店在发的券。
 * compact = true 时渲染成商品详情价格区内的一行（样式与「促销」行对齐）；
 * 否则渲染成店铺页的独立区块。无可领券时不占位。
 */
const props = defineProps({
  shopId: { type: Number, required: true },
  compact: { type: Boolean, default: false }
})
/** 领取成功后通知父组件重算最低到手价 */
const emit = defineEmits(['claimed'])

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const coupons = ref([])
const claiming = ref(null)

watch(() => props.shopId, load, { immediate: true })

async function load() {
  if (!props.shopId || props.shopId <= 0) return
  try {
    const res = await fetchCouponTemplates()
    coupons.value = (res.data || [])
      .filter((t) => t.shopId === props.shopId && (t.status === 'ACTIVE' || !t.status))
  } catch {
    coupons.value = []
  }
}

async function claim(t) {
  if (!userStore.isLogin) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  claiming.value = t.id
  try {
    await claimCoupon(t.id)
    ElMessage.success('领取成功，可在「我的优惠券」查看')
    t.claimed = true
    emit('claimed', t)
  } catch { /* 后端已提示（领完/重复领取等） */ } finally {
    claiming.value = null
  }
}
</script>

<style scoped>
.sc-section {
  padding: 20px 36px 0;
}
.sc-section h3 {
  margin-bottom: 12px;
}
.sc-label {
  color: #ff4b2b;
}
.sc-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.sc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 265px;
  padding: 10px 14px;
  border: 1px solid #ffddd5;
  border-radius: 8px;
  background: linear-gradient(90deg, #fff5f3, #fff);
}
.sc-amount {
  color: #ff4b2b;
  text-align: center;
  min-width: 52px;
  border-right: 1px dashed #ffd0c4;
  padding-right: 10px;
  white-space: nowrap;
}
.sc-amount b {
  font-size: 20px;
}
.sc-mid {
  flex: 1;
  min-width: 0;
}
.sc-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sc-threshold {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.sc-row {
  align-items: center;
}
.sc-row .sc-list {
  gap: 8px;
}
.sc-row .sc-item {
  width: auto;
  max-width: 300px;
  padding: 6px 12px;
}
.sc-row .sc-amount b {
  font-size: 17px;
}
</style>
