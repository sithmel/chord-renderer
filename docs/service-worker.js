// Service Worker for Chord Generator - Offline Support
// Cache versioning: increment CACHE_VERSION when deploying updates
const CACHE_VERSION = 'v1';
const CACHE_NAME = `chord-generator-${CACHE_VERSION}`;

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './bundle.js',
  './style.css',
  './favicon.svg',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

// Google Fonts URLs to cache (fetched dynamically)
const FONT_CACHE_NAME = `chord-generator-fonts-${CACHE_VERSION}`;

/**
 * Install event - pre-cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Delete old caches that don't match current version
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('chord-generator-') && 
                     cacheName !== CACHE_NAME && 
                     cacheName !== FONT_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - serve from cache or network with different strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle Google Fonts specially (cache-first)
  if (url.origin === 'https://fonts.googleapis.com' || 
      url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(handleFontRequest(request));
    return;
  }
  
  // Handle HTML files (network-first with cache fallback)
  if (request.headers.get('accept')?.includes('text/html') || 
      url.pathname.endsWith('.html') || 
      url.pathname === '/' || 
      url.pathname === './') {
    event.respondWith(handleHTMLRequest(request));
    return;
  }
  
  // Handle static assets (stale-while-revalidate)
  event.respondWith(handleStaticRequest(request));
});

/**
 * Network-first strategy for HTML
 * Online: Fetch from network → Update cache → Serve
 * Offline: Serve from cache
 * 
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleHTMLRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, update cache
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[Service Worker] Network failed, serving from cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // No cache available, return error
    return new Response('Offline and no cached version available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Stale-while-revalidate strategy for static assets
 * Online: Serve from cache immediately → Update cache in background
 * Offline: Serve from cache
 * 
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network error, no update needed
      console.log('[Service Worker] Background fetch failed for:', request.url);
    });
  
  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Cache-first strategy for fonts
 * Online: Serve from cache if available → Fetch and cache if not
 * Offline: Serve from cache
 * 
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleFontRequest(request) {
  const cache = await caches.open(FONT_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Font fetch failed:', request.url);
    
    // Return a basic response to prevent breaking the page
    return new Response('', {
      status: 503,
      statusText: 'Font unavailable offline',
    });
  }
}

/**
 * Message event handler for communication with clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
