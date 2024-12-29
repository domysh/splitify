import { readLocalStorageValue, readSessionStorageValue, useLocalStorage, useSessionStorage } from "@mantine/hooks";
import { Role, board } from "./types";
import { useMemo } from "react";
import { DEV_IP_BACKEND } from './net';
import io from 'socket.io-client';

export const socket = import.meta.env.DEV?
    io("ws://"+DEV_IP_BACKEND, {transports: ["websocket"], path:"/sock" }):
    io({transports: ["websocket"], path:"/sock"})

export const useToken = () => useLocalStorage({
    key: "login-token",
    defaultValue: ""
})

export const getToken = (): { userid?: string, exp?: number, role?: Role } => {
    const token = readLocalStorageValue({
        key: "login-token",
        defaultValue: ""
    })
    const splitted = token.split(".")
    return splitted.length >= 2 ? JSON.parse(atob(splitted[1])): {}
}

export const useLoading = () => useSessionStorage({
    key: "glob-loading",
    defaultValue: false
})[1]

export const getLoading = () => readSessionStorageValue({
    key: "glob-loading",
    defaultValue: false
})

export const useCalculateDebits = (board: board) => {
    const productCounter = useMemo(() => board.products.map((prod) => {
        let counter = 0
        board.members.forEach((memb) => {
            if (memb.categories.some((cat) => prod.categories.includes(cat))) {
                counter++
            }
        })
        return { id: prod.id, cout:counter }
    }), [board])

    return useMemo(() => board.members.map((memb) => {
        let counter = 0
        board.products.forEach((prod) => {
            if (memb.categories.some((cat) => prod.categories.includes(cat))) {
                counter += (prod.price*1.0)/(productCounter.find((p) => p.id === prod.id)?.cout??1)
            }
        })
        return { id: memb.id, price:parseInt(counter.toFixed(0)) }
    }), [board])
}