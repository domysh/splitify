import { postRequest } from "@/utils/net";
import { Avatar, Badge, Box, Checkbox, Divider, Group, Modal, MultiSelect, Paper, Select, Space, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo, useState } from "react";
import { AdvancedNumberInput } from "@/commons/AdvancedNumberInput";
import { useLoading } from "@/utils/store";
import { dropdownStyles, inputStyles, modalOverlayProps, modalTransitionProps } from "@/styles/commonStyles";
import { FormButtonBox } from "@/commons/FormButtonBox";
import { board } from "@/utils/types";
import Big from "big.js";
import { formatPrice, getInitials, hashColor } from "@/utils/formatters";
import { useMobile } from "@/utils/hooks";
import { IconCircleCheck, IconShoppingBag } from "@tabler/icons-react";

export interface AddProductModalProps {
    open: boolean;
    onClose: () => void;
    board: board;
    closeOnEnd?: boolean;
}

export interface ProductFormValues {
    name: string;
    price: Big;
    memberId?: string;
    categories: string[];
}

export const AddProductModal = ({ open, onClose, board, closeOnEnd }: AddProductModalProps) => {
    const { setLoading } = useLoading();
    const isMobile = useMobile()
    const [acknowledgeNoPayer, setAcknowledgeNoPayer] = useState(false);
    const [memberSearchValue, setMemberSearchValue] = useState('');
    
    const formAdd = useForm<ProductFormValues>({
        initialValues: {
            name: "",
            price: new Big(0),
            memberId: "",  
            categories: [],  
        },
        validate: {
            name: (val) => val == ""? "Il nome è obbligatorio" : null,
            price: (val) => val.lt(0)? "Il prezzo non può essere negativo!" : null,
            memberId: (val) => {
                
                if (!acknowledgeNoPayer && !val) {
                    return "Seleziona un pagante o spunta 'Non specificare chi ha pagato'";
                }
                return null;
            }
        },
    });
    
    useEffect(() => {
        formAdd.reset();
        setAcknowledgeNoPayer(false);
    }, [open]);
    
    
    useEffect(() => {
        if (formAdd.values.memberId) {
            setAcknowledgeNoPayer(false);
        }
    }, [formAdd.values.memberId]);
    
    
    const handleSearchFocus = () => {
        setMemberSearchValue('');
    };

    
    const memberOptions = useMemo(() => [
        { value: '', label: '' },
        ...board.members.map((member) => ({
            value: member.id,
            label: member.name,
        }))
    ], [board.members]);
    
    
    const categoryOptions = useMemo(() => 
        board.categories
            .sort((a, b) => a.order - b.order)
            .map((category) => ({
                value: category.id,
                label: category.name,
            })),
    [board.categories]);
    
    const handleSubmit = (values: ProductFormValues) => {
        setLoading(true);
        postRequest("boards/"+board.id+"/products", {
            body: { 
                ...values, 
                price: Math.floor(values.price.mul(100).toNumber()),
                memberId: values.memberId || undefined
            }
        })
        .then((res) => {
            if (res.id){
                notifications.show({
                    title: "Spesa creata",
                    message: "La spesa è stato creato con successo",
                    color: "green",
                    icon: <IconCircleCheck size={20} />
                });
                if (closeOnEnd) {
                    onClose();
                }else{
                    formAdd.reset();
                    setAcknowledgeNoPayer(false);
                }
            } else {
                notifications.show({
                    title: "Errore inaspettato",
                    message: res.detail??res??"Errore sconosciuto",
                    color: "red"
                });
            }
        }).finally(() => {
            setLoading(false);
        });
    };
    
    
    const selectedMember = useMemo(() => {
        if (!formAdd.values.memberId) return null;
        return board.members.find(m => m.id === formAdd.values.memberId);
    }, [formAdd.values.memberId, board.members]);
    
    return (
        <Modal 
            opened={open} 
            onClose={onClose} 
            closeOnClickOutside={false}
            title={
                <Group gap="xs">
                    <IconShoppingBag color='#9ba3ff' />
                    <Text fw={600}>Aggiungi una nuova spesa</Text>
                </Group>
            }
            centered
            size={isMobile ? "95%" : "md"}
            overlayProps={modalOverlayProps}
            transitionProps={modalTransitionProps}
        >
            <Space h="md" />
            <Paper 
                p="md" 
                radius="md" 
                style={{
                    background: 'rgba(26, 26, 32, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <form onSubmit={formAdd.onSubmit(handleSubmit)}>
                    <Group align="flex-start" gap={24}>
                        <Box style={{ flex: 1 }}>
                            <TextInput
                                label={<Text fw={500} size="sm" mb={5} style={{ letterSpacing: '0.3px' }}>Nome Spesa <span style={{color: "#ff6b6b"}}>*</span></Text>}
                                placeholder="Inserisci il nome della spesa"
                                required
                                data-autofocus
                                autoFocus
                                withAsterisk={false}
                                {...formAdd.getInputProps("name")}
                                styles={inputStyles}
                            />
                            <Space h="md" />
                            <Text fw={500} size="sm" mb={5} style={{ letterSpacing: '0.3px' }}>Prezzo <span style={{color: "#ff6b6b"}}>*</span></Text>
                            <Group align="center">
                                <AdvancedNumberInput
                                    min={0}
                                    required
                                    placeholder="Inserisci il prezzo..."
                                    {...formAdd.getInputProps("price")}
                                    styles={inputStyles}
                                />
                            </Group>
                            
                            <Space h="md" />
                            <Text fw={500} size="sm" mb={5} style={{ letterSpacing: '0.3px' }}>Categorie</Text>
                            <MultiSelect
                                placeholder={formAdd.values.categories.length === 0?"Pagano tutti i membri":"Seleziona altre categorie"}
                                data={categoryOptions}
                                value={formAdd.values.categories}
                                onChange={(value) => formAdd.setFieldValue("categories", value)}
                                searchable
                                clearable
                                maxDropdownHeight={200}
                                styles={dropdownStyles}
                                hidePickedOptions
                            />
                            
                            <Space h="md" />
                            <Text fw={500} size="sm" mb={5}>
                                Chi ha pagato?
                            </Text>
                                                        
                            {!acknowledgeNoPayer && (
                                <Select
                                    label="Pagato da"
                                    placeholder="Seleziona chi ha pagato"
                                    data={memberOptions}
                                    clearable
                                    searchable
                                    searchValue={memberSearchValue}
                                    onSearchChange={setMemberSearchValue}
                                    onFocus={handleSearchFocus}
                                    disabled={acknowledgeNoPayer}
                                    {...formAdd.getInputProps('memberId')}
                                    styles={dropdownStyles}
                                    required
                                />
                            )}

                            <Checkbox
                                label={
                                    <Text size="sm" style={{ fontWeight: 500 }}>
                                        Non specificare chi ha pagato questa spesa
                                    </Text>
                                }
                                checked={acknowledgeNoPayer}
                                onChange={(e) => {
                                    const isChecked = e.currentTarget.checked;
                                    setAcknowledgeNoPayer(isChecked);
                                    
                                    if (isChecked) {
                                        formAdd.setFieldValue("memberId", "");
                                    }
                                }}
                                mt="sm"
                                styles={{
                                    input: {
                                        cursor: 'pointer',
                                        backgroundColor: acknowledgeNoPayer ? 'rgba(255, 169, 77, 0.2)' : undefined
                                    },
                                    label: {
                                        cursor: 'pointer'
                                    }
                                }}
                            />
                            
                            {acknowledgeNoPayer ? (
                                <Paper
                                    p="xs"
                                    mt="xs"
                                    withBorder
                                    radius="md"
                                    style={{
                                        background: 'rgba(255, 169, 77, 0.05)',
                                        borderColor: 'rgba(255, 169, 77, 0.3)'
                                    }}
                                >
                                    <Text size="sm" c="orange.6" fw={500}>
                                        Hai scelto di non specificare chi ha pagato
                                    </Text>
                                    <Text size="xs" c="orange.7" mt={5}>
                                        Non specificare chi ha pagato rende difficile tracciare correttamente i saldi.
                                        Dovrai registrare il pagamento manualmente in seguito tramite "Trasferisci denaro".
                                    </Text>
                                </Paper>
                            ) : null}
                        </Box>
                        <Paper p="md" radius="md" className="paper-element-box">
                            <Box style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <Avatar
                                    color={hashColor(formAdd.values.name)}
                                    radius="xl"
                                    size="md"
                                >
                                    {getInitials(formAdd.values.name)}
                                </Avatar>
                                <Box>
                                    <Text fw={500} size="sm" lineClamp={1}>
                                        {formAdd.values.name || "Nome spesa"}
                                    </Text>
                                    <Badge mt={5} color="orange" variant="filled">
                                        {formatPrice(formAdd.values.price)}
                                    </Badge>
                                </Box>
                            </Box>
                            
                            {formAdd.values.categories.length > 0 && (
                                <>
                                    <Divider my="sm" variant="dashed" />
                                    <Text size="xs" c="dimmed" mb={5}>Categorie:</Text>
                                    <Group gap={5}>
                                        {formAdd.values.categories.map(catId => {
                                            const category = board.categories.find(c => c.id === catId);
                                            return category ? (
                                                <Badge key={catId} color="indigo" variant="light" size="sm">
                                                    {category.name}
                                                </Badge>
                                            ) : null;
                                        })}
                                    </Group>
                                </>
                            )}
                            {selectedMember && (
                                <>
                                    <Divider my="sm" variant="dashed" />
                                    <Group gap={5}>
                                        <Avatar
                                            color={hashColor(selectedMember.id)}
                                            radius="xl"
                                            size="sm"
                                        >
                                            {getInitials(selectedMember.name)}
                                        </Avatar>
                                        <Box>
                                            <Text size="xs" c="dimmed">Pagato da</Text>
                                            <Text size="sm" fw={500}>{selectedMember.name}</Text>
                                        </Box>
                                    </Group>
                                </>
                            )}
                        </Paper>
                    </Group>
                    <FormButtonBox
                        icon={<IconShoppingBag size={16} />}
                        onCancel={onClose}
                        label="Aggiungi Spesa"
                    />
                </form>
            </Paper>
        </Modal>
    );
};
