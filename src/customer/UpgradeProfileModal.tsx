import { X } from "lucide-react";
import React from "react";
import { apiService } from "../utils/api";

interface UpgradeData {
  name: string;
  email: string;
  phone: string;
}

interface UpgradeProfileModalProps {
  upgradeData: UpgradeData;
  setUpgradeData: React.Dispatch<React.SetStateAction<UpgradeData>>;
  onClose: () => void;
  onProfileCreated?: () => void; // Optional callback
}

export default function UpgradeProfileModal({
  upgradeData,
  setUpgradeData,
  onClose,
  onProfileCreated,
}: UpgradeProfileModalProps) {
  const [loading, setLoading] = React.useState(false);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const res = await apiService.upgradeProfile(upgradeData);
      localStorage.setItem("customerToken", res.token);
      alert("Profile created successfully!");
      setLoading(false);
      onClose();
      onProfileCreated?.();
    } catch (err) {
      console.error(err);
      alert("Failed to create profile.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-96 rounded-xl p-6 relative shadow-lg">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h3 className="text-xl font-semibold text-center mb-4">
          Create Your Profile
        </h3>

        {/* Name Input */}
        <input
          type="text"
          placeholder="Name"
          value={upgradeData.name}
          onChange={(e) =>
            setUpgradeData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="w-full px-3 py-2 mb-2 border rounded-md"
        />

        {/* Email Input */}
        <input
          type="email"
          placeholder="Email"
          value={upgradeData.email}
          onChange={(e) =>
            setUpgradeData((prev) => ({ ...prev, email: e.target.value }))
          }
          className="w-full px-3 py-2 mb-2 border rounded-md"
        />

        {/* Phone Input */}
        <input
          type="tel"
          placeholder="Phone"
          value={upgradeData.phone}
          onChange={(e) =>
            setUpgradeData((prev) => ({ ...prev, phone: e.target.value }))
          }
          className="w-full px-3 py-2 mb-4 border rounded-md"
        />

        {/* Save Profile Button */}
        <button
          onClick={handleSaveProfile}
          disabled={loading}
          className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md w-full ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}