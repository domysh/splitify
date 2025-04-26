import { deleteRequest } from "@/utils/net";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, memo } from "react";
import { YesOrNoModal } from "@/commons/YesOrNoModal";
import { DeleteButton } from "@/commons/Buttons";
import { useLoading } from "@/utils/store";
import { Divider, Text } from "@mantine/core";
import { board, product } from "@/utils/types";
import { IconCircleCheck } from "@tabler/icons-react";

export interface DeleteProductProps {
    board: board;
    product: product;
}

export const DeleteProduct = memo(({ board, product }: DeleteProductProps) => {
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const queryClient = useQueryClient();
    const { setLoading } = useLoading();

    const handleDelete = useCallback((): void => {
        setLoading(true);
        deleteRequest("/boards/"+board.id+"/products/" + product.id)
        .then(() => {
            notifications.show({
                title: "Spesa eliminata",
                message: "La spesa è stato eliminato con successo",
                color: "green",
                icon: <IconCircleCheck size={20} />
            });
        }).finally(() => {
            setLoading(false);
        });
    }, [board.id, product.id, queryClient, setLoading]);

    return <>
        <DeleteButton onClick={() => setConfirmDelete(true)} />
        <YesOrNoModal
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={handleDelete}
            message={<>Sei sicuro di voler eliminare la spesa "{product.name}"?<Divider my="sm" /><Text fw={800}>L'eliminazione della spesa annullerà anche tutte le transazioni associate!</Text></>}
        />
    </>;
});
