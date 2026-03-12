// ── 平台 Logo 映射 ────────────────────────────────────────
const PLATFORM_LOGOS = {
  '抖音':   'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
  'B站':    'https://www.bilibili.com/favicon.ico',
  '小红书': 'https://www.xiaohongshu.com/favicon.ico',
  'AcFun':  'https://www.acfun.cn/favicon.ico',
  '大众点评': 'https://www.dianping.com/favicon.ico',
};

// ── 状态变量 ──────────────────────────────────────────────
let _map = null;
let markers = [];
let allSpots = [];
let currentFilter = 'all';
let currentCuratorFilter = 'all';
let currentRegionFilter = 'all';
let activeSpotId = null;

// ── 地区提取 ──────────────────────────────────────────────
const REGION_MAP = [
  { key: '北京', match: ['北京'], center: [116.4074, 39.9042], zoom: 11 },
  { key: '上海', match: ['上海'], center: [121.4737, 31.2304], zoom: 11 },
  { key: '天津', match: ['天津'], center: [117.1901, 39.1256], zoom: 11 },
  { key: '重庆', match: ['重庆'], center: [106.5516, 29.5630], zoom: 11 },
  { key: '广东', match: ['广东', '广州', '深圳', '汕头', '潮州', '梅州', '珠海', '佛山', '东莞'], center: [113.2644, 23.1291], zoom: 10 },
  { key: '四川', match: ['四川', '成都', '宜宾', '乐山', '自贡', '泸州', '广安'], center: [104.0657, 30.6595], zoom: 9 },
  { key: '湖南', match: ['湖南', '长沙', '株洲', '湘潭'], center: [112.9388, 28.2278], zoom: 10 },
  { key: '湖北', match: ['湖北', '武汉', '宜昌', '十堰'], center: [114.3054, 30.5931], zoom: 10 },
  { key: '山东', match: ['山东', '济南', '青岛', '烟台', '淄博', '菏泽'], center: [117.0009, 36.6758], zoom: 9 },
  { key: '河南', match: ['河南', '郑州', '洛阳', '开封', '平顶山', '周口', '登封'], center: [113.6254, 34.7466], zoom: 9 },
  { key: '浙江', match: ['浙江', '杭州', '宁波', '温州', '衢州'], center: [120.1536, 30.2875], zoom: 10 },
  { key: '江苏', match: ['江苏', '南京', '苏州', '扬州', '徐州', '无锡'], center: [118.7969, 32.0603], zoom: 9 },
  { key: '陕西', match: ['陕西', '西安'], center: [108.9480, 34.2632], zoom: 10 },
  { key: '甘肃', match: ['甘肃', '兰州'], center: [103.8343, 36.0611], zoom: 10 },
  { key: '吉林', match: ['吉林', '长春'], center: [125.3245, 43.8868], zoom: 10 },
  { key: '黑龙江', match: ['黑龙江', '哈尔滨'], center: [126.6424, 45.7568], zoom: 10 },
  { key: '山西', match: ['山西', '太原', '临汾'], center: [112.5490, 37.8570], zoom: 9 },
  { key: '河北', match: ['河北', '保定', '石家庄', '沧州'], center: [114.5020, 38.0454], zoom: 9 },
  { key: '贵州', match: ['贵州', '贵阳'], center: [106.7135, 26.5783], zoom: 10 },
  { key: '宁夏', match: ['宁夏', '银川'], center: [106.2782, 38.4664], zoom: 10 },
  { key: '新疆', match: ['新疆'], center: [87.6177, 43.7928], zoom: 8 },
];

function extractRegion(spot) {
  const addr = spot.address || '';
  for (const r of REGION_MAP) {
    if (r.match.some(m => addr.includes(m))) return r.key;
  }
  return '其他';
}

function getAvailableRegions() {
  const regionCounts = {};
  allSpots.forEach(s => {
    const r = extractRegion(s);
    regionCounts[r] = (regionCounts[r] || 0) + 1;
  });
  // 按数量降序排列
  return Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));
}

