<template>
  <div class="list-page">
    <!-- 筛选侧栏：商品/店铺各自定制，随 tab 切换 -->
    <aside class="filter">
      <template v-if="tab === 'product'">
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
      </template>

      <template v-else>
        <div class="f-group">
          <h4>店铺评分</h4>
          <div class="f-opts">
            <span
              v-for="r in ratingLevels" :key="r.value"
              :class="{ active: shopRating === r.value }"
              @click="setShopRating(r.value)"
            >{{ r.label }}</span>
          </div>
        </div>

        <div class="f-group">
          <h4>经营类目</h4>
          <div class="f-opts">
            <span :class="{ active: effectiveShopCategory === '' }" @click="setShopCategory('')">全部</span>
            <span
              v-for="c in categories" :key="c.id"
              :class="{ active: effectiveShopCategory === c.name }"
              @click="setShopCategory(c.name)"
            >{{ c.name }}</span>
          </div>
        </div>
      </template>
    </aside>

    <!-- 结果区：商品 / 店铺 两个 tab -->
    <div class="result">
      <div class="crumb-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: '/products' }">全部商品</el-breadcrumb-item>
          <el-breadcrumb-item v-if="currentCategory && tab === 'product'">{{ currentCategory.name }}</el-breadcrumb-item>
          <el-breadcrumb-item v-if="currentSub">{{ currentSub.name }}</el-breadcrumb-item>
        </el-breadcrumb>
        <span v-if="query.keyword" class="crumb-tip">
          🔍 搜索 “{{ query.keyword }}” 的结果{{ shopKeywordTotal ? `，找到 ${shopKeywordTotal} 家相关店铺` : '' }}
        </span>
      </div>

      <el-tabs v-model="tab" class="result-tabs" @tab-change="changeTab">
        <!-- ==================== 商品 ==================== -->
        <el-tab-pane label="商品" name="product">
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
        </el-tab-pane>

        <!-- ==================== 店铺 ==================== -->
        <el-tab-pane :label="shopTabLabel" name="shop">
          <div v-loading="shopLoading" class="shop-list">
            <el-empty v-if="!shopLoading && !shops.length" description="没有找到相关店铺" />
            <div v-for="s in shops" :key="s.id" class="shop-row">
              <div class="shop-row-head">
                <!-- 点击 logo / 店名进店 -->
                <span class="shop-logo clickable" :style="{ background: s.color || '#f5f5f5' }" @click="$router.push(`/shop/${s.id}`)">
                  <img v-if="iconIsImage(s.icon)" :src="s.icon" alt="" />
                  <span v-else>{{ s.icon || '🏪' }}</span>
                </span>
                <div class="shop-main">
                  <div class="shop-name clickable" @click="$router.push(`/shop/${s.id}`)">
                    {{ s.name }}
                    <span v-if="s.rating" class="shop-rate">★ {{ s.rating }}</span>
                  </div>
                  <div class="shop-desc" :title="s.description">{{ s.description || '暂无店铺简介' }}</div>
                  <div class="shop-meta">
                    🏷️ {{ (s.categories || []).join('、') || '综合经营' }} · 📦 销量 {{ (s.sales || 0).toLocaleString() }}
                  </div>
                </div>
              </div>
              <!-- 该店铺下的（匹配）商品，点击直达商品详情 -->
              <div class="shop-goods">
                <div
                  v-for="g in shopProductsMap[s.id] || []" :key="g.id"
                  class="sg-item" @click="$router.push(`/product/${g.id}`)"
                >
                  <div class="sg-img">
                    <img v-if="g.coverImage" :src="g.coverImage" alt="" />
                    <span v-else>{{ g.emoji }}</span>
                  </div>
                  <div class="sg-name">{{ g.name }}</div>
                  <div class="sg-price">
                    <span v-if="Number(g.price) > shownPrice(g)" class="sg-orig">¥{{ g.price }}</span>
                    ¥{{ shownPrice(g) }}
                  </div>
                </div>
                <span v-if="!shopLoading && !(shopProductsMap[s.id] || []).length" class="sg-empty">
                  该店铺暂无{{ query.keyword ? '匹配' : '' }}商品
                </span>
              </div>
            </div>
          </div>

          <el-pagination
            v-if="shopTotal > shopSize"
            v-model:current-page="shopPage"
            :page-size="shopSize"
            :total="shopTotal"
            layout="prev, pager, next"
            style="justify-content: center; margin-top: 20px"
            @current-change="loadShops"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import { fetchBrands, fetchCategoryTree, fetchProducts } from '../api/product'
import { fetchShops } from '../api/shop'
import { attachProductPrices, bestDisplayPrice } from '../utils/productPrice'

/** 店铺小卡展示价：原价 / 商家促销价 / 单件最低到手价 取低 */
const shownPrice = bestDisplayPrice

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

// ==================== 商品 / 店铺 tab ====================
const tab = ref('product')

// 店铺评分等级选项（value 传给后端 minRating）
const ratingLevels = [
  { value: '', label: '不限' },
  { value: '4.8', label: '4.8 分以上' },
  { value: '4.5', label: '4.5 分以上' },
  { value: '4', label: '4 分以上' }
]

