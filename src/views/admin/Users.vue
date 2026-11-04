<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>用户管理</b>
        <div class="filters">
          <el-input v-model="keyword" placeholder="用户名 / 昵称 / 邮箱" size="small" clearable style="width: 220px" @keyup.enter="search" @clear="search" />
          <el-select v-model="roleCode" size="small" style="width: 150px" clearable placeholder="全部角色" @change="search">
            <el-option v-for="r in roles" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
          <el-select v-model="status" size="small" style="width: 120px" @change="search">
            <el-option label="全部状态" :value="null" />
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
          <el-button type="primary" size="small" @click="search">查询</el-button>
        </div>
      </div>
    </template>

    <el-table :data="rows" size="small" v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="nickname" label="昵称" width="130" />
      <el-table-column prop="email" label="邮箱" min-width="190" show-overflow-tooltip />
      <el-table-column label="角色" width="150">
        <template #default="{ row }">
          <el-tag size="small" :type="groupTagType(row.groupCode)">{{ row.roleName || row.roleCode }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="所属端" width="90">
        <template #default="{ row }">{{ groupText(row.groupCode) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'danger'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近登录" width="150">
        <template #default="{ row }">{{ formatTime(row.lastLoginAt) }}</template>
      </el-table-column>
      <el-table-column label="注册时间" width="150">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-perm="'admin:users:role'" link type="primary" size="small" @click="openRole(row)">调整角色</el-button>
          <el-button v-perm="'admin:users:session'" link type="primary" size="small" @click="openDevices(row)">登录设备</el-button>
          <el-button v-if="row.id !== userStore.user?.id" v-perm="'admin:users:status'" link :type="row.status === 1 ? 'danger' : 'success'" size="small" @click="toggle(row)">
            {{ row.status === 1 ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > size" v-model:current-page="page" :page-size="size" :total="total"
      layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
      @current-change="load"
    />

    <el-dialog v-model="roleDialog" title="调整角色" width="420px">
      <p class="role-user">用户：<b>{{ editing?.username }}</b>（{{ editing?.nickname }}）</p>
      <el-select v-model="newRole" style="width: 100%" placeholder="选择新角色">
        <el-option v-for="r in roles" :key="r.code" :label="`${r.name}（${groupText(r.groupCode)}）`" :value="r.code" />
      </el-select>
      <template #footer>
        <el-button @click="roleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>

    <!-- 登录设备：查看并单点下线 -->
    <el-dialog v-model="deviceDialog" title="登录设备" width="560px">
      <p class="role-user">用户：<b>{{ deviceUser?.username }}</b>（{{ deviceUser?.nickname }}）</p>
      <div v-loading="deviceLoading">
        <el-empty v-if="!deviceRows.length" description="暂无在线设备" :image-size="60" />
        <div v-for="s in deviceRows" :key="s.sessionId" class="device-row">
          <div class="d-main">
            <div class="d-name">
              {{ s.deviceName || s.deviceId || '未知设备' }}
              <el-tag v-if="s.current" type="success" size="small" style="margin-left: 6px">当前设备</el-tag>
            </div>
            <div class="d-meta">IP {{ s.ip || '—' }} · 登录于 {{ formatTime(s.loginAt) }}</div>
          </div>
          <el-button
            v-perm="'admin:users:session'"
            link type="danger" size="small"
            :disabled="s.current" @click="kickDevice(s)"
          >下线</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="deviceDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../store/user'
import {
  fetchAdminUsers, fetchRoles, fetchUserSessions, kickUserSession, updateUserRole, updateUserStatus
} from '../../api/admin'

const userStore = useUserStore()
const rows = ref([])
const roles = ref([])
const total = ref(0)
const page = ref(1)
const size = 10
const keyword = ref('')
const roleCode = ref('')
const status = ref(null)
const loading = ref(false)

const roleDialog = ref(false)
const editing = ref(null)
const newRole = ref('')

const deviceDialog = ref(false)
const deviceUser = ref(null)
const deviceRows = ref([])
const deviceLoading = ref(false)

onMounted(() => {
  load()
  fetchRoles().then((res) => (roles.value = (res.data || []).filter((r) => r.status === 1))).catch(() => {})
})

const groupText = (g) => ({ USER: '买家', MERCHANT: '商家', PLATFORM: '平台', LOGISTICS: '物流' }[g] || g || '-')
const groupTagType = (g) => ({ USER: 'info', MERCHANT: 'warning', PLATFORM: 'danger', LOGISTICS: 'primary' }[g] || 'info')
const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '-')

function search() {
  page.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const res = await fetchAdminUsers({
      keyword: keyword.value || undefined,
      roleCode: roleCode.value || undefined,
      status: status.value === null ? undefined : status.value,
      page: page.value,
      size
    })
    rows.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { rows.value = [] } finally { loading.value = false }
}

function toggle(row) {
  const target = row.status === 1 ? 0 : 1
  const action = target === 1 ? '启用' : '禁用'
  ElMessageBox.confirm(`确认${action}用户「${row.username}」？`, '提示', { type: 'warning' }).then(async () => {
    await updateUserStatus(row.id, target)
    ElMessage.success(`已${action}`)
    load()
  }).catch(() => {})
}

function openRole(row) {
  editing.value = row
  newRole.value = row.roleCode
  roleDialog.value = true
}

async function openDevices(row) {
  deviceUser.value = row
  deviceRows.value = []
  deviceDialog.value = true
  await loadDevices()
}

async function loadDevices() {
  deviceLoading.value = true
  try {
    const res = await fetchUserSessions(deviceUser.value.id)
    deviceRows.value = res.data || []
  } catch {
    deviceRows.value = []
  } finally {
    deviceLoading.value = false
  }
}

function kickDevice(session) {
  ElMessageBox.confirm(
    `下线用户「${deviceUser.value.username}」的设备「${session.deviceName || session.deviceId || '未知设备'}」？该设备将立即被强制退出。`,
    '下线设备',
    { confirmButtonText: '下线', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    await kickUserSession(deviceUser.value.id, session.sessionId)
    ElMessage.success('该设备已下线')
    loadDevices()
  }).catch(() => {})
}

async function saveRole() {
  if (!newRole.value || newRole.value === editing.value.roleCode) {
    roleDialog.value = false
    return
  }
  await updateUserRole(editing.value.id, newRole.value)
  ElMessage.success('角色已更新')
  roleDialog.value = false
  load()
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
}
.role-user {
  margin-bottom: 12px;
  color: #666;
}
.device-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px dashed #f0f0f0;
}
.d-main {
  flex: 1;
  min-width: 0;
}
.d-name {
  font-weight: 600;
  font-size: 13px;
}
.d-meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
</style>
