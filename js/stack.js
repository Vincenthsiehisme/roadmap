// 技術堆疊能力樹 — 策劃版能力圖（與 data.js 的細粒度任務 DAG 為兩層獨立抽象）
// 互動：模式 A — 點節點點亮整條上游（琥珀）+ 下游（藍），其餘暗下。
const NODES = [
  { id: 'd_spec',      layer: 'data',   col: 0, x: 0,   y: 24,  label: '事件規範',     sub: '埋點 · 觀測',          up: [] },
  { id: 'd_behavior',  layer: 'data',   col: 0, x: 0,   y: 88, label: '行為事件',     sub: '瀏覽 · 購買',          up: [] },
  { id: 'd_decision',  layer: 'data',   col: 0, x: 0,   y: 152, label: '決策 · 冷啟動', sub: '偏好特徵',             up: [] },
  { id: 'd_marketing', layer: 'data',   col: 0, x: 0,   y: 216, label: '行銷事件',     sub: 'UTM · 推播',           up: [] },
  { id: 'd_login',     layer: 'data',   col: 0, x: 0,   y: 280, label: '登入註冊',     sub: '會員 · 同意',          up: [] },
  { id: 'd_idmap',     layer: 'data',   col: 0, x: 0,   y: 344, label: 'ID Mapping',   sub: '跨裝置串接',           up: [] },

  // 既有業務資料（已彙整、先於 roadmap 存在）— 同屬資料上游，teal 標示
  { id: 'd_orders',    layer: 'data',   col: 0, x: 0,   y: 408, group: 'asset', label: '訂單',     sub: '交易 · 加購基礎', up: [] },
  { id: 'd_product',   layer: 'data',   col: 0, x: 0,   y: 472, group: 'asset', label: '產品',     sub: '團 · 元件',       up: [] },
  { id: 'd_itin',      layer: 'data',   col: 0, x: 0,   y: 536, group: 'asset', label: '行程',     sub: '行程主檔',        up: [] },
  { id: 'd_poi',       layer: 'data',   col: 0, x: 0,   y: 600, group: 'asset', label: '景點',     sub: 'POI · 內容知識',  up: [] },

  { id: 'f_retrieval',  layer: 'algo', col: 1, x: 340, y: 30,  label: '檢索與排序',    sub: 'BM25 · Hybrid · LTR',     up: ['d_spec', 'd_behavior', 'd_product', 'd_poi'] },
  { id: 'f_popularity', layer: 'algo', col: 1, x: 340, y: 96,  label: '熱門與趨勢',    sub: 'Popularity · Trend',      up: ['d_behavior'] },
  { id: 'f_similarity', layer: 'algo', col: 1, x: 340, y: 162, label: '相似度',        sub: 'Embedding · CF',          up: ['d_behavior', 'd_product', 'd_itin'] },
  { id: 'f_assoc',      layer: 'algo', col: 1, x: 340, y: 228, label: '關聯規則 · NBO', sub: 'Apriori · FP-Growth',     up: ['d_behavior', 'd_orders'] },
  { id: 'f_intent',     layer: 'algo', col: 1, x: 340, y: 294, label: '意圖與傾向',    sub: 'Propensity · RFM · Uplift', up: ['d_behavior', 'd_decision', 'd_marketing', 'd_orders'] },
  { id: 'f_rules',      layer: 'algo', col: 1, x: 340, y: 360, label: '規則與自動化',   sub: 'Rule Engine · Trigger',   up: ['d_login', 'd_marketing'] },
  { id: 'f_audience',   layer: 'algo', col: 1, x: 340, y: 426, label: '受眾與回饋',    sub: 'Lookalike · CAPI · Match', up: ['d_marketing', 'd_login', 'd_behavior', 'd_idmap', 'd_orders'] },
  { id: 'f_genai',      layer: 'algo', col: 1, x: 340, y: 506, label: '生成與代理',    sub: 'RAG · Tool · Guardrails', up: ['d_spec', 'd_itin', 'd_poi'] },

  { id: 'a_search',     layer: 'app', col: 2, x: 700, y: 60,  label: 'AI 搜尋',     sub: '理解 · 召回 · 排序',  up: ['f_retrieval', 'f_similarity'] },
  { id: 'a_reco',       layer: 'app', col: 2, x: 700, y: 200, label: '推薦',        sub: '熱門 · 相似 · 情境',  up: ['f_popularity', 'f_similarity', 'f_intent', 'f_rules'] },
  { id: 'a_cross',      layer: 'app', col: 2, x: 700, y: 330, label: '交叉銷售',    sub: 'NBO · Lookalike',     up: ['f_assoc', 'f_intent', 'f_audience'] },
  { id: 'a_activation', layer: 'app', col: 2, x: 700, y: 430, label: '用戶活化',    sub: '分眾 · 推播 · 自動化', up: ['f_intent', 'f_rules'] },
  { id: 'b_ads',        layer: 'branch', col: 2, x: 700, y: 640, label: '廣告投放', sub: 'CAPI · Signal Gateway · 受眾', up: ['f_audience', 'f_intent'] },

  // 使用者終點 — AI 旅程助理（行前 / 行中 / 行後）。所有應用輸出收斂於此，是終點而非與應用並列。
  { id: 't_pre',   layer: 'terminal', col: 3, x: 1040, y: 150, label: 'AI 助理 · 行前', sub: '引導 · 銷售 · 說資 · 提醒',     up: ['f_genai', 'a_search', 'a_reco', 'a_cross', 'a_activation'] },
  { id: 't_intra', layer: 'terminal', col: 3, x: 1040, y: 320, label: 'AI 助理 · 行中', sub: '疑難雜症 · 客訴 · 即時諮詢',   up: ['f_genai', 'a_reco'] },
  { id: 't_post',  layer: 'terminal', col: 3, x: 1040, y: 490, label: 'AI 助理 · 行後', sub: '追蹤 · 互動 · 下次旅程',       up: ['f_genai', 'a_activation', 'a_cross'] },
];
const NW = { data: 150, algo: 166, app: 160, branch: 160, terminal: 176 };
const NH = 52;
const map = {};
NODES.forEach((n) => { n.w = NW[n.layer]; map[n.id] = n; });
const down = {};
NODES.forEach((n) => { down[n.id] = []; });
NODES.forEach((n) => n.up.forEach((u) => { if (down[u]) down[u].push(n.id); }));
const upAdj = {};
NODES.forEach((n) => { upAdj[n.id] = n.up; });

