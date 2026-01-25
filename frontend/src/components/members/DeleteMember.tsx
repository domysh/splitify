import { board, member } from "@/utils/types";
import { deleteRequest } from "@/utils/net";
import { notifications } from "@mantine/notifications";
import { useCallback, useState } from "react";
import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";
import { DeleteButton } from "@/commons/Buttons";
import { YesOrNoModal } from "@/commons/YesOrNoModal";
import { useLoading } from "@/utils/store";
import { transactionsQuery } from "@/utils/queries";
import { Box, List, Text, ThemeIcon } from "@mantine/core";

export interface DeleteMemberProps {
    board: board;
    member: member;
}

export const DeleteMember = ({ board, member }: DeleteMemberProps) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const { setLoading } = useLoading();

    const { data: transactions, isLoading } = transactionsQuery(board.id);

    const relatedTransactions = transactions?.filter(t =>
        (t.fromMemberId === member.id || t.toMemberId === member.id) && !t.cancelled
    ) || [];

    const relatedProducts = board.products.filter(p =>
        relatedTransactions.some(t => t.productId === p.id)
    );

    const handleDelete = useCallback(() => {
        setLoading(true);
        deleteRequest(`/boards/${board.id}/members/${member.id}`)
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
    }, [board.id, member.id, setLoading]);

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
                                I saldi degli altri membri verranno ricalcolati.
                            </Text>
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
