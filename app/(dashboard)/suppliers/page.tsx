import { redirect } from "next/navigation"

export default function SuppliersPage() {
  redirect("/partners?tab=suppliers")
}
