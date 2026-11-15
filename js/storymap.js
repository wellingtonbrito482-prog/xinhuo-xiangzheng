/**
 * storymap.js —— 湘征地图（滚动叙事 Scrollytelling）
 * ------------------------------------------------------------
 * 结构：左边一张“吸附”(position: sticky) 的 ECharts 地图，右边一列故事卡片。
 * 用户滚动时，scrollama 告诉我们“现在哪张卡片走到了屏幕中间”，
 * 我们就让地图飞到对应地点、点亮水波纹、画出从上一站过来的行军线。
 *
 * 数据流（答辩可讲）：
 *   nodes.js（章节配置） ──生成──▶ 卡片 DOM
 *                      └─驱动──▶ 地图状态（视角 + 已走过的路线 + 当前点）
 *
 * 用到的 ECharts 系列：
 *   geo           底图（湖南 14 个市州 + 周边省份浅色衬底）
 *   lines         行军线：已走过的为实线，刚走的一段带“流光”动画
 *   scatter       所有节点的小圆点
 *   effectScatter 当前节点的水波纹
 */

import { chapters, origin } from './data/nodes.js';

const gsap = window.gsap;
const echarts = window.echarts;
const scrollama = window.scrollama;

// ---- 颜色（与 css/style.css 的设计变量保持一致） ----
const C = {
  red: '#B3261E',
  paper: '#F6F1E7',
  paperDark: '#E9DCC4',
  ink: '#1F1A17',
  inkSoft: '#5A4E45',
  gold: '#C9A45C',
  neighborLine: '#BDB09C',
  // v2.1「投影友好」：地图回到亮纸底，路线用炬火红（投影仪上暗底会发灰，亮底更稳）
  night: '#F7F1E6',     // 未到达站点的填色（纸白）
  land: '#E8DCC5',      // 湖南各市州
  landEdge: '#B8A68A',
  outer: '#F1EADD',     // 周边省份
  outerEdge: '#D9CDB8',
  moon: '#1F1A17',
  moonSoft: '#8A7C6E',
  ember: '#C93F1C',     // 路线：比 v2 深一档，纸底上对比度足够
  glow: '#E2572B',
};

import { getSparks, lightSpark, onSparks } from './sparks.js';

const MAP_NAME = 'xiang'; // 注册到 ECharts 的底图名称

/* =============================================================
 * 一、根据章节配置生成故事卡片
 * ============================================================= */

