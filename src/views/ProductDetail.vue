<template>
  <div v-if="product" class="detail">
    <!-- 商品主区 -->
    <div class="main-box">
      <div class="gallery">
        <div class="big-img" :style="gallery.length ? {} : { background: product.color }">
          <img v-if="gallery.length" :src="gallery[currentImg]" class="big-photo" alt="" />
          <span v-else>{{ product.emoji }}</span>
        </div>
        <div class="thumbs">
          <template v-if="gallery.length">
            <div
              v-for="(img, i) in gallery" :key="i"
              class="thumb" :class="{ active: currentImg === i }"
              @click="currentImg = i" @mouseenter="currentImg = i"
            >
              <img :src="img" class="thumb-photo" alt="" />
            </div>
          </template>
          <template v-else>
            <div v-for="i in 4" :key="i" class="thumb" :style="{ background: product.color }">{{ product.emoji }}</div>
          </template>
        </div>
      </div>

      <div class="info">
        <h2>{{ product.name }}</h2>
        <!-- 店铺/品牌分开显示，各自可点击（店铺→店铺页，品牌→按品牌筛选商品列表） -->
        <p class="shop">
          店铺：<span class="link" @click="$router.push(`/shop/${product.shopId}`)">🏪 {{ product.shopName || '自营' }}</span>
          <template v-if="product.brandName">
            <span class="sep">｜</span>
            品牌：<span class="link" @click="$router.push({ path: '/products', query: { brandId: product.brandId } })">{{ product.brandName }}</span>
          </template>
        </p>

        <div class="price-box">
          <div class="row">
            <span class="label">售价</span>
            <span v-if="bestPrice" class="origin-price">¥{{ displayPrice }}</span>
            <span class="price">¥{{ bestPrice ? bestPrice.finalPrice : displayPrice }}</span>
            <span v-if="bestPrice" class="price-tip">单件最低到手价</span>
          </div>
          <!-- 单件口径叠加的活动/券明细：券来自当前登录用户已领取的券 -->
          <div v-if="discountHits.length" class="row">
            <span class="label">优&nbsp;&nbsp;&nbsp;惠</span>
            <el-tag
              v-for="h in discountHits" :key="`${h.kind}-${h.id}`"
              size="small" :type="h.kind === 'coupon' ? 'warning' : 'danger'" effect="plain"
              style="margin-right: 6px"
            >{{ h.kind === 'coupon' ? '券' : '活动' }}「{{ h.title }}」-¥{{ h.amount }}</el-tag>
          </div>
          <div v-if="activityTags.length" class="row">
            <span class="label">促&nbsp;&nbsp;&nbsp;销</span>
            <el-tag v-for="t in activityTags" :key="t" size="small" type="danger" effect="dark" style="margin-right: 6px">{{ t }}</el-tag>
          </div>
          <!-- 本店在发优惠券：行内直接领取，领取后立即重算最低到手价 -->
          <ShopCoupons v-if="product.shopId" compact :shop-id="product.shopId" @claimed="loadBestPrice" />
        </div>

        <div class="meta">
          <span>销量 <b>{{ product.sales }}</b></span>
          <span>库存 <b>{{ product.stock }}</b></span>
          <span>评分 <b>★ {{ product.rating }}</b></span>
        </div>

        <!-- SKU 规格选择 -->
        <div v-if="specGroups.length" class="sku-box">
          <div v-for="group in specGroups" :key="group.name" class="sku-row">
            <span class="label">{{ group.name }}</span>
            <div class="sku-options">
              <span
                v-for="opt in group.options" :key="opt"
                class="sku-option"
                :class="{ active: selectedSpecs[group.name] === opt }"
                @click="selectSpec(group.name, opt)"
              >{{ opt }}</span>
            </div>
          </div>
          <p v-if="currentSku" class="sku-hint">
            已选：{{ selectedText }} ｜ 价格 ¥{{ currentSku.price }} ｜ 库存 {{ currentSku.stock }}
          </p>
          <p v-else class="sku-hint muted">请选择完整规格</p>
        </div>

        <div class="qty">
          <span class="label">数&nbsp;&nbsp;&nbsp;量</span>
          <el-input-number v-model="qty" :min="1" :max="maxQty" />
        </div>

        <div class="actions">
          <el-button type="danger" size="large" @click="buyNow">立即购买</el-button>
          <el-button type="primary" size="large" @click="addCart">🛒 加入购物车</el-button>
          <el-button size="large" @click="toggleFav">{{ fav ? '❤️ 已收藏' : '🤍 收藏' }}</el-button>
          <el-button size="large" @click="consult">🎧 咨询商家客服</el-button>
        </div>
      </div>
    </div>

    <!-- 详情 -->
    <div class="bottom">
      <el-tabs v-model="tab">
        <el-tab-pane label="商品详情" name="detail">
          <div v-if="detailHtml" class="rich-detail detail-rich" v-html="detailHtml"></div>
          <el-empty v-else :image-size="60" description="暂无详情" />
        </el-tab-pane>
        <el-tab-pane :label="`评价 (${reviewSummary.total || 0})`" name="reviews">
          <div class="review-box" v-loading="reviewLoading">
            <div class="review-summary">
              <div class="avg">
                <b>{{ reviewSummary.total ? reviewSummary.avgRating : '暂无' }}</b>
                <span v-if="reviewSummary.total" class="unit">分</span>
                <p class="cnt">共 {{ reviewSummary.total }} 条评价</p>
              </div>
              <div class="dist">
                <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="dist-row">
                  <span class="star-label">{{ star }} 星</span>
                  <el-progress
                    :percentage="starPercent(star)" :show-text="false"
                    :stroke-width="8" color="#ff9900"
                  />
                  <span class="star-count">{{ reviewSummary.distribution?.[star] || 0 }}</span>
                </div>
              </div>
            </div>

            <!-- 三维度均分：商品质量 / 服务态度 / 物流速度，立体呈现商家服务质量 -->
            <div class="dims-row">
              <div v-for="d in dimSummary" :key="d.label" class="dim-cell">
                <span class="dim-label">{{ d.label }}</span>
                <span class="dim-val">{{ d.value }} 分</span>
              </div>
            </div>

            <el-empty v-if="!reviews.length" description="暂无评价，购买并确认收货后即可评价" />
            <div v-for="r in reviews" :key="r.id" class="review-item">
              <div class="r-head">
                <b>{{ r.nickname || '匿名用户' }}</b>
                <el-rate :model-value="reviewOverall(r)" disabled size="small" allow-half />
                <el-button v-if="isMine(r)" link type="danger" size="small" class="r-del" @click="onDeleteReview(r)">删除</el-button>
                <span class="r-time">{{ formatTime(r.createdAt) }}</span>
              </div>
              <p class="r-dims">质量 {{ dimText(r.qualityRating) }} · 服务 {{ dimText(r.serviceRating) }} · 物流 {{ dimText(r.logisticsRating) }}</p>
              <p class="r-content">{{ r.content }}</p>
              <div v-if="r.images?.length" class="r-images">
                <el-image
                  v-for="(img, i) in r.images" :key="i"
                  :src="img" :preview-src-list="r.images" :initial-index="i"
                  fit="cover" preview-teleported class="r-thumb"
                />
              </div>
              <div v-if="r.reply" class="r-reply">
                <div class="r-reply-text"><b>商家回复：</b>{{ r.reply }}</div>
                <div v-if="r.replyAt" class="r-reply-time">{{ formatTime(r.replyAt) }}</div>
              </div>
            </div>

            <el-pagination
              v-if="reviewTotal > reviewSize"
              v-model:current-page="reviewPage" :page-size="reviewSize" :total="reviewTotal"
              layout="prev, pager, next" style="justify-content: center; margin-top: 16px"
              @current-change="loadReviews"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane label="规格参数" name="spec">
          <el-empty v-if="!specGroups.length" description="暂无规格参数" />
          <ul v-else class="spec-list">
            <li v-for="group in specGroups" :key="group.name">
              <b>{{ group.name }}：</b>{{ (group.options || []).join(' / ') }}
            </li>
          </ul>
        </el-tab-pane>
        <el-tab-pane label="服务保障" name="service">
          <ul class="spec-list">
            <li v-for="g in serviceGuarantees" :key="g.key">{{ g.icon }} {{ g.name }}</li>
          </ul>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
  <el-empty v-else-if="!loading" description="商品不存在" />
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { fetchProductDetail } from '../api/product'
import { fetchProductPrices, productActivityTags } from '../api/promotion'
import ShopCoupons from '../components/ShopCoupons.vue'
import { deleteReview, fetchProductReviews, fetchReviewSummary } from '../api/review'
import { useUserStore } from '../store/user'
import { fetchPublicConfig, parseConfigJson } from '../api/config'
import { addFavorite, fetchFavoriteExists, recordFootprint, removeFavorite } from '../api/user'
import { addToCart } from '../api/trade'
import { sanitizeRichText, textToParagraph } from '../utils/richtext'
import { openShopSession } from '../api/message'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const product = ref(null)
const loading = ref(false)
const qty = ref(1)
const tab = ref('detail')
const selectedSpecs = reactive({})
const reviews = ref([])
const reviewTotal = ref(0)
const reviewPage = ref(1)
const reviewSize = 5
const reviewLoading = ref(false)
const reviewSummary = ref({ total: 0, avgRating: 0, distribution: {} })
const fav = ref(false)

