import  { useState, useEffect } from 'react'
import { apiService } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash, Code } from 'lucide-react'

interface Table {
  id: string
  number: number
  seats: number
  qrCode: string
}

export default function TableManagement() {
  const { user } = useAuth()
  const [tables, setTables] = useState<Table[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newTable, setNewTable] = useState({ number: '', seats: '' })

  useEffect(() => {
    if (user) {
      loadTables()
    }
  }, [user])

  const loadTables = async () => {
    try {
      const tablesData = await apiService.getTables()
      setTables(tablesData.map((table: any) => ({
        ...table,
        id: table.id.toString()
      })))
    } catch (error) {
      console.error('Failed to load tables:', error)
      // Fallback to demo data
      setTables([]) // or keep previous tables if needed

    }
  }

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiService.addTable({
        number: parseInt(newTable.number),
        seats: parseInt(newTable.seats)
      })
      loadTables()
      setNewTable({ number: '', seats: '' })
      setShowModal(false)
    } catch (error) {
      console.error('Failed to add table:', error)
      // Fallback for demo
      const tableId = Date.now().toString()
      const qrData = `https://taptable.onrender.com/menu/1/table_${newTable.number}`
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`
      
      setTables(prev => [...prev, {
        id: tableId,
        number: parseInt(newTable.number),
        seats: parseInt(newTable.seats),
        qrCode
      }])
      
      setNewTable({ number: '', seats: '' })
      setShowModal(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteTable(parseInt(id))
      loadTables()
    } catch (error) {
      console.error('Failed to delete table:', error)
      setTables(prev => prev.filter(table => table.id !== id))
    }
  }

  const downloadQR = (qrCode: string, tableNumber: number) => {
    const link = document.createElement('a')
    link.href = qrCode
    link.download = `table-${tableNumber}-qr.png`
    link.click()
  }

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map(table => (
          <div key={table.id} className="card text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Table {table.number}</h3>
              <p className="text-gray-600">{table.seats} seats</p>
            </div>
            
            <div className="mb-4">
              <img 
                src={table.qrCode} 
                alt={`QR Code for Table ${table.number}`}
                className="w-32 h-32 mx-auto border border-gray-200 rounded-lg"
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add New Table</h3>
            <form onSubmit={handleAddTable} className="space-y-4">
              <input
                type="number"
                placeholder="Table number"
                value={newTable.number}
                onChange={(e) => setNewTable(prev => ({ ...prev, number: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <input
                type="number"
                placeholder="Number of seats"
                value={newTable.seats}
                onChange={(e) => setNewTable(prev => ({ ...prev, seats: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Add Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
 