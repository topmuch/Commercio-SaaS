"use client"

import { useAppStore, type PageId } from '@/lib/store'
import { hasAccess } from '@/lib/permissions'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RoleGuardProps {
  pageId: PageId
  children: React.ReactNode
}

export function RoleGuard({ pageId, children }: RoleGuardProps) {
  const user = useAppStore((s) => s.user)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const allowed = hasAccess(user?.role, pageId)

  if (!allowed) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Accès refusé</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Vous n'avez pas la permission d'accéder à cette page.
            Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setCurrentPage('dashboard')}
        >
          Retour au tableau de bord
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
