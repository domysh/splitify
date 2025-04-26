import { useState, useEffect, forwardRef } from 'react';
import { Box, TextInput, TextInputProps } from '@mantine/core';
import Big from 'big.js';


export const toIntValue = (val: Big | number | string | null | undefined): number | undefined => {
  if (val === null || val === undefined || val === '') return undefined;
  try {
    const bigVal = typeof val === 'object' ? val : new Big(String(val));
    return bigVal.mul(100).round(0).toNumber();
  } catch (error) {
    return undefined;
  }
};

export interface AdvancedNumberInputProps extends Omit<TextInputProps, 'value' | 'onChange'> {
  value?: Big | number | string | null;
  onChange?: (value: Big | null) => void;
  onChangeString?: (value: string) => void;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  precision?: number;
  currency?: string;
  decimalSeparator?: string;
  thousandSeparator?: string;
}

export const AdvancedNumberInput = forwardRef<HTMLInputElement, AdvancedNumberInputProps>(
  (
    {
      value,
      onChange,
      onChangeString,
      min,
      max,
      step = 1,
      precision = 2,
      currency = '€',
      decimalSeparator = ',',
      thousandSeparator = '.',
      ...props
    },
    ref
  ) => {
    
    const toBig = (val: any): Big | null => {
      if (val === null || val === undefined || val === '') return null;
      try {
        return new Big(String(val).replace(decimalSeparator, '.'));
      } catch (error) {
        return null;
      }
    };

    
    const [internalValue, setInternalValue] = useState<string>('');
    const [bigValue, setBigValue] = useState<Big | null>(toBig(value));
    
    const [userClearedValue, setUserClearedValue] = useState(false);

    
    useEffect(() => {
      
      const newBigValue = toBig(value);
      setBigValue(newBigValue);
      //console.log('values: ', internalValue, newBigValue, bigValue);
      if (newBigValue !== null && (!bigValue || !newBigValue.eq(bigValue))){
        setBigValue(newBigValue);
        setInternalValue(formatValue(newBigValue));
      }else if (userClearedValue && internalValue === '') {
        return;
      }else if (newBigValue === null) {
        setInternalValue('');
      } else if (!internalValue) {
        setInternalValue(formatValue(newBigValue));
      }
    }, [value]);

    
    const formatValue = (val: Big | null): string => {
      if (val === null) return '';
      
      const strValue = val.toFixed(precision);
      const [intPart, decPart = ''] = strValue.split('.');
      
      const formattedIntPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
      
      return decPart
        ? `${formattedIntPart}${decimalSeparator}${decPart}`
        : formattedIntPart;
    };

    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      
      const regex = new RegExp(`^[0-9${thousandSeparator}${decimalSeparator}]*$`);
      if (inputValue !== '' && !regex.test(inputValue)) return;
      
      setInternalValue(inputValue);
      onChangeString?.(inputValue);
      
      
      if (inputValue === '') {
        setUserClearedValue(true);
      } else {
        setUserClearedValue(false);
      }
      
      
      const sanitizedValue = inputValue
        .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
        .replace(decimalSeparator, '.');
      
      try {
        if (sanitizedValue === '') {
          setBigValue(null);
          onChange?.(null);
        } else {
          const newBigValue = new Big(sanitizedValue);
          
          
          const minBig = min !== undefined ? toBig(min) : null;
          const maxBig = max !== undefined ? toBig(max) : null;
          
          if (minBig !== null && newBigValue.lt(minBig)) return;
          if (maxBig !== null && newBigValue.gt(maxBig)) return;
          
          setBigValue(newBigValue);
          onChange?.(newBigValue);
        }
      } catch (error) {
        
      }
    };

    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      
      if (userClearedValue && internalValue === '') {
        
      } else if (bigValue !== null) {
        setInternalValue(formatValue(bigValue));
      }
      props.onBlur?.(e);
    };

    return (
      <TextInput
        ref={ref}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        rightSection={
          currency ? (
            <Box style={{ marginRight: 8 }}>{currency}</Box>
          ) : null
        }
        {...props}
      />
    );
  }
);

AdvancedNumberInput.displayName = 'AdvancedNumberInput';

export default AdvancedNumberInput;
