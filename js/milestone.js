import { TASKS } from './data.js';

// Milestone 錨點標示 + 點亮模組
(function(){
  const strip = document.getElementById('milestoneStrip');
  if(!strip || !TASKS || typeof TASKS !== 'object') return;
  const body = document.body;
  let activeMilestone = null;

  // 1) 頁面載入時:替錨點卡加 .is-milestone-anchor class,且為所有卡片補 data-milestone 屬性
  Object.keys(TASKS).forEach(id => {
    const t = TASKS[id];
    if(!t) return;
    const el = document.querySelector(`.task[data-task-id="${id}"]`);
    if(!el) return;
    if(t.milestone) el.setAttribute('data-milestone', t.milestone);
    if(t.is_anchor) el.classList.add('is-milestone-anchor');
  });

  // 2) 點亮:點 milestone card → 點亮屬於該 milestone 的所有卡
  function apply(milestone){
    const tasks = document.querySelectorAll('.task[data-task-id]');
    const lanes = document.querySelectorAll('.lane');
    const cards = strip.querySelectorAll('.milestone-card');

    if(milestone === null){
      body.classList.remove('milestone-filter-active');
      cards.forEach(c => c.classList.remove('is-active'));
      tasks.forEach(t => t.classList.remove('task-milestone-match'));
      lanes.forEach(l => l.classList.remove('milestone-match'));
      return;
    }

    body.classList.add('milestone-filter-active');
    cards.forEach(c => {
      c.classList.toggle('is-active', c.dataset.milestone === milestone);
    });

    tasks.forEach(t => {
      const match = t.getAttribute('data-milestone') === milestone;
      t.classList.toggle('task-milestone-match', !!match);
    });
    lanes.forEach(l => {
      const has = l.querySelector('.task.task-milestone-match');
      l.classList.toggle('milestone-match', !!has);
    });
  }

  strip.addEventListener('click', (e) => {
    const card = e.target.closest('.milestone-card');
    if(!card) return;
    const milestone = card.dataset.milestone;
    if(!milestone) return;
    // 點同一張 → 取消;點不同張 → 切換
    activeMilestone = (activeMilestone === milestone) ? null : milestone;
    apply(activeMilestone);
  });
})();
