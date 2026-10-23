import { readFileSync } from 'node:fs'

import { expect, type Page, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

const A4 = [595, 842]
const LETTER = [612, 792]
const RECEIPT = [300, 600]

async function pdf(pages: number, size: number[]) {
  const document = await PDFDocument.create()
  for (let i = 0; i < pages; i++) document.addPage([size[0]!, size[1]!])
  return Buffer.from(await document.save())
}

async function pageSizesOf(bytes: Buffer) {
  const document = await PDFDocument.load(bytes)
  return document.getPages().map((page) => {
    const { width, height } = page.getSize()
    return [Math.round(width), Math.round(height)]
  })
}

async function createInvoice(page: Page) {
  const stamp = Date.now()
  const companyName = `Attach Co ${stamp}`
  await page.goto('/companies?new=1')
  const dialog = page.getByRole('dialog', { name: 'New company' })
  await dialog.getByLabel('Name').fill(companyName)
  await dialog.getByLabel('Number prefix').fill(`A${String(stamp).slice(-6)}-`)
  await dialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()

  await page.goto('/invoices/new')
  await page.getByLabel('Company').selectOption({ label: companyName })
  await page.getByLabel('Client name').fill('Northwind Labs')
  await page.getByLabel('Line 1 description').fill('Hosting, passed on at cost')
  await page.getByLabel('Line 1 unit price').fill('120')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  return page.url()
}

test('attach third-party PDFs, order them, and get them after the invoice in the PDF', async ({
  page,
}) => {
  const invoiceUrl = await createInvoice(page)
  const section = page.getByRole('region', { name: 'Attachments' })
  await expect(section.getByText('Nothing attached.')).toBeVisible()

  // Two at once, as picked in the file dialog.
  await section.locator('input[type="file"]').setInputFiles([
    { name: 'aws-october.pdf', mimeType: 'application/pdf', buffer: await pdf(2, LETTER) },
    { name: 'biznet.pdf', mimeType: 'application/pdf', buffer: await pdf(1, RECEIPT) },
  ])
  await expect(page.getByText('2 PDFs attached')).toBeVisible()
  // Each row's own button (it downloads), not its move and remove buttons.
  const rows = section.locator('[data-row-open]')
  await expect(rows).toHaveText([/aws-october\.pdf\s*2 pages/, /biznet\.pdf\s*1 page/])
  await expect(section.getByText(/2 of 10 ·/)).toBeVisible()

  await section.getByRole('button', { name: 'Move biznet.pdf up' }).click()
  await expect(rows).toHaveText([/biznet\.pdf/, /aws-october\.pdf/])

  // The download: our invoice, then the attachments in the new order.
  const merged = page.waitForEvent('download')
  await page.getByRole('link', { name: 'PDF' }).click()
  const mergedBytes = readFileSync(await (await merged).path())
  expect(await pageSizesOf(mergedBytes)).toEqual([A4, RECEIPT, LETTER, LETTER])

  // One attachment on its own.
  const single = page.waitForEvent('download')
  await rows.filter({ hasText: 'aws-october.pdf' }).click()
  const singleFile = await single
  expect(singleFile.suggestedFilename()).toBe('aws-october.pdf')
  expect(await pageSizesOf(readFileSync(await singleFile.path()))).toEqual([LETTER, LETTER])

  // Anything that isn't a PDF is refused with a reason.
  await section.locator('input[type="file"]').setInputFiles({
    name: 'not-really.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('PK\u0003\u0004 a zip renamed to .pdf'),
  })
  await expect(page.getByText('not-really.pdf wasn’t attached')).toBeVisible()
  await expect(page.getByText('Only PDF files can be attached.')).toBeVisible()
  await expect(rows).toHaveCount(2)

  await section.getByRole('button', { name: 'Remove aws-october.pdf' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('Removed aws-october.pdf')).toBeVisible()
  await expect(rows).toHaveText([/biznet\.pdf/])

  // Printing covers the invoice only, and says where the attachment is.
  await page.goto(`${invoiceUrl}/print`)
  await expect(
    page.getByText('This prints the invoice only. Its 1 attachment is in the'),
  ).toBeVisible()
})
