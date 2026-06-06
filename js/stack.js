// 技術堆疊能力樹 — 策劃版能力圖（與 data.js 的細粒度任務 DAG 為兩層獨立抽象）
// 互動：模式 A — 點節點點亮整條上游（琥珀）+ 下游（藍），其餘暗下。
// 標籤治理層（col 1）插在資料與演算法之間；既有業務資料（asset）預設收合成一顆，
// 點該節點或工具列「展開既有業務資料」可展開成 訂單/產品/行程/景點 四顆。
const NODES = [
  { id: 'd_spec',      layer: 'data', col: 0, x: 0, y: 24,  label: '事件規範',     sub: '埋點 · 觀測',   up: [] },
  { id: 'd_behavior',  layer: 'data', col: 0, x: 0, y: 88,  label: '行為事件',     sub: '瀏覽 · 購買',   up: [] },
  { id: 'd_decision',  layer: 'data', col: 0, x: 0, y: 152, label: '決策 · 冷啟動', sub: '偏好特徵',     up: [] },
  { id: 'd_marketing', layer: 'data', col: 0, x: 0, y: 216, label: '行銷事件',     sub: 'UTM · 推播',    up: [] },
  { id: 'd_login',     layer: 'data', col: 0, x: 0, y: 280, label: '登入註冊',     sub: '會員 · 同意',   up: [] },
  { id: 'd_idmap',     layer: 'data', col: 0, x: 0, y: 344, label: 'ID Mapping',   sub: '跨裝置串接',    up: [] },
  // 既有業務資料（已彙整、先於 roadmap 存在）— teal asset，預設收合
  { id: 'd_orders',  layer: 'data', col: 0, x: 0, y: 408, group: 'asset', label: '訂單', sub: '交易 · 加購基礎', up: [] },
  { id: 'd_product', layer: 'data', col: 0, x: 0, y: 472, group: 'asset', label: '產品', sub: '團 · 元件',       up: [] },
  { id: 'd_itin',    layer: 'data', col: 0, x: 0, y: 536, group: 'asset', label: '行程', sub: '行程主檔',        up: [] },
  { id: 'd_poi',     layer: 'data', col: 0, x: 0, y: 600, group: 'asset', label: '景點', sub: 'POI · 內容知識',  up: [] },

  // ── col 1 · 標籤治理層 ────────────────────────────────────────────────
  { id: 'g_pool', layer: 'tag', col: 1, x: 340, y: 40,  label: '原料候選池', sub: '人事地物時·價量狀通險', up: ['d_product', 'd_itin', 'd_poi', 'd_behavior'] },
  { id: 'g_a',    layer: 'tag', col: 1, x: 340, y: 150, label: 'A 產品語意', sub: '體驗強度·語意·本體',   up: ['g_pool', 'd_itin', 'd_poi'] },
  { id: 'g_b',    layer: 'tag', col: 1, x: 340, y: 214, label: 'B 販售投影', sub: '價格帶·通路·促銷',     up: ['g_pool', 'd_product', 'd_orders'] },
  { id: 'g_c',    layer: 'tag', col: 1, x: 340, y: 278, label: 'C 供給履約', sub: '成團·庫存·風險',       up: ['g_pool', 'd_product'] },
  { id: 'g_d',    layer: 'tag', col: 1, x: 340, y: 342, label: 'D 狀態事件', sub: '可售·團次·觸發',       up: ['g_pool', 'd_behavior'] },
  { id: 'g_e',    layer: 'tag', col: 1, x: 340, y: 440, group: 'gov', label: 'E 治理 metadata', sub: '來源·owner·版本·可信度', up: ['g_a', 'g_b', 'g_c', 'g_d'] },

  // ── col 2 · 演算法核心（up 已改走標籤）────────────────────────────────
  { id: 'f_retrieval',  layer: 'algo', col: 2, x: 680, y: 30,  label: '檢索與排序',    sub: 'BM25 · Hybrid · LTR',       up: ['d_spec', 'd_behavior', 'g_a', 'g_b'] },
  { id: 'f_popularity', layer: 'algo', col: 2, x: 680, y: 96,  label: '熱門與趨勢',    sub: 'Popularity · Trend',        up: ['d_behavior'] },
  { id: 'f_similarity', layer: 'algo', col: 2, x: 680, y: 162, label: '相似度',        sub: 'Embedding · CF',            up: ['d_behavior', 'g_a'] },
  { id: 'f_assoc',      layer: 'algo', col: 2, x: 680, y: 228, label: '關聯規則 · NBO', sub: 'Apriori · FP-Growth',       up: ['d_behavior', 'd_orders', 'g_b'] },
  { id: 'f_intent',     layer: 'algo', col: 2, x: 680, y: 294, label: '意圖與傾向',    sub: 'Propensity · RFM · Uplift', up: ['d_behavior', 'd_decision', 'd_marketing', 'd_orders', 'g_d'] },
  { id: 'f_rules',      layer: 'algo', col: 2, x: 680, y: 360, label: '規則與自動化',   sub: 'Rule Engine · Trigger',     up: ['d_login', 'd_marketing', 'g_d'] },
  { id: 'f_audience',   layer: 'algo', col: 2, x: 680, y: 426, label: '受眾與回饋',    sub: 'Lookalike · CAPI · Match',  up: ['d_marketing', 'd_login', 'd_behavior', 'd_idmap', 'd_orders', 'g_b'] },
  { id: 'f_genai',      layer: 'algo', col: 2, x: 680, y: 506, label: '生成與代理',    sub: 'RAG · Tool · Guardrails',   up: ['d_spec', 'g_a'] },

  // ── col 3 · 應用 / 支線 ───────────────────────────────────────────────
  { id: 'a_search',     layer: 'app', col: 3, x: 1020, y: 60,  label: 'AI 搜尋',  sub: '理解 · 召回 · 排序',  up: ['f_retrieval', 'f_similarity'] },
  { id: 'a_reco',       layer: 'app', col: 3, x: 1020, y: 200, label: '推薦',     sub: '熱門 · 相似 · 情境',  up: ['f_popularity', 'f_similarity', 'f_intent', 'f_rules'] },
  { id: 'a_cross',      layer: 'app', col: 3, x: 1020, y: 330, label: '交叉銷售', sub: 'NBO · Lookalike',     up: ['f_assoc', 'f_intent', 'f_audience'] },
  { id: 'a_activation', layer: 'app', col: 3, x: 1020, y: 430, label: '用戶活化', sub: '分眾 · 推播 · 自動化', up: ['f_intent', 'f_rules'] },
  { id: 'b_ads',        layer: 'branch', col: 3, x: 1020, y: 600, label: '廣告投放', sub: 'CAPI · Signal Gateway', up: ['f_audience', 'f_intent'] },
  // 反向支線：標籤直接回頭餵「產品規劃前的整合性思考」，跳過演算法
  { id: 'b_plan',       layer: 'branch', col: 3, x: 1020, y: 700, label: '規劃主軸建議', sub: '價格帶空缺·體驗分佈·可售缺口', up: ['g_a', 'g_b', 'g_d'] },

  // ── col 4 · 使用者終點 ────────────────────────────────────────────────
  { id: 't_pre',   layer: 'terminal', col: 4, x: 1360, y: 150, label: 'AI 助理 · 行前', sub: '引導 · 銷售 · 說資 · 提醒',   up: ['f_genai', 'a_search', 'a_reco', 'a_cross', 'a_activation'] },
  { id: 't_intra', layer: 'terminal', col: 4, x: 1360, y: 320, label: 'AI 助理 · 行中', sub: '疑難雜症 · 客訴 · 即時諮詢', up: ['f_genai', 'a_reco'] },
  { id: 't_post',  layer: 'terminal', col: 4, x: 1360, y: 490, label: 'AI 助理 · 行後', sub: '追蹤 · 互動 · 下次旅程',     up: ['f_genai', 'a_activation', 'a_cross'] },
];
const NW = { data: 150, tag: 164, algo: 166, app: 160, branch: 160, terminal: 176 };
const NH = 52;

