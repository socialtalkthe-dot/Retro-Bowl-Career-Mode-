import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CareerEra,
  CareerSave,
  ScheduleGame,
  StatLine,
} from '../../types/career';
import { getTeamById } from '../../data/teams';
import { addStats, emptyStats, getTeamRank, POSITIONS } from '../../engine/careerEngine';
import { getWeatherMeta } from '../../engine/weatherEngine';
import { FieldCanvas, PlayOutcome } from './FieldCanvas';
import { RetroDriveOverlay } from './RetroDriveOverlay';
import { RetroSprite } from '../shared/RetroSprite';
import { retroAudio } from '../../audio/retroAudio';
import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';

interface MatchDayViewProps {
  save: CareerSave;
  game: ScheduleGame;
  onSaveMatchResult: (
    myScore: number,
    oppScore: number,
    matchStats: StatLine,
    gameRating: number
  ) => void;
  onFinishGame: (
    myScore: number,
    oppScore: number,
    matchStats: StatLine,
    gameRating: number,
    alreadySaved?: boolean
  ) => void;
  onAbortMatch: () => void;
}

type MatchPhase =
  | 'COIN_TOSS'
  | 'KICKOFF_CHOICE'
  | 'LIVE_FIELD'
  | 'SIM_OTHER_UNIT'
  | 'FOURTH_DOWN_CHOICE'
  | 'HALFTIME'
  | 'GAME_OVER';

