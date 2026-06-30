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
    Checkbox,
    Image,
    Modal,
    Stack,
    PinInput,
    ThemeIcon,
    Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { postRequest, getRequest, putRequest } from "@/utils/net";
import { IconLogin, IconShield, IconFingerprint, IconArrowLeft, IconMailOpened, IconRefresh } from "@tabler/icons-react";
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { RegistrationMode } from "@/utils/types";
import { Outlet, useSearchParams } from "react-router";
import { useAuth, useHeader, useLoading } from "@/utils/store";
import { registrationInfoQuery } from "@/utils/queries";

import { checkboxStyles, inputStyles } from "@/styles/commonStyles";

export interface LoginProviderProps {
    children?: React.ReactNode;
    force?: boolean;
}

type AuthStep = 'EMAIL' | 'OTP';

const LoginProvider = ({ children, force = false }: LoginProviderProps) => {
    const { token, login: setToken, tokenInfo } = useAuth();
    const { setLoading } = useLoading();
    const regInfo = registrationInfoQuery();
    const [error, setError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const urlToken = searchParams.get('token');

    const [step, setStep] = useState<AuthStep>('EMAIL');
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        if (resendTimer > 0) {
            const timerId = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [resendTimer]);

    const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [isCreatingPasskey, setIsCreatingPasskey] = useState(false);
    const { setHeader } = useHeader();

    const registrationMode = regInfo.data?.mode ?? RegistrationMode.PRIVATE;

    const form = useForm({
        initialValues: {
            email: "",
            otp: "",
            token: urlToken || "",
            keepLogin: true,
        },
        validate: {
            email: (value) => (step === 'EMAIL') && !/^\S+@\S+\.\S+$/.test(value) ? "Email non valida" : null,
            otp: (value) => (step === 'OTP') && value.length !== 6 ? "Il codice deve essere di 6 cifre" : null,
            token: (value) => step === 'OTP' && registrationMode === RegistrationMode.TOKEN && !value ? "Token obbligatorio" : null,
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
        if (!token) {
            setHeader(null);
            setStep('EMAIL');
            form.setFieldValue('otp', '');
        }
    }, [token, setHeader]);

    const checkPasskeyAndComplete = async (accessToken: string) => {
        try {
            const headers = { Authorization: 'Bearer ' + accessToken };
            const me = await getRequest('/me', { headers });

            if (me.passkeys?.length === 0 && !me.passkeyPromptDismissed) {
                setTempToken(accessToken);
                setShowPasskeyPrompt(true);
                return;
            }
        } catch (err) {
            console.error("Failed to check passkey status", err);
        }

        setToken(accessToken);
        notifications.show({
            title: "Accesso effettuato",
            message: "Benvenuto su Splitify!",
            color: "green",
        });
    };

    const handleEmailSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await postRequest("/login", { body: { email: form.values.email } });
            if (res.requiresOtp) {
                setStep('OTP');
                setResendTimer(60);
                notifications.show({ title: 'Codice inviato', message: 'Controlla la tua email', color: 'blue' });
            }
        } catch (err: any) {
            setError(err.message || "Errore durante l'invio dell'email");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (otpOverride?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await postRequest("/verify-otp", { 
                body: { 
                    email: form.values.email, 
                    code: otpOverride || form.values.otp, 
                    keepLogin: form.values.keepLogin, 
                    token: form.values.token 
                } 
            });
            if (res.access_token) {
                await checkPasskeyAndComplete(res.access_token);
            }
        } catch (err: any) {
            setError(err.message || "Codice non valido o scaduto");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (step === 'EMAIL') await handleEmailSubmit();
        else if (step === 'OTP') await handleOtpSubmit();
    };

    const finalizeLogin = useCallback(() => {
        if (tempToken) {
            setShowPasskeyPrompt(false);
            setTimeout(() => {
                setToken(tempToken);
                notifications.show({
                    title: "Accesso effettuato",
                    message: "Benvenuto su Splitify!",
                    color: "green",
                });
                setTempToken(null);
            }, 300);
        }
    }, [tempToken, setToken]);

    const handleCreatePasskeyFromPrompt = useCallback(async () => {
        setIsCreatingPasskey(true);
        try {
            const headers = { Authorization: 'Bearer ' + tempToken };
            const options = await postRequest('/passkey/register/options', { 
                body: { password: "none" }, 
                headers 
            });
            const response = await startRegistration(options.options);
            const verifyResp = await postRequest('/passkey/register/verify', {
                body: { response, token: options.token, name: "Dispositivo di " + form.values.email },
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
    }, [tempToken, form.values.email, finalizeLogin]);

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


    const handlePasskeyLogin = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const options = await postRequest('/passkey/login/options', { body: {} });
            const response = await startAuthentication(options.options);
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
    }, [form.values.keepLogin, setLoading, setToken]);

    if (token && !force) {
        return children ?? <Outlet />;
    }

    return (
        <Container size="sm" mt={50}>
            <Modal opened={showPasskeyPrompt} onClose={() => {}} withCloseButton={false} title={<Title order={3}>Aggiungi una Passkey</Title>} centered>
                <Text mb="md">Aggiungi una passkey per accedere più velocemente usando l'impronta digitale o il Face ID, senza dover attendere l'email al prossimo accesso!</Text>
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
                        <Text>
                            {step === 'EMAIL' && (
                                (registrationMode === RegistrationMode.PUBLIC || (registrationMode === RegistrationMode.TOKEN && urlToken)) 
                                ? "Accedi o Registrati" 
                                : "Accedi a Splitify"
                            )}
                            {step === 'OTP' && "Inserisci OTP"}
                        </Text>
                    </Group>
                </Title>

                {error && (
                    <Alert
                        color="red"
                        title="Errore"
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

                <form onSubmit={form.onSubmit(handleSubmit)}>
                    {step === 'EMAIL' && (
                        <>
                            <Input.Wrapper label="Email" required error={form.errors.email} styles={{ label: { marginBottom: 6, fontSize: "0.95rem", fontWeight: 500 } }}>
                                <Input name="email" autoComplete="email" placeholder="Inserisci la tua email" {...form.getInputProps("email")} styles={inputStyles} />
                            </Input.Wrapper>
                        </>
                    )}

                    {step === 'OTP' && (
                        <Box className="center-flex-col" p="xl" mt="md" mb="md" style={{ 
                            background: 'rgba(30, 35, 55, 0.4)', 
                            borderRadius: '16px', 
                            border: '1px solid rgba(122, 132, 255, 0.15)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <ThemeIcon size={64} radius="100%" variant="light" color="indigo" mb="md" style={{ background: 'rgba(122, 132, 255, 0.1)' }}>
                                <IconMailOpened size={32} stroke={1.5} color="#9ba3ff" />
                            </ThemeIcon>
                            
                            <Title order={4} mb="xs" ta="center" style={{ fontWeight: 600 }}>
                                Verifica la tua email
                            </Title>
                            
                            <Text mb="xl" ta="center" size="sm" c="dimmed" px="xs" style={{ lineHeight: 1.5 }}>
                                Abbiamo inviato un codice temporaneo a <Text span fw={600} c="#9ba3ff">{form.values.email}</Text>. Inseriscilo qui sotto per continuare.
                            </Text>
                            
                            <PinInput 
                                length={6} 
                                type="number" 
                                size="lg" 
                                mb="md" 
                                placeholder="-"
                                {...form.getInputProps('otp')} 
                                onComplete={(value) => {
                                    if (registrationMode === RegistrationMode.TOKEN && !form.values.token) {
                                        return;
                                    }
                                    handleOtpSubmit(value);
                                }}
                                styles={{
                                    input: {
                                        background: 'rgba(0,0,0,0.2)',
                                        borderColor: 'rgba(122, 132, 255, 0.2)',
                                        color: 'white',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        borderRadius: '8px',
                                        '&:focus': {
                                            borderColor: '#9ba3ff',
                                            boxShadow: '0 0 0 2px rgba(122, 132, 255, 0.15)'
                                        }
                                    }
                                }}
                            />

                            {registrationMode === RegistrationMode.TOKEN && (
                                <Input.Wrapper label="Token di Registrazione" required error={form.errors.token} w="100%" mt="sm" styles={{ label: { marginBottom: 6, fontSize: "0.95rem", fontWeight: 500 } }}>
                                    <Input name="token" placeholder="Richiesto per nuovi account" {...form.getInputProps("token")} styles={inputStyles} />
                                </Input.Wrapper>
                            )}

                            <Button 
                                variant="subtle" 
                                size="sm" 
                                color="indigo"
                                mt="md"
                                leftSection={<IconRefresh size={16} stroke={1.5} />}
                                disabled={resendTimer > 0}
                                onClick={handleEmailSubmit}
                                style={{ 
                                    opacity: resendTimer > 0 ? 0.6 : 1,
                                    fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {resendTimer > 0 ? `Nuovo invio tra ${resendTimer}s` : "Non hai ricevuto il codice? Invia di nuovo"}
                            </Button>
                        </Box>
                    )}

                    <Space h="lg" />

                    {(step === 'EMAIL' || step === 'OTP') && (
                        <Checkbox
                            label="Rimani connesso"
                            {...form.getInputProps("keepLogin", { type: "checkbox" })}
                            styles={checkboxStyles}
                        />
                    )}

                    {step === 'EMAIL' ? (
                        <Stack mt="xl" gap="md">
                            <Button
                                type="submit"
                                variant="gradient"
                                gradient={{ from: "#7a84ff", to: "#9ba3ff", deg: 35 }}
                                leftSection={<IconLogin size={20} />}
                                className="transparency-on-hover"
                                size="md"
                                fullWidth
                                style={{ boxShadow: "0 4px 10px rgba(122, 132, 255, 0.3)", transition: "var(--transition-standard)", fontWeight: 600 }}
                            >
                                Continua con Email
                            </Button>
                            
                            <Divider label="oppure" labelPosition="center" color="dark.4" />
                            
                            <Button
                                variant="light"
                                color="indigo"
                                leftSection={<IconFingerprint size={20} />}
                                onClick={handlePasskeyLogin}
                                fullWidth
                                size="md"
                                className="transparency-on-hover"
                                style={{ fontWeight: 600 }}
                            >
                                Accedi con Passkey
                            </Button>
                        </Stack>
                    ) : (
                        <Group mt="xl" justify="space-between">
                            <Button variant="subtle" color="gray" onClick={() => setStep('EMAIL')} leftSection={<IconArrowLeft size={16} />}>
                                Indietro
                            </Button>
                            <Button
                                type="submit"
                                variant="gradient"
                                gradient={{ from: "#7a84ff", to: "#9ba3ff", deg: 35 }}
                                leftSection={<IconLogin size={20} />}
                                className="transparency-on-hover"
                                size="md"
                                px="xl"
                                ml="auto"
                                style={{ boxShadow: "0 4px 10px rgba(122, 132, 255, 0.3)", transition: "var(--transition-standard)", fontWeight: 600 }}
                            >
                                Verifica OTP
                            </Button>
                        </Group>
                    )}
                </form>
            </Paper>

            <Text ta="center" size="sm" c="dimmed" mt="lg" style={{ opacity: 0.7 }}>
                Splitify 💰 — La piattaforma per gestire le spese in gruppo
            </Text>
        </Container>
    );
};

export default LoginProvider;
