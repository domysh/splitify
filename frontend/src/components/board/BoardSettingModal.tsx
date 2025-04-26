import { deleteRequest, putRequest } from "@/utils/net";
import { board } from "@/utils/types";
import { Button, Group, Modal, Space, TextInput, Title, Text, Box, Divider, Tabs, Table, ActionIcon, Badge, Loader } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { YesOrNoModal } from "@/commons/YesOrNoModal";
import { useNavigate } from "react-router";
import { DeleteButton } from "@/commons/Buttons";
import { IconSettings, IconCircleCheck, IconUserPlus, IconUserMinus, IconExchange, IconUsers } from "@tabler/icons-react";
import { boardAccessQuery } from "@/utils/queries";
import { BoardPermission } from "@/utils/types";
import { removeBoardAccess, transferBoardOwnership } from "@/utils/net";
import { BoardAccessModal } from "@/components/board/BoardAccessModal";
import { useLoading } from "@/utils/store";
import { inputStyles, modalOverlayProps, modalTransitionProps } from "@/styles/commonStyles";
import { FormButtonBox } from "@/commons/FormButtonBox";
import { PublicSwitch } from "@/commons/PublicSwitch";
import { ModalPaper } from "@/commons/ModalPaper";

export interface BoardSettingsModalProps {
    open: boolean;
    onClose: () => void;
    board: board;
}