// ── 地图初始化 ────────────────────────────────────────────
window.initAMap = function() {
  document.getElementById('mapLoading').style.display = 'none';

  _map = new AMap.Map('map', {
    zoom: 13,
    center: [116.3974, 39.9093],
    mapStyle: 'amap://styles/whitesmoke',
  });

  allSpots = loadSpots();
  renderRegionFilter();
  renderMarkers(allSpots);
  renderSidePanel(allSpots);

  _map.on('click', () => closePopup());
};

function getIconPath(spotId) {
  return `icons/${spotId}.png`;
}

// ── 标记渲染 ──────────────────────────────────────────────
function renderMarkers(spots) {
  markers.forEach(m => m.setMap(null));
  markers = [];

  spots.forEach(spot => {
    const cfg = CATEGORY_CONFIG[spot.category] || CATEGORY_CONFIG['其他'];
    // 优先用 spot.photo（高德门头图/B站封面），其次本地 icon，最后 emoji
    const primaryImg = spot.photo || spot.photo2 || null;
    const fallbackImg = getIconPath(spot.id);

    const markerEl = document.createElement('div');
    markerEl.className = 'custom-marker';

    const thumbDiv = document.createElement('div');
    thumbDiv.className = 'marker-thumb';
    thumbDiv.style.borderColor = cfg.color + '40';

    const img = document.createElement('img');
    img.alt = spot.name;

    const emojiFb = document.createElement('div');
    emojiFb.className = 'marker-emoji-fb';
    emojiFb.style.cssText = 'display:none;background:linear-gradient(135deg,' + cfg.color + '22,' + cfg.color + '55)';
    emojiFb.textContent = cfg.emoji;

    thumbDiv.appendChild(img);
    thumbDiv.appendChild(emojiFb);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'marker-label';
    labelDiv.textContent = spot.name;

    markerEl.appendChild(thumbDiv);
    markerEl.appendChild(labelDiv);

    if (primaryImg) {
      // 有外部图片：先显示 emoji 占位，fetch 成功后切换为真实图片
      img.style.display = 'none';
      emojiFb.style.display = 'flex';
      fetch(primaryImg, { referrerPolicy: 'no-referrer' })
        .then(r => r.ok ? r.blob() : Promise.reject())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          img.onload = function() {
            img.style.display = '';
            emojiFb.style.display = 'none';
          };
          img.onerror = function() { /* 保持 emoji */ };
          img.src = blobUrl;
        })
        .catch(() => {
          // fetch 失败，降级用本地 icon
          img.onerror = function() {
            this.style.display = 'none';
            emojiFb.style.display = 'flex';
          };
          img.onload = function() {
            img.style.display = '';
            emojiFb.style.display = 'none';
          };
          img.src = fallbackImg;
        });
    } else {
      // 无外部图片，直接用本地 icon
      img.onerror = function() {
        this.style.display = 'none';
        emojiFb.style.display = 'flex';
      };
      img.onload = function() {
        img.style.display = '';
        emojiFb.style.display = 'none';
      };
      img.src = fallbackImg;
    }

    const marker = new AMap.Marker({
      position: [spot.lng, spot.lat],
      content: markerEl,
      offset: new AMap.Pixel(-26, -66),
      zIndex: 100,
    });

    marker.on('click', (e) => {
      e.stopPropagation && e.stopPropagation();
      showPopup(spot);
    });

    marker.setMap(_map);
    marker._spotId = spot.id;
    markers.push(marker);
  });
}

