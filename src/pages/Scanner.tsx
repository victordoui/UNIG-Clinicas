import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { QRScanner } from "@/components/QRScanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar, QrCode } from "lucide-react";

export default function Scanner() {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<Array<{
    code: string;
    timestamp: Date;
    product?: { name: string; location: string; stock: number };
  }>>([]);

  const handleScan = (code: string) => {
    setLastScanned(code);
    
    // Mock product data based on scanned code
    const mockProducts: Record<string, { name: string; location: string; stock: number }> = {
      'NB001': { name: 'Notebook Dell', location: 'Estoque A1', stock: 15 },
      'PAP001': { name: 'Papel A4', location: 'Estoque B2', stock: 50 },
      'DET001': { name: 'Detergente', location: 'Estoque C1', stock: 30 },
      'CHV001': { name: 'Chave Phillips', location: 'Estoque D1', stock: 20 },
    };

    const product = mockProducts[code];
    
    setScanHistory(prev => [{
      code,
      timestamp: new Date(),
      product
    }, ...prev.slice(0, 9)]); // Keep last 10 scans
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><QrCode className="h-6 w-6 text-primary" /> Scanner QR Code</h1>
          <p className="text-muted-foreground">
            Escaneie códigos QR para localizar produtos rapidamente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner */}
          <div>
            <QRScanner onScan={handleScan} />
          </div>

          {/* Results and History */}
          <div className="space-y-4">
            {lastScanned && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Último Escaneamento</CardTitle>
                  <CardDescription>
                    Código: <Badge variant="secondary">{lastScanned}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scanHistory[0]?.product ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="font-medium">{scanHistory[0].product.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{scanHistory[0].product.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Estoque atual:</span>
                        <Badge variant={scanHistory[0].product.stock > 10 ? "default" : "destructive"}>
                          {scanHistory[0].product.stock} unidades
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Produto não encontrado no sistema</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Scan History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Escaneamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {scanHistory.length > 0 ? (
                  <div className="space-y-3">
                    {scanHistory.map((scan, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{scan.code}</Badge>
                            {scan.product && (
                              <span className="text-sm font-medium">{scan.product.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {scan.timestamp.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum código escaneado ainda
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}