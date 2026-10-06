'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useTransition } from 'react'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DialogBody, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented'
import { toast } from '@/components/ui/toaster'
import { formatDateOnly, isDateOnly } from '@/lib/dates'
import { applyFieldErrors } from '@/lib/forms'
import { CURRENCIES } from '@/lib/money'

import { createRuleAction, updateRuleAction } from '../actions'
import { describeSchedule, monthName, occurrencesBetween } from '../lib/recurrence'
import { recurringRuleFormSchema, type RecurringRuleFormValues } from '../schema'

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1))
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1))

export function RuleForm({
  ruleId,
  defaultValues,
  categories,
  today,
  onDone,
}: {
  ruleId?: string
  defaultValues: RecurringRuleFormValues
  categories: string[]
  today: string
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const listId = useId()
  const form = useForm<RecurringRuleFormValues>({
    resolver: zodResolver(recurringRuleFormSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { errors } = form.formState
  const frequency = useWatch({ control: form.control, name: 'frequency' })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = ruleId
        ? await updateRuleAction(ruleId, values)
        : await createRuleAction(values)
      if (result.ok) {
        toast.success(ruleId ? 'Rule updated' : 'Rule created')
        onDone()
      } else if (result.error === 'not_found') {
        toast.error('That rule no longer exists.')
        onDone()
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('The rule wasn’t saved. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogBody className="flex flex-col gap-5">
        <Field label="Name" required error={errors.label?.message}>
          <Input autoFocus placeholder="workbench.dev domain" {...form.register('label')} />
        </Field>

        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <SegmentedControl
              label="Type"
              className="self-start"
              value={field.value}
              onValueChange={field.onChange}
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
            />
          )}
        />

        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
          <Field label="Amount" required error={errors.amount?.message}>
            <Input
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              className="text-right tabular"
              {...form.register('amount')}
            />
          </Field>
          <Field label="Currency" required error={errors.currency?.message}>
            <Select {...form.register('currency')}>
              {CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Category" required error={errors.category?.message}>
          <Input list={listId} autoComplete="off" {...form.register('category')} />
        </Field>
        <datalist id={listId}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>

        <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium">Schedule</legend>
          <Controller
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <SegmentedControl
                label="Frequency"
                className="self-start"
                value={field.value}
                onValueChange={field.onChange}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            {frequency === 'yearly' ? (
              <Field label="Month" required error={errors.monthOfYear?.message}>
                <Select {...form.register('monthOfYear')}>
                  <option value="">Choose…</option>
                  {MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {monthName(Number(month))}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field
              label="Day"
              required
              hint="Short months use their last day."
              error={errors.dayOfMonth?.message}
              className={frequency === 'yearly' ? undefined : 'col-span-2 sm:col-span-1'}
            >
              <Select {...form.register('dayOfMonth')}>
                {DAYS.map((day) => (
                  <option key={day}>{day}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts" required error={errors.startsOn?.message}>
              <Input type="date" {...form.register('startsOn')} />
            </Field>
            <Field label="Ends" error={errors.endsOn?.message}>
              <Input type="date" {...form.register('endsOn')} />
            </Field>
          </div>
          <SchedulePreview control={form.control} today={today} />
        </fieldset>

        <Field
          label="Reminder"
          hint="Shows on your dashboard this many days before each date."
          error={errors.reminderDaysBefore?.message}
        >
          <div className="relative w-40">
            <Input
              inputMode="numeric"
              autoComplete="off"
              className="pr-24 tabular"
              {...form.register('reminderDaysBefore')}
            />
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-subtle">
              days before
            </span>
          </div>
        </Field>

        <Field
          label="Note"
          hint="Copied onto each entry. Defaults to the rule name."
          error={errors.note?.message}
        >
          <Textarea rows={2} {...form.register('note')} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {ruleId ? 'Save changes' : 'Create rule'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** The next three dates under the current settings, recomputed as you edit. */
function SchedulePreview({
  control,
  today,
}: {
  control: Control<RecurringRuleFormValues>
  today: string
}) {
  const [frequency, dayOfMonth, monthOfYear, startsOn, endsOn] = useWatch({
    control,
    name: ['frequency', 'dayOfMonth', 'monthOfYear', 'startsOn', 'endsOn'],
  })
  const day = Number(dayOfMonth)
  const month = frequency === 'yearly' ? Number(monthOfYear) : null
  const valid =
    day >= 1 &&
    day <= 31 &&
    isDateOnly(startsOn) &&
    (frequency === 'monthly' || (month !== null && month >= 1 && month <= 12)) &&
    (endsOn === '' || isDateOnly(endsOn))

  if (!valid) return null
  const spec = { frequency, dayOfMonth: day, monthOfYear: month, startsOn, endsOn: endsOn || null }
  const from = startsOn > today ? startsOn : today
  const dates = occurrencesBetween(spec, from, '9999-12-31', 3)

  return (
    <p className="text-sm text-muted" aria-live="polite">
      <span className="text-fg">{describeSchedule(spec)}.</span>{' '}
      {dates.length > 0
        ? `Next: ${dates.map((date) => formatDateOnly(date)).join(', ')}.`
        : 'No upcoming dates before the end date.'}
    </p>
  )
}
