import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const generateReceipt = (data: {
  clientName: string;
  amount: number;
  description: string;
  date: Date;
  receiptId: string;
  paymentMethod?: string;
  isScheduled?: boolean;
  installments?: { count: number; value: number; dueDates?: string[] };
  quantity?: number;
  address?: string;
  city?: string;
}) => {
  const doc = new jsPDF();

  // Design do Recibo Premium
  doc.setFillColor(32, 32, 32);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(93, 214, 44);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', 105, 25, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Nº: ${data.receiptId.toUpperCase()}`, 20, 50);
  doc.text(`Emissão: ${format(data.date, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 150, 50);

  // Seção do Cliente e Localização
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 20, 65);
  doc.line(20, 67, 190, 67);

  doc.setFontSize(11);
  doc.text('NOME:', 20, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.clientName.toUpperCase()}`, 40, 75);

  if (data.address || data.city) {
    doc.setFont('helvetica', 'bold');
    doc.text('LOCAL:', 20, 82);
    doc.setFont('helvetica', 'normal');
    const locationText = [data.address, data.city].filter(Boolean).join(' - ');
    doc.text(locationText.toUpperCase(), 40, 82);
  }

  doc.setFont('helvetica', 'bold');
  doc.text('VALOR:', 20, 89);
  doc.setTextColor(93, 214, 44);
  doc.text(`R$ ${data.amount.toFixed(2)}`, 40, 89);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('REFERENTE A:', 20, 102);
  doc.setFont('helvetica', 'normal');
  const qtySuffix = data.quantity && data.quantity > 1 ? ` (${data.quantity} Unidades)` : '';
  doc.text(`${data.description}${qtySuffix}`.toUpperCase(), 20, 108);

  // Informações de Pagamento
  doc.setDrawColor(230, 230, 230);
  doc.line(20, 115, 190, 115);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CONDIÇÕES DE PAGAMENTO', 20, 125);

  const method = data.paymentMethod?.toLowerCase() || '';
  const hasInstallments = data.installments && data.installments.count > 0;
  
  // Se tem parcelas ou é programado, NÃO é à vista.
  const isProgramado = data.isScheduled || method === 'pendente' || hasInstallments;
  const isVista = !isProgramado && ['pix', 'dinheiro', 'cartao', 'cartão'].includes(method);

  const paymentLabel = isVista ? 'À VISTA' : 'PROGRAMADO';
  const methodLabel = isProgramado ? 'VENDA PROGRAMADA' : method.toUpperCase();
  
  doc.text(`CONDIÇÕES: ${methodLabel} (${paymentLabel})`, 20, 135);

  let currentY = 145;

  // Prioridade total para o detalhamento das parcelas (Programado)
  if (hasInstallments) {
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(20, currentY - 5, 170, 8, 'F');
    doc.text('DETALHAMENTO DO PARCELAMENTO:', 22, currentY);
    currentY += 10;
    
    doc.setFont('helvetica', 'normal');
    if (data.installments!.dueDates && data.installments!.dueDates.length > 0) {
      data.installments!.dueDates.forEach((dueDate, index) => {
        const formattedDate = format(new Date(dueDate), 'dd/MM/yyyy');
        doc.text(`${index + 1}ª Parcela: R$ ${data.installments!.value.toFixed(2)}`, 25, currentY);
        doc.text(`Vencimento: ${formattedDate}`, 120, currentY);
        currentY += 7;
        
        // Linha pontilhada separadora entre parcelas
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(25, currentY - 2, 185, currentY - 2);
        doc.setLineDashPattern([], 0);
      });
    } else {
      doc.text(`${data.installments!.count} parcelas de R$ ${data.installments!.value.toFixed(2)}`, 25, currentY);
      currentY += 7;
    }
  } else if (isProgramado) {
    // Caso programado de parcela única
    doc.setFont('helvetica', 'bold');
    doc.text('VENCIMENTO ACORDADO:', 20, currentY);
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    const formattedDate = format(data.date, 'dd/MM/yyyy');
    doc.text(`Valor Único: R$ ${data.amount.toFixed(2)} - Data: ${formattedDate}`, 25, currentY);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(93, 214, 44);
    doc.text('PAGAMENTO REALIZADO INTEGRALMENTE NO ATO.', 20, currentY);
    doc.setTextColor(0, 0, 0);
  }

  // Rodapé Informativo
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 240, 170, 20, 'F');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Este documento comprova a negociação de valores entre as partes.`, 105, 248, { align: 'center' });
  doc.text('Gerado eletronicamente pelo Sistema Synkra Academy.', 105, 253, { align: 'center' });

  doc.save(`recibo_${data.receiptId}.pdf`);
};

export const generateFullReport = (data: {
  userName: string;
  totalRevenue: number;
  totalReceived: number;
  salesCount: number;
  unitsCount: number;
  startDate: string;
  endDate: string;
}) => {
  const doc = new jsPDF();

  // Cabeçalho Luxuoso
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 50, 'F');
  
  doc.setTextColor(93, 214, 44);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE ELITE', 20, 30);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`CONSULTOR: ${data.userName.toUpperCase()}`, 20, 40);
  doc.text(`PERÍODO: ${data.startDate} ATÉ ${data.endDate}`, 150, 40);

  // Grid de Métricas
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DE PERFORMANCE', 20, 70);

  doc.setDrawColor(230, 230, 230);
  doc.line(20, 75, 190, 75);

  doc.setFontSize(12);
  doc.text('Faturamento Bruto:', 20, 90);
  doc.setTextColor(93, 214, 44);
  doc.text(`R$ ${data.totalRevenue.toFixed(2)}`, 80, 90);

  doc.setTextColor(0, 0, 0);
  doc.text('Total Recebido:', 20, 105);
  doc.text(`R$ ${data.totalReceived.toFixed(2)}`, 80, 105);

  doc.text('Quantidade de Vendas:', 20, 120);
  doc.text(`${data.salesCount}`, 80, 120);

  doc.text('Unidades Movimentadas:', 20, 135);
  doc.text(`${data.unitsCount}`, 80, 135);

  // Rodapé
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Gerado pelo Ecossistema Synkra Academy', 105, 280, { align: 'center' });

  doc.save(`Relatorio_Elite_${data.startDate}_${data.endDate}.pdf`);
};
