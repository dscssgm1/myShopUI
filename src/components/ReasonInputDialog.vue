<template>
  <el-dialog :model-value="modelValue" :title="title" width="480px" @close="close">
    <el-form label-width="90px" @submit.prevent>
      <el-form-item label="原因类别" required>
        <el-select
          v-model="category" filterable allow-create default-first-option
          placeholder="选择或输入类别" style="width: 100%"
        >
          <el-option v-for="o in options" :key="o" :label="o" :value="o" />
        </el-select>
        <div class="tip">类别预设由平台配置中心维护，也可直接输入自定义类别</div>
      </el-form-item>
      <el-form-item :label="label" required>
        <el-input
          v-model="detail" type="textarea" :rows="3" maxlength="300" show-word-limit
          :placeholder="placeholder"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchPublicConfigMap, parseConfigJson } from '../api/config'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  /** 详细原因的表单标签，如 驳回原因 / 下架原因 */
  label: { type: String, default: '详细原因' },
  /** 配置中心原因类别列表组，如 audit-reject-reason */
  group: { type: String, required: true },
  /** 配置中心未配置或加载失败时的兜底类别 */
  defaults: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请填写具体原因，如：涉及商品与资质信息不符' }
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const category = ref('')
const detail = ref('')
const options = ref([...props.defaults])

watch(() => props.modelValue, (open) => {
  if (open) {
    category.value = ''
    detail.value = ''
    load()
  }
})

/** 类别预设由配置中心维护（fetchPublicConfigMap 静默降级到默认列表） */
async function load() {
  try {
    const map = await fetchPublicConfigMap(props.group, { silent: true })
    const list = parseConfigJson(map.default, [])
    options.value = Array.isArray(list) && list.length ? list : [...props.defaults]
  } catch {
    options.value = [...props.defaults]
  }
}

function close() {
  emit('update:modelValue', false)
}

/** 组合为「【类别】详细原因」存入原有单个 reason 字段，扫一眼类别即知原因类型 */
function confirm() {
  const cat = String(category.value || '').trim()
  const det = String(detail.value || '').trim()
  if (!cat) return ElMessage.warning('请选择原因类别')
  if (!det) return ElMessage.warning(`请填写${props.label}`)
  emit('confirm', `【${cat}】${det}`)
  close()
}
</script>

<style scoped>
.tip {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
  margin-top: 4px;
}
</style>