const specGroups = computed(() => product.value?.specs || [])
const skus = computed(() => product.value?.skus || [])

/** 商品详情富文本：优先 detail；存量商品回退到旧 description（转安全段落） */
const detailHtml = computed(() => {
  const p = product.value
  if (!p) return ''
  return sanitizeRichText(p.detail || textToParagraph(p.description))
})

// 促销行：商品参加的进行中活动标签（实时匹配，替代原商家维护的 tags）
const activityTags = ref([])

// ==================== 单件最低到手价 ====================
/** 按当前 SKU 单件价格计算的活动 + 券到手价；null = 无优惠或计算失败 */
const bestPrice = ref(null)
/** 请求序号：切换规格/商品过快时丢弃过期响应 */
let priceSeq = 0
const discountHits = computed(() => (bestPrice.value ? [
  ...(bestPrice.value.promotions || []).map((h) => ({ ...h, kind: 'promotion' })),
  ...(bestPrice.value.coupons || []).map((h) => ({ ...h, kind: 'coupon' }))
] : []))

// ==================== 服务保障 ====================
// 配置中心 service-guarantee 组（key → 名称/图标），商品按 key 关联展示
const DEFAULT_GUARANTEES = [
  { key: 'authentic-guarantee', name: '正品保障，假一赔十' },
  { key: 'seven-day-return', name: '7 天无理由退货' },
  { key: 'national-warranty', name: '全国联保，售后无忧' },
  { key: 'fast-delivery', name: '极速发货，物流全程可查' }
]
const guaranteeMap = ref({})

