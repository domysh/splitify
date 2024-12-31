import { useLoading } from "@/utils";
import { deleteRequest, postRequest } from "@/utils/net";
import { board } from "@/utils/types";
import { Button, Group, Modal, Space, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { YesOrNoModal } from "@/components/YesOrNoModal";
import { useNavigate } from "react-router-dom";
import { DeleteButton } from "@/components/Buttons";


export const BoardSettingsModal = ({ open, onClose, board }: { open:boolean, onClose:()=>void, board:board }) => {

    const setLoading = useLoading()
    const queryClient = useQueryClient()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const location = useNavigate()

    const form = useForm({
        initialValues: {
            name: board.name,
        },
        validate: {
            name: (val) => val == ""? "Name is required" : null,
        },
    })

    useEffect(() => {
        form.reset()
        form.setValues({name: board.name})
    }, [open])

    return <>
    <Modal opened={open} onClose={onClose} title="Board settings" centered size="lg">
        <form onSubmit={form.onSubmit((values)=>{
                setLoading(true)
                postRequest("boards/"+board.id, {body: values})
                .then((res) => {
                    if (res.id){
                        queryClient.invalidateQueries()
                    }else{
                        notifications.show({
                            title: "Unexpected Error",
                            message: res.detail??res??"Unknown error",
                            color: "red"
                        })
                    }
                }).finally(()=>{
                    setLoading(false)
                    onClose()
                })
            })}>
                <TextInput
                    label="Board Name"
                    placeholder="Celebration Board"
                    required
                    style={{ minWidth: 500 }}
                    {...form.getInputProps("name")}
                />
                <Space h="xs" />
                 <Group justify="flex-end" mt="md">
                    <DeleteButton onClick={()=>setConfirmDelete(true)} />
                    <Button type="submit" disabled={form.values.name == board.name}>Edit</Button>
                </Group>
                <Space h="sm" />
            </form>
    </Modal>
    <YesOrNoModal
        open={confirmDelete}
        message="Are you sure you want to delete this board? This action is unreversable!"
        onClose={()=>setConfirmDelete(false)}
        onConfirm={()=>{
            setLoading(true)
            deleteRequest("boards/"+board.id)
            .then((res) => {
                if (res.id){
                    queryClient.invalidateQueries()
                    onClose()
                    notifications.show({
                        title: "Board deleted",
                        message: "Board has been deleted successfully",
                        color: "green"
                    })
                    location("/")
                }else{
                    notifications.show({
                        title: "Unexpected Error",
                        message: res.detail??res??"Unknown error",
                        color: "red"
                    })
                }
            }).finally(()=>setLoading(false))
        }}
    />
    </>
}