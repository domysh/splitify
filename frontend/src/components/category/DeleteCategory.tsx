import { deleteRequest } from "@/utils/net";
import { board, category } from "@/utils/types";
import { notifications } from "@mantine/notifications";
import { useCallback, useState, memo } from "react";
import { YesOrNoModal } from "@/commons/YesOrNoModal";
import { DeleteButton } from "@/commons/Buttons";
import { IconCircleCheck } from "@tabler/icons-react";
import { useLoading } from "@/utils/store";

interface DeleteCategoryProps {
    board: board;
    category: category;
}

export const DeleteCategory = memo(({ board, category }: DeleteCategoryProps) => {
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const { setLoading } = useLoading();

    const handleDelete = useCallback((): void => {
        setLoading(true);
        deleteRequest("/boards/"+board.id+"/categories/" + category.id)
        .then(() => {
            notifications.show({
                title: "Categoria eliminata",
                message: "La categoria è stata eliminata con successo",
                color: "green",
                icon: <IconCircleCheck size={20} />
            });
        }).finally(() => {
            setLoading(false);
        });
    }, [board.id, category.id, setLoading]);
    
    return <>
        <DeleteButton onClick={() => setConfirmDelete(true)} />
        <YesOrNoModal
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={handleDelete}
            message={`Sei sicuro di voler eliminare la categoria "${category.name}"?`}
        />
    </>;
});
