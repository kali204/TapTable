import { X, CreditCard, Smartphone, CheckCircle, Copy, AlertTriangle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import "./PaymentModal.css";

interface PaymentModalProps {
  paymentMode: 'upi' | 'razorpay' | null;
  upiQr: string | null;
  upiId: string | null;
  razorpayOrderId: string | null;
  amount: number;
  onPaymentDone: () => void;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentModal({
  paymentMode,
  upiQr,
  upiId,
  razorpayOrderId,
  amount,
  onPaymentDone,
  onClose,
}: PaymentModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Load Razorpay script
  useEffect(() => {
    if (paymentMode === 'razorpay' && !razorpayLoaded) {
      const existingScript = document.querySelector('script[src*="razorpay"]');
      if (existingScript) {
        setRazorpayLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        setRazorpayLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        setPaymentStatus('failed');
      };
      document.body.appendChild(script);
    }
  }, [paymentMode, razorpayLoaded]);

  // Success countdown
  useEffect(() => {
    if (paymentStatus === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (paymentStatus === 'success' && countdown === 0) {
      onPaymentDone();
    }
  }, [paymentStatus, countdown, onPaymentDone]);

  const handleRazorpayPayment = () => {
    if (!window.Razorpay) {
      alert('Payment system not ready. Please refresh the page.');
      return;
    }

    if (!razorpayOrderId) {
      alert('Order ID missing. Please try again.');
      return;
    }

    setPaymentStatus('processing');

    const options = {
      key: 'rzp_test_e3clyMYTBwCo5r',
      amount: amount * 100,
      currency: 'INR',
      name: 'Restaurant Payment',
      description: 'Table Order Payment',
      order_id: razorpayOrderId,
      handler: function (response: any) {
        setPaymentStatus('success');
        setCountdown(3);
      },
      prefill: {
        name: 'Customer',
        email: 'customer@example.com',
        contact: '9999999999'
      },
      theme: {
        color: '#059669'
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
        emi: false,
        paylater: false
      },
      modal: {
        ondismiss: function() {
          setPaymentStatus('pending');
        },
        escape: true,
        backdropclose: true
      }
    };

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        setPaymentStatus('failed');
      });
      razorpay.open();
    } catch (error) {
      console.error('Error opening Razorpay:', error);
      setPaymentStatus('failed');
    }
  };

  const handleManualPaymentDone = () => {
    setPaymentStatus('success');
    setCountdown(3);
  };

  const handleCopyUpiId = async () => {
    if (!upiId) return;

    try {
      await navigator.clipboard.writeText(upiId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = upiId;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy UPI ID:', fallbackErr);
        alert('Failed to copy. Please copy manually: ' + upiId);
      }
    }
  };

  const retryPayment = () => {
    setPaymentStatus('pending');
  };

  const retryRazorpayLoad = () => {
    setRazorpayLoaded(false);
    const existingScript = document.querySelector('script[src*="razorpay"]');
    if (existingScript) {
      existingScript.remove();
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-container">
        {/* Close Button */}
        <button onClick={onClose} className="payment-close-btn">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="payment-header">
          <div className="payment-icon">
            {paymentMode === 'razorpay' ? <CreditCard size={28} /> : <Smartphone size={28} />}
          </div>
          <h3 className="payment-title">
            {paymentMode === 'razorpay' ? 'Secure Payment' : 'Pay via UPI'}
          </h3>
          <div className="payment-amount">₹{amount.toFixed(2)}</div>
        </div>

        {/* Payment Content */}
        <div className="payment-content">
          {paymentStatus === 'success' ? (
            <div className="payment-success">
              <CheckCircle size={64} className="success-icon animate-bounce" />
              <h4>Payment Successful! 🎉</h4>
              <p>Your order has been confirmed.</p>
              {countdown > 0 && (
                <p className="countdown">Redirecting in {countdown} seconds...</p>
              )}
            </div>
          ) : paymentStatus === 'processing' ? (
            <div className="payment-processing">
              <div className="loading-spinner"></div>
              <h4>Processing Payment...</h4>
              <p>Please complete the payment in the popup window</p>
              <button 
                onClick={() => setPaymentStatus('pending')} 
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          ) : paymentStatus === 'failed' ? (
            <div className="payment-failed">
              <AlertTriangle size={64} className="failed-icon" />
              <h4>Payment Failed</h4>
              <p>There was an issue processing your payment</p>
              <div className="failed-actions">
                <button onClick={retryPayment} className="retry-btn">
                  <RefreshCw size={16} />
                  Try Again
                </button>
                {paymentMode === 'razorpay' && (
                  <button onClick={retryRazorpayLoad} className="reload-btn">
                    Reload Payment System
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {paymentMode === 'razorpay' ? (
                <div className="razorpay-payment">
                  <div className="payment-method-info">
                    <div className="method-icon">
                      <CreditCard size={24} />
                    </div>
                    <div className="method-details">
                      <h4>Razorpay Payment Gateway</h4>
                      <p>Pay securely with multiple payment options</p>
                    </div>
                  </div>
                  
                  <div className="payment-features">
                    <div className="feature">
                      <span className="feature-icon">📱</span>
                      <span>UPI Payment</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">💳</span>
                      <span>Credit/Debit Cards</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">🏦</span>
                      <span>Net Banking</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">👛</span>
                      <span>Digital Wallets</span>
                    </div>
                  </div>

                  <div className="security-badges">
                    <div className="security-badge">
                      <span className="badge-icon">🔒</span>
                      <span>256-bit SSL Encrypted</span>
                    </div>
                    <div className="security-badge">
                      <span className="badge-icon">🛡️</span>
                      <span>PCI DSS Compliant</span>
                    </div>
                  </div>

                  {!razorpayLoaded ? (
                    <div className="loading-payment">
                      <div className="btn-spinner"></div>
                      <p>Loading secure payment gateway...</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleRazorpayPayment}
                      className="razorpay-btn"
                    >
                      <CreditCard size={18} />
                      Pay ₹{amount.toFixed(2)} Securely
                    </button>
                  )}
                </div>
              ) : (
                <div className="upi-payment">
                  {upiQr && (
                    <div className="qr-container">
                      <div className="qr-wrapper">
                        <img
                          src={upiQr}
                          alt="UPI QR Code"
                          className="qr-code"
                          style={{ width: '250px', height: '250px' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      <p className="qr-instructions">
                        <Smartphone size={16} />
                        Scan with any UPI app to pay ₹{amount.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {upiId && (
                    <div className="upi-id-container">
                      <p className="upi-label">Or pay using UPI ID:</p>
                      <div className="upi-id">
                        <span className="upi-id-text">{upiId}</span>
                        <button
                          onClick={handleCopyUpiId}
                          className={`copy-btn ${copySuccess ? 'copied' : ''}`}
                        >
                          {copySuccess ? (
                            <>
                              <CheckCircle size={14} />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="upi-instructions">
                    <h5>💡 How to pay:</h5>
                    <ol>
                      <li>Open any UPI app (GPay, PhonePe, Paytm, etc.)</li>
                      <li>Scan the QR code or enter the UPI ID</li>
                      <li>Verify amount: ₹{amount.toFixed(2)}</li>
                      <li>Complete the payment with your UPI PIN</li>
                      <li>Click "Payment Completed" below</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleManualPaymentDone}
                    className="payment-done-btn"
                  >
                    <CheckCircle size={18} />
                    I have completed the payment
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="payment-footer">
          <div className="security-notice">
            <span className="security-icon">🔒</span>
            <span>Your payment is 100% secure and encrypted</span>
          </div>
          {paymentMode === 'razorpay' && (
            <div className="powered-by">
              <span>Powered by Razorpay • Trusted by millions</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}