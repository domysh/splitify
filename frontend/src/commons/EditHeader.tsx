import { Box, Space, Text } from "@mantine/core";
import { AddButton, CancelButton, EditButton } from "./Buttons";
import { IconRefresh } from "@tabler/icons-react";
import { useSmallScreen } from "@/utils/hooks";

export interface EditHeaderProps {
    addAction?: () => void;
    cancelAction: () => void;
    editAction: () => void;
    title: string;
    disableCancel?: boolean;
    disableEdit?: boolean;
    disableAdd?: boolean;
    loading?: boolean;
}

export const EditHeader = ({
    addAction,
    editAction,
    cancelAction,
    title,
    disableAdd,
    disableCancel,
    disableEdit,
    loading,
}: EditHeaderProps) => {
    const isSmallScreen = useSmallScreen();
    return (
        <Box
            className={isSmallScreen ? "center-flex-col" : "center-flex"}
            style={{ flexWrap: "wrap", gap: 15 }}
            mt={isSmallScreen ? "lg" : undefined}
        >
            <Text size={isSmallScreen ? "1.7rem" : "lg"} fw={600} c="#e0e0ff">
                {title}
            </Text>
            {!isSmallScreen ? <Box style={{ flexGrow: 1 }} /> : <Space h={1} />}
            <Box className="center-flex" style={{ flexWrap: "wrap", gap: 15 }}>
                <CancelButton
                    leftSection={<IconRefresh size={16} />}
                    onClick={cancelAction}
                    disabled={disableCancel || loading}
                >
                    Annulla
                </CancelButton>
                <EditButton
                    onClick={editAction}
                    disabled={disableEdit}
                    loading={loading}
                />
                <AddButton
                    onClick={addAction}
                    disabled={disableAdd}
                    loading={loading}
                />
            </Box>
        </Box>
    );
};
