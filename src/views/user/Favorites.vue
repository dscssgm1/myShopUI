<template>
  <div class="page-card">
    <h3>❤️ 我的收藏</h3>
    <div v-loading="loading">
      <el-empty v-if="!loading && !items.length" description="还没有收藏商品，去逛逛吧">
        <el-button type="primary" @click="$router.push('/products')">去逛逛</el-button>
      </el-empty>
      <div v-else class="fav-grid">
        <div v-for="p in items" :key="p.id" class="fav-item" @click="$router.push(`/product/${p.id}`)">
          <div class="f-img" :style="{ background: p.color }">{{ p.emoji }}</div>
          <div class="f-name">{{ p.name }}</div>
          <div class="f-foot">
            <span class="f-price">¥{{ p.price }}</span>
            <el-button link type="danger" size="small" @click.stop="remove(p.id)">取消收藏</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchFavorites, removeFavorite } from '../../api/user'
import { fetchProductBatch } from '../../api/product'

const items = ref([])
const loading = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const res = await fetchFavorites()
    const ids = (res.data || []).map((f) => f.productId)
    if (!ids.length) {
      items.value = []
      return
    }
    const detail = await fetchProductBatch(ids)
    const map = new Map((detail.data || []).map((p) => [p.id, p]))
    // 保持收藏时间顺序
    items.value = ids.map((id) => map.get(id)).filter(Boolean)
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function remove(id) {
  try {
    await removeFavorite(id)
    ElMessage.success('已取消收藏')
    load()
  } catch { /* ignore */ }
}
</script>

<style scoped>
.page-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
h3 {
  margin-bottom: 16px;
}
.fav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.fav-item {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.fav-item:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  transform: translateY(-3px);
}
.f-img {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
}
.f-name {
  font-size: 13px;
  padding: 10px 12px 4px;
  height: 40px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.f-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 12px;
}
.f-price {
  color: #ff4b2b;
  font-weight: 700;
}
</style>
