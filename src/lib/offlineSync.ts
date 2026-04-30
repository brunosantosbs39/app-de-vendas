import { supabase } from './supabase';

// Nomes das chaves no LocalStorage
const PENDING_ACTIONS_KEY = 'appdevendas_pending_actions';

export interface PendingAction {
  id: string;
  type: 'sale' | 'client' | 'post';
  payload: any;
  timestamp: number;
}

export const offlineSyncService = {
  // Salva uma ação localmente se estiver offline
  saveAction: (type: 'sale' | 'client' | 'post', payload: any) => {
    try {
      const actions = offlineSyncService.getPendingActions();
      const newAction: PendingAction = {
        id: Date.now().toString(),
        type,
        payload,
        timestamp: Date.now()
      };
      
      actions.push(newAction);
      localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
      console.log('✅ Ação salva offline para sincronização futura:', newAction);
      return true;
    } catch (e) {
      console.error('Erro ao salvar ação offline:', e);
      return false;
    }
  },

  // Recupera ações pendentes
  getPendingActions: (): PendingAction[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  // Limpa uma ação específica após sucesso
  removeAction: (id: string) => {
    const actions = offlineSyncService.getPendingActions();
    const updated = actions.filter(a => a.id !== id);
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(updated));
  },

  // Sincroniza tudo com o Supabase quando a internet volta
  syncAll: async () => {
    if (!navigator.onLine) return { status: 'offline' };

    const actions = offlineSyncService.getPendingActions();
    if (actions.length === 0) return { status: 'empty' };

    let syncedCount = 0;
    console.log(`🔄 Iniciando sincronização de ${actions.length} itens pendentes...`);

    for (const action of actions) {
      try {
        if (action.type === 'sale') {
          // Lógica de sincronização de vendas
          await supabase.from('orders').insert([action.payload]);
        } else if (action.type === 'client') {
          // Lógica de sincronização de clientes
          await supabase.from('clients').insert([action.payload]);
        }
        
        // Remove após sucesso
        offlineSyncService.removeAction(action.id);
        syncedCount++;
      } catch (error) {
        console.error(`Falha ao sincronizar ação ${action.id}:`, error);
        // Mantém a ação no array para tentar novamente depois
      }
    }

    return { status: 'success', count: syncedCount };
  }
};

// Listener global para sincronização automática quando a rede voltar
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Conexão restaurada. Sincronizando dados offline...');
    offlineSyncService.syncAll();
  });
}
