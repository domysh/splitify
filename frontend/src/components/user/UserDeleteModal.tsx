import { deleteRequest } from "@/utils/net";
import { Text, Box } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { adminUsersQuery } from "@/utils/queries";
import { useMemo } from "react";
import { useLoading } from "@/utils/store";
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { YesOrNoModal } from "@/commons/YesOrNoModal";

interface UserDeleteModalProps {
    open: boolean;
    onClose: () => void;
    userId: string;
}

export const UserDeleteModal = ({ open, onClose, userId }: UserDeleteModalProps) => {
    const { setLoading } = useLoading();
    const users = adminUsersQuery();
    const user = useMemo(() => users.data?.find((user) => user.id === userId), [users.data, userId]);

    const handleDelete = () => {
        setLoading(true);
        deleteRequest(`users/${userId}`)
            .then(() => {
                notifications.show({
                    title: "Utente eliminato",
                    message: "L'utente è stato eliminato con successo",
                    color: "green",
                    icon: <IconCircleCheck size={20} />
                });
                onClose();
            })
            .catch((error) => {
                notifications.show({
                    title: "Errore",
                    message: error.detail || "Si è verificato un errore durante l'eliminazione",
                    color: "red"
                });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return <YesOrNoModal
        message={
            <Box className="center-flex-col">
                <Text size="lg" fw={500} mt="md" ta="center">
                    Sei sicuro di voler eliminare l'utente
                </Text>
                <Text size="lg" fw={700} ta="center">
                    {user?.username || 'Utente'}?
                </Text>
                <Text size="sm" c="dimmed" mt="xs" ta="center">
                    Questa azione è irreversibile e rimuoverà completamente l'account.
                </Text>
            </Box>
        }
        icon={<IconAlertCircle size={50} color="#ff6b6b" />}
        open={open}
        onClose={onClose}
        onConfirm={handleDelete}
        confirmText="Elimina"
        cancelText="Annulla"
        confirmColor="red"
        title="Conferma eliminazione"
    />
};
