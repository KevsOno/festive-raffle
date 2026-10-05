import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatNaira } from '@/lib/tier'
import type { Prize } from '@/lib/types'
import { Button, Card, EmptyState, Stat } from '@/components/UI'

interface DrawResult {
  winner_id: string
  ticket_id: string
}

interface WinnerRow {
  id: string
  prize_id: string
  prize_name: string
  prize_value: number | null
  tier_label: string | null
  ticket_code: string
  ticket_type: string
  drawn_at: string
  claim_status: string
}

export function DrawPage() {
  const qc = useQueryClient()
  const [lastResult, setLastResult] = useState<DrawResult | null>(null)

  const prizes = useQuery({
    queryKey: ['prizes'],
    queryFn: async (): Promise<Prize[]> => {
      const { data, error } = await supabase
        .from('prizes')
        .select('*, tiers(label)')
        .order('value', { ascending: false })
      if (error) throw error
      return (data ?? []).map((p) => {
        const rawTier = (p as { tiers?: unknown }).tiers
        const tier = Array.isArray(rawTier)
          ? (rawTier[0] as { label?: string } | undefined)
          : (rawTier as { label?: string } | null)
        return { ...p, tier_label: tier?.label ?? null } as Prize
      })
    },
  })

  const winners = useQuery({
    queryKey: ['winners'],
    queryFn: async (): Promise<WinnerRow[]> => {
      const { data, error } = await supabase
        .from('winners')
        .select(
          'id, prize_id, drawn_at, claim_status, prizes(name, value, tiers(label)), tickets(ticket_code, type)'
        )
        .order('drawn_at', { ascending: false })
      if (error) throw error

      return (data ?? []).map((w) => {
        const rawPrize = (w as { prizes?: unknown }).prizes
        const rawTicket = (w as { tickets?: unknown }).tickets

        const prize = Array.isArray(rawPrize)
          ? (rawPrize[0] as
              | { name?: string; value?: number; tiers?: unknown }
              | undefined)
          : (rawPrize as
              | { name?: string; value?: number; tiers?: unknown }
              | null)

        const rawTier = prize?.tiers
        const tier = Array.isArray(rawTier)
          ? (rawTier[0] as { label?: string } | undefined)
          : (rawTier as { label?: string } | null)

        const ticket = Array.isArray(rawTicket)
          ? (rawTicket[0] as { ticket_code?: string; type?: string } | undefined)
          : (rawTicket as { ticket_code?: string; type?: string } | null)

        return {
          id: String(w.id),
          prize_id: String(w.prize_id),
          prize_name: prize?.name ?? '—',
          prize_value: prize?.value ?? null,
          tier_label: tier?.label ?? null,
          ticket_code: ticket?.ticket_code ?? '—',
          ticket_type: ticket?.type ?? '—',
          drawn_at: String(w.drawn_at),
          claim_status: String(w.claim_status),
        }
      })
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
                    <div className="text-xs text-gray-500 mt-0.5">
                      {prize.tier_label ?? 'No tier'} ·{' '}
                      {prize.value ? formatNaira(prize.value) : '—'}
                    </div>
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
                <th className="py-2">Tier</th>
                <th className="py-2">Ticket</th>
                <th className="py-2">Type</th>
                <th className="py-2">Drawn At</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {winners.data.map((w) => (
                <tr key={w.id} className="border-b border-gray-50">
                  <td className="py-2">{w.prize_name}</td>
                  <td className="py-2 text-xs text-gray-500">{w.tier_label ?? '—'}</td>
                  <td className="py-2 font-mono">{w.ticket_code}</td>
                  <td className="py-2 uppercase text-xs">{w.ticket_type}</td>
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
