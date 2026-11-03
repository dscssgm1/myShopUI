# myShop 电商购物平台 · 前端

myShop 是一个多角色电商购物平台，本项目为其 Web 前端，基于 Vue 3 + Vite + Element Plus + Pinia + Vue Router + Axios 开发，通过网关 API 与 [myShop](../myShop) 后端交互。

## 已实现

- **登录**：用户名 + 密码，登录成功后签发 JWT，令牌存入 localStorage；
- **注册**：用户名 / 昵称 / 邮箱 / 密码，需**邮箱验证码**（发送验证码 → 注册校验）；
- **找回密码**：输入注册邮箱 → 发送验证码 → 凭验证码重置密码；
- **账号安全**（个人中心 > 账号安全）：
  - 展示当前邮箱（脱敏）、近期登录记录（IP / 设备 / 时间）、信任设备列表；
  - 修改密码、修改邮箱为独立页面；**信任设备免邮箱身份验证**，未信任设备需先完成「向当前邮箱发码」的身份验证；
  - 任何邮箱验证码验证成功（注册 / 找回密码 / 改邮箱 / 改密码）后都会提示「是否信任此设备」，邮箱验证码输入统一封装在 `components/EmailCodeField.vue`，信任提示统一走 `utils/trust.js`。

## 目录结构

```
src/
├── api/
│   ├── request.js      # axios 封装（拦截器：注入 token、统一处理 Result）
│   └── auth.js         # 登录/注册/验证码/找回密码/重置密码接口
├── store/user.js       # Pinia：登录态与用户信息
├── router/index.js     # 路由 + 登录守卫
└── views/
    ├── Login.vue
    ├── Register.vue
    ├── ForgotPassword.vue
    └── Home.vue        # 登录后占位页
```

## 启动

```bash
npm install
npm run dev     # http://localhost:5173，/api 代理到网关 http://localhost:8080
npm run build
```

## 对接的后端接口（myShop-system）

| 接口 | 说明 |
|------|------|
| `POST /api/system/auth/login` | 登录 |
| `POST /api/system/auth/register` | 注册（需邮箱验证码） |
| `POST /api/system/auth/email-code` | 发送邮箱验证码（purpose=REGISTER） |
| `POST /api/system/auth/password/forgot` | 忘记密码发送验证码 |
| `POST /api/system/auth/password/reset` | 重置密码 |
| `GET /api/system/users/me/security` | 账号安全概览（邮箱/登录记录/信任设备） |
| `POST /api/system/users/me/verify-identity/code` | 向当前邮箱发送身份验证码 |
| `POST /api/system/users/me/verify-identity` | 校验身份验证码，返回短时效凭证 |
| `POST /api/system/users/me/trusted-devices` | 标记当前设备为信任设备 |
| `DELETE /api/system/users/me/trusted-devices/{id}` | 移除信任设备 |

## 说明

- 后端 `myshop.security.email-code.debug=true`（默认）时，验证码直接随响应返回，前端会以"调试"提示展示；生产环境关闭后改为邮件投递；
- 令牌过期（401）由拦截器统一提示；
- **设备标识**：浏览器无法读取 MAC 地址，前端在 localStorage 生成持久设备 UUID（`myshop_device_id`），每个请求通过 `X-Device-Id` / `X-Device-Name` 请求头携带，后端据此记录登录 IP 与设备、标记信任设备；
- **信任规则**：信任标记只能通过一次真实的邮箱验证码验证获得；未信任设备修改密码/邮箱需先完成身份验证（向当前邮箱收码），验证凭证 10 分钟有效。
