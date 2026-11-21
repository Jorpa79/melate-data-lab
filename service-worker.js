const CACHE='melate-data-lab-v2.6.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(ASSETS);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('melate-data-lab-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const r=event.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;event.respondWith((async()=>{const c=await caches.open(CACHE);try{const fresh=await fetch(r,{cache:'no-store'});if(fresh&&fresh.ok)c.put(r,fresh.clone());return fresh;}catch(e){const old=await c.match(r);if(old)return old;throw e;}})());});