const shops = ref([])
const shopTotal = ref(0)
const shopPage = ref(1)
const shopSize = 10
const shopLoading = ref(false)
/** 本轮关键词下是否已加载过店铺结果（tab 标签上的数量显示用） */
const shopLoaded = ref(false)
const shopRating = ref('')
/** 店铺类目筛选：null=跟随商品 tab 已选大类，''=全部，'类目名'=指定 */
const shopCategory = ref(null)
/** 每个店铺下展示的匹配商品（shopId → 商品列表） */
const shopProductsMap = ref({})
/** 关键词命中的店铺总数（面包屑提示用，切 tab 也会用到） */
const shopKeywordTotal = ref(null)

const effectiveShopCategory = computed(() =>
  shopCategory.value === null ? (currentCategory.value?.name || '') : shopCategory.value)

/** 店铺 icon 可能是上传的图片 URL，也可能是 emoji 占位（与 Shop.vue 判断一致） */
const iconIsImage = (icon) => /^https?:\/\/|^\//.test(icon || '')

const shopTabLabel = computed(() => (shopLoaded.value ? `店铺 (${shopTotal.value})` : '店铺'))

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
  loadShopKeywordCount()
})

watch(() => route.query, () => {
  syncFromRoute()
  page.value = 1
  loadProducts()
  resetShopResults()
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

// ==================== 店铺搜索 ====================

function changeTab(name) {
  tab.value = name
  // 首次切到店铺 tab（或关键词变化后还没加载过）时拉取
  if (name === 'shop' && !shopLoaded.value) loadShops()
}

/** 关键词变化后清空店铺结果，正在店铺 tab 则立即重查 */
function resetShopResults() {
  shopPage.value = 1
  shops.value = []
  shopTotal.value = 0
  shopProductsMap.value = {}
  shopLoaded.value = false
  loadShopKeywordCount()
  if (tab.value === 'shop') loadShops()
}

function setShopRating(value) {
  shopRating.value = value
  shopPage.value = 1
  loadShops()
}

function setShopCategory(value) {
  shopCategory.value = value
  shopPage.value = 1
  loadShops()
}

async function loadShops() {
  shopLoading.value = true
  try {
    const res = await fetchShops({
      keyword: query.keyword || undefined,
      category: effectiveShopCategory.value || undefined,
      minRating: shopRating.value || undefined,
      page: shopPage.value,
      size: shopSize
    })
    shops.value = res.data?.list || []
    shopTotal.value = res.data?.total || 0
    shopKeywordTotal.value = query.keyword ? shopTotal.value : null
    shopLoaded.value = true
    await loadShopGoods()
  } catch {
    shops.value = []
    shopTotal.value = 0
    shopLoaded.value = true
  } finally {
    shopLoading.value = false
  }
}

/** 每个店铺并行拉少量在售商品（有关键词时即该店的匹配商品） */
async function loadShopGoods() {
  const results = await Promise.allSettled(
    shops.value.map((s) => fetchProducts({
      shopId: s.id,
      keyword: query.keyword || undefined,
      page: 1,
      size: 5
    }))
  )
  const map = {}
  results.forEach((r, i) => {
    map[shops.value[i].id] = r.status === 'fulfilled' ? (r.value.data?.list || []) : []
  })
  // 小卡同样展示单件最低到手价（失败静默，按原价展示）
  await attachProductPrices(Object.values(map).flat())
  shopProductsMap.value = map
}

/** 面包屑「找到 N 家相关店铺」：仅关键词搜索时轻量查一次总数 */
async function loadShopKeywordCount() {
  if (!query.keyword) {
    shopKeywordTotal.value = null
    return
  }
  try {
    const res = await fetchShops({ keyword: query.keyword, page: 1, size: 1 }, { silent: true })
    shopKeywordTotal.value = res.data?.total || 0
  } catch { shopKeywordTotal.value = null }
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
    // 合并活动/券后的单件最低到手价（失败静默，按原价展示）
    await attachProductPrices(products.value)
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
.result-tabs {
  margin-top: 4px;
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
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
/* 店铺结果行 */
.shop-list {
  min-height: 200px;
}
.shop-row {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.shop-row-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.shop-logo {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}
.shop-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.shop-main {
  flex: 1;
  min-width: 0;
}
/* 可点击进店：logo / 店名，手型光标 + 悬停变色提示 */
.clickable {
  cursor: pointer;
}
.shop-name {
  font-size: 15px;
  font-weight: 700;
  transition: color 0.15s;
}
.shop-name.clickable:hover {
  color: #ff4b2b;
}
.shop-rate {
  color: #ff4b2b;
  font-size: 12px;
  font-weight: 600;
  margin-left: 6px;
}
/* 简介最多两行，超出省略；悬停经 title 看全文，避免长简介把行撑高 */
.shop-desc {
  font-size: 12px;
  color: #999;
  margin: 3px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.shop-meta {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.shop-goods {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}
.sg-item {
  width: 128px;
  border: 1px solid #f5f5f5;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
}
.sg-item:hover {
  border-color: #ffd6cc;
}
.sg-img {
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  background: #f7f7f7;
}
.sg-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sg-name {
  font-size: 12px;
  height: 32px;
  margin-top: 6px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sg-price {
  color: #ff4b2b;
  font-weight: 600;
  font-size: 13px;
  margin-top: 4px;
}
.sg-orig {
  color: #bbb;
  font-size: 11px;
  font-weight: 400;
  text-decoration: line-through;
  margin-right: 4px;
}
.sg-empty {
  font-size: 12px;
  color: #bbb;
  padding: 8px 0;
}
</style>
