import { X, CreditCard, User, Phone, Sparkles, AlertCircle } from "lucide-react";
import React, { useState } from "react";
import { apiService } from "../utils/api";
import "./CustomerDetails.css";

interface CustomerDetailsModalProps {
  customerInfo: { name: string; phone: string };
  setCustomerInfo: React.Dispatch<React.SetStateAction<{ name: string; phone: string }>>;
  total: number;
  cartItems: any[];
  restaurantId: string;
  tableId: string;
  onCheckoutComplete: (paymentData: {
    paymentMode: 'upi' | 'razorpay';
    upiQr: string | null;
    upiId: string | null;
    razorpayOrderId: string | null;
  }) => void;
  onClose: () => void;
}

export default function CustomerDetailsModal({
  total,
  customerInfo,
  cartItems,
  restaurantId,
  tableId,
  onCheckoutComplete,
  setCustomerInfo,
  onClose,
}: CustomerDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{name?: string; phone?: string}>({});

  const validateForm = () => {
    const newErrors: {name?: string; phone?: string} = {};
    
    if (!customerInfo.name.trim()) {
      newErrors.name = "Name is required";
    } else if (customerInfo.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    if (!customerInfo.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(customerInfo.phone)) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = customerInfo.name.trim() !== "" && /^\d{10}$/.test(customerInfo.phone);

  const handleCheckout = async () => {
  if (!validateForm()) return;

  try {
    setIsProcessing(true);
    setErrors({});

    if (!cartItems || cartItems.length === 0) {
      alert('Your cart is empty. Please add items before checkout.');
      return;
    }

    const tableNumber = tableId?.replace('table_', '') || '1';

    const orderData = {
  customerName: customerInfo.name.trim(),
  customerPhone: customerInfo.phone.trim(),
  amount: total,
  restaurant_id: parseInt(restaurantId),
  table_number: parseInt(tableNumber),
  payment_method: "razorpay" as "razorpay",
  items: cartItems.map(item => ({
    id: Number(item.id),
    name: String(item.name),
    price: Number(item.price),
    quantity: Number(item.quantity),
  })),
};

    const response = await apiService.createOrder(orderData)

    const paymentData = {
      paymentMode: response.payment_mode as 'upi' | 'razorpay',
      upiQr: response.upi_qr,
      upiId: response.upi_id,
      razorpayOrderId: response.order_id,
    };

    onCheckoutComplete(paymentData);

  } catch (error) {
    // existing error handling
  } finally {
    setIsProcessing(false);
  }
};

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerInfo({ ...customerInfo, name: value });
    if (errors.name && value.trim().length >= 2) {
      setErrors({ ...errors, name: undefined });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 10) {
      setCustomerInfo({ ...customerInfo, phone: value });
      if (errors.phone && /^\d{10}$/.test(value)) {
        setErrors({ ...errors, phone: undefined });
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="customer-modal-container">
        {/* Decorative Elements */}
        <div className="modal-decoration-top"></div>
        <div className="modal-decoration-bottom"></div>
        
        {/* Close Button */}
        <button onClick={onClose} className="modal-close-btn" disabled={isProcessing}>
          <X size={20} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <div className="header-icon">
            <User size={24} />
          </div>
          <h3 className="modal-title">Almost There!</h3>
          <p className="modal-subtitle">
            Just a few details to complete your order
          </p>
        </div>

        {/* Form Content */}
        <div className="modal-form">
          {/* Name Input Group */}
          <div className="input-group">
            <label className="input-label">
              <User size={16} />
              Full Name *
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter your full name"
                value={customerInfo.name}
                onChange={handleNameChange}
                className={`form-input ${
                  errors.name ? 'input-invalid' : 
                  customerInfo.name.trim() && customerInfo.name.trim().length >= 2 ? 'input-valid' : ''
                }`}
                disabled={isProcessing}
              />
              {customerInfo.name.trim() && customerInfo.name.trim().length >= 2 && !errors.name && (
                <div className="input-checkmark">✓</div>
              )}
              {errors.name && (
                <div className="input-error">
                  <AlertCircle size={16} />
                </div>
              )}
            </div>
            {errors.name && (
              <span className="error-message">{errors.name}</span>
            )}
          </div>

          {/* Phone Input Group */}
          <div className="input-group">
            <label className="input-label">
              <Phone size={16} />
              Phone Number *
            </label>
            <div className="input-wrapper">
              <input
                type="tel"
                placeholder="Enter 10-digit phone number"
                value={customerInfo.phone}
                onChange={handlePhoneChange}
                className={`form-input ${
                  errors.phone ? 'input-invalid' : 
                  /^\d{10}$/.test(customerInfo.phone) ? 'input-valid' : ''
                }`}
                disabled={isProcessing}
              />
              {/^\d{10}$/.test(customerInfo.phone) && !errors.phone && (
                <div className="input-checkmark">✓</div>
              )}
              {errors.phone && (
                <div className="input-error">
                  <AlertCircle size={16} />
                </div>
              )}
            </div>
            {errors.phone && (
              <span className="error-message">{errors.phone}</span>
            )}
            {customerInfo.phone && !errors.phone && customerInfo.phone.length < 10 && (
              <span className="help-text">{10 - customerInfo.phone.length} more digits needed</span>
            )}
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <div className="summary-header">
              <Sparkles size={16} />
              Order Summary
            </div>
            <div className="summary-details">
              <div className="summary-row">
                <span>Items ({cartItems?.length || 0})</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="summary-row total-row">
                <span>Total Amount</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={!isFormValid || isProcessing}
            className={`checkout-button ${
              isFormValid && !isProcessing ? 'button-enabled' : 'button-disabled'
            }`}
          >
            <div className="button-content">
              {isProcessing ? (
                <>
                  <div className="btn-spinner"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Proceed to Payment</span>
                </>
              )}
              {!isProcessing && <div className="button-shimmer"></div>}
            </div>
            {!isFormValid && !isProcessing && (
              <div className="button-overlay">
                <span>Complete form to continue</span>
              </div>
            )}
          </button>

          {/* Security Notice */}
          <div className="security-notice">
            <div className="security-icon">🔒</div>
            <span>Your information is secure and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}