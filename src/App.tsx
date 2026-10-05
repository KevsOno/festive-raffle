import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard, RoleGuard } from '@/components/Guard'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { RegisterReceiptPage } from '@/pages/RegisterReceiptPage'
import { ReturnsPage } from '@/pages/ReturnsPage'
import { ReconciliationPage } from '@/pages/ReconciliationPage'
import { DrawPage } from '@/pages/DrawPage'
import { ExportPage } from '@/pages/ExportPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AuthGuard />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />

              <Route element={<RoleGuard roles={['staff', 'manager', 'admin']} />}>
                <Route path="/register" element={<RegisterReceiptPage />} />
                <Route path="/returns" element={<ReturnsPage />} />
              </Route>

              <Route element={<RoleGuard roles={['manager', 'auditor', 'admin']} />}>
                <Route path="/reconciliation" element={<ReconciliationPage />} />
                <Route path="/export" element={<ExportPage />} />
              </Route>

              <Route element={<RoleGuard roles={['admin']} />}>
                <Route path="/draw" element={<DrawPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
