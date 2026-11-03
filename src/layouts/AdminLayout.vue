<template>
  <el-container class="shell">
    <el-aside width="220px" class="aside">
      <div class="brand">
        <div class="brand-name">{{ groupTitle }}</div>
        <div class="brand-role">{{ roleName }}</div>
      </div>
      <el-menu :default-active="route.path" router class="aside-menu" background-color="#001529" text-color="#a6adb4" active-text-color="#fff">
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <span class="mi">{{ m.icon }}</span>{{ m.title }}
          <span v-if="m.badge && badges[m.path]" class="menu-badge">{{ badges[m.path] }}</span>
        </el-menu-item>
        <el-menu-item index="/"><span class="mi">🏠</span>返回商城</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <span class="title">{{ pageTitle }}</span>
        <el-dropdown @command="onCommand">
          <span class="user">{{ userStore.user?.nickname }} <el-icon><ArrowDown /></el-icon></span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="main"><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { fetchAuditPendingSummary } from '../api/admin'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 菜单角标数（key 为菜单 path），有「审核中心」菜单的角色刷新
const badges = ref({})
let badgeTimer = null

const MENUS = {
  admin: [
    { path: '/admin', title: '数据看板', icon: '📊' },
    { path: '/admin/orders', title: '订单管理', icon: '📦' },
    { path: '/admin/products', title: '商品管理', icon: '🛍️' },
    { path: '/admin/categories', title: '分类管理', icon: '🗂️' },
    { path: '/admin/brands', title: '品牌管理', icon: '🏷️' },
    { path: '/admin/users', title: '用户管理', icon: '👥' },
    { path: '/admin/shops', title: '商家管理', icon: '🏪' },
    { path: '/admin/promotions', title: '促销管理', icon: '🎉' },
    { path: '/admin/coupons', title: '优惠券', icon: '🎫' },
    { path: '/admin/companies', title: '物流公司', icon: '🚚' },
    { path: '/admin/audit', title: '审核中心', icon: '✅', badge: true },
    { path: '/admin/config', title: '运营配置', icon: '⚙️' },
    { path: '/admin/points-goods', title: '积分商城', icon: '🎁' },
    { path: '/admin/dividend', title: '分红结算', icon: '💰' },
    { path: '/admin/commission', title: '商品佣金', icon: '🧾' },
    { path: '/admin/logs', title: '系统日志', icon: '📜' },
    { path: '/admin/cs', title: '客服工作台', icon: '🛡️' }
  ],
  'admin-sales': [
    { path: '/admin/shops', title: '商家管理', icon: '🏪' },
    { path: '/admin/audit', title: '审核中心', icon: '✅', badge: true },
    { path: '/admin/categories', title: '分类管理', icon: '🗂️' },
    { path: '/admin/config', title: '运营配置', icon: '⚙️' }
  ],
  'admin-cs': [{ path: '/admin/cs', title: '客服工作台', icon: '🛡️' }],
  'admin-ops': [{ path: '/admin/logs', title: '系统日志', icon: '📜' }],
  merchant: [
    { path: '/merchant/shop', title: '店铺信息', icon: '🏪' },
    { path: '/merchant/products', title: '商品管理', icon: '🛍️' },
    { path: '/merchant/specs', title: '我的规格', icon: '🏷️' },
    { path: '/merchant/orders', title: '订单管理', icon: '📦' },
    { path: '/merchant/marketing', title: '店铺营销', icon: '🎪' },
    { path: '/merchant/enrollment', title: '活动报名', icon: '📝' },
    { path: '/merchant/bill', title: '佣金账单', icon: '🧾' },
    { path: '/merchant/after-sales', title: '售后管理', icon: '🔄' },
    { path: '/merchant/reviews', title: '评价管理', icon: '⭐' },
    { path: '/merchant/cs', title: '客服工作台', icon: '🎧' }
  ],
  'merchant-sales': [
    { path: '/merchant/products', title: '商品管理', icon: '🛍️' },
    { path: '/merchant/orders', title: '订单管理', icon: '📦' },
    { path: '/merchant/marketing', title: '店铺营销', icon: '🎪' },
    { path: '/merchant/enrollment', title: '活动报名', icon: '📝' },
    { path: '/merchant/bill', title: '佣金账单', icon: '🧾' },
    { path: '/merchant/after-sales', title: '售后管理', icon: '🔄' },
    { path: '/merchant/reviews', title: '评价管理', icon: '⭐' }
  ],
  'merchant-cs': [{ path: '/merchant/cs', title: '客服工作台', icon: '🎧' }],
  logistics: [
    { path: '/logistics/shipments', title: '运单管理', icon: '🚚' },
    { path: '/logistics/couriers', title: '快递员管理', icon: '👷' },
    { path: '/logistics/dividend', title: '分红账户', icon: '💰' }
  ],
  'logistics-ops': [{ path: '/logistics/shipments', title: '运单管理', icon: '🚚' }],
  'logistics-courier': [{ path: '/logistics/tasks', title: '我的任务', icon: '🛵' }]
}

