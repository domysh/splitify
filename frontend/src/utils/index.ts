
import { board } from "@/utils/types";

export const calculateDebits = (board?: board) => {
    if (!board) return [];

    const productCounter = board.products.map((prod) => {
        if (prod.categories.length === 0) {
            return { id: prod.id, cout:board.members.length }
        }
        let counter = 0
        board.members.forEach((memb) => {
            if (memb.categories.some((cat) => prod.categories.includes(cat))) {
                counter++
            }
        })
        return { id: prod.id, cout:counter }
    })
    
    const debits = board.members.map(memb => ({ id: memb.id, price: 0 }));
    
    
    board.products.forEach((prod) => {
        const count = productCounter.find(p => p.id === prod.id)?.cout ?? 0;
        if (count === 0) return;
        
        
        const membersForProduct = prod.categories.length > 0?board.members.filter(memb => 
            memb.categories.some(cat => prod.categories.includes(cat))
        ): board.members
        
        
        const baseShare = Math.floor(prod.price / count);
        
        let remainder = prod.price % count;
        
        
        membersForProduct.forEach(memb => {
            const debit = debits.find(d => d.id === memb.id);
            if (debit) {
                debit.price += baseShare;
            }
        });
        
        const sortedMembers = [...membersForProduct].sort((a, b) => a.id.localeCompare(b.id));
        for (let i = 0; remainder > 0; i++, remainder--) {
            const memb = sortedMembers[i % sortedMembers.length];
            const debit = debits.find(d => d.id === memb.id);
            if (debit) {
                debit.price += 1;
            }
        }
    });
    
    return debits;
}

export const usernameValidator = (username: string): string|null => {
    const regex = /^[a-zA-Z0-9\-\_\.]{5,30}$/;
    if (regex.test(username)) {
        return null;
    }
    if (username.length < 5) {
        return "L'username deve avere almeno 5 caratteri";
    }
    if (username.length > 30) {
        return "L'username deve avere al massimo 30 caratteri";
    }
    return "L'username può contenere solo lettere, numeri, trattini, underscore e punti";
}