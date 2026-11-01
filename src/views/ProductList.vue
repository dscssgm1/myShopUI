<template>
  <div class="list-page">
    <!-- 筛选侧栏 -->
    <aside class="filter">
      <div class="f-group">
        <h4>商品分类</h4>
        <div class="f-opts">
          <span :class="{ active: !query.categoryId }" @click="setQuery('categoryId', '')">全部</span>
          <span
            v-for="c in categories" :key="c.id"
            :class="{ active: String(query.categoryId) === String(c.id) }"
            @click="setQuery('categoryId', c.id)"
          >{{ c.name }}</span>
        </div>
      </div>

      <div v-if="currentSubs.length" class="f-group">
        <h4>小类</h4>
        <div class="f-opts">
          <span :class="{ active: !query.subCategoryId }" @click="setQuery('subCategoryId', '')">全部</span>
          <span
            v-for="s in currentSubs" :key="s.id"
            :class="{ active: String(query.subCategoryId) === String(s.id) }"
            @click="setQuery('subCategoryId', s.id)"
          >{{ s.name }}</span>
        </div>
      </div>

      <div v-if="brands.length" class="f-group">
        <h4>品牌</h4>
        <div class="f-opts">
          <span :class="{ active: !query.brandId }" @click="setQuery('brandId', '')">不限</span>
          <span
            v-for="b in brands" :key="b.id"
            :class="{ active: String(query.brandId) === String(b.id) }"
            @click="setQuery('brandId', b.id)"
          >{{ b.name }}</span>
        </div>
      </div>

      <div class="f-group">
        <h4>价格区间</h4>
        <el-input-number v-model="minPrice" :min="0" :max="999999" size="small" placeholder="最低" controls-position="right" style="width: 100%" />
        <el-input-number v-model="maxPrice" :min="0" :max="999999" size="small" placeholder="最高" controls-position="right" style="width: 100%; margin-top: 6px" />
        <el-button size="small" style="width: 100%; margin-top: 8px" @click="applyPrice">确定</el-button>
      </div>

      <div class="f-group">
        <h4>服务标签</h4>
        <div class="f-opts">
          <span :class="{ active: query.tag === '自营' }" @click="setQuery('tag', query.tag === '自营' ? '' : '自营')">🔖 仅看自营</span>
          <span :class="{ active: query.tag === '秒杀' }" @click="setQuery('tag', query.tag === '秒杀' ? '' : '秒杀')">⚡ 仅看秒杀</span>
        </div>
      </div>
    </aside>

    <!-- 结果区 -->
    <div class="result">
      <div class="crumb-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: '/products' }">全部商品</el-breadcrumb-item>
          <el-breadcrumb-item v-if="currentCategory">{{ currentCategory.name }}</el-breadcrumb-item>
          <el-breadcrumb-item v-if="currentSub">{{ currentSub.name }}</el-breadcrumb-item>
        </el-breadcrumb>
        <span v-if="query.keyword" class="crumb-tip">🔍 搜索 “{{ query.keyword }}” 的结果</span>
      </div>

      <div class="toolbar">
        <span class="total">共 {{ total }} 件商品</span>
        <div class="sorts">
          <span :class="{ active: sortBy === 'default' }" @click="changeSort('default')">综合</span>
          <span :class="{ active: sortBy === 'sales' }" @click="changeSort('sales')">销量 ↓</span>
          <span :class="{ active: sortBy === 'priceAsc' }" @click="changeSort('priceAsc')">价格 ↑</span>
          <span :class="{ active: sortBy === 'priceDesc' }" @click="changeSort('priceDesc')">价格 ↓</span>
        </div>
      </div>

      <div v-loading="loading" class="result-body">
        <el-empty v-if="!loading && !products.length" description="没有符合条件的商品" />
        <div v-else class="p-grid">
          <ProductCard v-for="p in products" :key="p.id" :product="p" />
        </div>
      </div>

      <el-pagination
        v-if="total > size"
        v-model:current-page="page"
        :page-size="size"
        :total="total"
        layout="prev, pager, next"
        style="justify-content: center; margin-top: 20px"
        @current-change="loadProducts"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import { fetchBrands, fetchCategoryTree, fetchProducts } from '../api/product'

