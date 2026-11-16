import React, { useEffect, useRef } from 'react';
import { CareerEra, LeagueTeam, UniformSet, WeatherType } from '../../types/career';
import {
  drawRetroSprite,
  drawRetroSpriteFast,
  useRetroAtlasReady,
} from '../../engine/retroSprites';
import { getWeatherMeta } from '../../engine/weatherEngine';

interface RetroDriveOverlayProps {
  myTeam: LeagueTeam;
  oppTeam: LeagueTeam;
  myUniform: UniformSet;
  oppUniform: UniformSet;
  era: CareerEra;
  weather: WeatherType;
  possession: 'MY' | 'OPP';
  ballYard: number; // 1..99 relative to possessing team's own goal line
  yardsToGo: number;
  down: number;
  quarter?: number;
  clockSec?: number;
  myTimeouts?: number;
  oppTimeouts?: number;
  clockFrozen?: boolean;
  onCallTimeout?: () => void;
  simTicker: string;
  simHistory: string[];
  simSpeed: 1 | 2;
  simPaused: boolean;
  onToggleSpeed: () => void;
  onTogglePaused: () => void;
  onStepPlay: () => void;
  onSkipToMyUnit: () => void;
}

const OVW_W = 1040;
const OVW_H = 190;

export const RetroDriveOverlay: React.FC<RetroDriveOverlayProps> = ({
  myTeam,
  oppTeam,
  era,
  weather,
  possession,
  ballYard,
  yardsToGo,
  down,
  quarter = 1,
  clockSec = 150,
  myTimeouts = 3,
  oppTimeouts = 3,
  clockFrozen = false,
  onCallTimeout,
  simTicker,
  simHistory,
  simSpeed,
  simPaused,
  onToggleSpeed,
  onTogglePaused,
  onStepPlay,
  onSkipToMyUnit,
}) => {
  const atlasReady = useRetroAtlasReady();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Convert team-relative ballYard (0..100) into field X (MY owns left 0..100, OPP drives right-to-left)
  const fieldBallYard = possession === 'MY' ? ballYard : 100 - ballYard;
  const fieldFirstDownYard =
    possession === 'MY'
      ? Math.min(100, ballYard + yardsToGo)
      : Math.max(0, 100 - (ballYard + yardsToGo));

  useEffect(() => {
    let raf = 0;
    const render = (now: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = '#1d4972';
          ctx.fillRect(0, 0, OVW_W, OVW_H);

          const isCollege = era === 'COLLEGE';
          const fieldSpr = isCollege ? 'spr_field_co' : 'spr_field';
          const weatherMeta = getWeatherMeta(weather);
          const frame = weatherMeta.sprFieldFrame;

          // spr_field is 1300x237 -> scale by 0.8 gives 1040x189.6 cleanly showing full 100 yards + both endzones!
          const sx = 0.8;
          const sy = 0.8;
          const turfTop = 0;

          if (!drawRetroSpriteFast(ctx, fieldSpr, frame, 0, turfTop, sx, sy)) {
            ctx.fillStyle = '#247c42';
            ctx.fillRect(0, 0, OVW_W, OVW_H);
          }
          if (weather === 'STORM') {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
            ctx.fillRect(0, 0, OVW_W, OVW_H);
          } else if (weather === 'FOG') {
            ctx.fillStyle = 'rgba(226, 232, 240, 0.22)';
            ctx.fillRect(0, 0, OVW_W, OVW_H);
          } else if (weather === 'BLIZZARD') {
            ctx.fillStyle = 'rgba(241, 245, 249, 0.2)';
            ctx.fillRect(0, 0, OVW_W, OVW_H);
          }

          // Endzones (spr_endzone sits at x=100*0.8=40..120 on left, x=920..1000 on right)
          drawRetroSprite(ctx, 'spr_endzone', 0, 40, 26, sx, sy, {
            tint: myTeam.uniforms.endzone,
            ignoreOrigin: true,
          });
          drawRetroSprite(ctx, 'spr_endzone', 0, 920.8, 26, sx, sy, {
            tint: oppTeam.uniforms.endzone,
            ignoreOrigin: true,
          });

          // Endzone labels
          ctx.save();
          ctx.font = 'bold 13px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255,255,255,0.88)';
          ctx.translate(80, 95);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(myTeam.shortName.toUpperCase(), 0, 0);
          ctx.restore();

          ctx.save();
          ctx.font = 'bold 13px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255,255,255,0.88)';
          ctx.translate(960, 95);
          ctx.rotate(Math.PI / 2);
          ctx.fillText(oppTeam.shortName.toUpperCase(), 0, 0);
          ctx.restore();

          // 0-100 Yard coordinates across playable field (x = 120 .. 920 -> 8px per yard)
          const yardPx = (yd: number) => 120 + yd * 8;
          const losX = yardPx(fieldBallYard);
          const fdX = yardPx(fieldFirstDownYard);

          // First Down Line (Yellow)
          if (fieldFirstDownYard > 0 && fieldFirstDownYard < 100) {
            ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
            ctx.fillRect(fdX - 1.5, 26, 3, 138);
          }

          // Line of Scrimmage (Team Color / Blue)
          ctx.fillStyle = possession === 'MY' ? '#38bdf8' : '#ef4444';
          ctx.fillRect(losX - 2, 26, 4, 138);

          // Pulsing Retro Bowl Football + Drive Direction Arrow at LOS
          const bob = Math.sin(now / 150) * 2.5;
          const dir = possession === 'MY' ? 1 : -1;
          ctx.save();
          ctx.fillStyle = '#0e253b';
          ctx.fillRect(losX - 16, 82 + bob, 32, 26);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.strokeRect(losX - 16, 82 + bob, 32, 26);

          if (!drawRetroSprite(ctx, 'spr_ball1', 0, losX, 95 + bob, 2.2, 2.2)) {
            ctx.fillStyle = '#92400e';
            ctx.fillRect(losX - 6, 91 + bob, 12, 8);
          }

          // Drive direction chevron
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.moveTo(losX + dir * 24, 95 + bob);
          ctx.lineTo(losX + dir * 16, 87 + bob);
          ctx.lineTo(losX + dir * 16, 103 + bob);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [atlasReady, era, weather, myTeam, oppTeam, possession, fieldBallYard, fieldFirstDownYard]);

  const spotText =
    ballYard === 50
      ? 'MIDFIELD'
      : ballYard < 50
        ? `OWN ${ballYard}`
        : `OPP ${100 - ballYard}`;
  const downLabel = down === 1 ? '1ST' : down === 2 ? '2ND' : down === 3 ? '3RD' : '4TH';
  const clockMins = Math.floor(clockSec / 60);
  const clockRem = (clockSec % 60).toString().padStart(2, '0');
  const qtrLabel = quarter <= 4 ? `Q${quarter}` : 'OT';

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-y-auto">
      <div className="rb-panel p-5 flex flex-col gap-4 max-w-4xl w-full">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 inline-block border border-white/60"
                style={{
                  backgroundColor:
                    possession === 'MY' ? myTeam.uniforms.home.shirt : oppTeam.uniforms.home.shirt,
                }}
              />
              <span className="font-pixel text-[10px] text-[#fde047]">
                {possession === 'MY'
                  ? `${myTeam.shortName} OFFENSE DRIVING`
                  : `${oppTeam.shortName} OFFENSE DRIVING`}
              </span>
              <span className="font-pixel text-[9px] text-[#4ade80] bg-[#0e253b] border border-[#2b547c] px-2 py-0.5 tabular-nums">
                {qtrLabel} · {clockMins}:{clockRem}
              </span>
              <span className="font-pixel text-[8px] text-slate-200 bg-[#0e253b] border border-[#2b547c] px-2 py-0.5 tabular-nums">
                TO: {myTeam.shortName} {myTimeouts} | {oppTeam.shortName} {oppTimeouts}
              </span>
              {clockFrozen && (
                <span className="font-pixel text-[8px] text-[#fde047] bg-[#3b2f06] border border-[#facc15] px-2 py-0.5">
                  CLOCK STOPPED
                </span>
              )}
            </div>
            <div className="font-pixel text-xs text-white mt-1.5 tabular-nums">
              {downLabel} &amp; {ballYard + yardsToGo >= 100 ? 'GOAL' : yardsToGo} · BALL AT {spotText}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onCallTimeout && (
              <button
                type="button"
                onClick={onCallTimeout}
                disabled={myTimeouts <= 0 || clockFrozen}
                className={`px-3 py-2 font-pixel text-[9px] border-2 ${
                  myTimeouts > 0 && !clockFrozen
                    ? 'bg-[#0e253b] border-[#facc15] text-[#fde047] hover:bg-[#173959]'
                    : 'bg-[#0e253b] border-[#2b547c] text-slate-500 cursor-not-allowed'
                }`}
              >
                TIMEOUT ({myTimeouts}) [T]
              </button>
            )}
            <button
              type="button"
              onClick={onTogglePaused}
              className="rb-btn-slate px-3 py-2 font-pixel text-[9px]"
            >
              {simPaused ? 'RESUME' : 'PAUSE'}
            </button>
            <button
              type="button"
              onClick={onToggleSpeed}
              className={`px-3 py-2 font-pixel text-[9px] border-2 ${
                simSpeed === 2
                  ? 'bg-[#eab308] border-[#fef08a] text-slate-950'
                  : 'rb-btn-slate'
              }`}
            >
              {simSpeed === 2 ? '2X SPEED' : '1X SPEED'}
            </button>
            <button
              type="button"
              onClick={onStepPlay}
              className="rb-btn-slate px-3 py-2 font-pixel text-[9px]"
            >
              NEXT PLAY
            </button>
            <button
              type="button"
              onClick={onSkipToMyUnit}
              className="rb-btn-gold px-4 py-2 font-pixel text-[9px]"
            >
              SIM TO MY SNAP &gt;&gt;
            </button>
          </div>
        </div>

        {/* Retro Bowl Field Overview Canvas */}
        <div className="relative border-2 border-[#3c6fa1] bg-[#1d4972] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={OVW_W}
            height={OVW_H}
            className="w-full h-auto block pixelated"
          />
          {/* Retro Bowl Callout Overlay Banner */}
          <div className="bg-[#0e253b]/95 border-t-2 border-[#3c6fa1] px-4 py-3 flex items-center justify-between gap-4">
            <div className="font-pixel text-[10px] sm:text-xs text-[#fde047] leading-relaxed">
              {simTicker}
            </div>
            <div className="font-pixel text-[8px] text-slate-300 shrink-0">
              {simPaused ? 'PAUSED' : 'LIVE SIM'}
            </div>
          </div>
        </div>

        {/* Recent Drive Play Feed */}
        <div className="rb-panel-inset p-3 flex flex-col gap-1.5 max-h-32 overflow-y-auto">
          <div className="font-pixel text-[8px] text-slate-300">DRIVE PLAY-BY-PLAY</div>
          {simHistory.length === 0 ? (
            <div className="text-xs text-slate-300">Huddle breaking at the line of scrimmage...</div>
          ) : (
            simHistory.slice(0, 5).map((line, i) => (
              <div
                key={i}
                className={`text-xs ${i === 0 ? 'text-white font-semibold' : 'text-slate-300'}`}
              >
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
