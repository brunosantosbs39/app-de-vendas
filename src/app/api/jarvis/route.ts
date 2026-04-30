import { GoogleGenerativeAI } from "@google/generative-ai";
// Jarvis Neural Core - Revitalizado
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { message, context, history, userId } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const tools = [
      {
        functionDeclarations: [
          {
            name: "addClient",
            description: "Adiciona um novo cliente ao banco de dados.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "Nome do cliente" },
                phone: { type: "STRING", description: "Telefone do cliente" },
                address: { type: "STRING", description: "Endereço do cliente" },
                region: { type: "STRING", description: "Região ou bairro" }
              },
              required: ["name"]
            }
          },
          {
            name: "addSale",
            description: "Registra uma nova venda no sistema.",
            parameters: {
              type: "OBJECT",
              properties: {
                clientName: { type: "STRING", description: "Nome ou parte do nome do cliente que comprou" },
                totalAmount: { type: "NUMBER", description: "Valor total da venda" },
                status: { type: "STRING", description: "Status da venda: 'paid' ou 'pending' (fiado/programado)" },
                installmentsCount: { type: "NUMBER", description: "Número de parcelas, caso seja fiado/programado" }
              },
              required: ["totalAmount"]
            }
          }
        ]
      }
    ];

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      tools: tools
    });

    const systemPrompt = "Você é o JARVIS, a interface neural ultra-avançada do consultor de elite. " +
      "Personalidade: Profissional, direto, eficiente e solícito. " +
      "REGRAS CRÍTICAS: 1. Fale SEMPRE normalmente e SOMENTE em palavras. " +
      "2. JAMAIS use código de programação. " +
      "3. NUNCA use asteriscos para expressar ações. " +
      "CONTEXTO: Faturamento R$ " + (context?.totalRevenue || 0) + ", Vendas: " + (context?.salesCount || 0);

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Sistemas JARVIS ativos. Link neural estabelecido. Como posso ajudar, senhor?" }] },
        ...(history || []).map((h: any) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        }))
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let functionResult = {};

      if (call.name === "addClient") {
        if (!userId) {
          functionResult = { error: "Usuário não autenticado" };
        } else {
          const args = call.args as any;
          const { error } = await supabase.from('clients').insert({
            user_id: userId,
            name: args.name,
            phone: args.phone,
            address: args.address,
            region: args.region
          });
          functionResult = error ? { success: false, error: error.message } : { success: true };
        }
      } else if (call.name === "addSale") {
        if (!userId) {
          functionResult = { error: "Usuário não autenticado" };
        } else {
          const args = call.args as any;
          let clientId = null;
          if (args.clientName) {
            const queryName = "%" + args.clientName + "%";
            const { data: clients } = await supabase
              .from('clients')
              .select('id')
              .eq('user_id', userId)
              .ilike('name', queryName)
              .limit(1);
            if (clients && clients.length > 0) clientId = clients[0].id;
          }

          const { data: order, error } = await supabase.from('orders').insert({
            user_id: userId,
            client_id: clientId,
            total_amount: args.total_amount || args.totalAmount,
            status: args.status || 'paid',
            payment_method: (args.installmentsCount || args.installments_count || 0) > 1 ? 'pendente' : 'dinheiro'
          }).select().single();

          if (order && (args.installmentsCount || args.installments_count || 0) > 1) {
             const count = args.installmentsCount || args.installments_count;
             const valuePerInstallment = order.total_amount / count;
             const installments = Array.from({ length: count }).map((_, i) => ({
                order_id: order.id,
                user_id: userId,
                amount: valuePerInstallment,
                due_date: new Date(Date.now() + (30 * (i + 1) * 24 * 60 * 60 * 1000)).toISOString(),
                status: 'pending'
             }));
             await supabase.from('installments').insert(installments);
          }

          functionResult = error ? { success: false, error: error.message } : { success: true };
        }
      }

      const functionResponse = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: functionResult
        }
      }]);
      
      return NextResponse.json({ content: functionResponse.response.text(), actionExecuted: call.name });
    }

    return NextResponse.json({ content: response.text() });
  } catch (error: any) {
    console.error("Erro no Jarvis AI:", error);
    return NextResponse.json({ content: "Detectei uma instabilidade no meu núcleo de dados. Por favor, repita." }, { status: 500 });
  }
}
