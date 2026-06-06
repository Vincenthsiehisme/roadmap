/* ============================================================================
 * 能力樹 patch — 在 data 與 algo 之間插入「標籤治理層」(col 1)，演算法整欄右移
 * 用法：以下整段 NODES / NW / LAYER_LABEL 直接「取代」stack.js 中對應的三個定義。
 * 另把檔尾的 CSS 區塊貼進 styles.css。
 *
 * 改了哪幾條邊（演算法 up，原本直連資產 → 改走標籤）：
 *   f_retrieval : ['d_spec','d_behavior','d_product','d_poi']        → ['d_spec','d_behavior','g_a','g_b']
 *   f_similarity: ['d_behavior','d_product','d_itin']                → ['d_behavior','g_a']
 *   f_assoc     : ['d_behavior','d_orders']                          → ['d_behavior','d_orders','g_b']
 *   f_intent    : [...,'d_orders']                                   → [...,'d_orders','g_d']
 *   f_rules     : ['d_login','d_marketing']                          → ['d_login','d_marketing','g_d']
 *   f_audience  : [...,'d_orders']                                   → [...,'d_orders','g_b']
 *   f_genai     : ['d_spec','d_itin','d_poi']                        → ['d_spec','g_a']
 *   f_popularity: 不動（純行為訊號，不經標籤）
 * 新增：標籤層 6 節點（g_pool / g_a / g_b / g_c / g_d / g_e）+ 反向支線 b_plan
 * 欄位 x 位移：algo 340→680、app/branch 700→1020、terminal 1040→1360
 * ==========================================================================*/

