'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MapPin, ShoppingCart, X, UserPlus, FileText, Receipt } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FabButtonProps {
  className?: string
}

const fabActions = [
  {
    label: 'Nouveau Client',
    icon: UserPlus,
    href: '/mobile/clients/new',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Nouvelle Visite',
    icon: MapPin,
    href: '/mobile/visits/new',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Nouvelle Commande',
    icon: ShoppingCart,
    href: '/mobile/orders/new',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Nouveau Devis',
    icon: FileText,
    href: '/mobile/quotes/new',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Nouvelle Facture',
    icon: Receipt,
    href: '/mobile/invoices/new',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
]

export function FabButton({ className }: FabButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const fabRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [isOpen])

  function handleAction(href: string) {
    setIsOpen(false)
    router.push(href)
  }

  return (
    <div ref={fabRef} className={cn('fixed bottom-20 right-4 z-50', className)}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 flex flex-col-reverse gap-2"
          >
            {fabActions.map((action, index) => (
              <motion.button
                key={action.href}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.15, delay: index * 0.05 }}
                onClick={() => handleAction(action.href)}
                className="flex items-center gap-2.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 shadow-lg"
              >
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', action.bg)}>
                  <action.icon className={cn('h-4 w-4', action.color)} />
                </div>
                <span className="whitespace-nowrap text-sm font-medium text-slate-200">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[-1]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB main button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-shadow',
          isOpen
            ? 'bg-slate-700 shadow-slate-900/50'
            : 'bg-emerald-500 shadow-emerald-500/30 hover:shadow-emerald-500/50'
        )}
        aria-label={isOpen ? 'Fermer le menu' : 'Actions rapides'}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Plus className="h-6 w-6 text-white" />
          )}
        </motion.div>
      </motion.button>
    </div>
  )
}
