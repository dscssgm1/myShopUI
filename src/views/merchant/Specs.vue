<template>
  <div class="page-card">
    <div class="head">
      <h3>🏷️ 我的规格</h3>
      <div class="head-actions">
        <el-button size="small" @click="openImport">⬇ 导入平台模板</el-button>
        <el-button type="primary" size="small" @click="openAdd">+ 新增规格</el-button>
      </div>
    </div>
    <p class="sub">维护店铺自己的规格与规格值（如 颜色、尺码、容量），发布商品时从这里选择并按组合设置价格。</p>

    <el-empty v-if="!shopId" description="当前账号未绑定店铺，无法维护规格" />

    <el-table v-else :data="rows" size="small" v-loading="loading">
      <el-table-column label="规格名称" width="180">
        <template #default="{ row }"><b>{{ row.name }}</b></template>
      </el-table-column>
      <el-table-column label="规格值">
        <template #default="{ row }">
          <el-tag v-for="o in row.options" :key="o" size="small" class="mr6">{{ o }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog" :title="form.id ? '编辑规格' : '新增规格'" width="520px">
      <el-form label-width="90px">
        <el-form-item label="规格名称" required>
          <el-input v-model="form.name" maxlength="20" show-word-limit placeholder="如：颜色 / 尺码 / 容量" />
        </el-form-item>
        <el-form-item label="规格值" required>
          <div class="option-editor">
            <div class="option-tags">
              <el-tag v-for="o in form.options" :key="o" closable @close="removeOption(o)">{{ o }}</el-tag>
              <el-input
                v-model="optionInput" maxlength="30" placeholder="输入规格值后回车，如：红色" style="width: 220px"
                @keydown.enter="onOptionEnter"
              />
              <el-button size="small" @click="addOption()">添加</el-button>
            </div>
            <div v-if="suggestOptions.length" class="option-suggest">
              <span class="tip">快捷选用：</span>
              <span v-for="o in suggestOptions" :key="o" class="suggest-chip" @click="addOption(o)">{{ o }}</span>
            </div>
            <div class="tip">规格值手动输入，可添加多个；下方为本店已用过的规格值，点击直接加入</div>
          </div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 从平台模板导入：勾选后复制为店铺自己的规格，之后与平台互不影响 -->
    <el-dialog v-model="importDialog" title="从平台模板导入" width="560px">
      <div v-loading="importLoading" class="import-body">
        <el-empty v-if="!importRows.length && !importLoading" description="平台暂未维护规格模板" :image-size="80" />
        <template v-else>
          <div class="import-bar">
            <el-checkbox :model-value="allChecked" :indeterminate="someChecked" @change="toggleAll">
              全选可导入项
            </el-checkbox>
            <span class="tip">导入后复制为店铺自己的规格，可自由修改，与平台模板不再联动</span>
          </div>
          <div v-for="t in importRows" :key="t.id" class="import-row">
            <el-checkbox v-model="t.checked" :disabled="!t.selectable" />
            <div class="import-main">
              <b>{{ t.name }}</b>
              <el-tag v-if="t.exists" size="small" type="info" class="ml8">已拥有同名</el-tag>
              <el-tag v-else-if="!t.options.length" size="small" type="info" class="ml8">无规格值</el-tag>
              <div class="import-opts">
                <el-tag v-for="o in t.options" :key="o" size="small" class="mr6">{{ o }}</el-tag>
              </div>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="importDialog = false">取消</el-button>
        <el-button type="primary" :loading="importing" :disabled="!checkedCount" @click="doImport">
          导入所选{{ checkedCount ? `（${checkedCount}）` : '' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createMerchantSpec, deleteMerchantSpec, fetchMerchantSpecs, updateMerchantSpec } from '../../api/spec'
import { fetchSpecs } from '../../api/admin'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()
const shopId = computed(() => userStore.user?.shopId)

const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const form = reactive({ id: null, name: '', options: [], sort: 0 })
/** 正在输入的规格值（回车/点击添加后进入 form.options） */
const optionInput = ref('')

/** 本店已用过的全部规格值，新增/编辑时作为候选项（输入联想） */
const commonOptions = computed(() => {
  const seen = new Set()
  const out = []
  for (const r of rows.value) {
    for (const o of r.options || []) {
      if (o && !seen.has(o)) {
        seen.add(o)
        out.push(o)
      }
    }
  }
  return out
})

/** 快捷建议只展示尚未加入的规格值 */
const suggestOptions = computed(() =>
  commonOptions.value.filter((o) => !form.options.includes(o)))

/** 添加规格值：手动输入为主，也可点击快捷建议直接加入 */
function addOption(value) {
  const v = String(value ?? optionInput.value).trim()
  if (!v) return
  if (form.options.includes(v)) {
    ElMessage.warning(`规格值「${v}」已存在`)
  } else {
    form.options.push(v)
  }
  optionInput.value = ''
}

function removeOption(option) {
  form.options = form.options.filter((o) => o !== option)
}

/** 回车添加；中文输入法选字时的回车（isComposing）不算，避免把拼音/未确认内容加进去 */
function onOptionEnter(e) {
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  addOption()
}

onMounted(load)

async function load() {
  if (!shopId.value) return
  loading.value = true
  try {
    const res = await fetchMerchantSpecs()
    rows.value = res.data || []
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function openAdd() {
  Object.assign(form, { id: null, name: '', options: [], sort: 0 })
  optionInput.value = ''
  dialog.value = true
}

function openEdit(row) {
  Object.assign(form, { id: row.id, name: row.name, options: [...(row.options || [])], sort: row.sort ?? 0 })
  optionInput.value = ''
  dialog.value = true
}

async function save() {
  if (!form.name.trim()) return ElMessage.warning('请输入规格名称')
  if (!form.options.length) return ElMessage.warning('请至少输入一个规格值')
  saving.value = true
  try {
    const payload = { name: form.name.trim(), options: form.options, sort: form.sort }
    if (form.id) {
      await updateMerchantSpec(form.id, payload)
      ElMessage.success('规格已更新')
    } else {
      await createMerchantSpec(payload)
      ElMessage.success('规格已新增')
    }
    dialog.value = false
    load()
  } catch { /* 后端已提示 */ } finally {
    saving.value = false
  }
}

function remove(row) {
  ElMessageBox.confirm(`确定删除规格「${row.name}」？已发布商品中的该规格不受影响。`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteMerchantSpec(row.id)
      ElMessage.success('规格已删除')
      load()
    })
    .catch(() => {})
}

// ==================== 从平台模板导入 ====================

const importDialog = ref(false)
const importLoading = ref(false)
const importing = ref(false)
/** 平台模板 + 勾选状态（exists/selectable 在打开时按本店现状计算） */
const importRows = ref([])

/** 可导入：本店没有同名规格且有规格值 */
const selectableRows = computed(() => importRows.value.filter((t) => t.selectable))
const checkedCount = computed(() => importRows.value.filter((t) => t.checked).length)
const allChecked = computed(() =>
  selectableRows.value.length > 0 && selectableRows.value.every((t) => t.checked))
const someChecked = computed(() => checkedCount.value > 0 && !allChecked.value)

async function openImport() {
  importDialog.value = true
  importLoading.value = true
  try {
    // 同时刷新本店规格，保证「已拥有同名」标记是最新的
    const [tplRes] = await Promise.all([fetchSpecs(), load()])
    const owned = new Set(rows.value.map((r) => r.name))
    importRows.value = (tplRes.data || []).map((t) => ({
      ...t,
      checked: false,
      exists: owned.has(t.name),
      selectable: !owned.has(t.name) && !!(t.options || []).length
    }))
  } catch {
    importRows.value = []
  } finally {
    importLoading.value = false
  }
}

function toggleAll(val) {
  selectableRows.value.forEach((t) => { t.checked = !!val })
}

/** 逐条导入：单条失败（如刚被并发创建的同名）只跳过该条，错误提示由拦截器统一弹出 */
async function doImport() {
  const picked = importRows.value.filter((t) => t.checked)
  if (!picked.length) return
  importing.value = true
  let ok = 0
  for (const t of picked) {
    try {
      await createMerchantSpec({ name: t.name, options: t.options, sort: t.sort ?? 0 })
      ok++
    } catch { /* 继续导入其余 */ }
  }
  importing.value = false
  if (ok) ElMessage.success(`已导入 ${ok} 个规格`)
  importDialog.value = false
  load()
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
}
h3 {
  margin: 0 0 6px;
}
.sub {
  font-size: 12px;
  color: #999;
  margin: 0 0 16px;
}
.mr6 {
  margin-right: 6px;
  margin-bottom: 4px;
}
.option-editor {
  width: 100%;
}
.option-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.option-suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
}
.suggest-chip {
  padding: 2px 10px;
  border: 1px dashed #dcdfe6;
  border-radius: 12px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.suggest-chip:hover {
  color: #ff4b2b;
  border-color: #ff4b2b;
}
.tip {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}
.head-actions {
  display: flex;
  gap: 8px;
}
.import-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.import-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f2f2f2;
}
.import-main {
  flex: 1;
  min-width: 0;
}
.import-opts {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ml8 {
  margin-left: 8px;
}
</style>
