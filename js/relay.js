/**
 * relay.js —— 青春接力：写下“我的新长征”目标 → Canvas 生成海报 → 上墙
 * ------------------------------------------------------------
 * 1. 表单校验：长度限制（按字符数，emoji/生僻字也算 1 个）、去掉控制字符、提交节流
 * 2. 海报：直接用 Canvas 2D API 绘制（不依赖 html2canvas），canvas.toDataURL() 导出 PNG
 * 3. 接力墙：通过 relay-store.js 的统一接口 list()/add() 读写，默认存 localStorage
 * 4. 防 XSS：用户输入只通过 textContent 写进页面、通过 fillText 画进画布，
 *    从不作为 HTML 解析，所以输入 <script> 也只会原样显示成文字。
 */

import { createLocalStore } from './relay-store.js';
import { chapters } from './data/nodes.js';

// 想换成云端：import { createSupabaseStore } from './relay-store.js'; const store = createSupabaseStore(URL, KEY);
const store = createLocalStore();

const LIMITS = { name: [1, 12], major: [1, 20], goal: [4, 40] };
const C = { red: '#B3261E', redDeep: '#8E1D17', paper: '#F4EDE1', paperDark: '#E9DFCD', ink: '#1F1A17', inkSoft: '#5A4E45', gold: '#C9A45C' };
const SERIF = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif';
const SANS = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';

/* ---------------- 校验 ---------------- */

/** 清洗：去掉控制字符和零宽字符，合并连续空白 */
function clean(str) {
  return String(str || '')
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202E\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
/** 按“字符”计数（[...str] 能正确处理 emoji 等代理对） */
const len = (s) => [...s].length;

/** 校验表单，返回 { ok, data, errors } */
function validate(raw) {
  const data = { name: clean(raw.name), major: clean(raw.major), goal: clean(raw.goal) };
  const label = { name: '昵称', major: '专业/班级', goal: '“新长征”目标' };
  const errors = {};
  for (const k of Object.keys(LIMITS)) {
    const [min, max] = LIMITS[k];
    const n = len(data[k]);
    if (n < min) errors[k] = min === 1 ? `请填写${label[k]}` : `${label[k]}至少 ${min} 个字`;
    else if (n > max) errors[k] = `${label[k]}最多 ${max} 个字（现在 ${n} 个）`;
  }
  return { ok: Object.keys(errors).length === 0, data, errors };
}

/* ---------------- 海报绘制 ---------------- */

/** 固定种子的伪随机数：每次生成的纸张噪点一致，海报更稳定 */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** 文字自动换行：按画布实际宽度逐字测量 */
function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of [...text]) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
const pad4 = (n) => String(n).padStart(4, '0');

/** 海报底部时间线的站点（v1.1）：取地图上参与行军线的各站，短名=地图标签前两字，年份=date 里的“XXXX年” */
const TIMELINE = chapters
  .filter((ch) => ch.inRoute)
  .map((ch) => ({ name: [...ch.mapLabel].slice(0, 2).join(''), year: (String(ch.date).match(/(\d{4})年/) || [, ''])[1] }));

/**
 * 在 canvas 上画接力海报（1080 × 1440）
 * @param {HTMLCanvasElement} canvas
 * @param {{ no, name, major, goal, time }} e
 */
