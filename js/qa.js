/**
 * qa.js —— 薪火问答：AI 讲解员「小红」的界面（电报单样式）
 * ------------------------------------------------------------
 * 两种模式：
 *   ① 本地模式（默认）：读取 js/data/kb.json，用 qa-engine.js 的 TF-IDF 检索作答，完全离线。
 *   ② 大模型模式（可选）：用户在“设置”里填写兼容 OpenAI 接口的地址 / 密钥 / 模型名，
 *      仅保存在本机 localStorage。提问时先在本地检索出最相关的 3 条资料，
 *      连同“只能依据资料回答”的系统提示词一起发给模型（RAG：检索增强生成）。
 *      网络失败或超时 → 自动退回本地模式，演示不会卡住。
 *
 * 安全：所有用户输入、模型输出一律用 textContent 写入页面，从不拼接成 HTML，杜绝 XSS。
 */

import { buildIndex, search, answer } from './qa-engine.js';

const LS_KEY = 'xhxz.llm.v1';     // localStorage 键名：大模型设置
const MAX_Q = 60;                 // 问题最长字数
// 示例问法（左栏“点一下，直接发报”）：都取自 kb.json 里已有的问题，保证本地模式一定答得上
const PRESETS = ['“半条被子”是什么故事？', '陈树湘是谁？', '什么是通道转兵？', '长征精神对今天的大学生有什么意义？'];

/** 小红的系统提示词：限定只依据资料回答（防止模型“编历史”） */
const SYSTEM_PROMPT =
  '你是网页《薪火·湘征》（长征湖南段交互数字展）的AI讲解员“小红”，面向大学生，语气亲切、简洁。' +
  '你只能依据下面【资料】中的内容回答，不得编造资料以外的日期、人数、人名和引文；' +
  '如果资料不足以回答，就回答“这个问题小红还要再学习”，并建议用户换一个与长征湖南段相关的问题。' +
  '回答用简体中文，不超过150字，不要使用Markdown。';

/* ---------------- 工具函数 ---------------- */

const $ = (sel, root = document) => root.querySelector(sel);