const serviceGuarantees = computed(() => {
  const keys = product.value?.serviceKeys
  if (keys?.length) {
    return keys
      .map((key) => guaranteeMap.value[key])
      .filter((g) => g && g.enabled !== false)
      .map((g) => ({ key: g.key, icon: g.icon || '✅', name: g.name }))
  }
  // 未选择服务保障的老商品回退到默认文案
  return DEFAULT_GUARANTEES.map((g) => ({ ...g, icon: '✅' }))
})

async function loadGuarantees() {
  try {
    const res = await fetchPublicConfig('service-guarantee')
    guaranteeMap.value = Object.fromEntries((res.data || []).map((item) => [
      item.key,
      { key: item.key, ...(parseConfigJson(item.value, {}) || {}) }
    ]))
  } catch { /* 解析失败时展示默认文案 */ }
}

// 无 SKU 时用商品自身价格与库存
const fallbackSku = computed(() => product.value ? {
  price: product.value.price,
  stock: product.value.stock
} : null)

const currentSku = computed(() => {
  if (!skus.value.length) return fallbackSku.value
  const keys = specGroups.value.map((g) => g.name)
  if (keys.some((k) => !selectedSpecs[k])) return null
  return skus.value.find((sku) =>
    keys.every((k) => String(sku.specs?.[k] ?? '') === String(selectedSpecs[k]))) || null
})

