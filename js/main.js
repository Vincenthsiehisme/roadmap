// Entry point — wires DOM events to module behaviour and boots the board.
// NOTE: 這個檔是整個互動層的進入點。index.html 只載入 main.js / phase.js /
// milestone.js,而 render / lines / dnd / io / cloud 全靠這裡 import 才會被瀏覽器
// 載入並執行。一旦本檔為空,點擊任務卡不會觸發 selectTask → drawLines,
// 相依連結線就完全畫不出來。
import { TASKS } from './data.js';
import { board, importFileInput } from './dom.js';
import { IS_ADMIN, state } from './state.js';
import {
  selectTask,
  filterBy,
  reset,
  renderSprintPanel,
  filterBySprint,
  initSprintHeadControls,
  initMethodPoolChips,
} from './render.js';
import { scheduleDrawLines } from './lines.js';
import { initDragAndDrop, captureInitialLayout } from './dnd.js';
import { exportJSON, importJSON, resetLayout } from './io.js';
import { cloudLoad, cloudSave } from './cloud.js';

function handleAction(action, btn) {
  switch (action) {
    case 'compact-tech': {
      const collapsed = document.body.classList.toggle('compact-tech');
      btn.classList.toggle('is-active', !collapsed);
      btn.textContent = collapsed ? '展開技術細節' : '收合技術細節';
      if (state.selectedTaskId) scheduleDrawLines();
      break;
    }
    case 'note-mode': {
      const on = document.body.classList.toggle('note-mode');
      btn.classList.toggle('is-active', on);
      btn.textContent = on ? '隱藏初版定義' : '顯示初版定義';
      if (state.selectedTaskId) scheduleDrawLines();
      break;
    }
    case 'reset':
      reset();
      break;
    case 'export-json':
      exportJSON();
      break;
    case 'import-json':
      importFileInput?.click();
      break;
    case 'reset-layout':
      resetLayout();
      break;
    case 'cloud-save':
      cloudSave();
      break;
    case 'cloud-load':
      cloudLoad();
      break;
    default:
      break;
  }
}

function boot() {
  // 管理者模式:讓 [data-admin-only] 工具列按鈕可見(CSS 用 .is-admin-mode 控制)
  if (IS_ADMIN) document.body.classList.add('is-admin-mode');

  // 記錄初始佈局,供「重設位置」還原
  state.INITIAL_LAYOUT = captureInitialLayout();

  // 點任務卡 → 選取 → 畫相依線(事件委派在 board 上)
  if (board) {
    board.addEventListener('click', (e) => {
      const taskBtn = e.target.closest('.task[data-task-id]');
      if (!taskBtn || !board.contains(taskBtn)) return;
      const id = taskBtn.dataset.taskId;
      if (!TASKS[id]) return;
      selectTask(id);
    });
  }

  // 工具列:能力篩選(data-filter)與動作(data-action)
  document.querySelectorAll('.toolbar-btn').forEach((btn) => {
    if (btn.dataset.filter !== undefined) {
      btn.addEventListener('click', () => filterBy(btn.dataset.filter));
      return;
    }
    const action = btn.dataset.action;
    if (action) btn.addEventListener('click', () => handleAction(action, btn));
  });

  // Sprint 篩選按鈕(全部 / S4..S16)
  document.querySelectorAll('.sprint-filter-btn[data-sprint]').forEach((btn) => {
    btn.addEventListener('click', () => filterBySprint(btn.dataset.sprint));
  });

  // Sprint 表頭可點欄位 + lane 方法池 chips
  initSprintHeadControls();
  initMethodPoolChips();

  // 拖曳排版(內部會依 IS_ADMIN 決定是否啟用)
  initDragAndDrop();

  // 匯入 JSON 檔
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importJSON(file);
      e.target.value = '';
    });
  }

  // 視窗縮放時讓已畫的線重新對齊
  window.addEventListener('resize', () => {
    if (state.selectedTaskId) scheduleDrawLines();
  });

  // 初始右側面板
  renderSprintPanel('all');

  // 嘗試從雲端還原已存佈局(靜默;失敗則用內建初始位置)
  cloudLoad({ silent: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
