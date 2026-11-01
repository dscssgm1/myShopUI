<template>
  <div>
    <!-- Banner 轮播 -->
    <el-carousel height="320px" class="banner">
      <el-carousel-item v-for="b in banners" :key="b.id">
        <div class="banner-item" :style="{ background: b.color }">
          <div class="banner-text">
            <h1>{{ b.title }}</h1>
            <p>{{ b.subtitle }}</p>
            <el-button size="large" round @click="$router.push('/products')">立即选购 →</el-button>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>

    <!-- 分类入口 -->
    <div class="section">
      <h3 class="sec-title">商品分类</h3>
      <div class="cat-grid">
        <div
          v-for="c in categories" :key="c.id" class="cat-card"
          :style="{ background: c.color || '#f5f5f5' }"
          @click="$router.push({ path: '/products', query: { categoryId: c.id } })"
        >
          <span class="cat-icon">{{ c.icon || '📦' }}</span>
          <span>{{ c.name }}</span>
        </div>
      </div>
    </div>

    <!-- 秒杀专区 -->
    <div class="section">
      <h3 class="sec-title">
        ⚡ 限时秒杀 <span class="sub">每日 10 点 / 20 点开抢</span>
        <router-link :to="{ path: '/products', query: { tag: '秒杀' } }" class="more">更多 →</router-link>
      </h3>
      <el-empty v-if="!seckill.length" description="暂无秒杀商品" :image-size="80" />
      <div v-else class="p-grid">
        <ProductCard v-for="p in seckill" :key="p.id" :product="p" />
      </div>
    </div>

    <!-- 热卖推荐 -->
    <div class="section">
      <h3 class="sec-title">
        🔥 热卖推荐
        <router-link to="/products" class="more">更多 →</router-link>
      </h3>
      <div class="p-grid">
        <ProductCard v-for="p in hot" :key="p.id" :product="p" />
      </div>
    </div>

    <!-- 楼层：按大类展示 -->
    <div v-for="floor in floors" :key="floor.category.id" class="section">
      <h3 class="sec-title">
        {{ floor.category.icon || '📦' }} {{ floor.category.name }}楼层
        <router-link :to="{ path: '/products', query: { categoryId: floor.category.id } }" class="more">更多 →</router-link>
      </h3>
      <div class="p-grid">
        <ProductCard v-for="p in floor.products" :key="p.id" :product="p" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import ProductCard from '../components/ProductCard.vue'
import { fetchCategoryTree, fetchHotProducts, fetchProducts } from '../api/product'

const banners = [
  { id: 1, title: '双 11 全球狂欢节', subtitle: '每满 300 减 50 · 上不封顶', color: 'linear-gradient(90deg,#ff416c,#ff4b2b)' },
  { id: 2, title: '数码焕新季', subtitle: '手机数码 满 2000 减 200', color: 'linear-gradient(90deg,#396afc,#2948ff)' },
  { id: 3, title: '生鲜秒杀日', subtitle: '爆款生鲜 5 折起 每日 10 点开抢', color: 'linear-gradient(90deg,#11998e,#38ef7d)' }
]

const categories = ref([])
const seckill = ref([])
const hot = ref([])
const floors = ref([])

onMounted(async () => {
  try {
    const catRes = await fetchCategoryTree()
    categories.value = catRes.data || []
  } catch { /* ignore */ }

  loadSeckill()
  loadHot()
  loadFloors()
})

async function loadSeckill() {
  try {
    const res = await fetchProducts({ tag: '秒杀', page: 1, size: 4 })
    seckill.value = res.data?.list || []
  } catch { seckill.value = [] }
}

async function loadHot() {
  try {
    const res = await fetchHotProducts(4)
    hot.value = res.data || []
  } catch { hot.value = [] }
}

async function loadFloors() {
  const majors = categories.value.slice(0, 3)
  const result = []
  for (const major of majors) {
    try {
      const res = await fetchProducts({ categoryId: major.id, page: 1, size: 4 })
      const products = res.data?.list || []
      if (products.length) result.push({ category: major, products })
    } catch { /* ignore */ }
  }
  floors.value = result
}
</script>

<style scoped>
.banner {
  border-radius: 8px;
  overflow: hidden;
}
.banner-item {
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 80px;
  color: #fff;
}
.banner-text h1 {
  font-size: 40px;
  margin-bottom: 12px;
}
.banner-text p {
  font-size: 18px;
  margin-bottom: 24px;
  opacity: 0.9;
}
.section {
  margin-top: 24px;
}
.sec-title {
  font-size: 20px;
  margin-bottom: 14px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.sub {
  font-size: 13px;
  color: #999;
  font-weight: 400;
}
.more {
  margin-left: auto;
  font-size: 13px;
  color: #ff4b2b;
  font-weight: 400;
}
.cat-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}
.cat-card {
  border-radius: 10px;
  padding: 22px 0;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
  font-size: 15px;
}
.cat-card:hover {
  transform: translateY(-4px);
}
.cat-icon {
  display: block;
  font-size: 32px;
  margin-bottom: 8px;
}
.p-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
</style>
