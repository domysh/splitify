import { useCurrentUser } from "@/utils/hooks";
import { Avatar, Box, Group, Text } from "@mantine/core";
import { getInitials } from "@/utils/formatters";
import { useRouteFunctions } from "@/utils/store";

export interface UserInfoDisplayProps {};

const UserInfoDisplay = ({}:UserInfoDisplayProps) => {
  const currentUser = useCurrentUser();
  const navigate = useRouteFunctions(args => args.navigate);

  if (!currentUser || currentUser.isLoading) {
    return null;
  }

  const isAdmin = currentUser.isAdmin;
  const avatarColor = isAdmin ? "violet" : "blue";
  
  return <Group gap={8} style={{ cursor: 'pointer' }} mx="sm" onClick={() => navigate("/profile")}>
    <Avatar 
      color={avatarColor} 
      radius="xl" 
      size="sm"
    >
      {getInitials(currentUser.username)}
    </Avatar>
    <Box>
      <Text size="sm" fw={500} lh={1.2} style={{ color: 'var(--text-bright)' }}>
        {currentUser.username}
      </Text>
    </Box>
  </Group>
};

export default UserInfoDisplay;