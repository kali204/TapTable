import { X, Plus, Minus, Trash2 } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartModalProps {
  cart: CartItem[];
  total: number;
  updateQty: (id: string, qty: number) => void;
  onClose: () => void;
  onProceed: () => void;
}

export default function CartModal({
  cart,
  total,
  updateQty,
  onClose,
  onProceed,
}: CartModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-xl p-6 relative shadow-lg">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-semibold text-center mb-6">Your Order</h3>

        {/* Cart Content */}
        {cart.length === 0 ? (
          <div className="text-gray-600 text-center mb-4">No items in cart.</div>
        ) : (
          <>
            <ul className="divide-y">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      ₹{item.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Decrease"
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="bg-gray-200 rounded-full p-1 hover:bg-red-100"
                      disabled={item.quantity === 1}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="mx-2 w-6 text-center font-bold">
                      {item.quantity}
                    </span>
                    <button
                      aria-label="Increase"
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="bg-gray-200 rounded-full p-1 hover:bg-green-200"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      aria-label="Remove"
                      onClick={() => updateQty(item.id, 0)}
                      className="ml-2 text-gray-400 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Total Section */}
            <div className="flex justify-between items-center mt-5 mb-3">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold text-green-700">
                ₹{total.toFixed(2)}
              </span>
            </div>

            {/* Proceed Button */}
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold mt-2"
              onClick={onProceed}
            >
              Proceed to Customer Details
            </button>
          </>
        )}
      </div>
    </div>
  );
}