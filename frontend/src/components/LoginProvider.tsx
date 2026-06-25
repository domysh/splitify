import {
    Button,
    Text,
    Container,
    Input,
    Box,
    Group,
    Title,
    Paper,
    Space,
    Alert,
    PasswordInput,
    Checkbox,
    Image,
    Modal,
    Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { postRequest, getRequest, putRequest } from "@/utils/net";
import { IconLogin, IconShield, IconFingerprint } from "@tabler/icons-react";
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { RegistrationMode } from "@/utils/types";
import { Outlet, useNavigate } from "react-router";
import { useAuth, useHeader, useLoading } from "@/utils/store";
import { registrationInfoQuery } from "@/utils/queries";
import { usernameValidator } from "@/utils";
import { checkboxStyles } from "@/styles/commonStyles";

export interface LoginProviderProps {
    children?: React.ReactNode;
    force?: boolean;
}

const LoginProvider = ({ children, force = false }: LoginProviderProps) => {
    const { token, login: setToken, tokenInfo } = useAuth();
    const { setLoading } = useLoading();
    const regInfo = registrationInfoQuery();
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [isCreatingPasskey, setIsCreatingPasskey] = useState(false);
    const { setHeader } = useHeader();

    const registrationMode = regInfo.data?.mode ?? RegistrationMode.PRIVATE;

    const form = useForm({
        initialValues: {
            username: "",
            password: "",
            keepLogin: false,
        },
        validate: {
            username: usernameValidator,
            password: (value) => (!value ? "Password obbligatoria" : null),
        },
    });

    const performTokenRefresh = useCallback(() => {
        postRequest("token/refresh")
            .then((res) => {
                if (res.access_token) {
                    setToken(res.access_token);
                } else {
                    setToken(null);
                    setHeader(null);
                }
            })
            .catch(() => {
                setToken(null);
                setHeader(null);
            });
    }, [setHeader, setToken]);

    // Token refresher
    useEffect(() => {
        const interval = setInterval(() => {
            const sessionInfo = tokenInfo();
            if (!sessionInfo) return;
            const remainingTime = sessionInfo.exp - new Date().getTime() / 1000;
            if (remainingTime < 0) {
                setToken(null);
                setHeader(null);
                return;
            }
            const tokenDuration = sessionInfo.exp - sessionInfo.iat;
            const waitForRefresh = remainingTime - tokenDuration * 0.09;
            if (waitForRefresh <= 0) {
                performTokenRefresh();
            }
        }, 10000);
        return () => {
            clearInterval(interval);
        };
    }, [tokenInfo, performTokenRefresh, setHeader, setToken]);

    useEffect(() => {
        form.reset();
        if (!token) {
            setHeader(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, setHeader]);

    const login = useCallback(
        (username: string, password: string, keepLogin: boolean) => {
            setLoading(true);
            setError(null);

            postRequest("/login", {
                body: { username, password, keepLogin },
            })
                .then(async (res) => {
                    if (res.access_token) {
                        try {
                            const headers = { Authorization: 'Bearer ' + res.access_token };
                            const me = await getRequest('/me', { headers });
                            
                            if (me.passkeys?.length === 0 && !me.passkeyPromptDismissed) {
                                setTempToken(res.access_token);
                                setShowPasskeyPrompt(true);
                                return;
                            }
                        } catch (err) {
                            console.error("Failed to check passkey status", err);
                        }

                        setToken(res.access_token);
                        notifications.show({
                            title: "Accesso effettuato",
                            message: "Benvenuto su Splitify!",
                            color: "green",
                        });
                    } else {
                        setError("Risposta del server non valida. Riprova.");
                    }
                })
                .catch((error) => {
                    setError(
                        error?.message ||
                        "Si è verificato un errore durante l'accesso.",
                    );
                    notifications.show({
                        title: "Errore di autenticazione",
                        message:
                            error?.message ||
                            "Credenziali non valide o errore del server",
                        color: "red",
                    });
                })
                .finally(() => {
                    setLoading(false);
                });
        },
        [setLoading, setToken, form.values.username, form.values.password],
    );

    const finalizeLogin = useCallback(() => {
        if (tempToken) {
            setToken(tempToken);
            setTempToken(null);
            setShowPasskeyPrompt(false);
            notifications.show({
                title: "Accesso effettuato",
                message: "Benvenuto su Splitify!",
                color: "green",
            });
        }
    }, [tempToken, setToken]);

    const handleCreatePasskeyFromPrompt = useCallback(async () => {
        setIsCreatingPasskey(true);
        try {
            const headers = { Authorization: 'Bearer ' + tempToken };
            const options = await postRequest('/passkey/register/options', { 
                body: { password: form.values.password }, 
                headers 
            });
            const response = await startRegistration(options.options);
            const verifyResp = await postRequest('/passkey/register/verify', {
                body: { response, token: options.token, name: "Dispositivo di " + form.values.username },
                headers
            });
            if (verifyResp.verified) {
                notifications.show({ title: 'Passkey aggiunta', message: 'Passkey registrata con successo', color: 'green' });
            }
        } catch (error: any) {
             notifications.show({ title: 'Errore Passkey', message: error.message || 'Impossibile registrare la passkey', color: 'red' });
        } finally {
            setIsCreatingPasskey(false);
            finalizeLogin();
        }
    }, [tempToken, form.values.password, form.values.username, finalizeLogin]);

    const handlePostponePasskey = useCallback(() => {
        finalizeLogin();
    }, [finalizeLogin]);

    const handleDismissPasskey = useCallback(async () => {
        try {
            const headers = { Authorization: 'Bearer ' + tempToken };
            await putRequest('/users/me/passkey-prompt-dismiss', { headers });
        } catch (e) {
            console.error("Failed to dismiss prompt", e);
        }
        finalizeLogin();
    }, [tempToken, finalizeLogin]);

    const navigateToSignup = useCallback(() => {
        navigate("/register");
    }, [navigate]);

    const handlePasskeyLogin = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get options
            // If username is typed, send it.
            const username = form.values.username;
            const options = await postRequest('/passkey/login/options', { body: { username: username || undefined } });

            // 2. Start authentication
            const response = await startAuthentication(options.options);

            // 3. Verify
            const verifyResp = await postRequest('/passkey/login/verify', {
                body: {
                    response,
                    token: options.token,
                    keepLogin: form.values.keepLogin
                }
            });

            if (verifyResp.verified && verifyResp.access_token) {
                setToken(verifyResp.access_token);
                notifications.show({
                    title: "Accesso effettuato",
                    message: "Benvenuto su Splitify!",
                    color: "green",
                });
            } else {
                throw new Error('Verifica fallita');
            }
        } catch (error: any) {
            console.error(error);
            setError(error.message || "Errore durante l'accesso con Passkey");
            notifications.show({
                title: "Errore Passkey",
                message: error.message || "Impossibile completare l'accesso con Passkey",
                color: "red"
            });
        } finally {
            setLoading(false);
        }
    }, [form.values.username, form.values.keepLogin, setLoading, setToken]);

    if (token && !force) {
        return children ?? <Outlet />;
    }

    return (
        <Container size="sm" mt={50}>
            <Modal opened={showPasskeyPrompt} onClose={() => {}} withCloseButton={false} title={<Title order={3}>Aggiungi una Passkey</Title>} centered>
                <Text mb="md">Aggiungi una passkey per accedere più velocemente usando l'impronta digitale o il Face ID, senza dover inserire la password al prossimo accesso!</Text>
                <Stack>
                    <Button loading={isCreatingPasskey} leftSection={<IconFingerprint size={20}/>} onClick={handleCreatePasskeyFromPrompt}>
                        Crea subito
                    </Button>
                    <Button variant="light" onClick={handlePostponePasskey}>
                        Chiedilo al prossimo login
                    </Button>
                    <Button variant="subtle" color="gray" onClick={handleDismissPasskey}>
                        Non chiedere più
                    </Button>
                </Stack>
            </Modal>
            <Box mb={30} className="center-flex-col">
                <Image
                    src="/logo.png"
                    alt="Splitify Logo"
                    width={90}
                    height={90}
                    mah={90}
                    maw={90}
                    style={{
                        filter: "drop-shadow(0 4px 8px rgba(138, 148, 255, 0.6))",
                        animation: "pulse 2s infinite ease-in-out",
                    }}
                />
                <Title
                    order={1}
                    mt="md"
                    style={{
                        color: "white",
                        fontWeight: 800,
                        letterSpacing: "-0.5px",
                        textAlign: "center",
                        textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                >
                    Benvenuto su Splitify
                </Title>
                <Text
                    size="lg"
                    c="dimmed"
                    mb="sm"
                    mt={5}
                    ta="center"
                    style={{ maxWidth: "80%" }}
                >
                    Gestisci facilmente le spese condivise con amici e famiglia
                </Text>
            </Box>

            <Paper
                p="md"
                radius="lg"
                withBorder
                style={{
                    background:
                        "linear-gradient(145deg, rgba(26, 27, 38, 0.9), rgba(20, 21, 30, 0.8))",
                    borderColor: "var(--primary-border)",
                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(10px)",
                    transition: "var(--transition-standard)",
                }}
            >
                <Title
                    order={3}
                    style={{
                        color: "#f1f1f7",
                        fontWeight: 600,
                        marginBottom: "1.5rem",
                        borderBottom: "1px solid var(--primary-border)",
                        paddingBottom: "0.75rem",
                    }}
                >
                    <Group gap="sm">
                        <IconShield color="#9ba3ff" />
                        <Text>Accedi al tuo account</Text>
                    </Group>
                </Title>

                {error && (
                    <Alert
                        color="red"
                        title="Errore di accesso"
                        mb="md"
                        radius="md"
                        style={{
                            background: "rgba(225, 50, 50, 0.15)",
                            border: "1px solid rgba(225, 50, 50, 0.3)",
                        }}
                    >
                        {error}
                    </Alert>
                )}

                <form
                    onSubmit={form.onSubmit((values) =>
                        login(
                            values.username,
                            values.password,
                            values.keepLogin,
                        ),
                    )}
                >
                    <Input.Wrapper
                        label="Nome utente"
                        required
                        error={form.errors.username}
                        styles={{
                            label: {
                                marginBottom: 6,
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            },
                        }}
                    >
                        <Input
                            name="username"
                            autoComplete="username"
                            placeholder="Inserisci il tuo nome utente"
                            {...form.getInputProps("username")}
                            styles={{
                                input: {
                                    background: "rgba(16, 17, 30, 0.6)",
                                    border: "1px solid var(--primary-border)",
                                    padding: "14px 18px",
                                    borderRadius: "10px",
                                    fontSize: "15px",
                                    color: "white",
                                    transition: "var(--transition-standard)",
                                    "&:focus": {
                                        borderColor: "rgba(155, 163, 255, 0.8)",
                                        boxShadow:
                                            "0 0 0 3px var(--primary-border)",
                                    },
                                    "&:hover:not(:focus)": {
                                        borderColor: "rgba(155, 163, 255, 0.5)",
                                    },
                                },
                            }}
                        />
                    </Input.Wrapper>

                    <Space h="lg" />

                    <PasswordInput
                        name="password"
                        autoComplete="current-password"
                        label="Password"
                        placeholder="Inserisci la tua password"
                        required
                        error={form.errors.password}
                        {...form.getInputProps("password")}
                        styles={{
                            label: {
                                marginBottom: 6,
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            },
                            input: {
                                background: "rgba(16, 17, 30, 0.6)",
                                border: "1px solid var(--primary-border)",
                                padding: "14px 18px",
                                borderRadius: "10px",
                                fontSize: "15px",
                                color: "white",
                                transition: "var(--transition-standard)",
                                "&:focus": {
                                    borderColor: "rgba(155, 163, 255, 0.8)",
                                    boxShadow:
                                        "0 0 0 3px var(--primary-border)",
                                },
                                "&:hover:not(:focus)": {
                                    borderColor: "rgba(155, 163, 255, 0.5)",
                                },
                            },
                            innerInput: {
                                color: "white",
                            },
                        }}
                    />

                    <Space h="md" />

                    <Checkbox
                        label="Rimani connesso"
                        {...form.getInputProps("keepLogin", {
                            type: "checkbox",
                        })}
                        styles={checkboxStyles}
                    />

                    <Group mt="xl" justify="flex-end">
                        {registrationMode === RegistrationMode.PUBLIC && (
                            <Button
                                variant="light"
                                color="blue"
                                onClick={navigateToSignup}
                                size="md"
                                px="md"
                                className="transparency-on-hover"
                                style={{
                                    transition: "var(--transition-standard)",
                                    fontWeight: 600,
                                }}
                            >
                                Registrati
                            </Button>
                        )}

                        <Button
                            type="submit"
                            variant="gradient"
                            gradient={{
                                from: "#7a84ff",
                                to: "#9ba3ff",
                                deg: 35,
                            }}
                            leftSection={<IconLogin size={25} />}
                            className="transparency-on-hover"
                            ml={
                                registrationMode === RegistrationMode.PRIVATE
                                    ? "auto"
                                    : 0
                            }
                            size="md"
                            px="md"
                            style={{
                                boxShadow:
                                    "0 4px 10px rgba(122, 132, 255, 0.3)",
                                transition: "var(--transition-standard)",
                                fontWeight: 600,
                            }}
                        >
                            Accedi
                        </Button>
                    </Group>
                    <Group justify="center" mt="md">
                        <Button
                            variant="subtle"
                            color="gray"
                            leftSection={<IconFingerprint size={20} />}
                            onClick={handlePasskeyLogin}
                            fullWidth
                            className="transparency-on-hover"
                        >
                            Accedi con Passkey
                        </Button>
                    </Group>
                </form>
            </Paper>

            <Text
                ta="center"
                size="sm"
                c="dimmed"
                mt="lg"
                style={{ opacity: 0.7 }}
            >
                Splitify 💰 — La piattaforma per gestire le spese in gruppo
            </Text>
        </Container>
    );
};

export default LoginProvider;
