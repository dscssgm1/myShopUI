<template>
  <div class="p-card" @click="$router.push(`/product/${product.id}`)">
    <div class="p-img" :style="{ background: product.color }">
      <span>{{ product.emoji }}</span>
      <div class="p-tags">
        <i v-for="t in (product.tags || []).slice(0, 2)" :key="t">{{ t }}</i>
      </div>
    </div>
    <div class="p-body">
      <div class="p-name">{{ product.name }}</div>
      <div class="p-shop">🏪 {{ product.shopName || '自营' }}</div>
      <div class="p-foot">
        <span class="price">¥{{ displayPrice }}</span>
        <span v-if="product.originPrice" class="origin">¥{{ product.originPrice }}</span>
        <span class="sales">已售 {{ product.sales }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ product: { type: Object, required: true } })
const displayPrice = computed(() => props.product.discountPrice || props.product.price)
</script>

<style scoped>
.p-card {
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
  position: relative;
}
.p-tags {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 6px;
}
.p-tags i {
  font-style: normal;
  font-size: 11px;
  background: rgba(255, 75, 43, 0.92);
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
}
.p-body {
  padding: 10px 12px 12px;
}
.p-name {
  font-size: 14px;
  line-height: 1.4;
  height: 40px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.p-shop {
  font-size: 12px;
  color: #999;
  margin: 4px 0 6px;
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
.origin {
  color: #bbb;
  font-size: 12px;
  text-decoration: line-through;
}
.sales {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}
</style>
