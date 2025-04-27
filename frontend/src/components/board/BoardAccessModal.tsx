import { useState, useEffect } from 'react';
import { Modal, Text, Stack, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { UserSearchSelect } from '@/commons/UserSearchSelect';
import { postRequest, putRequest } from '@/utils/net';
import { board, BoardPermission } from '@/utils/types';
import { IconCircleCheck } from '@tabler/icons-react';
import { useLoading } from '@/utils/store';
import { dropdownStyles, modalOverlayOptions, modalStyles, modalTransitionProps } from '@/styles/commonStyles';
import { FormButtonBox } from '@/commons/FormButtonBox';
import { ModalPaper } from '@/commons/ModalPaper';

interface BoardAccessModalProps {
    open: boolean;
    onClose: () => void;
    board: board;
    mode?: 'add' | 'update';
    initialUserId?: string | null;
    initialUsername?: string | null;
    initialPermission?: BoardPermission | null;
}

export const BoardAccessModal = ({ 
    open, 
    onClose, 
    board, 
    mode = 'add',
    initialUserId = null,
    initialUsername = null,
    initialPermission = null
}: BoardAccessModalProps) => {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);
    const [selectedPermission, setSelectedPermission] = useState<string | null>(initialPermission || BoardPermission.VIEWER);
    const { setLoading } = useLoading();
    
    useEffect(() => {
        if (open) {
            setSelectedUserId(initialUserId);
            setSelectedPermission(initialPermission || BoardPermission.VIEWER);
        }
    }, [open, initialUserId, initialPermission]);
    
    
    const handleClose = () => {
        if (mode === 'add') {
            setSelectedUserId(null);
        }
        setSelectedPermission(BoardPermission.VIEWER);
        onClose();
    };
    
    
    const handleSubmit = async () => {
        if (!selectedUserId && mode === 'add') {
            notifications.show({
                title: 'Errore',
                message: 'Seleziona un utente',
                color: 'red'
            });
            return;
        }
        
        if (!selectedPermission) {
            notifications.show({
                title: 'Errore',
                message: 'Seleziona un livello di permesso',
                color: 'red'
            });
            return;
        }
        
        setLoading(true);
        
        try {
            
            if (mode === 'update' && initialUserId) {
                await putRequest(`boards/${board.id}/access/${initialUserId}`, {
                    body: { permission: selectedPermission }
                });
                
                notifications.show({
                    title: 'Permesso aggiornato',
                    message: 'Il permesso è stato aggiornato con successo!',
                    color: 'blue',
                    icon: <IconCircleCheck size={18} />
                });
            } else if (selectedUserId) {
                await postRequest(`boards/${board.id}/access`, {
                    body: { userId: selectedUserId, permission: selectedPermission }
                });
                
                notifications.show({
                    title: 'Permesso aggiunto',
                    message: 'L\'utente è stato aggiunto alla board con successo!',
                    color: 'green',
                    icon: <IconCircleCheck size={18} />
                });
            }
            
            handleClose();
        } catch (err: any) {
            notifications.show({
                title: 'Errore',
                message: err.detail || `Si è verificato un errore durante l'${mode === 'add' ? 'aggiunta' : 'aggiornamento'} del permesso`,
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Modal
            opened={open}
            onClose={handleClose}
            title={
                <Text fw={700} size="lg" style={{ color: "#f0f0ff" }}>
                    {mode === 'add' ? 'Aggiungi accesso alla board' : 'Modifica permesso di accesso'}
                </Text>
            }
            centered
            size="md"
            padding="lg"
            transitionProps={modalTransitionProps}
            overlayProps={modalOverlayOptions}
            styles={modalStyles}
        >
            <Text size="sm" mt="sm" ml={3}>
                {mode === 'add' 
                    ? 'Assegna ad un utente i permessi di accesso'
                    : 'Modifica il livello di permesso per questo utente.'}
            </Text>
            <ModalPaper>
                <Stack gap="sm">

                    
                    {mode === 'add' ? (
                        <UserSearchSelect
                            onUserSelect={setSelectedUserId}
                            placeholder="Cerca un utente..."
                            label="Seleziona utente"
                            required
                            excludeUsersIds={[board.creator.id]}
                        />
                    ) : initialUsername && (
                        <Text size="md" fw={500}>
                            Utente: <Text span c="blue.4">{initialUsername}</Text>
                        </Text>
                    )}
                    
                    <Select
                        label="Livello di permesso"
                        placeholder="Seleziona un livello di permesso"
                        required
                        value={selectedPermission}
                        onChange={setSelectedPermission}
                        data={[
                            { value: BoardPermission.EDITOR, label: 'Editor - Può modificare contenuti' },
                            { value: BoardPermission.VIEWER, label: 'Visualizzatore - Può solo vedere' }
                        ]}
                        styles={dropdownStyles}
                    />

                    <FormButtonBox
                        onCancel={handleClose}
                        icon={<IconCircleCheck size={16} />}
                        label={mode === 'add' ? 'Aggiungi utente' : 'Aggiorna permesso'}
                        onSubmit={handleSubmit}
                    />
                </Stack>
            </ModalPaper>
        </Modal>
    );
};
