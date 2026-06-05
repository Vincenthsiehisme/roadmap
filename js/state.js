// Cloud config + shared mutable UI state
  /* GAS Web App URL — 部署 Apps Script Web App 之後填入。
     格式:https://script.google.com/macros/s/AKfycb.../exec */
  export const GAS_URL = 'https://script.google.com/macros/s/AKfycbz-nsNY8tqpfU7d2n_JjgIZdd1wuA1tyet49-_V7guskvzpOKYYmjXkXIMKnI9C5b8G/exec';

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
};
