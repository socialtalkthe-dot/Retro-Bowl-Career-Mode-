import React, { useEffect, useRef } from 'react';
import {
  drawRetroSprite,
  FieldColorPalette,
  getAtlasSprite,
  PortraitColors,
  useRetroAtlasReady,
} from '../../engine/retroSprites';

interface RetroSpriteProps {
  name: string;
  frame?: number;
  scale?: number;
  fieldPalette?: FieldColorPalette;
  portraitColors?: PortraitColors;
  tint?: string;
  className?: string;
  alt?: string;
}

export const RetroSprite: React.FC<RetroSpriteProps> = ({
  name,
  frame = 0,
  scale = 2,
  fieldPalette,
  portraitColors,
  tint,
  className = '',
  alt,
}) => {
  const ready = useRetroAtlasReady();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sprite = ready ? getAtlasSprite(name) : null;
  const width = sprite ? (sprite.w || sprite.frames[0]?.ow || 16) * scale : 16 * scale;
  const height = sprite ? (sprite.h || sprite.frames[0]?.oh || 16) * scale : 16 * scale;

  useEffect(() => {
    if (!ready || !canvasRef.current || !sprite) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    drawRetroSprite(ctx, name, frame, 0, 0, scale, scale, {
      fieldPalette,
      portraitColors,
      tint,
      ignoreOrigin: true,
    });
  }, [ready, name, frame, scale, width, height, fieldPalette, portraitColors, tint, sprite]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`pixelated shrink-0 ${className}`}
      aria-label={alt ?? name}
    />
  );
};
