require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 支付宝 A2M 商户配置（通过环境变量注入）
const ALIPAY_APP_ID     = process.env.ALIPAY_APP_ID     || '';
const ALIPAY_SELLER_ID  = process.env.ALIPAY_SELLER_ID  || '';
const ALIPAY_SERVICE_ID = process.env.ALIPAY_SERVICE_ID || '';
const ALIPAY_PRIVATE_KEY = (process.env.ALIPAY_PRIVATE_KEY || '')
  .replace(/\\n/g, '\n'); // 支持环境变量中用 \n 换行
const ALIPAY_PRICE = process.env.WEATHER_PRICE || '0.10';
const SERVICE_NAME = '深圳每日天气报告';

// 判断是否已完整配置商户信息
const A2M_CONFIGURED = !!(ALIPAY_APP_ID && ALIPAY_SELLER_ID && ALIPAY_SERVICE_ID && ALIPAY_PRIVATE_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// 天气数据获取（使用 wttr.in 免费 API，无需 key）
// ============================================================
async function getShenZhenWeather() {
  try {
    // wttr.in 提供免费天气API，支持中文城市
    const response = await axios.get(
      'https://wttr.in/Shenzhen?format=j1',
      { timeout: 8000 }
    );
    const data = response.data;
    const current = data.current_condition[0];
    const today = data.weather[0];

    // 天气代码映射
    const weatherCodeMap = {
      113: '☀️ 晴', 116: '⛅ 少云', 119: '☁️ 多云', 122: '☁️ 阴',
      143: '🌫️ 雾', 176: '🌦️ 阵雨', 179: '🌨️ 阵雪', 182: '🌧️ 雨夹雪',
      185: '🌧️ 冻雨', 200: '⛈️ 雷阵雨', 227: '❄️ 雪', 230: '❄️ 暴雪',
      248: '🌫️ 浓雾', 260: '🌫️ 冻雾', 263: '🌦️ 小阵雨', 266: '🌧️ 小雨',
      281: '🌧️ 冻毛毛雨', 284: '🌧️ 大冻毛毛雨', 293: '🌧️ 小雨', 296: '🌧️ 小雨',
      299: '🌧️ 中阵雨', 302: '🌧️ 中雨', 305: '🌧️ 大阵雨', 308: '🌧️ 大雨',
      311: '🌧️ 中冻雨', 314: '🌧️ 大冻雨', 317: '🌨️ 小雨夹雪', 320: '🌨️ 中雨夹雪',
      323: '🌨️ 小阵雪', 326: '❄️ 小阵雪', 329: '❄️ 中阵雪', 332: '❄️ 大阵雪',
      335: '❄️ 大阵雪', 338: '❄️ 大雪', 350: '🌨️ 冰雹', 353: '🌦️ 小阵雨',
      356: '🌧️ 大阵雨', 359: '🌧️ 暴雨', 362: '🌨️ 小冰雨', 365: '🌨️ 大冰雨',
      368: '❄️ 小阵雪', 371: '❄️ 大阵雪', 374: '🌨️ 小冰雹', 377: '🌨️ 大冰雹',
      386: '⛈️ 小雷阵雨', 389: '⛈️ 大雷阵雨', 392: '⛈️ 小雷阵雪', 395: '⛈️ 大雷阵雪'
    };

    const weatherCode = parseInt(current.weatherCode);
    const weatherDesc = weatherCodeMap[weatherCode] || `天气代码${weatherCode}`;

    // 风向映射
    const windDirMap = {
      'N': '北风', 'NNE': '北偏东北风', 'NE': '东北风', 'ENE': '东偏东北风',
      'E': '东风', 'ESE': '东偏东南风', 'SE': '东南风', 'SSE': '南偏东南风',
      'S': '南风', 'SSW': '南偏西南风', 'SW': '西南风', 'WSW': '西偏西南风',
      'W': '西风', 'WNW': '西偏西北风', 'NW': '西北风', 'NNW': '北偏西北风'
    };

    const windDir = windDirMap[current.winddir16Point] || current.winddir16Point;
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // 三天预报
    const forecast = data.weather.map((day, i) => {
      const dayNames = ['今天', '明天', '后天'];
      const maxTempC = Math.round((parseInt(day.maxtempF) - 32) * 5/9);
      const minTempC = Math.round((parseInt(day.mintempF) - 32) * 5/9);
      const dayWeatherCode = parseInt(day.hourly[4]?.weatherCode || day.hourly[0]?.weatherCode || 113);
      const dayWeatherDesc = weatherCodeMap[dayWeatherCode] || '未知';
      return {
        day: dayNames[i] || `第${i+1}天`,
        high: maxTempC,
        low: minTempC,
        weather: dayWeatherDesc,
        sunrise: day.astronomy[0]?.sunrise || '--',
        sunset: day.astronomy[0]?.sunset || '--'
      };
    });

    return {
      date: dateStr,
      time: timeStr,
      city: '深圳市',
      tempC: Math.round((parseInt(current.temp_F) - 32) * 5/9),
      feelsLikeC: Math.round((parseInt(current.FeelsLikeF) - 32) * 5/9),
      humidity: current.humidity,
      weather: weatherDesc,
      windSpeed: Math.round(parseInt(current.windspeedKmph)),
      windDir: windDir,
      visibility: current.visibility,
      uvIndex: current.uvIndex,
      pressure: current.pressure,
      forecast: forecast,
      aqi: null, // wttr.in 不提供AQI
      updateTime: `${dateStr} ${timeStr}`
    };
  } catch (err) {
    console.error('天气API请求失败:', err.message);
    throw new Error('天气数据获取失败，请稍后重试');
  }
}

// ============================================================
// 支付宝 A2M HTTP 402 商户端实现
// 协议结构来自逆向分析：Payment-Needed = base64(JSON{ method, protocol })
// method: 商户信息；protocol: 订单信息 + RSA2 签名
// ============================================================

/**
 * 生成 RSA2 签名
 * 签名内容：将 protocol 对象按 key 字母序拼接 key=value&... 字符串
 */
function signA2M(protocolObj) {
  if (!ALIPAY_PRIVATE_KEY) return 'MISSING_KEY';

  // 按字母序排列，拼接待签名字符串（排除 seller_signature 自身）
  const keys = Object.keys(protocolObj)
    .filter(k => k !== 'seller_signature' && protocolObj[k] !== undefined)
    .sort();
  const signStr = keys.map(k => `${k}=${protocolObj[k]}`).join('&');

  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signStr, 'utf8');
    // 私钥需为 PKCS#8 或 PKCS#1 PEM 格式
    const keyPem = ALIPAY_PRIVATE_KEY.includes('BEGIN')
      ? ALIPAY_PRIVATE_KEY
      : `-----BEGIN RSA PRIVATE KEY-----\n${ALIPAY_PRIVATE_KEY}\n-----END RSA PRIVATE KEY-----`;
    return sign.sign(keyPem, 'base64');
  } catch (e) {
    console.error('RSA签名失败:', e.message);
    return 'SIGN_ERROR';
  }
}

