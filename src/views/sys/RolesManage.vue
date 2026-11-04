<template>
  <div class="page">
    <div class="page-head">
      <h3>🧩 角色管理 <span class="sub">配置角色可用的菜单与按钮，未勾选的不可见</span></h3>
      <el-button v-perm="permKeys.save" type="primary" @click="openCreate">+ 新建角色</el-button>
    </div>

    <el-table v-loading="loading" :data="roles" stripe>
      <el-table-column label="角色" min-width="200">
        <template #default="{ row }">
          <div class="role-name">
            <span class="role-icon">{{ row.icon || '🧩' }}</span>
            <div>
              <div>{{ row.name }} <el-tag v-if="isAnchor(row.code)" size="small" type="warning">内置</el-tag></div>
              <div class="role-code">{{ row.code }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.description || '—' }}</template>
      </el-table-column>
      <el-table-column label="在职员工" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.userCount > 0 ? 'primary' : 'info'">{{ row.userCount || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'danger'">
            {{ row.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250" align="center">
        <template #default="{ row }">
          <el-button v-perm="permKeys.menus" size="small" type="primary" plain @click="openMenus(row)">
            配置菜单
          </el-button>
          <el-button
            v-perm="permKeys.save" size="small" :disabled="isSelf(row) || isAnchor(row.code)"
            @click="openEdit(row)"
          >编辑</el-button>
          <el-button
            v-perm="permKeys.delete" size="small" type="danger" plain
            :disabled="isSelf(row) || isAnchor(row.code) || row.userCount > 0"
            @click="remove(row)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建 / 编辑角色 -->
    <el-dialog v-model="editDialog" :title="editing.id ? '编辑角色' : '新建角色'" width="480px">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="角色编码" required>
          <el-input
            v-model="editForm.code" :disabled="!!editing.id" maxlength="32"
            placeholder="小写字母开头，如 warehouse-keeper"
          />
        </el-form-item>
        <el-form-item label="角色名称" required>
          <el-input v-model="editForm.name" maxlength="50" placeholder="如：仓库管理员" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="editForm.icon" maxlength="4" style="width: 100px" placeholder="🧩" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="2" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 配置菜单权限 -->
    <el-dialog v-model="menuDialog" :title="`配置菜单 — ${menuRole?.name}`" width="560px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 12px">
        勾选该角色可见的菜单与按钮；保存后该角色在线员工下一次请求即按新权限生效。
      </el-alert>
      <div v-loading="menuLoading" class="perm-tree-box">
        <el-tree
          ref="treeRef" :data="treeData" node-key="key" show-checkbox default-expand-all
          :props="{ label: 'title', children: 'children' }"
        >
          <template #default="{ data }">
            <span :class="data.children ? 'perm-menu' : 'perm-button'">
              <span v-if="data.icon" class="perm-icon">{{ data.icon }}</span>{{ data.title }}
            </span>
          </template>
        </el-tree>
      </div>
      <template #footer>
        <el-button @click="menuDialog = false">取消</el-button>
        <el-button type="primary" :loading="menuSaving" @click="submitMenus">保存并生效</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchRoles, createRole, updateRole, deleteRole, fetchRoleMenus, saveRoleMenus } from '../../api/role'
import { PERM_TREE } from '../../perm/tree'
import { useUserStore } from '../../store/user'

const props = defineProps({
  /** PLATFORM / MERCHANT，由路由注入，决定展示哪一端的角色与权限树 */
  group: { type: String, required: true }
})

const userStore = useUserStore()

// 本端权限码前缀：平台 admin:* / 商家 merchant:*（共享页面按端取 key）
const P = props.group === 'PLATFORM' ? 'admin' : 'merchant'
const permKeys = {
  save: [`${P}:roles:save`],
  menus: [`${P}:roles:menus`],
  delete: [`${P}:roles:delete`]
}

const ANCHOR = props.group === 'PLATFORM' ? 'admin' : 'merchant'

const roles = ref([])
const loading = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchRoles({ groupCode: props.group })
    roles.value = res.data || []
  } catch { roles.value = [] } finally { loading.value = false }
}