const route = useRoute()
const router = useRouter()

const categories = ref([])
const brands = ref([])
const products = ref([])
const total = ref(0)
const page = ref(1)
const size = 12
const loading = ref(false)
const sortBy = ref('default')
const minPrice = ref(null)
const maxPrice = ref(null)

const query = reactive({
  keyword: '',
  categoryId: '',
  subCategoryId: '',
  brandId: '',
  tag: ''
})

const currentCategory = computed(() =>
  categories.value.find((c) => String(c.id) === String(query.categoryId)))
const currentSubs = computed(() => currentCategory.value?.children || [])
const currentSub = computed(() =>
  currentSubs.value.find((s) => String(s.id) === String(query.subCategoryId)))

onMounted(async () => {
  try {
    const catRes = await fetchCategoryTree()
    categories.value = catRes.data || []
  } catch { /* ignore */ }

  // 品牌接口尚未加入匿名白名单，未登录时不请求，避免无谓的 401
  if (localStorage.getItem('myshop_token')) {
    try {
      const brandRes = await fetchBrands()
      brands.value = brandRes.data || []
    } catch { /* ignore */ }
  }

  syncFromRoute()
  loadProducts()
})

watch(() => route.query, () => {
  syncFromRoute()
  page.value = 1
  loadProducts()
})

function syncFromRoute() {
  query.keyword = route.query.keyword || ''
  query.categoryId = route.query.categoryId || ''
  query.subCategoryId = route.query.subCategoryId || ''
  query.brandId = route.query.brandId || ''
  query.tag = route.query.tag || ''
  sortBy.value = route.query.sort || 'default'
}

function setQuery(key, value) {
  const q = { ...route.query, [key]: value || undefined }
  if (key === 'categoryId') q.subCategoryId = undefined
  router.push({ path: '/products', query: q })
}

function changeSort(value) {
  sortBy.value = value
  router.push({ path: '/products', query: { ...route.query, sort: value } })
}

function applyPrice() {
  router.push({
    path: '/products',
    query: { ...route.query, minPrice: minPrice.value ?? undefined, maxPrice: maxPrice.value ?? undefined }
  })
}

async function loadProducts() {
  loading.value = true
  try {
    const res = await fetchProducts({
      keyword: query.keyword || undefined,
      categoryId: query.categoryId || undefined,
      subCategoryId: query.subCategoryId || undefined,
      brandId: query.brandId || undefined,
      tag: query.tag || undefined,
      minPrice: route.query.minPrice || undefined,
      maxPrice: route.query.maxPrice || undefined,
      sort: sortBy.value,
      page: page.value,
      size
    })
    products.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    products.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.list-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.filter {
  width: 200px;
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  flex-shrink: 0;
}
.f-group {
  margin-bottom: 18px;
}
.f-group h4 {
  font-size: 14px;
  margin-bottom: 10px;
}
.f-opts span {
  display: inline-block;
  font-size: 13px;
  color: #666;
  padding: 4px 10px;
  margin: 0 6px 6px 0;
  border-radius: 14px;
  cursor: pointer;
}
.f-opts span:hover {
  color: #ff4b2b;
}
.f-opts span.active {
  background: #ff4b2b;
  color: #fff;
}
.result {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  padding: 16px;
}
.crumb-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff8f6;
  border: 1px solid #ffe0d8;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
  font-size: 13px;
}
.crumb-tip {
  color: #666;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.total {
  font-size: 13px;
  color: #999;
}
.sorts span {
  font-size: 13px;
  color: #666;
  margin-left: 16px;
  cursor: pointer;
}
.sorts span.active {
  color: #ff4b2b;
  font-weight: 600;
}
.result-body {
  min-height: 320px;
}
.p-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
</style>
