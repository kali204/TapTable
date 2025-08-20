import { X } from "lucide-react";
import "./ProfileModal.css";

interface Preferences {
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  nutFree: boolean;
}

interface CustomerProfile {
  name: string;
  email: string;
  phone: string;
  preferences: Preferences;
  favorites: string[];
}

interface ProfileModalProps {
  profile: CustomerProfile;
  setProfile: (profile: CustomerProfile) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function ProfileModal({
  profile,
  setProfile,
  onSave,
  onClose,
}: ProfileModalProps) {
  const handlePreferenceChange = (key: keyof Preferences, value: boolean) => {
    setProfile({
      ...profile,
      preferences: { ...profile.preferences, [key]: value },
    });
  };

  const formatPreferenceName = (key: string) => {
    const names: { [key: string]: string } = {
      vegetarian: "Vegetarian",
      vegan: "Vegan",
      glutenFree: "Gluten Free",
      nutFree: "Nut Free"
    };
    return names[key] || key;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Close Button */}
        <button onClick={onClose} className="close-button">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">Your Profile</h3>
          <p className="modal-subtitle">Manage your personal information and preferences</p>
        </div>

        {/* Form Content */}
        <div className="modal-content">
          {/* Personal Information Section */}
          <div className="form-section">
            <h4 className="section-title">Personal Information</h4>
            
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          {/* Dietary Preferences Section */}
          <div className="form-section">
            <h4 className="section-title">Dietary Preferences</h4>
            <div className="preferences-grid">
              {Object.keys(profile.preferences).map((prefKey) => (
                <label key={prefKey} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={profile.preferences[prefKey as keyof Preferences]}
                    onChange={(e) =>
                      handlePreferenceChange(
                        prefKey as keyof Preferences,
                        e.target.checked
                      )
                    }
                    className="checkbox-input"
                  />
                  <span className="checkbox-label">
                    {formatPreferenceName(prefKey)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button onClick={onSave} className="save-button">
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}