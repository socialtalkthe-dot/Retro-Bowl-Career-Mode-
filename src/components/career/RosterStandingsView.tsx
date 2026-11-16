import React, { useMemo, useState } from 'react';
import { CareerSave } from '../../types/career';
import { getTeamById } from '../../data/teams';
import { getPlayerRank, getTeamRank, sortStandingsRows } from '../../engine/careerEngine';
import { PixelPortrait } from '../shared/PixelPortrait';
import { RetroSprite } from '../shared/RetroSprite';
import { retroAudio } from '../../audio/retroAudio';

interface RosterStandingsViewProps {
  save: CareerSave;
}

function getMoraleFrame(morale: number): number {
  if (morale >= 85) return 0;
  if (morale >= 68) return 2;
  if (morale >= 48) return 4;
  return 6;
}

export const RosterStandingsView: React.FC<RosterStandingsViewProps> = ({ save }) => {
  const [tab, setTab] = useState<'ROSTER' | 'STANDINGS' | 'SCHEDULE'>('ROSTER');
  const [confFilter, setConfFilter] = useState<string>('ALL');
  const myTeam = getTeamById(save.teamId);
  const activeUni = myTeam.uniforms[save.uniformChoice];
  const myTeamRank = useMemo(() => getTeamRank(save, myTeam.id), [save, myTeam.id]);
  const playerRank = useMemo(() => getPlayerRank(save), [save]);

  const sortedStandings = useMemo(() => {
    const rows = Object.values(save.standings).filter((r) => {
      if (confFilter === 'ALL') return true;
      const t = getTeamById(r.teamId);
      return t.conference === confFilter;
    });
    return sortStandingsRows(rows);
  }, [save.standings, confFilter]);

  const conferences = useMemo(() => {
    const set = new Set<string>();
    Object.keys(save.standings).forEach((id) => {
      set.add(getTeamById(id).conference);
    });
    return ['ALL', ...Array.from(set)];
  }, [save.standings]);

  const userTotalYds =
    save.seasonStats.passYards + save.seasonStats.rushYards + save.seasonStats.recYards;
  const userTotalTDs =
    save.seasonStats.passTD + save.seasonStats.rushTD + save.seasonStats.recTD;

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

          {/* Authentic Retro Bowl Pixel Roster List */}
          <div className="rb-panel overflow-hidden">
            <div className="bg-[#090d16] px-5 py-3 border-b-2 border-[#2e405d] flex items-center justify-between">
              <div className="font-pixel text-[10px] text-[#fde047]">ACTIVE ROSTER</div>
              <div className="hidden sm:flex items-center gap-8 font-pixel text-[8px] text-slate-400">
                <span className="w-24 text-center">STARS</span>
                <span className="w-24 text-center">CONDITION</span>
                <span className="w-16 text-center">MORALE</span>
              </div>
            </div>

            <div className="divide-y divide-[#24344d]">
              {/* User Player Row */}
              <div className="px-5 py-3 bg-[#eab308]/12 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-11 py-1 bg-[#eab308] text-slate-950 border-2 border-[#fde047] font-pixel text-[9px] text-center shrink-0">
                    {save.player.position}
                  </span>
                  <PixelPortrait
                    skinTone={save.player.skinTone}
                    hairColor={save.player.hairColor}
                    faceStyle={save.player.faceStyle}
                    jerseyColor={activeUni.shirt}
                    sleeveColor={activeUni.sleeve}
                    helmetColor={activeUni.helmet}
                    jerseyNumber={save.player.jersey}
                    size={44}
                  />
                  <div className="min-w-0">
                    <div className="font-pixel text-[10px] text-[#fde047] truncate">
                      {save.player.firstName.toUpperCase()} {save.player.lastName.toUpperCase()} · JERSEY #{save.player.jersey} · RANK #{playerRank.rank}
                    </div>
                    <div className="text-xs text-slate-300 mt-1 font-mono-num">
                      Age {save.player.age} · {save.player.archetype} · {userTotalYds} yds / {userTotalTDs} TD / {save.seasonStats.tackles} tck
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="w-24 flex justify-center">
                    <RetroSprite
                      name="spr_star_rating_b"
                      frame={Math.max(1, Math.min(10, Math.round(save.player.starRating * 2)))}
                      scale={1.5}
                    />
                  </div>
                  <div className="w-24">
                    <ConditionBar pct={save.player.condition} />
                  </div>
                  <div className="w-16 flex items-center justify-center gap-1.5">
                    <RetroSprite name="spr_attitude" frame={getMoraleFrame(save.player.morale)} scale={1.8} />
                  </div>
                </div>
              </div>

              {save.roster.map((tm) => (
                <div key={tm.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-4 hover:bg-[#19263c]/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-11 py-1 bg-[#0e1624] text-slate-200 border-2 border-[#364b6e] font-pixel text-[9px] text-center shrink-0">
                      {tm.position}
                    </span>
                    <PixelPortrait
                      skinTone={tm.skinTone}
                      hairColor={tm.hairColor}
                      faceStyle={tm.faceId}
                      jerseyColor={activeUni.shirt}
                      sleeveColor={activeUni.sleeve}
                      helmetColor={activeUni.helmet}
                      jerseyNumber={tm.jersey}
                      size={44}
                    />
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold text-white truncate leading-none">
                        #{tm.jersey} {tm.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-mono-num">
                        Age {tm.age} · {tm.stats.yards} yds / {tm.stats.tds} TD / {tm.stats.tackles} tck
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="w-24 flex justify-center">
                      <RetroSprite
                        name="spr_star_rating_b"
                        frame={Math.max(1, Math.min(10, Math.round(tm.rating * 2)))}
                        scale={1.5}
                      />
                    </div>
                    <div className="w-24">
                      <ConditionBar pct={tm.condition} />
                    </div>
                    <div className="w-16 flex items-center justify-center">
                      <RetroSprite name="spr_attitude" frame={getMoraleFrame(tm.morale)} scale={1.8} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'STANDINGS' && (
        <div className="flex flex-col gap-4">
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
                    ? confFilter === 'ALL'
                      ? 'TOP 12 -> CFP · 6+ WINS -> BOWL'
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
                        ? confFilter === 'ALL'
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
