import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Group,
    Input,
    Modal,
    PinInput,
    Text,
    ThemeIcon,
    Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconMailOpened, IconRefresh, IconSend } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteRequest, postRequest } from '@/utils/net';
import { PendingEmailChange } from '@/utils/types';
import { useMobile } from '@/utils/hooks';
import { inputStyles, modalOverlayProps, modalTransitionProps } from '@/styles/commonStyles';
import { FormButtonBox } from '@/commons/FormButtonBox';

export interface ChangeEmailModalProps {
    open: boolean;
    onClose: () => void;
    currentEmail: string;
    pendingChange?: PendingEmailChange | null;
}

type ChangeEmailStep = 'EMAIL' | 'OTP';

const secondsUntil = (date?: string) => {
    if (!date) return 0;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
};

export const ChangeEmailModal = ({ open, onClose, currentEmail, pendingChange }: ChangeEmailModalProps) => {
    const queryClient = useQueryClient();
    const isMobile = useMobile();

    const [step, setStep] = useState<ChangeEmailStep>('EMAIL');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const form = useForm({
        initialValues: { email: '', otp: '' },
        validate: {
            email: (value) =>
                step === 'EMAIL' && !/^\S+@\S+\.\S+$/.test(value) ? 'Email non valida' : null,
            otp: (value) => (step === 'OTP' && value.length !== 6 ? 'Il codice deve essere di 6 cifre' : null),
        },
    });

    // Resume a change that was already started (e.g. after a page reload).
    useEffect(() => {
        if (!open) return;
        setError(null);
        form.setFieldValue('otp', '');
        if (pendingChange) {
            setStep('OTP');
            form.setFieldValue('email', pendingChange.newEmail);
            setResendTimer(secondsUntil(pendingChange.nextResendAt));
        } else {
            setStep('EMAIL');
            form.setFieldValue('email', '');
            setResendTimer(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const timerId = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
        return () => clearTimeout(timerId);
    }, [resendTimer]);

    const requestCode = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await postRequest('/users/me/email', { body: { email: form.values.email } });
            setStep('OTP');
            setResendTimer(secondsUntil(res.nextResendAt) || 60);
            form.setFieldValue('otp', '');
            queryClient.invalidateQueries({ queryKey: ['me'] });
            notifications.show({
                title: 'Codice inviato',
                message: `Abbiamo inviato un codice a ${form.values.email}`,
                color: 'blue',
            });
        } catch (err: any) {
            setError(err.message || "Errore durante l'invio dell'email");
        } finally {
            setLoading(false);
        }
    };

    const confirmCode = async (otpOverride?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await postRequest('/users/me/email/verify', {
                body: { code: otpOverride || form.values.otp },
            });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            notifications.show({
                title: 'Email aggiornata',
                message: `La tua email è ora ${res.email}`,
                color: 'green',
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Codice non valido o scaduto');
        } finally {
            setLoading(false);
        }
    };

    const abortChange = async () => {
        setLoading(true);
        try {
            await deleteRequest('/users/me/email');
            queryClient.invalidateQueries({ queryKey: ['me'] });
        } catch {
            // Nothing to undo client-side: the request simply stays pending.
        } finally {
            setLoading(false);
            setStep('EMAIL');
            form.setFieldValue('otp', '');
            setError(null);
        }
    };

    return (
        <Modal
            opened={open}
            onClose={onClose}
            title={<Text span fw={600}>Cambia email</Text>}
            centered
            size={isMobile ? '95%' : 'md'}
            overlayProps={modalOverlayProps}
            transitionProps={modalTransitionProps}
        >
            {error && (
                <Alert color="red" title="Errore" mb="md" radius="md">
                    {error}
                </Alert>
            )}

            <form onSubmit={form.onSubmit(() => (step === 'EMAIL' ? requestCode() : confirmCode()))}>
                {step === 'EMAIL' ? (
                    <>
                        <Text c="dimmed" size="sm" mb="md">
                            Email attuale: <Text span fw={600}>{currentEmail}</Text>.
                            Ti invieremo un codice di verifica al nuovo indirizzo: l'email verrà
                            aggiornata solo dopo la conferma.
                        </Text>
                        <Input.Wrapper
                            label="Nuova email"
                            required
                            error={form.errors.email}
                            styles={{ label: { marginBottom: 6, fontSize: '0.95rem', fontWeight: 500 } }}
                        >
                            <Input
                                name="new-email"
                                autoComplete="email"
                                placeholder="Inserisci la nuova email"
                                {...form.getInputProps('email')}
                                styles={inputStyles}
                            />
                        </Input.Wrapper>
                        <FormButtonBox
                            onCancel={onClose}
                            onSubmit={() => form.onSubmit(requestCode)()}
                            label="Invia codice"
                            icon={<IconSend size={18} />}
                            loading={loading}
                            fullWidth
                        />
                    </>
                ) : (
                    <>
                        <Box
                            className="center-flex-col"
                            p="lg"
                            style={{
                                background: 'rgba(30, 35, 55, 0.4)',
                                borderRadius: '16px',
                                border: '1px solid rgba(122, 132, 255, 0.15)',
                            }}
                        >
                            <ThemeIcon
                                size={64}
                                radius="100%"
                                variant="light"
                                color="indigo"
                                mb="md"
                                style={{ background: 'rgba(122, 132, 255, 0.1)' }}
                            >
                                <IconMailOpened size={32} stroke={1.5} color="#9ba3ff" />
                            </ThemeIcon>

                            <Title order={4} mb="xs" ta="center" style={{ fontWeight: 600 }}>
                                Verifica il nuovo indirizzo
                            </Title>

                            <Text mb="lg" ta="center" size="sm" c="dimmed" px="xs" style={{ lineHeight: 1.5 }}>
                                Abbiamo inviato un codice a{' '}
                                <Text span fw={600} c="#9ba3ff">{form.values.email}</Text>.
                                Inseriscilo qui sotto per completare il cambio.
                            </Text>

                            <PinInput
                                length={6}
                                type="number"
                                size="lg"
                                placeholder="-"
                                {...form.getInputProps('otp')}
                                onComplete={(value) => confirmCode(value)}
                                styles={{
                                    input: {
                                        background: 'rgba(0,0,0,0.2)',
                                        borderColor: 'rgba(122, 132, 255, 0.2)',
                                        color: 'white',
                                        fontWeight: 600,
                                        borderRadius: '8px',
                                    },
                                }}
                            />

                            <Button
                                variant="subtle"
                                size="sm"
                                color="indigo"
                                mt="md"
                                leftSection={<IconRefresh size={16} stroke={1.5} />}
                                disabled={resendTimer > 0 || loading}
                                onClick={requestCode}
                            >
                                {resendTimer > 0
                                    ? `Nuovo invio tra ${resendTimer}s`
                                    : 'Non hai ricevuto il codice? Invia di nuovo'}
                            </Button>
                        </Box>

                        <Group mt="lg" justify="space-between">
                            <Button
                                variant="subtle"
                                color="gray"
                                onClick={abortChange}
                                leftSection={<IconArrowLeft size={16} />}
                                disabled={loading}
                            >
                                Cambia indirizzo
                            </Button>
                            <Button
                                type="submit"
                                variant="gradient"
                                gradient={{ from: '#7a84ff', to: '#9ba3ff', deg: 35 }}
                                loading={loading}
                                px="xl"
                            >
                                Conferma
                            </Button>
                        </Group>
                    </>
                )}
            </form>
        </Modal>
    );
};