const displayPrice = computed(() =>
  currentSku.value?.price ?? product.value?.discountPrice ?? product.value?.price)
// 图集：优先图集，其次主图，都没有则回退 emoji 占位
const gallery = computed(() => {
  const imgs = product.value?.images || []
  if (imgs.length) return imgs
  return product.value?.coverImage ? [product.value.coverImage] : []
})
const currentImg = ref(0)
const maxQty = computed(() => Math.max(currentSku.value?.stock ?? 1, 1))
const selectedText = computed(() =>
  specGroups.value.map((g) => selectedSpecs[g.name]).filter(Boolean).join(' / '))

onMounted(() => {
  load()
  loadGuarantees()
  loadReviews()
})

watch(() => route.params.id, () => {
  reviewPage.value = 1
  load()
  loadReviews()
})

async function load() {
  loading.value = true
  activityTags.value = []
  bestPrice.value = null
  priceSeq++ // 作废切换商品前未返回的算价请求
  try {
    const res = await fetchProductDetail(route.params.id)
    product.value = res.data
    currentImg.value = 0
    productActivityTags(product.value).then((tags) => { activityTags.value = tags })
    Object.keys(selectedSpecs).forEach((k) => delete selectedSpecs[k])
    // 默认选中每组第一个选项
    ;(product.value?.specs || []).forEach((g) => {
      if (g.options?.length) selectedSpecs[g.name] = g.options[0]
    })
    qty.value = 1
    syncUserAsset()
    loadBestPrice()
  } catch {
    product.value = null
  } finally {
    loading.value = false
  }
}

/** 登录用户：记录浏览足迹并同步收藏状态 */
function syncUserAsset() {
  if (!localStorage.getItem('myshop_token') || !product.value) {
    fav.value = false
    return
  }
  recordFootprint(product.value.id).catch(() => {})
  fetchFavoriteExists(product.value.id)
    .then((res) => (fav.value = !!res.data))
    .catch(() => {})
}

function selectSpec(name, value) {
  selectedSpecs[name] = value
  qty.value = 1
  loadBestPrice()
}

/** 单件口径算价：当前 SKU 价格 + 进行中活动 + 登录用户已领且达门槛的券 */
async function loadBestPrice() {
  const p = product.value
  if (!p) {
    bestPrice.value = null
    return
  }
  // 与原售价展示保持同一取价口径（SKU 价 → 商家促销价 → 商品价）
  const unit = Number(currentSku.value?.price ?? p.discountPrice ?? p.price)
  if (!Number.isFinite(unit) || unit <= 0) {
    bestPrice.value = null
    return
  }
  const seq = ++priceSeq
  try {
    const res = await fetchProductPrices([{
      productId: p.id,
      categoryId: p.categoryId,
      shopId: p.shopId,
      price: unit,
      quantity: 1
    }])
    if (seq !== priceSeq) return
    const row = (res.data || [])[0]
    // 没有优惠时保持原有售价展示，不留「最低价 = 原价」的冗余划线
    bestPrice.value = row && Number(row.finalPrice) < unit ? row : null
  } catch {
    if (seq === priceSeq) bestPrice.value = null
  }
}

function requireLogin() {
  if (!localStorage.getItem('myshop_token')) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return false
  }
  return true
}

async function addCart() {
  if (!requireLogin()) return
  if (!currentSku.value) {
    ElMessage.warning('请先选择完整规格')
    return
  }
  try {
    await addToCart(product.value.id, qty.value, currentSku.value.id && currentSku.value.id > 0
      ? currentSku.value.id : null)
    ElMessage.success('已加入购物车')
  } catch { /* ignore */ }
}

