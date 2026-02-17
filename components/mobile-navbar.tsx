import { Menu } from "lucide-react"

export const MobileNavbar = () => {
  return (
    <div className="h-[60px] md:hidden flex items-center p-4 bg-slate-900 border-b border-slate-800 w-full fixed top-0 z-50">
      <Menu className="h-6 w-6 text-white" />
      <span className="ml-2 font-bold text-white">Metkal CRM</span>
    </div>
  )
}