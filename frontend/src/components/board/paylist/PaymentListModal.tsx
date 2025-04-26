import { useCalculatePaylist } from "@/utils/hooks";
import { Modal, Text, List, Group, Box, Title, Paper, Space, Divider, Avatar, Loader, Badge } from "@mantine/core";
import { IconCircleCheck, IconAlertTriangle, IconCash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { board } from "@/utils/types";
import { YesOrNoModal } from "@/commons/YesOrNoModal";
import { postRequest } from "@/utils/net";
import { modalOverlayOptions, modalStyles } from "@/styles/commonStyles";
import { PaymentItem } from "./PaymentItem";
import { ConfirmationPaymentModalContent } from "./ConfirmationPaymentModalContent";
import { formatPrice } from "@/utils/formatters";

interface PaymentListModalProps {
  board: board;
  open: boolean;
  onClose: () => void;
}

const LoadingState = () => (
  <Box py="xl" className="center-flex-col">
    <Loader size="md" color="blue" variant="dots" />
    <Text ta="center" mt="md" size="md">
      Calcolo dei pagamenti in corso...
    </Text>
    <Text size="sm" mt="xs">
      Questa operazione potrebbe richiedere qualche secondo per gruppi numerosi
    </Text>
  </Box>
);

const ErrorState = ({ status, balance, what }: { status: string; balance?: number; what?: string }) => {
  
  let errorMessage = "";
  let suggestion = "";

  switch (what) {
    case "no-board":
      errorMessage = "Board non disponibile.";
      suggestion = "Aggiorna la pagina o controlla la connessione.";
      break;
    case "no-members":
      errorMessage = "Non ci sono membri in questa board.";
      suggestion = "Aggiungi dei membri prima di calcolare i pagamenti.";
      break;
    case "phantom-category":
      errorMessage = "C'è una categoria usata dalle spese ma non dai membri.";
      suggestion = "Assicurati che ogni categoria utilizzata dalle spese sia assegnata ad almeno un membro.";
      break;
    case "unbalanced":
      errorMessage = `La board non è bilanciata! C'è uno sbilanciamento di ${formatPrice(balance??0)}.`;
      suggestion = "Verifica che tutti i pagamenti siano stati registrati correttamente e che non ci siano errori di calcolo.";
      break;
    default:
      errorMessage = status === "unbalanced" 
        ? `La board non è bilanciata! C'è uno sbilanciamento di ${formatPrice(balance??0)}.`
        : "Si è verificato un problema nel calcolo dei pagamenti.";
      suggestion = "Verifica che tutti i membri abbiano categorie assegnate e che la somma dei pagamenti sia corretta.";
  }

  return (
    <Paper p="lg" radius="md" style={{ background: "rgba(255, 80, 80, 0.1)", border: "1px solid rgba(255, 100, 100, 0.3)" }}>
      <Group gap="md" align="flex-start">
        <Avatar color="red" radius="xl">
          <IconAlertTriangle size={24} />
        </Avatar>
        <Box>
          <Text fw={600} size="lg" c="red.3">
            Problema nel calcolo dei pagamenti
          </Text>
          <Text size="md" mt={4} c="red.2">
            {errorMessage}
          </Text>
          <Space h="xs" />
          <Divider />
          <Text size="sm" mt="xs" c="gray.5">
            Suggerimento: {suggestion}
          </Text>
        </Box>
      </Group>
    </Paper>
  );
};


const EmptyState = () => (
  <Box py="lg" ta="center">
    <Avatar size="xl" radius="xl" color="green" mx="auto" mb="md">
      <IconCircleCheck size={36} />
    </Avatar>
    <Title order={2} style={{ color: '#f0f0ff' }} mb="sm">
      Tutti i conti sono in ordine!
    </Title>
    <Text c="dimmed" size="lg" mt={8} maw={500} mx="auto">
      Non ci sono pagamenti da effettuare in questo momento. Tutti i membri hanno saldato il loro debito.
    </Text>
  </Box>
);


const PaymentHeader = ({ paymentCount }: { paymentCount: number }) => (
  <Paper p="lg" radius="md" mb="xl" withBorder style={{ background: "rgba(155, 163, 255, 0.05)" }}>
    <Group gap="md" align="flex-start">
      <Avatar color="blue" radius="xl" size="lg">
        <IconCash size={28} />
      </Avatar>
      <Box>
        <Text fw={700} size="lg" mb="xs" style={{ color: '#e0e0ff' }}>
          Pagamenti ottimizzati
        </Text>
        <Text c="dimmed" size="md">
          Ecco i pagamenti consigliati per saldare i conti in modo ottimale.
        </Text>
        <Badge mt="md" color="blue" variant="light" size="lg">
          {paymentCount} trasferimenti consigliati
        </Badge>
      </Box>
    </Group>
  </Paper>
);


export const PaymentListModal = ({ board, open, onClose }: PaymentListModalProps) => {
  const paylist = useCalculatePaylist(board);
  const [processing, setProcessing] = useState<number | null>(null);
  const [confirmPayment, setConfirmPayment] = useState<{index: number, fromName: string, toName: string, amount: number} | null>(null);

  const handleExecutePayment = async (paymentIndex: number) => {
    if (!paylist || paylist.status !== "ok" || !paylist.payments[paymentIndex]) return;
    
    const payment = paylist.payments[paymentIndex];
    setProcessing(paymentIndex);
    
    try {      
      
      await postRequest(`transactions/${board.id}`, {
        body: {
          fromMemberId: payment.from,
          toMemberId: payment.to,
          amount: payment.price,
          description: `Pagamento consigliato dal sistema`
        }
      });
      
      notifications.show({
        title: "Pagamento eseguito",
        message: `Trasferimento di ${formatPrice(payment.price)} da ${getFriendlyName(payment.from)} a ${getFriendlyName(payment.to)} completato`,
        color: "green",
        icon: <IconCircleCheck size={18} />
      });
    } catch (error) {
      console.error("Error executing payment:", error);
      notifications.show({
        title: "Errore",
        message: "Si è verificato un errore durante l'esecuzione del pagamento",
        color: "red"
      });
    } finally {
      setProcessing(null);
    }
  };

  
  const getFriendlyName = (memberId: string) => {
    const member = board.members.find(m => m.id === memberId);
    return member ? member.name : memberId;
  };

  const handlePaymentClick = (index: number, fromName: string, toName: string, amount: number) => {
    setConfirmPayment({ index, fromName, toName, amount });
  };

  return (
    <>
      <Modal
        opened={open}
        onClose={onClose}
        closeOnClickOutside={false}
        title={
          <Group gap="xs">
            <IconCash style={{ color: "#9ba3ff" }} />
            <Title order={3} style={{ color: "#f0f0ff" }} size='h3'>
              Pagamenti consigliati
            </Title>
          </Group>
        }
        size='95%'
        padding='sm'
        radius="md"
        centered
        overlayProps={modalOverlayOptions}
        styles={modalStyles}
      >
        <Space h="md" />
        {!paylist || paylist.status === "loading" ? (
          <LoadingState />
        ) : paylist.status !== "ok" ? (
          <ErrorState status={paylist.status} balance={paylist.balance} what={paylist.what} />
        ) : paylist.payments.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <PaymentHeader paymentCount={paylist.payments.length} />
            
            <List spacing="lg" mt="lg">
              {paylist.payments.map((payment, index) => {
                const fromName = getFriendlyName(payment.from);
                const toName = getFriendlyName(payment.to);
                
                return (
                  <PaymentItem
                    key={index}
                    payment={payment}
                    index={index}
                    fromName={fromName}
                    toName={toName}
                    processing={processing}
                    onPaymentClick={handlePaymentClick}
                  />
                );
              })}
            </List>
          </>
        )}
      </Modal>

      {confirmPayment && (
        <YesOrNoModal
          open={!!confirmPayment}
          onClose={() => setConfirmPayment(null)}
          onConfirm={() => {
            handleExecutePayment(confirmPayment.index);
            setConfirmPayment(null);
          }}
          title="Conferma trasferimento"
          message={
            <ConfirmationPaymentModalContent
              confirmPayment={confirmPayment}
            />
          }
          confirmText="Conferma trasferimento"
          confirmColor="teal"
        />
      )}
    </>
  );
};
