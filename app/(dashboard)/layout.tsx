import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/user-utils'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/erp/app-sidebar'
import { SiteHeader } from '@/components/erp/site-header'
import { BottomNav } from '@/components/erp/bottom-nav'
import { Suspense } from 'react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '280px',
          '--header-height': '3.5rem',
        } as React.CSSProperties
      }
    >
      <Suspense
        fallback={
          <div className="hidden md:block w-[--sidebar-width] bg-sidebar border-r h-svh" />
        }
      >
        <AppSidebar />
      </Suspense>
      <SidebarInset>
        <SiteHeader />
        {children}
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
