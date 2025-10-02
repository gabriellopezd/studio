
'use client';

import { createContext, useContext } from 'react';
import type { AppState } from './types';

// Create the context with a default undefined value
export const AppContext = createContext<AppState | undefined>(undefined);

// Create a custom hook for using the context
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
