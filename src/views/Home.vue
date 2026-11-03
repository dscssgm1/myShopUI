<template>
  <div>
    <!-- 首屏：左侧大分类菜单（悬停向右展开小类）+ 右侧 Banner 与分类宫格 -->
    <div class="hero" @mouseleave="hoverIndex = -1">
      <aside class="cat-menu">
        <!-- 真实链接 + target=_blank：点击分类在新标签页打开商品列表 -->
        <a
          v-for="(c, i) in categories" :key="c.id"
          class="cat-row" :class="{ active: hoverIndex === i }"
          :href="`/products?categoryId=${c.id}`" target="_blank"
          @mouseenter="hoverIndex = i"
        >
          <span class="cat-row-icon">{{ c.icon || '📦' }}</span>
          <span class="cat-row-name">{{ c.name }}</span>
          <span class="cat-arrow">›</span>
        </a>
      </aside>

      <!-- 悬停展开的小类面板：从悬停行的高度向右展开 -->
      <transition name="fly">
        <div v-if="hoverIndex >= 0 && categories[hoverIndex]" class="cat-flyout" :style="{ top: flyoutTop }">
          <div class="fly-head">{{ categories[hoverIndex].icon }} {{ categories[hoverIndex].name }}</div>
          <div class="fly-chips">
            <a
              v-for="s in categories[hoverIndex].children || []" :key="s.id"
              class="fly-chip" target="_blank"
              :href="`/products?categoryId=${categories[hoverIndex].id}&subCategoryId=${s.id}`"
            >{{ s.name }}</a>
            <span v-if="!(categories[hoverIndex].children || []).length" class="fly-empty">该分类下暂无小类</span>
          </div>
          <a class="fly-all" target="_blank" :href="`/products?categoryId=${categories[hoverIndex].id}`">
            查看 {{ categories[hoverIndex].name }} 全部商品 →
          </a>
        </div>
      </transition>

      <div class="hero-right">
        <!-- Banner 轮播 -->
        <el-carousel height="320px" class="banner">
          <el-carousel-item v-for="b in banners" :key="b.id">
            <div class="banner-item" :style="{ background: b.color || '#ff4b2b' }">
              <div class="banner-text">
                <h1>{{ b.title }}</h1>
                <p>{{ b.subtitle }}</p>
                <el-button size="large" round @click="$router.push(b.link || '/products')">立即选购 →</el-button>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>

        <!-- 热卖榜单：销量 Top 10 -->
        <div class="section">
          <h3 class="sec-title">🔥 热卖榜单 <span class="sub">销量 Top 10</span></h3>
          <div class="p-grid">
            <div v-for="(p, i) in hotProducts" :key="p.id" class="hot-item">
              <span class="rank-badge" :class="{ top: i < 3 }">{{ i + 1 }}</span>
              <ProductCard :product="p" />
            </div>
          </div>
        </div>

        <!-- 品牌精选：点击进入品牌筛选列表 -->
        <div class="section">
          <h3 class="sec-title">🏷️ 品牌精选 <span class="sub">正品好货，一站式购齐</span></h3>
          <div class="brand-wall">
            <router-link
              v-for="b in brands" :key="b.id" class="brand-card"
              :to="{ path: '/products', query: { brandId: b.id } }"
            >
              <img v-if="b.logo" :src="b.logo" class="brand-logo" alt="" />
              <span v-else class="brand-logo brand-fallback">{{ b.name.slice(0, 1) }}</span>
              <span class="brand-name">{{ b.name }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 猜你喜欢：随机推送商品流，一轮内不重复；加载完即停 -->
    <div class="section">
      <h3 class="sec-title">❤️ 猜你喜欢</h3>
      <div class="p-grid">
        <ProductCard v-for="p in products" :key="p.id" :product="p" large />
      </div>
      <div v-loading="loading" class="load-status">
        <p v-if="!loading && !products.length" class="status-text">暂无商品</p>
        <p v-else-if="loading" class="status-text">正在加载更多商品…</p>
        <p v-else-if="exhausted" class="status-text">已加载所有商品（共 {{ products.length }} 件）</p>
        <p v-else-if="capReached" class="status-text">已加载 {{ MAX_PRODUCTS }} 件商品，继续下滑将重新推荐</p>
        <p v-else class="status-text">下滑加载更多</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ProductCard from '../components/ProductCard.vue'
import { fetchBrands, fetchCategoryTree, fetchProducts } from '../api/product'
import { fetchPublicConfig, parseConfigJson } from '../api/config'

const DEFAULT_BANNERS = [
  { id: 1, title: '双 11 全球狂欢节', subtitle: '每满 300 减 50 · 上不封顶', color: 'linear-gradient(90deg,#ff416c,#ff4b2b)', link: '/products' },
  { id: 2, title: '数码焕新季', subtitle: '手机数码 满 2000 减 200', color: 'linear-gradient(90deg,#396afc,#2948ff)', link: '/products' },
  { id: 3, title: '生鲜秒杀日', subtitle: '爆款生鲜 5 折起 每日 10 点开抢', color: 'linear-gradient(90deg,#11998e,#38ef7d)', link: '/products' }
]

const banners = ref(DEFAULT_BANNERS)
const categories = ref([])
/** 热卖榜单：销量 Top 10 */
const hotProducts = ref([])
/** 品牌精选 */
const brands = ref([])

// ==================== 左侧分类菜单（悬停行 → 右侧展开小类面板） ====================
const hoverIndex = ref(-1)
const CAT_ROW_HEIGHT = 50
const flyoutTop = computed(() => `${8 + hoverIndex.value * CAT_ROW_HEIGHT}px`)

// ==================== 猜你喜欢（随机推送 + 滚动分批加载） ====================

/** 每行 5 个 × 每批 10 行 */
const BATCH_SIZE = 50
/** 单轮最多展示 500 件，超过后重新进入首页即重新随机推送 */
const MAX_PRODUCTS = 500
const products = ref([])
const loading = ref(false)
/** 已展示的商品 ID：每批都回传给后端排除，保证同一轮内不重复 */
const seenIds = ref([])
/** 后端已取完全部商品：停住，不再请求 */
const exhausted = ref(false)
/** 已展示满 500 件：再滑到底则清空重来（重新随机推送并回到顶部） */
const capReached = computed(() => products.value.length >= MAX_PRODUCTS)

onMounted(async () => {
  loadBanners()

  try {
    const catRes = await fetchCategoryTree()
    categories.value = catRes.data || []
  } catch { /* ignore */ }

  // 热卖榜单与品牌墙：非阻塞加载，失败时板块留空不影响首屏
  fetchProducts({ page: 1, size: 10, sort: 'sales' })
    .then((res) => (hotProducts.value = (res.data?.list || []).slice(0, 10)))
    .catch(() => {})
  fetchBrands()
    .then((res) => (brands.value = res.data || []))
    .catch(() => {})

  loadMore()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

/** 距页面底部不足一屏时追加下一批；满 500 件后改为重新开始一轮 */
function onScroll() {
  if (loading.value || exhausted.value) return
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
    if (capReached.value) restartRound()
    else loadMore()
  }
}

async function loadMore() {
  if (loading.value || exhausted.value) return
  loading.value = true
  try {
    const params = { page: 1, size: BATCH_SIZE, sort: 'random' }
    // 逗号拼接：Spring 可直接绑定到 List<Long>（默认的 excludeIds[]= 数组格式绑不上）；
    // 首屏没有已见商品，不带该参数，避免空串被当成一个非法 ID
    if (seenIds.value.length) params.excludeIds = seenIds.value.join(',')
    const res = await fetchProducts(params)
    const list = res.data?.list || []
    products.value.push(...list)
    seenIds.value.push(...list.map((p) => p.id))
    // 返回不足一批说明后端已经取完，停住不再请求
    if (list.length < BATCH_SIZE) exhausted.value = true
  } catch { /* 保留已加载内容 */ } finally {
    loading.value = false
  }
  // 必须等这一批的卡片真正渲染完再复查：否则 scrollHeight 还是旧值（首屏高度），
  // 会被误判成「一屏都没填满」而连着再拉一批，首屏直接加载完整个商品池。
  await nextTick()
  onScroll()
}

/** 满 500 件后再滑到底：清空已见记录，回到顶部重新随机推送 */
function restartRound() {
  products.value = []
  seenIds.value = []
  exhausted.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
  loadMore()
}

/** 平台配置中心维护的 Banner；未配置时保留默认轮播 */
async function loadBanners() {
  try {
    const res = await fetchPublicConfig('banner', { silent: true })
    const raw = (res.data || []).find((item) => item.key === 'default')?.value
    const list = parseConfigJson(raw, [])
    if (Array.isArray(list) && list.length) {
      banners.value = list.map((b, i) => ({ id: i + 1, ...b }))
    }
  } catch { /* ignore */ }
}
</script>

<style scoped>
/* ==================== 首屏：左侧分类菜单 + 悬停右展小类面板 ==================== */
.hero {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 14px;
}
.cat-menu {
  width: 218px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 10px;
  padding: 8px 0;
}
.cat-row {
  height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px 0 18px;
  font-size: 14px;
  color: #333;
  text-decoration: none;
  cursor: pointer;
}
.cat-row.active {
  background: #fff3f0;
  color: #ff4b2b;
}
.cat-row-icon {
  font-size: 18px;
}
.cat-row-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cat-arrow {
  color: #ccc;
  font-size: 16px;
  transition: transform 0.15s, color 0.15s;
}
.cat-row.active .cat-arrow {
  color: #ff4b2b;
  transform: translateX(3px);
}
/* 悬停面板：绝对定位在菜单右侧，顶部跟随悬停行 */
.cat-flyout {
  position: absolute;
  left: 232px;
  z-index: 50;
  width: 520px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.16);
  padding: 16px 18px;
}
.fly-head {
  font-size: 15px;
  font-weight: 700;
  color: #ff4b2b;
  padding-bottom: 10px;
  border-bottom: 1px solid #f2f2f2;
  margin-bottom: 12px;
}
.fly-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.fly-chip {
  font-size: 13px;
  color: #555;
  background: #f5f5f5;
  border-radius: 14px;
  padding: 5px 14px;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.fly-chip:hover {
  background: #ffe3dc;
  color: #ff4b2b;
}
.fly-empty {
  font-size: 13px;
  color: #bbb;
}
.fly-all {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  color: #ff4b2b;
  text-decoration: none;
}
.fly-all:hover {
  text-decoration: underline;
}
/* 面板展开/收起过渡 */
.fly-enter-active,
.fly-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fly-enter-from,
.fly-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
.hero-right {
  flex: 1;
  min-width: 0;
}
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
/* 热卖榜单：卡片左上角销量排名角标（前三名红色） */
.hot-item {
  position: relative;
}
.rank-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #c0c4cc;
}
.rank-badge.top {
  background: linear-gradient(135deg, #ff6034, #ff4b2b);
}
/* 品牌精选：横向品牌墙 */
.brand-wall {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.brand-card {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px 10px 10px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.brand-card:hover {
  border-color: #ff4b2b;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}
.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  background: #f5f5f5;
}
.brand-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #ff4b2b;
  background: #fff3f0;
}
.brand-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.p-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}
.load-status {
  min-height: 48px;
  margin-top: 16px;
}
.status-text {
  text-align: center;
  font-size: 13px;
  color: #999;
}
</style>
