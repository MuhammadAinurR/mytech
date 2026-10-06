import { type ReactNode } from 'react'

/** Settings row: a short explanation on the left, the form on the right. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-6 border-t border-border px-(--gutter) py-8 lg:grid-cols-[16rem_minmax(0,32rem)] lg:gap-12">
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold">{title}</h2>
        <p className="text-sm text-pretty text-muted">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  )
}
