import { io } from 'socket.io-client';
import { useAuth } from './store';
import { DEV_IP_BACKEND } from './net';
import { notifications } from '@mantine/notifications';

export const socket = import.meta.env.DEV ?
    io("ws://" + DEV_IP_BACKEND, {
        path: "/sock",
        autoConnect: false,
        transports: ['websocket'],
        auth: {
            token: useAuth.getState().token
        }
    }) :
    io({
        path: "/sock",
        autoConnect: false,
        transports: ['websocket'],
        auth: {
            token: useAuth.getState().token
        }
    })

export const onConnectionCallbacks = [] as { key: string, cb: Function }[]
export const onDisconnectionCallbacks = [] as { key: string, cb: Function }[]
const pendingLeaveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const joinBoardRoom = (boardId: string) => {
    const action = async (retryCount = 0) => {
        try {
            const res = await socket.timeout(5000).emitWithAck('joinBoard', boardId);
            if (!res.success) {
                console.error(`Failed to join board ${boardId}:`, res.error);
                if (retryCount < 3) {
                    setTimeout(() => action(retryCount + 1), 1000 * (retryCount + 1));
                } else {
                    notifications.show({
                        title: 'Errore nell\'accesso alla board',
                        message: res.error || "Impossibile connettersi agli aggiornamenti in tempo reale.",
                        color: 'red',
                        autoClose: 5000
                    });
                }
            }
        } catch (err) {
            console.error(`Timeout/Error joining board ${boardId}:`, err);
            if (retryCount < 3) {
                setTimeout(() => action(retryCount + 1), 1000 * (retryCount + 1));
            }
        }
    }

    // Clear any pending leave callback since we are joining again
    if (pendingLeaveTimeouts.has(boardId)) {
        clearTimeout(pendingLeaveTimeouts.get(boardId)!);
        pendingLeaveTimeouts.delete(boardId);
    }

    if (!onConnectionCallbacks.some((cb) => (cb.key === "board-" + boardId))) {
        onConnectionCallbacks.push({
            key: "board-" + boardId,
            cb: () => action(0)
        });
        action(0);
    }

};

export const leaveBoardRoom = (boardId: string) => {
    // If a leave is already pending, do nothing (or reset it, but usually not needed)
    if (pendingLeaveTimeouts.has(boardId)) return;

    const timeout = setTimeout(() => {
        pendingLeaveTimeouts.delete(boardId);
        const index = onConnectionCallbacks.findIndex((cb) => (cb.key === "board-" + boardId));
        if (index !== -1) {
            onConnectionCallbacks.splice(index, 1);
            socket.timeout(5000).emitWithAck('leaveBoard', boardId).then((res) => {
                if (!res.success) {
                    notifications.show({
                        title: 'Errore nell\'uscita dalla board',
                        message: res.error,
                        color: 'red',
                        autoClose: 5000
                    });
                }
            });
        }
    }, 100); // 100ms debounce

    pendingLeaveTimeouts.set(boardId, timeout);
};
