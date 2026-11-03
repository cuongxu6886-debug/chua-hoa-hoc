#!/bin/bash
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
[ -f cau-hinh.json ] || cp cau-hinh.mau.json cau-hinh.json
node cau-noi.mjs
