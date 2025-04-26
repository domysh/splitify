import { useQuery } from "@tanstack/react-query";
import { getRegistrationInfo, getRequest, searchUsers } from "@/utils/net";
import { board, user, transaction, boardListing, boardAccess, searchUser, GlobalStats } from "@/utils/types";
import { notifications } from "@mantine/notifications";
import { useState, useEffect } from "react";
import { useAuth } from "./store";

const retryLogic = (failureCount:number, error:any) => {
    if (error.code != 404 && failureCount < 3) {
        return true
    }
    notifications.show({
        title: "Errore",
        message: error.detail,
        color: "red",
        autoClose: 3000,
    })
    return false
}

export const boardsQuery = () => useQuery<boardListing[], Error>({
    queryKey: ['boards'],
    queryFn: () => getRequest('boards'),
    refetchInterval: 0,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000
})

export const boardQuery = (id: string) => useQuery<board, Error>({
    queryKey: ['boards', id],
    queryFn: () => getRequest(`boards/${id}`),
    refetchInterval: 0,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
    retry: false
})

export const meQuery = () => {
    const {token} = useAuth();
    
    const hasToken = token?true:false;
    
    return useQuery<user, Error>({
        queryKey: ['me'],
        queryFn: () => getRequest('me'),
        staleTime: 30 * 60 * 1000,
        
        enabled: hasToken,
        
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchInterval: 0,
        retry: retryLogic,
    });
};

export const transactionsQuery = (boardId: string) => useQuery<transaction[], Error>({
    queryKey: ['boards', boardId, 'transactions'],
    queryFn: () => getRequest(`transactions/${boardId}`),
    staleTime: 5 * 60 * 1000
});

export const adminUsersQuery = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: () => getRequest("users").then((data) => data as user[]),
        retry: retryLogic,
    });
}

export const boardAccessQuery = (boardId?: string) => useQuery<boardAccess[], Error>({
    queryKey: ['boards', boardId, 'access'],
    queryFn: () => getRequest(`boards/${boardId}/access`),
    enabled: boardId? true : false,
    staleTime: 5 * 60 * 1000
});

export const searchUsersQuery = (searchTerm: string) => {
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        
        return () => clearTimeout(timer);
    }, [searchTerm]);
    
    return useQuery<searchUser[], Error>({
        queryKey: ['users', 'search', debouncedSearchTerm],
        queryFn: () => searchUsers(debouncedSearchTerm),
        enabled: debouncedSearchTerm.length >= 2,
        staleTime: 30000, 
        retry: false,
    });
};

export const registrationInfoQuery = () => {
    return useQuery({
        queryKey: ['registration', 'info'],
        queryFn: async () => {
            try {
                return await getRegistrationInfo();
            } catch (error) {
                console.error('Errore nel caricamento delle impostazioni di sistema:', error);
                throw error;
            }
        },
        refetchOnWindowFocus: false,
        retry: 1
    });
};

export const platformStatsQuery = () => {
    return useQuery({
        queryKey: ['stats'],
        queryFn: () => getRequest('admin/stats') as Promise<GlobalStats>,
        retry: retryLogic
    });
};