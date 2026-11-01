import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    { path: '/forgot', name: 'forgot', component: () => import('../views/ForgotPassword.vue') },
    { path: '/home', name: 'home', component: () => import('../views/Home.vue'), meta: { auth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('myshop_token')
  if (to.meta.auth && !token) {
    return { name: 'login' }
  }
  if (to.name === 'login' && token) {
    return { name: 'home' }
  }
})

export default router
