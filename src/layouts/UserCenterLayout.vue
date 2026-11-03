<template>
  <div class="uc-page">
    <!-- 左侧菜单 -->
    <aside class="uc-aside">
      <div class="uc-user">
        <div class="uc-avatar">{{ avatar }}</div>
        <div class="uc-name">{{ userStore.user?.nickname || userStore.user?.username }}</div>
        <div class="uc-level">{{ level }}</div>
      </div>
      <el-menu :default-active="activeMenu" router class="uc-menu">
        <el-menu-item index="/user/orders">
          <el-icon><Tickets /></el-icon>我的订单
        </el-menu-item>
        <el-menu-item index="/user/after-sales">
          <el-icon><RefreshLeft /></el-icon>我的售后
        </el-menu-item>
        <el-menu-item index="/user/messages">
          <el-icon><ChatDotSquare /></el-icon>我的消息
          <span v-if="totalUnread" class="menu-badge">{{ totalUnread }}</span>
        </el-menu-item>
        <el-menu-item index="/user/coupons">
          <el-icon><Postcard /></el-icon>我的优惠券
        </el-menu-item>
        <el-menu-item index="/user/favorites">
          <el-icon><Star /></el-icon>我的收藏
        </el-menu-item>
        <el-menu-item index="/user/footprint">
          <el-icon><Clock /></el-icon>浏览足迹
        </el-menu-item>
        <el-menu-item index="/user/reviews">
          <el-icon><ChatDotRound /></el-icon>我的评价
        </el-menu-item>
        <el-menu-item index="/user/address">
          <el-icon><Location /></el-icon>收货地址
        </el-menu-item>
        <el-menu-item index="/user/profile">
          <el-icon><User /></el-icon>个人信息
        </el-menu-item>
        <el-menu-item index="/user/security">
          <el-icon><Lock /></el-icon>账号安全
        </el-menu-item>
        <el-menu-item index="/user/bankcards">
          <el-icon><CreditCard /></el-icon>银行卡管理
        </el-menu-item>
        <el-menu-item index="/user/logistics-apply">
          <el-icon><Van /></el-icon>物流入驻
        </el-menu-item>
        <el-menu-item index="/user/merchant-apply">
          <el-icon><Shop /></el-icon>商家入驻
        </el-menu-item>
        <el-menu-item index="/user/more">
          <el-icon><MenuIcon /></el-icon>更多功能
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧内容 -->
    <div class="uc-main">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChatDotRound, ChatDotSquare, Clock, CreditCard, Location, Lock,
  Menu as MenuIcon, Postcard, RefreshLeft, Shop, Star, Tickets, User, Van
} from '@element-plus/icons-vue'
import { useUserStore } from '../store/user'
import { fetchMemberProfile } from '../api/user'
import { fetchNotices, fetchSessions } from '../api/message'

const route = useRoute()
const userStore = useUserStore()

const level = ref('普通会员')
const totalUnread = ref(0)

// 子页面高亮对应菜单：聊天页→我的消息，订单详情→我的订单
const activeMenu = computed(() => {
  if (route.path.startsWith('/user/messages')) return '/user/messages'
  if (route.path.startsWith('/user/orders')) return '/user/orders'
  if (route.path.startsWith('/user/after-sales')) return '/user/after-sales'
  if (route.path.startsWith('/user/security')) return '/user/security'
  return route.path
})

const avatar = computed(() => userStore.user?.nickname?.slice(0, 1) || '👤')

let unreadTimer = null

onMounted(() => {
  refreshSide()
  unreadTimer = setInterval(refreshUnread, 10000)
})
onBeforeUnmount(() => clearInterval(unreadTimer))
watch(() => route.fullPath, refreshSide)

function refreshSide() {
  if (!userStore.isLogin) return
  // 侧栏等级与未读角标属于辅助信息，失败时静默降级
  fetchMemberProfile({ silent: true }).then((res) => (level.value = res.data?.levelName || '普通会员')).catch(() => {})
  refreshUnread()
}

function refreshUnread() {
  if (!userStore.isLogin) return
  Promise.all([fetchSessions({ silent: true }), fetchNotices({ silent: true })])
    .then(([sessionsRes, noticesRes]) => {
      const unreadSessions = (sessionsRes.data || []).reduce((sum, s) => sum + (s.buyerUnread || 0), 0)
      const unreadNotices = (noticesRes.data || []).filter((n) => !n.read).length
      totalUnread.value = unreadSessions + unreadNotices
    })
    .catch(() => {})
}
</script>

<style scoped>
.uc-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.uc-aside {
  width: 210px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 10px;
  /* 侧栏与内容滚动分离：吸顶后不再随页面滚走，菜单超长时自身出滚动条 */
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-x: hidden;
  overflow-y: auto;
}
.uc-user {
  text-align: center;
  padding: 24px 0 16px;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  color: #fff;
}
.uc-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}
.uc-name {
  font-weight: 600;
}
.uc-level {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 2px;
}
.uc-menu {
  border-right: none;
  width: 100%;
}
.menu-badge {
  background: #ff4b2b;
  color: #fff;
  font-size: 11px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  border-radius: 8px;
  padding: 0 4px;
  margin-left: 6px;
  display: inline-block;
}
.uc-main {
  flex: 1;
  min-width: 0;
}
</style>
