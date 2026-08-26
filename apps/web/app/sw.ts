/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import {
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
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
            handler: new StaleWhileRevalidate({
              cacheName: 'supabase-rest',
              plugins: [
                new CacheableResponsePlugin({ statuses: [200] }),
                new ExpirationPlugin({
                  maxEntries: 200,
                  maxAgeSeconds: 7 * 24 * 60 * 60,
                }),
              ],
              matchOptions: { ignoreVary: true },
            }),
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

serwist.addEventListeners()
