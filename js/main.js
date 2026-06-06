// Entry point — 還原自原始單檔版的 boot 區塊。
// index.html 只載入 main.js / phase.js / milestone.js;render / lines / dnd / io /
// cloud 全靠這裡 import 才會被瀏覽器載入執行。本檔為空時,點擊任務卡不會觸發
// selectTask → drawLines(相依線消失),且收合區塊、模式徽章、capability tag 篩選、
// 捲動重畫線等互動也一併失效。
import { TASKS } from './data.js';
import {
  shell, board, importFileInput, modeBadge, annotationHint,
} from './dom.js';
import { GAS_URL, IS_ADMIN, state } from './state.js';
import {
  selectTask, filterBy, reset, showToast,
  renderSprintPanel, filterBySprint, setSprintButtonActive,
  initSprintHeadControls, initMethodPoolChips,
} from './render.js';
import { scheduleDrawLines } from './lines.js';
import { initDragAndDrop, captureInitialLayout, hideDropIndicator } from './dnd.js';
import { exportJSON, importJSON, resetLayout } from './io.js';
import { cloudLoad, cloudSave, setCloudStatus } from './cloud.js';
import { initInlineEdit } from './edit.js';

function applyMode() {
  if (IS_ADMIN) {
    document.body.classList.add('is-admin-mode');
    if (modeBadge) { modeBadge.textContent = '管理模式'; modeBadge.classList.add('is-admin'); }
    if (annotationHint) annotationHint.textContent = '管理模式:可拖曳卡片調整 Sprint / Lane,點任務卡標題或堆疊節點文字可直接改字,改動後按「儲存到雲端」';
  } else {
    document.body.classList.remove('is-admin-mode');
    if (modeBadge) { modeBadge.textContent = '檢視模式'; modeBadge.classList.remove('is-admin'); }
    if (annotationHint) annotationHint.textContent = '檢視模式:可點擊任務卡查看相依線與方法摘要';
  }
}

function boot() {
  applyMode();
  initInlineEdit(); // 捕捉原文錨點 + 套現有覆寫;管理模式下掛上就地編輯
  initMethodPoolChips();
  initSprintHeadControls();
  renderSprintPanel('all');
  initDragAndDrop();

  // 分頁切換 + roadmap lazy init
  // roadmap 預設 hidden(stack 為預設分頁)時,boot 量 getBoundingClientRect 會抓到 0/錯位,
  // 故把版面捕捉與首次畫線延到「第一次切到 roadmap 分頁」才做。
  let roadmapInited = false;
  function ensureRoadmapInit() {
    if (roadmapInited) return;
    roadmapInited = true;
    state.INITIAL_LAYOUT = captureInitialLayout();
    scheduleDrawLines();
  }
  const tabBtns = document.querySelectorAll('.tab-btn[data-view]');
  const tabViews = {
    roadmap: document.getElementById('view-roadmap'),
    stack: document.getElementById('view-stack'),
  };
  function showView(name) {
    tabBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.view === name));
    Object.entries(tabViews).forEach(([k, el]) => { if (el) el.hidden = (k !== name); });
    if (name === 'roadmap') { ensureRoadmapInit(); requestAnimationFrame(scheduleDrawLines); }
  }
  tabBtns.forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
  // 若開頁即為 roadmap(未 hidden),立即 init;否則等首次切換
  if (tabViews.roadmap && !tabViews.roadmap.hidden) ensureRoadmapInit();

  // 收合區塊(總覽 / Inspector)— 預設 aria-expanded="false",未綁定就打不開
  document.querySelectorAll('[data-collapse-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const block = btn.closest('.collapse-block');
      if (!block) return;
      const open = block.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const hint = btn.querySelector('.collapse-hint');
      if (hint) hint.textContent = open ? '點擊收起' : '點擊展開';
    });
  });

  // 點任務卡 → 選取 → 畫相依線
  document.querySelectorAll('.task[data-task-id]').forEach((task) => {
    task.addEventListener('click', (e) => {
      if (task.classList.contains('task-dragging')) return; // 拖曳中不觸發選取
      e.preventDefault();
      e.stopPropagation();
      selectTask(task.dataset.taskId);
      task.blur();
    });
    task.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTask(task.dataset.taskId); }
    });
  });

  // 點 lane 能力標籤 → 能力篩選
  document.querySelectorAll('.tag[data-capability]').forEach((tag) => {
    tag.addEventListener('click', (e) => { e.stopPropagation(); filterBy(tag.dataset.capability); });
  });

  // 工具列能力篩選 + Sprint 篩選
  document.querySelectorAll('.toolbar-btn[data-filter]').forEach((btn) => btn.addEventListener('click', () => filterBy(btn.dataset.filter)));
  document.querySelectorAll('.sprint-filter-btn[data-sprint]').forEach((btn) => btn.addEventListener('click', () => filterBySprint(btn.dataset.sprint)));

  // 初版定義切換
  document.querySelector('[data-action="note-mode"]')?.addEventListener('click', function () {
    document.body.classList.toggle('note-mode');
    const active = document.body.classList.contains('note-mode');
    this.classList.toggle('is-active', active);
    this.textContent = active ? '隱藏初版定義' : '顯示初版定義';
  });

  // 技術細節展開 / 收合
  document.querySelector('[data-action="compact-tech"]')?.addEventListener('click', function () {
    const expanded = document.body.classList.contains('compact-tech'); // 點擊前是否為收合態
    document.body.classList.toggle('compact-tech', !expanded);
    this.classList.toggle('is-active', expanded);
    this.textContent = expanded ? '收合技術細節' : '展開技術細節';
    showToast(expanded ? '已展開技術細節' : '已收合技術細節');
    scheduleDrawLines();
  });

  // 其餘工具列動作
  document.querySelector('[data-action="reset"]')?.addEventListener('click', reset);
  document.querySelector('[data-action="export-json"]')?.addEventListener('click', exportJSON);
  document.querySelector('[data-action="import-json"]')?.addEventListener('click', () => importFileInput?.click());
  document.querySelector('[data-action="reset-layout"]')?.addEventListener('click', resetLayout);
  document.querySelector('[data-action="cloud-save"]')?.addEventListener('click', cloudSave);
  document.querySelector('[data-action="cloud-load"]')?.addEventListener('click', () => cloudLoad({ silent: false }));

  // 匯入 JSON
  importFileInput?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importJSON(file);
    e.target.value = ''; // 允許重複匯入同一檔
  });

  // 載入後,若已設定 GAS_URL 就背景拉一次最新版
  if (GAS_URL && GAS_URL !== 'PASTE_YOUR_GAS_WEB_APP_URL_HERE') {
    cloudLoad({ silent: false });
  } else {
    setCloudStatus('', '雲端未設定');
  }

  // 捲動 / 縮放時讓相依線重新對齊
  window.addEventListener('resize', () => { scheduleDrawLines(); hideDropIndicator(); });
  window.addEventListener('scroll', scheduleDrawLines, { passive: true });
  document.querySelector('.roadmap-scroll')?.addEventListener('scroll', scheduleDrawLines, { passive: true });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(scheduleDrawLines);
    if (shell) ro.observe(shell);
    if (board) ro.observe(board);
  }

  document.querySelector('.toolbar-btn[data-filter="all"]')?.classList.add('is-active');
  setSprintButtonActive('all');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
