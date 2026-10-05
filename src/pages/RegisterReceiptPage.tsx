import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatNaira, findTier } from '@/lib/tier'
import { useAuth } from '@/hooks/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import type { Branch } from '@/lib/types'
import { Badge, Button, Card, Input } from '@/components/UI'

const schema = z.object({
  receipt_no: z.string().min(1, 'Receipt number is required'),
  amount: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .min(200000, 'Minimum is ₦200,000'),
  customer_name: z.string().min(2, 'Name is required'),
  customer_phone: z.string().min(10, 'Phone is required'),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
})

type Form = z.infer<typeof schema>

interface RegisterResult {
  receipt_id: string
  participant_id: string
  codes: string[]
}

export function RegisterReceiptPage() {
  const { session } = useAuth()
  const { data: profile } = useProfile(session?.user.id)
  const qc = useQueryClient()
  const [result, setResult] = useState<RegisterResult | null>(null)
  const [branchId, setBranchId] = useState<string>('')

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name')
      if (error) throw error
      return (data ?? []) as Branch[]
    },
  })

  useEffect(() => {
    if (branchId) return
    if (profile?.branch_id) {
      setBranchId(profile.branch_id)
    } else if (branches && branches.length > 0) {
      setBranchId(branches[0].id)
    }
  }, [profile, branches, branchId])

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      receipt_no: '',
      amount: 200000,
      customer_name: '',
      customer_phone: '',
      pin: '',
    },
  })

  const amount = form.watch('amount')
  const tier = useMemo(() => {
    const n = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0
    return findTier(n)
  }, [amount])

  const mutation = useMutation({
    mutationFn: async (data: Form) => {
      if (!branchId) throw new Error('Please select a branch first')
      const { data: res, error } = await supabase.rpc('register_receipt', {
        p_receipt_no: data.receipt_no.trim(),
        p_amount: data.amount,
        p_customer_name: data.customer_name.trim(),
        p_customer_phone: data.customer_phone.trim(),
        p_branch_id: branchId,
        p_pin: data.pin,
      })
      if (error) throw error
      return res as RegisterResult
    },
    onSuccess: (res) => {
      setResult(res)
      qc.invalidateQueries({ queryKey: ['dashboard-receipts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-tickets'] })
    },
  })

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card title="✅ Tickets Issued">
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              Receipt {form.getValues('receipt_no')}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs uppercase text-gray-500 mb-2">Ticket Codes</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-sm">
                {result.codes.map((c) => (
                  <div
                    key={c}
                    className="bg-white rounded border border-gray-200 px-3 py-2"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <div className="font-medium mb-1">Tell the customer</div>
              <div>
                They can check their tickets at{' '}
                <span className="font-mono">rafflefiesta.netlify.app/portal</span>{' '}
                using their phone number and the PIN they just entered.
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setResult(null)
                  form.reset()
                }}
              >
                Register Another
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(result.codes.join('\n'))
                }}
              >
                Copy Codes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const branchLocked = !!profile?.branch_id

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Register Receipt</h1>
        <p className="text-sm text-gray-500">
          {branchLocked
            ? branches?.find((b) => b.id === profile.branch_id)?.name ??
              'Loading branch…'
            : 'Head office — select branch for this registration'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            >
              {!branchLocked && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch *
                  </label>
                  <select
                    required
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  >
                    <option value="">Select branch…</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Receipt Number *"
                {...form.register('receipt_no')}
                error={form.formState.errors.receipt_no?.message}
                placeholder="RCP-2026-000001"
              />

              <Input
                label="Amount (₦) *"
                type="number"
                step="1"
                min="200000"
                {...form.register('amount', { valueAsNumber: true })}
                error={form.formState.errors.amount?.message}
              />

              <Input
                label="Customer Name *"
                {...form.register('customer_name')}
                error={form.formState.errors.customer_name?.message}
              />

              <Input
                label="Customer Phone *"
                {...form.register('customer_phone')}
                error={form.formState.errors.customer_phone?.message}
                placeholder="0803 456 7890"
              />

              <Input
                label="Customer PIN (6 digits) *"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                {...form.register('pin')}
                error={form.formState.errors.pin?.message}
                className="text-center text-xl tracking-[0.5em] font-mono"
              />
              <p className="text-xs text-gray-500 -mt-2">
                Customer enters their own 6-digit PIN. They will use this to view
                tickets later at{' '}
                <span className="font-mono">rafflefiesta.netlify.app/portal</span>
              </p>

              {mutation.isError && (
                <p className="text-sm text-red-600">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : 'Failed'}
                </p>
              )}

              <Button
                type="submit"
                disabled={mutation.isPending || !branchId}
                className="w-full"
              >
                {mutation.isPending
                  ? 'Issuing tickets…'
                  : 'Confirm & Issue Tickets'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="Entitlement Preview">
            {!tier ? (
              <div className="text-sm text-gray-500">
                {typeof amount === 'number' &&
                !Number.isNaN(amount) &&
                amount >= 200000
                  ? 'Calculating…'
                  : 'Enter an amount of ₦200,000 or more.'}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center bg-brand-light rounded-lg py-4">
                  <div className="text-xs uppercase text-brand/70">{tier.label}</div>
                  <div className="text-2xl font-bold text-brand mt-1">
                    {formatNaira(
                      typeof amount === 'number' && !Number.isNaN(amount)
                        ? amount
                        : 0
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Standard Tickets</span>
                    <Badge tone="info">{tier.standard_tickets}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>VIP Grand Entry</span>
                    <Badge tone={tier.vip_tickets > 0 ? 'success' : 'default'}>
                      {tier.vip_tickets}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-brand">
                      {tier.standard_tickets + tier.vip_tickets}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
