<template>
  <div class="msg-page">
    <h3>💬 我的消息</h3>

    <div v-loading="loading">
      <!-- 平台客服（统一） -->
      <div class="cs-card platform" @click="openPlatform">
        <span class="cs-avatar">🛡️</span>
        <div class="cs-info">
          <div class="cs-name">平台客服</div>
          <div class="cs-desc">退款、投诉、平台规则咨询</div>
        </div>
        <span v-if="platformSession?.buyerUnread" class="badge">{{ platformSession.buyerUnread }}</span>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>

      <!-- 店铺客服 -->
      <div class="section-title">店铺客服（{{ shopSessions.length }}）</div>
      <el-empty v-if="!shopSessions.length" description="暂无店铺会话，可在商品页点击「咨询商家客服」" :image-size="60" />
      <div v-for="s in shopSessions" :key="s.id" class="session" @click="openChat(s.id)">
        <span class="cs-avatar">{{ s.shopIcon || '🏪' }}</span>
        <div class="cs-info">
          <div class="cs-name">{{ s.shopName }}客服</div>
          <div class="cs-desc">{{ s.lastContent || '暂无消息' }}</div>
        </div>
        <span class="time">{{ s.lastTime }}</span>
        <span v-if="s.buyerUnread" class="badge">{{ s.buyerUnread }}</span>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>

      <!-- 系统通知 -->
      <div class="section-title">系统通知（{{ notices.length }}）</div>
      <el-empty v-if="!notices.length" description="暂无通知" :image-size="60" />
      <div v-for="n in notices" :key="n.id" class="notice" :class="{ unread: !n.read }" @click="markRead(n)">
        <span class="dot" :class="{ on: !n.read }" />
        <div class="notice-body">
          <div class="notice-title">{{ n.title }}</div>
          <div class="notice-content">{{ n.content }}</div>
        </div>
        <span class="time">{{ formatTime(n.createdAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchNotices, fetchSessions, openPlatformSession, readNotice } from '../api/message'

const router = useRouter()
const sessions = ref([])
const notices = ref([])
const loading = ref(false)
let timer = null

const platformSession = computed(() => sessions.value.find((s) => s.type === 'PLATFORM'))
const shopSessions = computed(() => sessions.value.filter((s) => s.type === 'SHOP'))

onMounted(() => {
  load()
  timer = setInterval(() => load(true), 10000)
})
onBeforeUnmount(() => clearInterval(timer))

// silent=true 为轮询刷新：不转 loading、失败不弹提示
async function load(silent = false) {
  if (!silent) loading.value = true
  const config = silent ? { silent: true } : {}
  try {
    const [sessionsRes, noticesRes] = await Promise.all([fetchSessions(config), fetchNotices(config)])
    sessions.value = sessionsRes.data || []
    notices.value = noticesRes.data || []
  } catch { /* ignore */ } finally {
    if (!silent) loading.value = false
  }
}

async function openPlatform() {
  const res = await openPlatformSession()
  router.push(`/user/messages/${res.data.session.id}`)
}

function openChat(id) {
  router.push(`/user/messages/${id}`)
}

async function markRead(n) {
  if (n.read) return
  await readNotice(n.id)
  n.read = true
  ElMessage.success('已读')
}

function formatTime(t) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : ''
}
</script>

<style scoped>
.msg-page {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 55vh;
}
h3 {
  margin-bottom: 16px;
}
.cs-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 18px;
}
.cs-card.platform {
  background: #e6f4ff;
}
.cs-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.cs-info {
  flex: 1;
  min-width: 0;
}
.cs-name {
  font-weight: 600;
  font-size: 15px;
}
.cs-desc {
  font-size: 13px;
  color: #999;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.section-title {
  font-weight: 600;
  margin: 18px 0 10px;
}
.session {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 4px;
  border-bottom: 1px solid #f2f2f2;
  cursor: pointer;
}
.session:hover {
  background: #fff8f6;
}
.session .cs-avatar {
  background: #f5f5f5;
}
.time {
  font-size: 12px;
  color: #bbb;
}
.badge {
  background: #ff4b2b;
  color: #fff;
  font-size: 12px;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  border-radius: 9px;
  padding: 0 5px;
}
.arrow {
  color: #ccc;
}
.notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 4px;
  border-bottom: 1px dashed #f2f2f2;
  cursor: pointer;
}
.notice.unread .notice-title {
  color: #ff4b2b;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ddd;
  margin-top: 6px;
  flex-shrink: 0;
}
.dot.on {
  background: #ff4b2b;
}
.notice-body {
  flex: 1;
}
.notice-title {
  font-size: 14px;
  font-weight: 600;
}
.notice-content {
  font-size: 13px;
  color: #999;
  margin-top: 3px;
}
</style>
