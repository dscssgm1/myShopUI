<template>
  <div v-if="shop" class="shop-page">
    <div class="shop-head" :style="{ background: shop.color }">
      <div class="shop-logo">{{ shop.icon || '🏪' }}</div>
      <div class="shop-info">
        <div class="shop-name">{{ shop.name }}</div>
        <div class="shop-desc">{{ shop.description }}</div>
        <div class="shop-meta">
          <span>🏷️ {{ (shop.categories || []).join('、') || '综合' }}</span>
          <span>📍 {{ shop.region || '—' }}</span>
          <span>📦 累计销量 {{ shop.sales || 0 }}</span>
        </div>
      </div>
    </div>

    <div class="goods-section">
      <h3>本店商品（{{ total }}）</h3>
      <el-empty v-if="!loading && !goods.length" description="店铺暂无商品" />
      <div v-else v-loading="loading" class="p-grid">
        <ProductCard v-for="p in goods" :key="p.id" :product="p" />
      </div>
      <el-pagination
        v-if="total > size"
        v-model:current-page="page" :page-size="size" :total="total"
        layout="prev, pager, next" style="justify-content: center; margin-top: 20px"
        @current-change="loadGoods"
      />
    </div>
  </div>
  <el-empty v-else-if="!loading" description="店铺不存在" />
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import { fetchShop, fetchShopProducts } from '../api/shop'

const route = useRoute()
const shop = ref(null)
const goods = ref([])
const total = ref(0)
const page = ref(1)
const size = 12
const loading = ref(false)

onMounted(load)
watch(() => route.params.id, load)

async function load() {
  loading.value = true
  try {
    const res = await fetchShop(route.params.id)
    shop.value = res.data
    page.value = 1
    await loadGoods()
  } catch { shop.value = null } finally { loading.value = false }
}

async function loadGoods() {
  try {
    const res = await fetchShopProducts(route.params.id, page.value, size)
    goods.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { goods.value = []; total.value = 0 }
}
</script>

<style scoped>
.shop-page {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}
.shop-head {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px 36px;
  color: #fff;
}
.shop-logo {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  flex-shrink: 0;
}
.shop-info {
  flex: 1;
}
.shop-name {
  font-size: 26px;
  font-weight: 700;
}
.shop-desc {
  font-size: 14px;
  opacity: 0.9;
  margin: 6px 0 8px;
}
.shop-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  opacity: 0.9;
}
.goods-section {
  padding: 24px 36px;
}
.goods-section h3 {
  margin-bottom: 16px;
}
.p-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  min-height: 120px;
}
</style>
