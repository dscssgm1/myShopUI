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
        { path: 'points-mall', name: 'points-mall', component: () => import('../views/PointsMall.vue') },
        { path: 'cart', name: 'cart', component: () => import('../views/Cart.vue'), meta: { auth: true } },
        { path: 'checkout', name: 'checkout', component: () => import('../views/Checkout.vue'), meta: { auth: true } },
        { path: 'pay/:orderNo', name: 'pay', component: () => import('../views/Pay.vue'), meta: { auth: true } },
        { path: 'pay', name: 'pay-multi', component: () => import('../views/Pay.vue'), meta: { auth: true } },
        // 个人中心：/user/* 统一包裹左侧导航布局
        {
          path: 'user',
          component: () => import('../layouts/UserCenterLayout.vue'),
          meta: { auth: true },
          children: [
            { path: '', redirect: { name: 'orders' } },
            { path: 'orders', name: 'orders', component: () => import('../views/Orders.vue') },
            { path: 'after-sales', name: 'after-sales', component: () => import('../views/user/AfterSales.vue') },
            { path: 'messages', name: 'messages', component: () => import('../views/MessageCenter.vue') },
            { path: 'messages/:id', name: 'chat', component: () => import('../views/Chat.vue') },
            { path: 'coupons', name: 'my-coupons', component: () => import('../views/user/MyCoupons.vue') },
            { path: 'favorites', name: 'favorites', component: () => import('../views/user/Favorites.vue') },
            { path: 'footprint', name: 'footprint', component: () => import('../views/user/Footprint.vue') },
            { path: 'reviews', name: 'my-reviews', component: () => import('../views/MyReviews.vue') },
            { path: 'address', name: 'address', component: () => import('../views/user/Address.vue') },
            { path: 'profile', name: 'profile', component: () => import('../views/user/Profile.vue') },
            { path: 'security', name: 'security', component: () => import('../views/user/Security.vue') },
            { path: 'security/verify', name: 'security-verify', component: () => import('../views/user/SecurityVerify.vue') },
            { path: 'security/devices', name: 'security-devices', component: () => import('../views/user/Devices.vue') },
            { path: 'security/password', name: 'security-password', component: () => import('../views/user/SecurityPassword.vue') },
            { path: 'security/email', name: 'security-email', component: () => import('../views/user/SecurityEmail.vue') },
            { path: 'bankcards', name: 'bankcards', component: () => import('../views/user/BankCards.vue') },
            { path: 'logistics-apply', name: 'logistics-apply', component: () => import('../views/LogisticsApply.vue') },
            { path: 'merchant-apply', name: 'merchant-apply', component: () => import('../views/user/MerchantApply.vue') },
            { path: 'more', name: 'more', component: () => import('../views/user/More.vue') }
          ]
        }
      ]
    },
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { auth: true, group: 'PLATFORM' },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('../views/admin/Dashboard.vue') },
        { path: 'orders', name: 'admin-orders', component: () => import('../views/admin/Orders.vue') },
        // 旧审核入口统一并入审核中心，旧地址重定向到对应 Tab
        { path: 'after-sales', redirect: { path: '/admin/audit', query: { tab: 'aftersale' } } },
        { path: 'products', name: 'admin-products', component: () => import('../views/admin/Products.vue') },
        { path: 'product-audit', redirect: { path: '/admin/audit', query: { tab: 'product' } } },
        { path: 'categories', name: 'admin-categories', component: () => import('../views/admin/Categories.vue') },
        { path: 'brands', name: 'admin-brands', component: () => import('../views/admin/Brands.vue') },
        { path: 'users', name: 'admin-users', component: () => import('../views/admin/Users.vue') },
        { path: 'shops', name: 'admin-shops', component: () => import('../views/admin/Shops.vue') },
        { path: 'promotions', name: 'admin-promotions', component: () => import('../views/admin/Promotions.vue') },
        { path: 'coupons', name: 'admin-coupons', component: () => import('../views/admin/Coupons.vue') },
        { path: 'companies', name: 'admin-companies', component: () => import('../views/admin/Companies.vue') },
        { path: 'dividend', name: 'admin-dividend', component: () => import('../views/admin/Dividend.vue') },
        { path: 'commission', name: 'admin-commission', component: () => import('../views/admin/Commission.vue') },
        { path: 'audit', name: 'admin-audit', component: () => import('../views/admin/Audit.vue') },
        { path: 'reviews', redirect: { path: '/admin/audit', query: { tab: 'review' } } },
        { path: 'config', name: 'admin-config', component: () => import('../views/admin/Config.vue') },
        { path: 'logs', name: 'admin-logs', component: () => import('../views/admin/Logs.vue') },
        {
          path: 'roles', name: 'admin-roles',
          component: () => import('../views/sys/RolesManage.vue'), props: { group: 'PLATFORM' }
        },
        {
          path: 'employees', name: 'admin-employees',
          component: () => import('../views/sys/StaffManage.vue'), props: { group: 'PLATFORM' }
        },
        {
          path: 'cs', name: 'admin-cs',
          component: () => import('../components/CsWorkbench.vue'),
          props: { platform: true }
        }
      ]
    },
    {
      path: '/merchant',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { auth: true, group: 'MERCHANT' },
      children: [
        { path: '', redirect: '/merchant/orders' },
        { path: 'shop', name: 'merchant-shop', component: () => import('../views/merchant/ShopInfo.vue') },
        { path: 'products', name: 'merchant-products', component: () => import('../views/merchant/Products.vue') },
        { path: 'specs', name: 'merchant-specs', component: () => import('../views/merchant/Specs.vue') },
        { path: 'orders', name: 'merchant-orders', component: () => import('../views/merchant/Orders.vue') },
        { path: 'bill', name: 'merchant-bill', component: () => import('../views/merchant/Bill.vue') },
        { path: 'marketing', name: 'merchant-marketing', component: () => import('../views/merchant/Marketing.vue') },
        { path: 'enrollment', name: 'merchant-enrollment', component: () => import('../views/merchant/Enrollment.vue') },
        { path: 'after-sales', name: 'merchant-after-sales', component: () => import('../views/merchant/AfterSales.vue') },
        { path: 'reviews', name: 'merchant-reviews', component: () => import('../views/merchant/Reviews.vue') },
        {
          path: 'roles', name: 'merchant-roles',
          component: () => import('../views/sys/RolesManage.vue'), props: { group: 'MERCHANT' }
        },
        {
          path: 'staff', name: 'merchant-staff',
          component: () => import('../views/sys/StaffManage.vue'), props: { group: 'MERCHANT' }
        },
        { path: 'cs', name: 'merchant-cs', component: () => import('../components/CsWorkbench.vue') }
      ]
    },
    {
      path: '/logistics',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { auth: true, group: 'LOGISTICS' },
      children: [
        { path: '', redirect: '/logistics/shipments' },
        { path: 'shipments', name: 'logistics-shipments', component: () => import('../views/logistics/Shipments.vue') },
        { path: 'couriers', name: 'logistics-couriers', component: () => import('../views/logistics/Couriers.vue') },
        { path: 'tasks', name: 'logistics-tasks', component: () => import('../views/logistics/Tasks.vue') },
        { path: 'dividend', name: 'logistics-dividend', component: () => import('../views/logistics/Dividend.vue') }
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
  const user = JSON.parse(localStorage.getItem('myshop_user') || 'null')
  if (to.meta.auth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.group && user?.groupCode !== to.meta.group) {
    return { name: 'home' }
  }
})

export default router
