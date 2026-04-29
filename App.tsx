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

import { useHistory } from './hooks/useHistory';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useAuth } from './hooks/useAuth';
import { useQuotaAlert } from './hooks/useQuotaAlert';

import {
  saveDiagnosticoPendente,
  getCurrentPosition,
  generateLocalId,
} from './services/offlineDB';

import { AnalysisResult } from './types';

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

  const t = translations[language];

  const { session, loading, signIn, signUp, signOut } = useAuth();
  const { history, addHistoryItem, clearHistory, deleteHistoryItem } = useHistory(session);
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const { quotaAlert, dismissQuotaAlert, handleGeminiError } = useQuotaAlert();

  const handleCapture = useCallback(
    async (result: AnalysisResult, imageDataUrl: string) => {
      setAnalysisResult(result);
      setCapturedImage(imageDataUrl);
      addHistoryItem(result, imageDataUrl);

      try {
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const coords = await getCurrentPosition();
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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-[#F8FAF8]'}`}>
        <Leaf className="w-10 h-10 text-[#064E3B] fill-current animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-white' : 'bg-[#F8FAF8] text-[#064E3B]'}`}>

      <header className={`border-b px-6 py-6 sticky top-0 z-50 transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-emerald-100'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`border-[3px] px-3 py-1 flex items-center justify-center gap-0.5 ${darkMode ? 'border-emerald-400' : 'border-[#064E3B]'}`}>
              <span className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}`}>PL</span>
              <Leaf className={`w-7 h-7 fill-current transform -rotate-12 flex-shrink-0 mt-0.5 ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}`} />
              <span className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}`}>NT</span>
            </div>
            <span className={`text-3xl font-black tracking-tighter leading-none ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}`}>EYE</span>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 rounded-full">
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                ) : (
                  <span className="text-[10px] font-black text-amber-700">{pendingCount}⬆</span>
                )}
              </div>
            )}

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>

            <CameraSelector onDeviceSelect={setSelectedDeviceId} />

            <button
              onClick={() => setShowSettings(true)}
              className={`p-2.5 rounded-full transition-colors ${darkMode ? 'bg-gray-700 text-emerald-400 hover:bg-gray-600' : 'bg-emerald-50 text-[#064E3B] hover:bg-emerald-100'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-center">
          <p className="text-xs text-amber-800 font-medium">{t.offlineBanner}</p>
        </div>
      )}

      {activeTab === 'map' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-emerald-400">
            <Map className="w-12 h-12" />
            <p className="text-sm font-medium">{t.mapSoon}</p>
          </div>
        )}

      <main className="max-w-2xl mx-auto px-6 py-8">

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

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-6 rounded-[2rem] border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-emerald-100'}`}>
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <Info className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm mb-1">{t.offlineMode}</h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-emerald-700/70'}`}>{t.offlineTip}</p>
              </div>

              <div className="bg-[#064E3B] p-6 rounded-[2rem] shadow-lg text-white">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-emerald-300" />
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
              onSessionEnd={handleCapture}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onClearHistory={clearHistory}
            onDeleteItem={deleteHistoryItem}
          />
        )}

        {activeTab === 'map' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-emerald-400">
            <Map className="w-12 h-12" />
            <p className="text-sm font-medium">{t.mapSoon}</p>
          </div>
        )}

         {/* coisa estatistica */}
        {activeTab === 'stats' && (
          <Estatistica history={history} />
        )}

      </main>

      <nav className={`fixed bottom-8 left-6 right-6 backdrop-blur-xl border shadow-2xl rounded-[2.5rem] p-2 z-50 max-w-lg mx-auto transition-colors duration-300 ${darkMode ? 'bg-gray-900/80 border-gray-700/20' : 'bg-white/80 border-white/20'}`}>
        <div className="flex justify-between items-center">
          {([
            { key: 'scan', Icon: Camera, label: t.diagnosisTab },
            { key: 'live', Icon: Activity, label: t.liveTab },
            { key: 'history', Icon: History, label: t.historyTab },
            { key: 'map', Icon: Map, label: t.mapTab },
            { key: 'stats', Icon: BarChart2, label: 'Stats' },
          ] as const).map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center py-3 rounded-[2rem] transition-all duration-300 ${
                activeTab === key
                  ? 'bg-[#064E3B] text-white shadow-lg scale-105'
                  : darkMode ? 'text-gray-500 hover:text-emerald-400' : 'text-emerald-800/40 hover:text-emerald-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {!session && <AuthModal onSignIn={signIn} onSignUp={signUp} />}

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