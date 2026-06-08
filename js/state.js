// Cloud config + shared mutable UI state
  /* GAS Web App URL — 部署 Apps Script Web App 之後填入。
     格式:https://script.google.com/macros/s/AKfycb.../exec */
  export const GAS_URL = 'https://script.google.com/macros/s/AKfycbyCZ53yRpAJ16uwyFKqUYWEqwD_m90Zxrfxf3aK6yI5xrL-VjQtmeBER8jkbY99JJb-/exec';

  /* Admin token — 從 URL ?admin=xxx 讀取,不寫死在 HTML 內。
     使用方式:書籤存「https://你的網址/?admin=你的token」,平常分享不帶 token。 */
  const urlParams = new URLSearchParams(window.location.search);
  export const ADMIN_TOKEN = urlParams.get('admin') || '';
  export const IS_ADMIN = !!ADMIN_TOKEN;

export const state = {
  selectedTaskId: null,
  activeSprint: 'all',
  isDirty: false,
  INITIAL_LAYOUT: null,
  // 手動改字覆寫層。key 格式:
  //   task:<taskId>:title / task:<taskId>:sprint  (Roadmap 任務卡)
  //   node:<nodeId>:label / node:<nodeId>:sub      (技術堆疊能力樹節點)
  //   head:<index>                                  (堆疊樹欄位標頭)
  // 值為使用者輸入的字串;沒有 key 就回退到原文(HTML / data.js / NODES)。
  textOverrides: {},
};
