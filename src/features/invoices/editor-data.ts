import 'server-only'

import { addDays, todayInTimeZone } from '@/lib/dates'
import { toDecimalString } from '@/lib/money'
import { listAllClients } from '@/server/queries/clients'
import { listCompanies } from '@/server/queries/companies'
import type { InvoiceDetail } from '@/server/queries/invoices'
import type { CurrentUser } from '@/server/queries/users'

import { billTo, type ClientOption, type CompanyOption, EMPTY_LINE } from './editor-shared'
import { formatInvoiceNumber, formatPercent, formatQuantity } from './lib/totals'
import { type InvoiceFormValues } from './schema'

/** The user's companies, each with its saved clients, for the editor's pickers. */
export async function companyOptions(userId: string): Promise<CompanyOption[]> {
  const [companies, clients] = await Promise.all([listCompanies(userId), listAllClients(userId)])
  const byCompany = new Map<string, ClientOption[]>()
  for (const client of clients) {
    const list = byCompany.get(client.companyId) ?? []
    list.push({
      id: client.id,
      name: client.name,
      address: client.address ?? '',
      email: client.email ?? '',
      taxId: client.taxId ?? '',
    })
    byCompany.set(client.companyId, list)
  }
  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    defaultCurrency: company.defaultCurrency,
    nextLabel: formatInvoiceNumber(company.invoicePrefix, company.nextInvoiceNumber),
    clients: byCompany.get(company.id) ?? [],
  }))
}

/**
 * A new invoice's starting values. `preferred` comes from the URL
 * (`?company=…&client=…`). A client picks its own company when none is
 * given; a client from another company than the one given is ignored.
 */
export function newInvoiceDefaults(
  user: CurrentUser,
  companies: CompanyOption[],
  preferred: { companyId?: string; clientId?: string } = {},
): InvoiceFormValues {
  const company =
    companies.find((c) => c.id === preferred.companyId) ??
    companies.find((c) => c.clients.some((client) => client.id === preferred.clientId)) ??
    (companies.length === 1 ? companies[0] : undefined)
  const client = company?.clients.find((c) => c.id === preferred.clientId)
  const today = todayInTimeZone(user.timezone)
  return {
    companyId: company?.id ?? '',
    issueDate: today,
    dueDate: addDays(today, 14),
    currency: (company?.defaultCurrency ?? user.defaultCurrency) as InvoiceFormValues['currency'],
    ...billTo(client),
    notes: '',
    taxRate: '',
    discount: '',
    items: [EMPTY_LINE],
    saveClient: false,
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
    saveClient: false,
  }
}
