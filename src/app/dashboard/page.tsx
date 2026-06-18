import { DashboardShell } from '@/components/layout/dashboard-shell'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Teranga Biz',
  description: 'Tableau de bord ERP pour la gestion de votre entreprise de distribution.',
}

export default function DashboardPage() {
  return <DashboardShell />
}
