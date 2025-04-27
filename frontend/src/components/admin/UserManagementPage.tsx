import { useCurrentUser } from "@/utils/hooks";
import { Button, Group, Paper, Title, Text, Box } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useHeader, useLoading } from "@/utils/store";
import { UserTable } from "@/components/user/UserTable";
import { UserModal } from "@/components/user/UserModal";
import { adminUsersQuery } from "@/utils/queries";
import { IconUserPlus } from "@tabler/icons-react";

const UserManagementPage = () => {
    const { setLoading } = useLoading();
    const navigate = useNavigate();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const { setHeader } = useHeader();
    const currentUser = useCurrentUser();
    const usersQuery = adminUsersQuery()

    useEffect(() => {
        
        setLoading(currentUser?.isLoading??false);
        if (currentUser && !currentUser.isLoading && !currentUser.isAdmin) {
            navigate('/');
        }
        setHeader(null);
    }, [currentUser, navigate, setHeader]);

    useEffect(() => {
        setLoading(usersQuery.isLoading || (currentUser?.isLoading??false));
    }, [usersQuery.isLoading, currentUser?.isLoading, setLoading]);

    
    if (currentUser?.isLoading || !currentUser?.isAdmin) {
        return null;
    }

    return (
        <Box>
            <Group mb="lg" justify="space-between">
                <Box>
                    <Title order={2}>Gestione Utenti</Title>
                    <Text c="dimmed">Gestisci gli account utente e i relativi permessi</Text>
                </Box>
                <Button
                    variant="gradient"
                    gradient={{ from: 'indigo', to: 'cyan' }}
                    leftSection={<IconUserPlus size={20} />}
                    onClick={() => setCreateModalOpen(true)}
                >
                    Aggiungi Utente
                </Button>

            </Group>

            <Paper
                p="md"
                radius="md"
                withBorder
                style={{
                    backgroundColor: 'rgba(30, 31, 50, 0.5)',
                    borderColor: 'var(--primary-border)'
                }}
            >
                {usersQuery.isSuccess && usersQuery.data && <UserTable users={usersQuery.data} />}
            </Paper>

            <UserModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                mode="add"
            />
        </Box>
    );
};

export default UserManagementPage;
