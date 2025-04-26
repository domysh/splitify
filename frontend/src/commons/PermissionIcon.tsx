import { BoardPermission } from "@/utils/types";
import { Box, Tooltip } from "@mantine/core";
import { IconCrown, IconEdit, IconEye } from "@tabler/icons-react";

export interface PermissionIconProps {
    permission?: BoardPermission;
}

export const PermissionIcon = ({ permission }: PermissionIconProps) => {
    if (!permission) return null;
  
    switch (permission) {
      case BoardPermission.OWNER:
        return (
          <Tooltip label="Sei il proprietario">
            <Box
              style={{
                background: "rgba(255, 169, 77, 0.15)",
                borderRadius: "50%",
                padding: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconCrown size={14} color="#ffa94d" stroke={1.5} />
            </Box>
          </Tooltip>
        );
      case BoardPermission.EDITOR:
        return (
          <Tooltip label="Hai permesso di modifica">
            <Box
              style={{
                background: "rgba(100, 200, 150, 0.15)",
                borderRadius: "50%",
                padding: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconEdit size={14} color="#64c896" stroke={1.5} />
            </Box>
          </Tooltip>
        );
      case BoardPermission.VIEWER:
        return (
          <Tooltip label="Hai permesso di visualizzazione">
            <Box
              style={{
                background: "rgba(100, 150, 255, 0.15)",
                borderRadius: "50%",
                padding: "5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconEye size={14} color="#6496ff" stroke={1.5} />
            </Box>
          </Tooltip>
        );
      default:
        return null;
    }
  };