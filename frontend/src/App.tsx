import { Notifications, notifications } from '@mantine/notifications';
import { AppShell, Box, Container, Image, LoadingOverlay, Title, Text, Group, Burger, ScrollArea } from '@mantine/core';
import { useCurrentUser, useMobile, useSmallScreen } from '@/utils/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, lazy } from 'react';
import { AdminButton, HomeButton, LogoutButton } from '@/commons/Buttons';
import { useRouteFunctions, useHeader, useAuth, useLoading, useLoadingStore } from '@/utils/store';
import { onConnectionCallabacks, socket } from '@/utils/socket';

const NavigatorContext = lazy(() => import('@/commons/NavigatorContext'))
const RegisterPage = lazy(() => import('@/components/RegisterPage'))
const BoardPage = lazy(() => import('@/components/board/BoardPage'))
const Dashboard = lazy(() => import('@/components/Dashboard'))
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'))
const UserManagementPage = lazy(() => import('@/components/admin/UserManagementPage'))
const SystemSettings = lazy(() => import('@/components/admin/SystemSettings'))
const LoginProvider = lazy(() => import('@/components/LoginProvider'))
const UserInfoDisplay = lazy(() => import('@/commons/UserInfoDisplay'))
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'))
const BurgerSection = lazy(() => import('@/components/BurgerSection'))
const UserProfilePage = lazy(() => import('@/components/user/UserProfilePage'))

import { Route } from 'react-router';

