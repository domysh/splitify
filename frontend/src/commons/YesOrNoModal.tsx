import { Box, Group, Modal, Text } from "@mantine/core";
import { IconAlertTriangle } from '@tabler/icons-react';
import { ReactNode, useState, useEffect } from "react";
import { modalOverlayProps, modalTransitionProps } from "@/styles/commonStyles";
import { FormButtonBox } from "./FormButtonBox";
import { ModalPaper } from "./ModalPaper";

export interface YesOrNoModalProps {
    open: boolean;
    onClose?: () => void;
    onConfirm?: () => void;
    message: string | ReactNode;
    title?: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    hideCancel?: boolean;
    children?: ReactNode;
    icon?: ReactNode | null;
}

export const YesOrNoModal = ({ 
    open, 
    onClose, 
    onConfirm, 
    message,
    title = "Sei sicuro?",
    confirmText = "Sì, conferma",
    cancelText = "Annulla",
    confirmColor = "red",
    icon,
    hideCancel = false,
    children
}: YesOrNoModalProps) => {
    const [animateIcon, setAnimateIcon] = useState(false);
    
    useEffect(() => { 
        if (open) {
            const timer = setTimeout(() => setAnimateIcon(true), 100);
            return () => clearTimeout(timer);
        } else {
            setAnimateIcon(false);
        }
    }, [open]);
    
    return (
        <Modal 
            opened={open} 
            onClose={() => onClose?.()} 
            closeOnClickOutside={false}
            title={
                <Group gap="xs">
                    <IconAlertTriangle color="#ffa94d" />
                    {typeof title === 'string' ? <Text fw={600}>{title}</Text> : title}
                </Group>
            }
            centered 
            size="sm"
            overlayProps={modalOverlayProps}
            transitionProps={modalTransitionProps}
        >
            <ModalPaper ta="center">
                <Box 
                    className="center-flex" 
                    my="md"
                    style={{
                        transform: animateIcon ? 'scale(1)' : 'scale(0.8)',
                        opacity: animateIcon ? 1 : 0.5,
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    <Box
                        style={{
                            background: 'rgba(255, 169, 77, 0.15)',
                            borderRadius: '50%',
                            padding: '16px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        {icon === undefined?<IconAlertTriangle size={50} color="#ffa94d" />:icon}
                    </Box>
                </Box>
                
                {typeof message === 'string' 
                    ? <Text ta="center" size="lg" fw={600}>{message}</Text>
                    : <Box>{message}</Box>
                }
            </ModalPaper>
            
            {children && (
                <Box mb="md">
                    {children}
                </Box>
            )}

            <FormButtonBox
                onCancel={onClose}
                label={confirmText}
                color={confirmColor}
                onSubmit={() => {
                    onConfirm?.();
                    onClose?.();
                }}
                fullWidth
                hideCancel={hideCancel}
                cancelLabel={cancelText}
            />
        </Modal>
    );
};