export const MatchDayView: React.FC<MatchDayViewProps> = ({
  save,
  game,
  onSaveMatchResult,
  onFinishGame,
  onAbortMatch,
}) => {
  const matchRootRef = useRef<HTMLDivElement | null>(null);
  const autoSavedRef = useRef(false);
  const clockFrozenRef = useRef(false);

  // Snapshot the matchup on mount so saving the game result (which advances save.week)
  // never switches the Scorebug or Final Score screen to next week's opponent.
  const [lockedGame] = useState(() => game);
  const [myTeam] = useState(() => getTeamById(save.teamId));
  const [oppTeam] = useState(() => getTeamById(game.opponentId));
  const [myUniform] = useState(() => getTeamById(save.teamId).uniforms[save.uniformChoice]);
  const [oppUniform] = useState(() => {
    const opp = getTeamById(game.opponentId);
    return game.isHome ? opp.uniforms.away : opp.uniforms.home;
  });
  const [myRank] = useState(() => getTeamRank(save, save.teamId));
  const [oppRank] = useState(() => getTeamRank(save, game.opponentId));
  const venueIsDome = (lockedGame.isHome ? myTeam.roof : oppTeam.roof) === 1;
  const weatherMeta = useMemo(
    () => getWeatherMeta(lockedGame.weather, venueIsDome),
    [lockedGame.weather, venueIsDome]
  );

  const crowdTurnout = useMemo(() => {
    const fanFactor = (save.player.relationships.fans ?? 65) / 100;
    const winPct = myRank.hasGames ? myRank.wins / Math.max(1, myRank.wins + myRank.losses) : 0.6;
    const oppPower = (oppTeam.offense + oppTeam.defense) / 200;
    const eraBase = save.era === 'NFL' ? 0.78 : save.era === 'COLLEGE' ? 0.68 : 0.44;
    const homeBoost = lockedGame.isHome ? 0.12 : -0.02;
    const playoffBoost = lockedGame.isPlayoff ? 0.25 : 0;
    const raw = eraBase + fanFactor * 0.16 + winPct * 0.12 + oppPower * 0.1 + homeBoost + playoffBoost;
    return Math.round(Math.max(0.28, Math.min(1.0, raw)) * 100) / 100;
  }, [
    lockedGame.isHome,
    lockedGame.isPlayoff,
    myRank.hasGames,
    myRank.losses,
    myRank.wins,
    oppTeam.defense,
    oppTeam.offense,
    save.era,
    save.player.relationships.fans,
  ]);

  const posInfo = POSITIONS.find((p) => p.id === save.player.position)!;
  const userUnit = posInfo.unit; // OFFENSE | DEFENSE | SPECIAL
  // 2:30 default quarters give realistic 6-8 possessions per side
  const qtrLenSec = save.quarterLength <= 2 ? 150 : save.quarterLength * 60;
  const maxAudiblesPerHalf = Math.min(5, 3 + Math.floor(save.player.attributes.skill / 4));

  const [quarter, setQuarter] = useState(1);
  const [clockSec, setClockSec] = useState(qtrLenSec);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [myTimeouts, setMyTimeouts] = useState(3);
  const [oppTimeouts, setOppTimeouts] = useState(3);
  const [clockFrozen, setClockFrozen] = useState(false);
  const [possession, setPossession] = useState<'MY' | 'OPP'>('MY');
  const [firstHalfReceiver, setFirstHalfReceiver] = useState<'MY' | 'OPP'>('MY');
  const [ballYard, setBallYard] = useState(25);
  const [down, setDown] = useState(1);
  const [yardsToGo, setYardsToGo] = useState(10);
  const [playMode, setPlayMode] = useState<
    'OFFENSE' | 'DEFENSE' | 'KICK_FG' | 'KICK_PAT' | 'KICK_ONSIDE' | 'KICKOFF' | 'KICK_PUNT'
  >('OFFENSE');
  const [driveDirection, setDriveDirection] = useState<'RIGHT' | 'LEFT' | 'BOTH'>(
    () => save.driveDirection ?? 'BOTH'
  );
  const [kickoffContext, setKickoffContext] = useState<string>('POST-SCORE KICKOFF');
  const [bulletPass, setBulletPass] = useState(false);
  const [audiblesLeft, setAudiblesLeft] = useState(maxAudiblesPerHalf);
  const [matchStats, setMatchStats] = useState<StatLine>(emptyStats());
  const [playLog, setPlayLog] = useState<string[]>(() => [
    `${myTeam.name} vs ${oppTeam.name} at ${myTeam.stadium ?? myTeam.city}.`,
  ]);
  const [phase, setPhase] = useState<MatchPhase>('COIN_TOSS');
  const [playSeed, setPlaySeed] = useState(1);
  const [muted, setMuted] = useState(retroAudio.isMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Coin Toss state
  const [coinStep, setCoinStep] = useState<'PICK' | 'FLIPPING' | 'WON_CHOICE' | 'READY'>('PICK');
  const [coinCall, setCoinCall] = useState<'HEADS' | 'TAILS' | null>(null);
  const [coinLanded, setCoinLanded] = useState<'HEADS' | 'TAILS' | null>(null);
  const [coinSummary, setCoinSummary] = useState<string>('Call Heads or Tails at midfield.');

  // Retro Bowl Sideline Drive Sim state
  const [simTicker, setSimTicker] = useState<string>('Opponent taking the field...');
  const [simHistory, setSimHistory] = useState<string[]>([]);
  const [simSpeed, setSimSpeed] = useState<1 | 2>(1);
  const [simPaused, setSimPaused] = useState<boolean>(false);
  const [simLockTransition, setSimLockTransition] = useState<boolean>(false);

  const myQB = save.roster.find((r) => r.position === 'QB');
  const myRB = save.roster.find((r) => r.position === 'RB');
  const myWR = save.roster.find((r) => r.position === 'WR');
  const defRoster = useMemo(
    () => save.roster.filter((r) => ['DL', 'LB', 'CB', 'S'].includes(r.position)),
    [save.roster]
  );

  useEffect(() => {
    matchRootRef.current?.focus();
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      retroAudio.stopCrowdAmbience();
    };
  }, []);

  useEffect(() => {
    if (phase === 'LIVE_FIELD') {
      matchRootRef.current?.focus();
    } else if (phase === 'HALFTIME') {
      retroAudio.play('timeout', 0.85);
    }
  }, [phase, playSeed]);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement && matchRootRef.current?.requestFullscreen) {
        await matchRootRef.current.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // iFrame environments may restrict native fullscreen; viewport overlay remains full-screen
    }
  };

  const handleCycleDriveDirection = () => {
    retroAudio.play('click', 0.6);
    setDriveDirection((prev) => (prev === 'BOTH' ? 'RIGHT' : prev === 'RIGHT' ? 'LEFT' : 'BOTH'));
  };

  const handleCallTimeout = useCallback(() => {
    if (
      myTimeouts <= 0 ||
      clockFrozenRef.current ||
      phase === 'COIN_TOSS' ||
      phase === 'HALFTIME' ||
      phase === 'GAME_OVER'
    ) {
      return;
    }
    clockFrozenRef.current = true;
    setClockFrozen(true);
    setMyTimeouts((t) => Math.max(0, t - 1));
    retroAudio.play('timeout', 0.9);
    const msg = `TIMEOUT ${myTeam.shortName}! Clock stopped (${myTimeouts - 1} left).`;
    setPlayLog((prev) => [msg, ...prev].slice(0, 14));
    if (phase === 'SIM_OTHER_UNIT') {
      setSimTicker(msg);
      setSimHistory((prev) => [msg, ...prev].slice(0, 10));
    }
  }, [myTeam.shortName, myTimeouts, phase]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyT' && (phase === 'SIM_OTHER_UNIT' || phase === 'FOURTH_DOWN_CHOICE' || phase === 'KICKOFF_CHOICE')) {
        e.preventDefault();
        handleCallTimeout();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCallTimeout, phase]);

  const advanceClock = useCallback(
    (
      secUsed: number,
      curQtr: number,
      curClock: number
    ): { q: number; c: number; ended: boolean; halftime: boolean; enteredOt: boolean } => {
      let c = curClock - secUsed;
      let q = curQtr;
      let halftime = false;
      let enteredOt = false;
      if (c <= 0) {
        if (q === 2) halftime = true;
        q += 1;
        if (q === 5) enteredOt = true;
        c = q <= 4 ? qtrLenSec : 90;
        if (q > 4) {
          return { q, c: 0, ended: true, halftime: false, enteredOt };
        }
      }
      return { q, c, ended: false, halftime, enteredOt };
    },
    [qtrLenSec]
  );

  const shouldOfferKickoffChoice = useCallback(
    (nextQtr: number, curMy: number, curOpp: number) => {
      if (userUnit === 'SPECIAL') return true;
      if (nextQtr === 3 && curMy < curOpp) return true;
      if (nextQtr >= 4 && curMy <= curOpp && curOpp - curMy <= 16) return true;
      return false;
    },
    [userUnit]
  );

  const decideNextPhase = useCallback(
    (
      nextPoss: 'MY' | 'OPP',
      nextYard: number,
      nextDown: number,
      nextQtr: number,
      _nextClock: number,
      currentMyScore: number,
      currentOppScore: number,
      hitHalftime = false
    ) => {
      if (hitHalftime) {
        setPhase('HALFTIME');
        return;
      }
      if (nextQtr > 4 && currentMyScore !== currentOppScore) {
        setPhase('GAME_OVER');
        return;
      }
      if (nextQtr > 5) {
        setPhase('GAME_OVER');
        return;
      }

      const prepDriveFeed = (poss: 'MY' | 'OPP', yd: number) => {
        const teamLabel = poss === 'MY' ? myTeam.shortName : oppTeam.shortName;
        const spot = yd === 50 ? 'midfield' : yd < 50 ? `own ${yd}` : `OPP ${100 - yd}`;
        setSimTicker(`${teamLabel} has it at ${spot}.`);
        setSimHistory([`${teamLabel} takes over at the ${spot}.`]);
        setSimPaused(false);
        setSimLockTransition(false);
      };

      if (userUnit === 'OFFENSE') {
        if (nextPoss === 'MY') {
          if (nextDown === 4) {
            setPhase('FOURTH_DOWN_CHOICE');
          } else {
            setPlayMode('OFFENSE');
            setPhase('LIVE_FIELD');
            setPlaySeed((s) => s + 1);
          }
        } else {
          prepDriveFeed(nextPoss, nextYard);
          setPhase('SIM_OTHER_UNIT');
        }
      } else if (userUnit === 'DEFENSE') {
        if (nextPoss === 'OPP') {
          setPlayMode('DEFENSE');
          setPhase('LIVE_FIELD');
          setPlaySeed((s) => s + 1);
        } else {
          prepDriveFeed(nextPoss, nextYard);
          setPhase('SIM_OTHER_UNIT');
        }
      } else {
        if (nextPoss === 'MY' && nextDown >= 4) {
          setPlayMode(nextYard >= 55 ? 'KICK_FG' : 'KICK_PUNT');
          setPhase('LIVE_FIELD');
          setPlaySeed((s) => s + 1);
        } else {
          prepDriveFeed(nextPoss, nextYard);
          setPhase('SIM_OTHER_UNIT');
        }
      }
    },
    [myTeam.shortName, oppTeam.shortName, userUnit]
  );

  // Coin Toss Handlers
  const handleCoinCall = (pick: 'HEADS' | 'TAILS') => {
    if (coinStep !== 'PICK') return;
    retroAudio.play('beep', 0.8);
    setCoinCall(pick);
    setCoinStep('FLIPPING');
    setCoinSummary(`You called ${pick}... coin is in the air!`);

    setTimeout(() => {
      const result: 'HEADS' | 'TAILS' = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      setCoinLanded(result);
      const userWon = result === pick;
      retroAudio.play(userWon ? 'success' : 'beep2', 0.85);
      if (userWon) {
        setCoinStep('WON_CHOICE');
        setCoinSummary(`It landed ${result}! ${myTeam.shortName} won the toss — Receive or Kick?`);
      } else {
        const oppReceives = Math.random() < 0.78;
        const firstRec: 'MY' | 'OPP' = oppReceives ? 'OPP' : 'MY';
        setFirstHalfReceiver(firstRec);
        setCoinStep('READY');
        setCoinSummary(
          `It landed ${result}. ${oppTeam.shortName} won the toss and elected to ${oppReceives ? 'RECEIVE' : 'DEFER'}.`
        );
      }
    }, 750);
  };

  const handleWonCoinChoice = (choice: 'RECEIVE' | 'KICK') => {
    retroAudio.play('click', 0.85);
    const firstRec: 'MY' | 'OPP' = choice === 'RECEIVE' ? 'MY' : 'OPP';
    setFirstHalfReceiver(firstRec);
    setCoinStep('READY');
    setCoinSummary(
      `${myTeam.shortName} elected to ${choice === 'RECEIVE' ? 'RECEIVE the opening kickoff' : 'KICK & DEFER to the 2nd half'}.`
    );
  };

  const handleKickoffGame = () => {
    retroAudio.unlockAndPreload();
    void retroAudio.startCrowdAmbience();
    if (firstHalfReceiver === 'OPP' && userUnit === 'SPECIAL') {
      setPossession('MY');
      setBallYard(35);
      setDown(1);
      setYardsToGo(10);
      setKickoffContext('OPENING KICKOFF');
      setPlayLog((prev) => [`${myTeam.shortName} lines up for the opening kickoff.`, ...prev]);
      setPhase('KICKOFF_CHOICE');
      return;
    }
    retroAudio.play('kick', 0.9);
    setPossession(firstHalfReceiver);
    setBallYard(25);
    setDown(1);
    setYardsToGo(10);
    setPlayLog((prev) => [
      `Opening Kickoff! ${firstHalfReceiver === 'MY' ? myTeam.shortName : oppTeam.shortName} starts at their 25.`,
      ...prev,
    ]);
    decideNextPhase(firstHalfReceiver, 25, 1, 1, qtrLenSec, 0, 0, false);
  };

  const handleResumeSecondHalf = () => {
    retroAudio.play('beep2');
    setAudiblesLeft(maxAudiblesPerHalf);
    setMyTimeouts(3);
    setOppTimeouts(3);
    clockFrozenRef.current = false;
    setClockFrozen(false);
    const secondHalfPoss: 'MY' | 'OPP' = firstHalfReceiver === 'MY' ? 'OPP' : 'MY';
    if (secondHalfPoss === 'OPP' && userUnit === 'SPECIAL') {
      setPossession('MY');
      setBallYard(35);
      setDown(1);
      setYardsToGo(10);
      setKickoffContext('2ND HALF KICKOFF');
      setPlayLog((prev) => [`${myTeam.shortName} lines up for the 2nd half kickoff.`, ...prev].slice(0, 14));
      setPhase('KICKOFF_CHOICE');
      return;
    }
    setPossession(secondHalfPoss);
    setBallYard(25);
    setDown(1);
    setYardsToGo(10);
    setPlayLog((prev) => [
      `2nd Half Kickoff! ${secondHalfPoss === 'MY' ? myTeam.shortName : oppTeam.shortName} receives.`,
      ...prev,
    ].slice(0, 14));
    decideNextPhase(secondHalfPoss, 25, 1, quarter, clockSec, myScore, oppScore, false);
  };

  const handleKickoffChoice = (choice: 'DEEP' | 'ONSIDE') => {
    retroAudio.play('click', 0.85);
    if (choice === 'ONSIDE') {
      setPossession('MY');
      setBallYard(35);
      setDown(1);
      setYardsToGo(10);
      setPlayMode('KICK_ONSIDE');
      setPhase('LIVE_FIELD');
      setPlaySeed((s) => s + 1);
      return;
    }
    if (userUnit === 'SPECIAL') {
      setPossession('MY');
      setBallYard(35);
      setDown(1);
      setYardsToGo(10);
      setPlayMode('KICKOFF');
      setPhase('LIVE_FIELD');
      setPlaySeed((s) => s + 1);
      return;
    }
    retroAudio.play('kick', 0.85);
    const oppStart = clampYard(20 + Math.floor(Math.random() * 11));
    setPlayLog((prev) => [
      `${myTeam.shortName} boots a deep kickoff! ${oppTeam.shortName} starts at their ${oppStart}.`,
      ...prev,
    ].slice(0, 14));
    setPossession('OPP');
    setBallYard(oppStart);
    setDown(1);
    setYardsToGo(10);
    decideNextPhase('OPP', oppStart, 1, quarter, clockSec, myScore, oppScore, false);
  };

  const handlePlayComplete = (outcome: PlayOutcome) => {
    const updatedStats = addStats(matchStats, outcome.statDelta);
    setMatchStats(updatedStats);
    setPlayLog((prev) => [outcome.commentary, ...prev].slice(0, 14));

    let timeUsed = outcome.clockStopped
      ? 1 + Math.floor(Math.random() * 2)
      : 2 + Math.floor(Math.random() * 3);

    if (clockFrozenRef.current) {
      timeUsed = 0;
      clockFrozenRef.current = false;
      setClockFrozen(false);
    } else if (
      possession === 'MY' &&
      !outcome.clockStopped &&
      !outcome.isTouchdown &&
      !outcome.isTurnover &&
      (quarter === 2 || quarter === 4) &&
      clockSec <= 50 &&
      oppTimeouts > 0 &&
      oppScore <= myScore &&
      myScore - oppScore <= 16
    ) {
      setOppTimeouts((t) => Math.max(0, t - 1));
      timeUsed = 1;
      setPlayLog((prev) => [`TIMEOUT ${oppTeam.shortName}! Stopping the clock.`, ...prev].slice(0, 14));
    }

    const { q, c, ended, halftime, enteredOt } = advanceClock(timeUsed, quarter, clockSec);
    if (enteredOt) {
      setMyTimeouts(1);
      setOppTimeouts(1);
    }
    setQuarter(q);
    setClockSec(c);

    // Handle Kickoff / Punt Return Outcome
    if (outcome.isKickoff || outcome.isPunt) {
      if (outcome.isOppReturnTd) {
        const patGood = Math.random() < 0.94;
        const finalOpp = oppScore + 6 + (patGood ? 1 : 0);
        setOppScore(finalOpp);
        if (ended && myScore !== finalOpp) {
          setPhase('GAME_OVER');
          return;
        }
        setPossession('MY');
        setBallYard(25);
        setDown(1);
        setYardsToGo(10);
        decideNextPhase('MY', 25, 1, q, c, myScore, finalOpp, halftime);
        return;
      }
      if (ended && myScore !== oppScore) {
        setPhase('GAME_OVER');
        return;
      }
      const startYd = clampYard(outcome.returnYard ?? (outcome.isPunt ? 20 : 25));
      setPossession('OPP');
      setBallYard(startYd);
      setDown(1);
      setYardsToGo(10);
      decideNextPhase('OPP', startYd, 1, q, c, myScore, oppScore, halftime);
      return;
    }

    // Handle Onside Kick Outcome
    if (outcome.isOnsideKick) {
      if (ended && myScore !== oppScore) {
        setPhase('GAME_OVER');
        return;
      }
      if (outcome.onsideRecovered) {
        const recYd = clampYard(outcome.recoveredYard ?? 48);
        setPossession('MY');
        setBallYard(recYd);
        setDown(1);
        setYardsToGo(Math.min(10, 100 - recYd));
        decideNextPhase('MY', recYd, 1, q, c, myScore, oppScore, halftime);
      } else {
        const oppYd = clampYard(100 - (outcome.recoveredYard ?? 48));
        setPossession('OPP');
        setBallYard(oppYd);
        setDown(1);
        setYardsToGo(Math.min(10, 100 - oppYd));
        decideNextPhase('OPP', oppYd, 1, q, c, myScore, oppScore, halftime);
      }
      return;
    }

    // Handle Safety (+2 pts to defending team, free kick spot at receiving team's 35)
    if (outcome.isSafety) {
      const defIsMy = possession === 'OPP';
      const newMy = defIsMy ? myScore + 2 : myScore;
      const newOpp = defIsMy ? oppScore : oppScore + 2;
      setMyScore(newMy);
      setOppScore(newOpp);
      if (ended && newMy !== newOpp) {
        setPhase('GAME_OVER');
        return;
      }
      const nextPoss: 'MY' | 'OPP' = defIsMy ? 'MY' : 'OPP';
      setPossession(nextPoss);
      setBallYard(35);
      setDown(1);
      setYardsToGo(10);
      decideNextPhase(nextPoss, 35, 1, q, c, newMy, newOpp, halftime);
      return;
    }

    // Handle Kick Outcome
    if (outcome.isFieldGoal) {
      if (playMode === 'KICK_PAT') {
        const pts = outcome.fgMade ? 1 : 0;
        const newMy = myScore + pts;
        setMyScore(newMy);
        if (ended && newMy !== oppScore) {
          setPhase('GAME_OVER');
          return;
        }
        if (!halftime && shouldOfferKickoffChoice(q, newMy, oppScore)) {
          setKickoffContext('POST-SCORE KICKOFF');
          setPhase('KICKOFF_CHOICE');
          return;
        }
        setPossession('OPP');
        setBallYard(25);
        setDown(1);
        setYardsToGo(10);
        decideNextPhase('OPP', 25, 1, q, c, newMy, oppScore, halftime);
        return;
      } else {
        const pts = outcome.fgMade ? 3 : 0;
        const newMy = myScore + pts;
        setMyScore(newMy);
        if (ended && newMy !== oppScore) {
          setPhase('GAME_OVER');
          return;
        }
        if (outcome.fgMade && !halftime && shouldOfferKickoffChoice(q, newMy, oppScore)) {
          setKickoffContext('POST-SCORE KICKOFF');
          setPhase('KICKOFF_CHOICE');
          return;
        }
        const nextYard = outcome.fgMade ? 25 : Math.max(20, 100 - ballYard);
        setPossession('OPP');
        setBallYard(nextYard);
        setDown(1);
        setYardsToGo(10);
        decideNextPhase('OPP', nextYard, 1, q, c, newMy, oppScore, halftime);
        return;
      }
    }

    // Handle Turnover
    if (outcome.isTurnover) {
      const nextPoss = possession === 'MY' ? 'OPP' : 'MY';
      const nextYard = clampYard(100 - ballYard);
      setPossession(nextPoss);
      setBallYard(nextYard);
      setDown(1);
      setYardsToGo(10);
      if (ended && myScore !== oppScore) {
        setPhase('GAME_OVER');
        return;
      }
      decideNextPhase(nextPoss, nextYard, 1, q, c, myScore, oppScore, halftime);
      return;
    }

    // Handle Touchdown
    if (outcome.isTouchdown) {
      if (possession === 'MY') {
        const tdScore = myScore + 6;
        if (userUnit === 'SPECIAL') {
          setMyScore(tdScore);
          setPlayMode('KICK_PAT');
          setBallYard(85);
          setPhase('LIVE_FIELD');
          setPlaySeed((s) => s + 1);
          return;
        }
        const patGood = Math.random() < 0.94;
        const finalMy = tdScore + (patGood ? 1 : 0);
        setMyScore(finalMy);
        setPlayLog((prev) => [patGood ? 'Extra point is GOOD!' : 'Extra point missed!', ...prev].slice(0, 14));
        if (ended && finalMy !== oppScore) {
          setPhase('GAME_OVER');
          return;
        }
        if (!halftime && shouldOfferKickoffChoice(q, finalMy, oppScore)) {
          setKickoffContext('POST-SCORE KICKOFF');
          setPhase('KICKOFF_CHOICE');
          return;
        }
        setPossession('OPP');
        setBallYard(25);
        setDown(1);
        setYardsToGo(10);
        decideNextPhase('OPP', 25, 1, q, c, finalMy, oppScore, halftime);
      } else {
        const patGood = Math.random() < 0.94;
        const finalOpp = oppScore + 6 + (patGood ? 1 : 0);
        setOppScore(finalOpp);
        setPlayLog((prev) => [`${oppTeam.shortName} scores a TD! (${patGood ? 'PAT good' : 'PAT missed'})`, ...prev].slice(0, 14));
        if (ended && myScore !== finalOpp) {
          setPhase('GAME_OVER');
          return;
        }
        setPossession('MY');
        setBallYard(25);
        setDown(1);
        setYardsToGo(10);
        decideNextPhase('MY', 25, 1, q, c, myScore, finalOpp, halftime);
      }
      return;
    }

    // Normal Yardage Play
    const newYard = clampYard(ballYard + outcome.yardsGained);
    const remaining = yardsToGo - outcome.yardsGained;
    if (remaining <= 0) {
      if (ended && myScore !== oppScore) {
        setPhase('GAME_OVER');
        return;
      }
      setBallYard(newYard);
      setDown(1);
      setYardsToGo(Math.min(10, 100 - newYard));
      decideNextPhase(possession, newYard, 1, q, c, myScore, oppScore, halftime);
    } else if (down >= 4) {
      const flipped = clampYard(100 - newYard);
      const nextPoss = possession === 'MY' ? 'OPP' : 'MY';
      setPlayLog((prev) => ['Turnover on downs!', ...prev].slice(0, 14));
      if (ended && myScore !== oppScore) {
        setPhase('GAME_OVER');
        return;
      }
      setPossession(nextPoss);
      setBallYard(flipped);
      setDown(1);
      setYardsToGo(10);
      decideNextPhase(nextPoss, flipped, 1, q, c, myScore, oppScore, halftime);
    } else {
      const nextDown = down + 1;
      if (ended && myScore !== oppScore) {
        setPhase('GAME_OVER');
        return;
      }
      setBallYard(newYard);
      setDown(nextDown);
      setYardsToGo(remaining);
      decideNextPhase(possession, newYard, nextDown, q, c, myScore, oppScore, halftime);
    }
  };

  // Helper to format authentic Retro Bowl sideline callouts
  const buildRetroPlayLine = useCallback(
    (isMyOff: boolean, curYard: number, gain: number): string => {
      const attShort = isMyOff ? myTeam.shortName : oppTeam.shortName;
      if (isMyOff) {
        if (gain >= 14) {
          return `${myQB?.name ?? 'QB'} hits ${myWR?.name ?? 'WR'} deep! +${gain} yds`;
        }
        if (gain > 0) {
          return Math.random() < 0.5
            ? `${myQB?.name ?? 'QB'} finds ${myWR?.name ?? 'WR'} (+${gain} yds)`
            : `${myRB?.name ?? 'RB'} cuts upfield for +${gain} yds`;
        }
        return `${attShort} stuffed at the line (${gain} yds).`;
      }

      const defender = defRoster.length > 0 ? defRoster[Math.floor(Math.random() * defRoster.length)] : null;
      const defTag = defender ? `[${defender.position}] ${defender.name.split(' ').slice(-1)[0]}` : `[LB] Defense`;
      const spotNote = curYard >= 45 && curYard <= 55 ? ` at midfield` : '';

      if (gain >= 14) {
        return `${defTag} was too slow! ${attShort} breaks loose${spotNote} (+${gain} yds)!`;
      }
      if (gain >= 6) {
        return `${attShort} completes pass past ${defTag} (+${gain} yds).`;
      }
      if (gain > 0) {
        return `${defTag} stops the play after +${gain} yds.`;
      }
      if (gain === 0) {
        return `Incompletion! ${defTag} tight in coverage.`;
      }
      return `${defTag} stuffs the backfield for ${gain} yds!`;
    },
    [defRoster, myQB?.name, myRB?.name, myTeam.shortName, myWR?.name, oppTeam.shortName]
  );

  // Live single-play stepper for Retro Bowl Pixel Field Overlay
  const stepSidelinePlay = useCallback(() => {
    if (phase !== 'SIM_OTHER_UNIT' || simLockTransition) return;

    const isMyOff = possession === 'MY';
    const attTeam = isMyOff ? myTeam : oppTeam;
    const defTeam = isMyOff ? oppTeam : myTeam;

    if (userUnit === 'SPECIAL' && isMyOff && down >= 4) {
      setPlayMode(ballYard >= 55 ? 'KICK_FG' : 'KICK_PUNT');
      setPhase('LIVE_FIELD');
      setPlaySeed((s) => s + 1);
      return;
    }

    let timeStep = 3 + Math.floor(Math.random() * 4);
    if (clockFrozenRef.current) {
      timeStep = 0;
      clockFrozenRef.current = false;
      setClockFrozen(false);
    } else if (
      isMyOff &&
      (quarter === 2 || quarter === 4) &&
      clockSec <= 55 &&
      oppTimeouts > 0 &&
      oppScore <= myScore &&
      myScore - oppScore <= 16
    ) {
      setOppTimeouts((t) => Math.max(0, t - 1));
      timeStep = 1;
      setPlayLog((prev) => [`TIMEOUT ${oppTeam.shortName}! Stopping the clock.`, ...prev].slice(0, 14));
    }

    const adv = advanceClock(timeStep, quarter, clockSec);
    if (adv.enteredOt) {
      setMyTimeouts(1);
      setOppTimeouts(1);
    }
    setQuarter(adv.q);
    setClockSec(adv.c);

    const roll = Math.random();

    // Rare pinned-deep safety (~4.5% when <= 4 yd line)
    if (ballYard <= 4 && roll < 0.045) {
      const defender = defRoster.length > 0 ? defRoster[Math.floor(Math.random() * defRoster.length)] : null;
      const defTag = defender ? `[${defender.position}] ${defender.name.split(' ').slice(-1)[0]}` : 'Defense';
      const msg = isMyOff
        ? `SAFETY! ${oppTeam.shortName} drops the ball carrier in the endzone! (+2 PTS)`
        : `SAFETY! ${defTag} swarms the endzone! (+2 PTS)`;
      const newMy = isMyOff ? myScore : myScore + 2;
      const newOpp = isMyOff ? oppScore + 2 : oppScore;
      setMyScore(newMy);
      setOppScore(newOpp);
      setSimTicker(msg);
      setSimHistory((prev) => [msg, ...prev].slice(0, 10));
      setPlayLog((prev) => [msg, ...prev].slice(0, 14));
      retroAudio.play('tackle', 0.9);
      setSimLockTransition(true);
      setTimeout(() => {
        const nextPoss: 'MY' | 'OPP' = isMyOff ? 'OPP' : 'MY';
        setPossession(nextPoss);
        setBallYard(35);
        setDown(1);
        setYardsToGo(10);
        if (adv.ended && newMy !== newOpp) {
          setPhase('GAME_OVER');
        } else {
          decideNextPhase(nextPoss, 35, 1, adv.q, adv.c, newMy, newOpp, adv.halftime);
        }
      }, 950);
      return;
    }

    // Dynamic realistic Turnover Tendency (split between Interceptions and Fumbles!)
    const eraBaseTo = save.era === 'NFL' ? 0.0175 : save.era === 'COLLEGE' ? 0.0205 : 0.0225;
    const ratingEdge = (defTeam.defense - attTeam.offense) * 0.0014;
    const userStarMod =
      isMyOff && (userUnit === 'OFFENSE' || userUnit === 'SPECIAL')
        ? -Math.max(0, save.player.attributes.skill - 5) * 0.0007
        : !isMyOff && userUnit === 'DEFENSE'
          ? Math.max(0, save.player.starRating - 2.5) * 0.0018
          : 0;
    const situationIntMod =
      down >= 3 && yardsToGo >= 7
        ? 0.0065
        : quarter >= 4 && ((isMyOff && myScore < oppScore) || (!isMyOff && oppScore < myScore))
          ? 0.0045
          : 0;
    const intRate = Math.max(
      0.005,
      eraBaseTo * 0.64 + ratingEdge * 0.65 + userStarMod + situationIntMod + weatherMeta.simToIntMod
    );
    const fumbleRate = Math.max(
      0.004,
      eraBaseTo * 0.36 + ratingEdge * 0.35 + weatherMeta.simToFumbleMod
    );

    if (roll < intRate + fumbleRate) {
      const isFumble = roll >= intRate;
      const defender = defRoster.length > 0 ? defRoster[Math.floor(Math.random() * defRoster.length)] : null;
      const defTag = defender ? `[${defender.position}] ${defender.name.split(' ').slice(-1)[0]}` : 'Defense';
      const msg = isFumble
        ? isMyOff
          ? `FUMBLE! ${oppTeam.shortName} strips the ball and recovers!`
          : `FUMBLE RECOVERED by ${defTag}! ${myTeam.shortName} ball!`
        : isMyOff
          ? `TURNOVER! ${oppTeam.shortName} intercepts ${myQB?.name ?? 'QB'}!`
          : `PICKED OFF by ${defTag}! ${myTeam.shortName} ball!`;
      setSimTicker(msg);
      setSimHistory((prev) => [msg, ...prev].slice(0, 10));
      setPlayLog((prev) => [msg, ...prev].slice(0, 14));
      retroAudio.play(isMyOff ? 'audience_dis' : 'success', 0.8);
      setSimLockTransition(true);
      setTimeout(() => {
        const nextPoss: 'MY' | 'OPP' = isMyOff ? 'OPP' : 'MY';
        const flipped = clampYard(100 - ballYard);
        setPossession(nextPoss);
        setBallYard(flipped);
        setDown(1);
        setYardsToGo(10);
        if (adv.ended && myScore !== oppScore) {
          setPhase('GAME_OVER');
        } else {
          decideNextPhase(nextPoss, flipped, 1, adv.q, adv.c, myScore, oppScore, adv.halftime);
        }
      }, 950);
      return;
    }

    const rawGain = rollFluidPlayGain(
      save.era,
      attTeam.offense,
      defTeam.defense,
      isMyOff,
      save.player.starRating,
      save.player.attributes.skill,
      userUnit,
      weatherMeta
    );
    const nextYard = ballYard + rawGain;

    if (nextYard >= 100) {
      const patGood = Math.random() < (save.era === 'HIGH_SCHOOL' ? 0.86 : 0.94);
      const pts = 6 + (patGood ? 1 : 0);
      const newMy = isMyOff ? myScore + pts : myScore;
      const newOpp = isMyOff ? oppScore : oppScore + pts;
      const msg = `TOUCHDOWN ${attTeam.shortName}! (${patGood ? 'PAT good' : 'PAT missed'})`;

      if (isMyOff && userUnit === 'SPECIAL') {
        setMyScore(myScore + 6);
        setPlayLog((prev) => [`TOUCHDOWN ${myTeam.shortName}!`, ...prev].slice(0, 14));
        setPlayMode('KICK_PAT');
        setBallYard(85);
        setPhase('LIVE_FIELD');
        setPlaySeed((s) => s + 1);
        return;
      }

      setMyScore(newMy);
      setOppScore(newOpp);
      setBallYard(99);
      setSimTicker(msg);
      setSimHistory((prev) => [msg, ...prev].slice(0, 10));
      setPlayLog((prev) => [msg, ...prev].slice(0, 14));
      retroAudio.play(isMyOff ? 'success' : 'audience_dis', 0.85);
      setSimLockTransition(true);
      setTimeout(() => {
        if (adv.ended && newMy !== newOpp) {
          setPhase('GAME_OVER');
          return;
        }
        if (isMyOff && !adv.halftime && shouldOfferKickoffChoice(adv.q, newMy, newOpp)) {
          setKickoffContext('POST-SCORE KICKOFF');
          setPhase('KICKOFF_CHOICE');
          return;
        }
        const nextPoss: 'MY' | 'OPP' = isMyOff ? 'OPP' : 'MY';
        setPossession(nextPoss);
        setBallYard(25);
        setDown(1);
        setYardsToGo(10);
        decideNextPhase(nextPoss, 25, 1, adv.q, adv.c, newMy, newOpp, adv.halftime);
      }, 1050);
      return;
    }

    const clampedYard = clampYard(nextYard);
    const playText = buildRetroPlayLine(isMyOff, ballYard, rawGain);
    setBallYard(clampedYard);
    setSimTicker(playText);
    setSimHistory((prev) => [playText, ...prev].slice(0, 10));
    setPlayLog((prev) => [playText, ...prev].slice(0, 14));

    const rem = yardsToGo - rawGain;
    if (rem <= 0) {
      setDown(1);
      setYardsToGo(Math.min(10, 100 - clampedYard));
    } else {
      const nextDown = down + 1;
      if (nextDown >= 4) {
        if (isMyOff && userUnit === 'SPECIAL') {
          setDown(4);
          setYardsToGo(rem);
          if (adv.halftime) {
            setPhase('HALFTIME');
          } else if (adv.q > 5 || (adv.ended && myScore !== oppScore)) {
            setPhase('GAME_OVER');
          } else {
            setPlayMode(clampedYard >= 55 ? 'KICK_FG' : 'KICK_PUNT');
            setPhase('LIVE_FIELD');
            setPlaySeed((s) => s + 1);
          }
          return;
        }

        let endMsg = `${attTeam.shortName} punts it away.`;
        let newMy = myScore;
        let newOpp = oppScore;
        let scoredFg = false;

        // Late-game trailing desperation OR aggressive 4th-and-short inside opponent 48
        const attTrailingLate =
          quarter >= 4 &&
          clockSec <= 125 &&
          ((isMyOff && myScore < oppScore) || (!isMyOff && oppScore < myScore));
        const goShort = rem <= 2 && clampedYard >= 48 && clampedYard < 63 && Math.random() < 0.62;
        if (goShort || (attTrailingLate && clampedYard >= 30 && (clampedYard < 65 || (isMyOff ? oppScore - myScore : myScore - oppScore) > 3))) {
          const convGain = Math.random() < 0.62 ? 1 + Math.floor(Math.random() * 5) : 0;
          if (convGain >= rem) {
            const convYd = clampYard(clampedYard + convGain);
            const msg4 = `${attTeam.shortName} goes for it on 4th & ${rem}... CONVERTS! (+${convGain} yds)`;
            setBallYard(convYd);
            setDown(1);
            setYardsToGo(Math.min(10, 100 - convYd));
            setSimTicker(msg4);
            setSimHistory((prev) => [msg4, ...prev].slice(0, 10));
            setPlayLog((prev) => [msg4, ...prev].slice(0, 14));
            if (adv.halftime) setPhase('HALFTIME');
            else if (adv.q > 5 || (adv.ended && newMy !== newOpp)) setPhase('GAME_OVER');
            return;
          } else if (attTrailingLate) {
            const turnMsg = `${attTeam.shortName} stuffed on 4th & ${rem}! Turnover on downs!`;
            setSimTicker(turnMsg);
            setSimHistory((prev) => [turnMsg, ...prev].slice(0, 10));
            setPlayLog((prev) => [turnMsg, ...prev].slice(0, 14));
            setSimLockTransition(true);
            setTimeout(() => {
              const nextPoss: 'MY' | 'OPP' = isMyOff ? 'OPP' : 'MY';
              const flipped = clampYard(100 - clampedYard);
              setPossession(nextPoss);
              setBallYard(flipped);
              setDown(1);
              setYardsToGo(10);
              decideNextPhase(nextPoss, flipped, 1, adv.q, adv.c, newMy, newOpp, adv.halftime);
            }, 950);
            return;
          }
        }

        const fgThreshold = weatherMeta.simFgMakeMod <= -0.1 ? 66 : 62;
        if (clampedYard >= fgThreshold) {
          const dist = 100 - clampedYard + 17;
          const baseMake = dist <= 40 ? 0.87 : dist <= 50 ? 0.72 : 0.48;
          const fgGood = Math.random() < Math.max(0.25, baseMake + weatherMeta.simFgMakeMod);
          if (fgGood) {
            if (isMyOff) newMy += 3;
            else newOpp += 3;
            scoredFg = true;
            setMyScore(newMy);
            setOppScore(newOpp);
            endMsg = `${attTeam.shortName} hits a ${dist}-yd FIELD GOAL!`;
          } else {
            endMsg = `${attTeam.shortName} MISSES the ${dist}-yd field goal${weatherMeta.simFgMakeMod <= -0.08 ? ' in the tough conditions' : ''}!`;
          }
        }
        setSimTicker(endMsg);
        setSimHistory((prev) => [endMsg, ...prev].slice(0, 10));
        setPlayLog((prev) => [endMsg, ...prev].slice(0, 14));
        setSimLockTransition(true);
        setTimeout(() => {
          if (adv.ended && newMy !== newOpp) {
            setPhase('GAME_OVER');
            return;
          }
          if (isMyOff && scoredFg && !adv.halftime && shouldOfferKickoffChoice(adv.q, newMy, newOpp)) {
            setKickoffContext('POST-SCORE KICKOFF');
            setPhase('KICKOFF_CHOICE');
            return;
          }
          const nextPoss: 'MY' | 'OPP' = isMyOff ? 'OPP' : 'MY';
          setPossession(nextPoss);
          setBallYard(25);
          setDown(1);
          setYardsToGo(10);
          decideNextPhase(nextPoss, 25, 1, adv.q, adv.c, newMy, newOpp, adv.halftime);
        }, 950);
        return;
      }
      setDown(nextDown);
      setYardsToGo(rem);
    }

    if (adv.halftime) {
      setPhase('HALFTIME');
    } else if (adv.q > 5 || (adv.ended && myScore !== oppScore)) {
      setPhase('GAME_OVER');
    }
  }, [
    advanceClock,
    ballYard,
    buildRetroPlayLine,
    clockSec,
    decideNextPhase,
    defRoster,
    down,
    myQB?.name,
    myScore,
    myTeam,
    oppScore,
    oppTeam,
    oppTimeouts,
    phase,
    possession,
    quarter,
    save.era,
    save.player.attributes.skill,
    save.player.starRating,
    shouldOfferKickoffChoice,
    simLockTransition,
    userUnit,
    weatherMeta,
    yardsToGo,
  ]);

  // Auto-advance the Retro Bowl pixel drive ticker every ~850ms (or ~410ms at 2x)
  useEffect(() => {
    if (phase !== 'SIM_OTHER_UNIT' || simPaused || simLockTransition) return;
    const ms = simSpeed === 2 ? 410 : 850;
    const id = setTimeout(() => {
      stepSidelinePlay();
    }, ms);
    return () => clearTimeout(id);
  }, [phase, simPaused, simLockTransition, simSpeed, stepSidelinePlay]);

  // Instant "SIM TO MY SNAP" helper to finish the current opponent/sideline drive immediately
  const skipSidelineToMyUnit = () => {
    const isMyOff = possession === 'MY';
    const attTeam = isMyOff ? myTeam : oppTeam;
    const defTeam = isMyOff ? oppTeam : myTeam;

    let curYard = ballYard;
    let curDown = down;
    let curToGo = yardsToGo;
    let curQtr = quarter;
    let curClk = clockSec;
    let curMy = myScore;
    let curOpp = oppScore;
    const logs: string[] = [];

    for (let i = 0; i < 18; i++) {
      if (userUnit === 'SPECIAL' && isMyOff && curDown >= 4) {
        setQuarter(curQtr);
        setClockSec(curClk);
        setBallYard(curYard);
        setDown(curDown);
        setYardsToGo(curToGo);
        setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
        setPlayMode(curYard >= 55 ? 'KICK_FG' : 'KICK_PUNT');
        setPhase('LIVE_FIELD');
        setPlaySeed((s) => s + 1);
        return;
      }

      const roll = Math.random();
      let timeStep = 3 + Math.floor(Math.random() * 4);
      if (clockFrozenRef.current) {
        timeStep = 0;
        clockFrozenRef.current = false;
        setClockFrozen(false);
      }
      const adv = advanceClock(timeStep, curQtr, curClk);
      curQtr = adv.q;
      curClk = adv.c;
      if (adv.enteredOt) {
        setMyTimeouts(1);
        setOppTimeouts(1);
      }

      if (curYard <= 4 && roll < 0.04) {
        if (isMyOff) curOpp += 2;
        else curMy += 2;
        setMyScore(curMy);
        setOppScore(curOpp);
        logs.push(`SAFETY! +2 points.`);
        const nextPoss: 'MY' | 'OPP' = isMyOff ? 'OPP' : 'MY';
        setQuarter(curQtr);
        setClockSec(curClk);
        setPossession(nextPoss);
        setBallYard(35);
        setDown(1);
        setYardsToGo(10);
        setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
        if (adv.ended && curMy !== curOpp) setPhase('GAME_OVER');
        else decideNextPhase(nextPoss, 35, 1, curQtr, curClk, curMy, curOpp, adv.halftime);
        return;
      }

      const eraBaseTo = save.era === 'NFL' ? 0.0175 : save.era === 'COLLEGE' ? 0.0205 : 0.0225;
      const ratingEdge = (defTeam.defense - attTeam.offense) * 0.0014;
      const toRate = Math.max(
        0.009,
        eraBaseTo +
          ratingEdge +
          (curDown >= 3 && curToGo >= 7 ? 0.006 : 0) +
          weatherMeta.simToIntMod +
          weatherMeta.simToFumbleMod
      );
      if (roll < toRate) {
        const isFumble = roll >= toRate * 0.62;
        const nextPoss = isMyOff ? 'OPP' : 'MY';
        logs.push(isFumble ? `${attTeam.shortName} FUMBLES it away!` : `${attTeam.shortName} throws an INTERCEPTION!`);
        const flipped = clampYard(100 - curYard);
        setQuarter(curQtr);
        setClockSec(curClk);
        setPossession(nextPoss);
        setBallYard(flipped);
        setDown(1);
        setYardsToGo(10);
        setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
        if (adv.ended && curMy !== curOpp) setPhase('GAME_OVER');
        else decideNextPhase(nextPoss, flipped, 1, curQtr, curClk, curMy, curOpp, adv.halftime);
        return;
      }

      const gain = rollFluidPlayGain(
        save.era,
        attTeam.offense,
        defTeam.defense,
        isMyOff,
        save.player.starRating,
        save.player.attributes.skill,
        userUnit,
        weatherMeta
      );
      curYard = clampYard(curYard + gain);
      logs.push(buildRetroPlayLine(isMyOff, curYard, gain));

      if (curYard >= 100) {
        const patGood = Math.random() < (save.era === 'HIGH_SCHOOL' ? 0.86 : 0.94);
        const pts = 6 + (patGood ? 1 : 0);
        if (isMyOff) {
          curMy += pts;
          setMyScore(curMy);
          if (userUnit === 'SPECIAL') {
            logs.push(`TOUCHDOWN ${myTeam.shortName}!`);
            setQuarter(curQtr);
            setClockSec(curClk);
            setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
            setPlayMode('KICK_PAT');
            setBallYard(85);
            setPhase('LIVE_FIELD');
            setPlaySeed((s) => s + 1);
            return;
          }
        } else {
          curOpp += pts;
          setOppScore(curOpp);
        }
        logs.push(`TOUCHDOWN ${attTeam.shortName}! (${patGood ? 'PAT good' : 'PAT missed'})`);
        setQuarter(curQtr);
        setClockSec(curClk);
        setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
        if (adv.ended && curMy !== curOpp) {
          setPhase('GAME_OVER');
          return;
        }
        if (isMyOff && !adv.halftime && shouldOfferKickoffChoice(curQtr, curMy, curOpp)) {
          setKickoffContext('POST-SCORE KICKOFF');
          setPhase('KICKOFF_CHOICE');
          return;
        }
        const nextPoss = isMyOff ? 'OPP' : 'MY';
        setPossession(nextPoss);
        setBallYard(25);
        setDown(1);
        setYardsToGo(10);
        decideNextPhase(nextPoss, 25, 1, curQtr, curClk, curMy, curOpp, adv.halftime);
        return;
      }

      curToGo -= gain;
      if (curToGo <= 0) {
        curDown = 1;
        curToGo = Math.min(10, 100 - curYard);
      } else {
        curDown += 1;
        if (curDown >= 4) {
          if (isMyOff && userUnit === 'SPECIAL') {
            setQuarter(curQtr);
            setClockSec(curClk);
            setBallYard(curYard);
            setDown(4);
            setYardsToGo(curToGo);
            setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
            if (adv.halftime) {
              setPhase('HALFTIME');
            } else if (adv.q > 5 || (adv.ended && curMy !== curOpp)) {
              setPhase('GAME_OVER');
            } else {
              setPlayMode(curYard >= 55 ? 'KICK_FG' : 'KICK_PUNT');
              setPhase('LIVE_FIELD');
              setPlaySeed((s) => s + 1);
            }
            return;
          }
          let scoredFg = false;
          if (curYard >= 62) {
            const dist = 100 - curYard + 17;
            const fgGood = Math.random() < (dist <= 40 ? 0.86 : dist <= 50 ? 0.72 : 0.48);
            if (fgGood) {
              if (isMyOff) {
                curMy += 3;
                setMyScore(curMy);
              } else {
                curOpp += 3;
                setOppScore(curOpp);
              }
              scoredFg = true;
              logs.push(`${attTeam.shortName} hits a ${dist}-yard FG!`);
            } else {
              logs.push(`${attTeam.shortName} misses the field goal!`);
            }
          } else {
            logs.push(`${attTeam.shortName} punts it away.`);
          }
          setQuarter(curQtr);
          setClockSec(curClk);
          setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
          if (adv.ended && curMy !== curOpp) {
            setPhase('GAME_OVER');
            return;
          }
          if (isMyOff && scoredFg && !adv.halftime && shouldOfferKickoffChoice(curQtr, curMy, curOpp)) {
            setKickoffContext('POST-SCORE KICKOFF');
            setPhase('KICKOFF_CHOICE');
            return;
          }
          const nextPoss = isMyOff ? 'OPP' : 'MY';
          setPossession(nextPoss);
          setBallYard(25);
          setDown(1);
          setYardsToGo(10);
          decideNextPhase(nextPoss, 25, 1, curQtr, curClk, curMy, curOpp, adv.halftime);
          return;
        }
      }

      if (adv.halftime) {
        setQuarter(curQtr);
        setClockSec(curClk);
        setBallYard(curYard);
        setDown(curDown);
        setYardsToGo(curToGo);
        setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
        setPhase('HALFTIME');
        return;
      }
      if (adv.q > 5 || (adv.ended && curMy !== curOpp)) {
        setQuarter(curQtr);
        setClockSec(curClk);
        setPlayLog((prev) => [...logs.reverse(), ...prev].slice(0, 14));
        setPhase('GAME_OVER');
        return;
      }
    }
  };

  const handleFourthDownChoice = (choice: 'GO' | 'FG' | 'PUNT') => {
    retroAudio.play('click');
    if (choice === 'GO') {
      setPlayMode('OFFENSE');
      setPhase('LIVE_FIELD');
      setPlaySeed((s) => s + 1);
      return;
    }
    if (choice === 'FG') {
      const dist = 100 - ballYard + 17;
      const made = Math.random() < (dist < 42 ? 0.85 : dist < 52 ? 0.65 : 0.4);
      const nextMy = myScore + (made ? 3 : 0);
      setMyScore(nextMy);
      setPlayLog((prev) => [made ? `${dist}-yd FG is GOOD!` : `${dist}-yd FG missed.`, ...prev].slice(0, 14));
      if (made) retroAudio.play('audience_fg', 0.8);
      if (made && shouldOfferKickoffChoice(quarter, nextMy, oppScore)) {
        setKickoffContext('POST-SCORE KICKOFF');
        setPhase('KICKOFF_CHOICE');
        return;
      }
      setPossession('OPP');
      setBallYard(25);
      setDown(1);
      setYardsToGo(10);
      decideNextPhase('OPP', 25, 1, quarter, clockSec, nextMy, oppScore, false);
      return;
    }
    setPlayLog((prev) => [`${myTeam.shortName} punts deep.`, ...prev].slice(0, 14));
    setPossession('OPP');
    setBallYard(20);
    setDown(1);
    setYardsToGo(10);
    decideNextPhase('OPP', 20, 1, quarter, clockSec, myScore, oppScore, false);
  };

  const gameRating = useMemo(() => {
    const pos = save.player.position;
    let score = 6.2;
    if (pos === 'QB') {
      score += matchStats.passTD * 0.9 + matchStats.rushTD * 0.9 + matchStats.passYards * 0.008 - matchStats.interceptions * 1.1;
    } else if (pos === 'RB') {
      score += matchStats.rushTD * 1.1 + matchStats.recTD * 1.0 + (matchStats.rushYards + matchStats.recYards) * 0.025;
    } else if (pos === 'WR' || pos === 'TE') {
      score += matchStats.recTD * 1.1 + matchStats.recYards * 0.024 + matchStats.blocks * 0.25;
    } else if (pos === 'OL') {
      score += matchStats.blocks * 0.45 + matchStats.pancakes * 0.85 + (myScore > oppScore ? 0.8 : 0);
    } else if (pos === 'DL' || pos === 'LB' || pos === 'CB' || pos === 'S') {
      score += matchStats.tackles * 0.45 + matchStats.sacks * 1.3 + matchStats.defInt * 1.6 + matchStats.passDeflections * 0.7;
    } else if (pos === 'K') {
      score += matchStats.fgMade * 1.2 + matchStats.xpMade * 0.35 - (matchStats.fgAtt - matchStats.fgMade) * 0.8;
    }
    return Math.round(Math.max(3.5, Math.min(10, score)) * 10) / 10;
  }, [matchStats, myScore, oppScore, save.player.position]);

  // Guarantee the match result & stats are immediately saved the instant the game ends!
  useEffect(() => {
    if (phase === 'GAME_OVER' && !autoSavedRef.current) {
      autoSavedRef.current = true;
      retroAudio.stopCrowdAmbience();
      retroAudio.play('timeout', 0.9);
      onSaveMatchResult(myScore, oppScore, matchStats, gameRating);
    }
  }, [phase, myScore, oppScore, matchStats, gameRating, onSaveMatchResult]);

  const formatClock = (s: number) => {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const downText = `${down === 1 ? '1ST' : down === 2 ? '2ND' : down === 3 ? '3RD' : '4TH'} & ${ballYard + yardsToGo >= 100 ? 'GOAL' : yardsToGo}`;
  const weatherFrame = weatherMeta.sprWeatherFrame;
  const crowdPct = Math.round(crowdTurnout * 100);
  const crowdLabel =
    crowdPct >= 88
      ? 'PACKED HOUSE'
      : crowdPct >= 68
        ? 'HIGH ENERGY'
        : crowdPct >= 48
          ? 'STEADY CROWD'
          : 'SPARSE CROWD';

  return (
    <div
      ref={matchRootRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-[#1d4972] flex flex-col p-2.5 sm:p-4 gap-2.5 overflow-hidden outline-none"
    >
      {/* Authentic Retro Bowl Fullscreen Scorebug */}
      <div className="shrink-0 bg-[#13314d] border-2 border-[#3c6fa1] shadow-[0_4px_0_#0b1e30] grid grid-cols-1 md:grid-cols-12 items-stretch overflow-hidden">
        {/* Team Score Blocks */}
        <div className="md:col-span-6 flex items-stretch divide-x-2 divide-[#2b547c]">
          {/* My Team */}
          <div
            className="flex-1 px-4 py-1.5 flex items-center justify-between gap-2"
            style={{ backgroundColor: `${myTeam.uniforms.home.shirt}33` }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-3 h-8 border border-white/40 shrink-0"
                style={{ backgroundColor: myTeam.uniforms.home.shirt }}
              />
              <div className="min-w-0">
                <div className="font-pixel text-[8px] text-[#fde047]">
                  {myRank.hasGames ? `#${myRank.rank} ` : ''}({myRank.wins}-{myRank.losses}) · {possession === 'MY' ? '► BALL' : 'DEF'}
                </div>
                <div className="font-pixel text-sm sm:text-base text-white tracking-wider truncate">
                  {myTeam.shortName}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-pixel text-[7px] text-slate-300 mr-1">TO</span>
                  {[0, 1, 2].map((idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-1.5 border ${
                        idx < myTimeouts
                          ? 'bg-[#fde047] border-[#fef08a]'
                          : 'bg-[#0e253b] border-[#2b547c]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="font-pixel text-xl sm:text-2xl text-[#fde047] tabular-nums">
              {myScore}
            </div>
          </div>

          {/* Opponent */}
          <div
            className="flex-1 px-4 py-1.5 flex items-center justify-between gap-2"
            style={{ backgroundColor: `${oppTeam.uniforms.home.shirt}33` }}
          >
            <div className="font-pixel text-xl sm:text-2xl text-white tabular-nums">
              {oppScore}
            </div>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="text-right min-w-0">
                <div className="font-pixel text-[8px] text-slate-200">
                  {possession === 'OPP' ? 'BALL ◄' : 'DEF'} · {oppRank.hasGames ? `#${oppRank.rank} ` : ''}({oppRank.wins}-{oppRank.losses})
                </div>
                <div className="font-pixel text-sm sm:text-base text-white tracking-wider truncate">
                  {oppTeam.shortName}
                </div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {[0, 1, 2].map((idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-1.5 border ${
                        idx < oppTimeouts
                          ? 'bg-[#fde047] border-[#fef08a]'
                          : 'bg-[#0e253b] border-[#2b547c]'
                      }`}
                    />
                  ))}
                  <span className="font-pixel text-[7px] text-slate-300 ml-1">TO</span>
                </div>
              </div>
              <span
                className="w-3 h-8 border border-white/40 shrink-0"
                style={{ backgroundColor: oppTeam.uniforms.home.shirt }}
              />
            </div>
          </div>
        </div>

        {/* Clock, Down & Controls */}
        <div className="md:col-span-6 px-4 py-1.5 flex items-center justify-between gap-3 border-t-2 md:border-t-0 md:border-l-2 border-[#2b547c] bg-[#0e253b]">
          <div className="flex items-center gap-3">
            <div title={`${weatherMeta.label}: ${weatherMeta.impactNote}`} className="flex items-center gap-1.5">
              <RetroSprite name="spr_weather" frame={weatherFrame} scale={2.5} alt={weatherMeta.label} />
              <span className={`hidden xl:inline font-pixel text-[8px] ${weatherMeta.badgeClass}`}>
                {weatherMeta.shortTag}
              </span>
            </div>
            <div>
              <div className="font-pixel text-xs text-white tabular-nums flex items-center gap-2">
                <span>{quarter <= 4 ? `Q${quarter}` : 'OT'} · {formatClock(clockSec)}</span>
                {clockFrozen && (
                  <span className="font-pixel text-[8px] text-[#fde047] bg-[#3b2f06] border border-[#facc15] px-1.5 py-0.5">
                    TO
                  </span>
                )}
              </div>
              <div className="font-pixel text-[9px] text-[#4ade80] mt-1 tabular-nums">
                {downText} · {ballYard <= 50 ? `OWN ${ballYard}` : `OPP ${100 - ballYard}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCycleDriveDirection}
              title="Drive Direction (RIGHT / LEFT / BOTH)"
              className="rb-btn-slate px-2.5 py-2 font-pixel text-[8px]"
            >
              DIR:{driveDirection}
            </button>
            {phase !== 'COIN_TOSS' && phase !== 'HALFTIME' && phase !== 'GAME_OVER' && (
              <button
                type="button"
                onClick={handleCallTimeout}
                disabled={myTimeouts <= 0 || clockFrozen}
                title="Call Timeout (T)"
                className={`px-2.5 py-2 font-pixel text-[8px] border-2 ${
                  myTimeouts > 0 && !clockFrozen
                    ? 'bg-[#13314d] border-[#facc15] text-[#fde047] hover:bg-[#1b4368]'
                    : 'bg-[#0b1e30] border-[#2b547c] text-slate-500 cursor-not-allowed'
                }`}
              >
                TO ({myTimeouts})
              </button>
            )}
            <button
              type="button"
              onClick={toggleBrowserFullscreen}
              className="rb-btn-slate p-2"
              title="Toggle Fullscreen"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMuted(retroAudio.toggleMute())}
              className="rb-btn-slate p-2"
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                retroAudio.stopCrowdAmbience();
                if (autoSavedRef.current) {
                  onFinishGame(myScore, oppScore, matchStats, gameRating, true);
                } else {
                  onAbortMatch();
                }
              }}
              className="rb-btn-slate px-3 py-2 font-pixel text-[9px]"
            >
              {phase === 'GAME_OVER' ? 'DONE' : 'EXIT'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Full-Screen Game Viewport */}
      <div className="flex-1 min-h-0 flex flex-col">
        {phase === 'COIN_TOSS' && (
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto p-2">
            <div className="rb-panel p-6 sm:p-8 flex flex-col items-center gap-5 max-w-2xl w-full text-center">
              <div className="flex flex-wrap items-center justify-center gap-2 font-pixel text-[10px] text-[#fde047]">
                <span>PRE-GAME COIN TOSS</span>
                <span>·</span>
                <span>{lockedGame.playoffRoundName ?? `WEEK ${lockedGame.week}`}</span>
                <span>·</span>
                <span className="text-[#4ade80]">CROWD {crowdPct}% ({crowdLabel})</span>
              </div>

              {/* Matchup Card */}
              <div className="grid grid-cols-3 items-center gap-4 w-full rb-panel-inset p-4">
                <div className="text-left">
                  <div className="font-pixel text-[8px] text-[#fde047]">
                    {myRank.hasGames ? `#${myRank.rank} ` : ''}({myRank.wins}-{myRank.losses})
                  </div>
                  <div className="font-display text-2xl font-extrabold text-white mt-0.5">
                    {myTeam.shortName}
                  </div>
                  <div className="text-xs text-slate-400">{myTeam.name}</div>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <RetroSprite name="spr_weather" frame={weatherFrame} scale={2.5} alt={weatherMeta.label} />
                  <div className={`font-pixel text-[8px] ${weatherMeta.badgeClass}`}>
                    {weatherMeta.label}
                  </div>
                  <div className="font-pixel text-[9px] text-slate-300">VS</div>
                  <div className="text-[11px] text-slate-200 truncate max-w-[160px]">
                    {(lockedGame.isHome ? myTeam.stadium : oppTeam.stadium) ?? (lockedGame.isHome ? myTeam.city : oppTeam.city)}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight max-w-[190px]">
                    {weatherMeta.impactNote}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-pixel text-[8px] text-slate-300">
                    {oppRank.hasGames ? `#${oppRank.rank} ` : ''}({oppRank.wins}-{oppRank.losses})
                  </div>
                  <div className="font-display text-2xl font-extrabold text-white mt-0.5">
                    {oppTeam.shortName}
                  </div>
                  <div className="text-xs text-slate-400">{oppTeam.name}</div>
                </div>
              </div>

              {/* Fullscreen & Drive Direction setup before kickoff */}
              <div className="w-full rb-panel-inset px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-300 text-left">
                  Choose camera drive direction &amp; lock fullscreen before kickoff!
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCycleDriveDirection}
                    className="rb-btn-slate px-3 py-2 font-pixel text-[8px]"
                  >
                    DRIVE: {driveDirection}
                  </button>
                  <button
                    type="button"
                    onClick={toggleBrowserFullscreen}
                    className="rb-btn-slate inline-flex items-center gap-2 px-3.5 py-2 font-pixel text-[9px]"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    {isFullscreen ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN'}
                  </button>
                </div>
              </div>

              {/* Coin Graphic & Call */}
              <div className="flex flex-col items-center gap-3 py-1">
                <div
                  className={`w-16 h-16 border-4 border-[#ca8a04] bg-[#facc15] flex items-center justify-center shadow-[0_4px_0_#713f12] ${
                    coinStep === 'FLIPPING' ? 'animate-spin' : ''
                  }`}
                >
                  <span className="font-pixel text-lg text-[#422006]">
                    {coinLanded === 'HEADS'
                      ? 'H'
                      : coinLanded === 'TAILS'
                        ? 'T'
                        : coinCall === 'HEADS'
                          ? 'H'
                          : coinCall === 'TAILS'
                            ? 'T'
                            : '?'}
                  </span>
                </div>
                <p className="text-sm font-medium text-white max-w-md">{coinSummary}</p>
              </div>

              {/* Coin Actions */}
              {coinStep === 'PICK' && (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleCoinCall('HEADS')}
                    className="rb-btn-gold px-6 py-3 font-pixel text-[10px]"
                  >
                    CALL HEADS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCoinCall('TAILS')}
                    className="rb-btn-slate px-6 py-3 font-pixel text-[10px]"
                  >
                    CALL TAILS
                  </button>
                </div>
              )}

              {coinStep === 'WON_CHOICE' && (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleWonCoinChoice('RECEIVE')}
                    className="rb-btn-green px-6 py-3 font-pixel text-[10px]"
                  >
                    RECEIVE BALL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWonCoinChoice('KICK')}
                    className="rb-btn-slate px-6 py-3 font-pixel text-[10px]"
                  >
                    KICK / DEFER
                  </button>
                </div>
              )}

              {coinStep === 'READY' && (
                <button
                  type="button"
                  onClick={handleKickoffGame}
                  className="rb-btn-gold px-8 py-3 font-pixel text-[11px]"
                >
                  KICKOFF Q1 &gt;&gt;
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'KICKOFF_CHOICE' && (
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto p-2">
            <div className="rb-panel p-7 text-center flex flex-col items-center gap-5 max-w-xl w-full">
              <div className="font-pixel text-[10px] text-[#fde047]">{kickoffContext}</div>
              <h3 className="font-display text-3xl font-extrabold text-white">
                {myTeam.shortName} Special Teams
              </h3>
              <p className="text-sm text-slate-200 max-w-md leading-relaxed">
                {userUnit === 'SPECIAL'
                  ? 'Line up at the 35-yard line! Boom a deep kickoff or attempt a tricky 10-yard onside kick bounce.'
                  : `${myTeam.shortName} trails in the second half. Kick it deep or try an interactive onside kick to steal possession!`}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleKickoffChoice('DEEP')}
                  className="rb-btn-green px-6 py-3 font-pixel text-[10px]"
                >
                  {userUnit === 'SPECIAL' ? 'PLAY DEEP KICKOFF' : 'KICK DEEP'}
                </button>
                <button
                  type="button"
                  onClick={() => handleKickoffChoice('ONSIDE')}
                  className="rb-btn-gold px-6 py-3 font-pixel text-[10px]"
                >
                  TRY ONSIDE KICK
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'LIVE_FIELD' && (
          <FieldCanvas
            key={playSeed}
            player={save.player}
            myTeam={myTeam}
            oppTeam={oppTeam}
            myUniform={myUniform}
            oppUniform={oppUniform}
            era={save.era}
            ballYard={ballYard}
            down={down}
            yardsToGo={yardsToGo}
            weather={lockedGame.weather}
            playMode={playMode}
            quarter={quarter}
            clockSec={clockSec}
            driveDirection={driveDirection}
            crowdTurnout={crowdTurnout}
            myTimeouts={myTimeouts}
            onCallTimeout={handleCallTimeout}
            bulletPassEnabled={bulletPass}
            onToggleBulletPass={() => setBulletPass((b) => !b)}
            audiblesRemaining={audiblesLeft}
            onUseAudible={() => setAudiblesLeft((a) => Math.max(0, a - 1))}
            onPlayComplete={handlePlayComplete}
          />
        )}

        {phase === 'HALFTIME' && (
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto">
            <div className="rb-panel p-8 text-center flex flex-col items-center gap-5 max-w-2xl w-full">
              <div className="font-pixel text-xs text-[#fde047]">HALFTIME REPORT</div>
              <h2 className="font-display text-4xl font-extrabold text-white">
                {myTeam.shortName} {myScore} — {oppScore} {oppTeam.shortName}
              </h2>
              <p className="text-sm text-slate-300 max-w-lg">
                {save.player.firstName} {save.player.lastName} (#{save.player.jersey}) halftime check-in — audibles refreshed for 2nd half!
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-lg text-sm">
                {save.player.position === 'QB' ? (
                  <>
                    <StatBox label="Comp / Att" value={`${matchStats.passComp}/${matchStats.passAtt}`} />
                    <StatBox label="Pass Yards" value={`${matchStats.passYards}`} />
                    <StatBox label="Total TDs" value={`${matchStats.passTD + matchStats.rushTD}`} />
                  </>
                ) : ['DL', 'LB', 'CB', 'S'].includes(save.player.position) ? (
                  <>
                    <StatBox label="Tackles" value={`${matchStats.tackles}`} />
                    <StatBox label="Sacks" value={`${matchStats.sacks}`} />
                    <StatBox label="INT / PD" value={`${matchStats.defInt}/${matchStats.passDeflections}`} />
                  </>
                ) : save.player.position === 'K' ? (
                  <>
                    <StatBox label="FG Made" value={`${matchStats.fgMade}/${matchStats.fgAtt}`} />
                    <StatBox label="PAT Made" value={`${matchStats.xpMade}/${matchStats.xpAtt}`} />
                    <StatBox label="Long FG" value={`${matchStats.fgLong}`} />
                  </>
                ) : (
                  <>
                    <StatBox label="Rush Yds" value={`${matchStats.rushYards}`} />
                    <StatBox label="Rec Yds" value={`${matchStats.recYards}`} />
                    <StatBox label="Total TDs" value={`${matchStats.rushTD + matchStats.recTD}`} />
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleResumeSecondHalf}
                className="rb-btn-gold px-7 py-3 font-pixel text-[10px]"
              >
                KICKOFF 2ND HALF
              </button>
            </div>
          </div>
        )}

        {phase === 'FOURTH_DOWN_CHOICE' && (
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto">
            <div className="rb-panel p-8 text-center flex flex-col items-center gap-4 max-w-xl w-full">
              <div className="font-pixel text-[10px] text-[#fde047]">
                4TH DOWN CALL · {downText}
              </div>
              <h3 className="font-display text-3xl font-bold text-white">
                Ball on the {ballYard <= 50 ? `OWN ${ballYard}` : `OPP ${100 - ballYard}`}
              </h3>
              <p className="text-sm text-slate-300 max-w-md">
                Coach {save.coaches.hc.name} (Trust {save.player.relationships.coach}%) turns to you for the 4th down decision.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => handleFourthDownChoice('GO')}
                  className="rb-btn-gold px-5 py-2.5 font-pixel text-[10px]"
                >
                  GO FOR IT
                </button>
                {ballYard >= 55 && (
                  <button
                    type="button"
                    onClick={() => handleFourthDownChoice('FG')}
                    className="rb-btn-green px-5 py-2.5 font-pixel text-[10px]"
                  >
                    KICK {100 - ballYard + 17}YD FG
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleFourthDownChoice('PUNT')}
                  className="rb-btn-slate px-5 py-2.5 font-pixel text-[10px]"
                >
                  PUNT
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'SIM_OTHER_UNIT' && (
          <RetroDriveOverlay
            myTeam={myTeam}
            oppTeam={oppTeam}
            myUniform={myUniform}
            oppUniform={oppUniform}
            era={save.era}
            weather={lockedGame.weather}
            possession={possession}
            ballYard={ballYard}
            yardsToGo={yardsToGo}
            down={down}
            quarter={quarter}
            clockSec={clockSec}
            myTimeouts={myTimeouts}
            oppTimeouts={oppTimeouts}
            clockFrozen={clockFrozen}
            onCallTimeout={handleCallTimeout}
            simTicker={simTicker}
            simHistory={simHistory}
            simSpeed={simSpeed}
            simPaused={simPaused}
            onToggleSpeed={() => setSimSpeed((s) => (s === 1 ? 2 : 1))}
            onTogglePaused={() => setSimPaused((p) => !p)}
            onStepPlay={stepSidelinePlay}
            onSkipToMyUnit={skipSidelineToMyUnit}
          />
        )}

        {phase === 'GAME_OVER' && (
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto">
            <div className="rb-panel p-7 flex flex-col gap-6 max-w-3xl w-full">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#24344d] pb-5">
                <div>
                  <div className="font-pixel text-[10px] text-[#fde047]">FINAL SCORE</div>
                  <h2 className="font-display text-4xl font-extrabold text-white mt-1">
                    {myTeam.name} {myScore} — {oppScore} {oppTeam.name}
                  </h2>
                  <p className="text-sm text-slate-300 mt-1">
                    {myScore > oppScore
                      ? 'Victory! Great team performance.'
                      : myScore === oppScore
                        ? 'Hard-fought tie.'
                        : 'Tough defeat. Back to the film room.'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-pixel text-[9px] text-slate-400">GAME RATING</div>
                  <div className="font-pixel text-2xl text-[#4ade80] mt-1 tabular-nums">
                    {gameRating.toFixed(1)}<span className="text-sm text-slate-400">/10</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {save.player.position === 'QB' && (
                  <>
                    <StatBox label="Comp / Att" value={`${matchStats.passComp}/${matchStats.passAtt}`} />
                    <StatBox label="Pass Yards" value={`${matchStats.passYards}`} />
                    <StatBox label="Pass TD / INT" value={`${matchStats.passTD} / ${matchStats.interceptions}`} />
                    <StatBox label="Rush Yds / TD" value={`${matchStats.rushYards} / ${matchStats.rushTD}`} />
                  </>
                )}
                {(save.player.position === 'RB' || save.player.position === 'WR' || save.player.position === 'TE') && (
                  <>
                    <StatBox label="Rush Yds / Att" value={`${matchStats.rushYards} (${matchStats.rushAtt})`} />
                    <StatBox label="Rec / Yards" value={`${matchStats.receptions} / ${matchStats.recYards}`} />
                    <StatBox label="Total TDs" value={`${matchStats.rushTD + matchStats.recTD}`} />
                    <StatBox label="Longest Play" value={`${matchStats.longestPlay} yds`} />
                  </>
                )}
                {save.player.position === 'OL' && (
                  <>
                    <StatBox label="Key Blocks" value={`${matchStats.blocks}`} />
                    <StatBox label="Pancake Blocks" value={`${matchStats.pancakes}`} />
                    <StatBox label="Sacks Allowed" value={`${matchStats.sacksAllowed}`} />
                    <StatBox label="Team Points" value={`${myScore}`} />
                  </>
                )}
                {['DL', 'LB', 'CB', 'S'].includes(save.player.position) && (
                  <>
                    <StatBox label="Tackles (TFL)" value={`${matchStats.tackles} (${matchStats.tfl})`} />
                    <StatBox label="Sacks" value={`${matchStats.sacks}`} />
                    <StatBox label="Interceptions" value={`${matchStats.defInt}`} />
                    <StatBox label="Pass Deflections" value={`${matchStats.passDeflections}`} />
                  </>
                )}
                {save.player.position === 'K' && (
                  <>
                    <StatBox label="FG Made / Att" value={`${matchStats.fgMade} / ${matchStats.fgAtt}`} />
                    <StatBox label="Longest FG" value={`${matchStats.fgLong} yds`} />
                    <StatBox label="PAT Made / Att" value={`${matchStats.xpMade} / ${matchStats.xpAtt}`} />
                    <StatBox label="Points Scored" value={`${matchStats.fgMade * 3 + matchStats.xpMade}`} />
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="font-pixel text-[9px] text-[#4ade80]">
                  RESULT SAVED TO CAREER
                </span>
                <button
                  type="button"
                  onClick={() => onFinishGame(myScore, oppScore, matchStats, gameRating, autoSavedRef.current)}
                  className="rb-btn-gold px-6 py-3 font-pixel text-[10px]"
                >
                  RETURN TO LOCKER ROOM
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compact Retro Bowl Broadcast Commentary Bar */}
      <div className="shrink-0 bg-[#13314d] border-2 border-[#3c6fa1] px-4 py-2 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-pixel text-[8px] text-[#fde047] mb-1">BROADCAST BOOTH</div>
          <div className="font-pixel text-[9px] leading-relaxed text-white truncate">
            {playLog[0]}
          </div>
          {playLog[1] && (
            <div className="text-[11px] text-slate-300 truncate">{playLog[1]}</div>
          )}
        </div>
      </div>
    </div>
  );
};

function clampYard(y: number) {
  return Math.max(1, Math.min(99, y));
}

function rollFluidPlayGain(
  era: CareerEra,
  attOffense: number,
  defDefense: number,
  isMyOff: boolean,
  playerStar: number,
  playerSkill: number,
  userUnit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL',
  weatherMeta?: ReturnType<typeof getWeatherMeta>
): number {
  const eraCfg =
    era === 'HIGH_SCHOOL'
      ? { expChance: 0.2, expMin: 16, expSpan: 24, baseMean: 7.2, incompChance: 0.12 }
      : era === 'COLLEGE'
        ? { expChance: 0.21, expMin: 16, expSpan: 22, baseMean: 7.4, incompChance: 0.13 }
        : { expChance: 0.18, expMin: 15, expSpan: 19, baseMean: 6.5, incompChance: 0.14 };

  const incompChance = eraCfg.incompChance + (weatherMeta?.simIncompAdd ?? 0);
  const expChance = eraCfg.expChance * (weatherMeta?.simExpMult ?? 1);
  const teamEdge = (attOffense - defDefense) * 0.18;
  const skillEdge =
    (isMyOff && (userUnit === 'OFFENSE' || userUnit === 'SPECIAL'))
      ? (playerStar - 2.5) * 0.55 + (playerSkill - 5) * 0.2
      : (!isMyOff && userUnit === 'DEFENSE')
        ? -((playerStar - 2.5) * 0.55 + (playerSkill - 5) * 0.2)
        : 0;

  const r = Math.random();
  if (r < incompChance) return 0;
  if (r < incompChance + 0.05) return -(1 + Math.floor(Math.random() * 3));
  if (r > 1 - expChance) {
    return Math.round(eraCfg.expMin + Math.random() * eraCfg.expSpan + Math.max(0, skillEdge * 0.5));
  }
  const normal = Math.round(eraCfg.baseMean + (Math.random() - 0.35) * 9 + teamEdge + skillEdge);
  return Math.max(-2, Math.min(20, normal));
}

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rb-panel-inset p-3">
    <div className="text-xs text-slate-300">{label}</div>
    <div className="font-mono-num text-xl font-bold text-white mt-0.5">{value}</div>
  </div>
);
