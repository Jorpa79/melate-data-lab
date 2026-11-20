const CACHE='melate-data-lab-v2.1.1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('melate-data-lab-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  // Nunca interceptar Apps Script ni otros servicios externos.
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const fresh=await fetch(request,{cache:'no-store'});
      if(fresh&&fresh.ok)cache.put(request,fresh.clone());
      return fresh;
    }catch(error){
      const cached=await cache.match(request);
      if(cached)return cached;
      throw error;
    }
  })());
});
