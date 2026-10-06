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

type Mode = 'new' | 'existing'

const schema = z.object({
  receipt_no: z.string().min(1, 'Receipt number is required'),
  amount: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .min(200000, 'Minimum is ₦200,000'),
  customer_phone: z.string().min(10, 'Phone is required'),
  customer_name: z.string().optional(),
  pin: z.string().optional(),
})

type Form = z.infer<typeof schema>

interface RegisterResult {
  receipt_id: string
  participant_id: string
  ticket_code: string
  tier_label: string
  tier_id: number
}

interface CustomerLookup {
  found: boolean
  id?: string
  full_name?: string
  phone?: string
  has_pin?: boolean
}

export function RegisterReceiptPage() {
  const { session } = useAuth()
  const { data: profile } = useProfile(session?.user.id)
  const qc = useQueryClient()
  const [result, setResult] = useState<RegisterResult | null>(null)
  const [branchId, setBranchId] = useState('')
  const [mode, setMode] = useState<Mode>('new')
  const [lookup, setLookup] = useState<CustomerLookup | null>(null)
  const [lookupError, setLookupError] = useState('')

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
    if (profile?.branch_id) setBranchId(profile.branch_id)
    else if (branches && branches.length > 0) setBranchId(branches[0].id)
  }, [profile, branches, branchId])

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      receipt_no: '',
      amount: 200000,
      customer_phone: '',
      customer_name: '',
      pin: '',
    },
  })

  const amount = form.watch('amount')
  const tier = useMemo(() => {
    const n = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0
    return findTier(n)
  }, [amount])

  const doLookup = async () => {
    setLookupError('')
    setLookup(null)
    const phone = form.getValues('customer_phone')
    if (!phone || phone.length < 10) {
      setLookupError('Enter a phone number first')
      return
    }
    const { data, error } = await supabase.rpc('lookup_customer', {
      p_phone: phone,
      p_branch_id: branchId,
    })
    if (error) {
      setLookupError(error.message)
      return
    }
    const res = data as CustomerLookup
    if (!res.found) {
      setLookupError('Customer not registered at this branch. Switch to New Customer.')
      return
    }
    setLookup(res)
  }

  const mutation = useMutation({
    mutationFn: async (data: Form) => {
      if (!branchId) throw new Error('Select a branch first')

      if (mode === 'new') {
        // Manual validation for new-customer fields
        if (!data.customer_name || data.customer_name.trim().length < 2) {
          throw new Error('Customer name is required')
        }
        if (!data.pin || !/^\d{6}$/.test(data.pin)) {
          throw new Error('PIN must be exactly 6 digits')
        }

        const { data: res, error } = await supabase.rpc('register_receipt', {
          p_receipt_no: data.receipt_no.trim(),
          p_amount: data.amount,
          p_customer_phone: data.customer_phone.trim(),
          p_branch_id: branchId,
          p_mode: 'new',
          p_customer_name: data.customer_name.trim(),
          p_pin: data.pin,
        })
        if (error) throw error
        return res as RegisterResult
      } else {
        if (!lookup?.found) throw new Error('Look up an existing customer first')

        const { data: res, error } = await supabase.rpc('register_receipt', {
          p_receipt_no: data.receipt_no.trim(),
          p_amount: data.amount,
          p_customer_phone: data.customer_phone.trim(),
          p_branch_id: branchId,
          p_mode: 'existing',
        })
        if (error) throw error
        return res as RegisterResult
      }
    },
    onSuccess: (res) => {
      setResult(res)
      qc.invalidateQueries({ queryKey: ['dashboard-receipts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-tickets'] })
    },
  })

  const reset = () => {
    setResult(null)
    setLookup(null)
    setLookupError('')
    form.reset()
    setMode('new')
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setLookup(null)
    setLookupError('')
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card title="✅ Ticket Issued">
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              Receipt {form.getValues('receipt_no')}
            </div>

            <div className="bg-brand-light rounded-lg p-6 text-center">
              <div className="text-xs uppercase text-brand/70 mb-1">
                {result.tier_label} · Your Ticket
              </div>
              <div className="font-mono text-2xl font-bold text-brand tracking-wider break-all">
                {result.ticket_code}
              </div>
              <div className="text-xs text-brand/70 mt-2">
                Keep this code safe. You will need it to claim prizes.
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <div className="font-medium mb-1">Tell the customer</div>
              <div>
                They can check their ticket at{' '}
                <span className="font-mono">rafflefiesta.netlify.app/portal</span>{' '}
                using their phone number and PIN.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={reset} className="flex-1">Register Another</Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(result.ticket_code)}
              >
                Copy Code
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const branchLocked = !!profile?.branch_id
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>

  return (
    <div className="max-w-4xl">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Register Ticket</h1>
        <p className="text-sm text-gray-500">
          {branchLocked
            ? branches?.find((b) => b.id === profile.branch_id)?.name ?? 'Loading…'
            : 'Head office — select branch'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => switchMode('new')}
              className={`py-2.5 rounded-md text-sm font-medium transition ${
                mode === 'new' ? 'bg-white shadow-sm text-brand' : 'text-gray-600'
              }`}
            >
              New Customer
            </button>
            <button
              type="button"
              onClick={() => switchMode('existing')}
              className={`py-2.5 rounded-md text-sm font-medium transition ${
                mode === 'existing' ? 'bg-white shadow-sm text-brand' : 'text-gray-600'
              }`}
            >
              Existing Customer
            </button>
          </div>

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
                    className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  >
                    <option value="">Select branch…</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Receipt Number *"
                {...form.register('receipt_no')}
                error={errors.receipt_no?.message}
                placeholder="RCP-2026-000001"
              />

              <Input
                label="Amount (₦) *"
                type="number"
                inputMode="numeric"
                step="1"
                min="200000"
                {...form.register('amount', { valueAsNumber: true })}
                error={errors.amount?.message}
              />

              {mode === 'new' ? (
                <>
                  <Input
                    label="Customer Name *"
                    {...form.register('customer_name')}
                    error={errors.customer_name?.message}
                  />
                  <Input
                    label="Customer Phone *"
                    type="tel"
                    inputMode="tel"
                    {...form.register('customer_phone')}
                    error={errors.customer_phone?.message}
                    placeholder="0803 456 7890"
                  />
                  <Input
                    label="Customer PIN (6 digits) *"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    {...form.register('pin')}
                    error={errors.pin?.message}
                    className="text-center text-xl tracking-[0.5em] font-mono"
                  />
                  <p className="text-xs text-gray-500 -mt-2">
                    Customer chooses this PIN. They will use it with their phone to check tickets later.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                      <Input
                        label="Customer Phone *"
                        type="tel"
                        inputMode="tel"
                        {...form.register('customer_phone')}
                        error={errors.customer_phone?.message}
                        placeholder="0803 456 7890"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={doLookup}
                      className="sm:mb-0.5"
                    >
                      Look Up
                    </Button>
                  </div>

                  {lookupError && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                      {lookupError}
                    </p>
                  )}

                  {lookup?.found && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                      <div className="font-medium text-green-900">{lookup.full_name}</div>
                      <div className="text-green-800">{lookup.phone}</div>
                      {lookup.has_pin === false && (
                        <div className="text-xs text-amber-700 mt-1">
                          ⚠ No PIN on file — customer must visit branch to set one
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {mutation.isError && (
                <p className="text-sm text-red-600">
                  {mutation.error instanceof Error ? mutation.error.message : 'Failed'}
                </p>
              )}

              <Button
                type="submit"
                disabled={
                  mutation.isPending ||
                  !branchId ||
                  (mode === 'existing' && !lookup?.found)
                }
                className="w-full"
              >
                {mutation.isPending ? 'Issuing ticket…' : 'Confirm & Issue Ticket'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="Preview">
            {!tier ? (
              <div className="text-sm text-gray-500">
                Enter an amount of ₦200,000 or more.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center bg-brand-light rounded-lg py-4">
                  <div className="text-xs uppercase text-brand/70">{tier.label}</div>
                  <div className="text-2xl font-bold text-brand mt-1">
                    {formatNaira(amount)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Ticket Type</span>
                  <Badge tone={tier.label === 'Tier 6' ? 'success' : 'info'}>
                    {tier.label === 'Tier 6' ? 'VIP' : 'Standard'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
                  <span className="font-medium">Prize Pool</span>
                  <span className="font-medium text-brand">{tier.label}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
