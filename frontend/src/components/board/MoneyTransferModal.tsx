import { board } from "@/utils/types";
import { Group, Modal, Select, Text, Avatar, TextInput } from "@mantine/core";
import { useEffect, useState, useMemo } from "react";
import { notifications } from "@mantine/notifications";
import { postRequest } from "@/utils/net";
import { AdvancedNumberInput } from "@/commons/AdvancedNumberInput";
import Big from "big.js";
import { useForm } from "@mantine/form";
import { IconExchange, IconCircleCheck, IconShoppingCart } from "@tabler/icons-react";
import { dropdownStyles, inputStyles, modalOverlayProps } from "@/styles/commonStyles";
import { FormButtonBox } from "@/commons/FormButtonBox";
import { ModalPaper } from "@/commons/ModalPaper";
import { formatPrice, getInitials, hashColor } from "@/utils/formatters";

export interface MoneyTransferModalProps {
    board: board;
    open: boolean;
    onClose: () => void;
}

export const MoneyTransferModal = ({ board, open, onClose }:MoneyTransferModalProps) => {
    const [loading, setLoading] = useState(false);
    const [productSearchValue, setProductSearchValue] = useState('');
    const [fromMemberSearchValue, setFromMemberSearchValue] = useState('');
    const [toMemberSearchValue, setToMemberSearchValue] = useState('');

    const form = useForm({
        initialValues: {
            fromMember: '',
            toMember: '',
            amount: new Big(0),
            description: '',
            productId: ''
        },
        validate: {
            fromMember: (value, values) => {
                if (values.productId) {
                    if (!value && !values.toMember) return 'Per una spesa, specifica chi ha pagato o chi ha ricevuto';
                    return null;
                }
                if (!value && !values.toMember) return 'Specifica almeno un mittente o un destinatario';
                return null;
            },
            toMember: (value, values) => {
                if (value && value === values.fromMember) return 'Non puoi trasferire denaro allo stesso membro';
                return null;
            },
            amount: (value) => {
                if (!value || value.lte(0)) return 'Inserisci un importo valido maggiore di zero';
                return null;
            },
            description: (value) => {
                if (!value || value.trim().length === 0) return 'Inserisci una descrizione';
                return null;
            }
        }
    });

    useEffect(() => {
        if (form.values.productId && form.values.toMember) {
            form.setFieldValue('toMember', '');
        }
    }, [form.values.toMember, form.values.productId]);

    useEffect(() => {
        if (open) return
        form.reset();
    }, [open]);

    const memberOptions = useMemo(() => [
        { value: '', label: 'Nessuno' },
        ...board.members.map((member) => ({
            value: member.id,
            label: member.name,
        }))
    ], [board.members]);

    const productOptions = useMemo(() => [
        { value: '', label: 'Nessuna spesa' },
        ...board.products.map(product => ({
            value: product.id,
            label: `${product.name} (${formatPrice(product.price)})`
        }))
    ], [board.products]);

    const isProductTransaction = form.values.productId?true:false;

    useEffect(() => {
        if (isProductTransaction) {
            const selectedProduct = board.products.find(p => p.id === form.values.productId);
            if (selectedProduct) {
                form.setFieldValue('amount', new Big(selectedProduct.price).div(100));
                if (!form.values.description) {
                    if (form.values.fromMember && !form.values.toMember) {
                        form.setFieldValue('description', `Pagamento per ${selectedProduct.name}`);
                    } else if (!form.values.fromMember && form.values.toMember) {
                        form.setFieldValue('description', `Incasso per ${selectedProduct.name}`);
                    } else {
                        form.setFieldValue('description', `Transazione per ${selectedProduct.name}`);
                    }
                }
            }
        }
    }, [form.values.productId, form.values.fromMember, form.values.toMember, board]);

    const handleTransfer = async (values: typeof form.values) => {
        setLoading(true);
        const amountInCents = Math.round(values.amount.mul(100).toNumber());

        try {
            
            const transactionData = {
                fromMemberId: values.fromMember || null,
                toMemberId: values.toMember || null,
                amount: amountInCents,
                description: values.description.trim(),
                productId: values.productId || null
            };

            
            await postRequest(`transactions/${board.id}`, {
                body: transactionData
            });

            notifications.show({
                title: "Transazione completata",
                message: `Transazione registrata con successo`,
                color: "green",
                icon: <IconCircleCheck size={20} />
            });
            onClose();
            form.reset();
        } catch (error: any) {
            notifications.show({
                title: "Errore nella transazione",
                message: error.message || "Si è verificato un errore durante la registrazione",
                color: "red"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isProductTransaction) {
            form.setFieldValue('toMember', '');
        }
    }, [isProductTransaction]);
    
    useEffect(() => {
        if (open) return
        setProductSearchValue('');
        setFromMemberSearchValue('');
        setToMemberSearchValue('');
    }, [open]);

    
    const selectCommonProps = {
        maxDropdownHeight: 200,
        clearable: true,
        styles: dropdownStyles,
        onFocus: () => setProductSearchValue(""),
        onClick: () => setProductSearchValue(""),
    };

    return (
        <Modal 
            opened={open} 
            onClose={onClose} 
            closeOnClickOutside={false}
            title={
                <Group gap="xs">
                    {isProductTransaction ? <IconShoppingCart style={{ color: "#9ba3ff" }} /> : <IconExchange style={{ color: "#9ba3ff" }} />}
                    <Text fw={700} size="lg" style={{ color: "#f0f0ff" }}>
                        {isProductTransaction ? "Transazione Spesa" : "Nuova Transazione"}
                    </Text>
                </Group>
            }
            centered
            size="md"
            overlayProps={modalOverlayProps}
        >
            <ModalPaper>
            <form onSubmit={form.onSubmit(handleTransfer)}>
                <Select
                    label="Spesa (opzionale)"
                    placeholder="Associa a una spesa"
                    data={productOptions}
                    searchable
                    searchValue={productSearchValue}
                    onSearchChange={setProductSearchValue}
                    {...selectCommonProps}
                    {...form.getInputProps('productId')}
                />
                
                <Group align="flex-start" gap="md" grow mt="md">
                    <Select
                        label={isProductTransaction ? "Chi ha pagato" : "Da (mittente)"}
                        placeholder="Seleziona membro"
                        data={memberOptions}
                        searchable
                        searchValue={fromMemberSearchValue}
                        onSearchChange={setFromMemberSearchValue}
                        renderOption={({ option }) => (
                            <Group gap="sm">
                                <Avatar 
                                    radius="xl" 
                                    size="sm" 
                                    color={hashColor(option.label)} 
                                    src={null}
                                >
                                    {option.value ? getInitials(option.label) : ''}
                                </Avatar>
                                <Text fw={500}>{option.label}</Text>
                            </Group>
                        )}
                        {...selectCommonProps}
                        {...form.getInputProps('fromMember')}
                    />
                    
                    {!isProductTransaction && (
                        <Select
                            label="A (destinatario)"
                            placeholder="Seleziona membro"
                            data={memberOptions}
                            searchable
                            searchValue={toMemberSearchValue}
                            onSearchChange={setToMemberSearchValue}
                            renderOption={({ option }) => (
                                <Group gap="sm">
                                    <Avatar 
                                        radius="xl" 
                                        size="sm" 
                                        color={hashColor(option.label)} 
                                        src={null}
                                    >
                                        {option.value ? getInitials(option.label) : ''}
                                    </Avatar>
                                    <Text fw={500}>{option.label}</Text>
                                </Group>
                            )}
                            {...selectCommonProps}
                            {...form.getInputProps('toMember')}
                        />
                    )}
                </Group>
                
                <Group align="flex-start" gap="md" grow mt="md">
                    <AdvancedNumberInput
                        label="Importo (€)"
                        placeholder="0,00"
                        styles={inputStyles}
                        {...form.getInputProps('amount')}
                    />
                </Group>
                
                {!isProductTransaction && <TextInput
                    label="Descrizione"
                    placeholder="Inserisci una descrizione per la transazione"
                    required
                    mt="md"
                    {...form.getInputProps('description')}
                    styles={inputStyles}
                />}
                <FormButtonBox
                    icon={isProductTransaction ? <IconShoppingCart size={16} /> : <IconExchange size={16} />}
                    label={isProductTransaction ? 'Registra Spesa' : 'Registra Transazione'}
                    onCancel={onClose}
                    loading={loading}
                />
            </form>
            </ModalPaper>
        </Modal>
    );
};
