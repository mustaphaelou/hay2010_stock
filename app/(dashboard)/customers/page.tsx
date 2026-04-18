"use client"

import PartnersView from "@/components/erp/partners-view"

export default function CustomersPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8">
      <PartnersView type={0} title="Clients" />
    </div>
  )
}
