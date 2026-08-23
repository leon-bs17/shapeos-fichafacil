'use client'

import { Turnstile } from '@marsidev/react-turnstile'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function Captcha({ onToken }: { onToken: (token: string) => void }) {
  if (!SITE_KEY) return null

  return (
    <div className="flex justify-center">
      <Turnstile
        siteKey={SITE_KEY}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken('')}
        options={{ theme: 'light', size: 'normal' }}
      />
    </div>
  )
}

export function captchaAtivo() {
  return !!SITE_KEY
}
