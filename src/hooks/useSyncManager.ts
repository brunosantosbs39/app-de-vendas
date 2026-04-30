import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { offlineStore, SyncItem } from '@/lib/offlineStore';

export function useSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingItems, setPendingItems] = useState(0);

  const processSyncQueue = async () => {
    if (isSyncing || !navigator.onLine) return;

    const queue = await offlineStore.getSyncQueue();
    if (queue.length === 0) {
      setPendingItems(0);
      return;
    }

    setIsSyncing(true);
    console.log(`[Sync] Sincronizando ${queue.length} itens...`);

    for (const item of queue) {
      try {
        let error = null;

        if (item.action === 'INSERT' || item.action === 'UPDATE') {
          const { error: upsertError } = await supabase
            .from(item.table)
            .upsert(item.data);
          error = upsertError;
        } else if (item.action === 'DELETE') {
          const { error: deleteError } = await supabase
            .from(item.table)
            .delete()
            .eq('id', item.data.id);
          error = deleteError;
        }

        if (!error) {
          await offlineStore.removeFromSyncQueue(item.id);
          console.log(`[Sync] Sucesso: ${item.table} ${item.action}`);
        } else {
          console.error(`[Sync] Erro no item ${item.id}:`, error);
        }
      } catch (err) {
        console.error(`[Sync] Falha crítica ao sincronizar:`, err);
        break; // Para se houver erro de rede
      }
    }

    setIsSyncing(false);
    const remaining = await offlineStore.getSyncQueue();
    setPendingItems(remaining.length);
  };

  useEffect(() => {
    // Sincroniza ao entrar online
    const handleOnline = () => {
      console.log("[Sync] Conexão restaurada. Iniciando sincronização...");
      processSyncQueue();
    };

    window.addEventListener('online', handleOnline);

    // Sincroniza periodicamente a cada 1 minuto se estiver online
    const interval = setInterval(() => {
      processSyncQueue();
    }, 60000);

    // Roda uma vez no início
    const timer = setTimeout(() => {
      processSyncQueue();
    }, 0);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  return { isSyncing, pendingItems };
}
