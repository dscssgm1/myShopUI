<template>
  <div class="page">
    <div class="page-head">
      <h3>🧑‍💼 员工管理 <span class="sub">{{ scopeHint }}</span></h3>
      <el-button v-perm="permKeys.create" type="primary" @click="openCreate">+ 新增员工</el-button>
    </div>

    <el-table v-loading="loading" :data="staff" stripe>
      <el-table-column label="员工" min-width="180">
        <template #default="{ row }">
          <div class="staff-name">
            <div>
              <div>{{ row.nickname || '—' }} <el-tag v-if="isSelf(row)" size="small">我</el-tag></div>
              <div class="staff-username">@{{ row.username }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="角色" min-width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="isAnchorRole(row.roleCode) ? 'warning' : 'primary'">
            {{ row.roleName || row.roleCode }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="130">
        <template #default="{ row }">{{ row.phone || '—' }}</template>
      </el-table-column>
      <el-table-column prop="email" label="邮箱" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ row.email || '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'danger'">
            {{ row.status === 1 ? '在职' : '已禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近登录" width="150">
        <template #default="{ row }">{{ fmtTime(row.lastLoginAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="290" align="center">
        <template #default="{ row }">
          <template v-if="!isSelf(row)">
            <el-button v-perm="permKeys.update" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-perm="permKeys.status" size="small"
              :type="row.status === 1 ? 'warning' : 'success'" plain
              :disabled="row.status === 1 && isAnchorRole(row.roleCode)"
              @click="toggleStatus(row)"
            >{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
            <el-button v-perm="permKeys.password" size="small" plain @click="openPassword(row)">重置密码</el-button>
            <el-button
              v-perm="permKeys.delete" size="small" type="danger" plain
              :disabled="isAnchorRole(row.roleCode)" @click="remove(row)"
            >删除</el-button>
          </template>
          <span v-else class="self-hint">本人账号在个人中心维护</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增员工 -->
    <el-dialog v-model="createDialog" title="新增员工" width="480px">
      <el-form :model="createForm" label-width="90px">
        <el-form-item label="登录名" required>
          <el-input v-model="createForm.username" maxlength="32" placeholder="3-32 位，登录用，创建后不可改" />
        </el-form-item>
        <el-form-item label="初始密码" required>
          <el-input v-model="createForm.password" maxlength="32" show-password placeholder="6-32 位" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="createForm.nickname" maxlength="50" placeholder="如：王小明" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="createForm.roleCode" style="width: 100%" placeholder="决定该员工可见的菜单与按钮">
            <el-option v-for="r in roleOptions" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="createForm.phone" maxlength="20" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="createForm.email" maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑员工 -->
    <el-dialog v-model="editDialog" :title="`编辑员工 — ${editing.username}`" width="480px">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.nickname" maxlength="50" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.roleCode" style="width: 100%">
            <el-option v-for="r in roleOptions" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" maxlength="20" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="passwordDialog" :title="`重置密码 — ${editing.username}`" width="420px">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 12px">
        重置后该员工的所有登录会话立即下线，需用新密码重新登录。
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="新密码" required>
          <el-input v-model="newPassword" maxlength="32" show-password placeholder="6-32 位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitPassword">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchStaff, createStaff, updateStaff, updateStaffStatus, resetStaffPassword, deleteStaff } from '../../api/staff'
import { fetchRoles } from '../../api/role'
import { useUserStore } from '../../store/user'

const props = defineProps({
  /** PLATFORM / MERCHANT，由路由注入 */
  group: { type: String, required: true }
})

const userStore = useUserStore()

const P = props.group === 'PLATFORM' ? 'admin' : 'merchant'
const permKeys = {
  create: [`${P}:staff:create`],
  update: [`${P}:staff:update`],
  status: [`${P}:staff:status`],
  password: [`${P}:staff:password`],
  delete: [`${P}:staff:delete`]
}

// 内置角色：不可禁用/删除（平台 admin、商家 merchant 店长）
const ANCHOR = props.group === 'PLATFORM' ? 'admin' : 'merchant'
const isAnchorRole = (code) => code === ANCHOR

const staff = ref([])
const roles = ref([])
const loading = ref(false)

const scopeHint = computed(() =>
  props.group === 'PLATFORM' ? '平台员工使用平台后台，角色权限由「角色管理」配置' : '本店员工使用商家后台，角色权限由「角色管理」配置'
)
const roleOptions = computed(() => roles.value.filter((r) => r.status === 1))

onMounted(() => {
  load()
  loadRoles()
})

async function load() {
  loading.value = true
  try {
    const res = await fetchStaff()
    staff.value = res.data || []
  } catch { staff.value = [] } finally { loading.value = false }
}

async function loadRoles() {
  try {
    const res = await fetchRoles({ groupCode: props.group })
    roles.value = res.data || []
  } catch { roles.value = [] }
}

const isSelf = (row) => row.id === userStore.user?.id

const fmtTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

// ==================== 新增 / 编辑 ====================

const createDialog = ref(false)
const editDialog = ref(false)
const saving = ref(false)
const editing = ref({})
const createForm = reactive({ username: '', password: '', nickname: '', roleCode: '', phone: '', email: '' })
const editForm = reactive({ nickname: '', roleCode: '', phone: '', email: '' })

function openCreate() {
  Object.assign(createForm, { username: '', password: '', nickname: '', roleCode: '', phone: '', email: '' })
  createDialog.value = true
}

async function submitCreate() {
  if (!createForm.username.trim() || !createForm.password || !createForm.nickname.trim() || !createForm.roleCode) {
    ElMessage.warning('请完整填写登录名、初始密码、姓名与角色')
    return
  }
  saving.value = true
  try {
    await createStaff({ ...createForm })
    createDialog.value = false
    ElMessage.success('员工已添加，可用登录名与初始密码登录')
    load()
  } catch { /* 后端已提示具体原因 */ } finally { saving.value = false }
}

function openEdit(row) {
  editing.value = row
  Object.assign(editForm, {
    nickname: row.nickname || '', roleCode: row.roleCode, phone: row.phone || '', email: row.email || ''
  })
  editDialog.value = true
}

async function submitEdit() {
  saving.value = true
  try {
    await updateStaff(editing.value.id, { ...editForm })
    editDialog.value = false
    ElMessage.success('员工已更新')
    load()
  } catch { /* 后端已提示具体原因 */ } finally { saving.value = false }
}

// ==================== 状态 / 密码 / 删除 ====================

function toggleStatus(row) {
  const disable = row.status === 1
  const text = disable
    ? `禁用后「${row.nickname || row.username}」的所有登录会话立即下线且无法登录，确定禁用吗？`
    : `确定恢复「${row.nickname || row.username}」的登录资格吗？`
  ElMessageBox.confirm(text, disable ? '禁用员工' : '启用员工', { type: 'warning' }).then(async () => {
    await updateStaffStatus(row.id, disable ? 0 : 1)
    ElMessage.success(disable ? '已禁用并下线' : '已启用')
    load()
  })
}

const passwordDialog = ref(false)
const newPassword = ref('')

function openPassword(row) {
  editing.value = row
  newPassword.value = ''
  passwordDialog.value = true
}

async function submitPassword() {
  if (!newPassword.value) {
    ElMessage.warning('请填写新密码')
    return
  }
  saving.value = true
  try {
    await resetStaffPassword(editing.value.id, newPassword.value)
    passwordDialog.value = false
    ElMessage.success('密码已重置，该员工需重新登录')
  } catch { /* 后端已提示具体原因 */ } finally { saving.value = false }
}

function remove(row) {
  ElMessageBox.confirm(
    `删除员工「${row.nickname || row.username}」后该账号无法再登录，确定删除吗？`,
    '删除员工', { type: 'warning' }
  ).then(async () => {
    await deleteStaff(row.id)
    ElMessage.success('员工已删除')
    load()
  })
}
</script>

<style scoped>
.page {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
h3 {
  margin: 0;
}
.sub {
  font-size: 13px;
  color: #999;
  font-weight: 400;
}
.staff-name {
  display: flex;
  align-items: center;
}
.staff-username {
  font-size: 12px;
  color: #999;
}
.self-hint {
  font-size: 12px;
  color: #bbb;
}
</style>