/** 创建元素并设置 class 和纯文本（textContent 天然防 XSS） */
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 读取 / 保存大模型设置 */
function loadCfg() {
  try {
    return { enabled: false, base: '', key: '', model: '', ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') };
  } catch {
    return { enabled: false, base: '', key: '', model: '' };
  }
}
function saveCfg(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

/**
 * 调用兼容 OpenAI 的 /chat/completions 接口
 * @param {object} cfg       { base, key, model }
 * @param {string} question  用户问题
 * @param {Array}  context   本地检索出的 top-3 资料
 */
async function askLLM(cfg, question, context) {
  let url = cfg.base.trim().replace(/\/+$/, '');
  if (!/\/chat\/completions$/.test(url)) url += '/chat/completions';

  const material = context.map((r, i) => `${i + 1}. 问：${r.entry.q}\n答：${r.entry.a}`).join('\n');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000); // 20 秒超时
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key.trim()}` },
      body: JSON.stringify({
        model: cfg.model.trim(),
        temperature: 0.3,
        messages: [
          { role: 'system', content: `${SYSTEM_PROMPT}\n\n【资料】\n${material || '（无）'}` },
          { role: 'user', content: question },
        ],
      }),
    });
    if (!res.ok) throw new Error(`接口返回 ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('接口没有返回内容');
    return String(text).trim();
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- 界面 ---------------- */

/**
 * @param {{ reducedMotion: boolean }} options
 */
export async function initQA({ reducedMotion }) {
  const root = document.getElementById('qa');
  if (!root) return;
  const log = $('#qaLog', root);
  const form = $('#qaForm', root);
  const input = $('#qaInput', root);
  const sendBtn = $('#qaSend', root);
  const chips = $('#qaChips', root);
  const modeBadge = $('#qaMode', root);
  const dialog = $('#qaSettings', root); // <details> 折叠面板

  let index = null;
  let serial = 0;   // 电报流水号
  let busy = false;

  // ---- 1. 加载知识库 ----
  try {
    let kb = window.__XH_DATA && window.__XH_DATA.kb;   // 双击打开时用预载数据
    if (!kb) {
      const res = await fetch('js/data/kb.json');
      if (!res.ok) throw new Error(res.status);
      kb = await res.json();
    }
    index = buildIndex(kb.entries);
  } catch (err) {
    console.warn('知识库加载失败', err);
  }

  // ---- 2. 模式徽标 ----
  function refreshMode() {
    const cfg = loadCfg();
    const llm = cfg.enabled && cfg.base && cfg.key && cfg.model;
    modeBadge.textContent = llm ? `大模型模式 · ${cfg.model}` : '本地知识库模式 · 离线可用';
    modeBadge.classList.toggle('is-llm', Boolean(llm));
    return llm ? cfg : null;
  }
  refreshMode();

  // ---- 3. 电报单 ----
  /** 生成一张电报单；dir = 'out'（去电，用户）| 'in'（来电，小红） */
  function slip(dir) {
    serial += 1;
    const box = el('article', `slip slip-${dir}`);
    const head = el('header', 'slip-head');
    head.append(
      el('span', 'slip-type', dir === 'out' ? '去 电' : '来 电'),
      el('span', 'slip-no', `第 ${String(serial).padStart(4, '0')} 号`),
      el('span', 'slip-from', dir === 'out' ? '发报：同学' : '发报：小红'),
      el('span', 'slip-time', nowHM())
    );
    const body = el('div', 'slip-body');
    box.append(head, body);
    log.append(box);
    return { box, body };
  }

  function scrollLog() {
    log.scrollTo({ top: log.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  /** 打字机效果：逐字写入（减少动态效果时直接显示全文） */
  function typewrite(node, text) {
    return new Promise((resolve) => {
      if (reducedMotion) {
        node.textContent = text;
        resolve();
        return;
      }
      const chars = [...text];
      let i = 0;
      node.classList.add('is-typing');
      const tick = () => {
        i += 1;
        node.textContent = chars.slice(0, i).join('');
        if (i % 6 === 0) scrollLog();
        if (i < chars.length) setTimeout(tick, /[，。；：！？、]/.test(chars[i - 1]) ? 110 : 32);
        else {
          node.classList.remove('is-typing');
          resolve();
        }
      };
      tick();
    });
  }

  /** 推荐问题按钮（点一下就直接提问） */
  function suggestionRow(list) {
    const row = el('div', 'slip-suggest');
    list.forEach((q) => {
      const b = el('button', 'chip chip-sm', q);
      b.type = 'button';
      b.addEventListener('click', () => ask(q));
      row.append(b);
    });
    return row;
  }

  // ---- 4. 提问主流程 ----
  async function ask(raw) {
    const q = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_Q);
    if (!q || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';

    // v1.1 手机端：左栏在上、电报单在下，点了示例问题后把电报单滚进视野，否则看不到回答
    const tg = root.querySelector('.telegraph');
    if (tg && window.matchMedia('(max-width: 860px)').matches) {
      const r = tg.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.5 || r.bottom < 0) tg.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }

    slip('out').body.append(el('p', 'slip-text', q));
    const { body } = slip('in');
    const waiting = el('p', 'slip-wait', '滴滴——滴——  正在收报');
    body.append(waiting);
    scrollLog();

    let text = '';
    let meta = '';
    let suggestions = [];
    const llmCfg = refreshMode();

    if (!index) {
      text = '小红的知识库没有加载成功，请用本地服务器打开本站（见 README）。';
    } else if (llmCfg) {
      // 大模型模式：先检索 top-3 作为资料，再交给模型
      const ctx = search(index, q, 3);
      try {
        text = await askLLM(llmCfg, q, ctx);
        meta = `大模型作答 · 参考资料：${ctx.map((r) => r.entry.id).join('、') || '无'}`;
      } catch (err) {
        console.warn('大模型调用失败，退回本地模式：', err.message);
        const r = answer(index, q);
        text = r.answer;
        suggestions = r.suggestions;
        meta = `网络或接口不可用，已切换本地知识库作答（${err.message}）`;
      }
    } else {
      // 本地模式：稍等片刻再出字，模拟“收报”的仪式感
      await new Promise((r) => setTimeout(r, reducedMotion ? 0 : 650));
      const r = answer(index, q);
      text = r.answer;
      suggestions = r.suggestions;
      meta = r.hit
        ? `本地知识库 · 分类「${r.entry.cat}」 · 匹配度 ${r.score.toFixed(2)}`
        : r.reason === 'low-coverage'
          ? `本地知识库 · 问题里的大部分词知识库还不认识（覆盖率 ${Math.round(r.coverage * 100)}%）`
          : `本地知识库 · 未找到足够相近的资料（最高匹配度 ${r.score.toFixed(2)}）`;
    }

    waiting.remove();
    const p = el('p', 'slip-text');
    body.append(p);
    await typewrite(p, text);
    if (meta) body.append(el('p', 'slip-meta', meta));
    if (suggestions.length) body.append(suggestionRow(suggestions));
    // v2.2 打完盖一枚“已译”章（借鉴上观新闻《摩斯电码待破译》等电报类 H5）
    const sign = el('p', 'slip-sign', '—— 薪火电报局 · 小红');
    sign.prepend(el('span', 'slip-stamp', '已译'));
    body.append(sign);
    scrollLog();

    busy = false;
    sendBtn.disabled = false;
  }

  // 预设问题（现场演示用）
  PRESETS.forEach((q) => {
    const b = el('button', 'chip', q);
    b.type = 'button';
    b.addEventListener('click', () => ask(q));
    chips.append(b);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });

  // 开场白
  (() => {
    const { body } = slip('in');
    body.append(
      el('p', 'slip-text', '同学你好，我是AI讲解员“小红”。关于长征湖南段、汝城沙洲、湘江战役、通道转兵、桑植出发和长征精神，都可以发报问我。'),
      el('p', 'slip-sign', '—— 薪火电报局 · 小红')
    );
  })();

  // ---- 5. 设置面板（大模型模式）：v1.1 由弹窗改为左栏的 <details> 折叠面板 ----
  const f = {
    enabled: $('#llmEnabled', dialog),
    base: $('#llmBase', dialog),
    key: $('#llmKey', dialog),
    model: $('#llmModel', dialog),
    tip: $('#llmTip', dialog),
  };
  // 展开面板时，把已保存的设置填回表单
  dialog.addEventListener('toggle', () => {
    if (!dialog.open) return;
    const cfg = loadCfg();
    f.enabled.checked = cfg.enabled;
    f.base.value = cfg.base;
    f.key.value = cfg.key;
    f.model.value = cfg.model;
    f.tip.textContent = '';
  });
  $('#llmCancel', dialog).addEventListener('click', () => { dialog.open = false; });
  $('#llmClear', dialog).addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
    f.enabled.checked = false;
    f.base.value = f.key.value = f.model.value = '';
    f.tip.textContent = '已清除，本机不再保存任何密钥。';
    refreshMode();
  });
  $('#llmForm', dialog).addEventListener('submit', (e) => {
    e.preventDefault();
    const cfg = {
      enabled: f.enabled.checked,
      base: f.base.value.trim(),
      key: f.key.value.trim(),
      model: f.model.value.trim(),
    };
    // 开启时做基本校验：地址必须是 http(s) 开头
    if (cfg.enabled && (!/^https?:\/\/\S+$/i.test(cfg.base) || !cfg.key || !cfg.model)) {
      f.tip.textContent = '开启大模型模式需要填写完整：以 http(s):// 开头的接口地址、密钥和模型名。';
      return;
    }
    saveCfg(cfg);
    refreshMode();
    dialog.open = false;
  });
}
