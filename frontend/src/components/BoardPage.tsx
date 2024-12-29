import { getToken, socket, useCalculateDebits, useToken } from "@/utils"
import { boardQuery } from "@/utils/queries"
import { Role, board } from "@/utils/types"
import { Checkbox, Loader, Menu, ScrollAreaAutosize, SegmentedControl, Space, Table, Title } from "@mantine/core"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BackButton, OptionButton } from "./Buttons"
import { postRequest } from "@/utils/net"
import { useQueryClient } from "@tanstack/react-query"
import { notifications } from "@mantine/notifications"
import { MdCategory } from "react-icons/md";
import { BsFillPeopleFill } from "react-icons/bs";
import { MdOutlineProductionQuantityLimits } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import { BoardSettingsModal } from "./BoardSettingModal"
import { CategorySettingsModal } from "./CategorySettingsModal"
import { MemberSettingsModal } from "./MemberSettingsModal"
import { ProductSettingsModal } from "./ProductSettingsModal"
import { BalanceIcon } from "./Utils"
import { useImmer } from "use-immer"
import { useHeader } from "@/utils/store"

export const BoardPage = () => {
    
    const { board_id, screen } = useParams() as { board_id:string, screen: "members"|"products"|undefined }
    const board_q = boardQuery(board_id)
    const board = board_q.data
    const location = useNavigate()
    const currentUser = getToken()
    const canEdit = [Role.ADMIN, Role.EDITOR].includes(currentUser.role??Role.GUEST)
    const [boardSettingsOpened, setBoardSettingsOpened] = useState(false)
    const [categorySettingsOpened, setCategorySettingsOpened] = useState(false)
    const [productSettingsOpened, setProductSettingsOpened] = useState(false)
    const [memberSettingsOpened, setMemberSettingsOpened] = useState(false)
    const queryClient = useQueryClient()
    const [token, _setToken] = useToken()
    const { setHeader } = useHeader()
    
    useEffect(()=>{
        const skchann = `update:${board_id.toLowerCase()}`
        socket.on(skchann, (data) => {
            console.log("Update received by socket io:", data)
            queryClient.invalidateQueries({ queryKey: [ "boards" ] })
        })
        return () => {
            socket.off(skchann)
        }
    },[board_id])

    useEffect(() => {
        if (board_q.isError){
            location(`/`)
        }
    }, [board_q.isFetching])
    
    useEffect(() => {
        if ([undefined, "members", "products"].includes(screen) === false)
            location(`/board/${board_id}`)
        setHeader(<>
            <SegmentedControl
                value={screen??"members"}
                onChange={(v:string)=>location(`/board/${board_id}/${v}`)}
                data={[
                    { label: 'Members', value: 'members' },
                    { label: 'Products', value: 'products' },
                ]}
                size="xs"
            />
            <Space w="sm" />
            {canEdit?<>
                <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <OptionButton />
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Label>Board</Menu.Label>
                        <Menu.Item
                            leftSection={<IoMdSettings />}
                            onClick={() => setBoardSettingsOpened(true)}
                        >
                            Settings
                        </Menu.Item>
                        <Menu.Label>Add, Edit or Remove</Menu.Label>
                        <Menu.Item
                            leftSection={<MdCategory />}
                            onClick={() => setCategorySettingsOpened(true)}
                        >
                            Category
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<BsFillPeopleFill />}
                            onClick={() => setMemberSettingsOpened(true)}
                        >
                            Members
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<MdOutlineProductionQuantityLimits />}
                            onClick={() => setProductSettingsOpened(true)}
                        >
                            Products
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </>:null}
            { token && <>
                <Space w="sm" />
                <BackButton onClick={()=>location("/")}/>
            </> }
        </>)
    }, [screen, token])

    if (!board) return <></>
    return <>
        <Space h="xl" />
        <Title order={2}>{board.name}</Title>
        <small>{board.members.length} users and {board.products.length} products</small>
        <Space h="md" />
        <ScrollAreaAutosize>
        {
            screen == "products"?
            <ProductsTable board={board} />
            :<MembersTable board={board} />
        }
        </ScrollAreaAutosize>
        <BoardSettingsModal board={board} open={boardSettingsOpened} onClose={()=>setBoardSettingsOpened(false)} />
        <CategorySettingsModal board={board} open={categorySettingsOpened} onClose={()=>setCategorySettingsOpened(false)} />
        <MemberSettingsModal board={board} open={memberSettingsOpened} onClose={()=>setMemberSettingsOpened(false)} />
        <ProductSettingsModal board={board} open={productSettingsOpened} onClose={()=>setProductSettingsOpened(false)} />
    </>
}

