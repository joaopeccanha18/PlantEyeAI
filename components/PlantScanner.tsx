import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapPin, Loader2, AlertTriangle, Navigation } from 'lucide-react';
import { analyzePlantImage } from '../services/gemini';
import { AnalysisResult, PlantStatus, LightLevel, GpsCoords } from '../types';

interface PlantScannerProps {
  onResult: (result: AnalysisResult, image: string, coords: GpsCoords | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean) => void;
  deviceId?: string;
  onGeminiError?: (error: unknown) => boolean;
}

type GpsState = 'acquiring' | 'ready' | 'denied' | 'unavailable';

const PlantScanner: React.FC<PlantScannerProps> = ({
  onResult, isAnalyzing, setIsAnalyzing, deviceId, onGeminiError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [gpsState, setGpsState] = useState<GpsState>('acquiring');
  const [coords, setCoords] = useState<GpsCoords | null>(null);

  // ── Câmara ──────────────────────────────────────────────────────
  useEffect(() => {
    const startCamera = async () => {
      try {
        if (videoRef.current?.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('Não foi possível aceder à câmara selecionada.');
      }
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [deviceId]);

  // ── GPS ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState('unavailable');
      return;
    }

    setGpsState('acquiring');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsState('ready');
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setGpsState('denied');
        } else {
          setGpsState('unavailable');
        }
        setCoords(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Captura e análise ───────────────────────────────────────────
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    if (gpsState !== 'ready') return; // GPS obrigatório

    setIsAnalyzing(true);
    setError(null);
    setOfflineSaved(false);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];

      // ── MODO OFFLINE ─────────────────────────────────────────
      if (!navigator.onLine) {
        const pendingResult: AnalysisResult = {
          species: 'Diagnóstico Pendente',
          status:  PlantStatus.UNKNOWN,
          healthStatus:    'Desconhecido' as AnalysisResult['healthStatus'],
          threatDetected:  'nenhuma',
          severityLevel:   0,
          forestryRisk:    'Baixo',
          recommendations: ['Imagem guardada localmente. Pressione "Analisar" quando voltar online.'],
          recommendation:  '',
          raizReference:   '',
          summary:         'Captura offline. GPS registado. Analise quando tiver ligação à internet.',
          lightLevel:      LightLevel.UNKNOWN,
          confidence:      0,
          isInvasive:      false,
          invasiveSpecies: null,
          isPending:       true,
          imageBase64:     base64,
        };
        onResult(pendingResult, dataUrl, coords);
        setOfflineSaved(true);
        setTimeout(() => setOfflineSaved(false), 4000);
        setIsAnalyzing(false);
        return;
      }

      // ── MODO ONLINE ──────────────────────────────────────────
      try {
        const result = await analyzePlantImage(base64);
        onResult(result, dataUrl, coords);
      } catch (err) {
        const isQuotaError = onGeminiError?.(err);
        if (!isQuotaError) {
          setError('Falha ao analisar a imagem. Tente novamente.');
        }
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [isAnalyzing, onResult, setIsAnalyzing, onGeminiError, gpsState, coords]);

  // ── Indicador GPS ───────────────────────────────────────────────
  const GpsIndicator = () => {
    if (gpsState === 'ready') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30">
          <Navigation className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">
            GPS ±{Math.round(coords?.accuracy ?? 0)}m
          </span>
        </div>
      );
    }
    if (gpsState === 'acquiring') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 backdrop-blur-sm rounded-full border border-amber-400/30">
          <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">A obter GPS…</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-400/30">
        <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
        <span className="text-[10px] font-black text-red-300 uppercase tracking-widest">
          {gpsState === 'denied' ? 'GPS Bloqueado' : 'GPS Indisponível'}
        </span>
      </div>
    );
  };

  const gpsBlocked = gpsState === 'denied' || gpsState === 'unavailable';
  const canCapture = gpsState === 'ready' && !isAnalyzing;

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-[2rem] bg-black aspect-square shadow-2xl ring-4 ring-green-600/10">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
        aria-label="Feed da Câmara"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Moldura de mira */}
      <div className="absolute inset-0 border-4 border-dashed border-white/20 pointer-events-none rounded-[2rem] m-6" />

      {/* Indicador GPS — topo */}
      <div className="absolute top-5 left-0 right-0 flex justify-center">
        <GpsIndicator />
      </div>

      {/* Aviso bloqueante se GPS negado */}
      {gpsBlocked && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center px-8 gap-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-400/30">
            <MapPin className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white font-black text-center text-lg">GPS Necessário</p>
          <p className="text-white/70 text-center text-sm leading-relaxed">
            {gpsState === 'denied'
              ? 'O acesso à localização foi bloqueado. Ativa o GPS nas definições do browser para diagnosticar plantas de campo.'
              : 'GPS não disponível neste dispositivo. Verifica se a localização está ativa.'}
          </p>
        </div>
      )}

      {/* Controlos inferiores */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center px-6 gap-4">
        {/* Banners de feedback */}
        {offlineSaved && (
          <div className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2">
            <span>📥</span>
            <span>Guardado offline — analise quando voltar online</span>
          </div>
        )}
        {error && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold animate-bounce shadow-xl">
            {error}
          </div>
        )}

        <button
          onClick={captureAndAnalyze}
          disabled={!canCapture}
          className={`
            w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center
            transition-all transform active:scale-95 shadow-2xl
            ${canCapture ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 border-gray-400 cursor-not-allowed'}
          `}
          aria-label={isAnalyzing ? 'A analisar...' : gpsState !== 'ready' ? 'Aguarda GPS...' : 'Analisar Saúde'}
        >
          {isAnalyzing ? (
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-5 h-5 bg-white rounded-full shadow-inner" />
          )}
        </button>

        <p className="text-white text-sm font-black tracking-widest uppercase drop-shadow-md bg-black/30 px-4 py-1 rounded-full backdrop-blur-sm">
          {isAnalyzing
            ? 'A analisar...'
            : gpsState === 'acquiring'
            ? 'A obter localização…'
            : gpsBlocked
            ? 'GPS necessário'
            : 'Clique para Diagnosticar'}
        </p>
      </div>
    </div>
  );
};

export default PlantScanner;