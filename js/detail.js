/**
 * detail.js —— 节点详情页（第三层）的共用渲染脚本
 * ------------------------------------------------------------
 * 四个详情页（pages/rucheng.html 等）用的是同一个 HTML 模板，
 * 唯一区别是 <body data-node="tongdao">。本脚本读取这个 id，
 * 从 js/data/nodes.js 里取出对应章节和 detail 字段，生成整页内容：
 *   页头 → 历史经过 + 时间轴 → 小地图 + 人物小卡 → 金句 → 今天的它 → 上一站/下一站
 *
 * 所有路径都是相对路径（../），部署在 GitHub Pages 子路径 /xinhuo-xiangzheng/ 下同样可用。
 *
 * v1.1 新增：
 *   · 图片插槽：节点配置里有 photo 字段时，页头下方显示一张主图（<figure>），没有就什么都不显示：
 *       photo: {
 *         src: 'rucheng.jpg',        // 图片文件名，放在 assets/ 目录（也可写 http(s) 完整地址）
 *         caption: '图片说明',
 *         credit: '摄影 / 提供者',
 *         license: '授权方式，如 CC BY-SA 4.0 / 已获授权',
 *         sourceUrl: 'https://…',     // 出处链接（可选）
 *       }
 *     图片加载失败时整个 figure 自动隐藏，不会出现“裂图”。
 *   · 首字下沉只用于汉字开头的段落；数字（年份）开头的段落改为金色“年份眉标”。
 *   · 小地图常驻站点名标注 + “你在湖南这里”说明。
 *   · 翻页条：只保留一个“回到湘征地图”；第一站/最后一站缺少的上一站/下一站显示为置灰。
 *
 * v1.2 新增：
 *   · 史料出处：按 nodes.js 中 details.*.refs 给每一栏加上角标 [1][2]…，页底列出“史料出处”（标题 + 链接，取自 SOURCES）。
 *   · 图片署名：图注下方显示 作者 · 许可证（链接）· 原图链接，满足 CC BY / BY-SA 的署名要求。
 */

import { detailOrder, SOURCES } from './data/nodes.js';

