// memlog.js - write Node memory stats periodically (async, low overhead)
"use strict";

const v8 = require("v8");
const fs = require("fs");
const path = require("path");

const LOG_DIR = "/root/claude-relay-service/app/logs";
const LOG_FILE = path.join(LOG_DIR, "mem.log");

// ensure logs dir exists
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (_) {
  // ignore
}

function mb(n) {
  return Math.round(n / 1024 / 1024);
}

function line() {
  const m = process.memoryUsage();
  const hs = v8.getHeapStatistics();

  // ISO time + single line, easy to grep/parse
  return (
    `${new Date().toISOString()} [mem] ` +
    `rss=${mb(m.rss)}MB ` +
    `heapUsed=${mb(m.heapUsed)}MB ` +
    `heapTotal=${mb(m.heapTotal)}MB ` +
    `external=${mb(m.external)}MB ` +
    `arrayBuffers=${mb(m.arrayBuffers || 0)}MB ` +
    `heap_limit=${mb(hs.heap_size_limit)}MB` +
    `\n`
  );
}

// write once immediately so you know it’s working
(function writeNow() {
  const s = line();
  fs.appendFile(LOG_FILE, s, (e) => {
    if (e) console.log(s.trim());
  });
})();

// then every 60s
setInterval(() => {
  const s = line();
  fs.appendFile(LOG_FILE, s, (e) => {
    // if file write fails, fallback to stdout (journal)
    if (e) console.log(s.trim());
  });
}, 360_000).unref();