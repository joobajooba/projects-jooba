import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import './ProfileDropdown.css';

export default function ProfileDropdown() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const profilePictureUrl = user?.profile_picture_url;

  if (!user) {
    return null;
  }

  return (
    <div className="profile-dropdown-container" ref={dropdownRef}>
      <button
        className="profile-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile menu"
      >
        {profilePictureUrl ? (
          <img src={profilePictureUrl} alt="Profile" className="navbar-profile-picture" />
        ) : (
          <div className="navbar-profile-picture-placeholder">
            <span>?</span>
          </div>
        )}
      </button>
      {isOpen && (
        <div className="profile-dropdown-menu">
          <button
            className="profile-dropdown-item"
            onClick={() => {
              navigate('/profile/');
              setIsOpen(false);
            }}
          >
            View Profile
          </button>
          <button
            className="profile-dropdown-item"
            onClick={() => {
              navigate('/profile/?edit=true');
              setIsOpen(false);
            }}
          >
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
}
