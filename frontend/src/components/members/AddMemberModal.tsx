import {
    Avatar,
    Badge,
    Box,
    Divider,
    Group,
    Modal,
    MultiSelect,
    Paper,
    Space,
    Text,
    TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo } from "react";
import {
    IconCircleCheck,
    IconUserPlus
} from "@tabler/icons-react";
import { board } from "@/utils/types";
import { postRequest } from "@/utils/net";
import { useLoading } from "@/utils/store";
import {
    dropdownStyles,
    inputStyles,
    modalOverlayProps,
    modalTransitionProps,
} from "@/styles/commonStyles";
import { FormButtonBox } from "@/commons/FormButtonBox";
import { ModalPaper } from "@/commons/ModalPaper";
import { formatPrice, getInitials, hashColor } from "@/utils/formatters";
import { useMobile } from "@/utils/hooks";

interface MemberFormValues {
    name: string;
    paid: number;
    categories: string[];
}

export interface AddMemberModalProps {
    open: boolean;
    onClose: () => void;
    board: board;
    closeOnEnd?: boolean;
}

export const AddMemberModal = ({
    open,
    onClose,
    board,
    closeOnEnd,
}: AddMemberModalProps) => {
    const { setLoading } = useLoading();
    const isMobile = useMobile();

    const formAdd = useForm<MemberFormValues>({
        initialValues: {
            name: "",
            paid: 0,
            categories: [],
        },
        validate: {
            name: (val) => (val == "" ? "Il nome è obbligatorio" : null),
            paid: (val) =>
                val < 0 ? "Il saldo non può essere negativo!" : null,
        },
    });

    useEffect(() => {
        if (formAdd) formAdd.reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const categoryOptions = useMemo(
        () =>
            board.categories
                .sort((a, b) => a.order - b.order)
                .map((category) => ({
                    value: category.id,
                    label: category.name,
                })),
        [board.categories],
    );

    const handleSubmit = (values: MemberFormValues) => {
        setLoading(true);
        postRequest("boards/" + board.id + "/members", {
            body: {
                ...values,
                paid: parseInt((values.paid * 100).toString()),
            },
        })
            .then((res) => {
                if (res.id) {
                    notifications.show({
                        title: "Membro creato",
                        message: "Il membro è stato creato con successo",
                        color: "green",
                        icon: <IconCircleCheck size={20} />,
                    });
                    if (closeOnEnd) {
                        onClose();
                    } else {
                        formAdd.reset();
                    }
                } else {
                    notifications.show({
                        title: "Errore inaspettato",
                        message: res.detail ?? res ?? "Errore sconosciuto",
                        color: "red",
                    });
                }
            })
            .finally(() => {
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
                    <IconUserPlus color="#9ba3ff" />
                    <Text fw={600}>Aggiungi un nuovo membro</Text>
                </Group>
            }
            centered
            size={isMobile ? "95%" : "md"}
            overlayProps={modalOverlayProps}
            transitionProps={modalTransitionProps}
        >
            <Space h="md" />
            <ModalPaper>
                <form onSubmit={formAdd.onSubmit(handleSubmit)}>
                    <Group align="flex-start" gap={10}>
                        <Box style={{ flex: 1 }}>
                            <TextInput
                                label={
                                    <Text
                                        fw={500}
                                        size="sm"
                                        mb={5}
                                        style={{ letterSpacing: "0.3px" }}
                                    >
                                        Nome Membro{" "}
                                        <span style={{ color: "#ff6b6b" }}>
                                            *
                                        </span>
                                    </Text>
                                }
                                placeholder="Inserisci il nome del membro..."
                                required
                                data-autofocus
                                autoFocus
                                withAsterisk={false}
                                {...formAdd.getInputProps("name")}
                                styles={inputStyles}
                            />

                            <Space h="md" />
                            <Text
                                fw={500}
                                size="sm"
                                mb={5}
                                style={{ letterSpacing: "0.3px" }}
                            >
                                Categorie
                            </Text>
                            <MultiSelect
                                placeholder="Seleziona le categorie"
                                data={categoryOptions}
                                value={formAdd.values.categories}
                                onChange={(value) =>
                                    formAdd.setFieldValue("categories", value)
                                }
                                comboboxProps={{ withinPortal: !isMobile }}
                                searchable
                                maxDropdownHeight={200}
                                styles={dropdownStyles}
                            />

                        </Box>

                        <Paper p="md" radius="md" className="paper-element-box">
                            <Box
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "15px",
                                }}
                            >
                                <Avatar
                                    color={hashColor(
                                        formAdd.values.name || "Membro",
                                    )}
                                    radius="xl"
                                    size="md"
                                >
                                    {getInitials(formAdd.values.name)}
                                </Avatar>
                                <Box>
                                    <Text fw={500} size="sm" lineClamp={1}>
                                        {formAdd.values.name || "Nome membro"}
                                    </Text>
                                    {(formAdd.values.paid > 0) && (
                                        <Badge
                                            mt={5}
                                            color={
                                                formAdd.values.paid > 0
                                                    ? "red"
                                                    : "blue"
                                            }
                                            variant="filled"
                                        >
                                            {formatPrice(formAdd.values.paid)}
                                        </Badge>
                                    )}
                                </Box>
                            </Box>

                            {formAdd.values.categories.length > 0 && (
                                <>
                                    <Divider my="xs" variant="dashed" />
                                    <Text size="xs" c="dimmed" mb={5}>
                                        Categorie:
                                    </Text>
                                    <Group gap={5}>
                                        {formAdd.values.categories.map(
                                            (catId) => {
                                                const category =
                                                    board.categories.find(
                                                        (c) => c.id === catId,
                                                    );
                                                return category ? (
                                                    <Badge
                                                        key={catId}
                                                        color="indigo"
                                                        variant="light"
                                                        size="sm"
                                                    >
                                                        {category.name}
                                                    </Badge>
                                                ) : null;
                                            },
                                        )}
                                    </Group>
                                </>
                            )}
                        </Paper>
                    </Group>
                    <FormButtonBox
                        icon={<IconUserPlus size={16} />}
                        label="Aggiungi Membro"
                        onCancel={onClose}
                    />
                </form>
            </ModalPaper>
        </Modal>
    );
};
