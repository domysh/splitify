import { Avatar, Badge, Box, Group, Paper, Text, TextInput, Transition } from "@mantine/core";
import { useEffect, memo, useState } from "react";
import { board, member } from "@/utils/types";
import { BalanceIcon } from "@/commons/BalanceIcon";
import { AdvancedNumberInput } from "@/commons/AdvancedNumberInput";
import { DeleteMember } from "@/components/members/DeleteMember";
import { inputStyles } from "@/styles/commonStyles";
import { formatPrice, getInitials, hashColor } from "@/utils/formatters";


export interface MemberMobileCardProps {
    member: member;
    debit: number;
    paid: number;
    edits: { [id: string]: { name?: string; paid?: number } };
    onNameChange: (id: string, value: string) => void;
    onPaidChange: (id: string, value: any) => void;
    animateTable: boolean;
    index: number;
    board: board;
}

export const MemberMobileCard = memo((
    { 
        member, debit, paid, edits, onNameChange,
        onPaidChange, animateTable, index, board
    }: MemberMobileCardProps
) => {

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
                <Paper 
                    p="md" 
                    mb="md"
                    radius="md"
                    style={{
                        ...styles,
                        animation: `fadeIn 0.3s ease forwards ${Math.min(index, 5) * 0.05}s`,
                        opacity: 0,
                        background: 'rgba(30, 31, 48, 0.5)',
                        border: '1px solid var(--primary-border)'
                    }}
                >
                    <Group display="flex" mb="sm">
                        <Avatar 
                            radius="xl" 
                            color={hashColor(member.id)}
                            styles={{ root: { border: '2px solid rgba(255, 255, 255, 0.1)' } }}
                        >
                            {getInitials(localName)}
                        </Avatar>
                        <Box style={{ flexGrow: 1 }} />
                        <Box display="flex" style={{ gap: 15, justifyContent: 'center' }}>
                            <BalanceIcon balance={balance} />
                            <DeleteMember board={board} member={member} />
                        </Box>
                    </Group>
                    <TextInput
                        label="Nome"
                        value={localName}
                        onChange={handleNameChange}
                        required
                        mb="xs"
                        styles={inputStyles}
                    />
                    
                    <Group mb="xs">
                        <Text size="sm" fw={500}>Importo dovuto:</Text>
                        <Badge 
                            color="blue" 
                            variant="light"
                            styles={{ root: { padding: '6px 10px' } }}
                        >
                            {formatPrice(debit)}
                        </Badge>
                    </Group>
                    
                    <Group mb="xs">
                        <Text size="sm" fw={500}>Saldo:</Text>
                        <Badge 
                            color={balance < 0 ? 'red' : (balance > 0 ? 'orange' : 'green')} 
                            variant="light"
                            styles={{ root: { padding: '6px 10px' } }}
                        >
                            {formatPrice(balance)}
                        </Badge>
                    </Group>
                    
                    <Group align="center">
                        <Text size="sm" fw={500}>Ha pagato:</Text>
                        <AdvancedNumberInput
                            placeholder="0,00"
                            type="text"
                            value={formatPrice(paid)}
                            onChange={handlePaidChange}
                            style={{ width: 120 }}
                            styles={inputStyles}
                        />
                    </Group>
                </Paper>
            )}
        </Transition>
    );
});
