import { Box, Button } from "@mantine/core"
import { IconCircleCheck, IconRestore } from "@tabler/icons-react";

export interface BottomEditControlProps {
    resetEdits: () => void;
    handleSaveChanges: () => void;
}

export const BottomEditControl = ({ resetEdits, handleSaveChanges }: BottomEditControlProps) => {
    return <Box
        style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--primary-border)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            gap: '12px'
        }}
    >
        <Button
            onClick={resetEdits}
            variant="outline"
            color="gray"
            radius="md"
            style={{ width: '30%' }}
            leftSection={<IconRestore size={16} />}
        >
            Annulla modifiche
        </Button>
        <Button
            onClick={handleSaveChanges}
            variant="gradient"
            gradient={{ from: '#7a84ff', to: '#9ba3ff' }}
            radius="md"
            style={{ width: '60%' }}
            leftSection={<IconCircleCheck size={16} />}
        >
            Salva modifiche
        </Button>
    </Box>
}