// ── 弹出卡片 ──────────────────────────────────────────────
function showPopup(spot) {
  activeSpotId = spot.id;
  const cfg = CATEGORY_CONFIG[spot.category] || CATEGORY_CONFIG['其他'];

  // 分类徽章
  document.getElementById('popupCategory').textContent = `${cfg.emoji} ${spot.category}`;

  // 餐厅名
  document.getElementById('popupName').textContent = spot.name;

  // 评分：使用真实 rating 字段，无则不显示
  const metaEl = document.getElementById('popupStars').parentElement;
  if (spot.rating) {
    const r = parseFloat(spot.rating);
    const fullStars = Math.floor(r);
    const halfStar = (r - fullStars) >= 0.5 ? '½' : '';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    document.getElementById('popupStars').textContent = '★'.repeat(fullStars) + (halfStar ? '✦' : '') + '☆'.repeat(emptyStars);
    document.getElementById('popupRatingNum').textContent = r.toFixed(1);
    document.getElementById('popupRatingSrc').textContent = spot.ratingSource || '大众点评';
    metaEl.style.display = 'flex';
  } else {
    metaEl.style.display = 'none';
  }

  // 推荐人
  document.getElementById('popupCurator').innerHTML = `
    <div class="curator-avatar">${spot.curator[0]}</div>
    <span class="curator-name">${spot.curator}</span>
    <span class="curator-tag">${spot.curatorTitle || '美食家'}</span>
  `;

  // 简介
  document.getElementById('popupDesc').textContent = spot.desc;

  // 地址
  document.getElementById('popupInfoAddress').textContent = spot.address;
  document.getElementById('popupAddressRow').onclick = () => {
    window.open(
      `https://uri.amap.com/navigation?to=${spot.lng},${spot.lat},${encodeURIComponent(spot.name)}&mode=car&src=food-map`,
      '_blank'
    );
  };

  // 标签
  document.getElementById('popupTags').innerHTML = (spot.tags || []).map(t =>
    `<span class="popup-tag">${t}</span>`
  ).join('');

  // 来源：只显示平台 logo
  const sourceEl = document.getElementById('popupSource');
  if (spot.sourceUrl && spot.sourcePlatform) {
    const logoUrl = PLATFORM_LOGOS[spot.sourcePlatform] || '';
    const logoEl = document.getElementById('popupSourceLogo');
    const linkEl = document.getElementById('popupSourceLink');
    linkEl.href = spot.sourceUrl;
    if (logoUrl) {
      logoEl.src = logoUrl;
      logoEl.alt = spot.sourcePlatform;
      logoEl.style.display = 'block';
    } else {
      // 无 logo 时用文字
      logoEl.style.display = 'none';
      linkEl.textContent = spot.sourcePlatform;
    }
    sourceEl.style.display = 'flex';
  } else {
    sourceEl.style.display = 'none';
  }

  // 封面图（fetch+blob 绕过 referrer 限制，只展示一张）
  const coverEl = document.getElementById('popupCover');
  coverEl.querySelectorAll('.popup-cover-img').forEach(el => el.remove());
  const emojiPlaceholder = document.getElementById('popupEmoji');
  if (emojiPlaceholder) {
    emojiPlaceholder.textContent = cfg.emoji;
    emojiPlaceholder.style.display = 'flex';
  }
  coverEl.style.background = `linear-gradient(160deg, ${cfg.color}33, ${cfg.color}88)`;
  if (spot.photo) {
    fetch(spot.photo, { referrerPolicy: 'no-referrer' })
      .then(function(r) { return r.ok ? r.blob() : Promise.reject(); })
      .then(function(blob) {
        const blobUrl = URL.createObjectURL(blob);
        const imgEl = document.createElement('img');
        imgEl.className = 'popup-cover-img';
        imgEl.alt = '';
        imgEl.onload = function() {
          coverEl.style.background = '';
          if (emojiPlaceholder) emojiPlaceholder.style.display = 'none';
        };
        imgEl.onerror = function() {};
        imgEl.src = blobUrl;
        coverEl.insertBefore(imgEl, coverEl.firstChild);
      })
      .catch(function() {});
  }
  // 显示卡片（先重置滚动位置）
  const card = document.getElementById('popupCard');
  card.scrollTop = 0;
  card.style.display = 'block';
  requestAnimationFrame(() => card.classList.add('visible'));

  // 显示遮罩
  document.getElementById('popupOverlay').classList.add('active');

  _map.panTo([spot.lng, spot.lat]);

  document.querySelectorAll('.list-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === spot.id);
  });
}

