import { postRequest } from "@/utils/net";
import { board } from "@/utils/types";
import { Group, Modal, TextInput, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect } from "react";
import { IconCategory, IconCircleCheck } from "@tabler/icons-react";
import { useLoading } from "@/utils/store";
import { inputStyles, modalOverlayProps, modalTransitionProps } from "@/styles/commonStyles";
import { FormButtonBox } from "@/commons/FormButtonBox";
import { ModalPaper } from "@/commons/ModalPaper";

interface AddCategoryModalProps {
    open: boolean;
    onClose: () => void;
    board: board;
    closeOnEnd?: boolean;
}

interface CategoryFormValues {
    name: string;
}

export const AddCategoryModal = ({ open, onClose, board, closeOnEnd }: AddCategoryModalProps) => {
    const { setLoading } = useLoading();
    const formAdd = useForm<CategoryFormValues>({
        initialValues: {
            name: "",
        },
        validate: {
            name: (val) => val == ""? "Il nome è obbligatorio" : null,
        },
    });

    
    useEffect(() => {
        if (open) formAdd.reset();
    }, [open]);

    
    const handleSubmit = formAdd.onSubmit((values) => {
        setLoading(true);
        postRequest("boards/"+board.id+"/categories", {body: values})
        .then((res) => {
            if (res.id){
                notifications.show({
                    title: "Categoria creata",
                    message: "La categoria è stata creata con successo",
                    color: "green",
                    icon: <IconCircleCheck size={20} />
                })
                if (closeOnEnd) {
                    onClose();
                }else{
                    formAdd.reset();
                }
            } else {
                notifications.show({
                    title: "Errore inaspettato",
                    message: res.detail??res??"Errore sconosciuto",
                    color: "red"
                })
            }
        }).finally(() => {
            setLoading(false);
        });
    });

    return (
        <Modal 
            opened={open} 
            onClose={onClose} 
            closeOnClickOutside={false}
            title={
                <Group gap="xs">
                    <IconCategory color='#9ba3ff' />
                    <Text fw={600}>Aggiungi una nuova categoria</Text>
                </Group>
            }
            centered
            size="md"
            overlayProps={modalOverlayProps}
            transitionProps={modalTransitionProps}
        >
            <ModalPaper>
                <form onSubmit={handleSubmit}>
                    <TextInput
                        label={<Text fw={500} size="sm" mb={5} style={{ letterSpacing: '0.3px' }}>Nome Categoria <span style={{color: "#ff6b6b"}}>*</span></Text>}
                        placeholder="Inserisci il nome della categoria..."
                        required
                        data-autofocus
                        autoFocus
                        withAsterisk={false}
                        {...formAdd.getInputProps("name")}
                        styles={inputStyles}
                    />
                    <FormButtonBox 
                        onCancel={onClose}
                        icon={<IconCategory size={16} />}
                        label="Crea"
                    />
                </form>
            </ModalPaper>
        </Modal>
    );
};
