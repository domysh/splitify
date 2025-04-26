import { boardListing, BoardPermission } from "@/utils/types";
import { Card, Text, Group, Badge, Box, Tooltip, Avatar } from "@mantine/core";
import { useNavigate } from "react-router";
import { IconUsersGroup, IconCategory, IconShoppingBag, IconLock } from "@tabler/icons-react";
import { PermissionIcon } from "@/commons/PermissionIcon";
import { getInitials } from "@/utils/formatters";

export interface BoardCardProps {
  board: boardListing;
}

export const BoardCard = ({ board }: BoardCardProps) => {
  const navigate = useNavigate();
  return <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      onClick={() => navigate(`/board/${board.id}`)}
      style={{
        cursor: "pointer",
        transition: "var(--transition-standard)",
        background: "var(--surface-dark)",
        backdropFilter: "var(--backdrop-blur)",
        border: "1px solid var(--primary-border)",
        position: "relative",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      className="board-card"
    >
      
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background:
            board.permission !== BoardPermission.OWNER
              ? "linear-gradient(90deg, var(--success), var(--primary-light))"
              : "linear-gradient(90deg, var(--primary), var(--primary-light))",
          borderRadius: "4px 4px 0 0",
        }}
      />

      
      <Group justify="space-between" mb="md" style={{ marginTop: "5px" }}>
        <Text
          size="xl"
          fw={800}
          style={{
            color: "#f0f0ff",
            textShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          {board.name}
        </Text>

        <Group gap={8}>
          
          <PermissionIcon permission={board.permission} />

          {!board.isPublic && (
            <Tooltip label="Board privata">
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
                <IconLock size={14} color="#ffa94d" />
              </Box>
            </Tooltip>
          )}
        </Group>
      </Group>

      {board.permission !== BoardPermission.OWNER && (
        <Box
          mb="sm"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(100, 150, 255, 0.08)",
            padding: "8px 12px",
            borderRadius: "6px",
          }}
        >
          <Avatar size="xs" radius="xl" color="blue">
            {getInitials(board.creator.username)}
          </Avatar>
          <Text size="sm" c="dimmed">
            Creata da{" "}
            <Text span fw={500} c="blue.3">
              {board.creator.username}
            </Text>
          </Text>
        </Box>
      )}

      
      {board.categories && board.categories.length > 0 && (
        <Box mb="auto" style={{ marginBottom: "15px" }}>
          <Text size="xs" c="dimmed" mb={8} fw={500}>
            Categorie
          </Text>
          <Group gap={6}>
            {board.categories.slice(0, 3).map((cat) => (
              <Badge
                key={cat.id}
                size="sm"
                variant="light"
                radius="md"
                color="indigo"
                style={{
                  textTransform: "none",
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                  color: "#a5b4fc",
                }}
              >
                {cat.name}
              </Badge>
            ))}
            {board.categories.length > 3 && (
              <Badge
                size="sm"
                variant="light"
                radius="md"
                color="gray"
                style={{
                  background: "rgba(120, 120, 140, 0.15)",
                  border: "1px solid rgba(120, 120, 140, 0.25)",
                }}
              >
                +{board.categories.length - 3}
              </Badge>
            )}
          </Group>
        </Box>
      )}

      
      <Group
        mt="auto"
        gap="md"
        style={{
          paddingTop: "12px",
        }}
      >
        <Tooltip label="Membri">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(155, 163, 255, 0.08)",
              padding: "6px 10px",
              borderRadius: "20px",
            }}
          >
            <IconUsersGroup size={14} color="#9ba3ff" />
            <Text size="sm" fw={500} style={{ color: "#d1d5ff" }}>
              {board.stats.membersCount}
            </Text>
          </Box>
        </Tooltip>

        <Tooltip label="Spese">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(155, 163, 255, 0.08)",
              padding: "6px 10px",
              borderRadius: "20px",
            }}
          >
            <IconShoppingBag size={14} color="#9ba3ff" />
            <Text size="sm" fw={500} style={{ color: "#d1d5ff" }}>
              {board.stats.productsCount}
            </Text>
          </Box>
        </Tooltip>

        <Tooltip label="Categorie">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(155, 163, 255, 0.08)",
              padding: "6px 10px",
              borderRadius: "20px",
            }}
          >
            <IconCategory size={14} color="#9ba3ff" />
            <Text size="sm" fw={500} style={{ color: "#d1d5ff" }}>
              {board.stats.categoriesCount}
            </Text>
          </Box>
        </Tooltip>
      </Group>
    </Card>
};