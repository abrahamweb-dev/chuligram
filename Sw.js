const CACHE_NAME = "chuligram-v1";

const FILES = [
    "./",
    "./Index.html",
    "./Style.css",
    "./App.js",
    "./Manifest.json",

    "./Pages/Home.html",
    "./Pages/Chat.html",
    "./Pages/Contacts.html",
    "./Pages/Profile.html",
    "./Pages/Search.html",
    "./Pages/Settings.html",

    "./Icon-192.png",
    "./Icon-512.png",
    "./Logo-avatar.png"
];


self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
    );
    self.skipWaiting();
});


self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});


self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cached =>
            cached ||
            fetch(event.request).catch(() => caches.match("./Index.html"))
        )
    );
});
