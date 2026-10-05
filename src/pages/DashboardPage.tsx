import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatNaira } from '@/lib/tier'
import { Card, EmptyState, Spinner, Stat } from '@/components/UI'

interface ReceiptRow {
  amount: number
  net_amount: number
  status: string
  branch_name: string
}

interface TicketRow {
  id: string
  type: string
  status: string
}

interface ReturnRow {
  return_amount: number
}

export function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10)

  const receipts = useQuery({
    queryKey: ['dashboard-receipts', today],
    queryFn: async (): Promise<ReceiptRow[]> => {
      const { data, error } = await supabase
        .from('receipts')
        .select('amount, net_amount, status, branch_id, branches(name)')
        .gte('registered_at', today)
      if (error) throw error

      return (data ?? []).map((r) => {
        const joined = (r as { branches?: unknown }).branches
        const branchName = Array.isArray(joined)
          ? (joined[0] as { name?: string } | undefined)?.name ?? '—'
          : (joined as { name?: string } | null)?.name ?? '—'

        return {
          amount: Number(r.amount),
          net_amount: Number(r.net_amount),
          status: String(r.status),
          branch_name: branchName,
        }
      })
    },
  })

  const tickets = useQuery({
    queryKey: ['dashboard-tickets', today],
    queryFn: async (): Promise<TicketRow[]> => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, type, status')
        .gte('issued_at', today)
      if (error) throw error
      return (data ?? []).map((t) => ({
        id: String(t.id),
        type: String(t.type),
        status: String(t.status),
      }))
    },
  })

  const returns = useQuery({
    queryKey: ['dashboard-returns', today],
    queryFn: async (): Promise<ReturnRow[]> => {
      const { data, error } = await supabase
        .from('returns')
        .select('return_amount')
        .gte('created_at', today)
      if (error) throw error
      return (data ?? []).map((r) => ({
        return_amount: Number(r.return_amount),
      }))
    },
  })

  if (receipts.isLoading || tickets.isLoading || returns.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  const totalSales = receipts.data?.reduce((s, r) => s + r.amount, 0) ?? 0
  const totalTickets = tickets.data?.length ?? 0
  const cancelledTickets = tickets.data?.filter((t) => t.status === 'cancelled').length ?? 0
  const totalReturns = returns.data?.reduce((s, r) => s + r.return_amount, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Today · {today}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Receipts Today" value={receipts.data?.length ?? 0} />
        <Stat label="Sales Today" value={formatNaira(totalSales)} />
        <Stat label="Tickets Issued" value={totalTickets} tone="success" />
        <Stat
          label="Tickets Cancelled"
          value={cancelledTickets}
          tone={cancelledTickets > 0 ? 'warning' : 'default'}
        />
      </div>

      <Card title="Recent Receipts">
        {!receipts.data?.length ? (
          <EmptyState message="No receipts registered today." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2">Branch</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Net</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {receipts.data.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2">{r.branch_name}</td>
                    <td className="py-2">{formatNaira(r.amount)}</td>
                    <td className="py-2">{formatNaira(r.net_amount)}</td>
                    <td className="py-2 capitalize">{r.status.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Stat
          label="Returns Today"
          value={formatNaira(totalReturns)}
          tone={totalReturns > 0 ? 'warning' : 'default'}
        />
        <Stat
          label="Active Tickets"
          value={tickets.data?.filter((t) => t.status === 'active').length ?? 0}
        />
      </div>
    </div>
  )
}
