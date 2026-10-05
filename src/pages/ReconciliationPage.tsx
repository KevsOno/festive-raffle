import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import type { Reconciliation } from '@/lib/types'
import { Badge, Button, Card, EmptyState, Input } from '@/components/UI'

export function ReconciliationPage() {
  const { session } = useAuth()
  const { data: profile } = useProfile(session?.user.id)
  const qc = useQueryClient()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const runs = useQuery({
    queryKey: ['reconciliation', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliation')
        .select('*, branches(name)')
        .eq('business_date', date)
        .order('branch_id')
      if (error) throw error
      return (data ?? []) as Reconciliation[]
    },
  })

  const generate = useMutation({
    mutationFn: async () => {
      const { data: branches, error: bErr } = await supabase.from('branches').select('id')
      if (bErr) throw bErr
      const rows = (branches ?? []).map((b) => ({
        business_date: date,
        branch_id: b.id,
      }))
      const { error } = await supabase
        .from('reconciliation')
        .upsert(rows, { onConflict: 'business_date,branch_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reconciliation', date] }),
  })

  const sign = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'finance' | 'audit' }) => {
      const { error } = await supabase.rpc('sign_reconciliation', {
        p_date: date,
        p_branch_id: runs.data?.find((r) => r.id === id)?.branch_id,
        p_role: role,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reconciliation', date] }),
  })

  const canSignFinance = profile?.role === 'manager' || profile?.role === 'admin'
  const canSignAudit = profile?.role === 'auditor' || profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
          <p className="text-sm text-gray-500">Finance and Audit sign-off</p>
        </div>
        <div className="flex gap-2 items-end">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </div>

      {!runs.data?.length ? (
        <Card>
          <EmptyState message="No reconciliation records for this date. Click Generate." />
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.data.map((run) => {
            const financeSigned = !!run.finance_signed_by
            const auditSigned = !!run.audit_signed_by
            const canSignAsFinance = canSignFinance && !financeSigned && !run.locked
            const canSignAsAudit =
              canSignAudit && financeSigned && !auditSigned && !run.locked

            return (
              <Card key={run.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-900">
                      {run.branches?.name ?? 'Branch'}
                    </div>
                    <div className="text-xs text-gray-500">{run.business_date}</div>
                  </div>
                  {run.locked ? (
                    <Badge tone="success">🔒 Locked</Badge>
                  ) : (
                    <Badge tone="warning">Pending</Badge>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                  <Metric label="Receipts" value={run.total_receipts} />
                  <Metric label="Tickets" value={run.total_tickets} />
                  <Metric label="Returns" value={run.total_returns} />
                  <Metric label="Variance" value={run.variance} />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <SignBlock
                    label="Finance"
                    signed={financeSigned}
                    signedAt={run.finance_signed_at}
                    canSign={canSignAsFinance}
                    onSign={() => sign.mutate({ id: run.id, role: 'finance' })}
                  />
                  <SignBlock
                    label="Internal Audit"
                    signed={auditSigned}
                    signedAt={run.audit_signed_at}
                    canSign={canSignAsAudit}
                    onSign={() => sign.mutate({ id: run.id, role: 'audit' })}
                    blocked={!financeSigned}
                    blockedMessage="Finance must sign first"
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function SignBlock({
  label,
  signed,
  signedAt,
  canSign,
  onSign,
  blocked,
  blockedMessage,
}: {
  label: string
  signed: boolean
  signedAt: string | null
  canSign: boolean
  onSign: () => void
  blocked?: boolean
  blockedMessage?: string
}) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-500 mb-2">{label}</div>
      {signed ? (
        <div className="text-sm">
          <Badge tone="success">✓ Signed</Badge>
          {signedAt && (
            <div className="text-xs text-gray-500 mt-1">
              {new Date(signedAt).toLocaleString()}
            </div>
          )}
        </div>
      ) : blocked ? (
        <div className="text-xs text-gray-500">{blockedMessage}</div>
      ) : canSign ? (
        <Button variant="outline" onClick={onSign}>
          Sign as {label}
        </Button>
      ) : (
        <div className="text-xs text-gray-500">Awaiting sign-off</div>
      )}
    </div>
  )
}