// ── 既有業務資料（asset）收合 ───────────────────────────────────────────
const ASSET_IDS = ['d_orders', 'd_product', 'd_itin', 'd_poi'];
const ASSET_GROUP = {
  id: 'd_assets', layer: 'data', col: 0, x: 0, y: 472, group: 'asset', isGroup: true,
  label: '既有業務資料', sub: '訂單 · 產品 · 行程 · 景點（點擊展開）', up: [],
};
let collapsed = true; // 預設收合：標籤是一條單獨路線進到核心算法

const SVGNS = 'http://www.w3.org/2000/svg';
const LAYER_LABEL = { data: '資料上游', tag: '標籤治理', algo: '演算法核心', app: '應用', branch: '支線', terminal: '使用者終點' };

// 依目前收合狀態算出「有效節點 + 鄰接」：收合時排除四顆 asset、加入合成節點，
// 並把所有指向 asset 的 up 邊重映射到 d_assets（去重）。
function buildEffective() {
  const nodes = collapsed
    ? NODES.filter((n) => !ASSET_IDS.includes(n.id)).concat([ASSET_GROUP])
    : NODES.slice();
  const remap = (id) => (collapsed && ASSET_IDS.includes(id)) ? 'd_assets' : id;
  const map = {};
  nodes.forEach((n) => { n.w = NW[n.layer]; map[n.id] = n; });
  const upAdj = {};
  nodes.forEach((n) => {
    const seen = new Set();
    upAdj[n.id] = (n.up || []).map(remap).filter((u) => {
      if (u === n.id || seen.has(u) || !map[u]) return false;
      seen.add(u); return true;
    });
  });
  const down = {};
  nodes.forEach((n) => { down[n.id] = []; });
  nodes.forEach((n) => upAdj[n.id].forEach((u) => { if (down[u]) down[u].push(n.id); }));
  return { nodes, map, upAdj, down };
}

