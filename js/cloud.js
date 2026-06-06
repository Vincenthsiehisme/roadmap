// Cloud sync (GAS web app)
import { cloudStatus } from './dom.js';
import { ADMIN_TOKEN, GAS_URL, IS_ADMIN, state } from './state.js';
import { showToast } from './render.js';
import { scheduleDrawLines } from './lines.js';
import { clearDirty } from './dnd.js';
import { applyLayout, applyTextFromData, gatherLayoutSnapshot } from './io.js';


  export function setCloudStatus(state, text) {
    if(!cloudStatus) return;
    cloudStatus.classList.remove('is-syncing','is-error','is-ok');
    if(state) cloudStatus.classList.add('is-' + state);
    cloudStatus.textContent = text;
  }

  export function formatLocalTime(iso) {
    try {
      const d = new Date(iso);
      const pad = n => String(n).padStart(2,'0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch(e) {
      return iso;
    }
  }

  export async function cloudLoad(opts = {}) {
    const { silent = false } = opts;
    if(!GAS_URL || GAS_URL === 'PASTE_YOUR_GAS_WEB_APP_URL_HERE') {
      if(!silent) showToast('尚未設定 GAS_URL,無法連線雲端');
      setCloudStatus('error', '未設定雲端');
      return false;
    }
    setCloudStatus('syncing', '載入中…');
    try {
      const res = await fetch(GAS_URL, { method: 'GET', redirect: 'follow' });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if(data && data.ok === false) {
        setCloudStatus('error', '雲端錯誤');
        if(!silent) showToast('雲端回應錯誤:' + (data.error || 'unknown'));
        return false;
      }
      if(data && data.empty) {
        setCloudStatus('ok', '雲端尚無資料');
        if(!silent) showToast('雲端尚無資料,使用內建初始位置');
        return false;
      }
      if(data && data.tasks) {
        const count = applyLayout(data);
        applyTextFromData(data); // 套用雲端文字覆寫並刷新兩個視圖
        clearDirty();
        const stamp = data.serverTimestamp ? formatLocalTime(data.serverTimestamp) : '剛剛';
        setCloudStatus('ok', `雲端 ${stamp}`);
        if(!silent) showToast(`已從雲端載入 ${count} 張任務卡 (儲存於 ${stamp})`);
        if(state.selectedTaskId) scheduleDrawLines();
        return true;
      }
      setCloudStatus('error', '回應格式不符');
      return false;
    } catch(err) {
      setCloudStatus('error', '連線失敗');
      if(!silent) showToast('連線雲端失敗:' + err.message);
      return false;
    }
  }

  export async function cloudSave() {
    if(!IS_ADMIN) {
      showToast('需要管理者權限');
      return;
    }
    if(!GAS_URL || GAS_URL === 'PASTE_YOUR_GAS_WEB_APP_URL_HERE') {
      showToast('尚未設定 GAS_URL,無法儲存');
      setCloudStatus('error', '未設定雲端');
      return;
    }
    setCloudStatus('syncing', '儲存中…');
    const snapshot = gatherLayoutSnapshot();
    const payload = Object.assign({}, snapshot, { token: ADMIN_TOKEN });
    try {
      // GAS Web App 用 text/plain 避免 CORS preflight
      const res = await fetch(GAS_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if(data && data.ok) {
        clearDirty();
        const now = formatLocalTime(new Date().toISOString());
        setCloudStatus('ok', `已儲存 ${now}`);
        showToast(`已儲存 ${data.taskCount || ''} 張任務卡到雲端`);
      } else {
        setCloudStatus('error', '儲存失敗');
        showToast('儲存失敗:' + (data && data.error ? data.error : 'unknown'));
      }
    } catch(err) {
      setCloudStatus('error', '連線失敗');
      showToast('連線雲端失敗:' + err.message);
    }
  }

