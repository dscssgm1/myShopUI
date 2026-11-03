import { fetchRegionPublicTree } from '../api/config'

let cache = null
let pending = null

/**
 * 公开区域树（省/市/县三级），全部地址表单共用一次请求。
 * 加载失败返回空数组，不阻塞表单（保存时另有必选校验）。
 */
export function loadRegionTree() {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = fetchRegionPublicTree({ silent: true })
      .then((res) => {
        cache = res.data || []
        return cache
      })
      .catch(() => {
        pending = null
        return []
      })
  }
  return pending
}

/** 按 cascader 路径取区域名（省 市 县区），两级叶子（如东莞市）自动缺省县 */
export function regionNamesByPath(tree, pathIds) {
  const names = []
  let nodes = tree || []
  for (const id of pathIds || []) {
    const hit = nodes.find((n) => n.id === id)
    if (!hit) break
    names.push(hit.name)
    nodes = hit.children || []
  }
  return names
}

/** 解析存量地址文本：按空格逐级匹配省/市/县，剩余部分作为详细地址 */
export function parseAddressText(tree, address) {
  const tokens = String(address || '').trim().split(/\s+/)
  const path = []
  let nodes = tree || []
  let i = 0
  while (i < tokens.length && nodes.length) {
    const hit = nodes.find((n) => n.name === tokens[i] && n.level === path.length + 1)
    if (!hit) break
    path.push(hit.id)
    nodes = hit.children || []
    i++
  }
  return { path, detail: tokens.slice(i).join(' ') }
}

/** 路径 + 详细地址拼成完整地址文本（空格分隔） */
export function composeAddress(tree, pathIds, detail) {
  return [...regionNamesByPath(tree, pathIds), String(detail || '').trim()]
    .filter(Boolean)
    .join(' ')
}
