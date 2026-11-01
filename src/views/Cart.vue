<template>
  <div class="cart-page">
    <h3>🛒 我的购物车 <span class="sub">共 {{ cart.items?.length || 0 }} 种商品 · {{ shopGroups.length }} 个店铺</span></h3>

    <el-empty v-if="!cart.items?.length" description="购物车还是空的，快去逛逛吧">
      <el-button type="primary" @click="$router.push('/products')">去逛逛</el-button>
    </el-empty>

    <template v-else>
      <!-- 按店铺分组 -->
      <div v-for="group in shopGroups" :key="group.shopId" class="shop-group">
        <div class="shop-head">
          <el-checkbox
            :model-value="group.items.every((i) => selected.includes(i.id))"
            :indeterminate="group.items.some((i) => selected.includes(i.id)) && !group.items.every((i) => selected.includes(i.id))"
            @change="toggleShop(group)"
          />
          <span class="shop-name">🏪 {{ group.shopName || '自营' }}</span>
          <span class="shop-count">{{ group.items.length }} 件商品</span>
          <span class="shop-tip">下单后本店铺单独生成订单</span>
        </div>

        <div v-for="row in group.items" :key="row.id" class="item-row">
          <el-checkbox v-model="selected" :value="row.id" />
          <div class="g-img" :style="{ background: row.color }" @click="$router.push(`/product/${row.productId}`)">
            {{ row.emoji }}
          </div>
          <div class="g-info">
            <div class="g-name">{{ row.productName }}</div>
            <div v-if="row.skuSpecs" class="g-sku">{{ row.skuSpecs }}</div>
          </div>
          <div class="g-price">¥{{ row.price }}</div>
          <el-input-number
            :model-value="row.quantity" :min="1" :max="row.stock || 99" size="small"
            @change="(v) => changeQty(row, v)"
          />
          <div class="g-sub">¥{{ row.subtotal }}</div>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </div>
      </div>

      <div class="cart-foot">
        <div class="left">
          <el-checkbox :model-value="allSelected" @change="toggleAll">全选</el-checkbox>
          <el-button link type="danger" @click="clearAll">清空购物车</el-button>
        </div>
        <div class="right">
          <span>已选 <b>{{ selectedItems.length }}</b> 件，来自 <b>{{ selectedShops.length }}</b> 个店铺</span>
          <span class="total">¥{{ selectedTotal }}</span>
          <el-button type="danger" size="large" :disabled="!selectedItems.length" @click="checkout">去结算</el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { clearCart, fetchCart, removeCartItem, updateCartItem } from '../api/trade'

const router = useRouter()
const cart = ref({ items: [], totalQuantity: 0, totalAmount: 0 })
const selected = ref([])

const shopGroups = computed(() => {
  const map = new Map()
  for (const item of cart.value.items || []) {
    const key = item.shopId ?? 0
    if (!map.has(key)) {
      map.set(key, { shopId: key, shopName: item.shopName, items: [] })
    }
    map.get(key).items.push(item)
  }
  return [...map.values()]
})

const selectedItems = computed(() => cart.value.items.filter((i) => selected.value.includes(i.id)))
const selectedShops = computed(() => new Set(selectedItems.value.map((i) => i.shopId)))
const selectedTotal = computed(() =>
  selectedItems.value.reduce((n, i) => n + Number(i.subtotal), 0).toFixed(2))
const allSelected = computed(() =>
  cart.value.items.length > 0 && selected.value.length === cart.value.items.length)

onMounted(load)

async function load() {
  try {
    const res = await fetchCart()
    cart.value = res.data || { items: [] }
    selected.value = cart.value.items.map((i) => i.id)
  } catch { /* ignore */ }
}

function toggleShop(group) {
  const ids = group.items.map((i) => i.id)
  const all = ids.every((id) => selected.value.includes(id))
  selected.value = all
    ? selected.value.filter((id) => !ids.includes(id))
    : [...new Set([...selected.value, ...ids])]
}

async function changeQty(row, quantity) {
  try {
    const res = await updateCartItem(row.id, quantity)
    cart.value = res.data
  } catch { /* ignore */ }
}

async function remove(row) {
  try {
    const res = await removeCartItem(row.id)
    cart.value = res.data
    selected.value = selected.value.filter((id) => id !== row.id)
  } catch { /* ignore */ }
}

function toggleAll() {
  selected.value = allSelected.value ? [] : cart.value.items.map((i) => i.id)
}

function clearAll() {
  ElMessageBox.confirm('确定清空购物车吗？', '提示', { type: 'warning' }).then(async () => {
    await clearCart()
    await load()
    ElMessage.success('已清空')
  })
}

function checkout() {
  const items = selectedItems.value.map((i) => ({
    productId: i.productId,
    skuId: i.skuId || null,
    quantity: i.quantity,
    name: i.productName,
    emoji: i.emoji,
    color: i.color,
    price: i.price,
    skuSpecs: i.skuSpecs,
    shopName: i.shopName
  }))
  sessionStorage.setItem('ms_checkout_items', JSON.stringify(items))
  router.push('/checkout')
}
</script>

<style scoped>
.cart-page {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  min-height: 50vh;
}
h3 {
  margin-bottom: 16px;
}
.sub {
  font-size: 13px;
  color: #999;
  font-weight: 400;
}
.shop-group {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  margin-bottom: 14px;
  overflow: hidden;
}
.shop-head {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fafafa;
  padding: 10px 16px;
}
.shop-name {
  font-weight: 600;
  font-size: 14px;
}
.shop-count {
  font-size: 12px;
  color: #999;
}
.shop-tip {
  margin-left: auto;
  font-size: 12px;
  color: #ff4b2b;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-top: 1px dashed #f0f0f0;
}
.g-img {
  width: 62px;
  height: 62px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
  cursor: pointer;
}
.g-info {
  flex: 1;
  min-width: 0;
}
.g-name {
  font-size: 14px;
}
.g-sku {
  font-size: 12px;
  color: #396afc;
  margin-top: 3px;
}
.g-price {
  width: 90px;
  color: #666;
}
.g-sub {
  width: 100px;
  text-align: right;
  color: #ff4b2b;
  font-weight: 600;
}
.cart-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 8px 0;
}
.cart-foot .left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.cart-foot .right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.cart-foot b {
  color: #ff4b2b;
}
.total {
  color: #ff4b2b;
  font-size: 24px;
  font-weight: 700;
}
</style>
