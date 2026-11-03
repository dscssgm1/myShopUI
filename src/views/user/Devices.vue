<template>
  <div class="page-card">
    <div class="head">
      <h3>📱 登录设备</h3>
      <el-button
        type="danger" plain size="small"
        :disabled="!sessions.length" @click="kickAll"
      >全部下线</el-button>
    </div>

    <el-alert
      type="info" :closable="false" style="margin-bottom: 16px"
      title="每次登录都会生成一个会话。下线某台设备后，该设备上的令牌立即失效，需要重新登录；当前设备下线后同样会退出登录。"
    />

    <div v-loading="loading">
      <el-empty v-if="!sessions.length" description="暂无在线设备" :image-size="80" />

      <div v-for="s in sessions" :key="s.sessionId" class="device-row">
        <div class="d-icon">💻</div>
        <div class="d-main">
          <div class="d-name">
            {{ s.deviceName || s.deviceId || '未知设备' }}
            <el-tag v-if="s.current" type="success" size="small" style="margin-left: 6px">当前设备</el-tag>
          </div>
          <div class="d-meta">
            <span>IP {{ s.ip || '—' }}</span>
            <span>登录于 {{ formatTime(s.loginAt) }}</span>
            <span v-if="s.deviceId" class="d-id">设备标识 {{ s.deviceId }}</span>
          </div>
        </div>
        <el-button link type="danger" size="small" @click="kick(s)">下线</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../store/user'
import { fetchLoginSessions, kickAllLoginSessions, kickLoginSession } from '../../api/auth'

const router = useRouter()
const userStore = useUserStore()
const sessions = ref([])
const loading = ref(false)

onMounted(load)

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '—')

async function load() {
  loading.value = true
  try {
    const res = await fetchLoginSessions()
    sessions.value = res.data || []
  } catch {
    sessions.value = []
  } finally {
    loading.value = false
  }
}

async function kick(session) {
  try {
    await ElMessageBox.confirm(
      session.current
        ? '下线当前设备后，本机将退出登录，确定继续？'
        : `下线设备「${session.deviceName || session.deviceId || '未知设备'}」？该设备上的登录状态将立即失效。`,
      '下线设备',
      { confirmButtonText: '下线', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  await kickLoginSession(session.sessionId)
  ElMessage.success('该设备已下线')
  if (session.current) {
    forceLogout()
    return
  }
  load()
}

async function kickAll() {
  try {
    await ElMessageBox.confirm('所有设备（包括当前设备）都将退出登录，确定继续？', '全部下线', {
      confirmButtonText: '全部下线', cancelButtonText: '取消', type: 'warning'
    })
  } catch {
    return
  }
  await kickAllLoginSessions()
  ElMessage.success('所有设备已下线，请重新登录')
  forceLogout()
}

/** 当前会话已被服务端删除，只需清理本地状态 */
function forceLogout() {
  localStorage.removeItem('myshop_token')
  localStorage.removeItem('myshop_user')
  userStore.$reset()
  router.push('/login')
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
  margin-bottom: 16px;
}
h3 {
  margin: 0;
}
.device-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 4px;
  border-bottom: 1px dashed #f0f0f0;
}
.d-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #fff5f2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.d-main {
  flex: 1;
  min-width: 0;
}
.d-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}
.d-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: #999;
}
.d-id {
  color: #bbb;
}
</style>
