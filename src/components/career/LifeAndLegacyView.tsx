import React, { useState } from 'react';
import { CareerSave, StatLine } from '../../types/career';
import { SHOPPING_CATALOG, getLifestylePerks } from '../../data/shopping';
import { getPlayerLegacyScore, getPlayerRank, getTeamRank } from '../../engine/careerEngine';
import { RetroSprite } from '../shared/RetroSprite';
import { retroAudio } from '../../audio/retroAudio';
import { ShoppingBag } from 'lucide-react';

interface LifeAndLegacyViewProps {
  save: CareerSave;
  onUpdateSave: (next: CareerSave) => void;
}

export const LifeAndLegacyView: React.FC<LifeAndLegacyViewProps> = ({
  save,
  onUpdateSave,
}) => {
  const [tab, setTab] = useState<'STATS' | 'SHOP' | 'LEGACY'>('STATS');
  const [shopCat, setShopCat] = useState<'ITEMS' | 'VEHICLES' | 'PROPERTY'>('ITEMS');
  const [notice, setNotice] = useState<string | null>(null);

  const handleBuyItem = (itemId: number) => {
    const item = SHOPPING_CATALOG.find((i) => i.id === itemId);
    if (!item) return;
    if (save.player.ownedItemIds.includes(itemId)) return;
    if (save.player.cash < item.price) {
      retroAudio.play('error');
      setNotice(`Need $${item.price.toLocaleString()} to purchase ${item.name}.`);
      return;
    }
    retroAudio.play('purchase');
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    next.player.cash -= item.price;
    next.player.ownedItemIds.push(itemId);
    next.player.morale = Math.min(100, next.player.morale + item.happinessBoost);
    setNotice(`Purchased ${item.name}! Morale boosted +${item.happinessBoost}%.`);
    onUpdateSave(next);
  };

  const playerRank = getPlayerRank(save);
  const myTeamRank = getTeamRank(save, save.teamId);
  const perks = getLifestylePerks(save.player.ownedItemIds ?? []);
  const legacyScore = getPlayerLegacyScore(save);
  const pos = save.player.position;
  const st = save.careerStats;
  const games = Math.max(1, st.games);

  const summaryCards: { label: string; value: string; sub: string }[] = (() => {
    if (pos === 'QB') {
      const compPct = st.passAtt > 0 ? Math.round((st.passComp / st.passAtt) * 100) : 0;
      return [
        { label: 'Pass Yards', value: `${st.passYards.toLocaleString()}`, sub: `${Math.round(st.passYards / games)} yds/game` },
        { label: 'Pass TD / INT', value: `${st.passTD} / ${st.interceptions}`, sub: `${compPct}% Completion` },
        { label: 'Rush Yards / TD', value: `${st.rushYards} / ${st.rushTD}`, sub: `${st.rushAtt} rush attempts` },
        { label: playerRank.label, value: `#${playerRank.rank}`, sub: `Team Rank #${myTeamRank.rank} (${myTeamRank.wins}-${myTeamRank.losses})` },
      ];
    }
    if (pos === 'RB' || pos === 'WR' || pos === 'TE') {
      const scrim = st.rushYards + st.recYards;
      const totalTd = st.rushTD + st.recTD;
      return [
        { label: 'Scrimmage Yards', value: `${scrim.toLocaleString()}`, sub: `${Math.round(scrim / games)} yds/game` },
        { label: 'Total Touchdowns', value: `${totalTd}`, sub: `${st.rushTD} rush · ${st.recTD} rec` },
        { label: 'Receptions / Long', value: `${st.receptions} / ${st.longestPlay}y`, sub: `${st.blocks} key blocks` },
        { label: playerRank.label, value: `#${playerRank.rank}`, sub: `Team Rank #${myTeamRank.rank} (${myTeamRank.wins}-${myTeamRank.losses})` },
      ];
    }
    if (pos === 'OL') {
      return [
        { label: 'Key Blocks', value: `${st.blocks}`, sub: `${(st.blocks / games).toFixed(1)} per game` },
        { label: 'Pancakes', value: `${st.pancakes}`, sub: `Dominant finishes` },
        { label: 'Sacks Allowed', value: `${st.sacksAllowed}`, sub: `${st.games} career games` },
        { label: playerRank.label, value: `#${playerRank.rank}`, sub: `Team Rank #${myTeamRank.rank} (${myTeamRank.wins}-${myTeamRank.losses})` },
      ];
    }
    if (pos === 'K') {
      const fgPct = st.fgAtt > 0 ? Math.round((st.fgMade / st.fgAtt) * 100) : 0;
      return [
        { label: 'FG Made / Att', value: `${st.fgMade} / ${st.fgAtt}`, sub: `${fgPct}% Accuracy` },
        { label: 'Career Long', value: `${st.fgLong} yds`, sub: `${st.xpMade}/${st.xpAtt} Extra Points` },
        { label: 'Total Points', value: `${st.fgMade * 3 + st.xpMade}`, sub: `${st.games} career games` },
        { label: playerRank.label, value: `#${playerRank.rank}`, sub: `Team Rank #${myTeamRank.rank} (${myTeamRank.wins}-${myTeamRank.losses})` },
      ];
    }
    return [
      { label: 'Total Tackles', value: `${st.tackles}`, sub: `${(st.tackles / games).toFixed(1)} per game (${st.tfl} TFL)` },
      { label: 'Sacks', value: `${st.sacks}`, sub: `Backfield disruption` },
      { label: 'INT / Deflections', value: `${st.defInt} / ${st.passDeflections}`, sub: `${st.games} career games` },
      { label: playerRank.label, value: `#${playerRank.rank}`, sub: `Team Rank #${myTeamRank.rank} (${myTeamRank.wins}-${myTeamRank.losses})` },
    ];
  })();

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#24344d] pb-4">
        <div>
          <div className="font-pixel text-[10px] text-[#fde047]">
            STATS · LIFESTYLE · TROPHY CASE
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white mt-1">
            {save.player.firstName} {save.player.lastName} — #{playerRank.rank} {pos}
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0e1624] border-2 border-[#2e405d]">
          {(['STATS', 'SHOP', 'LEGACY'] as const).map((t) => (
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
              {t === 'STATS' ? 'STATS & SPLITS' : t === 'SHOP' ? 'LIFESTYLE' : 'TROPHIES'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'STATS' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {summaryCards.map((c) => (
              <div key={c.label} className="rb-panel p-4">
                <div className="font-pixel text-[8px] text-[#fde047]">{c.label.toUpperCase()}</div>
                <div className="font-mono-num text-2xl font-bold text-white mt-1.5">{c.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="rb-panel overflow-x-auto">
            <div className="px-5 py-3 border-b-2 border-[#24344d] font-pixel text-[10px] text-[#fde047]">
              STAT SPLITS BY CAREER STAGE
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-[#24344d] font-pixel text-[8px] text-slate-400 bg-[#0e1624]">
                <tr>
                  <th className="py-3 px-4">SPLIT</th>
                  <th className="py-3 px-4 text-right">G</th>
                  <th className="py-3 px-4 text-right">PASS YDS / TD</th>
                  <th className="py-3 px-4 text-right">RUSH YDS / TD</th>
                  <th className="py-3 px-4 text-right">REC / YDS / TD</th>
                  <th className="py-3 px-4 text-right">TCK / SCK / INT</th>
                  <th className="py-3 px-4 text-right">FG / LNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24344d] font-mono-num">
                <StatRow label="This Season" st={save.seasonStats} highlight />
                <StatRow label="High School Total" st={save.careerByEra.HIGH_SCHOOL} />
                <StatRow label="College Total" st={save.careerByEra.COLLEGE} />
                <StatRow label="NFL Total" st={save.careerByEra.NFL} />
                <StatRow label="Career Combined" st={save.careerStats} highlight />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'SHOP' && (
        <div className="flex flex-col gap-5">
          <div className="rb-panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-[#fde047]" />
              <div>
                <div className="text-xs text-slate-400">Available Cash</div>
                <div className="font-mono-num text-2xl font-bold text-[#4ade80]">
                  ${save.player.cash.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-[#0e1624] border-2 border-[#2e405d]">
              {(['ITEMS', 'VEHICLES', 'PROPERTY'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setShopCat(cat)}
                  className={`px-3 py-1.5 text-xs font-bold ${
                    shopCat === cat ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cat === 'ITEMS' ? 'Items & Gear' : cat === 'VEHICLES' ? 'Vehicles' : 'Property'}
                </button>
              ))}
            </div>
          </div>

          {notice && (
            <div className="rb-panel-inset px-4 py-2.5 text-xs text-[#fde047]">
              {notice}
            </div>
          )}

          {/* Active Lifestyle Micro-Boosts & Outside-Life Summary */}
          <div className="rb-panel-inset px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-[#38bdf8]/40">
            <div className="font-pixel text-[9px] text-[#38bdf8]">
              ACTIVE LIFESTYLE &amp; OUTSIDE-LIFE PERKS ({save.player.ownedItemIds.length} OWNED)
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-mono-num">
              <span className="text-emerald-300">
                +{perks.attrBoost.speed} SPD · +{perks.attrBoost.strength} STR · +{perks.attrBoost.stamina} STA · +{perks.attrBoost.skill} SKL
              </span>
              <span className="text-[#fde047]">+{perks.xpBonusPct}% XP</span>
              <span className="text-sky-300">+{perks.conditionRegenBonus}% Recov</span>
              <span className={perks.weeklyNetUpkeep <= 0 ? 'text-[#4ade80]' : 'text-amber-300'}>
                {perks.weeklyNetUpkeep <= 0
                  ? `+$${Math.abs(perks.weeklyNetUpkeep).toLocaleString()}/wk Passive`
                  : `-$${perks.weeklyNetUpkeep.toLocaleString()}/wk Upkeep`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SHOPPING_CATALOG.filter((i) => i.category === shopCat).map((item) => {
              const owned = save.player.ownedItemIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="rb-panel p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xl font-bold text-white">{item.name}</span>
                      <span className="font-mono-num text-sm font-bold text-[#4ade80]">
                        ${item.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      +{item.happinessBoost}% Morale Boost
                      {item.upkeep < 0
                        ? ` · Earns $${Math.abs(item.upkeep).toLocaleString()}/yr`
                        : item.upkeep > 0
                          ? ` · $${item.upkeep.toLocaleString()}/yr upkeep`
                          : ''}
                    </div>
                    {item.perkLabel && (
                      <div className="mt-1.5 inline-block px-2 py-0.5 bg-[#0e1624] border border-[#38bdf8]/40 text-[11px] font-semibold text-[#7dd3fc]">
                        {item.perkLabel}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={owned}
                    onClick={() => handleBuyItem(item.id)}
                    className={`w-full py-2 text-xs font-bold ${
                      owned ? 'rb-btn-green opacity-80' : 'rb-btn-gold'
                    }`}
                  >
                    {owned ? 'OWNED' : 'PURCHASE'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'LEGACY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rb-panel p-5 flex items-center justify-between gap-4 border-[#eab308]/50">
              <div>
                <div className="font-pixel text-[9px] text-[#fde047]">CAREER LEGACY SCORE</div>
                <div className="font-display text-4xl font-extrabold text-white mt-1 tabular-nums">
                  {legacyScore.toLocaleString()} <span className="text-xs font-pixel text-[#4ade80]">PTS</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Syncs to Global Career Rankings when signed in.
                </div>
              </div>
            </div>

            <div className="rb-panel p-5">
              <div className="flex items-center gap-3 mb-3">
                <RetroSprite name="spr_trophy" frame={0} scale={1} alt="Trophy" />
                <h2 className="font-pixel text-[10px] text-[#fde047]">CHAMPIONSHIPS & RINGS</h2>
              </div>
              {save.trophies.length === 0 ? (
                <p className="text-xs text-slate-400">No championships won yet. Win the State Title, CFP National Championship, or Retro Bowl!</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm text-[#fde047]">
                  {save.trophies.map((t, i) => (
                    <li key={i} className="border-b border-[#24344d] pb-1.5 flex items-center gap-2">
                      <RetroSprite name="spr_sb_ring" frame={0} scale={2} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rb-panel p-5">
              <div className="flex items-center gap-3 mb-3">
                <RetroSprite name="spr_medals" frame={0} scale={2} alt="Medals" />
                <h2 className="font-pixel text-[10px] text-[#4ade80]">MILESTONES & TRAITS</h2>
              </div>
              <div className="text-xs text-slate-300 mb-3">
                Unlocked Traits: {save.player.traits.length > 0 ? save.player.traits.join(' · ') : 'Reach Level 4 to unlock your first Trait'}
              </div>
              {save.achievements.length === 0 ? (
                <p className="text-xs text-slate-400">Keep playing games to unlock career achievements.</p>
              ) : (
                <div className="flex flex-col gap-1.5 text-xs text-emerald-300">
                  {save.achievements.map((a) => (
                    <div key={a}>✓ {a}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 rb-panel p-5">
            <h2 className="font-pixel text-[10px] text-[#fde047] mb-4">SEASON-BY-SEASON TIMELINE</h2>
            {save.history.length === 0 ? (
              <p className="text-xs text-slate-400">Your completed seasons across High School, College, and NFL will appear here.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {save.history.map((h) => (
                  <div key={h.season} className="border-b border-[#24344d] pb-3 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg font-bold text-white">
                        S{h.season} · {h.teamName} ({h.record})
                      </span>
                      <span className="text-xs font-mono-num text-[#fde047]">{h.finish}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {h.era.replace('_', ' ')} · {h.highlights}
                    </div>
                    {h.awards.length > 0 && (
                      <div className="text-xs text-emerald-300 mt-1">Awards: {h.awards.join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatRow: React.FC<{ label: string; st: StatLine; highlight?: boolean }> = ({
  label,
  st,
  highlight,
}) => (
  <tr className={highlight ? 'bg-[#0e1624] font-semibold text-white' : 'text-slate-300'}>
    <td className="py-2.5 px-4 font-sans">{label}</td>
    <td className="py-2.5 px-4 text-right">{st.games}</td>
    <td className="py-2.5 px-4 text-right">{st.passYards} / {st.passTD}</td>
    <td className="py-2.5 px-4 text-right">{st.rushYards} / {st.rushTD}</td>
    <td className="py-2.5 px-4 text-right">{st.receptions} / {st.recYards} / {st.recTD}</td>
    <td className="py-2.5 px-4 text-right">{st.tackles} / {st.sacks} / {st.defInt}</td>
    <td className="py-2.5 px-4 text-right">{st.fgMade}-{st.fgAtt} / {st.fgLong}y</td>
  </tr>
);
