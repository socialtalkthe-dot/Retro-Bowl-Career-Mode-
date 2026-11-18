import React, { useState } from 'react';
import { CareerSave, DilemmaChoice, PlayerAttributes } from '../../types/career';
import { getTeamById } from '../../data/teams';
import { getLifestylePerks, NRG_DRINK_PRICE } from '../../data/shopping';
import {
  calculateStarRating,
  evaluateHighSchoolRecruiting,
  getMoraleInfo,
  getPlayerLegacyScore,
  getPlayerRank,
  getSkillLabel,
  getTeamRank,
} from '../../engine/careerEngine';
import { PixelPortrait } from '../shared/PixelPortrait';
import { PixelJerseyPreview } from '../shared/PixelJerseyPreview';
import { RetroSprite } from '../shared/RetroSprite';
import { retroAudio } from '../../audio/retroAudio';
import { getWeatherMeta } from '../../engine/weatherEngine';
import { ArrowUpCircle, Play, Users } from 'lucide-react';

interface CareerHubProps {
  save: CareerSave;
  onUpdateSave: (next: CareerSave) => void;
  onPlayGame: () => void;
}

export const CareerHub: React.FC<CareerHubProps> = ({
  save,
  onUpdateSave,
  onPlayGame,
}) => {
  const [dilemmaFeedback, setDilemmaFeedback] = useState<string | null>(null);
  const [trainingFocus, setTrainingFocus] = useState<keyof PlayerAttributes>('skill');
  const [trainingNotice, setTrainingNotice] = useState<string | null>(null);
  const myTeam = getTeamById(save.teamId);
  const nextGame = save.schedule.find((g) => g.week === save.week && !g.played);
  const oppTeam = nextGame ? getTeamById(nextGame.opponentId) : null;
  const myRow = save.standings[save.teamId] ?? { wins: 0, losses: 0, ties: 0 };
  const activeUni = myTeam.uniforms[save.uniformChoice];
  const myTeamRank = getTeamRank(save, myTeam.id);
  const oppTeamRank = oppTeam ? getTeamRank(save, oppTeam.id) : null;
  const playerRank = getPlayerRank(save);

  const hsRecruiting =
    save.era === 'HIGH_SCHOOL' ? evaluateHighSchoolRecruiting(save) : null;
  const perks = getLifestylePerks(save.player.ownedItemIds ?? []);
  const legacyScore = getPlayerLegacyScore(save);
  const curQtrLen: 2 | 2.5 | 3 =
    save.quarterLength === 2 ? 2 : save.quarterLength === 3 ? 3 : 2.5;
  const hasLifestyleBuffs =
    perks.attrBoost.speed > 0 ||
    perks.attrBoost.strength > 0 ||
    perks.attrBoost.stamina > 0 ||
    perks.attrBoost.skill > 0 ||
    perks.xpBonusPct > 0 ||
    perks.conditionRegenBonus > 0 ||
    perks.weeklyNetUpkeep < 0;

  const handleResolveDilemma = (choice: DilemmaChoice) => {
    retroAudio.play('click');
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    const e = choice.effects;
    next.player.relationships.coach = clamp100(next.player.relationships.coach + (e.coach ?? 0));
    next.player.relationships.teammates = clamp100(next.player.relationships.teammates + (e.teammates ?? 0));
    next.player.relationships.fans = clamp100(next.player.relationships.fans + (e.fans ?? 0));
    next.player.relationships.agent = clamp100(next.player.relationships.agent + (e.agent ?? 0));
    next.player.relationships.gpa = Math.round(Math.max(1.5, Math.min(4.0, next.player.relationships.gpa + (e.gpa ?? 0))) * 100) / 100;
    next.player.morale = clamp100(next.player.morale + (e.morale ?? 0));
    next.player.condition = clamp100(next.player.condition + (e.condition ?? 0));
    next.player.cash = Math.max(0, next.player.cash + (e.cash ?? 0));
    if (e.xp) {
      next.player.xp += e.xp;
      while (next.player.xp >= next.player.xpToNext) {
        next.player.xp -= next.player.xpToNext;
        next.player.level += 1;
        next.player.skillPoints += 1;
        next.player.xpToNext = Math.round(next.player.xpToNext * 1.16 + 25);
      }
    }
    if (e.starBoost && next.era === 'HIGH_SCHOOL') {
      next.player.recruitingStars = Math.min(5, Math.round(next.player.recruitingStars + e.starBoost));
    }
    next.pendingDilemma = null;
    setDilemmaFeedback(choice.outcomeText);
    onUpdateSave(next);
  };

  const handleUpgradeAttr = (attr: keyof PlayerAttributes) => {
    if (save.player.skillPoints <= 0) return;
    if (save.player.attributes[attr] >= save.player.maxAttributes[attr]) return;
    retroAudio.play('starrating');
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    next.player.attributes[attr] += 1;
    next.player.skillPoints -= 1;
    next.player.starRating = calculateStarRating(next.player.attributes, next.player.position);
    onUpdateSave(next);
  };

  const handleExtraPractice = () => {
    if (save.weeklyTrainingDone || save.player.condition < 40) {
      retroAudio.play('error');
      setTrainingNotice(save.player.condition < 40 ? 'Condition too low (<40%). Use NRG or play first!' : null);
      return;
    }
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    next.weeklyTrainingDone = true;
    next.player.condition = clamp100(next.player.condition - 10);
    next.player.xp += 35;
    next.player.relationships.coach = clamp100(next.player.relationships.coach + 4);

    if (!next.player.trainingProgress) {
      next.player.trainingProgress = { speed: 0, strength: 0, stamina: 0, skill: 0 };
    }
    const label = trainingFocus === 'skill' ? getSkillLabel(next.player.position) : trainingFocus.charAt(0).toUpperCase() + trainingFocus.slice(1);
    const curVal = next.player.attributes[trainingFocus];
    const maxVal = next.player.maxAttributes[trainingFocus];

    if (curVal < maxVal) {
      next.player.trainingProgress[trainingFocus] = (next.player.trainingProgress[trainingFocus] ?? 0) + 34;
      if (next.player.trainingProgress[trainingFocus] >= 100) {
        next.player.trainingProgress[trainingFocus] -= 100;
        next.player.attributes[trainingFocus] += 1;
        next.player.starRating = calculateStarRating(next.player.attributes, next.player.position);
        retroAudio.play('starrating');
        setTrainingNotice(`Breakthrough! ${label} improved to ${next.player.attributes[trainingFocus]}/${maxVal}!`);
      } else {
        retroAudio.play('success');
        setTrainingNotice(`${label} drill complete (${next.player.trainingProgress[trainingFocus]}% to next +1, +35 XP).`);
      }
    } else {
      retroAudio.play('success');
      setTrainingNotice(`${label} already capped (+35 XP & +4 Coach Trust earned).`);
    }

    while (next.player.xp >= next.player.xpToNext) {
      next.player.xp -= next.player.xpToNext;
      next.player.level += 1;
      next.player.skillPoints += 1;
      next.player.xpToNext = Math.round(next.player.xpToNext * 1.16 + 25);
    }
    onUpdateSave(next);
  };

  const handleMeetTeammates = () => {
    if (save.weeklyMeetingDone) return;
    retroAudio.play('beep');
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    next.weeklyMeetingDone = true;
    next.player.relationships.teammates = clamp100(next.player.relationships.teammates + 6);
    next.player.morale = clamp100(next.player.morale + 5);
    next.player.condition = clamp100(next.player.condition - 4);
    onUpdateSave(next);
  };

  const handleDrinkNRG = () => {
    if (save.player.nrgDrinks <= 0) {
      if (save.player.cash < NRG_DRINK_PRICE) {
        retroAudio.play('error');
        return;
      }
      retroAudio.play('purchase');
      const next: CareerSave = JSON.parse(JSON.stringify(save));
      next.player.cash -= NRG_DRINK_PRICE;
      next.player.nrgDrinks += 1;
      onUpdateSave(next);
      return;
    }
    retroAudio.play('drink');
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    next.player.nrgDrinks -= 1;
    next.player.condition = clamp100(next.player.condition + 22);
    onUpdateSave(next);
  };

  const handleCycleUniform = () => {
    retroAudio.play('click');
    const order: ('home' | 'away' | 'alt')[] = ['home', 'away', 'alt'];
    const idx = (order.indexOf(save.uniformChoice) + 1) % order.length;
    onUpdateSave({ ...save, uniformChoice: order[idx] });
  };

  const handleCycleQuarterLength = () => {
    retroAudio.play('click');
    const nextLen: 2 | 2.5 | 3 = curQtrLen === 2 ? 2.5 : curQtrLen === 2.5 ? 3 : 2;
    onUpdateSave({ ...save, quarterLength: nextLen });
  };

  const handleCycleDriveDirection = () => {
    retroAudio.play('click');
    const order: ('BOTH' | 'RIGHT' | 'LEFT')[] = ['BOTH', 'RIGHT', 'LEFT'];
    const cur = save.driveDirection ?? 'BOTH';
    const nextDir = order[(order.indexOf(cur) + 1) % order.length];
    onUpdateSave({ ...save, driveDirection: nextDir });
  };

  const eraLabel =
    save.era === 'HIGH_SCHOOL'
      ? `High School Year ${save.eraYear} · ${save.selectedState}`
      : save.era === 'COLLEGE'
        ? `College Year ${save.eraYear} · ${myTeam.conference}`
        : `NFL Year ${save.eraYear} · ${myTeam.division}`;

  const starFrame = Math.max(1, Math.min(10, Math.round(save.player.starRating * 2)));
  const moraleMeta = getMoraleInfo(save.player.morale);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Top Matchup & Player Hero Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Next Matchup Card (7 cols) */}
        <div className="lg:col-span-7 rb-panel p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-pixel text-[10px] text-[#fde047]">
                {nextGame?.isPlayoff
                  ? nextGame.playoffRoundName?.toUpperCase()
                  : `WEEK ${save.week} OF ${save.totalWeeks}`}
                {' · '}
                {eraLabel}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-1">
                {myTeamRank.hasGames && (
                  <span className="font-pixel text-lg text-[#fde047] mr-2">#{myTeamRank.rank}</span>
                )}
                {myTeam.name} ({myRow.wins}-{myRow.losses})
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCycleDriveDirection}
                className="rb-btn-slate px-3 py-1.5 font-pixel text-[9px]"
                title="Drive Direction: Both (switches each quarter), Right, or Left"
              >
                DIR: {save.driveDirection ?? 'BOTH'}
              </button>
              <button
                type="button"
                onClick={handleCycleQuarterLength}
                className="rb-btn-slate px-3 py-1.5 font-pixel text-[9px]"
                title="Change Quarter Length (2:00 / 2:30 / 3:00)"
              >
                QTR: {curQtrLen === 2.5 ? '2:30' : `${curQtrLen}:00`}
              </button>
              <button
                type="button"
                onClick={handleCycleUniform}
                className="rb-btn-slate px-3 py-1.5 font-pixel text-[9px]"
              >
                KIT: {save.uniformChoice.toUpperCase()}
              </button>
            </div>
          </div>

          {nextGame && oppTeam ? (
            <div className="rb-panel-inset p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <PixelJerseyPreview
                  uniform={activeUni}
                  jerseyNumber={save.player.jersey}
                  skinTone={save.player.skinTone}
                  position={save.player.position}
                  size={74}
                  animate
                />
                <div>
                  <div className="font-pixel text-[9px] text-slate-400 flex items-center gap-2">
                    {(() => {
                      const venueTeam = nextGame.isHome ? myTeam : oppTeam;
                      const wm = getWeatherMeta(nextGame.weather, venueTeam.roof === 1);
                      return (
                        <>
                          <RetroSprite name="spr_weather" frame={wm.sprWeatherFrame} scale={2} />
                          <span>{nextGame.isHome ? 'HOME' : 'AWAY'} ·</span>
                          <span className={wm.badgeClass}>{wm.label}</span>
                          <span className="hidden sm:inline text-slate-500 font-sans text-[11px]">
                            ({wm.impactNote})
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <div className="font-display text-2xl font-bold text-white mt-1">
                    {nextGame.isHome ? 'vs' : '@'}{' '}
                    {oppTeamRank?.hasGames ? `#${oppTeamRank.rank} ` : ''}
                    {oppTeam.name}
                  </div>
                  <div className="text-xs font-mono-num text-slate-400 mt-0.5">
                    Opp ({oppTeamRank?.wins}-{oppTeamRank?.losses}): OFF {oppTeam.offense} / DEF {oppTeam.defense} · {oppTeam.city}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!!save.pendingDilemma}
                onClick={() => {
                  retroAudio.play('click');
                  onPlayGame();
                }}
                className="rb-btn-green inline-flex items-center gap-2 px-6 py-3 disabled:opacity-40 font-pixel text-[10px] whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {save.pendingDilemma ? 'RESOLVE DILEMMA' : 'PLAY GAME'}
              </button>
            </div>
          ) : (
            <div className="rb-panel-inset p-5 text-sm text-slate-300">
              Regular season complete. Check postseason or offseason status.
            </div>
          )}

          {/* Classic Retro Bowl Dilemma Dialog */}
          {save.pendingDilemma && (
            <div className="bg-[#0b1322] border-4 border-[#facc15] shadow-[0_6px_0_#05080f] overflow-hidden">
              <div className="bg-[#182742] border-b-2 border-[#364b6e] px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RetroSprite
                    name={
                      save.pendingDilemma.category === 'COACH'
                        ? 'spr_coach'
                        : save.pendingDilemma.category === 'MEDIA'
                          ? 'spr_fans'
                          : save.pendingDilemma.category === 'ACADEMICS'
                            ? 'spr_gpa'
                            : 'spr_attitude'
                    }
                    frame={0}
                    scale={1.5}
                  />
                  <span className="font-pixel text-[10px] text-[#fde047]">
                    RETRO BOWL DILEMMA · {save.pendingDilemma.category.replace('_', ' ')}
                  </span>
                </div>
                <span className="font-pixel text-[9px] text-slate-400">DECISION REQUIRED</span>
              </div>

              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <PixelPortrait
                    skinTone={save.player.skinTone}
                    hairColor={save.player.hairColor}
                    faceStyle={save.player.faceStyle + 2}
                    jerseyColor={myTeam.uniforms.home.shirt}
                    sleeveColor={myTeam.uniforms.home.sleeve}
                    helmetColor={myTeam.uniforms.home.helmet}
                    size={58}
                    isCoach={save.pendingDilemma.category === 'COACH'}
                    coachIndex={0}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-pixel text-xs text-white leading-snug">
                      {save.pendingDilemma.title.toUpperCase()}
                    </div>
                    <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">
                      {save.pendingDilemma.prompt}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {save.pendingDilemma.choices.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleResolveDilemma(c)}
                      className={`${idx === 0 ? 'rb-btn-green' : 'rb-btn-slate'} p-3.5 text-left`}
                    >
                      <div className="font-pixel text-[10px] text-white">{c.label.toUpperCase()}</div>
                      <div className="text-xs text-[#fde047] font-semibold mt-1">{c.summary}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!save.pendingDilemma && dilemmaFeedback && (
            <div className="bg-[#0e2618] border-2 border-[#22c55e] px-4 py-3 text-xs text-emerald-200 flex items-center justify-between gap-2">
              <span>{dilemmaFeedback}</span>
              <button
                type="button"
                onClick={() => setDilemmaFeedback(null)}
                className="text-emerald-300 font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Player Card & XP / Attributes (5 cols) */}
        <div className="lg:col-span-5 rb-panel p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <PixelPortrait
              skinTone={save.player.skinTone}
              hairColor={save.player.hairColor}
              faceStyle={save.player.faceStyle}
              jerseyColor={activeUni.shirt}
              sleeveColor={activeUni.sleeve}
              helmetColor={activeUni.helmet}
              jerseyNumber={save.player.jersey}
              size={64}
            />
            <div className="min-w-0 flex-1">
              <div className="font-display text-2xl font-bold text-white truncate">
                {save.player.firstName} {save.player.lastName}
              </div>
              <div className="text-xs text-slate-300">
                {save.player.position} · Jersey #{save.player.jersey} · {save.player.archetype}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <RetroSprite name="spr_star_rating_b" frame={starFrame} scale={2} alt="Star rating" />
                <span className="font-mono-num text-xs text-[#fde047]">
                  Lvl {save.player.level}
                </span>
                <span className="font-pixel text-[8px] px-1.5 py-0.5 bg-[#0e1624] border border-[#364b6e] text-[#4ade80]">
                  #{playerRank.rank}/{playerRank.poolSize} {playerRank.label.toUpperCase()}
                </span>
                <span className="font-pixel text-[8px] px-1.5 py-0.5 bg-[#0e1624] border border-[#eab308]/50 text-[#fde047]">
                  LEGACY {legacyScore.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {hasLifestyleBuffs && (
            <div className="rb-panel-inset px-3 py-2 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1 border-[#38bdf8]/40">
              <span className="font-pixel text-[8px] text-[#38bdf8]">LIFESTYLE PERKS:</span>
              {perks.attrBoost.speed > 0 && <span className="text-emerald-300">+{perks.attrBoost.speed} SPD</span>}
              {perks.attrBoost.strength > 0 && <span className="text-emerald-300">+{perks.attrBoost.strength} STR</span>}
              {perks.attrBoost.stamina > 0 && <span className="text-emerald-300">+{perks.attrBoost.stamina} STA</span>}
              {perks.attrBoost.skill > 0 && <span className="text-emerald-300">+{perks.attrBoost.skill} SKL</span>}
              {perks.xpBonusPct > 0 && <span className="text-[#fde047]">+{perks.xpBonusPct}% XP</span>}
              {perks.conditionRegenBonus > 0 && <span className="text-sky-300">+{perks.conditionRegenBonus}% Recov</span>}
              {perks.weeklyNetUpkeep < 0 && (
                <span className="text-[#4ade80]">+${Math.abs(perks.weeklyNetUpkeep).toLocaleString()}/wk Passive</span>
              )}
            </div>
          )}

          {/* High School Recruiting Stock Banner */}
          {hsRecruiting && (
            <div className="rb-panel-inset px-3.5 py-2.5 flex items-center justify-between gap-3 border-[#eab308]/50">
              <div>
                <div className="font-pixel text-[8px] text-[#fde047]">COLLEGE RECRUITING STOCK</div>
                <div className="text-xs font-bold text-white mt-0.5">{hsRecruiting.tierLabel}</div>
                <div className="text-[11px] text-slate-400">
                  {hsRecruiting.highlightsSummary || 'Play varsity snaps to build film'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-pixel text-sm text-[#4ade80] tabular-nums">{hsRecruiting.score}</div>
                <div className="text-[10px] text-slate-400">GRADE</div>
              </div>
            </div>
          )}

          {/* Condition / Morale / XP */}
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <MeterBox
              label="Condition"
              value={`${save.player.condition}%`}
              pct={save.player.condition}
              color="bg-emerald-500"
              icon={<RetroSprite name="spr_condition" frame={0} scale={2} />}
            />
            <MeterBox
              label="Morale"
              value={`${save.player.morale}% (${moraleMeta.label})`}
              pct={save.player.morale}
              color="bg-sky-400"
              icon={<RetroSprite name="spr_attitude" frame={moraleMeta.frame} scale={1.8} />}
            />
            <MeterBox
              label="XP"
              value={`${save.player.xp}/${save.player.xpToNext}`}
              pct={Math.round((save.player.xp / save.player.xpToNext) * 100)}
              color="bg-amber-400"
              icon={<RetroSprite name="spr_xp" frame={0} scale={2} />}
            />
          </div>

          {/* Attributes with Skill Point upgrades & Weekly Drill Progress */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Build Your Player</span>
              <span className="font-pixel text-[9px] text-[#fde047]">
                {save.player.skillPoints} PT{save.player.skillPoints === 1 ? '' : 'S'} READY
              </span>
            </div>
            {(
              [
                { key: 'skill', label: getSkillLabel(save.player.position) },
                { key: 'speed', label: 'Speed' },
                { key: 'strength', label: 'Strength' },
                { key: 'stamina', label: 'Stamina' },
              ] as const
            ).map(({ key, label }) => {
              const cur = save.player.attributes[key];
              const max = save.player.maxAttributes[key];
              const drillPct = save.player.trainingProgress?.[key] ?? 0;
              const canUpgrade = save.player.skillPoints > 0 && cur < max;
              const isFocused = trainingFocus === key;
              return (
                <div key={key} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        retroAudio.play('click');
                        setTrainingFocus(key);
                      }}
                      className={`text-left text-xs w-24 truncate px-1.5 py-0.5 border ${
                        isFocused
                          ? 'bg-[#1b2b44] border-[#fde047] text-[#fde047] font-bold'
                          : 'border-transparent text-slate-300 hover:text-white'
                      }`}
                      title="Select as Weekly Training Focus"
                    >
                      {label}
                    </button>
                    <div className="flex gap-1 flex-1">
                      {Array.from({ length: 10 }).map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-2.5 flex-1 ${
                            idx < cur ? 'bg-[#eab308]' : idx < max ? 'bg-[#2a3b57]' : 'bg-[#0b101b]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono-num text-[10px] text-slate-400 w-8 text-right">
                      {cur}/{max}
                    </span>
                    <button
                      type="button"
                      disabled={!canUpgrade}
                      onClick={() => handleUpgradeAttr(key)}
                      className="p-1 text-[#fde047] hover:bg-[#24344d] disabled:opacity-20"
                      aria-label={`Upgrade ${label}`}
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                    </button>
                  </div>
                  {cur < max && (
                    <div className="flex items-center gap-2 pl-24 pr-10">
                      <div className="flex-1 h-1 bg-[#0b101b] overflow-hidden">
                        <div className="h-full bg-[#38bdf8]" style={{ width: `${Math.min(100, drillPct)}%` }} />
                      </div>
                      <span className="font-mono-num text-[9px] text-sky-400">{drillPct}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {trainingNotice && (
            <div className="rb-panel-inset px-3 py-2 text-[11px] text-[#4ade80]">
              {trainingNotice}
            </div>
          )}

          {/* Weekly Actions */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t-2 border-[#24344d]">
            <button
              type="button"
              disabled={save.weeklyTrainingDone}
              onClick={handleExtraPractice}
              className="rb-btn-slate py-2 px-2 disabled:opacity-40 text-xs font-bold"
              title="Click a stat label above to focus weekly training drills"
            >
              {save.weeklyTrainingDone
                ? 'Drilled'
                : `Train ${trainingFocus === 'skill' ? getSkillLabel(save.player.position) : trainingFocus.charAt(0).toUpperCase() + trainingFocus.slice(1)}`}
            </button>
            <button
              type="button"
              disabled={save.weeklyMeetingDone}
              onClick={handleMeetTeammates}
              className="rb-btn-slate py-2 px-2 disabled:opacity-40 text-xs font-bold inline-flex items-center justify-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              {save.weeklyMeetingDone ? 'Bonded' : 'Bond Squad'}
            </button>
            <button
              type="button"
              onClick={handleDrinkNRG}
              className="rb-btn-green py-2 px-2 text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <RetroSprite name="spr_nrg" frame={0} scale={1.5} />
              <span>{save.player.nrgDrinks > 0 ? `NRG (${save.player.nrgDrinks})` : `$${NRG_DRINK_PRICE} NRG`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Split: Relationships + Locker Room News */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rb-panel p-5 flex flex-col gap-3">
          <h2 className="font-pixel text-[10px] text-[#fde047]">RELATIONSHIPS & STANDING</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <RelItem label="Head Coach Trust" value={`${save.player.relationships.coach}%`} status={statusText(save.player.relationships.coach)} />
            <RelItem label="Teammate Chemistry" value={`${save.player.relationships.teammates}%`} status={statusText(save.player.relationships.teammates)} />
            <RelItem label="Fan & Media Buzz" value={`${save.player.relationships.fans}%`} status={statusText(save.player.relationships.fans)} />
            {save.era === 'NFL' ? (
              <RelItem label="Agent Leverage" value={`${save.player.relationships.agent}%`} status={statusText(save.player.relationships.agent)} />
            ) : (
              <RelItem label="Academic GPA" value={save.player.relationships.gpa.toFixed(2)} status={save.player.relationships.gpa >= 2.2 ? 'NCAA Eligible' : 'At Risk'} />
            )}
          </div>
          <div className="pt-2 border-t-2 border-[#24344d] flex items-center justify-between text-xs text-slate-300">
            <span>Cash: <strong className="font-mono-num text-[#4ade80]">${save.player.cash.toLocaleString()}</strong></span>
            <span>
              {save.era === 'HIGH_SCHOOL'
                ? 'Varsity Amateur'
                : save.era === 'COLLEGE'
                  ? `NIL: $${save.player.contract.salaryPerYear.toLocaleString()}/yr`
                  : `Contract: $${(save.player.contract.salaryPerYear / 1000000).toFixed(1)}M/yr (${save.player.contract.yearsLeft}y)`}
            </span>
          </div>
        </div>

        <div className="lg:col-span-7 rb-panel p-5 flex flex-col gap-3">
          <h2 className="font-pixel text-[10px] text-[#fde047]">AROUND THE LEAGUE</h2>
          <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1">
            {save.newsFeed.map((item) => (
              <div key={item.id} className="border-b border-[#24344d] pb-2 last:border-b-0">
                <div className="text-xs font-semibold text-white">
                  <span className="font-pixel text-[9px] text-[#fde047] mr-2">WK {item.week}</span>
                  {item.headline}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function clamp100(v: number) {
  return Math.max(0, Math.min(100, v));
}

function statusText(val: number) {
  if (val >= 85) return 'Exceptional';
  if (val >= 70) return 'Strong';
  if (val >= 50) return 'Steady';
  return 'Strained';
}

const MeterBox: React.FC<{
  label: string;
  value: string;
  pct: number;
  color: string;
  icon?: React.ReactNode;
}> = ({ label, value, pct, color, icon }) => (
  <div className="rb-panel-inset p-2.5">
    <div className="flex items-center justify-between gap-1">
      <span className="text-[11px] text-slate-400">{label}</span>
      {icon}
    </div>
    <div className="font-mono-num text-sm font-bold text-white mt-0.5">{value}</div>
    <div className="w-full h-1.5 bg-[#1d2b42] mt-1.5 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  </div>
);

const RelItem: React.FC<{ label: string; value: string; status: string }> = ({ label, value, status }) => (
  <div className="rb-panel-inset p-3">
    <div className="text-slate-400">{label}</div>
    <div className="font-mono-num text-base font-bold text-white mt-0.5">
      {value} <span className="text-xs font-normal text-slate-400">· {status}</span>
    </div>
  </div>
);
