import { board, member } from "@/utils/types";
import { deleteRequest } from "@/utils/net";
import { notifications } from "@mantine/notifications";
import { useCallback, useState } from "react";
import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";
import { DeleteButton } from "@/commons/Buttons";
import { YesOrNoModal } from "@/commons/YesOrNoModal";
import { useLoading } from "@/utils/store";
import { transactionsQuery } from "@/utils/queries";
import { Box, List, Text, ThemeIcon, Select } from "@mantine/core";

export interface DeleteMemberProps {
    board: board;
    member: member;
}

export const DeleteMember = ({ board, member }: DeleteMemberProps) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [transferTo, setTransferTo] = useState<string | null>(null);
    const { setLoading } = useLoading();

    const { data: transactions, isLoading } = transactionsQuery(board.id);

    const relatedTransactions = transactions?.filter(t =>
        (t.fromMemberId === member.id || t.toMemberId === member.id) && !t.cancelled
    ) || [];

    const relatedProducts = board.products.filter(p =>
        relatedTransactions.some(t => t.productId === p.id)
    );

    const availableMembers = board.members
        .filter(m => m.id !== member.id)
        .map(m => ({ value: m.id, label: m.name }));

    const handleDelete = useCallback(() => {
        setLoading(true);
        const url = `/boards/${board.id}/members/${member.id}${transferTo ? `?transferToMemberId=${transferTo}` : ''}`;
        deleteRequest(url)
            .then(() => {
                notifications.show({
                    title: "Membro eliminato",
                    message: "Il membro è stato eliminato con successo",
                    color: "green",
                    icon: <IconCircleCheck size={20} />
                });
            })
            .finally(() => {
                setLoading(false);
            });
    }, [board.id, member.id, transferTo, setLoading]);

    const deleteMessage = (
        <Box>
            <Text mb="md">Sei sicuro di voler eliminare il membro "{member.name}"?</Text>

            {(isLoading) ? (
                <Text size="sm" c="dimmed">Calcolo elementi collegati...</Text>
            ) : (
                <>
                    {(relatedTransactions.length > 0 || relatedProducts.length > 0) && (
                        <Box mb="md" style={{ textAlign: "left", background: "rgba(255,0,0,0.1)", padding: "10px", borderRadius: "8px" }}>
                            <Text size="sm" fw={600} c="red" mb="xs">
                                Attenzione! Verranno eliminati anche:
                            </Text>
                            <List size="sm" spacing="xs" center icon={
                                <ThemeIcon color="red" size={16} radius="xl">
                                    <IconAlertCircle size={10} />
                                </ThemeIcon>
                            }>
                                {relatedTransactions.length > 0 && (
                                    <List.Item>
                                        <Text span fw={500}>{relatedTransactions.length} transazioni</Text>
                                    </List.Item>
                                )}
                                {relatedProducts.length > 0 && (
                                    <List.Item>
                                        <Text span fw={500}>{relatedProducts.length} prodotti acquistati</Text>
                                    </List.Item>
                                )}
                            </List>
                            <Text size="xs" c="dimmed" mt="xs">
                                Scegli se eliminare queste transazioni o trasferirle a un altro membro.
                            </Text>
                            <Select
                                mt="sm"
                                size="sm"
                                placeholder="Nessuno (Elimina transazioni)"
                                data={[{ value: '', label: 'Nessuno (Elimina transazioni)' }, ...availableMembers]}
                                value={transferTo || ''}
                                onChange={(val) => setTransferTo(val || null)}
                                label="Trasferisci a:"
                                clearable
                            />
                        </Box>
                    )}
                </>
            )}
        </Box>
    );

    return <>
        <DeleteButton onClick={() => setConfirmDelete(true)} />
        <YesOrNoModal
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={handleDelete}
            message={deleteMessage as any}
            confirmText="Elimina definitivamente"
        />
    </>
}
