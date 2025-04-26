import { formatPrice, getInitials, hashColor } from "@/utils/formatters"
import { Avatar, Badge, Box, Group, Paper, Text } from "@mantine/core"
import { IconArrowRight } from "@tabler/icons-react"

export interface ConfirmationPaymentModalContentProps {
    confirmPayment: {index: number, fromName: string, toName: string, amount: number}
}

export const ConfirmationPaymentModalContent = (
    { confirmPayment }:ConfirmationPaymentModalContentProps
) => (
  <Box ta="center">
    <Text size='lg' mb={{ base: 'sm', sm: 'lg' }}>
      Sei sicuro di voler eseguire questo trasferimento?
    </Text>
    <Paper p={{ base: 'md', sm: 'lg' }} radius="md" withBorder style={{ background: "rgba(155, 163, 255, 0.05)" }}>
      <Group 
        justify="center" 
        align="center" 
        gap='sm'
        style={{ textAlign: 'center' }}
        wrap="wrap"
      >
        <Box>
          <Avatar
            color={hashColor(confirmPayment.fromName)} 
            radius="xl"
            size='lg'
            mb={8}
            mx="auto"
          >
            {getInitials(confirmPayment.fromName)}
          </Avatar>
          <Text fw={600} size='sm'>{confirmPayment.fromName}</Text>
        </Box>
        
        <Box style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          margin: '0 8px' 
        }}>
          <IconArrowRight size={24} color="#9ba3ff" style={{ margin: '8px 0' }} />
          <Badge
            size='lg'
            variant="filled" 
            color="indigo"
            mt={5}
            styles={{
              root: {
                padding: '8px 14px',
                fontWeight: 700
              }
            }}
          >
            {formatPrice(confirmPayment.amount)}
          </Badge>
        </Box>
        
        <Box>
          <Avatar 
            color={hashColor(confirmPayment.toName)} 
            radius="xl"
            size='lg'
            mb={8}
            mx="auto"
          >
            {getInitials(confirmPayment.toName)}
          </Avatar>
          <Text fw={600} size='sm'>{confirmPayment.toName}</Text>
        </Box>
      </Group>
    </Paper>
    <Text size='sm' c="dimmed" mt={{ base: 'sm', sm: 'lg' }}>
      Questo aggiusterà automaticamente i saldi di entrambi i membri.
      <br />
      L'operazione non può essere annullata.
    </Text>
  </Box>
)