<template>
  <div>
    <!-- 顶部工具栏 -->
    <div class="topbar">
      <div class="wrap">
        <div class="left">
          <template v-if="userStore.isLogin">
            <span class="hi">你好，{{ userStore.user.nickname || userStore.user.username }}</span>
            <a @click="logout">退出登录</a>
          </template>
          <template v-else>
            <router-link to="/login">请登录</router-link>
            <router-link to="/register" class="reg">免费注册</router-link>
          </template>
        </div>
        <div class="right">
          <span class="role">{{ roleLabel }}</span>
          <router-link to="/">首页</router-link>
          <template v-if="userStore.isLogin">
            <router-link to="/user/messages">消息</router-link>
            <router-link to="/user/orders">我的订单</router-link>
            <!-- 「我的」下拉：样式与原型一致 -->
            <div class="mine-entry">
              <span class="mine-link">我的 <el-icon><ArrowDown /></el-icon></span>
              <div class="mine-pop">
                <router-link to="/user/profile">👤 个人信息</router-link>
                <router-link to="/user/orders">📦 我的订单</router-link>
                <router-link to="/user/coupons">🎟️ 我的优惠券</router-link>
                <router-link to="/user/reviews">⭐ 我的评价</router-link>
                <router-link to="/user/favorites">❤️ 我的收藏</router-link>
                <router-link to="/user/footprint">🕐 浏览足迹</router-link>
                <router-link to="/user/address">📍 收货地址</router-link>
                <router-link to="/points-mall">🎁 积分商城</router-link>
                <router-link to="/user/more" class="mine-more">🧩 更多功能 ›</router-link>
                <template v-if="userStore.user?.groupCode === 'LOGISTICS'">
                  <div class="mine-split" />
                  <router-link to="/logistics">🚚 物流中心</router-link>
                </template>
              </div>
            </div>
            <!-- 商家 / 平台管理入口外置，直接展示在「我的」右侧 -->
            <router-link v-if="userStore.user?.groupCode === 'MERCHANT'" to="/merchant">🏪 商家中心</router-link>
            <router-link v-if="userStore.user?.groupCode === 'PLATFORM'" to="/admin">🛠️ 平台后台</router-link>
          </template>
        </div>
      </div>
    </div>

    <!-- 搜索头部吸顶：随页面滚动始终可见 -->
    <div class="sticky-head">
      <div class="header">
        <div class="wrap">
          <router-link to="/" class="logo">🛒 myShop</router-link>
          <div class="search">
            <el-input
              v-model="keyword"
              size="large"
              placeholder="搜索商品，如：手机 / 苹果 / 耳机"
              @keyup.enter="goSearch"
            >
              <template #append>
                <el-button type="primary" @click="goSearch">搜索</el-button>
              </template>
            </el-input>
          </div>
        </div>
      </div>
    </div>

    <!-- 页面内容 -->
    <main class="main wrap">
      <router-view />
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="wrap">
        <p>{{ platformName }}</p>
        <p>客服电话 {{ servicePhone }} · 用户端 / 商家端 / 物流端 / 管理端 一站式体验</p>
      </div>
    </footer>

    <!-- 右侧悬浮工具条：消息 / 购物车 / 客服 / 反馈 / 回到顶部 -->
    <SideToolbar :cart-count="cartCount" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '../store/user'
import SideToolbar from '../components/SideToolbar.vue'
import { fetchCart } from '../api/trade'
import { fetchPublicConfigMap } from '../api/config'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const keyword = ref('')
const platformName = ref('myShop 电商购物平台')
const servicePhone = ref('400-888-8888')

const roleLabel = computed(() => {
  const role = userStore.user?.roleCode
  return {
    user: '买家', merchant: '商家', 'merchant-sales': '商家业务员', 'merchant-cs': '商家客服',
    logistics: '物流', 'logistics-ops': '物流调度', 'logistics-courier': '快递员',
    admin: '平台管理员', 'admin-sales': '平台业务员', 'admin-cs': '平台客服', 'admin-ops': '平台运维'
  }[role] || ''
})

onMounted(() => {
  loadSiteConfig()
})

async function loadSiteConfig() {
  try {
    const map = await fetchPublicConfigMap('system', { silent: true })
    if (map.platformName) platformName.value = map.platformName
    if (map.servicePhone) servicePhone.value = map.servicePhone
  } catch { /* 使用默认平台信息 */ }
}

function goSearch() {
  router.push({ path: '/products', query: keyword.value ? { keyword: keyword.value } : {} })
}

async function logout() {
  await userStore.logout()
  cartCount.value = 0
  router.push('/login')
}

const cartCount = ref(0)

async function loadCartCount() {
  if (!userStore.isLogin) {
    cartCount.value = 0
    return
  }
  try {
    // 购物车角标是后台刷新，订单服务不可用时静默降级，避免每个页面都弹错误
    const res = await fetchCart({ silent: true })
    cartCount.value = res.data?.totalQuantity || 0
  } catch { cartCount.value = 0 }
}

onMounted(loadCartCount)
watch(() => route.fullPath, loadCartCount)
</script>

<style scoped>
.wrap {
  max-width: 1520px;
  margin: 0 auto;
  padding: 0 12px;
}
.topbar {
  background: #f0f2f5;
  font-size: 13px;
  color: #666;
  position: sticky;
  top: 0;
  z-index: 101;
}
.topbar .wrap {
  display: flex;
  justify-content: space-between;
  height: 36px;
  align-items: center;
}
.topbar a {
  margin-left: 16px;
  cursor: pointer;
}
.topbar a:hover {
  color: #ff4b2b;
}
.topbar .hi {
  color: #ff4b2b;
}
.topbar .reg {
  color: #ff4b2b;
}
.topbar .role {
  color: #396afc;
}
/* 顶部两段（工具栏/搜索栏）吸顶，浏览内容时始终可见 */
.sticky-head {
  position: sticky;
  top: 36px;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}
/* 「我的」下拉（样式与原型一致） */
.mine-entry {
  position: relative;
  display: inline-block;
}
.mine-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 16px;
  cursor: pointer;
}
.mine-link:hover {
  color: #ff4b2b;
}
.mine-pop {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  width: 180px;
  margin-top: 0;
  border-top: 6px solid transparent;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  z-index: 999;
  overflow: hidden;
  padding: 6px 0;
}
.mine-pop a {
  display: block;
  margin-left: 0;
  padding: 10px 18px;
  font-size: 13px;
  color: #333;
  transition: background 0.15s;
}
.mine-pop a:hover {
  background: #fff8f6;
  color: #ff4b2b;
}
.mine-pop .mine-more {
  border-top: 1px solid #f0f0f0;
  color: #ff4b2b;
  font-weight: 600;
}
.mine-pop .mine-split {
  border-top: 1px solid #f0f0f0;
}
.mine-entry:hover .mine-pop {
  display: block;
}
.header {
  background: #fff;
  padding: 18px 0;
}
.header .wrap {
  display: flex;
  align-items: center;
  gap: 40px;
}
.logo {
  font-size: 28px;
  font-weight: 700;
  color: #ff4b2b;
  white-space: nowrap;
}
.search {
  flex: 1;
}
.main {
  min-height: 60vh;
  padding-top: 16px;
  padding-bottom: 32px;
}
/* 屏幕不够宽时给右侧悬浮工具条留出位置，避免压住最右一列商品 */
@media (max-width: 1700px) {
  .main {
    padding-right: 92px;
  }
}
.footer {
  background: #2b2f36;
  color: #aaa;
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  line-height: 2;
}
</style>
