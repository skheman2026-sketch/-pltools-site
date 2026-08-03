/* 验盘师 PWA Service Worker v1：壳 cache-first，数据 network-first（失败回缓存）。
   注意：数据完整性由页面层 sha256 校验（manifest 清单），SW 只管可用性。*/
"use strict";
const SHELL = "pltools-shell-v1";
const DATA = "pltools-data-v1";
const SHELL_FILES = ["./", "./index.html", "./app.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== "GET") return;
  const isData = url.pathname.endsWith("manifest.json") || url.pathname.includes("/snapshots/");
  if (isData) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(DATA).then((c) => c.put(e.request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  }
});
