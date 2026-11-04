<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>物流公司管理</b>
        <div>
          <el-tooltip content="仅平台管理员可新增、编辑与启停物流公司" placement="left">
            <span class="tip">🔒 仅平台管理员可操作</span>
          </el-tooltip>
          <el-button v-perm="'admin:companies:create'" type="primary" size="small" style="margin-left: 12px" @click="openAdd">+ 新增物流公司</el-button>
        </div>
      </div>
    </template>

    <el-table :data="rows" size="small" v-loading="loading">
      <el-table-column label="公司" min-width="200">
        <template #default="{ row }">
          <span class="dot" :style="{ background: row.color || '#666' }" />
          <b>{{ row.name }}</b>
          <span class="code">{{ row.code }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="contact" label="联系人" width="120" />
      <el-table-column prop="phone" label="联系电话" width="150" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '已入驻' : '待入驻' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button v-perm="'admin:companies:update'" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.status === 1 ? 'warning' : 'success'" size="small" @click="toggle(row)">
            {{ row.status === 1 ? '取消入驻' : '入驻' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="editing ? '编辑物流公司' : '新增物流公司'" width="460px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="公司名称" required>
          <el-input v-model="form.name" placeholder="如：顺丰速运" />
        </el-form-item>
        <el-form-item label="公司编码" required>
          <el-input v-model="form.code" placeholder="如：SF" :disabled="!!editing" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" maxlength="20" />
        </el-form-item>
        <el-form-item label="主题色">
          <el-color-picker v-model="form.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createCompany, fetchCompanies, updateCompany, updateCompanyStatus } from '../../api/logistics'

const rows = ref([])
const loading = ref(false)
const dialog = ref(false)
const editing = ref(null)
const form = reactive({ name: '', code: '', contact: '', phone: '', color: '#396afc' })

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchCompanies(true)
    rows.value = res.data || []
  } catch { rows.value = [] } finally { loading.value = false }
}

function openAdd() {
  editing.value = null
  Object.assign(form, { name: '', code: '', contact: '', phone: '', color: '#396afc' })
  dialog.value = true
}

function openEdit(row) {
  editing.value = row
  Object.assign(form, { name: row.name, code: row.code, contact: row.contact || '', phone: row.phone || '', color: row.color || '#396afc' })
  dialog.value = true
}

async function save() {
  if (!form.name.trim() || (!editing.value && !form.code.trim())) {
    ElMessage.warning('请填写公司名称与编码')
    return
  }
  if (editing.value) await updateCompany(editing.value.id, { ...form })
  else await createCompany({ ...form, status: 0 })
  dialog.value = false
  ElMessage.success('已保存')
  load()
}

function toggle(row) {
  const target = row.status === 1 ? 0 : 1
  const action = target === 1 ? '入驻' : '取消入驻'
  ElMessageBox.confirm(`确认${action}「${row.name}」？${target === 0 ? '取消入驻后商家发货将无法选择该公司。' : ''}`, '提示', { type: 'warning' }).then(async () => {
    await updateCompanyStatus(row.id, target)
    ElMessage.success(`已${action}`)
    load()
  }).catch(() => {})
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tip {
  font-size: 12px;
  color: #999;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}
.code {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
}
</style>
