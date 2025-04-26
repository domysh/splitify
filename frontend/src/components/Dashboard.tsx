import { boardsQuery } from "@/utils/queries"
import { BoardCard } from "@/components/board/BoardCard"
import { useEffect, useState } from "react"
import { useCurrentUser } from "@/utils/hooks"
import { notifications } from "@mantine/notifications"
import { Button, Grid, Text, Container, Paper, Title } from "@mantine/core"
import { AddButton } from "@/commons/Buttons"
import { useHeader, useLoading } from "@/utils/store"
import { IconCirclePlus } from "@tabler/icons-react"
import { AddBoardModal } from "@/components/board/AddBoardModal"

const Dashboard = () => {
    const boards = boardsQuery()
    const { setLoading } = useLoading()
    const currentUser = useCurrentUser()
    const { setHeader } = useHeader()

    const [openAddModal, setOpenAddModal] = useState(false)

    useEffect(() => {
        setHeader(<AddButton onClick={()=>setOpenAddModal(true)}/>)
    }, [currentUser])

    useEffect(() => {
        setLoading(boards.isLoading)
        if (boards.isError)
            notifications.show({
                title: "Error fetching boards",
                message: boards.error.message,
                color: "red"
            })
    }, [boards.isLoading, boards.isError, setLoading])

    return <>
        {boards.isSuccess && 
            boards.data.length === 0?
            
            <Paper
                p="xl"
                radius="md"
                shadow="sm"
                style={{ 
                    maxWidth: '600px',
                    margin: '80px auto 0',
                    textAlign: 'center',
                    background: 'rgba(30, 30, 40, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                className="fadeIn"
            >
                <Title order={1} size="h2" mb="md" c="white">No boards available</Title>
                <Text size="lg" c="white" mb="xl">
                    {currentUser 
                        ? "You don't have any boards yet. Create your first board to get started!" 
                        : "There are no boards available at the moment. Check back later or contact an administrator."}
                </Text>
                {currentUser && 
                    <Button 
                        onClick={() => setOpenAddModal(true)} 
                        size="md" 
                        radius="md"
                        leftSection={<IconCirclePlus size={20} />}
                        variant="gradient" 
                        gradient={{ from: 'indigo', to: 'cyan', deg: 90 }}
                    >
                        Create your first board
                    </Button>
                }
            </Paper>:

            <Container size="xl">
                <Grid gutter="md">
                    {boards.data?.map((board) => (
                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={board.id} className="fadeIn">
                            <BoardCard board={board} />
                        </Grid.Col>
                    ))}
                </Grid>
            </Container>
        }

        <AddBoardModal
            open={openAddModal}
            onClose={() => setOpenAddModal(false)}
        />
    </>
}

export default Dashboard;