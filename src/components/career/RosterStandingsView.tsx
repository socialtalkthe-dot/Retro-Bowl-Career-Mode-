import React, { useMemo, useState } from 'react';
import { CareerSave, PlayerAttributes, Position, Teammate, UniformSet } from '../../types/career';
import { getTeamById } from '../../data/teams';
import {
  calculateStarRating,
  getMoraleInfo,
  getPlayerRank,
  getSkillLabel,
  getTeamRank,
  POSITION_RATING_CAPS,
  sortStandingsRows,
} from '../../engine/careerEngine';
import { PixelPortrait } from '../shared/PixelPortrait';
import { RetroSprite } from '../shared/RetroSprite';
import { retroAudio } from '../../audio/retroAudio';

interface RosterStandingsViewProps {
  save: CareerSave;
}

function getFallbackAttrs(tm: Teammate): { attrs: PlayerAttributes; max: PlayerAttributes } {
  if (tm.attributes && tm.maxAttributes) {
    return { attrs: tm.attributes, max: tm.maxAttributes };
  }
  const caps = POSITION_RATING_CAPS[tm.position];
  const ratio = Math.max(0.35, Math.min(1, tm.rating / 5));
  const potRatio = Math.max(ratio, Math.min(1, tm.potential / 5));
  return {
    attrs: {
      skill: Math.max(2, Math.round(caps.skill * ratio)),
      speed: Math.max(2, Math.round(caps.speed * ratio)),
      strength: Math.max(2, Math.round(caps.strength * ratio)),
      stamina: Math.max(2, Math.round(caps.stamina * ratio)),
    },
    max: {
      skill: Math.max(3, Math.round(caps.skill * potRatio)),
      speed: Math.max(3, Math.round(caps.speed * potRatio)),
      strength: Math.max(3, Math.round(caps.strength * potRatio)),
      stamina: Math.max(3, Math.round(caps.stamina * potRatio)),
    },
  };
}

