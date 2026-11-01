<template>
  <div>
    <!-- 顶部工具栏 -->
    <div class="topbar">
      <div class="wrap">
        <div class="left">
          <template v-if="userStore.isLogin">
            <span class="hi">你好，{{ userStore.user.nickname || userStore.user.username }}</span>
            <a @click="logout">退出登录</a>
          </template>
          <template v-else>
            <router-link to="/login">请登录</router-link>
            <router-link to="/register" class="reg">免费注册</router-link>
          </template>
        </div>
        <div class="right">
          <span class="role">{{ roleLabel }}</span>
          <router-link to="/">首页</router-link>
          <router-link v-if="userStore.isLogin" to="/user/orders">我的订单</router-link>
        </div>
      </div>
    </div>

    <!-- 搜索头部 -->
    <div class="header">
      <div class="wrap">
        <router-link to="/" class="logo">🛒 myShop</router-link>
        <div class="search">
          <el-input
            v-model="keyword"
            size="large"
            placeholder="搜索商品，如：手机 / 苹果 / 耳机"
            @keyup.enter="goSearch"
          >
            <template #append>
              <el-button type="primary" @click="goSearch">搜索</el-button>
            </template>
          </el-input>
        </div>
        <el-badge :value="cartCount" :hidden="!cartCount">
          <el-button size="large" @click="goCart">🛍️ 购物车</el-button>
        </el-badge>
      </div>
    </div>

    <!-- 主导航：圆角胶囊 + 红线向下展开小类 -->
    <div class="nav" @mouseleave="hoverCat = null">
      <div class="wrap nav-row">
        <div
          v-for="c in categories"
          :key="c.id"
          class="cat-item"
          :class="{ active: isActiveCategory(c.id), hovered: hoverCat?.id === c.id }"
          @mouseenter="hoverCat = c"
        >
          <router-link class="cat-pill" :to="{ path: '/products', query: { categoryId: c.id } }">
            {{ c.icon }} {{ c.name }}
          </router-link>
        </div>
        <span class="promo-link">🎉 优惠活动</span>
      </div>

      <!-- 红线向下展开的面板 -->
      <div class="nav-panel" :class="{ open: !!hoverCat }">
        <div class="wrap panel-inner" v-if="hoverCat">
          <span class="panel-title">{{ hoverCat.icon }} {{ hoverCat.name }}</span>
          <span class="panel-divider" />
          <router-link
            v-for="s in hoverCat.children || []"
            :key="s.id"
            class="panel-chip"
            :to="{ path: '/products', query: { categoryId: hoverCat.id, subCategoryId: s.id } }"
          >{{ s.name }}</router-link>
          <router-link
            class="panel-chip all"
            :to="{ path: '/products', query: { categoryId: hoverCat.id } }"
          >全部 {{ hoverCat.name }} →</router-link>
        </div>
      </div>
    </div>

    <!-- 页面内容 -->
    <main class="main wrap">
      <router-view />
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="wrap">
        <p>myShop 电商购物平台</p>
        <p>用户端 / 商家端 / 物流端 / 管理端 一站式体验</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../store/user'
import { fetchCategoryTree } from '../api/product'
import { fetchCart } from '../api/trade'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const keyword = ref('')
const categories = ref([])
const hoverCat = ref(null)

const roleLabel = computed(() => {
  const role = userStore.user?.roleCode
  return {
    user: '买家', merchant: '商家', 'merchant-sales': '商家业务员', 'merchant-cs': '商家客服',
    logistics: '物流', 'logistics-ops': '物流调度', 'logistics-courier': '快递员',
    admin: '平台管理员', 'admin-sales': '平台业务员', 'admin-cs': '平台客服', 'admin-ops': '平台运维'
  }[role] || ''
})

const isActiveCategory = (id) => route.name === 'products' && String(route.query.categoryId) === String(id)

onMounted(() => {
  fetchCategoryTree()
    .then((res) => (categories.value = res.data || []))
    .catch(() => {})
})

function goSearch() {
  router.push({ path: '/products', query: keyword.value ? { keyword: keyword.value } : {} })
}

function logout() {
  userStore.logout()
  cartCount.value = 0
  router.push('/login')
}

function goCart() {
  if (!userStore.isLogin) {
    router.push({ path: '/login', query: { redirect: '/cart' } })
    return
  }
  router.push('/cart')
}

const cartCount = ref(0)

async function loadCartCount() {
  if (!userStore.isLogin) {
    cartCount.value = 0
    return
  }
  try {
    const res = await fetchCart()
    cartCount.value = res.data?.totalQuantity || 0
  } catch { cartCount.value = 0 }
}

onMounted(loadCartCount)
watch(() => route.fullPath, loadCartCount)
</script>

<style scoped>
.wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}
.topbar {
  background: #f0f2f5;
  font-size: 13px;
  color: #666;
}
.topbar .wrap {
  display: flex;
  justify-content: space-between;
  height: 36px;
  align-items: center;
}
.topbar a {
  margin-left: 16px;
  cursor: pointer;
}
.topbar a:hover {
  color: #ff4b2b;
}
.topbar .hi {
  color: #ff4b2b;
}
.topbar .reg {
  color: #ff4b2b;
}
.topbar .role {
  color: #396afc;
}
.header {
  background: #fff;
  padding: 18px 0;
}
.header .wrap {
  display: flex;
  align-items: center;
  gap: 40px;
}
.logo {
  font-size: 28px;
  font-weight: 700;
  color: #ff4b2b;
  white-space: nowrap;
}
.search {
  flex: 1;
}
.nav {
  background: #fff;
  border-bottom: 2px solid #ff4b2b;
  position: relative;
  z-index: 30;
}
.nav-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
  height: 58px;
}
.cat-pill {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 22px;
  font-size: 15px;
  color: #333;
  transition: background 0.18s, color 0.18s;
}
.cat-item.active .cat-pill {
  background: #ffe3dc;
  color: #ff4b2b;
  font-weight: 700;
}
.cat-item.hovered .cat-pill {
  background: #ff4b2b;
  color: #fff;
  font-weight: 700;
}
.nav-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ff4b2b;
  border-radius: 0 0 18px 18px;
  box-shadow: 0 14px 26px rgba(255, 75, 43, 0.3);
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.nav-panel.open {
  max-height: 120px;
}
.panel-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 16px;
}
.panel-title {
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
}
.panel-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.4);
}
.panel-chip {
  color: #fff;
  font-size: 13px;
  padding: 5px 15px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.2);
  white-space: nowrap;
  transition: background 0.15s;
}
.panel-chip:hover {
  background: rgba(255, 255, 255, 0.45);
}
.panel-chip.all {
  background: rgba(0, 0, 0, 0.18);
  margin-left: auto;
}
.promo-link {
  margin-left: auto;
  padding: 8px 4px;
  color: #ff4b2b;
  font-weight: 600;
}
.main {
  min-height: 60vh;
  padding-top: 16px;
  padding-bottom: 32px;
}
.footer {
  background: #2b2f36;
  color: #aaa;
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  line-height: 2;
}
</style>
