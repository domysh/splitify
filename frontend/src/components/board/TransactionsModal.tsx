import { useEffect, useMemo, useState } from "react";
import { board, transaction } from "@/utils/types";
import { Modal, Group, Text, Box, Paper, Badge, Avatar, Loader, Stack, ScrollArea, Timeline, ActionIcon, Tooltip } from "@mantine/core";
import {
  IconReceipt,
  IconCreditCard,
  IconShoppingCart,
  IconArrowRight,
  IconCashOff,
  IconUser,
  IconUserOff,
  IconInfoCircle,
  IconRestore,
  IconTrash,
} from "@tabler/icons-react";
import { transactionsQuery } from "@/utils/queries";
import { Space } from "@mantine/core";
import { usePermissions } from "@/utils/hooks";
import { modalOverlayOptions, modalStyles } from "@/styles/commonStyles";
import { formatDate, formatPrice } from "@/utils/formatters";
import { ResponsivePager } from "@/commons/ResponsivePager";
import { postRequest } from "@/utils/net";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";


const ITEMS_PER_PAGE = 10;

export interface TransactionsModalProps {
  board: board;
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

export const TransactionsModal = ({ board, open, onClose }: TransactionsModalProps) => {
  const transactionsQuery_ = transactionsQuery(board.id);
  const [currentPage, setCurrentPage] = useState(1);
  const { canEdit } = usePermissions(board);

  useEffect(() => {
    if (open) return
    setCurrentPage(1);
  }, [open]);

  const transactions = transactionsQuery_.data || [];

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [transactions, currentPage]);

