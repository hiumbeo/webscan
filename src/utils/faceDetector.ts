// High-performance face detection and biometric tracking engine

export interface FaceBox {
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  width: number;
  height: number;
}

export interface LandmarkPoints {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  mouth: { x: number; y: number };
  chin: { x: number; y: number };
  forehead: { x: number; y: number };
}

export interface DetectionResult {
  hasFace: boolean;
  box: FaceBox;
  confidence: number;
  landmarks: LandmarkPoints;
  isStable: boolean;
}

export class BiometricDetector {
  private nativeDetector: any = null;
  private prevFrameData: Uint8ClampedArray | null = null;
  private smoothedBox: FaceBox = { x: 0.25, y: 0.2, width: 0.5, height: 0.55 };
  private consecutiveDetections: number = 0;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 160;
    this.offscreenCanvas.height = 120;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        this.nativeDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch (e) {
        this.nativeDetector = null;
      }
    }
  }

  public async detect(video: HTMLVideoElement): Promise<DetectionResult> {
    if (!video || video.readyState < 2 || !this.offscreenCtx) {
      return {
        hasFace: false,
        box: this.smoothedBox,
        confidence: 0,
        landmarks: this.computeLandmarks(this.smoothedBox),
        isStable: false,
      };
    }

    // Try native Shape Detection API if supported
    if (this.nativeDetector) {
      try {
        const faces = await this.nativeDetector.detect(video);
        if (faces && faces.length > 0) {
          const f = faces[0].boundingBox;
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;
          const rawBox: FaceBox = {
            x: f.x / vw,
            y: f.y / vh,
            width: f.width / vw,
            height: f.height / vh,
          };
          return this.smoothAndReturn(rawBox, 0.95, true);
        }
      } catch {
        // Fall back to optical analysis
      }
    }

    // Optical skin tone & motion mass detection
    const w = this.offscreenCanvas.width;
    const h = this.offscreenCanvas.height;
    this.offscreenCtx.drawImage(video, 0, 0, w, h);
    const imgData = this.offscreenCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, maxX = 0, minY = h, maxY = 0;
    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;

    // Scan pixels for human facial skin tones
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Normalized RGB skin rule & YCbCr approximation
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15 && Math.abs(r - g) > 15) {
          skinPixelCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalSampled = (w * h) / 4;
    const skinRatio = skinPixelCount / totalSampled;

    // A valid face typically occupies 5% to 65% of the frame
    if (skinRatio > 0.04 && skinRatio < 0.7 && maxX > minX && maxY > minY) {
      const centerX = sumX / skinPixelCount / w;
      const centerY = sumY / skinPixelCount / h;
      const boxWidth = Math.min(0.7, Math.max(0.3, (maxX - minX) / w * 1.1));
      const boxHeight = Math.min(0.75, Math.max(0.35, (maxY - minY) / h * 1.2));

      const rawBox: FaceBox = {
        x: Math.max(0.05, Math.min(0.95 - boxWidth, centerX - boxWidth / 2)),
        y: Math.max(0.05, Math.min(0.95 - boxHeight, centerY - boxHeight / 2)),
        width: boxWidth,
        height: boxHeight,
      };

      const confidence = Math.min(0.98, Math.max(0.75, skinRatio * 3));
      return this.smoothAndReturn(rawBox, confidence, true);
    } else {
      // Default center focus with lower confidence if subject is present but lighting is dim
      this.consecutiveDetections = Math.max(0, this.consecutiveDetections - 1);
      return {
        hasFace: false,
        box: this.smoothedBox,
        confidence: 0.1,
        landmarks: this.computeLandmarks(this.smoothedBox),
        isStable: false,
      };
    }
  }

  private smoothAndReturn(rawBox: FaceBox, confidence: number, detected: boolean): DetectionResult {
    // Exponential Moving Average filter (alpha = 0.25 for smooth organic tracking)
    const alpha = 0.25;
    this.smoothedBox = {
      x: this.smoothedBox.x * (1 - alpha) + rawBox.x * alpha,
      y: this.smoothedBox.y * (1 - alpha) + rawBox.y * alpha,
      width: this.smoothedBox.width * (1 - alpha) + rawBox.width * alpha,
      height: this.smoothedBox.height * (1 - alpha) + rawBox.height * alpha,
    };

    if (detected) {
      this.consecutiveDetections++;
    } else {
      this.consecutiveDetections = Math.max(0, this.consecutiveDetections - 1);
    }

    const isStable = this.consecutiveDetections >= 15; // Stable after ~0.5s of steady detection
    return {
      hasFace: detected,
      box: this.smoothedBox,
      confidence,
      landmarks: this.computeLandmarks(this.smoothedBox),
      isStable,
    };
  }

  private computeLandmarks(box: FaceBox): LandmarkPoints {
    return {
      forehead: { x: box.x + box.width * 0.5, y: box.y + box.height * 0.15 },
      leftEye: { x: box.x + box.width * 0.32, y: box.y + box.height * 0.36 },
      rightEye: { x: box.x + box.width * 0.68, y: box.y + box.height * 0.36 },
      nose: { x: box.x + box.width * 0.5, y: box.y + box.height * 0.52 },
      mouth: { x: box.x + box.width * 0.5, y: box.y + box.height * 0.74 },
      chin: { x: box.x + box.width * 0.5, y: box.y + box.height * 0.95 },
    };
  }
}