function closePopup() {
  const card = document.getElementById('popupCard');
  card.classList.remove('visible');
  document.getElementById('popupOverlay').classList.remove('active');
  setTimeout(() => { card.style.display = 'none'; }, 350);
  activeSpotId = null;
  document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
}

// ── 侧边列表 ──────────────────────────────────────────────
let _sidePanelQuery = '';
let _sidePanelCurator = 'all';
// 记录已加载的 blob URL，避免重复 fetch
const _sidePanelBlobCache = {};

function renderSidePanel(spots) {
  // 渲染下拉筛选菜单
  _buildSpDropdownMenus();

  // 应用侧边栏内部筛选（搜索 + 推荐人）
  const filtered = _applySidePanelFilter(spots);

  document.getElementById('sidePanelCount').textContent = `共 ${filtered.length} 家`;

  if (filtered.length === 0) {
    document.getElementById('sidePanelList').innerHTML =
      `<div class="side-panel-empty">没有匹配的店铺</div>`;
    return;
  }

  // 先用占位符渲染，再异步加载图片
  const listEl = document.getElementById('sidePanelList');
  listEl.innerHTML = filtered.map(spot => {
    const cfg = CATEGORY_CONFIG[spot.category] || CATEGORY_CONFIG['其他'];
    const colorBg = `linear-gradient(135deg,${cfg.color}22,${cfg.color}55)`;
    return `
      <div class="list-item" data-id="${spot.id}" onclick="onListItemClick('${spot.id}')">
        <div class="list-item-thumb" id="thumb_${spot.id}"
          style="background:${colorBg}">
          <span class="list-item-thumb-emoji">${cfg.emoji}</span>
        </div>
        <div class="list-item-info">
          <div class="list-item-name">${spot.name}</div>
          <div class="list-item-meta">
            <span class="list-item-curator-tag">${spot.curator}</span>
            <span class="list-item-category">${spot.category}</span>
          </div>
          <div class="list-item-desc">${spot.desc || ''}</div>
        </div>
      </div>
    `;
  }).join('');

  // 异步加载门头图
  filtered.forEach(spot => {
    if (!spot.photo) return;
    const thumbEl = document.getElementById(`thumb_${spot.id}`);
    if (!thumbEl) return;

    // 已有缓存直接用
    if (_sidePanelBlobCache[spot.id]) {
      _applyThumbImage(thumbEl, _sidePanelBlobCache[spot.id]);
      return;
    }

const iconUrl = getIconPath(spot.id);
fetch(spot.photo, { referrerPolicy: 'no-referrer' })
.then(r => r.ok ? r.blob() : Promise.reject())
.then(blob => {
const url = URL.createObjectURL(blob);
_sidePanelBlobCache[spot.id] = url;
// 确认 DOM 元素还在（列表可能已重新渲染）
const el = document.getElementById(`thumb_${spot.id}`);
if (el) _applyThumbImage(el, url);
})
.catch(() => {
// fetch 失败，降级用本地 icon
const el = document.getElementById(`thumb_${spot.id}`);
if (el) _applyThumbImage(el, iconUrl, true);
})

  });
}

function _applyThumbImage(thumbEl, imgUrl) {
const img = document.createElement('img');
img.className = 'list-item-thumb-img';
img.alt = '';
const emojiEl = thumbEl.querySelector('.list-item-thumb-emoji');
img.onload = () => {
  if (emojiEl) emojiEl.style.display = 'none';
};
img.onerror = () => {
  img.remove();
  // 本地 icon 也失败时保持 emoji 显示
};
img.src = imgUrl;
thumbEl.insertBefore(img, thumbEl.firstChild);
}

