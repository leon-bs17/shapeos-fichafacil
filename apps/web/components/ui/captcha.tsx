'use client'

import { Turnstile } from '@marsidev/react-turnstile'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function Captcha({ onToken, theme = 'light', size = 'normal' }: {
  onToken: (token: string) => void
  theme?: 'light' | 'dark'
  size?: 'normal' | 'flexible'
}) {
  if (!SITE_KEY) return null

  return (
    <div className="flex w-full min-w-0 justify-center">
      <Turnstile
        key={theme}
        siteKey={SITE_KEY}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken('')}
        options={{ theme, size }}
      />
    </div>
  )
}

export function captchaAtivo() {
  return !!SITE_KEY
}
