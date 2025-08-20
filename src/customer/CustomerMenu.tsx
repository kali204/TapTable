import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Plus, ShoppingCart, User, Heart, RefreshCw } from "lucide-react";
import { apiService } from "../utils/api";
import jsPDF from "jspdf";
import "./CustomerMenu.css";

import CartModal from "./CartModal";
import ProfileModal from "./CustomerProfile";
import CustomerDetailsModal from "./CustomerDetailsModal";
import PaymentModal from "./PaymentModal";
import UpgradeProfileModal from "./UpgradeProfileModal";

const CATEGORIES_ORDER = [
  "Appetizers",
  "Main Course",
  "Pizzas",
  "Burgers & Sandwiches",
  "Salads & Sides",
  "Pasta",
  "Drinks & Beverages",
  "Desserts",
];

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  dietaryInfo: {
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isNutFree: boolean;
  };
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface CustomerProfile {
  name: string;
  email: string;
  phone: string;
  preferences: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    nutFree: boolean;
  };
  favorites: string[];
}

export default function CustomerMenu() {
  const { restaurantId, tableId } = useParams();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "" });
  const [profile, setProfile] = useState<CustomerProfile>({
    name: "",
    email: "",
    phone: "",
    preferences: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      nutFree: false,
    },
    favorites: [],
  });

  // Modal States
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Payment States
  const [paymentMode, setPaymentMode] = useState<'upi' | 'razorpay' | null>(null);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [upiQr, setUpiQr] = useState<string | null>(null);
  const [upiId, setUpiId] = useState<string | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [upgradeData, setUpgradeData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Get Table Number
  const getTableNumber = useCallback(() => {
    if (!tableId) return 0;
    const match = tableId.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }, [tableId]);

  const tableNumber = getTableNumber();

  // Load Profile
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("customerProfile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
      }
    } catch (error) {
      console.error("Failed to load saved profile:", error);
    }
  }, []);

  // Initialize on mount and restaurant change
  useEffect(() => {
    if (restaurantId) {
      loadMenu();
      loadRestaurantInfo();
      resetState();
    }
  }, [restaurantId, tableId]);

  const resetState = () => {
    setCart([]);
    setCustomerInfo({ name: "", phone: "" });
    setShowCartModal(false);
    setShowCustomerModal(false);
    setShowUpiModal(false);
    setPaymentCompleted(false);
    setPaymentMode(null);
    setRazorpayOrderId(null);
    setUpiQr(null);
    setUpiId(null);
    setError(null);
  };

  // Filtered and grouped menu
  const groupedMenu = useMemo(() => {
    const filteredItems = menuItems.filter((item) => {
      if (profile.preferences.vegetarian && !item.dietaryInfo.isVegetarian) return false;
      if (profile.preferences.vegan && !item.dietaryInfo.isVegan) return false;
      if (profile.preferences.glutenFree && !item.dietaryInfo.isGlutenFree) return false;
      if (profile.preferences.nutFree && !item.dietaryInfo.isNutFree) return false;
      return true;
    });

    return CATEGORIES_ORDER.map((category) => ({
      category,
      items: filteredItems.filter((i) => i.category === category && i.available),
    })).filter((group) => group.items.length > 0);
  }, [menuItems, profile.preferences]);

  // API Calls
  const loadRestaurantInfo = async () => {
    try {
      const info = await apiService.getRestaurantInfo(Number(restaurantId));
      setRestaurantName(info.name);
    } catch (err) {
      console.error("Failed to load restaurant info:", err);
      setRestaurantName("Restaurant");
    }
  };

  const loadMenu = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getMenu(Number(restaurantId));
      setMenuItems(
        data.map((it: any) => ({
          id: String(it.id),
          name: it.name,
          description: it.description || "",
          price: it.price,
          category: it.category,
          image: it.image || "",
          available: it.available,
          dietaryInfo: {
            isVegetarian: it.dietaryInfo?.isVegetarian || false,
            isVegan: it.dietaryInfo?.isVegan || false,
            isGlutenFree: it.dietaryInfo?.isGlutenFree || false,
            isNutFree: it.dietaryInfo?.isNutFree || false,
          }
        }))
      );
    } catch (err) {
      console.error("Failed to load menu:", err);
      setError("Failed to load menu. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  // Dietary Badges Component
  const DietaryBadges = ({ dietaryInfo }: { dietaryInfo: MenuItem['dietaryInfo'] }) => {
    const badges = [];
    
    if (dietaryInfo.isVegan) badges.push({ label: 'Vegan', color: 'green' });
    else if (dietaryInfo.isVegetarian) badges.push({ label: 'Veg', color: 'green' });
    
    if (dietaryInfo.isGlutenFree) badges.push({ label: 'Gluten Free', color: 'blue' });
    if (dietaryInfo.isNutFree) badges.push({ label: 'Nut Free', color: 'orange' });

    return (
      <div className="dietary-badges">
        {badges.map((badge, index) => (
          <span key={index} className={`badge badge-${badge.color}`}>
            {badge.label}
          </span>
        ))}
      </div>
    );
  };

  // Cart Logic
  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const found = prev.find((c) => c.id === item.id);
      if (found) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setPaymentCompleted(false);
  }, []);

  const updateQty = useCallback((id: string, q: number) => {
    setCart((prev) =>
      q <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, quantity: q } : i))
    );
    setPaymentCompleted(false);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setPaymentCompleted(false);
  }, []);

  // Favorites Logic
  const toggleFavorite = useCallback((itemId: string) => {
    setProfile((prev) => {
      const favorites = prev.favorites.includes(itemId)
        ? prev.favorites.filter((id) => id !== itemId)
        : [...prev.favorites, itemId];
      const updated = { ...prev, favorites };
      try {
        localStorage.setItem("customerProfile", JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save favorites:", error);
      }
      return updated;
    });
  }, []);

  // Total Calculation
  const total = useMemo(
    () => cart.reduce((a, b) => a + b.price * b.quantity, 0),
    [cart]
  );

  // Profile Management
  const handleProfileSave = useCallback(() => {
    try {
      localStorage.setItem("customerProfile", JSON.stringify(profile));
      setShowProfileModal(false);
      alert("Profile saved successfully!");
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Failed to save profile. Please try again.");
    }
  }, [profile]);

  const clearAllFilters = useCallback(() => {
    const updated = {
      ...profile, 
      preferences: {
        vegetarian: false, 
        vegan: false, 
        glutenFree: false, 
        nutFree: false
      }
    };
    setProfile(updated);
    try {
      localStorage.setItem("customerProfile", JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save cleared filters:", error);
    }
  }, [profile]);

  // Receipt Generation
  const downloadReceipt = useCallback(() => {
    if (!paymentCompleted || cart.length === 0) {
      alert('No completed order to download receipt for.');
      return;
    }

    try {
      const doc = new jsPDF();
      const gst = total * 0.05;
      const finalAmount = total + gst;

      // Header
      doc.setFontSize(20);
      doc.text(restaurantName, 20, 20);
      doc.setFontSize(12);
      doc.text(`Table ${tableNumber}`, 20, 35);
      doc.text(`Customer: ${customerInfo.name}`, 20, 45);
      doc.text(`Phone: ${customerInfo.phone}`, 20, 55);
      doc.text(`Date: ${new Date().toLocaleString()}`, 20, 65);
      
      doc.line(20, 70, 190, 70); // Horizontal line

      // Items
      let y = 85;
      doc.setFontSize(14);
      doc.text('Items:', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      cart.forEach((item) => {
        doc.text(
          `${item.quantity} x ${item.name}`,
          25, y
        );
        doc.text(
          `₹${(item.price * item.quantity).toFixed(2)}`,
          150, y
        );
        y += 8;
      });

      // Totals
      doc.line(20, y, 190, y);
      y += 10;
      
      doc.setFontSize(12);
      doc.text(`Subtotal:`, 120, y);
      doc.text(`₹${total.toFixed(2)}`, 150, y);
      y += 10;
      
      doc.text(`GST (5%):`, 120, y);
      doc.text(`₹${gst.toFixed(2)}`, 150, y);
      y += 10;
      
      doc.setFontSize(14);
      doc.text(`Total:`, 120, y);
      doc.text(`₹${finalAmount.toFixed(2)}`, 150, y);

      // Footer
      doc.setFontSize(10);
      doc.text('Thank you for dining with us!', 20, y + 20);

      doc.save(`${restaurantName}-Receipt-${Date.now()}.pdf`);
      
      // Reset state after download
      resetState();
    } catch (error) {
      console.error("Failed to generate receipt:", error);
      alert("Failed to generate receipt. Please try again.");
    }
  }, [paymentCompleted, cart, total, restaurantName, tableNumber, customerInfo]);

  // Reorder last order
  const reorderLastOrder = useCallback(() => {
    const lastOrder = localStorage.getItem("lastOrder");
    if (lastOrder) {
      try {
        const parsedOrder = JSON.parse(lastOrder);
        if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
          setCart(parsedOrder);
          alert("Previous order added to cart!");
        } else {
          alert("No valid previous order found.");
        }
      } catch (e) {
        console.error("Failed to load last order:", e);
        alert("Failed to load previous order.");
      }
    } else {
      alert("No previous order found.");
    }
  }, []);

  // Error Display
  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-3">Error Loading Menu</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              <RefreshCw size={16} className="inline mr-2" />
              Refresh Page
            </button>
            <button 
              onClick={loadMenu}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading Display
  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto bg-gray-50 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading delicious menu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {restaurantName}
          </h1>
          <p className="text-gray-600">Table {tableNumber}</p>
        </div>
        <button
          onClick={() => setShowProfileModal(true)}
          className="bg-white p-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
        >
          <User size={24} className="text-gray-600" />
        </button>
      </div>

      {/* ACTIVE FILTERS */}
      {Object.values(profile.preferences).some(pref => pref) && (
        <div className="filter-status mb-6">
          <div className="filter-header">
            <div>
              <p className="filter-title">Active Dietary Filters:</p>
              <div className="filter-tags">
                {profile.preferences.vegetarian && (
                  <span className="filter-tag filter-tag-vegetarian">🥬 Vegetarian</span>
                )}
                {profile.preferences.vegan && (
                  <span className="filter-tag filter-tag-vegan">🌱 Vegan</span>
                )}
                {profile.preferences.glutenFree && (
                  <span className="filter-tag filter-tag-gluten-free">🚫 Gluten-Free</span>
                )}
                {profile.preferences.nutFree && (
                  <span className="filter-tag filter-tag-nut-free">🥜 Nut-Free</span>
                )}
              </div>
            </div>
            <button onClick={clearAllFilters} className="clear-filters-btn">
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="flex gap-3 mb-6">
        {localStorage.getItem("lastOrder") && (
          <button
            onClick={reorderLastOrder}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-colors text-sm font-medium"
          >
            🔄 Reorder Last
          </button>
        )}
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-full transition-colors text-sm font-medium"
          >
            🗑️ Clear Cart
          </button>
        )}
      </div>

      {/* MENU SECTIONS */}
      {groupedMenu.map((group) => (
        <section key={group.category} className="mb-12">
          <div className="menu-section-header">
            <h2 className="menu-section-title">{group.category}</h2>
            <span className="menu-item-count">
              {group.items.length} item{group.items.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.items.map((item) => (
              <div key={item.id} className="menu-item-card group">
                {/* Item Image */}
                {item.image && (
                  <div className="relative overflow-hidden rounded-lg mb-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="menu-item-image group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&h=200&fit=crop';
                      }}
                    />
                    {/* Favorite Button */}
                    <button
                      className={`favorite-btn ${
                        profile.favorites.includes(item.id) ? "active" : "inactive"
                      }`}
                      onClick={() => toggleFavorite(item.id)}
                    >
                      <Heart size={18} fill={profile.favorites.includes(item.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                )}

                {/* Item Details */}
                <div className="space-y-3">
                  <h3 className="menu-item-title">{item.name}</h3>
                  
                  {item.description && (
                    <p className="menu-item-description">{item.description}</p>
                  )}
                  
                  <DietaryBadges dietaryInfo={item.dietaryInfo} />
                  
                  <div className="menu-item-footer">
                    <span className="menu-item-price">₹{item.price.toFixed(2)}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="add-to-cart-btn group-hover:scale-105 transition-transform"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* EMPTY STATE */}
      {groupedMenu.length === 0 && !isLoading && (
        <div className="empty-results">
          <div className="empty-results-container">
            <div className="empty-results-icon">
              <ShoppingCart size={64} />
            </div>
            <h3 className="empty-results-title">
              {Object.values(profile.preferences).some(pref => pref) 
                ? "No items match your dietary preferences" 
                : "No menu items available"}
            </h3>
            <p className="empty-results-description">
              {Object.values(profile.preferences).some(pref => pref)
                ? "Try adjusting your dietary filters to see more options."
                : "Please check back later or contact the restaurant."}
            </p>
            {Object.values(profile.preferences).some(pref => pref) && (
              <button onClick={clearAllFilters} className="view-all-btn">
                View All Items
              </button>
            )}
          </div>
        </div>
      )}

      {/* FLOATING CART */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-2 border-blue-500 px-6 py-4 z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div
              className="text-left cursor-pointer flex-1"
              onClick={() => setShowCartModal(true)}
            >
              <div className="text-lg font-bold text-gray-800">
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </div>
              <div className="text-2xl font-bold text-green-600">
                ₹{total.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => setShowCartModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full flex items-center gap-2 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ShoppingCart size={20} /> 
              View Cart
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showCartModal && (
        <CartModal
          cart={cart}
          total={total}
          updateQty={updateQty}
          onClose={() => setShowCartModal(false)}
          onProceed={() => {
            if (cart.length === 0) {
              alert('Your cart is empty!');
              return;
            }
            setShowCartModal(false);
            setShowCustomerModal(true);
          }}
        />
      )}

      {showCustomerModal && (
        <CustomerDetailsModal
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          total={total}
          cartItems={cart}
          restaurantId={restaurantId || ''}
          tableId={tableId || ''}
          onCheckoutComplete={(paymentData) => {
            setPaymentMode(paymentData.paymentMode);
            setUpiQr(paymentData.upiQr);
            setUpiId(paymentData.upiId);
            setRazorpayOrderId(paymentData.razorpayOrderId);
            setShowCustomerModal(false);
            setShowUpiModal(true);
          }}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {showUpiModal && (
        <PaymentModal
          paymentMode={paymentMode || 'upi'}
          upiQr={upiQr}
          upiId={upiId}
          razorpayOrderId={razorpayOrderId}
          amount={total}
          onPaymentDone={() => {
            try {
              localStorage.setItem("lastOrder", JSON.stringify(cart));
            } catch (error) {
              console.error("Failed to save last order:", error);
            }
            
            setShowUpiModal(false);
            setPaymentCompleted(true);
            setShowUpgradeModal(true);
          }}
          onClose={() => setShowUpiModal(false)}
        />
      )}

      {showUpgradeModal && (
        <UpgradeProfileModal
          upgradeData={upgradeData}
          setUpgradeData={setUpgradeData}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          profile={profile}
          setProfile={setProfile}
          onSave={handleProfileSave}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* RECEIPT DOWNLOAD */}
      {paymentCompleted && cart.length > 0 && (
        <button
          onClick={downloadReceipt}
          className="fixed bottom-24 right-6 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-full shadow-lg z-40 transition-all duration-200 hover:scale-105"
        >
          📄 Download Receipt
        </button>
      )}
    </div>
  );
}