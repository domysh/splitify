import { boardsQuery } from "@/utils/queries"
import { BoardCard } from "@/components/board/BoardCard"
import { useEffect, useState } from "react"
import { useCurrentUser } from "@/utils/hooks"
import { notifications } from "@mantine/notifications"
import { Button, Grid, Text, Container, Paper, Title, TextInput, Divider, Box, Group } from "@mantine/core"
import { AddButton } from "@/commons/Buttons"
import { useHeader, useLoading } from "@/utils/store"
import { IconCirclePlus, IconSearch, IconPinFilled, IconClock, IconLayoutDashboard } from "@tabler/icons-react"
import { AddBoardModal } from "@/components/board/AddBoardModal"
import { togglePinBoard } from "@/utils/net"
import { useQueryClient } from "@tanstack/react-query"

const Dashboard = () => {
    const boards = boardsQuery()
    const { setLoading } = useLoading()
    const currentUser = useCurrentUser()
    const { setHeader } = useHeader()
    const queryClient = useQueryClient()

    const [openAddModal, setOpenAddModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

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

    const handlePinToggle = async (boardId: string) => {
        try {
            await togglePinBoard(boardId);
            queryClient.invalidateQueries({ queryKey: ['me'] });
        } catch (error: any) {
            notifications.show({
                title: "Errore",
                message: "Impossibile aggiornare i preferiti",
                color: "red"
            });
        }
    }

    // Filter by search query
    const filteredBoards = (boards.data || []).filter(board => 
        board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        board.categories.some(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Split boards into categories
    const pinnedIds = new Set(currentUser?.pinnedBoards || []);
    
    const pinnedBoards = filteredBoards.filter(b => pinnedIds.has(b.id));
    
    const notPinnedBoards = filteredBoards.filter(b => !pinnedIds.has(b.id));
    
    // Sort not pinned boards by usage
    const boardUsage = currentUser?.boardUsage || {};
    const sortedByUsage = [...notPinnedBoards].sort((a, b) => {
        const usageA = boardUsage[a.id] || 0;
        const usageB = boardUsage[b.id] || 0;
        return usageB - usageA;
    });

    // Top 3 most used boards (that are not pinned)
    const mostUsedBoards = sortedByUsage.filter(b => (boardUsage[b.id] || 0) > 0).slice(0, 3);
    const mostUsedIds = new Set(mostUsedBoards.map(b => b.id));
    
    // The rest of the boards
    const otherBoards = notPinnedBoards.filter(b => !mostUsedIds.has(b.id));

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
                <TextInput
                    placeholder="Cerca board per nome o categoria..."
                    size="md"
                    leftSection={<IconSearch size={18} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    mb="xl"
                    radius="md"
                    styles={{
                        input: {
                            background: "var(--surface-dark)",
                            border: "1px solid var(--primary-border)",
                            color: "white"
                        }
                    }}
                />

                {pinnedBoards.length > 0 && (
                    <Box mb="xl">
                        <Group mb="md" gap="sm">
                            <IconPinFilled size={20} color="#ffd43b" />
                            <Title order={3} style={{ color: "#ffd43b" }}>Preferite</Title>
                        </Group>
                        <Grid>
                            {pinnedBoards.map((board) => (
                                <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={board.id} className="fadeIn">
                                    <BoardCard 
                                        board={board} 
                                        isPinned={true}
                                        onPinToggle={currentUser ? () => handlePinToggle(board.id) : undefined}
                                    />
                                </Grid.Col>
                            ))}
                        </Grid>
                        <Divider my="xl" color="rgba(255,255,255,0.1)" />
                    </Box>
                )}

                {mostUsedBoards.length > 0 && (
                    <Box mb="xl">
                        <Group mb="md" gap="sm">
                            <IconClock size={20} color="#ff8787" />
                            <Title order={3} style={{ color: "#ff8787" }}>Aperte di recente</Title>
                        </Group>
                        <Grid>
                            {mostUsedBoards.map((board) => (
                                <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={board.id} className="fadeIn">
                                    <BoardCard 
                                        board={board} 
                                        isPinned={false}
                                        onPinToggle={currentUser ? () => handlePinToggle(board.id) : undefined}
                                    />
                                </Grid.Col>
                            ))}
                        </Grid>
                        <Divider my="xl" color="rgba(255,255,255,0.1)" />
                    </Box>
                )}

                {otherBoards.length > 0 && (
                    <Box>
                        {(pinnedBoards.length > 0 || mostUsedBoards.length > 0) && (
                            <Group mb="md" gap="sm">
                                <IconLayoutDashboard size={20} color="#a5b4fc" />
                                <Title order={3} style={{ color: "#a5b4fc" }}>Tutte le Board</Title>
                            </Group>
                        )}
                        <Grid>
                            {otherBoards.map((board) => (
                                <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={board.id} className="fadeIn">
                                    <BoardCard 
                                        board={board} 
                                        isPinned={false}
                                        onPinToggle={currentUser ? () => handlePinToggle(board.id) : undefined}
                                    />
                                </Grid.Col>
                            ))}
                        </Grid>
                    </Box>
                )}
                
                {filteredBoards.length === 0 && boards.data && boards.data.length > 0 && (
                    <Text ta="center" c="dimmed" mt="xl">Nessuna board trovata con "{searchQuery}"</Text>
                )}
            </Container>
        }

        <AddBoardModal
            open={openAddModal}
            onClose={() => setOpenAddModal(false)}
        />
    </>
}

export default Dashboard;