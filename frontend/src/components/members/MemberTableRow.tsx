import {
    Avatar,
    Badge,
    Box,
    Table,
    TextInput,
    Tooltip,
    Transition,
} from "@mantine/core";
import { useEffect, memo, useState } from "react";
import { BalanceIcon } from "@/commons/BalanceIcon";
import { board, member } from "@/utils/types";
import { AdvancedNumberInput } from "@/commons/AdvancedNumberInput";
import { DeleteMember } from "@/components/members/DeleteMember";
import { inputStyles } from "@/styles/commonStyles";
import { formatPrice, getInitials, hashColor } from "@/utils/formatters";
import Big from "big.js";

export interface MemberRowProps {
    member: member;
    index: number;
    debit: number;
    paid: number;
    edits: { [id: string]: { name?: string; paid?: number } };
    onNameChange: (id: string, value: string) => void;
    onPaidChange: (id: string, value: any) => void;
    animateTable: boolean;
    board: board;
}

export const MemberRow = memo(
    ({
        member,
        index,
        debit,
        paid,
        edits,
        onNameChange,
        onPaidChange,
        animateTable,
        board,
    }: MemberRowProps) => {
        const balance = paid - debit;
        const [initialAnimation] = useState(true);
        const memberName = edits[member.id]?.name ?? member.name;

        const [localName, setLocalName] = useState(memberName);

        useEffect(() => {
            setLocalName(memberName);
        }, [memberName]);

        const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setLocalName(value);
            onNameChange(member.id, value);
        };

        const handlePaidChange = (value: any) => {
            onPaidChange(member.id, value);
        };

        return (
            <Transition
                key={member.id}
                mounted={animateTable && initialAnimation}
                transition="fade"
                duration={400}
                timingFunction="ease"
            >
                {(styles) => (
                    <Table.Tr
                        style={{
                            ...styles,
                            animation: `fadeIn 0.3s ease forwards ${Math.min(index, 5) * 0.05}s`,
                            opacity: 0,
                        }}
                    >
                        <Table.Td>
                            <BalanceIcon balance={balance} />
                        </Table.Td>
                        <Table.Td>
                            <Box className="center-flex" style={{ gap: 10 }}>
                                <Avatar
                                    radius="xl"
                                    color={hashColor(member.id)}
                                    styles={{
                                        root: {
                                            border: "2px solid rgba(255, 255, 255, 0.1)",
                                        },
                                    }}
                                >
                                    {getInitials(localName)}
                                </Avatar>
                                <TextInput
                                    value={localName}
                                    onChange={handleNameChange}
                                    required
                                    style={{ width: "100%" }}
                                    styles={inputStyles}
                                />
                            </Box>
                        </Table.Td>
                        <Table.Td>
                            <Tooltip
                                label="Importo dovuto"
                                position="top"
                                withArrow
                            >
                                <Badge
                                    color="blue"
                                    variant="light"
                                    styles={{ root: { padding: "6px 10px" } }}
                                >
                                    {formatPrice(debit)}
                                </Badge>
                            </Tooltip>
                        </Table.Td>
                        <Table.Td>
                            <Tooltip
                                label={
                                    balance < 0
                                        ? "Deve ancora pagare"
                                        : balance > 0
                                          ? "Ha pagato in eccesso"
                                          : "Saldo in pari"
                                }
                                position="top"
                                withArrow
                            >
                                <Badge
                                    color={
                                        balance < 0
                                            ? "red"
                                            : balance > 0
                                              ? "orange"
                                              : "green"
                                    }
                                    variant="light"
                                    styles={{ root: { padding: "6px 10px" } }}
                                >
                                    {formatPrice(balance)}
                                </Badge>
                            </Tooltip>
                        </Table.Td>
                        <Table.Td>
                            <AdvancedNumberInput
                                placeholder="0,00"
                                value={new Big(paid).div(100)}
                                onChange={handlePaidChange}
                                style={{ width: 120 }}
                                styles={inputStyles}
                            />
                        </Table.Td>
                        <Table.Td>
                            <DeleteMember board={board} member={member} />
                        </Table.Td>
                    </Table.Tr>
                )}
            </Transition>
        );
    },
);