function cy(n) { return n.y + NH / 2; }

function roundPath(pts, r = 10) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i - 1]; const c = pts[i]; const nx = pts[i + 1];
    const v1 = { x: c.x - p.x, y: c.y - p.y }; const v2 = { x: nx.x - c.x, y: nx.y - c.y };
    const l1 = Math.hypot(v1.x, v1.y); const l2 = Math.hypot(v2.x, v2.y);
    if (l1 < 1 || l2 < 1) { d += ` L ${c.x} ${c.y}`; continue; }
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = { x: c.x - (v1.x / l1) * rr, y: c.y - (v1.y / l1) * rr };
    const b = { x: c.x + (v2.x / l2) * rr, y: c.y + (v2.y / l2) * rr };
    d += ` L ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function walk(start, adj) {
  const seen = new Set(); const stack = [...(adj[start] || [])];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    (adj[id] || []).forEach((x) => stack.push(x));
  }
  return seen;
}

function boot() {
  const board = document.getElementById('stkBoard');
  const svg = document.getElementById('stkEdges');
  if (!board || !svg) return; // 分頁不存在時靜默

  const panel = {
    title: document.getElementById('stkTitle'),
    sub: document.getElementById('stkSub'),
    up: document.getElementById('stkUp'),
    down: document.getElementById('stkDown'),
  };

  const layout = board.closest('.stk-layout');
  const panelToggle = document.getElementById('stkPanelToggle');
  const panelClose = document.getElementById('stkPanelClose');
  function setPanelOpen(open) {
    if (layout) layout.classList.toggle('panel-open', open);
    if (panelToggle) {
      panelToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      panelToggle.textContent = open ? '收合細節面板' : '展開細節面板';
    }
  }
  if (panelToggle) panelToggle.addEventListener('click', () => setPanelOpen(!(layout && layout.classList.contains('panel-open'))));
  if (panelClose) panelClose.addEventListener('click', () => setPanelOpen(false));

  // 這些隨收合狀態重建
  let map = {}; let upAdj = {}; let down = {}; let EDGES = [];

  function clearBoard() {
    board.querySelectorAll('.stk-node').forEach((e) => e.remove());
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    EDGES = [];
  }

  function drawEdges(nodes) {
    nodes.forEach((v) => upAdj[v.id].forEach((uid) => {
      const u = map[uid];
      if (!u) return;
      let type = 'forward';
      if (u.col === v.col) type = 'back';
      else if (v.layer === 'branch') type = 'branch';
      let pts;
      if (type === 'back') {
        const ax = u.x + u.w; const ay = cy(u); const bx = v.x + v.w; const by = cy(v);
        const bulge = Math.max(ax, bx) + 46;
        pts = [{ x: ax, y: ay }, { x: bulge, y: ay }, { x: bulge, y: by }, { x: bx, y: by }];
      } else {
        const ax = u.x + u.w; const ay = cy(u); const bx = v.x; const by = cy(v);
        const mid = (v.col - u.col >= 2) ? bx - 70 : (ax + bx) / 2;
        pts = [{ x: ax, y: ay }, { x: mid, y: ay }, { x: mid, y: by }, { x: bx, y: by }];
      }
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', roundPath(pts));
      p.setAttribute('class', `stk-edge${type === 'branch' ? ' is-branch' : ''}`);
      svg.appendChild(p);
      EDGES.push({ u: uid, v: v.id, el: p, branch: type === 'branch' });
    }));
  }

  function render() {
    clearBoard();
    const eff = buildEffective();
    map = eff.map; upAdj = eff.upAdj; down = eff.down;
    eff.nodes.forEach((n) => {
      const el = document.createElement('button');
      el.className = 'stk-node';
      el.dataset.id = n.id;
      el.dataset.layer = n.layer;
      if (n.group) el.dataset.group = n.group;
      if (n.isGroup) el.dataset.collapsed = '1';
      el.type = 'button';
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
      el.innerHTML = `<strong>${n.label}</strong><span>${n.sub}</span>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (n.isGroup) { setCollapsed(false); return; } // 點收合節點 → 展開
        select(n.id);
      });
      board.appendChild(el);
    });
    drawEdges(eff.nodes);
    updateAssetToggle();
    select(null);
  }

  function setCollapsed(v) { collapsed = v; render(); }

  function updateAssetToggle() {
    const btn = document.getElementById('stkAssetToggle');
    if (btn) {
      btn.textContent = collapsed ? '展開既有業務資料' : '收合既有業務資料';
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
  }
  const assetToggle = document.getElementById('stkAssetToggle');
  if (assetToggle) assetToggle.addEventListener('click', () => setCollapsed(!collapsed));

  board.addEventListener('click', () => select(null));

  function select(id) {
    document.querySelectorAll('.stk-node').forEach((e) => e.classList.remove('is-lit', 'is-sel', 'is-up', 'is-down'));
    if (!id || !map[id]) {
      board.classList.remove('has-sel');
      EDGES.forEach((e) => e.el.setAttribute('class', `stk-edge${e.branch ? ' is-branch' : ''}`));
      if (panel.title) panel.title.textContent = '尚未選取';
      if (panel.sub) panel.sub.textContent = '點任一節點查看完整上游路徑與下游應用。';
      if (panel.up) panel.up.innerHTML = '';
      if (panel.down) panel.down.innerHTML = '';
      setPanelOpen(false);
      return;
    }
    const sel = map[id];
    const anc = walk(id, upAdj);
    const desc = walk(id, down);
    board.classList.add('has-sel');
    setPanelOpen(true);
    document.querySelectorAll('.stk-node').forEach((e) => {
      const nid = e.dataset.id;
      if (nid === id) e.classList.add('is-sel');
      else if (anc.has(nid)) e.classList.add('is-lit', 'is-up');
      else if (desc.has(nid)) e.classList.add('is-lit', 'is-down');
    });
    EDGES.forEach((e) => {
      let cls = `stk-edge${e.branch ? ' is-branch' : ''}`;
      const upE = (e.v === id || anc.has(e.v)) && anc.has(e.u);
      const dnE = (e.u === id || desc.has(e.u)) && desc.has(e.v);
      if (upE) cls += ' up';
      else if (dnE) cls += ' down';
      else cls += ' dim';
      e.el.setAttribute('class', cls);
    });
    if (panel.title) panel.title.textContent = sel.label;
    if (panel.sub) panel.sub.textContent = `${sel.sub}　·　${LAYER_LABEL[sel.layer]}`;
    const li = (n) => `<li>${map[n].label} <em>${map[n].sub}</em></li>`;
    const ancArr = [...anc].sort((a, b) => map[a].col - map[b].col);
    const descArr = [...desc].sort((a, b) => map[a].col - map[b].col);
    if (panel.up) {
      panel.up.innerHTML = ancArr.length
        ? `<li class="stk-count up">共 ${ancArr.length} 個上游能力需先點亮</li>${ancArr.map(li).join('')}`
        : '<li class="stk-empty">無上游 — 它本身就是地基。</li>';
    }
    if (panel.down) {
      panel.down.innerHTML = descArr.length
        ? `<li class="stk-count down">撐起 ${descArr.length} 個下游</li>${descArr.map(li).join('')}`
        : '<li class="stk-empty">無下游 — 它是末端應用。</li>';
    }
  }

  const resetBtn = document.getElementById('stkReset');
  if (resetBtn) resetBtn.addEventListener('click', () => select(null));

  render(); // 首次渲染（預設收合）
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
