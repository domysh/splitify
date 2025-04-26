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
  Checkbox
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useCurrentUser } from '@/utils/hooks';
import { useAuth, useHeader, useLoading, useRouteFunctions } from '@/utils/store';
import { IconUser, IconKey, IconTrash } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteRequest, putRequest } from '@/utils/net';
import { HomeButton } from '@/commons/Buttons';
import { FormButtonBox } from '@/commons/FormButtonBox';
import { usernameValidator } from '@/utils';
import { YesOrNoModal } from '@/commons/YesOrNoModal';
import { checkboxStyles } from '@/styles/commonStyles';

export default function UserProfilePage() {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const navigate = useRouteFunctions(props => props.navigate);
  const setHeader = useHeader(props => props.setHeader);
  const { setLoading } = useLoading();
  
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
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
        queryClient.invalidateQueries({ queryKey: ['user'] });
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
        <Title order={3} mb="md" size="h4">
          <Group>
            <IconKey size={20} />
            <Text>Modifica Password</Text>
          </Group>
        </Title>
        <form onSubmit={passwordForm.onSubmit(updatePasswordHandler)}>
          <PasswordInput
            label="Password attuale"
            autoComplete="current-password"
            placeholder="Inserisci la password attuale"
            mb="md"
            {...passwordForm.getInputProps('currentPassword')}
          />
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
          <FormButtonBox
            loading={isUpdatingPassword}
            label='Aggiorna Password'
            hideCancel
            disabled={passwordForm.values.newPassword === '' || passwordForm.values.confirmPassword === '' || passwordForm.values.currentPassword === ''}
          />
        </form>
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
    </Box>
  );
}
