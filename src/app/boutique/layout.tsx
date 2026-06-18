'use client'

import { CartProvider } from '@/lib/cart-context'
import type { ReactNode } from 'react'

export default function BoutiqueLayout({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
