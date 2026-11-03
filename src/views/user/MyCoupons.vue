<template>
  <div class="page-card">
    <div class="head">
      <h3>🎟️ 我的优惠券</h3>
      <el-button link type="primary" @click="openCenter">领券中心 →</el-button>
    </div>
    <el-tabs v-model="tab" @tab-change="load">
      <el-tab-pane label="未使用" name="UNUSED" />
      <el-tab-pane label="已使用" name="USED" />
      <el-tab-pane label="已过期" name="EXPIRED" />
    </el-tabs>

    <div v-loading="loading">
      <el-empty v-if="!loading && !list.length" :description="emptyText" />
      <div v-for="c in list" :key="c.id" class="coupon" :class="{ dim: c.status !== 'UNUSED' }">
        <div class="c-left">
          <div class="c-amount">¥<b>{{ c.discountAmount }}</b></div>
          <div class="c-threshold">满 {{ c.thresholdAmount }} 可用</div>
        </div>
        <div class="c-mid">
          <div class="c-title">
            {{ c.title }}
            <el-tag v-if="c.shopId > 0" size="small" type="warning">商家券 · {{ c.shopName }}</el-tag>
          </div>
          <div class="c-scope">适用：{{ c.scopeText || '全场通用' }}</div>
          <div class="c-time">
            {{ formatDate(c.claimedAt) }} 领取
            <template v-if="c.expiredAt"> · {{ formatDate(c.expiredAt) }} 到期</template>
          </div>
        </div>
        <el-tag :type="tagType(c.status)" size="small">{{ statusText(c.status) }}</el-tag>
      </div>
    </div>

    <el-dialog v-model="centerDialog" title="🎁 领券中心" width="520px">
      <div v-loading="centerLoading">
        <el-empty v-if="!templates.length" description="暂无可领取的优惠券" />
        <div v-for="t in templates" :key="t.id" class="tpl-item">
          <div class="c-left">
            <div class="c-amount">¥<b>{{ t.discountAmount }}</b></div>
            <div class="c-threshold">满 {{ t.thresholdAmount }} 可用</div>
          </div>
          <div class="c-mid">
            <div class="c-title">
              {{ t.title }}
              <el-tag v-if="t.shopId > 0" size="small" type="warning">商家券 · {{ t.shopName }}</el-tag>
            </div>
            <div class="c-scope">适用：{{ t.scopeText || '全场通用' }} · 剩余 {{ t.remaining ?? t.totalStock }} 张</div>
          </div>
          <el-button
            v-if="t.claimed" size="small" disabled
          >已领取</el-button>
          <el-button v-else type="danger" size="small" :loading="claiming === t.id" @click="claim(t)">
            立即领取
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { claimCoupon, fetchCouponTemplates, fetchMyCoupons } from '../../api/user'

const tab = ref('UNUSED')
const list = ref([])
const loading = ref(false)
const centerDialog = ref(false)
const centerLoading = ref(false)
const templates = ref([])
const claiming = ref(null)

onMounted(load)

const emptyText = computed(() => ({
  UNUSED: '还没有优惠券，快去领券中心领取吧',
  USED: '暂无已使用的优惠券',
  EXPIRED: '暂无已过期的优惠券'
}[tab.value]))

const statusText = (s) => ({ UNUSED: '未使用', USED: '已使用', EXPIRED: '已过期' }[s] || s)
const tagType = (s) => ({ UNUSED: 'danger', USED: 'info', EXPIRED: 'info' }[s] || 'info')
const formatDate = (t) => (t ? String(t).slice(0, 10).replace('T', ' ') : '')

async function load() {
  loading.value = true
  try {
    const res = await fetchMyCoupons(tab.value)
    list.value = res.data || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function openCenter() {
  centerDialog.value = true
  centerLoading.value = true
  try {
    const res = await fetchCouponTemplates()
    templates.value = (res.data || []).filter((t) => t.status === 'ACTIVE' || !t.status)
  } catch {
    templates.value = []
  } finally {
    centerLoading.value = false
  }
}

async function claim(t) {
  claiming.value = t.id
  try {
    await claimCoupon(t.id)
    ElMessage.success('领取成功')
    t.claimed = true
    load()
  } catch { /* 后端已提示 */ } finally {
    claiming.value = null
  }
}
</script>

<style scoped>
.page-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
h3 {
  margin: 0;
}
.coupon {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #ffddd5;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #fff8f6, #fff);
}
.coupon.dim {
  opacity: 0.55;
  filter: grayscale(0.6);
}
.c-left {
  text-align: center;
  color: #ff4b2b;
  min-width: 96px;
  border-right: 1px dashed #ffd0c4;
  padding-right: 16px;
}
.c-amount b {
  font-size: 26px;
}
.c-threshold {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.c-mid {
  flex: 1;
}
.c-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.c-scope {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.c-time {
  font-size: 12px;
  color: #bbb;
  margin-top: 4px;
}
.tpl-item {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #ffddd5;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 10px;
  background: #fff8f6;
}
</style>
