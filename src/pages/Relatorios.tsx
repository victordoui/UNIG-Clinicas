import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Download, Calendar, BarChart3, PieChart, FileText } from "lucide-react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useAuth } from "@/hooks/useAuth";

export default function Relatorios() {
  const [periodoSelecionado, setPeriodoSelecionado] = useState("30dias");
  const [reportData, setReportData] = useState({
    movimentacoes: [],
    categorias: [],
    produtosMaisMovimentados: [],
    metricas: {
      totalMovimentacoes: 0,
      valorTotalEstoque: 0,
      produtosAtivos: 0,
      giroEstoque: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { organization, isSuperAdmin } = useAuth();

  useEffect(() => {
    loadReportData();
  }, [periodoSelecionado]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const daysBack = getPeriodDays(periodoSelecionado);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Carrega movimentações
      let movementsQuery = supabase
        .from('movements')
        .select('*, products(name, category)')
        .gte('created_at', startDate.toISOString());

      // Filter by organization if not super admin
      if (!isSuperAdmin && organization?.organization_id) {
        movementsQuery = movementsQuery.eq('organization_id', organization.organization_id);
      }

      const { data: movements } = await movementsQuery;

      // Carrega produtos
      let productsQuery = supabase
        .from('products')
        .select('*');

      // Filter by organization if not super admin
      if (!isSuperAdmin && organization?.organization_id) {
        productsQuery = productsQuery.eq('organization_id', organization.organization_id);
      }

      const { data: products } = await productsQuery;

      // Processa dados de movimentações por mês
      const movimentacoesPorMes = processMovementsByMonth(movements || []);

      // Processa dados de categoria
      const categoriaData = processCategoryData(products || []);

      // Produtos mais movimentados
      const produtosMaisMovimentados = getTopMovedProducts(movements || []);

      // Métricas
      const metricas = calculateMetrics(movements || [], products || []);

      setReportData({
        movimentacoes: movimentacoesPorMes,
        categorias: categoriaData,
        produtosMaisMovimentados,
        metricas
      });
    } catch (error) {
      console.error('Error loading report data:', error);
      toast({
        title: "Erro ao carregar relatórios",
        description: "Não foi possível carregar os dados dos relatórios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDays = (period: string) => {
    switch (period) {
      case "7dias": return 7;
      case "30dias": return 30;
      case "90dias": return 90;
      case "12meses": return 365;
      default: return 30;
    }
  };

  const processMovementsByMonth = (movements: any[]) => {
    const monthlyData: { [key: string]: { entradas: number; saidas: number } } = {};
    
    movements.forEach(movement => {
      const date = new Date(movement.created_at);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { entradas: 0, saidas: 0 };
      }
      
      if (movement.type === 'entrada') {
        monthlyData[monthKey].entradas += movement.quantity;
      } else if (movement.type === 'saida') {
        monthlyData[monthKey].saidas += movement.quantity;
      }
    });

    return Object.entries(monthlyData).map(([mes, data]) => ({
      mes,
      ...data
    }));
  };

  const processCategoryData = (products: any[]) => {
    const categoryCount: { [key: string]: number } = {};
    const total = products.length;

    products.forEach(product => {
      categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
    });

    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
    
    return Object.entries(categoryCount).map(([category, count], index) => ({
      name: getCategoryLabel(category),
      value: Math.round((count / total) * 100),
      cor: colors[index % colors.length]
    }));
  };

  const getTopMovedProducts = (movements: any[]) => {
    const productMovements: { [key: string]: { name: string; count: number } } = {};
    
    movements.forEach(movement => {
      if (movement.products?.name) {
        const productName = movement.products.name;
        if (!productMovements[productName]) {
          productMovements[productName] = { name: productName, count: 0 };
        }
        productMovements[productName].count += movement.quantity;
      }
    });

    return Object.values(productMovements)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        produto: item.name,
        movimentacoes: item.count
      }));
  };

  const calculateMetrics = (movements: any[], products: any[]) => {
    const totalMovimentacoes = movements.length;
    const valorTotalEstoque = products.reduce((total, product) => {
      return total + ((product.unit_price || 0) * product.current_stock);
    }, 0);
    const produtosAtivos = products.length;
    const giroEstoque = movements.length > 0 ? (totalMovimentacoes / products.length) : 0;

    return {
      totalMovimentacoes,
      valorTotalEstoque,
      produtosAtivos,
      giroEstoque: Number(giroEstoque.toFixed(1))
    };
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'eletronicos': 'Eletrônicos',
      'escritorio': 'Escritório',
      'limpeza': 'Limpeza',
      'manutencao': 'Manutenção',
      'cozinha': 'Cozinha',
      'outros': 'Outros'
    };
    return labels[category] || category;
  };

  const exportToExcel = async (type: string) => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'estoque':
          const { data: products } = await supabase.from('products').select('*');
          data = products || [];
          filename = 'relatorio_estoque.xlsx';
          break;
        case 'movimentacoes':
          const { data: movements } = await supabase
            .from('movements')
            .select('*, products(name)')
            .order('created_at', { ascending: false });
          data = movements || [];
          filename = 'relatorio_movimentacoes.xlsx';
          break;
        default:
          return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');
      XLSX.writeFile(wb, filename);

      toast({
        title: "Relatório exportado",
        description: `O arquivo ${filename} foi baixado com sucesso.`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o relatório.",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = (type: string) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Relatório UNIG Facilities', 20, 20);
      doc.setFontSize(12);
      doc.text(`Tipo: ${type}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 50);
      doc.save(`relatorio_${type}.pdf`);

      toast({
        title: "Relatório exportado",
        description: "O PDF foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    }
  };

  const relatoriosDisponiveis = [
    {
      titulo: "Relatório de Estoque",
      descricao: "Posição atual do estoque por categoria",
      icone: <BarChart3 className="h-6 w-6" />,
      periodo: "Atual"
    },
    {
      titulo: "Movimentações Mensais",
      descricao: "Entradas e saídas do último mês",
      icone: <TrendingUp className="h-6 w-6" />,
      periodo: "30 dias"
    },
    {
      titulo: "Produtos Críticos",
      descricao: "Lista de produtos com estoque baixo",
      icone: <FileText className="h-6 w-6" />,
      periodo: "Atual"
    },
    {
      titulo: "Análise de Consumo",
      descricao: "Produtos mais utilizados por departamento",
      icone: <PieChart className="h-6 w-6" />,
      periodo: "90 dias"
    }
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
            {/* Header da página */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Relatórios
                </h1>
                <p className="text-muted-foreground mt-1">
                  Análises e relatórios do sistema de almoxarifado
                </p>
              </div>
              
              <div className="flex gap-2">
                <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                    <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                    <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                    <SelectItem value="12meses">Últimos 12 meses</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Período Customizado
                </Button>
              </div>
            </div>

            {/* Métricas principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Movimentações</p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : reportData.metricas.totalMovimentacoes.toLocaleString()}
                      </p>
                      <p className="text-xs text-success">Período selecionado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total Estoque</p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : `R$ ${(reportData.metricas.valorTotalEstoque / 1000).toFixed(1)}K`}
                      </p>
                      <p className="text-xs text-success">Valor atual</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <FileText className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Produtos Ativos</p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : reportData.metricas.produtosAtivos}
                      </p>
                      <p className="text-xs text-muted-foreground">Total cadastrados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <PieChart className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Giro do Estoque</p>
                      <p className="text-2xl font-bold">
                        {loading ? "..." : `${reportData.metricas.giroEstoque}x`}
                      </p>
                      <p className="text-xs text-success">Movimentos por produto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Movimentações por mês */}
              <Card>
                <CardHeader>
                  <CardTitle>Movimentações por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.movimentacoes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="entradas" stackId="1" stroke="#10b981" fill="#10b981" name="Entradas" />
                    <Area type="monotone" dataKey="saidas" stackId="1" stroke="#ef4444" fill="#ef4444" name="Saídas" />
                  </AreaChart>
                </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Distribuição por categoria */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={reportData.categorias}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.categorias.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Produtos mais movimentados */}
            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Movimentados</CardTitle>
              </CardHeader>
              <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.produtosMaisMovimentados} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="produto" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="movimentacoes" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Relatórios disponíveis */}
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatoriosDisponiveis.map((relatorio, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {relatorio.icone}
                          </div>
                          <div>
                            <h3 className="font-semibold">{relatorio.titulo}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{relatorio.descricao}</p>
                            <span className="text-xs bg-secondary px-2 py-1 rounded">{relatorio.periodo}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => exportToExcel(index === 0 ? 'estoque' : 'movimentacoes')}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Excel
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => exportToPDF(relatorio.titulo)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
      </div>
    </MainLayout>
  );
}