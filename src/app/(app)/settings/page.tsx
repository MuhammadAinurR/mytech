import type { Metadata } from 'next'

import { InstallSettings } from '@/components/pwa/install-settings'
import { PageHeader } from '@/components/ui/page-header'
import {
  type DeviceRow,
  NotificationSettings,
} from '@/features/notifications/components/notification-settings'
import { PasswordForm } from '@/features/settings/components/password-form'
import { ProfileForm } from '@/features/settings/components/profile-form'
import { SettingsSection } from '@/features/settings/components/settings-section'
import { formatDateOnly, todayInTimeZone } from '@/lib/dates'
import { isCurrencyCode } from '@/lib/money'
import { timeZoneOptions } from '@/lib/timezones'
import { requireUser } from '@/server/auth/session'
import { vapidPublicKey } from '@/server/push'
import { listPushDevices } from '@/server/queries/push'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await requireUser()
  const defaultCurrency = isCurrencyCode(user.defaultCurrency) ? user.defaultCurrency : 'USD'
  const devices = await listPushDevices(user.id)
  const day = (instant: Date) =>
    formatDateOnly(todayInTimeZone(user.timezone, instant), { style: 'medium' })
  const deviceRows: DeviceRow[] = devices.map((device) => ({
    id: device.id,
    label: device.label ?? 'Browser',
    detail: device.lastSuccessAt
      ? `Last notified ${day(device.lastSuccessAt)}`
      : `Added ${day(device.createdAt)}`,
  }))

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile, regional defaults, notifications, and password."
      />
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
        title="Notifications"
        description="Reminders for unpaid invoices three days before, on, and the day after the due date, at 9:00 your time."
      >
        <NotificationSettings publicKey={vapidPublicKey()} devices={deviceRows} />
      </SettingsSection>
      <SettingsSection
        title="App"
        description="Install Workbench to open it full screen, like any other app."
      >
        <InstallSettings />
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
