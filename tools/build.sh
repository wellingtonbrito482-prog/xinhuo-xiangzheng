#!/bin/sh
# 把 ES Module 源码打成经典脚本，让 index.html 双击即可打开（file:// 不支持 type=module）
# 需要 esbuild：npx esbuild ...
cd "$(dirname "$0")/.."
npx esbuild js/main.js --bundle --format=iife --target=es2019 --outfile=js/bundle-main.js
npx esbuild js/detail.js --bundle --format=iife --target=es2019 --outfile=js/bundle-detail.js
