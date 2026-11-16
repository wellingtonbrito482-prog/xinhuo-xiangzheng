// 由 kb.json 生成 kb.js（双击 index.html 时用），GitHub Actions 自动运行
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('js/data/kb.json', 'utf8'));
fs.writeFileSync('js/data/kb.js', '/* 自动生成，供双击 index.html（file://）直接打开时使用；源文件 kb.json */\n(window.__XH_DATA = window.__XH_DATA || {})[\'kb\'] = ' + JSON.stringify(j, null, 1) + ';\n');
