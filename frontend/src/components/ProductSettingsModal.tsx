import { useLoading } from "@/utils";
import { deleteRequest, postRequest, putRequest } from "@/utils/net";
import { board, product } from "@/utils/types";
import { Box, Button, Group, Modal, NumberInput, Space, Table, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { YesOrNoModal } from "./YesOrNoModal";
import { AddButton, DeleteButton, EditButton } from "./Buttons";
import { useImmer } from 'use-immer';
import { AdvancedNumberInput } from "./AdvancedNumberInput";

export const ProductSettingsModal = ({ open, onClose, board }: { open:boolean, onClose:()=>void, board:board }) => {

    const setLoading = useLoading()
    const queryClient = useQueryClient()
    const [openAddProduct, setOpenAddProduct] = useState(false)
    const [edits, setEdits] = useImmer<{[id:string]:{name?:string, price?:number}}>({})

    const formAdd = useForm({
        initialValues: {
            name: "",
            price: 0,
        },
        validate: {
            name: (val) => val == ""? "Name is required" : null,
            price: (val) => val < 0? "Price cannot be negative!" : null,
        },
    })

    useEffect(() => {
        formAdd.reset()
    }, [openAddProduct])

    useEffect(() => {
        setEdits({})
    }, [open])

    const clearDrafts = (drafts:any) => {
        board.products.forEach(prod => {
            if (drafts[prod.id] == null){
                drafts[prod.id] = {}
            }
            const invalidName = drafts[prod.id]?.name == prod.name || drafts[prod.id]?.name == null
            const invalidPrice = drafts[prod.id]?.price == prod.price || drafts[prod.id]?.price == null
            if (invalidName)
                delete drafts[prod.id].name
            if (invalidPrice)
                delete drafts[prod.id].price
            if (invalidName && invalidPrice)
                delete drafts[prod.id]
        })
    }

    const rows = board.products.map((prod) => (
        <Table.Tr key={prod.id}>
          <Table.Td width="100%">
            <TextInput
                value={edits[prod.id]?.name??prod.name}
                onChange={(e) => setEdits(draft => {
                    if (draft[prod.id] == null)
                        draft[prod.id] = {}
                    draft[prod.id].name = e.currentTarget?.value??""
                    clearDrafts(draft)
                })}
                required
            />
          </Table.Td>
          <Table.Td>
            <AdvancedNumberInput
                placeholder="0,00"
                type="text"
                value={((edits[prod.id]?.price??prod.price)/100.0).toFixed(2).replace(".",",")}
                onChange={(v) => setEdits(draft => {
                    if (draft[prod.id] == null)
                        draft[prod.id] = {}
                    draft[prod.id].price = v.mul(100).round(0).toNumber()
                    clearDrafts(draft)
                })}
                style={{ width: 100 }}
            />
          </Table.Td>
          <Table.Td><DeleteProduct board={board} product={prod}/></Table.Td>
        </Table.Tr>
      ));

    return <>
    <Modal opened={open} onClose={onClose} title={"Products - "+board.name} centered fullScreen>
        <Box className="center-flex">
            <Box style={{ flexGrow: 1 }} />
            <EditButton onClick={()=>{
                setLoading(true)
                Promise.all(Object.entries(edits).map(
                    ([id, data]) => postRequest("boards/"+board.id+"/products/"+id, {body: {...board.products.find(prod => prod.id == id)??{}, ...data}})
                )).then(() => {
                    queryClient.invalidateQueries()
                    notifications.show({
                        title: "Product updated",
                        message: "Product have been updated successfully",
                        color: "green"
                    })
                }).finally(() => {
                    setEdits({})
                    setLoading(false)
                })
            }} disabled={Object.keys(edits).length == 0} />
            <Space w="sm" />
            <AddButton onClick={()=>setOpenAddProduct(true)} />
        </Box>
        <Table stickyHeader stickyHeaderOffset={60} verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Price</Table.Th>
              <Table.Th>Delete</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

    </Modal>
    <Modal opened={openAddProduct} onClose={()=>setOpenAddProduct(false)} title="Add a new product">
        <form onSubmit={formAdd.onSubmit((values)=>{
                setLoading(true)
                putRequest("boards/"+board.id+"/products", {body: { categories:[], ...values, price: parseInt((values.price*100).toString())}})
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
                    setOpenAddProduct(false)
                })
            })}>
                <TextInput
                    label="Product Name"
                    placeholder="Banana 🍌"
                    required
                    {...formAdd.getInputProps("name")}
                />
                <Space h="md" />
                <NumberInput
                    fixedDecimalScale={true}
                    decimalScale={2}
                    label="Price"
                    decimalSeparator=","
                    min={0}
                    style={{ width: 100 }}
                    required
                    {...formAdd.getInputProps("price")}
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

const DeleteProduct = ({ board, product }: { board:board, product: product }) => {

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
                deleteRequest("/boards/"+board.id+"/products/" + product.id)
                .then(() => {
                    queryClient.invalidateQueries()
                    notifications.show({
                        title: "Product deleted",
                        message: "Product has been deleted successfully",
                        color: "green"
                    })
                }).finally(() => {
                    setLoading(false)
                })
            }}
            message={"Are you sure you want to delete "+product.name+"?"}
        />
    </>

}