  const totalPages = useMemo(() =>
    Math.max(1, Math.ceil(transactions.length / ITEMS_PER_PAGE)),
    [transactions.length]
  );

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return "Nessuno";
    const member = board.members.find(m => m.id === memberId);
    return member ? member.name : "Membro sconosciuto";
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return null;
    const product = board.products.find(p => p.id === productId);
    return product ? product.name : "Spesa sconosciuto";
  };

  const getProductPrice = (productId: string | null) => {
    if (!productId) return 0;
    const product = board.products.find(p => p.id === productId);
    return product ? product.price : 0;
  };

  const getProductTransactionDescription = (transaction: transaction) => {
    const productName = getProductName(transaction.productId ?? null) || "spesa";

    if (transaction.fromMemberId) {
      return `${getMemberName(transaction.fromMemberId)} ha pagato per ${productName}`;
    } else if (transaction.toMemberId) {
      return `${getMemberName(transaction.toMemberId)} ha ricevuto ${productName}`;
    }

    return transaction.description;
  };

  const handleCancelTransaction = (transaction: transaction) => {
    modals.openConfirmModal({
      title: 'Annulla transazione',
      centered: true,
      children: (
        <Text size="sm">
          Sei sicuro di voler annullare questa transazione?
          Questa azione invertirà i movimenti di denaro e non può essere annullata.
        </Text>
      ),
      labels: { confirm: 'Annulla transazione', cancel: 'Chiudi' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        const res = await postRequest(`/transactions/${board.id}/${transaction.id}/cancel`, {});
        if (res.status === 'ok') {
          notifications.show({
            title: 'Transazione annullata',
            message: 'La transazione è stata annullata con successo',
            color: 'green'
          });
          transactionsQuery_.refetch();
        } else {
          notifications.show({
            title: 'Errore',
            message: 'Impossibile annullare la transazione',
            color: 'red'
          });
        }
      }
    });
  };

  return (
    <>
      <Modal
        opened={open}
        onClose={onClose}
        closeOnClickOutside={false}
        title={
          <Group gap="xs">
            <IconRestore style={{ color: "#9ba3ff" }} />
            <Text fw={700} size="lg" style={{ color: "#f0f0ff" }}>
              Registro delle transazioni
            </Text>
          </Group>
        }
        size="lg"
        padding="md"
        radius="md"
        centered
        overlayProps={modalOverlayOptions}
        styles={modalStyles}
      >
        <Space h="md" />
        {transactionsQuery_.isLoading ? (
          <Box py="xl" className="center-flex-col">
            <Loader size="md" color="blue" variant="dots" />
            <Text c="dimmed" ta="center" mt="md" size="md">
              Caricamento delle transazioni...
            </Text>
          </Box>
        ) : transactions.length === 0 ? (
          <Paper p="lg" radius="md" style={{ background: "rgba(155, 163, 255, 0.05)" }}>
            <Group gap="md" align="flex-start">
              <Avatar color="blue" radius="xl" size="md">
                <IconInfoCircle size={20} />
              </Avatar>
              <Box>
                <Text fw={600} size="md" style={{ color: '#e0e0ff' }}>
                  Nessuna transazione registrata
                </Text>
                <Text c="dimmed" size="sm" mt={8}>
                  Non sono state ancora registrate transazioni per questa board.
                  {canEdit && " Usa il pannello 'Trasferisci denaro' per creare la prima."}
                </Text>
              </Box>
            </Group>
          </Paper>
        ) : (
          <Stack gap="md">
            <ScrollArea h={400} offsetScrollbars>
              <Timeline active={paginatedTransactions.length} bulletSize={24} lineWidth={2}>
                {paginatedTransactions.map((transaction) => {
                  const fromName = getMemberName(transaction.fromMemberId);
                  const toName = getMemberName(transaction.toMemberId);
                  const transactionColor = getTransactionColor(transaction);

                  return (
                    <Timeline.Item
                      key={transaction.id}
                      bullet={getTransactionIcon(transaction)}
                      title={
                        <Group gap="xs">
                          <Text fw={600} size="md">
                            {transaction.productId
                              ? getProductTransactionDescription(transaction)
                              : transaction.description}
                          </Text>
                          <Badge
                            size="sm"
                            color={transactionColor}
                            variant="light"
                          >
                            {formatPrice(transaction.amount)}
                          </Badge>
                          {transaction.cancelled && <Badge size="sm" color="gray" variant="outline">ANNULLATO</Badge>}
                        </Group>
                      }
                      color={transactionColor}
                    >
                      <Text size="sm" c="dimmed">
                        {formatDate(transaction.timestamp)}
                      </Text>


                      {transaction.productId ? (
                        <Paper p="xs" radius="md" mt="xs" withBorder style={{
                          background: "rgba(25, 45, 80, 0.4)",
                          borderColor: "rgba(100, 140, 230, 0.25)",
                          opacity: transaction.cancelled ? 0.5 : 1,
                          textDecoration: transaction.cancelled ? 'line-through' : 'none'
                        }}>
                          <Group gap="xs" wrap="nowrap" align="center">
                            <Avatar
                              radius="xl"
                              size="sm"
                              color="blue"
                              style={{ border: '1px solid rgba(100, 140, 230, 0.5)' }}
                            >
                              <IconShoppingCart size={14} />
                            </Avatar>

                            <Box style={{ flex: 1 }}>
                              <Group gap="xs" wrap="nowrap">
                                <Text size="sm" fw={600} c="#e0e0ff">
                                  {getProductName(transaction.productId)}
                                </Text>

                                <Badge
                                  size="sm"
                                  variant="filled"
                                  color="blue"
                                >
                                  {formatPrice(getProductPrice(transaction.productId))}
                                </Badge>
                              </Group>

                              {(transaction.fromMemberId || transaction.toMemberId) && (
                                <Group gap="xs" mt={4} wrap="nowrap">
                                  {transaction.fromMemberId ? (
                                    <>
                                      <Text size="xs" c="dimmed">Pagato da:</Text>
                                      <Text size="xs" fw={500} c="red.4">{getMemberName(transaction.fromMemberId)}</Text>
                                    </>
                                  ) : transaction.toMemberId && (
                                    <>
                                      <Text size="xs" c="dimmed">Ricevuto da:</Text>
                                      <Text size="xs" fw={500} c="green.4">{getMemberName(transaction.toMemberId)}</Text>
                                    </>
                                  )}
                                </Group>
                              )}
                            </Box>

                            {canEdit && !transaction.cancelled && (
                              <Tooltip label="Annulla transazione">
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  size="sm"
                                  onClick={() => handleCancelTransaction(transaction)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Paper>
                      ) : (
                        <Paper p="xs" radius="md" mt="xs" withBorder style={{
                          background: "rgba(30, 32, 58, 0.5)",
                          opacity: transaction.cancelled ? 0.5 : 1,
                          textDecoration: transaction.cancelled ? 'line-through' : 'none'
                        }}>
                          <Group gap="xs" wrap="nowrap" align="center">
                            {transaction.fromMemberId ? (
                              <Avatar
                                color="red"
                                radius="xl"
                                size="sm"
                              >
                                <IconUser size={14} />
                              </Avatar>
                            ) : (
                              <Avatar
                                color="gray"
                                radius="xl"
                                size="sm"
                              >
                                <IconUserOff size={14} />
                              </Avatar>
                            )}

                            <Text size="sm" fw={500}>
                              {fromName}
                            </Text>

                            <IconArrowRight size={14} style={{ opacity: 0.7 }} />

                            {transaction.toMemberId ? (
                              <Avatar
                                color="green"
                                radius="xl"
                                size="sm"
                              >
                                <IconUser size={14} />
                              </Avatar>
                            ) : (
                              <Avatar
                                color="gray"
                                radius="xl"
                                size="sm"
                              >
                                <IconUserOff size={14} />
                              </Avatar>
                            )}

                            <Text size="sm" fw={500} style={{ flex: 1 }}>
                              {toName}
                            </Text>

                            {canEdit && !transaction.cancelled && (
                              <Tooltip label="Annulla transazione">
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  size="sm"
                                  onClick={() => handleCancelTransaction(transaction)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Paper>
                      )}
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            </ScrollArea>

            {transactions.length > ITEMS_PER_PAGE &&
              <ResponsivePager
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
              />}
          </Stack>
        )}
      </Modal>
    </>
  );
};
