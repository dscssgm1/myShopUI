<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="head">
        <div>
          <b>品牌管理</b>
          <span class="tip">平台统一维护品牌库，商家发布商品时选择；品牌不纳入配置中心。</span>
        </div>
        <el-button type="primary" @click="openDialog()">新增品牌</el-button>
      </div>
    </template>

    <el-table :data="brands" size="small" style="max-width: 900px">
      <el-table-column label="Logo" width="90">
        <template #default="{ row }">
          <img v-if="isImage(row.logo)" :src="row.logo" class="logo" alt="logo" />
          <span v-else class="logo-text">{{ row.logo || '🏷️' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="品牌名称" width="200" />
      <el-table-column prop="sort" label="排序" width="100" />
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="form.id ? '编辑品牌' : '新增品牌'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="品牌名称" required>
          <el-input v-model="form.name" placeholder="如：华为" />
        </el-form-item>
        <el-form-item label="Logo">
          <ImageUpload v-model="logoList" :limit="1" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
          <span class="unit">数字越小越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchBrands } from '../../api/product'
import { createBrand, deleteBrand, updateBrand } from '../../api/admin'
import ImageUpload from '../../components/ImageUpload.vue'

const brands = ref([])
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const form = reactive({ id: null, name: '', logo: '', sort: 0 })

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchBrands()
    brands.value = res.data || []
  } catch { brands.value = [] } finally { loading.value = false }
}

function isImage(logo) {
  return /^https?:\/\//i.test(logo || '')
}

const logoList = computed({
  // 历史 emoji logo 不进上传组件，不改动则原样保留
  get: () => (isImage(form.logo) ? [form.logo] : []),
  set: (list) => { form.logo = list[0] || '' }
})

function openDialog(row) {
  form.id = row?.id || null
  form.name = row?.name || ''
  form.logo = row?.logo || ''
  form.sort = row?.sort ?? 0
  dialog.value = true
}

async function save() {
  const name = form.name.trim()
  if (!name) return ElMessage.warning('请输入品牌名称')
  saving.value = true
  try {
    const payload = { name, logo: form.logo.trim(), sort: form.sort }
    if (form.id) await updateBrand(form.id, payload)
    else await createBrand(payload)
    ElMessage.success('品牌已保存')
    dialog.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除品牌「${row.name}」？使用该品牌的商品将变为无品牌。`, '提示', { type: 'warning' })
  } catch { return }
  await deleteBrand(row.id)
  ElMessage.success('已删除')
  await load()
}
</script>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.tip {
  color: #999;
  font-size: 13px;
  font-weight: 400;
  margin-left: 8px;
}
.logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid #eee;
  background: #fff;
}
.logo-text {
  font-size: 22px;
}
.unit {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}
</style>
