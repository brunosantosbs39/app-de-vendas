import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

const LEVEL_THRESHOLDS = [0, 1500, 5000, 10000, 18000, 28000, 40000, 55000, 75000, 100000];
const LEVEL_NAMES = ['Iniciante', 'Consultor', 'Profissional', 'Avançado', 'Especialista', 'Expert', 'Mestre', 'Elite', 'Lenda', 'Titã'];

function computeLevel(points: number) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const current = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level] || current + 10000;
  const missing = Math.max(0, next - points);
  const progressPct = Math.min(100, Math.round(((points - current) / (next - current)) * 100));

  return { level, name: LEVEL_NAMES[level - 1], missing, progressPct, next, current };
}

interface AppState {
  clients: any[];
  products: any[];
  orders: any[];
  installments: any[];
  appointments: any[];
  transactions: any[];
  notifications: any[];
  missions: any[];
  leader: any | null;
  levelInfo: any;
  userProfile: any | null;
  isLoading: boolean;
  
  fetchInitialData: (userId: string) => Promise<void>;
  refreshFinance: (userId: string) => Promise<void>;
  addClientState: (client: any) => void;
  addOrderState: (order: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  clients: [],
  products: [],
  orders: [],
  installments: [],
  appointments: [],
  transactions: [],
  notifications: [],
  missions: [],
  leader: null,
  levelInfo: computeLevel(0),
  userProfile: null,
  isLoading: false,

  addClientState: (client) => set((state) => ({ clients: [client, ...state.clients] })),
  addOrderState: (order) => set((state) => ({ orders: [order, ...state.orders] })),

  fetchInitialData: async (userId: string) => {
    set({ isLoading: true });
    try {
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
      const results = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', userId),
        supabase.from('products').select('*').eq('user_id', userId),
        supabase.from('orders').select('*, clients(name, phone)').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('installments').select('*, orders(*), clients:orders(clients(*))').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        supabase.from('leaderboard').select('*').eq('user_id', userId).single(),
        supabase.from('appointments').select('*, clients(*)').eq('user_id', userId).order('appointment_date', { ascending: true }),
        supabase.from('daily_missions').select('*').eq('user_id', userId).eq('date', today),
        supabase.from('profiles').select('*').eq('id', userId).single()
      ]);

      const [
        { data: clients, error: errClients },
        { data: products, error: errProducts },
        { data: orders, error: errOrders },
        { data: installments, error: errInstallments },
        { data: transactions, error: errTransactions },
        { data: notifications, error: errNotifications },
        { data: lb, error: errLb },
        { data: appointments, error: errAppointments },
        { data: missions, error: errMissions },
        { data: profile, error: errProfile }
      ] = results;

      // Map clients properly for installments if needed, or rely on joins
      const processedInstallments = (installments || []).map(inst => ({
         ...inst,
         client: (inst as any).orders?.clients
      }));

      // Log errors if any
      const errors = { errClients, errProducts, errOrders, errInstallments, errTransactions, errNotifications, errLb, errAppointments, errMissions, errProfile };
      Object.entries(errors).forEach(([key, val]) => {
        if (val && (val as any).code !== 'PGRST116') { // Ignore single() not found error
          console.error(`Erro ao carregar ${key}:`, val);
        }
      });

      set({ 
        clients: clients || [], 
        products: products || [], 
        orders: orders || [], 
        installments: processedInstallments,
        appointments: appointments || [],
        transactions: transactions || [],
        notifications: notifications || [],
        missions: missions || [],
        leader: lb || null,
        levelInfo: computeLevel(lb?.total_points || 0),
        userProfile: profile || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching initial data:', error);
      set({ isLoading: false });
    }
  },

  refreshFinance: async (userId: string) => {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    set({ transactions: transactions || [] });
  }
}));