const C = { red: '#B3261E', paper: '#F6F1E7', paperDark: '#E9DCC4', ink: '#1F1A17', inkSoft: '#4F443C', gold: '#C9A45C' };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** HTML 转义：内容来自配置文件，也照样转义，养成习惯 */
function esc(str = '') {
  return String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/**
 * 史料出处编号：按页面上出现的顺序（历史经过 → 时间轴 → 人物 → 金句 → 今天的它 → 交通）给来源编号，
 * 同一来源只编一次号。mark(section) 返回该栏的上角标 HTML，list 为页底的出处列表。
 */
function buildRefs(refs = {}) {
  const list = [];
  const num = {};
  const mark = (section) => {
    const keys = (refs[section] || []).filter((k) => SOURCES[k]);
    if (!keys.length) return '';
    const links = keys.map((k) => {
      if (!num[k]) { list.push(k); num[k] = list.length; }
      return `<a href="#src-${num[k]}" aria-label="史料出处第 ${num[k]} 条">[${num[k]}]</a>`;
    });
    return `<sup class="fn">${links.join('')}</sup>`;
  };
  return { mark, list };
}

function render(node, idx) {
  const d = node.detail;
  const ref = buildRefs(d.refs);
  // 先按页面顺序生成角标（编号顺序 = 阅读顺序）
  const fn = {};
  for (const sec of ['history', 'timeline', 'people', 'golden', 'today', 'route']) fn[sec] = ref.mark(sec);
  const prev = detailOrder[idx - 1];
  const next = detailOrder[idx + 1];

  document.title = `${node.title} —— 薪火·湘征`;

  const timeline = d.timeline
    .map((t) => `<li><time>${esc(t.time)}</time><p>${esc(t.text)}</p></li>`)
    .join('');

  const people = d.people
    .map(
      (p) => `<article class="person">
        <div class="person-seal" aria-hidden="true">${esc([...p.name][0])}</div>
        <div><h3 class="person-name">${esc(p.name)}</h3><p class="person-role">${esc(p.role)}</p><p>${esc(p.text)}</p></div>
      </article>`
    )
    .join('');

  // 翻页：有上一站/下一站就是链接；第一站没有上一站、最后一站没有下一站 → 置灰占位（不可点击）
  const navLink = (n, dir) =>
    n
      ? `<a class="pager-link pager-${dir}" href="${esc(n.detail.page)}">
           <span>${dir === 'prev' ? '← 上一站' : '下一站 →'}</span><strong>${esc(n.title)}</strong></a>`
      : `<span class="pager-link pager-${dir} is-disabled" aria-disabled="true">
           <span>${dir === 'prev' ? '← 上一站' : '下一站 →'}</span><strong>${dir === 'prev' ? '已是第一站' : '已是最后一站'}</strong></span>`;

  // 首字下沉 / 年份眉标：段落以汉字开头才做首字下沉；以数字开头（如“1934年…”）改为在段首上方放一个金色年份眉标
  const history = String(d.history || '');
  const isHan = /^[\u4e00-\u9fff]/.test(history);
  const yearMatch = history.match(/^(\d{4})\s*年/);
  const eyebrow = !isHan && yearMatch ? `<p class="year-eyebrow" aria-hidden="true"><span>${esc(yearMatch[1])}</span></p>` : '';

  // 图片插槽（photo 字段可选；没有就不输出任何东西）
  const hero = photoFigure(node.photo || d.photo);

  document.getElementById('detail').innerHTML = `
    <nav class="crumbs" aria-label="面包屑">
      <a href="../index.html">首页</a><span>/</span>
      <a href="../index.html#step-${esc(node.id)}">湘征地图</a><span>/</span>
      <span aria-current="page">${esc(node.kicker)} · ${esc(node.mapLabel)}</span>
    </nav>

    <header class="detail-head">
      <p class="section-no">${esc(node.kicker)} · ${esc(node.date)}</p>
      <h1>${esc(node.title)}</h1>
      <p class="detail-place">${esc(node.place)}</p>
    </header>

    ${hero}

    <div class="detail-grid">
      <section class="detail-main" aria-labelledby="h-history">
        <h2 id="h-history" class="col-title">历史经过</h2>
        ${eyebrow}
        <p class="detail-history${isHan ? ' has-dropcap' : ''}">${esc(history)}${fn.history}</p>
        ${node.note ? `<p class="step-note">${esc(node.note)}</p>` : ''}
        <h2 class="col-title">时间轴${fn.timeline}</h2>
        <ol class="timeline">${timeline}</ol>
      </section>

      <aside class="detail-side">
        <div class="mini-map-frame">
          <div id="miniMap" class="mini-map" role="img" aria-label="${esc(node.mapLabel)}位置示意图"></div>
          <p class="mini-map-caption"><span class="dot" aria-hidden="true"></span>你在湖南这里：<b>${esc(node.mapLabel)}</b></p>
          <p class="map-note">位置示意 · 坐标为近似值</p>
        </div>
        <h2 class="col-title">人物小卡${fn.people}</h2>
        ${people}
      </aside>
    </div>

    <figure class="golden">
      <blockquote>“${esc(d.golden.text)}”</blockquote>
      <figcaption>—— ${esc(d.golden.source)}${fn.golden}</figcaption>
    </figure>

    <section class="today" aria-labelledby="h-today">
      <h2 id="h-today" class="col-title">今天的它</h2>
      <div class="today-grid">
        <article class="today-card">
          <p class="today-label">纪念馆 / 旧址</p>
          <h3>${esc(d.today.name)}</h3>
          <p>${esc(d.today.intro)}${fn.today}</p>
        </article>
        <article class="today-card today-route">
          <p class="today-label">从衡阳出发怎么去</p>
          <h3>衡阳 → ${esc(node.mapLabel)}</h3>
          <p>${esc(d.today.route)}${fn.route}</p>
        </article>
      </div>
    </section>

    ${sourcesSection(ref.list)}

    <p class="detail-disclaimer">交通信息仅供参考，请以 12306 和导航为准。地图为示意图，不作为国界与行政区划依据；底图数据来自阿里云 DataV。</p>

    <nav class="pager" aria-label="上一站 / 下一站">
      ${navLink(prev, 'prev')}
      <a class="pager-back" href="../index.html#step-${esc(node.id)}">◉ 回到湘征地图</a>
      ${navLink(next, 'next')}
    </nav>`;

  // 图片加载失败 → 隐藏整个 figure（不留裂图）
  const img = document.querySelector('.detail-photo img');
  if (img) img.addEventListener('error', () => img.closest('figure').remove());
}

/**
 * 详情页主图插槽：photo = { src, caption, credit, license, sourceUrl }
 * src 只写文件名时，从站点的 assets/ 目录读取（详情页在 pages/ 下，所以是 ../assets/）。
 */
function photoFigure(photo) {
  if (!photo || !photo.src) return '';
  const src = /^(https?:)?\/\//.test(photo.src) || photo.src.startsWith('../') ? photo.src : `../assets/${photo.src}`;
  const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
  // 署名行：作者 · 许可证（链接到许可证文本）· 原图链接
  const parts = [];
  if (photo.credit) parts.push(`图片：${esc(photo.credit)}`);
  if (photo.license) {
    parts.push(isUrl(photo.licenseUrl)
      ? `许可：<a href="${esc(photo.licenseUrl)}" target="_blank" rel="noopener license">${esc(photo.license)}</a>`
      : `许可：${esc(photo.license)}`);
  }
  if (isUrl(photo.sourceUrl)) parts.push(`<a href="${esc(photo.sourceUrl)}" target="_blank" rel="noopener">查看原图</a>`);
  const credit = parts.join(' · ');
  return `<!-- ▼ 图片插槽：内容来自 nodes.js 的 photo 字段 -->
    <figure class="detail-photo">
      <img src="${esc(src)}" alt="${esc(photo.caption || '')}" loading="lazy" decoding="async" />
      ${photo.caption || credit ? `<figcaption><span class="photo-caption">${esc(photo.caption || '')}</span>${credit ? `<span class="photo-credit">${credit}</span>` : ''}</figcaption>` : ''}
    </figure>`;
}

/** 页底“史料出处”列表：编号与正文上角标一致 */
function sourcesSection(keys) {
  if (!keys.length) return '';
  const items = keys
    .map((k, i) => {
      const s = SOURCES[k];
      return `<li id="src-${i + 1}"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`;
    })
    .join('');
  return `<section class="detail-sources" aria-labelledby="h-sources">
      <h2 id="h-sources" class="col-title">史料出处</h2>
      <ol class="src-notes">${items}</ol>
    </section>`;
}

/** 小地图：湖南底图 + 本节点的水波纹点（ECharts，本地数据） */
async function miniMap(node) {
  const echarts = window.echarts;
  const box = document.getElementById('miniMap');
  if (!echarts || !box) return;
  try {
    const [hunan, neighbors] = await Promise.all(
      ['hunan', 'neighbors'].map((k) =>
        (window.__XH_DATA && window.__XH_DATA[k]) ? Promise.resolve(window.__XH_DATA[k]) : fetch(`../data/${k}.json`).then((r) => r.json()))
    );
    echarts.registerMap('xiang-mini', { type: 'FeatureCollection', features: [...neighbors.features, ...hunan.features] });
    const chart = echarts.init(box);
    const pts = node.newBranch ? node.branchPath : [node.coord];
    chart.setOption({
      animation: !reducedMotion,
      geo: {
        map: 'xiang-mini',
        roam: false,
        silent: true,
        center: [111.3, 27.4],
        zoom: 2.7,
        aspectScale: 0.85,
        itemStyle: { areaColor: C.paperDark, borderColor: C.ink, borderWidth: 0.5 },
        regions: neighbors.features.map((f) => ({
          name: f.properties.name,
          itemStyle: { areaColor: 'rgba(244,237,225,0.6)', borderColor: '#BDB09C' },
        })),
      },
      series: [
        // 桑植：画出红二、六军团的示意出发路线
        ...(node.newBranch
          ? [{ type: 'lines', coordinateSystem: 'geo', data: [{ coords: pts }], polyline: true, lineStyle: { color: C.red, width: 2.5 } }]
          : []),
        {
          type: reducedMotion ? 'scatter' : 'effectScatter',
          coordinateSystem: 'geo',
          symbolSize: 14,
          rippleEffect: { brushType: 'stroke', scale: 3.2 },
          itemStyle: { color: C.red },
          // v1.1：站点名常驻显示、字号加大；做成纸色底偏移小签，离水波纹远一点，不压住红点
          label: {
            show: true,
            formatter: node.mapLabel,
            position: node.coord[0] > 112 ? 'left' : 'right',
            distance: 16,
            fontFamily: 'serif',
            fontWeight: 'bold',
            fontSize: 16,
            lineHeight: 20,
            color: C.ink,
            backgroundColor: 'rgba(244,237,225,.95)',
            borderColor: C.gold,
            borderWidth: 1,
            borderRadius: 2,
            padding: [3, 7],
          },
          emphasis: { disabled: true },
          data: [{ value: node.coord }],
        },
        {
          type: 'scatter',
          coordinateSystem: 'geo',
          symbolSize: 8,
          itemStyle: { color: C.paper, borderColor: C.inkSoft, borderWidth: 2 },
          label: { show: true, formatter: '衡阳', position: 'top', fontSize: 12, color: C.inkSoft, backgroundColor: 'rgba(244,237,225,.85)', padding: [1, 3] },
          data: [{ value: [112.57, 26.89] }], // 衡阳市区近似坐标（读者所在地，作参照）
        },
      ],
    });
    window.addEventListener('resize', () => chart.resize());
  } catch (err) {
    box.textContent = '地图加载失败';
    console.warn(err);
  }
}

function main() {
  const id = document.body.dataset.node;
  const idx = detailOrder.findIndex((n) => n.id === id);
  if (idx < 0) {
    document.getElementById('detail').textContent = '没有找到这个节点。';
    return;
  }
  render(detailOrder[idx], idx);
  miniMap(detailOrder[idx]);
}

main();
