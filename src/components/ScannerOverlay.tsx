import React, { useEffect, useRef } from 'react';
import { DetectionResult } from '../utils/faceDetector';

interface ScannerOverlayProps {
  detection: DetectionResult;
  isFlashing: boolean;
  videoWidth: number;
  videoHeight: number;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  detection,
  isFlashing,
  videoWidth,
  videoHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLinePosRef = useRef<number>(0);
  const scanDirectionRef = useRef<number>(1);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      scanLinePosRef.current += scanDirectionRef.current * 0.005;
      if (scanLinePosRef.current > 1) {
        scanLinePosRef.current = 1;
        scanDirectionRef.current = -1;
      } else if (scanLinePosRef.current < 0) {
        scanLinePosRef.current = 0;
        scanDirectionRef.current = 1;
      }

      const { box, hasFace } = detection;
      const bx = box.x * w;
      const by = box.y * h;
      const bw = box.width * w;
      const bh = box.height * h;

      ctx.save();

      // Clean normal face scanning box (no weird game scores, just clean modern blue/white scanner frame)
      if (hasFace) {
        const primaryColor = '#3b82f6'; // Clean blue
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;

        const bracketLen = Math.min(bw, bh) * 0.2;

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(bx, by + bracketLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + bracketLen, by);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(bx + bw - bracketLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + bracketLen);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - bracketLen);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + bracketLen, by + bh);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(bx + bw - bracketLen, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - bracketLen);
        ctx.stroke();

        // Subtle moving scanning line
        const scanY = by + scanLinePosRef.current * bh;
        const grad = ctx.createLinearGradient(bx, scanY, bx + bw, scanY);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0)');
        grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.8)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, scanY);
        ctx.lineTo(bx + bw, scanY);
        ctx.stroke();

        // Minimal text
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#93c5fd';
        ctx.fillText('Scanning...', bx, by - 8);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [detection]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        width={videoWidth || 640}
        height={videoHeight || 480}
        className="w-full h-full object-cover"
      />

      {isFlashing && (
        <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />
      )}
    </div>
  );
};
