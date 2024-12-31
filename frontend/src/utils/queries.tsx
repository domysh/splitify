import { useQuery } from "@tanstack/react-query";
import { getRequest } from "@/utils/net";
import { board } from "@/utils/types";


export const boardsQuery = () => useQuery({
    queryKey:["boards"],
    queryFn: async () => await getRequest("/boards") as board[]
})

export const boardQuery = (id: string) => useQuery({
    queryKey:["boards", id],
    queryFn: async () => await getRequest(`/boards/${id}`) as board
})