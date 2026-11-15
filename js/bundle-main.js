(() => {
  // js/hero.js
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var STOPS = [
    { name: "\u745E\u91D1", at: 0 },
    { name: "\u6C5D\u57CE", at: 0.18 },
    { name: "\u6E58\u6C5F", at: 0.36 },
    { name: "\u901A\u9053", at: 0.55 },
    { name: "\u9075\u4E49", at: 0.76 },
    { name: "\u4F1A\u5B81", at: 1 }
  ];
  var SVG_NS = "http://www.w3.org/2000/svg";
  function createEmbers(canvas) {
    const ctx = canvas.getContext("2d");
    const sparks = [];
    let W = 0, H = 0, dpr = 1, running = false, raf = 0;
    let headX = -1, headY = -1, burst = 0;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(x, y, fromHead) {
      sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * (fromHead ? 1.6 : 0.4),
        vy: -(fromHead ? 0.6 + Math.random() * 1.4 : 0.25 + Math.random() * 0.55),
        life: 1,
        decay: fromHead ? 0.012 + Math.random() * 0.012 : 3e-3 + Math.random() * 4e-3,
        r: fromHead ? 1 + Math.random() * 1.8 : 0.6 + Math.random() * 1.4,
        wob: Math.random() * Math.PI * 2
      });
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      if (sparks.length < 70 + W / 14 && Math.random() < 0.5) spawn(Math.random() * W, H + 6, false);
      const n = Math.min(6, 1 + burst);
      if (headX >= 0) {
        for (let i = 0; i < n; i++) if (Math.random() < 0.6) spawn(headX, headY, true);
      }
      burst *= 0.9;
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.wob += 0.04;
        s.x += s.vx + Math.sin(s.wob) * 0.25;
        s.y += s.vy;
        s.life -= s.decay;
        if (s.life <= 0 || s.y < -10) {
          sparks.splice(i, 1);
          continue;
        }
        const a = s.life;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        g.addColorStop(0, `rgba(255,214,150,${a})`);
        g.addColorStop(0.35, `rgba(240,120,60,${a * 0.6})`);
        g.addColorStop(1, "rgba(226,87,43,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
    resize();
    window.addEventListener("resize", resize);
    new IntersectionObserver(([e]) => e.isIntersecting ? start() : stop()).observe(canvas);
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
    return {
      /** 线头在画布中的位置（像素），以及这一帧的滚动速度（决定喷多少） */
      setHead(x, y, speed) {
        headX = x;
        headY = y;
        burst = Math.max(burst, speed);
      }
    };
  }
  function typeCode(el3, reducedMotion2) {
    if (!el3) return;
    const full = el3.textContent;
    if (reducedMotion2) return;
    el3.textContent = "";
    el3.classList.add("is-typing");
    let i = 0;
    const tick = () => {
      el3.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(tick, 70 + Math.random() * 90);
    };
    setTimeout(tick, 900);
  }
  function initHeroVisual() {
    const box = document.getElementById("heroVisual");
    const src = box && box.dataset.src && box.dataset.src.trim();
    if (!src) {
      if (box) box.remove();
      return;
    }
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.onload = () => {
      box.append(img);
      box.classList.add("is-loaded");
    };
    img.onerror = () => box.remove();
    img.src = src;
  }
  function initHero({ reducedMotion: reducedMotion2 }) {
    const path = document.getElementById("marchPath");
    const head = document.getElementById("marchHead");
    const labelLayer = document.getElementById("marchLabels");
    if (!path || !head || !labelLayer) return;
    initHeroVisual();
    typeCode(document.getElementById("heroCode"), reducedMotion2);
    const canvas = document.getElementById("embers");
    const embers = !reducedMotion2 && canvas ? createEmbers(canvas) : null;
    const svg = path.ownerSVGElement;
    let lastProgress = 0;
    const total = path.getTotalLength();
    const labels = STOPS.map((stop) => {
      const p = path.getPointAtLength(total * stop.at);
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", "march-label-dot");
      dot.setAttribute("cx", p.x);
      dot.setAttribute("cy", p.y);
      dot.setAttribute("r", 6);
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("class", "march-label");
      text.setAttribute("x", p.x);
      text.setAttribute("y", p.y > 110 ? p.y + 40 : p.y - 20);
      text.setAttribute("text-anchor", stop.at === 0 ? "end" : stop.at === 1 ? "start" : "middle");
      text.textContent = stop.name;
      labelLayer.append(dot, text);
      return { ...stop, dot, text, shown: false };
    });
    path.style.strokeDasharray = `${total}`;
    path.style.strokeDashoffset = `${total}`;
    function render(progress) {
      path.style.strokeDashoffset = `${total * (1 - progress)}`;
      const p = path.getPointAtLength(total * progress);
      head.setAttribute("cx", p.x);
      head.setAttribute("cy", p.y);
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
        const shouldShow = progress >= label.at - 1e-3;
        if (shouldShow !== label.shown) {
          label.shown = shouldShow;
          if (reducedMotion2) {
            gsap.set([label.dot, label.text], { opacity: shouldShow ? 1 : 0 });
          } else {
            gsap.to([label.dot, label.text], { opacity: shouldShow ? 1 : 0, duration: 0.35, overwrite: true });
          }
        }
      });
    }
    if (reducedMotion2 || !gsap || !ScrollTrigger) {
      render(1);
      return;
    }
    const state = { progress: 0.03 };
    render(state.progress);
    gsap.to(state, {
      progress: 1,
      ease: "none",
      onUpdate: () => render(state.progress),
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6
        // 0.6 秒的“跟随缓冲”，让画线更顺滑
      }
    });
    gsap.from(".hero-copy > *", { y: 8, opacity: 0.6, duration: 0.4, stagger: 0.06, ease: "power2.out" });
    gsap.to(".scroll-hint", {
      opacity: 0,
      scrollTrigger: { trigger: "#hero", start: "top top", end: "15% top", scrub: true }
    });
    gsap.to(".hero-copy", {
      y: -40,
      opacity: 0.25,
      ease: "none",
      scrollTrigger: { trigger: "#hero", start: "85% bottom", end: "bottom bottom", scrub: true }
    });
  }

  // js/data/nodes.js
  var origin = {
    name: "\u745E\u91D1",
    coord: [116.03, 25.89]
    // 瑞金市区近似坐标（示意）
  };
  var HUNAN_VIEW = { center: [111.6, 27.3], zoom: 2.5 };
  var chapters = [
    {
      id: "prologue",
      kicker: "\u5E8F\u7AE0",
      date: "1934\u5E7410\u6708",
      title: "\u7A81\u56F4\u897F\u8FDB\uFF0C\u7EA2\u519B\u5165\u6E58",
      place: "\u6C5F\u897F\u745E\u91D1 \u2192 \u6E58\u7CA4\u8FB9",
      coord: null,
      view: HUNAN_VIEW,
      // 来源：S1、S2、S3、S20
      story: "1934\u5E7410\u6708\uFF0C\u4E2D\u5171\u4E2D\u592E\u3001\u4E2D\u9769\u519B\u59D4\u7387\u4E2D\u592E\u7EA2\u519B\u4E3B\u529B8.6\u4E07\u4F59\u4EBA\u4ECE\u6C5F\u897F\u745E\u91D1\u3001\u4E8E\u90FD\u7B49\u5730\u51FA\u53D1\uFF0C\u5F00\u59CB\u6218\u7565\u8F6C\u79FB\u300210\u6708\u4E0B\u65EC\u8D77\uFF0C\u7EA2\u519B\u63A5\u8FDE\u7A81\u7834\u56FD\u6C11\u515A\u519B\u8BBE\u4E0B\u7684\u5C01\u9501\u7EBF\uFF0C11\u6708\u4E0A\u65EC\u5728\u6E58\u7CA4\u8FB9\u6C5D\u57CE\u3001\u57CE\u53E3\u4E00\u7EBF\u7A81\u7834\u7B2C\u4E8C\u9053\u5C01\u9501\u7EBF\uFF0C\u8FDB\u5165\u6E56\u5357\u3002\u4E09\u6E58\u5927\u5730\uFF0C\u4ECE\u6B64\u5199\u8FDB\u4E86\u8FD9\u90E8\u53F2\u8BD7\u2014\u2014\u5B83\u662F\u4E2D\u592E\u7EA2\u519B\u957F\u5F81\u9014\u7ECF\u7684\u91CD\u8981\u7701\u4EFD\uFF0C\u4E5F\u662F\u7EA2\u4E8C\u3001\u516D\u519B\u56E2\u957F\u5F81\u7684\u51FA\u53D1\u5730\u3002",
      quote: {
        text: "\u957F\u5F81\u662F\u5BA3\u8A00\u4E66\uFF0C\u957F\u5F81\u662F\u5BA3\u4F20\u961F\uFF0C\u957F\u5F81\u662F\u64AD\u79CD\u673A\u3002",
        source: "\u6BDB\u6CFD\u4E1C\u300A\u8BBA\u53CD\u5BF9\u65E5\u672C\u5E1D\u56FD\u4E3B\u4E49\u7684\u7B56\u7565\u300B\uFF0C1935\u5E7412\u670827\u65E5"
      },
      inRoute: false
    },
    {
      id: "rucheng",
      mapLabel: "\u6C5D\u57CE\u6C99\u6D32",
      kicker: "\u7B2C\u4E00\u7AD9",
      date: "1934\u5E7411\u6708\u4E0A\u65EC",
      title: "\u6C5D\u57CE\u6C99\u6D32 \xB7 \u534A\u6761\u88AB\u5B50",
      place: "\u6E56\u5357\u6C5D\u57CE\u53BF\u6587\u660E\u7476\u65CF\u4E61\u6C99\u6D32\u7476\u65CF\u6751",
      // 示意坐标：取文明瑶族乡（维基百科 25.538N, 113.347E）；沙洲村在该乡，距汝城县城约37千米（S7）
      coord: [113.35, 25.55],
      view: { center: [112.6, 26.2], zoom: 3.6 },
      // 来源：S4、S5
      story: "1934\u5E7411\u6708\u4E0A\u65EC\uFF0C\u4E2D\u592E\u7EA2\u519B\u7A81\u7834\u7B2C\u4E8C\u9053\u5C01\u9501\u7EBF\u540E\u5728\u6C5D\u57CE\u6587\u660E\u4E00\u5E26\u4F11\u6574\uFF0C\u7EA2\u519B\u536B\u751F\u90E8\u3001\u5E72\u90E8\u56E2\u9A7B\u6C99\u6D32\u6751\u3002\u4E09\u4F4D\u5973\u7EA2\u519B\u501F\u5BBF\u5728\u6751\u6C11\u5F90\u89E3\u79C0\u5BB6\uFF0C\u89C1\u5979\u5BB6\u53EA\u6709\u4E00\u5757\u70C2\u68C9\u7D6E\u548C\u4E00\u4EF6\u7834\u84D1\u8863\uFF0C\u4E34\u8D70\u65F6\u628A\u4EC5\u6709\u7684\u4E00\u6761\u884C\u519B\u88AB\u526A\u4E0B\u4E00\u534A\u7559\u7ED9\u4E86\u5979\u3002\u534A\u6761\u88AB\u5B50\uFF0C\u6E29\u6696\u4E86\u4E00\u6237\u4EBA\u5BB6\uFF0C\u4E5F\u8BA9\u767E\u59D3\u770B\u6E05\u4E86\u8FD9\u652F\u961F\u4F0D\u662F\u8C01\u3001\u4E3A\u4E86\u8C01\u3002",
      quote: {
        text: "\u4EC0\u4E48\u662F\u5171\u4EA7\u515A\uFF1F\u5171\u4EA7\u515A\u5C31\u662F\u81EA\u5DF1\u6709\u4E00\u6761\u88AB\u5B50\uFF0C\u4E5F\u8981\u526A\u4E0B\u534A\u6761\u7ED9\u8001\u767E\u59D3\u7684\u4EBA\u3002",
        source: "\u5F90\u89E3\u79C0\u8001\u4EBA\u8BED\uFF0C\u4E60\u8FD1\u5E73\u5728\u7EAA\u5FF5\u7EA2\u519B\u957F\u5F81\u80DC\u522980\u5468\u5E74\u5927\u4F1A\u4E0A\u7684\u8BB2\u8BDD\u5F15\u8FF0\uFF082016\u5E7410\u670821\u65E5\uFF09"
      },
      inRoute: true
    },
    {
      id: "xiangjiang",
      mapLabel: "\u6E58\u6C5F\u6218\u5F79",
      kicker: "\u7B2C\u4E8C\u7AD9",
      date: "1934\u5E7411\u670825\u65E5\u201412\u67081\u65E5",
      title: "\u8840\u6218\u6E58\u6C5F",
      place: "\u5E7F\u897F\u5168\u5DDE\u3001\u5174\u5B89\u3001\u704C\u9633\u4E00\u5E26\uFF08\u6E58\u6842\u4EA4\u754C\uFF09",
      // 示意坐标：全州县才湾镇（红军长征湘江战役纪念园，脚山铺阻击战旧址），facts.md 第三节
      coord: [110.95, 25.92],
      view: { center: [111.5, 26.3], zoom: 3.6 },
      // 来源：S11、S12、S13、S14
      story: "1934\u5E7411\u670825\u65E5\uFF0C\u4E2D\u9769\u519B\u59D4\u4E0B\u4EE4\u5F3A\u6E21\u6E58\u6C5F\uFF0C\u7A81\u7834\u56FD\u6C11\u515A\u519B\u7B2C\u56DB\u9053\u5C01\u9501\u7EBF\u300211\u670827\u65E5\u81F312\u67081\u65E5\uFF0C\u4E2D\u592E\u7EA2\u519B\u5728\u5E7F\u897F\u5168\u5DDE\u3001\u5174\u5B89\u3001\u704C\u9633\u4E00\u5E26\u82E6\u6218\u4E94\u663C\u591C\uFF0C\u4ED8\u51FA\u6781\u5927\u727A\u7272\uFF0C\u7EC8\u4E8E\u6E21\u8FC7\u6E58\u6C5F\u3002\u6E58\u6C5F\u6218\u5F79\u540E\uFF0C\u4E2D\u592E\u7EA2\u519B\u7531\u51FA\u53D1\u65F6\u76848.6\u4E07\u4F59\u4EBA\u9510\u51CF\u81F33\u4E07\u4F59\u4EBA\u3002\u8840\u67D3\u7684\u6E58\u6C5F\uFF0C\u8BA9\u8D8A\u6765\u8D8A\u591A\u7684\u4EBA\u5F00\u59CB\u601D\u8003\uFF1A\u7EA2\u519B\u7684\u8DEF\uFF0C\u8BE5\u600E\u4E48\u8D70\uFF1F",
      note: "\u6CE8\uFF1A\u6E58\u6C5F\u6218\u5F79\u4E3B\u6218\u573A\u4F4D\u4E8E\u6E58\u6C5F\u4E0A\u6E38\u5E7F\u897F\u5168\u5DDE\u3001\u5174\u5B89\u3001\u704C\u9633\u4E09\u53BF\uFF0C\u7D27\u90BB\u6E56\u5357\u6C38\u5DDE\uFF0C\u4E0E\u6E56\u5357\u6BB5\u957F\u5F81\u7D27\u5BC6\u76F8\u8FDE\u3002",
      quote: {
        text: "\u4E09\u5E74\u4E0D\u996E\u6E58\u6C5F\u6C34\uFF0C\u5341\u5E74\u4E0D\u98DF\u6E58\u6C5F\u9C7C\u3002",
        source: "\u5E7F\u897F\u5174\u5B89\u3001\u754C\u9996\u4E00\u5E26\u6C11\u8C23"
      },
      inRoute: true
    },
    {
      id: "tongdao",
      mapLabel: "\u901A\u9053\u8F6C\u5175",
      kicker: "\u7B2C\u4E09\u7AD9",
      date: "1934\u5E7412\u670812\u65E5",
      title: "\u901A\u9053\u8F6C\u5175",
      place: "\u6E56\u5357\u901A\u9053\u4F97\u65CF\u81EA\u6CBB\u53BF",
      // 示意坐标：县溪镇（通道转兵纪念馆、恭城书院所在的老县城），facts.md 第三节
      coord: [109.62, 26.32],
      view: { center: [110.3, 26.5], zoom: 3.6 },
      // 来源：S1、S18、S20
      story: "1934\u5E7412\u670812\u65E5\uFF0C\u4E2D\u5171\u4E2D\u592E\u8D1F\u8D23\u4EBA\u5728\u901A\u9053\u53EC\u5F00\u7D27\u6025\u4F1A\u8BAE\u3002\u6B64\u65F6\uFF0C\u56FD\u6C11\u515A\u519B\u5DF2\u5728\u6E58\u897F\u5E03\u4E0B\u4E94\u516D\u500D\u4E8E\u7EA2\u519B\u7684\u91CD\u5175\uFF0C\u7B49\u5F85\u7EA2\u519B\u5317\u4E0A\u3002\u6BDB\u6CFD\u4E1C\u4E3B\u5F20\u653E\u5F03\u5317\u4E0A\u6E58\u897F\uFF0C\u8F6C\u5411\u654C\u4EBA\u529B\u91CF\u8584\u5F31\u7684\u8D35\u5DDE\uFF0C\u5F97\u5230\u591A\u6570\u4E0E\u4F1A\u8005\u8D5E\u540C\u3002\u5F53\u665A\uFF0C\u4E2D\u9769\u519B\u59D4\u53D1\u51FA\u201C\u4E07\u4E07\u706B\u6025\u201D\u7535\u4EE4\uFF0C\u7EA2\u519B\u897F\u8FDB\u8D35\u5DDE\u3002\u8FD9\u4E00\u8F6C\uFF0C\u4F7F\u7EA2\u519B\u8DF3\u51FA\u4E86\u654C\u4EBA\u9884\u8BBE\u7684\u5305\u56F4\u5708\u3002",
      quote: {
        text: "\u9274\u4E8E\u76EE\u524D\u6240\u5F62\u6210\u4E4B\u60C5\u51B5\uFF0C\u653F\u6CBB\u5C40\u8BA4\u4E3A\u8FC7\u53BB\u5728\u6E58\u897F\u521B\u7ACB\u65B0\u7684\u82CF\u7EF4\u57C3\u6839\u636E\u5730\u7684\u51B3\u5B9A\u5728\u76EE\u524D\u5DF2\u7ECF\u662F\u4E0D\u53EF\u80FD\u7684\uFF0C\u5E76\u4E14\u662F\u4E0D\u9002\u5B9C\u7684\u3002",
        source: "\u300A\u4E2D\u5171\u4E2D\u592E\u653F\u6CBB\u5C40\u5173\u4E8E\u6218\u7565\u65B9\u9488\u4E4B\u51B3\u5B9A\u300B\uFF08\u9ECE\u5E73\u4F1A\u8BAE\uFF0C1934\u5E7412\u670818\u65E5\uFF09"
      },
      // 岔路口互动：让观众站在 1934 年的路口亲自做一次选择（来源：S1、S18）
      choice: {
        prompt: "\u7AD9\u57281934\u5E74\u7684\u5C94\u8DEF\u53E3\uFF0C\u5982\u679C\u662F\u4F60\uFF0C\u5F80\u54EA\u8D70\uFF1F",
        options: [
          {
            label: "\u5317\u4E0A\u6E58\u897F",
            correct: false,
            result: "\u524D\u65B9\u6709\u91CD\u5175\u5E03\u9632\u3002\u56FD\u6C11\u515A\u519B\u5DF2\u5728\u6E58\u897F\u4E00\u7EBF\u96C6\u7ED3\u91CD\u5175\u3001\u6784\u7B51\u5DE5\u4E8B\uFF0C\u5F20\u7F51\u4EE5\u5F85\u2014\u2014\u5317\u4E0A\uFF0C\u6B63\u4E2D\u654C\u4EBA\u4E0B\u6000\u3002"
          },
          {
            label: "\u897F\u8FDB\u8D35\u5DDE",
            correct: true,
            result: "\u8F6C\u5175\u8D35\u5DDE\uFF01\u8D35\u5DDE\u654C\u519B\u529B\u91CF\u8584\u5F31\uFF0C\u7EA2\u519B\u7531\u6B64\u6446\u8131\u88AB\u52A8\u300212\u670815\u65E5\u7EA2\u519B\u653B\u5360\u9ECE\u5E73\uFF0C18\u65E5\u9ECE\u5E73\u4F1A\u8BAE\u6B63\u5F0F\u653E\u5F03\u5317\u4E0A\u6E58\u897F\u7684\u8BA1\u5212\uFF0C\u4E3A\u9075\u4E49\u4F1A\u8BAE\u521B\u9020\u4E86\u6761\u4EF6\u3002"
          }
        ]
      },
      inRoute: true
    },
    {
      id: "sangzhi",
      mapLabel: "\u6851\u690D\u5218\u5BB6\u576A",
      kicker: "\u7B2C\u56DB\u7AD9",
      date: "1935\u5E7411\u670819\u65E5",
      title: "\u6851\u690D\u51FA\u53D1 \xB7 \u85AA\u706B\u63A5\u7EED",
      place: "\u6E56\u5357\u6851\u690D\u53BF\u5218\u5BB6\u576A",
      // 示意坐标：刘家坪白族乡（约，第三方 WGS84 数据），facts.md 第三节
      coord: [110.23, 29.46],
      view: { center: [110.4, 28.4], zoom: 3.4 },
      // 来源：S26、S28
      story: "\u4E2D\u592E\u7EA2\u519B\u897F\u53BB\u8FD1\u4E00\u5E74\u540E\uFF0C1935\u5E7411\u670819\u65E5\uFF0C\u8D3A\u9F99\u3001\u4EFB\u5F3C\u65F6\u7B49\u7387\u9886\u7EA2\u4E8C\u3001\u516D\u519B\u56E21.7\u4E07\u4F59\u4EBA\uFF0C\u5728\u6851\u690D\u5218\u5BB6\u576A\u5E72\u7530\u575D\u3001\u745E\u5854\u94FA\u67AB\u6811\u5854\u8A93\u5E08\uFF0C\u5F53\u665A\u51FA\u53D1\uFF0C\u8E0F\u4E0A\u957F\u5F81\u4E4B\u8DEF\u3002\u4E00\u652F\u961F\u4F0D\u8D70\u8FDC\u4E86\uFF0C\u53E6\u4E00\u652F\u961F\u4F0D\u53C8\u51FA\u53D1\u4E86\u2014\u2014\u5728\u4E09\u6E58\u5927\u5730\u4E0A\uFF0C\u9769\u547D\u7684\u85AA\u706B\u4ECE\u672A\u7184\u706D\uFF0C\u4E00\u68D2\u63A5\u7740\u4E00\u68D2\uFF0C\u4F20\u5411\u8FDC\u65B9\u3002",
      quote: {
        text: "\u9A6C\u6851\u6811\u513F\u642D\u706F\u53F0\uFF0C\u5199\u5C01\u4E66\u4FE1\u4E0E\u59D0\u5E26\u3002",
        source: "\u6851\u690D\u6C11\u6B4C\u300A\u9A6C\u6851\u6811\u513F\u642D\u706F\u53F0\u300B\uFF081928\u5E74\u7EA2\u519B\u5E08\u957F\u8D3A\u9526\u658B\u6539\u8BCD\uFF09"
      },
      // 红二、六军团是另一路出发，行军线从这里单独起笔（不与通道相连）
      newBranch: true,
      // 红二、六军团长征初期的示意路线：桑植 → 湘中（溆浦一带）→ 黔东（入黔）；
      // 与史料“突破澧水、沅水封锁线，直插湘中新化、溆浦，再西折入黔东”一致（S26），坐标为示意
      branchPath: [
        [110.23, 29.46],
        [110.59, 27.91],
        [109.17, 27.36]
      ],
      inRoute: true
    },
    {
      id: "epilogue",
      kicker: "\u5C3E\u58F0",
      date: "1936\u5E7410\u6708 \u2192 2026\u5E74",
      title: "\u4E09\u519B\u4F1A\u5E08\uFF0C\u85AA\u706B\u76F8\u4F20",
      place: "\u7518\u8083\u4F1A\u5B81 \xB7 \u5B81\u590F\u5C06\u53F0\u5821 \u2192 \u4ECA\u5929\u7684\u6211\u4EEC",
      coord: null,
      view: HUNAN_VIEW,
      // 来源：S29、S34
      story: "1936\u5E7410\u6708\uFF0C\u7EA2\u4E00\u3001\u56DB\u65B9\u9762\u519B\u5728\u7518\u8083\u4F1A\u5B81\u4F1A\u5E08\uFF0810\u67089\u65E5\uFF09\uFF0C\u7EA2\u4E00\u3001\u4E8C\u65B9\u9762\u519B\u5728\u5C06\u53F0\u5821\uFF08\u4ECA\u5C5E\u5B81\u590F\u897F\u5409\uFF09\u4F1A\u5E08\uFF0810\u670822\u65E5\uFF09\uFF0C\u957F\u5F81\u80DC\u5229\u7ED3\u675F\u3002\u4E5D\u5341\u5E74\u8FC7\u53BB\u4E86\uFF0C\u5F53\u5E74\u8D70\u8FC7\u6E56\u5357\u7684\u7EA2\u519B\u6218\u58EB\uFF0C\u8BB8\u591A\u4EBA\u548C\u6211\u4EEC\u4E00\u6837\u6B63\u503C\u9752\u6625\u3002\u4ECA\u5929\uFF0C\u6211\u4EEC\u7528\u4EE3\u7801\u5199\u4E0B\u8FD9\u6BB5\u5F81\u9014\uFF0C\u628A\u8FD9\u675F\u706B\u79CD\uFF0C\u4EA4\u5230\u66F4\u591A\u540C\u9F84\u4EBA\u624B\u91CC\u3002",
      quote: {
        text: "\u7EA2\u519B\u4E0D\u6015\u8FDC\u5F81\u96BE\uFF0C\u4E07\u6C34\u5343\u5C71\u53EA\u7B49\u95F2\u3002",
        source: "\u6BDB\u6CFD\u4E1C\u300A\u4E03\u5F8B\xB7\u957F\u5F81\u300B"
      },
      cta: { label: "\u63A5\u8FC7\u85AA\u706B \xB7 \u53BB\u9752\u6625\u63A5\u529B", href: "#relay" },
      inRoute: false
    }
  ];
  var details = {
    rucheng: {
      page: "rucheng.html",
      history: "1934\u5E7411\u6708\u4E0A\u65EC\uFF0C\u4E2D\u592E\u7EA2\u519B\u7A81\u7834\u7B2C\u4E8C\u9053\u5C01\u9501\u7EBF\u540E\uFF0C\u5230\u6C5D\u57CE\u53BF\u6587\u660E\u53F8\uFF08\u4ECA\u6587\u660E\u7476\u65CF\u4E61\uFF09\u4F11\u6574\uFF0C\u536B\u751F\u90E8\u3001\u5E72\u90E8\u56E2\u9A7B\u6C99\u6D32\u6751\u3002\u4E09\u4F4D\u5973\u7EA2\u519B\u501F\u5BBF\u6751\u6C11\u5F90\u89E3\u79C0\u5BB6\uFF0C\u770B\u5230\u5E8A\u4E0A\u53EA\u6709\u4E00\u5757\u70C2\u68C9\u7D6E\u548C\u4E00\u4EF6\u7834\u84D1\u8863\uFF0C\u5C31\u6253\u5F00\u884C\u519B\u88AB\u548C\u5979\u6324\u5728\u4E00\u5F20\u5E8A\u4E0A\u3002\u4E34\u8D70\u65F6\uFF0C\u5973\u7EA2\u519B\u8981\u628A\u88AB\u5B50\u7559\u4E0B\uFF0C\u5F90\u89E3\u79C0\u4E0D\u80AF\u6536\uFF0C\u5979\u4EEC\u4FBF\u628A\u88AB\u5B50\u526A\u6210\u4E24\u534A\uFF0C\u7559\u4E0B\u534A\u6761\uFF0C\u5E76\u8BF4\uFF1A\u7B49\u9769\u547D\u6210\u529F\u4EE5\u540E\uFF0C\u4E00\u5B9A\u9001\u4F60\u4E00\u6761\u5B8C\u6574\u7684\u65B0\u68C9\u88AB\u30021984\u5E7411\u6708\uFF0C\u300A\u7ECF\u6D4E\u65E5\u62A5\u300B\u8BB0\u8005\u7F57\u5F00\u5BCC\u91CD\u8D70\u957F\u5F81\u8DEF\u65F6\u91C7\u8BBF\u5230\u8FD9\u6BB5\u5F80\u4E8B\uFF0C\u62A5\u9053\u520A\u53D1\u540E\uFF0C\u9093\u9896\u8D85\u7B49\u8001\u7EA2\u519B\u53D1\u8D77\u5BFB\u627E\u4E09\u4F4D\u5973\u7EA2\u519B\uFF0C\u53EF\u60DC\u59CB\u7EC8\u6CA1\u6709\u627E\u5230\u30022016\u5E7410\u6708\uFF0C\u4E60\u8FD1\u5E73\u603B\u4E66\u8BB0\u5728\u7EAA\u5FF5\u7EA2\u519B\u957F\u5F81\u80DC\u522980\u5468\u5E74\u5927\u4F1A\u4E0A\u8BB2\u8FF0\u4E86\u8FD9\u4E2A\u6545\u4E8B\u3002",
      timeline: [
        { time: "1934\u5E7411\u6708\u4E0A\u65EC", text: "\u4E2D\u592E\u7EA2\u519B\u7A81\u7834\u7B2C\u4E8C\u9053\u5C01\u9501\u7EBF\u540E\u5728\u6C5D\u57CE\u6587\u660E\u4E00\u5E26\u4F11\u6574\uFF0C\u4E09\u4F4D\u5973\u7EA2\u519B\u501F\u5BBF\u6C99\u6D32\u6751\u5F90\u89E3\u79C0\u5BB6" },
        { time: "1984\u5E7411\u6708", text: "\u300A\u7ECF\u6D4E\u65E5\u62A5\u300B\u8BB0\u8005\u7F57\u5F00\u5BCC\u91CD\u8D70\u957F\u5F81\u8DEF\uFF0C7\u65E5\u91C7\u8BBF\u5F90\u89E3\u79C0\uFF1B14\u65E5\u62A5\u9053\u520A\u4E8E\u300A\u7ECF\u6D4E\u65E5\u62A5\u300B\u4E00\u7248" },
        { time: "2016\u5E7410\u670821\u65E5", text: "\u4E60\u8FD1\u5E73\u603B\u4E66\u8BB0\u5728\u7EAA\u5FF5\u7EA2\u519B\u957F\u5F81\u80DC\u522980\u5468\u5E74\u5927\u4F1A\u4E0A\u8BB2\u8FF0\u201C\u534A\u6761\u88AB\u5B50\u201D\u7684\u6545\u4E8B" },
        { time: "2020\u5E749\u670816\u65E5", text: "\u4E60\u8FD1\u5E73\u603B\u4E66\u8BB0\u5230\u6C5D\u57CE\u53BF\u6C99\u6D32\u7476\u65CF\u6751\u8003\u5BDF" }
      ],
      people: [
        { name: "\u5F90\u89E3\u79C0", role: "\u6C99\u6D32\u6751\u6751\u6C11 \xB7 \u5973\u7EA2\u519B\u7684\u623F\u4E1C", text: "\u5979\u628A\u534A\u6761\u88AB\u5B50\u7684\u60C5\u8C0A\u8BB0\u4E86\u534A\u4E2A\u4E16\u7EAA\uFF0C\u5E38\u8BF4\uFF1A\u201C\u4E00\u6761\u88AB\u5B50\u80FD\u526A\u4E0B\u534A\u6761\u7ED9\u7A77\u4EBA\uFF0C\u5929\u5E95\u4E0B\u54EA\u6709\u8FD9\u6837\u7684\u597D\u4EBA\uFF01\u201D" },
        { name: "\u4E09\u4F4D\u5973\u7EA2\u519B", role: "\u957F\u5F81\u961F\u4F0D\u91CC\u7684\u666E\u901A\u6218\u58EB", text: "\u62A5\u9053\u520A\u53D1\u540E\uFF0C\u8001\u7EA2\u519B\u4EEC\u5BFB\u627E\u4E86\u4E03\u5E74\u591A\uFF0C\u59CB\u7EC8\u6CA1\u80FD\u627E\u5230\u5979\u4EEC\u3002\u5979\u4EEC\u6CA1\u6709\u7559\u4E0B\u540D\u5B57\uFF0C\u5374\u4EE3\u8868\u4E86\u5343\u5343\u4E07\u4E07\u628A\u767E\u59D3\u653E\u5728\u5FC3\u4E0A\u7684\u7EA2\u519B\u6218\u58EB\u3002" }
      ],
      golden: { text: "\u5171\u4EA7\u515A\u5C31\u662F\u81EA\u5DF1\u6709\u4E00\u6761\u88AB\u5B50\uFF0C\u4E5F\u8981\u526A\u4E0B\u534A\u6761\u7ED9\u8001\u767E\u59D3\u7684\u4EBA\u3002", source: "\u5F90\u89E3\u79C0\u8001\u4EBA\u8BED\uFF0C\u4E60\u8FD1\u5E73\u5728\u7EAA\u5FF5\u7EA2\u519B\u957F\u5F81\u80DC\u522980\u5468\u5E74\u5927\u4F1A\u4E0A\u7684\u8BB2\u8BDD\u5F15\u8FF0" },
      today: {
        name: "\u201C\u534A\u6761\u88AB\u5B50\u7684\u6E29\u6696\u201D\u4E13\u9898\u9648\u5217\u9986 \xB7 \u6C99\u6D32\u7EA2\u8272\u65C5\u6E38\u666F\u533A",
        intro: "\u4F4D\u4E8E\u6C5D\u57CE\u53BF\u6587\u660E\u7476\u65CF\u4E61\u6C99\u6D32\u7476\u65CF\u6751\uFF0C\u7531\u4E13\u9898\u5C55\u5385\u3001\u201C\u534A\u6761\u88AB\u5B50\u201D\u6545\u4E8B\u53D1\u751F\u5730\uFF08\u5F90\u89E3\u79C0\u65E7\u5C45\uFF09\u53CA\u7EA2\u519B\u603B\u53F8\u4EE4\u90E8\u3001\u603B\u653F\u6CBB\u90E8\u7B49\u65E7\u5740\u7EC4\u6210\u30022026\u5E74\uFF0C\u201C\u2018\u534A\u6761\u88AB\u5B50\u7684\u6E29\u6696\u2019\u4E13\u9898\u9648\u5217\u201D\u5165\u9009\u7EAA\u5FF5\u7EA2\u519B\u957F\u5F81\u80DC\u522990\u5468\u5E74\u4E3B\u9898\u9648\u5217\u5C55\u89C8\u63A8\u4ECB\u540D\u5355\u3002",
        route: "\u6C5D\u57CE\u5728\u8861\u9633\u4E1C\u5357\u65B9\u5411\u3002\u53EF\u4ECE\u8861\u9633\u4E1C\u7AD9\u4E58\u4EAC\u5E7F\u9AD8\u94C1\u5230\u90F4\u5DDE\u897F\u7AD9\uFF0C\u518D\u4E58\u201C\u6C99\u6D32\u2014\u90F4\u5DDE\u201D\u65C5\u6E38\u76F4\u901A\u8F66\u6216\u798F\u57CE\u5FEB\u8F66\u524D\u5F80\u6C99\u6D32\uFF08\u6C99\u6D32\u8DDD\u90F4\u5DDE\u7EA650\u5343\u7C73\u3001\u8DDD\u6C5D\u57CE\u53BF\u57CE\u7EA637\u5343\u7C73\uFF09\uFF1B\u81EA\u9A7E\u8D70\u53A6\u84C9\u9AD8\u901F\uFF0C\u5728\u6C99\u6D32\u6536\u8D39\u7AD9\u4E0B\u3002\u5177\u4F53\u8F66\u6B21\u3001\u73ED\u7EBF\u4EE512306\u548C\u5F53\u5730\u5BA2\u8FD0\u516C\u544A\u4E3A\u51C6\u3002"
      },
      refs: {
        history: ["S4", "S6", "S5"],
        timeline: ["S4", "S6", "S5", "S7"],
        people: ["S6", "S4"],
        golden: ["S5", "S10"],
        today: ["S4", "S8"],
        route: ["S7", "S9"]
      },
      photo: {
        src: "photos/rucheng.jpg",
        caption: "\u6C5D\u57CE\u53BF\u6587\u660E\u7476\u65CF\u4E61\u6C99\u6D32\u7476\u65CF\u6751\u65B0\u8C8C\u2014\u2014\u201C\u534A\u6761\u88AB\u5B50\u201D\u6545\u4E8B\u53D1\u751F\u5730\uFF082026\u5E7410\u6708\uFF09\u3002",
        credit: "\u90F4\u5DDE\u65E5\u62A5\u5168\u5A92\u4F53\u8BB0\u8005 \u9648\u7EA2\u519B \u674E\u6210\u4E49 \u9093\u667A\u534E\uFF0C\u90F4\u5DDE\u65B0\u95FB\u7F51\uFF08\u672C\u7AD9\u88C1\u53BB\u6C34\u5370\u5E76\u7F29\u5C0F\u5C3A\u5BF8\uFF09",
        license: "\u8F6C\u8F7D\u81EA\u65B0\u95FB\u62A5\u9053\uFF0C\u4EC5\u7528\u4E8E\u6821\u5185\u6BD4\u8D5B\u975E\u5546\u4E1A\u5C55\u793A\uFF0C\u7248\u6743\u5F52\u539F\u4F5C\u8005",
        sourceUrl: "https://www.czxww.cn/content/2026-10/30/content_1410614.html"
      }
    },
    xiangjiang: {
      page: "xiangjiang.html",
      history: "1934\u5E7411\u6708\u4E0B\u65EC\uFF0C\u8FDE\u7EED\u7A81\u7834\u4E09\u9053\u5C01\u9501\u7EBF\u7684\u4E2D\u592E\u7EA2\u519B\u8FDB\u81F3\u6E58\u6842\u8FB9\u5883\u3002\u848B\u4ECB\u77F3\u8C03\u96C6\u91CD\u5175\uFF0C\u4F01\u56FE\u5C06\u7EA2\u519B\u201C\u6B7C\u706D\u4E8E\u6E58\u6C5F\u3001\u6F13\u6C34\u4EE5\u4E1C\u5730\u533A\u201D\u300211\u670825\u65E5\uFF0C\u4E2D\u9769\u519B\u59D4\u51B3\u5B9A\u4ECE\u5168\u5DDE\u3001\u5174\u5B89\u4E4B\u95F4\u5F3A\u6E21\u6E58\u6C5F\u300227\u65E5\u8D77\uFF0C\u7EA2\u519B\u5728\u704C\u9633\u65B0\u5729\u3001\u5168\u5DDE\u811A\u5C71\u94FA\u3001\u5174\u5B89\u5149\u534E\u94FA\u4E09\u5904\u987D\u5F3A\u963B\u51FB\uFF0C\u81F312\u67081\u65E5\uFF0C\u4E2D\u592E\u673A\u5173\u548C\u7EA2\u519B\u4E3B\u529B\u5927\u90E8\u6E21\u8FC7\u6E58\u6C5F\uFF0C\u7A81\u7834\u7B2C\u56DB\u9053\u5C01\u9501\u7EBF\u3002\u62C5\u4EFB\u5168\u519B\u540E\u536B\u7684\u7EA234\u5E08\u548C\u7EA218\u56E2\u88AB\u963B\u9694\u4E8E\u6E58\u6C5F\u4E1C\u5CB8\uFF0C\u51E0\u4E4E\u5168\u90E8\u727A\u7272\u3002\u8FD9\u662F\u4E2D\u592E\u7EA2\u519B\u957F\u5F81\u4EE5\u6765\u6700\u58EE\u70C8\u7684\u4E00\u6218\u3002\u8840\u7684\u6559\u8BAD\u8BA9\u8BB8\u591A\u6307\u6218\u5458\u8BA4\u8BC6\u5230\u9519\u8BEF\u7684\u519B\u4E8B\u6307\u6325\u5FC5\u987B\u6539\u53D8\uFF0C\u4E3A\u540E\u6765\u7684\u901A\u9053\u8F6C\u5175\u3001\u9ECE\u5E73\u4F1A\u8BAE\u548C\u9075\u4E49\u4F1A\u8BAE\u57CB\u4E0B\u4E86\u4F0F\u7B14\u3002",
      timeline: [
        { time: "1934\u5E7411\u670825\u65E5", text: "\u4E2D\u9769\u519B\u59D4\u4E0B\u8FBE\u5F3A\u6E21\u6E58\u6C5F\u3001\u7A81\u7834\u7B2C\u56DB\u9053\u5C01\u9501\u7EBF\u7684\u547D\u4EE4" },
        { time: "11\u670827\u65E5", text: "\u7EA2\u519B\u5148\u5934\u90E8\u961F\u6E21\u8FC7\u6E58\u6C5F\uFF0C\u63A7\u5236\u754C\u9996\u81F3\u811A\u5C71\u94FA\u4E00\u7EBF\u6E21\u6CB3\u70B9\uFF1B\u65B0\u5729\u3001\u811A\u5C71\u94FA\u3001\u5149\u534E\u94FA\u963B\u51FB\u6218\u76F8\u7EE7\u6253\u54CD" },
        { time: "12\u67081\u65E5", text: "\u4E2D\u592E\u673A\u5173\u548C\u7EA2\u519B\u4E3B\u529B\u5927\u90E8\u6E21\u8FC7\u6E58\u6C5F\uFF0C\u7A81\u7834\u7B2C\u56DB\u9053\u5C01\u9501\u7EBF" },
        { time: "12\u670818\u65E5", text: "\u7EA234\u5E08\u5E08\u957F\u9648\u6811\u6E58\u91CD\u4F24\u88AB\u4FD8\uFF0C\u5728\u6E56\u5357\u9053\u53BF\u62BC\u89E3\u9014\u4E2D\u65AD\u80A0\u727A\u7272" }
      ],
      people: [
        { name: "\u9648\u6811\u6E58", role: "\u7EA234\u5E08\u5E08\u957F \xB7 \u6E56\u5357\u957F\u6C99\u53BF\u4EBA", text: "1905\u5E74\u751F\u3002\u7387\u90E8\u62C5\u4EFB\u5168\u519B\u540E\u536B\uFF0C\u7A81\u56F4\u4E2D\u8179\u90E8\u4E2D\u5F39\u88AB\u4FD8\uFF0C1934\u5E7412\u670818\u65E5\u5728\u9053\u53BF\u62BC\u89E3\u9014\u4E2D\u638F\u51FA\u80A0\u5B50\u7EDE\u65AD\uFF0C\u58EE\u70C8\u727A\u7272\uFF0C\u5E74\u4EC529\u5C81\u3002\u201C\u65AD\u80A0\u660E\u5FD7\u201D\u7684\u6545\u4E8B\u6D41\u4F20\u81F3\u4ECA\u3002" },
        { name: "\u7EA234\u5E08", role: "\u4E2D\u592E\u7EA2\u519B\u5168\u519B\u540E\u536B", text: "\u4E3A\u63A9\u62A4\u4E2D\u592E\u673A\u5173\u548C\u4E3B\u529B\u6E21\u6C5F\uFF0C\u5728\u6E58\u6C5F\u4E1C\u5CB8\u4E0E\u6570\u500D\u4E8E\u5DF1\u7684\u654C\u4EBA\u8840\u6218\uFF0C\u5168\u5E08\u51E0\u4E4E\u5168\u90E8\u58EE\u70C8\u727A\u7272\u3002" }
      ],
      golden: { text: "\u4E3A\u82CF\u7EF4\u57C3\u65B0\u4E2D\u56FD\u6D41\u5C3D\u6700\u540E\u4E00\u6EF4\u8840\uFF01", source: "\u7EA234\u5E08\u5E08\u957F\u9648\u6811\u6E58\u7684\u8A93\u8A00\uFF08\u636E\u6E56\u5357\u9648\u6811\u6E58\u70C8\u58EB\u7EAA\u5FF5\u56ED\u9648\u5217\u7B49\u8BB0\u8FF0\uFF09" },
      today: {
        name: "\u7EA2\u519B\u957F\u5F81\u6E58\u6C5F\u6218\u5F79\u7EAA\u5FF5\u56ED\uFF08\u5168\u5DDE\uFF09\xB7 \u7EA2\u519B\u957F\u5F81\u7A81\u7834\u6E58\u6C5F\u70C8\u58EB\u7EAA\u5FF5\u7891\u56ED\uFF08\u5174\u5B89\uFF09",
        intro: "\u4E24\u5904\u7EAA\u5FF5\u5730\u90FD\u5728\u5E7F\u897F\u6842\u6797\u5E02\uFF0C\u7D27\u90BB\u6E56\u5357\u6C38\u5DDE\u3002\u5168\u5DDE\u7684\u7EAA\u5FF5\u56ED\u5EFA\u5728\u811A\u5C71\u94FA\u963B\u51FB\u6218\u65E7\u5740\uFF08\u624D\u6E7E\u9547\uFF09\uFF0C\u5185\u6709\u7EA2\u519B\u957F\u5F81\u6E58\u6C5F\u6218\u5F79\u7EAA\u5FF5\u9986\uFF1B\u5174\u5B89\u7684\u7EAA\u5FF5\u7891\u56ED\u4F4D\u4E8E\u5174\u5B89\u53BF\u57CE\uFF0C\u4EE5\u7FA4\u96D5\u3001\u7EAA\u5FF5\u7891\u548C\u7EAA\u5FF5\u9986\u7F05\u6000\u727A\u7272\u7684\u7EA2\u519B\u5C06\u58EB\u3002",
        route: "\u4ECE\u8861\u9633\u4E1C\u7AD9\u4E58\u8861\u67F3\u94C1\u8DEF\u5217\u8F66\uFF0C\u7ECF\u6C38\u5DDE\u5230\u5168\u5DDE\u5357\u7AD9\uFF0C\u518D\u8F6C\u8F66\u7EA613\u5343\u7C73\u5230\u624D\u6E7E\u9547\u7684\u7EAA\u5FF5\u56ED\uFF1B\u5174\u5B89\u7EAA\u5FF5\u7891\u56ED\u53EF\u4ECE\u5174\u5B89\u5317\u7AD9\u524D\u5F80\u5174\u5B89\u53BF\u57CE\u3002\u73ED\u6B21\u4E0E\u65F6\u957F\u4EE512306\u548C\u5BFC\u822A\u4E3A\u51C6\u3002"
      },
      refs: {
        history: ["S11", "S12", "S14"],
        timeline: ["S11", "S13", "S12", "S15"],
        people: ["S15", "S16", "S11", "S37"],
        golden: ["S15"],
        today: ["S11", "S17"],
        route: ["S17"]
      },
      photo: {
        src: "photos/xiangjiang.jpg",
        caption: "\u7EA2\u519B\u957F\u5F81\u6E58\u6C5F\u6218\u5F79\u7EAA\u5FF5\u9986\uFF08\u5E7F\u897F\u5168\u5DDE\u53BF\u624D\u6E7E\u9547\uFF0C2025\u5E741\u6708\uFF09",
        credit: "N509FZ\uFF0C\u7ECF Wikimedia Commons\uFF08\u672C\u7AD9\u5DF2\u7F29\u5C0F\u5C3A\u5BF8\u5E76\u8C03\u8272\uFF09",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Xiangjiang_Campaign_Memorial_Hall,_Quanzhou_(20250122171627).jpg"
      }
    },
    tongdao: {
      page: "tongdao.html",
      history: "\u6E58\u6C5F\u6218\u5F79\u540E\uFF0C\u4E2D\u592E\u7EA2\u519B\u4ECD\u6309\u539F\u8BA1\u5212\u51C6\u5907\u5317\u4E0A\u6E58\u897F\uFF0C\u4E0E\u7EA2\u4E8C\u3001\u516D\u519B\u56E2\u4F1A\u5408\u3002\u800C\u848B\u4ECB\u77F3\u5DF2\u5728\u57CE\u6B65\u3001\u7EE5\u5B81\u3001\u9756\u53BF\u3001\u6D2A\u6C5F\u3001\u6B66\u5188\u4E00\u5E26\u96C6\u7ED3\u4E94\u516D\u500D\u4E8E\u7EA2\u519B\u7684\u5175\u529B\uFF0C\u5F20\u7F51\u4EE5\u5F85\u300212\u670812\u65E5\uFF0C\u4E2D\u5171\u4E2D\u592E\u8D1F\u8D23\u4EBA\u5728\u901A\u9053\u53EC\u5F00\u7D27\u6025\u4F1A\u8BAE\uFF0C\u5468\u6069\u6765\u53EC\u96C6\u3002\u6BDB\u6CFD\u4E1C\u529B\u4E3B\u653E\u5F03\u5317\u4E0A\uFF0C\u6539\u5411\u654C\u4EBA\u529B\u91CF\u8584\u5F31\u7684\u8D35\u5DDE\u524D\u8FDB\uFF0C\u5F97\u5230\u5F20\u95FB\u5929\u3001\u738B\u7A3C\u7965\u3001\u6731\u5FB7\u3001\u5468\u6069\u6765\u7B49\u591A\u6570\u540C\u5FD7\u652F\u6301\u3002\u4F1A\u8BAE\u51B3\u5B9A\u7EA2\u519B\u897F\u8FDB\u8D35\u5DDE\uFF0C\u5F53\u665A19\u65F630\u5206\u4E2D\u9769\u519B\u59D4\u53D1\u51FA\u201C\u4E07\u4E07\u706B\u6025\u201D\u7535\u4EE4\u300212\u670815\u65E5\u7EA2\u519B\u653B\u5360\u9ECE\u5E73\uFF0C18\u65E5\u9ECE\u5E73\u4F1A\u8BAE\u6B63\u5F0F\u653E\u5F03\u5728\u6E58\u897F\u5EFA\u7ACB\u6839\u636E\u5730\u7684\u8BA1\u5212\uFF0C\u51B3\u5B9A\u5411\u4EE5\u9075\u4E49\u4E3A\u4E2D\u5FC3\u7684\u5DDD\u9ED4\u8FB9\u8FDB\u519B\u3002\u901A\u9053\u8F6C\u5175\uFF0C\u662F\u7EA2\u519B\u5728\u751F\u6B7B\u5173\u5934\u7684\u4E00\u6B21\u5173\u952E\u8F6C\u5411\u3002",
      timeline: [
        { time: "1934\u5E7412\u670810\u65E5", text: "\u7EA2\u519B\u653B\u4E0B\u901A\u9053\u53BF\u57CE\uFF08\u4ECA\u53BF\u6EAA\u9547\uFF09\uFF0C\u4E2D\u592E\u7EB5\u961F\u968F\u540E\u8FDB\u5165\u901A\u9053\u5883\u5185" },
        { time: "12\u670812\u65E5", text: "\u901A\u9053\u4F1A\u8BAE\u53EC\u5F00\uFF1B\u5F53\u665A\u4E2D\u9769\u519B\u59D4\u53D1\u51FA\u201C\u4E07\u4E07\u706B\u6025\u201D\u7535\u4EE4\uFF0C\u7EA2\u519B\u897F\u8FDB\u8D35\u5DDE" },
        { time: "12\u670815\u65E5", text: "\u7EA21\u519B\u56E2\u653B\u5360\u8D35\u5DDE\u9ECE\u5E73\u53BF\u57CE" },
        { time: "12\u670818\u65E5", text: "\u9ECE\u5E73\u4F1A\u8BAE\u901A\u8FC7\u300A\u4E2D\u5171\u4E2D\u592E\u653F\u6CBB\u5C40\u5173\u4E8E\u6218\u7565\u65B9\u9488\u4E4B\u51B3\u5B9A\u300B\uFF0C\u6B63\u5F0F\u653E\u5F03\u5317\u4E0A\u6E58\u897F" },
        { time: "1935\u5E741\u6708", text: "\u9075\u4E49\u4F1A\u8BAE\u53EC\u5F00\uFF0C\u6210\u4E3A\u515A\u7684\u5386\u53F2\u4E0A\u751F\u6B7B\u6538\u5173\u7684\u8F6C\u6298\u70B9" }
      ],
      people: [
        { name: "\u6BDB\u6CFD\u4E1C", role: "\u8F6C\u5175\u8D35\u5DDE\u7684\u5EFA\u8BAE\u8005", text: "\u5728\u901A\u9053\u4F1A\u8BAE\u4E0A\u529B\u4E3B\u653E\u5F03\u5317\u4E0A\u6E58\u897F\uFF0C\u8F6C\u5411\u654C\u4EBA\u529B\u91CF\u8584\u5F31\u7684\u8D35\u5DDE\uFF0C\u4E3B\u5F20\u5F97\u5230\u591A\u6570\u4E0E\u4F1A\u540C\u5FD7\u652F\u6301\uFF1B\u9ECE\u5E73\u4F1A\u8BAE\u4EE5\u4E2D\u592E\u6587\u4EF6\u5F62\u5F0F\u786E\u8BA4\u4E86\u4ED6\u7684\u610F\u89C1\u3002" },
        { name: "\u5468\u6069\u6765", role: "\u901A\u9053\u4F1A\u8BAE\u53EC\u96C6\u4EBA", text: "\u53EC\u96C6\u5E76\u4E3B\u6301\u901A\u9053\u4F1A\u8BAE\uFF0C\u8D5E\u540C\u8F6C\u5175\u8D35\u5DDE\uFF1B\u968F\u540E\u4E3B\u6301\u9ECE\u5E73\u4F1A\u8BAE\uFF0C\u91C7\u7EB3\u6BDB\u6CFD\u4E1C\u7684\u610F\u89C1\u3002" }
      ],
      golden: { text: "\u5C94\u8DEF\u53E3\u4E0A\u6700\u96BE\u7684\uFF0C\u4E0D\u662F\u7EE7\u7EED\u8D70\uFF0C\u800C\u662F\u6562\u4E8E\u6539\u9053\u3002", source: "\u672C\u7AD9\u64B0\u6587" },
      today: {
        name: "\u901A\u9053\u8F6C\u5175\u7EAA\u5FF5\u9986 \xB7 \u606D\u57CE\u4E66\u9662",
        intro: "\u4F4D\u4E8E\u901A\u9053\u4F97\u65CF\u81EA\u6CBB\u53BF\u53BF\u6EAA\u9547\uFF08\u901A\u9053\u8001\u53BF\u57CE\uFF09\u3002\u901A\u9053\u8F6C\u5175\u7EAA\u5FF5\u5730\u7531\u7EAA\u5FF5\u9986\u548C\u606D\u57CE\u4E66\u9662\u7B49\u7EC4\u6210\uFF0C\u606D\u57CE\u4E66\u9662\u6302\u724C\u4E3A\u901A\u9053\u4F1A\u8BAE\u65E7\u5740\uFF0C\u662F\u5168\u56FD\u91CD\u70B9\u6587\u7269\u4FDD\u62A4\u5355\u4F4D\uFF1B\u5173\u4E8E\u4F1A\u8BAE\u7684\u5177\u4F53\u5730\u70B9\uFF0C\u53F2\u5B66\u754C\u53E6\u6709\u8BF4\u6CD5\u30022026\u5E74\uFF0C\u7EAA\u5FF5\u9986\u57FA\u672C\u9648\u5217\u201C\u5B9E\u73B0\u957F\u5F81\u4F1F\u5927\u8F6C\u6298\u7684\u5F00\u7AEF\u201D\u5165\u9009\u7EAA\u5FF5\u957F\u5F81\u80DC\u522990\u5468\u5E74\u63A8\u4ECB\u540D\u5355\u3002\u901A\u9053\u4E5F\u662F\u4F97\u65CF\u805A\u5C45\u5730\uFF0C\u5468\u8FB9\u4F97\u5BE8\u98CE\u60C5\u6D53\u90C1\u3002",
        route: "\u4ECE\u8861\u9633\u4E1C\u7AD9\u4E58\u6000\u90B5\u8861\u94C1\u8DEF\u5217\u8F66\u5230\u6000\u5316\u5357\uFF08\u6216\u6000\u5316\uFF09\u7AD9\uFF1B\u518D\u4E58\u7126\u67F3\u94C1\u8DEF\u666E\u901F\u5217\u8F66\u5230\u901A\u9053\u7AD9\u2014\u2014\u8F66\u7AD9\u5C31\u5728\u53BF\u6EAA\u9547\uFF0C\u79BB\u7EAA\u5FF5\u9986\u4E0D\u8FDC\uFF1B\u4E5F\u53EF\u4ECE\u6000\u5316\u4E58\u6C7D\u8F66\u524D\u5F80\u3002\u5177\u4F53\u8F66\u6B21\u3001\u8DEF\u51B5\u4EE512306\u548C\u5BFC\u822A\u4E3A\u51C6\u3002"
      },
      refs: {
        history: ["S1", "S18", "S20", "S19"],
        timeline: ["S20", "S1", "S18", "S5"],
        people: ["S1", "S19", "S18"],
        golden: [],
        today: ["S21", "S22", "S23", "S8"],
        route: ["S24", "S25"]
      },
      photo: {
        src: "photos/tongdao.jpg",
        caption: "\u7EA2\u519B\u957F\u5F81\u901A\u9053\u8F6C\u5175\u4F1A\u8BAE\u65E7\u5740\u2014\u2014\u53BF\u6EAA\u9547\u606D\u57CE\u4E66\u9662\uFF08\u5168\u56FD\u91CD\u70B9\u6587\u7269\u4FDD\u62A4\u5355\u4F4D\uFF09\u3002",
        credit: "\u68C0\u5BDF\u65E5\u62A5\u5168\u5A92\u4F53\u8BB0\u8005 \u6731\u4E66\u6167 \u5F20\u541F\u4E30\uFF0C\u7ECF\u641C\u72D0\u8F6C\u8F7D\uFF08\u672C\u7AD9\u7F29\u5C0F\u5C3A\u5BF8\uFF09",
        license: "\u8F6C\u8F7D\u81EA\u65B0\u95FB\u62A5\u9053\uFF0C\u4EC5\u7528\u4E8E\u6821\u5185\u6BD4\u8D5B\u975E\u5546\u4E1A\u5C55\u793A\uFF0C\u7248\u6743\u5F52\u539F\u4F5C\u8005",
        sourceUrl: "https://www.sohu.com/a/1090194571_121106908"
      }
    },
    sangzhi: {
      page: "sangzhi.html",
      history: "\u4E2D\u592E\u7EA2\u519B\u79BB\u5F00\u6E56\u5357\u540E\uFF0C\u8D3A\u9F99\u3001\u4EFB\u5F3C\u65F6\u7B49\u9886\u5BFC\u7684\u7EA2\u4E8C\u3001\u516D\u519B\u56E2\u5728\u6E58\u9102\u5DDD\u9ED4\u8FB9\u575A\u6301\u6597\u4E89\uFF0C\u7275\u5236\u4E86\u5927\u91CF\u56FD\u6C11\u515A\u519B\u30021935\u5E749\u6708\u8D77\uFF0C\u848B\u4ECB\u77F3\u8C03\u96C6130\u4E2A\u56E2\u201C\u56F4\u527F\u201D\u6E58\u9102\u5DDD\u9ED4\u6839\u636E\u5730\uFF0C\u5F62\u52BF\u65E5\u76CA\u4E25\u5CFB\u300211\u67084\u65E5\uFF0C\u6E58\u9102\u5DDD\u9ED4\u7701\u59D4\u548C\u519B\u59D4\u5206\u4F1A\u5728\u5218\u5BB6\u576A\u53EC\u5F00\u4F1A\u8BAE\uFF0C\u51B3\u5B9A\u6218\u7565\u8F6C\u79FB\u300211\u670819\u65E5\uFF0C\u7EA2\u4E8C\u3001\u516D\u519B\u56E2\u4ECE\u6851\u690D\u5218\u5BB6\u576A\u7B49\u5730\u51FA\u53D1\uFF0C\u5F00\u59CB\u957F\u5F81\u3002\u4ED6\u4EEC\u8F6C\u6218\u6E58\u3001\u9ED4\u3001\u6EC7\u7B49\u5730\uFF0C\u6E21\u8FC7\u91D1\u6C99\u6C5F\uFF0C1936\u5E747\u6708\u521D\u5728\u897F\u5EB7\u7518\u5B5C\u4E0E\u7EA2\u56DB\u65B9\u9762\u519B\u4F1A\u5E08\uFF0C7\u67085\u65E5\u4E0E\u7EA232\u519B\u5408\u7F16\u4E3A\u7EA2\u4E8C\u65B9\u9762\u519B\u30021936\u5E7410\u6708\uFF0C\u7EA2\u4E00\u3001\u4E8C\u3001\u56DB\u65B9\u9762\u519B\u80DC\u5229\u4F1A\u5E08\uFF0C\u957F\u5F81\u80DC\u5229\u7ED3\u675F\u3002\u6851\u690D\u56E0\u6B64\u88AB\u79F0\u4E3A\u7EA2\u4E8C\u65B9\u9762\u519B\u957F\u5F81\u51FA\u53D1\u5730\u3002",
      timeline: [
        { time: "1935\u5E749\u6708", text: "\u848B\u4ECB\u77F3\u8C03\u96C6130\u4E2A\u56E2\u5411\u6E58\u9102\u5DDD\u9ED4\u6839\u636E\u5730\u53D1\u52A8\u65B0\u7684\u201C\u56F4\u527F\u201D" },
        { time: "1935\u5E7411\u670819\u65E5", text: "\u7EA2\u4E8C\u3001\u516D\u519B\u56E2\u5728\u5218\u5BB6\u576A\u5E72\u7530\u575D\u3001\u745E\u5854\u94FA\u67AB\u6811\u5854\u8A93\u5E08\uFF0C\u5F53\u665A\u51FA\u53D1\u957F\u5F81" },
        { time: "1936\u5E747\u6708", text: "7\u6708\u521D\u5728\u7518\u5B5C\u4E0E\u7EA2\u56DB\u65B9\u9762\u519B\u4F1A\u5E08\uFF1B7\u67085\u65E5\u4E0E\u7EA232\u519B\u5408\u7F16\u4E3A\u7EA2\u4E8C\u65B9\u9762\u519B" },
        { time: "1936\u5E7410\u670822\u65E5", text: "\u7EA2\u4E8C\u65B9\u9762\u519B\u4E0E\u7EA2\u4E00\u65B9\u9762\u519B\u5728\u5C06\u53F0\u5821\u4F1A\u5E08\uFF0C\u957F\u5F81\u80DC\u5229\u7ED3\u675F" }
      ],
      people: [
        { name: "\u8D3A\u9F99", role: "\u6851\u690D\u4EBA \xB7 \u7EA2\u4E8C\u3001\u516D\u519B\u56E2\u9886\u5BFC\u4EBA", text: "1917\u5E74\u5E95\u51ED\u4E24\u628A\u83DC\u5200\u593A\u67AA\u62C9\u8D77\u961F\u4F0D\uFF0C\u201C\u4E24\u628A\u83DC\u5200\u95F9\u9769\u547D\u201D\u4F20\u4E3A\u7F8E\u8C08\uFF1B\u957F\u5F81\u65F6\u4EFB\u519B\u59D4\u5206\u4F1A\u4E3B\u5E2D\uFF0C\u4E0B\u8FBE\u7A81\u56F4\u547D\u4EE4\u3002" },
        { name: "\u4EFB\u5F3C\u65F6", role: "\u7EA2\u4E8C\u3001\u516D\u519B\u56E2\u9886\u5BFC\u4EBA", text: "\u4E0E\u8D3A\u9F99\u7B49\u4E00\u8D77\u7387\u90E8\u957F\u5F81\uFF0C\u540E\u4EFB\u7EA2\u4E8C\u65B9\u9762\u519B\u653F\u6CBB\u59D4\u5458\uFF1B\u53F6\u5251\u82F1\u79F0\u4ED6\u662F\u201C\u6211\u4EEC\u515A\u7684\u9A86\u9A7C\uFF0C\u4E2D\u56FD\u4EBA\u6C11\u7684\u9A86\u9A7C\u201D\u3002" }
      ],
      golden: { text: "\u9A6C\u6851\u6811\u513F\u642D\u706F\u53F0\uFF0C\u5199\u5C01\u4E66\u4FE1\u4E0E\u59D0\u5E26\u3002", source: "\u6851\u690D\u6C11\u6B4C\u300A\u9A6C\u6851\u6811\u513F\u642D\u706F\u53F0\u300B" },
      today: {
        name: "\u4E2D\u56FD\u5DE5\u519C\u7EA2\u519B\u7B2C\u4E8C\u65B9\u9762\u519B\u957F\u5F81\u51FA\u53D1\u5730\u7EAA\u5FF5\u9986\uFF08\u6851\u690D\u5218\u5BB6\u576A\uFF09",
        // v1.2：原稿提到的“红二、六军团指挥部旧址”“干田坝誓师坪”“贺龙故居和纪念馆”未在来源中逐字核到，改按 S35 的表述
        intro: "\u4F4D\u4E8E\u6851\u690D\u53BF\u5218\u5BB6\u576A\u767D\u65CF\u4E61\u3002\u7EA2\u4E8C\u65B9\u9762\u519B\u957F\u5F81\u51FA\u53D1\u5730\u666F\u533A\u7531\u957F\u5F81\u51FA\u53D1\u5730\u65E7\u5740\u3001\u8D3A\u9F99\u9A91\u9A6C\u94DC\u50CF\u3001\u7EAA\u5FF5\u7891\u3001\u7EAA\u5FF5\u9986\u548C\u7EAA\u5FF5\u56ED\u533A\u7B49\u7EC4\u6210\uFF0C\u8BB2\u8FF0\u7EA2\u4E8C\u3001\u516D\u519B\u56E2\u957F\u5F81\u51FA\u53D1\u7684\u5386\u53F2\uFF1B\u57FA\u672C\u9648\u5217\u201C\u5947\u8FF9\u201D\u5165\u90092026\u5E74\u7EAA\u5FF5\u957F\u5F81\u80DC\u522990\u5468\u5E74\u63A8\u4ECB\u540D\u5355\u3002\u6851\u690D\u4E5F\u662F\u8D3A\u9F99\u7684\u6545\u4E61\u3002",
        route: "\u4ECE\u8861\u9633\u4E1C\u7AD9\u4E58\u4EAC\u5E7F\u9AD8\u94C1\u5230\u957F\u6C99\u5357\uFF08\u6216\u957F\u6C99\uFF09\uFF0C\u6362\u4E58\u7ECF\u5E38\u76CA\u957F\u3001\u9ED4\u5F20\u5E38\u94C1\u8DEF\u5F00\u5F80\u6851\u690D\u7AD9\u7684\u9AD8\u94C1\u6216\u52A8\u8F66\uFF08\u7EA62\u5C0F\u65F615\u5206\u81F33\u5C0F\u65F6\uFF0C\u90E8\u5206\u8F66\u6B21\u7531\u957F\u6C99\u7AD9\u59CB\u53D1\uFF09\uFF0C\u6851\u690D\u7AD9\u5F00\u8F66\u7EA620\u5206\u949F\u5230\u5218\u5BB6\u576A\u3002\u4E5F\u53EF\u81EA\u9A7E\u7ECF\u9AD8\u901F\u524D\u5F80\u3002\u5177\u4F53\u8F66\u6B21\u3001\u8DEF\u51B5\u4EE512306\u548C\u5BFC\u822A\u4E3A\u51C6\u3002"
      },
      refs: {
        history: ["S26", "S27", "S29"],
        timeline: ["S27", "S26", "S29"],
        people: ["S30", "S26", "S31"],
        golden: ["S28"],
        today: ["S35", "S8"],
        route: ["S32", "S33"]
      },
      photo: {
        src: "photos/sangzhi.jpg",
        caption: "\u4E2D\u56FD\u5DE5\u519C\u7EA2\u519B\u7B2C\u4E8C\u65B9\u9762\u519B\u957F\u5F81\u51FA\u53D1\u5730\u7EAA\u5FF5\u9986\uFF08\u5F20\u5BB6\u754C\u5E02\u6851\u690D\u53BF\u5218\u5BB6\u576A\u767D\u65CF\u4E61\uFF09\u3002",
        credit: "\u6E56\u5357\u7EA2\u7F51\u201C\u6E56\u5357\u7EA2\u8272\u8BB0\u5FC6\u201D\u7CFB\u5217\u62A5\u9053\uFF08\u672C\u7AD9\u7F29\u5C0F\u5C3A\u5BF8\uFF09",
        license: "\u8F6C\u8F7D\u81EA\u65B0\u95FB\u62A5\u9053\uFF0C\u4EC5\u7528\u4E8E\u6821\u5185\u6BD4\u8D5B\u975E\u5546\u4E1A\u5C55\u793A\uFF0C\u7248\u6743\u5F52\u539F\u4F5C\u8005",
        sourceUrl: "https://hn.rednet.cn/content/646941/50/15129857.html"
      }
    }
  };
  for (const ch of chapters) {
    if (details[ch.id]) ch.detail = details[ch.id];
  }
  var detailOrder = chapters.filter((ch) => ch.detail);

  // js/storymap.js
  var gsap2 = window.gsap;
  var echarts = window.echarts;
  var scrollama = window.scrollama;
  var C = {
    red: "#B3261E",
    paper: "#F4EDE1",
    paperDark: "#E9DCC4",
    ink: "#1F1A17",
    inkSoft: "#5A4E45",
    gold: "#C9A45C",
    neighborLine: "#BDB09C",
    // v2.1「投影友好」：地图回到亮纸底，路线用炬火红（投影仪上暗底会发灰，亮底更稳）
    night: "#F7F1E6",
    // 未到达站点的填色（纸白）
    land: "#E8DCC5",
    // 湖南各市州
    landEdge: "#B8A68A",
    outer: "#F1EADD",
    // 周边省份
    outerEdge: "#D9CDB8",
    moon: "#1F1A17",
    moonSoft: "#8A7C6E",
    ember: "#C93F1C",
    // 路线：比 v2 深一档，纸底上对比度足够
    glow: "#E2572B"
  };
  var MAP_NAME = "xiang";
  function esc(str = "") {
    return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }
  function renderSteps(container) {
    container.innerHTML = chapters.map((ch, i) => {
      const note = ch.note ? `<p class="step-note">${esc(ch.note)}</p>` : "";
      const choice = ch.choice ? `<div class="choice" role="group" aria-label="\u5C94\u8DEF\u53E3\u9009\u62E9">
             <p class="choice-prompt">${esc(ch.choice.prompt)}</p>
             <div class="choice-buttons">
               ${ch.choice.options.map((opt, k) => `<button type="button" class="choice-btn" data-k="${k}" aria-pressed="false">${esc(opt.label)}</button>`).join("")}
             </div>
             <p class="choice-result" aria-live="polite"></p>
           </div>` : "";
      const cta = ch.cta ? `<a class="cta" href="${esc(ch.cta.href)}">${esc(ch.cta.label)}</a>` : "";
      const more = ch.detail ? `<a class="step-more" href="pages/${esc(ch.detail.page)}">\u67E5\u770B\u8BE6\u60C5 <span aria-hidden="true">\u2192</span></a>` : "";
      return `<article class="step" id="step-${esc(ch.id)}" data-index="${i}" data-id="${esc(ch.id)}">
          <p class="step-kicker">${esc(ch.kicker)}</p>
          <p class="step-date">${esc(ch.date)}</p>
          <h3>${esc(ch.title)}</h3>
          <p class="step-place">${esc(ch.place)}</p>
          <p class="step-story">${esc(ch.story)}</p>
          ${note}
          <blockquote class="step-quote">
            <p>\u201C${esc(ch.quote.text)}\u201D</p>
            <cite>\u2014\u2014 ${esc(ch.quote.source)}</cite>
          </blockquote>
          ${choice}
          ${more}
          ${cta}
        </article>`;
    }).join("");
  }
  var routeNodes = chapters.filter((ch) => ch.inRoute);
  function routeStateAt(index) {
    const chapter = chapters[index];
    const visitedIds = /* @__PURE__ */ new Set();
    const done = [];
    const active = [];
    if (chapter.id === "prologue") {
      return { done, active, current: origin.coord, visitedIds };
    }
    const lastRouteIdx = chapter.id === "epilogue" ? routeNodes.length - 1 : routeNodes.indexOf(chapter);
    let prev = origin.coord;
    routeNodes.forEach((node, k) => {
      if (k > lastRouteIdx) return;
      visitedIds.add(node.id);
      const isCurrent = k === lastRouteIdx && chapter.id !== "epilogue";
      const bucket = isCurrent ? active : done;
      if (node.newBranch) {
        const path = node.branchPath || [];
        for (let j = 1; j < path.length; j++) bucket.push({ coords: [path[j - 1], path[j]] });
      } else {
        bucket.push({ coords: [prev, node.coord] });
      }
      prev = node.coord;
    });
    if (chapter.id === "epilogue") active.push(...done.splice(0));
    return { done, active, current: chapter.coord, visitedIds };
  }
  function registerBaseMap(hunanGeo, neighborsGeo) {
    const merged = {
      type: "FeatureCollection",
      features: [...neighborsGeo.features, ...hunanGeo.features]
    };
    echarts.registerMap(MAP_NAME, merged);
    return neighborsGeo.features.map((f) => f.properties.name);
  }
  function neighborRegions(names, showName) {
    return names.map((name) => ({
      name,
      itemStyle: { areaColor: C.outer, borderColor: C.outerEdge, borderWidth: 0.8 },
      label: { show: showName, color: "rgba(169,175,187,0.55)", fontSize: 11, fontFamily: "serif", fontWeight: "normal" }
    }));
  }
  var SAFE = { top: 52, right: 10, bottom: 28, left: 10 };
  function makeLabelLayout(chart, getCurrentIdx) {
    return (params) => {
      const W = chart.getWidth();
      const H = chart.getHeight();
      const { rect, labelRect } = params;
      const gap = params.dataIndex === getCurrentIdx() ? 18 : 8;
      const w = labelRect.width;
      const h = labelRect.height;
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const r = rect.width / 2;
      if (cx < 0 || cx > W || cy < 0 || cy > H) return { x: -9999, y: -9999 };
      const candidates = [
        { x: cx + r + gap, y: cy - h / 2 },
        // 右
        { x: cx - r - gap - w, y: cy - h / 2 },
        // 左
        { x: cx - w / 2, y: cy + r + gap - 2 },
        // 下
        { x: cx - w / 2, y: cy - r - gap - h + 2 }
        // 上
      ];
      const fits = (c) => c.x >= SAFE.left && c.x + w <= W - SAFE.right && c.y >= SAFE.top && c.y + h <= H - SAFE.bottom;
      let best = candidates.find(fits) || candidates[0];
      const x = Math.min(Math.max(best.x, SAFE.left), W - SAFE.right - w);
      const y = Math.min(Math.max(best.y, SAFE.top), H - SAFE.bottom - h);
      return { x, y, align: "left", verticalAlign: "top", hideOverlap: false };
    };
  }
  function baseOption(neighborNames, reducedMotion2) {
    return {
      animation: !reducedMotion2,
      geo: {
        map: MAP_NAME,
        roam: false,
        // 禁止用户拖拽缩放，视角完全由滚动控制
        silent: true,
        // 底图不响应鼠标
        center: chapters[0].view.center,
        zoom: chapters[0].view.zoom,
        aspectScale: 0.85,
        // 纬度修正，让湖南的形状更接近真实比例
        itemStyle: {
          areaColor: C.land,
          borderColor: C.landEdge,
          borderWidth: 0.7,
          shadowColor: "rgba(0,0,0,0.5)",
          shadowBlur: 12
        },
        label: { show: true, color: "rgba(169,175,187,0.75)", fontSize: 11 },
        regions: neighborRegions(neighborNames, true)
      },
      series: [
        {
          // 已走过的路段：静态红色实线
          id: "route-done",
          type: "lines",
          coordinateSystem: "geo",
          zlevel: 1,
          lineStyle: { color: C.ember, width: 2.5, opacity: 0.8, curveness: 0.18, shadowColor: "rgba(201,63,28,0.35)", shadowBlur: 6 },
          data: []
        },
        {
          // 刚刚走的一段：带“流光”箭头动画
          id: "route-active",
          type: "lines",
          coordinateSystem: "geo",
          zlevel: 2,
          effect: {
            show: !reducedMotion2,
            period: 2.2,
            // 拖尾必须为 0：ECharts 的拖尾依赖整层“运动模糊”，地图平移缩放时会留下大片残影
            trailLength: 0,
            symbol: "arrow",
            symbolSize: 9,
            color: C.glow
          },
          lineStyle: { color: C.ember, width: 3.2, opacity: 1, curveness: 0.18, shadowColor: "rgba(201,63,28,0.45)", shadowBlur: 8 },
          data: []
        },
        {
          // 岔路口互动画出的方向线（通道转兵）
          id: "choice-line",
          type: "lines",
          coordinateSystem: "geo",
          zlevel: 2,
          effect: { show: !reducedMotion2, period: 1.6, trailLength: 0, symbol: "arrow", symbolSize: 10 },
          lineStyle: { width: 2.5, type: "dashed", curveness: 0.1 },
          data: []
        },
        {
          // 所有节点小圆点
          id: "nodes",
          type: "scatter",
          coordinateSystem: "geo",
          zlevel: 3,
          symbolSize: 10,
          // v1.1：标签做成“偏移小签”——纸色底 + 细边框，位置由 labelLayout 计算（见 makeLabelLayout）
          label: {
            show: true,
            formatter: "{b}",
            // 显示地点名（默认会显示坐标数值）
            position: "right",
            distance: 8,
            fontFamily: "serif",
            fontWeight: "bold",
            fontSize: 14,
            lineHeight: 18,
            color: C.ink,
            backgroundColor: "rgba(244,237,225,0.94)",
            borderColor: "rgba(31,26,23,0.35)",
            borderWidth: 0.6,
            borderRadius: 2,
            padding: [3, 6]
          },
          data: []
        },
        {
          // 当前节点水波纹
          id: "current",
          type: reducedMotion2 ? "scatter" : "effectScatter",
          coordinateSystem: "geo",
          zlevel: 4,
          symbolSize: 16,
          rippleEffect: { brushType: "stroke", scale: 4, period: 3 },
          itemStyle: { color: C.ember, shadowBlur: 10, shadowColor: "rgba(201,63,28,.5)" },
          data: []
        },
        {
          // 岔路口“错误方向”的标记
          id: "choice-mark",
          type: "scatter",
          coordinateSystem: "geo",
          zlevel: 4,
          symbol: "circle",
          symbolSize: 1,
          label: {
            show: true,
            position: "top",
            distance: 10,
            fontFamily: "serif",
            fontWeight: "bold",
            fontSize: 14,
            color: C.paper,
            backgroundColor: C.ink,
            padding: [3, 6]
          },
          data: []
        }
      ]
    };
  }
  function nodeData(visitedIds) {
    const point = (name, coord, visited) => ({
      name,
      value: coord,
      itemStyle: visited ? { color: C.ember, borderColor: C.glow, borderWidth: 1.5 } : { color: C.night, borderColor: C.moonSoft, borderWidth: 1.5 },
      label: { color: visited ? C.ink : C.inkSoft }
    });
    return [
      point(origin.name, origin.coord, true),
      ...routeNodes.map((ch) => point(ch.mapLabel, ch.coord, visitedIds.has(ch.id)))
    ];
  }
  function initStorymap({ hunanGeo, neighborsGeo, reducedMotion: reducedMotion2 }) {
    const stepsEl = document.getElementById("steps");
    const mapEl = document.getElementById("map");
    const captionEl = document.getElementById("mapCaption");
    renderSteps(stepsEl);
    const neighborNames = registerBaseMap(hunanGeo, neighborsGeo);
    const chart = echarts.init(mapEl, null, { renderer: "canvas" });
    chart.setOption(baseOption(neighborNames, reducedMotion2));
    let currentIdx = -1;
    chart.setOption({ series: [{ id: "nodes", labelLayout: makeLabelLayout(chart, () => currentIdx) }] });
    const view = { lng: chapters[0].view.center[0], lat: chapters[0].view.center[1], zoom: chapters[0].view.zoom };
    let currentIndex = -1;
    function applyView() {
      chart.setOption({ geo: { center: [view.lng, view.lat], zoom: view.zoom } }, { lazyUpdate: true });
    }
    function flyTo({ center, zoom }) {
      gsap2.killTweensOf(view);
      if (reducedMotion2) {
        Object.assign(view, { lng: center[0], lat: center[1], zoom });
        applyView();
        return;
      }
      gsap2.to(view, {
        lng: center[0],
        lat: center[1],
        zoom,
        duration: 1.4,
        ease: "power2.inOut",
        onUpdate: applyView
      });
    }
    function activate(index) {
      if (index === currentIndex) return;
      currentIndex = index;
      const chapter = chapters[index];
      stepsEl.querySelectorAll(".step").forEach((el3, i) => el3.classList.toggle("is-active", i === index));
      captionEl.textContent = chapter.coord ? chapter.mapLabel : chapter.kicker === "\u5E8F\u7AE0" ? "\u4ECE\u745E\u91D1\u5230\u6E56\u5357" : "\u6E56\u5357 \xB7 \u957F\u5F81\u8DB3\u8FF9";
      const state = routeStateAt(index);
      currentIdx = chapter.id === "prologue" ? 0 : chapter.coord ? routeNodes.indexOf(chapter) + 1 : -1;
      const target = chapter.id === "prologue" ? { center: [113.3, 26.9], zoom: 1.75 } : chapter.view;
      chart.setOption({
        // 周边省名只在缩放较小（概览）时显示
        geo: { regions: neighborRegions(neighborNames, target.zoom <= 2) },
        series: [
          { id: "route-done", data: state.done },
          { id: "route-active", data: state.active },
          { id: "choice-line", data: [] },
          { id: "choice-mark", data: [] },
          { id: "nodes", data: nodeData(state.visitedIds) },
          { id: "current", data: state.current ? [{ value: state.current }] : [] }
        ]
      });
      flyTo(target);
    }
    const tongdao = chapters.find((ch) => ch.choice);
    const choiceCard = tongdao && stepsEl.querySelector(`[data-id="${tongdao.id}"] .choice`);
    if (choiceCard) {
      const resultEl = choiceCard.querySelector(".choice-result");
      const targets = {
        false: { coord: [109.95, 28], label: "\u2715 \u91CD\u5175\u5E03\u9632" },
        // 北上湘西
        true: { coord: [109.13, 26.23], label: "\u9ECE\u5E73\uFF08\u8D35\u5DDE\uFF09" }
        // 西进贵州
      };
      choiceCard.querySelectorAll(".choice-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const opt = tongdao.choice.options[Number(btn.dataset.k)];
          const cls = opt.correct ? "is-right" : "is-wrong";
          choiceCard.querySelectorAll(".choice-btn").forEach((b) => {
            b.setAttribute("aria-pressed", String(b === btn));
            b.classList.remove("is-right", "is-wrong");
          });
          btn.classList.add(cls);
          resultEl.className = `choice-result ${cls}`;
          resultEl.textContent = opt.result;
          const target = targets[opt.correct];
          const color = opt.correct ? C.ember : "#5E6878";
          chart.setOption({
            series: [
              {
                id: "choice-line",
                data: [{ coords: [tongdao.coord, target.coord], lineStyle: { color }, effect: { color } }]
              },
              {
                id: "choice-mark",
                data: [{ value: target.coord, label: { formatter: target.label, backgroundColor: color } }]
              }
            ]
          });
        });
      });
    }
    const isMobile = () => window.matchMedia("(max-width: 860px)").matches;
    const scroller = scrollama();
    scroller.setup({
      step: "#steps .step",
      offset: isMobile() ? 0.8 : 0.55
      // 触发线位置：屏幕高度的 55%（手机端地图在上方，触发线放低）
    }).onStepEnter(({ index }) => activate(index));
    activate(0);
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        chart.resize();
        scroller.resize();
      }, 150);
    });
    return {
      chart,
      activate,
      getIndex: () => currentIndex,
      stepEls: [...stepsEl.querySelectorAll(".step")]
    };
  }

  // js/autoplay.js
  var DWELL = 6500;
  function initAutoplay({ stepEls, getIndex, reducedMotion: reducedMotion2 }) {
    const section = document.getElementById("storymap");
    const btn = document.getElementById("autoplayBtn");
    const hint = document.getElementById("autoplayHint");
    if (!section || !btn || !stepEls.length) return;
    let playing = false;
    let session = false;
    let timer = null;
    let autoScrolling = false;
    function goTo(i) {
      const idx = Math.max(0, Math.min(stepEls.length - 1, i));
      const mobile = window.matchMedia("(max-width: 860px)").matches;
      const top = stepEls[idx].getBoundingClientRect().top + window.scrollY - window.innerHeight * (mobile ? 0.55 : 0.3);
      autoScrolling = true;
      window.scrollTo({ top, behavior: reducedMotion2 ? "auto" : "smooth" });
      setTimeout(() => {
        autoScrolling = false;
      }, 1200);
      return idx;
    }
    function render() {
      btn.textContent = playing ? "\u275A\u275A \u6682\u505C" : "\u25B6 \u81EA\u52A8\u64AD\u653E";
      btn.setAttribute("aria-pressed", String(playing));
      hint.hidden = !session;
    }
    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      timer = setTimeout(() => {
        const next = getIndex() + 1;
        if (next >= stepEls.length) {
          pause();
          return;
        }
        goTo(next);
        schedule();
      }, DWELL);
    }
    function play() {
      session = true;
      playing = true;
      const rect = section.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5;
      const cur = getIndex();
      if (!inView || cur < 0) goTo(Math.max(cur, 0));
      else if (cur >= stepEls.length - 1) goTo(0);
      render();
      schedule();
    }
    function pause() {
      playing = false;
      clearTimeout(timer);
      render();
    }
    btn.addEventListener("click", () => playing ? pause() : play());
    const storyInView = () => {
      const r = section.getBoundingClientRect();
      return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4;
    };
    window.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest("input, textarea, select, dialog, [contenteditable]")) return;
      if (!storyInView()) return;
      if (e.code === "Space" && session && !(e.target.closest && e.target.closest("button, a"))) {
        e.preventDefault();
        playing ? pause() : play();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(getIndex() + (e.key === "ArrowRight" ? 1 : -1));
        if (playing) schedule();
      }
    });
    const userScroll = () => {
      if (playing && !autoScrolling) pause();
    };
    window.addEventListener("wheel", userScroll, { passive: true });
    window.addEventListener("touchmove", userScroll, { passive: true });
    render();
  }

  // js/qa-engine.js
  var FILLERS = [
    "\u8BF7\u95EE",
    "\u5C0F\u7EA2",
    "\u4F60\u597D",
    "\u4E3A\u4EC0\u4E48",
    "\u662F\u4EC0\u4E48",
    "\u4EC0\u4E48",
    "\u600E\u4E48\u6837",
    "\u600E\u4E48",
    "\u5982\u4F55",
    "\u54EA\u91CC",
    "\u54EA\u513F",
    "\u54EA\u4E9B",
    "\u54EA\u4E2A",
    "\u591A\u5C11",
    "\u662F\u4E0D\u662F",
    "\u6709\u6CA1\u6709",
    "\u53EF\u4EE5",
    "\u4E00\u4E0B",
    "\u4ECB\u7ECD",
    "\u8BB2\u8BB2",
    "\u8BF4\u8BF4",
    "\u544A\u8BC9\u6211",
    "\u77E5\u9053",
    "\u5417",
    "\u5462",
    "\u5427",
    "\u554A",
    "\u5440",
    "\u7684",
    "\u4E86",
    "\u662F",
    "\u6211",
    "\u4F60",
    "\u4ED6",
    "\u5979",
    "\u548C",
    "\u4E0E",
    "\u5728",
    "\u6709"
  ];
  function normalize(text = "") {
    let s = String(text).toLowerCase();
    s = s.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248));
    for (const w of FILLERS) s = s.split(w).join(" ");
    return s.replace(/[^\u4e00-\u9fa5a-z0-9]+/g, " ").trim();
  }
  function tokenize(text, weight = 1) {
    const tf = {};
    const bump = (t, w) => {
      tf[t] = (tf[t] || 0) + w;
    };
    for (const seg of normalize(text).split(" ")) {
      if (!seg) continue;
      const chars = [...seg];
      chars.forEach((c) => bump(c, 0.5 * weight));
      for (let i = 0; i < chars.length - 1; i++) bump(chars[i] + chars[i + 1], weight);
    }
    return tf;
  }
  function merge(a, b) {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
    return out;
  }
  function norm(vec) {
    let s = 0;
    for (const v of Object.values(vec)) s += v * v;
    return Math.sqrt(s);
  }
  function buildIndex(entries) {
    const tfs = entries.map(
      (e) => merge(tokenize([e.q, ...e.alias || []].join(" "), 1), tokenize(e.a, 0.3))
    );
    const df = {};
    tfs.forEach((tf) => Object.keys(tf).forEach((t) => {
      df[t] = (df[t] || 0) + 1;
    }));
    const N = entries.length;
    const idf = {};
    for (const [t, n] of Object.entries(df)) idf[t] = Math.log((N + 1) / (n + 1)) + 1;
    const vectors = tfs.map((tf) => {
      const v = {};
      for (const [t, w] of Object.entries(tf)) v[t] = w * idf[t];
      return v;
    });
    return { entries, idf, vectors, norms: vectors.map(norm) };
  }
  function search(index, query, k = 3) {
    const qtf = tokenize(query, 1);
    const qv = {};
    for (const [t, w] of Object.entries(qtf)) if (index.idf[t]) qv[t] = w * index.idf[t];
    const qn = norm(qv);
    if (!qn) return [];
    const results = index.vectors.map((v, i) => {
      let dot = 0;
      for (const [t, w] of Object.entries(qv)) if (v[t]) dot += w * v[t];
      return { entry: index.entries[i], score: dot / (qn * index.norms[i]) };
    }).sort((a, b) => b.score - a.score).slice(0, k);
    const grams = Object.keys(qtf).filter((t) => t.length > 1);
    const coverage = grams.length ? grams.filter((t) => index.idf[t]).length / grams.length : 1;
    results.forEach((r) => {
      r.coverage = coverage;
    });
    return results;
  }
  var MIN_COVERAGE = 0.3;
  var THRESHOLD = 0.22;
  function answer(index, query) {
    const top = search(index, query, 4);
    const best = top[0];
    const grams = Object.keys(tokenize(query)).filter((t) => t.length > 1).length;
    const lowCoverage = best && grams >= 4 && best.coverage < MIN_COVERAGE;
    if (best && best.score >= THRESHOLD && !lowCoverage) {
      return {
        hit: true,
        answer: best.entry.a,
        entry: best.entry,
        score: best.score,
        // 命中时也推荐 2 个“相关问题”，引导继续提问
        suggestions: top.slice(1, 3).filter((r) => r.score > 0.08).map((r) => r.entry.q)
      };
    }
    let suggestions = top.filter((r) => r.score > 0.05).slice(0, 3).map((r) => r.entry.q);
    const starters = ["\u201C\u534A\u6761\u88AB\u5B50\u201D\u662F\u4EC0\u4E48\u6545\u4E8B\uFF1F", "\u4EC0\u4E48\u662F\u901A\u9053\u8F6C\u5175\uFF1F", "\u957F\u5F81\u7CBE\u795E\u7684\u5185\u6DB5\u662F\u4EC0\u4E48\uFF1F", "\u6E58\u6C5F\u6218\u5F79\u662F\u600E\u4E48\u56DE\u4E8B\uFF1F"];
    for (const s of starters) if (suggestions.length < 3 && !suggestions.includes(s)) suggestions.push(s);
    return {
      hit: false,
      answer: "\u8FD9\u4E2A\u95EE\u9898\u5C0F\u7EA2\u8FD8\u8981\u518D\u5B66\u4E60\u2026\u2026 \u76EE\u524D\u6211\u53EA\u719F\u6089\u957F\u5F81\u6E56\u5357\u6BB5\u548C\u672C\u7AD9\u7684\u5185\u5BB9\u3002\u4F60\u53EF\u4EE5\u8BD5\u8BD5\u95EE\u6211\uFF1A",
      score: best ? best.score : 0,
      // 兜底原因：low-coverage = 问题里大部分词知识库不认识；low-score = 认识但都不够相近
      reason: lowCoverage ? "low-coverage" : "low-score",
      coverage: best ? best.coverage : 0,
      suggestions
    };
  }

  // js/qa.js
  var LS_KEY = "xhxz.llm.v1";
  var MAX_Q = 60;
  var PRESETS = ["\u201C\u534A\u6761\u88AB\u5B50\u201D\u662F\u4EC0\u4E48\u6545\u4E8B\uFF1F", "\u9648\u6811\u6E58\u662F\u8C01\uFF1F", "\u4EC0\u4E48\u662F\u901A\u9053\u8F6C\u5175\uFF1F", "\u957F\u5F81\u7CBE\u795E\u5BF9\u4ECA\u5929\u7684\u5927\u5B66\u751F\u6709\u4EC0\u4E48\u610F\u4E49\uFF1F"];
  var SYSTEM_PROMPT = "\u4F60\u662F\u7F51\u9875\u300A\u85AA\u706B\xB7\u6E58\u5F81\u300B\uFF08\u957F\u5F81\u6E56\u5357\u6BB5\u4EA4\u4E92\u6570\u5B57\u5C55\uFF09\u7684AI\u8BB2\u89E3\u5458\u201C\u5C0F\u7EA2\u201D\uFF0C\u9762\u5411\u5927\u5B66\u751F\uFF0C\u8BED\u6C14\u4EB2\u5207\u3001\u7B80\u6D01\u3002\u4F60\u53EA\u80FD\u4F9D\u636E\u4E0B\u9762\u3010\u8D44\u6599\u3011\u4E2D\u7684\u5185\u5BB9\u56DE\u7B54\uFF0C\u4E0D\u5F97\u7F16\u9020\u8D44\u6599\u4EE5\u5916\u7684\u65E5\u671F\u3001\u4EBA\u6570\u3001\u4EBA\u540D\u548C\u5F15\u6587\uFF1B\u5982\u679C\u8D44\u6599\u4E0D\u8DB3\u4EE5\u56DE\u7B54\uFF0C\u5C31\u56DE\u7B54\u201C\u8FD9\u4E2A\u95EE\u9898\u5C0F\u7EA2\u8FD8\u8981\u518D\u5B66\u4E60\u201D\uFF0C\u5E76\u5EFA\u8BAE\u7528\u6237\u6362\u4E00\u4E2A\u4E0E\u957F\u5F81\u6E56\u5357\u6BB5\u76F8\u5173\u7684\u95EE\u9898\u3002\u56DE\u7B54\u7528\u7B80\u4F53\u4E2D\u6587\uFF0C\u4E0D\u8D85\u8FC7150\u5B57\uFF0C\u4E0D\u8981\u4F7F\u7528Markdown\u3002";
  var $ = (sel, root = document) => root.querySelector(sel);
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function nowHM() {
    const d = /* @__PURE__ */ new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function loadCfg() {
    try {
      return { enabled: false, base: "", key: "", model: "", ...JSON.parse(localStorage.getItem(LS_KEY) || "{}") };
    } catch {
      return { enabled: false, base: "", key: "", model: "" };
    }
  }
  function saveCfg(cfg) {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  }
  async function askLLM(cfg, question, context) {
    var _a, _b, _c;
    let url = cfg.base.trim().replace(/\/+$/, "");
    if (!/\/chat\/completions$/.test(url)) url += "/chat/completions";
    const material = context.map((r, i) => `${i + 1}. \u95EE\uFF1A${r.entry.q}
\u7B54\uFF1A${r.entry.a}`).join("\n");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2e4);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key.trim()}` },
        body: JSON.stringify({
          model: cfg.model.trim(),
          temperature: 0.3,
          messages: [
            { role: "system", content: `${SYSTEM_PROMPT}

