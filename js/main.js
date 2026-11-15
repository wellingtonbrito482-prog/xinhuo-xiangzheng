/**
 * main.js —— 入口文件
 * ------------------------------------------------------------
 * 职责：
 *   1. 检查第三方库是否加载成功（全部来自本地 vendor/，离线可用）
 *   2. 读取用户的“减少动态效果”系统设置
 *   3. 加载地图数据（data/*.json）
 *   4. 依次初始化：导航 → 首页 hero → 湘征地图（+自动播放）→ 薪火问答 → 青春接力
 */

import { initHero } from './hero.js';
import { initStorymap } from './storymap.js';
import { initAutoplay } from './autoplay.js';
import { initQA } from './qa.js';
import { initRelay } from './relay.js';

const { gsap, ScrollTrigger, echarts, scrollama } = window;

/** 用户在系统里开启了“减少动态效果”时为 true（晕动症友好） */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 读取 JSON 文件（需要通过 http 服务器访问页面，见 README） */
async function loadJSON(url) {
  // 双击打开（file://）时浏览器禁止 fetch，本地数据已由 data/*.js 预先挂到 window.__XH_DATA
  const key = url.split('/').pop().replace('.json', '');
  const pre = window.__XH_DATA && window.__XH_DATA[key];
  if (pre) return pre;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载失败：${url}（${res.status}）`);
  return res.json();
}

/** 导航：滚动后报头出现双细线；当前所在栏目的链接高亮 */
function initNav() {
  const topbar = document.getElementById('topbar');
  const links = [...document.querySelectorAll('.nav a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  // v2：顶栏下方的元素若在“夜行”区块里，顶栏切到夜色；引信进度条跟随整页滚动进度
  const nightSections = [...document.querySelectorAll('.is-night')];
  const fuse = document.getElementById('fuseBar');
  let ticking = false;
  const update = () => {
    ticking = false;
    topbar.classList.toggle('is-scrolled', window.scrollY > 10);
    const probe = topbar.offsetHeight + 1;
    const onNight = nightSections.some((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= probe && r.bottom > probe;
    });
    topbar.classList.toggle('on-night', onNight);
    if (fuse) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      fuse.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    }
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener('resize', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // IntersectionObserver：栏目进入屏幕中部时，高亮对应导航
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => io.observe(s));
}

async function main() {
  if (!gsap || !ScrollTrigger || !echarts || !scrollama) {
    console.warn('第三方库未完整加载，请检查 vendor/ 目录');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  initNav();
  initHero({ reducedMotion });

  // 问答、接力不依赖地图，先并行初始化（某一模块出错不影响其它模块）
  initQA({ reducedMotion }).catch((err) => console.warn('问答模块初始化失败', err));
  initRelay({ reducedMotion }).catch((err) => console.warn('接力模块初始化失败', err));

  try {
    const [hunanGeo, neighborsGeo] = await Promise.all([
      loadJSON('data/hunan.json'),
      loadJSON('data/neighbors.json'),
    ]);
    const story = initStorymap({ hunanGeo, neighborsGeo, reducedMotion });
    initAutoplay({ ...story, reducedMotion });
  } catch (err) {
    // 地图数据加载失败时给出页面内提示，而不是一片空白
    document.getElementById('mapCaption').textContent = '地图数据加载失败，请用本地服务器打开（见 README）';
    console.warn(err);
  }

  // 地图生成后页面高度可能变化，让 ScrollTrigger 重新计算触发位置
  ScrollTrigger.refresh();

  // 从详情页返回时带着 #step-xxx：卡片是脚本生成的，浏览器自带的锚点跳转那时还找不到它，这里补一次
  if (location.hash.startsWith('#step-')) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
      window.scrollTo({ top, behavior: 'auto' });
    }
  }
}

main();
