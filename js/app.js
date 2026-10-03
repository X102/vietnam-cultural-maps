/* Bản đồ Di sản Văn hoá Việt Nam — app logic */
(() => {
  'use strict';

  // ---------- Constants ----------
  const REGION_COLORS = {
    tdmnpb: '#8d6e63',
    dbsh:   '#ef5350',
    btb:    '#fb8c00',
    dhntb:  '#26a69a',
    tn:     '#66bb6a',
    dnb:    '#8e24aa',
    dbscl:  '#1e88e5',
  };

  const CATEGORY_EMOJI = {
    world:       '🌍',
    intangible:  '🎭',
    documentary: '📜',
    festival:    '🎉',
    site:        '🏛️',
  };

  const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 giờ
  const VIETNAM_CENTER = [16.4, 106.6];
  const VIETNAM_ZOOM = 6;

  const BASE_LAYERS = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }),
  };

  // ---------- State ----------
  let map;
  let regionLayer;
  let markerLayer;
  let heritageData = null;      // parsed heritage.json
  let regionsGeojson = null;    // parsed regions geojson
  let regionBounds = {};        // region code -> L.LatLngBounds
  let activeRegion = null;      // current region filter (code or null)
  let selectedMarker = null;
  let lastUpdateTime = null;
  let countdownEnd = null;
  let countdownTimer = null;

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function normalize(str) {
    return (str || '').toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }

  function categoryInfo(cat) {
    return (heritageData && heritageData.categories && heritageData.categories[cat]) || { label: cat, color: '#29b6f6' };
  }

  function regionName(code) {
    const r = heritageData && heritageData.regions && heritageData.regions.find((x) => x.code === code);
    return r ? r.name : code;
  }

  // ---------- Init map ----------
  function initMap() {
    map = L.map('map', {
      center: VIETNAM_CENTER,
      zoom: VIETNAM_ZOOM,
      zoomControl: true,
      minZoom: 5,
      maxZoom: 18,
      worldCopyJump: true,
    });
    BASE_LAYERS.osm.addTo(map);
    regionLayer = L.geoJSON(null, { style: regionStyle, onEachFeature: onEachRegionFeature }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }

  function regionStyle(feature) {
    const code = feature.properties.region;
    const color = REGION_COLORS[code] || '#607d8b';
    return {
      color: color,
      weight: 1.2,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.18,
    };
  }

  function onEachRegionFeature(feature, layer) {
    const props = feature.properties;
    const code = props.region;
    // accumulate bounds
    if (!regionBounds[code]) regionBounds[code] = L.latLngBounds([]);
    regionBounds[code].extend(layer.getBounds());

    layer.bindTooltip(
      `<b>${props.name}</b><br><span class="tip-cat">${regionName(code)}</span>`,
      { sticky: true, className: 'heritage-tip', direction: 'top' }
    );

    layer.on('mouseover', () => { layer.setStyle({ fillOpacity: 0.4, weight: 2 }); layer.bringToFront(); });
    layer.on('mouseout', () => { regionLayer.resetStyle(layer); });
    layer.on('click', () => { flyToRegion(code); });
  }

  // ---------- Data loading ----------
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
    return res.json();
  }

  async function loadHeritage() {
    try {
      const data = await fetchJSON('data/heritage.json?t=' + Date.now());
      heritageData = data;
      lastUpdateTime = new Date();
      resetCountdown();
      buildSidebar();
      renderMarkers();
      updateUpdateStatus(true);
      hideError();
      return true;
    } catch (err) {
      updateUpdateStatus(false);
      showError(
        'Không thể tải dữ liệu di sản. Hãy chạy app qua máy chủ web: nháy đúp <b>start.bat</b> ' +
        '(hoặc <code>python serve.py</code>) rồi mở http://localhost:8000. ' +
        'Chi tiết: ' + err.message
      );
      return false;
    }
  }

  async function loadRegions() {
    try {
      regionsGeojson = await fetchJSON('data/vietnam-regions.geojson');
      regionLayer.addData(regionsGeojson);
      addRegionLabels();
      return true;
    } catch (err) {
      showError('Không thể tải dữ liệu ranh giới vùng: ' + err.message);
      return false;
    }
  }

  function addRegionLabels() {
    const groups = {};
    regionsGeojson.features.forEach((f) => {
      const code = f.properties.region;
      (groups[code] = groups[code] || []).push(f);
    });
    Object.keys(groups).forEach((code) => {
      if (!regionBounds[code]) return;
      const center = regionBounds[code].getCenter();
      const icon = L.divIcon({ className: '', html: `<span class="region-label">${regionName(code)}</span>`, iconSize: [0, 0] });
      L.marker(center, { icon, interactive: false }).addTo(map);
    });
  }

  // ---------- Markers ----------
  function markerIcon(cat) {
    const info = categoryInfo(cat);
    return L.divIcon({
      className: '',
      html: `<div class="heritage-marker" style="--c:${info.color}">${CATEGORY_EMOJI[cat] || '📍'}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14],
    });
  }

  function filteredHeritage() {
    if (!heritageData) return [];
    const q = normalize($('#search').value || '');
    const cats = Array.from(document.querySelectorAll('#category-filter input[type=checkbox]:checked')).map((el) => el.value);
    return heritageData.heritage.filter((it) => {
      if (!cats.includes(it.category)) return false;
      if (activeRegion && it.region !== activeRegion) return false;
      if (q) {
        const hay = normalize([
          it.name, it.province, it.type, it.summary,
          regionName(it.region), categoryInfo(it.category).label,
        ].join(' '));
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderMarkers() {
    markerLayer.clearLayers();
    const items = filteredHeritage();
    items.forEach((it) => {
      const [lng, lat] = it.coords;
      const marker = L.marker([lat, lng], { icon: markerIcon(it.category) });
      marker.bindTooltip(
        `<b>${it.name}</b><br><span class="tip-cat">${categoryInfo(it.category).label}</span>`,
        { className: 'heritage-tip', direction: 'top' }
      );
      marker.on('click', () => showDetail(it));
      marker._heritage = it;
      marker.addTo(markerLayer);
    });
    updateStats();
  }

  // ---------- Sidebar ----------
  function buildSidebar() {
    buildCategoryFilter();
    buildRegionList();
    updateStats();
  }

  function buildCategoryFilter() {
    const container = $('#category-filter');
    const cats = heritageData.categories || {};
    container.innerHTML = '';
    Object.keys(cats).forEach((cat) => {
      const info = cats[cat];
      const count = (heritageData.heritage || []).filter((it) => it.category === cat).length;
      const label = document.createElement('label');
      label.className = 'filter-item';
      label.innerHTML = `
        <input type="checkbox" value="${cat}" checked />
        <span class="filter-dot" style="background:${info.color}"></span>
        <span>${info.label}</span>
        <span class="filter-count">${count}</span>`;
      label.querySelector('input').addEventListener('change', renderMarkers);
      container.appendChild(label);
    });
  }

  function buildRegionList() {
    const container = $('#region-list');
    const regions = heritageData.regions || [];
    container.innerHTML = '';
    const allBtn = document.createElement('div');
    allBtn.className = 'region-item' + (activeRegion ? '' : ' active');
    allBtn.innerHTML = `<span class="region-swatch" style="background:#607d8b"></span><span>Tất cả các vùng</span>`;
    allBtn.addEventListener('click', () => { setRegion(null); });
    container.appendChild(allBtn);

    regions.forEach((r) => {
      const count = (heritageData.heritage || []).filter((it) => it.region === r.code).length;
      const el = document.createElement('div');
      el.className = 'region-item' + (activeRegion === r.code ? ' active' : '');
      el.innerHTML = `
        <span class="region-swatch" style="background:${REGION_COLORS[r.code] || '#607d8b'}"></span>
        <span>${r.name}</span>
        <span class="region-count">${count}</span>`;
      el.addEventListener('click', () => { setRegion(r.code); });
      container.appendChild(el);
    });
  }

  function setRegion(code) {
    activeRegion = code;
    buildRegionList();
    renderMarkers();
    if (code) flyToRegion(code);
  }

  function flyToRegion(code) {
    if (regionBounds[code]) {
      map.flyToBounds(regionBounds[code].pad(0.25), { duration: 0.8 });
    }
  }

  function updateStats() {
    const total = (heritageData && heritageData.heritage) ? heritageData.heritage.length : 0;
    const shown = filteredHeritage().length;
    $('#stats').innerHTML = `
      <span>Tổng cộng: <b>${total}</b></span>
      <span>Đang hiển thị: <b>${shown}</b></span>`;
  }

  // ---------- Detail panel ----------
  function showDetail(item) {
    const info = categoryInfo(item.category);
    const year = item.year ? item.year : '—';
    $('#detail-content').innerHTML = `
      <span class="detail-cat" style="--c:${info.color}">${info.label}</span>
      <h2>${item.name}</h2>
      <div class="detail-meta">
        <b>Loại:</b> ${item.type || '—'}<br>
        <b>Năm:</b> ${year} &nbsp;·&nbsp; <b>Địa bàn:</b> ${item.province || '—'}<br>
        <b>Vùng:</b> ${regionName(item.region)}
      </div>
      <p class="detail-summary">${item.summary || ''}</p>
      ${item.description ? `<p class="detail-desc">${item.description}</p>` : ''}
      ${item.source ? `<div class="detail-source">Nguồn: <a href="${item.source}" target="_blank" rel="noopener">${item.source}</a></div>` : ''}
    `;
    $('#detail-panel').classList.remove('hidden');
  }

  // ---------- Update mechanism ----------
  function resetCountdown() {
    countdownEnd = Date.now() + REFRESH_INTERVAL_MS;
    tickCountdown();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(tickCountdown, 1000);
  }

  function tickCountdown() {
    if (!countdownEnd) { $('#update-countdown').textContent = ''; return; }
    const left = Math.max(0, countdownEnd - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    $('#update-countdown').textContent = `Tự động cập nhật sau: ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateUpdateStatus(ok) {
    const el = $('#update-status');
    if (ok && lastUpdateTime) {
      el.textContent = `Cập nhật lần cuối: ${lastUpdateTime.toLocaleTimeString('vi-VN')} ${lastUpdateTime.toLocaleDateString('vi-VN')}`;
      el.style.color = '#26a69a';
    } else {
      el.textContent = ok ? 'Đã tải dữ liệu.' : 'Lỗi tải dữ liệu.';
      el.style.color = ok ? '#26a69a' : '#ef5350';
    }
  }

  function showError(html) {
    const el = $('#error-banner');
    el.innerHTML = html;
    el.classList.remove('hidden');
  }

  function hideError() {
    $('#error-banner').classList.add('hidden');
  }

  // ---------- Events ----------
  function bindEvents() {
    $('#btn-refresh').addEventListener('click', async () => {
      const btn = $('#btn-refresh');
      btn.disabled = true;
      btn.textContent = 'Đang cập nhật…';
      await loadHeritage();
      btn.disabled = false;
      btn.textContent = 'Cập nhật ngay';
    });

    $('#search').addEventListener('input', () => {
      renderMarkers();
    });

    $('#btn-close-detail').addEventListener('click', () => {
      $('#detail-panel').classList.add('hidden');
    });

    $('#btn-sidebar').addEventListener('click', () => {
      $('#sidebar').classList.toggle('open');
    });

    // Base layer toggle
    document.querySelectorAll('.btn-basemap').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-basemap').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const key = btn.dataset.base;
        Object.keys(BASE_LAYERS).forEach((k) => { if (map.hasLayer(BASE_LAYERS[k])) map.removeLayer(BASE_LAYERS[k]); });
        BASE_LAYERS[key].addTo(map);
      });
    });

    // Close sidebar on map click (mobile)
    map.on('click', () => $('#sidebar').classList.remove('open'));
  }

  // ---------- Boot ----------
  async function boot() {
    initMap();
    bindEvents();
    // Start data loading (regions + heritage in parallel)
    const results = await Promise.all([loadRegions(), loadHeritage()]);
    $('#loading').classList.add('hidden');
    // Auto-refresh hourly
    setInterval(loadHeritage, REFRESH_INTERVAL_MS);
    if (!results[1] && !results[0]) {
      // both failed; error already shown
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
