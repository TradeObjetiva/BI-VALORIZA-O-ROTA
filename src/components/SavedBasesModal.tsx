import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Star,
  Trash2,
  Download,
  Calendar,
  Layers,
  Check,
  Plus,
  RefreshCw,
  Database,
  Cloud,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  SavedSheetMeta,
  getAllSavedSheets,
  getSheetById,
  setDefaultSheet,
  deleteSheet,
  clearAllSavedSheets,
  saveSheetToStorage,
} from '../utils/storageService';
import { RawTradeRow } from '../types/trade';

interface SavedBasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: RawTradeRow[];
  currentFileName: string;
  onSelectBase: (rows: RawTradeRow[], name: string) => void;
}

export const SavedBasesModal: React.FC<SavedBasesModalProps> = ({
  isOpen,
  onClose,
  currentData,
  currentFileName,
  onSelectBase,
}) => {
  const [savedSheets, setSavedSheets] = useState<SavedSheetMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newBaseName, setNewBaseName] = useState('');
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSheets = async () => {
    setIsLoading(true);
    try {
      const sheets = await getAllSavedSheets();
      setSavedSheets(sheets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSheets();
      setNewBaseName(currentFileName.replace(/\.(xlsx|xls)$/i, '') || 'Base de Valorização');
    }
  }, [isOpen, currentFileName]);

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentData || currentData.length === 0) return;

    setIsSavingCurrent(true);
    try {
      await saveSheetToStorage(
        newBaseName.trim() || currentFileName,
        currentFileName,
        currentData,
        true // set as default
      );
      setSuccessMsg('Base fixada e salva com sucesso no cache do navegador!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadSheets();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCurrent(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultSheet(id);
    await loadSheets();
    setSuccessMsg('Base definida como padrão ao iniciar o sistema.');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a base "${name}" do cache?`)) {
      await deleteSheet(id);
      await loadSheets();
    }
  };

  const handleLoadSheet = async (id: string) => {
    setIsLoading(true);
    try {
      const fullSheet = await getSheetById(id);
      if (fullSheet && fullSheet.data) {
        onSelectBase(fullSheet.data, fullSheet.name);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12121a] border border-[#2b2b3d] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Accent line */}
        <div className="h-1.5 bg-gradient-to-r from-[#00d4aa] via-[#6c63ff] to-[#ffd166]" />

        {/* Header */}
        <div className="p-5 md:p-6 border-b border-[#242436] flex items-center justify-between gap-4 bg-[#161622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00d4aa]/15 border border-[#00d4aa]/30 flex items-center justify-center text-[#00d4aa]">
              <HardDrive className="w-5 h-5 text-[#00d4aa]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                  Bases Salvas no Cache do Navegador (IndexedDB)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30">
                  PERSISTÊNCIA ATIVA
                </span>
              </div>
              <p className="text-xs text-[#9090aa]">
                Seus arquivos ficam salvos permanentemente no seu navegador e abrem automaticamente ao recarregar a página.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#20202e] border border-[#2e2e42] flex items-center justify-center text-[#9090aa] hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Notification */}
          {successMsg && (
            <div className="p-3.5 px-4 rounded-xl bg-[#00d4aa]/15 border border-[#00d4aa]/40 text-[#00d4aa] text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Save current sheet section */}
          {currentData && currentData.length > 0 && (
            <div className="bg-[#171724] border border-[#272738] rounded-2xl p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#00d4aa]" />
                  Salvar / Fixar Base Atual no Cache
                </span>
                <span className="text-[11px] text-[#9090aa]">
                  {currentData.length} linhas carregadas no momento
                </span>
              </div>

              <form onSubmit={handleSaveCurrent} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nome de identificação (ex: Fechamento Março 2026)"
                  value={newBaseName}
                  onChange={(e) => setNewBaseName(e.target.value)}
                  className="flex-1 bg-[#111118] border border-[#28283a] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#5a5a75] focus:outline-none focus:border-[#00d4aa]"
                />
                <button
                  type="submit"
                  disabled={isSavingCurrent}
                  className="px-4 py-2 rounded-xl bg-[#00d4aa] hover:bg-[#00be98] text-[#0d0d12] text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{isSavingCurrent ? 'Salvando...' : 'Fixar como Base Padrão'}</span>
                </button>
              </form>
            </div>
          )}

          {/* List of saved bases */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Bases Gravadas no Navegador ({savedSheets.length})
              </h3>
              {savedSheets.length > 0 && (
                <button
                  onClick={async () => {
                    if (confirm('Deseja apagar todas as bases salvas do navegador?')) {
                      await clearAllSavedSheets();
                      await loadSheets();
                    }
                  }}
                  className="text-[11px] text-[#ff6b6b] hover:underline"
                >
                  Limpar todo o cache
                </button>
              )}
            </div>

            {savedSheets.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#151520] border border-[#222232] text-center text-xs text-[#9090aa] space-y-2">
                <Database className="w-8 h-8 text-[#5a5a75] mx-auto" />
                <p>Nenhuma planilha gravada no cache ainda.</p>
                <p className="text-[11px] text-[#5a5a75]">
                  Ao subir uma planilha ou salvar a base atual acima, ela ficará fixa automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedSheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      sheet.isDefault
                        ? 'bg-[#181828] border-[#6c63ff]/60 shadow-lg shadow-[#6c63ff]/10'
                        : 'bg-[#151520] border-[#242434] hover:border-[#383850]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{sheet.name}</span>
                        {sheet.isDefault && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/40 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-[#a78bfa]" />
                            Padrão ao Iniciar
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#9090aa] flex-wrap">
                        <span>Arquivo: {sheet.fileName}</span>
                        <span>•</span>
                        <span>{sheet.rowCount.toLocaleString('pt-BR')} linhas</span>
                        <span>•</span>
                        <span>
                          {new Date(sheet.uploadDate).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {!sheet.isDefault && (
                        <button
                          onClick={() => handleSetDefault(sheet.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#20202e] hover:bg-[#28283a] text-[#ffd166] border border-[#ffd166]/30 transition flex items-center gap-1"
                          title="Definir para carregar automaticamente ao abrir o sistema"
                        >
                          <Star className="w-3 h-3" />
                          <span className="hidden md:inline">Tornar Padrão</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleLoadSheet(sheet.id)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#6c63ff] hover:bg-[#7c73ff] text-white shadow-sm transition"
                      >
                        Carregar no BI
                      </button>

                      <button
                        onClick={() => handleDelete(sheet.id, sheet.name)}
                        className="p-1.5 rounded-lg bg-[#20202e] hover:bg-[#ff6b6b]/20 text-[#ff6b6b] transition"
                        title="Excluir base do cache"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Database Comparison Explainer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#14141e] border border-[#242436] space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <HardDrive className="w-4 h-4 text-[#00d4aa]" />
                <span>1. Cache Local do Navegador (IndexedDB)</span>
              </div>
              <p className="text-[11px] text-[#9090aa] leading-relaxed">
                <strong className="text-white">Já ativo e funcionando!</strong> Seus dados ficam armazenados na memória segura do seu navegador com capacidade para centenas de megabytes. Você pode fechar o navegador ou reiniciar a máquina: o arquivo carrega automaticamente em menos de 1 segundo.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#14141e] border border-[#242436] space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Cloud className="w-4 h-4 text-[#6c63ff]" />
                <span>2. Banco de Dados em Nuvem (Firebase / SQL)</span>
              </div>
              <p className="text-[11px] text-[#9090aa] leading-relaxed">
                Ideal se você deseja que <strong className="text-white">várias pessoas da equipe da Objetiva Mkt</strong> acessem os mesmos dados simultaneamente de diferentes computadores com controle de acesso e sincronização em tempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-[#161622] border-t border-[#242436] flex items-center justify-between text-xs text-[#9090aa]">
          <span>Armazenamento local criptografado pelo navegador.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#222232] hover:bg-[#2c2c3e] text-white font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
