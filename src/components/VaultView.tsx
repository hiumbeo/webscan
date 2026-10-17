import React, { useState, useEffect } from 'react';
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
  X,
  Sliders,
  Send,
} from 'lucide-react';

interface VaultViewProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshScanner?: () => void;
}

export const VaultView: React.FC<VaultViewProps> = ({ isOpen, onClose }) => {
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(true); // default unlocked for owner convenience
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

  // Load captures and settings
  const loadData = async () => {
    setIsLoading(true);
    try {
      const records = await getAllCaptures();
      setCaptures(records);

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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === savedPin) {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Mã PIN không đúng! (Mặc định là 1234)');
    }
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
    if (window.confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ hình ảnh và video trong kho lưu trữ! Bạn có chắc không?')) {
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

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.origin);
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] bg-zinc-950 border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-wide">
                  Mục Lưu Trữ Của Tui
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-[11px] font-mono text-cyan-400">
                  {captures.length} bản ghi
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Kho lưu trữ hình ảnh & video ghi hình tự động người vào quét
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition text-xs flex items-center gap-1.5"
              title="Cài đặt kho lưu trữ"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Cài đặt</span>
            </button>

            <button
              onClick={copyShareLink}
              className="p-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 transition text-xs flex items-center gap-1.5"
              title="Sao chép link trang quét gửi bạn bè"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedLink ? 'Đã sao chép link!' : 'Copy Link Quét'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PIN Lock Screen if locked */}
        {!isUnlocked ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <form
              onSubmit={handleUnlock}
              className="max-w-sm w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center shadow-xl"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold mb-1">Mã PIN Bảo Vệ</h2>
              <p className="text-xs text-zinc-400 mb-6">
                Nhập mã PIN để mở khóa Mục Lưu Trữ bí mật (Mặc định: <code className="text-cyan-400">1234</code>)
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
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                Mở Khóa Kho Lưu Trữ
              </button>
            </form>
          </div>
        ) : showSettings ? (
          /* Settings Panel */
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-cyan-300">
                <Sliders className="w-5 h-5" />
                Cài Đặt Mục Lưu Trữ
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
                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Webhook Báo Về Discord / Telegram (Tùy chọn)
                  </label>
                  <p className="text-[11px] text-zinc-400 mb-2">
                    Dán URL Webhook của Discord channel. Mỗi khi có ai vào quét mặt, hệ thống sẽ tự động gửi thông báo và ảnh về kênh của bạn!
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
                    className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium"
                  >
                    Quay lại
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
          </div>
        ) : (
          /* Main Vault Content */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Stats and Quick Toolbar */}
            <div className="px-5 py-3 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
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
                  Yêu thích ({captures.filter((c) => c.isFavorite).length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo ngày, thiết bị..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  title="Tải lại dữ liệu"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleExport}
                  disabled={captures.length === 0}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition flex items-center gap-1.5"
                  title="Xuất file JSON sao lưu"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất File</span>
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={captures.length === 0}
                  className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 disabled:opacity-40 text-red-300 transition flex items-center gap-1.5"
                  title="Xóa toàn bộ kho"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Hết</span>
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {filteredCaptures.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-300 mb-1">
                    Chưa có khuôn mặt nào được ghi hình
                  </h3>
                  <p className="text-xs max-w-sm mb-4">
                    Khi có người vào trang web và mở camera, hệ thống sẽ tự động quét, chụp hình và ghi video clip gửi vào đây!
                  </p>
                  <button
                    onClick={copyShareLink}
                    className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition flex items-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Copy Link Gửi Bạn Bè Quét Thử
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {filteredCaptures.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedCapture(item)}
                      className="group relative bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden shadow-lg transition hover:shadow-cyan-500/10 cursor-pointer flex flex-col"
                    >
                      {/* Photo Thumbnail */}
                      <div className="relative aspect-square bg-zinc-950 overflow-hidden">
                        <img
                          src={item.photoDataUrl}
                          alt="Captured face"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Video clip badge */}
                        {(item.hasVideo || item.videoDataUrl) && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                            <Video className="w-3 h-3 text-cyan-400" />
                            CLIP
                          </div>
                        )}

                        {/* Favorite button */}
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

                        {/* Beauty Score Overlay */}
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-bold text-pink-300 border border-pink-500/30">
                          {item.funAnalysis?.beautyScore || 98}% đẹp
                        </div>

                        {/* Delete button (hover) */}
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-zinc-400 hover:text-white transition opacity-0 group-hover:opacity-100"
                          title="Xóa bản ghi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Card Info Footer */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-cyan-300">
                            {item.funAnalysis?.title || 'Khách Vô Danh'}
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                            <Monitor className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{item.device || 'Web Browser'}</span>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 flex items-center justify-between font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-cyan-500" />
                            {item.dateString}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detail Modal for Selected Capture */}
        {selectedCapture && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-lg animate-in fade-in duration-150">
            <div className="relative w-full max-w-3xl bg-zinc-950 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl p-5 text-white flex flex-col max-h-[90vh]">
              {/* Modal Top Bar */}
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
                    title="Xóa bản ghi này"
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

              {/* Media Preview (Photo or Video Clip) */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Photo view */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Ảnh Snapshot Khuôn Mặt
                    </div>
                    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video flex items-center justify-center">
                      <img
                        src={selectedCapture.photoDataUrl}
                        alt="High-res Capture"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <a
                      href={selectedCapture.photoDataUrl}
                      download={`snapshot-${selectedCapture.id}.jpg`}
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline font-mono"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải ảnh gốc về máy
                    </a>
                  </div>

                  {/* Video view (if recorded) */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-pink-400" />
                      Clip Ghi Hình Chuyển Động (3 giây)
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
                          Lượt này chỉ chụp ảnh nhanh, chưa bật ghi video clip.
                        </div>
                      )}
                    </div>
                    {selectedCapture.videoDataUrl && (
                      <a
                        href={selectedCapture.videoDataUrl}
                        download={`video-clip-${selectedCapture.id}.webm`}
                        className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 underline font-mono"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải video clip về máy
                      </a>
                    )}
                  </div>
                </div>

                {/* Visitor & Analysis Information Card */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Thời Gian Quét</span>
                      <span className="font-mono text-zinc-200">{selectedCapture.dateString}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Thiết Bị / Trình Duyệt</span>
                      <span className="font-mono text-zinc-200">{selectedCapture.device || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Mã Hồ Sơ</span>
                      <span className="font-mono text-cyan-400">{selectedCapture.funAnalysis?.matchId}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px] uppercase mb-0.5">Lời Phán Tướng Số:</span>
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
    </div>
  );
};
