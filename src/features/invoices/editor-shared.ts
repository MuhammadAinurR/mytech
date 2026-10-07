/** Shared by the server (defaults) and the client editor; no runtime boundary. */

/** A saved client, as the editor fills it into "Bill to" (empty strings, not nulls). */
export type ClientOption = {
  id: string
  name: string
  address: string
  email: string
  taxId: string
}

export type CompanyOption = {
  id: string
  name: string
  defaultCurrency: string
  nextLabel: string
  clients: ClientOption[]
}

export const EMPTY_LINE = { description: '', quantity: '1', unitPrice: '' }

/** The editor's "Bill to" fields for a saved client, or blank ones. */
export function billTo(client: ClientOption | undefined) {
  return {
    clientName: client?.name ?? '',
    clientAddress: client?.address ?? '',
    clientEmail: client?.email ?? '',
    clientTaxId: client?.taxId ?? '',
  }
}

/** The saved client with this name, ignoring case and surrounding spaces (as the database does). */
export function findClientByName(clients: ClientOption[], name: string): ClientOption | undefined {
  const key = name.trim().toLowerCase()
  return key ? clients.find((client) => client.name.toLowerCase() === key) : undefined
}
