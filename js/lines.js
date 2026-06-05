// SVG dependency-line geometry & drawing
import { TASKS } from './data.js';
import { board, svg } from './dom.js';
import { state } from './state.js';
import { taskEl } from './render.js';

  export function syncLineLayer() {
    const box = board.getBoundingClientRect();
    const width = Math.max(board.scrollWidth, Math.ceil(box.width));
    const height = Math.max(board.scrollHeight, Math.ceil(box.height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.dataset.width = String(width);
    svg.dataset.height = String(height);
  }

  export function boardRect() {
    return board.getBoundingClientRect();
  }

  export function getPoint(el, side) {
    const context = boardRect();
    const box = el.getBoundingClientRect();
    const base = {
      left: box.left - context.left,
      right: box.right - context.left,
      top: box.top - context.top,
      bottom: box.bottom - context.top,
      cx: box.left - context.left + box.width / 2,
      cy: box.top - context.top + box.height / 2
    };
    if(side === 'left') return { x: base.left, y: base.cy };
    if(side === 'right') return { x: base.right, y: base.cy };
    if(side === 'top') return { x: base.cx, y: base.top };
    if(side === 'bottom') return { x: base.cx, y: base.bottom };
    return { x: base.cx, y: base.cy };
  }

  export function getAnchors(fromEl, toEl) {
    const fromBox = fromEl.getBoundingClientRect();
    const toBox = toEl.getBoundingClientRect();
    const dx = (toBox.left + toBox.width / 2) - (fromBox.left + fromBox.width / 2);
    const dy = (toBox.top + toBox.height / 2) - (fromBox.top + fromBox.height / 2);
    if(Math.abs(dx) >= 42) {
      return dx > 0
        ? { fromSide:'right', toSide:'left', mode:'horizontal', dir:1 }
        : { fromSide:'left', toSide:'right', mode:'horizontal', dir:-1 };
    }
    return dy >= 0
      ? { fromSide:'bottom', toSide:'top', mode:'vertical', dir:1 }
      : { fromSide:'top', toSide:'bottom', mode:'vertical', dir:-1 };
  }

  export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  export function roundedPolyline(points, radius = 10) {
    if(points.length < 2) return '';
    const clean = points.filter((pt, index, arr) => index === 0 || Math.abs(pt.x - arr[index - 1].x) > 0.5 || Math.abs(pt.y - arr[index - 1].y) > 0.5);
    if(clean.length < 2) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${clean[0].x} ${clean[0].y}`;
    for(let i = 1; i < clean.length - 1; i++) {
      const prev = clean[i - 1];
      const curr = clean[i];
      const next = clean[i + 1];
      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const len1 = Math.hypot(v1.x, v1.y);
      const len2 = Math.hypot(v2.x, v2.y);
      if(len1 < 1 || len2 < 1 || (Math.abs(v1.x) > 0 && Math.abs(v2.x) > 0) || (Math.abs(v1.y) > 0 && Math.abs(v2.y) > 0)) {
        d += ` L ${curr.x} ${curr.y}`;
        continue;
      }
      const r = Math.min(radius, len1 / 2, len2 / 2);
      const p1 = { x: curr.x - (v1.x / len1) * r, y: curr.y - (v1.y / len1) * r };
      const p2 = { x: curr.x + (v2.x / len2) * r, y: curr.y + (v2.y / len2) * r };
      d += ` L ${p1.x} ${p1.y} Q ${curr.x} ${curr.y} ${p2.x} ${p2.y}`;
    }
    const last = clean[clean.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  export function buildPath(fromEl, toEl, relation, index, total) {
    const anchors = getAnchors(fromEl, toEl);
    const from = getPoint(fromEl, anchors.fromSide);
    const to = getPoint(toEl, anchors.toSide);
    const width = Number(svg.dataset.width) || board.scrollWidth || 1200;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const offsetSeed = (index - (Math.max(total, 1) - 1) / 2) * 13;

    if(anchors.mode === 'vertical') {
      if(Math.abs(dx) < 8) {
        return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      }
      const midY = from.y + dy * 0.5 + offsetSeed;
      return roundedPolyline([
        from,
        { x: from.x, y: midY },
        { x: to.x, y: midY },
        to
      ], 9);
    }

    if(Math.abs(dy) < 18) {
      return roundedPolyline([from, to], 0);
    }

    const dir = dx >= 0 ? 1 : -1;
    const minBend = 42 + Math.min(Math.abs(offsetSeed), 22);
    const horizontalBend = clamp(Math.abs(dx) * 0.44, minBend, 150);
    let midX = from.x + dir * horizontalBend + offsetSeed * 0.45;
    if(Math.sign(to.x - midX || dir) !== dir && Math.abs(dx) > 90) {
      midX = from.x + dir * minBend;
    }
    midX = clamp(midX, 18, width - 18);

    return roundedPolyline([
      from,
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      to
    ], 12);
  }

  export function drawLines() {
    if(!state.selectedTaskId || !document.body.classList.contains('dependency-active')) return;
    const task = TASKS[state.selectedTaskId];
    const selected = taskEl(state.selectedTaskId);
    if(!task || !selected || !board || !svg) return;
    syncLineLayer();
    svg.innerHTML = `<defs>
      <marker id="arrow-blue" markerWidth="11" markerHeight="11" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#2563eb" /></marker>
      <marker id="arrow-amber" markerWidth="11" markerHeight="11" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#d97706" /></marker>
    </defs>`;
    const upstreamTotal = task.deps.length;
    const downstreamTotal = task.enables.length;
    task.deps.forEach((depId, index) => {
      const dep = taskEl(depId);
      if(dep) appendPath(buildPath(dep, selected, 'upstream', index, upstreamTotal), 'upstream', 'url(#arrow-amber)');
    });
    task.enables.forEach((downId, index) => {
      const down = taskEl(downId);
      if(down) appendPath(buildPath(selected, down, 'downstream', index, downstreamTotal), 'downstream', 'url(#arrow-blue)');
    });
  }

  export function appendPath(d, cls, marker) {
    if(!d) return;
    const rail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    rail.setAttribute('d', d);
    rail.setAttribute('class', `dependency-path rail ${cls}`);
    rail.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(rail);

    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', `dependency-path ${cls}`);
    p.setAttribute('marker-end', marker);
    p.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(p);
  }

  let lineFrame = null;
  export function scheduleDrawLines() {
    if(!state.selectedTaskId) return;
    if(lineFrame) cancelAnimationFrame(lineFrame);
    lineFrame = requestAnimationFrame(() => {
      lineFrame = null;
      drawLines();
    });
  }
