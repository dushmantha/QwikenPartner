import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface QueueBadgeContextType {
  hasNewBooking: boolean;
  showBadge: () => void;
  hideBadge: () => void;
}

const QueueBadgeContext = createContext<QueueBadgeContextType | undefined>(undefined);

export const useQueueBadge = () => {
  const context = useContext(QueueBadgeContext);
  if (!context) {
    throw new Error('useQueueBadge must be used within QueueBadgeProvider');
  }
  return context;
};

interface QueueBadgeProviderProps {
  children: ReactNode;
}

export const QueueBadgeProvider: React.FC<QueueBadgeProviderProps> = ({ children }) => {
  const [hasNewBooking, setHasNewBooking] = useState(false);

  const showBadge = useCallback(() => {
    console.log('🔴 Showing queue badge - new booking created');
    setHasNewBooking(true);
  }, []);

  const hideBadge = useCallback(() => {
    console.log('✅ Hiding queue badge - queue tab clicked');
    setHasNewBooking(false);
  }, []);

  const value = {
    hasNewBooking,
    showBadge,
    hideBadge,
  };

  return (
    <QueueBadgeContext.Provider value={value}>
      {children}
    </QueueBadgeContext.Provider>
  );
};