function buyNow() {
  if (!requireLogin()) return
  if (!currentSku.value) {
    ElMessage.warning('请先选择完整规格')
    return
  }
  const items = [{
    productId: product.value.id,
    skuId: currentSku.value.id || null,
    quantity: qty.value,
    name: product.value.name,
    emoji: product.value.emoji,
    color: product.value.color,
    coverImage: product.value.coverImage,
    price: currentSku.value.price,
    skuSpecs: selectedText.value,
    shopName: product.value.shopName
  }]
  sessionStorage.setItem('ms_checkout_items', JSON.stringify(items))
  router.push('/checkout')
}

async function consult() {
  if (!requireLogin()) return
  try {
    const res = await openShopSession(product.value.shopId, product.value.shopName, product.value.emoji)
    router.push(`/user/messages/${res.data.session.id}`)
  } catch { /* ignore */ }
}

async function toggleFav() {
  if (!requireLogin()) return
  try {
    if (fav.value) {
      await removeFavorite(product.value.id)
      fav.value = false
      ElMessage.success('已取消收藏')
    } else {
      await addFavorite(product.value.id)
      fav.value = true
      ElMessage.success('已收藏')
    }
  } catch { /* ignore */ }
}

async function loadReviews() {
  reviewLoading.value = true
  try {
    const [listRes, summaryRes] = await Promise.all([
      fetchProductReviews(route.params.id, { page: reviewPage.value, size: reviewSize }),
      fetchReviewSummary(route.params.id)
    ])
    reviews.value = listRes.data?.list || []
    reviewTotal.value = listRes.data?.total || 0
    reviewSummary.value = summaryRes.data || { total: 0, avgRating: 0, distribution: {} }
  } catch {
    reviews.value = []
  } finally {
    reviewLoading.value = false
  }
}

function starPercent(star) {
  const total = reviewSummary.value.total || 0
  if (!total) return 0
  return Math.round(((reviewSummary.value.distribution?.[star] || 0) / total) * 100)
}

/** 三维度均分展示（后端未返回时回退综合均分） */
const dimSummary = computed(() => {
  const s = reviewSummary.value
  return [
    { label: '商品质量', value: s.avgQuality ?? s.avgRating },
    { label: '服务态度', value: s.avgService ?? s.avgRating },
    { label: '物流速度', value: s.avgLogistics ?? s.avgRating }
  ]
})

/** 单条评价综合分 = 三维度平均（半星），无维度数据时回退原综合分 */
const reviewOverall = (r) => {
  const dims = [r.qualityRating, r.serviceRating, r.logisticsRating].filter((v) => v != null)
  if (!dims.length) return r.rating
  return (dims.reduce((sum, v) => sum + Number(v), 0) / dims.length).toFixed(1)
}
const dimText = (v) => (v != null ? Number(v) : '-')

/** 是否本人的评价：只有本人才能删除 */
const isMine = (r) => !!userStore.user?.id && Number(r.userId) === Number(userStore.user.id)

/** 删除自己的评价：扣回奖励积分，删除后不可再评价该商品 */
async function onDeleteReview(r) {
  try {
    await ElMessageBox.confirm(
      '删除后评价不再展示，已发放的评价奖励积分将被扣回，且不能再次评价该商品。确认删除？',
      '删除评价',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
  } catch {
    return // 用户取消
  }
  try {
    await deleteReview(r.id)
    ElMessage.success('评价已删除')
    loadReviews()
    // 商品评分随之变化，定向刷新商品详情（保留已选规格）
    fetchProductDetail(route.params.id).then((res) => {
      if (res.data) product.value = res.data
    }).catch(() => {})
  } catch {
    // 失败提示由请求拦截器统一弹出
  }
}

const formatTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '')
</script>

