import { putRequest } from "@/utils/net";
import {
    Badge,
    Box,
    Button,
    Card,
    Group,
    Loader,
    Modal,
    Space,
    Table,
    Text,
    Transition,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BottomEditControl } from "@/commons/BottomEditControl";
import { AddProductModal } from "@/components/products/AddProductModal";
import { ProductCardMemo, ProductRow } from "@/components/products/ProductRow";
import { useLoading } from "@/utils/store";
import { modalOverlayProps } from "@/styles/commonStyles";
import { ModalPaper } from "@/commons/ModalPaper";
import { board } from "@/utils/types";
import { formatPrice, toIntValue } from "@/utils/formatters";
import { useMobile } from "@/utils/hooks";
import {
    IconCircleCheck,
    IconMeat,
    IconShoppingBag,
} from "@tabler/icons-react";
import { EditHeader } from "@/commons/EditHeader";
import { ResponsivePager } from "@/commons/ResponsivePager";

export interface ProductEdits {
    [id: string]: {
        name?: string;
        price?: number;
    };
}

export interface ProductSettingsModalProps {
    open: boolean;
    onClose: () => void;
    board: board;
}

const ITEMS_PER_PAGE = 8;

export const ProductSettingsModal = ({
    open,
    onClose,
    board,
}: ProductSettingsModalProps) => {
    const { setLoading } = useLoading();
    const [openAddProduct, setOpenAddProduct] = useState<boolean>(false);
    const [edits, setEdits] = useState<ProductEdits>({});
    const [animateTable, setAnimateTable] = useState<boolean>(false);
    const [savingChanges, setSavingChanges] = useState<boolean>(false);
    const isMobile = useMobile();
    const [currentPage, setCurrentPage] = useState<number>(1);

    useEffect(() => {
        setEdits({});
        if (open) {
            setTimeout(() => setAnimateTable(true), 100);
        } else {
            setAnimateTable(false);
            setCurrentPage(1);
        }
    }, [open]);

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return board.products.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [board.products, currentPage]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(board.products.length / ITEMS_PER_PAGE)),
        [board.products.length],
    );

    const clearDrafts = useCallback(
        (drafts: ProductEdits): ProductEdits => {
            const newDrafts = { ...drafts };
            board.products.forEach((prod) => {
                if (newDrafts[prod.id] == null) {
                    newDrafts[prod.id] = {};
                }
                const invalidName =
                    newDrafts[prod.id]?.name == prod.name ||
                    newDrafts[prod.id]?.name == null;
                const invalidPrice =
                    newDrafts[prod.id]?.price == prod.price ||
                    newDrafts[prod.id]?.price == null;
                if (invalidName) delete newDrafts[prod.id].name;
                if (invalidPrice) delete newDrafts[prod.id].price;
                if (invalidName && invalidPrice) delete newDrafts[prod.id];
            });
            return newDrafts;
        },
        [board.products],
    );

    const handleSaveChanges = useCallback((): void => {
        setSavingChanges(true);
        setLoading(true);
        Promise.all(
            Object.entries(edits).map(([id, data]) =>
                putRequest("boards/" + board.id + "/products/" + id, {
                    body: {
                        ...(board.products.find((prod) => prod.id == id) ?? {}),
                        ...data,
                    },
                }),
            ),
        )
            .then(() => {
                notifications.show({
                    title: "Spese aggiornate",
                    message: "Le spese sono stati aggiornati con successo",
                    color: "green",
                    icon: <IconCircleCheck size={20} />,
                });
            })
            .finally(() => {
                setEdits({});
                setLoading(false);
                setSavingChanges(false);
            });
    }, [board.id, board.products, edits, setLoading]);

    const handleNameChange = useCallback(
        (id: string, value: string): void => {
            setEdits((prevEdits) => {
                const newEdits = { ...prevEdits };
                if (!newEdits[id]) newEdits[id] = {};
                newEdits[id].name = value;
                return clearDrafts(newEdits);
            });
        },
        [clearDrafts],
    );

    const handlePriceChange = useCallback(
        (id: string, value: string | number): void => {
            setEdits((prevEdits) => {
                const newEdits = { ...prevEdits };
                if (!newEdits[id]) newEdits[id] = {};
                newEdits[id].price = toIntValue(value);
                return clearDrafts(newEdits);
            });
        },
        [clearDrafts],
    );

    const resetEdits = useCallback(() => {
        setEdits({});
        notifications.show({
            title: "Modifiche annullate",
            message: "Le modifiche sono state annullate con successo",
            color: "blue",
        });
    }, []);

    const rows = useMemo(
        () =>
            paginatedProducts.map((prod, index) => (
                <ProductRow
                    key={prod.id}
                    product={prod}
                    index={index}
                    animateTable={animateTable}
                    handleNameChange={handleNameChange}
                    handlePriceChange={handlePriceChange}
                    edits={edits}
                    board={board}
                />
            )),
        [
            paginatedProducts,
            animateTable,
            handleNameChange,
            handlePriceChange,
            edits,
            board,
        ],
    );

    const cardRows = useMemo(
        () =>
            paginatedProducts.map((prod, index) => (
                <ProductCardMemo
                    key={prod.id}
                    product={prod}
                    index={index}
                    animateTable={animateTable}
                    handleNameChange={handleNameChange}
                    handlePriceChange={handlePriceChange}
                    edits={edits}
                    board={board}
                />
            )),
        [
            paginatedProducts,
            animateTable,
            handleNameChange,
            handlePriceChange,
            edits,
            board,
        ],
    );

    const totalPrice = useMemo(
        () =>
            [0]
                .concat(board.products.map((v) => v.price))
                .reduce((acc, val) => acc + val),
        [board.products],
    );

    return (
        <>
            <Modal
                opened={open}
                onClose={onClose}
                closeOnClickOutside={false}
                title={
                    <Group gap="xs">
                        <IconShoppingBag color="#9ba3ff" />
                        <Text fw={600}>Spese - {board.name}</Text>
                    </Group>
                }
                centered
                fullScreen
                overlayProps={modalOverlayProps}
                transitionProps={{
                    transition: "fade",
                    duration: 300,
                }}
            >
                <ModalPaper>
                    <EditHeader
                        addAction={() => setOpenAddProduct(true)}
                        title="Gestisci le spese"
                        cancelAction={resetEdits}
                        editAction={handleSaveChanges}
                        disableEdit={
                            Object.keys(edits).length === 0 || savingChanges
                        }
                        disableCancel={
                            Object.keys(edits).length === 0 || savingChanges
                        }
                        loading={savingChanges}
                    />
                    <Space h="xl" />
                    {!isMobile ? (
                        <>
                            <Table
                                verticalSpacing="md"
                                highlightOnHover={false}
                            >
                                <Table.Tbody>
                                    {board.products.length === 0 ? (
                                        <Table.Tr>
                                            <Table.Td
                                                colSpan={3}
                                                style={{
                                                    textAlign: "center",
                                                    padding: "40px 0",
                                                }}
                                            >
                                                <Box className="center-flex-col">
                                                    <IconMeat
                                                        size={40}
                                                        style={{
                                                            opacity: 0.5,
                                                            marginBottom: 15,
                                                        }}
                                                    />
                                                    <Text
                                                        size="lg"
                                                        fw={500}
                                                        c="dimmed"
                                                    >
                                                        Nessuna spesa
                                                        disponibile
                                                    </Text>
                                                    <Space h="md" />
                                                    <Button
                                                        variant="light"
                                                        leftSection={
                                                            <IconShoppingBag
                                                                size={16}
                                                            />
                                                        }
                                                        onClick={() =>
                                                            setOpenAddProduct(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        Aggiungi la prima spesa
                                                    </Button>
                                                </Box>
                                            </Table.Td>
                                        </Table.Tr>
                                    ) : (
                                        rows
                                    )}
                                    {board.products.length > 0 && (
                                        <Transition
                                            mounted={animateTable}
                                            transition="slide-up"
                                            duration={300}
                                            timingFunction="ease"
                                        >
                                            {(styles) => (
                                                <Table.Tr
                                                    style={{
                                                        ...styles,
                                                        background:
                                                            "rgba(30, 30, 40, 0.7)",
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    <Table.Td>
                                                        <Text
                                                            fw={700}
                                                            size="md"
                                                        >
                                                            Totale
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            size="lg"
                                                            color="orange"
                                                            variant="filled"
                                                            styles={{
                                                                root: {
                                                                    padding:
                                                                        "8px 12px",
                                                                    fontWeight: 700,
                                                                },
                                                            }}
                                                        >
                                                            {formatPrice(
                                                                totalPrice,
                                                            )}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td></Table.Td>
                                                </Table.Tr>
                                            )}
                                        </Transition>
                                    )}
                                </Table.Tbody>
                            </Table>
                            <Space h="md" />
                            {board.products.length > ITEMS_PER_PAGE && (
                                <ResponsivePager
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                    totalPages={totalPages}
                                />
                            )}
                        </>
                    ) : (
                        <Box>
                            {board.products.length === 0 ? (
                                <Box
                                    style={{
                                        textAlign: "center",
                                        padding: "30px 0",
                                    }}
                                >
                                    <Box className="center-flex-col">
                                        <IconMeat
                                            size={40}
                                            style={{
                                                opacity: 0.5,
                                                marginBottom: 15,
                                            }}
                                        />
                                        <Text size="lg" fw={500} c="dimmed">
                                            Nessuna spesa disponibile
                                        </Text>
                                        <Space h="md" />
                                        <Button
                                            variant="light"
                                            leftSection={
                                                <IconShoppingBag size={16} />
                                            }
                                            onClick={() =>
                                                setOpenAddProduct(true)
                                            }
                                        >
                                            Aggiungi la prima spesa
                                        </Button>
                                    </Box>
                                </Box>
                            ) : (
                                <>
                                    {cardRows}
                                    {board.products.length > 0 && (
                                        <Transition
                                            mounted={animateTable}
                                            transition="slide-up"
                                            duration={300}
                                            timingFunction="ease"
                                        >
                                            {(styles) => (
                                                <Card
                                                    style={{
                                                        ...styles,
                                                        background:
                                                            "rgba(30, 30, 40, 0.7)",
                                                        marginTop: "15px",
                                                        border: "1px solid var(--primary-border)",
                                                    }}
                                                    p="md"
                                                    radius="md"
                                                >
                                                    <Group align="center">
                                                        <Text
                                                            fw={700}
                                                            size="md"
                                                        >
                                                            Totale
                                                        </Text>
                                                        <Badge
                                                            size="lg"
                                                            color="orange"
                                                            variant="filled"
                                                            styles={{
                                                                root: {
                                                                    padding:
                                                                        "8px 12px",
                                                                    fontWeight: 700,
                                                                },
                                                            }}
                                                        >
                                                            {formatPrice(
                                                                totalPrice,
                                                            )}
                                                        </Badge>
                                                    </Group>
                                                </Card>
                                            )}
                                        </Transition>
                                    )}
                                    <Space h="md" />
                                    {board.products.length > ITEMS_PER_PAGE && (
                                        <ResponsivePager
                                            currentPage={currentPage}
                                            setCurrentPage={setCurrentPage}
                                            totalPages={totalPages}
                                        />
                                    )}
                                </>
                            )}
                        </Box>
                    )}
                    {savingChanges && (
                        <Box className="center-flex" mt="xl">
                            <Loader size="sm" color="blue" />
                            <Text ml="xs" size="sm">
                                Salvataggio modifiche...
                            </Text>
                        </Box>
                    )}
                </ModalPaper>
                {!isMobile &&
                    Object.keys(edits).length > 0 &&
                    !savingChanges && (
                        <BottomEditControl
                            resetEdits={resetEdits}
                            handleSaveChanges={handleSaveChanges}
                        />
                    )}
            </Modal>
            <AddProductModal
                open={openAddProduct}
                onClose={() => setOpenAddProduct(false)}
                board={board}
                closeOnEnd
            />
        </>
    );
};
