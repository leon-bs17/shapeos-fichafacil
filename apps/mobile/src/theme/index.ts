export const colors = {
  background: '#070b12',
  surface: '#0f1623',
  surfaceElevated: '#141d2c',
  surfaceSubtle: '#0b111b',
  border: '#1e293b',
  borderSoft: '#172033',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textFaint: '#475569',
  primary: '#10b981',
  primaryStrong: '#059669',
  primaryInk: '#022c22',
  primarySoft: 'rgba(16, 185, 129, 0.12)',
  primaryBorder: 'rgba(16, 185, 129, 0.28)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  danger: '#f87171',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const

export const typography = {
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.7 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.35 },
  subtitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.8 },
  caption: { fontSize: 12, lineHeight: 17 },
} as const
