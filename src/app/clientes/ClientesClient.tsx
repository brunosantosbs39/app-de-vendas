"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Banknote, Clock, Coins, CreditCard, Edit3, FileText, Mail, MapPin, Phone, Plus, Search, ShoppingCart, Users, Wallet, WalletCards, X, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoSSR } from "@/components/layout/NoSSR";
import { useAuth } from "@/hooks/useAuth";
import { generateReceipt } from "@/lib/pdfGenerator";
import { supabase } from "@/lib/supabase";
import { mapsService } from "@/lib/maps";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

function ClientesContent() {
  const { user } = useAuth();
  const { clients, orders, products, installments, fetchInitialData, isLoading } = useAppStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [saleStep, setSaleStep] = useState(1);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    email: "",
    region: "",
    address: "",
    store_name: "",
  });
  const [saleData, setSaleData] = useState({
    productId: "",
    amountPaid: "",
    paymentMethod: "pix",
    installmentsCount: 1,
  });

  useEffect(() => {
    if (user) fetchInitialData(user.id);
  }, [user]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      [client.name, client.phone, client.email, client.region, client.store_name, client.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [clients, searchTerm]);

  const clientRevenue = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      if (!order.client_id) return acc;
      acc[order.client_id] = (acc[order.client_id] || 0) + Number(order.total_amount || 0);
      return acc;
    }, {});
  }, [orders]);

  const topClient = useMemo(() => {
    return clients
      .map((client) => ({ ...client, revenue: clientRevenue[client.id] || 0 }))
      .sort((a, b) => b.revenue - a.revenue)[0];
  }, [clients, clientRevenue]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const totalRevenue = Object.values(clientRevenue).reduce((acc, value) => acc + value, 0);
  const selectedClientOrders = useMemo(() => {
    if (!selectedClient) return [];
    return orders.filter((order) => order.client_id === selectedClient.id);
  }, [orders, selectedClient]);

  const selectedClientStats = useMemo(() => {
    const revenue = selectedClientOrders.reduce((acc, order) => acc + Number(order.total_amount || 0), 0);
    const paid = selectedClientOrders.reduce((acc, order) => acc + Number(order.amount_paid || 0), 0);
    return { revenue, debt: Math.max(0, revenue - paid), paid };
  }, [selectedClientOrders]);

  const handleCreateClient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!newClient.name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    setIsSaving(true);
    try {
      let latitude = null;
      let longitude = null;

      if (newClient.address.trim()) {
        const coords = await mapsService.geocodeAddress(newClient.address.trim());
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      const { data, error } = await supabase.from("clients").insert([{
        user_id: user.id,
        name: newClient.name.trim(),
        phone: newClient.phone.trim(),
        email: newClient.email.trim() || null,
        region: newClient.region.trim() || null,
        address: newClient.address.trim() || null,
        store_name: newClient.store_name.trim() || null,
        latitude,
        longitude,
        financial_status: "ok",
        funnel_stage: "contato",
      }]).select().single();

      if (error) throw error;

      toast.success("Cliente cadastrado.");
      setNewClient({ name: "", phone: "", email: "", region: "", address: "", store_name: "" });
      setIsDialogOpen(false);
      
      // Automaticamente abre a venda para o novo cliente
      setSelectedClient(data);
      setIsSaleOpen(true);
      
      await fetchInitialData(user.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClient = (client: any) => {
    setEditingClient({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      region: client.region || "",
      address: client.address || "",
      store_name: client.store_name || "",
    });
    setIsEditing(true);
  };

  const handleUpdateClient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selectedClient) return;
    if (!editingClient.name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    setIsSaving(true);
    try {
      let { latitude, longitude } = selectedClient;

      // Se o endereço mudou, re-geocodifica
      if (editingClient.address.trim() !== (selectedClient.address || "").trim()) {
        if (editingClient.address.trim()) {
          const coords = await mapsService.geocodeAddress(editingClient.address.trim());
          if (coords) {
            latitude = coords.lat;
            longitude = coords.lng;
          } else {
            latitude = null;
            longitude = null;
          }
        } else {
          latitude = null;
          longitude = null;
        }
      }

      const { data, error } = await supabase
        .from("clients")
        .update({
          name: editingClient.name.trim(),
          phone: editingClient.phone.trim(),
          email: editingClient.email.trim() || null,
          region: editingClient.region.trim() || null,
          address: editingClient.address.trim() || null,
          store_name: editingClient.store_name.trim() || null,
          latitude,
          longitude,
        })
        .eq("id", selectedClient.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Cliente atualizado.");
      setSelectedClient(data);
      setIsEditing(false);
      await fetchInitialData(user.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const stats = [
    { label: "Clientes", value: clients.length, icon: Users, detail: `${filteredClients.length} visiveis` },
    { label: "Receita da carteira", value: formatCurrency(totalRevenue), icon: WalletCards, detail: "vendas vinculadas" },
    { label: "Melhor cliente", value: topClient?.name || "Sem vendas", icon: Plus, detail: topClient ? formatCurrency(topClient.revenue) : "cadastre uma venda" },
  ];

  const resetSale = () => {
    setSaleData({ productId: "", amountPaid: "", paymentMethod: "pix", installmentsCount: 1 });
    setSaleStep(1);
  };

  const installmentDates = useMemo(() => {
    return Array.from({ length: saleData.installmentsCount }).map((_, index) => {
      const dueDate = new Date();
      // A primeira parcela é para hoje, as próximas para os meses seguintes
      dueDate.setMonth(dueDate.getMonth() + index);
      return dueDate;
    });
  }, [saleData.installmentsCount]);

  const selectedProduct = useMemo(() => products.find((p) => p.id === saleData.productId), [products, saleData.productId]);
  const remainingAmount = useMemo(() => {
    if (!selectedProduct) return 0;
    return Math.max(0, Number(selectedProduct.price || 0) - Number(saleData.amountPaid || 0));
  }, [selectedProduct, saleData.amountPaid]);

  const handleCreateSale = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (saleStep === 1) {
      if (!saleData.productId) {
        toast.error("Selecione um produto.");
        return;
      }
      setSaleStep(2);
      return;
    }

    if (!user || !selectedClient || !saleData.productId) {
      toast.error("Selecione cliente e produto.");
      return;
    }

    const product = products.find((item) => item.id === saleData.productId);
    if (!product) {
      toast.error("Produto não encontrado.");
      return;
    }

    const totalAmount = Number(product.price || 0);
    const amountPaid = Math.max(0, Number(saleData.amountPaid || 0));
    const installmentsCount = Math.max(1, Number(saleData.installmentsCount || 1));
    const isScheduled = amountPaid < totalAmount || installmentsCount > 1;

    setIsProcessingSale(true);
    try {
      const { data: order, error: orderError } = await supabase.from("orders").insert([{
        user_id: user.id,
        client_id: selectedClient.id,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        status: isScheduled ? "pending" : "paid",
        payment_method: isScheduled ? "pendente" : saleData.paymentMethod,
      }]).select("*, clients(name, phone, region)").single();

      if (orderError) throw orderError;

      await supabase.from("order_items").insert([{
        order_id: order.id,
        product_id: product.id,
        quantity: 1,
        unit_price: totalAmount,
      }]);

      if (amountPaid > 0) {
        await supabase.from("transactions").insert([{
          user_id: user.id,
          amount: amountPaid,
          type: "entrada",
          category: "venda",
          description: `Venda para ${selectedClient.name}: ${product.name}`,
          order_id: order.id,
        }]);
      }

      const remainingAmount = Math.max(0, totalAmount - amountPaid);
      if (isScheduled && remainingAmount > 0) {
        const valuePerInstallment = remainingAmount / installmentsCount;
        const rows = installmentDates.map((date) => {
          return {
            order_id: order.id,
            user_id: user.id,
            amount: valuePerInstallment,
            due_date: date.toISOString(),
            status: "pending",
          };
        });
        await supabase.from("installments").insert(rows);
      }

      generateReceipt({
        clientName: selectedClient.name,
        amount: totalAmount,
        description: product.name,
        date: new Date(order.created_at),
        receiptId: order.id.slice(0, 8),
        paymentMethod: isScheduled ? "pendente" : saleData.paymentMethod,
        isScheduled,
        installments: isScheduled && remainingAmount > 0 ? {
          count: installmentsCount,
          value: remainingAmount / installmentsCount,
        } : undefined,
        address: selectedClient.address,
        city: selectedClient.region,
      });

      toast.success("Venda registrada e recibo gerado.");
      resetSale();
      setIsSaleOpen(false);
      await fetchInitialData(user.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao registrar venda.");
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleGenerateReceipt = async (order: any) => {
    const orderInstallments = installments.filter((item) => item.order_id === order.id);
    generateReceipt({
      clientName: selectedClient?.name || order.clients?.name || "Cliente",
      amount: Number(order.total_amount || 0),
      description: `Venda ${order.id.slice(0, 6)}`,
      date: new Date(order.created_at),
      receiptId: order.id.slice(0, 8),
      paymentMethod: order.payment_method,
      isScheduled: order.status !== "paid",
      installments: orderInstallments.length > 0 ? {
        count: orderInstallments.length,
        value: Number(orderInstallments[0].amount || 0),
        dueDates: orderInstallments.map((item) => item.due_date),
      } : undefined,
      address: selectedClient?.address,
      city: selectedClient?.region,
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-[#F8F8F8]">
      <Header title="Clientes" />
      <motion.div variants={container} initial="hidden" animate="show" className="flex-1 px-4 sm:px-6 pt-10 pb-36 space-y-7 max-w-7xl mx-auto w-full">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">Relacionamento</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">Clientes <span className="text-primary not-italic">Elite</span></h2>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button className="h-12 rounded-2xl px-5 font-black">
                <Plus size={18} /> Novo cliente
              </Button>
            } />
            <DialogContent className="max-w-lg rounded-[2rem] border border-white/10 bg-[#101010] p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase text-white">Novo cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateClient} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-name" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome do Cliente</Label>
                    <Input id="client-name" value={newClient.name} onChange={(event) => setNewClient((prev) => ({ ...prev, name: event.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5 text-white" placeholder="Nome do cliente" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store-name" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome da Loja / Local</Label>
                    <Input id="store-name" value={newClient.store_name} onChange={(event) => setNewClient((prev) => ({ ...prev, store_name: event.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5 text-white" placeholder="Ex: Mercado Central" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-phone" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Telefone</Label>
                    <Input id="client-phone" value={newClient.phone} onChange={(event) => setNewClient((prev) => ({ ...prev, phone: event.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5 text-white" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-region" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bairro / Região</Label>
                    <Input id="client-region" value={newClient.region} onChange={(event) => setNewClient((prev) => ({ ...prev, region: event.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5 text-white" placeholder="Bairro ou cidade" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-address" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Endereço Completo</Label>
                  <Input id="client-address" value={newClient.address} onChange={(event) => setNewClient((prev) => ({ ...prev, address: event.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5 text-white" placeholder="Rua, número, ponto de referência" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500">E-mail</Label>
                  <Input id="client-email" type="email" value={newClient.email} onChange={(event) => setNewClient((prev) => ({ ...prev, email: event.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5 text-white" placeholder="cliente@email.com" />
                </div>
                <Button type="submit" disabled={isSaving} className="h-12 w-full rounded-2xl font-black">
                  {isSaving ? "Salvando..." : "Cadastrar e Adicionar Venda"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                  <h3 className="mt-2 truncate text-2xl font-black text-white">{stat.value}</h3>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary">
                  <stat.icon size={20} />
                </div>
              </div>
              <p className="mt-4 text-xs font-bold text-slate-500">{stat.detail}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-[2rem] border border-white/5 bg-[#1A1A1A] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-13 rounded-2xl border-white/10 bg-black/20 pl-11 text-white"
              placeholder="Buscar por nome, telefone, e-mail ou regiao"
            />
          </div>
          <Badge variant="outline" className="h-10 rounded-2xl border-white/10 px-4 text-slate-300">
            {filteredClients.length} resultado{filteredClients.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="h-44 animate-pulse rounded-[2rem] border border-white/5 bg-[#1A1A1A]" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="rounded-[2rem] border border-dashed border-white/10 bg-[#1A1A1A] p-10 text-center">
            <Users className="mx-auto text-primary" size={40} />
            <h3 className="mt-4 text-2xl font-black text-white">Nenhum cliente encontrado</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Ajuste a busca ou cadastre o primeiro cliente para comecar a alimentar a carteira.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredClients.map((client) => {
              const revenue = clientRevenue[client.id] || 0;
              return (
                <Card key={client.id} onClick={() => setSelectedClient(client)} className="cursor-pointer rounded-[2rem] border border-white/5 bg-[#1A1A1A] p-6 transition-all hover:-translate-y-1 hover:border-primary/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="truncate text-xl font-black text-white">{client.name}</h4>
                      {client.store_name && <p className="truncate text-sm font-bold text-primary">{client.store_name}</p>}
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">{client.funnel_stage || "contato"}</p>
                    </div>
                    <Badge className="rounded-2xl bg-primary/10 text-primary">
                      {formatCurrency(revenue)}
                    </Badge>
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-slate-400">
                    <div className="flex items-center gap-3"><Phone size={16} className="text-primary" /> {client.phone || "Sem telefone"}</div>
                    <div className="flex items-center gap-3"><Mail size={16} className="text-primary" /> {client.email || "Sem e-mail"}</div>
                    <div className="flex items-center gap-3"><MapPin size={16} className="text-primary" /> {client.region || "Sem regiao"}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      <Dialog open={!!selectedClient} onOpenChange={(open) => {
        if (!open) {
          setSelectedClient(null);
          setIsEditing(false);
        }
      }}>
        <DialogContent className="max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0F0F0F] p-0 text-white">
          {selectedClient && (
            <div className="max-h-[90vh] overflow-y-auto">
              <div className="relative border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-6 sm:p-8">
                <button onClick={() => setSelectedClient(null)} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-primary text-4xl font-black text-background shadow-[0_0_30px_rgba(93,214,44,.25)]">
                    {selectedClient.name?.[0] || "C"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="pr-12 text-3xl font-black uppercase italic tracking-tighter text-white">{selectedClient.name}</h2>
                      {!isEditing && (
                        <Button onClick={() => handleEditClient(selectedClient)} variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/10 text-slate-400">
                          <Edit3 size={18} />
                        </Button>
                      )}
                    </div>
                    {selectedClient.store_name && <p className="text-lg font-bold text-primary italic">{selectedClient.store_name}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="rounded-2xl bg-primary/15 text-primary">{selectedClient.funnel_stage || "contato"}</Badge>
                      <Badge variant="outline" className="rounded-2xl border-white/10 text-slate-300">{selectedClient.phone || "sem telefone"}</Badge>
                      {selectedClient.region && <Badge variant="outline" className="rounded-2xl border-white/10 text-slate-300">{selectedClient.region}</Badge>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 sm:p-8">
                {isEditing ? (
                  <form onSubmit={handleUpdateClient} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome</Label>
                        <Input value={editingClient.name} onChange={(e) => setEditingClient((prev: any) => ({ ...prev, name: e.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loja/Local</Label>
                        <Input value={editingClient.store_name} onChange={(e) => setEditingClient((prev: any) => ({ ...prev, store_name: e.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Telefone</Label>
                        <Input value={editingClient.phone} onChange={(e) => setEditingClient((prev: any) => ({ ...prev, phone: e.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bairro</Label>
                        <Input value={editingClient.region} onChange={(e) => setEditingClient((prev: any) => ({ ...prev, region: e.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Endereço</Label>
                      <Input value={editingClient.address} onChange={(e) => setEditingClient((prev: any) => ({ ...prev, address: e.target.value }))} className="h-12 rounded-2xl border-white/10 bg-white/5" />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={isSaving} className="flex-1 h-12 rounded-2xl font-black">
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      <Button type="button" onClick={() => setIsEditing(false)} variant="outline" className="h-12 rounded-2xl border-white/10 bg-white/5 text-white">
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <Card className="rounded-[2rem] border border-white/5 bg-[#1A1A1A] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Endereço de entrega</p>
                      <p className="mt-3 text-lg font-black text-white">{selectedClient.address || "Não cadastrado"}</p>
                    </Card>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Card className="rounded-[2rem] border border-primary/20 bg-primary/5 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Faturamento LTV</p>
                        <p className="mt-3 text-3xl font-black italic text-white">{formatCurrency(selectedClientStats.revenue)}</p>
                      </Card>
                      <Card className="rounded-[2rem] border border-white/10 bg-[#1A1A1A] p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Saldo devedor</p>
                        <p className="mt-3 text-3xl font-black italic text-primary">{formatCurrency(selectedClientStats.debt)}</p>
                      </Card>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button onClick={() => setIsSaleOpen(true)} className="h-12 flex-1 rounded-2xl font-black">
                        <ShoppingCart size={18} /> Adicionar venda
                      </Button>
                      <Button variant="outline" className="h-12 flex-1 rounded-2xl border-white/10 bg-white/5 font-black text-white">
                        <Phone size={18} /> WhatsApp
                      </Button>
                    </div>

                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Histórico de compras</h3>
                        <Badge variant="outline" className="rounded-2xl border-white/10 text-slate-400">{selectedClientOrders.length} pedidos</Badge>
                      </div>
                      <div className="space-y-3">
                        {selectedClientOrders.length === 0 ? (
                          <Card className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                            <CreditCard className="mx-auto text-primary" />
                            <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">Nenhum registro encontrado</p>
                          </Card>
                        ) : (
                          selectedClientOrders.map((order) => (
                            <div key={order.id} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-white">{formatCurrency(Number(order.total_amount || 0))}</p>
                                <p className="text-xs font-bold text-slate-500">{new Date(order.created_at).toLocaleDateString("pt-BR")} · {order.status}</p>
                              </div>
                              <Button onClick={() => handleGenerateReceipt(order)} variant="outline" className="h-10 rounded-xl border-white/10 bg-white/5 font-black text-white">
                                <FileText size={16} /> Recibo PDF
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSaleOpen} onOpenChange={(open) => {
        setIsSaleOpen(open);
        if (!open) resetSale();
      }}>
        <DialogContent className="max-w-md rounded-[2.5rem] border border-white/10 bg-[#0F0F0F] p-0 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="relative p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setIsSaleOpen(false)} 
              className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8 pr-10">
              <Badge className="bg-primary/15 text-primary border-none font-black px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase">
                PASSO {saleStep} DE 2
              </Badge>
              <div className="flex gap-1.5">
                <div className={cn("h-1.5 w-10 rounded-full transition-all duration-500", saleStep >= 1 ? "bg-primary shadow-[0_0_10px_rgba(93,214,44,0.5)]" : "bg-white/10")} />
                <div className={cn("h-1.5 w-10 rounded-full transition-all duration-500", saleStep >= 2 ? "bg-primary shadow-[0_0_10px_rgba(93,214,44,0.5)]" : "bg-white/10")} />
              </div>
            </div>

            {saleStep === 1 ? (
              <>
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-background shadow-[0_0_30px_rgba(93,214,44,0.25)]">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Selecionar Produto</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Venda para {selectedClient?.name}</p>
                  </div>
                </div>

                <form onSubmit={handleCreateSale} className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Produto do Catálogo</Label>
                    <div className="relative">
                      <select
                        value={saleData.productId}
                        onChange={(event) => setSaleData((prev) => ({ ...prev, productId: event.target.value }))}
                        className="h-14 w-full rounded-2xl border border-white/10 bg-[#1A1A1A] px-5 text-sm font-bold text-white outline-none appearance-none hover:border-primary/50 transition-colors"
                      >
                        <option value="" className="bg-[#101010]">Selecione um produto</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id} className="bg-[#101010]">
                            {product.name} — {formatCurrency(Number(product.price || 0))}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Plus size={18} />
                      </div>
                    </div>
                  </div>

                  {selectedProduct && (
                    <Card className="bg-primary/5 border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black italic">
                            {selectedProduct.name[0]}
                         </div>
                         <span className="text-sm font-bold text-white">{selectedProduct.name}</span>
                      </div>
                      <span className="text-lg font-black text-primary">{formatCurrency(Number(selectedProduct.price))}</span>
                    </Card>
                  )}

                  <Button type="submit" className="h-14 w-full rounded-2xl font-black text-lg tracking-tight shadow-[0_10px_30px_rgba(93,214,44,0.1)]">
                    PRÓXIMO PASSO
                  </Button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-background shadow-[0_0_30px_rgba(93,214,44,0.25)]">
                    <Wallet size={24} />
                  </div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">PAGAMENTO</h2>
                </div>

                <form onSubmit={handleCreateSale} className="space-y-8">
                  <Card className="bg-[#1A1A1A] border-white/5 rounded-[2rem] p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-4">RESUMO DA VENDA</p>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <h3 className="text-2xl font-black uppercase italic text-white leading-none">{selectedProduct?.name}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">NETTO</p>
                      </div>
                      <p className="text-3xl font-black text-primary italic">{formatCurrency(Number(selectedProduct?.price || 0))}</p>
                    </div>
                  </Card>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">QUANTO FOI RECEBIDO AGORA?</p>
                    <div className="relative group">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black italic text-2xl group-focus-within:scale-110 transition-transform">R$</span>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={saleData.amountPaid} 
                        onChange={(e) => setSaleData(prev => ({ ...prev, amountPaid: e.target.value }))}
                        className="h-16 pl-16 rounded-[1.5rem] border-white/10 bg-[#1A1A1A] text-2xl font-black text-white focus:border-primary/50 focus:ring-0 transition-all" 
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1">FORMA DE PAGAMENTO</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'pix', label: 'PIX', icon: Zap },
                        { id: 'dinheiro', label: 'DINHEIRO', icon: Banknote },
                        { id: 'cartao', label: 'CARTÃO', icon: CreditCard },
                        { id: 'pendente', label: 'PENDENTE', icon: Clock },
                      ].map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSaleData(prev => ({ ...prev, paymentMethod: method.id }))}
                          className={cn(
                            "h-14 rounded-2xl border flex items-center justify-center gap-3 transition-all duration-300",
                            saleData.paymentMethod === method.id 
                              ? "bg-primary border-primary text-background shadow-[0_10px_25px_rgba(93,214,44,0.35)] scale-[1.02]" 
                              : "bg-[#1A1A1A] border-white/5 text-slate-500 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <method.icon size={18} strokeWidth={3} />
                          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(saleData.paymentMethod === 'pendente' || remainingAmount > 0) && (
                    <div className="space-y-5 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">VENDA PROGRAMADA</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">DÉBITO EM ABERTO: {formatCurrency(remainingAmount)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-[#1A1A1A] p-1 rounded-xl border border-white/5">
                          <button 
                            type="button"
                            onClick={() => setSaleData(prev => ({ ...prev, installmentsCount: Math.max(1, prev.installmentsCount - 1) }))}
                            className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                          >-</button>
                          <span className="font-black text-white w-6 text-center">{saleData.installmentsCount}x</span>
                          <button 
                            type="button"
                            onClick={() => setSaleData(prev => ({ ...prev, installmentsCount: Math.min(12, prev.installmentsCount + 1) }))}
                            className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                          >+</button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {installmentDates.map((date, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] group hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black">
                                {idx + 1}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento</span>
                                <span className="text-sm font-bold text-slate-200">
                                  {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Valor</span>
                              <span className="text-lg font-black text-white italic">
                                {formatCurrency(remainingAmount / saleData.installmentsCount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setSaleStep(1)}
                      className="h-16 px-6 rounded-2xl border-white/10 bg-white/5 font-black text-white hover:bg-white/10"
                    >
                      VOLTAR
                    </Button>
                    <Button type="submit" disabled={isProcessingSale} className="h-16 flex-1 rounded-2xl font-black text-lg tracking-tight shadow-[0_15px_35px_rgba(93,214,44,0.25)] hover:scale-[1.02] transition-transform">
                      {isProcessingSale ? "REGISTRANDO..." : "FINALIZAR VENDA"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientesPage() {
  return (
    <NoSSR fallback={<div className="min-h-screen bg-[#0F0F0F]" />}>
      <ClientesContent />
    </NoSSR>
  );
}