const isAnchor = (code) => code === ANCHOR
const isSelf = (row) => row.code === userStore.user?.roleCode

// ==================== 新建 / 编辑 ====================

const editDialog = ref(false)
const saving = ref(false)
const editing = ref({})
const editForm = reactive({ code: '', name: '', icon: '', description: '' })

function openCreate() {
  editing.value = {}
  Object.assign(editForm, { code: '', name: '', icon: '', description: '' })
  editDialog.value = true
}

function openEdit(row) {
  editing.value = row
  Object.assign(editForm, { code: row.code, name: row.name, icon: row.icon || '', description: row.description || '' })
  editDialog.value = true
}

async function submitEdit() {
  if (!editForm.code.trim() || !editForm.name.trim()) {
    ElMessage.warning('请填写角色编码与名称')
    return
  }
  saving.value = true
  try {
    if (editing.value.id) {
      await updateRole(editing.value.id, { ...editForm, groupCode: props.group })
    } else {
      await createRole({ ...editForm, groupCode: props.group })
      // 新角色默认无任何菜单权限，引导先配置
      ElMessage.success('角色已创建，请点击「配置菜单」分配权限')
    }
    editDialog.value = false
    load()
  } catch { /* 后端已提示具体原因 */ } finally { saving.value = false }
}

function remove(row) {
  ElMessageBox.confirm(`删除角色「${row.name}」后不可恢复，确定删除吗？`, '删除角色', { type: 'warning' })
    .then(async () => {
      await deleteRole(row.id)
      ElMessage.success('角色已删除')
      load()
    })
}

// ==================== 配置菜单 ====================

const menuDialog = ref(false)
const menuLoading = ref(false)
const menuSaving = ref(false)
const menuRole = ref(null)
const treeRef = ref(null)

// 权限树 = 本端目录树，菜单为父节点、按钮为子节点
const treeData = computed(() =>
  (PERM_TREE[props.group] || []).map((m) => ({
    key: m.key, title: `${m.title}`, icon: m.icon,
    children: (m.buttons || []).map((b) => ({ key: b.key, title: b.title }))
  }))
)

async function openMenus(row) {
  menuRole.value = row
  menuDialog.value = true
  menuLoading.value = true
  try {
    const res = await fetchRoleMenus(row.code)
    const keys = res.data || []
    await nextTick()
    // 只回显叶子节点（按钮/无按钮菜单），父菜单由级联自动呈现选中/半选
    const menuKeys = new Set((PERM_TREE[props.group] || []).map((m) => m.key))
    const buttonless = new Set(
      (PERM_TREE[props.group] || []).filter((m) => !(m.buttons || []).length).map((m) => m.key)
    )
    treeRef.value?.setCheckedKeys(keys.filter((k) => !menuKeys.has(k) || buttonless.has(k)))
  } catch { /* 保留空勾选 */ } finally { menuLoading.value = false }
}

async function submitMenus() {
  // 半选父节点也要收集：菜单下只勾了部分按钮时菜单本身仍需可见
  const checked = treeRef.value?.getCheckedKeys() || []
  const half = treeRef.value?.getHalfCheckedKeys() || []
  const keys = [...new Set([...checked, ...half])]
  menuSaving.value = true
  try {
    await saveRoleMenus(menuRole.value.code, keys)
    menuDialog.value = false
    ElMessage.success('菜单权限已保存，该角色在线员工已即时生效')
  } catch { /* 后端已提示具体原因 */ } finally { menuSaving.value = false }
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
.role-name {
  display: flex;
  align-items: center;
  gap: 10px;
}
.role-icon {
  font-size: 22px;
}
.role-code {
  font-size: 12px;
  color: #999;
}
.perm-tree-box {
  max-height: 50vh;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 10px;
}
.perm-menu {
  font-weight: 600;
}
.perm-button {
  font-size: 13px;
  color: #666;
}
.perm-icon {
  margin-right: 6px;
}
</style>
