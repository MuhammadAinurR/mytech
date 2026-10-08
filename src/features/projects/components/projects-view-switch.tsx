import { CalendarDays, SquareKanban } from 'lucide-react'
import Link from 'next/link'

import { GlassButton } from '@/components/ui/glass-button'
import { SegmentedLinks } from '@/components/ui/segmented'

export function ProjectsViewSwitch({ current }: { current: 'board' | 'calendar' }) {
  return (
    <SegmentedLinks
      label="Projects view"
      current={current}
      items={[
        {
          value: 'board',
          href: '/projects',
          label: (
            <>
              <SquareKanban aria-hidden />
              Board
            </>
          ),
        },
        {
          value: 'calendar',
          href: '/projects/calendar',
          label: (
            <>
              <CalendarDays aria-hidden />
              Calendar
            </>
          ),
        },
      ]}
    />
  )
}

/** Phones: a glass circle in the title bar that switches to the other view. */
export function ProjectsViewButton({ current }: { current: 'board' | 'calendar' }) {
  return current === 'board' ? (
    <GlassButton asChild aria-label="Calendar view">
      <Link href="/projects/calendar">
        <CalendarDays />
      </Link>
    </GlassButton>
  ) : (
    <GlassButton asChild aria-label="Board view">
      <Link href="/projects">
        <SquareKanban />
      </Link>
    </GlassButton>
  )
}
