import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const TOKEN_KEY = 'customer_session_token'

export function CustomerLoginPage() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('customer_login', {
        p_phone: phone,
        p_pin: pin,
      })
      if (error) throw error

      localStorage.setItem(TOKEN_KEY, data.token)
      window.location.href = '/portal/tickets'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎁</div>
          <h1 className="text-2xl font-bold text-white">Festive Raffle Fiesta</h1>
          <p className="text-white/70 text-sm mt-1">Check your tickets</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                placeholder="0803 456 7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                6-Digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                required
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl tracking-[0.5em] font-mono focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || phone.length < 10 || pin.length !== 6}
              className="w-full bg-brand text-white rounded-md py-2 text-sm font-medium hover:bg-brand/90 disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'View My Tickets'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500 text-center">
            Don't have a PIN? Ask the cashier to set one up when you
            register your next receipt.
          </div>
        </div>

        <p className="text-center text-xs text-white/50 mt-6">
          For assistance, call your branch directly.
        </p>
      </div>
    </div>
  )
}
