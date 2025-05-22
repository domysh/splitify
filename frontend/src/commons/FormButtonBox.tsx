import { Box, Group } from "@mantine/core";
import { CancelButton, SubmitButton } from "@/commons/Buttons";
import { useMobile } from "@/utils/hooks";
import { ReactNode } from "react";

export interface FormButtonBoxProps {
    onCancel?: () => void;
    onSubmit?: () => void;
    icon?: ReactNode | string | ReactNode[];
    label?: string;
    cancelLabel?: string;
    loading?: boolean;
    disabled?: boolean;
    responsive?: boolean;
    margins?: boolean;
    color?: string;
    fullWidth?: boolean;
    hideCancel?: boolean;
}

export const FormButtonBox = ({
    onCancel,
    onSubmit,
    icon,
    label,
    cancelLabel,
    loading,
    disabled,
    responsive = true,
    margins = true,
    color,
    fullWidth,
    hideCancel,
}: FormButtonBoxProps) => {
    const isMobile = useMobile();
    const isResponsive = (responsive && isMobile) || fullWidth;
    return (
        <Group
            mt={margins ? "lg" : undefined}
            style={{ width: "100%" }}
            justify="flex-end"
        >
            <Box
                style={{
                    width: isResponsive ? "100%" : "auto",
                    flexDirection: isResponsive ? "column-reverse" : "row",
                    gap: 15,
                }}
                display="flex"
            >
                {!hideCancel && (
                    <CancelButton
                        responsive={responsive}
                        onClick={onCancel}
                        loading={loading}
                    >
                        {cancelLabel ?? "Annulla"}
                    </CancelButton>
                )}
                <SubmitButton
                    responsive={responsive}
                    disabled={disabled}
                    icon={icon}
                    onClick={onSubmit}
                    loading={loading}
                    color={color}
                >
                    {label ?? "Invia"}
                </SubmitButton>
            </Box>
        </Group>
    );
};
