import { calculateDebits } from "@/utils";
import { board } from "@/utils/types";


export interface PaylistWorkerMessage {
  type: 'calculate';
  board: board;
};

export interface PaylistWorkerResponse {
  status: "ok" | "empty" | "uncompleted" | "unbalanced" | "loading";
  payments: { from: string, to: string, price: number }[];
  what?: "no-board" | "no-members" | "phantom-category" | "unbalanced";
  balance?: number;
};


function calculatePaylist(board: board): PaylistWorkerResponse {
  if (board === undefined) return {
    status: "empty",
    payments: [],
    what: "no-board",
  };
  
  if (board.members.length === 0) return {
    status: "empty",
    payments: [],
    what: "no-members",
  };
  
  const debits = calculateDebits(board);
  
  
  const balances = board.members.map((memb) => ({
    id: memb.id,
    price: memb.paid - (debits.find((d) => d.id === memb.id)?.price ?? 0)
  })).sort((a, b) => a.id.localeCompare(b.id));

  
  const productsCategoryCount = board.products.reduce((acc, prod) => {
    prod.categories.forEach((cat) => {
      if (!acc[cat]) acc[cat] = 1;
      else acc[cat]++;
    });
    return acc;
  }, {} as Record<string, number>);

  const membersCategoryCount = board.members.reduce((acc, memb) => {
    memb.categories.forEach((cat) => {
      if (!acc[cat]) acc[cat] = 1;
      else acc[cat]++;
    });
    return acc;
  }, {} as Record<string, number>);

  for (const cat in productsCategoryCount) {
    if (!membersCategoryCount[cat]) {
      return {
        status: "uncompleted",
        payments: [],
        what: "phantom-category", 
      };
    }
  }
  
  const test = balances.reduce((acc, curr) => acc + curr.price, 0);
  if (test !== 0) return {
    status: "unbalanced",
    payments: [],
    what: "unbalanced",
    balance: test
  };
  
  
  const nonZeroBalances = {} as {[key: string]: number};
  for (const {id:person, price:balance} of balances) {
    if (balance !== 0) {
      nonZeroBalances[person] = balance;
    }
  }
  
  
  if (Object.keys(nonZeroBalances).length === 0) {
    return {
      status: "ok",
      payments: []
    };
  }
  
  
  const people = Object.keys(nonZeroBalances);
  const balanceList = people.map(person => nonZeroBalances[person]);
  
  
  let bestSolution = [] as { from: string, to: string, price: number }[];
  let minTransactions = Infinity;
  
  
  function backtrack(balancesRemaining: number[], currentTransactions: { from: string, to: string, price: number }[]) {
    
    if (balancesRemaining.every(b => b === 0)) {
      if (currentTransactions.length < minTransactions) {
        minTransactions = currentTransactions.length;
        bestSolution = [...currentTransactions]; 
      }
      return;
    }
    
    
    if (currentTransactions.length >= minTransactions) {
      return;
    }
    
    
    const debtorIdx = balancesRemaining.findIndex(b => b < 0);
    if (debtorIdx === -1) {
      return;
    }
    
    
    for (let creditorIdx = 0; creditorIdx < balancesRemaining.length; creditorIdx++) {
      if (balancesRemaining[creditorIdx] > 0) { 
        
        const newBalances = [...balancesRemaining];
        
        
        const amount = Math.min(-newBalances[debtorIdx], newBalances[creditorIdx]);
        
        
        newBalances[debtorIdx] += amount;
        newBalances[creditorIdx] -= amount;
        
        
        currentTransactions.push({
          from: people[debtorIdx],
          to: people[creditorIdx],
          price: amount
        });
        
        
        backtrack(newBalances, currentTransactions);
        
        
        currentTransactions.pop();
      }
    }
  }
  
  
  backtrack(balanceList, []);

  return {
    status: "ok",
    payments: bestSolution
  };
}

self.addEventListener('message', (event: MessageEvent<PaylistWorkerMessage>) => {
  if (event.data.type === 'calculate') {
    const result = calculatePaylist(event.data.board);
    self.postMessage(result);
  }
});

export default {} as typeof Worker & { new(): Worker };
