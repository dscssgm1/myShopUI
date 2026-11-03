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
        <span class="price">¥{{ displayPrice }}</span>
        <span class="sales">已售 {{ product.sales }}</span>
      </div>
    </div>
  </a>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  product: { type: Object, required: true },
  /** 大卡规格：首页使用，图片随宽度成正方形，文字同步放大 */
  large: { type: Boolean, default: false }
})
const displayPrice = computed(() => props.product.discountPrice || props.product.price)
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
.price {
  color: #ff4b2b;
  font-size: 18px;
  font-weight: 700;
}
.sales {
  margin-left: auto;
  font-size: 12px;
  color: #999;
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
.p-card.large .sales {
  font-size: 13px;
}
</style>