// ── 侧边栏下拉筛选（口味 + 推荐人）────────────────────────
let _spOpenDropdown = null; // 当前打开的下拉 id

function _buildSpDropdownMenus() {
  // 口味：从 allSpots 收集所有分类
  const categories = [...new Set(allSpots.map(s => s.category).filter(Boolean))].sort();
  const catMenu = document.getElementById('spCategoryMenu');
  if (catMenu) {
    catMenu.innerHTML = [
      _spMenuItem('all', '全部口味', currentFilter, 'setSpCategory'),
      ...categories.map(c => {
        const cfg = CATEGORY_CONFIG[c] || CATEGORY_CONFIG['其他'];
        return _spMenuItem(c, `${cfg.emoji} ${c}`, currentFilter, 'setSpCategory');
      })
    ].join('');
  }
  // 推荐人：从 allSpots 收集
  const curators = [...new Set(allSpots.map(s => s.curator).filter(Boolean))];
  const curMenu = document.getElementById('spCuratorMenu');
  if (curMenu) {
    curMenu.innerHTML = [
      _spMenuItem('all', '全部推荐人', currentCuratorFilter, 'setSpCurator'),
      ...curators.map(c => _spMenuItem(c, c, currentCuratorFilter, 'setSpCurator'))
    ].join('');
  }
  // 更新按钮标签
  _updateSpBtnLabel('spCategoryLabel', currentFilter, '口味', categories, CATEGORY_CONFIG);
  _updateSpCuratorLabel();
}

function _spMenuItem(value, label, current, fn) {
  const active = current === value ? ' active' : '';
  return `<div class="sp-menu-item${active}" onclick="${fn}('${value}')">${label}</div>`;
}

function _updateSpBtnLabel(labelId, current, defaultText, list, cfgMap) {
  const el = document.getElementById(labelId);
  if (!el) return;
  if (current === 'all') { el.textContent = defaultText; return; }
  const cfg = cfgMap && cfgMap[current];
  el.textContent = cfg ? `${cfg.emoji} ${current}` : current;
}

function _updateSpCuratorLabel() {
  const el = document.getElementById('spCuratorLabel');
  if (!el) return;
  el.textContent = currentCuratorFilter === 'all' ? '推荐人' : currentCuratorFilter;
}

function toggleSpDropdown(id) {
  if (_spOpenDropdown && _spOpenDropdown !== id) {
    // 关闭另一个
    document.getElementById(_spOpenDropdown).querySelector('.sp-dropdown-menu').classList.remove('open');
    document.getElementById(_spOpenDropdown).querySelector('.sp-dropdown-btn').classList.remove('open');
  }
  const menu = document.getElementById(id).querySelector('.sp-dropdown-menu');
  const btn  = document.getElementById(id).querySelector('.sp-dropdown-btn');
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    btn.classList.remove('open');
    _spOpenDropdown = null;
    document.removeEventListener('click', _closeSpDropdownOutside);
  } else {
    menu.classList.add('open');
    btn.classList.add('open');
    _spOpenDropdown = id;
    setTimeout(() => document.addEventListener('click', _closeSpDropdownOutside), 0);
  }
}

function _closeSpDropdownOutside(e) {
  if (!_spOpenDropdown) return;
  const el = document.getElementById(_spOpenDropdown);
  if (el && !el.contains(e.target)) {
    el.querySelector('.sp-dropdown-menu').classList.remove('open');
    el.querySelector('.sp-dropdown-btn').classList.remove('open');
    _spOpenDropdown = null;
    document.removeEventListener('click', _closeSpDropdownOutside);
  }
}

function setSpCategory(category) {
  currentFilter = category;
  _buildSpDropdownMenus();
  // 关闭下拉
  const menu = document.getElementById('spCategoryDropdown').querySelector('.sp-dropdown-menu');
  const btn  = document.getElementById('spCategoryDropdown').querySelector('.sp-dropdown-btn');
  menu.classList.remove('open'); btn.classList.remove('open');
  _spOpenDropdown = null;
  document.removeEventListener('click', _closeSpDropdownOutside);
  renderMarkers(getFilteredSpots());
  renderSidePanel(getFilteredSpots());
  closePopup();
}

