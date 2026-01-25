import { board } from "@/utils/types";
import { Group, Modal, Select, Text, Avatar, TextInput } from "@mantine/core";
import { useEffect, useState, useMemo } from "react";
import { notifications } from "@mantine/notifications";
import { postRequest } from "@/utils/net";
import { AdvancedNumberInput } from "@/commons/AdvancedNumberInput";
import Big from "big.js";
import { useForm } from "@mantine/form";
import { IconExchange, IconCircleCheck } from "@tabler/icons-react";
import { dropdownStyles, inputStyles, modalOverlayProps } from "@/styles/commonStyles";
import { FormButtonBox } from "@/commons/FormButtonBox";
import { ModalPaper } from "@/commons/ModalPaper";
import { getInitials, hashColor } from "@/utils/formatters";

export interface MoneyTransferModalProps {
    board: board;
    open: boolean;
    onClose: () => void;
}

export const MoneyTransferModal = ({ board, open, onClose }: MoneyTransferModalProps) => {
    const [loading, setLoading] = useState(false);
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
                if (!value) return 'Il mittente è obbligatorio';
                if (!value && !values.toMember) return 'Specifica almeno un mittente o un destinatario';
                return null;
            },
            toMember: (value, values) => {
                if (value && value === values.fromMember) return 'Non puoi trasferire denaro allo stesso membro';
                if (!value && !values.productId) return 'Il destinatario è obbligatorio';
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
        ...board.members.map((member) => ({
            value: member.id,
            label: member.name,
        }))
    ], [board.members]);


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
        if (open) return
        setFromMemberSearchValue('');
        setToMemberSearchValue('');
    }, [open]);




    return (
        <Modal
            opened={open}
            onClose={onClose}
            closeOnClickOutside={false}
            title={
                <Group gap="xs">
                    <IconExchange style={{ color: "#9ba3ff" }} />
                    <Text fw={700} size="lg" style={{ color: "#f0f0ff" }}>
                        Nuova Transazione
                    </Text>
                </Group>
            }
            centered
            size="md"
            overlayProps={modalOverlayProps}
        >
            <ModalPaper>
                <form onSubmit={form.onSubmit(handleTransfer)}>


                    <Group align="flex-start" gap="md" grow>
                        <Select
                            label={"Da (mittente)"}
                            placeholder="Seleziona membro"
                            data={memberOptions}
                            searchable
                            searchValue={fromMemberSearchValue}
                            onSearchChange={setFromMemberSearchValue}
                            styles={dropdownStyles}
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
                            {...form.getInputProps('fromMember')}
                        />


                        <Select
                            label="A (destinatario)"
                            placeholder="Seleziona membro"
                            data={memberOptions}
                            searchable
                            searchValue={toMemberSearchValue}
                            onSearchChange={setToMemberSearchValue}
                            styles={dropdownStyles}
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
                            maxDropdownHeight={200}
                            clearable
                            {...form.getInputProps('toMember')}
                        />

                    </Group>

                    <Group align="flex-start" gap="md" grow mt="md">
                        <AdvancedNumberInput
                            label="Importo (€)"
                            placeholder="0,00"
                            styles={inputStyles}
                            {...form.getInputProps('amount')}
                        />
                    </Group>

                    <TextInput
                        label="Descrizione"
                        placeholder="Inserisci una descrizione per la transazione"
                        required
                        mt="md"
                        {...form.getInputProps('description')}
                        styles={inputStyles}
                    />
                    <FormButtonBox
                        icon={<IconExchange size={16} />}
                        label='Registra Transazione'
                        onCancel={onClose}
                        loading={loading}
                    />
                </form>
            </ModalPaper>
        </Modal>
    );
};