function generate402Response(res, resourcePath) {
  // 同一天同一资源使用固定订单号，避免 Agent 重试时报 REQUEST_EXPIRED
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const resourceKey = (resourcePath || '/api/weather/full').replace(/\//g, '').toUpperCase();
  const outTradeNo = `WEATHER_${today}_${resourceKey}`;
  // 支付有效期：2 小时（UTC 时间，不加时区偏移）
  const payBefore = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const protocol = {
    amount: ALIPAY_PRICE,
    currency: 'CNY',
    out_trade_no: outTradeNo,
    pay_before: payBefore,
    resource_id: resourcePath || '/api/weather/full',
    seller_sign_type: 'RSA2',
    seller_unique_id: ALIPAY_SELLER_ID
  };

  if (A2M_CONFIGURED) {
    // 真实签名模式
    protocol.seller_signature = signA2M(protocol);
  } else {
    // 演示模式：无签名（买方 CLI 会报签名失败，需要真实商户配置）
    protocol.seller_signature = 'DEMO_NOT_CONFIGURED';
  }

  const payload = {
    method: {
      goods_name: SERVICE_NAME,
      seller_app_id: ALIPAY_APP_ID || 'DEMO_APP_ID',
      seller_id: ALIPAY_SELLER_ID || 'DEMO_SELLER_ID',
      seller_name: '深圳天气AI',
      seller_unique_id_key: 'seller_id',
      service_id: ALIPAY_SERVICE_ID || 'DEMO_SERVICE_ID'
    },
    protocol
  };

  // base64url 编码（URL 安全）
  const paymentNeeded = Buffer.from(JSON.stringify(payload)).toString('base64url');

  res.status(402);
  res.set('Payment-Needed', paymentNeeded);
  res.set('X-Payment-Provider', 'alipay-a2m');
  res.set('X-Payment-Amount', ALIPAY_PRICE);
  res.set('X-Payment-Currency', 'CNY');
  res.json({
    code: 402,
    message: '此内容需要付费访问',
    price: `¥${ALIPAY_PRICE}`,
    service: SERVICE_NAME,
    provider: '支付宝 AI 收款',
    configured: A2M_CONFIGURED
  });
}

// ============================================================
// 支付宝 A2M 查单验证（验证 tradeNo 是否真实支付成功）
// ============================================================
async function verifyA2MPayment(tradeNo) {
  if (!tradeNo || !/^\d{28,32}$/.test(tradeNo)) return false;
  try {
    // 调用支付宝查单接口验证交易状态
    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
    const params = {
      app_id: ALIPAY_APP_ID,
      method: 'alipay.trade.query',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp,
      version: '1.0',
      biz_content: JSON.stringify({ trade_no: tradeNo })
    };
    // 排序拼接签名串
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signStr, 'utf8');
    const keyPem = ALIPAY_PRIVATE_KEY.includes('BEGIN')
      ? ALIPAY_PRIVATE_KEY
      : `-----BEGIN RSA PRIVATE KEY-----\n${ALIPAY_PRIVATE_KEY}\n-----END RSA PRIVATE KEY-----`;
    params.sign = signer.sign(keyPem, 'base64');

    const queryStr = Object.keys(params).map(k =>
      `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`
    ).join('&');

    const resp = await axios.post(
      'https://openapi.alipay.com/gateway.do',
      queryStr,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
    );
    const result = resp.data?.alipay_trade_query_response;
    return result?.code === '10000' && result?.trade_status === 'TRADE_SUCCESS';
  } catch (e) {
    console.error('验单失败:', e.message);
    return false;
  }
}

