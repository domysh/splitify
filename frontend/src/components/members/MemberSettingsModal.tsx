import { putRequest } from "@/utils/net";
import { board } from "@/utils/types";
import { Box, Group, Modal, Space, Table, Text, Loader, ScrollArea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconCircleCheck, IconUsersGroup } from "@tabler/icons-react";
import { BottomEditControl } from "@/commons/BottomEditControl";
import { toIntValue } from "@/commons/AdvancedNumberInput";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import { MemberRow } from "@/components/members/MemberTableRow";
import { MemberMobileCard } from "@/components/members/MemberMobileCard";
import { NoMembersPlaceholder } from "@/components/members/NoMembersPlaceholder";
import { useCalculateDebits, useMobile } from "@/utils/hooks";
import { useLoading } from "@/utils/store";
import { modalOverlayProps } from "@/styles/commonStyles";
import { ModalPaper } from "@/commons/ModalPaper";
import { EditHeader } from "@/commons/EditHeader";
import { ResponsivePager } from "@/commons/ResponsivePager";

export interface MemberSettingsModalProps {
    open: boolean;
    onClose: () => void;
    board: board;
}

export const ITEMS_PER_PAGE = 8;

export const MemberSettingsModal = ({ open, onClose, board }: MemberSettingsModalProps) => {
    const { setLoading } = useLoading();
    const [openAddMember, setOpenAddMember] = useState(false);
    const [edits, setEdits] = useState<{[id:string]:{name?:string, paid?:number}}>({});
    const [animateTable, setAnimateTable] = useState(false);
    const [savingChanges, setSavingChanges] = useState(false);
    const isMobile = useMobile()
    
    
    const [currentPage, setCurrentPage] = useState<number>(1);

    
    const debits = useCalculateDebits(board);
    
    
    const members = useMemo(() => board.members, [board.members]);
    
    
    const paginatedMembers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return members.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [members, currentPage]);
    
    
    const totalPages = useMemo(() => 
        Math.max(1, Math.ceil(members.length / ITEMS_PER_PAGE)), 
        [members.length]
    );

    
    useEffect(() => {
        if (open) return
        setCurrentPage(1);
    }, [open]);

    
    const handleNameChange = useCallback((id: string, value: string) => {
        setEdits(prevEdits => {
            const newEdits = {...prevEdits};
            const member = members.find(m => m.id === id);
            
            if (!member || value === member.name) {
                if (newEdits[id]?.name) {
                    delete newEdits[id].name;
                    if (Object.keys(newEdits[id] || {}).length === 0) {
                        delete newEdits[id];
                    }
                }
                return newEdits;
            }
            
            if (!newEdits[id]) newEdits[id] = {};
            newEdits[id].name = value;
            return newEdits;
        });
    }, [members]);

    const handlePaidChange = useCallback((id: string, value: any) => {
        const numValue = toIntValue(value);
        setEdits(prevEdits => {
            const newEdits = {...prevEdits};
            const member = members.find(m => m.id === id);
            
            if (!member || numValue === member.paid) {
                if (newEdits[id]?.paid !== undefined) {
                    delete newEdits[id].paid;
                    if (Object.keys(newEdits[id] || {}).length === 0) {
                        delete newEdits[id];
                    }
                }
                return newEdits;
            }
            
            if (!newEdits[id]) newEdits[id] = {};
            newEdits[id].paid = numValue;
            return newEdits;
        });
    }, [members]);

    useEffect(() => {
        setEdits({});
        if (open) {
            setTimeout(() => setAnimateTable(true), 100);
        } else {
            setAnimateTable(false);
        }
    }, [open]);

    const handleSaveChanges = useCallback(() => {
        setSavingChanges(true);
        setLoading(true);
    
        Promise.all(
            Object.entries(edits).map(([id, data]) => 
                putRequest(`boards/${board.id}/members/${id}`, {
                    body: {...members.find(memb => memb.id === id) ?? {}, ...data}
                })
            )
        )
        .then(() => {
            notifications.show({
                title: "Membri aggiornati",
                message: "I membri sono stati aggiornati con successo",
                color: "green",
                icon: <IconCircleCheck size={20} />
            });
        })
        .finally(() => {
            setEdits({});
            setLoading(false);
            setSavingChanges(false);
        });
    }, [board.id, members, edits, setEdits, setLoading]);

    const resetEdits = useCallback(() => {
        setEdits({});
        notifications.show({
            title: "Modifiche annullate",
            message: "Le modifiche sono state annullate con successo",
            color: "blue"
        });
    }, []);

    
    const renderTableRows = useMemo(() => {
        if (members.length === 0) {
            return (
                <Table.Tr>
                    <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '40px 0' }}>
                        <NoMembersPlaceholder onAddClick={() => setOpenAddMember(true)} />
                    </Table.Td>
                </Table.Tr>
            );
        }
        
        return paginatedMembers.map((member, index) => {
            const debit = debits.find(d => d.id === member.id)?.price ?? 0;
            const paid = edits[member.id]?.paid ?? member.paid ?? 0;
            const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
            
            return (
                <MemberRow
                    key={member.id}
                    member={member}
                    index={globalIndex}
                    debit={debit}
                    paid={paid}
                    edits={edits}
                    onNameChange={handleNameChange}
                    onPaidChange={handlePaidChange}
                    animateTable={animateTable}
                    board={board}
                />
            );
        });
    }, [paginatedMembers, debits, edits, animateTable, handleNameChange, handlePaidChange, board, setOpenAddMember, currentPage]);

    
    const renderMobileCards = useMemo(() => {
        if (members.length === 0) {
            return <NoMembersPlaceholder onAddClick={() => setOpenAddMember(true)} />;
        }
        
        return (
            <Box>
                {paginatedMembers.map((member, index) => {
                    const debit = debits.find(d => d.id === member.id)?.price ?? 0;
                    const paid = edits[member.id]?.paid ?? member.paid ?? 0;
                    const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                    
                    return (
                        <MemberMobileCard
                            key={member.id}
                            member={member}
                            debit={debit}
                            paid={paid}
                            edits={edits}
                            onNameChange={handleNameChange}
                            onPaidChange={handlePaidChange}
                            animateTable={animateTable}
                            index={globalIndex}
                            board={board}
                        />
                    );
                })}
            </Box>
        );
    }, [paginatedMembers, debits, edits, animateTable, handleNameChange, handlePaidChange, board, setOpenAddMember, currentPage]);

    return <>
        <Modal 
            opened={open} 
            onClose={onClose} 
            closeOnClickOutside={false}
            title={
                <Group gap="xs">
                    <IconUsersGroup color='#9ba3ff' />
                    <Text fw={600}>Membri - {board.name}</Text>
                </Group>
            } 
            centered 
            fullScreen
            overlayProps={modalOverlayProps}
            transitionProps={{
                transition: 'fade',
                duration: 300
            }}
        >
            <ModalPaper>
                <EditHeader
                    addAction={() => setOpenAddMember(true)}
                    title="Gestisci i membri"
                    cancelAction={resetEdits}
                    editAction={handleSaveChanges}
                    disableEdit={Object.keys(edits).length === 0 || savingChanges}
                    disableCancel={Object.keys(edits).length === 0 || savingChanges}
                    loading={savingChanges}
                />                
                <Space h="xl" />
                {!isMobile ? (
                    <Box>
                        <ScrollArea className="responsive-table-container">
                            <Table verticalSpacing="md" highlightOnHover={false}>
                                <Table.Tbody>
                                    {renderTableRows}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                        {members.length > ITEMS_PER_PAGE &&
                            <ResponsivePager
                                currentPage={currentPage}
                                setCurrentPage={setCurrentPage}
                                totalPages={totalPages}
                            />}
                    </Box>
                ) : (
                    <Box>
                        {renderMobileCards}
                        {members.length > ITEMS_PER_PAGE &&
                            <ResponsivePager
                                currentPage={currentPage}
                                setCurrentPage={setCurrentPage}
                                totalPages={totalPages}
                            />}
                    </Box>
                )}
                
                {savingChanges && (
                    <Box className="center-flex" mt="xl">
                        <Loader size="sm" color="blue" />
                        <Text ml="xs" size="sm">Salvataggio modifiche...</Text>
                    </Box>
                )}
            </ModalPaper>
            
            {!isMobile && Object.keys(edits).length > 0 && !savingChanges && <BottomEditControl resetEdits={resetEdits} handleSaveChanges={handleSaveChanges} />}
        </Modal>
        
        <AddMemberModal 
            open={openAddMember} 
            onClose={() => setOpenAddMember(false)} 
            board={board}
            closeOnEnd
        />
    </>
}
