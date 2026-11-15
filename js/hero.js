/**
 * hero.js —— 首页「启程」
 * ------------------------------------------------------------
 * 效果：用户向下滚动时，一条红色“行军线”从右（东，江西）向左（西）逐渐画出，
 *       线头的小红点跟着走，经过的地名依次浮现。
 *
 * 原理（答辩可讲）：
 *   1. SVG 路径的描边可以设置成“虚线”：stroke-dasharray = 路径总长，
 *      即“一段实线 + 一段同样长的空白”。
 *   2. 再把 stroke-dashoffset 也设为路径总长，实线就整个被“推”出去，看不见了。
 *   3. 滚动时把 dashoffset 从 总长 → 0 递减，实线就像被一笔画出来。
 *   4. GSAP ScrollTrigger 的 scrub 把“滚动进度(0~1)”直接绑定到这个动画进度上。
 */

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

/** 沿途地名：at 表示出现在路径长度的百分之几处（示意，不是真实比例） */
const STOPS = [
  { name: '瑞金', at: 0.0 },
  { name: '汝城', at: 0.18 },
  { name: '湘江', at: 0.36 },
  { name: '通道', at: 0.55 },
  { name: '遵义', at: 0.76 },
  { name: '会宁', at: 1.0 },
];

const SVG_NS = 'http://www.w3.org/2000/svg';

/* =============================================================
 * v2 火星粒子（Canvas 2D）
 *   · 环境火星：从山脊下方缓缓升起、左右飘、慢慢熄灭（像远处的篝火）
 *   · 火头火星：跟着行军线的线头喷出，滚动越快喷得越多
 * 原理：每颗火星 = {x, y, vx, vy, life}；每帧更新位置、减少寿命，用径向渐变画一个发光小点。
 * 只在首页可见时运行（IntersectionObserver），离开首页就停，省电。
 * ============================================================= */
function createEmbers(canvas) {
  const ctx = canvas.getContext('2d');
  const sparks = [];
  let W = 0, H = 0, dpr = 1, running = false, raf = 0;
  let headX = -1, headY = -1, burst = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(x, y, fromHead) {
    sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * (fromHead ? 1.6 : 0.4),
      vy: -(fromHead ? 0.6 + Math.random() * 1.4 : 0.25 + Math.random() * 0.55),
      life: 1,
      decay: fromHead ? 0.012 + Math.random() * 0.012 : 0.003 + Math.random() * 0.004,
      r: fromHead ? 1 + Math.random() * 1.8 : 0.6 + Math.random() * 1.4,
      wob: Math.random() * Math.PI * 2,
    });
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    // 环境火星：数量随屏幕宽度变化
    if (sparks.length < 70 + W / 14 && Math.random() < 0.5) spawn(Math.random() * W, H + 6, false);
    // 火头火星
    const n = Math.min(6, 1 + burst);
    if (headX >= 0) for (let i = 0; i < n; i++) if (Math.random() < 0.6) spawn(headX, headY, true);
    burst *= 0.9;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.wob += 0.04;
      s.x += s.vx + Math.sin(s.wob) * 0.25;
      s.y += s.vy;
      s.life -= s.decay;
      if (s.life <= 0 || s.y < -10) { sparks.splice(i, 1); continue; }
      const a = s.life;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      g.addColorStop(0, `rgba(255,214,150,${a})`);
      g.addColorStop(0.35, `rgba(240,120,60,${a * 0.6})`);
      g.addColorStop(1, 'rgba(226,87,43,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  resize();
  window.addEventListener('resize', resize);
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  return {
    /** 线头在画布中的位置（像素），以及这一帧的滚动速度（决定喷多少） */
    setHead(x, y, speed) { headX = x; headY = y; burst = Math.max(burst, speed); },
  };
}

/** v2：把“青春.接过(薪火);”逐字打出来（键盘手感：随机间隔） */
function typeCode(el, reducedMotion) {
  if (!el) return;
  const full = el.textContent;
  if (reducedMotion) return;
  el.textContent = '';
  el.classList.add('is-typing');
  let i = 0;
  const tick = () => {
    el.textContent = full.slice(0, ++i);
    if (i < full.length) setTimeout(tick, 70 + Math.random() * 90);
  };
  setTimeout(tick, 900);
}

/**
 * v1.1 主视觉插槽：index.html 里 #heroVisual 的 data-src 填了图片路径（如 assets/hero.jpg）才显示。
 * 不自动去猜文件名 —— 猜不到的文件会产生 404 和控制台报错。
 * 图片加载失败时整块移除，不留裂图。
 */
