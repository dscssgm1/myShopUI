<template>
  <div class="page-card">
    <div class="head">
      <h3>📍 收货地址</h3>
      <el-button type="primary" size="small" @click="openAdd">+ 新增地址</el-button>
    </div>

    <div v-loading="loading">
      <el-empty v-if="!loading && !list.length" description="暂无收货地址" />
      <div v-for="a in list" :key="a.id" class="addr-item" :class="{ def: a.isDefault }">
        <div class="a-main">
          <div class="a-line">
            <span class="a-name">{{ a.receiverName }}</span>
            <span class="a-phone">{{ a.receiverPhone }}</span>
            <el-tag v-if="a.isDefault" type="danger" size="small">默认</el-tag>
          </div>
          <div class="a-text">{{ a.address }}</div>
        </div>
        <div class="a-actions">
          <el-button v-if="!a.isDefault" link type="primary" size="small" @click="setDefault(a)">设为默认</el-button>
          <el-button link type="primary" size="small" @click="openEdit(a)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(a)">删除</el-button>
        </div>
      </div>
    </div>

    <AddressFormDialog v-model="formVisible" :address="editing" :default-first="!list.length" @saved="load" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteAddress, fetchAddresses, setDefaultAddress } from '../../api/user'
import AddressFormDialog from '../../components/AddressFormDialog.vue'

const list = ref([])
const loading = ref(false)
const formVisible = ref(false)
const editing = ref(null)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchAddresses()
    list.value = res.data || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editing.value = null
  formVisible.value = true
}

function openEdit(a) {
  editing.value = a
  formVisible.value = true
}

async function setDefault(a) {
  await setDefaultAddress(a.id)
  ElMessage.success('已设为默认地址')
  load()
}

function remove(a) {
  ElMessageBox.confirm('确定删除该地址吗？', '提示', { type: 'warning' }).then(async () => {
    await deleteAddress(a.id)
    ElMessage.success('地址已删除')
    load()
  }).catch(() => {})
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
  margin-bottom: 16px;
}
h3 {
  margin: 0;
}
.addr-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 12px;
}
.addr-item.def {
  border-color: #ffccc7;
  background: #fff8f6;
}
.a-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.a-name {
  font-weight: 600;
  color: #333;
}
.a-phone {
  color: #999;
  font-size: 13px;
}
.a-text {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
}
.a-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
