import {
  ArrowLeftRight,
  Building2,
  FileText,
  KeyRound,
  LayoutDashboard,
  SquareKanban,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon; keywords?: string[] }

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  {
    href: '/transactions',
    label: 'Transactions',
    icon: ArrowLeftRight,
    keywords: ['income', 'expense', 'money', 'recurring', 'renewals'],
  },
  {
    href: '/credentials',
    label: 'Credentials',
    icon: KeyRound,
    keywords: ['passwords', 'secrets', 'servers', 'domains'],
  },
  { href: '/companies', label: 'Companies', icon: Building2, keywords: ['business', 'clients'] },
  { href: '/invoices', label: 'Invoices', icon: FileText, keywords: ['billing'] },
  {
    href: '/projects',
    label: 'Projects',
    icon: SquareKanban,
    keywords: ['board', 'kanban', 'calendar', 'planning'],
  },
]

/** Quick-add targets. Each page opens its create dialog when `?new=1` is present. */
export const CREATE_ITEMS = [
  { href: '/transactions?new=1', label: 'New transaction', keywords: ['income', 'expense'] },
  { href: '/credentials?new=1', label: 'New credential', keywords: ['secret', 'password'] },
  { href: '/invoices/new', label: 'New invoice', keywords: ['bill'] },
  { href: '/companies?new=1', label: 'New company', keywords: ['business'] },
  { href: '/projects?new=1', label: 'New project', keywords: ['task'] },
] as const

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
