import {
    Avatar,
    Box,
    Card,
    Stack,
    Table,
    Text,
    TextInput,
    Tooltip,
    Transition,
} from "@mantine/core";
import { memo } from "react";
import { AdvancedNumberInput } from "@/commons/AdvancedNumberInput";
import { DeleteProduct } from "@/components/products/DeleteProduct";
import { board, product, transaction } from "@/utils/types";
import { Select } from "@mantine/core";
import { ProductEdits } from "./ProductSettingsModal";
import { getInitials, hashColor } from "@/utils/formatters";
import { inputStyles } from "@/styles/commonStyles";
import Big from "big.js";

export interface ProductRowProps {
    product: product;
    index: number;
    animateTable: boolean;
    handleNameChange: (id: string, value: string) => void;
    handlePriceChange: (id: string, value: string | number) => void;
    handleMemberChange: (id: string, value: string) => void;
    transaction?: transaction;
    edits: ProductEdits;
    board: board;
}

export const ProductRow = memo(
    ({
        product,
        index,
        animateTable,
        handleNameChange,
        handlePriceChange,
        handleMemberChange,
        transaction,
        edits,
        board,
    }: ProductRowProps) => {
        return (
            <Transition
                mounted={animateTable}
                transition="fade"
                duration={300}
                timingFunction="ease"
                key={product.id}
            >
                {(styles) => (
                    <Table.Tr
                        key={product.id}
                        style={{
                            ...styles,
                            animation: `fadeIn 0.2s ease forwards ${Math.min(index, 5) * 0.03}s`,
                            opacity: 0,
                        }}
                    >
                        <Table.Td width="100%">
                            <Box
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "15px",
                                }}
                            >
                                <Avatar
                                    color={hashColor(product.name)}
                                    radius="xl"
                                    size="md"
                                >
                                    {getInitials(
                                        edits[product.id]?.name ?? product.name,
                                    )}
                                </Avatar>
                                <TextInput
                                    value={
                                        edits[product.id]?.name ?? product.name
                                    }
                                    onChange={(e) =>
                                        handleNameChange(
                                            product.id,
                                            e.target.value,
                                        )
                                    }
                                    required
                                    style={{ width: "100%" }}
                                    styles={inputStyles}
                                />
                            </Box>
                        </Table.Td>
                        <Table.Td>
                            <Tooltip
                                label="Prezzo della spesa"
                                position="top"
                                withArrow
                            >
                                <AdvancedNumberInput
                                    placeholder="0,00"
                                    value={new Big(
                                        edits[product.id]?.price ??
                                            product.price,
                                    ).div(100)}
                                    onChange={(v) =>
                                        handlePriceChange(
                                            product.id,
                                            v?.toNumber() ?? 0,
                                        )
                                    }
                                    style={{ width: 120 }}
                                    styles={inputStyles}
                                />
                            </Tooltip>
                        </Table.Td>
                        <Table.Td>
                            <Select 
                                data={board.members.map(m => ({ value: m.id, label: m.name }))}
                                value={edits[product.id]?.memberId ?? transaction?.fromMemberId ?? ''}
                                onChange={(val) => handleMemberChange(product.id, val || '')}
                                placeholder="Pagato da"
                                styles={inputStyles}
                                style={{ width: 140 }}
                                clearable={false}
                            />
                        </Table.Td>
                        <Table.Td>
                            <DeleteProduct board={board} product={product} />
                        </Table.Td>
                    </Table.Tr>
                )}
            </Transition>
        );
    },
);

export const ProductCardMemo = memo(
    ({
        product,
        index,
        animateTable,
        handleNameChange,
        handlePriceChange,
        handleMemberChange,
        transaction,
        edits,
        board,
    }: ProductRowProps) => {
        return (
            <Transition
                mounted={animateTable}
                transition="fade"
                duration={300}
                timingFunction="ease"
                key={product.id}
            >
                {(styles) => (
                    <Card
                        style={{
                            ...styles,
                            animation: `fadeIn 0.2s ease forwards ${Math.min(index, 5) * 0.03}s`,
                            opacity: 0,
                            backgroundColor: "rgba(30, 30, 40, 0.7)",
                            marginBottom: "12px",
                            border: "1px solid var(--primary-border)",
                        }}
                        p="md"
                        radius="md"
                        withBorder
                    >
                        <Box
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "15px",
                                marginBottom: "15px",
                            }}
                        >
                            <Avatar
                                color={hashColor(product.name)}
                                radius="xl"
                                size="md"
                            >
                                {getInitials(
                                    edits[product.id]?.name ?? product.name,
                                )}
                            </Avatar>
                            <Box style={{ flex: 1 }}></Box>
                            <DeleteProduct board={board} product={product} />
                        </Box>

                        <Stack gap="md">
                            <TextInput
                                value={edits[product.id]?.name ?? product.name}
                                onChange={(e) =>
                                    handleNameChange(product.id, e.target.value)
                                }
                                required
                                style={{ width: "100%" }}
                                styles={inputStyles}
                            />

                            <Box>
                                <Text size="sm" fw={500} mb={5}>
                                    Prezzo:
                                </Text>
                                <AdvancedNumberInput
                                    placeholder="0,00"
                                    value={new Big(
                                        edits[product.id]?.price ??
                                            product.price,
                                    ).div(100)}
                                    onChange={(v) =>
                                        handlePriceChange(
                                            product.id,
                                            v?.toNumber() ?? 0,
                                        )
                                    }
                                    style={{ width: "100%" }}
                                    styles={inputStyles}
                                />
                            </Box>
                            
                            <Box>
                                <Text size="sm" fw={500} mb={5}>
                                    Pagato da:
                                </Text>
                                <Select 
                                    data={board.members.map(m => ({ value: m.id, label: m.name }))}
                                    value={edits[product.id]?.memberId ?? transaction?.fromMemberId ?? ''}
                                    onChange={(val) => handleMemberChange(product.id, val || '')}
                                    placeholder="Seleziona membro"
                                    styles={inputStyles}
                                    clearable={false}
                                />
                            </Box>
                        </Stack>
                    </Card>
                )}
            </Transition>
        );
    },
);
