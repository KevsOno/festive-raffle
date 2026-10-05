import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatNaira } from '@/lib/tier'
import type { Prize, Winner } from '@/lib/types'
import { Button, Card, EmptyState, Stat } from '@/components/UI'

interface DrawResult {
  winner_id: string
  ticket_id: string
}

export function DrawPage() {
  const qc = useQueryClient()
  const [lastResult, setLastResult] = useState<DrawResult | null>(null)

  const prizes = useQuery({
    queryKey: ['prizes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('prizes').select('*').order('value', { ascending: false })
      if (error) throw error
      return (data ?? []) as Prize[]
    },
  })

  const winners = useQuery({
    queryKey: ['winners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select('*, prizes(name, value), tickets(ticket_code, type, receipt_id)')
        .order('drawn_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Winner[]
    },
  })

  const eligibleCount = useQuery({
    queryKey: ['eligible-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
      if (error) throw error
      return count ?? 0
    },
  })

  const runDraw = useMutation({
    mutationFn: async (prizeId: string) => {
      const { data, error } = await supabase.rpc('run_draw', { p_prize_id: prizeId })
      if (error) throw error
      return data as DrawResult
    },
    onSuccess: (res) => {
      setLastResult(res)
      qc.invalidateQueries({ queryKey: ['winners'] })
      qc.invalidateQueries({ queryKey: ['eligible-count'] })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Draw</h1>
        <p className="text-sm text-gray-500">Select a prize and run the draw</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Stat label="Prizes" value={prizes.data?.length ?? 0} />
        <Stat label="Eligible Tickets" value={eligibleCount.data ?? 0} tone="success" />
        <Stat label="Winners Declared" value={winners.data?.length ?? 0} />
      </div>

      {lastResult && (
        <Card className="!bg-green-50 !border-green-200">
          <div className="text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <div className="font-semibold text-green-900">Winner Declared</div>
            <div className="text-sm text-green-800">
              Check the Winners table below for details.
            </div>
          </div>
        </Card>
      )}

      <Card title="Prizes">
        {!prizes.data?.length ? (
          <EmptyState message="No prizes configured. Add prizes via Supabase." />
        ) : (
          <div className="space-y-3">
            {prizes.data.map((prize) => {
              const alreadyWon = winners.data?.some((w) => w.prize_id === prize.id)
              return (
                <div
                  key={prize.id}
                  className="flex items-center justify-between border border-gray-100 rounded-lg p-4"
                >
                  <div>
                    <div className="font-medium">{prize.name}</div>
                    {prize.value && (
                      <div className="text-sm text-gray-500">{formatNaira(prize.value)}</div>
                    )}
                  </div>
                  <Button
                    disabled={alreadyWon || runDraw.isPending || !eligibleCount.data}
                    onClick={() => {
                      if (confirm(`Run draw for "${prize.name}"? This cannot be undone.`)) {
                        runDraw.mutate(prize.id)
                      }
                    }}
                  >
                    {alreadyWon ? 'Drawn' : 'Run Draw'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Winners">
        {!winners.data?.length ? (
          <EmptyState message="No winners yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Prize</th>
                <th className="py-2">Ticket</th>
                <th className="py-2">Type</th>
                <th className="py-2">Drawn At</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {winners.data.map((w) => (
                <tr key={w.id} className="border-b border-gray-50">
                  <td className="py-2">{w.prizes?.name}</td>
                  <td className="py-2 font-mono">{w.tickets?.ticket_code}</td>
                  <td className="py-2 uppercase text-xs">{w.tickets?.type}</td>
                  <td className="py-2">{new Date(w.drawn_at).toLocaleString()}</td>
                  <td className="py-2 capitalize">{w.claim_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
