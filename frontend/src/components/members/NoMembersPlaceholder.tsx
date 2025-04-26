import { Box, Text, Space, Button } from "@mantine/core";
import { memo } from "react";
import { IconUsersGroup } from "@tabler/icons-react";

export interface NoMembersPlaceholderProps {
    onAddClick: () => void;
}

export const NoMembersPlaceholder = memo(({ onAddClick }:NoMembersPlaceholderProps) => (
    <Box className="center-flex-col" p="xl">
        <IconUsersGroup size={40} style={{ opacity: 0.5, marginBottom: 15 }} />
        <Text size="lg" fw={500} c="dimmed" ta="center">
            Nessun membro disponibile
        </Text>
        <Space h="md" />
        <Button
            variant="light"
            leftSection={<IconUsersGroup size={16} />}
            onClick={onAddClick}
        >
            Aggiungi il primo membro
        </Button>
    </Box>
));
