import { fetchProductPrices } from '../api/promotion'

/**
 * 批量给商品对象挂上「单件最低到手价」字段：
 * - finalPrice / promotionDiscount / couponDiscount
 * - priceHits：参与的活动与券明细（含 kind: 'promotion' | 'coupon'），商品卡直接展示
 *
 * 按后端单件口径计算（活动 + 登录用户满足门槛的券），与结算页同一套引擎。
 * 接口失败时静默返回，商品照常按原价展示。
 */
export async function attachProductPrices(products) {
  const list = (products || []).filter((p) => p && p.id)
  if (!list.length) return

  // 同一商品可能在多个板块出现，只算一次
  const unique = new Map()
  list.forEach((p) => {
    if (!unique.has(p.id)) unique.set(p.id, p)
  })
  const items = [...unique.values()]
    .map((p) => ({
      productId: p.id,
      categoryId: p.categoryId ?? null,
      shopId: p.shopId ?? null,
      price: Number(p.price),
      quantity: 1
    }))
    .filter((i) => Number.isFinite(i.price) && i.price > 0)
  if (!items.length) return

  let rows
  try {
    rows = (await fetchProductPrices(items)).data || []
  } catch {
    return
  }
  const byId = new Map(rows.map((r) => [r.productId, r]))
  list.forEach((p) => {
    const row = byId.get(p.id)
    if (!row) return
    p.finalPrice = row.finalPrice
    p.promotionDiscount = row.promotionDiscount
    p.couponDiscount = row.couponDiscount
    p.priceHits = [
      ...(row.promotions || []).map((h) => ({ ...h, kind: 'promotion' })),
      ...(row.coupons || []).map((h) => ({ ...h, kind: 'coupon' }))
    ]
  })
}

/**
 * 商品实际展示价：原价、商家促销价、引擎最低价三者取低。
 * 与后端算价口径无关，仅用于避免「折扣价反而比现有展示价高」。
 */
export function bestDisplayPrice(product) {
  if (!product) return 0
  const values = [Number(product.price)]
  if (product.discountPrice != null && product.discountPrice !== '') {
    values.push(Number(product.discountPrice))
  }
  if (product.finalPrice != null && product.finalPrice !== '') {
    values.push(Number(product.finalPrice))
  }
  const valid = values.filter((v) => Number.isFinite(v))
  return valid.length ? Math.min(...valid) : 0
}
