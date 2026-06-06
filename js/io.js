// JSON export / import / reset layout
import { state } from './state.js';
import { laneEl, reset, showToast, taskEl } from './render.js';
import { scheduleDrawLines } from './lines.js';
import { applyTaskPlacement, clearDirty, laneRowCount, markDirty, parseGridColumn, parseGridRow, setLaneRowCount } from './dnd.js';
import { applyTextOverrides } from './edit.js';
import { refreshStack } from './stack.js';


  export function gatherLayoutSnapshot() {
    const tasks = {};
    document.querySelectorAll('.task[data-task-id]').forEach(el => {
      const { start, span } = parseGridColumn(el);
      const row = parseGridRow(el);
      tasks[el.dataset.taskId] = {
        lane: el.dataset.lane,
        sprintStart: start + 3,
        sprintSpan: span,
        row
      };
    });
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tasks,
      textOverrides: { ...state.textOverrides }
    };
  }

  export function exportJSON() {
    const data = gatherLayoutSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `roadmap-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`已匯出 ${Object.keys(data.tasks).length} 張任務卡的位置 (本機備份)`);
  }

  export function applyLayout(layout) {
    if(!layout || !layout.tasks) return false;
    let applied = 0;
    // reset all lanes' rows to 1 first; they'll grow as we place
    const minRows = {};
    Object.keys(layout.tasks).forEach(id => {
      const el = taskEl(id);
      if(!el) return;
      const cfg = layout.tasks[id];
      const startCol = (cfg.sprintStart || 4) - 3;
      const span = Math.max(1, cfg.sprintSpan || 1);
      const row = Math.max(1, cfg.row || 1);
      if(startCol < 1 || startCol + span - 1 > 13) return; // skip out-of-bound
      applyTaskPlacement(el, cfg.lane, startCol, span, row);
      minRows[cfg.lane] = Math.max(minRows[cfg.lane] || 1, row);
      applied++;
    });
    // make sure lanes have at least the rows they need
    Object.keys(minRows).forEach(laneId => {
      const lane = laneEl(laneId);
      if(lane && laneRowCount(lane) < minRows[laneId]) setLaneRowCount(lane, minRows[laneId]);
    });
    return applied;
  }

  // 從一份載入的資料(雲端 / 匯入)套用文字覆寫,並刷新兩個視圖
  export function applyTextFromData(data) {
    const ov = (data && data.textOverrides && typeof data.textOverrides === 'object') ? data.textOverrides : {};
    state.textOverrides = { ...ov };
    applyTextOverrides(); // Roadmap 卡片 + 堆疊欄頭
    refreshStack();       // 堆疊樹節點重畫
  }

  export function importJSON(file) {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if(!data || !data.tasks) {
          showToast('JSON 格式不正確');
          return;
        }
        const count = applyLayout(data);
        applyTextFromData(data); // 文字覆寫獨立於位置,一律套用
        const ovCount = Object.keys(state.textOverrides).length;
        if(count > 0 || ovCount > 0) {
          markDirty();
          if(state.selectedTaskId) scheduleDrawLines();
          showToast(`已匯入 ${count} 張任務卡位置、${ovCount} 筆文字修改`);
        } else {
          showToast('JSON 解析成功但無可套用內容');
        }
      } catch(err) {
        showToast('JSON 解析失敗：' + err.message);
      }
    };
    reader.readAsText(file);
  }

  export function resetLayout() {
    if(!state.INITIAL_LAYOUT) return;
    if(!confirm('確定要將所有任務卡的位置還原成初始狀態嗎？此動作無法復原。')) return;
    // Apply initial layout
    Object.keys(state.INITIAL_LAYOUT).forEach(key => {
      if(key.startsWith('__lane_rows__')) return;
      const cfg = state.INITIAL_LAYOUT[key];
      const el = taskEl(key);
      if(!el) return;
      const startCol = cfg.sprintStart - 3;
      applyTaskPlacement(el, cfg.lane, startCol, cfg.sprintSpan, cfg.row);
    });
    // Restore lane rows
    Object.keys(state.INITIAL_LAYOUT).forEach(key => {
      if(!key.startsWith('__lane_rows__')) return;
      const laneId = key.replace('__lane_rows__', '');
      const lane = laneEl(laneId);
      if(lane) setLaneRowCount(lane, state.INITIAL_LAYOUT[key]);
    });
    clearDirty();
    if(state.selectedTaskId) scheduleDrawLines();
    showToast('已還原至初始位置');
  }

  /* HTML5 native drag-and-drop already differentiates click from drag — `click` only
     fires when no drag occurred. So we just bind click directly. */


