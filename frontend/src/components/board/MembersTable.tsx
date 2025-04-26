import { useCalculateDebits, useMobile, useStickyScrollableHeader } from "@/utils/hooks";
import { board } from "@/utils/types";
import { Avatar, Box, Table, Text, ScrollArea, Space, Card, Group, Divider, Stack, SimpleGrid } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { putRequest } from "@/utils/net";
import { BalanceIcon } from "@/commons/BalanceIcon";
import { usePermissions } from "@/utils/hooks";
import { CategoryCheckbox } from "@/commons/CategoryCheckbox";
import { formatPrice, getInitials } from "@/utils/formatters";


interface CategoryToggleVariables {
    memberId: string;
    catId: string;
    newCategories: string[];
}

interface MutationContext {
    previousBoard?: board;
}

export interface MembersTableProps {
    board: board;
}

export const MembersTable = ({ board }: MembersTableProps) => {
    const queryClient = useQueryClient();
    const isMobile = useMobile();
    
    const { canEdit } = usePermissions(board);
    const userDebitCounter = useCalculateDebits(board);
    
    const sortedCategories = useMemo(() => (
        board.categories.sort((a, b) => a.order - b.order)
    ), [board.categories]);

    const tableRef = useStickyScrollableHeader({ headHeight: 30, topOffset: 70 });
    
    const toggleCategoryMutation = useMutation<any, Error, CategoryToggleVariables, MutationContext>({
        mutationFn: ({ memberId, catId:_, newCategories }) => {
            const member = board.members.find(m => m.id === memberId);
            if (!member) throw new Error("Membro non trovato");
            return putRequest(`boards/${board.id}/members/${memberId}`, {
                body: {
                    ...member,
                    categories: newCategories,
                }
            });
        },
        onMutate: async ({ memberId, catId:_, newCategories }) => {
            await queryClient.cancelQueries({ queryKey: ['boards', board.id] });
            const previousBoard = queryClient.getQueryData<board>(['boards', board.id]);
            if (previousBoard) {
                queryClient.setQueryData<board>(['boards', board.id], (old) => {
                    if (!old) return previousBoard;
                    return {
                        ...old,
                        members: old.members.map(m => 
                            m.id === memberId 
                                ? { ...m, categories: newCategories } 
                                : m
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
        }
    });

    
    const handleCategoryToggle = useCallback((memberId: string, catId: string, currentCategories: string[]) => {
        const isCurrentlyChecked = currentCategories.includes(catId);
        const newCategories = isCurrentlyChecked
            ? currentCategories.filter(c => c !== catId)
            : [...currentCategories, catId];
            
        toggleCategoryMutation.mutate({ memberId, catId, newCategories });
    }, [toggleCategoryMutation]);

    
    const isCategoryLoading = useCallback((memberId: string, catId: string) => {
        const isLoading = toggleCategoryMutation.isPending && 
            toggleCategoryMutation.variables?.memberId === memberId && 
            toggleCategoryMutation.variables?.catId === catId;
        return isLoading;
    }, [toggleCategoryMutation.isPending, toggleCategoryMutation.variables]);

    const isCheckboxChecked = useCallback((memberId: string, catId: string, currentCategories: string[]) => {
        
        if (
            toggleCategoryMutation.isPending && 
            toggleCategoryMutation.variables?.memberId === memberId && 
            toggleCategoryMutation.variables?.catId === catId
        ) {
            return toggleCategoryMutation.variables.newCategories.includes(catId);
        }
        
        return currentCategories.includes(catId);
    }, [toggleCategoryMutation.isPending, toggleCategoryMutation.variables]);

    
    const rows = useMemo(() => {
        return board.members.map((memb) => {
            const debit = userDebitCounter.find((ele) => ele.id === memb.id)?.price ?? 0;
            const balance = memb.paid - debit;
            
            return (
                <Table.Tr key={memb.id}>
                    <Table.Td>
                        <Box style={{float: "left", paddingLeft: "10px"}}>
                            <BalanceIcon balance={balance} />
                        </Box>
                    </Table.Td>
                    <Table.Td>
                        <Box display="flex" style={{gap: 10}}>
                            <Avatar 
                                radius="xl" 
                                size="sm" 
                                color="indigo" 
                                src={null}
                            >
                                {getInitials(memb.name)}
                            </Avatar>
                            <Text fw={500}>{memb.name}</Text>
                        </Box>
                    </Table.Td>
                    {sortedCategories.map((cat) => (
                        <Table.Td key={cat.id}>
                            <CategoryCheckbox
                                checked={isCheckboxChecked(memb.id, cat.id, memb.categories)}
                                loading={isCategoryLoading(memb.id, cat.id)}
                                readOnly={!canEdit}
                                onClick={() => {
                                    if (!isCategoryLoading(memb.id, cat.id)) {
                                        handleCategoryToggle(memb.id, cat.id, memb.categories);
                                    }
                                }}
                            />
                        </Table.Td>
                    ))}
                    <Table.Td>{formatPrice(memb.paid)}</Table.Td>
                    <Table.Td>{formatPrice(debit)}</Table.Td>
                    <Table.Td style={{ 
                        color: balance < 0 ? '#ff6b6b' : (balance > 0 ? '#ffa94d' : '#51cf66'),
                        fontWeight: 600 
                    }}>
                        {formatPrice(balance)}
                    </Table.Td>
                </Table.Tr>
            );
        });
    }, [board.members, sortedCategories, userDebitCounter, canEdit, handleCategoryToggle, isCheckboxChecked, isCategoryLoading]);

    if (isMobile) {
        return (
            <Box mt="md">
                <Stack gap="md">
                    {board.members.map((memb) => {
                        const debit = userDebitCounter.find((ele) => ele.id === memb.id)?.price ?? 0;
                        const balance = memb.paid - debit;
                        
                        return (
                            <Card key={memb.id} withBorder p="md">
                                <Group mb="xs">
                                    <Group gap="sm">
                                        <BalanceIcon balance={balance} />
                                        <Avatar 
                                            radius="xl" 
                                            size="md" 
                                            color="indigo" 
                                            src={null}
                                        >
                                            {getInitials(memb.name)}
                                        </Avatar>
                                        <Text fw={500}>{memb.name}</Text>
                                    </Group>
                                </Group>
                                
                                <Group mt="md" mb="md" justify="space-between" mx="sm">
                                    <Box>
                                        <Text size="xs" c="dimmed">Pagato</Text>
                                        <Text fw={500}>{formatPrice(memb.paid)}</Text>
                                    </Box>
                                    <Box>
                                        <Text size="xs" c="dimmed">Dovuto</Text>
                                        <Text fw={500}>{formatPrice(debit)}</Text>
                                    </Box>
                                    <Box mr="xs">
                                        <Text size="xs" c="dimmed">Saldo</Text>
                                        <Text fw={600} style={{ 
                                            color: balance < 0 ? '#ff6b6b' : (balance > 0 ? '#ffa94d' : '#51cf66')
                                        }}>
                                            {formatPrice(balance)}
                                        </Text>
                                    </Box>
                                </Group>
                                
                                {board.categories.length > 0 && <Divider my="xs" label="Categorie" labelPosition="center" />}
                                
                                <SimpleGrid cols={2}>
                                    {sortedCategories.map(cat => (
                                        <Group key={cat.id} gap="xs">
                                            <CategoryCheckbox
                                                checked={isCheckboxChecked(memb.id, cat.id, memb.categories)}
                                                loading={isCategoryLoading(memb.id, cat.id)}
                                                readOnly={!canEdit}
                                                label={cat.name}
                                                onClick={() => {
                                                    if (!isCategoryLoading(memb.id, cat.id)) {
                                                        handleCategoryToggle(memb.id, cat.id, memb.categories);
                                                    }
                                                }}
                                            />
                                        </Group>
                                    ))}
                                </SimpleGrid>
                            </Card>
                        );
                    })}
                </Stack>
                <Space h="md" />
            </Box>
        );
    }

    return (
        <>
            <ScrollArea className="responsive-table-container">
                <Table 
                    verticalSpacing="md" 
                    style={{ 
                        minWidth: sortedCategories.length > 1 ? (650 + (sortedCategories.length - 1) * 100) : 'auto' 
                    }}
                    ref={tableRef}
                >
                    <Table.Thead>
                        <Table.Tr style={{ background: 'rgba(20, 22, 40, 0.7)'}}>
                            <Table.Th style={{ textWrap: "nowrap" }}>Status</Table.Th>
                            <Table.Th style={{ textWrap: "nowrap" }}>Membro</Table.Th>
                            {sortedCategories.map((cat) => (
                                <Table.Th style={{ textWrap: "nowrap" }} key={cat.id}>{cat.name}</Table.Th>
                            ))}
                            <Table.Th style={{ textWrap: "nowrap" }}>Pagato</Table.Th>
                            <Table.Th style={{ textWrap: "nowrap" }}>Dovuto</Table.Th>
                            <Table.Th style={{ textWrap: "nowrap" }}>Saldo</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                </Table>
                <Space h="sm" />
            </ScrollArea>
            
        </>
    );
};
