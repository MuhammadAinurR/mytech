import { BackgroundRevalidate } from '@/components/app-shell/background-revalidate'
import { ViewCacheProvider } from '@/components/app-shell/cached-view'
import { CommandPaletteProvider } from '@/components/app-shell/command-palette'
import { SidebarContent } from '@/components/app-shell/sidebar'
import { TabBar } from '@/components/app-shell/tab-bar'
import { requireUser } from '@/server/auth/session'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser()
  const shellUser = { name: user.name, email: user.email }

  return (
    <CommandPaletteProvider>
      <BackgroundRevalidate />
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-surface-raised px-3 py-2 text-sm font-medium shadow-popover focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <div className="min-h-dvh bg-background md:flex">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 md:block">
          <SidebarContent user={shellUser} />
        </aside>
        {/*
          The content panel is the scroll container on desktop so sticky table
          headers pin to its top edge; on mobile the page itself scrolls, under the
          floating title bar and above the tab bar.
        */}
        <div className="min-w-0 flex-1 md:py-2 md:pr-2">
          <main
            id="main"
            tabIndex={-1}
            className="min-h-dvh bg-(--canvas) pb-(--tab-bar-space) outline-none [--sticky-top:var(--title-bar)] md:h-[calc(100dvh-1rem)] md:min-h-0 md:overflow-y-auto md:rounded-lg md:border md:border-border md:bg-surface md:pb-0 md:[--sticky-top:0px]"
          >
            <ViewCacheProvider key={user.id}>{children}</ViewCacheProvider>
          </main>
        </div>
      </div>
      <TabBar />
    </CommandPaletteProvider>
  )
}
