import type { Tier } from './types'

export const DEFAULT_TIERS: Tier[] = [
  { id: 1, label: 'Tier 1', min_amount: 200000,  max_amount: 299999, standard_tickets: 1,  vip_tickets: 0 },
  { id: 2, label: 'Tier 2', min_amount: 300000,  max_amount: 399999, standard_tickets: 3,  vip_tickets: 0 },
  { id: 3, label: 'Tier 3', min_amount: 400000,  max_amount: 499999, standard_tickets: 7,  vip_tickets: 0 },
  { id: 4, label: 'Tier 4', min_amount: 500000,  max_amount: 699999, standard_tickets: 18, vip_tickets: 0 },
  { id: 5, label: 'Tier 5', min_amount: 700000,  max_amount: 999999, standard_tickets: 40, vip_tickets: 0 },
  { id: 6, label: 'Tier 6', min_amount: 1000000, max_amount: null,   standard_tickets: 85, vip_tickets: 1 },
]

export function findTier(amount: number, tiers: Tier[] = DEFAULT_TIERS): Tier | null {
  if (amount < 200000) return null
  return (
    tiers.find(
      (t) => amount >= t.min_amount && (t.max_amount === null || amount <= t.max_amount)
    ) ?? null
  )
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