\u3010\u8D44\u6599\u3011
${material || "\uFF08\u65E0\uFF09"}` },
            { role: "user", content: question }
          ]
        })
      });
      if (!res.ok) throw new Error(`\u63A5\u53E3\u8FD4\u56DE ${res.status}`);
      const data = await res.json();
      const text = (_c = (_b = (_a = data == null ? void 0 : data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content;
      if (!text) throw new Error("\u63A5\u53E3\u6CA1\u6709\u8FD4\u56DE\u5185\u5BB9");
      return String(text).trim();
    } finally {
      clearTimeout(timer);
    }
  }
  async function initQA({ reducedMotion: reducedMotion2 }) {
    const root = document.getElementById("qa");
    if (!root) return;
    const log = $("#qaLog", root);
    const form = $("#qaForm", root);
    const input = $("#qaInput", root);
    const sendBtn = $("#qaSend", root);
    const chips = $("#qaChips", root);
    const modeBadge = $("#qaMode", root);
    const dialog = $("#qaSettings", root);
    let index = null;
    let serial = 0;
    let busy = false;
    try {
      let kb = window.__XH_DATA && window.__XH_DATA.kb;
      if (!kb) {
        const res = await fetch("js/data/kb.json");
        if (!res.ok) throw new Error(res.status);
        kb = await res.json();
      }
      index = buildIndex(kb.entries);
    } catch (err) {
      console.warn("\u77E5\u8BC6\u5E93\u52A0\u8F7D\u5931\u8D25", err);
    }
    function refreshMode() {
      const cfg = loadCfg();
      const llm = cfg.enabled && cfg.base && cfg.key && cfg.model;
      modeBadge.textContent = llm ? `\u5927\u6A21\u578B\u6A21\u5F0F \xB7 ${cfg.model}` : "\u672C\u5730\u77E5\u8BC6\u5E93\u6A21\u5F0F \xB7 \u79BB\u7EBF\u53EF\u7528";
      modeBadge.classList.toggle("is-llm", Boolean(llm));
      return llm ? cfg : null;
    }
    refreshMode();
    function slip(dir) {
      serial += 1;
      const box = el("article", `slip slip-${dir}`);
      const head = el("header", "slip-head");
      head.append(
        el("span", "slip-type", dir === "out" ? "\u53BB \u7535" : "\u6765 \u7535"),
        el("span", "slip-no", `\u7B2C ${String(serial).padStart(4, "0")} \u53F7`),
        el("span", "slip-from", dir === "out" ? "\u53D1\u62A5\uFF1A\u540C\u5B66" : "\u53D1\u62A5\uFF1A\u5C0F\u7EA2"),
        el("span", "slip-time", nowHM())
      );
      const body = el("div", "slip-body");
      box.append(head, body);
      log.append(box);
      return { box, body };
    }
    function scrollLog() {
      log.scrollTo({ top: log.scrollHeight, behavior: reducedMotion2 ? "auto" : "smooth" });
    }
    function typewrite(node, text) {
      return new Promise((resolve) => {
        if (reducedMotion2) {
          node.textContent = text;
          resolve();
          return;
        }
        const chars = [...text];
        let i = 0;
        node.classList.add("is-typing");
        const tick = () => {
          i += 1;
          node.textContent = chars.slice(0, i).join("");
          if (i % 6 === 0) scrollLog();
          if (i < chars.length) setTimeout(tick, /[，。；：！？、]/.test(chars[i - 1]) ? 110 : 32);
          else {
            node.classList.remove("is-typing");
            resolve();
          }
        };
        tick();
      });
    }
    function suggestionRow(list) {
      const row = el("div", "slip-suggest");
      list.forEach((q) => {
        const b = el("button", "chip chip-sm", q);
        b.type = "button";
        b.addEventListener("click", () => ask(q));
        row.append(b);
      });
      return row;
    }
    async function ask(raw) {
      const q = String(raw || "").replace(/\s+/g, " ").trim().slice(0, MAX_Q);
      if (!q || busy) return;
      busy = true;
      sendBtn.disabled = true;
      input.value = "";
      const tg = root.querySelector(".telegraph");
      if (tg && window.matchMedia("(max-width: 860px)").matches) {
        const r = tg.getBoundingClientRect();
        if (r.top > window.innerHeight * 0.5 || r.bottom < 0) tg.scrollIntoView({ behavior: reducedMotion2 ? "auto" : "smooth", block: "start" });
      }
      slip("out").body.append(el("p", "slip-text", q));
      const { body } = slip("in");
      const waiting = el("p", "slip-wait", "\u6EF4\u6EF4\u2014\u2014\u6EF4\u2014\u2014  \u6B63\u5728\u6536\u62A5");
      body.append(waiting);
      scrollLog();
      let text = "";
      let meta = "";
      let suggestions = [];
      const llmCfg = refreshMode();
      if (!index) {
        text = "\u5C0F\u7EA2\u7684\u77E5\u8BC6\u5E93\u6CA1\u6709\u52A0\u8F7D\u6210\u529F\uFF0C\u8BF7\u7528\u672C\u5730\u670D\u52A1\u5668\u6253\u5F00\u672C\u7AD9\uFF08\u89C1 README\uFF09\u3002";
      } else if (llmCfg) {
        const ctx = search(index, q, 3);
        try {
          text = await askLLM(llmCfg, q, ctx);
          meta = `\u5927\u6A21\u578B\u4F5C\u7B54 \xB7 \u53C2\u8003\u8D44\u6599\uFF1A${ctx.map((r) => r.entry.id).join("\u3001") || "\u65E0"}`;
        } catch (err) {
          console.warn("\u5927\u6A21\u578B\u8C03\u7528\u5931\u8D25\uFF0C\u9000\u56DE\u672C\u5730\u6A21\u5F0F\uFF1A", err.message);
          const r = answer(index, q);
          text = r.answer;
          suggestions = r.suggestions;
          meta = `\u7F51\u7EDC\u6216\u63A5\u53E3\u4E0D\u53EF\u7528\uFF0C\u5DF2\u5207\u6362\u672C\u5730\u77E5\u8BC6\u5E93\u4F5C\u7B54\uFF08${err.message}\uFF09`;
        }
      } else {
        await new Promise((r2) => setTimeout(r2, reducedMotion2 ? 0 : 650));
        const r = answer(index, q);
        text = r.answer;
        suggestions = r.suggestions;
        meta = r.hit ? `\u672C\u5730\u77E5\u8BC6\u5E93 \xB7 \u5206\u7C7B\u300C${r.entry.cat}\u300D \xB7 \u5339\u914D\u5EA6 ${r.score.toFixed(2)}` : r.reason === "low-coverage" ? `\u672C\u5730\u77E5\u8BC6\u5E93 \xB7 \u95EE\u9898\u91CC\u7684\u5927\u90E8\u5206\u8BCD\u77E5\u8BC6\u5E93\u8FD8\u4E0D\u8BA4\u8BC6\uFF08\u8986\u76D6\u7387 ${Math.round(r.coverage * 100)}%\uFF09` : `\u672C\u5730\u77E5\u8BC6\u5E93 \xB7 \u672A\u627E\u5230\u8DB3\u591F\u76F8\u8FD1\u7684\u8D44\u6599\uFF08\u6700\u9AD8\u5339\u914D\u5EA6 ${r.score.toFixed(2)}\uFF09`;
      }
      waiting.remove();
      const p = el("p", "slip-text");
      body.append(p);
      await typewrite(p, text);
      if (meta) body.append(el("p", "slip-meta", meta));
      if (suggestions.length) body.append(suggestionRow(suggestions));
      body.append(el("p", "slip-sign", "\u2014\u2014 \u85AA\u706B\u7535\u62A5\u5C40 \xB7 \u5C0F\u7EA2"));
      scrollLog();
      busy = false;
      sendBtn.disabled = false;
    }
    PRESETS.forEach((q) => {
      const b = el("button", "chip", q);
      b.type = "button";
      b.addEventListener("click", () => ask(q));
      chips.append(b);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      ask(input.value);
    });
    (() => {
      const { body } = slip("in");
      body.append(
        el("p", "slip-text", "\u540C\u5B66\u4F60\u597D\uFF0C\u6211\u662FAI\u8BB2\u89E3\u5458\u201C\u5C0F\u7EA2\u201D\u3002\u5173\u4E8E\u957F\u5F81\u6E56\u5357\u6BB5\u3001\u6C5D\u57CE\u6C99\u6D32\u3001\u6E58\u6C5F\u6218\u5F79\u3001\u901A\u9053\u8F6C\u5175\u3001\u6851\u690D\u51FA\u53D1\u548C\u957F\u5F81\u7CBE\u795E\uFF0C\u90FD\u53EF\u4EE5\u53D1\u62A5\u95EE\u6211\u3002"),
        el("p", "slip-sign", "\u2014\u2014 \u85AA\u706B\u7535\u62A5\u5C40 \xB7 \u5C0F\u7EA2")
      );
    })();
    const f = {
      enabled: $("#llmEnabled", dialog),
      base: $("#llmBase", dialog),
      key: $("#llmKey", dialog),
      model: $("#llmModel", dialog),
      tip: $("#llmTip", dialog)
    };
    dialog.addEventListener("toggle", () => {
      if (!dialog.open) return;
      const cfg = loadCfg();
      f.enabled.checked = cfg.enabled;
      f.base.value = cfg.base;
      f.key.value = cfg.key;
      f.model.value = cfg.model;
      f.tip.textContent = "";
    });
    $("#llmCancel", dialog).addEventListener("click", () => {
      dialog.open = false;
    });
    $("#llmClear", dialog).addEventListener("click", () => {
      localStorage.removeItem(LS_KEY);
      f.enabled.checked = false;
      f.base.value = f.key.value = f.model.value = "";
      f.tip.textContent = "\u5DF2\u6E05\u9664\uFF0C\u672C\u673A\u4E0D\u518D\u4FDD\u5B58\u4EFB\u4F55\u5BC6\u94A5\u3002";
      refreshMode();
    });
    $("#llmForm", dialog).addEventListener("submit", (e) => {
      e.preventDefault();
      const cfg = {
        enabled: f.enabled.checked,
        base: f.base.value.trim(),
        key: f.key.value.trim(),
        model: f.model.value.trim()
      };
      if (cfg.enabled && (!/^https?:\/\/\S+$/i.test(cfg.base) || !cfg.key || !cfg.model)) {
        f.tip.textContent = "\u5F00\u542F\u5927\u6A21\u578B\u6A21\u5F0F\u9700\u8981\u586B\u5199\u5B8C\u6574\uFF1A\u4EE5 http(s):// \u5F00\u5934\u7684\u63A5\u53E3\u5730\u5740\u3001\u5BC6\u94A5\u548C\u6A21\u578B\u540D\u3002";
        return;
      }
      saveCfg(cfg);
      refreshMode();
      dialog.open = false;
    });
  }

  // js/relay-store.js
  var KEY = "xhxz.relay.v1";
  var SEEDED_KEY = "xhxz.relay.seeded";
  var SAMPLES = [
    { name: "\u5C0F\u6E58", major: "\u8BA1\u7B97\u673A\u79D1\u5B66\u4E0E\u6280\u672F 2401", goal: "\u628A\u7F51\u9875\u5927\u8D5B\u4F5C\u54C1\u505A\u5230\u51B3\u8D5B\uFF0C\u7528\u4EE3\u7801\u8BB2\u597D\u5BB6\u4E61\u7684\u7EA2\u8272\u6545\u4E8B" },
    { name: "\u963F\u79BE", major: "\u673A\u68B0\u8BBE\u8BA1\u5236\u9020\u53CA\u5176\u81EA\u52A8\u5316", goal: "\u4ECA\u5E74\u62FF\u4E0B\u5927\u5B66\u82F1\u8BED\u516D\u7EA7\uFF0C\u518D\u53BB\u6C5D\u57CE\u6C99\u6D32\u770B\u4E00\u770B" },
    { name: "\u6668\u5149", major: "\u7535\u6C14\u5DE5\u7A0B\u53CA\u5176\u81EA\u52A8\u5316 2302", goal: "\u575A\u6301\u6BCF\u5929\u8DD1\u6B65\u4E09\u516C\u91CC\uFF0C\u8DD1\u5B8C\u4E00\u6B21\u534A\u7A0B\u9A6C\u62C9\u677E" },
    { name: "\u661F\u706B", major: "\u8F6F\u4EF6\u5DE5\u7A0B 2403", goal: "\u5B66\u4F1A\u4E00\u95E8\u65B0\u8BED\u8A00\uFF0C\u72EC\u7ACB\u505A\u51FA\u4E00\u4E2A\u5BF9\u540C\u5B66\u6709\u7528\u7684\u5C0F\u7A0B\u5E8F" },
    { name: "\u5357\u5CB3", major: "\u571F\u6728\u5DE5\u7A0B 2301", goal: "\u8003\u7814\u4E0A\u5CB8\uFF0C\u5C06\u6765\u53BB\u5EFA\u8BBE\u5BB6\u4E61\u7684\u8DEF\u548C\u6865" },
    { name: "\u82B7\u5170", major: "\u4F1A\u8BA1\u5B66 2402", goal: "\u53C2\u52A0\u4E00\u6B21\u652F\u6559\uFF0C\u628A\u957F\u5F81\u6545\u4E8B\u8BB2\u7ED9\u5C71\u91CC\u7684\u5B69\u5B50\u542C" },
    { name: "\u8FDC\u65B9", major: "\u6C7D\u8F66\u670D\u52A1\u5DE5\u7A0B", goal: "\u62FF\u5230\u9A7E\u9A76\u8BC1\uFF0C\u6691\u5047\u9A91\u884C\u53BB\u901A\u9053\u8F6C\u5175\u7EAA\u5FF5\u9986" },
    { name: "\u9752\u7AF9", major: "\u6570\u636E\u79D1\u5B66\u4E0E\u5927\u6570\u636E\u6280\u672F 2401", goal: "\u7528\u6570\u636E\u53EF\u89C6\u5316\u505A\u4E00\u5F20\u66F4\u51C6\u786E\u7684\u6E56\u5357\u957F\u5F81\u5730\u56FE" }
  ];
  function read() {
    try {
      const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function write(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
  }
  function createLocalStore() {
    if (!localStorage.getItem(SEEDED_KEY)) {
      const now = Date.now();
      const seeds = SAMPLES.map((s, i) => ({
        no: i + 1,
        ...s,
        time: new Date(now - (SAMPLES.length - i) * 864e5 * 0.7).toISOString(),
        sample: true
      }));
      write([...seeds, ...read().filter((e) => !e.sample)]);
      localStorage.setItem(SEEDED_KEY, "1");
    }
    return {
      async list() {
        return read().sort((a, b) => a.no - b.no);
      },
      async add({ name, major, goal }) {
        const all = read();
        const no = all.reduce((m, e) => Math.max(m, Number(e.no) || 0), 0) + 1;
        const entry = { no, name, major, goal, time: (/* @__PURE__ */ new Date()).toISOString() };
        all.push(entry);
        write(all);
        return entry;
      },
      async clearSamples() {
        write(read().filter((e) => !e.sample));
      }
    };
  }

  // js/relay.js
  var store = createLocalStore();
  var LIMITS = { name: [1, 12], major: [1, 20], goal: [4, 40] };
  var C2 = { red: "#B3261E", redDeep: "#8E1D17", paper: "#F4EDE1", paperDark: "#E9DFCD", ink: "#1F1A17", inkSoft: "#5A4E45", gold: "#C9A45C" };
  var SERIF = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif';
  var SANS = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  function clean(str) {
    return String(str || "").replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202E\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  }
  var len = (s) => [...s].length;
  function validate(raw) {
    const data = { name: clean(raw.name), major: clean(raw.major), goal: clean(raw.goal) };
    const label = { name: "\u6635\u79F0", major: "\u4E13\u4E1A/\u73ED\u7EA7", goal: "\u201C\u65B0\u957F\u5F81\u201D\u76EE\u6807" };
    const errors = {};
    for (const k of Object.keys(LIMITS)) {
      const [min, max] = LIMITS[k];
      const n = len(data[k]);
      if (n < min) errors[k] = min === 1 ? `\u8BF7\u586B\u5199${label[k]}` : `${label[k]}\u81F3\u5C11 ${min} \u4E2A\u5B57`;
      else if (n > max) errors[k] = `${label[k]}\u6700\u591A ${max} \u4E2A\u5B57\uFF08\u73B0\u5728 ${n} \u4E2A\uFF09`;
    }
    return { ok: Object.keys(errors).length === 0, data, errors };
  }
  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
  }
  function wrap(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
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
    return `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5`;
  }
  var pad4 = (n) => String(n).padStart(4, "0");
  var TIMELINE = chapters.filter((ch) => ch.inRoute).map((ch) => ({ name: [...ch.mapLabel].slice(0, 2).join(""), year: (String(ch.date).match(/(\d{4})年/) || [, ""])[1] }));
  function drawPoster(canvas, e) {
    const W = 1080, H = 1440;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const rnd = seeded(e.no * 97 + 13);
    ctx.fillStyle = C2.paper;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9e3; i++) {
      ctx.fillStyle = `rgba(90,70,50,${rnd() * 0.07})`;
      ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
    }
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, H * 0.8);
    vg.addColorStop(0, "rgba(170,140,95,0)");
    vg.addColorStop(1, "rgba(170,140,95,0.28)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C2.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 60, W - 120, H - 120);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C2.inkSoft;
    ctx.font = `500 28px ${SERIF}`;
    ctx.fillText("\u7EAA\u5FF5\u4E2D\u56FD\u5DE5\u519C\u7EA2\u519B\u957F\u5F81\u80DC\u522990\u5468\u5E74 \xB7 1936\u20142026", W / 2, 128);
    ctx.fillStyle = C2.ink;
    ctx.fillRect(110, 150, W - 220, 4);
    ctx.fillRect(110, 160, W - 220, 1.5);
    ctx.font = `900 124px ${SERIF}`;
    const parts = [["\u300A", C2.red], ["\u85AA\u706B", C2.ink], ["\xB7", C2.gold], ["\u6E58\u5F81", C2.ink], ["\u300B", C2.red]];
    const total = parts.reduce((w, [t]) => w + ctx.measureText(t).width, 0);
    let x = (W - total) / 2;
    ctx.textAlign = "left";
    for (const [t, color] of parts) {
      ctx.fillStyle = color;
      ctx.fillText(t, x, 312);
      x += ctx.measureText(t).width;
    }
    ctx.textAlign = "center";
    ctx.fillStyle = C2.red;
    ctx.fillRect(110, 360, W - 220, 84);
    ctx.fillStyle = C2.paper;
    ctx.font = `700 46px ${SERIF}`;
    ctx.fillText("\u9752 \u6625 \u63A5 \u529B \xB7 \u85AA \u706B \u76F8 \u4F20", W / 2, 418);
    const noText = pad4(e.no);
    ctx.font = `900 132px ${SERIF}`;
    const noW = ctx.measureText(noText).width;
    ctx.font = `700 40px ${SERIF}`;
    const preW = ctx.measureText("\u7B2C").width;
    const sufW = ctx.measureText("\u4F4D\u63A5\u529B\u8005").width;
    const gap = 22;
    let cx = (W - (preW + gap + noW + gap + sufW)) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = C2.ink;
    ctx.fillText("\u7B2C", cx, 580);
    cx += preW + gap;
    ctx.fillStyle = C2.red;
    ctx.font = `900 132px ${SERIF}`;
    ctx.fillText(noText, cx, 590);
    cx += noW + gap;
    ctx.fillStyle = C2.ink;
    ctx.font = `700 40px ${SERIF}`;
    ctx.fillText("\u4F4D\u63A5\u529B\u8005", cx, 580);
    ctx.textAlign = "center";
    ctx.fillStyle = C2.ink;
    ctx.font = `900 64px ${SERIF}`;
    ctx.fillText(e.name, W / 2, 700);
    ctx.fillStyle = C2.inkSoft;
    ctx.font = `400 32px ${SANS}`;
    ctx.fillText(e.major, W / 2, 756);
    ctx.strokeStyle = C2.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(130, 810, W - 260, 300);
    ctx.fillStyle = C2.paper;
    ctx.fillRect(W / 2 - 130, 790, 260, 40);
    ctx.fillStyle = C2.red;
    ctx.font = `700 32px ${SERIF}`;
    ctx.fillText("\u6211 \u7684 \u65B0 \u957F \u5F81", W / 2, 822);
    ctx.font = `700 52px ${SERIF}`;
    const lines = wrap(ctx, `\u201C${e.goal}\u201D`, W - 340).slice(0, 4);
    const lh = 70;
    const startY = 960 - (lines.length - 1) * lh / 2 + 18;
    ctx.fillStyle = C2.ink;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh));
    const stops = [...TIMELINE, { name: "\u6211", year: "\u4ECA\u5929", me: true }];
    const x0 = 170, x1 = W - 170, ty = 1212;
    const xs = stops.map((_, i) => x0 + (x1 - x0) * i / (stops.length - 1));
    ctx.lineCap = "round";
    ctx.strokeStyle = C2.red;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(xs[0], ty);
    ctx.lineTo(xs[stops.length - 2], ty);
    ctx.stroke();
    ctx.strokeStyle = C2.gold;
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
      ctx.fillStyle = st.me ? C2.red : C2.paper;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = C2.red;
      ctx.stroke();
      ctx.fillStyle = st.me ? C2.red : C2.ink;
      ctx.font = `900 36px ${SERIF}`;
      ctx.fillText(st.name, px, ty - 30);
      ctx.fillStyle = st.me ? C2.red : C2.inkSoft;
      ctx.font = `700 26px ${SERIF}`;
      ctx.fillText(st.year, px, ty + 52);
    });
    ctx.fillStyle = C2.ink;
    ctx.fillRect(110, 1296, W - 220, 1.5);
    ctx.textAlign = "left";
    ctx.font = `400 28px ${SERIF}`;
    ctx.fillStyle = C2.inkSoft;
    ctx.fillText(fmtDate(e.time), 116, 1336);
    ctx.font = `400 26px ${SERIF}`;
    ctx.fillText("\u7801\u627F\u957F\u5F81\u85AA\u706B\uFF0C\u9875\u7ED8\u9752\u6625\u5F81\u9014", 116, 1368);
    ctx.save();
    ctx.translate(W - 170, 1338);
    ctx.rotate(-0.07);
    ctx.fillStyle = C2.red;
    ctx.fillRect(-34, -34, 68, 68);
    ctx.strokeStyle = C2.paper;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-28, -28, 56, 56);
    ctx.fillStyle = C2.paper;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 42px ${SERIF}`;
    ctx.fillText("\u6E58", 0, 2);
    ctx.restore();
  }
  function el2(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function card(e, isNew) {
    const c = el2("article", `relay-card${e.sample ? " is-sample" : ""}${isNew ? " is-new" : ""}`);
    const top = el2("header", "relay-card-top");
    top.append(el2("span", "relay-no", `No.${pad4(e.no)}`), el2("span", "relay-date", fmtDate(e.time)));
    c.append(top, el2("p", "relay-goal", e.goal));
    const who = el2("p", "relay-who");
    who.append(el2("strong", "", e.name), el2("span", "", ` \xB7 ${e.major}`));
    c.append(who);
    if (e.sample) c.append(el2("span", "relay-stamp", "\u793A\u4F8B"));
    return c;
  }
  var countToken = 0;
  function animateCount(node, from, to, reducedMotion2) {
    const token = ++countToken;
    if (reducedMotion2 || from === to) {
      node.textContent = String(to);
      return;
    }
    const t0 = performance.now();
    const dur = Math.min(600, 250 + Math.abs(to - from) * 60);
    const step = (t) => {
      if (token !== countToken) return;
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  var RELAY_URL = "https://wellingtonbrito482-prog.github.io/xinhuo-xiangzheng/#relay";
  function renderQR() {
    const make = window.qrcode;
    const boxes = document.querySelectorAll("[data-qr]");
    if (!make || !boxes.length) return;
    const qr = make(0, "M");
    qr.addData(RELAY_URL);
    qr.make();
    const n = qr.getModuleCount();
    const q = 2;
    let d = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q},${r + q}h1v1h-1z`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges" role="img" aria-label="\u4E8C\u7EF4\u7801\uFF1A${RELAY_URL}"><rect width="100%" height="100%" fill="${C2.paper}"/><path d="${d}" fill="${C2.ink}"/></svg>`;
    boxes.forEach((b) => {
      b.innerHTML = svg;
    });
  }
  async function initRelay({ reducedMotion: reducedMotion2 }) {
    const root = document.getElementById("relay");
    if (!root) return;
    const form = root.querySelector("#relayForm");
    const canvas = root.querySelector("#posterCanvas");
    const dlBtn = root.querySelector("#posterDownload");
    const status = root.querySelector("#relayStatus");
    const wall = root.querySelector("#relayWall");
    const countEl = root.querySelector("#relayCount");
    const clearBtn = root.querySelector("#relayClearSamples");
    const fields = ["name", "major", "goal"].map((k) => form.elements[k]);
    let entries = [];
    let shown = 0;
    let counted = false;
    let lastSubmit = 0;
    let current = null;
    const nextNo = () => entries.reduce((m, e) => Math.max(m, e.no), 0) + 1;
    function renderWall(newNo) {
      wall.replaceChildren(...[...entries].reverse().slice(0, 60).map((e) => card(e, e.no === newNo)));
      clearBtn.hidden = !entries.some((e) => e.sample);
      animateCount(countEl, shown, entries.length, reducedMotion2);
      shown = entries.length;
    }
    function preview() {
      const v = { name: clean(fields[0].value), major: clean(fields[1].value), goal: clean(fields[2].value) };
      drawPoster(canvas, {
        no: nextNo(),
        name: [...v.name || "\u4F60\u7684\u6635\u79F0"].slice(0, 12).join(""),
        major: [...v.major || "\u4E13\u4E1A / \u73ED\u7EA7"].slice(0, 20).join(""),
        goal: [...v.goal || "\u5728\u8FD9\u91CC\u5199\u4E0B\u4F60\u7684\u65B0\u957F\u5F81\u76EE\u6807"].slice(0, 40).join(""),
        time: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    fields.forEach((f) => {
      const counter = root.querySelector(`[data-count-for="${f.name}"]`);
      const update = () => {
        if (counter) counter.textContent = `${len(f.value.trim())}/${LIMITS[f.name][1]}`;
        f.removeAttribute("aria-invalid");
        root.querySelector(`[data-error-for="${f.name}"]`).textContent = "";
      };
      f.addEventListener("input", () => {
        update();
        dlBtn.disabled = true;
        current = null;
        preview();
      });
      update();
    });
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const { ok, data, errors } = validate(Object.fromEntries(fields.map((f) => [f.name, f.value])));
      fields.forEach((f) => {
        const msg = errors[f.name] || "";
        root.querySelector(`[data-error-for="${f.name}"]`).textContent = msg;
        if (msg) f.setAttribute("aria-invalid", "true");
        else f.removeAttribute("aria-invalid");
      });
      if (!ok) {
        fields.find((f) => errors[f.name]).focus();
        return;
      }
      if (Date.now() - lastSubmit < 5e3) {
        status.textContent = "\u63D0\u4EA4\u592A\u5FEB\u5566\uFF0C\u8BF7\u7A0D\u7B49\u51E0\u79D2\u518D\u8BD5\u3002";
        return;
      }
      lastSubmit = Date.now();
      try {
        current = await store.add(data);
        entries = await store.list();
        drawPoster(canvas, current);
        dlBtn.disabled = false;
        status.textContent = `\u63A5\u529B\u6210\u529F\uFF01\u4F60\u662F\u7B2C ${pad4(current.no)} \u4F4D\u63A5\u529B\u8005\uFF0C\u6D77\u62A5\u5DF2\u751F\u6210\u3002`;
        renderWall(current.no);
      } catch (err) {
        console.warn(err);
        status.textContent = "\u4FDD\u5B58\u5931\u8D25\uFF1A\u6D4F\u89C8\u5668\u53EF\u80FD\u7981\u7528\u4E86\u672C\u5730\u5B58\u50A8\u3002\u6D77\u62A5\u4ECD\u53EF\u4E0B\u8F7D\u3002";
        current = { ...data, no: nextNo(), time: (/* @__PURE__ */ new Date()).toISOString() };
        drawPoster(canvas, current);
        dlBtn.disabled = false;
      }
    });
    dlBtn.addEventListener("click", () => {
      if (!current) return;
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `\u85AA\u706B\u6E58\u5F81-\u63A5\u529B\u6D77\u62A5-${pad4(current.no)}.png`;
      document.body.append(a);
      a.click();
      a.remove();
    });
    clearBtn.addEventListener("click", async () => {
      await store.clearSamples();
      entries = await store.list();
      renderWall();
      preview();
    });
    const io = new IntersectionObserver((list) => {
      if (list.some((x) => x.isIntersecting) && !counted) {
        counted = true;
        if (!reducedMotion2) countEl.classList.add("is-pop");
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(countEl);
    entries = await store.list();
    shown = entries.length;
    countEl.textContent = String(entries.length);
    renderWall();
    preview();
    renderQR();
  }

  // js/main.js
  var { gsap: gsap3, ScrollTrigger: ScrollTrigger2, echarts: echarts2, scrollama: scrollama2 } = window;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  async function loadJSON(url) {
    const key = url.split("/").pop().replace(".json", "");
    const pre = window.__XH_DATA && window.__XH_DATA[key];
    if (pre) return pre;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`\u52A0\u8F7D\u5931\u8D25\uFF1A${url}\uFF08${res.status}\uFF09`);
    return res.json();
  }
  function initNav() {
    const topbar = document.getElementById("topbar");
    const links = [...document.querySelectorAll(".nav a")];
    const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const nightSections = [...document.querySelectorAll(".is-night")];
    const fuse = document.getElementById("fuseBar");
    let ticking = false;
    const update = () => {
      ticking = false;
      topbar.classList.toggle("is-scrolled", window.scrollY > 10);
      const probe = topbar.offsetHeight + 1;
      const onNight = nightSections.some((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= probe && r.bottom > probe;
      });
      topbar.classList.toggle("on-night", onNight);
      if (fuse) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        fuse.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => io.observe(s));
  }
  async function main() {
    if (!gsap3 || !ScrollTrigger2 || !echarts2 || !scrollama2) {
      console.warn("\u7B2C\u4E09\u65B9\u5E93\u672A\u5B8C\u6574\u52A0\u8F7D\uFF0C\u8BF7\u68C0\u67E5 vendor/ \u76EE\u5F55");
      return;
    }
    gsap3.registerPlugin(ScrollTrigger2);
    initNav();
    initHero({ reducedMotion });
    initQA({ reducedMotion }).catch((err) => console.warn("\u95EE\u7B54\u6A21\u5757\u521D\u59CB\u5316\u5931\u8D25", err));
    initRelay({ reducedMotion }).catch((err) => console.warn("\u63A5\u529B\u6A21\u5757\u521D\u59CB\u5316\u5931\u8D25", err));
    try {
      const [hunanGeo, neighborsGeo] = await Promise.all([
        loadJSON("data/hunan.json"),
        loadJSON("data/neighbors.json")
      ]);
      const story = initStorymap({ hunanGeo, neighborsGeo, reducedMotion });
      initAutoplay({ ...story, reducedMotion });
    } catch (err) {
      document.getElementById("mapCaption").textContent = "\u5730\u56FE\u6570\u636E\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u7528\u672C\u5730\u670D\u52A1\u5668\u6253\u5F00\uFF08\u89C1 README\uFF09";
      console.warn(err);
    }
    ScrollTrigger2.refresh();
    if (location.hash.startsWith("#step-")) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
        window.scrollTo({ top, behavior: "auto" });
      }
    }
  }
  main();
})();