function initHeroVisual() {
  const box = document.getElementById('heroVisual');
  const src = box && box.dataset.src && box.dataset.src.trim();
  if (!src) {
    if (box) box.remove();
    return;
  }
  const img = new Image();
  img.alt = '';
  img.decoding = 'async';
  img.onload = () => {
    box.append(img);
    box.classList.add('is-loaded');
  };
  img.onerror = () => box.remove();
  img.src = src;
}

/**
 * 初始化首页动画
 * @param {{ reducedMotion: boolean }} options
 */
export function initHero({ reducedMotion }) {
  const path = document.getElementById('marchPath');
  const head = document.getElementById('marchHead');
  const labelLayer = document.getElementById('marchLabels');
  if (!path || !head || !labelLayer) return;

  initHeroVisual();
  typeCode(document.getElementById('heroCode'), reducedMotion);
  const canvas = document.getElementById('embers');
  const embers = !reducedMotion && canvas ? createEmbers(canvas) : null;
  const svg = path.ownerSVGElement;
  let lastProgress = 0;

  const total = path.getTotalLength(); // 路径总长度（SVG 坐标单位）

  // —— 1. 生成地名标签（小圆点 + 文字），先全部隐藏 ——
  const labels = STOPS.map((stop) => {
    const p = path.getPointAtLength(total * stop.at);
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'march-label-dot');
    dot.setAttribute('cx', p.x);
    dot.setAttribute('cy', p.y);
    dot.setAttribute('r', 6);

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('class', 'march-label');
    text.setAttribute('x', p.x);
    // 点在线的“波谷”（靠下）时标签放在下方，在“波峰”时放在上方，避免压住线
    text.setAttribute('y', p.y > 110 ? p.y + 40 : p.y - 20);
    // 首尾两个地名靠近画面边缘，改为向内对齐，避免被裁掉
    text.setAttribute('text-anchor', stop.at === 0 ? 'end' : stop.at === 1 ? 'start' : 'middle');
    text.textContent = stop.name;

    labelLayer.append(dot, text);
    return { ...stop, dot, text, shown: false };
  });

  // —— 2. 准备“画线”：把实线整个推出可见范围 ——
  path.style.strokeDasharray = `${total}`;
  path.style.strokeDashoffset = `${total}`;

  /** 根据进度 progress(0~1) 更新线、线头、地名 */
  function render(progress) {
    path.style.strokeDashoffset = `${total * (1 - progress)}`;

    const p = path.getPointAtLength(total * progress);
    head.setAttribute('cx', p.x);
    head.setAttribute('cy', p.y);

    // v2：把线头的 SVG 坐标换算成画布像素坐标，交给火星粒子
    if (embers && svg && canvas) {
      const m = svg.getScreenCTM();
      const c = canvas.getBoundingClientRect();
      if (m) {
        const sx = m.a * p.x + m.c * p.y + m.e - c.left;
        const sy = m.b * p.x + m.d * p.y + m.f - c.top;
        embers.setHead(sx, sy, Math.abs(progress - lastProgress) * 400);
      }
      lastProgress = progress;
    }

    labels.forEach((label) => {
      const shouldShow = progress >= label.at - 0.001;
      if (shouldShow !== label.shown) {
        label.shown = shouldShow;
        if (reducedMotion) {
          gsap.set([label.dot, label.text], { opacity: shouldShow ? 1 : 0 });
        } else {
          gsap.to([label.dot, label.text], { opacity: shouldShow ? 1 : 0, duration: 0.35, overwrite: true });
        }
      }
    });
  }

  // —— 3. 减少动态效果：直接显示完整路线，不做滚动动画 ——
  if (reducedMotion || !gsap || !ScrollTrigger) {
    render(1);
    return;
  }

  // 一开始先让线条露出一小截，提示用户“这里会动”
  const state = { progress: 0.03 };
  render(state.progress);

  // —— 4. 滚动绑定：hero 区域从顶部滚到底部，进度 0.03 → 1 ——
  gsap.to(state, {
    progress: 1,
    ease: 'none',
    onUpdate: () => render(state.progress),
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6, // 0.6 秒的“跟随缓冲”，让画线更顺滑
    },
  });

  // 标题与副标题：开场淡入（v1.1：起始不透明度 0.6、位移 8px、0.4 秒 —— 快速滚动或截图时文字也清楚）
  gsap.from('.hero-copy > *', { y: 8, opacity: 0.6, duration: 0.4, stagger: 0.06, ease: 'power2.out' });

  // 滚动提示：开始滚动后淡出
  gsap.to('.scroll-hint', {
    opacity: 0,
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '15% top', scrub: true },
  });

  // 线快画完时，标题略微上移变淡，把视线交给下面的地图
  gsap.to('.hero-copy', {
    y: -40,
    opacity: 0.25,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: '85% bottom', end: 'bottom bottom', scrub: true },
  });
}
