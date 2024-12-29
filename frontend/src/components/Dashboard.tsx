import { boardsQuery } from "@/utils/queries"
import { BoardCard } from "./BoardCard"
import { useEffect, useState } from "react"
import { getToken, useLoading } from "@/utils"
import { notifications } from "@mantine/notifications"
import { Button, Group, Modal, Space, TextInput, Title } from "@mantine/core"
import { Role } from "@/utils/types"
import { AddButton } from "./Buttons"
import { useNavigate } from "react-router-dom"
import { useForm } from "@mantine/form"
import { putRequest } from "@/utils/net"
import { useHeader } from "@/utils/store"


export const Dashboard = () => {
    const boards = boardsQuery()
    const setLoading = useLoading()
    const location = useNavigate()

    const currentUser = getToken()
    const canEdit = [Role.ADMIN, Role.EDITOR].includes(currentUser.role??Role.GUEST)
    const { setHeader } = useHeader()

    const [openAddModal, setOpenAddModal] = useState(false)

    useEffect(() => {
        setHeader(canEdit?<>
            <AddButton onClick={()=>setOpenAddModal(true)}/>
        </>:null)
    }, [])

    useEffect(() => {
        setLoading(boards.isLoading)
        if (boards.isError)
            notifications.show({
                title: "Error fetching boards",
                message: boards.error.message,
                color: "red"
            })
    }, [boards.isFetched])

    const form = useForm({
        initialValues: {
            name: '',
        },
        validate: {
            name: (val) => val == ""? "Name is required" : null,
        },
    })

    return <>
        {boards.isSuccess && 
            boards.data.length === 0?
            
            <Title order={1}>No boards found</Title>:

            <>{boards.data?.map((board) => 
                <BoardCard board={board} key={board.id}/>
            )}</>
        }

        <Modal opened={openAddModal} onClose={()=>setOpenAddModal(false)} title="Add a new board" centered size="auto">
            <form onSubmit={form.onSubmit((values)=>{
                setLoading(true)
                putRequest("boards", {body: values})
                .then((res) => {
                    if (res.id){
                        location("/board/"+res.id)
                        notifications.show({
                            title: "Board created",
                            message: "Board has been created successfully",
                            color: "green"
                        })
                    }else{
                        notifications.show({
                            title: "Unexpected Error",
                            message: res.detail??res??"Unknown error",
                            color: "red"
                        })
                    }
                }).finally(()=>setLoading(false))
            })}>
                <Space h="md" />
                <TextInput
                    label="Board Name"
                    placeholder="Celebration Board"
                    required
                    style={{ minWidth: 500 }}
                    {...form.getInputProps("name")}
                />
                <Space h="md" />
                 <Group justify="flex-end" mt="md">
                    <Button type="submit">Create</Button>
                </Group>
                <Space h="md" />
            </form>
        </Modal>
    </>

}