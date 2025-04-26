import { useCalculatePaylist, useCurrentUser, useSmallScreen } from "@/utils/hooks"
import { boardQuery } from "@/utils/queries"
import { Box, Button, Loader, Menu, SegmentedControl, Tooltip } from "@mantine/core"
import { Paper, Title, Text, Group } from "@mantine/core"
import { useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router"
import { BackButton, OptionButton } from "@/commons/Buttons"
import { useState } from "react"
import { IconCategory, IconCash, IconExchange } from "@tabler/icons-react";
import { IconUsersGroup } from "@tabler/icons-react";
import { IconShoppingBag } from "@tabler/icons-react";
import { IconSettings } from "@tabler/icons-react";
import { IconLock } from "@tabler/icons-react";
import { BoardSettingsModal } from "@/components/board/BoardSettingModal"
import { AddCategoryModal } from "@/components/category/AddCategoryModal"
import { CategorySettingsModal } from "@/components/category/CategorySettingsModal"
import { MemberSettingsModal } from "@/components/members/MemberSettingsModal"
import { AddMemberModal } from "@/components/members/AddMemberModal"
import { ProductSettingsModal } from "@/components/products/ProductSettingsModal"
import { AddProductModal } from "@/components/products/AddProductModal"
import { useHeader } from "@/utils/store"
import { notifications } from "@mantine/notifications"
import { MembersTable } from "@/components/board/MembersTable"
import { ProductsTable } from "@/components/board/ProductsTable"
import { MoneyTransferModal } from "@/components/board/MoneyTransferModal"
import { PaymentListModal } from "@/components/board/paylist/PaymentListModal"
import { TransactionsModal } from "@/components/board/TransactionsModal";
import { IconHistory } from "@tabler/icons-react"
import { usePermissions } from "@/utils/hooks";
import { joinBoardRoom, leaveBoardRoom } from "@/utils/socket"
import { useQueryClient } from "@tanstack/react-query"
import { formatPrice } from "@/utils/formatters"

const BoardPage = () => {
    
    const { board_id, screen } = useParams() as { board_id:string, screen: "members"|"products"|undefined }
    const boardId = useMemo(() => board_id, [board_id]);
    const board_q = boardQuery(boardId);
    const board = board_q.data;
    const location = useNavigate();
    const currentUser = useCurrentUser()
    const [isMounted, setIsMounted] = useState(false);
    const queryClient = useQueryClient();
    const isSmallScreen = useSmallScreen()

    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);
    
    const [boardSettingsOpened, setBoardSettingsOpened] = useState(false)
    const [categorySettingsOpened, setCategorySettingsOpened] = useState(false)
    const [productSettingsOpened, setProductSettingsOpened] = useState(false)
    const [memberSettingsOpened, setMemberSettingsOpened] = useState(false)
    const [addCategorySettingsOpened, setAddCategorySettingsOpened] = useState(false)
    const [addProductSettingsOpened, setAddProductSettingsOpened] = useState(false)
    const [addMemberSettingsOpened, setAddMemberSettingsOpened] = useState(false)
    const { setHeader } = useHeader()
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [paymentListModalOpen, setPaymentListModalOpen] = useState(false);
    const [transactionsModalOpen, setTransactionsModalOpen] = useState(false);
    
    useEffect(() => {
        if (boardId) {
            joinBoardRoom(boardId);
            return () => {
                leaveBoardRoom(boardId);
                queryClient.removeQueries({
                    queryKey: ['boards', boardId],
                })
            }
        }
    }, [boardId]);

    useEffect(() => {
        if (board_q.isError){
            location(`/`)
        }
    }, [board_q.isError, location])
    
    const { canEdit: canEditBoard, isOwner } = usePermissions(board);
    
    useEffect(() => {
        if ([undefined, "members", "products"].includes(screen) === false)
            location(`/board/${boardId}`)
        setHeader(
            <Group gap="xs" style={{ flexWrap: 'wrap' }}>
                <SegmentedControl
                    value={screen??"members"}
                    onChange={(v:string)=>location(`/board/${boardId}/${v}`)}
                    data={[
                        { label: 'Membri', value: 'members' },
                        { label: 'Spese', value: 'products' },
                    ]}
                    size="sm"
                    radius="md"
                    styles={{
                        root: {
                            backgroundColor: 'rgba(15, 15, 20, 0.5)',
                            borderRadius: '10px',
                            border: '1px solid rgba(100, 108, 255, 0.15)',
                            maxWidth: '100%',
                            marginBottom: '5px'
                        },
                        indicator: {
                            background: 'linear-gradient(45deg, rgba(138, 148, 255, 0.7), rgba(100, 108, 255, 0.7))',
                            boxShadow: '0 2px 5px rgba(100, 108, 255, 0.3)'
                        },
                        label: {
                            padding: '6px 16px',
                            fontWeight: 500
                        }
                    }}
                />
                
                {canEditBoard && (
                    <Menu shadow="lg" width={220} position="bottom-end">
                        <Menu.Target>
                            <OptionButton />
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>Board</Menu.Label>
                            <Menu.Item
                                leftSection={<IconSettings size={20} />}
                                onClick={() => setBoardSettingsOpened(true)}
                                disabled={!isOwner} 
                            >
                                Impostazioni
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Label>Aggiungi, Modifica o Rimuovi</Menu.Label>
                            <Menu.Item
                                leftSection={<IconCategory size={20} />}
                                onClick={() => setCategorySettingsOpened(true)}
                            >
                                Categorie
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<IconUsersGroup size={20} />}
                                onClick={() => setMemberSettingsOpened(true)}
                            >
                                Membri
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<IconShoppingBag size={20} />}
                                onClick={() => setProductSettingsOpened(true)}
                            >
                                Spesa
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                )}
                
                { currentUser && <BackButton onClick={()=>location("/")} /> }
            </Group>
        )
    }, [screen, currentUser, canEditBoard, isOwner])

    useEffect(() => {
        
        if (board_q.data && !board_q.data.isPublic && !currentUser && board_q.isError && !board_q.isFetching) {
            notifications.show({
                title: "Accesso negato",
                message: "Questa board è privata. Effettua l'accesso per continuare.",
                color: "red"
            });
            location('/');
        }
    }, [board_q.isFetching, currentUser, location]);

    const paylist = useCalculatePaylist(board)
    
    
    const paylistStatus = useMemo(() => {
        if (!paylist) return { status: "loading" };
        if (paylist.status === "loading") return { status: "loading" };
        if (paylist.status === "ok") return { status: "ok" };
        if (paylist.status === "empty") {
            
            switch(paylist.what) {
                case "no-board":
                    return { status: "empty", message: "Board non disponibile." };
                case "no-members":
                    return { status: "empty", message: "Non ci sono membri in questa board" };
                default:
                    return { status: "empty", message: "Non ci sono pagamenti necessari" };
            }
        }
        if (paylist.status === "unbalanced") return {
            status: "error", 
            message: `La board non è bilanciata! Sbilanciamento di ${formatPrice(paylist.balance??0)}.`
        };
        if (paylist.status === "uncompleted") {
            
            switch(paylist.what) {
                case "phantom-category":
                    return { status: "error", message: "Categorie usate dai spese ma non dai membri" };
                default:
                    return { status: "error", message: "Errore non definito!" };
            }
        } 
        return { status: "error", message: "Problema sconosciuto: " + paylist.status };        
    }, [paylist]);

    
    const transferButton = useMemo(() => (
        <Button
            onClick={() => setTransferModalOpen(true)}
            variant="light"
            radius="md"
            fullWidth={isSmallScreen}
            style={{
                background: 'rgba(126, 134, 231, 0.15)',
                border: '1px solid rgba(126, 134, 231, 0.25)',
                color: '#a0a8ff'
            }}
            leftSection={<IconExchange size={16} style={{marginRight: -3}} />}
        >
            Trasferisci denaro
        </Button>
    ), [isSmallScreen]);

    
    const paylistButton = useMemo(() => (
        <Button
            onClick={() => setPaymentListModalOpen(true)}
            variant="light"
            radius="md"
            fullWidth={isSmallScreen}
            loading={paylistStatus.status === "loading"}
            leftSection={
                paylistStatus.status !== "loading" && (
                    <IconCash 
                        size={18}
                        color={paylistStatus.status === "error" ? "#ff6b6b" : "#66bb6a"}
                        style={{ marginRight: -3 }}
                    />
                )
            }
            style={{
                background: paylistStatus.status === "loading" 
                    ? 'rgba(155, 163, 255, 0.15)'
                    : paylistStatus.status === "error" 
                        ? 'rgba(255, 82, 82, 0.2)' 
                        : 'rgba(100, 180, 130, 0.15)',
                border: paylistStatus.status === "loading"
                    ? '1px solid rgba(155, 163, 255, 0.25)'
                    : paylistStatus.status === "error" 
                        ? '1px solid rgba(255, 82, 82, 0.4)' 
                        : '1px solid rgba(100, 180, 130, 0.25)',
                color: paylistStatus.status === "loading"
                    ? '#9ba3ff'
                    : paylistStatus.status === "error" 
                        ? '#ff5252' 
                        : '#8dd4a2',
                minWidth: paylistStatus.status === "loading"?'100px':undefined
            }}
        >
            {
                paylistStatus.status === "loading"
                ? "Calcolo in corso..."
                : paylistStatus.status === "error" 
                    ? paylist.status === "unbalanced"
                        ? `Conti non bilanciati di ${formatPrice(paylist.balance??0)}`
                        : paylistStatus.message || "Problema con i pagamenti"
                    : paylist.payments.length === 0
                        ? paylistStatus.status === "empty" && paylistStatus.message
                            ? paylistStatus.message.includes("Non ci sono") ? "Pagamenti in pari" : paylistStatus.message
                            : "Pagamenti in pari"
                        : `Pagamenti consigliati (${paylist.payments.length})`
            }
        </Button>
    ), [paylistStatus, paylist, setPaymentListModalOpen, isSmallScreen]);

    
    const transactionsButton = useMemo(() => (
        <Button
            onClick={() => setTransactionsModalOpen(true)}
            variant="light"
            radius="md"
            fullWidth={isSmallScreen}
            leftSection={<IconHistory size={16} style={{marginRight: -3}} />}
            style={{
                background: 'rgba(255, 169, 77, 0.15)',
                border: '1px solid rgba(255, 169, 77, 0.25)',
                color: '#ffa94d'
            }}
        >
            Registro transazioni
        </Button>
    ), [setTransactionsModalOpen, isSmallScreen]);

    
    if (!isMounted) {
        return null;
    }

    if (board_q.isLoading && !board) {
        return (
            <Box className="center-flex" style={{height: "80vh"}}>
                <Box className="fadeIn" style={{ textAlign: "center" }}>
                    <Loader size="xl" variant="dots" color="#9ba3ff" />
                    <Text mt="md" fw={500} c="dimmed">Caricamento della board...</Text>
                </Box>
            </Box>
        );
    }
    
    
    if (board_q.isError) {
        return (
            <Box className="center-flex" style={{height: "50vh"}}>
                <Box className="fadeIn" style={{ textAlign: "center" }}>
                    <Text size="xl" fw={600} c="red">Errore nel caricamento della board</Text>
                    <Text mt="md" c="dimmed">Impossibile accedere a questa board</Text>
                    <Group mt="lg" justify="center">
                        <BackButton onClick={()=>location("/")} />
                    </Group>
                </Box>
            </Box>
        );
    }

    
    if (!board) {
        return (
            <Box className="center-flex" style={{height: "80vh"}}>
                <Box className="fadeIn" style={{ textAlign: "center" }}>
                    <Loader size="xl" variant="dots" color="#9ba3ff" />
                    <Text mt="md" fw={500} c="dimmed">Caricamento dei dati...</Text>
                </Box>
            </Box>
        );
    }

    
    if (!board.isPublic && !currentUser) {
        return (
            <Box className="center-flex" style={{height: "50vh"}}>
                <Box className="fadeIn" style={{ textAlign: "center" }}>
                    <Text size="xl" fw={600} c="orange">Accesso riservato</Text>
                    <Text mt="md" c="dimmed">Questa board è privata. Effettua l'accesso per visualizzarla.</Text>
                    <Group mt="lg" justify="center">
                        <BackButton onClick={()=>location("/")} />
                    </Group>
                </Box>
            </Box>
        );
    }
    
    return <>
        <Paper 
            p="md" 
            radius="lg" 
            shadow="md" 
            mb="lg"
            className="fadeIn"
            style={{
                background: 'linear-gradient(145deg, rgba(26, 27, 46, 0.7) 0%, rgba(30, 32, 58, 0.7) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(155, 163, 255, 0.15)',
                boxShadow: '0 5px 20px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <Box style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #7a84ff, #9ba3ff)',
                borderRadius: '4px 4px 0 0'
            }}/>
            
            <Group justify="space-between" wrap="nowrap">
                <Box>
                    <Group align="center" gap={8}>
                        <Title order={2} style={{ color: '#f0f0ff' }}>{board.name}</Title>
                        {!board.isPublic && (
                            <Tooltip label="Board privata - Solo utenti autenticati" position="right">
                                <Box>
                                    <IconLock size={14} color="#ffa94d" />
                                </Box>
                            </Tooltip>
                        )}
                    </Group>
                    <Group mt={8} gap={16}>
                        <Group gap={8} style={{ 
                            background: 'rgba(155, 163, 255, 0.1)', 
                            padding: '4px 12px', 
                            borderRadius: '20px',
                            border: '1px solid rgba(155, 163, 255, 0.2)',
                            cursor: canEditBoard ? 'pointer' : 'default',
                            transition: 'all 0.2s ease'
                        }} onClick={() => canEditBoard && setAddMemberSettingsOpened(true)}
                        className={canEditBoard ? 'hover-highlight' : ''}>
                            <Box className="status-icon-container">
                                <IconUsersGroup size={16} color="#9ba3ff" className="status-icon" />
                            </Box>
                            <Text size="sm" fw={500}>
                                {board.members.length} membri
                                {canEditBoard && (
                                    <span 
                                        style={{
                                            marginLeft: '6px',
                                            background: 'rgba(155, 163, 255, 0.3)',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAddMemberSettingsOpened(true);
                                        }}
                                        title="Aggiungi membro"
                                    >+</span>
                                )}
                            </Text>
                        </Group>
                        <Group gap={8} style={{ 
                            background: 'rgba(155, 163, 255, 0.1)', 
                            padding: '4px 12px', 
                            borderRadius: '20px',
                            border: '1px solid rgba(155, 163, 255, 0.2)',
                            cursor: canEditBoard ? 'pointer' : 'default',
                            transition: 'all 0.2s ease'
                        }} onClick={() => canEditBoard && setAddProductSettingsOpened(true)}
                        className={canEditBoard ? 'hover-highlight' : ''}>
                            <Box className="status-icon-container">
                                <IconShoppingBag size={16} color="#9ba3ff" className="status-icon" />
                            </Box>
                            <Text size="sm" fw={500}>
                                {board.products.length} spese
                                {canEditBoard && (
                                    <span 
                                        style={{
                                            marginLeft: '6px',
                                            background: 'rgba(155, 163, 255, 0.3)',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAddProductSettingsOpened(true);
                                        }}
                                        title="Aggiungi spesa"
                                    >+</span>
                                )}
                            </Text>
                        </Group>
                        <Group gap={8} style={{ 
                            background: 'rgba(155, 163, 255, 0.1)', 
                            padding: '4px 12px', 
                            borderRadius: '20px',
                            border: '1px solid rgba(155, 163, 255, 0.2)',
                            cursor: canEditBoard ? 'pointer' : 'default',
                            transition: 'all 0.2s ease'
                        }} onClick={() => canEditBoard && setAddCategorySettingsOpened(true)}
                        className={canEditBoard ? 'hover-highlight' : ''}>
                            <Box className="status-icon-container">
                                <IconCategory size={16} color="#9ba3ff" className="status-icon" />
                            </Box>
                            <Text size="sm" fw={500}>
                                {board.categories.length} categorie
                                {canEditBoard && (
                                    <span 
                                        style={{
                                            marginLeft: '6px',
                                            background: 'rgba(155, 163, 255, 0.3)',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAddCategorySettingsOpened(true);
                                        }}
                                        title="Aggiungi categoria"
                                    >+</span>
                                )}
                            </Text>
                        </Group>
                    </Group>
                </Box>
            </Group>
        </Paper>
        
        
        <Group mb="md" gap="md">
            {canEditBoard && transferButton}
            {paylistButton}
            {transactionsButton}
        </Group>

        {
            screen == "products"?
            <ProductsTable board={board} />
            :<MembersTable board={board} />
        }

        <BoardSettingsModal board={board} open={boardSettingsOpened} onClose={()=>setBoardSettingsOpened(false)} />
        <CategorySettingsModal board={board} open={categorySettingsOpened} onClose={()=>setCategorySettingsOpened(false)} />
        <MemberSettingsModal board={board} open={memberSettingsOpened} onClose={()=>setMemberSettingsOpened(false)} />
        <ProductSettingsModal board={board} open={productSettingsOpened} onClose={()=>setProductSettingsOpened(false)} />
        <MoneyTransferModal
            board={board} 
            open={transferModalOpen} 
            onClose={() => setTransferModalOpen(false)} 
        />
        <PaymentListModal
            board={board}
            open={paymentListModalOpen}
            onClose={() => setPaymentListModalOpen(false)}
        />
        <TransactionsModal
            board={board}
            open={transactionsModalOpen}
            onClose={() => setTransactionsModalOpen(false)}
        />
        <AddCategoryModal
            board={board}
            open={addCategorySettingsOpened}
            onClose={() => setAddCategorySettingsOpened(false)}
        />
        <AddProductModal
            board={board}
            open={addProductSettingsOpened}
            onClose={() => setAddProductSettingsOpened(false)}
        />
        <AddMemberModal
            board={board}
            open={addMemberSettingsOpened}
            onClose={() => setAddMemberSettingsOpened(false)}
        />
    </>
}

export default BoardPage;