function drawPoster(canvas, e) {
  const W = 1080, H = 1440;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const rnd = seeded(e.no * 97 + 13);

  // 1) 纸张底色 + 噪点 + 暗角
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(90,70,50,${rnd() * 0.07})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, H * 0.8);
  vg.addColorStop(0, 'rgba(170,140,95,0)');
  vg.addColorStop(1, 'rgba(170,140,95,0.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // 2) 外框：报纸式双线
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.lineWidth = 1;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // 3) 刊头小字 + 双线
  ctx.fillStyle = C.inkSoft;
  ctx.font = `500 28px ${SERIF}`;
  ctx.fillText('纪念中国工农红军长征胜利90周年 · 1936—2026', W / 2, 128);
  ctx.fillStyle = C.ink;
  ctx.fillRect(110, 150, W - 220, 4);
  ctx.fillRect(110, 160, W - 220, 1.5);

  // 4) 标题《薪火·湘征》：书名号红色、间隔点金色（分段绘制）
  ctx.font = `900 124px ${SERIF}`;
  const parts = [['《', C.red], ['薪火', C.ink], ['·', C.gold], ['湘征', C.ink], ['》', C.red]];
  const total = parts.reduce((w, [t]) => w + ctx.measureText(t).width, 0);
  let x = (W - total) / 2;
  ctx.textAlign = 'left';
  for (const [t, color] of parts) {
    ctx.fillStyle = color;
    ctx.fillText(t, x, 312);
    x += ctx.measureText(t).width;
  }
  ctx.textAlign = 'center';

  // 5) 红色横幅：青春接力
  ctx.fillStyle = C.red;
  ctx.fillRect(110, 360, W - 220, 84);
  ctx.fillStyle = C.paper;
  ctx.font = `700 46px ${SERIF}`;
  ctx.fillText('青 春 接 力 · 薪 火 相 传', W / 2, 418);

  // 6) 第 NNNN 位接力者：先量出数字宽度，再把“第”“位接力者”贴在两侧，整体居中
  const noText = pad4(e.no);
  ctx.font = `900 132px ${SERIF}`;
  const noW = ctx.measureText(noText).width;
  ctx.font = `700 40px ${SERIF}`;
  const preW = ctx.measureText('第').width;
  const sufW = ctx.measureText('位接力者').width;
  const gap = 22;
  let cx = (W - (preW + gap + noW + gap + sufW)) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink;
  ctx.fillText('第', cx, 580);
  cx += preW + gap;
  ctx.fillStyle = C.red;
  ctx.font = `900 132px ${SERIF}`;
  ctx.fillText(noText, cx, 590);
  cx += noW + gap;
  ctx.fillStyle = C.ink;
  ctx.font = `700 40px ${SERIF}`;
  ctx.fillText('位接力者', cx, 580);
  ctx.textAlign = 'center';

  // 7) 昵称 + 专业
  ctx.fillStyle = C.ink;
  ctx.font = `900 64px ${SERIF}`;
  ctx.fillText(e.name, W / 2, 700);
  ctx.fillStyle = C.inkSoft;
  ctx.font = `400 32px ${SANS}`;
  ctx.fillText(e.major, W / 2, 756);

  // 8) 我的新长征：金色细线框 + 引号 + 自动换行的目标
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(130, 810, W - 260, 300);
  ctx.fillStyle = C.paper;
  ctx.fillRect(W / 2 - 130, 790, 260, 40);
  ctx.fillStyle = C.red;
  ctx.font = `700 32px ${SERIF}`;
  ctx.fillText('我 的 新 长 征', W / 2, 822);

  ctx.font = `700 52px ${SERIF}`;
  const lines = wrap(ctx, `“${e.goal}”`, W - 340).slice(0, 4);
  const lh = 70;
  const startY = 960 - ((lines.length - 1) * lh) / 2 + 18;
  ctx.fillStyle = C.ink;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh));

  // 9) v1.1 时间线：按时间顺序从左到右 —— 汝城 1934 → 湘江 1934 → 通道 1934 → 桑植 1935 → 我 今天
  //    站名与年份从 nodes.js 读取（年份取 date 字段里的“XXXX年”），改配置即可同步。
  //    1934—1935 的路段用红色实线；从桑植到“我”跨越近一个世纪，用金色虚线表示“薪火相传”。
  const stops = [...TIMELINE, { name: '我', year: '今天', me: true }];
  const x0 = 170, x1 = W - 170, ty = 1212;
  const xs = stops.map((_, i) => x0 + ((x1 - x0) * i) / (stops.length - 1));
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(xs[0], ty);
  ctx.lineTo(xs[stops.length - 2], ty);
  ctx.stroke();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 5;
  ctx.setLineDash([4, 14]);
  ctx.beginPath();
  ctx.moveTo(xs[stops.length - 2] + 16, ty);
  ctx.lineTo(xs[stops.length - 1] - 20, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  stops.forEach((st, i) => {
    const px = xs[i];
    ctx.beginPath();
    ctx.arc(px, ty, st.me ? 16 : 11, 0, Math.PI * 2);
    ctx.fillStyle = st.me ? C.red : C.paper;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = C.red;
    ctx.stroke();
    ctx.fillStyle = st.me ? C.red : C.ink;
    ctx.font = `900 36px ${SERIF}`;
    ctx.fillText(st.name, px, ty - 30);
    ctx.fillStyle = st.me ? C.red : C.inkSoft;
    ctx.font = `700 26px ${SERIF}`;
    ctx.fillText(st.year, px, ty + 52);
  });

  // 10) 页脚：日期 + 口号 + 印章
  ctx.fillStyle = C.ink;
  ctx.fillRect(110, 1296, W - 220, 1.5);
  ctx.textAlign = 'left';
  ctx.font = `400 28px ${SERIF}`;
  ctx.fillStyle = C.inkSoft;
  ctx.fillText(fmtDate(e.time), 116, 1336);
  ctx.font = `400 26px ${SERIF}`;
  ctx.fillText('码承长征薪火，页绘青春征途', 116, 1368);

  // 印章“湘”：红底方块，略微旋转
  ctx.save();
  ctx.translate(W - 170, 1338);
  ctx.rotate(-0.07);
  ctx.fillStyle = C.red;
  ctx.fillRect(-34, -34, 68, 68);
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-28, -28, 56, 56);
  ctx.fillStyle = C.paper;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 42px ${SERIF}`;
  ctx.fillText('湘', 0, 2);
  ctx.restore();
}

/* ---------------- 接力墙 ---------------- */

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text; // textContent：输入内容不会被当成 HTML
  return node;
}

/** 一张接力卡片 */
function card(e, isNew) {
  const c = el('article', `relay-card${e.sample ? ' is-sample' : ''}${isNew ? ' is-new' : ''}`);
  const top = el('header', 'relay-card-top');
  top.append(el('span', 'relay-no', `No.${pad4(e.no)}`), el('span', 'relay-date', fmtDate(e.time)));
  c.append(top, el('p', 'relay-goal', e.goal));
  const who = el('p', 'relay-who');
  who.append(el('strong', '', e.name), el('span', '', ` · ${e.major}`));
  c.append(who);
  if (e.sample) c.append(el('span', 'relay-stamp', '示例'));
  return c;
}

/** 数字滚动动画：from → to（新动画开始时作废旧动画，避免两段动画抢着写数字） */
let countToken = 0;
function animateCount(node, from, to, reducedMotion) {
  const token = ++countToken;
  if (reducedMotion || from === to) {
    node.textContent = String(to);
    return;
  }
  const t0 = performance.now();
  const dur = Math.min(600, 250 + Math.abs(to - from) * 60);
  const step = (t) => {
    if (token !== countToken) return; // 已被更新的动画取代
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = String(Math.round(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- 二维码（v1.1，现场答辩扫码接力） ---------------- */

/** 线上地址：GitHub Pages。二维码由 vendor/qrcode-generator.js 在本地生成，无需联网 */
export const RELAY_URL = 'https://wellingtonbrito482-prog.github.io/xinhuo-xiangzheng/#relay';

/**
 * 把页面上所有 [data-qr] 容器画成二维码（SVG，墨色方块 + 纸色底）
 * 用 SVG 而不是图片：任意缩放都清晰，投影到大屏也能扫。
 */
function renderQR() {
  const make = window.qrcode;
  const boxes = document.querySelectorAll('[data-qr]');
  if (!make || !boxes.length) return;
  const qr = make(0, 'M'); // 0 = 自动选择版本；M = 15% 纠错
  qr.addData(RELAY_URL);
  qr.make();
  const n = qr.getModuleCount();
  const q = 2; // 留白（模块数）
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q},${r + q}h1v1h-1z`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges" role="img" aria-label="二维码：${RELAY_URL}"><rect width="100%" height="100%" fill="${C.paper}"/><path d="${d}" fill="${C.ink}"/></svg>`;
  boxes.forEach((b) => { b.innerHTML = svg; }); // svg 由我们自己生成（固定网址），不含用户输入
}

