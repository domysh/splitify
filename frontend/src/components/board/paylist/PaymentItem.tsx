import { formatPrice, getInitials, hashColor } from "@/utils/formatters";
import { useCurrentUser } from "@/utils/hooks";
import { Avatar, Badge, Box, Button, Group, Paper, Text } from "@mantine/core";
import { IconArrowRight, IconExchange } from "@tabler/icons-react";

export interface PaymentItemProps {
    payment: any;
    index: number;
    fromName: string;
    toName: string;
    processing: number | null;
    onPaymentClick: (index: number, fromName: string, toName: string, amount: number) => void;
}

export const PaymentItem = (
    { 
        payment, index, fromName, toName, 
        processing, onPaymentClick
    }: PaymentItemProps
) => {
  const currentUser = useCurrentUser();
  return <Paper
    key={index}
    p={{ base: 'xs', sm: 'md' }}
    mb="md"
    radius="md" 
    withBorder
    className="transparency-on-hover"
    style={{
      background: "rgba(30, 32, 58, 0.5)",
      border: "1px solid rgba(155, 163, 255, 0.2)",
      transition: "all 0.2s ease"
    }}
  >
    <Group
      justify="space-between" 
      align="center" 
      wrap="wrap"
      gap='xs'
    >
      <Group 
        gap='xs'
        wrap="wrap"
      >
        <Group gap="xs" wrap="nowrap">
          <Avatar
            color={hashColor(fromName)} 
            radius="xl"
            size='md'
          >
            {getInitials(fromName)}
          </Avatar>
          <Box>
            <Text fw={500} size='sm'>Da</Text>
            <Text fw={600} size='md' lineClamp={1}>{fromName}</Text>
          </Box>
        </Group>
        
        <IconArrowRight
          size={18} 
          color="#9ba3ff" 
          style={{ opacity: 0.7, margin: '0 4px' }} 
        />
        
        <Group gap="xs" wrap="nowrap">
          <Avatar 
            color={hashColor(toName)} 
            radius="xl"
            size='md'
          >
            {getInitials(toName)}
          </Avatar>
          <Box>
            <Text fw={500} size='sm'>A</Text>
            <Text fw={600} size='md' lineClamp={1}>{toName}</Text>
          </Box>
        </Group>
      </Group>
      
      <Group 
        gap="xs"
        wrap="nowrap"
        ml={{ base: 'auto', xs: 0 }}
        mt={{ base: currentUser ? 'xs' : 0, xs: 0 }}
        w={{ base: currentUser ? '100%' : 'auto', xs: 'auto' }}
        style={{ 
          justifyContent: currentUser && window.innerWidth < 576 ? 'space-between' : 'flex-end'
        }}
      >
        <Badge
          size="lg"
          variant="filled" 
          color="indigo"
          styles={{
            root: {
              padding: '8px 14px',
              fontWeight: 700,
              minWidth: '80px',
              textAlign: 'center'
            }
          }}
        >
          {formatPrice(payment.price)}
        </Badge>
        
        {currentUser && (
          <Button
            variant="subtle"
            size="sm"
            color="teal"
            loading={processing === index}
            onClick={() => onPaymentClick(
              index,
              fromName,
              toName,
              payment.price
            )}
            leftSection={<IconExchange size={16} />}
            styles={{
              root: {
                minWidth: '90px'
              }
            }}
          >
            Esegui
          </Button>
        )}
      </Group>
    </Group>
  </Paper>
};