// ============================================================
// 普通用户支付宝手机网站支付（生成收银台链接）
// ============================================================
async function createAlipayOrder(outTradeNo) {
  if (!A2M_CONFIGURED) return null;
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
    const returnUrl = `https://shenzhen-weather-xk84.onrender.com/api/pay/return?trade_no=${outTradeNo}`;
    const bizContent = JSON.stringify({
      out_trade_no: outTradeNo,
      total_amount: ALIPAY_PRICE,
      subject: SERVICE_NAME,
      product_code: 'QUICK_WAP_WAY'
    });
    const params = {
      app_id: ALIPAY_APP_ID,
      method: 'alipay.trade.wap.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp,
      version: '1.0',
      return_url: returnUrl,
      biz_content: bizContent
    };
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signStr, 'utf8');
    const keyPem = ALIPAY_PRIVATE_KEY.includes('BEGIN')
      ? ALIPAY_PRIVATE_KEY
      : `-----BEGIN RSA PRIVATE KEY-----\n${ALIPAY_PRIVATE_KEY}\n-----END RSA PRIVATE KEY-----`;
    params.sign = signer.sign(keyPem, 'base64');

    const payUrl = 'https://openapi.alipay.com/gateway.do?' +
      Object.keys(params).map(k =>
        `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`
      ).join('&');
    return payUrl;
  } catch (e) {
    console.error('创建支付宝订单失败:', e.message);
    return null;
  }
}

// 内存中存储待验证订单（生产环境应用 Redis/DB）
const pendingOrders = new Map();

// 普通用户：创建支付宝手机支付订单
app.get('/api/pay/create', async (req, res) => {
  const outTradeNo = `WEATHER_${Date.now()}_${uuidv4().replace(/-/g,'').slice(0,8).toUpperCase()}`;
  pendingOrders.set(outTradeNo, { status: 'pending', created: Date.now() });
  const payUrl = await createAlipayOrder(outTradeNo);
  if (!payUrl) {
    return res.status(500).json({ success: false, message: '支付服务暂不可用' });
  }
  res.json({ success: true, outTradeNo, payUrl });
});

// 支付宝支付回调（用户支付完跳回）
app.get('/api/pay/return', async (req, res) => {
  const { trade_no, out_trade_no } = req.query;
  if (trade_no) {
    pendingOrders.set(out_trade_no || trade_no, { status: 'paid', tradeNo: trade_no, paid: Date.now() });
  }
  res.redirect(`/?paid=1&tradeNo=${trade_no || ''}`);
});

// 前端轮询：查询订单是否支付成功
app.get('/api/pay/status', async (req, res) => {
  const { outTradeNo } = req.query;
  const order = pendingOrders.get(outTradeNo);
  if (!order) return res.json({ success: false, paid: false });
  if (order.status === 'paid') {
    return res.json({ success: true, paid: true, tradeNo: order.tradeNo });
  }
  res.json({ success: true, paid: false });
});

// 免费：获取天气预览（仅当日简要信息）
app.get('/api/weather/preview', async (req, res) => {
  try {
    const weather = await getShenZhenWeather();
    // 免费预览：只返回基础信息
    res.json({
      success: true,
      preview: true,
      data: {
        date: weather.date,
        city: weather.city,
        weather: weather.weather,
        tempC: weather.tempC,
        message: '完整报告（含三天预报、风速、湿度等详情）需付费查看'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 付费：获取完整天气报告（HTTP 402 保护）
app.get('/api/weather/full', async (req, res) => {
  const paymentProof = req.headers['x-payment-proof'] || req.query.paymentProof;

  if (!paymentProof) {
    return generate402Response(res, '/api/weather/full');
  }

  // 真实验证：tradeNo 必须是纯数字28-32位（支付宝交易号格式）
  const isA2MTradeNo = /^\d{28,32}$/.test(paymentProof);
  // 普通用户支付回跳后凭证
  const order = pendingOrders.get(paymentProof);
  const isUserPaid = order?.status === 'paid';

  let verified = false;
  if (isA2MTradeNo && A2M_CONFIGURED) {
    // AI Agent 付款：调支付宝查单接口验证
    verified = await verifyA2MPayment(paymentProof);
  } else if (isUserPaid) {
    // 普通用户：本地订单已标记支付成功
    verified = true;
  }

  if (!verified) {
    return res.status(401).json({ success: false, message: '支付验证失败，请先完成付款' });
  }

  try {
    const weather = await getShenZhenWeather();
    res.json({ success: true, preview: false, data: weather });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌤️  深圳天气服务已启动: http://localhost:${PORT}`);
});