export const MembersTable = ({ board }:{ board: board }) => {

    const currentUser = getToken()
    const canEdit = [Role.ADMIN, Role.EDITOR].includes(currentUser.role??Role.GUEST)
    const queryClient = useQueryClient()
    const [loadingTable, updateLoadingTable] = useImmer<{[id:string]:true}>({})

    const userDebitCounter = useCalculateDebits(board)

    const rows = board.members.map((memb) => {
        const debit = userDebitCounter.find((ele)=>ele.id == memb.id)?.price??0
        const balance = memb.paid - debit
        
        return <Table.Tr key={memb.id}>
          <Table.Td><BalanceIcon balance={balance} /></Table.Td>
          <Table.Td>{memb.name}</Table.Td>
          {board.categories.map((cat) => (<Table.Td key={cat.id}>
                {canEdit?<>
                    {(loadingTable[memb.id+cat.id]??false)?
                    <Loader color="blue" size={20} />
                    :<Checkbox
                        checked={memb.categories.includes(cat.id)}
                        color={memb.categories.includes(cat.id)?"lime":"red"}
                        onClick={() => {
                            const newCategories = memb.categories.includes(cat.id)?memb.categories.filter((c) => c !== cat.id):[...memb.categories, cat.id]
                            updateLoadingTable((draft)=>{draft[memb.id+cat.id] = true})
                            postRequest(`boards/${board.id}/members/${memb.id}`, {
                                body: {
                                    ...memb,
                                    categories: newCategories,
                                }
                            })
                            .catch((err) => {
                                notifications.show({
                                    title: "Error updating member",
                                    message: err.message,
                                    color: "red"
                                })
                            })
                            .finally(() => {
                                queryClient.invalidateQueries()
                                updateLoadingTable((draft)=>{delete draft[memb.id+cat.id]})
                            })
                        }}
                        readOnly
                    />}
                </>:memb.categories.includes(cat.id)?"✅":"❌"}
          </Table.Td>))}
          <Table.Td>{(memb.paid/100.).toFixed(2).replace(".", ",")}</Table.Td>
          <Table.Td>{(debit/100.).toFixed(2).replace(".", ",")}</Table.Td>
          <Table.Td>{(balance/100.).toFixed(2).replace(".", ",")}</Table.Td>
        </Table.Tr>
    });
    
      return (
        <Table verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ textWrap: "nowrap" }}>Status</Table.Th>
              <Table.Th style={{ textWrap: "nowrap" }}>Member</Table.Th>
              {board.categories.map((cat) => (
                    <Table.Th style={{ textWrap: "nowrap" }} key={cat.id}>{cat.name}</Table.Th>
              ))}
              <Table.Th style={{ textWrap: "nowrap" }}>Paid</Table.Th>
              <Table.Th style={{ textWrap: "nowrap" }}>Debit</Table.Th>
              <Table.Th style={{ textWrap: "nowrap" }}>Balance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      );
}

export const ProductsTable = ({ board }:{ board: board }) => {

    const currentUser = getToken()
    const canEdit = [Role.ADMIN, Role.EDITOR].includes(currentUser.role??Role.GUEST)
    const [loadingTable, updateLoadingTable] = useImmer<{[id:string]:true}>({})

    const queryClient = useQueryClient()


    const rows = board.products.map((prod) => (
        <Table.Tr key={prod.id}>
          <Table.Td>{prod.name}</Table.Td>
          <Table.Td>{(prod.price/100.).toFixed(2).replace(".", ",")}</Table.Td>
          {board.categories.map((cat) => (<Table.Td key={cat.id}>
                {canEdit?<>
                    {(loadingTable[prod.id+cat.id]??false)?
                    <Loader color="blue" size={20} />
                    :<Checkbox
                        checked={prod.categories.includes(cat.id)}
                        color={prod.categories.includes(cat.id)?"lime":"red"}
                        onClick={() => {
                            const newCategories = prod.categories.includes(cat.id)?prod.categories.filter((c) => c !== cat.id):[...prod.categories, cat.id]
                            updateLoadingTable((draft)=>{draft[prod.id+cat.id] = true})
                            postRequest(`boards/${board.id}/products/${prod.id}`, {
                                body: {
                                    ...prod,
                                    categories: newCategories,
                                }
                            })
                            .catch((err) => {
                                notifications.show({
                                    title: "Error updating product",
                                    message: err.message,
                                    color: "red"
                                })
                            })
                            .finally(() => {
                                queryClient.invalidateQueries()
                                updateLoadingTable((draft)=>{delete draft[prod.id+cat.id]})
                            })
                        }}
                        readOnly
                    />}
                </>:prod.categories.includes(cat.id)?"✅":"❌"}
          </Table.Td>))}
        </Table.Tr>
      ));
    
      return (
        <Table verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Cost</Table.Th>
              {board.categories.map((cat) => (
                    <Table.Th key={cat.id}>{cat.name}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows}
            <Table.Tr key="tot">
                <Table.Td>Total</Table.Td>
                <Table.Td>{([0].concat(board.products.map((v)=>v.price)).reduce((acc, val)=>acc+val)/100.0).toFixed(2).replace(".",",")}</Table.Td>
                </Table.Tr>
          </Table.Tbody>
        </Table>
      );
}