import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css'

import { Notifications } from '@mantine/notifications';
import { AppShell, Box, Container, Image, LoadingOverlay, MantineProvider, Space, Title } from '@mantine/core';
import { LoginProvider } from './components/LoginProvider';
import { getLoading, socket, useLoading, useToken } from './utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { Dashboard } from './components/Dashboard';
import { BoardPage } from './components/BoardPage';
import { LogoutButton } from './components/Buttons';
import { useHeader } from './utils/store';

export default function App() {

  const loadingStatus = getLoading()
  const queryClient = useQueryClient()
  const setLoading = useLoading()

  useEffect(()=>{
    setLoading(false)
    socket.on("update", (data) => {
      console.log("Update received by socket io:", data)
      queryClient.invalidateQueries({ queryKey: [] })
    })
    socket.on("connect_error", (err) => {
      notifications.show({
        title: "Socket.Io connection failed!",
        message: err.message,
        color: "red"
      })
    });
    return () => {
      socket.off("update")
      socket.off("connect_error")
    }
  },[])

  const [token, setToken] = useToken()
  const {header} = useHeader()

  return (
    <MantineProvider defaultColorScheme='dark'>
      <Notifications />
      <LoadingOverlay visible={loadingStatus} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <AppShell
                header={{ height: 60 }}
                navbar={{
                  width: 300,
                  breakpoint: 'sm',
                  collapsed: { desktop: true, mobile: true },
                }}
              >
                <AppShell.Header>
                  <Box style={{
                    display: "flex",
                    height: "100%",
                    alignItems: "center"
                  }}>
                    <Space w="md" />
                    <Image src="/logo.png" alt="Splitify Logo" width={30} height={30} />
                    <Box visibleFrom='xs'>
                      <Space w="xs" />
                      <Title order={2}>
                        Splitify 🛍️
                      </Title>
                    </Box>
                    <Box style={{ flexGrow: 1 }} />
                    {header}
                    {token && <>
                      <Space w="sm" />
                      <LogoutButton onClick={() => setToken("")} />
                    </>}
                    <Space w="md" />
                  </Box>
                </AppShell.Header>
                <AppShell.Main>
                  <Container size="xl">
                    <BrowserRouter>
                      <Routes>
                        <Route path="/board/:board_id" element={<BoardPage />}/>
                        <Route path="/board/:board_id/:screen" element={<BoardPage />} />
                        <Route path='*' element={
                          <LoginProvider>
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="*" element={<Title order={1}>404 Not Found</Title>} />
                              </Routes>
                          </LoginProvider>
                        } />
                      </Routes>
                    </BrowserRouter>
                  </Container>
                </AppShell.Main>
              </AppShell>
    </MantineProvider>

  )
}
