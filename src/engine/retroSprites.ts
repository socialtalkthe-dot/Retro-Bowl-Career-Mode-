import { useEffect, useState } from 'react';
import { UniformSet } from '../types/career';

export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  xo: number;
  yo: number;
  cw: number;
  ch: number;
  ow: number;
  oh: number;
  tp: number;
}

export interface AtlasSprite {
  w: number;
  h: number;
  xOrigin: number;
  yOrigin: number;
  speed: number;
  frames: AtlasFrame[];
}

interface AtlasData {
  sprites: Record<string, AtlasSprite>;
}

export interface PortraitColors {
  helmet: string; // Hair / Helmet / Primary accent (key: 255, 0, 0)
  shirt: string;  // Jersey color (key: 0, 255, 0)
  pants: string;  // Collar / Trim / Pants (key: 255, 0, 255)
  pantsB?: string; // Secondary shade (key: 0, 255, 255)
  cleats?: string; // Dark accent / cleats (key: 255, 255, 0)
}

export interface FieldColorPalette {
  uniform: UniformSet;
  skin: string;
  cleats?: string;
}

let atlasCache: AtlasData | null = null;
const texturePages: (HTMLImageElement | null)[] = [null, null, null, null];
let loadPromise: Promise<boolean> | null = null;
let loadedReady = false;
const listeners = new Set<() => void>();

// Cache offscreen color-replaced or tinted canvases
const spriteCanvasCache = new Map<string, HTMLCanvasElement>();

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0');
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function darkenRgb(rgb: [number, number, number], factor = 0.72): [number, number, number] {
  return [
    Math.round(rgb[0] * factor),
    Math.round(rgb[1] * factor),
    Math.round(rgb[2] * factor),
  ];
}

function matchColor(
  r: number,
  g: number,
  b: number,
  kr: number,
  kg: number,
  kb: number,
  eps = 6
): boolean {
  return Math.abs(r - kr) <= eps && Math.abs(g - kg) <= eps && Math.abs(b - kb) <= eps;
}

export function loadRetroAtlas(): Promise<boolean> {
  if (loadedReady && atlasCache) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch('/retrobowl/atlas.json');
      atlasCache = (await res.json()) as AtlasData;

      await Promise.all(
        [0, 1, 2, 3].map(
          (tpIdx) =>
            new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                texturePages[tpIdx] = img;
                resolve();
              };
              img.onerror = () => reject(new Error(`Failed loading texture page ${tpIdx}`));
              img.src = `/retrobowl/RetroBowl_texture_${tpIdx}.png`;
            })
        )
      );

      loadedReady = true;
      listeners.forEach((cb) => cb());
      return true;
    } catch {
      return false;
    }
  })();

  return loadPromise;
}

