import { useState, useEffect } from 'react';
import {
  Box,
  Title,
  Paper,
  TextInput,
  PasswordInput,
  Group,
  Text,
  LoadingOverlay,
  Divider,
  Checkbox,
  Button,
  Stack,
  Flex,
  ThemeIcon,
  Modal,
  ActionIcon,
  Switch,
  Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCurrentUser } from '@/utils/hooks';
import { useAuth, useHeader, useLoading } from '@/utils/store';
import { IconUser, IconKey, IconTrash, IconFingerprint, IconDevices, IconDeviceDesktop, IconDeviceMobile, IconMapPin, IconClock, IconTrashX, IconEdit } from '@tabler/icons-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useQueryClient } from '@tanstack/react-query';
import { deleteRequest, putRequest, postRequest } from '@/utils/net';
import { startRegistration } from '@simplewebauthn/browser';
import { HomeButton } from '@/commons/Buttons';
import { FormButtonBox } from '@/commons/FormButtonBox';
import { usernameValidator } from '@/utils';
import { YesOrNoModal } from '@/commons/YesOrNoModal';
import { useNavigate } from 'react-router';
import { checkboxStyles } from '@/styles/commonStyles';

export default function UserProfilePage() {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const setHeader = useHeader(props => props.setHeader);
  const { setLoading } = useLoading();

  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [passkeyModalAction, setPasskeyModalAction] = useState<{type: 'add' | 'rename', id?: string, defaultName?: string} | null>(null);
  const [deletePasskeyId, setDeletePasskeyId] = useState<string | null>(null);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeyPassword, setPasskeyPassword] = useState('');
  const [usePasskeyForPassword, setUsePasskeyForPassword] = useState(false);

  const usernameForm = useForm({
    initialValues: {
      username: '',
    },
    validate: {
      username: usernameValidator,
    },
  });

  const passwordForm = useForm({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      invalidateSessions: false,
    },
    validate: {
      currentPassword: (value) => (value === '' ? 'Inserisci la password attuale' : null),
      newPassword: (value) => (value === '' ? 'Inserisci la nuova password' : null),
      confirmPassword: (value, values) =>
        value !== values.newPassword ? 'Le password non coincidono' : null,
    },
  });

  const deleteForm = useForm({
    initialValues: {
      deleteConfirmation: '',
    },
    validate: {
      deleteConfirmation: (value) =>
        value !== currentUser?.username ? 'Username non corretto' : null,
    },
  });

  // Aggiorna username quando currentUser cambia
  useEffect(() => {
    if (currentUser?.username) {
      usernameForm.setInitialValues({ username: currentUser.username });
      usernameForm.reset()
    }
  }, [currentUser]);

  useEffect(() => {
    setHeader(<HomeButton onClick={() => navigate('/')} />)
  }, [setHeader, navigate]);

  const updateUsernameHandler = () => {
    setIsUpdatingUsername(true);
    return putRequest('/users/me/username', { body: { username: usernameForm.values.username } })
      .then(() => {
        notifications.show({
          title: 'Username aggiornato',
          message: 'Il tuo username è stato aggiornato con successo',
          color: 'green',
        });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      })
      .catch((error) => {
        notifications.show({
          title: 'Errore',
          message: error.message || 'Si è verificato un errore durante l\'aggiornamento dell\'username',
          color: 'red',
        });
      })
      .finally(() => {
        setIsUpdatingUsername(false);
      });
  };

  const updatePasswordHandler = () => {
    setIsUpdatingPassword(true);
    return putRequest('/users/me/password', {
      body: {
        oldPassword: passwordForm.values.currentPassword,
        newPassword: passwordForm.values.newPassword
      },
      params: {
        expireSessions: passwordForm.values.invalidateSessions ? 'true' : 'false'
      }
    })
      .then(() => {
        notifications.show({
          title: 'Password aggiornata',
          message: 'La tua password è stata aggiornata con successo',
          color: 'green',
        });
        passwordForm.reset();
      })
      .catch((error) => {
        notifications.show({
          title: 'Errore',
          message: error.message || 'Si è verificato un errore durante l\'aggiornamento della password',
          color: 'red',
        });
      })
      .finally(() => {
        setIsUpdatingPassword(false);
      });
  };

  const deleteAccountHandler = () => {
    setLoading(true);
    return deleteRequest('users')
      .then(() => {
        notifications.show({
          title: 'Account eliminato',
          message: 'Il tuo account è stato eliminato con successo',
          color: 'green',
        });
        logout();
        navigate('/');
        queryClient.clear()
      })
      .catch((error) => {
        notifications.show({
          title: 'Errore',
          message: error.message || 'Si è verificato un errore durante l\'eliminazione dell\'account',
          color: 'red',
        });
      }).finally(() => {
        setLoading(false);
      });
  };

  const handleAddPasskey = async (name: string, password: string) => {
    setIsAddingPasskey(true);
    setPasskeyModalAction(null);
    try {
      const options = await postRequest('/passkey/register/options', { body: { password } });
      const response = await startRegistration(options.options);
      const verifyResp = await postRequest('/passkey/register/verify', {
        body: { response, token: options.token, name }
      });

      if (verifyResp.verified) {
        notifications.show({
          title: 'Passkey aggiunta',
          message: 'La tua passkey è stata registrata con successo',
          color: 'green',
        });
      } else {
        throw new Error('Verifica fallita');
      }
    } catch (error: any) {
      notifications.show({
        title: 'Errore Passkey',
        message: error.message || "Impossibile registrare la passkey",
        color: 'red'
      });
    } finally {
      setIsAddingPasskey(false);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  };

  const handleSavePasskeyName = async () => {
    if (passkeyModalAction?.type === 'add') {
      await handleAddPasskey(passkeyName, passkeyPassword);
    } else if (passkeyModalAction?.type === 'rename' && passkeyModalAction.id) {
      try {
        setLoading(true);
        await putRequest(`/passkeys/${passkeyModalAction.id}/name`, { body: { name: passkeyName } });
        notifications.show({ title: 'Passkey rinominata', message: 'Il nome è stato aggiornato con successo', color: 'green' });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch (e: any) {
        notifications.show({ title: 'Errore', message: e.message || 'Errore durante la rinomina della passkey', color: 'red' });
      } finally {
        setLoading(false);
        setPasskeyModalAction(null);
      }
    }
  };

  const handleDeletePasskey = async () => {
    if (!deletePasskeyId) return;
    try {
      setLoading(true);
      await deleteRequest(`/passkeys/${deletePasskeyId}`);
      notifications.show({ title: 'Passkey eliminata', message: 'Passkey eliminata con successo', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e: any) {
      notifications.show({ title: 'Errore', message: e.message || "Impossibile eliminare la passkey", color: 'red' });
    } finally {
      setLoading(false);
      setDeletePasskeyId(null);
    }
  };

  const handleChangePasswordWithPasskey = async () => {
    if (passwordForm.values.newPassword === '' || passwordForm.values.confirmPassword === '') {
       notifications.show({ title: 'Errore', message: 'Inserisci e conferma la nuova password', color: 'red' });
       return;
    }
    setLoading(true);
    try {
      const options = await postRequest('/passkey/login/options', { body: { username: currentUser?.username } });
      const response = await startAuthentication(options.options);
      await putRequest(`/users/me/password-with-passkey?expireSessions=${passwordForm.values.invalidateSessions}`, {
        body: { newPassword: passwordForm.values.newPassword, response, token: options.token }
      });
      notifications.show({ title: 'Password aggiornata', message: 'Password cambiata con successo tramite passkey', color: 'green' });
      passwordForm.reset();
    } catch (e: any) {
      notifications.show({ title: 'Errore', message: e.message || "Autenticazione passkey fallita", color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    setLoading(true);
    deleteRequest(`/sessions/${sessionId}`)
      .then(() => {
        notifications.show({
          title: 'Sessione disconnessa',
          message: 'La sessione è stata terminata con successo',
          color: 'green',
        });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      })
      .catch((error) => {
        notifications.show({
          title: 'Errore',
          message: error.message || 'Impossibile disconnettere la sessione',
          color: 'red',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (!currentUser) {
    return (
      <Box pos="relative" h={300}>
        <LoadingOverlay visible={true} />
      </Box>
    );
  }

  return (
    <Box>
      <Title order={2} mb="xl">Impostazioni Profilo</Title>

      <Paper withBorder p="md" radius="md" mb="lg" className='admin-paper-style'>
        <Title order={3} mb="md" size="h4">
          <Group>
            <IconUser size={20} />
            <Text>Modifica Username</Text>
          </Group>
        </Title>
        <form onSubmit={usernameForm.onSubmit(updateUsernameHandler)}>
          <TextInput
            label="Username"
            autoComplete="username"
            placeholder="Inserisci un nuovo username"
            mb="md"
            {...usernameForm.getInputProps('username')}
          />
          <FormButtonBox
            loading={isUpdatingUsername}
            label='Aggiorna Username'
            hideCancel
            disabled={!usernameForm.isDirty()}
          />
        </form>
      </Paper>

      <Paper withBorder p="md" radius="md" mb="lg" className='admin-paper-style'>
        <Group justify="space-between" mb="md" align="center">
          <Title order={3} size="h4">
            <Group>
              <IconKey size={20} />
              <Text>Modifica Password</Text>
            </Group>
          </Title>
          {currentUser?.passkeys && currentUser.passkeys.length > 0 && (
            <Switch 
              label="Usa Passkey" 
              checked={usePasskeyForPassword} 
              onChange={(e) => {
                setUsePasskeyForPassword(e.currentTarget.checked);
                passwordForm.setFieldValue('currentPassword', '');
              }} 
            />
          )}
        </Group>
        <form onSubmit={passwordForm.onSubmit(updatePasswordHandler)}>
          {!usePasskeyForPassword && (
            <PasswordInput
              label="Password attuale"
              autoComplete="current-password"
              placeholder="Inserisci la password attuale"
              mb="md"
              required
              {...passwordForm.getInputProps('currentPassword')}
            />
          )}
          <PasswordInput
            label="Nuova password"
            autoComplete="new-password"
            placeholder="Inserisci la nuova password"
            mb="md"
            {...passwordForm.getInputProps('newPassword')}
          />
          <PasswordInput
            label="Conferma password"
            autoComplete="new-password"
            placeholder="Conferma la nuova password"
            mb="md"
            {...passwordForm.getInputProps('confirmPassword')}
          />
          <Checkbox
            label="Disconnetti altri dispositivi"
            description="Termina tutte le altre sessioni attive"
            mb="md"
            {...passwordForm.getInputProps('invalidateSessions', { type: 'checkbox' })}
            styles={checkboxStyles}
          />
          <Flex gap="sm" align="center" direction={{ base: 'column', sm: 'row' }}>
            {!usePasskeyForPassword ? (
              <Box style={{ flex: 1, width: '100%' }}>
                <FormButtonBox
                  loading={isUpdatingPassword}
                  label='Aggiorna Password'
                  hideCancel
                  disabled={passwordForm.values.newPassword === '' || passwordForm.values.confirmPassword === '' || passwordForm.values.currentPassword === ''}
                />
              </Box>
            ) : (
              <Button
                variant="light"
                onClick={handleChangePasswordWithPasskey}
                leftSection={<IconFingerprint size={20} />}
                disabled={passwordForm.values.newPassword === '' || passwordForm.values.confirmPassword === ''}
                style={{ flex: 1, width: '100%' }}
              >
                Cambia con Passkey
              </Button>
            )}
          </Flex>
        </form>
      </Paper>

      <Paper withBorder p="md" radius="md" mb="lg" className='admin-paper-style'>
        <Title order={3} mb="md" size="h4">
          <Group>
            <IconFingerprint size={20} />
            <Text>Passkey</Text>
          </Group>
        </Title>
        <Text c="dimmed" mb="md">
          Collega una passkey per accedere senza password in modo sicuro.
        </Text>
        <Stack gap="sm">
          {currentUser?.passkeys?.map((pk) => (
            <Paper key={pk.id} withBorder p="sm" radius="md" style={{ background: 'rgba(0,0,0,0.01)' }}>
              <Flex align="center" justify="space-between" wrap="wrap" gap="md">
                <Group wrap="nowrap">
                  <ThemeIcon size="xl" variant="light" color="green" radius="md">
                    <IconFingerprint size={24} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600}>{pk.name}</Text>
                    <Text size="xs" c="dimmed">Creata il: {new Date(pk.createdAt || Date.now()).toLocaleDateString()}</Text>
                  </Box>
                </Group>
                <Group gap="xs">
                  <ActionIcon variant="light" onClick={() => {
                    setPasskeyName(pk.name || '');
                    setPasskeyModalAction({ type: 'rename', id: pk.id, defaultName: pk.name });
                  }}>
                    <IconEdit size={16} />
                  </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => setDeletePasskeyId(pk.id)}>
                      <IconTrash size={20} />
                  </ActionIcon>
                </Group>
              </Flex>
            </Paper>
          ))}
        </Stack>
        <Button
          loading={isAddingPasskey}
          onClick={() => {
            setPasskeyName('');
            setPasskeyPassword('');
            setPasskeyModalAction({ type: 'add' });
          }}
          leftSection={<IconFingerprint size={20} />}
          mt="md"
        >
          Collega nuova Passkey
        </Button>
      </Paper>

      <Paper withBorder p="md" radius="md" mb="lg" className='admin-paper-style'>
        <Title order={3} mb="md" size="h4">
          <Group>
            <IconDevices size={20} />
            <Text>Sessioni Attive</Text>
          </Group>
        </Title>
        <Text c="dimmed" mb="md">
          Questi sono i dispositivi attualmente connessi al tuo account. Se noti attività sospette, disconnettili.
        </Text>
        <Stack gap="sm">
          {(currentUser?.sessions || [])?.map((session: any) => {
            return (
              <Paper key={session.sessionId} withBorder p="sm" radius="md" style={{ background: 'rgba(0,0,0,0.01)' }}>
                <Flex align="center" justify="space-between" wrap="wrap" gap="md">
                  <Group wrap="nowrap">
                    <ThemeIcon size="xl" variant="light" color="blue" radius="md">
                      {session.device === 'mobile' ? <IconDeviceMobile size={24} /> : <IconDeviceDesktop size={24} />}
                    </ThemeIcon>
                    <Box>
                      <Group gap="xs" mb={4}>
                        <Text fw={600}>{session.browser || 'Browser Sconosciuto'} su {session.os || 'OS Sconosciuto'}</Text>
                        {currentUser?.currentSessionId === session.sessionId && (
                          <Badge color="green" variant="light" size="sm">Dispositivo attuale</Badge>
                        )}
                      </Group>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <IconMapPin size={14} style={{ opacity: 0.6 }} />
                          <Text size="sm" c="dimmed">{session.location || 'Località sconosciuta'} (IP: {session.ip || 'Sconosciuto'})</Text>
                        </Group>
                        <Group gap="xs">
                          <IconClock size={14} style={{ opacity: 0.6 }} />
                          <Text size="xs" c="dimmed">Ultimo utilizzo: {new Date(session.lastUsed).toLocaleString()}</Text>
                        </Group>
                      </Stack>
                    </Box>
                  </Group>
                  {currentUser?.currentSessionId !== session.sessionId && (
                    <Button 
                      variant="light" 
                      color="red" 
                      size="sm" 
                      leftSection={<IconTrashX size={16} />}
                      onClick={() => handleRevokeSession(session.sessionId)}
                    >
                      Disconnetti
                    </Button>
                  )}
                </Flex>
              </Paper>
            );
          })}
          {(!currentUser?.sessions || currentUser.sessions.length === 0) && (
            <Text c="dimmed" ta="center" py="md">Nessuna sessione trovata.</Text>
          )}
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md" mb="lg" style={{ borderColor: '#ff5252', background: 'rgba(255,0,0,0.02)' }} className='admin-paper-style'>
        <Title order={3} mb="md" size="h4" c="red">
          <Group>
            <IconTrash size={20} />
            <Text>Elimina Account</Text>
          </Group>
        </Title>
        <Text c="dimmed">
          Questa azione è irreversibile. Tutti i tuoi dati verranno eliminati permanentemente.
        </Text>
        <Divider my="sm" />
        <form onSubmit={deleteForm.onSubmit(() => setIsDeleteModalOpen(true))}>
          <Text c="dimmed" mb="sm">
            Per confermare l'eliminazione del tuo account, inserisci il tuo username:
            <Text fw={700} span> {currentUser?.username}</Text>
          </Text>
          <TextInput
            placeholder="Inserisci il tuo username"
            {...deleteForm.getInputProps('deleteConfirmation')}
          />
          <FormButtonBox
            loading={isUpdatingPassword}
            label='Elimina Account'
            disabled={!deleteForm.isValid()}
            color='red'
            hideCancel
            fullWidth
          />
        </form>

      </Paper>
      <YesOrNoModal
        open={isDeleteModalOpen}
        message={
          <Box className="center-flex-col">
            <Text size="lg" fw={500} mt="md" ta="center">
              Sei sicuro di voler eliminare il tuo account?
            </Text>
            <Text size="sm" c="dimmed" mt="xs" ta="center">
              Questa azione è irreversibile e rimuoverà completamente il tuo account e tutti i tuoi dati.
            </Text>
          </Box>
        }
        icon={<IconTrash size={50} color="#ff6b6b" />}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={deleteAccountHandler}
        confirmText="Elimina"
        cancelText="Annulla"
        confirmColor="red"
        title="Conferma eliminazione"
      />

      <YesOrNoModal
        open={!!deletePasskeyId}
        onClose={() => setDeletePasskeyId(null)}
        onConfirm={handleDeletePasskey}
        confirmText="Elimina passkey"
        cancelText="Annulla"
        confirmColor="red"
        title="Vuoi davvero eliminare questa passkey?"
        message="L'azione è irreversibile e non potrai più accedere con questa passkey."
      />

      <Modal
        opened={!!passkeyModalAction}
        onClose={() => setPasskeyModalAction(null)}
        title={passkeyModalAction?.type === 'add' ? "Aggiungi Passkey" : "Rinomina Passkey"}
        centered
      >
        <TextInput
          label="Nome della Passkey"
          placeholder="Es. iPhone di Mario"
          value={passkeyName}
          onChange={(e) => setPasskeyName(e.currentTarget.value)}
          data-autofocus
          mb={passkeyModalAction?.type === 'add' ? 'sm' : 'md'}
        />
        {passkeyModalAction?.type === 'add' && (
          <PasswordInput
            label="Password attuale"
            placeholder="Inserisci la password"
            value={passkeyPassword}
            onChange={(e) => setPasskeyPassword(e.currentTarget.value)}
            mb="md"
          />
        )}
        <Button fullWidth onClick={handleSavePasskeyName} disabled={!passkeyName.trim() || (passkeyModalAction?.type === 'add' && !passkeyPassword.trim())}>
          Salva
        </Button>
      </Modal>
    </Box>
  );
}
