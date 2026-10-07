import { CalendarDays, SquareKanban } from 'lucide-react'

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
