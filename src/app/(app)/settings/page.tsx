import type { Metadata } from 'next'

import { PageHeader } from '@/components/ui/page-header'
import { PasswordForm } from '@/features/settings/components/password-form'
import { ProfileForm } from '@/features/settings/components/profile-form'
import { SettingsSection } from '@/features/settings/components/settings-section'
import { isCurrencyCode } from '@/lib/money'
import { timeZoneOptions } from '@/lib/timezones'
import { requireUser } from '@/server/auth/session'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await requireUser()
  const defaultCurrency = isCurrencyCode(user.defaultCurrency) ? user.defaultCurrency : 'USD'

  return (
    <>
      <PageHeader title="Settings" description="Your profile, regional defaults, and password." />
      <SettingsSection
        title="Profile"
        description="Your timezone and default currency are used across transactions, invoices, and reminders."
      >
        <ProfileForm
          email={user.email}
          timeZones={timeZoneOptions()}
          defaultValues={{ name: user.name, timezone: user.timezone, defaultCurrency }}
        />
      </SettingsSection>
      <SettingsSection
        title="Password"
        description="Changing your password signs you out on every other device."
      >
        <PasswordForm />
      </SettingsSection>
    </>
  )
}
