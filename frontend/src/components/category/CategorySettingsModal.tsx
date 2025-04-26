import { putRequest } from "@/utils/net";
import { board } from "@/utils/types";
import { Box, Button, Group, Modal, Space, Text, Table, ScrollArea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useState, useMemo } from "react";
import { IconCategory, IconCircleCheck } from "@tabler/icons-react";
import { BottomEditControl } from "@/commons/BottomEditControl";
import { AddCategoryModal } from '@/components/category/AddCategoryModal';
import { CategoryRow, CategoryWithOrder, CategoryEdits, ITEMS_PER_PAGE } from '@/components/category/CategoryRow';
import { useLoading } from "@/utils/store";
import { modalOverlayProps } from "@/styles/commonStyles";
import { ModalPaper } from "@/commons/ModalPaper";
import { useMobile } from "@/utils/hooks";
import { EditHeader } from "@/commons/EditHeader";
import { ResponsivePager } from "@/commons/ResponsivePager";

interface CategoryFormValues {
    name: string;
}

interface CategorySettingsModalProps {
    open: boolean;
    onClose: () => void;
    board: board;
}

export const CategorySettingsModal = ({ open, onClose, board }: CategorySettingsModalProps) => {
    const { setLoading } = useLoading();
    const [openAddCategory, setOpenAddCategory] = useState<boolean>(false);
    const [edits, setEdits] = useState<CategoryEdits>({});
    const [savingChanges, setSavingChanges] = useState<boolean>(false);
    const [animateTable, setAnimateTable] = useState<boolean>(false);
    const isMobile = useMobile();
    const [orderedCategories, setOrderedCategories] = useState<CategoryWithOrder[]>([]);    
    const [currentPage, setCurrentPage] = useState<number>(1);

    const formAdd = useForm<CategoryFormValues>({
        initialValues: {
            name: "",
        },
        validate: {
            name: (val) => val == ""? "Il nome è obbligatorio" : null,
        },
    });

    
    useEffect(() => {
        if (open) return
        setCurrentPage(1);
    }, [open]);

    useEffect(() => {
        formAdd.reset()
    }, [openAddCategory]);

    useEffect(() => {
        setEdits({});
        if (open) {
            const sortedCategories = [...board.categories].sort((a, b) => a.order - b.order);
            setOrderedCategories(sortedCategories);
            setTimeout(() => setAnimateTable(true), 100);
        } else {
            setAnimateTable(false);
        }
    }, [open, board]);

    
    const paginatedCategories = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return orderedCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [orderedCategories, currentPage]);
    
    
    const totalPages = useMemo(() => 
        Math.max(1, Math.ceil(orderedCategories.length / ITEMS_PER_PAGE)), 
        [orderedCategories.length]
    );

    const clearDrafts = useCallback((drafts: CategoryEdits): CategoryEdits => {
        const newDrafts = {...drafts};
        
        board.categories.forEach(cat => {
            if (newDrafts[cat.id]?.name == cat.name && newDrafts[cat.id]?.order === cat.order)
                delete newDrafts[cat.id]
        });
        
        return newDrafts;
    }, [board.categories]);

    const handleNameChange = useCallback((categoryId: string, value: string): void => {
        setEdits(draft => {
            const newEdits = {...draft};
            if (!newEdits[categoryId]) newEdits[categoryId] = {};
            newEdits[categoryId].name = value ?? "";
            return clearDrafts(newEdits);
        });
    }, [clearDrafts]);

    
    const goToPageContaining = useCallback((index: number) => {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE) + 1;
        setCurrentPage(targetPage);
    }, []);

    
    const moveUp = useCallback((categoryId: string, currentIndex: number): void => {
        
        if (currentIndex <= 0) return;
        
        
        const globalIndex = currentIndex;
        
        
        setOrderedCategories(prevCategories => {
            const newCategories = [...prevCategories];
            
            
            [newCategories[globalIndex - 1], newCategories[globalIndex]] = 
                [newCategories[globalIndex], newCategories[globalIndex - 1]];
                
            return newCategories;
        });
        
        
        setEdits(prevEdits => {
            const newEdits = {...prevEdits};
            
            
            const aboveId = orderedCategories[globalIndex - 1]?.id;
            
            
            if (!newEdits[categoryId]) newEdits[categoryId] = {};
            newEdits[categoryId].order = globalIndex - 1;
            
            if (aboveId) {
                if (!newEdits[aboveId]) newEdits[aboveId] = {};
                newEdits[aboveId].order = globalIndex;
            }
            
            return clearDrafts(newEdits);
        });
        
        
        const newPosition = globalIndex - 1;
        const currentPage = Math.floor(globalIndex / ITEMS_PER_PAGE) + 1;
        const newPage = Math.floor(newPosition / ITEMS_PER_PAGE) + 1;
        
        if (currentPage !== newPage) {
            goToPageContaining(newPosition);
        }
    }, [orderedCategories, clearDrafts, goToPageContaining]);

    const moveDown = useCallback((categoryId: string, currentIndex: number): void => {
        
        if (currentIndex >= orderedCategories.length - 1) return;
        
        
        const globalIndex = currentIndex;
        
        
        setOrderedCategories(prevCategories => {
            const newCategories = [...prevCategories];
            
            [newCategories[globalIndex], newCategories[globalIndex + 1]] = 
                [newCategories[globalIndex + 1], newCategories[globalIndex]];
                
            return newCategories;
        });
        
        
        setEdits(prevEdits => {
            const newEdits = {...prevEdits};
            
            
            const belowId = orderedCategories[globalIndex + 1]?.id;
            
            
            if (!newEdits[categoryId]) newEdits[categoryId] = {};
            newEdits[categoryId].order = globalIndex + 1;
            
            if (belowId) {
                if (!newEdits[belowId]) newEdits[belowId] = {};
                newEdits[belowId].order = globalIndex;
            }
            
            return clearDrafts(newEdits);
        });
        
        
        const newPosition = globalIndex + 1;
        const currentPage = Math.floor(globalIndex / ITEMS_PER_PAGE) + 1;
        const newPage = Math.floor(newPosition / ITEMS_PER_PAGE) + 1;
        
        if (currentPage !== newPage) {
            goToPageContaining(newPosition);
        }
    }, [orderedCategories, clearDrafts, goToPageContaining]);

    
    const handleSaveChanges = useCallback((): void => {
        setSavingChanges(true);
        setLoading(true);
    
        
        const updatedEdits = {...edits};
        
        
        orderedCategories.forEach((category, index) => {
            if (category.order !== index) {
                if (!updatedEdits[category.id]) {
                    updatedEdits[category.id] = {};
                }
                updatedEdits[category.id].order = index;
            }
        });
        
        
        Promise.all(
            Object.entries(updatedEdits).map(([id, data]) => 
                putRequest(`boards/${board.id}/categories/${id}`, {
                    body: {...board.categories.find(cat => cat.id === id) ?? {}, ...data}
                })
            )
        ).then(() => {
            notifications.show({
                title: "Categorie aggiornate",
                message: "Le categorie sono state aggiornate con successo",
                color: "green",
                icon: <IconCircleCheck size={20} />
            });
        }).finally(() => {
            setEdits({});
            setLoading(false);
            setSavingChanges(false);
        });
    }, [board.id, board.categories, edits, orderedCategories, setLoading]);

    const resetEdits = useCallback(() => {
        const sortedCategories = [...board.categories].sort((a, b) => a.order - b.order);
        setOrderedCategories(sortedCategories);
        setEdits({});
        notifications.show({
            title: "Modifiche annullate",
            message: "Le modifiche sono state annullate con successo",
            color: "blue"
        });
    }, [board.categories]);

    
    const rows = useMemo(() => 
        paginatedCategories.map((cat, index) => {
            
            const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
            
            return (
                <CategoryRow 
                    key={cat.id}
                    category={cat}
                    index={globalIndex}
                    animateTable={animateTable}
                    moveUp={moveUp}
                    moveDown={moveDown}
                    handleNameChange={handleNameChange}
                    edits={edits}
                    board={board}
                    totalItems={orderedCategories.length}
                />
            );
        }), 
        [paginatedCategories, animateTable, moveUp, moveDown, handleNameChange, edits, board, orderedCategories.length, currentPage]
    );

    return <>
    <Modal 
        opened={open} 
        onClose={onClose} 
        closeOnClickOutside={false}
        title={
            <Group gap="xs">
                <IconCategory color='#9ba3ff' />
                <Text fw={600}>Categorie - {board.name}</Text>
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
                addAction={() => setOpenAddCategory(true)}
                title="Gestisci le categorie"
                cancelAction={resetEdits}
                editAction={handleSaveChanges}
                disableEdit={Object.keys(edits).length === 0 || savingChanges}
                disableCancel={Object.keys(edits).length === 0 || savingChanges}
                loading={savingChanges}
            />
            <Space h="xl" />
            <ScrollArea className="responsive-table-container" style={{ overflowX: 'auto' }}>
                <Table verticalSpacing="md" highlightOnHover={false}>
                    <Table.Tbody>
                        {orderedCategories.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <Box className="center-flex-col">
                                        <IconCategory size={40} style={{ opacity: 0.5, marginBottom: 15 }} />
                                        <Text size="lg" fw={500} c="dimmed">
                                            Nessuna categoria disponibile
                                        </Text>
                                        <Space h="md" />
                                        <Button
                                            variant="light"
                                            leftSection={<IconCategory size={16} />}
                                            onClick={() => setOpenAddCategory(true)}
                                        >
                                            Aggiungi la prima categoria
                                        </Button>
                                    </Box>
                                </Table.Td>
                            </Table.Tr>
                        ) : rows}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
            <Space h="md" />
            {orderedCategories.length > ITEMS_PER_PAGE &&
                <ResponsivePager
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages}
                />}
        </ModalPaper>
        
        {!isMobile && Object.keys(edits).length > 0 && !savingChanges &&
            <BottomEditControl resetEdits={resetEdits} handleSaveChanges={handleSaveChanges} />}
    </Modal>
    
    
    <AddCategoryModal 
        open={openAddCategory} 
        onClose={() => setOpenAddCategory(false)} 
        board={board}
        closeOnEnd
    />
    </>
}