<style scoped>
.detail {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
}
.main-box {
  display: flex;
  gap: 32px;
}
.gallery {
  width: 380px;
  flex-shrink: 0;
}
.big-img {
  height: 340px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120px;
}
.thumbs {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.thumb {
  width: 76px;
  height: 76px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  cursor: pointer;
  opacity: 0.7;
}
.thumb:hover {
  opacity: 1;
}
.big-photo,
.thumb-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.thumb.active {
  outline: 2px solid #ff4b2b;
}
.info {
  flex: 1;
  min-width: 0;
}
.info h2 {
  font-size: 20px;
  line-height: 1.5;
}
.shop {
  color: #999;
  font-size: 13px;
  margin: 8px 0 16px;
}
.shop .sep {
  margin: 0 10px;
  color: #ddd;
}
/* 可点击的店铺/品牌：手型光标 + 悬停变色提示 */
.shop .link {
  color: #396afc;
  cursor: pointer;
}
.shop .link:hover {
  color: #ff4b2b;
  text-decoration: underline;
}
.price-box {
  background: #fff5f3;
  border-radius: 8px;
  padding: 16px;
}
.price-box .row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.price-box .row:last-child {
  margin-bottom: 0;
}
.label {
  color: #999;
  font-size: 13px;
  margin-right: 14px;
  white-space: nowrap;
}
.price {
  color: #ff4b2b;
  font-size: 28px;
  font-weight: 700;
}
.origin-price {
  color: #bbb;
  font-size: 15px;
  text-decoration: line-through;
  margin-right: 8px;
}
.price-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #ff4b2b;
  background: #ffece6;
  border-radius: 10px;
  padding: 2px 8px;
}
.meta {
  display: flex;
  gap: 40px;
  color: #999;
  font-size: 13px;
  margin: 18px 0;
}
.meta b {
  color: #ff4b2b;
}
.sku-box {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.sku-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.sku-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sku-option {
  padding: 5px 14px;
  border: 1px solid #ddd;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
}
.sku-option:hover {
  border-color: #ff4b2b;
  color: #ff4b2b;
}
.sku-option.active {
  border-color: #ff4b2b;
  background: #ff4b2b;
  color: #fff;
}
.sku-hint {
  font-size: 13px;
  color: #666;
}
.sku-hint.muted {
  color: #bbb;
}
.qty {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.actions {
  display: flex;
  gap: 14px;
  margin-bottom: 18px;
}
.bottom {
  margin-top: 28px;
  border-top: 1px solid #eee;
}
.detail-rich {
  padding: 6px 0;
}
.spec-list li {
  line-height: 2;
  color: #666;
}
.review-box {
  padding: 4px 0;
}
.review-summary {
  display: flex;
  gap: 48px;
  align-items: center;
  background: #fafafa;
  border-radius: 10px;
  padding: 18px 24px;
  margin-bottom: 16px;
}
.review-summary .avg {
  text-align: center;
  min-width: 110px;
}
.review-summary .avg b {
  font-size: 40px;
  color: #ff9900;
}
.review-summary .unit {
  color: #ff9900;
  margin-left: 2px;
}
.review-summary .cnt {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.dist {
  flex: 1;
  max-width: 420px;
}
.dist-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
}
.star-label {
  width: 32px;
}
.dist-row :deep(.el-progress) {
  flex: 1;
}
.star-count {
  width: 30px;
  text-align: right;
  color: #999;
}
.dims-row {
  display: flex;
  justify-content: center;
  gap: 56px;
  background: #fafafa;
  border-radius: 10px;
  padding: 14px 24px;
  margin-bottom: 16px;
}
.dim-cell {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.dim-label {
  font-size: 13px;
  color: #999;
}
.dim-val {
  color: #ff9900;
  font-size: 18px;
  font-weight: 700;
}
.r-dims {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}
.review-item {
  padding: 14px 4px;
  border-bottom: 1px solid #f2f2f2;
}
.r-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.r-time {
  margin-left: auto;
  color: #bbb;
  font-size: 12px;
}
.r-del {
  padding: 0;
  font-size: 12px;
}
.r-content {
  margin-top: 8px;
  color: #444;
  line-height: 1.8;
  font-size: 14px;
}
.r-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.r-thumb {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  cursor: pointer;
}
.r-reply {
  margin-top: 10px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 6px;
}
.r-reply-text {
  font-size: 13px;
  color: #555;
  line-height: 1.7;
  word-break: break-word;
}
.r-reply-time {
  margin-top: 4px;
  font-size: 12px;
  color: #bbb;
  text-align: right;
}
</style>
