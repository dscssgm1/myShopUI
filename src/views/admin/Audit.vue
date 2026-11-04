<template>
  <el-card shadow="never">
    <el-tabs v-model="activeTab">
      <el-tab-pane v-if="userStore.hasPerm('admin:audit:product')" name="product" lazy>
        <template #label>
          商品审核
          <span v-if="counts.product" class="tab-badge">{{ counts.product }}</span>
        </template>
        <ProductPanel @changed="refreshCounts" />
      </el-tab-pane>

      <el-tab-pane v-if="userStore.hasPerm('admin:audit:shopApply')" name="shopApply" lazy>
        <template #label>
          商家入驻审核
          <span v-if="counts.shopApply" class="tab-badge">{{ counts.shopApply }}</span>
        </template>
        <ShopApplyPanel @changed="refreshCounts" />
      </el-tab-pane>

      <el-tab-pane v-if="userStore.hasPerm('admin:audit:record')" name="record" lazy>
        <template #label>
          物流入驻/通用审核
          <span v-if="counts.record" class="tab-badge">{{ counts.record }}</span>
        </template>
        <RecordPanel @changed="refreshCounts" />
      </el-tab-pane>

      <el-tab-pane v-if="userStore.hasPerm('admin:audit:review')" name="review" lazy>
        <template #label>
          评价审核
          <span v-if="counts.review" class="tab-badge">{{ counts.review }}</span>
        </template>
        <ReviewPanel @changed="refreshCounts" />
      </el-tab-pane>

      <el-tab-pane v-if="userStore.hasPerm('admin:audit:aftersale')" name="aftersale" lazy>
        <template #label>
          售后仲裁
          <span v-if="counts.aftersale" class="tab-badge">{{ counts.aftersale }}</span>
        </template>
        <AfterSalePanel @changed="refreshCounts" />
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchAuditPendingSummary } from '../../api/admin'
import { useUserStore } from '../../store/user'
import ProductPanel from './audit/ProductPanel.vue'
import ShopApplyPanel from './audit/ShopApplyPanel.vue'
import RecordPanel from './audit/RecordPanel.vue'
import ReviewPanel from './audit/ReviewPanel.vue'
import AfterSalePanel from './audit/AfterSalePanel.vue'

const userStore = useUserStore()

// Tab 记在 ?tab= 上；无权限的 Tab 被 v-if 隐藏，默认落到第一个可见 Tab
const TAB_KEYS = ['product', 'shopApply', 'record', 'review', 'aftersale'].filter((k) =>
  userStore.hasPerm(`admin:audit:${k}`)
)

const route = useRoute()
const router = useRouter()

// Tab 记在 ?tab= 上，便于旧入口重定向直达对应审核；无权限的 tab 被隐藏，落到第一个可见 tab
const activeTab = ref(TAB_KEYS.includes(route.query.tab) ? route.query.tab : (TAB_KEYS[0] || 'product'))
watch(activeTab, (v) => {
  router.replace({ query: { ...route.query, tab: v } })
})

const counts = ref({ product: 0, shopApply: 0, record: 0, review: 0, aftersale: 0 })

onMounted(refreshCounts)

/** 刷新各 Tab 待审核数，并同步左侧菜单角标 */
async function refreshCounts() {
  try {
    const s = await fetchAuditPendingSummary()
    counts.value = {
      product: s.product,
      shopApply: s.shopApply,
      record: s.record,
      review: s.review,
      aftersale: s.afterSale
    }
    // 携带汇总结果通知 AdminLayout 即时更新菜单角标，免去其重复请求
    window.dispatchEvent(new CustomEvent('myshop:audit-changed', { detail: s }))
  } catch { /* 汇总内部已按项兜底，保持原角标 */ }
}
</script>

<style scoped>
.tab-badge {
  display: inline-block;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
  margin-left: 4px;
  border-radius: 8px;
  background: #ff4b2b;
  color: #fff;
  font-size: 11px;
  text-align: center;
}
</style>
