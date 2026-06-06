// Render / inspector / sprint panel / method chips / filters
import { METHOD_DESCRIPTIONS, TAGS, TASKS, TASK_METHOD_OVERRIDES } from './data.js';
import { inspectorDeps, inspectorImpact, inspectorIntro, inspectorMethods, inspectorTags, inspectorTitle, svg, toast } from './dom.js';
import { state } from './state.js';
import { drawLines } from './lines.js';

  // 改字覆寫:有覆寫用覆寫,否則回退 data.js 原文(與卡片顯示一致)
  function ov(key, fallback) {
    const v = state.textOverrides[key];
    return (v === undefined || v === null) ? fallback : v;
  }
  export function tagHtml(code) {
    const label = TAGS[code] ? TAGS[code][1] : code;
    return `<span class="tag tag-${code}">${code}<em>${label}</em></span>`;
  }
  export function taskTitle(id) { return TASKS[id] ? ov(`task:${id}:title`, TASKS[id].title) : id; }
  export function sprintNumbers(task) {
    const nums = String(task?.sprint || '').match(/\d+/g)?.map(Number) || [];
    if(!nums.length) return [];
    const start = nums[0];
    const end = nums[1] || start;
    const range = [];
    for(let n = start; n <= end; n++) range.push(n);
    return range;
  }
  export function taskInSprint(task, sprint) {
    if(sprint === 'all') return true;
    return sprintNumbers(task).includes(Number(sprint));
  }
  export function taskIdsForSprint(sprint) {
    return Object.keys(TASKS).filter(id => taskInSprint(TASKS[id], sprint));
  }
  export function taskLaneSummary(ids) {
    const lanes = new Map();
    ids.forEach(id => {
      const task = TASKS[id];
      if(!task) return;
      lanes.set(task.laneTitle, (lanes.get(task.laneTitle) || 0) + 1);
    });
    return Array.from(lanes.entries()).map(([lane, count]) => `${lane} ${count} 張`).join('、') || '尚無任務';
  }
  export function setSprintButtonActive(sprint) {
    const key = String(sprint);
    document.querySelectorAll('.sprint-filter-btn').forEach(btn => btn.classList.toggle('is-active', btn.dataset.sprint === key));
    document.querySelectorAll('.sprint-head span').forEach(span => span.classList.toggle('is-active', span.dataset.sprint === key));
  }
  export function uniqueList(items, limit = 12) {
    const seen = new Set();
    const out = [];
    items.forEach(item => {
      const text = String(item || '').trim();
      const key = normalizeMethod(text);
      if(!text || seen.has(key)) return;
      seen.add(key);
      out.push(text);
    });
    return out.slice(0, limit);
  }
  export function sprintMethodSummary(ids) {
    const core = [], support = [], later = [];
    ids.forEach(id => {
      const task = TASKS[id];
      if(!task) return;
      const plan = getMethodPlan(task);
      core.push(...splitMethods(plan.core));
      support.push(...splitMethods(plan.support));
      later.push(...splitMethods(plan.later));
    });
    const coreCount = uniqueList(core, 999).length;
    const supportCount = uniqueList(support, 999).length;
    const laterCount = uniqueList(later, 999).length;
    return `<div class="sprint-method-section"><b>技術採用摘要</b><p>本篩選範圍包含主要採用 ${coreCount} 類、支援方法 ${supportCount} 類、後續承接 ${laterCount} 類候選方法。完整方法名詞與白話解釋會在點擊單一 sprint card 後展開。</p></div>` +
      `<div class="sprint-method-section"><b>判讀方式</b><p>Core 代表本卡主要採用或驗證；Support 代表輔助品質、規則或觀測；Later 代表後續成熟承接，非本期交付承諾。</p></div>`;
  }
  export function sprintDependencySummary(ids, sprint) {
    const idSet = new Set(ids);
    const upstream = [];
    const downstream = [];
    ids.forEach(id => {
      const task = TASKS[id];
      if(!task) return;
      task.deps.forEach(dep => { if(!idSet.has(dep) && TASKS[dep]) upstream.push(`${taskSprint(dep)}｜${taskTitle(dep)} → ${taskTitle(task.id)}`); });
      task.enables.forEach(next => { if(!idSet.has(next) && TASKS[next]) downstream.push(`${taskTitle(task.id)} → ${taskSprint(next)}｜${taskTitle(next)}`); });
    });
    const rows = uniqueList([...upstream.slice(0,4), ...downstream.slice(0,5)], 9);
    if(!rows.length) return sprint === 'all' ? ['全部模式下不另外列出跨 Sprint 關聯；點擊任務卡可看完整前後關係。'] : ['此 Sprint 內任務目前沒有明顯跨 Sprint 關聯。'];
    return rows;
  }
  export function renderSprintPanel(sprint = state.activeSprint) {
    const ids = taskIdsForSprint(sprint);
    const label = sprint === 'all' ? '全部 Sprint' : `Sprint ${sprint}`;
    const tags = uniqueList(ids.flatMap(id => TASKS[id]?.tags || []), 10);
    inspectorTitle.textContent = `${label}｜任務分布與方法摘要`;
    inspectorIntro.classList.remove('inspector-placeholder');
    inspectorIntro.innerHTML = `${label} 涵蓋 ${ids.length} 張任務卡。此區作為控制台：先看任務分布，再點擊任務卡查看任務級方法採用與相依關係。<div class="sprint-summary-metrics"><div class="sprint-summary-metric"><b>任務數</b><span>${ids.length} 張 sprint card</span></div><div class="sprint-summary-metric"><b>Lane 分布</b><span>${escapeHtml(taskLaneSummary(ids))}</span></div><div class="sprint-summary-metric"><b>能力標籤</b><span>${tags.length ? tags.join(' / ') : '尚無'}</span></div></div>`;
    inspectorTags.innerHTML = tags.map(tagHtml).join('');
    inspectorDeps.innerHTML = ids.length
      ? ids.map(id => `<li class="sprint-task-item"><strong>${escapeHtml(taskTitle(id))}</strong><span>${escapeHtml(taskSprint(id))}｜${escapeHtml(TASKS[id].laneTitle)}</span></li>`).join('')
      : '<li>此 Sprint 目前沒有任務卡。</li>';
    inspectorMethods.innerHTML = ids.length ? sprintMethodSummary(ids) : '<ul class="inspector-method-list"><li><p>此 Sprint 尚無方法採用摘要。</p></li></ul>';
    inspectorImpact.innerHTML = listHtml(sprintDependencySummary(ids, sprint), '此 Sprint 目前沒有明確跨 Sprint 關係。');
  }
  export function filterBySprint(sprint) {
    state.activeSprint = String(sprint || 'all');
    state.selectedTaskId = null;
    clearVisualState();
    document.querySelectorAll('.toolbar-btn[data-filter]').forEach(btn=>btn.classList.remove('is-active'));
    setSprintButtonActive(state.activeSprint);
    if(state.activeSprint !== 'all') {
      document.body.classList.add('sprint-filter-active');
      document.querySelectorAll('.task[data-task-id]').forEach(el => {
        const match = taskInSprint(TASKS[el.dataset.taskId], state.activeSprint);
        el.classList.toggle('task-sprint-match', match);
      });
      document.querySelectorAll('.lane').forEach(lane => {
        const has = Array.from(lane.querySelectorAll('.task[data-task-id]')).some(el => taskInSprint(TASKS[el.dataset.taskId], state.activeSprint));
        lane.classList.toggle('sprint-match', has);
      });
    }
    renderSprintPanel(state.activeSprint);
  }
  export function initSprintHeadControls() {
    document.querySelectorAll('.sprint-head span').forEach((span, index) => {
      const sprint = String(index + 4);
      span.dataset.sprint = sprint;
      span.setAttribute('tabindex', '0');
      span.setAttribute('role', 'button');
      span.setAttribute('aria-label', `篩選 Sprint ${sprint}`);
      span.addEventListener('click', () => filterBySprint(sprint));
      span.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); filterBySprint(sprint); } });
    });
  }
  export function taskSprint(id) { return TASKS[id] ? ov(`task:${id}:sprint`, TASKS[id].sprint) : ''; }
  export function taskEl(id) { return document.querySelector(`.task[data-task-id="${id}"]`); }
  export function laneEl(id) { return document.querySelector(`.lane[data-lane="${id}"]`); }
  export function listHtml(items, fallback) { return items && items.length ? items.map(x=>`<li>${x}</li>`).join('') : `<li>${fallback}</li>`; }
  export function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\'':'&#39;', '"':'&quot;' }[ch]));
  }
  export function splitMethods(methodText) {
    if(Array.isArray(methodText)) return methodText.map(x=>String(x).trim()).filter(Boolean);
    return String(methodText || '').split('/').map(x=>x.trim()).filter(Boolean);
  }
  export function normalizeMethod(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  export function methodChips(methods, role = '') {
    return splitMethods(methods).map(x=>`<span class="method-chip${role ? ` method-${role}` : ''}" data-method="${escapeHtml(normalizeMethod(x))}">${escapeHtml(x)}</span>`).join('');
  }
  export function getMethodPlan(task) {
    const override = TASK_METHOD_OVERRIDES[task.id] || {};
    const base = splitMethods(task.method);
    const core = override.core || base.slice(0, Math.min(2, base.length));
    const coreSet = new Set(core.map(normalizeMethod));
    const support = override.support || base.filter(x=>!coreSet.has(normalizeMethod(x))).slice(0, 4);
    const usedSet = new Set([...core, ...support].map(normalizeMethod));
    const later = override.later || base.filter(x=>!usedSet.has(normalizeMethod(x)));
    return {
      core,
      support,
      later,
      maturity: override.maturity || `${task.phase}：本任務候選方法以當前交付範圍為準。`,
      output: override.output || task.output || '',
      poolNote: override.poolNote || ''
    };
  }
  export function methodListMatches(chipText, list) {
    const chip = normalizeMethod(chipText);
    return splitMethods(list).some(item => {
      const target = normalizeMethod(item);
      return chip === target || (chip.length > 4 && target.includes(chip)) || (target.length > 4 && chip.includes(target));
    });
  }
  export function methodRoleForText(text, plan) {
    if(methodListMatches(text, plan.core)) return 'core';
    if(methodListMatches(text, plan.support)) return 'support';
    if(methodListMatches(text, plan.later)) return 'later';
    return '';
  }
  export function methodDescription(method) {
    return METHOD_DESCRIPTIONS[normalizeMethod(method)] || '此方法屬於本任務的候選技術，用於支援該 sprint card 的交付、觀測或後續驗證。';
  }
  export function methodRoleNote(role) {
    if(role === 'core') return '本 sprint card 主要使用或驗證的方法。';
    if(role === 'support') return '輔助資料品質、規則判斷、效果觀測或穩定上線的方法。';
    if(role === 'later') return '後續成熟承接，非本期交付承諾。';
    return '';
  }
  export function methodExplainCard(method, role) {
    return `<div class="method-explain-card method-${role}" data-method="${escapeHtml(normalizeMethod(method))}"><strong>${escapeHtml(method)}</strong><p>${escapeHtml(methodDescription(method))}</p></div>`;
  }
  export function methodRoleBlock(label, methods, role, fallback) {
    const items = splitMethods(methods);
    return `<li class="method-role-card method-role-${role}"><b>${label}</b><span class="role-note">${escapeHtml(methodRoleNote(role))}</span>${items.length ? `<div class="method-explain-grid">${items.map(item => methodExplainCard(item, role)).join('')}</div>` : `<p>${fallback}</p>`}</li>`;
  }
  export function initMethodPoolChips() {
    document.querySelectorAll('.tech-card .method-chip').forEach(chip => {
      chip.dataset.method = normalizeMethod(chip.textContent);
      chip.classList.add('method-chip-pool');
    });
  }
  export function clearMethodPoolHighlight() {
    document.querySelectorAll('.method-box.method-pool-active').forEach(box => box.classList.remove('method-pool-active'));
    document.querySelectorAll('.tech-card .method-chip').forEach(chip => chip.classList.remove('method-core','method-support','method-later','method-muted'));
    document.querySelectorAll('.method-pool-note,.method-pool-extra').forEach(el => el.remove());
  }
  export function updateMethodPoolHighlight(task, plan = getMethodPlan(task)) {
    clearMethodPoolHighlight();
    const lane = laneEl(task.lane);
    const box = lane?.querySelector('.tech-card .method-box');
    if(!box) return;
    box.classList.add('method-pool-active');
    const chips = Array.from(box.querySelectorAll('.method-chip'));
    chips.forEach(chip => {
      const role = methodRoleForText(chip.textContent, plan);
      if(role) {
        chip.classList.add(`method-${role}`);
      } else {
        chip.classList.add('method-muted');
      }
    });
    const allMethods = [...plan.core, ...plan.support, ...plan.later];
    const unmatched = allMethods.filter(method => !chips.some(chip => methodRoleForText(chip.textContent, { core:[method], support:[], later:[] }) || methodRoleForText(chip.textContent, { core:[], support:[method], later:[] }) || methodRoleForText(chip.textContent, { core:[], support:[], later:[method] })));
    const note = document.createElement('div');
    note.className = 'method-pool-note';
    note.innerHTML = `本任務在方法池中的採用關係：主要採用 ${plan.core.length} 項、支援 ${plan.support.length} 項、後續承接 ${plan.later.length} 項。未高亮方法代表屬於此 lane 的候選能力，但本 sprint card 不採用。<div class="method-role-legend"><span class="role-core">主要採用</span><span class="role-support">支援</span><span class="role-later">後續承接</span></div>`;
    const chipWrap = box.querySelector('.method-chips');
    if(chipWrap) box.insertBefore(note, chipWrap);
    if(unmatched.length) {
      const extra = document.createElement('div');
      extra.className = 'method-pool-extra';
      extra.innerHTML = `<b>任務補充方法</b><div class="method-chips">${unmatched.map(method => {
        const role = methodRoleForText(method, plan) || 'support';
        return `<span class="method-chip method-${role}" data-method="${escapeHtml(normalizeMethod(method))}">${escapeHtml(method)}</span>`;
      }).join('')}</div>`;
      box.appendChild(extra);
    }
  }

  export function clearVisualState() {
    document.body.classList.remove('dependency-active','filter-active','sprint-filter-active');
    document.querySelectorAll('.lane').forEach(lane=>lane.classList.remove('is-selected','is-upstream','is-downstream','has-related','filter-match','sprint-match'));
    document.querySelectorAll('.task').forEach(task=>task.classList.remove('task-selected','task-upstream','task-downstream','task-sprint-match'));
    svg.innerHTML = '';
    clearMethodPoolHighlight();
  }

  export function relatedSet(task) {
    const set = new Set([task.id]);
    task.deps.forEach(id=>set.add(id));
    task.enables.forEach(id=>set.add(id));
    return set;
  }

  export function selectTask(id) {
    const task = TASKS[id];
    if(!task) return;
    state.selectedTaskId = id;
    clearVisualState();
    document.body.classList.add('dependency-active');

    const selected = taskEl(id);
    selected?.classList.add('task-selected');
    laneEl(task.lane)?.classList.add('is-selected','has-related');

    task.deps.forEach(depId => {
      taskEl(depId)?.classList.add('task-upstream');
      const lane = laneEl(TASKS[depId]?.lane);
      lane?.classList.add('is-upstream','has-related');
    });
    task.enables.forEach(downId => {
      taskEl(downId)?.classList.add('task-downstream');
      const lane = laneEl(TASKS[downId]?.lane);
      lane?.classList.add('is-downstream','has-related');
    });

    updateInspector(task);
    requestAnimationFrame(drawLines);
  }

  export function updateInspector(task) {
    const plan = getMethodPlan(task);
    inspectorTitle.textContent = `${task.laneTitle}｜${taskTitle(task.id)}`;
    inspectorIntro.classList.remove('inspector-placeholder');
    inspectorIntro.innerHTML = `<div class="task-purpose-box"><span><b>${escapeHtml(taskSprint(task.id))}</b>｜${escapeHtml(task.initial)}</span><span class="task-limit">${escapeHtml(task.limit)}</span></div>`;
    inspectorTags.innerHTML = task.tags.map(tagHtml).join('');
    inspectorDeps.innerHTML = listHtml(task.deps.map(id => `${taskSprint(id)}｜${taskTitle(id)}`), '無明確前置任務；此卡片可作為階段起點。');
    inspectorMethods.innerHTML = `
      <ul class="inspector-method-list">
        ${methodRoleBlock('Core / 主要採用', plan.core, 'core', '本任務未指定主要方法')}
        ${methodRoleBlock('Support / 輔助判斷', plan.support, 'support', '本任務未指定支援方法')}
        ${methodRoleBlock('Later / 後續承接', plan.later, 'later', '本任務暫無明確後續方法')}
        <li><b>輸出物件</b><p>${escapeHtml(plan.output || '尚未定義輸出物件')}</p></li>
        <li><b>驗證重點</b><p>${escapeHtml(task.validation.join('；'))}</p></li>
        <li><b>與 Lane 方法池關係</b><p class="method-relation-note">${escapeHtml(plan.maturity)} 完整方法池會保留在進階技術細節模式；預設畫面只呈現任務級採用方法，避免誤解為整條 lane 皆已承諾落地。</p></li>
      </ul>`;
    updateMethodPoolHighlight(task, plan);
    const impacts = [];
    task.enables.forEach(id => impacts.push(`${taskSprint(id)}｜影響：${taskTitle(id)}`));
    task.validation.slice(0,2).forEach(v => impacts.push(`驗證：${v}`));
    inspectorImpact.innerHTML = listHtml(impacts, '此任務目前沒有明確下游任務，主要以自身成效驗證為主。');
  }

  export function filterBy(code) {
    state.selectedTaskId = null;
    state.activeSprint = 'all';
    clearVisualState();
    setSprintButtonActive('all');
    document.querySelectorAll('.toolbar-btn[data-filter]').forEach(btn=>btn.classList.toggle('is-active', btn.dataset.filter === code));
    if(code === 'all') return;
    const group = code === 'S' ? ['S','H'] : code === 'R' ? ['R','B'] : code === 'I' ? ['I','P','A'] : code === 'G' ? ['G','K'] : [code];
    document.body.classList.add('filter-active');
    document.querySelectorAll('.lane').forEach(lane=>{
      const tags = (lane.dataset.tags || '').split(/\s+/);
      if(group.some(g => tags.includes(g))) lane.classList.add('filter-match');
    });
    inspectorTitle.textContent = '能力階段篩選';
    inspectorIntro.classList.remove('inspector-placeholder');
    inspectorIntro.textContent = `目前篩選：${group.join(' / ')}。此檢視只用於快速定位能力落點；實際前後關係仍以 sprint 任務卡相依線為準。`;
    inspectorTags.innerHTML = group.map(tagHtml).join('');
    inspectorDeps.innerHTML = '<li>篩選模式不顯示單一卡片前置任務。</li>';
    inspectorMethods.innerHTML = '<ul class="inspector-method-list"><li><p>篩選模式不顯示方法採用關係；點擊任務卡後會切換到任務級方法池對應檢視。</p></li></ul>';
    inspectorImpact.innerHTML = '<li>點擊高亮區域中的任務卡，可切換為任務級相依性檢視。</li>';
  }

  export function reset() {
    state.selectedTaskId = null;
    clearVisualState();
    document.querySelectorAll('.toolbar-btn').forEach(btn=>btn.classList.remove('is-active'));
    document.body.classList.remove('note-mode');
    document.body.classList.add('compact-tech');
    const noteBtn = document.querySelector('[data-action="note-mode"]');
    const compactBtn = document.querySelector('[data-action="compact-tech"]');
    if(noteBtn) noteBtn.textContent = '顯示初版定義';
    if(compactBtn) { compactBtn.textContent = '展開技術細節'; compactBtn.classList.remove('is-active'); }
    state.activeSprint = 'all';
    setSprintButtonActive('all');
    renderSprintPanel('all');
    showToast('已重置閱讀狀態');
  }

  export function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-show');
    setTimeout(()=>toast.classList.remove('is-show'), 1300);
  }