function setSpCurator(curator) {
  currentCuratorFilter = curator;
  _sidePanelCurator = 'all'; // 重置侧边栏内部推荐人筛选
  _buildSpDropdownMenus();
  const menu = document.getElementById('spCuratorDropdown').querySelector('.sp-dropdown-menu');
  const btn  = document.getElementById('spCuratorDropdown').querySelector('.sp-dropdown-btn');
  menu.classList.remove('open'); btn.classList.remove('open');
  _spOpenDropdown = null;
  document.removeEventListener('click', _closeSpDropdownOutside);
  renderMarkers(getFilteredSpots());
  renderSidePanel(getFilteredSpots());
  closePopup();
}

function _applySidePanelFilter(spots) {
  let result = spots;
  if (_sidePanelCurator !== 'all') {
    result = result.filter(s => s.curator === _sidePanelCurator);
  }
  if (_sidePanelQuery) {
    const q = _sidePanelQuery.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.desc || '').toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q)
    );
  }
  return result;
}

function onSidePanelSearch(val) {
  _sidePanelQuery = val.trim();
  const clearBtn = document.getElementById('sidePanelSearchClear');
  if (clearBtn) clearBtn.style.display = _sidePanelQuery ? 'flex' : 'none';
  renderSidePanel(getFilteredSpots());
}

function clearSidePanelSearch() {
  _sidePanelQuery = '';
  const input = document.getElementById('sidePanelSearch');
  if (input) input.value = '';
  const clearBtn = document.getElementById('sidePanelSearchClear');
  if (clearBtn) clearBtn.style.display = 'none';
  renderSidePanel(getFilteredSpots());
}

function setSidePanelCurator(curator) {
  _sidePanelCurator = curator;
  renderSidePanel(getFilteredSpots());
}

function onListItemClick(id) {
  const spot = allSpots.find(s => s.id === id);
  if (spot) showPopup(spot);
}

function toggleSidePanel() {
  document.getElementById('sidePanel').classList.toggle('open');
}

// ── 筛选 ──────────────────────────────────────────────────
function getFilteredSpots() {
  let spots = allSpots;
  if (currentFilter !== 'all') spots = spots.filter(s => s.category === currentFilter);
  if (currentCuratorFilter !== 'all') spots = spots.filter(s => s.curator === currentCuratorFilter);
  if (currentRegionFilter !== 'all') spots = spots.filter(s => extractRegion(s) === currentRegionFilter);
  return spots;
}

// 兼容旧调用
function filterByCategory(category) { setSpCategory(category); }
function filterByCurator(curator) { setSpCurator(curator); }

// ── 地区下拉选择器 ────────────────────────────────────────
let _regionDropdownOpen = false;
let _allRegions = []; // 缓存所有地区列表

function renderRegionFilter() {
  _allRegions = getAvailableRegions();
  renderRegionList(_allRegions);
  updateRegionSelectorLabel();
}

function renderRegionList(regions) {
  const list = document.getElementById('regionList');
  if (!list) return;

  // 全部选项
  const allActive = currentRegionFilter === 'all';
  let html = `<div class="region-list-item${allActive ? ' active' : ''}" onclick="selectRegion('all')">
    <span>全国</span>
    <span class="region-item-count">${allSpots.length}</span>
  </div>`;

  if (regions.length === 0) {
    html += `<div class="region-list-empty">没有匹配的地区</div>`;
  } else {
    regions.forEach(({ key, count }) => {
      const active = currentRegionFilter === key;
      html += `<div class="region-list-item${active ? ' active' : ''}" onclick="selectRegion('${key}')">
        <span>${key}</span>
        <span class="region-item-count">${count}</span>
      </div>`;
    });
  }
  list.innerHTML = html;
}

