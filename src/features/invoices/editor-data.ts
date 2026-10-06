import 'server-only'

import { addDays, todayInTimeZone } from '@/lib/dates'
import { toDecimalString } from '@/lib/money'
import type { CurrentUser } from '@/server/queries/users'
import { listCompanies } from '@/server/queries/companies'
import type { InvoiceDetail } from '@/server/queries/invoices'

import { type CompanyOption, EMPTY_LINE } from './editor-shared'
import { formatInvoiceNumber, formatPercent, formatQuantity } from './lib/totals'
import { type InvoiceFormValues } from './schema'

export async function companyOptions(userId: string): Promise<CompanyOption[]> {
  const companies = await listCompanies(userId)
  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    defaultCurrency: company.defaultCurrency,
    nextLabel: formatInvoiceNumber(company.invoicePrefix, company.nextInvoiceNumber),
  }))
}

export function newInvoiceDefaults(
  user: CurrentUser,
  companies: CompanyOption[],
  preferredCompanyId?: string,
): InvoiceFormValues {
  const company =
    companies.find((c) => c.id === preferredCompanyId) ??
    (companies.length === 1 ? companies[0] : undefined)
  const today = todayInTimeZone(user.timezone)
  return {
    companyId: company?.id ?? '',
    issueDate: today,
    dueDate: addDays(today, 14),
    currency: (company?.defaultCurrency ?? user.defaultCurrency) as InvoiceFormValues['currency'],
    clientName: '',
    clientAddress: '',
    clientEmail: '',
    clientTaxId: '',
    notes: '',
    taxRate: '',
    discount: '',
    items: [EMPTY_LINE],
  }
}

export function editInvoiceDefaults(invoice: InvoiceDetail): InvoiceFormValues {
  return {
    companyId: invoice.company.id,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency as InvoiceFormValues['currency'],
    clientName: invoice.clientName,
    clientAddress: invoice.clientAddress ?? '',
    clientEmail: invoice.clientEmail ?? '',
    clientTaxId: invoice.clientTaxId ?? '',
    notes: invoice.notes ?? '',
    taxRate: invoice.taxRateBps > 0 ? formatPercent(invoice.taxRateBps) : '',
    discount:
      invoice.discountMinor > 0 ? toDecimalString(invoice.discountMinor, invoice.currency) : '',
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: formatQuantity(item.quantityMilli),
      unitPrice: toDecimalString(item.unitPriceMinor, invoice.currency),
    })),
  }
}
