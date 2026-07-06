import { useState, useRef, useCallback } from 'react';
import { Camera, X, Flashlight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onScan?: (data: string) => void;
  onClose?: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startScanning = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);

        // Check if device has flashlight
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        setHasFlashlight('torch' in capabilities);
      }
    } catch (err) {
      setError('Erro ao acessar a câmera. Verifique as permissões.');
      console.error('Error accessing camera:', err);
    }
  }, []);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setFlashlightOn(false);
  }, []);

  const toggleFlashlight = useCallback(async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !flashlightOn } as any]
        });
        setFlashlightOn(!flashlightOn);
      } catch (err) {
        console.error('Error toggling flashlight:', err);
      }
    }
  }, [flashlightOn]);

  // Simulate QR code detection (in a real app, you'd use a library like zxing-js)
  const simulateQRDetection = useCallback(() => {
    const mockQRCodes = [
      'NB001', 'PAP001', 'DET001', 'CHV001',
      'PROD_001', 'ESTOQUE_A1', 'LOC_B2'
    ];
    
    const randomCode = mockQRCodes[Math.floor(Math.random() * mockQRCodes.length)];
    
    toast({
      title: "QR Code detectado!",
      description: `Código: ${randomCode}`,
    });
    
    onScan?.(randomCode);
    stopScanning();
  }, [onScan, stopScanning, toast]);

  const handleClose = () => {
    stopScanning();
    onClose?.();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner QR Code
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative bg-muted rounded-lg overflow-hidden aspect-square">
          {isScanning ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto mb-4" />
                <p>Clique em "Iniciar Scanner" para começar</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Iniciar Scanner
            </Button>
          ) : (
            <>
              <Button onClick={stopScanning} variant="outline" className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Parar
              </Button>
              
              {hasFlashlight && (
                <Button
                  onClick={toggleFlashlight}
                  variant={flashlightOn ? "default" : "outline"}
                  size="icon"
                >
                  <Flashlight className="h-4 w-4" />
                </Button>
              )}
              
              <Button onClick={simulateQRDetection} variant="secondary" size="icon">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Posicione o QR Code dentro da área de digitalização
        </p>
      </CardContent>
    </Card>
  );
}