/** 简单的 HTML 转义，避免配置里的特殊字符破坏页面 */
function esc(str = '') {
  return String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function renderSteps(container) {
  container.innerHTML = chapters
    .map((ch, i) => {
      const note = ch.note ? `<p class="step-note">${esc(ch.note)}</p>` : '';

      // 岔路口互动（只有配置了 choice 的章节才有）
      const choice = ch.choice
        ? `<div class="choice" role="group" aria-label="岔路口选择">
             <p class="choice-prompt">${esc(ch.choice.prompt)}</p>
             <div class="choice-buttons">
               ${ch.choice.options
                 .map((opt, k) => `<button type="button" class="choice-btn" data-k="${k}" aria-pressed="false">${esc(opt.label)}</button>`)
                 .join('')}
             </div>
             <p class="choice-result" aria-live="polite"></p>
           </div>`
        : '';

      // v2.2 点亮火种：一站一题（通道站用岔路口选择代替）
      const spark = ch.spark
        ? `<div class="spark" role="group" aria-label="点亮火种小题">
             <p class="spark-q"><span class="spark-dot" aria-hidden="true"></span>点亮火种 · ${esc(ch.spark.q)}</p>
             <div class="spark-options">
               ${ch.spark.options.map((o, k) => `<button type="button" class="spark-btn" data-k="${k}">${esc(o)}</button>`).join('')}
             </div>
             <p class="spark-result" aria-live="polite"></p>
           </div>`
        : '';

      const cta = ch.cta ? `<a class="cta" href="${esc(ch.cta.href)}">${esc(ch.cta.label)}</a>` : '';

      // v1：有详情页的节点显示“查看详情 →”（相对路径，GitHub Pages 子路径下同样可用）
      const more = ch.detail
        ? `<a class="step-more" href="pages/${esc(ch.detail.page)}">查看详情 <span aria-hidden="true">→</span></a>`
        : '';

      return `<article class="step" id="step-${esc(ch.id)}" data-index="${i}" data-id="${esc(ch.id)}">
          <p class="step-kicker">${esc(ch.kicker)}</p>
          <p class="step-date">${esc(ch.date)}</p>
          <h3>${esc(ch.title)}</h3>
          <p class="step-place">${esc(ch.place)}</p>
          <p class="step-story">${esc(ch.story)}</p>
          ${note}
          <blockquote class="step-quote">
            <p>“${esc(ch.quote.text)}”</p>
            <cite>—— ${esc(ch.quote.source)}</cite>
          </blockquote>
          ${choice}
          ${spark}
          ${more}
          ${cta}
        </article>`;
    })
    .join('');
}

/* =============================================================
 * 二、路线数据：把章节配置变成“地图要画什么”
 * ============================================================= */

/** 参与行军线的节点（按顺序） */
const routeNodes = chapters.filter((ch) => ch.inRoute);

/**
 * 计算第 index 章时，地图上应该显示的内容
 * @returns {{ done: Array, active: Array, current: Array|null, visitedIds: Set }}
 */
function routeStateAt(index) {
  const chapter = chapters[index];
  const visitedIds = new Set();
  const done = [];   // 已经走过的路段（静态实线）
  const active = []; // 正在走的这一段（流光动画）

  // 序章：只点亮出发地瑞金
  if (chapter.id === 'prologue') {
    return { done, active, current: origin.coord, visitedIds };
  }

  // 尾声：全部路线都算走过，路线整体流光
  const lastRouteIdx = chapter.id === 'epilogue' ? routeNodes.length - 1 : routeNodes.indexOf(chapter);

  let prev = origin.coord;
  routeNodes.forEach((node, k) => {
    if (k > lastRouteIdx) return;
    visitedIds.add(node.id);
    const isCurrent = k === lastRouteIdx && chapter.id !== 'epilogue';
    const bucket = isCurrent ? active : done;
    if (node.newBranch) {
      // newBranch：另一支队伍的起点，不与上一站相连，改画它自己的示意路线
      const path = node.branchPath || [];
      for (let j = 1; j < path.length; j++) bucket.push({ coords: [path[j - 1], path[j]] });
    } else {
      bucket.push({ coords: [prev, node.coord] });
    }
    prev = node.coord;
  });

  if (chapter.id === 'epilogue') active.push(...done.splice(0)); // 尾声：全部路段都带流光

  return { done, active, current: chapter.coord, visitedIds };
}

/* =============================================================
 * 三、ECharts 地图
 * ============================================================= */

/**
 * 把湖南（含 14 个市州）和周边省份合并成一张底图
 * @param {object} hunanGeo     湖南市级 GeoJSON
 * @param {object} neighborsGeo 周边省份 GeoJSON（江西、广西、贵州……）
 */
function registerBaseMap(hunanGeo, neighborsGeo) {
  const merged = {
    type: 'FeatureCollection',
    features: [...neighborsGeo.features, ...hunanGeo.features],
  };
  echarts.registerMap(MAP_NAME, merged);

  return neighborsGeo.features.map((f) => f.properties.name);
}

/**
 * v1.1：周边省份的样式。省名只在“全省概览”（缩放较小）时以小号浅色显示，
 * 放大到某一站时隐藏 —— 否则“广西壮族自治区”等长名字会被地图边缘切掉一半。
 * @param {string[]} names    周边省份名称
 * @param {boolean}  showName 是否显示省名
 */
function neighborRegions(names, showName) {
  return names.map((name) => ({
    name,
    itemStyle: { areaColor: C.outer, borderColor: C.outerEdge, borderWidth: 0.8 },
    label: { show: showName, color: 'rgba(169,175,187,0.55)', fontSize: 11, fontFamily: 'serif', fontWeight: 'normal' },
  }));
}

/* -------------------------------------------------------------
 * v1.1：站点标签的“防裁切”布局
 * ECharts 的 labelLayout 回调在每次重绘时调用，拿到圆点(rect)和标签(labelRect)的像素位置，
 * 我们据此决定标签放在点的 右 / 左 / 下 / 上，并保证整块标签留在地图框内：
 *   · 默认放右侧，与圆点留出间距（当前站有水波纹，间距更大，不压住涟漪）；
 *   · 右侧放不下 → 放左侧；顶部被“地图标题/自动播放”按钮挡住 → 放下方；贴近底边 → 放上方；
 *   · 最后再把坐标夹在安全边距内（SAFE）。
 * ------------------------------------------------------------- */
const SAFE = { top: 52, right: 10, bottom: 28, left: 10 }; // 上：给地图标题和播放按钮留位置；下：给“仅为示意”小字留位置

function makeLabelLayout(chart, getCurrentIdx) {
  return (params) => {
    const W = chart.getWidth();
    const H = chart.getHeight();
    const { rect, labelRect } = params;
    const gap = params.dataIndex === getCurrentIdx() ? 18 : 8; // 当前站：水波纹更大，标签离远一点
    const w = labelRect.width;
    const h = labelRect.height;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const r = rect.width / 2;

    // 圆点本身已在地图框外（例如放大到通道时，瑞金和汝城在画面外）→ 标签也移出画面，
    // 不把它“硬塞”回框内，否则标签会离开它的点、误导读者
    if (cx < 0 || cx > W || cy < 0 || cy > H) return { x: -9999, y: -9999 };

    // 候选位置（标签左上角坐标），按优先级排列
    const candidates = [
      { x: cx + r + gap, y: cy - h / 2 },          // 右
      { x: cx - r - gap - w, y: cy - h / 2 },      // 左
      { x: cx - w / 2, y: cy + r + gap - 2 },      // 下
      { x: cx - w / 2, y: cy - r - gap - h + 2 },  // 上
    ];
    const fits = (c) =>
      c.x >= SAFE.left && c.x + w <= W - SAFE.right && c.y >= SAFE.top && c.y + h <= H - SAFE.bottom;
    let best = candidates.find(fits) || candidates[0];
    // 都放不下（点本身在边缘外）时，夹在安全区内，至少文字完整可读
    const x = Math.min(Math.max(best.x, SAFE.left), W - SAFE.right - w);
    const y = Math.min(Math.max(best.y, SAFE.top), H - SAFE.bottom - h);
    return { x, y, align: 'left', verticalAlign: 'top', hideOverlap: false };
  };
}

/** 生成地图的完整初始配置 */
function baseOption(neighborNames, reducedMotion) {
  return {
    animation: !reducedMotion,
    geo: {
      map: MAP_NAME,
      roam: false,            // 禁止用户拖拽缩放，视角完全由滚动控制
      silent: true,           // 底图不响应鼠标
      center: chapters[0].view.center,
      zoom: chapters[0].view.zoom,
      aspectScale: 0.85,      // 纬度修正，让湖南的形状更接近真实比例
      itemStyle: {
        areaColor: C.land,
        borderColor: C.landEdge,
        borderWidth: 0.7,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 12,
      },
      label: { show: true, color: 'rgba(169,175,187,0.75)', fontSize: 11 },
      regions: neighborRegions(neighborNames, true),
    },
    series: [
      {
        // 已走过的路段：静态红色实线
        id: 'route-done',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 1,
        lineStyle: { color: C.ember, width: 2.5, opacity: 0.8, curveness: 0.18, shadowColor: 'rgba(201,63,28,0.35)', shadowBlur: 6 },
        data: [],
      },
      {
        // 刚刚走的一段：带“流光”箭头动画
        id: 'route-active',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 2,
        effect: {
          show: !reducedMotion,
          period: 2.2,
          // 拖尾必须为 0：ECharts 的拖尾依赖整层“运动模糊”，地图平移缩放时会留下大片残影
          trailLength: 0,
          symbol: 'arrow',
          symbolSize: 9,
          color: C.glow,
        },
        lineStyle: { color: C.ember, width: 3.2, opacity: 1, curveness: 0.18, shadowColor: 'rgba(201,63,28,0.45)', shadowBlur: 8 },
        data: [],
      },
      {
        // 岔路口互动画出的方向线（通道转兵）
        id: 'choice-line',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 2,
        effect: { show: !reducedMotion, period: 1.6, trailLength: 0, symbol: 'arrow', symbolSize: 10 },
        lineStyle: { width: 2.5, type: 'dashed', curveness: 0.1 },
        data: [],
      },
      {
        // 所有节点小圆点
        id: 'nodes',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        symbolSize: 10,
        // v1.1：标签做成“偏移小签”——纸色底 + 细边框，位置由 labelLayout 计算（见 makeLabelLayout）
        label: {
          show: true,
          formatter: '{b}', // 显示地点名（默认会显示坐标数值）
          position: 'right',
          distance: 8,
          fontFamily: 'serif',
          fontWeight: 'bold',
          fontSize: 14,
          lineHeight: 18,
          color: C.ink,
          backgroundColor: 'rgba(244,237,225,0.94)',
          borderColor: 'rgba(31,26,23,0.35)',
          borderWidth: 0.6,
          borderRadius: 2,
          padding: [3, 6],
        },
        data: [],
      },
      {
        // 当前节点水波纹
        id: 'current',
        type: reducedMotion ? 'scatter' : 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        symbolSize: 16,
        rippleEffect: { brushType: 'stroke', scale: 4, period: 3 },
        itemStyle: { color: C.ember, shadowBlur: 10, shadowColor: 'rgba(201,63,28,.5)' },
        data: [],
      },
      {
        // 岔路口“错误方向”的标记
        id: 'choice-mark',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 4,
        symbol: 'circle',
        symbolSize: 1,
        label: {
          show: true,
          position: 'top',
          distance: 10,
          fontFamily: 'serif',
          fontWeight: 'bold',
          fontSize: 14,
          color: C.paper,
          backgroundColor: C.ink,
          padding: [3, 6],
        },
        data: [],
      },
    ],
  };
}

/** 所有节点的散点数据：走过的为红色，没走到的为空心 */
function nodeData(visitedIds) {
  const point = (name, coord, visited) => ({
    name,
    value: coord,
    itemStyle: visited
      ? { color: C.ember, borderColor: C.glow, borderWidth: 1.5 }
      : { color: C.night, borderColor: C.moonSoft, borderWidth: 1.5 },
    label: { color: visited ? C.ink : C.inkSoft },
  });
  return [
    point(origin.name, origin.coord, true),
    ...routeNodes.map((ch) => point(ch.mapLabel, ch.coord, visitedIds.has(ch.id))),
  ];
}

/* =============================================================
 * 四、对外入口
 * ============================================================= */

/**
 * @param {{ hunanGeo: object, neighborsGeo: object, reducedMotion: boolean }} options
 */
export function initStorymap({ hunanGeo, neighborsGeo, reducedMotion }) {
  const stepsEl = document.getElementById('steps');
  const mapEl = document.getElementById('map');
  const captionEl = document.getElementById('mapCaption');
  // v2.2 章节进度条（借鉴 NYT《Snow Fall》章节跳转 / Mapbox 模板）：只列四站，点一下滚到该站
  const railEl = document.getElementById('stationRail');
  if (railEl) {
    railEl.innerHTML = chapters
      .map((ch, i) => (ch.mapLabel ? `<button type="button" data-i="${i}" aria-current="false"><i aria-hidden="true"></i>${esc([...ch.mapLabel].slice(0, 2).join(''))}</button>` : ''))
      .join('');
    railEl.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const step = stepsEl.querySelectorAll('.step')[Number(b.dataset.i)];
      step && step.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
  }
  renderSteps(stepsEl);

  // ---- 1. 地图初始化 ----
  const neighborNames = registerBaseMap(hunanGeo, neighborsGeo);
  const chart = echarts.init(mapEl, null, { renderer: 'canvas' });
  chart.setOption(baseOption(neighborNames, reducedMotion));
  let currentIdx = -1; // 当前站在 nodes 散点数据里的下标（0=瑞金，1起=各站；labelLayout 用来加大间距）
  chart.setOption({ series: [{ id: 'nodes', labelLayout: makeLabelLayout(chart, () => currentIdx) }] });

  // 当前视角（GSAP 对这个普通对象做补间，每一帧同步给 ECharts，实现平滑“飞行”）
  const view = { lng: chapters[0].view.center[0], lat: chapters[0].view.center[1], zoom: chapters[0].view.zoom };
  let currentIndex = -1;

  function applyView() {
    chart.setOption({ geo: { center: [view.lng, view.lat], zoom: view.zoom } }, { lazyUpdate: true });
  }

  /** 让地图飞到某个视角 */
  function flyTo({ center, zoom }) {
    gsap.killTweensOf(view);
    if (reducedMotion) {
      Object.assign(view, { lng: center[0], lat: center[1], zoom });
      applyView();
      return;
    }
    gsap.to(view, {
      lng: center[0],
      lat: center[1],
      zoom,
      duration: 1.4,
      ease: 'power2.inOut',
      onUpdate: applyView,
    });
  }

  /** 切换到第 index 章：更新卡片高亮、地图视角和路线 */
  function activate(index) {
    if (index === currentIndex) return;
    currentIndex = index;
    const chapter = chapters[index];

    // 卡片高亮
    stepsEl.querySelectorAll('.step').forEach((el, i) => el.classList.toggle('is-active', i === index));
    railEl && railEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(Number(b.dataset.i) === index)));

    // 地图标题
    captionEl.textContent = chapter.coord ? chapter.mapLabel : chapter.kicker === '序章' ? '从瑞金到湖南' : '湖南 · 长征足迹';

    // 地图路线
    const state = routeStateAt(index);
    currentIdx = chapter.id === 'prologue' ? 0 : chapter.coord ? routeNodes.indexOf(chapter) + 1 : -1;
    const target = chapter.id === 'prologue' ? { center: [113.3, 26.9], zoom: 1.75 } : chapter.view;
    chart.setOption({
      // 周边省名只在缩放较小（概览）时显示
      geo: { regions: neighborRegions(neighborNames, target.zoom <= 2) },
      series: [
        { id: 'route-done', data: state.done },
        { id: 'route-active', data: state.active },
        { id: 'choice-line', data: [] },
        { id: 'choice-mark', data: [] },
        { id: 'nodes', data: nodeData(state.visitedIds) },
        { id: 'current', data: state.current ? [{ value: state.current }] : [] },
      ],
    });

    // 序章视角放宽一些，让江西瑞金也在画面里
    flyTo(target);
  }

  // ---- 1.5 v2.2 点亮火种：小题 + 地图角上的计数 ----
  const sparkIds = chapters.filter((ch) => ch.spark || ch.choice).map((ch) => ch.id);
  const counter = document.getElementById('sparkCount');
  const paintSparks = (set) => {
    const n = sparkIds.filter((id) => set.has(id)).length;
    if (counter) {
      counter.querySelector('b').textContent = `${n}/${sparkIds.length}`;
      counter.classList.toggle('is-lit', n > 0);
      counter.querySelectorAll('i').forEach((dot, k) => dot.classList.toggle('on', set.has(sparkIds[k])));
    }
    stepsEl.querySelectorAll('.step').forEach((s) => s.classList.toggle('is-sparked', set.has(s.dataset.id)));
  };
  if (counter) counter.querySelector('.spark-dots').innerHTML = sparkIds.map(() => '<i></i>').join('');
  paintSparks(getSparks());
  onSparks(paintSparks);
  chapters.filter((ch) => ch.spark).forEach((ch) => {
    const box = stepsEl.querySelector(`[data-id="${ch.id}"] .spark`);
    if (!box) return;
    const res = box.querySelector('.spark-result');
    box.querySelectorAll('.spark-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ok = Number(btn.dataset.k) === ch.spark.answer;
        box.querySelectorAll('.spark-btn').forEach((b) => b.classList.remove('is-right', 'is-wrong'));
        btn.classList.add(ok ? 'is-right' : 'is-wrong');
        if (ok) {
          res.textContent = `火种已点亮。${ch.spark.explain}`;
          res.className = 'spark-result is-right';
          lightSpark(ch.id);
        } else {
          res.textContent = '再想想，答案就在上面的故事里。';
          res.className = 'spark-result is-wrong';
        }
      });
    });
  });

  // ---- 2. 岔路口互动（通道转兵） ----
  const tongdao = chapters.find((ch) => ch.choice);
  const choiceCard = tongdao && stepsEl.querySelector(`[data-id="${tongdao.id}"] .choice`);
  if (choiceCard) {
    const resultEl = choiceCard.querySelector('.choice-result');
    // 两个方向在地图上的示意终点（近似坐标）
    const targets = {
      false: { coord: [109.95, 28.0], label: '✕ 重兵布防' }, // 北上湘西
      true: { coord: [109.13, 26.23], label: '黎平（贵州）' }, // 西进贵州
    };

    choiceCard.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const opt = tongdao.choice.options[Number(btn.dataset.k)];
        const cls = opt.correct ? 'is-right' : 'is-wrong';

        choiceCard.querySelectorAll('.choice-btn').forEach((b) => {
          b.setAttribute('aria-pressed', String(b === btn));
          b.classList.remove('is-right', 'is-wrong');
        });
        btn.classList.add(cls);
        resultEl.className = `choice-result ${cls}`;
        resultEl.textContent = opt.result;
        if (opt.correct) lightSpark(tongdao.id);

        // 地图上画出所选方向
        const target = targets[opt.correct];
        const color = opt.correct ? C.ember : '#5E6878';
        chart.setOption({
          series: [
            {
              id: 'choice-line',
              data: [{ coords: [tongdao.coord, target.coord], lineStyle: { color }, effect: { color } }],
            },
            {
              id: 'choice-mark',
              data: [{ value: target.coord, label: { formatter: target.label, backgroundColor: color } }],
            },
          ],
        });
      });
    });
  }

  // ---- 3. scrollama：监听哪张卡片进入了屏幕的触发线 ----
  const isMobile = () => window.matchMedia('(max-width: 860px)').matches;
  const scroller = scrollama();
  scroller
    .setup({
      step: '#steps .step',
      offset: isMobile() ? 0.8 : 0.55, // 触发线位置：屏幕高度的 55%（手机端地图在上方，触发线放低）
    })
    .onStepEnter(({ index }) => activate(index));

  activate(0);

  // ---- 4. 窗口尺寸变化时，同步更新 ----
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      chart.resize();
      scroller.resize();
    }, 150);
  });

  // 返回给 main.js / autoplay.js 使用：当前第几章、卡片元素列表
  return {
    chart,
    activate,
    getIndex: () => currentIndex,
    stepEls: [...stepsEl.querySelectorAll('.step')],
  };
}
