# 0002. Money as integer minor units with pinned exponents

- Status: accepted
- Date: 2026-10-07

## Context

Workbench records income, expenses, and invoices in several currencies.
Floating point cannot represent most decimal amounts exactly, and rounding
errors compound across invoice lines and monthly summaries.

## Decision

- Store every amount as an integer number of minor units (`bigint` column, a
  safe JS integer in code) next to an ISO 4217 currency code (`char(3)`).
- The number of minor-unit digits per currency is pinned in `src/lib/money.ts`
  and never derived from `Intl`. ICU data can change between Node versions,
  and a changed exponent would silently rescale every stored amount.
- IDR uses exponent 0 (whole rupiah). ISO 4217 lists two decimals, but sen are
  not used in practice and CLDR (what users see in every app) shows none.
  JPY is 0. The other supported currencies are 2.
- User input is parsed as a decimal string straight into minor units. Display
  formats a decimal string with `Intl.NumberFormat`, which formats strings
  exactly. Floats never touch a stored amount.
- Calculations that need rounding (tax, quantities) round half away from zero
  in one place and are unit-tested.

## Consequences

- Adding a currency means adding it to the exponent table. That is a reviewed
  change, never automatic.
- A currency's exponent can never change once rows exist in it.
