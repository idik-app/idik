"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useFlowSheetStore } from '@/lib/store/useFlowSheetStore';

interface RoomBranding {
  primaryColor: string;
  logoUrl?: string;
  displayName: string;
}

export interface RoomContextType {
  slug: string;
  capabilities: Record<string, boolean>;
  branding: RoomBranding;
  clinical_config: {
    thresholds?: Record<string, { min?: number; max?: number }>;
    defaultResolution?: string;
    [key: string]: any;
  };
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ 
  slug: string; 
  children: React.ReactNode;
  config: RoomContextType;
}> = ({ slug, children, config }) => {
  const resetStore = useFlowSheetStore((state) => state.resetStore);
  const currentUnitId = useFlowSheetStore((state) => state.currentUnitId);

  useEffect(() => {
    // Reset store only if the unit has changed
    if (currentUnitId !== slug) {
      console.log(`[RoomProvider] Switching unit to: ${slug}. Resetting store...`);
      resetStore(slug);
    }
    
    // Apply dynamic branding to CSS variables
    if (config.branding.primaryColor) {
      document.documentElement.style.setProperty('--unit-primary', config.branding.primaryColor);
    }
  }, [slug, resetStore, currentUnitId, config.branding.primaryColor]);

  return (
    <RoomContext.Provider value={config}>
      <div className="unit-container" data-unit={slug}>
        {children}
      </div>
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
