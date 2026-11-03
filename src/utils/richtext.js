/**
 * 富文本工具：商家填写的商品详情 HTML 在买家端渲染前做一次轻量清洗，
 * 去掉脚本/样式/内嵌框架与事件属性，避免存储型 XSS。
 */

const BLOCK_TAGS = 'script|style|iframe|object|embed|form|link|meta'

export function sanitizeRichText(html) {
  if (!html) return ''
  return String(html)
    .replace(new RegExp(`<\\s*(${BLOCK_TAGS})[^>]*>[\\s\\S]*?<\\s*/\\s*\\1\\s*>`, 'gi'), '')
    .replace(new RegExp(`<\\s*/?\\s*(${BLOCK_TAGS})[^>]*>`, 'gi'), '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')?\s*(javascript|vbscript):[^"'>]*("|')?/gi, '')
}

/** 纯文本转安全 HTML 段落（存量商品描述兜底展示用） */
export function textToParagraph(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = String(text)
  return `<p>${div.innerHTML}</p>`
}
