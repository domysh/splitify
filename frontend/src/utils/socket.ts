import { io } from 'socket.io-client';
import { useAuth } from './store';
import { DEV_IP_BACKEND } from './net';
import { notifications } from '@mantine/notifications';

export const socket = import.meta.env.DEV?
    io("ws://"+DEV_IP_BACKEND, {
        path:"/sock/",
        transports: ['websocket'],
        auth: {
            token: useAuth.getState().token
        }
    }):
    io({
        path:"/sock/",
        transports: ['websocket'],
        auth: {
            token: useAuth.getState().token
        }
    })

export const onConnectionCallabacks = [] as {key:string ,cb:Function}[]
export const onDisconnectionCallabacks = [] as {key:string ,cb:Function}[]

export const joinBoardRoom = (boardId: string) => {
    const action = () => {
        socket.timeout(5000).emitWithAck('joinBoard', boardId).then((res) => {
            if (!res.success){
                notifications.show({
                    title: 'Errore nell\'accesso alla board',
                    message: res.error,
                    color: 'red',
                    autoClose: 5000
                });
            }
        });
    }
    if (!onConnectionCallabacks.some((cb) => (cb.key === "board-"+boardId))) {
        onConnectionCallabacks.push({
            key: "board-"+boardId,
            cb: action
        });
        action();
    }
    
};

export const leaveBoardRoom = (boardId: string) => {
    const index = onConnectionCallabacks.findIndex((cb) => (cb.key === "board-"+boardId));
    if (index !== -1) {
        onConnectionCallabacks.splice(index, 1);
        socket.timeout(5000).emitWithAck('leaveBoard', boardId).then((res) => {
            if (!res.success){
                notifications.show({
                    title: 'Errore nell\'uscita dalla board',
                    message: res.error,
                    color: 'red',
                    autoClose: 5000
                });
            }
        });
    }
};
