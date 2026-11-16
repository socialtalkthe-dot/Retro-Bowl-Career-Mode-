import React, { useEffect, useRef } from 'react';
import { Position, UniformSet } from '../../types/career';
import { drawRetroSprite, useRetroAtlasReady } from '../../engine/retroSprites';

interface PixelJerseyPreviewProps {
  uniform: UniformSet;
  jerseyNumber?: number;
  skinTone?: string;
  position?: Position;
  size?: number;
  animate?: boolean;
}

export const PixelJerseyPreview: React.FC<PixelJerseyPreviewProps> = ({
  uniform,
  jerseyNumber,
  skinTone = '#d49a6a',
  position = 'QB',
  size = 76,
  animate = false,
}) => {
  const ready = useRetroAtlasReady();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const bodySuffix =
    position === 'OL' || position === 'DL' || position === 'TE'
      ? '_bulky'
      : position === 'WR' || position === 'CB' || position === 'S' || position === 'K'
        ? '_thin'
        : '';

  const spriteName = animate ? `spr_run_ball${bodySuffix}` : `spr_stand_ball${bodySuffix}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ready || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let frame = 0;
    let lastTick = performance.now();

    const draw = (now: number) => {
      if (animate && now - lastTick > 115) {
        frame = (frame + 1) % 6;
        lastTick = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      // Retro Bowl turf patch backdrop
      ctx.fillStyle = '#1d6938';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#247c42';
      ctx.fillRect(0, 0, canvas.width / 2, canvas.height);
      // Yard stripe
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(canvas.width / 2 - 1, 0, 2, canvas.height);

      // Shadow under cleats
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(canvas.width / 2 - 14, canvas.height - 14, 28, 6);

      drawRetroSprite(
        ctx,
        spriteName,
        animate ? frame : 0,
        canvas.width / 2,
        canvas.height - 12,
        3,
        3,
        {
          fieldPalette: {
            uniform,
            skin: skinTone,
            cleats: '#18181b',
          },
        }
      );

      if (animate) {
        rafId = requestAnimationFrame(draw);
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [ready, uniform, skinTone, spriteName, animate]);

  return (
    <div
      style={{ width: size, height: size }}
      className="relative shrink-0 border-2 border-[#364b6e] shadow-[0_2px_0_#070b12] overflow-hidden bg-[#1d6938]"
      aria-label="Retro Bowl player uniform preview"
    >
      <canvas ref={canvasRef} width={76} height={76} className="w-full h-full pixelated block" />
      {jerseyNumber !== undefined && (
        <span className="absolute top-1 left-1 font-pixel text-[8px] leading-none text-white drop-shadow-[1px_1px_0_#000]">
          #{jerseyNumber}
        </span>
      )}
    </div>
  );
};
