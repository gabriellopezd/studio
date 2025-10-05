
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface UIContextState {
    modalState: { type: string | null; data?: any };
    formState: any;
    handleOpenModal: (type: string, data?: any) => void;
    handleCloseModal: (type: string) => void;
    setFormState: React.Dispatch<any>;
}

const UIContext = createContext<UIContextState | undefined>(undefined);

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modalState, setModalState] = useState<{ type: string | null; data?: any }>({ type: null });
    const [formState, setFormState] = useState<any>({});

    const handleOpenModal = useCallback((type: string, data: any = {}) => {
        // Just store the data as-is. Conversion will happen in the specific provider.
        setFormState(data);
        setModalState({ type, data });
    }, []);

    const handleCloseModal = useCallback((type: string) => {
        if (modalState.type === type) {
            setModalState({ type: null });
            setFormState({}); // Always clear form state on close
        }
    }, [modalState.type]);

    return (
        <UIContext.Provider value={{
            modalState,
            formState,
            handleOpenModal,
            handleCloseModal,
            setFormState,
        }}>
            {children}
        </UIContext.Provider>
    );
};
