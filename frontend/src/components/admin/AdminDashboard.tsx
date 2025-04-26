import { Title, Text, SimpleGrid, Paper, Group, ThemeIcon, Stack, Button, Badge, Grid, RingProgress, Card, Skeleton, Box } from "@mantine/core";
import { useNavigate } from "react-router";
import { platformStatsQuery } from "@/utils/queries";
import { IconChartBarPopular, IconSettings, IconUsers } from "@tabler/icons-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const stats = platformStatsQuery()
  
  const adminFeatures = [
    {
      title: "Gestione Utenti",
      description: "Crea, modifica ed elimina gli account utente. Gestisci i permessi e i ruoli degli utenti.",
      icon: <IconUsers size={24} />,
      path: "/admin/users",
      color: "blue",
      badge: "utenti"
    },
    {
      title: "Impostazioni di Sistema",
      description: "Configura le impostazioni globali dell'applicazione e personalizza il comportamento.",
      icon: <IconSettings size={24} />,
      path: "/admin/settings",
      color: "violet",
    }
  ];
  const total = (stats.data?.users??1) + (stats.data?.transactions??1) + (stats.data?.boards??1);

  const usersPercentage = Math.round(((stats.data?.users??0) / total) * 100);
  const transactionsPercentage = Math.round(((stats.data?.transactions??0) / total) * 100);
  const boardsPercentage = Math.round(((stats.data?.boards??0) / total) * 100);

  return (
    <Stack gap="xl">

      <Box>
        <Title order={1}>Dashboard</Title>
        <Text size="lg" c="dimmed">Panoramica generale e statistiche del sistema</Text>
      </Box>

      <SimpleGrid 
        cols={{ base: 1, sm: 2, lg: 3 }} 
        spacing="lg"
      >
        {adminFeatures.map((feature, index) => (
          <Paper
            key={index}
            p="xl"
            radius="md"
            withBorder
            className="admin-paper-style"
          >
            <Group mb="md" justify="space-between">
              <Group>
                <ThemeIcon 
                  size={50} 
                  radius="md" 
                  variant="light" 
                  color={feature.color}
                  style={{
                    background: 'var(--primary-border)',
                  }}
                >
                  {feature.icon}
                </ThemeIcon>
                <Title order={3}>{feature.title}</Title>
              </Group>
              
              {feature.badge && (
                <Badge 
                  color={feature.color} 
                  variant="light"
                  size="lg"
                >
                  {feature.badge}
                </Badge>
              )}
            </Group>
            
            <Text component="span" style={{ opacity: 0.9  }} mb="xl" flex={1}>{feature.description}</Text>
            
            <Button
              variant="filled"
              color="indigo"
              fullWidth
              onClick={() => navigate(feature.path)}
            >
              Accedi
            </Button>
          </Paper>
        ))}
          <Paper
            p="xl"
            radius="md"
            withBorder
            className="admin-paper-style"
          >
            <Group mb="md">
              <ThemeIcon size={40} radius="md" variant="light" color="indigo">
              <IconChartBarPopular size={24} />
              </ThemeIcon>
              <Title order={3}>Statistiche Piattaforma</Title>
            </Group>

            {stats.isLoading ? (
              <Stack>
              <Skeleton height={90} radius="md" mb="sm" />
              <Grid>
                <Grid.Col span={4}><Skeleton height={60} radius="md" /></Grid.Col>
                <Grid.Col span={4}><Skeleton height={60} radius="md" /></Grid.Col>
                <Grid.Col span={4}><Skeleton height={60} radius="md" /></Grid.Col>
              </Grid>
              </Stack>
            ) : (
              <>
              <Box mb="md" style={{ display: 'flex', justifyContent: 'center' }}>
                <RingProgress
                  size={120}
                  thickness={12}
                  roundCaps
                  sections={[
                    { value: usersPercentage, color: 'blue' },
                    { value: transactionsPercentage, color: 'violet' },
                    { value: boardsPercentage, color: 'gray' },
                  ]}
                  label={
                  <Text ta="center" fz="xs" c="dimmed">Totale</Text>
                  }
                />
              </Box>
              
              <Grid gutter="xs">
                {[
                  { title: "Utenti", value: stats.data?.users??0, color: "blue", icon: <IconUsers size={18} /> },
                  { title: "Transazioni", value: stats.data?.transactions??0, color: "violet", icon: <IconChartBarPopular size={18} /> },
                  { title: "Boards", value: stats.data?.boards??0, color: "gray", icon: <IconSettings size={18} /> }
                ].map((item, index) => (
                <Grid.Col span={4} key={index}>
                  <Card p="sm" withBorder style={{ height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Group justify="space-between" align="center">
                    <Text fw={700} size="xl">{item.value}</Text>
                    <ThemeIcon color={item.color} variant="light" size="md" radius="xl">
                      {item.icon}
                      </ThemeIcon>
                  </Group>
                  <Text size="md" c="dimmed">{item.title}</Text>
                  </Card>
                </Grid.Col>
                ))}
              </Grid>
              </>
            )}
          </Paper>
      </SimpleGrid>
    </Stack>
  );
}

export default AdminDashboard;
