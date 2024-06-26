import { getToken, useCalculateDebits } from "@/utils"
import { boardsQuery } from "@/utils/queries"
import { Role, board } from "@/utils/types"
import { Checkbox, Loader, Menu, SegmentedControl, Space, Table, Title } from "@mantine/core"
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

export const BoardPage = ({ setHeader }:{ setHeader:(p:any)=>void }) => {
    const boards = boardsQuery()
    const { board_id, screen } = useParams() as { board_id:string, screen: "members"|"products"|undefined }
    const board = boards.data?.find((b) => b.id === board_id)
    const location = useNavigate()
    const currentUser = getToken()
    const canEdit = [Role.ADMIN, Role.EDITOR].includes(currentUser.role??Role.GUEST)
    const [boardSettingsOpened, setBoardSettingsOpened] = useState(false)
    const [categorySettingsOpened, setCategorySettingsOpened] = useState(false)
    const [productSettingsOpened, setProductSettingsOpened] = useState(false)
    const [memberSettingsOpened, setMemberSettingsOpened] = useState(false)
    
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
            <Space w="sm" />
            <BackButton onClick={()=>location("/")}/>
            <Space w="sm" />
        </>)
    }, [screen])

    if (!board) return <></>
    return <>
        <Space h="xs" />
        <Title order={2}>{board.name}</Title>
        <Space h="xl" />
        {
            screen == "products"?
            <ProductsTable board={board} />
            :<MembersTable board={board} />
        }
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
        <Table stickyHeader stickyHeaderOffset={60} verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Status</Table.Th>
              <Table.Th>Member</Table.Th>
              {board.categories.map((cat) => (
                    <Table.Th key={cat.id}>{cat.name}</Table.Th>
              ))}
              <Table.Th>Paid</Table.Th>
              <Table.Th>Debit</Table.Th>
              <Table.Th>Balance</Table.Th>
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
        <Table stickyHeader stickyHeaderOffset={60} verticalSpacing="md">
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