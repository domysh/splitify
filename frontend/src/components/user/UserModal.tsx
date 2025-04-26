import { FormButtonBox } from "@/commons/FormButtonBox";
import { ModalPaper } from "@/commons/ModalPaper";
import { modalOverlayProps } from "@/styles/commonStyles";
import { usernameValidator } from "@/utils";
import { postRequest, putRequest } from "@/utils/net";
import { adminUsersQuery } from "@/utils/queries";
import { useLoading } from "@/utils/store";
import { Role } from "@/utils/types";
import { Modal, PasswordInput, Select, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCircleCheck } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

interface UserModalProps {
    open: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    userId?: string;
}

export const UserModal = ({ open, onClose, mode, userId }: UserModalProps) => {
    const { setLoading } = useLoading();
    const users = adminUsersQuery();
    const user = useMemo(() => users.data?.find((u) => u.id === userId), [users.data, userId]);
    const [roleSearchValue, setRoleSearchValue] = useState('');

    const handleSearchFocus = () => {
        setRoleSearchValue('');
    };

    const form = useForm({
        initialValues: {
            username: '',
            password: '',
            role: Role.GUEST
        },
        validate: {
            username: usernameValidator,
            password: (value) => (mode === 'add' && !value ? 'Password richiesta' : null),
            role: (value) => (!value ? 'Ruolo richiesto' : null)
        }
    });

    useEffect(() => {
        if (mode === 'edit' && users.data) {
            form.setInitialValues({
                username: user?.username??"",
                password: '',
                role: (user?.role.toLowerCase()??Role.GUEST) as Role
            });
        }
        if (open){
            form.reset();
            setRoleSearchValue('');
            return;
        }
    }, [open, users.isFetching, mode]);

    const handleSubmit = (values: typeof form.values) => {
        setLoading(true);

        const payload = {
            ...values,
            
            ...(mode === 'edit' && !values.password && { password: undefined })
        };

        
        const request = mode === 'add' 
            ? postRequest('users', { body: payload })
            : putRequest(`users/${userId}`, { body: payload });

        request
            .then(() => {
                notifications.show({
                    title: mode === 'add' ? 'Utente creato' : 'Utente aggiornato',
                    message: mode === 'add' 
                        ? 'Il nuovo utente è stato creato con successo' 
                        : 'L\'utente è stato aggiornato con successo',
                    color: 'green',
                    icon: <IconCircleCheck size={20} />
                });

                
                onClose();
            })
            .catch(error => {
                notifications.show({
                    title: 'Errore',
                    message: error.message || 'Si è verificato un errore durante l\'operazione',
                    color: 'red'
                });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <Modal
            opened={open}
            onClose={onClose}
            title={mode === 'add' ? 'Aggiungi nuovo utente' : 'Modifica utente'}
            centered
            size="md"
            overlayProps={modalOverlayProps}
        >
            <ModalPaper>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput
                        label="Username"
                        placeholder="Inserisci username"
                        required
                        {...form.getInputProps('username')}
                    />
                    
                    <PasswordInput
                        mt="md"
                        label={mode === 'add' ? "Password" : "Nuova password (lascia vuoto per non modificare)"}
                        placeholder={mode === 'add' ? "Inserisci password" : "Inserisci nuova password"}
                        required={mode === 'add'}
                        {...form.getInputProps('password')}
                    />
                    
                    <Select
                        mt="md"
                        label="Ruolo"
                        placeholder="Seleziona ruolo"
                        required
                        data={[
                            { value: Role.ADMIN, label: 'Amministratore' },
                            { value: Role.GUEST, label: 'Ospite' }
                        ]}
                        searchValue={roleSearchValue}
                        onSearchChange={setRoleSearchValue}
                        onFocus={handleSearchFocus}
                        {...form.getInputProps('role')}
                    />
                    <FormButtonBox
                        onCancel={onClose}
                        icon={<IconCircleCheck size={16} />}
                        label={mode === 'add' ? 'Crea utente' : 'Salva modifiche'}
                    />
                </form>
            </ModalPaper>
        </Modal>
    );
};
