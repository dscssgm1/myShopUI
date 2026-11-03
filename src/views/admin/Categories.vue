<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="head">
        <div>
          <b>分类管理</b>
          <span class="tip">大类展示在买家端顶部导航；小类展示在大类悬停面板与筛选条件中，保存后立即生效。</span>
        </div>
        <el-button type="primary" @click="openMajor()">新增大类</el-button>
      </div>
    </template>

    <el-table :data="categories" row-key="id" size="small">
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="sub-wrap">
            <div class="sub-head">
              <b>{{ row.icon || '📦' }} {{ row.name }} · 小类</b>
              <el-button type="primary" plain size="small" @click="openSub(row)">新增小类</el-button>
            </div>
            <el-table v-if="row.children?.length" :data="row.children" size="small">
              <el-table-column prop="name" label="小类名称" />
              <el-table-column label="佣金费率" width="120">
                <template #default="{ row: sub }">
                  <span v-if="sub.commissionRate != null">{{ sub.commissionRate }}%</span>
                  <span v-else class="inherit">继承 {{ Number(sub.effectiveCommissionRate || 0) }}%</span>
                </template>
              </el-table-column>
              <el-table-column prop="sort" label="排序" width="90" />
              <el-table-column label="操作" width="140">
                <template #default="{ row: sub }">
                  <el-button link type="primary" @click="openSub(row, sub)">编辑</el-button>
                  <el-button link type="danger" @click="removeCategory(sub, false)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无小类" :image-size="60" />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="图标" width="80">
        <template #default="{ row }">{{ row.icon || '📦' }}</template>
      </el-table-column>
      <el-table-column prop="name" label="大类名称" width="170" />
      <el-table-column label="小类数量" width="100">
        <template #default="{ row }">{{ row.children?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="首页展示色" width="200">
        <template #default="{ row }">
          <span class="color-dot" :style="{ background: row.color || '#f5f5f5' }" />
          {{ row.color || '默认' }}
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="佣金费率" width="100">
        <template #default="{ row }">{{ row.commissionRate != null ? row.commissionRate + '%' : '未设置' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openMajor(row)">编辑</el-button>
          <el-button link type="danger" @click="removeCategory(row, true)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 大类弹窗 -->
    <el-dialog v-model="majorDialog" :title="majorForm.id ? '编辑大类' : '新增大类'" width="500px">
      <el-form label-width="90px">
        <el-form-item label="大类名称" required>
          <el-input v-model="majorForm.name" placeholder="如：手机数码" />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="majorForm.icon" filterable allow-create placeholder="选择或输入 emoji" style="width: 180px">
            <el-option v-for="icon in ICONS" :key="icon" :label="icon" :value="icon" />
          </el-select>
        </el-form-item>
        <el-form-item label="展示色">
          <el-color-picker v-model="majorForm.color" />
          <el-input v-model="majorForm.color" placeholder="#fff4f0" style="width: 160px; margin-left: 10px" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="majorForm.sort" :min="0" />
          <span class="unit">数字越小越靠前</span>
        </el-form-item>
        <el-form-item label="佣金费率">
          <el-input-number v-model="majorForm.commissionRate" :min="0" :max="100" :precision="2" :step="0.5" placeholder="不抽佣" />
          <span class="unit">%（0~100），留空或 0 表示该类目不抽佣</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="majorDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveMajor">保存</el-button>
      </template>
    </el-dialog>

    <!-- 小类弹窗 -->
    <el-dialog v-model="subDialog" :title="subForm.id ? '编辑小类' : '新增小类'" width="460px">
      <el-form label-width="90px">
        <el-form-item label="所属大类">
          <el-input :model-value="subForm.parentName" disabled />
        </el-form-item>
        <el-form-item label="小类名称" required>
          <el-input v-model="subForm.name" placeholder="如：手机" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="subForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="佣金费率">
          <el-input-number
            v-model="subForm.commissionRate" :min="0" :max="100" :precision="2" :step="0.5"
            :placeholder="`留空继承大类 ${Number(subForm.parentRate || 0)}%`"
          />
          <span class="unit">留空表示继承大类的费率</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="subDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveSub">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createCategory, deleteCategory, updateCategory } from '../../api/admin'
import { fetchCategoryTree } from '../../api/product'

const ICONS = ['📱', '💻', '👕', '👟', '📚', '🏠', '🧴', '🍎', '🎮', '🚲', '🎁', '📦']

const categories = ref([])
const loading = ref(false)
const saving = ref(false)

const majorDialog = ref(false)
const majorForm = reactive({ id: null, name: '', icon: '📦', color: '#fff4f0', sort: 0, commissionRate: null })

const subDialog = ref(false)
const subForm = reactive({ id: null, parentId: null, parentName: '', name: '', sort: 0, commissionRate: null, parentRate: 0 })

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchCategoryTree()
    categories.value = res.data || []
  } catch { categories.value = [] } finally { loading.value = false }
}

function openMajor(row) {
  majorForm.id = row?.id || null
  majorForm.name = row?.name || ''
  majorForm.icon = row?.icon || '📦'
  majorForm.color = row?.color || '#fff4f0'
  majorForm.sort = row?.sort ?? 0
  majorForm.commissionRate = row?.commissionRate ?? null
  majorDialog.value = true
}

async function saveMajor() {
  const name = majorForm.name.trim()
  if (!name) return ElMessage.warning('请输入大类名称')
  saving.value = true
  try {
    const payload = {
      parentId: 0,
      name,
      icon: majorForm.icon,
      color: majorForm.color,
      sort: majorForm.sort,
      commissionRate: majorForm.commissionRate
    }
    if (majorForm.id) await updateCategory(majorForm.id, payload)
    else await createCategory(payload)
    ElMessage.success('大类已保存')
    majorDialog.value = false
    await load()
  } finally {
    saving.value = false
  }
}

function openSub(parent, sub) {
  subForm.id = sub?.id || null
  subForm.parentId = parent.id
  subForm.parentName = `${parent.icon || '📦'} ${parent.name}`
  subForm.name = sub?.name || ''
  subForm.sort = sub?.sort ?? 0
  subForm.commissionRate = sub?.commissionRate ?? null
  subForm.parentRate = Number(parent?.effectiveCommissionRate || 0)
  subDialog.value = true
}

async function saveSub() {
  const name = subForm.name.trim()
  if (!name) return ElMessage.warning('请输入小类名称')
  saving.value = true
  try {
    const payload = {
      parentId: subForm.parentId,
      name,
      sort: subForm.sort,
      // 留空即清空单独费率，改回继承大类
      commissionRate: subForm.commissionRate
    }
    if (subForm.id) await updateCategory(subForm.id, payload)
    else await createCategory(payload)
    ElMessage.success('小类已保存')
    subDialog.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function removeCategory(row, isMajor) {
  const message = isMajor
    ? `确定删除大类「${row.name}」？其下的小类会一并删除。`
    : `确定删除小类「${row.name}」？`
  try {
    await ElMessageBox.confirm(message, '提示', { type: 'warning' })
  } catch { return }
  await deleteCategory(row.id)
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
.sub-wrap {
  padding: 8px 20px 12px 48px;
}
.sub-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.color-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid #eee;
  margin-right: 6px;
  vertical-align: -2px;
}
.unit {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}
.inherit {
  color: #999;
  font-size: 12px;
}
</style>
