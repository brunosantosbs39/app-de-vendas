"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  MessageCircle, 
  MessageSquare,
  AlertCircle,
  Clock,
  ArrowRight,
  UserPlus,
  Loader2,
  Filter,
  DollarSign,
  TrendingUp,
  Tag,
  MapPin,
  ChevronRight,
  UserCheck,
  ShoppingCart,
  Zap,
  CircleDollarSign,
  CreditCard,
  AlertTriangle,
  Sparkles,
  Wallet,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { gamificationService } from "@/lib/gamification";
import { supabase } from "@/lib/supabase";
import { mapsService } from "@/lib/maps";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const STAGES = [
  { id: 'contato', label: 'Contato', color: 'bg-slate-500' },
  { id: 'interessado', label: 'Interessado', color: 'bg-blue-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-yellow-500' },
  { id: 'fechado', label: 'Fechado', color: 'bg-primary' },
  { id: 'pos_venda', label: 'Pós-Venda', color: 'bg-purple-500' },
];

export default function ClientsPage() {
  const { user } = useAuth();
  const { clients, orders, fetchInitialData, isLoading, products } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", region: "", address: "", store_name: "" });

  // Estado da Venda
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleStep, setSaleStep] = useState(1);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<any>(null);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<any>(null);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [clientInstallments, setClientInstallments] = useState<any[]>([]);
  const [saleData, setSaleData] = useState({
    productId: "",
    amountPaid: 0,
    paymentMethod: "pix",
    installments: 1,
    installmentDates: [new Date().toISOString().split('T')[0]]
  });

  useEffect(() => {
    if (user) fetchInitialData(user.id);
  }, [user]);

  // Atualizar datas das parcelas quando o número de parcelas mudar
  useEffect(() => {
    setSaleData(prev => {
      const newDates = [...prev.installmentDates];
      if (prev.installments > newDates.length) {
        for (let i = newDates.length; i < prev.installments; i++) {
          const lastDate = new Date(newDates[i - 1] || new Date());
          lastDate.setMonth(lastDate.getMonth() + 1);
          newDates.push(lastDate.toISOString().split('T')[0]);
        }
      } else {
        newDates.splice(prev.installments);
      }
      return { ...prev, installmentDates: newDates };
    });
  }, [saleData.installments]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Enriquecer dados dos clientes com faturamento (LTV), dívida e ORDENAÇÃO (Novos Leads no topo)
  const enrichedClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map(client => {
        const clientOrders = orders.filter(o => o.client_id === client.id);
        const totalRevenue = clientOrders.reduce((acc, curr) => acc + curr.total_amount, 0);
        const totalPaid = clientOrders.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
        const debt = totalRevenue - totalPaid;
        
        return {
          ...client,
          ltv: totalRevenue,
          debt: debt,
          ordersCount: clientOrders.length
        };
      });
  }, [clients, orders]);

  const detailsStats = useMemo(() => {
    if (!selectedClientForDetails) return { ltv: 0, debt: 0 };
    return enrichedClients.find(c => c.id === selectedClientForDetails.id) || { ltv: 0, debt: 0 };
  }, [selectedClientForDetails, enrichedClients]);

  const filteredClients = enrichedClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm);
    const matchesFilter = filterStage ? client.funnel_stage === filterStage : true;
    return matchesSearch && matchesFilter;
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sessão expirada. Refaça o login.");
      return;
    }
    
    setIsAdding(true);
    try {
      const { data, error } = await supabase.from('clients').insert([{
        name: newClient.name,
        phone: newClient.phone,
        email: newClient.email || null,
        region: newClient.region || null,
        user_id: user.id,
        funnel_stage: 'contato'
      }]).select().single();
      
      if (error) {
        if (error.code === '23505') toast.error("WhatsApp já cadastrado.");
        else toast.error(`Erro: ${error.message}`);
        return;
      }

      if (newClient.address && data) {
        mapsService.geocodeAddress(newClient.address).then(async (geo) => {
          if (geo) await supabase.from('clients').update({ latitude: geo.lat, longitude: geo.lng }).eq('id', data.id);
        });
      }

      setNewClient({ name: "", phone: "", email: "", region: "", address: "", store_name: "" });
      await fetchInitialData(user.id);
      toast.success("✅ Cliente cadastrado!");
      
      const closeButton = document.querySelector('[data-state="open"] button[aria-label="Close"]') as HTMLButtonElement;
      if (closeButton) closeButton.click();

    } catch (err: any) {
      toast.error("Erro inesperado.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreateSale = async () => {
    if (!user || !selectedClient || !saleData.productId) {
      toast.warning("Selecione o produto.");
      return;
    }
    setIsProcessingSale(true);
    try {
      const product = products.find(p => p.id === saleData.productId);
      const totalAmount = Number(product?.price || 0);
      const paid = Number(saleData.amountPaid || 0);
      const remainingAmount = totalAmount - paid;
      
      const { data: order, error: orderError } = await supabase.from('orders').insert([{
        user_id: user.id,
        client_id: selectedClient.id,
        total_amount: totalAmount,
        amount_paid: paid,
        status: paid >= totalAmount ? 'paid' : 'pending',
        payment_method: saleData.paymentMethod
      }]).select().single();
      
      if (orderError) throw orderError;

      // Vincular o produto na tabela order_items
      await supabase.from('order_items').insert([{
        order_id: order.id,
        product_id: saleData.productId,
        quantity: 1,
        unit_price: totalAmount
      }]);

      if (paid > 0) {
        await supabase.from('transactions').insert([{
          user_id: user.id,
          amount: paid,
          type: 'entrada',
          category: 'venda',
          description: `Venda: ${product?.name}`,
          order_id: order.id
        }]);
      }

      if (remainingAmount > 0) {
        const installmentValue = remainingAmount / saleData.installments;
        const installmentsToInsert = saleData.installmentDates.map((date) => ({
          order_id: order.id,
          user_id: user.id,
          amount: installmentValue,
          due_date: date,
          status: 'pending'
        }));
        await supabase.from('installments').insert(installmentsToInsert);
      }

      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'sale',
        title: 'Venda de Elite!',
        content: `Confirmado: ${product?.name} para ${selectedClient.name}.`,
        link: '/financeiro'
      }]);

      if (product) {
        await supabase.from('products').update({ stock_quantity: Math.max(0, (product.stock_quantity || 0) - 1) }).eq('id', product.id);
      }

      setIsSaleModalOpen(false);
      setSaleStep(1);
      setSaleData({ productId: "", amountPaid: 0, paymentMethod: "pix", installments: 1, installmentDates: [new Date().toISOString().split('T')[0]] });
      
      // Recarregar dados globais (LTV, etc) e o histórico do cliente específico
      await fetchInitialData(user.id);
      if (selectedClient) await fetchClientHistory(selectedClient.id);
      
      toast.success("Venda registrada com sucesso! 🚀");
      
    } catch (e: any) { 
      toast.error("Erro ao salvar: " + (e.message || "Tente novamente"));
    } finally { 
      setIsProcessingSale(false); 
    }
  };

  const currentSelectedProduct = useMemo(() => products.find(p => p.id === saleData.productId), [products, saleData.productId]);

  const handleOpenSaleModal = (client: any) => {
    setSelectedClient(client);
    setSaleStep(1);
    setIsSaleModalOpen(true);
  };

  const handleOpenClientDetails = async (client: any) => {
    setSelectedClientForDetails(client);
  };

  useEffect(() => {
    if (selectedClientForDetails) {
      fetchClientHistory(selectedClientForDetails.id);
    }
  }, [selectedClientForDetails, orders]); // Recarrega se o cliente mudar ou se houver novas ordens globais

  const handleSendReceiptWhatsApp = (client: any, order: any, installments: any[]) => {
    const isProgramada = order.payment_method === 'pendente';
    const dataVenda = format(new Date(order.created_at), "dd/MM/yyyy");
    const horaVenda = format(new Date(order.created_at), "HH:mm");

    let receiptText = `*RECIBO DE VENDA - SISTEMA ELITE*\n`;
    receiptText += `------------------------------------------\n`;
    receiptText += `*DATA:* ${dataVenda} às ${horaVenda}\n`;
    receiptText += `*CLIENTE:* ${client.name}\n`;
    if (client.phone) receiptText += `*WHATSAPP:* ${client.phone}\n`;
    if (client.store_name) receiptText += `*LOJA/LOCAL:* ${client.store_name}\n`;
    if (client.address) receiptText += `*ENDEREÇO:* ${client.address}\n`;
    receiptText += `------------------------------------------\n`;
    receiptText += `*PRODUTO:* ${order.products?.name || 'Venda Elite'}\n`;
    receiptText += `*VALOR TOTAL:* ${formatCurrency(order.total_amount)}\n`;
    receiptText += `*FORMA:* ${order.payment_method.toUpperCase()}\n`;
    
    // SÓ MOSTRA PARCELAS SE FOR VENDA PROGRAMADA
    if (isProgramada && installments.length > 0) {
      receiptText += `------------------------------------------\n`;
      receiptText += `*CRONOGRAMA DE PAGAMENTO:*\n`;
      installments.forEach((inst, idx) => {
        const status = inst.status === 'paid' ? '✅ PAGO' : '⏳ PENDENTE';
        receiptText += `${idx + 1}ª Parcela: ${formatCurrency(inst.amount)} - ${format(new Date(inst.due_date), 'dd/MM')} (${status})\n`;
      });
    }

    receiptText += `------------------------------------------\n`;
    receiptText += `*STATUS:* ${order.status === 'paid' ? 'TOTALMENTE QUITADO' : 'AGUARDANDO PAGAMENTO'}\n\n`;
    receiptText += `_Obrigado pela confiança!_`;

    const message = encodeURIComponent(receiptText);
    window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${message}`, "_blank");
  };

  const fetchClientHistory = async (clientId: string) => {
    console.log("Buscando histórico para o cliente:", clientId);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, products(name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (ordersError) {
        console.error("Erro ao buscar ordens:", ordersError);
        return;
      }

      console.log("Ordens encontradas:", ordersData?.length, ordersData);

      const { data: instData, error: instError } = await supabase
        .from('installments')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true });

      if (instError) {
        console.error("Erro ao buscar parcelas:", instError);
      }

      setClientOrders(ordersData || []);
      const orderIds = (ordersData || []).map(o => o.id);
      const filteredInst = (instData || []).filter(i => orderIds.includes(i.order_id));
      
      console.log("Parcelas filtradas para estas ordens:", filteredInst.length);
      setClientInstallments(filteredInst);
    } catch (e) {
      console.error("Erro inesperado no fetchClientHistory:", e);
    }
  };

  const handlePayInstallment = async (orderId: string, amount: number) => {
    if (!user || !amount || amount <= 0) return;
    try {
      // 1. Registrar a Transação de Entrada
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: amount,
        type: 'entrada',
        category: 'venda',
        description: `Recebimento de parcela (Ordem: ${orderId.slice(0, 8)})`,
        order_id: orderId
      }]);

      // 2. Atualizar a Ordem (Somar ao valor já pago)
      const { data: currentOrder } = await supabase.from('orders').select('amount_paid, total_amount').eq('id', orderId).single();
      const newPaidAmount = (currentOrder?.amount_paid || 0) + amount;
      
      await supabase.from('orders').update({ 
        amount_paid: newPaidAmount,
        status: newPaidAmount >= (currentOrder?.total_amount || 0) ? 'paid' : 'pending'
      }).eq('id', orderId);

      // 3. Dar baixa nas parcelas (Lógica de cascata)
      const { data: pending } = await supabase
        .from('installments')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (pending && pending.length > 0) {
        let remainingToApply = amount;
        const updates = [];

        for (const inst of pending) {
          if (remainingToApply <= 0) break;

          if (remainingToApply >= inst.amount) {
            // Quita a parcela integralmente
            updates.push(supabase.from('installments').update({ 
              status: 'paid', 
              paid_at: new Date().toISOString() 
            }).eq('id', inst.id));
            remainingToApply -= inst.amount;
          } else {
            // Pagamento parcial da parcela: abate o valor e mantém pendente ou cria nova lógica
            // Para manter simples e funcional: subtraímos o valor da parcela atual
            updates.push(supabase.from('installments').update({ 
              amount: inst.amount - remainingToApply 
            }).eq('id', inst.id));
            remainingToApply = 0;
          }
        }
        await Promise.all(updates);
      }

      toast.success(`Recebido: ${formatCurrency(amount)}! 💸`);
      
      // 4. FORÇAR REFRESH TOTAL
      await fetchInitialData(user.id);
      if (selectedClientForDetails) {
        await fetchClientHistory(selectedClientForDetails.id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao processar pagamento.");
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClient) return;
    setIsAdding(true);
    
    const { error } = await supabase.from('clients').update({
      name: selectedClient.name,
      phone: selectedClient.phone,
      region: selectedClient.region,
      address: selectedClient.address,
      store_name: selectedClient.store_name,
      funnel_stage: selectedClient.funnel_stage
    }).eq('id', selectedClient.id);
    
    if (!error) {
      setIsEditing(false);
      await fetchInitialData(user.id);
      toast.success("Cliente atualizado!");
    } else {
      toast.error("Erro ao atualizar.");
    }
    setIsAdding(false);
  };

  const handleDeleteClient = async (id: string) => {
    if(!confirm("Deseja excluir este cliente?")) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if(!error) {
      setIsEditing(false);
      await fetchInitialData(user!.id);
      toast.success("Cliente removido.");
    }
  };

  const handleWhatsApp = (client: any) => {
    const message = encodeURIComponent(`Olá ${client.name}! Tudo bem?`);
    window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${message}`, "_blank");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Gestão de Clientes" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-10 pb-32 md:pb-40 space-y-8 md:space-y-12 max-w-[1600px] mx-auto w-full"
      >
        
        {/* Sumário CRM */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <motion.div variants={item}>
              <Card className="bg-[#202020] border border-white/5 p-6 rounded-[2rem]">
                 <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total de Clientes</div>
                 <div className="text-3xl font-black text-white">{clients.length}</div>
              </Card>
           </motion.div>
           <motion.div variants={item}>
              <Card className="bg-[#202020] border border-white/5 p-6 rounded-[2rem]">
                 <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Taxa de Conversão</div>
                 <div className="text-3xl font-black text-primary">{Math.round((clients.filter(c => c.funnel_stage === 'fechado').length / (clients.length || 1)) * 100)}%</div>
              </Card>
           </motion.div>
           <motion.div variants={item}>
              <Card className="bg-[#202020] border border-white/5 p-6 rounded-[2rem]">
                 <div className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">Inadimplentes</div>
                 <div className="text-3xl font-black text-secondary">{enrichedClients.filter(c => c.debt > 0).length}</div>
              </Card>
           </motion.div>
           <motion.div variants={item}>
              <Card className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem]">
                 <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Novos Leads (Mês)</div>
                 <div className="text-3xl font-black text-white">+12</div>
              </Card>
           </motion.div>
        </section>

        {/* Search and Filters */}
        <motion.section variants={item} className="space-y-6">
           <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={20} />
                 <Input 
                   placeholder="Pesquisar cliente..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="h-16 bg-[#202020] border-none rounded-2xl pl-12 text-lg focus-visible:ring-primary w-full"
                 />
              </div>
              <Dialog>
                 <DialogTrigger render={
                    <button className="shiny-cta h-[70px]! min-h-[70px]! px-10 rounded-full flex items-center justify-center cursor-pointer w-full sm:w-auto mt-4 sm:mt-0 flex-shrink-0 relative overflow-hidden">
                       <span className="relative z-[100] text-white text-base font-black uppercase tracking-widest drop-shadow-md">
                          Novo Cliente
                       </span>
                    </button>
                 } />
                 <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-0 max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-8 pb-0">
                       <DialogTitle className="text-2xl font-black uppercase">Cadastrar Cliente</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                       <form id="add-client-form" onSubmit={handleAddClient} className="space-y-6 pb-20">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome Completo</Label>
                             <Input value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4" required />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">WhatsApp</Label>
                             <Input value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4" required />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Bairro/Região</Label>
                             <Input value={newClient.region} onChange={e => setNewClient({...newClient, region: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Endereço Completo</Label>
                             <Input 
                               value={newClient.address} 
                               onChange={e => setNewClient({...newClient, address: e.target.value})} 
                               placeholder="Rua, Nº, Bairro, Cidade"
                               className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4" 
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">local/loja</Label>
                             <Input 
                               value={newClient.store_name} 
                               onChange={e => setNewClient({...newClient, store_name: e.target.value})} 
                               placeholder="Nome da loja"
                               className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4" 
                             />
                          </div>
                          <Button type="submit" disabled={isAdding} className="btn-primary w-full h-16 rounded-2xl flex items-center justify-center gap-2">
                             {isAdding ? <Loader2 className="animate-spin" size={20} /> : "CADASTRAR"}
                          </Button>
                       </form>
                    </div>
                 </DialogContent>
              </Dialog>
           </div>

           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button onClick={() => setFilterStage(null)} variant={filterStage === null ? "default" : "ghost"} className={`rounded-xl px-6 font-black uppercase text-[10px] ${filterStage === null ? 'bg-primary text-background' : 'text-slate-500'}`}>Todos</Button>
              {STAGES.map(s => (
                <Button key={s.id} onClick={() => setFilterStage(s.id)} variant={filterStage === s.id ? "default" : "ghost"} className={`rounded-xl px-6 font-black uppercase text-[10px] ${filterStage === s.id ? 'bg-primary text-background' : 'text-slate-500'}`}>{s.label}</Button>
              ))}
           </div>
        </motion.section>

        {/* Client Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="col-span-full flex justify-center p-20"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>
              ) : filteredClients.length === 0 ? (
                <div className="col-span-full text-center py-24 opacity-20"><UserCheck size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest">Nenhum cliente filtrado</p></div>
              ) : filteredClients.map((client) => (
                <motion.div key={client.id} variants={item} layout>
                   <Card className="bg-[#202020] border border-white/5 rounded-[2rem] p-5 sm:p-8 space-y-4 group hover:border-primary/20 transition-all relative overflow-hidden">
                      <div className="flex justify-between items-start relative z-10">
                         <div 
                            className="flex gap-3 items-center cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleOpenClientDetails(client)}
                         >
                            <div className="h-12 w-12 bg-white/5 rounded-xl flex items-center justify-center text-primary text-xl font-black border border-white/5 flex-shrink-0">
                               {client.name[0]}
                            </div>
                            <div className="min-w-0">
                               <h4 className="text-lg font-black text-white uppercase tracking-tighter italic truncate max-w-[140px] leading-tight">{client.name}</h4>
                               <div className="flex items-center gap-2 mt-0.5">
                                  <Badge className="bg-primary/10 text-primary border-none text-[6px] font-black uppercase px-1.5 py-0">{STAGES.find(s => s.id === client.funnel_stage)?.label}</Badge>
                                  <span className="text-[8px] text-slate-600 font-bold uppercase truncate">{client.region || 'S/ Região'}</span>
                               </div>
                            </div>
                         </div>
                         <Button onClick={() => handleWhatsApp(client)} variant="ghost" size="icon" className="h-10 w-10 rounded-lg bg-white/5 text-primary hover:bg-primary hover:text-background transition-all flex-shrink-0">
                            <MessageSquare size={18} />
                         </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 relative z-10">
                         <div className="space-y-0.5">
                            <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest leading-none">LTV</div>
                            <div className="text-base font-black text-white">{formatCurrency(client.ltv)}</div>
                         </div>
                         <div className="space-y-0.5 text-right">
                            <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest leading-none">Dívida</div>
                            <div className={`text-base font-black ${client.debt > 0 ? 'text-secondary' : 'text-primary'}`}>
                               {client.debt > 0 ? formatCurrency(client.debt) : 'EM DIA'}
                            </div>
                         </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 relative z-10">
                         <div className="flex items-center gap-2">
                            <button onClick={() => handleOpenSaleModal(client)} className="h-10 px-4 bg-primary text-background rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                               NOVA VENDA
                            </button>
                            <button 
                               onClick={() => {
                                  setSelectedClientForHistory(client);
                                  fetchClientHistory(client.id);
                               }}
                               className="h-10 px-4 bg-white/5 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-all"
                            >
                               HISTÓRICO
                            </button>
                         </div>
                         <button onClick={() => { setSelectedClient(client); setIsEditing(true); }} className="text-slate-700 group-hover:text-primary transition-colors p-1">
                            <ChevronRight size={16} />
                         </button>
                      </div>
                   </Card>
                </motion.div>
              ))}
           </AnimatePresence>
        </section>

        {/* MODAL DE EDIÇÃO DE CLIENTE EXPANDIDO */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
           <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] p-0 max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <DialogHeader className="p-8 pb-4">
                 <DialogTitle className="text-2xl font-black uppercase italic text-white flex items-center gap-3">
                    <UserPlus className="text-primary" />
                    <span>Editar <span className="text-primary not-italic">Cadastro</span></span>
                 </DialogTitle>
              </DialogHeader>
              
              {selectedClient && (
                <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
                   {/* RESUMO FINANCEIRO RÁPIDO */}
                   <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                         <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Total Comprado (LTV)</p>
                         <p className="text-sm font-black text-white">{formatCurrency(enrichedClients.find(c => c.id === selectedClient.id)?.ltv || 0)}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                         <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Dívida Pendente</p>
                         <p className={`text-sm font-black ${enrichedClients.find(c => c.id === selectedClient.id)?.debt > 0 ? 'text-secondary' : 'text-primary'}`}>
                            {formatCurrency(enrichedClients.find(c => c.id === selectedClient.id)?.debt || 0)}
                         </p>
                      </div>
                   </div>

                   <form onSubmit={handleEditClient} className="space-y-5 pb-10">
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome Completo</Label>
                         <Input value={selectedClient.name} onChange={e => setSelectedClient({...selectedClient, name: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4 font-bold" required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">WhatsApp</Label>
                           <Input value={selectedClient.phone} onChange={e => setSelectedClient({...selectedClient, phone: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4 font-bold" required />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Estágio (Funil)</Label>
                           <select 
                              value={selectedClient.funnel_stage} 
                              onChange={e => setSelectedClient({...selectedClient, funnel_stage: e.target.value})}
                              className="w-full h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-3 font-bold text-sm outline-none appearance-none"
                           >
                              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                           </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Bairro/Região</Label>
                         <Input value={selectedClient.region || ""} onChange={e => setSelectedClient({...selectedClient, region: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4 font-bold" />
                      </div>

                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Endereço Completo</Label>
                         <Input value={selectedClient.address || ""} onChange={e => setSelectedClient({...selectedClient, address: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4 font-bold text-sm" placeholder="Rua, Número, Cidade..." />
                      </div>

                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome da Loja/Local</Label>
                         <Input value={selectedClient.store_name || ""} onChange={e => setSelectedClient({...selectedClient, store_name: e.target.value})} className="h-14 bg-[#0F0F0F] border-none rounded-xl text-white px-4 font-bold" placeholder="Ex: Mercado do João" />
                      </div>

                      <div className="flex gap-4 pt-4">
                         <Button type="button" variant="destructive" onClick={() => handleDeleteClient(selectedClient.id)} className="h-16 px-6 rounded-[1.5rem] font-black uppercase bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-none shadow-none">Excluir</Button>
                         <Button type="submit" disabled={isAdding} className="flex-1 h-16 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-[1.5rem] shadow-lg shadow-primary/20">
                            {isAdding ? <Loader2 className="animate-spin" /> : "SALVAR ALTERAÇÕES"}
                         </Button>
                      </div>
                   </form>
                </div>
              )}
           </DialogContent>
        </Dialog>

        {/* MODAL NOVA VENDA */}
        <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
           <DialogContent className="bg-[#0F0F0F] border-white/10 rounded-[2.5rem] p-0 max-w-md text-white overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] z-[200]">
             <div className="p-6 pb-12 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
               <DialogHeader>
                 <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1">Venda para {selectedClient?.name}</Badge>
                    <div className="flex gap-1.5">
                       <div className={cn("h-1.5 w-8 rounded-full transition-all", saleStep >= 1 ? "bg-primary" : "bg-white/10")} />
                       <div className={cn("h-1.5 w-8 rounded-full transition-all", saleStep >= 2 ? "bg-primary" : "bg-white/10")} />
                    </div>
                 </div>
                 <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                    {saleStep === 1 ? <ShoppingCart className="text-primary w-7 h-7" /> : <Wallet className="text-primary w-7 h-7" />}
                    {saleStep === 1 ? "O QUE ELE COMPROU?" : "PAGAMENTO"}
                 </DialogTitle>
               </DialogHeader>

               <AnimatePresence mode="wait">
                 {saleStep === 1 ? (
                   <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[9px] font-black text-slate-500 uppercase ml-1 tracking-[0.2em] flex items-center gap-2">
                           <Tag size={12} className="text-primary" /> ESCOLHA O PRODUTO
                        </Label>
                        <Select value={saleData.productId} onValueChange={(val) => setSaleData({...saleData, productId: val as string})}>
                           <SelectTrigger className="h-16 bg-white/[0.03] border border-white/5 rounded-2xl text-base font-bold px-6 focus:ring-primary/50 w-full overflow-hidden">
                              <SelectValue placeholder="Qual produto?" />
                           </SelectTrigger>
                           <SelectContent className="bg-[#1A1A1A] border-white/10 text-white max-h-60">
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id} className="h-12 font-bold focus:bg-primary focus:text-background text-white uppercase italic">{p.name}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                      </div>
                      <Button
                        disabled={!saleData.productId}
                        onClick={() => setSaleStep(2)}
                        className="w-full h-16 bg-primary text-background font-black uppercase text-xs rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-3 mt-4"
                      >
                         PRÓXIMA ETAPA <ArrowRight size={18} />
                      </Button>
                   </motion.div>
                 ) : (
                   <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 py-2">
                      <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Resumo da Venda</p>
                            <p className="text-lg font-black text-white italic uppercase tracking-tighter">{currentSelectedProduct?.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedClient?.name}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xl font-black text-primary tracking-tighter">{formatCurrency(currentSelectedProduct?.price || 0)}</p>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <Label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.3em]">Quanto foi recebido agora?</Label>
                         <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-primary text-xl italic">R$</span>
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              className="h-16 bg-[#1A1A1A] border-white/5 rounded-2xl text-2xl font-black text-white pl-16 focus-visible:ring-primary shadow-inner"
                              onChange={(e) => setSaleData({...saleData, amountPaid: parseFloat(e.target.value) || 0})}
                            />
                         </div>
                      </div>

                      <div className="space-y-3">
                         <Label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.3em]">Forma de Pagamento</Label>
                         <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'pix', icon: Zap, label: 'PIX' },
                              { id: 'dinheiro', icon: CircleDollarSign, label: 'Dinheiro' },
                              { id: 'cartao', icon: CreditCard, label: 'Cartão' },
                              { id: 'pendente', icon: AlertTriangle, label: 'Venda Programada' },
                            ].map((m) => (
                               <button 
                                  key={m.id}
                                  onClick={() => setSaleData({...saleData, paymentMethod: m.id})}
                                  className={cn(
                                    "h-14 rounded-xl border flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest",
                                    saleData.paymentMethod === m.id 
                                      ? "bg-primary border-primary text-background shadow-[0_0_20px_rgba(93,214,44,0.3)]" 
                                      : "bg-[#1A1A1A] border-white/5 text-slate-600 hover:border-primary/30"
                                  )}
                               >
                                  <m.icon size={16} /> {m.label}
                               </button>
                            ))}
                         </div>
                      </div>

                      {/* OPÇÕES DE PARCELAMENTO/DATA (SÓ APARECE SE VENDA PROGRAMADA) */}
                      {saleData.paymentMethod === 'pendente' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2 overflow-hidden">
                           <div className="space-y-3">
                              <Label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.3em]">Parcelar em quantas vezes?</Label>
                              <div className="grid grid-cols-3 gap-2">
                                 {[1, 2, 3].map(n => (
                                    <button 
                                       key={n}
                                       onClick={() => setSaleData({...saleData, installments: n})}
                                       className={cn(
                                          "h-12 rounded-xl border font-black text-xs transition-all",
                                          saleData.installments === n ? "bg-primary/20 border-primary text-primary" : "bg-[#1A1A1A] border-white/5 text-slate-600"
                                       )}
                                    >
                                       {n}x {n > 1 && <span className="text-[8px] opacity-60">({formatCurrency((currentSelectedProduct?.price || 0) / n)})</span>}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           
                           <div className="space-y-4 pt-2">
                              <Label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-[0.3em]">Datas de Vencimento</Label>
                              <div className="space-y-3">
                                 {saleData.installmentDates.map((date, idx) => (
                                    <div key={idx} className="relative">
                                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary uppercase">{idx + 1}ª Parcela</span>
                                       <Input 
                                          type="date" 
                                          value={date}
                                          onChange={(e) => {
                                             const newDates = [...saleData.installmentDates];
                                             newDates[idx] = e.target.value;
                                             setSaleData({...saleData, installmentDates: newDates});
                                          }}
                                          className="h-14 bg-[#1A1A1A] border-white/5 rounded-xl text-white font-bold pl-24 text-right pr-4"
                                       />
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </motion.div>
                      )}

                      <div className="flex gap-4 pt-2">
                         <Button variant="ghost" onClick={() => setSaleStep(1)} className="h-14 w-14 rounded-xl text-slate-500 hover:bg-white/5 border border-white/5"><X size={20} /></Button>
                         <Button 
                            onClick={handleCreateSale} 
                            disabled={isProcessingSale}
                            className="flex-1 h-14 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-3"
                         >
                            {isProcessingSale ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> FINALIZAR VENDA</>}
                         </Button>
                      </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           </DialogContent>
        </Dialog>

        {/* MODAL HISTÓRICO DE COMPRAS E PARCELAS */}
        <Dialog open={!!selectedClientForHistory} onOpenChange={(open) => !open && setSelectedClientForHistory(null)}>
           <DialogContent className="bg-[#0F0F0F] border-white/10 rounded-[2.5rem] p-0 max-w-2xl text-white overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] z-[200]">
             <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader>
                   <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1">Linha do Tempo</Badge>
                      <button onClick={() => setSelectedClientForHistory(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                   </div>
                   <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">
                      Histórico: <span className="text-primary not-italic">{selectedClientForHistory?.name}</span>
                   </DialogTitle>
                </DialogHeader>

                <div className="space-y-8 pt-4">
                   {clientOrders.length === 0 ? (
                      <div className="py-20 text-center opacity-30">
                         <Clock size={48} className="mx-auto mb-4" />
                         <p className="font-black uppercase tracking-widest text-xs">Nenhuma compra registrada</p>
                      </div>
                   ) : (
                      clientOrders.map((order) => {
                         const orderInstallments = clientInstallments.filter(i => i.order_id === order.id);
                         const pendingValue = order.total_amount - (order.amount_paid || 0);

                         return (
                            <div key={order.id} className="bg-white/[0.03] border border-white/5 rounded-[2rem] overflow-hidden">
                               <div className="p-6 flex justify-between items-center border-b border-white/5">
                                  <div>
                                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{format(new Date(order.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}</div>
                                     <h5 className="text-lg font-black text-white italic uppercase">{order.products?.name || 'Venda'}</h5>
                                  </div>
                                  <div className="text-right">
                                     <div className="text-[8px] font-black text-primary uppercase tracking-widest">Total</div>
                                     <div className="text-xl font-black text-white">{formatCurrency(order.total_amount)}</div>
                                  </div>
                               </div>

                               <div className="p-6 space-y-4">
                                  {orderInstallments.length > 0 ? (
                                     <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                           <CreditCard size={12} className="text-primary" /> Detalhamento de Parcelas
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                           {orderInstallments.map((inst, idx) => (
                                              <div key={inst.id} className={cn(
                                                 "flex justify-between items-center p-4 rounded-xl border transition-all",
                                                 inst.status === 'paid' ? "bg-primary/5 border-primary/20 opacity-60" : "bg-[#1A1A1A] border-white/5"
                                              )}>
                                                 <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                       "h-8 w-8 rounded-full flex items-center justify-center font-black text-[10px]",
                                                       inst.status === 'paid' ? "bg-primary text-background" : "bg-white/5 text-slate-500"
                                                    )}>
                                                       {idx + 1}
                                                    </div>
                                                    <div>
                                                       <div className="text-[9px] font-bold text-slate-500 uppercase">Vencimento</div>
                                                       <div className="text-sm font-black text-white">{format(new Date(inst.due_date), "dd/MM/yyyy")}</div>
                                                    </div>
                                                 </div>
                                                 <div className="text-right flex items-center gap-6">
                                                    <div>
                                                       <div className="text-[9px] font-bold text-slate-500 uppercase">Valor</div>
                                                       <div className="text-sm font-black text-white">{formatCurrency(inst.amount)}</div>
                                                    </div>
                                                    <div className={cn(
                                                       "text-[8px] font-black px-2 py-1 rounded-md uppercase",
                                                       inst.status === 'paid' ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
                                                    )}>
                                                       {inst.status === 'paid' ? 'Pago' : 'Pendente'}
                                                    </div>
                                                 </div>
                                              </div>
                                           ))}
                                        </div>

                                        {pendingValue > 0 && (
                                           <div className="pt-4 mt-4 border-t border-white/5 flex gap-4">
                                              <div className="flex-1 space-y-2">
                                                 <Label className="text-[9px] font-black text-slate-500 uppercase ml-1">Valor para Quitar</Label>
                                                 <Input 
                                                   type="number" 
                                                   placeholder="Quanto o cliente pagou?" 
                                                   className="h-12 bg-[#1A1A1A] border-white/5 rounded-xl text-white font-bold"
                                                   onKeyDown={(e: any) => {
                                                      if (e.key === 'Enter') {
                                                         handlePayInstallment(order.id, parseFloat(e.target.value));
                                                         e.target.value = '';
                                                      }
                                                   }}
                                                 />
                                              </div>
                                              <Button 
                                                onClick={(e: any) => {
                                                   const val = e.currentTarget.previousSibling.querySelector('input').value;
                                                   if (val) handlePayInstallment(order.id, parseFloat(val));
                                                }}
                                                className="h-12 mt-6 bg-primary text-background font-black uppercase text-[10px] rounded-xl px-6"
                                              >
                                                 RECEBER
                                              </Button>
                                           </div>
                                        )}
                                     </div>
                                  ) : (
                                     <div className="flex justify-between items-center text-sm font-bold text-slate-500 italic">
                                        <span>Pagamento à vista realizado.</span>
                                        <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-2">Finalizado</Badge>
                                     </div>
                                  )}
                               </div>
                            </div>
                         );
                      })
                   )}
                </div>
             </div>
           </DialogContent>
        </Dialog>

        {/* MODAL DE PERFIL DETALHADO DO CLIENTE - REFINADO */}
        <Dialog open={!!selectedClientForDetails} onOpenChange={(open) => !open && setSelectedClientForDetails(null)}>
           <DialogContent className="bg-[#0F0F0F] border-white/10 rounded-[2.5rem] p-0 max-w-2xl text-white overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] z-[200]">
             <div className="max-h-[90vh] overflow-y-auto no-scrollbar">
                
                {/* HEADER COM DESIGN ELITE */}
                <div className="relative p-8 pb-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                   <button onClick={() => setSelectedClientForDetails(null)} className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-slate-500 hover:text-white transition-all"><X size={20} /></button>
                   
                   <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                      <div className="h-24 w-24 bg-gradient-to-br from-primary to-[#337418] rounded-[2rem] flex items-center justify-center text-background text-4xl font-black shadow-[0_10px_30px_rgba(93,214,44,0.3)] flex-shrink-0">
                         {selectedClientForDetails?.name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">{selectedClientForDetails?.name}</h2>
                         <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                            <Badge className="bg-primary/20 text-primary border-none font-black uppercase text-[8px] px-2.5 py-1 tracking-widest">{STAGES.find(s => s.id === selectedClientForDetails?.funnel_stage)?.label}</Badge>
                            <Badge className="bg-white/5 text-slate-400 border border-white/10 font-bold uppercase text-[8px] px-2.5 py-1 flex items-center gap-1.5">
                               <MessageSquare size={10} className="text-primary" /> {selectedClientForDetails?.phone}
                            </Badge>
                         </div>
                         <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                            {selectedClientForDetails?.region && (
                               <Badge className="bg-white/5 text-slate-500 border-none font-bold uppercase text-[7px] px-2 py-0.5">{selectedClientForDetails.region}</Badge>
                            )}
                            {selectedClientForDetails?.store_name && (
                               <Badge className="bg-white/5 text-slate-500 border-none font-bold uppercase text-[7px] px-2 py-0.5 flex items-center gap-1"><MapPin size={8} /> {selectedClientForDetails.store_name}</Badge>
                            )}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                   {/* GRID DE INFORMAÇÕES - REESTRUTURADO PARA CABER NO LAYOUT */}
                   <div className="flex flex-col gap-4">
                      {/* ENDEREÇO E INFOS BÁSICAS */}
                      <div className="p-5 bg-white/[0.03] rounded-[1.5rem] border border-white/5">
                         <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <MapPin size={12} className="text-primary" /> Endereço de Entrega
                         </p>
                         <p className="text-sm font-bold text-white leading-relaxed">{selectedClientForDetails?.address || 'Não cadastrado'}</p>
                      </div>
                      
                      {/* CARDS FINANCEIROS - FORÇADO VERTICAL PARA EVITAR TRANSBORDAMENTO */}
                      <div className="grid grid-cols-1 gap-4">
                         {/* CARD FATURAMENTO LTV */}
                         <div className="p-5 bg-[#0F140D] rounded-[1.5rem] border border-primary/20 flex items-center justify-between group transition-all hover:border-primary/40">
                            <div className="flex-1">
                               <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">Faturamento (LTV)</p>
                               <p className="text-2xl font-black text-white italic tracking-tighter">
                                  {formatCurrency(enrichedClients.find(c => c.id === selectedClientForDetails?.id)?.ltv || 0)}
                               </p>
                            </div>
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 flex-shrink-0 ml-3">
                               <TrendingUp size={18} className="text-primary" />
                            </div>
                         </div>

                         {/* CARD SALDO DEVEDOR */}
                         <div className="p-5 bg-[#161616] rounded-[1.5rem] border border-white/5 flex items-center justify-between group transition-all">
                            <div className="flex-1">
                               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Saldo Devedor</p>
                               <div className="flex items-center gap-2">
                                  <div className="w-3 h-0.5 bg-slate-800 rounded-full flex-shrink-0" />
                                  <p className="text-2xl font-black text-primary italic tracking-tighter">
                                     {formatCurrency(enrichedClients.find(c => c.id === selectedClientForDetails?.id)?.debt || 0)}
                                  </p>
                                </div>
                            </div>
                            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 flex-shrink-0 ml-3">
                               <Wallet size={18} className="text-slate-700" />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* SEÇÃO DE COMPRAS - AJUSTADA */}
                   <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                         <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                            <ShoppingCart size={14} className="text-primary" /> Histórico de Compras
                         </h3>
                         <span className="text-[8px] font-black text-slate-600 uppercase bg-white/5 px-2 py-0.5 rounded-full">{clientOrders.length} PEDIDOS</span>
                      </div>
                      
                      <div className="space-y-3">
                         {clientOrders.length === 0 ? (
                            <div className="py-12 text-center bg-white/[0.01] rounded-[1.5rem] border border-dashed border-white/5">
                               <Clock size={32} className="mx-auto mb-3 text-slate-800" />
                               <p className="font-black uppercase tracking-[0.2em] text-[9px] text-slate-700">Nenhum registro encontrado</p>
                            </div>
                         ) : (
                            clientOrders.map((order) => {
                               const orderInstallments = clientInstallments.filter(i => i.order_id === order.id);
                               const pendingValue = order.total_amount - (order.amount_paid || 0);

                               return (
                                  <div key={order.id} className="bg-[#161616] border border-white/5 rounded-[1.5rem] overflow-hidden group hover:border-primary/20 transition-all">
                                     <div className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-white/[0.02]">
                                        <div className="flex-1 w-full">
                                           <div className="flex items-center gap-2 mb-1.5">
                                              <Badge className={cn("text-[6px] font-black uppercase px-1.5 py-0 border-none", pendingValue > 0 ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary")}>
                                                 {pendingValue > 0 ? 'Pendente' : 'Finalizado'}
                                              </Badge>
                                              <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">{format(new Date(order.created_at), "dd/MM/yyyy")}</span>
                                           </div>
                                           <h5 className="text-xl font-black text-white italic uppercase tracking-tighter truncate">{order.products?.name || 'Venda Elite'}</h5>
                                           <div className="flex items-center gap-6 mt-2">
                                              <div>
                                                 <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Valor Total</p>
                                                 <p className="text-lg font-black text-white italic">{formatCurrency(order.total_amount)}</p>
                                              </div>
                                              <div>
                                                 <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Saldo Pago</p>
                                                 <p className="text-lg font-black text-primary italic">{formatCurrency(order.amount_paid || 0)}</p>
                                              </div>
                                           </div>
                                        </div>
                                        
                                        <button 
                                          onClick={() => handleSendReceiptWhatsApp(selectedClientForDetails, order, orderInstallments)}
                                          className="w-full sm:w-auto h-12 px-6 bg-[#25D366] hover:bg-[#1DA851] text-background font-black uppercase text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 flex-shrink-0"
                                        >
                                           <MessageSquare size={16} /> RECIBO
                                        </button>
                                     </div>

                                     {/* DETALHAMENTO DE PARCELAS DENTRO DO CARD */}
                                     {orderInstallments.length > 0 && (
                                        <div className="p-4 bg-black/20 space-y-2">
                                           <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] mb-2 px-1">Cronograma de Parcelas</p>
                                           <div className="grid grid-cols-1 gap-1.5">
                                              {orderInstallments.map((inst, idx) => (
                                                 <div key={inst.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                                                    <div className="flex items-center gap-3">
                                                       <span className="text-[9px] font-black text-slate-700 w-4">{idx + 1}º</span>
                                                       <span className="text-[10px] font-bold text-white/60">{format(new Date(inst.due_date), "dd/MM")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                       <span className="text-xs font-black text-white/90">{formatCurrency(inst.amount)}</span>
                                                       {inst.status === 'pending' ? (
                                                          <button 
                                                             onClick={() => handlePayInstallment(order.id, inst.amount)}
                                                             className="px-3 py-1 bg-primary/20 hover:bg-primary text-primary hover:text-background text-[7px] font-black uppercase rounded-md transition-all border border-primary/30"
                                                          >
                                                             PAGAR
                                                          </button>
                                                       ) : (
                                                          <Badge className="text-[6px] font-black uppercase px-1.5 py-0 border-none bg-primary/10 text-primary/40">
                                                             Pago
                                                          </Badge>
                                                       )}
                                                    </div>
                                                 </div>
                                              ))}
                                           </div>
                                        </div>
                                     )}
                                  </div>
                               );
                            })
                         )}
                      </div>
                   </div>
                </div>
             </div>
           </DialogContent>
        </Dialog>

      </motion.div>
    </div>
  );
}
