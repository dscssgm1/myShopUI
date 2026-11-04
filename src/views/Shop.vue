<template>
  <div v-if="shop" class="shop-page">
    <div class="shop-head" :style="{ background: shop.color }">
      <div class="shop-logo">
        <img v-if="iconIsImage" :src="shop.icon" alt="" />
        <span v-else>{{ shop.icon || '🏪' }}</span>
      </div>
      <div class="shop-info">
        <div class="shop-name">{{ shop.name }}</div>
        <div class="shop-desc" :title="shop.description">{{ shop.description }}</div>
        <div class="shop-meta">
          <span>🏷️ {{ (shop.categories || []).join('、') || '综合' }}</span>
          <span>📍 {{ shop.region || '—' }}</span>
          <span>📦 累计销量 {{ shop.sales || 0 }}</span>
          <span>⭐ 店铺评分 {{ shop.rating != null ? shop.rating : '暂无评分' }}</span>
        </div>
      </div>
    </div>

    <!-- 店铺在发优惠券：可直接领取，领取后刷新本店商品的最低到手价 -->
    <ShopCoupons :shop-id="shop.id" @claimed="refreshGoodsPrices" />

    <!-- 资质公示：所有用户可见 -->
    <div v-if="shop.licenseNo" class="license-section">
      <div class="license-title">资质信息</div>
      <div class="license-body">
        <div class="license-rows">
          <div class="license-row"><span class="k">企业名称</span><span>{{ shop.name }}</span></div>
          <div class="license-row"><span class="k">法定代表人</span><span>{{ shop.legalPerson || '—' }}</span></div>
          <div class="license-row"><span class="k">经营许可证号</span><span>{{ shop.licenseNo }}</span></div>
          <div class="license-row"><span class="k">营业期限</span><span>{{ shop.businessTerm || '—' }}</span></div>
          <div class="license-row"><span class="k">注册地址</span><span>{{ shop.registeredAddress || '—' }}</span></div>
          <div class="license-row"><span class="k">经营范围</span><span>{{ shop.businessScope || '—' }}</span></div>
        </div>
        <el-image
          v-if="shop.licenseImage"
          :src="shop.licenseImage"
          :preview-src-list="[shop.licenseImage]"
          preview-teleported fit="cover" class="license-img"
        />
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import ShopCoupons from '../components/ShopCoupons.vue'
import { fetchShop, fetchShopProducts } from '../api/shop'
import { attachProductPrices } from '../utils/productPrice'

const route = useRoute()
const shop = ref(null)
const goods = ref([])
const total = ref(0)
const page = ref(1)
const size = 12
const loading = ref(false)

// 店铺标识：图片 URL 直接展示，旧 emoji 数据回退为文字
const iconIsImage = computed(() => /^https?:\/\/|^\//.test(shop.value?.icon || ''))

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

/** 领到新券后原地刷新商品价格（不重新拉商品列表） */
function refreshGoodsPrices() {
  attachProductPrices(goods.value)
}

async function loadGoods() {
  try {
    const res = await fetchShopProducts(route.params.id, page.value, size)
    goods.value = res.data?.list || []
    total.value = res.data?.total || 0
    // 本店商品同样展示单件最低到手价（失败静默，按原价展示）
    await attachProductPrices(goods.value)
  } catch { goods.value = []; total.value = 0 }
}
</script>

<style scoped>
.shop-page {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}
.license-section {
  margin: 0 36px;
  padding: 16px 0;
  border-top: 1px dashed #eee;
}
.license-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}
.license-body {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.license-rows {
  flex: 1;
  min-width: 0;
}
.license-row {
  display: flex;
  font-size: 13px;
  color: #666;
  line-height: 2;
}
.license-row .k {
  width: 96px;
  flex-shrink: 0;
  color: #999;
}
.license-img {
  width: 140px;
  height: 100px;
  border-radius: 8px;
  flex-shrink: 0;
  border: 1px solid #eee;
  cursor: zoom-in;
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
  overflow: hidden;
}
.shop-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.shop-info {
  flex: 1;
  min-width: 0;
}
.shop-name {
  font-size: 26px;
  font-weight: 700;
}
/* 简介超长时单行省略，悬停经 title 看全文，避免横幅被撑高 */
.shop-desc {
  font-size: 14px;
  opacity: 0.9;
  margin: 6px 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
