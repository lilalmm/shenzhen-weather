# 深圳天气 AI 工具

> 每日深圳天气报告，支持支付宝 AI 收款（HTTP 402 协议）

## 功能

- 🌤 实时深圳天气（免费预览：当日天气+温度）
- 📊 完整报告（付费 ¥0.10：体感温度、湿度、风速、UV指数、三天预报）
- 💙 支付宝 A2M（HTTP 402）AI 收款协议

## 技术栈

- 后端：Node.js + Express
- 天气数据：wttr.in（免费，无需 API Key）
- 支付：支付宝 A2M 协议（HTTP 402 Payment Required）
- 部署：Railway / Render / Vercel

## 本地运行

```bash
npm install
cp .env.example .env
# 编辑 .env 填入支付宝商户信息
npm start
```

## 部署到 Railway

1. 注册 [Railway](https://railway.app)
2. 新建项目 → Deploy from GitHub
3. 配置环境变量（参考 .env.example）
4. 自动获得公网域名

## 支付宝 A2M 商户接入

要启用真实收款，需要：

1. 在[支付宝开放平台](https://open.alipay.com)申请 A2M 商户资质
2. 获取 `AppID`、商户私钥、支付宝公钥
3. 在 `server.js` 的 `generate402Response()` 函数中集成官方 SDK 生成真实签名

## 目录结构

```
shenzhen-weather/
├── server.js          # Express 后端
├── package.json
├── .env.example       # 环境变量模板
├── public/
│   └── index.html     # 前端页面
└── README.md
```
