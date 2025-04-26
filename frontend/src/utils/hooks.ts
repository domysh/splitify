import { board, BoardPermission, Role } from './types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { meQuery } from './queries';
import { calculateDebits } from '.';
import { PaylistWorkerResponse } from '@/workers/paylistWorker';
import { useMediaQuery } from "@mantine/hooks";

export const useMobile = () => useMediaQuery('(max-width: 768px)');
export const useSmallScreen = () => useMediaQuery('(max-width: 512px)');

export const usePermissions = (board?: board) => {
  const currentUser = useCurrentUser();

  return useMemo(() => {
    
    const defaultPermissions = {
      canView: false,
      canEdit: false,
      isOwner: false,
      isLoggedIn: currentUser && !currentUser.isLoading
    };
    
    if (!currentUser || currentUser.isLoading) {
      
      if (board && board.isPublic) {
        return { ...defaultPermissions, canView: true };
      }
      return defaultPermissions;
    }
    
    if (currentUser.isAdmin) {
      return {
        ...defaultPermissions,
        canView: true,
        canEdit: true,
        isOwner: true,
        isLoggedIn: true
      };
    }
    
    if (board) {
      
      const isCreator = board?.creator?.id === currentUser.id;
      
      const permission = board.permission;
      
      const isOwner = isCreator || permission === BoardPermission.OWNER;
      const canEdit = isOwner || permission === BoardPermission.EDITOR;
      const canView = canEdit || permission === BoardPermission.VIEWER || board.isPublic;
      
      return {
        canView,
        canEdit,
        isOwner,
        isLoggedIn: true
      };
    }
    
    return defaultPermissions;
  }, [currentUser, board]);
};

export const useCurrentUser = () => {
  const me = meQuery()
  return useMemo(() => {
      if (me.isSuccess && !me.isFetching) {
          const role = me.data.role
          return {
              ...me.data,
              isAdmin: role.toLowerCase() === Role.ADMIN,
              isLoading: me.isLoading,
          }
      }
      if (me.isLoading){
          return {
              id: "",
              username: "",
              role: Role.GUEST,
              isAdmin: false,
              isLoading: true,
          }
      }
  }, [me.isFetching])
}


export const useCalculateDebits = (board?: board) => {
  return useMemo(() => calculateDebits(board), [board]);
}

export const useCalculatePaylist = (board?: board) => {
  const debits = useCalculateDebits(board)
  const balances = useMemo(() => (board?.members.map((memb) => ({
      id: memb.id,
      price: memb.paid - (debits.find((d) => d.id === memb.id)?.price??0)
  }))??[]).sort((a, b) => a.id.localeCompare(b.id)), [board, debits])
  
  const [result, setResult] = useState<PaylistWorkerResponse>({
      status: "loading",
      payments: []
  });
  
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
      if (typeof window === 'undefined') return;
      const worker = new Worker(new URL('@/workers/paylistWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event) => {
          setResult(event.data);
      };
      workerRef.current = worker;
      return () => {
          worker.terminate();
          workerRef.current = null;
      };
  }, []);
  
  
  useEffect(() => {
      if (!workerRef.current || !board) {
          if (!board) {
              setResult({
                  status: "empty",
                  payments: [],
                  what: "no-board",
              });
          }
          return;
      }
      
      setResult({
          status: "loading",
          payments: []
      });
      
      const timerId = setTimeout(() => {
          if (workerRef.current) {
              workerRef.current.postMessage({
                  type: 'calculate',
                  board
              });
          }
      }, 100); // Debounce the worker call
      
      return () => clearTimeout(timerId);
  }, [board, balances]);
  
  return result;
}

