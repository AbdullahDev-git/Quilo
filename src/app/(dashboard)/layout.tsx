import { DashboardLayout } from "@/components/dashboard-layout"
import { ErrorBoundary } from "@/components/error-boundary"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <ErrorBoundary>{children}</ErrorBoundary>
    </DashboardLayout>
  )
}
