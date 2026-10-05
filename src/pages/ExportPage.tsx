import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { downloadCSV } from '@/lib/csv'
import { Button, Card, Input } from '@/components/UI'

const EXPORTS = [
  { key: 'receipts', label: 'Receipts', table: 'receipts' },
  { key: 'tickets', label: 'Tickets', table: 'tickets' },
  { key: 'returns', label: 'Returns', table: 'returns' },
  { key: 'winners', label: 'Winners', table: 'winners' },
  { key: 'reconciliation', label: 'Reconciliation', table: 'reconciliation' },
] as const

type ExportKey = (typeof EXPORTS)[number]['key']

export function ExportPage() {
  const [selected, setSelected] = useState<ExportKey>('receipts')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setLoading(true)
    setError('')
    try {
      const table = EXPORTS.find((e) => e.key === selected)!.table
      let query = supabase.from(table).select('*')
      const dateCol =
        selected === 'receipts' ? 'registered_at'
        : selected === 'tickets' ? 'issued_at'
        : selected === 'returns' ? 'created_at'
        : selected === 'winners' ? 'drawn_at'
        : 'business_date'

      if (dateFrom) query = query.gte(dateCol, dateFrom)
      if (dateTo) query = query.lte(dateCol, dateTo)

      const { data, error } = await query
      if (error) throw error
      if (!data?.length) {
        setError('No records found for the selected filters.')
        return
      }

      const filename = `${selected}_${dateFrom || 'all'}_${dateTo || 'all'}.csv`
      downloadCSV(filename, data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export Records</h1>
        <p className="text-sm text-gray-500">
          Download CSV files compatible with Google Sheets and Excel
        </p>
      </div>

      <Card title="Export Options">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data to Export</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPORTS.map((exp) => (
                <button
                  key={exp.key}
                  type="button"
                  onClick={() => setSelected(exp.key)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition ${
                    selected === exp.key
                      ? 'border-brand bg-brand-light font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {exp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Date (optional)"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="To Date (optional)"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleExport} disabled={loading} className="w-full">
            {loading ? 'Generating…' : 'Download CSV'}
          </Button>
        </div>
      </Card>

      <Card title="Notes">
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Files are UTF-8 encoded with BOM — they open cleanly in Google Sheets</li>
          <li>Dates use ISO format (YYYY-MM-DD)</li>
          <li>Amounts are plain numbers without currency symbols</li>
          <li>Every export is written to the audit log</li>
        </ul>
      </Card>
    </div>
  )
}
