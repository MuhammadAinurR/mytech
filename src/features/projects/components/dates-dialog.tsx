'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isDateOnly } from '@/lib/dates'

/** Asks for a start and end when a project without dates becomes ongoing. */
export function DatesDialog({
  projectName,
  defaults,
  onConfirm,
  onCancel,
}: {
  projectName: string | null
  defaults: { startDate: string; endDate: string }
  onConfirm: (dates: { startDate: string; endDate: string }) => void
  onCancel: () => void
}) {
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [submitted, setSubmitted] = useState(false)

  const startError = !isDateOnly(startDate) ? 'Enter a start date.' : undefined
  const endError = !isDateOnly(endDate)
    ? 'Enter an end date.'
    : isDateOnly(startDate) && endDate < startDate
      ? 'End on or after the start date.'
      : undefined

  return (
    <Dialog open={projectName !== null} onOpenChange={(open) => (open ? null : onCancel())}>
      <DialogContent size="sm">
        <DialogHeader
          title="When is it happening?"
          description={`“${projectName ?? ''}” needs a window to be ongoing.`}
        />
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
            if (!startError && !endError) onConfirm({ startDate, endDate })
          }}
        >
          <DialogBody className="grid grid-cols-2 gap-3">
            <Field label="Start" required error={submitted ? startError : undefined}>
              <Input
                type="date"
                autoFocus
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="End" required error={submitted ? endError : undefined}>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Start project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
