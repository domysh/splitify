import { postRequest } from "@/utils/net";
import { Group, Modal, Space, TextInput, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router";
import { IconCircleCheck, IconFolderPlus } from "@tabler/icons-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLoading } from "@/utils/store";
import { inputStyles, modalOverlayProps, modalTransitionProps } from "@/styles/commonStyles";
import { FormButtonBox } from "@/commons/FormButtonBox";
import { PublicSwitch } from "@/commons/PublicSwitch";
import { ModalPaper } from "@/commons/ModalPaper";

interface BoardFormModalProps {
    open: boolean;
    onClose: () => void;
}

export const AddBoardModal = ({ open, onClose }: BoardFormModalProps) => {
    const { setLoading } = useLoading()
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const form = useForm({
        initialValues: {
            name: '',
            isPublic: false
        },
        validate: {
            name: (val) => !val ? "Il nome è obbligatorio" : null,
        }
    });

    
    useEffect(() => {
        if (open) return;
        form.reset()
    }, [open]);

    const handleSubmit = (values: typeof form.values) => {
        setLoading(true);
        postRequest("boards", { body: values }).then((res) => {
            if (res.id) {
                notifications.show({
                    title: "Board creata",
                    message: "La board è stata creata con successo",
                    color: "green",
                    icon: <IconCircleCheck size={20} />
                });                
                queryClient.invalidateQueries({ queryKey: ['boards'] });
                navigate(`/board/${res.id}`);    
                onClose();
            } else {
                notifications.show({
                    title: "Errore inaspettato",
                    message: res.detail ?? res ?? "Errore sconosciuto",
                    color: "red"
                });
            }
        }).catch((error) => {
            notifications.show({
                title: "Errore",
                message: error.message || "Si è verificato un errore durante l'operazione",
                color: "red"
            });
        }).finally(() => {
            setLoading(false);
        });
    };

    return (
        <Modal 
            opened={open} 
            onClose={onClose} 
            closeOnClickOutside={false}
            title={
                <Group gap="xs">
                    <IconFolderPlus color='#9ba3ff' />
                    <Text fw={600}>Aggiungi una nuova board</Text>
                </Group>
            } 
            centered 
            size="md"
            overlayProps={modalOverlayProps}
            transitionProps={modalTransitionProps}
        >
            <ModalPaper>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput
                        label={<Text fw={500} component="span">Nome Board</Text>}
                        withAsterisk
                        required
                        placeholder="Inserisci il nome della board..."
                        {...form.getInputProps("name")}
                        styles={inputStyles}
                    />
                    <Space h="lg" />
                    <PublicSwitch {...form.getInputProps("isPublic", { type: "checkbox" })}/>
                    <FormButtonBox
                        onCancel={onClose}
                        icon={<IconCircleCheck size={16} />}
                        label="Crea board"
                    />
                </form>
            </ModalPaper>
        </Modal>
    );
};
