<template>
  <el-dialog
    :model-value="modelValue"
    title="选择收货地址"
    width="560px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="book">
      <el-empty v-if="!loading && !list.length" description="暂无收货地址" />
      <div
        v-for="a in list"
        :key="a.id"
        class="book-item"
        :class="{ on: selectedId === a.id }"
        @click="selectedId = a.id"
      >
        <el-radio :model-value="selectedId" :value="a.id" class="book-radio"><span /></el-radio>
        <div class="book-main">
          <div class="book-line">
            <span class="book-name">{{ a.receiverName }}</span>
            <span class="book-phone">{{ a.receiverPhone }}</span>
            <el-tag v-if="a.isDefault" type="danger" size="small">默认</el-tag>
          </div>
          <div class="book-text">{{ a.address }}</div>
        </div>
        <el-button link type="primary" size="small" @click.stop="edit(a)">编辑</el-button>
      </div>
    </div>

    <template #footer>
      <el-button link type="primary" @click="add">+ 新增收货地址</el-button>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!selectedId" @click="confirm">确定</el-button>
    </template>

    <AddressFormDialog
      v-model="formVisible"
      :address="editing"
      :default-first="!list.length"
      @saved="onSaved"
    />
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { fetchAddresses } from '../api/user'
import AddressFormDialog from './AddressFormDialog.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 当前已选地址 id，打开时定位到它 */
  modelId: { type: [Number, String], default: null }
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const list = ref([])
const loading = ref(false)
const selectedId = ref(null)
const formVisible = ref(false)
const editing = ref(null)

watch(() => props.modelValue, (open) => {
  if (open) {
    selectedId.value = props.modelId ?? null
    load()
  }
})

async function load() {
  loading.value = true
  try {
    const res = await fetchAddresses()
    list.value = res.data || []
    // 未指定或已被删除时，回落到默认地址
    if (!list.value.some((a) => a.id === selectedId.value)) {
      selectedId.value = list.value.find((a) => a.isDefault)?.id ?? list.value[0]?.id ?? null
    }
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function add() {
  editing.value = null
  formVisible.value = true
}

function edit(a) {
  editing.value = a
  formVisible.value = true
}

/** 新增/编辑后刷新列表并选中改动的那条，让结算页立即用上 */
async function onSaved(saved) {
  await load()
  if (saved?.id) selectedId.value = saved.id
}

function confirm() {
  const hit = list.value.find((a) => a.id === selectedId.value)
  if (!hit) return
  emit('confirm', hit)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.book {
  max-height: 46vh;
  overflow-y: auto;
}
.book-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
  cursor: pointer;
}
.book-item.on {
  border-color: #ff4b2b;
  background: #fff8f6;
}
.book-radio {
  margin-right: 0;
  height: auto;
}
.book-main {
  flex: 1;
  min-width: 0;
}
.book-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.book-name {
  font-weight: 600;
  color: #333;
}
.book-phone {
  color: #999;
  font-size: 13px;
}
.book-text {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
}
</style>
