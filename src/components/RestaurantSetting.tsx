import { useState, useEffect } from 'react'
import { apiService } from '../utils/api'
import { Store, Phone, Mail, CreditCard, Smartphone, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'



interface RestaurantSettingsState {
  name: string
  description: string
  phone: string
  email: string
  upiId: string
  razorpayMerchantId: string
}

interface MessageState {
  type: 'success' | 'error' | ''
  text: string
}

export default function RestaurantSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<RestaurantSettingsState>({
    name: '',
    description: '',
    phone: '',
    email: '',
    upiId: '',
    razorpayMerchantId: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<MessageState>({ type: '', text: '' })

  // Fetch settings on mount
  useEffect(() => {
  const fetchSettings = async () => {
    try {
      if (!user?.restaurantId) return

      const data = await apiService.getRestaurantSettings(user.restaurantId)

      setSettings({
        name: data.name || '',
        description: data.description || '',
        phone: data.phone || '',
        email: data.email || '',
        upiId: data.upi_id || '',
        razorpayMerchantId: data.razorpay_merchant_id || '',
      })
    } catch {
      setMessage({ type: 'error', text: 'Failed to load settings.' })
    }
  }

  fetchSettings()
}, [user])


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSettings(prev => ({ ...prev, [name]: value }))
  }

  const validate = (): string => {
    if (!settings.name.trim()) return 'Restaurant name is required.'
    if (!/^\d{10,13}$/.test(settings.phone)) return 'Enter a valid phone number (10-13 digits).'
    if (!/^.+@.+\..+$/.test(settings.email)) return 'Enter a valid email address.'
    if (!settings.upiId.trim() && !settings.razorpayMerchantId.trim())
      return 'Add at least UPI ID or Razorpay Merchant ID.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    const err = validate()
    if (err) {
      setMessage({ type: 'error', text: err })
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: settings.name.trim(),
        description: settings.description.trim(),
        phone: settings.phone.trim(),
        email: settings.email.trim(),
        upi_id: settings.upiId.trim(),
        razorpay_merchant_id: settings.razorpayMerchantId.trim(),
      }
      if (!user?.restaurantId) {
        setMessage({ type: 'error', text: 'User not authenticated.' })
        setLoading(false)
        return
      }
      await apiService.updateRestaurantSettings(user.restaurantId, payload)
      setMessage({ type: 'success', text: 'Settings updated successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3500)
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-card">
        {/* Header */}
        <div className="settings-header">
          <div className="header-icon">
            <Store size={32} />
          </div>
          <h2 className="settings-title">Restaurant Settings</h2>
          <p className="settings-subtitle">
            Manage your restaurant information and payment details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          {/* Basic Info */}
          <div className="form-section">
            <div className="section-header">
              <Store size={20} />
              <h3 className="section-title">Basic Information</h3>
            </div>
            <div className="input-group">
              <label className="input-label">
                <Store size={16} /> Restaurant Name *
              </label>
              <input
                type="text"
                name="name"
                value={settings.name}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your restaurant name"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Description (Optional)</label>
              <textarea
                name="description"
                value={settings.description}
                onChange={handleChange}
                className="form-textarea"
                rows={3}
                placeholder="Tell customers about your restaurant..."
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="form-section">
            <div className="section-header">
              <Phone size={20} />
              <h3 className="section-title">Contact Information</h3>
            </div>
            <div className="input-group">
              <label className="input-label">
                <Phone size={16} /> Contact Phone *
              </label>
              <input
                type="text"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                className="form-input"
                maxLength={13}
                placeholder="Enter 10-13 digit number"
              />
            </div>
            <div className="input-group">
              <label className="input-label">
                <Mail size={16} /> Contact Email *
              </label>
              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                className="form-input"
                placeholder="restaurant@example.com"
              />
            </div>
          </div>

          {/* Payment */}
          <div className="form-section payment-section">
            <div className="section-header">
              <CreditCard size={20} />
              <h3 className="section-title">Payment Configuration</h3>
            </div>
            <p className="section-description">
              Configure at least one payment method to receive customer payments
            </p>

            <div className="payment-options">
              <div className="payment-option">
                <div className="payment-option-header">
                  <Smartphone size={18} />
                  <span>UPI Payment</span>
                </div>
                <div className="input-group">
                  <label className="input-label">UPI ID</label>
                  <input
                    type="text"
                    name="upiId"
                    value={settings.upiId}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="restaurant@upi"
                  />
                </div>
              </div>

              <div className="payment-divider">
                <span>OR</span>
              </div>

              <div className="payment-option">
                <div className="payment-option-header">
                  <CreditCard size={18} />
                  <span>Razorpay Integration</span>
                </div>
                <div className="input-group">
                  <label className="input-label">Razorpay Merchant ID</label>
                  <input
                    type="text"
                    name="razorpayMerchantId"
                    value={settings.razorpayMerchantId}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="merchant_xxxxxxxxxxxxx"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`message ${message.type === 'success' ? 'message-success' : 'message-error'}`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            <Save size={18} />
            <span>{loading ? 'Saving Settings...' : 'Save Settings'}</span>
            {loading && <div className="loading-spinner"></div>}
          </button>
        </form>
      </div>
    </div>
  )
}
