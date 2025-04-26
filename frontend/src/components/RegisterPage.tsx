import { RegisterForm } from "@/components/RegisterForm";
import { RegistrationMode } from "@/utils/types";
import { Box, Loader, Text, Title, Alert, Button } from "@mantine/core";
import { useNavigate } from "react-router";
import { registrationInfoQuery } from "@/utils/queries";
import { IconArrowNarrowLeft } from "@tabler/icons-react";

const RegisterPage = () => {
    const navigate = useNavigate();
    const registrationInfo = registrationInfoQuery()

    const registrationMode = (registrationInfo.data?.mode)??RegistrationMode.PRIVATE;
    
    if (registrationInfo.isLoading) {
        return (
            <Box className="center-flex-col" py="xl">
                <Loader size="md" />
                <Text c="dimmed" mt="md">Verifica dello stato di registrazione...</Text>
            </Box>
        );
    }

    
    if (registrationMode === RegistrationMode.PRIVATE) {
        return (
            <Box className="center-flex-col" py="xl">
                <Alert color="red" title="Registrazione non disponibile" mb="md">
                    La registrazione di nuovi account è attualmente disabilitata.
                </Alert>
                <Button 
                    leftSection={<IconArrowNarrowLeft size={14} />}
                    variant="light"
                    onClick={() => navigate("/")}
                    mt="md"
                >
                    Torna alla pagina di login
                </Button>
            </Box>
        );
    }

    return (
        <Box py="md">
            <Box mb={30} className="center-flex-col">
                <Title 
                    order={2} 
                    mb="xs" 
                    style={{ 
                        color: 'white',
                        fontWeight: 700,
                        textAlign: 'center'
                    }}
                >
                    Crea un nuovo account
                </Title>
                <Text size="md" color="dimmed" mb="xl" ta="center">
                    Registrati per iniziare a utilizzare Splitify
                </Text>
            </Box>
            
            <RegisterForm 
                onSuccess={() => navigate("/")} 
                onCancel={() => navigate("/")}
                registrationMode={registrationMode || RegistrationMode.PUBLIC}
            />
        </Box>
    );
};

export default RegisterPage;