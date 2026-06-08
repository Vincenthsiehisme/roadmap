// 管理模式就地改字 — textOverrides 覆寫層
//
// 設計：原文(HTML / data.js / NODES)維持不動，使用者在管理模式下改的字
// 存進 state.textOverrides(key → 字串)。讀取一律走 overrideText(key, 原文)，
// 有覆寫用覆寫、沒有就回退原文。覆寫層跟著排版快照一起進雲端 payload。
//
// key 格式:
//   task:<taskId>:title / task:<taskId>:sprint   Roadmap 任務卡
//   node:<nodeId>:label / node:<nodeId>:sub        技術堆疊能力樹節點
//   head:<index>                                    堆疊樹欄位標頭
import { IS_ADMIN, state } from './state.js';
import { markDirty } from './dnd.js';

// 讀:有覆寫用覆寫,否則回退原文
export function overrideText(key, fallback) {
  const v = state.textOverrides[key];
  return (v === undefined || v === null) ? fallback : v;
}

// 寫:設定/清除一個覆寫。
// 空字串或「改回跟原文一樣」→ 刪除該 key(不存無意義 diff)。
// 回傳是否真的有變動(供 markDirty 判斷)。
export function setOverride(key, value, original) {
  const text = String(value == null ? '' : value);
  const orig = String(original == null ? '' : original);
  if (text === '' || text === orig) {
    if (key in state.textOverrides) { delete state.textOverrides[key]; return true; }
    return false;
  }
  if (state.textOverrides[key] === text) return false;
  state.textOverrides[key] = text;
  return true;
}

// 儲存 / 匯出前呼叫：把畫面上尚未 blur 的 contenteditable 最新文字，
// 強制同步回 state.textOverrides。避免使用者改完技術堆疊節點文字後，
// 直接按「儲存到雲端」時，畫面有改但覆寫層尚未 commit。
export function flushInlineEdits() {
  if (!IS_ADMIN) return;
  document.querySelectorAll('[data-edit-key]').forEach((el) => {
    const key = el.dataset.editKey;
    if (!key) return;

    const original = el.dataset.original || '';
    const text = el.textContent.replace(/\s+/g, ' ').trim();

    // 同步時也順手收掉多餘空白；若清空則回原文，和 makeEditable 的 blur 行為一致。
    el.textContent = text || original;
    const changed = setOverride(key, text, original);
    if (changed) markDirty();
  });
}

// 第一次看到某元素時,把當下文字記成 data-original(原文錨點),之後就不再覆寫此錨點
function captureOriginal(el) {
  if (!el) return '';
  if (el.dataset.original === undefined) el.dataset.original = el.textContent.trim();
  return el.dataset.original;
}

// 把一個 DOM 元素變成 admin-only 可就地編輯。
// onCommit(newText): 提交(blur / Enter)後呼叫,可選(堆疊節點用來刷新側欄)。
// originalText: 明確指定原文錨點。堆疊節點每次重畫都是新元素、且當下文字可能已是覆寫值,
//   故必須由呼叫端傳入 NODES 原文;卡片 / 欄頭是靜態 DOM,省略則自 data-original 推得。
export function makeEditable(el, key, onCommit, originalText) {
  if (!IS_ADMIN || !el) return;
  let original;
  if (originalText === undefined) {
    original = captureOriginal(el);
  } else {
    original = String(originalText == null ? '' : originalText);
    el.dataset.original = original;
  }
  el.classList.add('is-editable');
  el.setAttribute('contenteditable', 'true');
  el.setAttribute('spellcheck', 'false');
  el.dataset.editKey = key;
  el.setAttribute('title', '管理模式:點擊可直接修改文字（Enter 儲存 / Esc 取消）');

  // 編輯互動不要冒泡觸發祖先卡片 / 節點的 click 選取
  const stop = (e) => e.stopPropagation();
  el.addEventListener('click', stop);
  el.addEventListener('mousedown', stop);

  // 進入編輯先關掉祖先卡片的原生拖曳,避免「選字」跟「拖卡」打架;提交後還原
  const card = el.closest('[draggable]');
  el.addEventListener('focusin', () => { if (card) card.setAttribute('draggable', 'false'); });

  const commit = () => {
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    el.textContent = text || original;          // 收掉多餘空白節點;清空則回原文
    if (card) card.setAttribute('draggable', 'true');
    const changed = setOverride(key, text, original);
    if (changed) markDirty();
    if (onCommit) onCommit(overrideText(key, original));
  };
  el.addEventListener('blur', commit);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); el.textContent = overrideText(key, original); el.blur(); }
  });
}

// 把覆寫套到「靜態 DOM」:Roadmap 卡片標題 / Sprint 標籤 + 堆疊樹欄頭。
// 堆疊樹節點不在這裡處理 — 它由 stack.js 重畫時自行讀 overrideText。
// 載入雲端 / 匯入 JSON 後呼叫,讓畫面跟最新覆寫一致。
export function applyTextOverrides() {
  document.querySelectorAll('.task[data-task-id]').forEach((card) => {
    const id = card.dataset.taskId;
    const strong = card.querySelector('strong');
    const small = card.querySelector('small');
    if (strong) strong.textContent = overrideText(`task:${id}:title`, captureOriginal(strong));
    if (small) small.textContent = overrideText(`task:${id}:sprint`, captureOriginal(small));
  });
  document.querySelectorAll('.stk-col-head').forEach((head, i) => {
    head.textContent = overrideText(`head:${i}`, captureOriginal(head));
  });
}

// boot 時呼叫一次:先補 data-original 並套現有覆寫,再(僅管理模式)掛上可編輯。
export function initInlineEdit() {
  applyTextOverrides();
  if (!IS_ADMIN) return;
  document.querySelectorAll('.task[data-task-id]').forEach((card) => {
    const id = card.dataset.taskId;
    const strong = card.querySelector('strong');
    const small = card.querySelector('small');
    if (strong) makeEditable(strong, `task:${id}:title`);
    if (small) makeEditable(small, `task:${id}:sprint`);
  });
  document.querySelectorAll('.stk-col-head').forEach((head, i) => {
    makeEditable(head, `head:${i}`);
  });
}
