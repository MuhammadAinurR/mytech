/**
 * A short, human name for the device a subscription came from, e.g.
 * "iPhone · Safari" or "Mac · Chrome". Only for display in Settings.
 */
export function deviceLabel(userAgent: string | undefined): string {
  if (!userAgent) return 'This browser'
  const ua = userAgent

  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux/.test(ua)
              ? 'Linux'
              : null

  // Order matters: Edge and Chrome both say "Safari"; iOS browsers say "CriOS" etc.
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /CriOS|Chrome\//.test(ua)
      ? 'Chrome'
      : /FxiOS|Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : null

  const parts = [device, browser].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'This browser'
}
