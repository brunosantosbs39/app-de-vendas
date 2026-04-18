"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  MessageCircle, 
  AlertCircle,
  Clock,
  ArrowRight,
  UserPlus,
  Loader2,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClients } from "@/hooks/useClients";
import { gamificationService } from "@/lib/gamification";
import { useAuth } from "@/hooks/useAuth";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const STAGES = [
  { id: 'contato', label: 'Contato' },
  { id: 'interessado', label: 'Interessado' },
  { id: 'negociacao', label: 'Negociação' },
  { id: 'fechado', label: 'Fechado' },
  { id: 'pos_venda', label: 'Pós-Venda' },
];

export default function ClientsPage() {
  const { user } = useAuth();
  const { clients, loading, addClient, updateClient } = useClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", region: "" });
  const [filterStage, setFilterStage] = useState<string | null>(null);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone.includes(searchTerm);
    const matchesFilter = filterStage ? client.funnel_stage === filterStage : true;
    return matchesSearch && matchesFilter;
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAdding(true);
      await addClient({
        ...newClient,
        financial_status: 'ok',
        funnel_stage: 'contato'
      });
      setNewClient({ name: "", phone: "", email: "", region: "" });
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleApproach = async (client: { id: string; name: string; phone: string; funnel_stage?: string }) => {
    if (!user) return;
    const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Consultor";
    const message = encodeURIComponent(`Olá ${client.name}! Tudo bem? Passando para ver se precisa de algo hoje?`);
    window.open(`https://wa.me/${client.phone}?text=${message}`, "_blank");

    // Pontuação por Abordagem
    await gamificationService.recordAction(user.id, displayName, "approach", `abordou ${client.name}`, 10);

    // Se estiver no estágio 'contato', move para 'interessado'
    if (!client.funnel_stage || client.funnel_stage === 'contato') {
      await updateClient(client.id, { funnel_stage: 'interessado' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F]">
      <Header title="Clientes & Funil" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 p-8 space-y-8 pb-32"
      >
        {/* Search & Add Section */}
        <motion.section variants={item} className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Buscar por nome ou fone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-16 pl-14 pr-6 rounded-2xl border-none shadow-sm text-lg font-medium bg-[#202020] focus-visible:ring-primary focus-visible:ring-2 transition-all text-white"
              />
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-16 w-16 rounded-2xl bg-primary shadow-lg shadow-primary/20 active:scale-90 transition-transform">
                  <UserPlus className="h-8 w-8 text-[#0F0F0F]" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#202020] border-white/5 text-white rounded-[2.5rem] p-8">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tighter">Novo Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddClient} className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 font-black uppercase text-[10px] tracking-widest ml-1">Nome Completo</Label>
                    <Input 
                      required
                      value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      placeholder="Ex: Maria Silva" 
                      className="h-14 bg-[#0F0F0F] border-none rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 font-black uppercase text-[10px] tracking-widest ml-1">WhatsApp (DDD + Número)</Label>
                    <Input 
                      required
                      value={newClient.phone}
                      onChange={e => setNewClient({...newClient, phone: e.target.value})}
                      placeholder="Ex: 5511999998888" 
                      className="h-14 bg-[#0F0F0F] border-none rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-500 font-black uppercase text-[10px] tracking-widest ml-1">Região / Bairro</Label>
                    <Input 
                      value={newClient.region}
                      onChange={e => setNewClient({...newClient, region: e.target.value})}
                      placeholder="Ex: Zona Sul" 
                      className="h-14 bg-[#0F0F0F] border-none rounded-xl"
                    />
                  </div>
                  <Button type="submit" disabled={isAdding} className="btn-primary w-full h-14 mt-4">
                    {isAdding ? <Loader2 className="animate-spin h-6 w-6" /> : "CADASTRAR CLIENTE (+5 XP)"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button 
              variant={filterStage === null ? "default" : "ghost"}
              onClick={() => setFilterStage(null)}
              className="rounded-full px-6 h-10 font-black text-[10px] uppercase tracking-widest"
            >
              Todos
            </Button>
            {STAGES.map(stage => (
              <Button 
                key={stage.id}
                variant={filterStage === stage.id ? "default" : "ghost"}
                onClick={() => setFilterStage(stage.id)}
                className="rounded-full px-6 h-10 font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
              >
                {stage.label}
              </Button>
            ))}
          </div>
        </motion.section>

        {/* Client List */}
        <motion.section variants={item} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
            ) : filteredClients.map((client) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={client.id}
              >
                <Card className="bg-[#202020] border-none shadow-sm card-morph group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black">
                          {client.name.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xl font-black text-white leading-none">{client.name}</div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-white/5 text-slate-500 border-none px-2 py-0 text-[10px] font-black uppercase tracking-tighter">
                              {STAGES.find(s => s.id === (client.funnel_stage || 'contato'))?.label}
                            </Badge>
                            {client.region && (
                              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                • {client.region}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => handleApproach(client)}
                          variant="ghost" 
                          size="icon" 
                          className="h-12 w-12 rounded-full text-primary hover:bg-primary/10 group-hover:bg-primary/20 transition-all"
                        >
                          <MessageCircle className="h-7 w-7" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full text-slate-700 hover:text-white">
                          <MoreVertical className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.section>
      </motion.div>
    </div>
  );
}
