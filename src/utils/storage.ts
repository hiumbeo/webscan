// Persistent Storage Manager with IndexedDB and Server Dual-Sync

export interface FunAnalysis {
  title: string;
  beautyScore: number;
  richScore: number;
  mood: string;
  fortuneQuote: string;
  tag: string;
  matchId: string;
}

export interface CaptureRecord {
  id: string;
  timestamp: number;
  dateString: string;
  photoDataUrl: string;
  faceCropDataUrl?: string;
  videoDataUrl?: string;
  hasVideo?: boolean;
  funAnalysis: FunAnalysis;
  device: string;
  isFavorite?: boolean;
}

const DB_NAME = 'FaceScannerVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'captures';

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generate quirky, hilarious Vietnamese AI face analysis results
export function generateFunAnalysis(): FunAnalysis {
  const titles = [
    'Đại Gia Ngầm 2026',
    'Siêu Mẫu Vũ Trụ Thế Hệ Mới',
    'Thần Đồng Trí Tuệ Nhân Tạo',
    'Bậc Thầy Ngoại Giao & Thao Túng Tâm Lý',
    'Chủ Tịch Giả Danh Khám Phá',
    'Trùm Buôn Meme Đẳng Cấp Quốc Tế',
    'Thánh Ăn Vặt Không Bao Giờ Mập',
    'Tỷ Phú Tương Lai Sở Hữu 10 Căn Biệt Thự',
    'Nghệ Sĩ Ẩn Dật Đầy Thu Hút',
    'Kỳ Tài Công Nghệ Lập Dị',
  ];

  const moods = [
    'Tươi tắn, thần thái ngút ngàn',
    'Tập trung cao độ, mắt sáng long lanh',
    'Bí ẩn, ánh mắt sát gái / sát trai số 1',
    'Đang bất ngờ vì máy quét xịn quá',
    'Hào hứng chờ xem kết quả',
    'Phong thái tự tin, sang chảnh',
  ];

  const fortuneQuotes = [
    'Nhân trung sâu, gò má đầy: Năm nay tiền vô như nước sông Đà, tiền ra nhỏ giọt như cà phê phin!',
    'Vầng trán cao thông minh, quý nhân sắp ghé thăm và tặng một cơ hội làm giàu cực lớn.',
    'Nụ cười tỏa nắng thu hút vạn người mê, đào hoa nở rộ suốt 365 ngày tới.',
    'Tướng mạo phi phàm, đi đâu cũng được mời ăn, quý nhân phù trợ tứ phương.',
    'Tâm hồn tự do, năng lượng tích cực tỏa ra xung quanh làm ai nhìn cũng quý mến!',
    'Độ uy tín 100%, đường công danh sự nghiệp đang mở toang, thăng quan tiến chức vù vù.',
  ];

  const tags = ['VIP ⭐', 'CỰC PHẨM 🔥', 'TRIỆU VIEW 🚀', 'ĐẠI PHÁT 💰', 'HỆ ĐẸP TRAI 😎', 'NÀNG THƠ ✨'];

  const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const beautyScore = Math.floor(88 + Math.random() * 12); // 88 - 99%
  const richScore = Math.floor(85 + Math.random() * 15); // 85 - 100%

  return {
    title: randomItem(titles),
    beautyScore,
    richScore,
    mood: randomItem(moods),
    fortuneQuote: randomItem(fortuneQuotes),
    tag: randomItem(tags),
    matchId: 'ID-' + Math.floor(100000 + Math.random() * 900000),
  };
}

// Get device information
export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('iPhone')) os = 'iPhone / iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = 'Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  const screenInfo = `${window.screen.width}x${window.screen.height}`;
  return `${os} • ${browser} (${screenInfo})`;
}

// Storage Operations
export async function getAllCaptures(): Promise<CaptureRecord[]> {
  try {
    // Try to fetch from server first
    const res = await fetch('/api/captures');
    if (res.ok) {
      const data = await res.json();
      if (data.captures && data.captures.length > 0) {
        // Also sync into IndexedDB for offline resilience
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        data.captures.forEach((item: CaptureRecord) => store.put(item));
        return data.captures;
      }
    }
  } catch (err) {
    // fallback to IndexedDB
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const records = (request.result || []) as CaptureRecord[];
        records.sort((a, b) => b.timestamp - a.timestamp);
        resolve(records);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveCapture(capture: CaptureRecord): Promise<void> {
  // 1. Save to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(capture);
  } catch (e) {
    console.error('IndexedDB save failed:', e);
  }

  // 2. Sync to Server
  try {
    await fetch('/api/captures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(capture),
    });
  } catch (e) {
    console.warn('Server sync failed:', e);
  }
}

export async function deleteCapture(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch (e) {}

  try {
    await fetch(`/api/captures/${id}`, { method: 'DELETE' });
  } catch (e) {}
}

export async function clearAllCaptures(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (e) {}

  try {
    await fetch('/api/captures', { method: 'DELETE' });
  } catch (e) {}
}

export async function toggleFavorite(id: string): Promise<boolean> {
  let newState = false;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = { ...getReq.result, isFavorite: !getReq.result.isFavorite };
        newState = updated.isFavorite;
        store.put(updated);
      }
    };
  } catch (e) {}

  try {
    fetch(`/api/captures/${id}/favorite`, { method: 'PATCH' }).catch(() => {});
  } catch (e) {}

  return newState;
}
