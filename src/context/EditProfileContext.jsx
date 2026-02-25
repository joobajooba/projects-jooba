import { createContext, useContext, useState, useCallback } from 'react';

const EditProfileContext = createContext(null);

export function EditProfileProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [requestNFTsMosaicEdit, setRequestNFTsMosaicEdit] = useState(false);

  const openEditPanel = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeEditPanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openEditPanelAndRequestNFTsMosaic = useCallback(() => {
    setRequestNFTsMosaicEdit(true);
    setIsOpen(false);
  }, []);

  return (
    <EditProfileContext.Provider
      value={{
        isOpen,
        openEditPanel,
        closeEditPanel,
        requestNFTsMosaicEdit,
        setRequestNFTsMosaicEdit,
        openEditPanelAndRequestNFTsMosaic,
      }}
    >
      {children}
    </EditProfileContext.Provider>
  );
}

export function useEditProfile() {
  const ctx = useContext(EditProfileContext);
  if (!ctx) {
    throw new Error('useEditProfile must be used within EditProfileProvider');
  }
  return ctx;
}
