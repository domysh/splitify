import { board, member } from "@/utils/types";
import { deleteRequest } from "@/utils/net";
import { notifications } from "@mantine/notifications";
import { useCallback, useState } from "react";
import { IconCircleCheck } from "@tabler/icons-react";
import { DeleteButton } from "@/commons/Buttons";
import { YesOrNoModal } from "@/commons/YesOrNoModal";
import { useLoading } from "@/utils/store";

export interface DeleteMemberProps {
    board: board;
    member: member;
}

export const DeleteMember = ({ board, member }: DeleteMemberProps) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const { setLoading } = useLoading();

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

    return <>
        <DeleteButton onClick={() => setConfirmDelete(true)} />
        <YesOrNoModal
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={handleDelete}
            message={`Sei sicuro di voler eliminare il membro "${member.name}"?`}
        />
    </>
}
