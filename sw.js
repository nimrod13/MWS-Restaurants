const staticCacheName = 'mws-restaurant-v1';
const staticCacheNameReviews = 'mws-reviews-v1';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(staticCacheName).then(cache => {
            return cache.addAll([
                '/',
                '/restaurant.html',
                '/styles/styles.min.css',
                '/images/',
                '/images/fallback.png',
                '/scripts/',
                '/scripts/main.js',
                '/scripts/idb.min.js',
                '/scripts/dbhelper.js',
                '/scripts/restaurant_info.js',
                '/scripts/registersw.js'
            ]);
        }).catch(e => {
            console.log(`Cache opening failed: ${e}`);
        })
    );
});

self.addEventListener('fetch', event => {
    let cacheRequest = event.request;
    let requestUrl = new URL(event.request.url);
    requestUrl.port !== "1337" && handleNonAPIRequests(event, cacheRequest);
});

const handleNonAPIRequests = (event, cacheRequest) => {
    event.respondWith(
        caches.match(cacheRequest, { ignoreSearch: true })
            .then(response => {
                const fetchRequest = cacheRequest.clone();

                return response ||
                    fetch(fetchRequest)
                        .then(response => {
                            // Check if we received a valid response
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }

                            const responseToCache = response.clone();

                            caches.open(staticCacheName)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });

                            return response;
                        })
                        .catch(e => {
                            if (event.request.url.indexOf(".webp") > -1) {
                                return caches.match("images/fallback.png");
                            }

                            console.log(`Error connecting to the application: ${e}. Please check your internet connection.`);
                            return new Response("Application is offline. Please check your connection or try again later.",
                                {
                                    status: 404,
                                    statusText: "Application is offline. Please check your connection or try again later."
                                });
                        });
            })
    );
};

self.addEventListener('activate',
    event => {
        const expectedCaches = [staticCacheName, staticCacheNameReviews];

        event.waitUntil(
            caches.keys().then(keys => Promise.all(
                keys.map(key => {
                    if (!expectedCaches.includes(key)) {
                        return caches.delete(key);
                    }
                })
            )).then(() => self.clients.claim())
        );
    });
