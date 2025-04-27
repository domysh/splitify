import { useAuth } from "./store"

export const DEV_IP_BACKEND = "127.0.0.1:8080"

export const getAuthHeaders = ():({[k:string]:string}) => {
    const token = useAuth.getState().token
    if (!token){
        return {}
    }
    return {
        "Authorization": "Bearer "+(token??"")
    }

}

export const getLink = (url:string, params?: {[p:string]:any}): string => {
    url = url.trim()
    if (url.charAt(0) != '/'){
        url = "/"+url
    }
    let postfix = ""
    if (params){
        postfix = "?"
        postfix += new URLSearchParams(params).toString()
    }
    if (import.meta.env.DEV){
        return `http://${DEV_IP_BACKEND}/api`+url+postfix
    }
    return "/api"+url+postfix
}

export const elaborateJsonRequest = (res: Response) => {
    if (res.status === 401){
        useAuth.getState().logout()
        window.location.reload() // Unauthorized
    }
    if (res.status === 403){
        return res.json().then( res => {
            throw {
                code: 403,
                message: "Non hai i permessi necessari per eseguire questa operazione", 
                ...res 
            }
        })
    }
    if (res.status === 404){
        return res.json().then( res => {
            throw {
                code: 404,
                message: "Risorsa non trovata", 
                ...res 
            }
        })
    }
    if (!res.ok){
        return res.json().then( res2 => {throw {...res2, code:res.status }} )
    }
    return res.json()
}

export const getRequest = async (url:string, options: {params?: {[p:string]:any}} = {}) => {
    return await fetch(getLink(url, options.params), {
        method: "GET",
        credentials: "same-origin",
        cache: 'no-cache',
        headers: {...getAuthHeaders()}
    }).then(elaborateJsonRequest)
}

export const postRequest = async (url:string, options: {params?: {[p:string]:any}, body?: {[p:string]:any}} = {}) => {
    return await fetch(getLink(url, options.params), {
        method: "POST",
        credentials: "same-origin",
        cache: 'no-cache',
        body: options.body?JSON.stringify(options.body):undefined,
        headers:{
            "Content-Type": "application/json",
            ...getAuthHeaders()
        }
    }).then(elaborateJsonRequest)
}

export const postFormRequest = async (url:string, options: {params?: {[p:string]:any}, body?: {[p:string]:any}} = {}):Promise<any> => {
    return await fetch(getLink(url, options.params), {
        method: "POST",
        credentials: "same-origin",
        cache: 'no-cache',
        body: options.body?new URLSearchParams(options.body).toString():undefined,
        headers:{
            "Content-Type": "application/x-www-form-urlencoded",
            ...getAuthHeaders()
        }
    }).then(elaborateJsonRequest)
}

export const putRequest = async (url:string, options: {params?: {[p:string]:any}, body?: {[p:string]:any}} = {}) => {
    return await fetch(getLink(url, options.params), {
        method: "PUT",
        credentials: "same-origin",
        cache: 'no-cache',
        body: options.body?JSON.stringify(options.body):undefined,
        headers:{
            "Content-Type": "application/json",
            ...getAuthHeaders()
        }
    }).then(elaborateJsonRequest)
}

export const deleteRequest = async (url:string, options: {params?: {[p:string]:any}} = {}) => {
    return await fetch(getLink(url, options.params), {
        method: "DELETE",
        credentials: "same-origin",
        cache: 'no-cache',
        headers:{...getAuthHeaders()}
    }).then(elaborateJsonRequest)
}

export const searchUsers = async (query: string): Promise<any[]> => {
    if (!query || query.length < 2) return [];
    try {
        return await getRequest('users/utils/search', { params: { q: query } });
    } catch (error) {
        console.error('Errore nella ricerca utenti:', error);
        return [];
    }
};