/* ---------------- 对外入口 ---------------- */

/** @param {{ reducedMotion: boolean }} options */
export async function initRelay({ reducedMotion }) {
  const root = document.getElementById('relay');
  if (!root) return;
  const form = root.querySelector('#relayForm');
  const canvas = root.querySelector('#posterCanvas');
  const dlBtn = root.querySelector('#posterDownload');
  const status = root.querySelector('#relayStatus');
  const wall = root.querySelector('#relayWall');
  const countEl = root.querySelector('#relayCount');
  const clearBtn = root.querySelector('#relayClearSamples');
  const fields = ['name', 'major', 'goal'].map((k) => form.elements[k]);

  let entries = [];
  let shown = 0;          // 计数器当前显示的值
  let counted = false;    // 计数器是否已经“入场”过
  let lastSubmit = 0;     // 提交节流
  let current = null;     // 当前海报对应的条目（下载用）

  const nextNo = () => entries.reduce((m, e) => Math.max(m, e.no), 0) + 1;

  /** 渲染接力墙（最新的在前，最多显示 60 张） */
  function renderWall(newNo) {
    wall.replaceChildren(...[...entries].reverse().slice(0, 60).map((e) => card(e, e.no === newNo)));
    clearBtn.hidden = !entries.some((e) => e.sample);
    // v1.1：计数器直接显示真实值（从不显示 0 再数上去，避免被误读成“故障”）；
    //       只有数量变化（新接力/清除示例）时才从旧值滚动到新值
    animateCount(countEl, shown, entries.length, reducedMotion);
    shown = entries.length;
  }

  /** 实时预览：边输入边更新海报（还没提交时用占位文字） */
  function preview() {
    const v = { name: clean(fields[0].value), major: clean(fields[1].value), goal: clean(fields[2].value) };
    drawPoster(canvas, {
      no: nextNo(),
      name: [...(v.name || '你的昵称')].slice(0, 12).join(''),
      major: [...(v.major || '专业 / 班级')].slice(0, 20).join(''),
      goal: [...(v.goal || '在这里写下你的新长征目标')].slice(0, 40).join(''),
      time: new Date().toISOString(),
    });
  }

  // 字数提示
  fields.forEach((f) => {
    const counter = root.querySelector(`[data-count-for="${f.name}"]`);
    const update = () => {
      if (counter) counter.textContent = `${len(f.value.trim())}/${LIMITS[f.name][1]}`;
      f.removeAttribute('aria-invalid');
      root.querySelector(`[data-error-for="${f.name}"]`).textContent = '';
    };
    f.addEventListener('input', () => {
      update();
      dlBtn.disabled = true;           // 内容改了，旧海报不再对应
      current = null;
      preview();
    });
    update();
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const { ok, data, errors } = validate(Object.fromEntries(fields.map((f) => [f.name, f.value])));
    fields.forEach((f) => {
      const msg = errors[f.name] || '';
      root.querySelector(`[data-error-for="${f.name}"]`).textContent = msg;
      if (msg) f.setAttribute('aria-invalid', 'true');
      else f.removeAttribute('aria-invalid');
    });
    if (!ok) {
      fields.find((f) => errors[f.name]).focus();
      return;
    }
    if (Date.now() - lastSubmit < 5000) {
      status.textContent = '提交太快啦，请稍等几秒再试。';
      return;
    }
    lastSubmit = Date.now();
    try {
      current = await store.add(data);
      entries = await store.list();
      drawPoster(canvas, current);
      dlBtn.disabled = false;
      status.textContent = `接力成功！你是第 ${pad4(current.no)} 位接力者，海报已生成。`;
      renderWall(current.no);
    } catch (err) {
      console.warn(err);
      status.textContent = '保存失败：浏览器可能禁用了本地存储。海报仍可下载。';
      current = { ...data, no: nextNo(), time: new Date().toISOString() };
      drawPoster(canvas, current);
      dlBtn.disabled = false;
    }
  });

  // 下载海报：canvas → PNG（data URL）→ 触发 <a download>
  dlBtn.addEventListener('click', () => {
    if (!current) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `薪火湘征-接力海报-${pad4(current.no)}.png`;
    document.body.append(a);
    a.click();
    a.remove();
  });

  clearBtn.addEventListener('click', async () => {
    await store.clearSamples();
    entries = await store.list();
    renderWall();
    preview();
  });

  // 计数器入场：数值早已是终值，这里只做一次轻微的“盖章”强调动画（CSS .is-pop）
  const io = new IntersectionObserver((list) => {
    if (list.some((x) => x.isIntersecting) && !counted) {
      counted = true;
      if (!reducedMotion) countEl.classList.add('is-pop');
      io.disconnect();
    }
  }, { threshold: 0.4 });
  io.observe(countEl);

  entries = await store.list();
  shown = entries.length;
  countEl.textContent = String(entries.length); // 先直接写入终值
  renderWall();
  preview();
  renderQR();
}
