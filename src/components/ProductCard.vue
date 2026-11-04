<template>
  <!-- 真实链接 + target=_blank：点击在新标签页打开商品详情，Ctrl/中键/右键新开也原生可用 -->
  <a class="p-card" :class="{ large }" :href="`/product/${product.id}`" target="_blank">
    <div class="p-img" :style="{ background: product.color }">
      <img v-if="product.coverImage" :src="product.coverImage" class="p-photo" alt="" />
      <span v-else>{{ product.emoji }}</span>
    </div>
    <div class="p-body">
      <div class="p-name">{{ product.name }}</div>
      <div class="p-foot">
        <div class="p-price">
          <span v-if="hasDiscount" class="origin">¥{{ listPrice }}</span>
          <span class="price">¥{{ shownPrice }}</span>
        </div>
        <span class="sales">已售 {{ product.sales }}</span>
      </div>
      <!-- 单件口径的优惠明细：活动 / 券，最多展示两条 -->
      <div v-if="discountTags.length" class="p-tags">
        <span v-for="t in discountTags" :key="t.key" class="p-tag" :class="t.kind">{{ t.text }}</span>
      </div>
    </div>
  </a>
</template>

<script setup>
import { computed } from 'vue'
import { bestDisplayPrice } from '../utils/productPrice'

const props = defineProps({
  product: { type: Object, required: true },
  /** 大卡规格：首页使用，图片随宽度成正方形，文字同步放大 */
  large: { type: Boolean, default: false }
})

/** 原价：列表价（划线展示） */
const listPrice = computed(() => Number(props.product.price))
/** 实际展示价：列表价 / 商家促销价 / 引擎单件最低价 取低 */
const shownPrice = computed(() => bestDisplayPrice(props.product))
const hasDiscount = computed(() => shownPrice.value < listPrice.value)
/** 展示价确实来自引擎算价时才挂活动/券标签，避免与商家促销价混用造成误解 */
const enginePriceUsed = computed(() => props.product.finalPrice != null
  && Math.abs(Number(props.product.finalPrice) - shownPrice.value) < 0.005)
const discountTags = computed(() => (enginePriceUsed.value ? (props.product.priceHits || []) : [])
  .slice(0, 2)
  .map((h) => ({
    key: `${h.kind}-${h.id}`,
    kind: h.kind,
    text: `${h.kind === 'coupon' ? '券' : '活动'}「${h.title}」-¥${h.amount}`
  })))
</script>

<style scoped>
.p-card {
  display: block;
  color: inherit;
  text-decoration: none;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.p-card:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}
.p-img {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
}
.p-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.p-body {
  padding: 10px 12px 12px;
}
.p-name {
  font-size: 14px;
  line-height: 1.4;
  height: 40px;
  margin-bottom: 6px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.p-foot {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.p-price {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
}
.origin {
  color: #bbb;
  font-size: 12px;
  text-decoration: line-through;
}
.price {
  color: #ff4b2b;
  font-size: 18px;
  font-weight: 700;
}
.sales {
  margin-left: auto;
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}
.p-tags {
  display: flex;
  gap: 4px;
  margin-top: 5px;
  overflow: hidden;
  white-space: nowrap;
}
.p-tag {
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 16px;
  color: #ff4b2b;
  background: #fff3f0;
  border-radius: 3px;
  padding: 0 4px;
}
.p-tag.coupon {
  color: #e6a23c;
  background: #fdf6ec;
}
/* 大卡规格（首页 5 列）：图片随卡片宽度成正方形，文字与价格同步放大 */
.p-card.large .p-img {
  height: auto;
  aspect-ratio: 1 / 1;
  font-size: 96px;
}
.p-card.large .p-body {
  padding: 14px 16px 16px;
}
.p-card.large .p-name {
  font-size: 17px;
  height: 48px;
}
.p-card.large .price {
  font-size: 24px;
}
.p-card.large .origin {
  font-size: 13px;
}
.p-card.large .sales {
  font-size: 13px;
}
.p-card.large .p-tags {
  margin-top: 7px;
}
.p-card.large .p-tag {
  font-size: 12px;
  line-height: 18px;
}
</style>
