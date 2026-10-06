/** IANA zones with their current UTC offset, for timezone pickers. */
export function timeZoneOptions(now: Date = new Date()): { value: string; label: string }[] {
  const zones = new Set(Intl.supportedValuesOf('timeZone'))
  zones.add('UTC')
  return [...zones]
    .map((zone) => {
      const offset =
        new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
          .formatToParts(now)
          .find((part) => part.type === 'timeZoneName')?.value ?? ''
      return { value: zone, label: `${zone.replaceAll('_', ' ')} (${offset})` }
    })
    .sort((a, b) => a.value.localeCompare(b.value))
}
