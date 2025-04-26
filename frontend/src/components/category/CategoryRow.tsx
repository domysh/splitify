import { board, category } from "@/utils/types";
import { ActionIcon, TextInput, Table, Transition } from "@mantine/core";
import { memo } from "react";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { DeleteCategory } from '@/components/category/DeleteCategory';
import { inputStyles } from "@/styles/commonStyles";
import { hashColor } from "@/utils/formatters";

export const ITEMS_PER_PAGE = 8;


export interface CategoryWithOrder extends category {
    order: number;
}

export interface CategoryEdits {
    [id: string]: {
        name?: string;
        order?: number;
    };
}

interface CategoryRowProps {
    category: CategoryWithOrder;
    index: number;
    animateTable: boolean;
    moveUp: (categoryId: string, currentIndex: number) => void;
    moveDown: (categoryId: string, currentIndex: number) => void;
    handleNameChange: (categoryId: string, value: string) => void;
    edits: CategoryEdits;
    board: board;
    totalItems: number;
}


export const CategoryRow = memo(({ 
    category, 
    index, 
    animateTable, 
    moveUp, 
    moveDown, 
    handleNameChange, 
    edits, 
    board,
    totalItems
}: CategoryRowProps) => {    
    const globalIndex = index;
    const animationIndex = globalIndex % ITEMS_PER_PAGE;

    return (
        <Transition key={category.id} mounted={animateTable} transition="fade" duration={300} timingFunction="ease">
            {(styles) => (
                <Table.Tr style={{
                    ...styles,
                    animation: `fadeIn 0.2s ease forwards ${Math.min(animationIndex, 5) * 0.03}s`,
                    opacity: 0
                }}>
                    <Table.Td>
                        <ActionIcon 
                            radius="xl" 
                            size="md"
                            color={hashColor(category.id)}
                            style={{ 
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'default',
                                flexShrink: 0
                            }}
                        >
                            {globalIndex + 1}
                        </ActionIcon>
                    </Table.Td>
                    <Table.Td>
                        <ActionIcon 
                            size="sm" 
                            variant="subtle" 
                            color="blue" 
                            disabled={globalIndex === 0}
                            onClick={() => moveUp(category.id, globalIndex)}
                            title="Sposta in alto"
                        >
                            <IconArrowUp size={14} />
                        </ActionIcon>
                        <ActionIcon 
                            size="sm" 
                            variant="subtle" 
                            color="blue" 
                            disabled={globalIndex === totalItems - 1}
                            onClick={() => moveDown(category.id, globalIndex)}
                            title="Sposta in basso"
                        >
                            <IconArrowDown size={14} />
                        </ActionIcon>
                    </Table.Td>
                    <Table.Td style={{ width: '100%' }}>
                        <TextInput
                            value={edits[category.id]?.name??category.name}
                            onChange={(e) => handleNameChange(category.id, e.target.value)}
                            required
                            style={{ width: '100%' }}
                            styles={inputStyles}
                        />
                    </Table.Td>
                    <Table.Td><DeleteCategory board={board} category={category}/></Table.Td>
                </Table.Tr>
            )}
        </Transition>
    );
});
