'use client'

import { Turnstile } from '@marsidev/react-turnstile'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function Captcha({ onToken, theme = 'light', size = 'normal', appearance = 'always' }: {
  onToken: (token: string) => void
  theme?: 'light' | 'dark'
  size?: 'normal' | 'flexible' | 'compact'
  appearance?: 'always' | 'interaction-only'
}) {
  if (!SITE_KEY) return null

  return (
    <div className="flex w-full min-w-0 justify-center">
      <Turnstile
        key={`${theme}-${size}-${appearance}`}
        siteKey={SITE_KEY}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken('')}
        onError={() => { onToken('') }}
        onTimeout={() => onToken('')}
        onUnsupported={() => onToken('')}
        onBeforeInteractive={() => onToken('')}
        options={{ theme, size, appearance }}
      />
    </div>
  )
}

export function captchaAtivo() {
  return !!SITE_KEY
}
