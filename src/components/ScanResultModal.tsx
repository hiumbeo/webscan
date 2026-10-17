import React from 'react';
import { FunAnalysis } from '../utils/storage';
import { Sparkles, Trophy, Heart, Download, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ScanResultModalProps {
  analysis: FunAnalysis;
  photoUrl: string;
  onClose: () => void;
  onScanAgain: () => void;
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  analysis,
  photoUrl,
  onClose,
  onScanAgain,
}) => {
  const downloadCard = () => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `ket-qua-scan-mat-${analysis.matchId}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 via-zinc-900 to-black border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 text-white text-center">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          KẾT QUẢ QUÉT SINH TRẮC HỌC AI
        </div>

        {/* Snapshot Thumbnail with cyber frame */}
        <div className="relative mx-auto w-32 h-32 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 mb-4 group">
          <img src={photoUrl} alt="Captured Face" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-1 right-2 text-[10px] font-mono text-cyan-300">
            {analysis.matchId}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-pink-300 mb-1">
          {analysis.title}
        </h2>
        <p className="text-xs text-zinc-400 mb-4 font-mono">{analysis.tag}</p>

        {/* Metric Scores */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-xl p-3">
            <div className="flex items-center justify-center gap-1 text-pink-400 text-xs font-medium mb-1">
              <Heart className="w-3.5 h-3.5 fill-pink-400/20" />
              Độ Đẹp Trai/Xinh Gái
            </div>
            <div className="text-2xl font-extrabold text-pink-300">
              {analysis.beautyScore}%
            </div>
            <div className="text-[10px] text-zinc-400">Chuẩn sắc đẹp 2026</div>
          </div>

          <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-xl p-3">
            <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-medium mb-1">
              <Trophy className="w-3.5 h-3.5 fill-amber-400/20" />
              Chỉ Số Phát Tài
            </div>
            <div className="text-2xl font-extrabold text-amber-300">
              {analysis.richScore}%
            </div>
            <div className="text-[10px] text-zinc-400">Tướng mạo đại gia</div>
          </div>
        </div>

        {/* Fortune Quote */}
        <div className="bg-zinc-800/50 border border-cyan-500/20 rounded-xl p-3.5 text-left mb-4">
          <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Lời Phán Tướng Số:
          </div>
          <p className="text-xs text-zinc-200 italic leading-relaxed">
            "{analysis.fortuneQuote}"
          </p>
        </div>

        {/* Fun completion notice */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-cyan-400 font-mono mb-5 bg-cyan-950/40 border border-cyan-500/20 rounded-lg py-1.5 px-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          Hệ thống AI đã hoàn tất phân tích sinh trắc học
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={downloadCard}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition border border-zinc-700 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Tải Ảnh Về
          </button>
          <button
            onClick={() => {
              onClose();
              onScanAgain();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Quét Lại
          </button>
        </div>
      </div>
    </div>
  );
};
