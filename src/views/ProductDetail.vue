<template>
  <div v-if="product" class="detail">
    <!-- 商品主区 -->
    <div class="main-box">
      <div class="gallery">
        <div class="big-img" :style="{ background: product.color }">{{ product.emoji }}</div>
        <div class="thumbs">
          <div v-for="i in 4" :key="i" class="thumb" :style="{ background: product.color }">{{ product.emoji }}</div>
        </div>
      </div>

      <div class="info">
        <h2>{{ product.name }}</h2>
        <p class="shop" @click="$router.push(`/shop/${product.shopId}`)">
          🏪 {{ product.shopName || '自营' }}
          <span v-if="product.brandName" class="brand">· {{ product.brandName }}</span>
        </p>

        <div class="price-box">
          <div class="row">
            <span class="label">售价</span>
            <span class="price">¥{{ displayPrice }}</span>
            <span v-if="product.originPrice" class="origin">¥{{ product.originPrice }}</span>
          </div>
          <div v-if="(product.tags || []).length" class="row">
            <span class="label">促&nbsp;&nbsp;&nbsp;销</span>
            <el-tag v-for="t in product.tags" :key="t" size="small" type="danger" effect="dark" style="margin-right: 6px">{{ t }}</el-tag>
          </div>
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
          <el-button size="large" @click="notReady('收藏')">🤍 收藏</el-button>
        </div>

        <p class="desc">{{ product.description }}</p>
      </div>
    </div>

    <!-- 详情 -->
    <div class="bottom">
      <el-tabs v-model="tab">
        <el-tab-pane label="商品详情" name="detail">
          <p class="desc-full">{{ product.description || '暂无详情' }}</p>
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
            <li>✅ 正品保障，假一赔十</li>
            <li>✅ 7 天无理由退货</li>
            <li>✅ 全国联保，售后无忧</li>
            <li>✅ 极速发货，物流全程可查</li>
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
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { fetchProductDetail } from '../api/product'
import { addToCart } from '../api/trade'

const route = useRoute()
const router = useRouter()
const product = ref(null)
const loading = ref(false)
const qty = ref(1)
const tab = ref('detail')
const selectedSpecs = reactive({})

const specGroups = computed(() => product.value?.specs || [])
const skus = computed(() => product.value?.skus || [])

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
const maxQty = computed(() => Math.max(currentSku.value?.stock ?? 1, 1))
const selectedText = computed(() =>
  specGroups.value.map((g) => selectedSpecs[g.name]).filter(Boolean).join(' / '))

onMounted(load)

watch(() => route.params.id, load)

async function load() {
  loading.value = true
  try {
    const res = await fetchProductDetail(route.params.id)
    product.value = res.data
    Object.keys(selectedSpecs).forEach((k) => delete selectedSpecs[k])
    // 默认选中每组第一个选项
    ;(product.value?.specs || []).forEach((g) => {
      if (g.options?.length) selectedSpecs[g.name] = g.options[0]
    })
    qty.value = 1
  } catch {
    product.value = null
  } finally {
    loading.value = false
  }
}

function selectSpec(name, value) {
  selectedSpecs[name] = value
  qty.value = 1
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
    price: currentSku.value.price,
    skuSpecs: selectedText.value,
    shopName: product.value.shopName
  }]
  sessionStorage.setItem('ms_checkout_items', JSON.stringify(items))
  router.push('/checkout')
}

function notReady(action) {
  ElMessage.info(`${action}功能开发中`)
}
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
.brand {
  color: #396afc;
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
.origin {
  color: #bbb;
  text-decoration: line-through;
  margin-left: 10px;
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
.desc {
  color: #666;
  font-size: 14px;
  line-height: 1.8;
  border-top: 1px dashed #eee;
  padding-top: 14px;
}
.bottom {
  margin-top: 28px;
  border-top: 1px solid #eee;
}
.desc-full {
  color: #666;
  line-height: 2;
}
.spec-list li {
  line-height: 2;
  color: #666;
}
</style>
