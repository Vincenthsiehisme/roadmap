// ============================================================================
// data.js patch — 新增「標籤化與治理」線（lane: tagging）的細粒度任務 DAG
// 用法：把 TAGGING_TASKS 併進 TASKS、TAGGING_DETAILS 併進 TASK_DETAILS、
//      TAGGING_OVERRIDES 併進 TASK_METHOD_OVERRIDES、TAGGING_TAGS 併進 TAGS。
//      檔尾另列「既有任務 enables 要補的邊」，請手動補上（雙向一致）。
//
// 排列依「依賴波次」非時間：
//   波次1（統計起步，免等事件）：tag_raw_pool / tag_a_experience / tag_b_priceband / tag_e_governance
//   波次2（事件疊上）：acq_order_handoff → tag_b_projection / tag_behavior_validate / tag_d_state
//   波次3（模型化）：tag_a_semantic
//   反向支線：acq_planning_db
// ============================================================================

export const TAGGING_TASKS = {
  "tag_raw_pool": {"id":"tag_raw_pool","milestone":"M1","is_anchor":true,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次1 · 統計起步","title":"標籤原料候選池","tags":["D","T"],"phase":"Phase 1","deps":[],"enables":["tag_a_experience","tag_b_priceband","tag_d_state","tag_e_governance"],"validation":["十面向（人事地物時·價量狀通險）覆蓋率","候選詞可回溯來源系統","重複與衝突可被標記"],"limit":"原料層僅收候選訊號，允許模糊、待判斷；資料來源含既有業務線（ERP/PCM/CMS），其表結構與 API 不在本 DAG 展開。","initial":"先把既有業務線與行為訊號收進候選池並對齊十面向，不急著正式化。","method":"Schema Inventory / Candidate Term Extraction / Source Mapping / Ten-facet Alignment","output":"候選詞與訊號暫存池，對齊人事地物時·價量狀通險十面向，附來源標記。"},

  "tag_a_experience": {"id":"tag_a_experience","milestone":"M1","is_anchor":true,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次1 · 統計起步","title":"A 體驗強度標籤（座標 / POI / 天數）","tags":["T","B"],"phase":"Phase 1","deps":["tag_raw_pool"],"enables":["tag_e_governance","tag_behavior_validate","tag_a_semantic","reco_similar","search_beta","acq_planning_db"],"validation":["強度分級與人工標註一致率","同線同天數可比較","極端值可解釋"],"limit":"此層工程重點不在補更多行程文字，而在把既有內容轉成可比較、可摘要的結構；純統計起步，不需等行為事件。","initial":"先用地理密度與 POI 聚合的規則型強度分數起步，行為與 embedding 後續疊加。","method":"Geo Density / POI Aggregation / Pace Index / Rule Scoring","output":"行程體驗強度分級與每日強度曲線（鬆-緊、輕-深），對應報告第一痛點。"},

  "tag_b_priceband": {"id":"tag_b_priceband","milestone":"M1","is_anchor":false,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次1 · 統計起步","title":"B 價格帶標籤（線別 × 天數 高中低）","tags":["T","B"],"phase":"Phase 1","deps":["tag_raw_pool"],"enables":["tag_e_governance","tag_b_projection","tag_behavior_validate","reco_segment_content","cross_decision_pref","acq_planning_db"],"validation":["同桶（線別×天數）內分位有鑑別力","高中低標籤與實際成交價單調","跨桶不可直接比"],"limit":"純統計起步、不需事件；但分位若擠在一起即無鑑別力，須過效度審計再決定能否當主依據。","initial":"先做線別×天數分桶內的分位標註，季節調整與毛利感知後續補。","method":"Quantile / Percentile Binning / Winsorize / Seasonality Adjust","output":"每商品在 (線別,天數) 桶內的價格高/中/低標籤與分位數據。"},

  "tag_e_governance": {"id":"tag_e_governance","milestone":"M1","is_anchor":true,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次1 → 全程 · 橫切","title":"E 治理 metadata（標籤本身的身分證）","tags":["V","D"],"phase":"Phase 1 → 5","deps":["tag_a_experience","tag_b_priceband"],"enables":[],"validation":["每個標籤可回答誰給的 / 多可信 / 何時失效","過期標籤能被下游自動排除","版本可回溯"],"limit":"E 是治理層、不是第五種商品標籤；它描述 A–D 標籤本身，人定規則、系統自動填值。","initial":"先為 A、B 兩顆統計標籤掛上來源 / owner / 信心分 / 版本 / 生效期，再隨 C、D 擴張。","method":"Data Contract / Lineage / Confidence Scoring / Versioning / Validity Window","output":"每顆 A–D 標籤的來源、owner、信心分數、版本、生效期與適用範圍。"},

  "acq_order_handoff": {"id":"acq_order_handoff","milestone":"M2","is_anchor":true,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次2 · 取數分支","title":"下單拋轉業務 persona（聯絡基礎 + 投影取數）","tags":["A","O"],"phase":"Phase 2","deps":["df_purchase_events","tag_b_priceband"],"enables":["tag_b_projection"],"validation":["拋轉到位率","業務回填的投影標籤可回收","聯絡基礎是否縮短首次接觸時間"],"limit":"分支測試性質；雙重價值——業務工具落地 + B 層投影標籤取數來源。","initial":"先在下單後帶 A/B 標籤拋轉給對應業務 persona 當聯絡基礎，同步回收業務實際主推與標客訊號。","method":"Order Event Hook / Persona Routing / Contact-basis Payload / Feedback Capture","output":"下單後的業務聯絡基礎（帶標籤）+ 回收的銷售投影訊號。"},

  "tag_b_projection": {"id":"tag_b_projection","milestone":"M2","is_anchor":false,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次2 · 行為疊加","title":"B 投影標籤（通路 / 推廣 / 銷售場景）","tags":["T","I"],"phase":"Phase 2 → 4","deps":["tag_b_priceband","acq_order_handoff","df_marketing_events"],"enables":["reco_segment_content","cross_related","act_segment_push","acq_planning_db"],"validation":["同商品跨通路投影不同且可解釋","投影標籤與實際通路成效相關"],"limit":"報告顯示 B 層投影資料目前整片空白；先靠 acq_order_handoff 回收，再逐步模型化。","initial":"先以通路適用規則與促銷標註起步，傾向投影後續補。","method":"Channel Suitability Rule / Promotion Tagging / Sales-scene Mapping","output":"同商品在不同通路 / 情境的投影值（通路適用性、推廣優先、銷售場景）。"},

  "tag_behavior_validate": {"id":"tag_behavior_validate","milestone":"M2","is_anchor":false,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次2 · 行為疊加","title":"行為回驗層","tags":["T","O"],"phase":"Phase 2","deps":["df_browse_events","df_purchase_events","tag_a_experience","tag_b_priceband"],"enables":["tag_a_semantic","reco_similar"],"validation":["統計標籤與行為訊號的一致性","抓出標了高卻沒人買的矛盾分桶"],"limit":"只做回驗與修正，不取代統計標籤；需行為事件累積到一定量。","initial":"先用共現與親和回驗 A、B 標籤站不站得住，修正異常分桶。","method":"Co-occurrence / Affinity / Exposure-weighted Popularity","output":"統計標籤的行為驗證結果與異常分桶修正建議。"},

  "tag_d_state": {"id":"tag_d_state","milestone":"M4","is_anchor":false,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次2 · 行為疊加","title":"D 狀態事件標籤","tags":["T","A"],"phase":"Phase 2 → 4","deps":["tag_raw_pool","df_browse_events"],"enables":["reco_context","act_stage_label","acq_planning_db"],"validation":["狀態與真實系統一致","事件觸發不誤放"],"limit":"C/D 邊界：C 是供給事實（成團 12 人、庫存 30），D 是衍生狀態（已收 8 人、剩席低於門檻、出發前 14 天觸發）。","initial":"先以規則引擎產生可售性與團次狀態，事件串流後續補。","method":"Rule Engine / State Mapping / Trigger Eligibility","output":"可售性、團次狀態、曝光狀態與事件觸發條件（隨時間變）。"},

  "tag_a_semantic": {"id":"tag_a_semantic","milestone":"M3","is_anchor":false,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"波次3 · 模型化","title":"A 語意標籤（embedding / AI 抽詞）","tags":["T","H"],"phase":"Phase 3 → 5","deps":["tag_a_experience","tag_behavior_validate","search_vector"],"enables":["search_app_launch","reco_similar","dt_pretrip"],"validation":["語意標籤與人定 ontology 對齊","召回品質提升可被衡量"],"limit":"人定 ontology、AI 補詞；需搜尋向量化能力到位。","initial":"先在既有體驗 / 語意標籤上加 embedding 與 AI 抽詞，人工審核把關。","method":"Embedding / AI Term Extraction / Human-in-the-loop Review","output":"產品語意向量與語意標籤（人定架構、AI 補詞）。"},

  "acq_planning_db": {"id":"acq_planning_db","milestone":"M5","is_anchor":true,"lane":"tagging","laneTitle":"標籤化與治理","sprint":"反向支線","title":"產品規劃前 database 主軸建議","tags":["T","B"],"phase":"Phase 2 → 5","deps":["tag_a_experience","tag_b_priceband","tag_b_projection","tag_d_state"],"enables":[],"validation":["規劃者是否拿來當開案起手依據","建議與實際開案的命中"],"limit":"反向流——標籤不只餵算法，也回頭餵產品規劃前的整合性思考；支線終點。","initial":"先彙整某線×天數×價格帶的空缺、體驗強度分佈與可售缺口，當開案資料庫。","method":"Tag Aggregation / Gap Detection / Price-band Whitespace / Planning Brief","output":"規劃前主軸建議（價格帶空缺、體驗分佈、可售缺口）。"},
};

export const TAGGING_DETAILS = {
  "tagging": {"method":"Ten-facet Alignment / Quantile Binning / Geo Scoring / Confidence Scoring / Versioning / Embedding","output":"原料候選池、A–D 業務標籤、E 治理 metadata、規劃主軸建議。"},
};

export const TAGGING_OVERRIDES = {
  "tag_raw_pool":      {"core":["Schema Inventory","Candidate Term Extraction"],"support":["Source Mapping","Ten-facet Alignment"],"later":["AI Term Extraction","NER"],"maturity":"Phase 1：先把資料 × 業務線收進候選池，允許模糊待判斷。"},
  "tag_a_experience":  {"core":["Geo Density","POI Aggregation","Pace Index"],"support":["Rule Scoring"],"later":["Embedding Experience Vector"],"maturity":"Phase 1：統計型起步，把體驗強度結構化成可比較的分級。"},
  "tag_b_priceband":   {"core":["Quantile","Percentile Binning"],"support":["Winsorize","Seasonality Adjust"],"later":["Margin-aware Tier","Propensity Price Tier"],"maturity":"Phase 1：桶內分位起步，先過效度審計再升級。"},
  "tag_e_governance":  {"core":["Data Contract","Confidence Scoring","Versioning"],"support":["Lineage","Validity Window","Owner Assignment"],"later":["Auto-decay","Drift Alert"],"maturity":"Phase 1 → 5：橫切治理層，從 A、B 兩顆標籤掛起，隨 C、D 擴張。"},
  "acq_order_handoff": {"core":["Order Event Hook","Persona Routing"],"support":["Contact-basis Payload","Feedback Capture"],"later":["Next-Best-Contact"],"maturity":"Phase 2：取數分支，下單拋轉同時回收 B 投影訊號。"},
  "tag_b_projection":  {"core":["Channel Suitability Rule","Promotion Tagging"],"support":["Sales-scene Mapping"],"later":["Propensity Projection"],"maturity":"Phase 2 → 4：先規則投影，再傾向化。"},
  "tag_behavior_validate": {"core":["Co-occurrence","Affinity"],"support":["Exposure-weighted Popularity"],"later":["Embedding Similarity"],"maturity":"Phase 2：用行為回驗統計標籤、抓矛盾分桶。"},
  "tag_d_state":       {"core":["Rule Engine","State Mapping"],"support":["Trigger Eligibility"],"later":["Event Streaming"],"maturity":"Phase 2 → 4：規則引擎產生狀態，與 C 層供給事實區隔。"},
  "tag_a_semantic":    {"core":["Embedding","AI Term Extraction"],"support":["Human-in-the-loop Review"],"later":["Multilingual Semantic Align"],"maturity":"Phase 3 → 5：在統計標籤上疊語意，需向量化到位。"},
  "acq_planning_db":   {"core":["Tag Aggregation","Gap Detection"],"support":["Price-band Whitespace"],"later":["Generative Planning Brief"],"maturity":"Phase 2 → 5：反向把標籤彙整成開案資料庫。"},
};

// 併進既有 TAGS（標籤圖例）
export const TAGGING_TAGS = { "T": ["Tagging", "標籤化"], "V": ["Governance", "治理"] };

/* ── 既有任務 enables 要補的邊（讓上下游雙向一致）──────────────────────────
 * df_browse_events.enables   += ["tag_raw_pool","tag_behavior_validate"]
 * df_purchase_events.enables += ["acq_order_handoff","tag_behavior_validate"]
 * df_marketing_events.enables+= ["tag_b_projection"]
 * search_vector.enables      += ["tag_a_semantic"]
 *
 * 選配（若要演算法任務的 deps 也顯示吃到標籤，視 Phase 排序自行決定）：
 * reco_similar.deps          += ["tag_a_experience"]
 * reco_segment_content.deps  += ["tag_b_priceband"]
 * act_stage_label.deps       += ["tag_d_state"]
 * ────────────────────────────────────────────────────────────────────── */
