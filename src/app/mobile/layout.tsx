import { MobileLayout } from '@/components/mobile/mobile-layout'

export default function MobileRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MobileLayout>{children}</MobileLayout>
}
