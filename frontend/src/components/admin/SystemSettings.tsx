import { registrationInfoQuery } from "@/utils/queries";
import { updateRegistrationSettings } from "@/utils/net";
import { RegistrationMode } from "@/utils/types";
import { Box, Button, Card, Divider, Group, Loader, Paper, Radio, Text, TextInput, Title, Alert } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { IconSettings, IconUserPlus, IconLock, IconWorld, IconBan, IconKey, IconCheck, IconRefresh } from "@tabler/icons-react";
import { useLoading } from "@/utils/store";

const SystemSettings = () => {
    const { setLoading } = useLoading();
    const queryClient = useQueryClient();
    const regInfo = registrationInfoQuery();
    
    const form = useForm({
        initialValues: {
            registrationMode: RegistrationMode.PRIVATE,
            registrationToken: undefined as string | undefined
        },
        validate: {
            registrationToken: (value, values) => {
                if (values.registrationMode === RegistrationMode.TOKEN && !value) {
                    return 'Il token di registrazione è obbligatorio quando la registrazione è basata su token';
                }
                if (values.registrationMode === RegistrationMode.TOKEN && value) {
                    if (!/^[a-zA-Z0-9]+$/.test(value)) {
                        return 'Il token non può contenere caratteri speciali o spazi';
                    }
                }
                return null;
            }
        }
    });

    
    useEffect(() => {
        if (regInfo.data) {
            form.setInitialValues({
                registrationMode: regInfo.data.mode,
                registrationToken: regInfo.data.token
            });
            form.reset()
        }
    }, [regInfo.isFetching]);

    
    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        
        try {
            
            const token = values.registrationMode === RegistrationMode.TOKEN 
                ? values.registrationToken
                : undefined;
                
            await updateRegistrationSettings(values.registrationMode, token);
            
            notifications.show({
                title: 'Impostazioni aggiornate',
                message: 'Le impostazioni di registrazione sono state aggiornate con successo',
                color: 'green',
                icon: <IconCheck size={16} />
            });
            
            
            queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
        } catch (error: any) {
            notifications.show({
                title: 'Errore',
                message: error?.message || 'Si è verificato un errore durante l\'aggiornamento delle impostazioni',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    
    const generateRandomToken = () => {
        const chars = 'abcdef0123456789';
        let token = '';
        for (let i = 0; i < 64; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        form.setFieldValue('registrationToken', token);
    };

    if (regInfo.isLoading) {
        return (
            <Box p="xl" className="center-flex">
                <Loader size="md" />
            </Box>
        );
    }

    if (regInfo.isError) {
        return (
            <Alert color="red" title="Errore" mt="md">
                Si è verificato un errore durante il caricamento delle impostazioni di sistema.
                <Button mt="md" onClick={() => regInfo.refetch()}>
                    Riprova
                </Button>
            </Alert>
        );
    }

    return (
        <Paper p="md" radius="md" withBorder mb="xl" className="admin-paper-style">
            <Group mb="md">
                <IconSettings size={20} color='#9ba3ff' />
                <Title order={3}>Impostazioni di Sistema</Title>
            </Group>
            
            <Divider mb="xl" />
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Card p="md" radius="md" withBorder mb="md" style={{
                    background: 'rgba(20, 25, 40, 0.4)',
                    borderColor: 'var(--primary-border)'
                }}>
                    <Group mb="md">
                        <IconUserPlus size={18} color='#9ba3ff' />
                        <Title order={4}>Impostazioni di Registrazione</Title>
                    </Group>
                    
                    <Box mb="md">
                        <Text fw={500} mb="xs">Modalità di registrazione</Text>
                        <Radio.Group
                            {...form.getInputProps('registrationMode')}
                            name="registrationMode"
                        >
                            <Group mt="xs">
                                <Radio
                                    value={RegistrationMode.PRIVATE}
                                    label={<Group gap={8}><IconBan size={14} /> <Text>Disabilitata</Text></Group>}
                                />
                                <Radio
                                    value={RegistrationMode.TOKEN}
                                    label={<Group gap={8}><IconKey size={14} /> <Text>Tramite token</Text></Group>}
                                />
                                <Radio
                                    value={RegistrationMode.PUBLIC}
                                    label={<Group gap={8}><IconWorld size={14} /> <Text>Aperta</Text></Group>}
                                />
                            </Group>
                        </Radio.Group>
                    </Box>
                    
                    {form.values.registrationMode === RegistrationMode.TOKEN && (
                        <Box mb="md">
                            <Text fw={500} mb="xs">Token di registrazione</Text>
                            <Group align="flex-end">
                                <TextInput
                                    placeholder="Inserisci il token per la registrazione"
                                    {...form.getInputProps('registrationToken')}
                                    style={{ flex: 1 }}
                                    leftSection={<IconLock size={14} />}
                                />
                                <Button 
                                    variant="light" 
                                    onClick={generateRandomToken}
                                    leftSection={<IconRefresh size={16} />}
                                >
                                    Genera
                                </Button>
                            </Group>
                            <Text size="xs" c="dimmed" mt={5}>
                                Il token sarà richiesto agli utenti durante la registrazione.
                            </Text>
                            <Box mt={10} p="xs" style={{ background: 'var(--primary-border)', borderRadius: '4px' }}>
                                <Text size="sm" fw={500} mb={5}>
                                    Link di registrazione:
                                </Text>
                                <Text size="xs" c="dimmed" mb={5}>
                                    Condividi questo link con gli utenti che vuoi invitare:
                                </Text>
                                <Group align="center">
                                    <TextInput
                                        readOnly
                                        value={`${window.location.origin}/register/${form.values.registrationToken}`}
                                        style={{ flex: 1 }}
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <Button
                                        variant="light"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/register/${form.values.registrationToken}`);
                                            notifications.show({
                                                title: 'Link copiato',
                                                message: 'Il link di registrazione è stato copiato negli appunti',
                                                color: 'green'
                                            });
                                        }}
                                    >
                                        Copia
                                    </Button>
                                </Group>
                            </Box>
                        </Box>
                    )}
                    
                    <Box>
                        <Text fw={500} mb="xs">Descrizione delle modalità:</Text>
                        <Text size="sm" c="dimmed">
                            <strong>Disabilitata:</strong> Nessun utente può registrarsi autonomamente.
                        </Text>
                        <Text size="sm" c="dimmed">
                            <strong>Tramite token:</strong> Gli utenti possono registrarsi solo se possiedono il token valido.
                        </Text>
                        <Text size="sm" c="dimmed">
                            <strong>Aperta:</strong> Chiunque può registrarsi senza necessità di token.
                        </Text>
                    </Box>
                </Card>
                
                <Group justify="flex-end" mt="xl">
                    <Button
                        type="submit"
                        variant="gradient"
                        gradient={{ from: '#7a84ff', to: '#9ba3ff' }}
                        leftSection={<IconSettings size={16} />}
                        disabled={!form.isDirty()}
                    >
                        Salva impostazioni
                    </Button>
                </Group>
            </form>
        </Paper>
    );
};

export default SystemSettings;
