import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TOKEN_KEY = 'customer_session_token'

interface Ticket {
  ticket_code: string
  type: 'standard' | 'vip'
  status: 'active' | 'cancelled' | 'claimed'
  draw_scope: 'branch' | 'central'
  issued_at: string
  tier_label: string | null
}

interface Win {
  prize_name: string
  prize_value: number | null
  ticket_code: string
  drawn_at: string
  claim_status: string
}

interface Receipt {
  receipt_no: string
  branch_name: string
  amount: number
  net_amount: number
  registered_at: string
  status: string
  tier_label: string | null
  tickets: Ticket[]
  wins: Win[]
}

export function CustomerTicketsPage() {
  const [receipts, setReceipts] = useState<Receipt[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      window.location.href = '/portal'
      return
    }

    supabase
      .rpc('customer_get_tickets', { p_token: token })
      .then(({ data, error }) => {
        if (error) {
          if (error.message.includes('expired')) {
            localStorage.removeItem(TOKEN_KEY)
            window.location.href = '/portal'
            return
          }
          setError(error.message)
        } else {
          setReceipts(data?.receipts ?? [])
        }
        setLoading(false)
      })
  }, [])

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      await supabase.rpc('customer_logout', { p_token: token })
      localStorage.removeItem(TOKEN_KEY)
    }
    window.location.href = '/portal'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand">
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={logout}
            className="mt-4 text-sm text-brand underline"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  const totalWins = receipts?.reduce((sum, r) => sum + r.wins.length, 0) ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand text-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="font-bold">🎁 Festive Raffle Fiesta</div>
            <div className="text-xs text-white/60">Your tickets</div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-white/80 underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-xs uppercase text-gray-500">Receipts</div>
            <div className="text-2xl font-bold text-gray-900">
              {receipts?.length ?? 0}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-xs uppercase text-gray-500">Tickets</div>
            <div className="text-2xl font-bold text-green-600">
              {receipts?.length ?? 0}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="text-xs uppercase text-gray-500">Wins</div>
            <div className="text-2xl font-bold text-brand-accent">
              {totalWins}
            </div>
          </div>
        </div>

        {!receipts?.length ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 text-sm">
            No receipts found for your phone number.
          </div>
        ) : (
          receipts.map((r, i) => {
            const ticket = r.tickets[0]
            return (
              <div key={i} className="bg-white rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm text-gray-500">
                      {r.receipt_no}
                    </div>
                    <div className="text-sm font-medium">{r.branch_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ₦{Number(r.amount).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(r.registered_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="bg-brand-light rounded-lg px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase text-brand/70">
                        Your Ticket
                      </div>
                      <div className="font-mono text-lg font-bold text-brand">
                        {ticket?.ticket_code ?? '—'}
                      </div>
                    </div>
                    <div className="text-right text-xs text-brand/70">
                      {r.tier_label ?? ticket?.tier_label ?? ''}
                    </div>
                  </div>
                </div>

                {r.wins.length > 0 && (
                  <div className="border-t border-green-100 bg-green-50 px-5 py-4">
                    <div className="text-xs uppercase text-green-700 font-medium mb-2">
                      🎉 Congratulations
                    </div>
                    {r.wins.map((w, k) => (
                      <div key={k} className="text-sm text-green-900">
                        <div className="font-medium">{w.prize_name}</div>
                        <div className="text-xs">
                          Ticket {w.ticket_code} · {w.claim_status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}

        <p className="text-xs text-gray-500 text-center py-4">
          Keep your PIN safe. Do not share it with anyone.
        </p>
      </div>
    </div>
  )
}