function filterRegionList(query) {
  const q = query.trim();
  if (!q) {
    renderRegionList(_allRegions);
    return;
  }
  const filtered = _allRegions.filter(r => r.key.includes(q));
  renderRegionList(filtered);
}

function selectRegion(region) {
  currentRegionFilter = region;
  updateRegionSelectorLabel();
  renderRegionList(_allRegions);
  renderMarkers(getFilteredSpots());
  renderSidePanel(getFilteredSpots());
  closePopup();
  closeRegionDropdown();

  // 选了具体地区，地图飞到该省市中心（用预设坐标，不用店铺平均值）
  if (region !== 'all') {
    const regionCfg = REGION_MAP.find(r => r.key === region);
    if (regionCfg && regionCfg.center) {
      _map.setCenter(regionCfg.center);
      _map.setZoom(regionCfg.zoom || 11);
    } else {
      // 没有预设坐标时才用店铺中心
      const filtered = getFilteredSpots();
      if (filtered.length > 0) {
        const lngs = filtered.map(s => s.lng).filter(v => v > 70 && v < 140);
        const lats = filtered.map(s => s.lat).filter(v => v > 15 && v < 55);
        if (lngs.length && lats.length) {
          _map.setCenter([(Math.min(...lngs)+Math.max(...lngs))/2, (Math.min(...lats)+Math.max(...lats))/2]);
          _map.setZoom(11);
        }
      }
    }
  } else {
    _map.setCenter([116.3974, 39.9093]);
    _map.setZoom(5);
  }
}

function updateRegionSelectorLabel() {
  const label = document.getElementById('regionSelectorLabel');
  if (label) label.textContent = currentRegionFilter === 'all' ? '全国' : currentRegionFilter;
  const btn = document.getElementById('regionSelectorBtn');
  if (btn) {
    if (currentRegionFilter !== 'all') {
      btn.classList.add('open');
    } else {
      btn.classList.remove('open');
    }
  }
}

function toggleRegionDropdown() {
  _regionDropdownOpen ? closeRegionDropdown() : openRegionDropdown();
}

function openRegionDropdown() {
  _regionDropdownOpen = true;
  document.getElementById('regionDropdown').classList.add('open');
  document.getElementById('regionSelectorBtn').classList.add('open');
  // 清空搜索框
  const input = document.getElementById('regionSearchInput');
  if (input) { input.value = ''; renderRegionList(_allRegions); }
  // 点击外部关闭
  setTimeout(() => document.addEventListener('click', _closeDropdownOnOutside), 0);
}

function closeRegionDropdown() {
  _regionDropdownOpen = false;
  document.getElementById('regionDropdown').classList.remove('open');
  // 只在未选中地区时移除 open 样式（选中时保持高亮）
  if (currentRegionFilter === 'all') {
    document.getElementById('regionSelectorBtn').classList.remove('open');
  }
  document.removeEventListener('click', _closeDropdownOnOutside);
}

function _closeDropdownOnOutside(e) {
  const selector = document.getElementById('regionSelector');
  if (selector && !selector.contains(e.target)) {
    closeRegionDropdown();
  }
}

// 兼容旧调用（已无 region-btn，保留空函数防报错）
function filterByRegion(region) { selectRegion(region); }


// ── 定位 ──────────────────────────────────────────────────
function locateUser() {
  if (!navigator.geolocation) { showToast('您的浏览器不支持定位'); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      _map.setCenter([pos.coords.longitude, pos.coords.latitude]);
      _map.setZoom(15);
      showToast('已定位到您的位置');
    },
    () => showToast('定位失败，请检查权限设置')
  );
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── 跨标签页同步 ──────────────────────────────────────────
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    allSpots = loadSpots();
    renderMarkers(getFilteredSpots());
    renderSidePanel(getFilteredSpots());
    showToast('地图数据已更新');
  }
});