const NODES = [
  // ── col 0 · 資料上游（不動）──────────────────────────────────────────────
  { id: 'd_spec',      layer: 'data', col: 0, x: 0, y: 24,  label: '事件規範',     sub: '埋點 · 觀測',   up: [] },
  { id: 'd_behavior',  layer: 'data', col: 0, x: 0, y: 88,  label: '行為事件',     sub: '瀏覽 · 購買',   up: [] },
  { id: 'd_decision',  layer: 'data', col: 0, x: 0, y: 152, label: '決策 · 冷啟動', sub: '偏好特徵',     up: [] },
  { id: 'd_marketing', layer: 'data', col: 0, x: 0, y: 216, label: '行銷事件',     sub: 'UTM · 推播',    up: [] },
  { id: 'd_login',     layer: 'data', col: 0, x: 0, y: 280, label: '登入註冊',     sub: '會員 · 同意',   up: [] },
  { id: 'd_idmap',     layer: 'data', col: 0, x: 0, y: 344, label: 'ID Mapping',   sub: '跨裝置串接',    up: [] },
  // 既有業務資料（已彙整、先於 roadmap 存在）— teal asset
  { id: 'd_orders',  layer: 'data', col: 0, x: 0, y: 408, group: 'asset', label: '訂單', sub: '交易 · 加購基礎', up: [] },
  { id: 'd_product', layer: 'data', col: 0, x: 0, y: 472, group: 'asset', label: '產品', sub: '團 · 元件',       up: [] },
  { id: 'd_itin',    layer: 'data', col: 0, x: 0, y: 536, group: 'asset', label: '行程', sub: '行程主檔',        up: [] },
  { id: 'd_poi',     layer: 'data', col: 0, x: 0, y: 600, group: 'asset', label: '景點', sub: 'POI · 內容知識',  up: [] },

  // ── col 1 · 標籤治理層（新增）────────────────────────────────────────────
  // 用治理把「資料 × 既有業務線」收合進原料池 → 長出 A–D 標籤 → E 包覆可信度 → 才進算法
  { id: 'g_pool', layer: 'tag', col: 1, x: 340, y: 40,  label: '原料候選池', sub: '人事地物時·價量狀通險', up: ['d_product', 'd_itin', 'd_poi', 'd_behavior'] },
  { id: 'g_a',    layer: 'tag', col: 1, x: 340, y: 150, label: 'A 產品語意', sub: '體驗強度·語意·本體',   up: ['g_pool', 'd_itin', 'd_poi'] },
  { id: 'g_b',    layer: 'tag', col: 1, x: 340, y: 214, label: 'B 販售投影', sub: '價格帶·通路·促銷',     up: ['g_pool', 'd_product', 'd_orders'] },
  { id: 'g_c',    layer: 'tag', col: 1, x: 340, y: 278, label: 'C 供給履約', sub: '成團·庫存·風險',       up: ['g_pool', 'd_product'] },
  { id: 'g_d',    layer: 'tag', col: 1, x: 340, y: 342, label: 'D 狀態事件', sub: '可售·團次·觸發',       up: ['g_pool', 'd_behavior'] },
  { id: 'g_e',    layer: 'tag', col: 1, x: 340, y: 440, group: 'gov', label: 'E 治理 metadata', sub: '來源·owner·版本·可信度', up: ['g_a', 'g_b', 'g_c', 'g_d'] },

  // ── col 2 · 演算法核心（x 340→680，up 已改走標籤）────────────────────────
  { id: 'f_retrieval',  layer: 'algo', col: 2, x: 680, y: 30,  label: '檢索與排序',    sub: 'BM25 · Hybrid · LTR',       up: ['d_spec', 'd_behavior', 'g_a', 'g_b'] },
  { id: 'f_popularity', layer: 'algo', col: 2, x: 680, y: 96,  label: '熱門與趨勢',    sub: 'Popularity · Trend',        up: ['d_behavior'] },
  { id: 'f_similarity', layer: 'algo', col: 2, x: 680, y: 162, label: '相似度',        sub: 'Embedding · CF',            up: ['d_behavior', 'g_a'] },
  { id: 'f_assoc',      layer: 'algo', col: 2, x: 680, y: 228, label: '關聯規則 · NBO', sub: 'Apriori · FP-Growth',       up: ['d_behavior', 'd_orders', 'g_b'] },
  { id: 'f_intent',     layer: 'algo', col: 2, x: 680, y: 294, label: '意圖與傾向',    sub: 'Propensity · RFM · Uplift', up: ['d_behavior', 'd_decision', 'd_marketing', 'd_orders', 'g_d'] },
  { id: 'f_rules',      layer: 'algo', col: 2, x: 680, y: 360, label: '規則與自動化',   sub: 'Rule Engine · Trigger',     up: ['d_login', 'd_marketing', 'g_d'] },
  { id: 'f_audience',   layer: 'algo', col: 2, x: 680, y: 426, label: '受眾與回饋',    sub: 'Lookalike · CAPI · Match',  up: ['d_marketing', 'd_login', 'd_behavior', 'd_idmap', 'd_orders', 'g_b'] },
  { id: 'f_genai',      layer: 'algo', col: 2, x: 680, y: 506, label: '生成與代理',    sub: 'RAG · Tool · Guardrails',   up: ['d_spec', 'g_a'] },

  // ── col 3 · 應用 / 支線（x 700→1020，up 不動）───────────────────────────
  { id: 'a_search',     layer: 'app', col: 3, x: 1020, y: 60,  label: 'AI 搜尋',  sub: '理解 · 召回 · 排序',  up: ['f_retrieval', 'f_similarity'] },
  { id: 'a_reco',       layer: 'app', col: 3, x: 1020, y: 200, label: '推薦',     sub: '熱門 · 相似 · 情境',  up: ['f_popularity', 'f_similarity', 'f_intent', 'f_rules'] },
  { id: 'a_cross',      layer: 'app', col: 3, x: 1020, y: 330, label: '交叉銷售', sub: 'NBO · Lookalike',     up: ['f_assoc', 'f_intent', 'f_audience'] },
  { id: 'a_activation', layer: 'app', col: 3, x: 1020, y: 430, label: '用戶活化', sub: '分眾 · 推播 · 自動化', up: ['f_intent', 'f_rules'] },
  { id: 'b_ads',        layer: 'branch', col: 3, x: 1020, y: 600, label: '廣告投放', sub: 'CAPI · Signal Gateway', up: ['f_audience', 'f_intent'] },
  // 反向支線：標籤直接回頭餵「產品規劃前的整合性思考」，跳過演算法
  { id: 'b_plan',       layer: 'branch', col: 3, x: 1020, y: 700, label: '規劃主軸建議', sub: '價格帶空缺·體驗分佈·可售缺口', up: ['g_a', 'g_b', 'g_d'] },

  // ── col 4 · 使用者終點（x 1040→1360，up 不動）──────────────────────────
  { id: 't_pre',   layer: 'terminal', col: 4, x: 1360, y: 150, label: 'AI 助理 · 行前', sub: '引導 · 銷售 · 說資 · 提醒',   up: ['f_genai', 'a_search', 'a_reco', 'a_cross', 'a_activation'] },
  { id: 't_intra', layer: 'terminal', col: 4, x: 1360, y: 320, label: 'AI 助理 · 行中', sub: '疑難雜症 · 客訴 · 即時諮詢', up: ['f_genai', 'a_reco'] },
  { id: 't_post',  layer: 'terminal', col: 4, x: 1360, y: 490, label: 'AI 助理 · 行後', sub: '追蹤 · 互動 · 下次旅程',     up: ['f_genai', 'a_activation', 'a_cross'] },
];
const NW = { data: 150, tag: 164, algo: 166, app: 160, branch: 160, terminal: 176 };
const NH = 52;
const LAYER_LABEL = { data: '資料上游', tag: '標籤治理', algo: '演算法核心', app: '應用', branch: '支線', terminal: '使用者終點' };

/* ── 貼進 styles.css ─────────────────────────────────────────────────────
.stk-node[data-layer=tag] { background:#ecfdf5; border-color:#86efac; width:164px; }
.stk-node[data-layer=tag] strong { color:#15803d; }
.stk-node[data-layer=tag] span { color:#15803d; opacity:.8; }
.stk-node[data-layer=tag][data-group=gov] { background:#d1fae5; border-color:#34d399; }
.stk-node[data-layer=tag][data-group=gov] strong { color:#065f46; }
.stk-node[data-layer=tag][data-group=gov] span { color:#065f46; opacity:.85; }
   ────────────────────────────────────────────────────────────────────── */
