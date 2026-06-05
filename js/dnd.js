// Drag & drop layout editing
import { TASKS } from './data.js';
import { dirtyIndicator } from './dom.js';
import { IS_ADMIN, state } from './state.js';
import { clearVisualState, laneEl, showToast, taskEl } from './render.js';
import { scheduleDrawLines } from './lines.js';


  /* Grid: 13 columns (Sprint 4 = col 1, Sprint 16 = col 13).
     Column index -> sprint number: sprint = col + 3 (col is 1-based).
     Max start col = 14 - span (so start+span-1 <= 13). */

  const LANE_COLOR_CLASS = {
    data_foundation: 'task-data',
    ai_search: 'task-search',
    recommendation: 'task-reco',
    cross_sell: 'task-activation',
    activation: 'task-activation',
    ads: 'task-activation',
    digital_twins: 'task-ai'
  };

  let dragState = null;
  let dropIndicator = null;
  let dragMouseStart = null;

  export function parseGridColumn(el) {
    // returns { start, span }
    const style = el.style.gridColumn || '';
    const m = style.match(/(\d+)\s*\/\s*span\s*(\d+)/);
    if(m) return { start: parseInt(m[1], 10), span: parseInt(m[2], 10) };
    const m2 = style.match(/(\d+)\s*\/\s*(\d+)/);
    if(m2) {
      const start = parseInt(m2[1], 10);
      const end = parseInt(m2[2], 10);
      return { start, span: Math.max(1, end - start) };
    }
    return { start: 1, span: 1 };
  }

  export function parseGridRow(el) {
    const style = el.style.gridRow || '';
    const m = style.match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  }

  export function laneRowCount(lane) {
    const rowsVar = lane.style.getPropertyValue('--rows');
    return rowsVar ? parseInt(rowsVar, 10) : 1;
  }

  export function setLaneRowCount(lane, rows) {
    lane.style.setProperty('--rows', String(rows));
    const grid = lane.querySelector('.timeline-grid');
    if(grid) grid.style.setProperty('--rows', String(rows));
  }

  export function captureInitialLayout() {
    const layout = {};
    document.querySelectorAll('.task[data-task-id]').forEach(el => {
      const { start, span } = parseGridColumn(el);
      const row = parseGridRow(el);
      layout[el.dataset.taskId] = {
        lane: el.dataset.lane,
        sprintStart: start + 3,
        sprintSpan: span,
        row,
        gridColumn: el.style.gridColumn,
        gridRow: el.style.gridRow,
        smallText: el.querySelector('small')?.textContent || '',
        colorClass: Array.from(el.classList).find(c => c.startsWith('task-') && c !== 'task-selected' && c !== 'task-upstream' && c !== 'task-downstream' && c !== 'task-dragging' && c !== 'task-sprint-match') || '',
        originalSprint: TASKS[el.dataset.taskId]?.sprint || '',
        originalLane: TASKS[el.dataset.taskId]?.lane || ''
      };
    });
    // Also record original lane --rows
    document.querySelectorAll('.lane').forEach(lane => {
      layout['__lane_rows__' + lane.dataset.lane] = laneRowCount(lane);
    });
    return layout;
  }

  export function ensureDropIndicator(grid) {
    if(!dropIndicator) {
      dropIndicator = document.createElement('div');
      dropIndicator.className = 'drop-indicator';
      dropIndicator.innerHTML = '<span class="drop-indicator-label"></span>';
      document.body.appendChild(dropIndicator);
    }
  }

  export function hideDropIndicator() {
    if(dropIndicator) {
      dropIndicator.classList.remove('is-active', 'is-valid', 'is-invalid');
    }
    document.querySelectorAll('.timeline-grid.is-drag-target').forEach(g => g.classList.remove('is-drag-target'));
  }

  export function positionDropIndicator(grid, startCol, span, row, valid) {
    ensureDropIndicator(grid);
    const gridRect = grid.getBoundingClientRect();
    const colWidth = gridRect.width / 13;
    const rowHeight = 50; // approximate; matches lane min-height calc
    const left = gridRect.left + window.scrollX + (startCol - 1) * colWidth + 4;
    const top = gridRect.top + window.scrollY + (row - 1) * rowHeight + 13 + 2;
    const width = colWidth * span - 8;
    const height = rowHeight - 8;
    dropIndicator.style.left = left + 'px';
    dropIndicator.style.top = top + 'px';
    dropIndicator.style.width = width + 'px';
    dropIndicator.style.height = height + 'px';
    dropIndicator.classList.add('is-active');
    dropIndicator.classList.toggle('is-valid', valid);
    dropIndicator.classList.toggle('is-invalid', !valid);
    const label = dropIndicator.querySelector('.drop-indicator-label');
    if(label) {
      const sprintStart = startCol + 3;
      const sprintEnd = sprintStart + span - 1;
      label.textContent = valid
        ? (span === 1 ? `Sprint ${sprintStart}` : `Sprint ${sprintStart}–${sprintEnd}`)
        : `超出範圍 (Sprint 4–16)`;
    }
  }

  export function computeTargetColumn(grid, clientX, span) {
    const gridRect = grid.getBoundingClientRect();
    const colWidth = gridRect.width / 13;
    const relX = clientX - gridRect.left;
    let col = Math.floor(relX / colWidth) + 1;
    // Clamp so card stays within grid
    col = Math.max(1, Math.min(col, 14 - span));
    return col;
  }

  export function computeTargetRow(grid, clientY, taskEl) {
    const gridRect = grid.getBoundingClientRect();
    const rowHeight = 50;
    const relY = clientY - gridRect.top - 13; // minus padding
    let row = Math.max(1, Math.floor(relY / rowHeight) + 1);
    return row;
  }

  export function findEmptyRow(lane, startCol, span, row, excludeId) {
    const grid = lane.querySelector('.timeline-grid');
    const cards = Array.from(grid.querySelectorAll('.task[data-task-id]')).filter(t => t.dataset.taskId !== excludeId);
    const isOccupied = (r) => cards.some(c => {
      if(parseGridRow(c) !== r) return false;
      const { start, span: csp } = parseGridColumn(c);
      return !(startCol + span <= start || start + csp <= startCol);
    });
    let candidate = row;
    while(isOccupied(candidate)) candidate++;
    return candidate;
  }

  export function setColorClassForLane(taskEl, laneId) {
    const target = LANE_COLOR_CLASS[laneId];
    if(!target) return;
    ['task-data','task-search','task-reco','task-activation','task-ai'].forEach(c => taskEl.classList.remove(c));
    taskEl.classList.add(target);
  }

  export function applyTaskPlacement(taskEl, laneId, startCol, span, row) {
    const lane = laneEl(laneId);
    if(!lane) return;
    const grid = lane.querySelector('.timeline-grid');
    if(!grid) return;
    if(taskEl.parentElement !== grid) {
      grid.appendChild(taskEl);
      taskEl.dataset.lane = laneId;
      setColorClassForLane(taskEl, laneId);
    }
    taskEl.style.gridColumn = `${startCol} / span ${span}`;
    taskEl.style.gridRow = String(row);
    // grow lane if needed
    if(row > laneRowCount(lane)) setLaneRowCount(lane, row);
    // update small text + TASKS data
    const sprintStart = startCol + 3;
    const sprintEnd = sprintStart + span - 1;
    const sprintText = span === 1 ? `Sprint ${sprintStart}` : `Sprint ${sprintStart}–${sprintEnd}`;
    const small = taskEl.querySelector('small');
    if(small) small.textContent = sprintText;
    const id = taskEl.dataset.taskId;
    if(TASKS[id]) {
      TASKS[id].sprint = sprintText;
      TASKS[id].lane = laneId;
      const targetLane = laneEl(laneId);
      if(targetLane) {
        const h3 = targetLane.querySelector('.lane-meta h3');
        if(h3) TASKS[id].laneTitle = h3.textContent.trim();
      }
    }
  }

  export function markDirty() {
    if(state.isDirty) return;
    state.isDirty = true;
    if(dirtyIndicator) dirtyIndicator.classList.add('is-show');
  }

  export function clearDirty() {
    state.isDirty = false;
    if(dirtyIndicator) dirtyIndicator.classList.remove('is-show');
  }

  export function onTaskDragStart(e) {
    const task = e.currentTarget;
    if(!task || !task.dataset.taskId) return;
    const { start, span } = parseGridColumn(task);
    const row = parseGridRow(task);
    dragState = {
      taskId: task.dataset.taskId,
      el: task,
      originalLane: task.dataset.lane,
      originalStart: start,
      originalSpan: span,
      originalRow: row
    };
    task.classList.add('task-dragging');
    if(e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', task.dataset.taskId); } catch(err) {}
    }
    // clear any existing selection visuals so they don't interfere
    if(state.selectedTaskId) {
      state.selectedTaskId = null;
      clearVisualState();
    }
  }

  export function onTaskDragEnd(e) {
    const task = e.currentTarget;
    if(task) task.classList.remove('task-dragging');
    hideDropIndicator();
    dragState = null;
  }

  export function onGridDragOver(e) {
    if(!dragState) return;
    e.preventDefault();
    const grid = e.currentTarget;
    grid.classList.add('is-drag-target');
    const span = dragState.originalSpan;
    const startCol = computeTargetColumn(grid, e.clientX, span);
    const row = computeTargetRow(grid, e.clientY, dragState.el);
    const valid = startCol >= 1 && startCol + span - 1 <= 13;
    positionDropIndicator(grid, startCol, span, row, valid);
    if(e.dataTransfer) e.dataTransfer.dropEffect = valid ? 'move' : 'none';
  }

  export function onGridDragLeave(e) {
    const grid = e.currentTarget;
    // Only clear if leaving the grid entirely
    const related = e.relatedTarget;
    if(related && grid.contains(related)) return;
    grid.classList.remove('is-drag-target');
  }

  export function onGridDrop(e) {
    if(!dragState) return;
    e.preventDefault();
    const grid = e.currentTarget;
    grid.classList.remove('is-drag-target');
    const lane = grid.closest('.lane');
    if(!lane) { hideDropIndicator(); return; }
    const laneId = lane.dataset.lane;
    const span = dragState.originalSpan;
    const startCol = computeTargetColumn(grid, e.clientX, span);
    if(startCol < 1 || startCol + span - 1 > 13) {
      hideDropIndicator();
      showToast('超出 Sprint 4–16 範圍，已取消');
      return;
    }
    const requestedRow = computeTargetRow(grid, e.clientY, dragState.el);
    const finalRow = findEmptyRow(lane, startCol, span, requestedRow, dragState.taskId);
    applyTaskPlacement(dragState.el, laneId, startCol, span, finalRow);
    hideDropIndicator();
    markDirty();
    // If a task is selected, redraw lines
    if(state.selectedTaskId) scheduleDrawLines();
  }

  export function initDragAndDrop() {
    if(!IS_ADMIN) {
      // 檢視模式:移除 draggable 屬性,避免出現拖曳游標、避免任何 drag event
      document.querySelectorAll('.task[data-task-id]').forEach(task => {
        task.removeAttribute('draggable');
      });
      return;
    }
    document.querySelectorAll('.task[data-task-id]').forEach(task => {
      task.addEventListener('dragstart', onTaskDragStart);
      task.addEventListener('dragend', onTaskDragEnd);
    });
    document.querySelectorAll('.timeline-grid').forEach(grid => {
      grid.addEventListener('dragover', onGridDragOver);
      grid.addEventListener('dragleave', onGridDragLeave);
      grid.addEventListener('drop', onGridDrop);
    });
  }