const MENU_TITLES = {
  '/admin': '数据看板', '/admin/orders': '订单管理',
  '/admin/products': '商品管理',
  '/admin/categories': '分类管理',
  '/admin/brands': '品牌管理',
  '/admin/users': '用户管理', '/admin/shops': '商家管理', '/admin/promotions': '促销管理',
  '/admin/coupons': '优惠券',
  '/admin/companies': '物流公司', '/admin/audit': '审核中心',
  '/admin/config': '运营配置', '/admin/points-goods': '积分商城', '/admin/logs': '系统日志', '/admin/cs': '平台客服工作台',
  '/admin/dividend': '分红结算',
  '/admin/commission': '商品佣金',
  '/logistics/dividend': '分红账户',
  '/merchant/shop': '店铺信息',
  '/merchant/products': '商品管理',
  '/merchant/marketing': '店铺营销',
  '/merchant/enrollment': '活动报名',
  '/merchant/orders': '订单管理', '/merchant/bill': '佣金账单', '/merchant/after-sales': '售后管理',
  '/merchant/reviews': '评价管理', '/merchant/cs': '商家客服工作台',
  '/logistics/shipments': '运单管理', '/logistics/couriers': '快递员管理', '/logistics/tasks': '我的任务'
}

const role = computed(() => userStore.user?.roleCode)
const menus = computed(() => MENUS[role.value] || [])
const pageTitle = computed(() => MENU_TITLES[route.path] || '')

// 角标 = 审核中心各 Tab 待审核总数，在挂载、切页、每 30 秒轮询与页内审核动作后刷新
function refreshBadges(e) {
  if (!['admin', 'admin-sales'].includes(role.value)) return
  const summary = e?.detail
  if (summary) {
    // 审核中心页动作后派发的事件直接携带汇总，免去重复请求
    applyBadge(summary)
    return
  }
  fetchAuditPendingSummary().then(applyBadge).catch(() => {})
}

function applyBadge(s) {
  badges.value['/admin/audit'] = s.product + s.shopApply + s.record + s.review + s.afterSale
}

onMounted(() => {
  refreshBadges()
  badgeTimer = setInterval(refreshBadges, 30000)
  window.addEventListener('myshop:audit-changed', refreshBadges)
})
onBeforeUnmount(() => {
  clearInterval(badgeTimer)
  window.removeEventListener('myshop:audit-changed', refreshBadges)
})
watch(() => route.path, refreshBadges)

const groupTitle = computed(() => {
  if (route.path.startsWith('/merchant')) return '🏪 商家中心'
  if (route.path.startsWith('/logistics')) return '🚚 物流中心'
  return '🛠️ 平台管理后台'
})
const roleName = computed(() => ({
  admin: '平台管理员', 'admin-sales': '平台业务员', 'admin-cs': '平台客服', 'admin-ops': '平台运维',
  merchant: '店长', 'merchant-sales': '商家业务员', 'merchant-cs': '商家客服',
  logistics: '物流管理员', 'logistics-ops': '调度员', 'logistics-courier': '快递员'
}[role.value] || ''))

async function onCommand(cmd) {
  if (cmd === 'logout') {
    await userStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.shell {
  height: 100vh;
}
.aside {
  background: #001529;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
/* 侧栏内菜单独立滚动：品牌区固定，菜单超长时自身出滚动条 */
.aside-menu {
  flex: 1;
  overflow-y: auto;
}
.brand {
  color: #fff;
  height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.brand-name {
  font-size: 16px;
  font-weight: 600;
}
.brand-role {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 2px;
}
.el-menu {
  border-right: none;
}
.mi {
  margin-right: 8px;
}
.menu-badge {
  margin-left: auto;
  margin-right: 8px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ff4b2b;
  color: #fff;
  font-size: 11px;
  text-align: center;
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  flex-shrink: 0;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.user {
  cursor: pointer;
}
.main {
  background: #f0f2f5;
  padding: 20px;
}
</style>