export const RosterStandingsView: React.FC<RosterStandingsViewProps> = ({ save }) => {
  const [tab, setTab] = useState<'ROSTER' | 'STANDINGS' | 'SCHEDULE'>('ROSTER');
  const [subFilter, setSubFilter] = useState<'ALL' | 'FBS' | 'FCS'>('ALL');
  const [confFilter, setConfFilter] = useState<string>('ALL');
  const myTeam = getTeamById(save.teamId);
  const activeUni = myTeam.uniforms[save.uniformChoice];
  const myTeamRank = useMemo(() => getTeamRank(save, myTeam.id), [save, myTeam.id]);
  const playerRank = useMemo(() => getPlayerRank(save), [save]);

  const sortedStandings = useMemo(() => {
    const rows = Object.values(save.standings).filter((r) => {
      const t = getTeamById(r.teamId);
      if (save.era === 'COLLEGE' && subFilter !== 'ALL' && (t.subdivision ?? 'FBS') !== subFilter) {
        return false;
      }
      if (confFilter === 'ALL') return true;
      return t.conference === confFilter;
    });
    return sortStandingsRows(rows);
  }, [save.standings, save.era, subFilter, confFilter]);

  const conferences = useMemo(() => {
    const set = new Set<string>();
    Object.keys(save.standings).forEach((id) => {
      const t = getTeamById(id);
      if (save.era === 'COLLEGE' && subFilter !== 'ALL' && (t.subdivision ?? 'FBS') !== subFilter) {
        return;
      }
      set.add(t.conference);
    });
    return ['ALL', ...Array.from(set)];
  }, [save.standings, save.era, subFilter]);

  const userTotalYds =
    save.seasonStats.passYards + save.seasonStats.rushYards + save.seasonStats.recYards;
  const userTotalTDs =
    save.seasonStats.passTD + save.seasonStats.rushTD + save.seasonStats.recTD;

  const userPotential = useMemo(
    () => calculateStarRating(save.player.maxAttributes, save.player.position),
    [save.player.maxAttributes, save.player.position]
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#24344d] pb-4">
        <div>
          <div className="font-pixel text-[10px] text-[#fde047]">
            {myTeamRank.hasGames ? `RANK #${myTeamRank.rank} OF ${myTeamRank.total}` : 'PRESEASON'} · {myTeamRank.wins}-{myTeamRank.losses} · {myTeam.conference}
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white mt-1">
            {myTeam.name} Clubhouse
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0e1624] border-2 border-[#2e405d]">
          {(['ROSTER', 'STANDINGS', 'SCHEDULE'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                retroAudio.play('click');
                setTab(t);
              }}
              className={`px-4 py-1.5 font-pixel text-[9px] transition-colors whitespace-nowrap ${
                tab === t ? 'bg-[#eab308] text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t === 'ROSTER' ? 'ROSTER' : t === 'STANDINGS' ? 'STANDINGS' : 'SCHEDULE'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'ROSTER' && (
        <div className="flex flex-col gap-6">
          {/* Coaching Staff with Classic Retro Bowl Coach Portraits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[save.coaches.hc, save.coaches.of, save.coaches.df].map((c, idx) => (
              <div key={c.role} className="rb-panel p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PixelPortrait
                    skinTone="#d49a6a"
                    hairColor="#475569"
                    faceStyle={c.age + idx}
                    jerseyColor={myTeam.uniforms.home.shirt}
                    sleeveColor={myTeam.uniforms.home.sleeve}
                    helmetColor={myTeam.uniforms.home.helmet}
                    size={50}
                    isCoach
                    coachIndex={idx}
                  />
                  <div className="min-w-0">
                    <div className="font-pixel text-[8px] text-[#fde047]">
                      {c.role === 'HC' ? 'HEAD COACH' : c.role === 'OF' ? 'OFF. COORD' : 'DEF. COORD'}
                    </div>
                    <div className="font-display text-xl font-bold text-white truncate mt-0.5">{c.name}</div>
                    <div className="text-xs text-slate-400">Trait: {c.trait} · Age {c.age}</div>
                  </div>
                </div>
                <div className="shrink-0">
                  <RetroSprite
                    name="spr_star_rating_b"
                    frame={Math.max(1, Math.min(10, Math.round(c.rating * 2)))}
                    scale={1.5}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Retro Bowl-Style Player Cards Grid */}
          <div className="flex items-center justify-between">
            <div className="font-pixel text-[10px] text-[#fde047]">
              ROSTER PLAYER CARDS ({save.roster.length + 1})
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#eab308] inline-block" /> Current
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#38bdf8]/45 inline-block" /> Potential Cap
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Player Card */}
            <RetroPlayerCard
              isUser
              position={save.player.position}
              jersey={save.player.jersey}
              name={`${save.player.firstName} ${save.player.lastName}`}
              subtitle={`${save.player.archetype} · #${playerRank.rank} ${playerRank.label}`}
              age={save.player.age}
              rating={save.player.starRating}
              potential={userPotential}
              attrs={save.player.attributes}
              maxAttrs={save.player.maxAttributes}
              condition={save.player.condition}
              morale={save.player.morale}
              skinTone={save.player.skinTone}
              hairColor={save.player.hairColor}
              faceStyle={save.player.faceStyle}
              uniform={activeUni}
              statsLine={`${userTotalYds} YDS · ${userTotalTDs} TD · ${save.seasonStats.tackles} TCK`}
            />

            {save.roster.map((tm) => {
              const { attrs, max } = getFallbackAttrs(tm);
              const computedRating = tm.attributes ? calculateStarRating(attrs, tm.position) : tm.rating;
              const computedPot = tm.maxAttributes ? calculateStarRating(max, tm.position) : tm.potential;
              return (
                <RetroPlayerCard
                  key={tm.id}
                  position={tm.position}
                  jersey={tm.jersey}
                  name={tm.name}
                  subtitle={tm.age <= 22 ? 'Rising Prospect' : tm.age >= 31 ? 'Veteran' : 'Starter'}
                  age={tm.age}
                  rating={computedRating}
                  potential={computedPot}
                  attrs={attrs}
                  maxAttrs={max}
                  condition={tm.condition}
                  morale={tm.morale}
                  skinTone={tm.skinTone}
                  hairColor={tm.hairColor}
                  faceStyle={tm.faceId}
                  uniform={activeUni}
                  statsLine={`${tm.stats.yards} YDS · ${tm.stats.tds} TD · ${tm.stats.tackles} TCK`}
                />
              );
            })}
          </div>
        </div>
      )}

      {tab === 'STANDINGS' && (
        <div className="flex flex-col gap-4">
          {save.era === 'COLLEGE' && (
            <div className="flex flex-wrap items-center gap-2">
              {(['ALL', 'FBS', 'FCS'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    retroAudio.play('click');
                    setSubFilter(sub);
                    setConfFilter('ALL');
                  }}
                  className={`px-3.5 py-1.5 font-pixel text-[9px] border-2 ${
                    subFilter === sub
                      ? 'bg-[#22c55e] text-slate-950 border-[#86efac]'
                      : 'bg-[#0e1624] text-slate-300 border-[#24344d] hover:border-[#3c5173]'
                  }`}
                >
                  {sub === 'ALL' ? 'ALL NCAA (FBS & FCS)' : sub}
                </button>
              ))}
            </div>
          )}

          {conferences.length > 2 && (
            <div className="flex flex-wrap gap-1.5">
              {conferences.map((cf) => (
                <button
                  key={cf}
                  type="button"
                  onClick={() => {
                    retroAudio.play('click');
                    setConfFilter(cf);
                  }}
                  className={`px-3 py-1.5 font-pixel text-[8px] border-2 ${
                    confFilter === cf
                      ? 'bg-[#eab308] text-slate-950 border-[#fde047]'
                      : 'bg-[#0e1624] text-slate-300 border-[#24344d] hover:border-[#3c5173]'
                  }`}
                >
                  {cf}
                </button>
              ))}
            </div>
          )}

          <div className="rb-panel overflow-x-auto">
            <div className="bg-[#090d16] px-5 py-3 border-b-2 border-[#2e405d] flex flex-wrap items-center justify-between gap-2">
              <div className="font-pixel text-[10px] text-[#fde047]">LEAGUE STANDINGS</div>
              <div className="font-pixel text-[8px] text-[#4ade80]">
                {save.era === 'NFL'
                  ? 'TOP 7 PER CONF -> PLAYOFFS (#1 BYE)'
                  : save.era === 'COLLEGE'
                    ? subFilter === 'FCS'
                      ? confFilter === 'ALL'
                        ? 'TOP 16 FCS -> FCS PLAYOFFS'
                        : 'FCS CONFERENCE LEADERS'
                      : confFilter === 'ALL'
                        ? 'TOP 12 FBS -> CFP · TOP 16 FCS -> FCS PLAYOFFS'
                        : 'TOP 2 -> CONF CHAMPIONSHIP'
                    : 'TOP 8 -> STATE PLAYOFFS'}
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-[#24344d] font-pixel text-[8px] text-slate-400 bg-[#0e1624]">
                <tr>
                  <th className="py-3 px-4">RK</th>
                  <th className="py-3 px-4">TEAM</th>
                  <th className="py-3 px-4">DIV</th>
                  <th className="py-3 px-4 text-right">W</th>
                  <th className="py-3 px-4 text-right">L</th>
                  {save.era === 'NFL' && <th className="py-3 px-4 text-right">T</th>}
                  <th className="py-3 px-4 text-right">PF</th>
                  <th className="py-3 px-4 text-right">PA</th>
                  <th className="py-3 px-4 text-right">+/-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24344d]">
                {sortedStandings.map((row, idx) => {
                  const t = getTeamById(row.teamId);
                  const isMine = row.teamId === save.teamId;
                  const diff = row.pointsFor - row.pointsAgainst;
                  const playoffCut =
                    save.era === 'NFL'
                      ? confFilter === 'ALL'
                        ? 14
                        : 7
                      : save.era === 'COLLEGE'
                        ? subFilter === 'FCS'
                          ? confFilter === 'ALL'
                            ? 16
                            : 1
                          : confFilter === 'ALL'
                            ? 12
                            : 2
                        : 8;
                  return (
                    <tr
                      key={row.teamId}
                      className={`${isMine ? 'bg-[#eab308]/14 font-bold' : ''} ${
                        idx + 1 === playoffCut ? 'border-b-2 border-[#4ade80]/70' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-pixel text-[9px] text-[#fde047]">#{idx + 1}</td>
                      <td className="py-2.5 px-4 text-white flex items-center gap-2.5">
                        <span className="w-3 h-5 border border-white/30 shrink-0" style={{ backgroundColor: t.uniforms.home.shirt }} />
                        <span>{t.name}</span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-400">{t.division}</td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-white">{row.wins}</td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-slate-300">{row.losses}</td>
                      {save.era === 'NFL' && (
                        <td className="py-2.5 px-4 text-right font-mono-num text-slate-400">{row.ties}</td>
                      )}
                      <td className="py-2.5 px-4 text-right font-mono-num text-slate-300">{row.pointsFor}</td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-slate-300">{row.pointsAgainst}</td>
                      <td className={`py-2.5 px-4 text-right font-mono-num ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {diff >= 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'SCHEDULE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {save.schedule.map((g) => {
            const opp = getTeamById(g.opponentId);
            const oppRank = getTeamRank(save, opp.id);
            const isCurrent = g.week === save.week && !g.played;
            return (
              <div
                key={`${g.week}_${g.opponentId}`}
                className={`p-4 flex items-center justify-between gap-3 border-2 ${
                  isCurrent ? 'bg-[#1f2d42] border-[#fde047]' : 'rb-panel'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-pixel text-[9px] text-slate-400 w-12 shrink-0">
                    {g.isPlayoff ? 'PO' : `WK ${g.week}`}
                  </span>
                  <span className="w-2.5 h-7 border border-white/25 shrink-0" style={{ backgroundColor: opp.uniforms.home.shirt }} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {g.isHome ? 'vs' : '@'} #{oppRank.rank} {opp.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {g.playoffRoundName ?? `${oppRank.wins}-${oppRank.losses} · ${opp.city} · ${g.weather}`}
                    </div>
                  </div>
                </div>
                <div className="font-mono-num text-sm font-bold shrink-0">
                  {g.played ? (
                    <span className={(g.playerTeamScore ?? 0) > (g.opponentScore ?? 0) ? 'text-emerald-400' : 'text-rose-400'}>
                      {(g.playerTeamScore ?? 0) > (g.opponentScore ?? 0) ? 'W' : 'L'} {g.playerTeamScore}-{g.opponentScore}
                    </span>
                  ) : isCurrent ? (
                    <span className="font-pixel text-[9px] text-[#fde047]">NEXT</span>
                  ) : (
                    <span className="text-slate-500">UPCOMING</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ConditionBar: React.FC<{ pct: number }> = ({ pct }) => {
  const color = pct >= 70 ? 'bg-[#22c55e]' : pct >= 45 ? 'bg-[#eab308]' : 'bg-[#ef4444]';
  return (
    <div className="flex flex-col gap-1">
      <div className="w-full h-2.5 bg-[#090d16] border border-[#364b6e] overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      <div className="font-mono-num text-[10px] text-slate-400 text-right">{pct}%</div>
    </div>
  );
};

interface RetroPlayerCardProps {
  isUser?: boolean;
  position: Position;
  jersey: number;
  name: string;
  subtitle: string;
  age: number;
  rating: number;
  potential: number;
  attrs: PlayerAttributes;
  maxAttrs: PlayerAttributes;
  condition: number;
  morale: number;
  skinTone: string;
  hairColor: string;
  faceStyle: number;
  uniform: UniformSet;
  statsLine: string;
}

const RetroPlayerCard: React.FC<RetroPlayerCardProps> = ({
  isUser = false,
  position,
  jersey,
  name,
  subtitle,
  age,
  rating,
  potential,
  attrs,
  maxAttrs,
  condition,
  morale,
  skinTone,
  hairColor,
  faceStyle,
  uniform,
  statsLine,
}) => {
  const moraleMeta = getMoraleInfo(morale);
  const starFrame = Math.max(1, Math.min(10, Math.round(rating * 2)));
  const attrRows: { key: keyof PlayerAttributes; label: string }[] = [
    { key: 'skill', label: getSkillLabel(position) },
    { key: 'speed', label: 'Speed' },
    { key: 'strength', label: 'Strength' },
    { key: 'stamina', label: 'Stamina' },
  ];

  return (
    <div
      className={`rb-panel p-4 flex flex-col gap-3.5 border-2 ${
        isUser ? 'border-[#fde047] bg-[#162844]' : 'border-[#2e405d]'
      }`}
    >
      {/* Top Header: Portrait + Name + Star Rating */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <PixelPortrait
              skinTone={skinTone}
              hairColor={hairColor}
              faceStyle={faceStyle}
              jerseyColor={uniform.shirt}
              sleeveColor={uniform.sleeve}
              helmetColor={uniform.helmet}
              jerseyNumber={jersey}
              size={52}
            />
            <span
              className={`px-2 py-0.5 font-pixel text-[8px] border ${
                isUser
                  ? 'bg-[#eab308] text-slate-950 border-[#fde047]'
                  : 'bg-[#090d16] text-[#fde047] border-[#364b6e]'
              }`}
            >
              {position} #{jersey}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-xl font-extrabold text-white truncate leading-tight">
                {name}
              </h3>
              {isUser && (
                <span className="px-1.5 py-0.5 bg-[#fde047] text-[#090d16] font-pixel text-[7px]">
                  YOU
                </span>
              )}
            </div>
            <div className="text-xs text-slate-300 truncate mt-0.5">
              {subtitle} · Age {age}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <RetroSprite name="spr_star_rating_b" frame={starFrame} scale={1.35} />
              <span className="font-mono-num text-[11px] text-[#fde047] font-bold">
                {rating.toFixed(1)}★
              </span>
              <span className="font-mono-num text-[10px] text-sky-300">
                / {potential.toFixed(1)}★ POT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Retro Bowl 10-segment Attribute Bars */}
      <div className="rb-panel-inset p-3 flex flex-col gap-2">
        {attrRows.map((row) => {
          const cur = attrs[row.key];
          const cap = maxAttrs[row.key];
          return (
            <div key={row.key} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[11px] font-semibold text-slate-300 truncate">
                {row.label}
              </span>
              <div className="flex-1 grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, idx) => {
                  const seg = idx + 1;
                  const cls =
                    seg <= cur
                      ? 'bg-[#eab308] border border-[#fde047]/60'
                      : seg <= cap
                        ? 'bg-[#38bdf8]/30 border border-[#38bdf8]/45'
                        : 'bg-[#090d16] border border-[#1e2c42]';
                  return <div key={seg} className={`h-2.5 ${cls}`} />;
                })}
              </div>
              <span className="w-10 text-right font-mono-num text-[11px] text-slate-300 shrink-0">
                {cur}/{cap}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer: Condition, Morale & Stats */}
      <div className="grid grid-cols-2 gap-3 items-center pt-1 border-t border-[#24344d]">
        <div>
          <div className="text-[10px] text-slate-400 font-semibold mb-1">CONDITION</div>
          <ConditionBar pct={condition} />
        </div>
        <div className="flex flex-col items-end justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <RetroSprite name="spr_attitude" frame={moraleMeta.frame} scale={1.35} />
            <span className={`text-xs font-bold ${moraleMeta.textClass}`}>
              {moraleMeta.label} ({morale}%)
            </span>
          </div>
          <div className="font-mono-num text-[11px] text-slate-400 text-right truncate max-w-full">
            {statsLine}
          </div>
        </div>
      </div>
    </div>
  );
};

