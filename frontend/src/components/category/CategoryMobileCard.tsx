import { board } from "@/utils/types";
import { ActionIcon, Group, Paper, TextInput, Transition } from "@mantine/core";
import { memo } from "react";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { DeleteCategory } from '@/components/category/DeleteCategory';
import { inputStyles } from "@/styles/commonStyles";
import { hashColor } from "@/utils/formatters";
import { CategoryEdits, CategoryWithOrder, ITEMS_PER_PAGE } from "@/components/category/CategoryRow";

interface CategoryMobileCardProps {
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

export const CategoryMobileCard = memo(({
    category,
    index,
    animateTable,
    moveUp,
    moveDown,
    handleNameChange,
    edits,
    board,
    totalItems
}: CategoryMobileCardProps) => {
    const globalIndex = index;
    const animationIndex = globalIndex % ITEMS_PER_PAGE;

    return (
        <Transition key={category.id} mounted={animateTable} transition="fade" duration={300} timingFunction="ease">
            {(styles) => (
                <Paper
                    p="md"
                    mb="md"
                    radius="md"
                    style={{
                        ...styles,
                        animation: `fadeIn 0.2s ease forwards ${Math.min(animationIndex, 5) * 0.03}s`,
                        opacity: 0,
                        background: "rgba(30, 31, 48, 0.5)",
                        border: "1px solid var(--primary-border)",
                    }}
                >
                    <Group justify="space-between" align="center" wrap="nowrap" mb="sm">
                        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                            <ActionIcon
                                radius="xl"
                                size="lg"
                                color={hashColor(category.id)}
                                style={{ color: 'white', fontWeight: 600, cursor: 'default' }}
                            >
                                {globalIndex + 1}
                            </ActionIcon>
                            <ActionIcon
                                size="lg"
                                variant="subtle"
                                color="blue"
                                disabled={globalIndex === 0}
                                onClick={() => moveUp(category.id, globalIndex)}
                                title="Sposta in alto"
                            >
                                <IconArrowUp size={18} />
                            </ActionIcon>
                            <ActionIcon
                                size="lg"
                                variant="subtle"
                                color="blue"
                                disabled={globalIndex === totalItems - 1}
                                onClick={() => moveDown(category.id, globalIndex)}
                                title="Sposta in basso"
                            >
                                <IconArrowDown size={18} />
                            </ActionIcon>
                        </Group>
                        <Group style={{ flexShrink: 0 }}>
                            <DeleteCategory board={board} category={category} />
                        </Group>
                    </Group>
                    <TextInput
                        label="Nome"
                        value={edits[category.id]?.name ?? category.name}
                        onChange={(e) => handleNameChange(category.id, e.target.value)}
                        required
                        styles={inputStyles}
                    />
                </Paper>
            )}
        </Transition>
    );
});
