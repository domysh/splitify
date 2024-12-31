import { useCalculateDebits, useLoading } from "@/utils";
import { deleteRequest, postRequest, putRequest } from "@/utils/net";
import { board, member } from "@/utils/types";
import { Box, Button, Group, Modal, Space, Table, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { YesOrNoModal } from "@/components/YesOrNoModal";
import { AddButton, DeleteButton, EditButton } from "@/components/Buttons";
import { useImmer } from 'use-immer';
import { BalanceIcon } from "@/components/Utils";
import { AdvancedNumberInput } from "@/components/AdvancedNumberInput";

export const MemberSettingsModal = ({ open, onClose, board }: { open:boolean, onClose:()=>void, board:board }) => {

    const setLoading = useLoading()
    const queryClient = useQueryClient()
    const [openAddMember, setOpenAddMember] = useState(false)
    const [edits, setEdits] = useImmer<{[id:string]:{name?:string, paid?:number}}>({})

    const formAdd = useForm({
        initialValues: {
            name: "",
        },
        validate: {
            name: (val) => val == ""? "Name is required" : null,
        },
    })

    const debits = useCalculateDebits(board)

    useEffect(() => {
        formAdd.reset()
    }, [openAddMember])

    useEffect(() => {
        setEdits({})
    }, [open])

    const clearDrafts = (drafts:any) => {
        board.members.forEach(memb => {
            if (drafts[memb.id] == null){
                drafts[memb.id] = {}
            }
            const invalidName = drafts[memb.id]?.name == memb.name || drafts[memb.id]?.name == null
            const invalidPaid = drafts[memb.id]?.paid == memb.paid || drafts[memb.id]?.paid == null
            if (invalidName)
                delete drafts[memb.id].name
            if (invalidPaid)
                delete drafts[memb.id].paid
            if (invalidName && invalidPaid)
                delete drafts[memb.id]
        })
    }

    const rows = board.members.map((memb) => {
        const debit = debits.find((ele)=>ele.id == memb.id)?.price??0
        const paid = edits[memb.id]?.paid??memb.paid??0
        const balance = paid - debit
        return <Table.Tr key={memb.id}>
          <Table.Td><BalanceIcon balance={balance} /></Table.Td>
          <Table.Td width="100%">
            <TextInput
                value={edits[memb.id]?.name??memb.name}
                onChange={(e) => setEdits(draft => {
                    if (draft[memb.id] == null)
                        draft[memb.id] = {}
                    draft[memb.id].name = e.currentTarget?.value??""
                    clearDrafts(draft)
                })}
                required
            />
          </Table.Td>
          <Table.Td>{(debit/100.0).toFixed(2).replace(".",",")}</Table.Td>
          <Table.Td>{(balance/100.0).toFixed(2).replace(".",",")}</Table.Td>
          <Table.Td>
            <AdvancedNumberInput
                placeholder="0,00"
                type="text"
                value={(paid/100.0).toFixed(2).replace(".",",")}
                onChange={(v) => setEdits(draft => {
                    if (draft[memb.id] == null)
                        draft[memb.id] = {}
                    draft[memb.id].paid = v.mul(100).round(0).toNumber()
                    clearDrafts(draft)
                })}
                style={{ width: 100 }}
            />
          </Table.Td>
          <Table.Td><DeleteMember board={board} member={memb}/></Table.Td>
        </Table.Tr>
    });

    return <>
    <Modal opened={open} onClose={onClose} title={"Members - "+board.name} centered fullScreen>
        <Box className="center-flex">
            <Box style={{ flexGrow: 1 }} />
            <EditButton onClick={()=>{
                setLoading(true)
                Promise.all(Object.entries(edits).map(
                    ([id, data]) => postRequest("boards/"+board.id+"/members/"+id, {body: {...board.members.find(memb => memb.id == id)??{}, ...data}})
                )).then(() => {
                    queryClient.invalidateQueries()
                    notifications.show({
                        title: "Member updated",
                        message: "Member have been updated successfully",
                        color: "green"
                    })
                }).finally(() => {
                    setEdits({})
                    setLoading(false)
                })
            }} disabled={Object.keys(edits).length == 0} />
            <Space w="sm" />
            <AddButton onClick={()=>setOpenAddMember(true)} />
        </Box>
        <Table stickyHeader stickyHeaderOffset={60} verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Status</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Debit</Table.Th>
              <Table.Th>Balance</Table.Th>
              <Table.Th>Paid</Table.Th>
              <Table.Th>Delete</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

    </Modal>
    <Modal opened={openAddMember} onClose={()=>setOpenAddMember(false)} title="Add a new member">
        <form onSubmit={formAdd.onSubmit((values)=>{
                setLoading(true)
                putRequest("boards/"+board.id+"/members", {body: {paid:0, categories:[], ...values}})
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
                    setOpenAddMember(false)
                })
            })}>
                <TextInput
                    label="Member Name"
                    placeholder="👤"
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

const DeleteMember = ({ board, member }: { board:board, member: member }) => {

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
                deleteRequest("/boards/"+board.id+"/members/" + member.id)
                .then(() => {
                    queryClient.invalidateQueries()
                    notifications.show({
                        title: "Member deleted",
                        message: "Member has been deleted successfully",
                        color: "green"
                    })
                }).finally(() => {
                    setLoading(false)
                })
            }}
            message={"Are you sure you want to delete "+member.name+"?"}
        />
    </>

}