export function useRetroAtlasReady(): boolean {
  const [ready, setReady] = useState(loadedReady);
  useEffect(() => {
    if (loadedReady) {
      setReady(true);
      return;
    }
    const cb = () => setReady(true);
    listeners.add(cb);
    loadRetroAtlas();
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return ready;
}

export function getAtlasSprite(name: string): AtlasSprite | null {
  return atlasCache?.sprites[name] ?? null;
}

/**
 * Extracts a frame into an offscreen full-size (ow x oh) canvas,
 * optionally applying Retro Bowl's exact sh_ColorReplaceBlend shader or solid color tint.
 */
export function getProcessedFrameCanvas(
  spriteName: string,
  frameIdx: number,
  opts?: {
    fieldPalette?: FieldColorPalette;
    portraitColors?: PortraitColors;
    tint?: string;
  }
): { canvas: HTMLCanvasElement; sprite: AtlasSprite } | null {
  const sprite = atlasCache?.sprites[spriteName];
  if (!sprite || sprite.frames.length === 0) return null;

  const safeIdx = ((frameIdx % sprite.frames.length) + sprite.frames.length) % sprite.frames.length;
  const f = sprite.frames[safeIdx];
  const page = texturePages[f.tp];
  if (!page) return null;

  const keyParts = [spriteName, safeIdx];
  if (opts?.fieldPalette) {
    const u = opts.fieldPalette.uniform;
    keyParts.push(
      'F',
      u.helmet,
      u.logo,
      u.shirt,
      u.sleeve,
      u.pants,
      u.stripe,
      u.socks1,
      u.socks2,
      opts.fieldPalette.skin,
      opts.fieldPalette.cleats ?? '#18181b'
    );
  } else if (opts?.portraitColors) {
    const p = opts.portraitColors;
    keyParts.push('P', p.helmet, p.shirt, p.pants, p.pantsB ?? '', p.cleats ?? '');
  } else if (opts?.tint) {
    keyParts.push('T', opts.tint);
  }
  const cacheKey = keyParts.join('|');

  const cached = spriteCanvasCache.get(cacheKey);
  if (cached) return { canvas: cached, sprite };

  const outW = Math.max(1, f.ow || sprite.w || f.w);
  const outH = Math.max(1, f.oh || sprite.h || f.h);
  const off = document.createElement('canvas');
  off.width = outW;
  off.height = outH;
  const ctx = off.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(page, f.x, f.y, f.w, f.h, f.xo, f.yo, f.cw || f.w, f.ch || f.h);

  // Apply Retro Bowl sh_ColorReplaceBlend if fieldPalette or portraitColors provided
  if (opts?.fieldPalette) {
    const u = opts.fieldPalette.uniform;
    const repHelmet = hexToRgb(u.helmet);
    const repLogo = hexToRgb(u.logo);
    const repShirt = hexToRgb(u.shirt);
    const repSleeve = hexToRgb(u.sleeve);
    const repPants = hexToRgb(u.pants);
    const repPantsB = darkenRgb(repPants, 0.78);
    const repStripe = hexToRgb(u.stripe);
    const repSocks = hexToRgb(u.socks1);
    const repSocksB = hexToRgb(u.socks2);
    const repSkin = hexToRgb(opts.fieldPalette.skin);
    const repCleats = hexToRgb(opts.fieldPalette.cleats ?? '#18181b');

    const imgData = ctx.getImageData(0, 0, outW, outH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 245) continue;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      let rep: [number, number, number] | null = null;
      if (matchColor(r, g, b, 128, 128, 255)) rep = repShirt;
      else if (matchColor(r, g, b, 0, 0, 255)) rep = repSkin;
      else if (matchColor(r, g, b, 255, 0, 0)) rep = repHelmet;
      else if (matchColor(r, g, b, 255, 0, 255)) rep = repPants;
      else if (matchColor(r, g, b, 128, 0, 128)) rep = repPantsB;
      else if (matchColor(r, g, b, 0, 0, 128)) rep = repStripe;
      else if (matchColor(r, g, b, 0, 255, 0)) rep = repSocks;
      else if (matchColor(r, g, b, 0, 128, 0)) rep = repSocksB;
      else if (matchColor(r, g, b, 255, 255, 0)) rep = repCleats;
      else if (matchColor(r, g, b, 128, 128, 128)) rep = repSleeve;
      else if (matchColor(r, g, b, 128, 0, 0)) rep = repLogo;
      if (rep) {
        d[i] = rep[0];
        d[i + 1] = rep[1];
        d[i + 2] = rep[2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (opts?.portraitColors) {
    const repHelmet = hexToRgb(opts.portraitColors.helmet);
    const repShirt = hexToRgb(opts.portraitColors.shirt);
    const repPants = hexToRgb(opts.portraitColors.pants);
    const repPantsB = opts.portraitColors.pantsB ? hexToRgb(opts.portraitColors.pantsB) : null;
    const repCleats = opts.portraitColors.cleats ? hexToRgb(opts.portraitColors.cleats) : null;

    const imgData = ctx.getImageData(0, 0, outW, outH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 245) continue;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      let rep: [number, number, number] | null = null;
      if (matchColor(r, g, b, 255, 0, 0)) rep = repHelmet;
      else if (matchColor(r, g, b, 0, 255, 0)) rep = repShirt;
      else if (matchColor(r, g, b, 255, 0, 255)) rep = repPants;
      else if (repPantsB && matchColor(r, g, b, 0, 255, 255)) rep = repPantsB;
      else if (repCleats && matchColor(r, g, b, 255, 255, 0)) rep = repCleats;
      if (rep) {
        d[i] = rep[0];
        d[i + 1] = rep[1];
        d[i + 2] = rep[2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (opts?.tint) {
    const [tr, tg, tb] = hexToRgb(opts.tint);
    const imgData = ctx.getImageData(0, 0, outW, outH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      d[i] = Math.round((d[i] * tr) / 255);
      d[i + 1] = Math.round((d[i + 1] * tg) / 255);
      d[i + 2] = Math.round((d[i + 2] * tb) / 255);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  spriteCanvasCache.set(cacheKey, off);
  return { canvas: off, sprite };
}

/**
 * Draws a Retro Bowl sprite onto a target 2D Canvas respecting xOrigin/yOrigin,
 * scale, horizontal flip, rotation, and alpha.
 */
export function drawRetroSprite(
  ctx: CanvasRenderingContext2D,
  spriteName: string,
  frameIdx: number,
  x: number,
  y: number,
  scaleX = 2,
  scaleY = 2,
  opts?: {
    fieldPalette?: FieldColorPalette;
    portraitColors?: PortraitColors;
    tint?: string;
    alpha?: number;
    rotationRad?: number;
    ignoreOrigin?: boolean;
  }
): boolean {
  const res = getProcessedFrameCanvas(spriteName, frameIdx, opts);
  if (!res) return false;
  const { canvas, sprite } = res;
  const ox = opts?.ignoreOrigin ? 0 : sprite.xOrigin;
  const oy = opts?.ignoreOrigin ? 0 : sprite.yOrigin;

  ctx.save();
  if (opts?.alpha !== undefined && opts.alpha < 1) {
    ctx.globalAlpha = opts.alpha;
  }
  ctx.translate(Math.round(x), Math.round(y));
  if (opts?.rotationRad) {
    ctx.rotate(opts.rotationRad);
  }
  ctx.scale(scaleX, scaleY);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, -ox, -oy);
  ctx.restore();
  return true;
}

/**
 * Draws a raw un-transformed texture entry directly (fast path for 1300x237 spr_field / spr_fieldfans).
 */
export function drawRetroSpriteFast(
  ctx: CanvasRenderingContext2D,
  spriteName: string,
  frameIdx: number,
  x: number,
  y: number,
  scaleX = 2,
  scaleY = 2
): boolean {
  const sprite = atlasCache?.sprites[spriteName];
  if (!sprite || sprite.frames.length === 0) return false;
  const safeIdx = ((frameIdx % sprite.frames.length) + sprite.frames.length) % sprite.frames.length;
  const f = sprite.frames[safeIdx];
  const page = texturePages[f.tp];
  if (!page) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    page,
    f.x,
    f.y,
    f.w,
    f.h,
    Math.round(x + f.xo * scaleX),
    Math.round(y + f.yo * scaleY),
    Math.round((f.cw || f.w) * scaleX),
    Math.round((f.ch || f.h) * scaleY)
  );
  return true;
}

/**
 * Maps a player's skinTone + faceStyle onto one of the 12 authentic Retro Bowl portrait sheets
 * (spr_light_001..003, spr_mix_001, spr_dark_001..008) and frame 0..7.
 */
export function getRetroPortraitSprite(skinTone: string, faceStyle: number): {
  spriteName: string;
  frame: number;
} {
  const hex = skinTone.toLowerCase();
  let pool: string[];
  // Light vs Mix vs Dark skin tone mapping matching careerEngine SKIN_TONES
  if (hex.includes('f1c2') || hex.includes('ffdb') || hex.includes('fde0') || hex.includes('e0ac')) {
    pool = ['spr_light_001', 'spr_light_002', 'spr_light_003'];
  } else if (hex.includes('c686') || hex.includes('d49a')) {
    pool = ['spr_mix_001', 'spr_light_002', 'spr_dark_001', 'spr_dark_002'];
  } else {
    pool = [
      'spr_dark_001',
      'spr_dark_002',
      'spr_dark_003',
      'spr_dark_004',
      'spr_dark_005',
      'spr_dark_006',
      'spr_dark_007',
      'spr_dark_008',
    ];
  }
  const spriteName = pool[Math.abs(faceStyle) % pool.length];
  const frame = Math.abs(Math.floor(faceStyle / pool.length) + faceStyle * 3) % 8;
  return { spriteName, frame };
}
