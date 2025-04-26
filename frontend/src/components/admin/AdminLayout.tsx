import { Container, Tabs, Badge, Divider, Space } from "@mantine/core";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect } from "react";
import { useCurrentUser } from "@/utils/hooks";
import { IconDashboard, IconSettings, IconUsers } from "@tabler/icons-react";
import { platformStatsQuery } from "@/utils/queries";
import { useHeader, useLoading } from "@/utils/store";

export const AdminLayout = () => {
    const currentUser = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();
    const {setLoading} = useLoading();
    const stats = platformStatsQuery()
    const { setHeader } = useHeader()

    useEffect(() => {
        
        if (currentUser && !currentUser.isLoading && !currentUser.isAdmin) {
            navigate('/');
        }
        setLoading(currentUser?.isLoading ?? false);
    }, [currentUser, navigate, setLoading]);

    useEffect(() => {
        setHeader(null)
    }, []);
    
    
    if (currentUser?.isLoading || !currentUser?.isAdmin) {
        return null;
    }
    
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/users')) return 'users';
        if (path.includes('/settings')) return 'settings';
        return 'dashboard';
    };

    const activeTab = getActiveTab();

    return (
        <Container size="xl" px="md" mt="sm">
            <Tabs 
                value={activeTab} 
                onChange={(value) => navigate(`/admin/${value === 'dashboard' ? '' : value}`)}
                style={{
                    borderRadius: '8px',
                }}
                variant="pills"
            >
                <Tabs.List>
                    <Tabs.Tab 
                        value="dashboard" 
                        leftSection={<IconDashboard size={18} />}
                        style={{ padding: '10px 18px', fontWeight: 500 }}
                    >
                        Dashboard
                    </Tabs.Tab>
                    <Tabs.Tab 
                        value="users" 
                        leftSection={<IconUsers size={18} />}
                        style={{ padding: '10px 18px', fontWeight: 500 }}
                        rightSection={
                            <Badge size="xs" variant="filled" color="blue" radius="xl">
                                {stats.data?.users ?? 0}
                            </Badge>
                        }
                    >
                        Gestione Utenti
                    </Tabs.Tab>
                    <Tabs.Tab 
                        value="settings" 
                        leftSection={<IconSettings size={18} />}
                        style={{ padding: '10px 18px', fontWeight: 500 }}
                    >
                        Impostazioni Sistema
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs>
            <Divider my="lg" size="sm" />
            <Outlet />
            <Space h="lg" />
        </Container>
    );
};

export default AdminLayout;