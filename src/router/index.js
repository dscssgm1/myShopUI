import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../layouts/MallLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('../views/Home.vue') },
        { path: 'products', name: 'products', component: () => import('../views/ProductList.vue') },
        { path: 'product/:id', name: 'product-detail', component: () => import('../views/ProductDetail.vue') },
        { path: 'shop/:id', name: 'shop', component: () => import('../views/Shop.vue') },
        { path: 'cart', name: 'cart', component: () => import('../views/Cart.vue'), meta: { auth: true } },
        { path: 'checkout', name: 'checkout', component: () => import('../views/Checkout.vue'), meta: { auth: true } },
        { path: 'pay/:orderNo', name: 'pay', component: () => import('../views/Pay.vue'), meta: { auth: true } },
        { path: 'pay', name: 'pay-multi', component: () => import('../views/Pay.vue'), meta: { auth: true } },
        { path: 'user/orders', name: 'orders', component: () => import('../views/Orders.vue'), meta: { auth: true } }
      ]
    },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    { path: '/forgot', name: 'forgot', component: () => import('../views/ForgotPassword.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('myshop_token')
  if (to.meta.auth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router
