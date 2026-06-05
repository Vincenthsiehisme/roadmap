import { TASKS } from './data.js';

// Phase 點亮互動模組
(function(){
  const strip = document.getElementById('phaseStrip');
  if(!strip || !TASKS || typeof TASKS !== 'object') return;
  const body = document.body;
  let activePhase = null;

  // 解析 task.phase 字串 → 涵蓋的 phase 號碼集合
  // "Phase 1" → [1]; "Phase 2 → 4" → [2,3,4]; "Phase 2 → 5" → [2,3,4,5]
  function phasesOf(phaseStr){
    if(!phaseStr) return [];
    const nums = (phaseStr.match(/\d+/g) || []).map(n => parseInt(n, 10));
    if(nums.length === 0) return [];
    if(nums.length === 1) return [nums[0]];
    const [a, b] = [Math.min(...nums), Math.max(...nums)];
    const out = [];
    for(let i = a; i <= b; i++) out.push(i);
    return out;
  }

  // 預計算每張 task 涵蓋的 phase
  const taskPhaseMap = {};
  Object.keys(TASKS).forEach(id => {
    taskPhaseMap[id] = phasesOf(TASKS[id].phase);
  });

  function apply(phase){
    const tasks = document.querySelectorAll('.task[data-task-id]');
    const lanes = document.querySelectorAll('.lane');
    const cards = strip.querySelectorAll('.phase-card');

    if(phase === null){
      body.classList.remove('phase-filter-active');
      cards.forEach(c => c.classList.remove('is-active'));
      tasks.forEach(t => t.classList.remove('task-phase-match'));
      lanes.forEach(l => l.classList.remove('phase-match'));
      return;
    }

    body.classList.add('phase-filter-active');
    cards.forEach(c => {
      c.classList.toggle('is-active', parseInt(c.dataset.phase, 10) === phase);
    });

    const laneHits = new Set();
    tasks.forEach(t => {
      const id = t.dataset.taskId;
      const meta = TASKS[id];
      const match = meta && taskPhaseMap[id] && taskPhaseMap[id].includes(phase);
      t.classList.toggle('task-phase-match', !!match);
      if(match && meta) laneHits.add(meta.lane);
    });
    lanes.forEach(l => {
      // .lane 沒有 data-lane,但可從第一個子 task 推回去;改走 laneHits 比對 lane-meta h3 太脆,
      // 我們直接看該 lane 內有沒有 .task.task-phase-match
      const has = l.querySelector('.task.task-phase-match');
      l.classList.toggle('phase-match', !!has);
    });
  }

  strip.addEventListener('click', (e) => {
    const card = e.target.closest('.phase-card');
    if(!card) return;
    const phase = parseInt(card.dataset.phase, 10);
    if(!phase) return;
    // 點同一張 → 取消;點不同張 → 切換
    activePhase = (activePhase === phase) ? null : phase;
    apply(activePhase);
  });
})();
