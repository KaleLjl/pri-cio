import { useState, useCallback } from 'react';

export interface UploadMetaDataState {
  description: string;
  price: string;
  currency: string;
}

export interface UploadMetaDataActions {
  setPrice: (value: string) => void;
  setDescription: (value: string) => void;
  setCurrency: (value: string) => void;
  resetMetaData: () => void;
  validatePrice: (value: string) => boolean;
}

export const useUploadMetaData = (): [UploadMetaDataState, UploadMetaDataActions] => {
  const [description, setDescriptionState] = useState('');
  const [price, setPriceState] = useState('');
  const [currency, setCurrencyState] = useState<string>('USD');

  const setPrice = useCallback((value: string) => {
    setPriceState(value);
  }, []);

  const setDescription = useCallback((value: string) => {
    setDescriptionState(value);
  }, []);

  const setCurrency = useCallback((value: string) => {
    setCurrencyState(value);
  }, []);

  const resetMetaData = useCallback(() => {
    setPriceState('');
    setDescriptionState('');
  }, []);

  const validatePrice = useCallback((value: string): boolean => {
    // 只允许数字和一个小数点
    if (!/^\d*\.?\d*$/.test(value)) {
      return false;
    }

    // 检查小数点后是否超过两位
    const parts = value.split('.');
    if (parts[1] && parts[1].length > 2) {
      return false;
    }

    // 限制整数部分为12位
    if (parts[0].length > 12) {
      return false;
    }

    return true;
  }, []);

  return [
    { description, price, currency },
    { setPrice, setDescription, setCurrency, resetMetaData, validatePrice }
  ];
};