const SVGNS = 'http://www.w3.org/2000/svg';
const LAYER_LABEL = { data: '資料上游', algo: '演算法核心', app: '應用', branch: '支線', terminal: '使用者終點' };

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

  NODES.forEach((n) => {
    const el = document.createElement('button');
    el.className = 'stk-node';
    el.dataset.id = n.id;
    el.dataset.layer = n.layer;
    if (n.group) el.dataset.group = n.group;
    el.type = 'button';
    el.style.left = `${n.x}px`;
    el.style.top = `${n.y}px`;
    el.innerHTML = `<strong>${n.label}</strong><span>${n.sub}</span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); select(n.id); });
    board.appendChild(el);
  });
  board.addEventListener('click', () => select(null));

  const EDGES = [];
  NODES.forEach((v) => v.up.forEach((uid) => {
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
      // 跨欄（≥2 欄）的前向線：把縱向轉折挪到目標欄左側，避免穿過中間欄的節點
      const mid = (v.col - u.col >= 2) ? bx - 70 : (ax + bx) / 2;
      pts = [{ x: ax, y: ay }, { x: mid, y: ay }, { x: mid, y: by }, { x: bx, y: by }];
    }
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', roundPath(pts));
    p.setAttribute('class', `stk-edge${type === 'branch' ? ' is-branch' : ''}`);
    svg.appendChild(p);
    EDGES.push({ u: uid, v: v.id, el: p, branch: type === 'branch' });
  }));

  function select(id) {
    document.querySelectorAll('.stk-node').forEach((e) => e.classList.remove('is-lit', 'is-sel', 'is-up', 'is-down'));
    if (!id) {
      board.classList.remove('has-sel');
      EDGES.forEach((e) => e.el.setAttribute('class', `stk-edge${e.branch ? ' is-branch' : ''}`));
      if (panel.title) panel.title.textContent = '尚未選取';
      if (panel.sub) panel.sub.textContent = '點任一節點查看完整上游路徑與下游應用。';
      if (panel.up) panel.up.innerHTML = '';
      if (panel.down) panel.down.innerHTML = '';
      return;
    }
    const sel = map[id];
    const anc = walk(id, upAdj);
    const desc = walk(id, down);
    board.classList.add('has-sel');
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
