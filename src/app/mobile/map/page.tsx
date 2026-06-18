'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const MobileMapContent = dynamic(() => import('./map-content').then(m => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800">
      <Skeleton className="h-12 w-12 rounded-full mx-auto mb-3" />
      <p className="text-sm text-slate-400">Chargement de la carte...</p>
    </div>
  ),
})

export default function MobileMapPage() {
  return <MobileMapContent />
}
