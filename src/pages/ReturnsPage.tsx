import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatNaira } from '@/lib/tier'
import type { Receipt } from '@/lib/types'
import { Badge, Button, Card, EmptyState, Input } from '@/components/UI'

const schema = z.object({
  receipt_no: z.string().min(1),
  return_ref: z.string().min(1),
  return_amount: z.coerce.number().positive(),
  reason: z.string().optional(),
})

type Form = z.infer<typeof schema>

interface ProcessResult {
  cancelled: number
  remaining: number
}

export function ReturnsPage() {
  const qc = useQueryClient()
  const [lookup, setLookup] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [result, setResult] = useState<ProcessResult | null>(null)

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { receipt_no: '', return_ref: '', return_amount: 0, reason: '' },
  })

  const recentReturns = useQuery({
    queryKey: ['returns-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select('*, receipts(receipt_no, amount)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
  })

  const lookupReceipt = async () => {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('receipt_no', lookup)
      .maybeSingle()
    if (error) throw error
    setReceipt(data as Receipt | null)
    if (data) {
      form.setValue('receipt_no', data.receipt_no)
      form.setValue('return_amount', 0)
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: Form) => {
      const { data: res, error } = await supabase.rpc('process_return', {
        p_receipt_no: data.receipt_no,
        p_return_ref: data.return_ref,
        p_return_amount: data.return_amount,
        p_reason: data.reason ?? '',
      })
      if (error) throw error
      return res as ProcessResult
    },
    onSuccess: (res) => {
      setResult(res)
      qc.invalidateQueries({ queryKey: ['returns-recent'] })
      qc.invalidateQueries({ queryKey: ['dashboard-returns'] })
    },
  })

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card title="✅ Return Processed">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-xs uppercase text-red-700">Cancelled</div>
                <div className="text-3xl font-bold text-red-700 mt-1">{result.cancelled}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-xs uppercase text-green-700">Remaining</div>
                <div className="text-3xl font-bold text-green-700 mt-1">{result.remaining}</div>
              </div>
            </div>
            <Button
              onClick={() => {
                setResult(null)
                setReceipt(null)
                setLookup('')
                form.reset()
              }}
            >
              Process Another
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
        <p className="text-sm text-gray-500">Log a return and cancel excess tickets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Look Up Receipt">
            <div className="flex gap-2">
              <Input
                placeholder="RCP-2026-000001"
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
              />
              <Button onClick={lookupReceipt} type="button">
                Find
              </Button>
            </div>
          </Card>

          {receipt && (
            <Card title="Enter Return">
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
              >
                <Input
                  label="Receipt Number"
                  {...form.register('receipt_no')}
                  readOnly
                  className="bg-gray-50"
                />
                <Input
                  label="Return Reference *"
                  {...form.register('return_ref')}
                  placeholder="RET-2026-0001"
                  error={form.formState.errors.return_ref?.message}
                />
                <Input
                  label={`Return Amount (₦) — remaining ${formatNaira(Number(receipt.net_amount))} *`}
                  type="number"
                  step="0.01"
                  {...form.register('return_amount')}
                  error={form.formState.errors.return_amount?.message}
                />
                <Input label="Reason" {...form.register('reason')} />
                {mutation.isError && (
                  <p className="text-sm text-red-600">
                    {mutation.error instanceof Error ? mutation.error.message : 'Failed'}
                  </p>
                )}
                <Button type="submit" variant="danger" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Processing…' : 'Process Return'}
                </Button>
              </form>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          {receipt && (
            <Card title="Current Receipt">
              <div className="space-y-2 text-sm">
                <Row label="Customer" value={receipt.customer_name} />
                <Row label="Phone" value={receipt.customer_phone} />
                <Row label="Amount" value={formatNaira(Number(receipt.amount))} />
                <Row label="Net" value={formatNaira(Number(receipt.net_amount))} />
                <Row
                  label="Status"
                  value={<Badge tone={receipt.status === 'active' ? 'success' : 'warning'}>{receipt.status}</Badge>}
                />
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card title="Recent Returns">
        {!recentReturns.data?.length ? (
          <EmptyState message="No returns yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2">Return Ref</th>
                <th className="py-2">Receipt</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentReturns.data.map((r) => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="py-2 font-mono">{r.return_ref}</td>
                  <td className="py-2 font-mono">{r.receipts?.receipt_no}</td>
                  <td className="py-2">{formatNaira(Number(r.return_amount))}</td>
                  <td className="py-2 capitalize">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
