import React, { useEffect, useMemo, useState } from 'react';
import { CareerSave, OfferOption } from '../../types/career';
import { getTeamById } from '../../data/teams';
import {
  DraftBoardPick,
  evaluateCollegeDraftStock,
  evaluateHighSchoolRecruiting,
  generateDraftOrderBoard,
  startNextSeasonSameTeam,
} from '../../engine/careerEngine';
import { PixelJerseyPreview } from '../shared/PixelJerseyPreview';
import { RetroSprite } from '../shared/RetroSprite';
import { retroAudio } from '../../audio/retroAudio';

interface OffseasonViewProps {
  save: CareerSave;
  onUpdateSave: (next: CareerSave) => void;
  onReturnHome: () => void;
}

export const OffseasonView: React.FC<OffseasonViewProps> = ({
  save,
  onUpdateSave,
  onReturnHome,
}) => {
  // Interactive Combine Drill state
  const [combineReps, setCombineReps] = useState(0);
  const [combineClicks, setCombineClicks] = useState(0);
  const [combineActive, setCombineActive] = useState(false);

  // Retro Bowl Higher/Lower Contract Negotiation minigame
  const [negTarget, setNegTarget] = useState<number>(() => Math.floor(Math.random() * 11) + 1);
  const [negCurrent, setNegCurrent] = useState<number>(() => Math.floor(Math.random() * 11) + 1);
  const [negMsg, setNegMsg] = useState<string>('Agent Challenge: Guess if the hidden league comp number (1-11) is Higher or Lower to boost your contract!');
  const [negBonusPct, setNegBonusPct] = useState<number>(0);
  const [negDone, setNegDone] = useState(false);

  // Pick-by-pick NFL Draft War Room state
  const [draftPickIdx, setDraftPickIdx] = useState<number>(1);
  const [draftRoundTab, setDraftRoundTab] = useState<number>(1);
  const [draftAuto, setDraftAuto] = useState<boolean>(false);
  const [draftReport, setDraftReport] = useState<string>('');

  const draftBoard: DraftBoardPick[] = useMemo(() => {
    if (save.phase !== 'NFL_DRAFT_DAY' || !save.draftInfo) return [];
    return generateDraftOrderBoard(save, save.draftInfo);
  }, [save]);

  const isOnTheClockUser =
    save.phase === 'NFL_DRAFT_DAY' && !!save.draftInfo && draftPickIdx >= save.draftInfo.pick;

  useEffect(() => {
    if (save.phase !== 'NFL_DRAFT_DAY' || !save.draftInfo || !draftAuto || isOnTheClockUser) {
      return;
    }
    const timer = setInterval(() => {
      setDraftPickIdx((prev) => {
        const target = save.draftInfo!.pick;
        const nextVal = Math.min(target, prev + 1);
        const nextRd = Math.floor((nextVal - 1) / 32) + 1;
        setDraftRoundTab(nextRd);
        if (nextVal >= target) {
          retroAudio.play('starrating');
        } else {
          retroAudio.play('click', 0.25);
        }
        return nextVal;
      });
    }, 320);
    return () => clearInterval(timer);
  }, [save.phase, save.draftInfo, draftAuto, isOnTheClockUser]);

  const acceptCollegeOffer = (offer: OfferOption) => {
    retroAudio.play('starrating');
    const next = startNextSeasonSameTeam(save, offer.teamId, 'COLLEGE');
    next.player.contract = {
      salaryPerYear: offer.salaryOrNil,
      tdBonus: offer.tdBonus,
      yearsLeft: offer.years,
      role: offer.role,
      nilDeals: ['Campus Collective NIL'],
    };
    next.newsFeed.unshift({
      id: `sign_${Date.now()}`,
      week: 1,
      headline: `SIGNED: ${save.player.firstName} ${save.player.lastName} Commits to ${getTeamById(offer.teamId).name}`,
      body: `National Signing Day shockwave as the ${save.player.recruitingStars}-star ${save.player.position} signs with ${getTeamById(offer.teamId).name}.`,
    });
    onUpdateSave(next);
  };

  const stayInCollege = () => {
    retroAudio.play('click');
    const next = startNextSeasonSameTeam(save);
    onUpdateSave(next);
  };

  const enterCombine = () => {
    retroAudio.play('beep2');
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    next.phase = 'NFL_COMBINE';
    onUpdateSave(next);
  };

  const runCombineDrill = () => {
    if (combineActive) {
      setCombineClicks((c) => c + 1);
      retroAudio.play('click', 0.4);
      return;
    }
    setCombineActive(true);
    setCombineClicks(1);
    setTimeout(() => {
      setCombineActive(false);
      setCombineReps((r) => r + 1);
      retroAudio.play('success');
    }, 2600);
  };

  const submitCombineToDraft = () => {
    const evalStock = evaluateCollegeDraftStock(save, combineClicks);
    retroAudio.play('brass1', 0.7);
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    next.phase = 'NFL_DRAFT_DAY';
    next.combineScore = {
      fortyYard: evalStock.fortyYard,
      benchReps: evalStock.benchReps,
      shuttle: evalStock.shuttle,
      draftRoundProj: evalStock.round,
    };
    next.draftInfo = {
      round: evalStock.round,
      pick: evalStock.overall,
      teamId: evalStock.teamId,
    };
    setDraftPickIdx(1);
    setDraftRoundTab(1);
    setDraftAuto(false);
    setDraftReport(evalStock.report);
    onUpdateSave(next);
  };

  const acceptDraftSelection = () => {
    if (!save.draftInfo) return;
    retroAudio.play('starrating');
    const draftTeam = getTeamById(save.draftInfo.teamId);
    const salary = Math.max(950000, Math.round((8 - save.draftInfo.round) * 1250000));
    const next = startNextSeasonSameTeam(save, draftTeam.id, 'NFL');
    next.player.contract = {
      salaryPerYear: salary,
      tdBonus: 15000 + (8 - save.draftInfo.round) * 4000,
      yearsLeft: 4,
      role: save.draftInfo.round <= 2 ? 'Starter' : 'Backup',
      nilDeals: [],
    };
    next.newsFeed.unshift({
      id: `draft_${Date.now()}`,
      week: 1,
      headline: `NFL DRAFT: ${draftTeam.name} Select ${save.player.position} ${save.player.lastName} (#${save.draftInfo.pick} Overall)`,
      body: `Round ${save.draftInfo.round}, Pick ${save.draftInfo.pick}. Rookie deal: $${(salary / 1000000).toFixed(2)}M/yr for 4 years.`,
    });
    onUpdateSave(next);
  };

  const guessContract = (dir: 'HIGHER' | 'LOWER') => {
    if (negDone) return;
    const win =
      (dir === 'HIGHER' && negTarget >= negCurrent) ||
      (dir === 'LOWER' && negTarget <= negCurrent);
    if (win) {
      retroAudio.play('success');
      setNegBonusPct(20);
      setNegMsg(`Correct! Number was ${negTarget}. Your agent secured +20% on all offers!`);
    } else {
      retroAudio.play('error');
      setNegMsg(`Missed — hidden number was ${negTarget}. Standard market offers remain.`);
    }
    setNegDone(true);
    setNegCurrent(negTarget);
    setNegTarget(Math.floor(Math.random() * 11) + 1);
  };

  const acceptNflOffer = (offer: OfferOption) => {
    retroAudio.play('starrating');
    const salary = Math.round(offer.salaryOrNil * (1 + negBonusPct / 100));
    const next = startNextSeasonSameTeam(save, offer.teamId, 'NFL');
    next.player.contract = {
      salaryPerYear: salary,
      tdBonus: offer.tdBonus,
      yearsLeft: offer.years,
      role: offer.role,
      nilDeals: [],
    };
    onUpdateSave(next);
  };

  const reSignCurrentNfl = () => {
    retroAudio.play('starrating');
    const salary = Math.round(
      Math.max(2000000, save.player.starRating * 5500000) * (1 + negBonusPct / 100)
    );
    const next = startNextSeasonSameTeam(save);
    next.player.contract = {
      salaryPerYear: salary,
      tdBonus: 30000,
      yearsLeft: 3,
      role: 'Franchise Star',
      nilDeals: [],
    };
    onUpdateSave(next);
  };

  const retireToHallOfFame = () => {
    retroAudio.play('brass1', 0.8);
    const next: CareerSave = JSON.parse(JSON.stringify(save));
    next.era = 'RETIRED';
    next.phase = 'HALL_OF_FAME';
    onUpdateSave(next);
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-8 flex flex-col gap-6">
      {save.phase === 'OFFSEASON_RECRUITING' && (() => {
        const hsEval = evaluateHighSchoolRecruiting(save);
        return (
        <div className="flex flex-col gap-5">
          <div className="border-b-2 border-[#24344d] pb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-pixel text-[10px] text-[#fde047]">NATIONAL SIGNING DAY</div>
              <h1 className="font-display text-4xl font-extrabold text-white mt-1">
                Choose Your College Program
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                {hsEval.productionNote}
              </p>
            </div>
            <div className="rb-panel px-4 py-3 flex items-center gap-4">
              <div>
                <div className="font-pixel text-[8px] text-[#fde047]">HS SCOUTING GRADE</div>
                <div className="font-display text-2xl font-bold text-white">{hsEval.tierLabel}</div>
              </div>
              <div className="text-right">
                <div className="font-pixel text-xl text-[#4ade80] tabular-nums">{hsEval.score}</div>
                <div className="text-[10px] text-slate-400">GPA {save.player.relationships.gpa.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {save.pendingOffers.map((off) => {
              const t = getTeamById(off.teamId);
              return (
                <div key={off.id} className="rb-panel p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <PixelJerseyPreview
                      uniform={t.uniforms.home}
                      jerseyNumber={save.player.jersey}
                      skinTone={save.player.skinTone}
                      position={save.player.position}
                      size={66}
                    />
                    <div>
                      <div className="font-pixel text-[9px] text-[#fde047] flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-[#0e1624] border border-[#364b6e] text-[#7dd3fc]">
                          {t.subdivision ?? 'FBS'}
                        </span>
                        <span>{t.conference}</span>
                        <RetroSprite name="spr_star_rating_b" frame={Math.max(1, Math.min(10, t.prestige * 2))} scale={1} />
                      </div>
                      <div className="font-display text-2xl font-bold text-white mt-0.5">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.city}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300">
                    {off.pitch} · NIL Est. <strong className="font-mono-num text-[#4ade80]">${off.salaryOrNil.toLocaleString()}/yr</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => acceptCollegeOffer(off)}
                    className="rb-btn-gold w-full py-2.5 font-pixel text-[9px]"
                  >
                    SIGN LETTER OF INTENT
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {save.phase === 'OFFSEASON_PORTAL_OR_DRAFT' && (
        <div className="flex flex-col gap-6">
          <div className="border-b-2 border-[#24344d] pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-pixel text-[10px] text-[#fde047]">COLLEGE OFFSEASON · YEAR {save.eraYear}</div>
              <h1 className="font-display text-4xl font-extrabold text-white mt-1">
                Return, Enter Transfer Portal, or Declare for NFL Draft
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={stayInCollege}
                className="rb-btn-slate px-4 py-2.5 text-xs font-bold"
              >
                Return to {getTeamById(save.teamId).shortName}
              </button>
              {save.eraYear >= 3 && (
                <button
                  type="button"
                  onClick={enterCombine}
                  className="rb-btn-green px-5 py-2.5 font-pixel text-[9px]"
                >
                  DECLARE FOR NFL DRAFT
                </button>
              )}
            </div>
          </div>

          <div>
            <h2 className="font-pixel text-[10px] text-[#fde047] mb-3">TRANSFER PORTAL OFFERS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {save.pendingOffers.map((off) => {
                const t = getTeamById(off.teamId);
                return (
                  <div key={off.id} className="rb-panel p-5 flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <PixelJerseyPreview
                        uniform={t.uniforms.home}
                        jerseyNumber={save.player.jersey}
                        skinTone={save.player.skinTone}
                        position={save.player.position}
                        size={60}
                      />
                      <div>
                        <div className="text-xs text-[#fde047] flex items-center gap-1.5">
                          <span className="px-1 py-0.5 bg-[#0e1624] border border-[#364b6e] text-[#7dd3fc] text-[10px]">
                            {t.subdivision ?? 'FBS'}
                          </span>
                          <span>{t.conference}</span>
                        </div>
                        <div className="font-display text-xl font-bold text-white mt-0.5">{t.name}</div>
                        <div className="text-xs text-[#4ade80] font-mono-num">NIL: ${off.salaryOrNil.toLocaleString()}/yr</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => acceptCollegeOffer(off)}
                      className="rb-btn-gold w-full py-2 font-pixel text-[9px]"
                    >
                      TRANSFER TO {t.shortName}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {save.phase === 'NFL_COMBINE' && (
        <div className="rb-panel p-8 flex flex-col items-center text-center gap-5">
          <div className="font-pixel text-[10px] text-[#fde047]">INDIANAPOLIS · NFL SCOUTING COMBINE</div>
          <h1 className="font-display text-4xl font-extrabold text-white">
            40-Yard Dash & Shuttle Burst Drill
          </h1>
          <p className="text-sm text-slate-300 max-w-md">
            Tap the Sprint button as fast as possible for 2.6 seconds to maximize your Combine workout and climb the NFL Draft board!
          </p>
          <div className="font-pixel text-3xl text-[#fde047] tabular-nums">
            {combineClicks} <span className="text-xs text-slate-400">BURST PTS</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!combineActive && combineReps > 0}
              onClick={runCombineDrill}
              className="rb-btn-gold px-7 py-3.5 disabled:opacity-40 font-pixel text-[10px]"
            >
              {combineActive ? 'TAP FAST!' : combineReps > 0 ? 'DRILL COMPLETE' : 'START COMBINE DRILL'}
            </button>
            {combineReps > 0 && !combineActive && (
              <button
                type="button"
                onClick={submitCombineToDraft}
                className="rb-btn-green px-6 py-3.5 font-pixel text-[10px]"
              >
                HEAD TO NFL DRAFT DAY
              </button>
            )}
          </div>
        </div>
      )}

      {save.phase === 'NFL_DRAFT_DAY' && save.draftInfo && (
        <div className="flex flex-col gap-6">
          <div className="rb-panel p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-pixel text-[10px] text-[#fde047]">
                NFL DRAFT LIVE BOARD · PROJ. ROUND {save.draftInfo.round}
              </div>
              <h1 className="font-display text-4xl font-extrabold text-white mt-1">
                {isOnTheClockUser
                  ? 'THE PICK IS IN!'
                  : `On The Clock: Pick #${draftPickIdx} (Round ${Math.floor((draftPickIdx - 1) / 32) + 1})`}
              </h1>
            </div>

            {!isOnTheClockUser && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.play('click');
                    const nextVal = Math.min(save.draftInfo!.pick, draftPickIdx + 1);
                    setDraftPickIdx(nextVal);
                    setDraftRoundTab(Math.floor((nextVal - 1) / 32) + 1);
                    if (nextVal >= save.draftInfo!.pick) retroAudio.play('starrating');
                  }}
                  className="rb-btn-slate px-4 py-2.5 font-pixel text-[9px]"
                >
                  NEXT PICK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.play('click');
                    setDraftAuto((v) => !v);
                  }}
                  className={`${draftAuto ? 'rb-btn-green' : 'rb-btn-slate'} px-4 py-2.5 font-pixel text-[9px]`}
                >
                  {draftAuto ? 'PAUSE SIM' : 'AUTO-ADVANCE'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.play('starrating');
                    setDraftAuto(false);
                    setDraftPickIdx(save.draftInfo!.pick);
                    setDraftRoundTab(save.draftInfo!.round);
                  }}
                  className="rb-btn-gold px-5 py-2.5 font-pixel text-[9px]"
                >
                  SKIP TO MY PICK
                </button>
              </div>
            )}
          </div>

          {isOnTheClockUser && (
            <div className="rb-panel p-8 flex flex-col items-center text-center gap-5 border-[#fde047]">
              <div className="font-pixel text-[10px] text-[#fde047]">
                THE PICK IS IN · ROUND {save.draftInfo.round} · PICK #{save.draftInfo.pick} OVERALL
              </div>
              <PixelJerseyPreview
                uniform={getTeamById(save.draftInfo.teamId).uniforms.home}
                jerseyNumber={save.player.jersey}
                skinTone={save.player.skinTone}
                position={save.player.position}
                size={96}
                animate
              />
              <h2 className="font-display text-4xl font-extrabold text-white">
                {getTeamById(save.draftInfo.teamId).name}
              </h2>
              {draftReport && (
                <p className="text-sm text-emerald-300 max-w-lg">{draftReport}</p>
              )}
              {save.combineScore && (
                <div className="text-xs font-mono-num text-slate-300">
                  Combine: {save.combineScore.fortyYard}s 40-Yd · {save.combineScore.benchReps} Bench Reps · {save.combineScore.shuttle}s Shuttle
                </div>
              )}
              <button
                type="button"
                onClick={acceptDraftSelection}
                className="rb-btn-gold px-7 py-3.5 font-pixel text-[10px]"
              >
                SIGN ROOKIE CONTRACT
              </button>
            </div>
          )}

          {/* Pick-by-Pick Draft Ticker & Round View */}
          <div className="rb-panel p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#24344d] pb-3">
              <div className="font-pixel text-[10px] text-[#fde047]">DRAFT TRACKER (ROUNDS 1-7)</div>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((rd) => (
                  <button
                    key={rd}
                    type="button"
                    onClick={() => setDraftRoundTab(rd)}
                    className={`px-3 py-1 font-pixel text-[9px] border-2 ${
                      draftRoundTab === rd
                        ? 'bg-[#eab308] text-slate-950 border-[#fde047]'
                        : 'bg-[#0e1624] text-slate-300 border-[#24344d]'
                    }`}
                  >
                    RD {rd}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {draftBoard
                .filter((p) => p.round === draftRoundTab)
                .map((p) => {
                  const tm = getTeamById(p.teamId);
                  const announced = p.overall <= draftPickIdx;
                  const showUserBadge = p.isUserPick && announced;
                  return (
                    <div
                      key={p.overall}
                      className={`px-3 py-2 border-2 flex items-center justify-between gap-2 text-xs ${
                        showUserBadge
                          ? 'bg-[#eab308]/20 border-[#fde047] text-white'
                          : p.overall === draftPickIdx
                            ? 'bg-[#1c2b44] border-[#38bdf8] text-white'
                            : 'bg-[#0e1624] border-[#24344d] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono-num text-[11px] text-[#fde047] w-10 shrink-0">
                          #{p.overall}
                        </span>
                        <span
                          className="w-2.5 h-5 border border-white/25 shrink-0"
                          style={{ backgroundColor: tm.uniforms.home.shirt }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold truncate">
                            {tm.shortName} ·{' '}
                            {announced
                              ? p.isUserPick
                                ? `${p.prospectName} (YOU)`
                                : `${p.prospectPos} ${p.prospectName}`
                              : 'On Deck...'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {announced ? `${p.prospectPos} · ${p.prospectSchool}` : `Rd ${p.round}, Pick ${p.pickInRound}`}
                          </div>
                        </div>
                      </div>
                      {showUserBadge && (
                        <span className="font-pixel text-[8px] px-1.5 py-0.5 bg-[#eab308] text-slate-950">
                          YOU
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {save.phase === 'OFFSEASON_FREE_AGENCY' && (
        <div className="flex flex-col gap-6">
          <div className="border-b-2 border-[#24344d] pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-pixel text-[10px] text-[#fde047]">NFL FREE AGENCY</div>
              <h1 className="font-display text-4xl font-extrabold text-white mt-1">
                Contract Negotiation & Offers
              </h1>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={reSignCurrentNfl}
                className="rb-btn-green px-4 py-2.5 font-pixel text-[9px]"
              >
                RE-SIGN WITH {getTeamById(save.teamId).shortName}
              </button>
              <button
                type="button"
                onClick={retireToHallOfFame}
                className="rb-btn-slate px-4 py-2.5 font-pixel text-[9px]"
              >
                HALL OF FAME
              </button>
            </div>
          </div>

          {/* Classic Retro Bowl Higher/Lower Agent Negotiation Minigame */}
          <div className="rb-panel p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-pixel text-[9px] text-[#fde047]">AGENT NEGOTIATION (1-11)</div>
              <div className="text-sm text-slate-200 mt-1">{negMsg}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-pixel text-xl text-white bg-[#0e1624] px-4 py-2 border-2 border-[#2e405d]">
                {negCurrent}
              </div>
              <button
                type="button"
                disabled={negDone}
                onClick={() => guessContract('HIGHER')}
                className="rb-btn-gold px-4 py-2 disabled:opacity-40 font-pixel text-[9px]"
              >
                HIGHER
              </button>
              <button
                type="button"
                disabled={negDone}
                onClick={() => guessContract('LOWER')}
                className="rb-btn-slate px-4 py-2 disabled:opacity-40 font-pixel text-[9px]"
              >
                LOWER
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {save.pendingOffers.map((off) => {
              const t = getTeamById(off.teamId);
              const adjSalary = Math.round(off.salaryOrNil * (1 + negBonusPct / 100));
              return (
                <div key={off.id} className="rb-panel p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <PixelJerseyPreview
                      uniform={t.uniforms.home}
                      jerseyNumber={save.player.jersey}
                      skinTone={save.player.skinTone}
                      position={save.player.position}
                      size={60}
                    />
                    <div>
                      <div className="text-xs text-[#fde047]">{t.division}</div>
                      <div className="font-display text-xl font-bold text-white">{t.name}</div>
                      <div className="text-xs font-mono-num text-[#4ade80]">
                        ${(adjSalary / 1000000).toFixed(2)}M/yr · {off.years} yrs
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => acceptNflOffer(off)}
                    className="rb-btn-gold w-full py-2.5 font-pixel text-[9px]"
                  >
                    SIGN CONTRACT
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {save.phase === 'HALL_OF_FAME' && (
        <div className="rb-panel p-8 flex flex-col items-center text-center gap-5">
          <div className="font-pixel text-[10px] text-[#fde047]">CAREER RETIREMENT · HALL OF FAME</div>
          <h1 className="font-display text-5xl font-extrabold text-white">
            {save.player.firstName} {save.player.lastName} (#{save.player.jersey})
          </h1>
          <p className="text-sm text-slate-300 max-w-lg">
            After {save.seasonNumber} seasons across High School, College, and the NFL, your legacy is cemented in Retro Bowl history with {save.trophies.length} Championship{save.trophies.length === 1 ? '' : 's'}.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl text-sm">
            <div className="rb-panel-inset p-3">
              <div className="text-xs text-slate-400">Games</div>
              <div className="font-mono-num text-2xl font-bold text-white">{save.careerStats.games}</div>
            </div>
            <div className="rb-panel-inset p-3">
              <div className="text-xs text-slate-400">Total Yards</div>
              <div className="font-mono-num text-2xl font-bold text-white">
                {save.careerStats.passYards + save.careerStats.rushYards + save.careerStats.recYards}
              </div>
            </div>
            <div className="rb-panel-inset p-3">
              <div className="text-xs text-slate-400">Total TDs</div>
              <div className="font-mono-num text-2xl font-bold text-[#fde047]">
                {save.careerStats.passTD + save.careerStats.rushTD + save.careerStats.recTD}
              </div>
            </div>
            <div className="rb-panel-inset p-3">
              <div className="text-xs text-slate-400">Championships</div>
              <div className="font-mono-num text-2xl font-bold text-[#4ade80]">{save.trophies.length}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onReturnHome}
            className="rb-btn-gold px-6 py-3 font-pixel text-[10px]"
          >
            START A NEW CAREER
          </button>
        </div>
      )}
    </div>
  );
};
