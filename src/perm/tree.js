/**
 * 权限码目录：菜单/按钮树的唯一定义（前后端共用同一套 key）。
 *
 * - 菜单项：key 入库到 sys_role_menu 后该角色登录可见对应侧边菜单；
 *   后端接口用 AccessGuard.requirePerm(key) 做菜单级拦截。
 * - buttons：页面内关键操作按钮，同样入库勾选后可见；
 *   前端用 v-perm 指令控制显隐，后端写接口用 requirePerm 同步拦截。
 * - 共用端点（平台/商家同接口）在 requirePerm 里传多个 key（任一命中即通过）。
 *
 * 只有在角色管理里勾选了的菜单/按钮才对该角色可见（见 AdminLayout 与 v-perm）。
 */

export const PERM_TREE = {
  PLATFORM: [
    { key: 'admin:dashboard', title: '数据看板', path: '/admin', icon: '📊' },
    {
      key: 'admin:orders', title: '订单管理', path: '/admin/orders', icon: '📦',
      buttons: [{ key: 'admin:orders:ship', title: '订单发货' }]
    },
    {
      key: 'admin:products', title: '商品管理', path: '/admin/products', icon: '🛍️',
      buttons: [
        { key: 'admin:products:create', title: '新增商品' },
        { key: 'admin:products:edit', title: '编辑/补货' },
        { key: 'admin:products:status', title: '上架/下架' },
        { key: 'admin:products:delete', title: '删除商品' }
      ]
    },
    {
      key: 'admin:categories', title: '分类管理', path: '/admin/categories', icon: '🗂️',
      buttons: [
        { key: 'admin:categories:create', title: '新增分类' },
        { key: 'admin:categories:update', title: '编辑分类' },
        { key: 'admin:categories:delete', title: '删除分类' }
      ]
    },
    {
      key: 'admin:brands', title: '品牌管理', path: '/admin/brands', icon: '🏷️',
      buttons: [
        { key: 'admin:brands:create', title: '新增品牌' },
        { key: 'admin:brands:update', title: '编辑品牌' },
        { key: 'admin:brands:delete', title: '删除品牌' }
      ]
    },
    {
      key: 'admin:users', title: '用户管理', path: '/admin/users', icon: '👥',
      buttons: [
        { key: 'admin:users:status', title: '禁用/启用' },
        { key: 'admin:users:role', title: '调整角色' },
        { key: 'admin:users:session', title: '登录设备管理' }
      ]
    },
    {
      key: 'admin:shops', title: '商家管理', path: '/admin/shops', icon: '🏪',
      buttons: [{ key: 'admin:shops:status', title: '开业/关闭店铺' }]
    },
    {
      key: 'admin:promotions', title: '促销管理', path: '/admin/promotions', icon: '🎉',
      buttons: [
        { key: 'admin:promotions:create', title: '新建活动' },
        { key: 'admin:promotions:update', title: '编辑活动' },
        { key: 'admin:promotions:end', title: '结束活动' },
        { key: 'admin:promotions:delete', title: '删除活动' },
        { key: 'admin:promotions:enrollment', title: '报名审核' }
      ]
    },
    {
      key: 'admin:coupons', title: '优惠券', path: '/admin/coupons', icon: '🎫',
      buttons: [
        { key: 'admin:coupons:create', title: '新建券模板' },
        { key: 'admin:coupons:end', title: '结束发放' }
      ]
    },
    {
      key: 'admin:companies', title: '物流公司', path: '/admin/companies', icon: '🚚',
      buttons: [
        { key: 'admin:companies:create', title: '新增公司' },
        { key: 'admin:companies:update', title: '编辑公司' }
      ]
    },
    {
      key: 'admin:audit', title: '审核中心', path: '/admin/audit', icon: '✅', badge: true,
      buttons: [
        { key: 'admin:audit:product', title: '商品审核' },
        { key: 'admin:audit:shopApply', title: '入驻审核' },
        { key: 'admin:audit:record', title: '事务登记' },
        { key: 'admin:audit:review', title: '评价审核' },
        { key: 'admin:audit:aftersale', title: '售后仲裁' },
        { key: 'admin:audit:logistics-first', title: '物流入驻初审' },
        { key: 'admin:audit:logistics-final', title: '物流入驻终审' }
      ]
    },
    {
      key: 'admin:config', title: '运营配置', path: '/admin/config', icon: '⚙️',
      buttons: [
        { key: 'admin:config:save', title: '保存配置' },
        { key: 'admin:config:spec', title: '规格模板' },
        { key: 'admin:config:member', title: '会员等级' },
        { key: 'admin:config:region', title: '行政区划' }
      ]
    },
    {
      key: 'admin:dividend', title: '分红结算', path: '/admin/dividend', icon: '💰',
      buttons: [{ key: 'admin:dividend:adjust', title: '调整分红比例' }]
    },
    { key: 'admin:commission', title: '商品佣金', path: '/admin/commission', icon: '🧾' },
    { key: 'admin:logs', title: '系统日志', path: '/admin/logs', icon: '📜' },
    { key: 'admin:cs', title: '客服工作台', path: '/admin/cs', icon: '🛡️' },
    {
      key: 'admin:roles', title: '角色管理', path: '/admin/roles', icon: '🧩',
      buttons: [
        { key: 'admin:roles:save', title: '新建/编辑角色' },
        { key: 'admin:roles:delete', title: '删除角色' },
        { key: 'admin:roles:menus', title: '配置菜单权限' }
      ]
    },
    {
      key: 'admin:staff', title: '员工管理', path: '/admin/employees', icon: '🧑‍💼',
      buttons: [
        { key: 'admin:staff:create', title: '新增员工' },
        { key: 'admin:staff:update', title: '编辑员工' },
        { key: 'admin:staff:status', title: '禁用/启用' },
        { key: 'admin:staff:password', title: '重置密码' },
        { key: 'admin:staff:delete', title: '删除员工' }
      ]
    }
  ],
  MERCHANT: [
    {
      key: 'merchant:shop', title: '店铺信息', path: '/merchant/shop', icon: '🏪',
      buttons: [
        { key: 'merchant:shop:edit', title: '保存店铺信息' },
        { key: 'merchant:shop:apply', title: '提交入驻申请' }
      ]
    },
    {
      key: 'merchant:products', title: '商品管理', path: '/merchant/products', icon: '🛍️',
      buttons: [
        { key: 'merchant:products:create', title: '发布商品' },
        { key: 'merchant:products:edit', title: '编辑/补货' },
        { key: 'merchant:products:status', title: '上架/下架' },
        { key: 'merchant:products:price', title: '修改售价' },
        { key: 'merchant:products:delete', title: '删除商品' }
      ]
    },
    {
      key: 'merchant:specs', title: '我的规格', path: '/merchant/specs', icon: '🏷️',
      buttons: [
        { key: 'merchant:specs:create', title: '新建/绑定规格' },
        { key: 'merchant:specs:delete', title: '删除规格' }
      ]
    },
    {
      key: 'merchant:orders', title: '订单管理', path: '/merchant/orders', icon: '📦',
      buttons: [{ key: 'merchant:orders:ship', title: '订单发货' }]
    },
    {
      key: 'merchant:marketing', title: '店铺营销', path: '/merchant/marketing', icon: '🎪',
      buttons: [
        { key: 'merchant:marketing:promo-create', title: '新建促销活动' },
        { key: 'merchant:marketing:promo-update', title: '编辑促销活动' },
        { key: 'merchant:marketing:promo-end', title: '结束促销活动' },
        { key: 'merchant:marketing:coupon-create', title: '发券' },
        { key: 'merchant:marketing:coupon-end', title: '停止发券' }
      ]
    },
    {
      key: 'merchant:enrollment', title: '活动报名', path: '/merchant/enrollment', icon: '📝',
      buttons: [
        { key: 'merchant:enrollment:apply', title: '报名活动' },
        { key: 'merchant:enrollment:cancel', title: '撤销报名' }
      ]
    },
    { key: 'merchant:bill', title: '佣金账单', path: '/merchant/bill', icon: '🧾' },
    {
      key: 'merchant:after-sales', title: '售后管理', path: '/merchant/after-sales', icon: '🔄',
      buttons: [
        { key: 'merchant:after-sales:review', title: '售后审核' },
        { key: 'merchant:after-sales:refund', title: '执行退款' },
        { key: 'merchant:after-sales:appeal', title: '发起申诉' }
      ]
    },
    {
      key: 'merchant:reviews', title: '评价管理', path: '/merchant/reviews', icon: '⭐',
      buttons: [
        { key: 'merchant:reviews:reply', title: '回复评价' },
        { key: 'merchant:reviews:report', title: '举报评价' }
      ]
    },
    { key: 'merchant:cs', title: '客服工作台', path: '/merchant/cs', icon: '🎧' },
    {
      key: 'merchant:roles', title: '角色管理', path: '/merchant/roles', icon: '🧩',
      buttons: [
        { key: 'merchant:roles:save', title: '新建/编辑角色' },
        { key: 'merchant:roles:delete', title: '删除角色' },
        { key: 'merchant:roles:menus', title: '配置菜单权限' }
      ]
    },
    {
      key: 'merchant:staff', title: '员工管理', path: '/merchant/staff', icon: '🧑‍💼',
      buttons: [
        { key: 'merchant:staff:create', title: '新增员工' },
        { key: 'merchant:staff:update', title: '编辑员工' },
        { key: 'merchant:staff:status', title: '禁用/启用' },
        { key: 'merchant:staff:password', title: '重置密码' },
        { key: 'merchant:staff:delete', title: '删除员工' }
      ]
    }
  ]
}

/** 树的扁平索引：key → { title, group }（v-perm 与角色配置树共用） */
export const PERM_INDEX = (() => {
  const map = new Map()
  for (const [group, menus] of Object.entries(PERM_TREE)) {
    for (const m of menus) {
      map.set(m.key, { title: m.title, group, type: 'menu' })
      for (const b of m.buttons || []) {
        map.set(b.key, { title: `${m.title} · ${b.title}`, group, type: 'button' })
      }
    }
  }
  return map
})()

/** 某端的全量权限码（种子数据与「全选」用） */
export const allKeysOf = (group) =>
  (PERM_TREE[group] || []).flatMap((m) => [m.key, ...(m.buttons || []).map((b) => b.key)])
