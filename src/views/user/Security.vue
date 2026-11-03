<template>
  <div class="page-card">
    <div class="head"><h3>🔒 账号安全</h3></div>

    <div v-loading="loading">
      <!-- 保护状态 -->
      <div class="sec-grid">
        <div class="sec-item">
          <div class="s-label">登录邮箱</div>
          <div class="s-value">{{ overview.maskedEmail || '—' }}</div>
          <el-button link type="primary" @click="goChangeEmail">修改邮箱 →</el-button>
        </div>
        <div class="sec-item">
          <div class="s-label">修改密码</div>
          <div class="s-value muted">
            {{ overview.currentDeviceTrusted ? '本机已信任，可直接修改' : '本机未信任，需先完成邮箱验证' }}
          </div>
          <el-button link type="primary" @click="goChangePassword">修改密码 →</el-button>
        </div>
        <div class="sec-item">
          <div class="s-label">当前设备</div>
          <div class="s-value">
            {{ overview.currentDeviceName || overview.currentDeviceId || '—' }}
            <el-tag
              :type="overview.currentDeviceTrusted ? 'success' : 'warning'" size="small"
              style="margin-left: 6px"
            >{{ overview.currentDeviceTrusted ? '已信任' : '未信任' }}</el-tag>
          </div>
        </div>
      </div>

      <el-alert
        type="info" :closable="false" style="margin: 4px 0 16px"
        title="信任设备修改密码/邮箱免邮箱身份验证；未信任设备需先向当前邮箱验证身份。信任标记只能通过邮箱验证码验证获得。"
      />

      <!-- 登录记录 -->
      <!-- 在线设备入口 -->
      <div class="block-title" style="margin-top: 4px">在线登录设备</div>
      <div class="devices-entry">
        <span class="muted-text">查看该账号当前登录的所有设备，可单独下线某台设备使其立即失效。</span>
        <el-button link type="primary" @click="router.push('/user/security/devices')">管理登录设备 →</el-button>
      </div>

      <!-- 登录记录 -->
      <div class="block-title" style="margin-top: 20px">最近登录记录</div>
      <el-empty v-if="!overview.recentLogins?.length" description="暂无登录记录" :image-size="60" />
      <div v-for="r in overview.recentLogins" :key="r.id" class="login-row">
        <span class="l-device">{{ r.deviceName || '未知设备' }}</span>
        <span class="l-ip">IP {{ r.ip || '—' }}</span>
        <span class="l-time">{{ formatTime(r.loginAt) }}</span>
      </div>

      <!-- 信任设备 -->
      <div class="block-title" style="margin-top: 20px">信任设备</div>
      <el-empty v-if="!overview.trustedDevices?.length" description="暂无信任设备，完成邮箱验证后可将当前设备标记为信任" :image-size="60" />
      <div v-for="d in overview.trustedDevices" :key="d.id" class="login-row">
        <span class="l-device">{{ d.deviceName }}</span>
        <el-tag v-if="d.current" type="success" size="small">当前设备</el-tag>
        <span class="l-time">信任于 {{ formatTime(d.trustedAt) }}</span>
        <el-button link type="danger" size="small" @click="removeTrust(d)">移除信任</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { fetchSecurityOverview, removeTrustedDevice } from '../../api/user'

const router = useRouter()
const overview = ref({})
const loading = ref(false)

onMounted(load)

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function load() {
  loading.value = true
  try {
    const res = await fetchSecurityOverview()
    overview.value = res.data || {}
  } catch {
    overview.value = {}
  } finally {
    loading.value = false
  }
}

/** 未信任设备先进入身份验证页，已信任直接进入修改页 */
function goChangePassword() {
  router.push(overview.value.currentDeviceTrusted
    ? '/user/security/password'
    : '/user/security/verify?redirect=password')
}

function goChangeEmail() {
  router.push(overview.value.currentDeviceTrusted
    ? '/user/security/email'
    : '/user/security/verify?redirect=email')
}

async function removeTrust(device) {
  try {
    await ElMessageBox.confirm(
      `移除后，该设备（${device.deviceName}）修改密码/邮箱需重新验证身份。`,
      '移除信任设备',
      { confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await removeTrustedDevice(device.id)
    ElMessage.success('已移除')
    load()
  } catch { /* 后端已提示 */ }
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
  margin-bottom: 16px;
}
h3 {
  margin: 0;
}
.sec-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.sec-item {
  background: #fafafa;
  border-radius: 10px;
  padding: 16px;
}
.s-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}
.s-value {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  word-break: break-all;
}
.s-value.muted {
  font-weight: 400;
  color: #888;
  font-size: 13px;
}
.block-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}
.devices-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fafafa;
  border-radius: 10px;
  padding: 12px 16px;
}
.muted-text {
  font-size: 13px;
  color: #888;
}
.login-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 4px;
  border-bottom: 1px dashed #f0f0f0;
  font-size: 13px;
}
.l-device {
  font-weight: 600;
  min-width: 140px;
}
.l-ip {
  color: #999;
}
.l-time {
  color: #bbb;
  margin-left: auto;
}
</style>
