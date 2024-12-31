import { useLoading } from "@/utils";
import { deleteRequest, postRequest, putRequest } from "@/utils/net";
import { board, category } from "@/utils/types";
import { Box, Button, Group, Modal, Space, Table, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { YesOrNoModal } from "@/components/YesOrNoModal";
import { AddButton, DeleteButton, EditButton } from "@/components/Buttons";
import { useImmer } from 'use-immer';

export const CategorySettingsModal = ({ open, onClose, board }: { open:boolean, onClose:()=>void, board:board }) => {

    const setLoading = useLoading()
    const queryClient = useQueryClient()
    const [openAddCategory, setOpenAddCategory] = useState(false)
    const [edits, setEdits] = useImmer<{[id:string]:{name?:string}}>({})

    const formAdd = useForm({
        initialValues: {
            name: "",
        },
        validate: {
            name: (val) => val == ""? "Name is required" : null,
        },
    })

    useEffect(() => {
        formAdd.reset()
    }, [openAddCategory])

    useEffect(() => {
        setEdits({})
    }, [open])

    const clearDrafts = (drafts:any) => {
        board.categories.forEach(cat => {
            if (drafts[cat.id]?.name == cat.name)
                delete drafts[cat.id]
        })
    }

    const rows = board.categories.map((cat) => (
        <Table.Tr key={cat.id}>
          <Table.Td width="100%">
            <TextInput
                value={edits[cat.id]?.name??cat.name}
                onChange={(e) => setEdits(draft => {
                    draft[cat.id] = {name: e.currentTarget?.value??""}
                    clearDrafts(draft)
                })}
                required
            />
          </Table.Td>
          <Table.Td><DeleteCategory board={board} category={cat}/></Table.Td>
        </Table.Tr>
      ));

    return <>
    <Modal opened={open} onClose={onClose} title={"Categories - "+board.name} centered fullScreen>
        <Box className="center-flex">
            <Box style={{ flexGrow: 1 }} />
            <EditButton onClick={()=>{
                setLoading(true)
                
                Promise.all(Object.entries(edits).map(
                    ([id, data]) => postRequest("boards/"+board.id+"/categories/"+id, {body: {...board.categories.find(cat => cat.id == id)??{}, ...data}})
                )).then(() => {
                    queryClient.invalidateQueries()
                    notifications.show({
                        title: "Categories updated",
                        message: "Categories have been updated successfully",
                        color: "green"
                    })
                }).finally(() => {
                    setEdits({})
                    setLoading(false)
                })
            }} disabled={Object.keys(edits).length == 0} />
            <Space w="sm" />
            <AddButton onClick={()=>setOpenAddCategory(true)} />
        </Box>
        <Table stickyHeader stickyHeaderOffset={60} verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Delete</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

    </Modal>
    <Modal opened={openAddCategory} onClose={()=>setOpenAddCategory(false)} title="Add a new category">
        <form onSubmit={formAdd.onSubmit((values)=>{
                setLoading(true)
                putRequest("boards/"+board.id+"/categories", {body: values})
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
                    setOpenAddCategory(false)
                })
            })}>
                <TextInput
                    label="Category Name"
                    placeholder="All"
                    required
                    {...formAdd.getInputProps("name")}
                />
                <Space h="xs" />
                 <Group justify="flex-end" mt="md">
                    <Button type="submit">Create</Button>
                </Group>
                <Space h="sm" />
            </form>
    </Modal>
    </>
}

const DeleteCategory = ({ board, category }: { board:board, category: category }) => {

    const [confirmDelete, setConfirmDelete] = useState(false)
    const queryClient = useQueryClient()
    const setLoading = useLoading()

    return <>
        <DeleteButton onClick={() => setConfirmDelete(true)} />
        <YesOrNoModal
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={() => {
                setLoading(true)
                deleteRequest("/boards/"+board.id+"/categories/" + category.id)
                .then(() => {
                    queryClient.invalidateQueries()
                    notifications.show({
                        title: "Category deleted",
                        message: "Category has been deleted successfully",
                        color: "green"
                    })
                }).finally(() => {
                    setLoading(false)
                })
            }}
            message={"Are you sure you want to delete "+category.name+" category?"}
        />
    </>

}