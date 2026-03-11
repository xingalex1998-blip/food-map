/**
 * 美食地图 · 配置文件
 * 
 * 使用前请先申请高德地图 Web JS API Key：
 * https://console.amap.com/dev/key/app
 * 
 * 申请步骤：
 * 1. 注册/登录高德开放平台
 * 2. 创建应用，选择「Web端(JS API)」
 * 3. 添加 Key，服务平台选「Web端(JS API)」
 * 4. 将 Key 填入下方 AMAP_KEY
 * 
 * 然后将 index.html 和 admin.html 中的
 * YOUR_AMAP_KEY 替换为你的 Key
 */

const CONFIG = {
  // 高德地图 Key（必填）
  AMAP_KEY: 'YOUR_AMAP_KEY',

  // 地图默认中心点（默认北京天安门）
  DEFAULT_CENTER: [116.3974, 39.9093],

  // 地图默认缩放级别
  DEFAULT_ZOOM: 13,

  // 后台登录账号（演示用，生产环境请接入真实认证）
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'admin123',
};
