import { useState, useCallback } from 'react';

export interface UploadUIState {
  isEditing: boolean;
  activeField: 'price' | 'description' | null;
}

export interface UploadUIActions {
  setIsEditing: (value: boolean) => void;
  setActiveField: (field: 'price' | 'description' | null) => void;
  startEditing: (field: 'price' | 'description') => void;
  stopEditing: () => void;
}

export const useUploadUI = (): [UploadUIState, UploadUIActions] => {
  const [isEditing, setIsEditingState] = useState<boolean>(false);
  const [activeField, setActiveFieldState] = useState<'price' | 'description' | null>(null);

  const setIsEditing = useCallback((value: boolean) => {
    setIsEditingState(value);
    if (!value) {
      setActiveFieldState(null);
    }
  }, []);

  const setActiveField = useCallback((field: 'price' | 'description' | null) => {
    setActiveFieldState(field);
  }, []);

  const startEditing = useCallback((field: 'price' | 'description') => {
    setIsEditingState(true);
    setActiveFieldState(field);
  }, []);

  const stopEditing = useCallback(() => {
    setIsEditingState(false);
    setActiveFieldState(null);
  }, []);

  return [
    { isEditing, activeField },
    { setIsEditing, setActiveField, startEditing, stopEditing }
  ];
};
