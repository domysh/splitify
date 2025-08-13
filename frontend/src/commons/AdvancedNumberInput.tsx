import { useState, useEffect, forwardRef, useCallback } from "react";
import { Box, TextInput, TextInputProps } from "@mantine/core";
import Big from "big.js";

export interface AdvancedNumberInputProps
    extends Omit<TextInputProps, "value" | "onChange"> {
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

export const AdvancedNumberInput = forwardRef<
    HTMLInputElement,
    AdvancedNumberInputProps
>(
    (
        {
            value,
            onChange,
            onChangeString,
            min,
            max,
            precision = 2,
            currency = "€",
            decimalSeparator = ",",
            thousandSeparator = ".",
            ...props
        },
        ref,
    ) => {
        const toBig = useCallback(
            (val: Big | null | number | undefined | string): Big | null => {
                if (val === null || val === undefined || val === "")
                    return null;
                try {
                    return new Big(String(val).replace(decimalSeparator, "."));
                } catch (error) {
                    return null;
                }
            },
            [decimalSeparator],
        );

        const [internalValue, setInternalValue] = useState<string>("");
        const [bigValue, setBigValueState] = useState<Big | null>(toBig(value));
        const [isTyping, setIsTyping] = useState(false);
        const [userClearedValue, setUserClearedValue] = useState(false);

        const setBigValue = (v: Big|null) => {
            if (v && (v).eq(bigValue??Big(0))) return;
            setBigValueState(v);
        }

        const formatValue = useCallback(
            (val: Big | null): string => {
                if (val === null) return "";

                const strValue = val.toFixed(precision);
                const [intPart, decPart = ""] = strValue.split(".");

                const formattedIntPart = intPart.replace(
                    /\B(?=(\d{3})+(?!\d))/g,
                    thousandSeparator,
                );

                return decPart
                    ? `${formattedIntPart}${decimalSeparator}${decPart}`
                    : formattedIntPart;
            },
            [decimalSeparator, precision, thousandSeparator],
        );

        useEffect(() => {
            const newBigValue = toBig(value);
            
            // Don't update internal value if user is actively typing
            if (isTyping) return;
            
            setBigValue(newBigValue);
            //console.log('values: ', internalValue, newBigValue, bigValue);
            if (
                newBigValue !== null &&
                (!bigValue || !newBigValue.eq(bigValue))
            ) {
                setInternalValue(formatValue(newBigValue));
            } else if (userClearedValue && internalValue === "") {
                return;
            } else if (newBigValue === null) {
                setInternalValue("");
            } else if (!internalValue) {
                setInternalValue(formatValue(newBigValue));
            }
        }, [
            value,
            setBigValue,
            setInternalValue,
            bigValue,
            formatValue,
            internalValue,
            toBig,
            userClearedValue,
            isTyping,
        ]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;

            const regex = new RegExp(
                `^[0-9${thousandSeparator}${decimalSeparator}]*$`,
            );
            if (inputValue !== "" && !regex.test(inputValue)) return;

            setIsTyping(true);
            setInternalValue(inputValue);
            onChangeString?.(inputValue);

            if (inputValue === "") {
                setUserClearedValue(true);
            } else {
                setUserClearedValue(false);
            }

            const sanitizedValue = inputValue
                .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
                .replace(decimalSeparator, ".");

            try {
                if (sanitizedValue === "") {
                    setBigValue(null);
                    onChange?.(null);
                } else if (sanitizedValue !== "." && sanitizedValue !== decimalSeparator) {
                    const newBigValue = new Big(sanitizedValue);

                    const minBig = min !== undefined ? toBig(min) : null;
                    const maxBig = max !== undefined ? toBig(max) : null;

                    if (minBig !== null && newBigValue.lt(minBig)) return;
                    if (maxBig !== null && newBigValue.gt(maxBig)) return;

                    setBigValue(newBigValue);
                    onChange?.(newBigValue);
                }
            } catch (error) {
                // Skip errors - this allows partial input like "5," or "5."
            }
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsTyping(false);
            if (bigValue !== null) {
                setInternalValue(formatValue(bigValue));
            }
            props.onBlur?.(e);
        };

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsTyping(true);
            props.onFocus?.(e);
        };

        return (
            <TextInput
                ref={ref}
                value={internalValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                rightSection={
                    currency ? (
                        <Box style={{ marginRight: 8 }}>{currency}</Box>
                    ) : null
                }
                {...props}
            />
        );
    },
);

export default AdvancedNumberInput;
