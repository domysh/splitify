import { registerUser } from "@/utils/net";
import { Box, Button, Paper, PasswordInput, TextInput, Text, Space, Title, Alert, Group, Checkbox } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { IconUserPlus, IconCheck } from "@tabler/icons-react";
import { RegistrationMode } from "@/utils/types";
import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useLoading } from "@/utils/store";
import { checkboxStyles, inputStyles } from "@/styles/commonStyles";
import { usernameValidator } from "@/utils";

interface RegisterFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    registrationMode: RegistrationMode;
}

export const RegisterForm = ({ onSuccess, onCancel, registrationMode }: RegisterFormProps) => {
    const { setLoading } = useLoading();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [tokenInUrl, setTokenInUrl] = useState(false);
    const { login } = useAuth();
    const queryClient = useQueryClient();

    const { token } = useParams()

    const form = useForm({
        initialValues: {
            username: '',
            password: '',
            confirmPassword: '',
            token: '',
            keepLogin: false
        },
        validate: {
            username: usernameValidator,
            password: (value) => {
                if (!value) return 'Password obbligatoria';
                if (value.length < 6) return 'La password deve contenere almeno 6 caratteri';
                return null;
            },
            confirmPassword: (value, values) => {
                if (value !== values.password) return 'Le password non coincidono';
                return null;
            },
            token: (value) => {
                if (registrationMode === RegistrationMode.TOKEN && !value.trim()) {
                    return 'Token di registrazione obbligatorio';
                }
                return null;
            }
        }
    });

    useEffect(() => {
        if (token) {
            setTokenInUrl(true);
            form.setValues({ token})
        }else{
            setTokenInUrl(false);
            form.setValues({ token: ''})
        }
    }, [token]);

    const handleSubmit = async (values: typeof form.values) => {
        setError(null);
        setLoading(true);

        try {
            
            const token = registrationMode === RegistrationMode.TOKEN ? values.token : undefined;
            const registration = await registerUser(values.username, values.password, token, values.keepLogin);
            if (registration.access_token) {
                login(registration.access_token);
            }else{
                throw new Error('Token non trovato');
            }
            setSuccess(true);
            notifications.show({
                title: 'Registrazione completata',
                message: 'Il tuo account è stato creato con successo.',
                color: 'green',
                icon: <IconCheck />
            });

            queryClient.invalidateQueries({ queryKey: [] });
            onSuccess()
            
        } catch (error: any) {
            const errorMessage = error?.message || 
                                 error?.detail || 
                                 'Si è verificato un errore durante la registrazione.';
            
            setError(errorMessage);
            
            if (errorMessage.includes('token') || errorMessage.includes('Token')) {
                form.setFieldError('token', errorMessage);
            } else if (errorMessage.includes('username') || errorMessage.includes('esistente')) {
                form.setFieldError('username', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Paper p="lg" radius="md" withBorder style={{
                background: 'rgba(35, 48, 68, 0.7)',
                borderColor: 'rgba(100, 180, 130, 0.5)'
            }}>
                <Box ta="center">
                    <IconCheck size={40} color="#4CAF50" />
                    <Title order={3} mt="md" style={{ color: '#eee' }}>
                        Registrazione completata!
                    </Title>
                    <Text size="lg" mt="xs" c="dimmed">
                        Il tuo account è stato creato con successo.
                    </Text>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper p="lg" radius="md" withBorder style={{
            background: 'rgba(22, 22, 28, 0.8)',
            borderColor: 'var(--primary-border)'
        }}>
            <Title order={3} style={{ color: '#eee' }} mb="md">
                <Group gap="sm">
                    <IconUserPlus />
                    <Text>Crea un nuovo account</Text>
                </Group>
            </Title>

            {error && (
                <Alert color="red" title="Errore" mb="md">
                    {error}
                </Alert>
            )}

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput
                    label="Nome utente"
                    autoComplete="username"
                    placeholder="Inserisci un nome utente"
                    required
                    {...form.getInputProps('username')}
                    styles={inputStyles}
                />

                <Space h="md" />

                <PasswordInput
                    label="Password"
                    autoComplete="new-password"
                    placeholder="Inserisci una password"
                    required
                    {...form.getInputProps('password')}
                    styles={inputStyles}
                />

                <Space h="md" />

                <PasswordInput
                    label="Conferma password"
                    autoComplete="new-password"
                    placeholder="Conferma la tua password"
                    required
                    {...form.getInputProps('confirmPassword')}
                    styles={inputStyles}
                />

                {registrationMode === RegistrationMode.TOKEN && !tokenInUrl && (
                    <>
                        <Space h="md" />
                        
                        <TextInput
                            label="Token di registrazione"
                            placeholder="Inserisci il token di registrazione"
                            required
                            {...form.getInputProps('token')}
                            styles={inputStyles}
                        />
                    </>
                )}

                <Space h="md" />
                
                <Checkbox
                    label="Rimani connesso"
                    {...form.getInputProps('keepLogin', { type: 'checkbox' })}
                    styles={checkboxStyles}
                />

                <Group mt="xl" justify="space-between">
                    <Button 
                        variant="subtle" 
                        color="gray" 
                        onClick={onCancel}
                    >
                        Torna al login
                    </Button>
                    
                    <Button 
                        type="submit" 
                        variant="gradient"
                        gradient={{ from: '#7a84ff', to: '#9ba3ff' }}
                        leftSection={<IconUserPlus size={20} />}
                        className="transparency-on-hover"
                    >
                        Registrati
                    </Button>
                </Group>
            </form>
        </Paper>
    );
};
