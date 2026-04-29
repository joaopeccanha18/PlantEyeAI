import React, { useState, useCallback } from 'react';
import {
  Leaf, Camera, History, Settings, Info, Activity, Zap,
  WifiOff, Wifi, RefreshCw, Map, BarChart2,
} from 'lucide-react';

import PlantScanner from './components/PlantScanner';
import LiveAssistant from './components/LiveAssistant';
import AnalysisResultView from './components/AnalysisResultView';
import VoiceFeedback from './components/VoiceFeedback';
import CameraSelector from './components/CameraSelector';
import HistoryView from './components/HistoryView';
import AuthModal from './components/AuthModal';
import QuotaAlert from './components/QuotaAlert';
import Estatistica from './components/estatistica';
import SettingsModal, { translations, Language } from './components/SettingsModal';
import MapView from './components/MapView';

import { useHistory } from './hooks/useHistory';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useAuth } from './hooks/useAuth';
import { useQuotaAlert } from './hooks/useQuotaAlert';

import {
  saveDiagnosticoPendente,
  generateLocalId,
} from './services/offlineDB';

import { AnalysisResult, GpsCoords, HistoryItem } from './types';

type ActiveTab = 'scan' | 'live' | 'history' | 'map' | 'stats';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<Language>('pt');
  const [mapSelectedItem, setMapSelectedItem] = useState<HistoryItem | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('planteye_raiz_onboarding_seen')
  );

  const dismissOnboarding = () => {
    localStorage.setItem('planteye_raiz_onboarding_seen', '1');
    setShowOnboarding(false);
  };

  const t = translations[language];

  const { session, loading, signIn, signUp, signOut } = useAuth();
  const { history, addHistoryItem, clearHistory, deleteHistoryItem, markInvasiveRemoved, updateHistoryItem } = useHistory(session);
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const { quotaAlert, dismissQuotaAlert, handleGeminiError } = useQuotaAlert();

  /** Re-analisa um item pendente (capturado offline) agora que há rede */
  const handleReanalyze = useCallback(async (item: HistoryItem) => {
    if (!item.imageBase64 || !navigator.onLine) return;
    setIsAnalyzing(true);
    try {
      const { analyzePlantImage } = await import('./services/gemini');
      const result = await analyzePlantImage(item.imageBase64);
      await updateHistoryItem(item.id, result);
    } catch (err) {
      handleGeminiError(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [updateHistoryItem, handleGeminiError]);

  const handleCapture = useCallback(
    async (result: AnalysisResult, imageDataUrl: string, coords: GpsCoords | null) => {
      setAnalysisResult(result);
      setCapturedImage(imageDataUrl);
      addHistoryItem(result, imageDataUrl, coords);

      try {
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const uid = session?.user?.id ?? 'anonimo';

        await saveDiagnosticoPendente({
          id: generateLocalId(),
          imageBlob: blob,
          coords,
          timestamp: new Date().toISOString(),
          userId: uid,
        });
      } catch (err) {
        console.warn('[Offline] Não foi possível guardar no IndexedDB:', err);
      }
    },
    [addHistoryItem, session]
  );

  /** Navega para o histórico e abre o modal do item selecionado (vindo do mapa) */
  const handleMapSelectItem = useCallback((item: HistoryItem) => {
    setMapSelectedItem(item);
    setActiveTab('history');
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-[#F8FAF8]'}`}>
        <Leaf className="w-10 h-10 text-[#064E3B] fill-current animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] font-sans pb-28 transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-white' : 'bg-[#F8FAF8] text-[#064E3B]'}`}>

      <header className={`border-b px-4 py-3 sticky top-0 z-50 transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-emerald-100'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`border-[2.5px] px-2 py-0.5 flex items-center justify-center gap-0.5 ${darkMode ? 'border-emerald-400' : 'border-[#064E3B]'}`}>
              <span className={`text-xl font-black tracking-tighter ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}`}>PL</span>
              <Leaf className={`w-5 h-5 fill-current transform -rotate-12 flex-shrink-0 ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}`} />
              <span className={`text-xl font-black tracking-tighter ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}`}>NT</span>
            </div>
            <span className={`text-xl font-black tracking-tighter leading-none ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}`}>EYE</span>
          </div>

          {/* Status + actions */}
          <div className="flex items-center gap-1.5">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full">
                {isSyncing
                  ? <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                  : <span className="text-[10px] font-black text-amber-700">{pendingCount}⬆</span>}
              </div>
            )}

            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden xs:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            <CameraSelector onDeviceSelect={setSelectedDeviceId} />

            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-700 text-emerald-400 hover:bg-gray-600' : 'bg-emerald-50 text-[#064E3B] hover:bg-emerald-100'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-center">
          <p className="text-xs text-amber-800 font-medium">{t.offlineBanner}</p>
        </div>
      )}



      <main className={`max-w-2xl mx-auto transition-colors duration-300 ${
        activeTab === 'map'
          ? 'px-0 py-0'
          : 'px-4 sm:px-6 py-6 sm:py-8'
      }`}>

        {activeTab === 'scan' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight">{t.diagnosisTitle}</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Eucalyptus</span>
              </div>
            </div>

            <PlantScanner
              onResult={handleCapture}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
              deviceId={selectedDeviceId}
              onGeminiError={handleGeminiError}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-5 rounded-[2rem] border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-100'}`}>
                <div className="w-9 h-9 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                  <Info className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">{t.offlineMode}</h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-emerald-700/70'}`}>{t.offlineTip}</p>
              </div>

              <div className="bg-[#064E3B] p-5 rounded-[2rem] shadow-lg text-white">
                <div className="w-9 h-9 bg-white/10 rounded-2xl flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4 text-emerald-300" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-emerald-50">{t.gpsAuto}</h3>
                <p className="text-xs text-emerald-100/70 leading-relaxed">{t.gpsTip}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight">{t.liveTitle}</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-100 rounded-full">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Tempo Real</span>
              </div>
            </div>
            <LiveAssistant
              isActive={activeTab === 'live'}
              deviceId={selectedDeviceId}
              onGeminiError={handleGeminiError}
              onSessionEnd={(result, image) => handleCapture(result, image, null)}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onClearHistory={clearHistory}
            onDeleteItem={deleteHistoryItem}
            onMarkRemoved={markInvasiveRemoved}
            onReanalyze={handleReanalyze}
            isOnline={isOnline}
          />
        )}

        {activeTab === 'map' && (
          <div className="h-[calc(100dvh-8rem)] overflow-hidden">
            <MapView history={history} onSelectItem={handleMapSelectItem} />
          </div>
        )}

         {/* coisa estatistica */}
        {activeTab === 'stats' && (
          <Estatistica history={history} />
        )}

      </main>

      {/* Nav Bottom — fixo com safe-area para iOS */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 transition-colors duration-300
        ${ darkMode ? 'bg-gray-900/95 border-gray-700/40' : 'bg-white/95 border-emerald-100/60'}
        border-t backdrop-blur-xl pb-safe`}>
        <div className="max-w-lg mx-auto flex justify-around items-center px-2 pt-1 pb-2">
          {([
            { key: 'scan',    Icon: Camera,   label: t.diagnosisTab },
            { key: 'live',    Icon: Activity, label: t.liveTab },
            { key: 'history', Icon: History,  label: t.historyTab },
            { key: 'map',     Icon: Map,      label: t.mapTab },
            { key: 'stats',   Icon: BarChart2,label: 'Stats' },
          ] as const).map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-all duration-200 min-w-0 flex-1 ${
                activeTab === key
                  ? 'bg-[#064E3B] text-white shadow-md scale-105'
                  : darkMode ? 'text-gray-500 hover:text-emerald-400' : 'text-emerald-800/40 hover:text-emerald-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-black uppercase tracking-widest truncate w-full text-center">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {!session && <AuthModal onSignIn={signIn} onSignUp={signUp} />}

      {/* Onboarding RAIZ — aparece apenas na primeira visita */}
      {showOnboarding && session && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
            {/* Header verde */}
            <div className="bg-[#064E3B] p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Leaf className="w-8 h-8 text-emerald-300 fill-current" />
              </div>
              <h2 className="text-2xl font-black tracking-tighter">PlantEye</h2>
              <p className="text-emerald-300 text-sm font-bold mt-1">Diagnóstico Florestal por IA</p>
            </div>

            <div className="p-8 space-y-5">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 mb-2">Base Científica</p>
                <p className="text-lg font-black text-[#064E3B] leading-tight">
                  RAIZ – Instituto de Investigação<br />da Floresta e Papel
                </p>
                <p className="text-sm text-emerald-600/70 mt-1">Aveiro, Portugal · raiz-iifp.pt</p>
              </div>

              <div className="space-y-3">
                {[
                  { emoji: '🌿', text: 'Especializado em Eucalyptus globulus · A espécie mais importante da floresta portuguesa' },
                  { emoji: '🔬', text: 'Mais de 20 anos de investigação em silvicultura · Programa de melhoramento genético clonal (+40% produtividade)' },
                  { emoji: '🐛', text: 'Deteção de Gonipterus, Phoracantha, Mycosphaerella e deficiências nutricionais com escala de severidade RAIZ/BIOND' },
                  { emoji: '✅', text: 'Áreas certificadas FSC e PEFC · Projeto e-globulus (Compete 2020)' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-lg flex-shrink-0">{item.emoji}</span>
                    <p className="text-xs text-emerald-800 leading-relaxed font-medium">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <a
                  href="https://e-globulus.pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 border-2 border-[#064E3B] text-[#064E3B] rounded-2xl font-bold text-sm text-center hover:bg-emerald-50 transition-colors"
                >
                  e-globulus.pt
                </a>
                <button
                  onClick={dismissOnboarding}
                  className="flex-2 flex-1 py-3 bg-[#064E3B] text-white rounded-2xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-lg"
                >
                  Começar Diagnóstico →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(d => !d)}
          language={language}
          onChangeLanguage={setLanguage}
          onLogout={signOut}
          isLoggedIn={!!session}
          t={t}
        />
      )}

      {quotaAlert && <QuotaAlert alert={quotaAlert} onDismiss={dismissQuotaAlert} />}

      {analysisResult && capturedImage && (
        <AnalysisResultView
          result={analysisResult}
          image={capturedImage}
          onClose={() => { setAnalysisResult(null); setCapturedImage(null); }}
        />
      )}

      {analysisResult && (
        <VoiceFeedback
          text={`${analysisResult.species}. Diagnóstico: ${analysisResult.summary}. Recomendação: ${analysisResult.recommendation}`}
          trigger={analysisResult}
        />
      )}
    </div>
  );
}

export default App;