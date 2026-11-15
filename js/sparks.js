/**
 * sparks.js —— v2.2「点亮火种」
 * 借鉴新华网《征程》“一站一题”、中青在线“答对前进”、长沙《雄关漫道》集章打卡：
 * 每站一道小题，答对即“点亮”该站火种；不卡进度（答错也能继续往下滚），只做轻量激励。
 * 点亮记录存在 localStorage，青春接力海报会把点亮的站画成实心火点。
 */
const KEY = 'xinhuo-sparks-v1';
const listeners = new Set();

export function getSparks() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
}

export function lightSpark(id) {
  const s = getSparks();
  if (s.has(id)) return s;
  s.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* 隐私模式下忽略 */ }
  listeners.forEach((fn) => fn(s));
  return s;
}

export function onSparks(fn) { listeners.add(fn); }
