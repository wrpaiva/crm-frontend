import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export async function exportDashboardToPDF(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const canvas = await html2canvas(container, {
    scale: 2,
    backgroundColor: '#1a1d21',
    useCORS: true,
    logging: false
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.setFillColor(26, 29, 33);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Dashboard Operacional', 14, 15);
  pdf.setFontSize(10);
  pdf.setTextColor(156, 163, 175);
  pdf.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 22);

  // Dashboard image
  const margin = 14;
  const topOffset = 28;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - topOffset - margin;
  const imgRatio = canvas.width / canvas.height;
  const availableRatio = availableWidth / availableHeight;

  let imgW, imgH;
  if (imgRatio > availableRatio) {
    imgW = availableWidth;
    imgH = availableWidth / imgRatio;
  } else {
    imgH = availableHeight;
    imgW = availableHeight * imgRatio;
  }

  pdf.addImage(imgData, 'PNG', margin, topOffset, imgW, imgH);
  pdf.save(`dashboard-operacional-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportDashboardToExcel(data) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumo Executivo
  if (data.executive) {
    const kpis = data.executive.kpis || {};
    const rows = [
      ['Métrica', 'Valor'],
      ['Total Leads', kpis.totalLeads || 0],
      ['Total Deals', kpis.totalDeals || 0],
      ['Pipeline Value', kpis.pipelineValue || 0],
      ['Won Value', kpis.wonValue || 0],
      ['Lost Value', kpis.lostValue || 0],
      ['Conversion Rate', kpis.conversionRate || 0],
      ['Total Contacts', kpis.totalContacts || 0]
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo Executivo');
  }

  // Sheet 2: Pipeline
  if (data.pipeline) {
    const stages = data.pipeline.stages || [];
    const rows = [
      ['Estágio', 'Quantidade', 'Valor Total', 'Ticket Médio'],
      ...stages.map(s => [s.stage, s.count || 0, s.totalValue || 0, s.averageTicket || 0])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Pipeline');
  }

  // Sheet 3: Performance Vendedores
  if (data.sellers) {
    const sellers = data.sellers.sellers || [];
    const rows = [
      ['Vendedor', 'Email', 'Total Leads', 'Total Deals', 'Won', 'Conversão %', 'Receita', 'Ticket Médio', 'Atividades', 'Concluídas', 'Atrasadas'],
      ...sellers.map(s => [
        s.seller?.name || '',
        s.seller?.email || '',
        s.metrics?.totalLeads || 0,
        s.metrics?.totalDeals || 0,
        s.metrics?.wonDeals || 0,
        s.metrics?.conversionRate || 0,
        s.metrics?.revenue || 0,
        s.metrics?.averageTicket || 0,
        s.metrics?.totalActivities || 0,
        s.metrics?.completedActivities || 0,
        s.metrics?.overdueActivities || 0
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Performance Vendedores');
  }

  // Sheet 4: Atividades
  if (data.activities) {
    const summary = data.activities.summary || {};
    const byType = data.activities.byType || [];
    const rows = [
      ['Resumo de Atividades'],
      ['Pendentes', summary.pendingCount || 0],
      ['Atrasadas', summary.overdueCount || 0],
      ['Concluídas Hoje', summary.completedToday || 0],
      ['Concluídas no Período', summary.completedInPeriod || 0],
      [],
      ['Por Tipo', 'Total', 'Concluídas'],
      ...byType.map(t => [t.type, t.total || 0, t.completed || 0])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Atividades');
  }

  // Sheet 5: Riscos
  if (data.risks) {
    const summary = data.risks.summary || {};
    const rows = [
      ['Indicador de Risco', 'Quantidade'],
      ['Leads sem Atividade', summary.leadsWithoutActivity || 0],
      ['Leads Novos sem Contato', summary.newLeadsWithoutContact || 0],
      ['Deals sem Atividade Recente', summary.dealsWithoutRecentActivity || 0],
      ['Propostas Paradas', summary.staleProposals || 0],
      ['Negociações Travadas', summary.stuckNegotiations || 0],
      ['Atividades Atrasadas Alto Valor', summary.overdueHighValueActivities || 0]
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Riscos');
  }

  XLSX.writeFile(wb, `dashboard-operacional-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
