import { useMobile, useStickyScrollableHeader } from "@/utils/hooks";
import { board } from "@/utils/types";
import { Avatar, Box, ScrollArea, Space, Table, Text, Card, Group, Divider, SimpleGrid, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { putRequest } from "@/utils/net";
import { usePermissions } from "@/utils/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import { CategoryCheckbox } from "@/commons/CategoryCheckbox";
import { formatPrice, getInitials, hashColor } from "@/utils/formatters";

interface CategoryToggleVariables {
    prodId: string;
    catId: string;
    newCategories: string[];
}

interface MutationContext {
    previousBoard?: board;
}

export interface ProductsTableProps {
    board: board;
}


export const ProductsTable = ({ board }:ProductsTableProps) => {
    const queryClient = useQueryClient();
    const isMobile = useMobile();

    const { canEdit } = usePermissions(board);

    const sortedCategories = useMemo(() => (
        [...board.categories.sort((a, b) => a.order - b.order), { id:"all", name:"Tutti *", order:-1 }]
    ), [board.categories]);

    const tableRef = useStickyScrollableHeader({ headHeight: 30, topOffset: 70 });
    
    
    const toggleCategoryMutation = useMutation<any, Error, CategoryToggleVariables, MutationContext>({
        mutationFn: ({ prodId, catId:_, newCategories }) => {
            const product = board.products.find(p => p.id === prodId);
            if (!product) throw new Error("Spesa non trovata");
            
            return putRequest(`boards/${board.id}/products/${prodId}`, {
                body: {
                    ...product,
                    categories: newCategories,
                }
            });
        },
        onMutate: async ({ prodId, catId:_, newCategories }) => {   
            await queryClient.cancelQueries({ queryKey: ['boards', board.id] });
            const previousBoard = queryClient.getQueryData<board>(['boards', board.id]);
            
            if (previousBoard) {
                queryClient.setQueryData<board>(['boards', board.id], (old) => {
                    if (!old) return previousBoard;
                    
                    return {
                        ...old,
                        products: old.products.map(p => 
                            p.id === prodId 
                                ? { ...p, categories: newCategories } 
                                : p
                        )
                    };
                });
            }
             
            return { previousBoard };
        },
        onError: (err, _, context) => {
            
            if (context?.previousBoard) {
                queryClient.setQueryData(['boards', board.id], context.previousBoard);
            }
            
            notifications.show({
                title: "Errore nell'aggiornamento",
                message: err.message || "Si è verificato un errore",
                color: "red"
            });
        },
    });

    
    const handleCategoryToggle = useCallback((prodId: string, catId: string, currentCategories: string[]) => {
        const isAllCategory = catId === "all";
        const isCurrentlyChecked = isAllCategory?currentCategories.length === 0:currentCategories.includes(catId);
        const newCategories = isAllCategory ? []: isCurrentlyChecked
            ? currentCategories.filter(c => c !== catId)
            : [...currentCategories, catId];
        if (isAllCategory && isCurrentlyChecked) {
            notifications.show({
                title: "Info",
                message: "Seleziona altre categorie per non far pagare la spesa a tutti i membri",
                color: "cyan",
                autoClose: 5000,
                icon: <IconInfoCircle size={18} />
            });
            return;
        }
        toggleCategoryMutation.mutate({ prodId, catId, newCategories });
    }, [toggleCategoryMutation]);

    
    const isCategoryLoading = useCallback((prodId: string, catId: string) => {
        const isLoading = toggleCategoryMutation.isPending && 
            toggleCategoryMutation.variables?.prodId === prodId && 
            toggleCategoryMutation.variables?.catId === catId;
        return isLoading;
    }, [toggleCategoryMutation.isPending, toggleCategoryMutation.variables]);

    
    const isCheckboxChecked = useCallback((prodId: string, catId: string, currentCategories: string[]) => {
        
        if (
            toggleCategoryMutation.isPending && 
            toggleCategoryMutation.variables?.prodId === prodId && 
            toggleCategoryMutation.variables?.catId === catId
        ) {
            if (catId === "all") {
                return toggleCategoryMutation.variables.newCategories.length === 0;
            }
            return toggleCategoryMutation.variables.newCategories.includes(catId);
        }
        if (catId === "all") {
            return currentCategories.length === 0;
        }
        
        return currentCategories.includes(catId);
    }, [toggleCategoryMutation.isPending, toggleCategoryMutation.variables]);

    const rows = useMemo(() => 
        board.products.map((prod) => (
            <Table.Tr key={prod.id}>
                <Table.Td>
                    <Box display="flex" style={{gap: 10}}>
                        <Avatar 
                            radius="xl" 
                            size="sm" 
                            color={hashColor(prod.name)} 
                            src={null}
                        >
                            {getInitials(prod.name, 1)}
                        </Avatar>
                        <Text fw={500}>{prod.name}</Text>
                    </Box>
                </Table.Td>
                <Table.Td style={{ fontWeight: 500, textWrap: "nowrap" }}>{formatPrice(prod.price)}</Table.Td>
                {sortedCategories.map((cat) => (
                    <Table.Td key={cat.id}>
                        <CategoryCheckbox
                            checked={isCheckboxChecked(prod.id, cat.id, prod.categories)}
                            loading={isCategoryLoading(prod.id, cat.id)}
                            readOnly={!canEdit}
                            onClick={() => {
                                if (!isCategoryLoading(prod.id, cat.id)) {
                                    handleCategoryToggle(prod.id, cat.id, prod.categories);
                                }
                            }}
                        />
                    </Table.Td>
                ))}
            </Table.Tr>
        )),
    [board.products, sortedCategories, canEdit, handleCategoryToggle, isCheckboxChecked, isCategoryLoading]);

    const totalPrice = useMemo(() => (board.products.reduce((acc, prod) => acc + prod.price, 0)), [board.products]);
    const categoryHeaders = useMemo(() => 
        sortedCategories
            .map((cat) => (
                <Table.Th style={{ textWrap: "nowrap" }} key={cat.id}>{cat.name}</Table.Th>
            )),
    [sortedCategories]);
    
    if (isMobile) {
        return (
            <Box mt="md">
                <Card mb="md" withBorder p="md" style={{ background: 'rgba(35, 37, 65, 0.6)' }}>
                    <Group justify="space-between">
                        <Box display="flex" style={{gap: 10}}>
                            <Avatar 
                                radius="xl" 
                                size="sm"
                                color="rgba(255, 169, 77, 0.7)"
                            >
                                €
                            </Avatar>
                            <Text fw={600}>Totale</Text>
                        </Box>
                        <Text fw={600} style={{ color: '#ffa94d' }}>{formatPrice(totalPrice)}</Text>
                    </Group>
                </Card>

                <Stack gap="md">
                    {board.products.map((prod) => (
                        <Card key={prod.id} withBorder p="md">
                            <Group justify="space-between" mb="xs">
                                <Group gap="sm">
                                    <Avatar 
                                        radius="xl" 
                                        size="md" 
                                        color={hashColor(prod.name)} 
                                        src={null}
                                    >
                                        {getInitials(prod.name, 1)}
                                    </Avatar>
                                    <Text fw={500}>{prod.name}</Text>
                                </Group>
                                <Text fw={500}>{formatPrice(prod.price)}</Text>
                            </Group>
                            
                            <Divider my="xs" label="Categorie" labelPosition="center" />
                            
                            <SimpleGrid cols={2}>
                                {sortedCategories.map(cat => (
                                    <Group key={cat.id} gap="xs">
                                        <CategoryCheckbox
                                            checked={isCheckboxChecked(prod.id, cat.id, prod.categories)}
                                            loading={isCategoryLoading(prod.id, cat.id)}
                                            readOnly={!canEdit}
                                            label={cat.name}
                                            onClick={() => {
                                                if (!isCategoryLoading(prod.id, cat.id)) {
                                                    handleCategoryToggle(prod.id, cat.id, prod.categories);
                                                }
                                            }}
                                        />
                                    </Group>
                                ))}
                            </SimpleGrid>
                        </Card>
                    ))}
                </Stack>
                <Space h="md" />
            </Box>
        );
    }
    
    return <>
        <ScrollArea className="responsive-table-container">
            <Table verticalSpacing="md" ref={tableRef}>
                <Table.Thead>
                    <Table.Tr style={{ background: 'rgba(20, 22, 40, 0.7)'}}>
                        <Table.Th>Spesa</Table.Th>
                        <Table.Th>Costo</Table.Th>
                        {categoryHeaders}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows}
                    <Table.Tr key="tot" style={{ 
                        background: 'rgba(35, 37, 65, 0.6)',
                        borderTop: '1px solid var(--primary-border)',
                        position: 'relative'
                    }}>
                        <Table.Td>
                            <Box display="flex" style={{gap: 10}}>
                                <Avatar 
                                    radius="xl" 
                                    size="sm"
                                    color="rgba(255, 169, 77, 0.7)"
                                >
                                    €
                                </Avatar>
                                <Text fw={600}>Totale</Text>
                            </Box>
                        </Table.Td>
                        <Table.Td style={{ 
                            fontWeight: 'bold',
                            color: '#ffa94d'
                        }}>
                            {formatPrice(totalPrice)}
                        </Table.Td>
                        <Table.Td colSpan={sortedCategories.length}></Table.Td>
                    </Table.Tr>
                </Table.Tbody>
            </Table>
            <Space h="sm" />
        </ScrollArea>
        
    </>;
};
