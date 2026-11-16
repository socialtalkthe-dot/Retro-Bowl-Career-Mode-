import React, { useEffect, useRef } from 'react';
import {
  drawRetroSprite,
  getRetroPortraitSprite,
  PortraitColors,
  useRetroAtlasReady,
} from '../../engine/retroSprites';

interface PixelPortraitProps {
  skinTone: string;
  hairColor: string;
  faceStyle: number;
  jerseyColor: string;
  sleeveColor?: string;
  helmetColor?: string;
  jerseyNumber?: number;
  size?: number;
  isCoach?: boolean;
  coachIndex?: number;
}

export const PixelPortrait: React.FC<PixelPortraitProps> = ({
  skinTone,
  hairColor,
  faceStyle,
  jerseyColor,
  sleeveColor = '#ffffff',
  helmetColor,
  jerseyNumber,
  size = 64,
  isCoach = false,
  coachIndex = 0,
}) => {
  const ready = useRetroAtlasReady();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const portraitChoice = isCoach
    ? {
        spriteName: `spr_coaches_0${(Math.abs(coachIndex) % 4) + 1}`,
        frame: Math.abs(faceStyle) % 8,
      }
    : getRetroPortraitSprite(skinTone, faceStyle);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ready || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const palette: PortraitColors = {
      helmet: helmetColor ?? hairColor,
      shirt: jerseyColor,
      pants: sleeveColor,
    };

    // Draw authentic 32x36 Retro Bowl portrait scaled cleanly into 64x72 canvas
    drawRetroSprite(ctx, portraitChoice.spriteName, portraitChoice.frame, 0, 0, 2, 2, {
      portraitColors: palette,
      ignoreOrigin: true,
    });
  }, [ready, portraitChoice.spriteName, portraitChoice.frame, helmetColor, hairColor, jerseyColor, sleeveColor]);

  return (
    <div
      style={{ width: size, height: Math.round(size * 1.1) }}
      className="relative shrink-0 bg-[#1a273d] border-2 border-[#364b6e] shadow-[0_2px_0_#070b12] overflow-hidden flex items-end justify-center"
      aria-label="Retro Bowl pixel portrait"
    >
      <canvas
        ref={canvasRef}
        width={64}
        height={72}
        className="w-full h-full pixelated block"
      />
      {jerseyNumber !== undefined && (
        <span className="absolute bottom-0.5 right-1 font-pixel text-[8px] leading-none text-white drop-shadow-[1px_1px_0_#000]">
          {jerseyNumber}
        </span>
      )}
    </div>
  );
};
