/** Shared by the server (defaults) and the client editor; no runtime boundary. */
export type CompanyOption = { id: string; name: string; defaultCurrency: string; nextLabel: string }

export const EMPTY_LINE = { description: '', quantity: '1', unitPrice: '' }