export default function App() {
  
  const isMobile = useMobile()
  const isSmallScreen = useSmallScreen()
  const [mobileOpened, setMobileOpened] = useState(false);
  const queryClient = useQueryClient();
  const {setLoading} = useLoading();
  const loadingStatus = useLoadingStore((state) => state.loading);
  const { token, logout } = useAuth()
  const { header } = useHeader();
  const { navigate } = useRouteFunctions();


  useEffect(() => {
    socket.on("connect_error", (err) => {
      const errorMsg = `Errore di connessione: ${err.message}`;
      notifications.show({
        id: "connection-error",
        title: "Errore di connessione",
        message: errorMsg,
        color: "red",
        icon: "❌",
      });
    });
    
    let first_time = true;
    socket.on("connect", () => {
      if (socket.connected) {
        if (!first_time) {
          queryClient.resetQueries({ queryKey: [] });
        }
      }
      onConnectionCallabacks.forEach((callback) => {
        callback.cb(socket);
      });
      first_time = false;
    });

    socket.on("update", (data) => {
      if (data.queryKeys){
        queryClient.invalidateQueries(
          ...((data.queryKeys as string[]).map((key) => ({ queryKey: key.split("/") })))
        )
      }
    })
    
    return () => {
      socket.off("connect_error");
      socket.off("connect");
    }
  }, [queryClient]);

  useEffect(() => {
    socket.auth = { token: token };
    socket.disconnect();
    socket.connect();
  }, [token]);
  
  
  const currentUser = useCurrentUser();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: [] });
  }, [token]);

  useEffect(() => {
    setLoading(false);
  }, [queryClient]);

  const [pathLocation, setPathLocation] = useState(window.location.pathname);
  useEffect(() => {
    setPathLocation(window.location.pathname);
  }, [window.location.pathname, navigate]);

  const closeNavbar = () => setMobileOpened(false);

  
  const handleLogout = useCallback(() => {
    logout();
    queryClient.clear();
    navigate("/");
  }, [queryClient, logout, navigate]);

  const burgerHaveElements = token?true:false;

  useEffect(() => {
    if (!burgerHaveElements){
      setMobileOpened(false);
    }
  }, [burgerHaveElements]);

  return <>
      <Notifications position="bottom-right" limit={5} />
      <LoadingOverlay 
        visible={loadingStatus} 
        zIndex={10000} 
        overlayProps={{ radius: "sm", blur: 3, backgroundOpacity: 0.2 }} 
        loaderProps={{ color: 'indigo', type: 'bars', size: 'md' }}
      />
      <AppShell
        header={{ height: 70 }}
        padding="md"
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { desktop: true, mobile: !mobileOpened },
        }}
        style={{
          background: 'linear-gradient(135deg, #242428 0%, #1a1a20 100%)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh'
        }}
      >
        <AppShell.Header style={{
          background: 'rgba(22, 22, 28, 0.95)',
          backdropFilter: 'blur(15px)',
          borderBottom: '1px solid rgba(100, 108, 255, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          height: '70px'
        }}>
          <Box style={{
            display: "flex",
            height: "100%",
            alignItems: "center",
            padding: "0 16px",
            justifyContent: "space-between"
          }}>
            
            <Group gap="xs">
              {
                burgerHaveElements && <Burger
                  opened={mobileOpened}
                  onClick={() => setMobileOpened(!mobileOpened)}
                  hiddenFrom="sm"
                  size="sm"
                  color="white"
                />
              }
              <Image
                src="/logo.png" 
                alt="Splitify Logo" 
                width={35} 
                height={35} 
                style={{
                  filter: 'drop-shadow(0 2px 5px rgba(138, 148, 255, 0.3))'
                }}
              />
              {!isSmallScreen && <Box>
                <Title order={3} style={{ 
                  color: 'white',
                  fontWeight: 700,
                  letterSpacing: '-0.5px'
                }}>
                  Splitify 💰
                </Title>
              </Box>}
            </Group>
            
            
            <Group gap={8}>
              {token && !isMobile && <UserInfoDisplay />}
              {header}
              { !isMobile && <>
                {token && currentUser?.isAdmin && (
                  pathLocation.startsWith("/admin")
                  ? <HomeButton onClick={() => {
                    navigate("/")
                  }} />
                  : <AdminButton onClick={() => navigate("/admin/dashboard")} />
                )}
                {token && <LogoutButton onClick={handleLogout} />}
              </>}
            </Group>
          </Box>
        </AppShell.Header>
        
        <AppShell.Navbar p="md" style={{
          background: 'rgba(22, 22, 28, 0.95)',
          backdropFilter: 'blur(15px)',
          borderRight: '1px solid rgba(100, 108, 255, 0.2)',
        }}>
          <AppShell.Section component={ScrollArea}>
            <BurgerSection
              closeNavbar={closeNavbar}
              handleLogout={handleLogout}
              pathLocation={pathLocation}
              token={token}
            />
          </AppShell.Section>
        </AppShell.Navbar>
        
        <AppShell.Main>
          <NavigatorContext>

            <Route path="/register" element={
              <Container size="sm" pt="md">
                <RegisterPage />
              </Container>
            }/>

            <Route path="/register/:token" element={
              <Container size="sm" pt="md">
                <RegisterPage />
              </Container>
            }/>
            
            <Route path="/board/:board_id/:screen?" element={
              <Container size="xl" pt="md">
                <BoardPage />
              </Container>
            }/>

            <Route path="" element={<LoginProvider />}>
              <Route path="/" element={
                <Container size="xl" pt="md">
                  <Dashboard />
                </Container>
              }/>
              <Route path="/profile" element={
                <Container size="xl" pt="md">
                  <UserProfilePage />
                </Container>
              }/>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="settings" element={<SystemSettings />} />
                <Route index element={<AdminDashboard />} />
              </Route>
              <Route path="*" element={
                  <Container size="xl" pt="md">
                    <Box className="center-flex-col" mt={100}>
                      <Title order={1} mb="md" className="fadeIn">404 Not Found</Title>
                      <Text size="lg" c="dimmed">La pagina che stai cercando non esiste.</Text>
                    </Box>
                  </Container>
              } />
            </Route>
          </NavigatorContext>
        </AppShell.Main>
      </AppShell>
    </>
}
