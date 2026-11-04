import { fetchCategoryTree } from '../api/product'

/**
 * 「指定分类」下拉用的大类选项（分类树顶层），全局缓存一次。
 * 商品只挂在顶层大类上，所以券/活动的分类范围也只展示大类。
 */
let cache = null
let pending = null

export function loadTopCategories() {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = fetchCategoryTree({ silent: true })
      .then((res) => {
        cache = (res.data || []).map((c) => ({ id: c.id, name: c.name }))
        return cache
      })
      .catch(() => {
        pending = null
        return []
      })
  }
  return pending
}

/** 分类 ID → 名称；查不到的（如历史小类 id）回退显示 #id */
export function categoryNames(ids, options) {
  const map = new Map((options || []).map((c) => [Number(c.id), c.name]))
  return (ids || []).map((id) => map.get(Number(id)) || `#${id}`)
}
