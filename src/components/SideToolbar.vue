<template>
  <!-- 右侧悬浮工具条：品牌入口 / 消息 / 购物车 / 官方客服 / 反馈，样式对齐参考稿 -->
  <div class="side-toolbar">
    <div class="tool-item brand" @click="go('/')">
      <span class="brand-icon">🛒</span>
      <span class="tool-label">myShop</span>
    </div>
    <div class="tool-item" @click="go('/user/messages')">
      <el-badge :value="unreadCount" :hidden="!unreadCount" :max="99">
        <el-icon :size="20"><ChatDotRound /></el-icon>
      </el-badge>
      <span class="tool-label">消息</span>
    </div>
    <div class="tool-item" @click="go('/cart')">
      <el-badge :value="cartCount" :hidden="!cartCount" :max="99">
        <el-icon :size="20"><ShoppingCart /></el-icon>
      </el-badge>
      <span class="tool-label">购物车</span>
    </div>
    <div class="tool-item" @click="goService">
      <el-icon :size="20"><Service /></el-icon>
      <span class="tool-label">官方客服</span>
    </div>
    <div class="tool-item" @click="onFeedback">
      <el-icon :size="20"><EditPen /></el-icon>
      <span class="tool-label">反馈</span>
    </div>
  </div>
  <!-- 回到顶部：滚动超过一屏后出现，长商品流页面尤其有用 -->
  <div v-show="showTop" class="back-top" @click="toTop">
    <el-icon :size="16"><Top /></el-icon>
    <span class="tool-label">回到顶部</span>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, EditPen, Service, ShoppingCart, Top } from '@element-plus/icons-vue'
import { useUserStore } from '../store/user'
import { fetchNotices, fetchSessions, openPlatformSession, sendMessage } from '../api/message'

defineProps({ cartCount: { type: Number, default: 0 } })

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const unreadCount = ref(0)
const showTop = ref(false)
let timer = null

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  loadUnread()
  timer = setInterval(loadUnread, 15000)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  clearInterval(timer)
})

// 会话已读状态随页面切换变化，切页后立即刷新角标
watch(() => route.fullPath, loadUnread)

function onScroll() {
  showTop.value = window.scrollY > 300
}

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 消息角标：客服会话未读 + 系统通知未读，后台静默刷新，失败不打扰用户 */
async function loadUnread() {
  if (!userStore.isLogin) {
    unreadCount.value = 0
    return
  }
  try {
    const [sessionsRes, noticesRes] = await Promise.all([
      fetchSessions({ silent: true }),
      fetchNotices({ silent: true })
    ])
    const sessionUnread = (sessionsRes.data || []).reduce((sum, s) => sum + (s.buyerUnread || 0), 0)
    const noticeUnread = (noticesRes.data || []).filter((n) => !n.read).length
    unreadCount.value = sessionUnread + noticeUnread
  } catch { /* 保持上一次的角标值 */ }
}

/** 未登录统一先去登录，登录后回到目标页 */
function go(path) {
  if (!userStore.isLogin) {
    router.push({ path: '/login', query: { redirect: path } })
    return
  }
  router.push(path)
}

async function goService() {
  if (!userStore.isLogin) {
    router.push({ path: '/login', query: { redirect: '/user/messages' } })
    return
  }
  try {
    const res = await openPlatformSession()
    router.push(`/user/messages/${res.data.session.id}`)
  } catch { /* 失败提示由统一拦截器处理 */ }
}

/** 反馈：直达平台客服会话，作为一条消息送达 */
async function onFeedback() {
  if (!userStore.isLogin) {
    router.push({ path: '/login', query: { redirect: '/' } })
    return
  }
  try {
    const { value } = await ElMessageBox.prompt('反馈与建议将直接送达平台客服', '意见反馈', {
      confirmButtonText: '提交',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请描述您遇到的问题或建议…',
      inputPattern: /\S/,
      inputErrorMessage: '反馈内容不能为空'
    })
    const res = await openPlatformSession()
    await sendMessage(res.data.session.id, `【意见反馈】${value.trim()}`)
    ElMessage.success('感谢您的反馈，我们会尽快处理')
  } catch { /* 用户取消或发送失败（失败已由拦截器提示） */ }
}
</script>

<style scoped>
.side-toolbar {
  position: fixed;
  right: 12px;
  top: 240px;
  z-index: 98;
  width: 66px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 6px 0;
  display: flex;
  flex-direction: column;
}
.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 0;
  cursor: pointer;
  color: #444;
  transition: color 0.15s;
}
.tool-item:hover {
  color: #ff4b2b;
}
.tool-label {
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}
.brand {
  padding-top: 12px;
}
.brand-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  font-size: 18px;
}
.back-top {
  position: fixed;
  right: 12px;
  bottom: 90px;
  z-index: 98;
  width: 66px;
  background: #fff;
  border-radius: 33px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #444;
  transition: color 0.15s;
}
.back-top:hover {
  color: #ff4b2b;
}
</style>
