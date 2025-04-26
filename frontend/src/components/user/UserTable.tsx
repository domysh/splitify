import { useState } from "react";
import { Table, Badge, Group, ActionIcon, Text, Box } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { UserModal } from "@/components/user/UserModal";
import { UserDeleteModal } from "@/components/user/UserDeleteModal";
import { Role, user } from "@/utils/types";
import { formatDate } from "@/utils/formatters";

interface UserTableProps {
    users: user[];
}

export const UserTable = ({ users }: UserTableProps) => {
    const [editUser, setEditUser] = useState<string | null>(null);
    const [deleteUser, setDeleteUser] = useState<string | null>(null);
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);

    const getRoleBadge = (role: string) => {
        switch (role) {
            case Role.ADMIN:
                return <Badge color="indigo">Amministratore</Badge>;
            case Role.GUEST:
                return <Badge color="gray">Ospite</Badge>;
            default:
                return <Badge color="gray">{role}</Badge>;
        }
    };

    const formatLastAccess = (user: user) => {
        if (!user.lastAccess) {
            return <Text c="dimmed" fz="sm">Mai</Text>;
        }

        const date = new Date(user.lastAccess);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            // Oggi - mostra ora
            return <Text fz="sm">Oggi, {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</Text>;
        } else if (diffDays === 1) {
            // Ieri
            return <Text fz="sm">Ieri, {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</Text>;
        } else if (diffDays < 7) {
            // Meno di una settimana
            return <Text fz="sm">{diffDays} giorni fa</Text>;
        } else {
            // Più di una settimana
            return <Text fz="sm">{formatDate(date, true)}</Text>;
        }
    };

    return <Box>
        <Table 
            horizontalSpacing="md" 
            verticalSpacing="sm" 
            striped
            stripedColor="rgba(38, 38, 45, 0.3)"
        >
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Username</Table.Th>
                    <Table.Th>Ruolo</Table.Th>
                    <Table.Th>Ultimo accesso</Table.Th>
                    <Table.Th style={{ width: 120 }}>Azioni</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {users.map(user => (
                    <Table.Tr key={user.id}>
                        <Table.Td><Text fw={500}>{user.username}</Text></Table.Td>
                        <Table.Td>{getRoleBadge(user.role)}</Table.Td>
                        <Table.Td>{formatLastAccess(user)}</Table.Td>
                        <Table.Td>
                            <Group gap="xs">
                                <ActionIcon 
                                    variant="subtle" 
                                    color="blue" 
                                    onClick={() => setEditUser(user.id)}
                                >
                                    <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon 
                                    variant="subtle" 
                                    color="red" 
                                    onClick={() => setDeleteUser(user.id)}
                                >
                                    <IconTrash size={16} />
                                </ActionIcon>
                            </Group>
                        </Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
        <UserModal
            open={addUserModalOpen || (editUser ? true : false)}
            onClose={() => {
                setEditUser(null)
                setAddUserModalOpen(false)
            }}
            mode={addUserModalOpen?"add":"edit"}
            userId={editUser??undefined}
        />
        <UserDeleteModal
            open={deleteUser ? true : false}
            onClose={() => setDeleteUser(null)}
            userId={deleteUser || ''}
        />
    </Box>
};
