import { Buffer } from 'node:buffer'
import chunk1 from '@/app/admin/(dashboard)/aprovacoes/personais-hq-1'
import rest from '@/app/admin/(dashboard)/aprovacoes/personais-hq-rest'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

const imageBytes = Buffer.from(`${chunk1}${rest}`, 'base64')

export async function GET() {
  return new Response(imageBytes, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
