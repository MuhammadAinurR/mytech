import 'server-only'

import { createRequire } from 'node:module'
import { join } from 'node:path'

import type ReactTypes from 'react'

/**
 * The React instance @react-pdf/renderer uses. react-pdf runs as an external
 * package with its own reconciler on node_modules/react, but code compiled by
 * Next.js creates elements with Next's vendored React, which that reconciler
 * silently ignores (the PDF comes out empty). Elements for PDFs must therefore
 * be created with this instance, resolved by Node at runtime.
 */
const nodeRequire = createRequire(join(process.cwd(), 'package.json'))
const React = nodeRequire('react') as typeof ReactTypes

export const h = React.createElement