export const useStickyScrollableHeader = ({ headHeight, topOffset}: { headHeight: number, topOffset: number }) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const paddingElement = useRef<HTMLDivElement>();
  useEffect(() => {
      
      let scrollViewport: HTMLElement | null = null;
      const updateHeaderSizes = () => {
          if (!tableRef.current) return;
          const tHead = tableRef.current.tHead;
          if (!tHead) return;
          
          const tableBody = tableRef.current.tBodies[0];
          const headerRow = tHead.rows[0];
          
          if (tableBody?.rows.length > 0) {
              const firstBodyRow = tableBody.rows[0];
              for (let i = 0; i < headerRow.cells.length; i++) {
                  headerRow.cells[i].style.width = "auto";
                  headerRow.cells[i].style.minWidth = "auto";
                  firstBodyRow.cells[i].style.width = "auto";
                  firstBodyRow.cells[i].style.minWidth = "auto";
              }
              
              for (let i = 0; i < headerRow.cells.length; i++) {
                  if (i < firstBodyRow.cells.length) {
                      const headWidth = headerRow.cells[i].getBoundingClientRect().width;
                      const bodyWidth = firstBodyRow.cells[i].getBoundingClientRect().width;
                      if (bodyWidth > headWidth) {
                          headerRow.cells[i].style.minWidth = `${bodyWidth}px`;
                          headerRow.cells[i].style.width = `${bodyWidth}px`;
                          firstBodyRow.cells[i].style.width = `${bodyWidth}px`;
                          firstBodyRow.cells[i].style.minWidth = `${bodyWidth}px`;
                      }else{
                          firstBodyRow.cells[i].style.width = `${headWidth}px`;
                          firstBodyRow.cells[i].style.minWidth = `${headWidth}px`;
                          headerRow.cells[i].style.minWidth = `${headWidth}px`;
                          headerRow.cells[i].style.width = `${headWidth}px`;
                      }
                  }
              }
          }
      };

      const scrollEvent = () => {
          if (tableRef.current) {
              const tHead = tableRef.current.tHead;
              if (!tHead) return;
              
              
              if (!scrollViewport) {
                  scrollViewport = tableRef.current.closest('.mantine-ScrollArea-viewport');
              }
              
              const rect = tableRef.current.getBoundingClientRect();
              const tableBody = tableRef.current.tBodies[0];
              
              if (rect.top < topOffset) {
                  if (!paddingElement.current) {
                      
                      const placeholder = document.createElement('div');
                      const randomId = `header-placeholder-${Math.random().toString(36).substring(2, 10)}`;
                      placeholder.id = randomId;
                      placeholder.className = 'header-placeholder';
                      placeholder.style.height = `${topOffset}px`;
                      paddingElement.current = placeholder
                      tableBody.parentNode?.insertBefore(placeholder, tableBody)
                      
                      updateHeaderSizes();
                  }
                  
                  tHead.style.position = "fixed";
                  tHead.style.top = `${topOffset}px`;
                  tHead.style.left = `${rect.left}px`;
                  tHead.style.width = `${rect.width}px`;
                  tHead.style.height = `${headHeight}px`;
                  if (tHead.rows.length > 0) {
                      tHead.rows[0].style.height = `${headHeight}px`;
                  }
                  tHead.style.zIndex = "100";
                  
              } else {
                  
                  tHead.style.position = "static";
                  tHead.style.top = "auto";
                  tHead.style.left = "auto";
                  tHead.style.width = "auto";
                  tHead.style.transform = "none";
                  
                  
                  if (paddingElement.current) {
                      paddingElement.current.remove();
                      paddingElement.current = undefined;
                  }
              }
          }
      };
      
      
      let ticking = false;
      const throttledEvent = (callback: () => void) => {
          if (!ticking) {
              window.requestAnimationFrame(() => {
                  callback();
                  ticking = false;
              });
              ticking = true;
          }
      };

      const horizontalScrollEvent = () => {
          throttledEvent(scrollEvent)
      }

      
      const setupHorizontalScrollListener = () => {
          if (tableRef.current) {
              const viewport = (() => {
                  
                  let element: HTMLElement | null = tableRef.current;
                  while (element && element !== document.documentElement) {
                      const style = window.getComputedStyle(element);
                      const hasOverflow = ['auto', 'scroll'].includes(style.overflowX) || 
                                          ['auto', 'scroll'].includes(style.overflowY) ||
                                          ['auto', 'scroll'].includes(style.overflow);
                      const canScroll = element.scrollWidth > element.clientWidth || 
                                       element.scrollHeight > element.clientHeight;
                      
                      if (hasOverflow && canScroll) {
                          return element;
                      }
                      element = element.parentElement;
                  }

                  return document.scrollingElement || document.documentElement;
              })();
              if (viewport) {
                  scrollViewport = viewport as HTMLElement;
                  viewport.addEventListener('scroll', horizontalScrollEvent, { passive: true });
                  return () => viewport.removeEventListener('scroll', horizontalScrollEvent);
              }
          }
          return () => {};
      };
      
      
      const handleVerticalScroll = () => throttledEvent(scrollEvent);

      
      let cleanupHorizontal = setupHorizontalScrollListener();

      const handleResize = () => throttledEvent(() => {
          updateHeaderSizes();
          scrollEvent();
      });

      
      document.addEventListener("scroll", handleVerticalScroll);
      window.addEventListener("resize", handleResize);
      
      
      scrollEvent();

      const interval = setInterval(() => {
          cleanupHorizontal()
          cleanupHorizontal = setupHorizontalScrollListener();
      }, 300)
      
      return () => {
          document.removeEventListener("scroll", handleVerticalScroll);
          window.removeEventListener("resize", handleResize);
          clearInterval(interval)
          cleanupHorizontal();
      };
  }, []);
  return tableRef
}
