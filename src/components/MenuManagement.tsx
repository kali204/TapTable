import { useState, useEffect } from 'react'
import { apiService } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit, Trash, RefreshCw } from 'lucide-react'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  available: boolean
  dietaryInfo: {
    isVegetarian: boolean
    isVegan: boolean
    isGlutenFree: boolean
    isNutFree: boolean
  }
}

export default function MenuManagement() {
  const { user } = useAuth()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isReclassifying, setIsReclassifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState('')

  useEffect(() => {
    if (user) {
      loadMenuItems()
    }
  }, [user])

  const loadMenuItems = async () => {
    try {
      setError(null)
      const items = await apiService.getMenu((user!.restaurantId))
      setMenuItems(items.map((item: any) => ({
        ...item,
        id: item.id.toString(),
        image: item.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=200&fit=crop',
        dietaryInfo: {
          isVegetarian: item.dietaryInfo?.isVegetarian || false,
          isVegan: item.dietaryInfo?.isVegan || false,
          isGlutenFree: item.dietaryInfo?.isGlutenFree || false,
          isNutFree: item.dietaryInfo?.isNutFree || false,
        }
      })))
    } catch (error) {
      console.error('Failed to load menu items:', error)
      setError('Failed to load menu items')
    }
  }

  // Re-classify all menu items
  const handleReclassifyMenu = async () => {
    setIsReclassifying(true)
    try {
      await apiService.reclassifyMenu((user!.restaurantId))
      await loadMenuItems()
      alert('Menu items re-classified successfully!')
    } catch (error) {
      console.error('Failed to re-classify menu:', error)
      alert('Failed to re-classify menu items')
    } finally {
      setIsReclassifying(false)
    }
  }
  

  const categories = [
    'Appetizers',
    'Main Course',
    'Pizzas',
    'Burgers & Sandwiches',
    'Salads & Sides',
    'Pasta',
    'Drinks & Beverages',
    'Desserts',
    'Breakfast',
    'Snacks',
    'Specials'
  ]

  // Dietary Badges Component
  const DietaryBadges = ({ dietaryInfo }: { dietaryInfo: MenuItem['dietaryInfo'] }) => {
    const badges = []
    
    if (dietaryInfo.isVegan) badges.push({ label: 'Vegan', color: 'bg-green-100 text-green-800' })
    else if (dietaryInfo.isVegetarian) badges.push({ label: 'Veg', color: 'bg-green-100 text-green-800' })
    
    if (dietaryInfo.isGlutenFree) badges.push({ label: 'Gluten Free', color: 'bg-blue-100 text-blue-800' })
    if (dietaryInfo.isNutFree) badges.push({ label: 'Nut Free', color: 'bg-orange-100 text-orange-800' })

    if (badges.length === 0) {
      badges.push({ label: 'Non-Veg', color: 'bg-red-100 text-red-800' })
    }

    return (
      <div className="flex flex-wrap gap-1 mb-2">
        {badges.map((badge, index) => (
          <span 
            key={index} 
            className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}
          >
            {badge.label}
          </span>
        ))}
      </div>
    )
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setName(item.name)
    setDescription(item.description)
    setPrice(item.price.toString())
    setCategory(item.category)
    setImage(item.image)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      await apiService.deleteMenuItem(parseInt(id))
      await loadMenuItems() // Reload to update the UI
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert('Failed to delete item')
    }
  }

  const handleToggleAvailability = async (id: string) => {
    const item = menuItems.find(i => i.id === id)
    if (!item) return

    try {
      await apiService.updateMenuItem(parseInt(id), { available: !item.available })
      await loadMenuItems() // Reload to update the UI
    } catch (error) {
      console.error('Failed to toggle availability:', error)
      alert('Failed to update availability')
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setPrice('')
    setCategory('')
    setImage('')
    setEditingItem(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !description.trim() || !price || !category) {
      alert('Please fill in all required fields')
      return
    }

    const itemData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      image: image.trim(),
      available: true
    }

    try {
      if (editingItem) {
        await apiService.updateMenuItem(parseInt(editingItem.id), itemData)
      } else {
        await apiService.addMenuItem(itemData)
      }
      await loadMenuItems() // Reload to show updated data
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to save item:', error)
      alert('Failed to save item')
    }
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={loadMenuItems}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Menu Management</h2>
          <p className="text-gray-600 text-sm mt-1">
            Dietary preferences are automatically detected based on item names and descriptions
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleReclassifyMenu}
            disabled={isReclassifying}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            title="Re-classify dietary information for all items"
          >
            <RefreshCw className={`w-4 h-4 ${isReclassifying ? 'animate-spin' : ''}`} />
            {isReclassifying ? 'Re-classifying...' : 'Re-classify All'}
          </button>
          <button 
            onClick={() => { resetForm(); setShowModal(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {categories.map(category => {
          const categoryItems = menuItems.filter(item => item.category === category)
          if (categoryItems.length === 0) return null

          return (
            <div key={category} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{category}</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryItems.map(item => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=200&fit=crop';
                      }}
                    />
                    
                    {/* Dietary Badges */}
                    <DietaryBadges dietaryInfo={item.dietaryInfo} />
                    
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{item.name}</h4>
                      <span className="text-blue-600 font-bold">₹{item.price}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                    
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.available}
                          onChange={() => handleToggleAvailability(item.id)}
                          className="rounded"
                        />
                        <span className={`text-sm ${item.available ? 'text-green-600' : 'text-red-600'}`}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="text-gray-600 hover:text-blue-600 transition-colors"
                          title="Edit item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete item"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h3>
            
            {!editingItem && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Dietary preferences (Veg/Non-veg, Vegan, Gluten-free, Nut-free) 
                  will be automatically detected based on the item name and description you provide.
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Item name (e.g., Paneer Pizza, Chicken Burger)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <textarea
                placeholder="Description (e.g., Fresh vegetables with mozzarella cheese)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="url"
                placeholder="Image URL (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
