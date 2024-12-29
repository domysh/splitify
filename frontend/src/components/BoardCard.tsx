import { board } from "@/utils/types"
import { Card, Title } from "@mantine/core"
import { useNavigate } from "react-router-dom"



export const BoardCard = ({board}:{board:board}) => {
    const location = useNavigate()
    return <Card
        shadow="xs"
        padding="md"
        radius="md"
        style={{
            width: "100%",
            padding: 20,
            marginTop: 20,
            minHeight:"150px",
            cursor:"pointer"
        }}
        className="transparency-on-hover"
        onClick={() => location("/board/"+board.id)}
    >
        <Title order={2}>{board.name}</Title>
        <div style={{flexGrow: 1}} />
        <small>Categories: {board.categories.map((b) => b.name).join(", ")}</small>
        <small>{board.members.length} users and {board.products.length} products</small>
    </Card>
}