export const BoardSettingsModal = ({ open, onClose, board }: BoardSettingsModalProps) => {
    const { setLoading } = useLoading()
    const queryClient = useQueryClient()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const location = useNavigate()
    const [isDirty, setIsDirty] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("general");
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [confirmTransfer, setConfirmTransfer] = useState<{userId: string, username: string} | null>(null);
    const [loadingAccess, setLoadingAccess] = useState<string | null>(null);
    const [editPermissionModal, setEditPermissionModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{userId: string, username: string, permission: BoardPermission} | null>(null);

    
    const form = useForm({
        initialValues: {
            name: board?.name || '',
            isPublic: board?.isPublic !== undefined ? board.isPublic : true
        },
        validate: {
            name: (val) => !val ? "Il nome è obbligatorio" : null,
        }
    });

    
    useEffect(() => {
        if (open) {
            form.setValues({
                name: board?.name || '',
                isPublic: board?.isPublic !== undefined ? board.isPublic : true
            });
            setIsDirty(false);
        }
    }, [open, board]);

    
    useEffect(() => {
        if (form.values.name !== board?.name || form.values.isPublic !== board?.isPublic) {
            setIsDirty(true);
        } else {
            setIsDirty(false);
        }
    }, [form.values, board]);

    
    const handleSubmit = (values: typeof form.values) => {
        setLoading(true);
        
        putRequest(`boards/${board?.id}`, { body: values })
            .then((res) => {
                if (res.id) {
                    notifications.show({
                        title: "Board modificata",
                        message: "Le modifiche alla board sono state salvate con successo",
                        color: "green",
                        icon: <IconCircleCheck size={20} />
                    });
                    
                    setIsDirty(false);
                    
                } else {
                    notifications.show({
                        title: "Errore inaspettato",
                        message: res.detail ?? res ?? "Errore sconosciuto",
                        color: "red"
                    });
                }
            })
            .catch((error) => {
                notifications.show({
                    title: "Errore",
                    message: error.message || "Si è verificato un errore durante l'operazione",
                    color: "red"
                });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    
    const handleDelete = useCallback(() => {
        setLoading(true)
        deleteRequest("boards/"+board.id)
        .then((res) => {
            if (res.id){
                onClose()
                notifications.show({
                    title: "Board eliminata",
                    message: "La board è stata eliminata con successo",
                    color: "green",
                    icon: <IconCircleCheck size={20} />
                })
                queryClient.invalidateQueries({ queryKey: ['boards'] });
                location("/")
            }else{
                notifications.show({
                    title: "Errore inaspettato",
                    message: res.detail??res??"Errore sconosciuto",
                    color: "red"
                })
            }
        }).finally(()=>setLoading(false))
    }, [board.id, queryClient, location, onClose, setLoading]);

    
    const accessQuery = boardAccessQuery(board?.id);
    
    
    const handleRemoveAccess = useCallback(async (userId: string) => {
        setLoadingAccess(userId);
        try {
            await removeBoardAccess(board.id, userId);
            notifications.show({
                title: "Accesso rimosso",
                message: "L'utente non ha più accesso alla board",
                color: "blue"
            });
            queryClient.invalidateQueries({ queryKey: ['boards', board.id, 'access'] });
        } catch (error) {
            notifications.show({
                title: "Errore",
                message: "Impossibile rimuovere l'accesso",
                color: "red"
            });
        } finally {
            setLoadingAccess(null);
        }
    }, [board.id, queryClient]);
    
    
    const handleConfirmTransfer = useCallback(async () => {
        if (!confirmTransfer) return;
        
        setLoading(true);
        try {
            await transferBoardOwnership(board.id, confirmTransfer.userId);
            
            notifications.show({
                title: "Proprietà trasferita",
                message: `La proprietà della board è stata trasferita a ${confirmTransfer.username}`,
                color: "green",
                icon: <IconCircleCheck size={18} />
            });
            
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            onClose();
        } catch (error) {
            notifications.show({
                title: "Errore",
                message: "Impossibile trasferire la proprietà",
                color: "red"
            });
        } finally {
            setLoading(false);
            setConfirmTransfer(null);
        }
    }, [board.id, confirmTransfer, onClose, setLoading, queryClient]);

    
    const openEditPermissionModal = useCallback((userId: string, username: string, permission: BoardPermission) => {
        setSelectedUser({ userId, username, permission });
        setEditPermissionModal(true);
    }, []);

    return <>
    <Modal 
        opened={open} 
        onClose={onClose} 
        closeOnClickOutside={false}
        title={
            <Group gap="xs">
                <IconSettings color='#9ba3ff' />
                <Text fw={600}>Impostazioni Board</Text>
            </Group>
        } 
        centered 
        size="md"
        overlayProps={modalOverlayProps}
        transitionProps={modalTransitionProps}
    >
        <ModalPaper>
            <Tabs value={activeTab} onChange={(e) => setActiveTab(e??"general")} style={{borderRadius: '8px'}} variant="pills">
                <Tabs.List>
                    <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
                        Generale
                    </Tabs.Tab>
                    <Tabs.Tab value="access" leftSection={<IconUsers size={16} />}>
                        Permessi
                    </Tabs.Tab>
                </Tabs.List>
                <Divider my="sm" mb="md" />
                <Tabs.Panel value="general">
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Title order={4} mb="md" style={{ color: '#f0f0ff' }}>Modifica Board</Title>
                        
                        <TextInput
                            label={<Text fw={500} mb={5}>Nome Board <span style={{color: "#ff6b6b"}}>*</span></Text>}
                            placeholder="Inserisci il nome della board..."
                            required
                            withAsterisk={false}
                            {...form.getInputProps("name")}
                            styles={inputStyles}
                        />
                        
                        <Space h="lg" />
                        <PublicSwitch {...form.getInputProps("isPublic", { type: "checkbox" })} />                        
                        <Space h="sm" />
                        <Box className="center-flex" ml={4}>
                            <DeleteButton onClick={()=>setConfirmDelete(true)} />
                            <FormButtonBox
                                onCancel={onClose}
                                icon={<IconCircleCheck size={16} />}
                                label="Salva modifiche"
                                disabled={!isDirty}
                                responsive={false}
                                margins={false}
                            />
                        </Box>
                    </form>
                </Tabs.Panel>
                
                <Tabs.Panel value="access">
                    <Title order={4} mb="md">Gestione Accessi</Title>
                    
                    <Box>
                        <Text size="sm" c="dimmed" mb="md">
                            Puoi condividere questa board con altri utenti assegnando loro diversi livelli di accesso.
                        </Text>                        
                        {accessQuery.isLoading ? (
                            <Box className="center-flex" p="md">
                                <Loader size="sm" />
                            </Box>
                        ) : accessQuery.isError ? (
                            <Text c="red" size="sm">
                                Errore nel caricamento degli accessi
                            </Text>
                        ) : accessQuery.data &&(
                            <Table withTableBorder withColumnBorders>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Utente</Table.Th>
                                        <Table.Th>Permesso</Table.Th>
                                        <Table.Th style={{ width: '100px' }}>Azioni</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {(accessQuery.data && accessQuery.data.length == 0) && <Table.Tr key="empty">
                                        <Table.Td colSpan={3}>
                                            <Text c="dimmed" ta="center" p="md">
                                                Non ci sono accessi per questa board
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>}
                                    {accessQuery.data.map((access) => (
                                        <Table.Tr key={access.id}>
                                            <Table.Td>{access.username}</Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    color={
                                                        access.permission === BoardPermission.EDITOR 
                                                            ? "green" 
                                                            : "blue"
                                                    }
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() => openEditPermissionModal(access.userId, access.username, access.permission)}
                                                >
                                                    {access.permission === BoardPermission.EDITOR ? "Editor" : "Visualizzatore"}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="blue"
                                                        onClick={() => setConfirmTransfer({
                                                            userId: access.userId,
                                                            username: access.username
                                                        })}
                                                        title="Trasferisci proprietà"
                                                    >
                                                        <IconExchange size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        loading={loadingAccess === access.userId}
                                                        onClick={() => handleRemoveAccess(access.userId)}
                                                        title="Rimuovi accesso"
                                                    >
                                                        <IconUserMinus size={16} />
                                                    </ActionIcon>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        )}
                        <Group display="flex" justify="flex-end" mt="md">
                            <Button
                                leftSection={<IconUserPlus size={16} />}
                                variant="gradient"
                                color="blue"
                                className="transparency-on-hover"
                                onClick={() => setShareModalOpen(true)}
                            >
                                Condividi Board
                            </Button>
                        </Group>
                    </Box>
                </Tabs.Panel>
            </Tabs>
        </ModalPaper>
    </Modal>
    
    
    <YesOrNoModal
        open={confirmDelete}
        onClose={()=>setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Conferma eliminazione"
        message={
            <Box>
                <Text size="lg" mb="md">Sei sicuro di voler eliminare questa board?</Text>
                <Text fw={700} c="red" size="sm">Questa azione è irreversibile!</Text>
            </Box>
        }
    />
    
    
    <YesOrNoModal
        open={!!confirmTransfer}
        onClose={() => setConfirmTransfer(null)}
        onConfirm={handleConfirmTransfer}
        title="Trasferimento proprietà"
        message={
            <Box>
                <Text size="lg" mb="md">
                    Stai per trasferire la proprietà della board a <b>{confirmTransfer?.username}</b>
                </Text>
                <Text c="yellow" size="sm" mb="sm">
                    Non sarai più il proprietario di questa board e avrai solo permessi di modifica.
                </Text>
                <Text fw={500} c="red" size="sm">
                    Questa azione è irreversibile. Sei sicuro di voler procedere?
                </Text>
            </Box>
        }
        confirmText="Trasferisci proprietà"
        confirmColor="red"
    />

    <BoardAccessModal
        open={editPermissionModal || shareModalOpen}
        onClose={() => {
            setEditPermissionModal(false)
            setShareModalOpen(false)
        }}
        board={board}
        mode={editPermissionModal?"update":"add"}
        initialUserId={selectedUser?.userId}
        initialUsername={selectedUser?.username}
        initialPermission={selectedUser?.permission}
    />
    </>
}