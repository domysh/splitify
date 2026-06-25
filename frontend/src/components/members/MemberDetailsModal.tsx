import { useEffect, useMemo, useState } from "react";
import { board, transaction } from "@/utils/types";
import { Modal, Group, Text, Paper, Stack, ScrollArea, Timeline, Grid, Card, ThemeIcon, Badge, Box } from "@mantine/core";
import {
  IconUser,
  IconReceipt,
  IconCreditCard,
  IconShoppingCart,
  IconArrowRight,
  IconArrowLeft,
  IconCashOff,
  IconScale
} from "@tabler/icons-react";
import { transactionsQuery } from "@/utils/queries";
import { Space } from "@mantine/core";
import { modalOverlayOptions, modalStyles } from "@/styles/commonStyles";
import { formatPrice, formatDate } from "@/utils/formatters";
import { ResponsivePager } from "@/commons/ResponsivePager";
import { calculateDebits } from "@/utils";

const ITEMS_PER_PAGE = 10;

export interface MemberDetailsModalProps {
  board: board;
  memberId: string | null;
  open: boolean;
  onClose: () => void;
}

const getTransactionIcon = (transaction: transaction) => {
  if (transaction.productId) return <IconShoppingCart size={20} />
  if (transaction.fromMemberId === null && transaction.toMemberId !== null) return <IconCreditCard size={20} />
  if (transaction.fromMemberId !== null && transaction.toMemberId === null) return <IconCashOff size={20} />
  if (transaction.fromMemberId !== null && transaction.toMemberId !== null) return <IconArrowRight size={20} />
  return <IconReceipt size={20} />;
};

const getTransactionColor = (transaction: transaction) => {
  if (transaction.productId) return "blue";
  if (transaction.fromMemberId === null && transaction.toMemberId !== null) return "green"
  if (transaction.fromMemberId !== null && transaction.toMemberId === null) return "red";
  if (transaction.fromMemberId !== null && transaction.toMemberId !== null) return "violet";
  return "gray";
};

