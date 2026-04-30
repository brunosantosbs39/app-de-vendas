"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  DollarSign, 
  Loader2, 
  MoreVertical, 
  Trash2,
  PieChart,
  Calculator,
  TrendingUp,
  Percent,
  History,
  ArrowUpRight,
  ArrowDownRight,
  User,
  ShieldCheck,
  Tag,
  Coins
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function StockPage() {
  const { user } = useAuth();
  const { products, fetchInitialData, isLoading } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [logs, setLogs] = useState<any[]>([]);
  
  // Create Product States
  const [isAdding, setIsAdding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    cost_price: 0,
    stock_quantity: 0,
    min_stock_alert: 5
  });

  // Edit Product States
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchInitialData(user.id);
      if (activeTab === 'history') loadLogs();
    }
  }, [user, activeTab]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from('inventory_logs')
      .select('*, products(name)')
      .order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsAdding(true);
    
    try {
      const margin = newProduct.cost_price > 0 
        ? ((newProduct.price - newProduct.cost_price) / newProduct.cost_price) * 100 
        : 0;

      const { data, error } = await supabase.from('products').insert([{
        user_id: user.id,
        name: newProduct.name,
        price: newProduct.price,
        cost_price: newProduct.cost_price,
        stock_quantity: newProduct.stock_quantity,
        min_stock_alert: newProduct.min_stock_alert,
        margin_percent: margin
      }]).select().single();

      if (error) throw error;

      // Registrar log inicial
      await supabase.from('inventory_logs').insert([{
        product_id: data.id,
        user_id: user.id,
        quantity_change: data.stock_quantity,
        reason: 'cadastro_inicial'
      }]);

      toast.success("Produto catalogado com sucesso!");
      setIsModalOpen(false);
      setNewProduct({ name: "", price: 0, cost_price: 0, stock_quantity: 0, min_stock_alert: 5 });
      fetchInitialData(user.id);
    } catch (error: any) {
      toast.error("Erro ao cadastrar: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;
    setIsAdding(true);
    
    try {
      const margin = selectedProduct.cost_price > 0 
        ? ((selectedProduct.price - selectedProduct.cost_price) / selectedProduct.cost_price) * 100 
        : 0;

      const { error } = await supabase.from('products').update({
        name: selectedProduct.name,
        price: selectedProduct.price,
        cost_price: selectedProduct.cost_price,
        stock_quantity: selectedProduct.stock_quantity,
        min_stock_alert: selectedProduct.min_stock_alert,
        margin_percent: margin
      }).eq('id', selectedProduct.id);

      if (error) throw error;

      // Log simple update
      await supabase.from('inventory_logs').insert([{
        product_id: selectedProduct.id,
        user_id: user.id,
        quantity_change: 0,
        reason: 'atualizacao_dados'
      }]);

      toast.success("Ativo atualizado!");
      setIsEditing(false);
      setSelectedProduct(null);
      fetchInitialData(user.id);
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if(!confirm("Atenção: Tem certeza que deseja remover este ativo?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if(!error) {
      setIsEditing(false);
      fetchInitialData(user!.id);
      toast.success("Ativo removido.");
    }
  };

  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [products, searchTerm]
  );

  const stats = useMemo(() => ({
    totalValue: products.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0),
    lowStock: products.filter(p => p.stock_quantity <= (p.min_stock_alert || 5)).length,
    totalItems: products.reduce((acc, p) => acc + p.stock_quantity, 0),
    avgMargin: products.length > 0 
      ? products.reduce((acc, p) => acc + (p.margin_percent || 0), 0) / products.length 
      : 0
  }), [products]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Controle de Ativos" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-6 md:px-12 pt-4 md:pt-10 pb-40 space-y-12 max-w-[1600px] mx-auto w-full"
      >
        {/* KPI Row Premium */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Capital em Estoque", val: formatCurrency(stats.totalValue), icon: DollarSign, color: "text-white" },
            { label: "Ruptura de Estoque", val: stats.lowStock, icon: AlertTriangle, color: "text-secondary" },
            { label: "Volume de Unidades", val: stats.totalItems, icon: Package, color: "text-white" },
            { label: "Rentabilidade Média", val: `${Math.round(stats.avgMargin)}%`, icon: TrendingUp, color: "text-primary" }
          ].map((kpi, i) => (
            <motion.div key={i} variants={item}>
               <Card className="bg-[#1A1A1A] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
                     <kpi.icon size={100} className="text-primary" />
                  </div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</div>
                  <div className={`text-3xl font-black ${kpi.color}`}>{kpi.val}</div>
               </Card>
            </motion.div>
          ))}
        </section>

        {/* Navigation & Search */}
        <section className="flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="bg-[#1A1A1A] p-1.5 rounded-2xl border border-white/5 flex gap-2 w-full md:w-auto">
              <button onClick={() => setActiveTab('inventory')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-primary text-background shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}>Meu Inventário</button>
              <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-primary text-background shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}>Histórico Logs</button>
           </div>

           <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80 group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors" size={20} />
                 <Input 
                   placeholder="Buscar ativo..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="h-14 bg-[#1A1A1A] border-none rounded-2xl pl-12 text-lg focus-visible:ring-primary"
                 />
              </div>
              
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                 <DialogTrigger render={
                    <button className="shiny-cta h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0">
                       <Plus size={24} />
                    </button>
                 } />
                 <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[3rem] p-10 max-w-xl">
                    <DialogHeader>
                       <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Novo <span className="text-primary not-italic">Produto</span></DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddProduct} className="space-y-6 py-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nome do Ativo</Label>
                          <Input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="h-14 bg-black/40 border-none rounded-xl px-6" placeholder="Ex: iPhone 15 Pro Max" />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Custo (R$)</Label>
                             <Input type="number" required value={newProduct.cost_price} onChange={e => setNewProduct({...newProduct, cost_price: parseFloat(e.target.value) || 0})} className="h-14 bg-black/40 border-none rounded-xl px-6 font-black text-secondary" placeholder="0.00" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Venda (R$)</Label>
                             <Input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})} className="h-14 bg-black/40 border-none rounded-xl px-6 font-black text-primary" placeholder="0.00" />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Estoque Inicial</Label>
                             <Input type="number" required value={newProduct.stock_quantity} onChange={e => setNewProduct({...newProduct, stock_quantity: parseInt(e.target.value) || 0})} className="h-14 bg-black/40 border-none rounded-xl px-6" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Alerta Mínimo</Label>
                             <Input type="number" value={newProduct.min_stock_alert} onChange={e => setNewProduct({...newProduct, min_stock_alert: parseInt(e.target.value) || 5})} className="h-14 bg-black/40 border-none rounded-xl px-6" />
                          </div>
                       </div>

                       <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-500 uppercase">Lucro Estimado</span>
                          <span className="text-xl font-black text-primary">
                             {newProduct.cost_price > 0 ? `${Math.round(((newProduct.price - newProduct.cost_price) / newProduct.cost_price) * 100)}%` : '0%'}
                          </span>
                       </div>

                       <Button type="submit" disabled={isAdding} className="w-full h-16 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20">
                          {isAdding ? <Loader2 className="animate-spin" /> : "Catalogar Ativo"}
                       </Button>
                    </form>
                 </DialogContent>
              </Dialog>
           </div>
        </section>

        {/* Content Area */}
        <section className="pb-20">
           {activeTab === 'inventory' ? (
             <>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  <AnimatePresence mode="popLayout">
                     {isLoading ? (
                        <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>
                     ) : filteredProducts.length === 0 ? (
                        <div className="col-span-full text-center py-32 opacity-20"><Package size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest">Nenhum produto em catálogo</p></div>
                     ) : filteredProducts.map(p => (
                        <motion.div key={p.id} variants={item} layout>
                           <Card className="bg-[#1A1A1A] border border-white/5 rounded-[2.5rem] p-8 space-y-6 hover:border-primary/20 transition-all group relative overflow-hidden">
                              <div className="flex justify-between items-start relative z-10">
                                 <div className="h-16 w-16 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Package size={32} />
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Badge className={`border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 ${p.stock_quantity <= (p.min_stock_alert || 5) ? 'bg-secondary/20 text-secondary animate-pulse' : 'bg-primary/20 text-primary'}`}>
                                       {p.stock_quantity <= (p.min_stock_alert || 5) ? 'Estoque Crítico' : 'Saldo Positivo'}
                                    </Badge>
                                    <Button onClick={() => { setSelectedProduct(p); setIsEditing(true); }} variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white/5 text-slate-400 hover:text-white">
                                       <MoreVertical size={16} />
                                    </Button>
                                 </div>
                              </div>
                              <div className="relative z-10">
                                 <h3 className="text-2xl font-black text-white uppercase tracking-tighter truncate">{p.name}</h3>
                                 <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">SKU: {p.id.slice(0,8)}</span>
                                    {p.margin_percent > 40 && <Badge className="bg-primary/10 text-primary border-none text-[7px] font-black px-2">ALTA MARGEM</Badge>}
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 relative z-10">
                                 <div className="space-y-1">
                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Coins size={10} /> Preço Venda</div>
                                    <div className="text-xl font-black text-white">{formatCurrency(p.price)}</div>
                                 </div>
                                 <div className="space-y-1 text-right">
                                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Disponível</div>
                                    <div className={`text-2xl font-black ${p.stock_quantity <= (p.min_stock_alert || 5) ? 'text-secondary' : 'text-primary'}`}>{p.stock_quantity} <span className="text-[10px] text-slate-600">UN</span></div>
                                 </div>
                              </div>
                              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -mr-16 -mt-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                           </Card>
                        </motion.div>
                     ))}
                  </AnimatePresence>
               </div>

               {/* MODAL DE EDIÇÃO DE PRODUTO */}
               <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogContent className="bg-[#1A1A1A] border-white/10 rounded-[3rem] p-10 max-w-xl">
                     <DialogHeader>
                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Editar <span className="text-primary not-italic">Produto</span></DialogTitle>
                     </DialogHeader>
                     {selectedProduct && (
                       <form onSubmit={handleEditProduct} className="space-y-6 py-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Nome do Ativo</Label>
                             <Input required value={selectedProduct.name} onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})} className="h-14 bg-black/40 border-none rounded-xl px-6 text-white" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Custo (R$)</Label>
                                <Input type="number" required value={selectedProduct.cost_price} onChange={e => setSelectedProduct({...selectedProduct, cost_price: parseFloat(e.target.value) || 0})} className="h-14 bg-black/40 border-none rounded-xl px-6 font-black text-secondary" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Venda (R$)</Label>
                                <Input type="number" required value={selectedProduct.price} onChange={e => setSelectedProduct({...selectedProduct, price: parseFloat(e.target.value) || 0})} className="h-14 bg-black/40 border-none rounded-xl px-6 font-black text-primary" />
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Estoque Atual</Label>
                                <Input type="number" required value={selectedProduct.stock_quantity} onChange={e => setSelectedProduct({...selectedProduct, stock_quantity: parseInt(e.target.value) || 0})} className="h-14 bg-black/40 border-none rounded-xl px-6 text-white" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase ml-2">Alerta Mínimo</Label>
                                <Input type="number" value={selectedProduct.min_stock_alert} onChange={e => setSelectedProduct({...selectedProduct, min_stock_alert: parseInt(e.target.value) || 5})} className="h-14 bg-black/40 border-none rounded-xl px-6 text-white" />
                             </div>
                          </div>

                          <div className="flex gap-4">
                             <Button type="button" variant="destructive" onClick={() => handleDeleteProduct(selectedProduct.id)} className="h-16 px-6 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black uppercase"><Trash2 size={20} /></Button>
                             <Button type="submit" disabled={isAdding} className="flex-1 h-16 bg-primary text-background font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20">
                                {isAdding ? <Loader2 className="animate-spin" /> : "Salvar Alterações"}
                             </Button>
                          </div>
                       </form>
                     )}
                  </DialogContent>
               </Dialog>
             </>
           ) : (
             <div className="max-w-5xl mx-auto space-y-6">
                {logs.length === 0 ? (
                  <div className="py-32 text-center opacity-20 bg-[#1A1A1A] rounded-[3rem] border border-dashed border-white/10">
                     <History size={64} className="mx-auto mb-6" />
                     <p className="font-black uppercase tracking-[0.4em] text-xs">Sem registros de auditoria</p>
                  </div>
                ) : logs.map((log, i) => (
                  <Card key={i} className="bg-[#1A1A1A] border border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                     <div className="flex items-center gap-6">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${log.quantity_change > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                           {log.quantity_change > 0 ? <ArrowUpRight /> : <ArrowDownRight />}
                        </div>
                        <div>
                           <div className="text-sm font-black text-white uppercase tracking-tight">{log.products?.name || 'Produto Removido'}</div>
                           <div className="flex items-center gap-2 mt-1 text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                              <User size={10} /> {log.leaderboard?.user_name || 'Sistema'} • {new Date(log.created_at).toLocaleString('pt-BR')}
                           </div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className={`text-lg font-black ${log.quantity_change > 0 ? 'text-primary' : 'text-secondary'}`}>
                           {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} UN
                        </div>
                        <Badge className="bg-white/5 text-slate-500 border-none text-[7px] font-black uppercase">{log.reason}</Badge>
                     </div>
                  </Card>
                ))}
             </div>
           )}
        </section>

      </motion.div>
    </div>
  );
}
