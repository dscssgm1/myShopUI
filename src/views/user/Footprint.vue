<template>
  <div class="page-card">
    <div class="head">
      <h3>🕐 浏览足迹</h3>
      <el-button v-if="items.length" link type="danger" @click="clear">清空足迹</el-button>
    </div>
    <div v-loading="loading">
      <el-empty v-if="!loading && !items.length" description="暂无浏览记录" />
      <div v-else class="fp-list">
        <div v-for="f in items" :key="f.productId" class="fp-item" @click="$router.push(`/product/${f.productId}`)">
          <div class="f-img" :style="{ background: f.product?.color }">{{ f.product?.emoji || '🛍️' }}</div>
          <div class="f-mid">
            <div class="f-name">{{ f.product?.name || '商品已下架' }}</div>
            <div class="f-time">🕐 {{ formatTime(f.viewedAt) }}</div>
          </div>
          <span v-if="f.product" class="f-price">¥{{ f.product.price }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { clearFootprints, fetchFootprints } from '../../api/user'
import { fetchProductBatch } from '../../api/product'

const items = ref([])
const loading = ref(false)

onMounted(load)

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')

async function load() {
  loading.value = true
  try {
    const res = await fetchFootprints(50)
    const records = res.data || []
    if (!records.length) {
      items.value = []
      return
    }
    const ids = [...new Set(records.map((f) => f.productId))]
    const detail = await fetchProductBatch(ids)
    const map = new Map((detail.data || []).map((p) => [p.id, p]))
    items.value = records.map((f) => ({ ...f, product: map.get(f.productId) }))
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function clear() {
  ElMessageBox.confirm('确定清空全部浏览足迹吗？', '提示', { type: 'warning' }).then(async () => {
    await clearFootprints()
    ElMessage.success('足迹已清空')
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
.fp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fp-item {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.fp-item:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}
.f-img {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  flex-shrink: 0;
}
.f-mid {
  flex: 1;
  min-width: 0;
}
.f-name {
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.f-time {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}
.f-price {
  color: #ff4b2b;
  font-weight: 700;
}
</style>
