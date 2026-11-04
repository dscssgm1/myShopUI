import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './styles/rich-detail.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { useUserStore } from './store/user'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

/**
 * v-perm：按钮级权限显隐（角色管理「配置菜单」里勾选才可见）。
 * 支持单 key 或 key 数组（任一命中即显示）；元素在挂载时判定，权限变更后刷新页面生效。
 */
app.directive('perm', {
  mounted(el, binding) {
    const store = useUserStore(pinia)
    const keys = Array.isArray(binding.value) ? binding.value : [binding.value]
    if (!keys.some((k) => store.perms.includes(k))) {
      el.parentNode?.removeChild(el)
    }
  }
})

app.mount('#app')
