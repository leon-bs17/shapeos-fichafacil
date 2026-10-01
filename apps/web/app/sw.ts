/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import {
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  NetworkOnly,
} from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Record<string, string> | undefined
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const precacheManifest = self.__SW_MANIFEST

const serwist = new Serwist({
  precacheEntries: [
    ...(precacheManifest ? Object.values(precacheManifest) : []),
    { url: '/offline.html', revision: '1' },
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...(supabaseUrl
      ? [
          {
            matcher: new RegExp(`^${supabaseUrl}/rest/v1/.*`),
            method: 'GET' as const,
            // Authenticated responses must never be shared across accounts.
            handler: new NetworkOnly(),
          },
        ]
      : []),
    {
      matcher: ({ request, url }) =>
        request.mode === 'navigate' && url.origin === self.location.origin,
      method: 'GET' as const,
      handler: new NetworkFirst({
        cacheName: 'paginas',
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline.html',
        matcher: ({ request }) => request.mode === 'navigate',
      },
    ],
  },
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.delete('supabase-rest'))
})

serwist.addEventListeners()
