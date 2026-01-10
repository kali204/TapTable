import { useState, useEffect } from 'react'
import { apiService } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash, Code } from 'lucide-react'

/* ================= TYPES ================= */

interface Table {
  id: number
  number: number
  seats: number
  qrCode: string
}

/* ================= COMPONENT ================= */

export default function TableManagement() {
  const { user } = useAuth()

  const [tables, setTables] = useState<Table[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newTable, setNewTable] = useState({ number: '', seats: '' })
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  /* ================= EFFECT ================= */

  useEffect(() => {
    if (user?.restaurantId) {
      loadTables()
    }
  }, [user])

  /* ================= HELPERS ================= */

  const generateFallbackQR = (tableNumber: string | number) => {
    const base = window.location.origin.replace(/\/$/, '')
    const restaurantId = user?.restaurantId ?? 1
    const qrData = `${base}/menu/${restaurantId}/table_${tableNumber}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      qrData
    )}`
  }

  /* ================= API ================= */

  const loadTables = async () => {
    if (!user?.restaurantId) return
    setLoading(true)
    try {
      const res = await apiService.getTablesForRestaurant(user.restaurantId)

      setTables(
        (res || []).map((table: any) => ({
          id: table.id,
          number: Number(table.number),
          seats: Number(table.seats),
          qrCode: table.qr_code ?? '',
        }))
      )
    } catch (err) {
      console.error('Failed to load tables:', err)
      setTables([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTable.number || !newTable.seats || !user?.restaurantId) return

    setAdding(true)
    try {
      const payload = {
        number: String(newTable.number),
        seats: Number(newTable.seats),
        restaurant_id: user.restaurantId,
      }

      const created = await apiService.addTable(payload)

      setTables((prev) => [
        {
          id: created.id,
          number: Number(created.number),
          seats: Number(created.seats),
          qrCode: created.qr_code || generateFallbackQR(newTable.number),
        },
        ...prev,
      ])
    } catch (err) {
      console.error('Failed to add table:', err)

      // fallback add (offline safe)
      setTables((prev) => [
        {
          id: Date.now(),
          number: Number(newTable.number),
          seats: Number(newTable.seats),
          qrCode: generateFallbackQR(newTable.number),
        },
        ...prev,
      ])
    } finally {
      setAdding(false)
      setShowModal(false)
      setNewTable({ number: '', seats: '' })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await apiService.deleteTable(id)
    } catch (err) {
      console.error('Failed to delete table:', err)
    } finally {
      setTables((prev) => prev.filter((t) => t.id !== id))
    }
  }

  const downloadQR = (qrCode: string, tableNumber: number) => {
    if (!qrCode) return
    const link = document.createElement('a')
    link.href = qrCode
    link.download = `table-${tableNumber}-qr.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Table Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Table
        </button>
      </div>

      {loading ? (
        <p>Loading tables...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <div key={table.id} className="card text-center">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Table {table.number}</h3>
                <p className="text-gray-600">{table.seats} seats</p>
              </div>

              <div className="mb-4">
                <img
                  src={
                    table.qrCode ||
                    'https://via.placeholder.com/200x200?text=No+QR'
                  }
                  alt={`QR Code for Table ${table.number}`}
                  className="w-32 h-32 mx-auto border rounded-lg"
                />
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => downloadQR(table.qrCode, table.number)}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <Code className="w-4 h-4" />
                  Download QR
                </button>
                <button
                  onClick={() => handleDelete(table.id)}
                  className="text-red-600 hover:text-red-700 p-2"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Table</h3>

            <form onSubmit={handleAddTable} className="space-y-4">
              <input
                type="number"
                placeholder="Table number"
                value={newTable.number}
                onChange={(e) =>
                  setNewTable((p) => ({ ...p, number: e.target.value }))
                }
                className="w-full px-4 py-2 border rounded-lg"
                required
              />

              <input
                type="number"
                placeholder="Number of seats"
                value={newTable.seats}
                onChange={(e) =>
                  setNewTable((p) => ({ ...p, seats: e.target.value }))
                }
                className="w-full px-4 py-2 border rounded-lg"
                required
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setNewTable({ number: '', seats: '' })
                  }}
                  className="flex-1 btn-secondary"
                  disabled={adding}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={adding}
                >
                  {adding ? 'Adding...' : 'Add Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
