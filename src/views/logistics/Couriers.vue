<template>
  <el-card shadow="never">
    <template #header>
      <div class="head">
        <b>快递员管理</b>
        <el-button type="primary" size="small" @click="openAdd">+ 新增快递员</el-button>
      </div>
    </template>

    <el-table :data="rows" size="small" v-loading="loading">
      <el-table-column prop="name" label="姓名" width="140" />
      <el-table-column prop="phone" label="电话" width="140" />
      <el-table-column prop="region" label="负责区域" width="180" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '在职' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="editing ? '编辑快递员' : '新增快递员'" width="440px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" maxlength="11" />
        </el-form-item>
        <el-form-item label="负责区域" required>
          <el-input v-model="form.region" placeholder="如：北京市·朝阳区" />
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
import { createCourier, deleteCourier, fetchCouriers, updateCourier } from '../../api/logistics'

const rows = ref([])
const loading = ref(false)
const dialog = ref(false)
const editing = ref(null)
const form = reactive({ name: '', phone: '', region: '' })

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchCouriers()
    rows.value = res.data || []
  } catch { rows.value = [] } finally { loading.value = false }
}

function openAdd() {
  editing.value = null
  Object.assign(form, { name: '', phone: '', region: '' })
  dialog.value = true
}

function openEdit(row) {
  editing.value = row
  Object.assign(form, { name: row.name, phone: row.phone, region: row.region })
  dialog.value = true
}

async function save() {
  if (!form.name || !form.region) {
    ElMessage.warning('请填写姓名与负责区域')
    return
  }
  if (editing.value) await updateCourier(editing.value.id, { ...form, status: editing.value.status })
  else await createCourier({ ...form, status: 1 })
  dialog.value = false
  ElMessage.success('已保存')
  load()
}

function remove(row) {
  ElMessageBox.confirm(`确定删除「${row.name}」？`, '提示', { type: 'warning' }).then(async () => {
    await deleteCourier(row.id)
    ElMessage.success('已删除')
    load()
  })
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