export const MemberDetailsModal = ({ board, memberId, open, onClose }: MemberDetailsModalProps) => {
  const transactionsQuery_ = transactionsQuery(board.id);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!open) setCurrentPage(1);
  }, [open]);

  const member = useMemo(() => {
    if (!memberId) return null;
    return board.members.find(m => m.id === memberId) || null;
  }, [board.members, memberId]);

  const debits = useMemo(() => calculateDebits(board), [board]);
  
  const memberDebit = useMemo(() => {
    if (!memberId) return null;
    return debits.find(d => d.id === memberId) || null;
  }, [debits, memberId]);

  const allTransactions = transactionsQuery_.data || [];
  
  const memberTransactions = useMemo(() => {
    if (!memberId) return [];
    return allTransactions.filter(t => 
      t.fromMemberId === memberId || t.toMemberId === memberId
    );
  }, [allTransactions, memberId]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return memberTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [memberTransactions, currentPage]);

  const totalPages = useMemo(() =>
    Math.max(1, Math.ceil(memberTransactions.length / ITEMS_PER_PAGE)),
    [memberTransactions.length]
  );

  const { totalReimbursedPaid, totalReimbursedReceived } = useMemo(() => {
    let rPaid = 0;
    let rReceived = 0;
    
    if (!memberId) return { totalReimbursedPaid: 0, totalReimbursedReceived: 0 };
    
    memberTransactions.forEach(t => {
      if (t.cancelled) return;
      if (!t.productId) {
        if (t.fromMemberId === memberId) rPaid += t.amount;
        if (t.toMemberId === memberId) rReceived += t.amount;
      }
    });
    
    return { totalReimbursedPaid: rPaid, totalReimbursedReceived: rReceived };
  }, [memberTransactions, memberId]);

  const debitAmount = memberDebit ? memberDebit.price : 0;
  const totalPaidExpenses = (member?.paid || 0) - totalReimbursedPaid + totalReimbursedReceived;
  const balance = (member?.paid || 0) - debitAmount;

  if (!memberId || !member) return null;

  const getMemberName = (id: string | null) => {
    if (!id) return "Nessuno";
    const m = board.members.find(m => m.id === id);
    return m ? m.name : "Membro sconosciuto";
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return null;
    const product = board.products.find(p => p.id === productId);
    return product ? product.name : "Spesa sconosciuto";
  };

  const getProductTransactionDescription = (transaction: transaction) => {
    const productName = getProductName(transaction.productId ?? null) || "spesa";
    if (transaction.fromMemberId) {
      return `${getMemberName(transaction.fromMemberId)} ha pagato per ${productName}`;
    }
    return transaction.description;
  };

  const getTransactionDirection = (transaction: transaction) => {
    if (transaction.productId) return null;
    const fromName = transaction.fromMemberId ? getMemberName(transaction.fromMemberId) : null;
    const toName = transaction.toMemberId ? getMemberName(transaction.toMemberId) : null;
    
    if (fromName && toName) return `Da ${fromName} a ${toName}`;
    if (fromName) return `Pagato da ${fromName}`;
    if (toName) return `Pagato a ${toName}`;
    return null;
  };

  const getTransactionCashflow = (transaction: transaction) => {
    if (transaction.toMemberId === memberId) {
      return { color: "green", prefix: "+" };
    }
    if (transaction.fromMemberId === memberId) {
      return { color: "red", prefix: "-" };
    }
    return { color: "gray", prefix: "" };
  };

  return (
    <Modal
      opened={open}
      onClose={onClose}
      closeOnClickOutside={false}
      title={
        <Group gap="xs">
          <IconUser style={{ color: "#9ba3ff" }} />
          <Text fw={700} size="lg" style={{ color: "#f0f0ff" }}>
            Dettagli Membro: {member.name}
          </Text>
        </Group>
      }
      size="xl"
      padding="md"
      radius="md"
      centered
      overlayProps={modalOverlayOptions}
      styles={modalStyles}
    >
      <Space h="md" />

      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md" p="md" style={{ background: "rgba(30, 30, 40, 0.7)", borderColor: "var(--primary-border)", height: '100%' }}>
            <Group justify="space-between" wrap="nowrap" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" truncate="end">Spese Pagate</Text>
              <ThemeIcon color="blue" variant="light" size="sm" style={{ flexShrink: 0 }}><IconShoppingCart size={14} /></ThemeIcon>
            </Group>
            <Text size="xl" fw={700} truncate="end">{formatPrice(totalPaidExpenses)}</Text>
          </Card>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md" p="md" style={{ background: "rgba(30, 30, 40, 0.7)", borderColor: "var(--primary-border)", height: '100%' }}>
            <Group justify="space-between" wrap="nowrap" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" truncate="end">Quota Dovuta</Text>
              <ThemeIcon color="red" variant="light" size="sm" style={{ flexShrink: 0 }}><IconCashOff size={14} /></ThemeIcon>
            </Group>
            <Text size="xl" fw={700} truncate="end">{formatPrice(debitAmount)}</Text>
          </Card>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md" p="md" style={{ background: "rgba(30, 30, 40, 0.7)", borderColor: "var(--primary-border)", height: '100%' }}>
            <Group justify="space-between" wrap="nowrap" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" truncate="end">Denaro Inviato</Text>
              <ThemeIcon color="violet" variant="light" size="sm" style={{ flexShrink: 0 }}><IconArrowRight size={14} /></ThemeIcon>
            </Group>
            <Text size="xl" fw={700} truncate="end">{formatPrice(totalReimbursedPaid)}</Text>
          </Card>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card withBorder radius="md" p="md" style={{ background: "rgba(30, 30, 40, 0.7)", borderColor: "var(--primary-border)", height: '100%' }}>
            <Group justify="space-between" wrap="nowrap" mb="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" truncate="end">Denaro Ricevuto</Text>
              <ThemeIcon color="orange" variant="light" size="sm" style={{ flexShrink: 0 }}><IconArrowLeft size={14} /></ThemeIcon>
            </Group>
            <Text size="xl" fw={700} truncate="end">{formatPrice(totalReimbursedReceived)}</Text>
          </Card>
        </Grid.Col>
        
        <Grid.Col span={12}>
          <Card withBorder radius="md" p="lg" style={{ background: "rgba(30, 30, 40, 0.9)", borderColor: "var(--primary-border)" }}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon color="teal" variant="light" size="xl" radius="md" style={{ flexShrink: 0 }}>
                  <IconScale size={24} />
                </ThemeIcon>
                <Box style={{ flexShrink: 1, minWidth: 0 }}>
                  <Text size="sm" c="dimmed" fw={600} tt="uppercase" truncate="end">Bilancio Attuale</Text>
                  {balance < 0 && <Text size="xs" c="dimmed" truncate="end">Deve ancora pagare</Text>}
                  {balance > 0 && <Text size="xs" c="dimmed" truncate="end">Deve ricevere</Text>}
                  {balance === 0 && <Text size="xs" c="dimmed" truncate="end">In pari</Text>}
                </Box>
              </Group>
              <Text size="h2" fw={800} c={balance > 0 ? "green.4" : balance < 0 ? "red.4" : "gray"} style={{ flexShrink: 0, fontSize: "clamp(1.2rem, 4vw, 1.8rem)" }}>
                {balance > 0 ? "+" : ""}{formatPrice(balance)}
              </Text>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Text fw={600} size="md" mb="md" style={{ color: "#e0e0ff" }}>
        Cronologia Transazioni
      </Text>

      {memberTransactions.length === 0 ? (
        <Paper p="lg" radius="md" style={{ background: "rgba(155, 163, 255, 0.05)" }}>
          <Text ta="center" c="dimmed" size="sm">
            Nessuna transazione per questo membro.
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          <ScrollArea h={350} offsetScrollbars>
            <Timeline active={paginatedTransactions.length} bulletSize={24} lineWidth={2}>
              {paginatedTransactions.map((transaction) => {
                const transactionColor = getTransactionColor(transaction);
                const cashflow = getTransactionCashflow(transaction);
                return (
                  <Timeline.Item
                    key={transaction.id}
                    bullet={getTransactionIcon(transaction)}
                    title={
                      <Group gap="xs">
                        <Box>
                          <Text fw={600} size="md">
                            {transaction.productId
                              ? getProductTransactionDescription(transaction)
                              : transaction.description || "Transazione"}
                          </Text>
                          {getTransactionDirection(transaction) && (
                            <Text size="xs" c="dimmed">
                              {getTransactionDirection(transaction)}
                            </Text>
                          )}
                        </Box>
                        <Badge size="sm" color={cashflow.color} variant="light">
                          {cashflow.prefix} {formatPrice(transaction.amount)}
                        </Badge>
                        {transaction.cancelled && <Badge size="sm" color="gray" variant="outline">ANNULLATO</Badge>}
                      </Group>
                    }
                    color={transactionColor}
                  >
                    <Text size="sm" c="dimmed">
                      {formatDate(transaction.timestamp)}
                    </Text>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </ScrollArea>
          
          {memberTransactions.length > ITEMS_PER_PAGE &&
            <ResponsivePager
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          }
        </Stack>
      )}
    </Modal>
  );
};
