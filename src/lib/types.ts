export type Role = 'staff' | 'manager' | 'auditor' | 'admin'

export interface Branch {
  id: string
  name: string
  code: string
}

export interface Profile {
  id: string
  full_name: string
  role: Role
  branch_id: string | null
  is_active: boolean
}

export interface Tier {
  id: number
  label: string
  min_amount: number
  max_amount: number | null
  standard_tickets: number
  vip_tickets: number
}

export interface Receipt {
  id: string
  receipt_no: string
  branch_id: string
  amount: number
  net_amount: number
  purchased_at: string
  registered_at: string
  registered_by: string
  customer_name: string
  customer_phone: string
  status: 'active' | 'partial_return' | 'returned'
  branches?: { name: string; code: string }
}

export interface Ticket {
  id: string
  receipt_id: string
  ticket_code: string
  type: 'standard' | 'vip'
  status: 'active' | 'cancelled' | 'claimed'
  branch_id: string
  issued_at: string
}

export interface Return {
  id: string
  receipt_id: string
  return_ref: string
  return_amount: number
  returned_at: string
  reason: string | null
  entered_by: string
  approved_by: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  receipts?: { receipt_no: string; amount: number }
}

export interface Reconciliation {
  id: string
  business_date: string
  branch_id: string
  total_receipts: number
  total_tickets: number
  total_returns: number
  variance: number
  finance_signed_by: string | null
  finance_signed_at: string | null
  audit_signed_by: string | null
  audit_signed_at: string | null
  locked: boolean
  branches?: { name: string; code: string }
}

export interface Prize {
  id: string
  name: string
  value: number | null
  quantity: number
  branch_id: string | null
}

export interface Winner {
  id: string
  prize_id: string
  ticket_id: string
  drawn_at: string
  claim_status: 'pending' | 'claimed' | 'disputed'
  prizes?: { name: string; value: number }
  tickets?: { ticket_code: string; type: string; receipt_id: string }
}
