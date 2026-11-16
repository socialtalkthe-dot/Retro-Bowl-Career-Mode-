import React, { useEffect, useRef, useState } from 'react';
import {
  CareerEra,
  LeagueTeam,
  PlayerProfile,
  Position,
  StatLine,
  UniformSet,
  WeatherType,
} from '../../types/career';
import { retroAudio } from '../../audio/retroAudio';
import { getWeatherMeta, rollWeatherWind } from '../../engine/weatherEngine';
import {
  drawRetroSprite,
  drawRetroSpriteFast,
  FieldColorPalette,
  useRetroAtlasReady,
} from '../../engine/retroSprites';

export interface PlayOutcome {
  yardsGained: number;
  isTouchdown: boolean;
  isTurnover: boolean;
  turnoverType?: 'INT' | 'FUMBLE' | 'DOWNS';
  isFirstDown: boolean;
  isSafety?: boolean;
  isFieldGoal?: boolean;
  fgMade?: boolean;
  isDoink?: boolean;
  fgDistance?: number;
  isOnsideKick?: boolean;
  onsideRecovered?: boolean;
  recoveredYard?: number;
  isKickoff?: boolean;
  isPunt?: boolean;
  isTouchback?: boolean;
  isOppReturnTd?: boolean;
  returnYard?: number;
  clockStopped?: boolean;
  commentary: string;
  statDelta: Partial<StatLine>;
}

interface FieldCanvasProps {
  player: PlayerProfile;
  myTeam: LeagueTeam;
  oppTeam: LeagueTeam;
  myUniform: UniformSet;
  oppUniform: UniformSet;
  era?: CareerEra;
  ballYard: number; // 0 = own goal line, 100 = opp goal line
  down: number;
  yardsToGo: number;
  weather: WeatherType;
  playMode: 'OFFENSE' | 'DEFENSE' | 'KICK_FG' | 'KICK_PAT' | 'KICK_ONSIDE' | 'KICKOFF' | 'KICK_PUNT';
  quarter: number;
  clockSec: number;
  driveDirection?: 'RIGHT' | 'LEFT' | 'BOTH';
  crowdTurnout?: number; // 0.2..1.0 based on team passion & fan meter
  myTimeouts?: number;
  onCallTimeout?: () => void;
  bulletPassEnabled: boolean;
  onToggleBulletPass: () => void;
  audiblesRemaining?: number;
  onUseAudible?: () => void;
  onPlayComplete: (outcome: PlayOutcome) => void;
}

type BodyType = '' | '_bulky' | '_thin';

interface Actor {
  id: string;
  role: 'USER' | 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'DB';
  team: 'OFF' | 'DEF';
  x: number; // yards (-10..110)
  y: number; // field width yards (0..26)
  z: number; // jump/dive height in pixels
  vx: number;
  vy: number;
  facing: 1 | -1;
  jersey: number;
  bodyType: BodyType;
  skin: string;
  routePoints?: { x: number; y: number }[];
  routeIdx?: number;
  knockedDown?: number;
  hasBall?: boolean;
  stiffArmCooldown?: number;
  stiffArmVisual?: number;
  celebrating?: number;
  jumping?: number;
  aiJukeTimer?: number;
  aiJukeDir?: -1 | 0 | 1;
  aiJukeCooldown?: number;
  aiDiveTimer?: number;
  aiScrambling?: boolean;
  stamina: number; // 0..100
  animPhase: number;
}

// Retro Bowl exact rm_match viewport & world geometry
const VIEW_W = 960;
const VIEW_H = 540;
const WORLD_W = 2600; // spr_field (1300) * 2
const FIELD_TOP_Y = 66; // spr_fieldfans (33) * 2
const TURF_TOP_Y = 132; // playable sideline top
const TURF_BOT_Y = 470; // playable sideline bottom
const FIELD_MID_Y_PX = 301;
const ZERO_YARD_PX = 300; // left endzone ends at x=300
const PIXELS_PER_YARD = 20; // 100 yards = 2000px (300..2300)
const FIELD_WIDTH_YARDS = 26;
const MID_Y = FIELD_WIDTH_YARDS / 2;

const SKIN_POOL = ['#f1c27d', '#d49a6a', '#8d5524', '#6b3e26', '#c68642'];

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function yardToPxX(yd: number) {
  return ZERO_YARD_PX + yd * PIXELS_PER_YARD;
}

function yardToPxY(ydY: number) {
  return TURF_TOP_Y + 12 + (ydY / FIELD_WIDTH_YARDS) * (TURF_BOT_Y - TURF_TOP_Y - 24);
}

function bodyTypeForRole(role: Actor['role'], userPos: Position): BodyType {
  const actual = role === 'USER' ? userPos : role;
  if (actual === 'OL' || actual === 'DL' || actual === 'TE') return '_bulky';
  if (actual === 'WR' || actual === 'CB' || actual === 'S' || actual === 'K' || actual === 'DB') {
    return '_thin';
  }
  return '';
}

function isEligibleReceiver(a: Actor, userPos: Position): boolean {
  if (a.team !== 'OFF') return false;
  if (a.role === 'WR' || a.role === 'TE' || a.role === 'RB') return true;
  if (a.role === 'USER' && (userPos === 'WR' || userPos === 'TE' || userPos === 'RB')) return true;
  return false;
}


interface OffensivePlay {
  id: string;
  name: string;
  type: 'PASS' | 'RUN';
  buildRoutes: (los: number) => {
    rb: { x: number; y: number }[];
    te: { x: number; y: number }[];
    wr1: { x: number; y: number }[];
    wr2: { x: number; y: number }[];
  };
}

type DefenseCallId = 'COVER_2' | 'MAN' | 'LB_BLITZ' | 'PREVENT';

interface DefensiveCall {
  id: DefenseCallId;
  name: string;
  cbCushion: number;
  lbDepth: number;
  sDepth: number;
}

const OFFENSE_PLAYBOOK: OffensivePlay[] = [
  {
    id: 'POST_COMEBACK',
    name: 'POST & COMEBACK',
    type: 'PASS',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 1.2, y: MID_Y + 5.8 },
        { x: los + 5.5, y: MID_Y + 7.5 },
      ],
      te: [
        { x: los + 4.0, y: MID_Y + 4.8 },
        { x: los + 7.5, y: MID_Y - 3.5 },
        { x: los + 12.0, y: MID_Y - 6.5 },
      ],
      wr1: [
        { x: los + 8.5, y: MID_Y - 9.0 },
        { x: los + 18.0, y: MID_Y - 3.5 },
        { x: los + 28.0, y: MID_Y + 0.5 },
      ],
      wr2: [
        { x: los + 13.5, y: MID_Y + 9.2 },
        { x: los + 11.2, y: MID_Y + 10.6 },
      ],
    }),
  },
  {
    id: 'SMASH_HITCH_CORNER',
    name: 'HITCH & CORNER',
    type: 'PASS',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 0.8, y: MID_Y - 5.5 },
        { x: los + 4.5, y: MID_Y - 8.2 },
      ],
      te: [
        { x: los + 9.0, y: MID_Y + 4.8 },
        { x: los + 9.5, y: MID_Y - 4.0 },
        { x: los + 11.0, y: MID_Y - 8.5 },
      ],
      wr1: [
        { x: los + 6.4, y: MID_Y - 9.0 },
        { x: los + 5.6, y: MID_Y - 7.8 },
      ],
      wr2: [
        { x: los + 8.5, y: MID_Y + 7.4 },
        { x: los + 18.5, y: MID_Y + 11.4 },
        { x: los + 25.0, y: MID_Y + 11.8 },
      ],
    }),
  },
  {
    id: 'SLANTS_OUT',
    name: 'SLANTS & OUT',
    type: 'PASS',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 1.5, y: MID_Y + 6.2 },
        { x: los + 8.5, y: MID_Y + 8.2 },
      ],
      te: [
        { x: los + 6.5, y: MID_Y + 4.8 },
        { x: los + 22.0, y: MID_Y + 3.2 },
      ],
      wr1: [
        { x: los + 4.2, y: MID_Y - 9.0 },
        { x: los + 12.0, y: MID_Y - 2.2 },
        { x: los + 19.0, y: MID_Y + 2.5 },
      ],
      wr2: [
        { x: los + 6.5, y: MID_Y + 8.6 },
        { x: los + 7.2, y: MID_Y + 11.8 },
      ],
    }),
  },
  {
    id: 'CURL_FLATS',
    name: 'CURL FLATS',
    type: 'PASS',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 1.2, y: MID_Y - 7.8 },
        { x: los + 8.0, y: MID_Y - 10.6 },
        { x: los + 22.0, y: MID_Y - 11.0 },
      ],
      te: [
        { x: los + 4.0, y: MID_Y + 7.8 },
        { x: los + 6.5, y: MID_Y + 10.8 },
      ],
      wr1: [
        { x: los + 11.0, y: MID_Y - 9.0 },
        { x: los + 9.2, y: MID_Y - 7.2 },
      ],
      wr2: [
        { x: los + 10.5, y: MID_Y + 9.2 },
        { x: los + 8.8, y: MID_Y + 7.4 },
      ],
    }),
  },
  {
    id: 'DEEP_DIG_DRAG',
    name: 'DEEP DIG & DRAG',
    type: 'PASS',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 1.5, y: MID_Y + 7.5 },
        { x: los + 10.0, y: MID_Y + 10.6 },
        { x: los + 24.0, y: MID_Y + 10.8 },
      ],
      te: [
        { x: los + 7.5, y: MID_Y + 4.8 },
        { x: los + 16.0, y: MID_Y + 1.2 },
        { x: los + 24.0, y: MID_Y + 6.8 },
      ],
      wr1: [
        { x: los + 12.5, y: MID_Y - 9.0 },
        { x: los + 13.0, y: MID_Y + 2.5 },
      ],
      wr2: [
        { x: los + 2.8, y: MID_Y + 9.2 },
        { x: los + 6.0, y: MID_Y - 1.5 },
        { x: los + 11.5, y: MID_Y - 8.2 },
      ],
    }),
  },
  {
    id: 'FLOOD_RIGHT',
    name: 'FLOOD RIGHT',
    type: 'PASS',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 1.2, y: MID_Y - 5.2 },
        { x: los + 4.8, y: MID_Y - 7.5 },
      ],
      te: [
        { x: los + 5.2, y: MID_Y + 5.0 },
        { x: los + 6.2, y: MID_Y + 10.6 },
      ],
      wr1: [
        { x: los + 8.0, y: MID_Y - 9.0 },
        { x: los + 29.0, y: MID_Y - 9.0 },
      ],
      wr2: [
        { x: los + 11.5, y: MID_Y + 8.5 },
        { x: los + 13.0, y: MID_Y + 11.6 },
      ],
    }),
  },
  {
    id: 'PA_FOUR_VERTS',
    name: 'FOUR VERTS',
    type: 'PASS',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 1.2, y: MID_Y + 8.5 },
        { x: los + 12.0, y: MID_Y + 10.4 },
        { x: los + 25.0, y: MID_Y + 10.8 },
      ],
      te: [
        { x: los + 8.0, y: MID_Y + 4.8 },
        { x: los + 28.0, y: MID_Y + 3.4 },
      ],
      wr1: [
        { x: los + 8.0, y: MID_Y - 9.0 },
        { x: los + 30.0, y: MID_Y - 9.0 },
      ],
      wr2: [
        { x: los + 8.0, y: MID_Y + 9.2 },
        { x: los + 30.0, y: MID_Y + 9.2 },
      ],
    }),
  },
  {
    id: 'HB_INSIDE_DIVE',
    name: 'HB INSIDE DIVE',
    type: 'RUN',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 2.2, y: MID_Y + 0.6 },
        { x: los + 18.0, y: MID_Y + 0.4 },
      ],
      te: [
        { x: los + 4.0, y: MID_Y + 4.2 },
        { x: los + 12.0, y: MID_Y + 3.0 },
      ],
      wr1: [
        { x: los + 8.0, y: MID_Y - 9.0 },
        { x: los + 20.0, y: MID_Y - 8.5 },
      ],
      wr2: [
        { x: los + 8.0, y: MID_Y + 9.2 },
        { x: los + 20.0, y: MID_Y + 8.8 },
      ],
    }),
  },
  {
    id: 'HB_OFF_TACKLE',
    name: 'HB OFF-TACKLE',
    type: 'RUN',
    buildRoutes: (los) => ({
      rb: [
        { x: los + 1.2, y: MID_Y + 3.8 },
        { x: los + 8.5, y: MID_Y + 4.6 },
        { x: los + 20.0, y: MID_Y + 3.6 },
      ],
      te: [
        { x: los + 2.5, y: MID_Y + 5.8 },
        { x: los + 9.0, y: MID_Y + 6.4 },
      ],
      wr1: [
        { x: los + 7.5, y: MID_Y - 8.8 },
        { x: los + 16.0, y: MID_Y - 5.0 },
      ],
      wr2: [
        { x: los + 6.0, y: MID_Y + 9.0 },
        { x: los + 14.0, y: MID_Y + 6.5 },
      ],
    }),
  },
  {
    id: 'HB_OUTSIDE_TOSS',
    name: 'HB OUTSIDE TOSS',
    type: 'RUN',
    buildRoutes: (los) => ({
      rb: [
        { x: los - 0.4, y: MID_Y + 6.4 },
        { x: los + 6.5, y: MID_Y + 9.2 },
        { x: los + 22.0, y: MID_Y + 8.2 },
      ],
      te: [
        { x: los + 2.6, y: MID_Y + 6.8 },
        { x: los + 10.0, y: MID_Y + 6.2 },
      ],
      wr1: [
        { x: los + 7.0, y: MID_Y - 8.2 },
        { x: los + 18.0, y: MID_Y - 4.5 },
      ],
      wr2: [
        { x: los + 4.5, y: MID_Y + 8.8 },
        { x: los + 11.0, y: MID_Y + 7.2 },
      ],
    }),
  },
  {
    id: 'HB_LEFT_SWEEP',
    name: 'HB LEFT SWEEP',
    type: 'RUN',
    buildRoutes: (los) => ({
      rb: [
        { x: los - 0.5, y: MID_Y - 6.4 },
        { x: los + 6.5, y: MID_Y - 9.2 },
        { x: los + 22.0, y: MID_Y - 8.2 },
      ],
      te: [
        { x: los + 4.0, y: MID_Y + 3.2 },
        { x: los + 12.0, y: MID_Y - 1.0 },
      ],
      wr1: [
        { x: los + 4.5, y: MID_Y - 8.8 },
        { x: los + 11.0, y: MID_Y - 6.8 },
      ],
      wr2: [
        { x: los + 7.0, y: MID_Y + 8.2 },
        { x: los + 16.0, y: MID_Y + 3.5 },
      ],
    }),
  },
  {
    id: 'HB_COUNTER',
    name: 'HB COUNTER',
    type: 'RUN',
    buildRoutes: (los) => ({
      rb: [
        { x: los - 2.4, y: MID_Y + 3.2 },
        { x: los + 1.8, y: MID_Y - 3.6 },
        { x: los + 18.0, y: MID_Y - 4.8 },
      ],
      te: [
        { x: los + 2.5, y: MID_Y + 4.0 },
        { x: los + 8.0, y: MID_Y - 1.5 },
      ],
      wr1: [
        { x: los + 5.5, y: MID_Y - 8.6 },
        { x: los + 14.0, y: MID_Y - 6.5 },
      ],
      wr2: [
        { x: los + 7.5, y: MID_Y + 8.8 },
        { x: los + 16.0, y: MID_Y + 5.5 },
      ],
    }),
  },
];

const DEFENSE_PLAYBOOK: DefensiveCall[] = [
  { id: 'COVER_2', name: 'COVER 2 ZONE', cbCushion: 4.6, lbDepth: 4.5, sDepth: 11.8 },
  { id: 'MAN', name: 'MAN COVERAGE', cbCushion: 2.8, lbDepth: 4.2, sDepth: 10.4 },
  { id: 'LB_BLITZ', name: 'LB BLITZ', cbCushion: 3.4, lbDepth: 2.8, sDepth: 11.2 },
  { id: 'PREVENT', name: 'PREVENT DEEP', cbCushion: 8.2, lbDepth: 6.2, sDepth: 14.5 },
];

export const FieldCanvas: React.FC<FieldCanvasProps> = ({
  player,
  myTeam,
  oppTeam,
  myUniform,
  oppUniform,
  era = 'NFL',
  ballYard,
  down,
  yardsToGo,
  weather,
  playMode,
  quarter,
  clockSec,
  driveDirection = 'BOTH',
  crowdTurnout = 0.72,
  myTimeouts = 3,
  onCallTimeout,
  bulletPassEnabled,
  onToggleBulletPass,
  audiblesRemaining = 4,
  onUseAudible,
  onPlayComplete,
}) => {
  const driveDir: 1 | -1 =
    driveDirection === 'LEFT'
      ? -1
      : driveDirection === 'RIGHT'
        ? 1
        : quarter % 2 === 1
          ? 1
          : -1;
  const worldToPxX = (yd: number) =>
    driveDir === 1 ? ZERO_YARD_PX + yd * PIXELS_PER_YARD : WORLD_W - ZERO_YARD_PX - yd * PIXELS_PER_YARD;
  const weatherMeta = getWeatherMeta(weather);

  const atlasReady = useRetroAtlasReady();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [bannerText, setBannerText] = useState<string>('GET READY');
  const [subPrompt, setSubPrompt] = useState<string>('');
  const [playPhase, setPlayPhase] = useState<'PRE_SNAP' | 'LIVE' | 'RESULT'>('PRE_SNAP');
  const [callForBallCooldown, setCallForBallCooldown] = useState(false);
  const [activePlayLabel, setActivePlayLabel] = useState<string>('POST & COMEBACK');
  const [localAudibles, setLocalAudibles] = useState(audiblesRemaining);
  const [staminaPct, setStaminaPct] = useState<number>(() =>
    Math.round(clamp(58 + player.condition * 0.42, 48, 100))
  );

  const simRef = useRef<{
    phase: 'PRE_SNAP' | 'LIVE' | 'RESULT';
    actors: Actor[];
    ball: {
      x: number;
      y: number;
      z: number; // height in yards (~0..12)
      vx: number;
      vy: number;
      vz: number;
      gravity: number;
      flightElapsed: number;
      inAir: boolean;
      isKick: boolean;
      isBullet: boolean;
      targetX: number;
      targetY: number;
      thrownByUser: boolean;
      intendedId?: string;
      blurTrail: { px: number; py: number }[];
      spinPhase: number;
    };
    keys: Record<string, boolean>;
    drag: { active: boolean; startX: number; startY: number; curX: number; curY: number };
    camPx: number;
    snapTimer: number;
    liveTime: number;
    playType: 'PASS' | 'RUN';
    userActionCooldown: number;
    userJumpTimer: number;
    staminaSyncTimer: number;
    snapJumpWindow: number;
    snapJumpBonus: number;
    catchProtectTimer: number;
    handoffTimer: number;
    slideTimer: number;
    kickMeter: {
      step: 'POWER' | 'AIM' | 'FLIGHT' | 'DONE';
      powerVal: number;
      powerDir: number;
      aimAngle: number; // -1..1
      aimDir: number;
      wind: number;
      aimElapsed: number;
    };
    kickReturnActive: boolean;
    weatherParticles: { x: number; y: number; speed: number }[];
    finished: boolean;
    blocksLanded: number;
    pancakesLanded: number;
    tacklesMade: number;
    sacksMade: number;
    deflectionsMade: number;
    intsMade: number;
    jukeBoostTimer: number;
    jukeDir: -1 | 0 | 1;
    jukeTimer: number;
    diveTimer: number;
    calledForBall: boolean;
    qbThrowTimer: number;
    qbPostThrowTimer: number;
    dbReactTimer: number;
    crowdExcited: number;
    offPlayIdx: number;
    defPlayIdx: number;
    defCall: DefenseCallId;
  } | null>(null);

  useEffect(() => {
    setLocalAudibles(audiblesRemaining);
  }, [audiblesRemaining]);

  useEffect(() => {
    const pos: Position = player.position;
    const actors: Actor[] = [];
    const los = ballYard;
    const isDefense = playMode === 'DEFENSE';
    const isKick =
      playMode === 'KICK_FG' ||
      playMode === 'KICK_PAT' ||
      playMode === 'KICK_ONSIDE' ||
      playMode === 'KICKOFF' ||
      playMode === 'KICK_PUNT';
    const isSpecialKickoff = playMode === 'KICK_ONSIDE' || playMode === 'KICKOFF';
    let baseRunProb =
      pos === 'RB'
        ? 0.64
        : pos === 'WR'
          ? 0.14
          : pos === 'TE'
            ? 0.34
            : 0.4;
    if (down >= 3 && yardsToGo >= 7) baseRunProb -= 0.28;
    else if (down >= 2 && yardsToGo <= 2) baseRunProb += 0.22;
    if (los >= 93) baseRunProb += 0.16;
    baseRunProb += weatherMeta.runCallBoost;
    const preferRun = !isKick && Math.random() < clamp(baseRunProb, 0.06, 0.86);

    const passPlayIndices = OFFENSE_PLAYBOOK.map((p, idx) => (p.type === 'PASS' ? idx : -1)).filter((i) => i >= 0);
    const runPlayIndices = OFFENSE_PLAYBOOK.map((p, idx) => (p.type === 'RUN' ? idx : -1)).filter((i) => i >= 0);
    const initialOffIdx = preferRun
      ? runPlayIndices[Math.floor(Math.random() * runPlayIndices.length)]
      : passPlayIndices[Math.floor(Math.random() * passPlayIndices.length)];
    const initialOffPlay = OFFENSE_PLAYBOOK[initialOffIdx];
    const initialDefIdx = Math.floor(Math.random() * 2); // COVER_2 or MAN
    const initialDefPlay = DEFENSE_PLAYBOOK[initialDefIdx];
    const playType: 'PASS' | 'RUN' = isKick ? 'PASS' : initialOffPlay.type;
    const startUserStamina = clamp(58 + player.condition * 0.42, 48, 100);

    const makeActor = (
      id: string,
      role: Actor['role'],
      team: 'OFF' | 'DEF',
      x: number,
      y: number,
      jersey: number,
      extra?: Partial<Actor>
    ): Actor => ({
      id,
      role,
      team,
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      facing: team === 'OFF' ? 1 : -1,
      jersey,
      bodyType: bodyTypeForRole(role, pos),
      skin: role === 'USER' ? player.skinTone : SKIN_POOL[jersey % SKIN_POOL.length],
      stamina: role === 'USER' ? startUserStamina : team === 'OFF' ? 86 + myTeam.offense * 2 : 86 + oppTeam.defense * 2,
      animPhase: Math.random() * 6,
      ...extra,
    });

    if (isSpecialKickoff) {
      actors.push(
        makeActor('kicker', pos === 'K' ? 'USER' : 'QB', 'OFF', los - 4.5, MID_Y - 1.4, player.jersey, {
          hasBall: false,
        })
      );
      // Kicking team gunners start behind the kick tee and approach once power is set
      [-9.5, -5.0, -1.8, 2.2, 5.8, 9.5].forEach((dy, i) => {
        actors.push(makeActor(`ko_gun_${i}`, i % 2 === 0 ? 'DB' : 'LB', 'OFF', los - 4.2, MID_Y + dy, 40 + i));
      });
      // Receiving team: tight "hands team" on ONSIDE vs deep returners on KICKOFF
      if (playMode === 'KICK_ONSIDE') {
        [-8.2, -3.8, 0.2, 4.2, 8.2].forEach((dy, i) => {
          actors.push(makeActor(`ko_hands_${i}`, 'WR', 'DEF', los + 11.2, MID_Y + dy, 80 + i));
        });
        actors.push(makeActor('ko_hands_deep', 'RB', 'DEF', los + 16.5, MID_Y, 22));
      } else {
        [-8.5, -3.5, 0, 3.5, 8.5].forEach((dy, i) => {
          actors.push(makeActor(`ko_blk_${i}`, 'LB', 'DEF', los + 14.0, MID_Y + dy, 50 + i));
        });
        actors.push(makeActor('ko_ret', 'RB', 'DEF', 96, MID_Y, 22));
      }
    } else if (playMode === 'KICK_PUNT') {
      actors.push(
        makeActor('kicker', pos === 'K' ? 'USER' : 'QB', 'OFF', los - 10.8, MID_Y, player.jersey, {
          hasBall: true,
        })
      );
      actors.push(makeActor('holder', 'RB', 'OFF', los - 4.5, MID_Y + 1.5, 24));
      [-2.8, -1.4, 0, 1.4, 2.8].forEach((dy, i) => {
        actors.push(makeActor(`k_ol_${i}`, 'OL', 'OFF', los - 0.8, MID_Y + dy, 70 + i));
        actors.push(makeActor(`k_dl_${i}`, 'DL', 'DEF', los + 1.1, MID_Y + dy, 90 + i));
      });
      actors.push(makeActor('p_gun1', 'DB', 'OFF', los - 0.8, MID_Y - 8.5, 41));
      actors.push(makeActor('p_gun2', 'DB', 'OFF', los - 0.8, MID_Y + 8.5, 42));
      actors.push(makeActor('p_ret', 'RB', 'DEF', Math.min(97, los + 42), MID_Y, 22));
    } else if (isKick) {
      actors.push(
        makeActor('kicker', pos === 'K' ? 'USER' : 'QB', 'OFF', los - 8, MID_Y + 1.2, player.jersey, {
          hasBall: false,
        })
      );
      actors.push(makeActor('holder', 'QB', 'OFF', los - 4.5, MID_Y, 12, { hasBall: true }));
      [-2.5, -1.2, 0, 1.2, 2.5].forEach((dy, i) => {
        actors.push(makeActor(`k_ol_${i}`, 'OL', 'OFF', los - 0.8, MID_Y + dy, 70 + i));
        actors.push(makeActor(`k_dl_${i}`, 'DL', 'DEF', los + 1.1, MID_Y + dy, 90 + i));
      });
    } else {
      const qbRole: Actor['role'] = !isDefense && pos === 'QB' ? 'USER' : 'QB';
      const rbRole: Actor['role'] = !isDefense && pos === 'RB' ? 'USER' : 'RB';
      const wr1Role: Actor['role'] = !isDefense && pos === 'WR' ? 'USER' : 'WR';
      const teRole: Actor['role'] = !isDefense && pos === 'TE' ? 'USER' : 'TE';
      const olUser = !isDefense && pos === 'OL';

      actors.push(
        makeActor('off_qb', qbRole, 'OFF', los - 3.2, MID_Y, qbRole === 'USER' ? player.jersey : 12, {
          hasBall: true,
        })
      );

      const initialRoutes = initialOffPlay.buildRoutes(los);

      actors.push(
        makeActor('off_rb', rbRole, 'OFF', los - 5.4, MID_Y + 2.4, rbRole === 'USER' ? player.jersey : 24, {
          routePoints: initialRoutes.rb,
          routeIdx: 0,
        })
      );

      [-3.6, -1.8, 0, 1.8, 3.6].forEach((dy, i) => {
        actors.push(
          makeActor(
            `off_ol_${i}`,
            olUser && i === 2 ? 'USER' : 'OL',
            'OFF',
            los - 0.8,
            MID_Y + dy,
            olUser && i === 2 ? player.jersey : 70 + i
          )
        );
      });

      actors.push(
        makeActor('off_te', teRole, 'OFF', los - 1.0, MID_Y + 4.8, teRole === 'USER' ? player.jersey : 88, {
          routePoints: initialRoutes.te,
          routeIdx: 0,
        })
      );

      actors.push(
        makeActor('off_wr1', wr1Role, 'OFF', los - 0.8, MID_Y - 9.0, wr1Role === 'USER' ? player.jersey : 81, {
          routePoints: initialRoutes.wr1,
          routeIdx: 0,
        })
      );

      actors.push(
        makeActor('off_wr2', 'WR', 'OFF', los - 0.8, MID_Y + 9.2, 84, {
          routePoints: initialRoutes.wr2,
          routeIdx: 0,
        })
      );

      const dlUser = isDefense && pos === 'DL';
      const lbUser = isDefense && pos === 'LB';
      const cbUser = isDefense && pos === 'CB';
      const sUser = isDefense && pos === 'S';

      [-2.8, 0, 2.8].forEach((dy, i) => {
        actors.push(
          makeActor(
            `def_dl_${i}`,
            dlUser && i === 1 ? 'USER' : 'DL',
            'DEF',
            los + 1.1,
            MID_Y + dy,
            dlUser && i === 1 ? player.jersey : 90 + i
          )
        );
      });

      [-3.5, 3.5].forEach((dy, i) => {
        actors.push(
          makeActor(
            `def_lb_${i}`,
            lbUser && i === 0 ? 'USER' : 'LB',
            'DEF',
            los + initialDefPlay.lbDepth,
            MID_Y + dy,
            lbUser && i === 0 ? player.jersey : 52 + i
          )
        );
      });

      actors.push(
        makeActor(
          'def_cb1',
          cbUser ? 'USER' : 'DB',
          'DEF',
          los + initialDefPlay.cbCushion,
          MID_Y - 9.0,
          cbUser ? player.jersey : 21
        )
      );
      actors.push(makeActor('def_cb2', 'DB', 'DEF', los + initialDefPlay.cbCushion + 0.2, MID_Y + 9.2, 27));
      actors.push(
        makeActor('def_s1', sUser ? 'USER' : 'DB', 'DEF', los + initialDefPlay.sDepth, MID_Y, sUser ? player.jersey : 32)
      );
    }

    const particleCount =
      weather === 'SUN'
        ? 0
        : weather === 'STORM'
          ? 135
          : weather === 'BLIZZARD'
            ? 150
            : weather === 'WIND'
              ? 46
              : weather === 'FOG'
                ? 24
                : 78;
    const weatherParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * VIEW_W,
      y: Math.random() * VIEW_H,
      speed:
        weather === 'STORM'
          ? 12.5 + Math.random() * 6
          : weather === 'RAIN'
            ? 9 + Math.random() * 5
            : weather === 'BLIZZARD'
              ? 3.2 + Math.random() * 2.4
              : weather === 'WIND'
                ? 11 + Math.random() * 7
                : weather === 'FOG'
                  ? 0.65 + Math.random() * 0.65
                  : 1.7 + Math.random() * 1.4,
    }));

    const wind = rollWeatherWind(weather);
    const initialCam =
      driveDir === 1
        ? clamp(worldToPxX(los) - 340, 0, WORLD_W - VIEW_W)
        : clamp(worldToPxX(los) - (VIEW_W - 340), 0, WORLD_W - VIEW_W);

    simRef.current = {
      phase: isKick ? 'LIVE' : 'PRE_SNAP',
      actors,
      ball: {
        x: playMode === 'KICK_PUNT' ? los - 10 : isKick ? los - 4.5 : los - 3.2,
        y: MID_Y,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 11,
        flightElapsed: 0,
        inAir: false,
        isKick,
        isBullet: false,
        targetX: 100,
        targetY: MID_Y,
        thrownByUser: false,
        blurTrail: [],
        spinPhase: 0,
      },
      keys: {},
      drag: { active: false, startX: 0, startY: 0, curX: 0, curY: 0 },
      camPx: initialCam,
      snapTimer: 0,
      liveTime: 0,
      playType,
      userActionCooldown: 0,
      userJumpTimer: 0,
      staminaSyncTimer: 0,
      snapJumpWindow: 0.72 + Math.random() * 0.4,
      snapJumpBonus: 0,
      catchProtectTimer: 0,
      handoffTimer: 0,
      slideTimer: 0,
      kickMeter: {
        step: 'POWER',
        powerVal: 0.25,
        powerDir: 1,
        aimAngle: 0,
        aimDir: 1,
        wind,
        aimElapsed: 0,
      },
      kickReturnActive: false,
      weatherParticles,
      finished: false,
      blocksLanded: 0,
      pancakesLanded: 0,
      tacklesMade: 0,
      sacksMade: 0,
      deflectionsMade: 0,
      intsMade: 0,
      jukeBoostTimer: 0,
      jukeDir: 0,
      jukeTimer: 0,
      diveTimer: 0,
      calledForBall: false,
      qbThrowTimer: 2.05 + Math.random() * 0.95,
      qbPostThrowTimer: 0,
      dbReactTimer: 0,
      crowdExcited: 0,
      offPlayIdx: initialOffIdx,
      defPlayIdx: initialDefIdx,
      defCall: initialDefPlay.id,
    };

    setPlayPhase(isKick ? 'LIVE' : 'PRE_SNAP');
    setActivePlayLabel(isDefense ? initialDefPlay.name : initialOffPlay.name);
    setStaminaPct(Math.round(startUserStamina));
    setCallForBallCooldown(false);
    // Keep keyboard focus locked onto the field container automatically
    requestAnimationFrame(() => containerRef.current?.focus());

    if (isKick) {
      if (playMode === 'KICK_ONSIDE') {
        setBannerText('ONSIDE KICK!');
        setSubPrompt('Lock SWEET-SPOT POWER (38-68%) for a bouncy 10-15 yd chop, then AIM!');
      } else if (playMode === 'KICKOFF') {
        setBannerText('KICKOFF');
        setSubPrompt('SPACE/Click to boom a deep kickoff and pin the returner!');
      } else if (playMode === 'KICK_PUNT') {
        setBannerText('4TH DOWN PUNT');
        setSubPrompt('SPACE/Click to lock POWER and AIM to pin the opponent deep!');
      } else {
        setBannerText(playMode === 'KICK_PAT' ? 'POINT AFTER' : `${Math.round(100 - los + 17)} YD FIELD GOAL`);
        setSubPrompt('Click or Press SPACE to lock POWER, then AIM!');
      }
    } else if (isDefense) {
      const hint = playType === 'RUN' ? 'READ: RUN PLAY' : 'READ: PASS PLAY';
      setBannerText(pos === 'DL' ? 'WAIT FOR HIKE!' : hint);
      setSubPrompt(
        pos === 'DL'
          ? 'SPACE at HIKE for snap jump · E Audible Defense · WASD move · SPACE shed/tackle!'
          : pos === 'LB'
            ? 'E Audible Defense · WASD to read & react · SPACE Lunge Tackle or Swat/Pick!'
            : 'E Audible Defense · WASD to shadow WR · SPACE to Swat or Intercept!'
      );
    } else {
      setBannerText(pos === 'QB' ? initialOffPlay.name : playType === 'RUN' ? 'RUN PLAY' : initialOffPlay.name);
      setSubPrompt(
        pos === 'QB'
          ? 'Drag back to aim · E Audible Play · H Hand Off · WASD Scramble'
          : pos === 'RB'
            ? playType === 'RUN'
              ? 'E Audible Play · Auto-runs forward on handoff · W/S Juke · SPACE Dive!'
              : 'E Audible Play · Run route · SPACE to Call for Ball / Dive!'
            : pos === 'WR' || pos === 'TE'
              ? 'E Audible Play · Run route with WASD · SPACE Call for Ball / Dive!'
              : 'E Audible Play · WASD to engage rushers · SPACE Pancake Block!'
      );
    }
  }, [ballYard, down, yardsToGo, playMode, player.position, player.jersey, player.skinTone, weather, driveDirection, quarter]);

  const computePassPhysics = (
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    isBullet: boolean,
    distHint?: number
  ) => {
    const dx = targetX - fromX;
    const dy = targetY - fromY;
    const dist = distHint ?? Math.max(4, Math.hypot(dx, dy));
    const speed = isBullet ? 23.0 : 15.5;
    const flightT = clamp(dist / speed, 0.42, isBullet ? 1.12 : 1.78);
    const gravity = isBullet ? 4.2 : 7.8;
    const vx = dx / flightT;
    const vy = dy / flightT;
    // Start z=1.55 -> arrive at chest height z=1.05 at t = flightT
    const vz = (1.05 - 1.55) / flightT + 0.5 * gravity * flightT;
    return { vx, vy, vz, gravity, flightT };
  };

  const computeThrowVelocity = (sim: NonNullable<typeof simRef.current>, prof: PlayerProfile) => {
    const dx = (sim.drag.startX - sim.drag.curX) * driveDir;
    const dy = sim.drag.startY - sim.drag.curY;
    const rawPull = Math.hypot(dx, dy);
    const maxPull = 145;
    const powerScale = clamp(rawPull / maxPull, 0.16, 1);
    const maxYards = 19 + prof.attributes.strength * 3.1;
    const distYards = maxYards * powerScale;
    const ang = Math.atan2(dy, Math.max(8, dx));
    const qb = sim.actors.find((a) => a.role === 'USER');
    const fromX = qb?.x ?? ballYard - 3;
    const fromY = qb?.y ?? MID_Y;
    // Skill tightens throw precision; heavy wind/fog/storm introduces subtle placement scatter
    const scatterRadius = Math.max(0, (10 - prof.attributes.skill) * 0.085) + weatherMeta.throwScatter * (distYards / 35);
    const scatterX = (Math.random() - 0.5) * scatterRadius * 0.9;
    const scatterY = (Math.random() - 0.5) * scatterRadius * 1.1;
    const targetX = clamp(fromX + Math.cos(ang) * distYards + scatterX, 1, 108);
    const targetY = clamp(fromY + Math.sin(ang) * distYards * 0.72 + scatterY, 1.0, FIELD_WIDTH_YARDS - 1.0);
    const phys = computePassPhysics(fromX, fromY, targetX, targetY, bulletPassEnabled, distYards);
    return { ...phys, targetX, targetY };
  };

  const assignIntendedReceiver = (sim: NonNullable<typeof simRef.current>, targetX: number, targetY: number, preferUser = false) => {
    const eligible = sim.actors.filter((a) => isEligibleReceiver(a, player.position));
    if (preferUser) {
      const u = eligible.find((a) => a.role === 'USER');
      if (u) {
        sim.ball.intendedId = u.id;
        return;
      }
    }
    let best: Actor | null = null;
    let bestD = Infinity;
    for (const r of eligible) {
      // Evaluate distance both to current pos and 0.4s ahead along velocity/route
      const dNow = Math.hypot(r.x - targetX, r.y - targetY);
      const dAhead = Math.hypot(r.x + r.vx * 0.35 - targetX, r.y + r.vy * 0.35 - targetY);
      const score = Math.min(dNow, dAhead);
      if (score < bestD) {
        bestD = score;
        best = r;
      }
    }
    sim.ball.intendedId = best?.id;
  };

  const triggerAudible = () => {
    const sim = simRef.current;
    if (!sim || sim.finished || sim.phase !== 'PRE_SNAP') return;
    if (playMode === 'KICK_FG' || playMode === 'KICK_PAT') return;
    if (localAudibles <= 0) {
      setBannerText('NO AUDIBLES LEFT');
      retroAudio.play('click', 0.5);
      return;
    }

    setLocalAudibles((c) => Math.max(0, c - 1));
    onUseAudible?.();
    retroAudio.play('audible', 0.9);

    if (playMode === 'DEFENSE') {
      sim.defPlayIdx = (sim.defPlayIdx + 1) % DEFENSE_PLAYBOOK.length;
      const nextDef = DEFENSE_PLAYBOOK[sim.defPlayIdx];
      sim.defCall = nextDef.id;
      for (const a of sim.actors) {
        if (a.team !== 'DEF' || a.role === 'USER') continue;
        if (a.id.startsWith('def_lb')) a.x = ballYard + nextDef.lbDepth;
        else if (a.id === 'def_cb1') a.x = ballYard + nextDef.cbCushion;
        else if (a.id === 'def_cb2') a.x = ballYard + nextDef.cbCushion + 0.2;
        else if (a.id === 'def_s1') a.x = ballYard + nextDef.sDepth;
      }
      setActivePlayLabel(nextDef.name);
      setBannerText(`AUDIBLE: ${nextDef.name}`);
    } else {
      sim.offPlayIdx = (sim.offPlayIdx + 1) % OFFENSE_PLAYBOOK.length;
      const nextPlay = OFFENSE_PLAYBOOK[sim.offPlayIdx];
      sim.playType = nextPlay.type;
      const routes = nextPlay.buildRoutes(ballYard);
      const rb = sim.actors.find((a) => a.id === 'off_rb');
      const te = sim.actors.find((a) => a.id === 'off_te');
      const wr1 = sim.actors.find((a) => a.id === 'off_wr1');
      const wr2 = sim.actors.find((a) => a.id === 'off_wr2');
      if (rb) {
        rb.routePoints = routes.rb;
        rb.routeIdx = 0;
      }
      if (te) {
        te.routePoints = routes.te;
        te.routeIdx = 0;
      }
      if (wr1) {
        wr1.routePoints = routes.wr1;
        wr1.routeIdx = 0;
      }
      if (wr2) {
        wr2.routePoints = routes.wr2;
        wr2.routeIdx = 0;
      }
      sim.snapTimer = Math.min(sim.snapTimer, 0.2);
      setActivePlayLabel(nextPlay.name);
      setBannerText(`AUDIBLE: ${nextPlay.name}`);
    }
  };

  const triggerSnap = () => {
    const sim = simRef.current;
    if (!sim || sim.phase !== 'PRE_SNAP') return;
    sim.phase = 'LIVE';
    setPlayPhase('LIVE');
    retroAudio.play('beep2', 0.65);

    if (playMode === 'DEFENSE' && player.position === 'DL') {
      const diff = Math.abs(sim.snapTimer - sim.snapJumpWindow);
      if (diff < 0.3) {
        sim.snapJumpBonus = 1.5;
        setBannerText('PERFECT JUMP!');
      } else {
        setBannerText('HIKE!');
      }
    } else {
      setBannerText(
        player.position === 'QB'
          ? 'IN THE POCKET'
          : player.position === 'RB' && sim.playType === 'RUN'
            ? 'HIT THE HOLE!'
            : player.position === 'WR' || player.position === 'TE'
              ? 'RUN ROUTE!'
              : player.position === 'OL'
                ? 'HOLD THE LINE!'
                : 'LIVE!'
      );
    }
  };

  const triggerUserAction = () => {
    const sim = simRef.current;
    if (!sim || sim.finished) return;

    if (
      playMode === 'KICK_FG' ||
      playMode === 'KICK_PAT' ||
      playMode === 'KICK_ONSIDE' ||
      playMode === 'KICKOFF' ||
      playMode === 'KICK_PUNT'
    ) {
      const km = sim.kickMeter;
      if (km.step === 'POWER') {
        km.step = 'AIM';
        km.aimElapsed = 0;
        if (playMode === 'KICK_FG' || playMode === 'KICK_PAT' || playMode === 'KICK_PUNT') {
          retroAudio.play('beep2', 0.8);
          setSubPrompt('SNAP IS DOWN! Rushers are coming — SPACE/Click to lock AIM & kick!');
        } else {
          retroAudio.play('beep', 0.8);
          setSubPrompt('APPROACH! Gunners are moving — SPACE/Click to lock AIM & kick!');
        }
      } else if (km.step === 'AIM') {
        km.step = 'FLIGHT';
        retroAudio.play('kick', 0.9);
        if (playMode === 'KICK_ONSIDE') {
          // Power sweet spot (0.38..0.68) kicks 11..15 yds; too soft < 10 yds, too hard > 16.5 yds
          const kickDist = 6.5 + km.powerVal * 14.5;
          const aimSpread = km.aimAngle * 8.2 + km.wind * (weatherMeta.kickWindFactor * 0.6);
          const endX = clamp(ballYard + kickDist, ballYard + 6, 98);
          const endY = clamp(MID_Y + aimSpread, 1.5, FIELD_WIDTH_YARDS - 1.5);
          const flightT = 1.25;

          sim.ball.inAir = true;
          sim.ball.flightElapsed = 0;
          sim.ball.gravity = 16;
          sim.ball.x = ballYard;
          sim.ball.y = MID_Y;
          sim.ball.z = 0.35;
          sim.ball.targetX = endX;
          sim.ball.targetY = endY;
          sim.ball.vx = (endX - ballYard) / flightT;
          sim.ball.vy = (endY - MID_Y) / flightT;
          sim.ball.vz = 7.4;
        } else if (playMode === 'KICK_PUNT') {
          const puntFrom = ballYard - 10;
          const kickPower =
            (0.58 + km.powerVal * 0.42) *
            (0.82 + player.attributes.strength * 0.032) *
            weatherMeta.kickDistMult;
          const puntDist = (34 + player.attributes.strength * 2.4) * kickPower;
          const aimSpread = km.aimAngle * 7.5 + km.wind * weatherMeta.kickWindFactor;
          const endX = clamp(puntFrom + puntDist, puntFrom + 20, 108);
          const endY = clamp(MID_Y + aimSpread, 1.2, FIELD_WIDTH_YARDS - 1.2);
          const flightT = 1.55;

          sim.ball.inAir = true;
          sim.ball.flightElapsed = 0;
          sim.ball.gravity = 17.4;
          sim.ball.x = puntFrom;
          sim.ball.y = MID_Y;
          sim.ball.z = 0.8;
          sim.ball.targetX = endX;
          sim.ball.targetY = endY;
          sim.ball.vx = (endX - puntFrom) / flightT;
          sim.ball.vy = (endY - MID_Y) / flightT;
          sim.ball.vz = 13.5;
        } else if (playMode === 'KICKOFF') {
          const kickPower =
            (0.55 + km.powerVal * 0.45) *
            (0.8 + player.attributes.strength * 0.03) *
            weatherMeta.kickDistMult;
          const kickDist = (48 + player.attributes.strength * 2.2) * kickPower;
          const aimSpread = km.aimAngle * 7.5 + km.wind * weatherMeta.kickWindFactor;
          const endX = clamp(ballYard + kickDist, ballYard + 28, 108);
          const endY = clamp(MID_Y + aimSpread, 1.8, FIELD_WIDTH_YARDS - 1.8);
          const flightT = 1.55;

          sim.ball.inAir = true;
          sim.ball.flightElapsed = 0;
          sim.ball.gravity = 16.5;
          sim.ball.x = ballYard;
          sim.ball.y = MID_Y;
          sim.ball.z = 0.5;
          sim.ball.targetX = endX;
          sim.ball.targetY = endY;
          sim.ball.vx = (endX - ballYard) / flightT;
          sim.ball.vy = (endY - MID_Y) / flightT;
          sim.ball.vz = 12.8;
        } else {
          const kickFrom = ballYard - 4.5;
          const kickPower =
            (0.55 + km.powerVal * 0.45) *
            (0.75 + player.attributes.strength * 0.036) *
            weatherMeta.kickDistMult;
          const maxDist = 40 + player.attributes.strength * 3.3;
          const flightYards = maxDist * kickPower;
          const aimDrift = km.aimAngle * 8.5 + km.wind * (weatherMeta.kickWindFactor * 1.15);
          const endY = MID_Y + aimDrift;
          const endX = kickFrom + flightYards;

          sim.ball.inAir = true;
          sim.ball.flightElapsed = 0;
          sim.ball.gravity = 18;
          sim.ball.x = kickFrom;
          sim.ball.y = MID_Y;
          sim.ball.z = 0.6;
          sim.ball.targetX = endX;
          sim.ball.targetY = endY;
          sim.ball.vx = (endX - kickFrom) / 1.35;
          sim.ball.vy = (endY - MID_Y) / 1.35;
          sim.ball.vz = 14;
        }
      }
      return;
    }

    if (sim.phase === 'PRE_SNAP') {
      triggerSnap();
      return;
    }
    if (sim.phase !== 'LIVE') return;

    const pos = player.position;
    const user = sim.actors.find((a) => a.role === 'USER');
    if (!user) return;

    // WR / TE / RB Jump for airborne ball (unified jump-ball timing with Defense!)
    if (
      playMode === 'OFFENSE' &&
      !user.hasBall &&
      sim.ball.inAir &&
      !sim.ball.isKick &&
      isEligibleReceiver(user, pos) &&
      Math.hypot(sim.ball.x - user.x, sim.ball.y - user.y) < 5.5
    ) {
      if (!user.jumping || user.jumping <= 0) {
        user.jumping = 0.42;
        sim.userJumpTimer = 0.42;
        user.stamina = Math.max(0, user.stamina - 4);
        retroAudio.play('click', 0.55);
      }
      return;
    }

    // WR / TE / RB Call for Ball on PASS plays
    if (
      playMode === 'OFFENSE' &&
      (pos === 'WR' || pos === 'TE' || (pos === 'RB' && sim.playType === 'PASS')) &&
      !user.hasBall &&
      !sim.ball.inAir &&
      !sim.calledForBall &&
      sim.playType === 'PASS'
    ) {
      const qb = sim.actors.find((a) => a.id === 'off_qb');
      if (qb && qb.hasBall) {
        sim.calledForBall = true;
        setCallForBallCooldown(true);
        qb.hasBall = false;
        sim.qbPostThrowTimer = 0.45;
        const leadX = clamp(user.x + Math.max(1.8, user.vx * 0.45), 2, 106);
        const leadY = clamp(user.y + user.vy * 0.35, 1.4, FIELD_WIDTH_YARDS - 1.4);
        const phys = computePassPhysics(qb.x, qb.y, leadX, leadY, false);

        sim.ball.inAir = true;
        sim.ball.isBullet = false;
        sim.ball.flightElapsed = 0;
        sim.dbReactTimer = Math.max(0.06, 0.22 - oppTeam.defense * 0.02 + weatherMeta.dbReactAdd);
        sim.ball.gravity = phys.gravity;
        sim.ball.x = qb.x;
        sim.ball.y = qb.y;
        sim.ball.z = 1.55;
        sim.ball.targetX = leadX;
        sim.ball.targetY = leadY;
        sim.ball.vx = phys.vx;
        sim.ball.vy = phys.vy;
        sim.ball.vz = phys.vz;
        sim.ball.intendedId = user.id;
        retroAudio.play('throw', 0.9);
        setBannerText('BALL IN AIR!');
        return;
      }
    }

    // QB Slide when past LOS, or Ball Carrier Dive!
    if (user.hasBall && sim.diveTimer <= 0 && sim.slideTimer <= 0) {
      if (pos === 'QB' && user.x > ballYard + 0.5) {
        sim.slideTimer = 0.42;
        retroAudio.play('click', 0.8);
        setBannerText('QB SLIDE!');
        const gained = Math.round(user.x - ballYard);
        setTimeout(() => {
          if (!sim.finished) {
            finishPlay({
              yardsGained: gained,
              isTouchdown: false,
              isTurnover: false,
              isFirstDown: gained >= yardsToGo,
              commentary: `${player.lastName} scrambles and slides safely after ${gained >= 0 ? `+${gained}` : gained} yds.`,
              statDelta: { rushAtt: 1, rushYards: gained, longestPlay: gained },
            });
          }
        }, 260);
        return;
      }
      sim.diveTimer = 0.48;
      user.vx = user.stamina < 25 ? 6.8 : 8.4;
      user.stamina = Math.max(0, user.stamina - 6);
      retroAudio.play('bounce', 0.65);
      setBannerText('DIVE!');
      return;
    }

    if (sim.userActionCooldown <= 0) {
      sim.userActionCooldown = 0.48;
      if (pos === 'OL' || (pos === 'TE' && sim.playType === 'RUN')) {
        const nearDef = sim.actors.find(
          (a) => a.team === 'DEF' && !a.knockedDown && Math.hypot(a.x - user.x, a.y - user.y) < 2.9
        );
        if (nearDef) {
          user.stamina = Math.max(0, user.stamina - 5);
          const stamFactor = user.stamina < 25 ? 0.65 : 1;
          nearDef.knockedDown = 1.7 * stamFactor;
          nearDef.x += 0.9;
          sim.blocksLanded += 1;
          if (Math.random() < (0.34 + player.attributes.strength * 0.042) * stamFactor) {
            sim.pancakesLanded += 1;
            setBannerText('PANCAKE!');
            retroAudio.playOof();
          } else {
            setBannerText('BIG BLOCK!');
            retroAudio.play('tackle', 0.6);
          }
        }
      } else if (playMode === 'DEFENSE') {
        // 1. Air pass jump timing (feeds directly into unified jump-ball contest!)
        if (sim.ball.inAir && !sim.ball.isKick && Math.hypot(sim.ball.x - user.x, sim.ball.y - user.y) < 5.5) {
          if (!user.jumping || user.jumping <= 0) {
            user.jumping = 0.42;
            sim.userJumpTimer = 0.42;
            user.stamina = Math.max(0, user.stamina - 4);
            retroAudio.play('click', 0.55);
          }
          return;
        }

        // 2. Lunge Tackle on Ball Carrier (with realistic Forced Fumble opportunity!)
        const ballCarrier = sim.actors.find((a) => a.team === 'OFF' && a.hasBall);
        if (ballCarrier && Math.hypot(ballCarrier.x - user.x, ballCarrier.y - user.y) < 3.4) {
          user.stamina = Math.max(0, user.stamina - 5);
          user.x = ballCarrier.x + 0.6;
          user.y = ballCarrier.y;
          const isSack = ballCarrier.id === 'off_qb' && ballCarrier.x < ballYard;
          const isSafety = ballCarrier.x <= 0;
          sim.tacklesMade += 1;
          if (isSack) {
            sim.sacksMade += 1;
            sim.crowdExcited = 1.6;
          }
          retroAudio.play('tackle', 0.95);
          retroAudio.playOof();
          const gained = Math.round(ballCarrier.x - ballYard);

          const fumbleOdds = clamp(
            0.014 +
              player.attributes.strength * 0.0022 +
              (isSack ? 0.016 : 0) +
              (ballCarrier.stamina < 30 ? 0.016 : 0) +
              weatherMeta.fumbleAdd,
            0.01,
            0.08
          );
          if (!isSafety && Math.random() < fumbleOdds) {
            const defRecovered = Math.random() < 0.62;
            if (defRecovered) {
              sim.crowdExcited = 2.2;
              retroAudio.play('success', 0.9);
            }
            finishPlay({
              yardsGained: gained,
              isTouchdown: false,
              isTurnover: defRecovered,
              turnoverType: defRecovered ? 'FUMBLE' : undefined,
              isFirstDown: !defRecovered && gained >= yardsToGo,
              clockStopped: true,
              commentary: defRecovered
                ? `FORCED FUMBLE! ${player.lastName} jars it loose and ${myTeam.shortName} RECOVERS!`
                : `BIG HIT! ${player.lastName} punches it out, but offense falls back on the fumble.`,
              statDelta: {
                tackles: 1,
                sacks: isSack ? 1 : 0,
                tfl: gained < 0 ? 1 : 0,
                forcedFumbles: 1,
              },
            });
            return;
          }

          finishPlay({
            yardsGained: gained,
            isTouchdown: false,
            isTurnover: false,
            isFirstDown: !isSafety && gained >= yardsToGo,
            isSafety,
            clockStopped: isSafety,
            commentary: isSafety
              ? `SAFETY! ${player.lastName} brings down the ball carrier in the endzone (+2 PTS)!`
              : isSack
                ? `SACK! ${player.lastName} buries the QB for ${gained} yds!`
                : `${player.lastName} delivers a huge tackle (${gained >= 0 ? `+${gained}` : gained} yds)!`,
            statDelta: {
              tackles: 1,
              sacks: isSack ? 1 : 0,
              tfl: gained < 0 ? 1 : 0,
            },
          });
          return;
        }

        // 3. Swim / Rip Shed Blocker move
        const nearOL = sim.actors.find(
          (a) => a.team === 'OFF' && a.role === 'OL' && !a.knockedDown && Math.hypot(a.x - user.x, a.y - user.y) < 2.6
        );
        if (nearOL) {
          user.stamina = Math.max(0, user.stamina - 5);
          const stamFactor = user.stamina < 25 ? 0.65 : 1;
          if (Math.random() < (0.42 + player.attributes.strength * 0.045) * stamFactor) {
            nearOL.knockedDown = 1.3;
            user.x -= 1.4;
            retroAudio.play('beep', 0.65);
            setBannerText('SHED BLOCKER!');
          }
        }
      }
    }
  };

  const triggerHandoff = () => {
    const sim = simRef.current;
    if (!sim || sim.finished || playMode !== 'OFFENSE' || player.position !== 'QB') return;
    if (sim.phase === 'PRE_SNAP') triggerSnap();
    const qb = sim.actors.find((a) => a.role === 'USER');
    const rb = sim.actors.find((a) => a.role === 'RB');
    if (qb && rb && qb.hasBall) {
      qb.hasBall = false;
      rb.hasBall = true;
      sim.playType = 'RUN';
      sim.handoffTimer = 0.35;
      sim.catchProtectTimer = 0.3;
      retroAudio.play('beep', 0.7);
      setBannerText('HANDOFF!');
    }
  };

  const triggerJuke = (dir: -1 | 1) => {
    const sim = simRef.current;
    if (!sim || sim.phase !== 'LIVE') return;
    const user = sim.actors.find((a) => a.role === 'USER');
    if (user && sim.jukeTimer <= 0 && sim.jukeBoostTimer <= 0) {
      sim.jukeDir = dir;
      sim.jukeTimer = 0.2;
      sim.jukeBoostTimer = 0.28;
      retroAudio.play('click', 0.75);
    }
  };

  const finishPlay = (outcome: PlayOutcome) => {
    const sim = simRef.current;
    if (!sim || sim.finished) return;
    sim.finished = true;
    sim.phase = 'RESULT';
    setPlayPhase('RESULT');
    if (outcome.isTouchdown || outcome.fgMade || outcome.isFirstDown) {
      sim.crowdExcited = 2.5;
      sim.actors.forEach((a) => {
        if ((outcome.isTouchdown || outcome.isFirstDown) && a.team === 'OFF') {
          a.celebrating = 1.5;
        }
      });
    }
    setBannerText(
      outcome.isTouchdown
        ? 'TOUCHDOWN!'
        : outcome.isSafety
          ? 'SAFETY! +2 PTS'
          : outcome.isTurnover
            ? outcome.turnoverType === 'INT'
              ? 'INTERCEPTION!'
              : 'TURNOVER!'
            : outcome.isFieldGoal
              ? outcome.fgMade
                ? 'IT IS GOOD!'
                : outcome.isDoink
                  ? 'DOINK! NO GOOD'
                  : 'NO GOOD'
              : outcome.isOnsideKick
                ? outcome.onsideRecovered
                  ? 'ONSIDE RECOVERED!'
                  : 'OPP RECOVERED'
                : outcome.isKickoff
                  ? outcome.isTouchback
                    ? 'TOUCHBACK!'
                    : outcome.isOppReturnTd
                      ? 'RETURN TD!'
                      : `OPP BALL AT ${outcome.returnYard ?? 25}!`
                  : outcome.isPunt
                    ? outcome.isTouchback
                      ? 'PUNT TOUCHBACK!'
                      : outcome.isOppReturnTd
                        ? 'PUNT RETURN TD!'
                        : `PUNTED TO OPP ${outcome.returnYard ?? 20}!`
                    : outcome.clockStopped && outcome.yardsGained === 0
                      ? 'INCOMPLETE'
                      : outcome.isFirstDown
                        ? '1ST DOWN!'
                        : outcome.yardsGained > 0
                          ? `+${outcome.yardsGained} YARDS`
                          : `${outcome.yardsGained} YARDS`
    );
    if (outcome.isTouchdown || outcome.fgMade) {
      retroAudio.playTouchdown();
    }
    setTimeout(() => {
      onPlayComplete(outcome);
    }, 1050);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
      sim.keys[k] = true;
      if (k === ' ' || k === 'enter') {
        e.preventDefault();
        triggerUserAction();
      } else if (k === 'e') {
        e.preventDefault();
        triggerAudible();
      } else if (k === 't') {
        e.preventDefault();
        if (onCallTimeout && myTimeouts > 0) {
          onCallTimeout();
          setBannerText('TIMEOUT!');
        }
      } else if (k === 'h') {
        triggerHandoff();
      } else if (k === 'w' || k === 'arrowup') {
        const user = sim.actors.find((a) => a.role === 'USER');
        if (user?.hasBall && sim.jukeTimer <= 0 && sim.jukeBoostTimer <= 0) triggerJuke(-1);
      } else if (k === 's' || k === 'arrowdown') {
        const user = sim.actors.find((a) => a.role === 'USER');
        if (user?.hasBall && sim.jukeTimer <= 0 && sim.jukeBoostTimer <= 0) triggerJuke(1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      sim.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  });

  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setFontsLoaded(true)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const sim = simRef.current;
      const canvas = canvasRef.current;
      if (sim && canvas) {
        updateSimulation(sim, dt, now);
        const ctx = canvas.getContext('2d');
        if (ctx) renderField(ctx, sim, now);
      }
      rafId = requestAnimationFrame(step);
    };

    const updateSimulation = (sim: NonNullable<typeof simRef.current>, dt: number, _now: number) => {
      for (const p of sim.weatherParticles) {
        if (weather === 'WIND') {
          const dir = sim.kickMeter.wind >= 0 ? 1 : -1;
          p.x += p.speed * (dir >= 0 ? 1 : -1) * 0.45;
          p.y += Math.sin(p.x * 0.02) * 0.6 + (sim.kickMeter.wind >= 0 ? 0.6 : -0.6);
        } else if (weather === 'FOG') {
          p.x += p.speed * 0.55;
          p.y += Math.sin(p.x * 0.01) * 0.15;
        } else {
          p.y += p.speed;
          const windPush = weather === 'BLIZZARD' ? -3.4 : weather === 'STORM' ? -4.1 : weather === 'RAIN' ? -2.8 : -0.65;
          p.x += windPush;
        }
        if (p.y > VIEW_H + 12) {
          p.y = -10;
          p.x = Math.random() * VIEW_W;
        } else if (p.y < -16) {
          p.y = VIEW_H + 8;
          p.x = Math.random() * VIEW_W;
        }
        if (p.x < -40) p.x = VIEW_W + 20;
        else if (p.x > VIEW_W + 40) p.x = -20;
      }

      if (sim.crowdExcited > 0) sim.crowdExcited = Math.max(0, sim.crowdExcited - dt);
      if (sim.qbPostThrowTimer > 0) sim.qbPostThrowTimer = Math.max(0, sim.qbPostThrowTimer - dt);
      if (sim.catchProtectTimer > 0) sim.catchProtectTimer = Math.max(0, sim.catchProtectTimer - dt);
      if (sim.handoffTimer > 0) sim.handoffTimer = Math.max(0, sim.handoffTimer - dt);

      // Update ball blur trail when airborne
      if (sim.ball.inAir) {
        const px = worldToPxX(sim.ball.x);
        const py = yardToPxY(sim.ball.y) - sim.ball.z * 16;
        sim.ball.blurTrail.unshift({ px, py });
        if (sim.ball.blurTrail.length > 20) sim.ball.blurTrail.pop();
        sim.ball.spinPhase += dt * 18;
      } else if (sim.ball.blurTrail.length > 0) {
        sim.ball.blurTrail.length = 0;
      }

      if (sim.finished) {
        sim.actors.forEach((a) => {
          if (a.celebrating && a.celebrating > 0) {
            a.animPhase += dt * 7;
          }
        });
        return;
      }

      if (
        playMode === 'KICK_FG' ||
        playMode === 'KICK_PAT' ||
        playMode === 'KICK_ONSIDE' ||
        playMode === 'KICKOFF' ||
        playMode === 'KICK_PUNT'
      ) {
        const km = sim.kickMeter;
        const accSkill = clamp(player.attributes.skill, 1, 10);
        const powerSpeed = 1.68 - accSkill * 0.05;
        const aimSpeed = 3.25 - accSkill * 0.16;
        if (km.step === 'POWER') {
          km.powerVal += km.powerDir * powerSpeed * dt;
          if (km.powerVal >= 1) {
            km.powerVal = 1;
            km.powerDir = -1;
          }
          if (km.powerVal <= 0.15) {
            km.powerVal = 0.15;
            km.powerDir = 1;
          }
        } else if (km.step === 'AIM') {
          km.aimElapsed += dt;
          km.aimAngle += km.aimDir * aimSpeed * dt;
          if (km.aimAngle >= 1) {
            km.aimAngle = 1;
            km.aimDir = -1;
          }
          if (km.aimAngle <= -1) {
            km.aimAngle = -1;
            km.aimDir = 1;
          }

          // Once power is set, offense and defense begin live blocking, rushing, and approach!
          if (playMode === 'KICKOFF' || playMode === 'KICK_ONSIDE') {
            for (const a of sim.actors) {
              if (a.id === 'kicker') {
                const targetX = ballYard - 0.85;
                const targetY = MID_Y - 0.25;
                const dx = targetX - a.x;
                const dy = targetY - a.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0.12) {
                  const spd = 4.4;
                  a.vx = (dx / dist) * spd;
                  a.vy = (dy / dist) * spd;
                  a.x += a.vx * dt;
                  a.y += a.vy * dt;
                  a.animPhase += dt * 9;
                } else {
                  a.vx = 0;
                  a.vy = 0;
                }
                a.facing = 1;
              } else if (a.team === 'OFF') {
                // Coverage gunners sprint up toward the kickoff line (staying onside behind ballYard)
                const maxOnsideX = ballYard - 0.35;
                if (a.x < maxOnsideX) {
                  a.vx = 4.35;
                  a.x = Math.min(maxOnsideX, a.x + a.vx * dt);
                  a.animPhase += dt * 8.5;
                } else {
                  a.vx = 0;
                }
                a.facing = 1;
              } else if (a.id !== 'ko_ret') {
                // Receiving unit shuffles and braces for kick trajectory
                const drift = Math.sin(km.aimElapsed * 4.5 + a.jersey) * 0.45;
                a.vy = drift;
                a.y = clamp(a.y + a.vy * dt, 1.5, FIELD_WIDTH_YARDS - 1.5);
                a.facing = -1;
                a.animPhase += dt * 5;
              }
            }
          } else {
            // KICK_FG, KICK_PAT, KICK_PUNT: Snap happened -> OL sets protection wall, DL rushes!
            const isPuntPlay = playMode === 'KICK_PUNT';
            const kickTargetX = isPuntPlay ? ballYard - 10 : ballYard - 4.5;
            const kickTargetY = MID_Y;
            const blockStrengthDiff = clamp((myTeam.offense - oppTeam.defense) * 0.15, -0.45, 0.45);
            const olLine = sim.actors.filter((a) => a.team === 'OFF' && a.id.startsWith('k_ol_'));

            for (const a of sim.actors) {
              if (a.id === 'kicker') {
                const goalX = isPuntPlay ? ballYard - 10.0 : ballYard - 5.3;
                const goalY = isPuntPlay ? MID_Y : MID_Y + 0.4;
                const dx = goalX - a.x;
                const dy = goalY - a.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0.1) {
                  const spd = isPuntPlay ? 2.4 : 4.2;
                  a.vx = (dx / dist) * spd;
                  a.vy = (dy / dist) * spd;
                  a.x += a.vx * dt;
                  a.y += a.vy * dt;
                  a.animPhase += dt * 8.5;
                } else {
                  a.vx = 0;
                  a.vy = 0;
                }
                a.facing = 1;
              } else if (a.id === 'holder') {
                a.vx = 0;
                a.vy = 0;
                a.facing = 1;
              } else if (a.id.startsWith('p_gun')) {
                const capX = Math.min(86, ballYard + 24);
                if (a.x < capX) {
                  a.vx = 5.4;
                  a.x = Math.min(capX, a.x + a.vx * dt);
                  a.animPhase += dt * 9;
                } else {
                  a.vx = 0;
                }
                a.facing = 1;
              } else if (a.id === 'p_ret') {
                const sway = Math.sin(km.aimElapsed * 3.2) * 1.1;
                a.vy = sway;
                a.y = clamp(a.y + a.vy * dt, 3, FIELD_WIDTH_YARDS - 3);
                a.facing = -1;
                a.animPhase += dt * 4;
              } else if (a.id.startsWith('k_ol_')) {
                // Protection wall drops back slightly into cup and picks up nearest DL rusher
                const idx = Number(a.id.split('_').pop() || '2');
                const edgeDrop = idx === 0 || idx === 4 ? 1.85 : 1.35;
                const anchorX = ballYard - edgeDrop;
                const nearestDl = sim.actors
                  .filter((d) => d.team === 'DEF' && d.id.startsWith('k_dl_'))
                  .sort((d1, d2) => Math.hypot(d1.x - a.x, d1.y - a.y) - Math.hypot(d2.x - a.x, d2.y - a.y))[0];

                const targetX = nearestDl && nearestDl.x < a.x + 1.5 ? Math.max(ballYard - 2.3, nearestDl.x - 0.7) : anchorX;
                const targetY = nearestDl ? a.y + clamp(nearestDl.y - a.y, -0.5, 0.5) : a.y;
                a.vx = clamp((targetX - a.x) * 4.5, -2.6, 1.8);
                a.vy = clamp((targetY - a.y) * 4.0, -2.4, 2.4);
                a.x += a.vx * dt;
                a.y += a.vy * dt;
                a.facing = 1;
                a.animPhase += dt * 7.5;
              } else if (a.id.startsWith('k_dl_')) {
                // Rushers surge toward the kick spot; edge rushers try to bend around after 2.3s
                const idx = Number(a.id.split('_').pop() || '2');
                const isEdge = idx === 0 || idx === 4;
                const edgeBreak = isEdge && km.aimElapsed > 2.35;
                const blocker = olLine.find((o) => Math.hypot(o.x - a.x, o.y - a.y) < 1.35);

                if (blocker && !edgeBreak) {
                  // Engaged in line push battle
                  const pushSpd = 0.45 - blockStrengthDiff + Math.sin(km.aimElapsed * 5 + idx) * 0.35;
                  a.vx = -pushSpd;
                  a.vy = clamp((kickTargetY - a.y) * 0.35, -1.0, 1.0);
                  a.x = Math.max(ballYard - 2.4, a.x + a.vx * dt);
                  a.y += a.vy * dt;
                } else {
                  const dx = kickTargetX - a.x;
                  const dy = (edgeBreak ? kickTargetY + (idx === 0 ? -0.4 : 0.4) : a.y) - a.y;
                  const dist = Math.max(0.1, Math.hypot(dx, dy));
                  const rushSpd = edgeBreak ? 4.4 : 3.4;
                  a.vx = (dx / dist) * rushSpd;
                  a.vy = (dy / dist) * rushSpd;
                  a.x += a.vx * dt;
                  a.y += a.vy * dt;
                }
                a.facing = -1;
                a.animPhase += dt * 8.5;

                // Blocked kick if a rusher breaks all the way through to the kick spot!
                if (km.aimElapsed > 2.6 && Math.hypot(a.x - kickTargetX, a.y - kickTargetY) < 1.15) {
                  retroAudio.play('tackle', 0.95);
                  retroAudio.play('audience_dis', 0.85);
                  if (isPuntPlay) {
                    finishPlay({
                      yardsGained: -8,
                      isTouchdown: false,
                      isTurnover: true,
                      turnoverType: 'DOWNS',
                      isFirstDown: false,
                      isPunt: false,
                      clockStopped: true,
                      commentary: `BLOCKED PUNT! ${oppTeam.shortName} breaks through the protection and recovers!`,
                      statDelta: {},
                    });
                  } else {
                    const distFromGoal = Math.round(100 - ballYard + 17);
                    finishPlay({
                      yardsGained: 0,
                      isTouchdown: false,
                      isTurnover: playMode === 'KICK_FG',
                      turnoverType: playMode === 'KICK_FG' ? 'DOWNS' : undefined,
                      isFirstDown: false,
                      isFieldGoal: true,
                      fgMade: false,
                      isDoink: false,
                      fgDistance: distFromGoal,
                      clockStopped: true,
                      commentary: `BLOCKED! ${oppTeam.shortName} surges through the line and swats the kick!`,
                      statDelta: {},
                    });
                  }
                  return;
                }
              }
            }
          }
        } else if (km.step === 'FLIGHT') {
          const kicker = sim.actors.find((a) => a.id === 'kicker');
          if (kicker && !sim.kickReturnActive) kicker.animPhase += dt * 10;

          if (playMode === 'KICK_ONSIDE') {
            sim.ball.flightElapsed += dt;
            sim.ball.x += sim.ball.vx * dt;
            sim.ball.y += sim.ball.vy * dt;
            sim.ball.z += sim.ball.vz * dt;
            sim.ball.vz -= sim.ball.gravity * dt;

            // Turf high-hop chop bounces once on the turf
            if (sim.ball.z <= 0 && sim.ball.flightElapsed < 1.1) {
              sim.ball.z = 0.05;
              sim.ball.vz = Math.max(4.8, Math.abs(sim.ball.vz) * 0.72);
              sim.ball.vx *= 0.74;
              retroAudio.play('bounce', 0.8);
            }

            // Gunners & hands team converge onto target landing spot!
            for (const a of sim.actors) {
              if (a.id === 'kicker') {
                a.x += 2.2 * dt;
                a.animPhase += dt * 6;
                continue;
              }
              const dx = sim.ball.targetX - a.x;
              const dy = sim.ball.targetY - a.y;
              const d = Math.max(0.1, Math.hypot(dx, dy));
              const spd = a.team === 'OFF' ? 6.1 : 5.4;
              a.vx = (dx / d) * spd;
              a.vy = (dy / d) * spd;
              a.x += a.vx * dt;
              a.y += a.vy * dt;
              a.facing = a.vx >= 0 ? 1 : -1;
              a.animPhase += dt * 8;
            }

            const targetCam = clamp(worldToPxX(sim.ball.x) - VIEW_W * 0.5, 0, WORLD_W - VIEW_W);
            sim.camPx += (targetCam - sim.camPx) * Math.min(1, 6.5 * dt);

            if (sim.ball.flightElapsed >= 1.45 || (sim.ball.z <= 0 && sim.ball.flightElapsed >= 1.1)) {
              const distFromKick = sim.ball.x - ballYard;
              const landedYard = clamp(Math.round(sim.ball.x), 20, 85);
              const sweetSpot = distFromKick >= 10 && distFromKick <= 16.5;
              const wentTen = distFromKick >= 10;
              const onsideOdds = !wentTen
                ? 0
                : sweetSpot
                  ? clamp(0.24 + player.attributes.skill * 0.014 - Math.abs(km.aimAngle) * 0.08, 0.14, 0.4)
                  : 0.08;
              const recovered = Math.random() < onsideOdds;
              retroAudio.play(recovered ? 'success' : 'audience_dis', 0.9);
              finishPlay({
                yardsGained: 0,
                isTouchdown: false,
                isTurnover: false,
                isFirstDown: false,
                isOnsideKick: true,
                onsideRecovered: recovered,
                recoveredYard: landedYard,
                clockStopped: true,
                commentary: !wentTen
                  ? `ILLEGAL TOUCH! ${player.lastName}'s onside kick only went ${Math.round(distFromKick)} yds — ${oppTeam.shortName} ball!`
                  : recovered
                    ? `ONSIDE KICK RECOVERED! ${myTeam.shortName} pounces on the loose ball at the ${landedYard}!`
                    : `Onside kick bounced ${Math.round(distFromKick)} yds — ${oppTeam.shortName} hands team falls on it.`,
                statDelta: {},
              });
            }
            return;
          }

          if (playMode === 'KICK_PUNT' || playMode === 'KICKOFF') {
            const isPuntPlay = playMode === 'KICK_PUNT';
            const retId = isPuntPlay ? 'p_ret' : 'ko_ret';
            const ret = sim.actors.find((a) => a.id === retId);

            if (!sim.kickReturnActive) {
              sim.ball.flightElapsed += dt;
              sim.ball.x += sim.ball.vx * dt;
              sim.ball.y += sim.ball.vy * dt;
              sim.ball.z += sim.ball.vz * dt;
              sim.ball.vz -= sim.ball.gravity * dt;

              for (const a of sim.actors) {
                if (a.id === 'kicker') {
                  if (sim.ball.flightElapsed > 0.35) {
                    a.x += 4.2 * dt;
                    a.facing = 1;
                    a.animPhase += dt * 7;
                  }
                  continue;
                }
                if (a.id === retId) {
                  const tx = clamp(sim.ball.targetX, 2, 99);
                  const ty = clamp(sim.ball.targetY, 1.4, FIELD_WIDTH_YARDS - 1.4);
                  const dx = tx - a.x;
                  const dy = ty - a.y;
                  const d = Math.hypot(dx, dy);
                  if (d > 0.25) {
                    const rSpd = 5.4;
                    a.vx = (dx / d) * rSpd;
                    a.vy = (dy / d) * rSpd;
                    a.x += a.vx * dt;
                    a.y += a.vy * dt;
                    a.facing = a.vx >= -0.2 ? 1 : -1;
                  }
                  a.animPhase += dt * 7.5;
                } else if (a.team === 'OFF') {
                  const spd = a.id.includes('gun') ? 6.25 : 4.9;
                  a.x = Math.min(99, a.x + spd * dt);
                  if (ret) {
                    a.y += clamp(ret.y - a.y, -1.5, 1.5) * 0.9 * dt;
                  }
                  a.facing = 1;
                  a.animPhase += dt * 8;
                } else {
                  // Receiving blockers drop back slightly toward return wedge
                  a.x = Math.max(ballYard + 4, a.x - 1.8 * dt);
                  a.facing = -1;
                  a.animPhase += dt * 6;
                }
              }

              const kickLead = driveDir === 1 ? VIEW_W * 0.55 : VIEW_W * 0.45;
              const targetCam = clamp(worldToPxX(sim.ball.x) - kickLead, 0, WORLD_W - VIEW_W);
              sim.camPx += (targetCam - sim.camPx) * Math.min(1, 6.5 * dt);

              if (sim.ball.x >= 100 || sim.ball.z <= 0) {
                const isTouchback = sim.ball.x >= 100;
                if (isTouchback) {
                  retroAudio.play(isPuntPlay ? 'beep' : 'audience_fg', 0.75);
                  finishPlay({
                    yardsGained: 0,
                    isTouchdown: false,
                    isTurnover: false,
                    isFirstDown: false,
                    isPunt: isPuntPlay,
                    isKickoff: !isPuntPlay,
                    isTouchback: true,
                    returnYard: isPuntPlay ? 20 : 25,
                    clockStopped: true,
                    commentary: isPuntPlay
                      ? `${player.lastName} booms the punt into the endzone — Touchback!`
                      : `BOOM! ${player.lastName} boots it through the endzone for a TOUCHBACK!`,
                    statDelta: {},
                  });
                  return;
                }

                // Landed in field of play (< 100 yard line)
                if (sim.ball.y <= 1.2 || sim.ball.y >= FIELD_WIDTH_YARDS - 1.2) {
                  const spotYd = clamp(100 - Math.round(sim.ball.x), 1, 95);
                  retroAudio.play('beep', 0.7);
                  if (isPuntPlay) {
                    finishPlay({
                      yardsGained: 0,
                      isTouchdown: false,
                      isTurnover: false,
                      isFirstDown: false,
                      isPunt: true,
                      isTouchback: false,
                      returnYard: spotYd,
                      clockStopped: true,
                      commentary: `${player.lastName} angles the punt out of bounds at the OPP ${spotYd}!`,
                      statDelta: {},
                    });
                  } else {
                    finishPlay({
                      yardsGained: 0,
                      isTouchdown: false,
                      isTurnover: false,
                      isFirstDown: false,
                      isKickoff: true,
                      isTouchback: false,
                      returnYard: Math.max(35, spotYd),
                      clockStopped: true,
                      commentary: `Kickoff out of bounds! Penalty places ${oppTeam.shortName} at their ${Math.max(35, spotYd)}.`,
                      statDelta: {},
                    });
                  }
                  return;
                }

                const covSorted = sim.actors
                  .filter((a) => a.team === 'OFF')
                  .sort((a, b) => Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) - Math.hypot(b.x - sim.ball.x, b.y - sim.ball.y));
                const nearCov = covSorted[0];
                const nearCovDist = nearCov ? Math.hypot(nearCov.x - sim.ball.x, nearCov.y - sim.ball.y) : 99;
                const retDist = ret ? Math.hypot(ret.x - sim.ball.x, ret.y - sim.ball.y) : 99;

                if (isPuntPlay && retDist > 7.5 && sim.ball.x >= 84) {
                  const spotYd = clamp(100 - Math.round(sim.ball.x), 1, 95);
                  retroAudio.play('success', 0.85);
                  finishPlay({
                    yardsGained: 0,
                    isTouchdown: false,
                    isTurnover: false,
                    isFirstDown: false,
                    isPunt: true,
                    isTouchback: false,
                    returnYard: spotYd,
                    clockStopped: true,
                    commentary: `COFFIN CORNER! Coverage downs ${player.lastName}'s punt at the OPP ${spotYd}!`,
                    statDelta: {},
                  });
                  return;
                }

                if (isPuntPlay && nearCovDist < 3.6 && sim.ball.x >= 70) {
                  const spotYd = clamp(100 - Math.round(sim.ball.x), 1, 95);
                  retroAudio.play('beep', 0.65);
                  finishPlay({
                    yardsGained: 0,
                    isTouchdown: false,
                    isTurnover: false,
                    isFirstDown: false,
                    isPunt: true,
                    isTouchback: false,
                    returnYard: spotYd,
                    clockStopped: true,
                    commentary: `Fair catch signaled at the OPP ${spotYd}.`,
                    statDelta: {},
                  });
                  return;
                }

                // Fielded cleanly -> Begin LIVE RETURN toward x = 0!
                if (ret) {
                  sim.ball.inAir = false;
                  sim.ball.z = 0;
                  sim.kickReturnActive = true;
                  ret.x = clamp(sim.ball.x, 2, 98.5);
                  ret.y = clamp(sim.ball.y, 1.4, FIELD_WIDTH_YARDS - 1.4);
                  ret.hasBall = true;
                  ret.facing = -1;
                  setBannerText(isPuntPlay ? 'PUNT RETURN!' : 'KICK RETURN!');
                  retroAudio.play('click', 0.6);
                }
              }
              return;
            }

            // LIVE RETURN PHASE (ret runs from right -> left toward x = 0!)
            if (!ret) return;
            sim.ball.x = ret.x;
            sim.ball.y = ret.y;
            if (ret.aiJukeCooldown && ret.aiJukeCooldown > 0) ret.aiJukeCooldown = Math.max(0, ret.aiJukeCooldown - dt);
            if (ret.aiJukeTimer && ret.aiJukeTimer > 0) ret.aiJukeTimer = Math.max(0, ret.aiJukeTimer - dt);

            const nearCov = sim.actors
              .filter((c) => c.team === 'OFF' && !c.knockedDown && c.x <= ret.x + 0.8 && Math.hypot(c.x - ret.x, c.y - ret.y) < 4.5)
              .sort((a, b) => Math.hypot(a.x - ret.x, a.y - ret.y) - Math.hypot(b.x - ret.x, b.y - ret.y))[0];

            if (nearCov && Math.hypot(nearCov.x - ret.x, nearCov.y - ret.y) < 3.0 && (!ret.aiJukeCooldown || ret.aiJukeCooldown <= 0)) {
              const jDir: -1 | 1 = ret.y < 3.5 ? 1 : ret.y > FIELD_WIDTH_YARDS - 3.5 ? -1 : ret.y >= nearCov.y ? 1 : -1;
              ret.aiJukeTimer = 0.22;
              ret.aiJukeDir = jDir;
              ret.aiJukeCooldown = 0.95;
            }

            const retSpd = 5.65 + (oppTeam.offense - 3) * 0.12;
            const juking = Boolean(ret.aiJukeTimer && ret.aiJukeTimer > 0 && ret.aiJukeDir);
            const evadeY = juking
              ? (ret.aiJukeDir ?? 1) * 6.0
              : nearCov
                ? ret.y < 3.0
                  ? 2.2
                  : ret.y > FIELD_WIDTH_YARDS - 3.0
                    ? -2.2
                    : ret.y >= nearCov.y
                      ? 2.4
                      : -2.4
                : 0;
            ret.vx += (-(juking ? retSpd * 0.85 : retSpd) - ret.vx) * Math.min(1, 8.5 * dt);
            ret.vy += (evadeY - ret.vy) * Math.min(1, 9.5 * dt);
            ret.x = clamp(ret.x + ret.vx * dt, -2, 102);
            ret.y = clamp(ret.y + ret.vy * dt, 0.7, FIELD_WIDTH_YARDS - 0.7);
            ret.facing = -1;
            ret.animPhase += dt * 8.2;

            // Coverage team pursues returner (and USER kicker can be steered with WASD!)
            for (const a of sim.actors) {
              if (a.id === retId) continue;
              if (a.knockedDown && a.knockedDown > 0) {
                a.knockedDown -= dt;
                continue;
              }
              if (a.role === 'USER') {
                let sMx = 0;
                let sMy = 0;
                if (sim.keys['d'] || sim.keys['arrowright']) sMx += 1;
                if (sim.keys['a'] || sim.keys['arrowleft']) sMx -= 1;
                if (sim.keys['w'] || sim.keys['arrowup']) sMy -= 1;
                if (sim.keys['s'] || sim.keys['arrowdown']) sMy += 1;
                const mx = sMx * driveDir;
                if (mx !== 0 || sMy !== 0) {
                  const len = Math.max(1, Math.hypot(mx, sMy));
                  const uSpd = 4.9 + player.attributes.speed * 0.26;
                  a.vx = (mx / len) * uSpd;
                  a.vy = (sMy / len) * uSpd;
                } else {
                  const dx = ret.x - a.x;
                  const dy = ret.y - a.y;
                  const d = Math.max(0.1, Math.hypot(dx, dy));
                  const kSpd = 5.1;
                  a.vx = (dx / d) * kSpd;
                  a.vy = (dy / d) * kSpd;
                }
                a.x = clamp(a.x + a.vx * dt, -4, 104);
                a.y = clamp(a.y + a.vy * dt, 0.8, FIELD_WIDTH_YARDS - 0.8);
                a.facing = a.vx >= 0 ? 1 : -1;
                a.animPhase += dt * 7.8;
              } else if (a.team === 'OFF') {
                const dx = ret.x + ret.vx * 0.18 - a.x;
                const dy = ret.y + ret.vy * 0.18 - a.y;
                const d = Math.max(0.1, Math.hypot(dx, dy));
                const covSpd = (a.id.includes('gun') ? 6.35 : 5.65) + (myTeam.defense - 3) * 0.1;
                a.vx += ((dx / d) * covSpd - a.vx) * Math.min(1, 8.5 * dt);
                a.vy += ((dy / d) * covSpd - a.vy) * Math.min(1, 8.5 * dt);
                a.x = clamp(a.x + a.vx * dt, -4, 104);
                a.y = clamp(a.y + a.vy * dt, 0.8, FIELD_WIDTH_YARDS - 0.8);
                a.facing = a.vx >= 0 ? 1 : -1;
                a.animPhase += dt * 8.0;
              } else {
                // Return blockers try to screen closest coverage gunner
                const threat = sim.actors
                  .filter((o) => o.team === 'OFF' && !o.knockedDown)
                  .sort((o1, o2) => Math.hypot(o1.x - a.x, o1.y - a.y) - Math.hypot(o2.x - a.x, o2.y - a.y))[0];
                if (threat && Math.hypot(threat.x - a.x, threat.y - a.y) < 4.2) {
                  a.x += clamp(threat.x - a.x, -1, 1) * 3.6 * dt;
                  a.y += clamp(threat.y - a.y, -1, 1) * 3.6 * dt;
                } else {
                  a.x = Math.max(10, a.x - 3.6 * dt);
                }
                a.facing = -1;
                a.animPhase += dt * 6.2;
              }
            }

            const kickLead = driveDir === 1 ? VIEW_W * 0.45 : VIEW_W * 0.55;
            const targetCam = clamp(worldToPxX(ret.x) - kickLead, 0, WORLD_W - VIEW_W);
            sim.camPx += (targetCam - sim.camPx) * Math.min(1, 6.5 * dt);

            if (ret.x <= 0) {
              retroAudio.play('audience_dis', 0.9);
              finishPlay({
                yardsGained: 0,
                isTouchdown: false,
                isTurnover: false,
                isFirstDown: false,
                isPunt: isPuntPlay,
                isKickoff: !isPuntPlay,
                isTouchback: false,
                isOppReturnTd: true,
                returnYard: 25,
                clockStopped: true,
                commentary: `${oppTeam.shortName} breaks the ${isPuntPlay ? 'punt' : 'kickoff'} return all the way for a TOUCHDOWN!`,
                statDelta: {},
              });
              return;
            }

            if (ret.x >= 100) {
              retroAudio.play('tackle', 0.9);
              finishPlay({
                yardsGained: 0,
                isTouchdown: false,
                isTurnover: false,
                isFirstDown: false,
                isSafety: true,
                clockStopped: true,
                commentary: `SAFETY! Coverage drops the ${isPuntPlay ? 'punt' : 'kick'} returner in the endzone (+2 PTS)!`,
                statDelta: {},
              });
              return;
            }

            if (ret.y <= 0.9 || ret.y >= FIELD_WIDTH_YARDS - 0.9) {
              const spotYd = clamp(100 - Math.round(ret.x), 1, 98);
              retroAudio.play('beep', 0.65);
              finishPlay({
                yardsGained: 0,
                isTouchdown: false,
                isTurnover: false,
                isFirstDown: false,
                isPunt: isPuntPlay,
                isKickoff: !isPuntPlay,
                isTouchback: false,
                returnYard: spotYd,
                clockStopped: true,
                commentary: `${oppTeam.shortName} returner forced out of bounds at the OPP ${spotYd}.`,
                statDelta: {},
              });
              return;
            }

            const tackler = sim.actors.find(
              (c) => c.team === 'OFF' && !c.knockedDown && Math.hypot(c.x - ret.x, c.y - ret.y) < 1.35
            );
            if (tackler) {
              const spotYd = clamp(100 - Math.round(ret.x), 1, 98);
              retroAudio.play('tackle', 0.85);
              retroAudio.playOof();
              finishPlay({
                yardsGained: 0,
                isTouchdown: false,
                isTurnover: false,
                isFirstDown: false,
                isPunt: isPuntPlay,
                isKickoff: !isPuntPlay,
                isTouchback: false,
                returnYard: spotYd,
                clockStopped: true,
                commentary:
                  tackler.role === 'USER'
                    ? `${player.lastName} makes the open-field tackle! ${oppTeam.shortName} starts at OPP ${spotYd}.`
                    : `${isPuntPlay ? 'Punt' : 'Kick'} return stopped at the OPP ${spotYd}.`,
                statDelta: tackler.role === 'USER' ? { tackles: 1 } : {},
              });
            }
            return;
          }

          sim.ball.x += sim.ball.vx * dt;
          sim.ball.y += sim.ball.vy * dt;
          sim.ball.z += sim.ball.vz * dt;
          sim.ball.vz -= sim.ball.gravity * dt;

          // Keep FG/PAT line battles and rush follow-through alive during flight
          for (const a of sim.actors) {
            if (a.id.startsWith('k_dl_')) {
              a.vx = -1.6;
              a.x = Math.max(ballYard - 4.2, a.x + a.vx * dt);
              a.animPhase += dt * 8;
            } else if (a.id.startsWith('k_ol_')) {
              a.animPhase += dt * 7;
            }
          }

          const kickLead = driveDir === 1 ? VIEW_W * 0.55 : VIEW_W * 0.45;
          const targetCam = clamp(worldToPxX(sim.ball.x) - kickLead, 0, WORLD_W - VIEW_W);
          sim.camPx += (targetCam - sim.camPx) * Math.min(1, 6.5 * dt);

          if (sim.ball.x >= 109 || sim.ball.z <= 0) {
            const distFromGoal = Math.round(100 - ballYard + 17);
            const yOffset = Math.abs(sim.ball.y - MID_Y);
            const reachedCrossbar = sim.ball.x >= 108 && sim.ball.z >= 1.5;
            const isDoink = reachedCrossbar && yOffset >= 2.15 && yOffset <= 2.75;
            const isGood = reachedCrossbar && yOffset < 2.15;
            if (isDoink) retroAudio.play('post', 1);
            if (!isGood) retroAudio.play('audience_dis', 0.8);
            finishPlay({
              yardsGained: 0,
              isTouchdown: false,
              isTurnover: false,
              isFirstDown: false,
              isFieldGoal: true,
              fgMade: isGood,
              isDoink,
              fgDistance: distFromGoal,
              clockStopped: true,
              commentary: isGood
                ? `${player.lastName} drills the ${distFromGoal}-yard kick right through the uprights!`
                : isDoink
                  ? `DOINK! ${player.lastName}'s ${distFromGoal}-yard attempt clangs off the upright!`
                  : `${player.lastName}'s ${distFromGoal}-yard kick is no good.`,
              statDelta:
                playMode === 'KICK_PAT'
                  ? { xpAtt: 1, xpMade: isGood ? 1 : 0 }
                  : { fgAtt: 1, fgMade: isGood ? 1 : 0, fgLong: isGood ? distFromGoal : 0 },
            });
          }
        }
        return;
      }

      if (sim.phase === 'PRE_SNAP') {
        sim.snapTimer += dt;
        if (playMode === 'DEFENSE' && player.position === 'DL') {
          if (sim.snapTimer >= sim.snapJumpWindow) setBannerText('HIKE!');
          if (sim.snapTimer >= sim.snapJumpWindow + 0.55) triggerSnap();
        } else if (player.position !== 'QB') {
          if (sim.snapTimer >= 1.45) triggerSnap();
        }
        return;
      }

      if (sim.phase !== 'LIVE') return;

      sim.liveTime += dt;
      if (sim.userActionCooldown > 0) sim.userActionCooldown -= dt;
      if (sim.userJumpTimer > 0) sim.userJumpTimer = Math.max(0, sim.userJumpTimer - dt);
      if (sim.jukeBoostTimer > 0) sim.jukeBoostTimer = Math.max(0, sim.jukeBoostTimer - dt);
      if (sim.jukeTimer > 0) {
        sim.jukeTimer = Math.max(0, sim.jukeTimer - dt);
        if (sim.jukeTimer === 0) sim.jukeDir = 0;
      }
      if (sim.dbReactTimer > 0) sim.dbReactTimer = Math.max(0, sim.dbReactTimer - dt);
      if (sim.diveTimer > 0) sim.diveTimer -= dt;
      if (sim.slideTimer > 0) sim.slideTimer -= dt;
      if (sim.snapJumpBonus > 0) sim.snapJumpBonus -= dt;

      const user = sim.actors.find((a) => a.role === 'USER');
      const qb = sim.actors.find((a) => a.id === 'off_qb');
      const rb = sim.actors.find((a) => a.id === 'off_rb');

      // Active QB scramble detection (past LOS or outside pocket)
      const qbScrambling = Boolean(
        qb?.hasBall && (qb.x > ballYard - 0.35 || Math.abs(qb.y - MID_Y) > 4.2)
      );

      // Update user Stamina & compute attribute-driven Speed
      let userStamFactor = 1;
      if (user) {
        const speedNorm = Math.hypot(user.vx, user.vy);
        const isSprinting = speedNorm > 2.2 || sim.jukeTimer > 0;
        const drainBase = Math.max(4.5, 16.5 - player.attributes.stamina * 1.15) * weatherMeta.staminaDrainMult;
        if (isSprinting) {
          const scrambleMult = player.position === 'QB' && qbScrambling ? 1.32 : 1.0;
          user.stamina = clamp(user.stamina - drainBase * scrambleMult * dt, 0, 100);
        } else {
          const recov = 4.5 + player.attributes.stamina * 0.45;
          user.stamina = clamp(user.stamina + recov * dt, 0, 100);
        }
        userStamFactor = user.stamina < 25 ? 0.74 : user.stamina < 45 ? 0.89 : 1.0;
        sim.staminaSyncTimer += dt;
        if (sim.staminaSyncTimer >= 0.09) {
          sim.staminaSyncTimer = 0;
          setStaminaPct(Math.round(user.stamina));
        }
      }

      let userSpeed =
        (4.25 + player.attributes.speed * 0.34) *
        (sim.snapJumpBonus > 0 ? 1.18 : 1) *
        userStamFactor *
        weatherMeta.speedMult;
      // Nerf QB Scramble burst so QBs can't effortlessly torch LBs/CBs every play
      if (player.position === 'QB' && qbScrambling) {
        userSpeed = Math.min(userSpeed * 0.82, 5.95 * weatherMeta.speedMult);
      }

      // Auto-handoff for RUN plays when user is not QB
      if (sim.playType === 'RUN' && sim.liveTime > 0.34 && qb?.hasBall && rb && player.position !== 'QB') {
        qb.hasBall = false;
        rb.hasBall = true;
        sim.handoffTimer = 0.35;
        sim.catchProtectTimer = 0.25;
        retroAudio.play('beep', 0.5);
      }

      // AI QB pocket presence, smart open-receiver scan, bullet timing & tuck-and-scramble
      if (qb && qb.hasBall && qb.role !== 'USER' && sim.playType === 'PASS') {
        if (qb.aiScrambling) {
          // Scrambling AI QB runs using carrier juke/dive loop below
        } else {
          const rushers = sim.actors
            .filter((d) => d.team === 'DEF' && !d.knockedDown && d.x <= qb.x + 2.5 && Math.hypot(d.x - qb.x, d.y - qb.y) < 3.4)
            .sort((a, b) => Math.hypot(a.x - qb.x, a.y - qb.y) - Math.hypot(b.x - qb.x, b.y - qb.y));
          const nearRusher = rushers[0];

          const pocketBaseX = Math.max(ballYard - 5.4, qb.x - 1.75 * dt);
          if (nearRusher && Math.hypot(nearRusher.x - qb.x, nearRusher.y - qb.y) < 2.6) {
            const driftY = qb.y >= nearRusher.y ? 2.4 : -2.4;
            qb.vx = -0.45;
            qb.vy += (driftY - qb.vy) * Math.min(1, 7.5 * dt);
            qb.x = clamp(qb.x + qb.vx * dt, ballYard - 6.8, ballYard - 0.6);
            qb.y = clamp(qb.y + qb.vy * dt, 3.2, FIELD_WIDTH_YARDS - 3.2);
          } else {
            qb.vx = -1.75;
            qb.vy *= 0.85;
            qb.x = pocketBaseX;
          }
          qb.facing = 1;
          qb.animPhase += dt * 5.2;

          const urgentPressure = Boolean(nearRusher && Math.hypot(nearRusher.x - qb.x, nearRusher.y - qb.y) < 1.95 && sim.liveTime >= 0.85);
          if ((sim.liveTime >= sim.qbThrowTimer || urgentPressure) && !sim.ball.inAir) {
            const receivers = sim.actors.filter((a) => isEligibleReceiver(a, player.position));
            let bestTarget: Actor | null = null;
            let bestScore = -Infinity;
            let bestLeadX = ballYard + 6;
            let bestLeadY = MID_Y;
            let bestSep = 0;

            for (const r of receivers) {
              const candX = clamp(r.x + r.vx * 0.34 + 1.1, 2, 105);
              const candY = clamp(r.y + r.vy * 0.3, 1.4, FIELD_WIDTH_YARDS - 1.4);
              let minDef = 99;
              for (const d of sim.actors) {
                if (d.team === 'DEF' && !d.knockedDown) {
                  const dist = Math.hypot(d.x - candX, d.y - candY);
                  if (dist < minDef) minDef = dist;
                }
              }
              const userCallBoost =
                r.role === 'USER' ? (sim.calledForBall ? 2.75 : 0.45) : 0;
              const gainBonus = clamp((candX - ballYard) * 0.08, -0.5, 1.8);
              const bracketPenalty = minDef < 1.35 ? -1.4 : 0;
              const score = minDef * 1.45 + gainBonus + userCallBoost + bracketPenalty + Math.random() * 0.22;
              if (score > bestScore) {
                bestScore = score;
                bestTarget = r;
                bestLeadX = candX;
                bestLeadY = candY;
                bestSep = minDef;
              }
            }

            const laneClear = !sim.actors.some(
              (d) =>
                d.team === 'DEF' &&
                !d.knockedDown &&
                d.x >= qb.x - 0.3 &&
                d.x <= qb.x + 4.2 &&
                Math.abs(d.y - qb.y) < 2.2
            );

            const scrambleChance = yardsToGo >= 7 ? 0.44 : 0.64;
            if (bestSep < 1.25 && laneClear && !sim.calledForBall && Math.random() < scrambleChance) {
              qb.aiScrambling = true;
              qb.facing = 1;
              setBannerText('QB SCRAMBLE!');
            } else if (bestTarget) {
              qb.hasBall = false;
              sim.qbPostThrowTimer = 0.45;
              const throwDist = Math.hypot(bestLeadX - qb.x, bestLeadY - qb.y);
              const useBullet = bestSep < 2.7 && throwDist > 7 && Math.random() < 0.38;
              const scatterMag = 0.55 + weatherMeta.throwScatter * 0.7;
              const leadY = clamp(bestLeadY + (Math.random() - 0.5) * scatterMag, 1.4, FIELD_WIDTH_YARDS - 1.4);
              const phys = computePassPhysics(qb.x, qb.y, bestLeadX, leadY, useBullet);

              sim.ball.inAir = true;
              sim.ball.isBullet = useBullet;
              sim.ball.flightElapsed = 0;
              sim.dbReactTimer = Math.max(0.06, 0.22 - oppTeam.defense * 0.02 + weatherMeta.dbReactAdd);
              sim.ball.gravity = phys.gravity;
              sim.ball.x = qb.x;
              sim.ball.y = qb.y;
              sim.ball.z = 1.55;
              sim.ball.targetX = bestLeadX;
              sim.ball.targetY = leadY;
              sim.ball.vx = phys.vx;
              sim.ball.vy = phys.vy;
              sim.ball.vz = phys.vz;
              sim.ball.intendedId = bestTarget.id;
              retroAudio.play('throw', 0.8);
            }
          }
        }
      }

      // User movement (Retro Bowl smooth acceleration, skill crispness & facing)
      if (user) {
        if (user.stiffArmVisual && user.stiffArmVisual > 0) {
          user.stiffArmVisual = Math.max(0, user.stiffArmVisual - dt);
        }
        if (user.jumping && user.jumping > 0) {
          user.jumping = Math.max(0, user.jumping - dt);
          user.z = Math.sin((user.jumping / 0.42) * Math.PI) * 14;
        } else if (sim.diveTimer > 0) {
          user.z = Math.sin((sim.diveTimer / 0.48) * Math.PI) * 7;
        } else {
          user.z = 0;
        }

        let screenMx = 0;
        let my = 0;
        if (sim.keys['d'] || sim.keys['arrowright']) screenMx += 1;
        if (sim.keys['a'] || sim.keys['arrowleft']) screenMx -= 1;
        if (sim.keys['w'] || sim.keys['arrowup']) my -= 1;
        if (sim.keys['s'] || sim.keys['arrowdown']) my += 1;
        let mx = screenMx * driveDir;
        if (mx !== 0 && my !== 0) {
          mx *= 0.707;
          my *= 0.707;
        }

        // Gentle track assist for User WR/TE/RB tracking their own airborne pass when no input
        if (
          sim.ball.inAir &&
          sim.ball.intendedId === user.id &&
          !user.hasBall &&
          mx === 0 &&
          my === 0
        ) {
          const dx = sim.ball.targetX - user.x;
          const dy = sim.ball.targetY - user.y;
          const d = Math.hypot(dx, dy);
          if (d > 0.35) {
            mx = (dx / d) * 0.78;
            my = (dy / d) * 0.78;
          }
        }

        // Authentic Retro Bowl ball carrier auto-runs forward downfield unless holding back
        if (user.hasBall && mx === 0 && sim.diveTimer <= 0 && (player.position !== 'QB' || user.x > ballYard + 0.5)) {
          mx = sim.jukeTimer > 0 ? 0.72 : 0.96;
        }

        if (sim.diveTimer > 0) {
          user.x += 8.2 * dt;
          user.animPhase += dt * 8.5;
          user.facing = 1;
        } else if (sim.slideTimer > 0) {
          user.x += 3.4 * dt;
          user.animPhase += dt * 10;
          user.facing = 1;
        } else {
          const targetVx = mx * userSpeed;
          const targetVy =
            sim.jukeTimer > 0 && sim.jukeDir !== 0
              ? sim.jukeDir * (6.8 + player.attributes.skill * 0.14)
              : my * userSpeed;
          const skillEase = 10.5 + player.attributes.skill * 0.35;
          const ease = Math.min(1, skillEase * dt);
          user.vx += (targetVx - user.vx) * ease;
          user.vy += (targetVy - user.vy) * ease;
          user.x = clamp(user.x + user.vx * dt, -10.5, 106);
          user.y = clamp(user.y + user.vy * dt, 0.8, FIELD_WIDTH_YARDS - 0.8);
          if (Math.hypot(user.vx, user.vy) > 0.25) {
            user.animPhase += dt * (6.8 + Math.hypot(user.vx, user.vy) * 0.25);
          }
          if (Math.abs(user.vx) > 0.35) {
            user.facing = user.vx >= 0 ? 1 : -1;
          } else if (playMode === 'DEFENSE') {
            const carrierNow = sim.actors.find((o) => o.team === 'OFF' && o.hasBall);
            user.facing = carrierNow && carrierNow.x > user.x + 0.4 ? 1 : -1;
          } else {
            user.facing = 1;
          }
        }

        if (player.position === 'QB' && user.hasBall && user.x > ballYard + 0.6) {
          setBannerText('QB SCRAMBLE!');
        }
      }

      // AI Actors with natural Retro Bowl acceleration, route breaks, zone cushions, & s_intercept_object pursuit
      const offRatingBoost = (myTeam.offense - 3) * 0.15;
      const defRatingBoost = (oppTeam.defense - 3) * 0.17;
      const easeAI = Math.min(1, 8.2 * dt);
      const ballCarrier = sim.actors.find((o) => o.team === 'OFF' && o.hasBall);
      const offPassCaught = !sim.ball.inAir && Boolean(ballCarrier && ballCarrier.id !== 'off_qb');
      const pursuitActive =
        offPassCaught ||
        (sim.playType === 'RUN' && Boolean(ballCarrier && ballCarrier.id !== 'off_qb')) ||
        qbScrambling;

      // Retro Bowl s_intercept_object lead pursuit helper
      const steerPursuit = (a: Actor, target: Actor, baseSpd: number, animRate: number) => {
        const dist = Math.hypot(target.x - a.x, target.y - a.y);
        let timeFactor = clamp(dist * 0.11, 0.04, 0.4);
        if (Math.abs(a.y - target.y) < 1.8) timeFactor *= 0.5;
        const aimX = clamp(target.x + target.vx * timeFactor, -10, 108);
        const aimY = clamp(target.y + target.vy * timeFactor, 0.8, FIELD_WIDTH_YARDS - 0.8);
        const dx = aimX - a.x;
        const dy = aimY - a.y;
        const d = Math.max(0.1, Math.hypot(dx, dy));
        const spd = baseSpd * (a.stamina < 25 ? 0.78 : 1) * weatherMeta.speedMult;
        a.vx += ((dx / d) * spd - a.vx) * easeAI;
        a.vy += ((dy / d) * spd - a.vy) * easeAI;
        a.x = clamp(a.x + a.vx * dt, -10.5, 106.5);
        a.y = clamp(a.y + a.vy * dt, 0.8, FIELD_WIDTH_YARDS - 0.8);
        a.stamina = clamp(a.stamina - 8.5 * weatherMeta.staminaDrainMult * dt, 0, 100);
        if (Math.abs(a.vx) > 0.35) a.facing = a.vx >= 0 ? 1 : -1;
        else a.facing = target.x >= a.x ? 1 : -1;
        a.animPhase += dt * animRate;
      };

      // Active QB scramble detection (past LOS, outside pocket, or tucked by AI QB)
      const qbScramblingNow = Boolean(
        qb?.hasBall && (qb.aiScrambling || qb.x > ballYard - 0.35 || Math.abs(qb.y - MID_Y) > 4.2)
      );
      const effectivePursuit =
        pursuitActive ||
        qbScramblingNow ||
        (sim.playType === 'RUN' && sim.liveTime > 0.44);

      for (const a of sim.actors) {
        if (a.role === 'USER') continue;
        if (a.aiJukeCooldown && a.aiJukeCooldown > 0) {
          a.aiJukeCooldown = Math.max(0, a.aiJukeCooldown - dt);
        }
        if (a.aiJukeTimer && a.aiJukeTimer > 0) {
          a.aiJukeTimer = Math.max(0, a.aiJukeTimer - dt);
        }
        if (a.stiffArmVisual && a.stiffArmVisual > 0) {
          a.stiffArmVisual = Math.max(0, a.stiffArmVisual - dt);
        }
        if (a.aiDiveTimer && a.aiDiveTimer > 0) {
          a.aiDiveTimer = Math.max(0, a.aiDiveTimer - dt);
          a.z = Math.sin((a.aiDiveTimer / 0.44) * Math.PI) * 7;
        } else if (a.jumping && a.jumping > 0) {
          a.jumping = Math.max(0, a.jumping - dt);
          a.z = Math.sin((a.jumping / 0.42) * Math.PI) * 12;
        } else {
          a.z = 0;
        }
        if (a.knockedDown && a.knockedDown > 0) {
          a.knockedDown -= dt;
          a.animPhase += dt * 4;
          continue;
        }

        if (a.team === 'OFF') {
          if (
            a.hasBall &&
            (a.id === 'off_rb' || a.role === 'WR' || a.role === 'TE' || (a.id === 'off_qb' && a.aiScrambling))
          ) {
            // Active AI dive lunge forward
            if (a.aiDiveTimer && a.aiDiveTimer > 0) {
              a.vx = 7.9;
              a.x = clamp(a.x + 7.9 * dt, -10.5, 106);
              a.facing = 1;
              a.animPhase += dt * 8.5;
              continue;
            }

            // Early run route follow (for designed sweeps/off-tackle lanes) before breaking upfield
            if (a.id === 'off_rb' && sim.playType === 'RUN' && a.routePoints && a.routePoints.length > 0 && a.x < ballYard + 5.2) {
              const idx = a.routeIdx ?? 0;
              const pt = a.routePoints[idx];
              if (pt) {
                const dx = pt.x - a.x;
                const dy = pt.y - a.y;
                const d = Math.hypot(dx, dy);
                if (d < 0.85 && idx < a.routePoints.length - 1) {
                  a.routeIdx = idx + 1;
                } else if (d > 0.25) {
                  const spd = 5.65 + offRatingBoost;
                  a.vx += ((dx / d) * spd - a.vx) * easeAI;
                  a.vy += ((dy / d) * spd - a.vy) * easeAI;
                  a.x = clamp(a.x + a.vx * dt, -10.5, 106);
                  a.y = clamp(a.y + a.vy * dt, 1.2, FIELD_WIDTH_YARDS - 1.2);
                  a.facing = a.vx >= -0.35 ? 1 : -1;
                  a.animPhase += dt * 7.8;
                  continue;
                }
              }
            }

            const nearDef = sim.actors
              .filter((d) => d.team === 'DEF' && !d.knockedDown && d.x >= a.x - 0.7 && Math.hypot(d.x - a.x, d.y - a.y) < 3.8)
              .sort((d1, d2) => Math.hypot(d1.x - a.x, d1.y - a.y) - Math.hypot(d2.x - a.x, d2.y - a.y))[0];

            // Smart AI Dive near 1st down marker or goal line when a tackler closes in
            const nearFirstDown = a.x >= ballYard + yardsToGo - 2.2 && a.x < ballYard + yardsToGo;
            const nearGoal = a.x >= 97.6 && a.x < 100;
            if ((nearFirstDown || nearGoal) && nearDef && Math.hypot(nearDef.x - a.x, nearDef.y - a.y) < 2.35 && a.x > ballYard + 0.4) {
              a.aiDiveTimer = 0.44;
              a.vx = 7.9;
              retroAudio.play('beep2', 0.45);
              continue;
            }

            // Smart AI Juke away from imminent tacklers (staying safely inside sidelines)
            if (
              nearDef &&
              Math.hypot(nearDef.x - a.x, nearDef.y - a.y) < 3.1 &&
              (!a.aiJukeCooldown || a.aiJukeCooldown <= 0) &&
              a.x > ballYard - 0.8
            ) {
              const jukeDir: -1 | 1 =
                a.y < 3.5 ? 1 : a.y > FIELD_WIDTH_YARDS - 3.5 ? -1 : a.y >= nearDef.y ? 1 : -1;
              a.aiJukeTimer = 0.24;
              a.aiJukeDir = jukeDir;
              a.aiJukeCooldown = 0.88;
              retroAudio.play('click', 0.42);
            }

            const baseCarrierSpd =
              ((a.id === 'off_qb' ? 5.35 : a.id === 'off_rb' ? 5.88 : 5.82) +
                offRatingBoost * (a.stamina < 25 ? 0.5 : 1)) *
              weatherMeta.speedMult;
            const juking = Boolean(a.aiJukeTimer && a.aiJukeTimer > 0 && a.aiJukeDir);
            const evadeY = juking
              ? (a.aiJukeDir ?? 1) * 6.4
              : nearDef
                ? a.y < 3.0
                  ? 2.2
                  : a.y > FIELD_WIDTH_YARDS - 3.0
                    ? -2.2
                    : a.y >= nearDef.y
                      ? 2.35
                      : -2.35
                : 0;
            a.vx += ((juking ? baseCarrierSpd * 0.84 : baseCarrierSpd) - a.vx) * easeAI;
            a.vy += (evadeY - a.vy) * (juking ? Math.min(1, 13 * dt) : easeAI);
            a.x = clamp(a.x + a.vx * dt, -10.5, 106);
            a.y = clamp(a.y + a.vy * dt, 1.35, FIELD_WIDTH_YARDS - 1.35);
            a.stamina = clamp(a.stamina - 6.5 * weatherMeta.staminaDrainMult * dt, 0, 100);
            a.facing = 1;
            a.animPhase += dt * 8.0;
          } else if (sim.ball.inAir && sim.ball.intendedId === a.id && isEligibleReceiver(a, player.position)) {
            const dx = sim.ball.targetX - a.x;
            const dy = sim.ball.targetY - a.y;
            const d = Math.hypot(dx, dy);
            if (d > 0.18) {
              const spd = (a.role === 'WR' ? 5.9 : 5.3) + offRatingBoost;
              a.vx += ((dx / d) * spd - a.vx) * Math.min(1, 10 * dt);
              a.vy += ((dy / d) * spd - a.vy) * Math.min(1, 10 * dt);
              a.x = clamp(a.x + a.vx * dt, 0, 107);
              a.y = clamp(a.y + a.vy * dt, 1.2, FIELD_WIDTH_YARDS - 1.2);
              a.facing = a.vx >= -0.4 ? 1 : -1;
              a.animPhase += dt * 8.0;
            }
          } else if (a.role === 'TE' && sim.playType === 'RUN') {
            // TE edge-blocks nearest defender on run plays to help seal the outside lane
            const edgeDef = sim.actors
              .filter((d) => d.team === 'DEF' && !d.knockedDown && Math.hypot(d.x - a.x, d.y - a.y) < 4.2)
              .sort((d1, d2) => Math.hypot(d1.x - a.x, d1.y - a.y) - Math.hypot(d2.x - a.x, d2.y - a.y))[0];
            if (edgeDef) {
              const targetX = Math.min(ballYard + 1.8, edgeDef.x - 0.65);
              a.x += (targetX - a.x) * 2.4 * dt;
              a.y += (edgeDef.y - a.y) * 2.6 * dt;
              a.facing = 1;
              a.animPhase += dt * 6;
            } else {
              a.x += 2.6 * dt;
              a.facing = 1;
              a.animPhase += dt * 6;
            }
          } else if ((a.role === 'WR' || a.role === 'TE' || a.role === 'RB') && a.routePoints && a.routePoints.length > 0) {
            const idx = a.routeIdx ?? 0;
            const pt = a.routePoints[idx];
            if (pt) {
              const dx = pt.x - a.x;
              const dy = pt.y - a.y;
              const d = Math.hypot(dx, dy);
              const isLast = idx >= a.routePoints.length - 1;
              if (d < 0.7 && !isLast) {
                a.routeIdx = idx + 1;
              } else if (d > 0.35) {
                const baseSpd = a.role === 'WR' ? 5.45 : a.role === 'TE' ? 4.85 : 5.05;
                const spd = baseSpd + offRatingBoost;
                a.vx += ((dx / d) * spd - a.vx) * easeAI;
                a.vy += ((dy / d) * spd - a.vy) * easeAI;
                a.x = clamp(a.x + a.vx * dt, -3, 105);
                a.y = clamp(a.y + a.vy * dt, 1.1, FIELD_WIDTH_YARDS - 1.1);
                a.facing = a.vx >= -0.45 ? 1 : -1;
                a.animPhase += dt * 7.5;
              } else {
                a.vx *= 0.85;
                a.vy *= 0.85;
                a.facing = -1;
                a.animPhase += dt * 3.5;
              }
            }
          } else if (a.role === 'OL') {
            // Find nearest unengaged DL/LB first so OL don't pile 3-on-1 while leaving a gap wide open
            const nearbyDefs = sim.actors
              .filter((d) => d.team === 'DEF' && !d.knockedDown && Math.hypot(d.x - a.x, d.y - a.y) < 4.0)
              .sort((d1, d2) => Math.hypot(d1.x - a.x, d1.y - a.y) - Math.hypot(d2.x - a.x, d2.y - a.y));
            const assigned =
              nearbyDefs.find(
                (d) =>
                  !sim.actors.some(
                    (other) =>
                      other !== a &&
                      other.team === 'OFF' &&
                      other.role === 'OL' &&
                      Math.hypot(other.x - d.x, other.y - d.y) < 1.1
                  )
              ) ?? nearbyDefs[0];
            if (assigned) {
              if (sim.playType === 'RUN') {
                // Drive-block forward slightly to open a crease at LOS
                const goalX = Math.min(ballYard + 1.35, Math.max(ballYard - 0.6, assigned.x - 0.65));
                a.x += (goalX - a.x) * 2.3 * dt;
                a.y += (assigned.y - a.y) * 2.7 * dt;
              } else {
                // Pass set pocket protection
                const goalX = Math.max(ballYard - 2.3, Math.min(a.x, assigned.x - 0.9));
                a.x += (goalX - a.x) * 1.65 * dt;
                a.y += (assigned.y - a.y) * 2.2 * dt;
              }
              a.facing = 1;
              a.animPhase += dt * 5.2;
            }
          }
        } else {
          // DEFENSE AI: Natural facing turns, realistic zone cushions, & s_intercept_object pursuit
          if (a.role === 'DL') {
            const target = ballCarrier ?? qb;
            const blocker = sim.actors.find(
              (o) =>
                o.team === 'OFF' &&
                (o.role === 'OL' ||
                  (sim.playType === 'RUN' && o.role === 'TE') ||
                  (o.role === 'USER' && player.position === 'OL')) &&
                !o.knockedDown &&
                Math.hypot(o.x - a.x, o.y - a.y) < 1.85
            );
            if (blocker && !qbScramblingNow) {
              const bullPush =
                sim.playType === 'RUN'
                  ? (myTeam.offense - oppTeam.defense) * 0.08
                  : -(0.12 + Math.max(0, oppTeam.defense - myTeam.offense) * 0.06);
              a.x += bullPush * dt;
              a.y += (blocker.y - a.y) * 1.2 * dt;
              a.facing = -1;
              a.animPhase += dt * 5;
            } else if (target) {
              if (effectivePursuit) {
                steerPursuit(a, target, (qbScramblingNow ? 4.85 : 4.45) + defRatingBoost, 7.2);
              } else {
                const dx = target.x - a.x;
                const dy = target.y - a.y;
                const d = Math.max(0.1, Math.hypot(dx, dy));
                const rushSpd = 3.25 + defRatingBoost;
                a.vx += ((dx / d) * rushSpd - a.vx) * easeAI;
                a.vy += ((dy / d) * rushSpd - a.vy) * easeAI;
                a.x += a.vx * dt;
                a.y += a.vy * dt;
                a.facing = a.vx > 0.35 ? 1 : -1;
                a.animPhase += dt * 6.8;
              }
            }
          } else if (a.role === 'LB') {
            if (effectivePursuit && ballCarrier) {
              steerPursuit(a, ballCarrier, (qbScramblingNow ? 5.65 : 5.25) + defRatingBoost, 8.2);
            } else if (sim.defCall === 'LB_BLITZ' && !offPassCaught && qb?.hasBall) {
              steerPursuit(a, qb, 5.15 + defRatingBoost, 8.0);
            } else if (sim.ball.inAir && sim.dbReactTimer <= 0 && sim.ball.x <= ballYard + 16) {
              const dx = sim.ball.targetX - a.x;
              const dy = sim.ball.targetY - a.y;
              const d = Math.max(0.1, Math.hypot(dx, dy));
              const spd = 5.15 + defRatingBoost;
              a.vx += ((dx / d) * spd - a.vx) * easeAI;
              a.vy += ((dy / d) * spd - a.vy) * easeAI;
              a.x += a.vx * dt;
              a.y += a.vy * dt;
              a.facing = Math.abs(a.vx) > 0.35 ? (a.vx > 0 ? 1 : -1) : -1;
              a.animPhase += dt * 8.0;
            } else {
              // Hook/Curl Zone patrol matching RB/TE crossing threats
              const isTopLB = a.id === 'def_lb_0';
              const zoneX = ballYard + (sim.defCall === 'PREVENT' ? 7.5 : 5.4);
              const zoneY = MID_Y + (isTopLB ? -4.2 : 4.2);
              const threat = sim.actors
                .filter(
                  (o) =>
                    o.team === 'OFF' &&
                    (o.role === 'TE' || o.role === 'RB' || o.role === 'WR') &&
                    Math.hypot(o.x - zoneX, o.y - zoneY) < 6.8
                )
                .sort((o1, o2) => Math.hypot(o1.x - zoneX, o1.y - zoneY) - Math.hypot(o2.x - zoneX, o2.y - zoneY))[0];
              const tx = threat ? Math.max(zoneX - 0.4, threat.x + 1.85) : zoneX;
              const ty = threat ? zoneY * 0.35 + threat.y * 0.65 : zoneY;
              const dx = tx - a.x;
              const dy = ty - a.y;
              const d = Math.hypot(dx, dy);
              if (d > 0.3) {
                const spd = 4.45 + defRatingBoost;
                a.vx += ((dx / d) * spd - a.vx) * easeAI;
                a.vy += ((dy / d) * spd - a.vy) * easeAI;
                a.x += a.vx * dt;
                a.y += a.vy * dt;
              } else {
                a.vx *= 0.85;
                a.vy *= 0.85;
              }
              a.facing = a.vx > 0.45 ? 1 : -1;
              a.animPhase += dt * 6.5;
            }
          } else if (a.role === 'DB') {
            if (sim.ball.inAir && sim.dbReactTimer <= 0) {
              const dx = sim.ball.targetX - a.x;
              const dy = sim.ball.targetY - a.y;
              const d = Math.max(0.1, Math.hypot(dx, dy));
              const spd = 5.6 + defRatingBoost;
              a.vx += ((dx / d) * spd - a.vx) * Math.min(1, 9.4 * dt);
              a.vy += ((dy / d) * spd - a.vy) * Math.min(1, 9.4 * dt);
              a.x += a.vx * dt;
              a.y += a.vy * dt;
              a.facing = Math.abs(a.vx) > 0.35 ? (a.vx > 0 ? 1 : -1) : -1;
              a.animPhase += dt * 8.2;
            } else if (effectivePursuit && ballCarrier) {
              const isSafety = a.id === 'def_s1';
              steerPursuit(a, ballCarrier, (isSafety && qbScramblingNow ? 5.95 : 5.75) + defRatingBoost, 8.2);
            } else {
              const wr =
                a.id === 'def_cb1'
                  ? sim.actors.find((o) => o.id === 'off_wr1')
                  : a.id === 'def_cb2'
                    ? sim.actors.find((o) => o.id === 'off_wr2')
                    : sim.actors.find((o) => o.id === 'off_wr1');
              const wr2 = sim.actors.find((o) => o.id === 'off_wr2');
              if (wr) {
                const isSafety = a.id === 'def_s1';
                let tx = a.x;
                let ty = a.y;
                if (isSafety) {
                  // Free Safety protects deepest vertical threat with natural cushion
                  const deepestX = Math.max(wr.x, wr2?.x ?? wr.x);
                  const deepestY = wr2 && wr2.x > wr.x ? wr2.y : wr.y;
                  tx = Math.max(ballYard + (sim.defCall === 'PREVENT' ? 14.5 : 11.2), deepestX + 5.8);
                  ty = MID_Y * 0.55 + deepestY * 0.45;
                } else if (sim.defCall === 'COVER_2') {
                  // Cover 2 Corner sits in flat/curl zone with realistic separation cushion
                  const landmarkX = clamp(Math.max(ballYard + 4.8, wr.x + 3.4), ballYard + 4.2, ballYard + 13.5);
                  const landmarkY = a.id === 'def_cb1' ? Math.min(wr.y, MID_Y - 5.2) : Math.max(wr.y, MID_Y + 5.2);
                  tx = landmarkX;
                  ty = landmarkY * 0.65 + wr.y * 0.35;
                } else if (sim.defCall === 'PREVENT') {
                  tx = Math.max(ballYard + 9.5, wr.x + 6.4);
                  ty = wr.y;
                } else {
                  // MAN Coverage with leverage trail & natural cut lag
                  tx = wr.x + 2.25;
                  ty = wr.y + (wr.y > MID_Y ? -0.45 : 0.45);
                }
                const dx = tx - a.x;
                const dy = ty - a.y;
                const d = Math.hypot(dx, dy);
                if (d > 0.25) {
                  const spd = (sim.defCall === 'MAN' ? 5.2 : 4.9) + defRatingBoost;
                  const covEase = Math.min(1, (sim.defCall === 'MAN' ? 6.0 : 6.6) * dt);
                  a.vx += ((dx / d) * spd - a.vx) * covEase;
                  a.vy += ((dy / d) * spd - a.vy) * covEase;
                  a.x += a.vx * dt;
                  a.y += a.vy * dt;
                  a.facing = a.vx > 0.45 ? 1 : -1;
                  a.animPhase += dt * 7.2;
                } else {
                  a.vx *= 0.82;
                  a.vy *= 0.82;
                  a.facing = -1;
                  a.animPhase += dt * 4.0;
                }
              }
            }
          }
        }
      }

      // Unified Ball Flight & Jump-Ball Resolution (Symmetric Offense & Defense!)
      if (sim.ball.inAir) {
        sim.ball.flightElapsed += dt;
        const windPushY =
          !sim.ball.isKick && weatherMeta.passWindDrift > 0
            ? (sim.kickMeter.wind / 10) * weatherMeta.passWindDrift * (sim.ball.isBullet ? 0.35 : 1.0)
            : 0;
        sim.ball.vy += windPushY * dt;
        sim.ball.x += sim.ball.vx * dt;
        sim.ball.y = clamp(sim.ball.y + sim.ball.vy * dt, 0.4, FIELD_WIDTH_YARDS - 0.4);
        sim.ball.z += sim.ball.vz * dt;
        sim.ball.vz -= sim.ball.gravity * dt;

        // Rare DL line bat-down right at LOS — NEVER a DL interception!
        if (sim.ball.flightElapsed >= 0.08 && sim.ball.flightElapsed < 0.22 && sim.ball.z <= 1.25) {
          const jumpingDL = sim.actors.find(
            (a) =>
              a.role === 'DL' &&
              !a.knockedDown &&
              Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) < 0.8
          );
          if (jumpingDL && Math.random() < 0.04) {
            sim.ball.inAir = false;
            jumpingDL.jumping = 0.34;
            retroAudio.play('bounce', 0.75);
            finishPlay({
              yardsGained: 0,
              isTouchdown: false,
              isTurnover: false,
              isFirstDown: false,
              clockStopped: true,
              commentary: 'Pass batted down at the line of scrimmage!',
              statDelta: {
                passAtt: sim.ball.thrownByUser ? 1 : 0,
              },
            });
            return;
          }
        }

        // Synchronized aerial jump animation when ball enters jump window for BOTH receiver & defender
        if (sim.ball.flightElapsed >= 0.22 && sim.ball.x > ballYard + 1.4 && sim.ball.z <= 2.95) {
          for (const a of sim.actors) {
            if (a.knockedDown || (a.jumping && a.jumping > 0)) continue;
            if (
              (isEligibleReceiver(a, player.position) ||
                (a.team === 'DEF' && a.role !== 'DL' && (a.role !== 'USER' || player.position !== 'DL'))) &&
              Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) < 2.25
            ) {
              a.jumping = 0.4;
              a.facing = a.vx > 0.35 ? 1 : a.team === 'OFF' ? 1 : -1;
            }
          }
        }

        // Unified Jump-Ball Resolution when ball reaches catch height (z <= 2.45)
        if (sim.ball.flightElapsed >= 0.24 && sim.ball.x > ballYard + 1.4 && sim.ball.z <= 2.45) {
          const eligibleReceivers = sim.actors
            .filter(
              (a) =>
                isEligibleReceiver(a, player.position) &&
                Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) < (a.role === 'USER' ? 2.85 : 2.5)
            )
            .sort(
              (a, b) =>
                Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) -
                Math.hypot(b.x - sim.ball.x, b.y - sim.ball.y)
            );
          const receiver = eligibleReceivers[0];

          const nearDefs = sim.actors
            .filter(
              (a) =>
                a.team === 'DEF' &&
                !a.knockedDown &&
                a.role !== 'DL' &&
                (a.role !== 'USER' || player.position !== 'DL') &&
                Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) < (a.role === 'USER' ? 2.75 : 2.3)
            )
            .sort(
              (a, b) =>
                Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) -
                Math.hypot(b.x - sim.ball.x, b.y - sim.ball.y)
            );
          const defender = nearDefs[0];

          const rDist = receiver ? Math.hypot(receiver.x - sim.ball.x, receiver.y - sim.ball.y) : 99;
          const dDist = defender ? Math.hypot(defender.x - sim.ball.x, defender.y - sim.ball.y) : 99;

          if (receiver || defender) {
            const receiverStamEdge = receiver ? (receiver.stamina < 25 ? -0.14 : 0) : 0;
            const defStamEdge = defender ? (defender.stamina < 25 ? -0.14 : 0) : 0;

            const offScore = receiver
              ? (1 - rDist / 2.95) * 1.15 +
                (receiver.role === 'USER' ? player.attributes.skill * 0.052 : (myTeam.offense - 3) * 0.055) +
                receiverStamEdge +
                (receiver.role === 'USER' && sim.userJumpTimer > 0 ? 0.2 : 0) +
                (sim.ball.isBullet ? 0.05 : 0)
              : -1;

            const defScore = defender
              ? (1 - dDist / 2.75) * 1.05 +
                (defender.role === 'USER' ? player.attributes.skill * 0.052 : (oppTeam.defense - 3) * 0.055) +
                defStamEdge +
                (defender.role === 'USER' && sim.userJumpTimer > 0 ? 0.24 : 0) +
                (sim.ball.intendedId === receiver?.id ? 0 : 0.14)
              : -1;

            const triggerInt = (defActor: Actor) => {
              sim.ball.inAir = false;
              defActor.jumping = 0.42;
              defActor.hasBall = true;
              if (defActor.role === 'USER') {
                sim.intsMade += 1;
                sim.deflectionsMade += 1;
                sim.crowdExcited = 2.0;
              }
              retroAudio.play(defActor.role === 'USER' ? 'success' : 'audience_dis', 0.9);
              finishPlay({
                yardsGained: 0,
                isTouchdown: false,
                isTurnover: true,
                turnoverType: 'INT',
                isFirstDown: false,
                clockStopped: true,
                commentary:
                  defActor.role === 'USER'
                    ? `${player.lastName} leaps and INTERCEPTS the pass!`
                    : 'PICKED OFF! Defender wins the jump ball for an interception!',
                statDelta:
                  playMode === 'DEFENSE'
                    ? {
                        defInt: defActor.role === 'USER' ? 1 : 0,
                        passDeflections: defActor.role === 'USER' ? 1 : 0,
                      }
                    : {
                        passAtt: sim.ball.thrownByUser ? 1 : 0,
                        interceptions: sim.ball.thrownByUser ? 1 : 0,
                        targets: receiver?.role === 'USER' ? 1 : 0,
                      },
              });
            };

            const triggerBreakup = (defActor: Actor) => {
              sim.ball.inAir = false;
              defActor.jumping = 0.36;
              if (defActor.role === 'USER') sim.deflectionsMade += 1;
              retroAudio.play('bounce', 0.8);
              finishPlay({
                yardsGained: 0,
                isTouchdown: false,
                isTurnover: false,
                isFirstDown: false,
                clockStopped: true,
                commentary:
                  defActor.role === 'USER'
                    ? `${player.lastName} breaks up the pass! Incomplete.`
                    : 'Pass broken up in tight coverage!',
                statDelta:
                  playMode === 'DEFENSE'
                    ? { passDeflections: defActor.role === 'USER' ? 1 : 0 }
                    : {
                        passAtt: sim.ball.thrownByUser ? 1 : 0,
                        targets: receiver?.role === 'USER' ? 1 : 0,
                      },
              });
            };

            const triggerCatch = (recActor: Actor, contested: boolean) => {
              sim.ball.inAir = false;
              sim.ball.z = 0;
              sim.ball.x = recActor.x;
              sim.ball.y = recActor.y;
              recActor.hasBall = true;
              recActor.facing = 1;
              recActor.jumping = 0.28;
              sim.catchProtectTimer = 0.34;
              retroAudio.play('success', 0.75);
              setBannerText(contested ? 'CONTESTED CATCH!' : recActor.role === 'USER' ? 'CAUGHT! RUN!' : 'CAUGHT!');
            };

            // Defender cleanly unchallenged in the air (most coverage plays are PBUs; bad throws get picked)
            if (defender && (!receiver || dDist < rDist - 0.55) && dDist < 1.75) {
              const intChance = clamp(0.16 + defScore * 0.22, 0.14, 0.4);
              if (Math.random() < intChance) triggerInt(defender);
              else triggerBreakup(defender);
              return;
            }

            // Contested Jump Ball (Offense vs Defense use the exact same unified diff!)
            if (receiver && defender && dDist < 2.35) {
              const diff = offScore - defScore - weatherMeta.catchPenalty * 0.6;
              if (diff >= 0.16) {
                triggerCatch(receiver, true);
              } else if (diff <= -0.34) {
                if (Math.random() < 0.44) triggerInt(defender);
                else triggerBreakup(defender);
                return;
              } else {
                const intProb = clamp(0.1 - diff * 0.26, 0.04, 0.24);
                const pbuProb = clamp(0.32 - diff * 0.46 + weatherMeta.catchPenalty * 0.7, 0.18, 0.52);
                const roll = Math.random();
                if (roll < intProb) {
                  triggerInt(defender);
                  return;
                }
                if (roll < intProb + pbuProb) {
                  triggerBreakup(defender);
                  return;
                }
                triggerCatch(receiver, true);
              }
            } else if (receiver) {
              // Uncontested catch check (weather slickness slightly lowers clean catch rate)
              const openCatchChance =
                receiver.role === 'USER'
                  ? clamp(
                      0.86 +
                        player.attributes.skill * 0.012 +
                        receiverStamEdge -
                        weatherMeta.catchPenalty -
                        (sim.ball.isBullet ? 0.03 : 0),
                      0.68,
                      0.97
                    )
                  : clamp(0.86 - weatherMeta.catchPenalty - (sim.ball.isBullet ? 0.04 : 0), 0.7, 0.93);

              if (Math.random() < openCatchChance) {
                triggerCatch(receiver, false);
              } else {
                sim.ball.inAir = false;
                retroAudio.play('bounce', 0.7);
                finishPlay({
                  yardsGained: 0,
                  isTouchdown: false,
                  isTurnover: false,
                  isFirstDown: false,
                  clockStopped: true,
                  commentary: 'Receiver lets it slip through his hands! Dropped pass.',
                  statDelta: {
                    passAtt: sim.ball.thrownByUser ? 1 : 0,
                    targets: receiver.role === 'USER' ? 1 : 0,
                  },
                });
                return;
              }
            }
          }
        }

        if (sim.ball.inAir && sim.ball.z <= 0) {
          sim.ball.inAir = false;
          retroAudio.play('bounce', 0.6);
          finishPlay({
            yardsGained: 0,
            isTouchdown: false,
            isTurnover: false,
            isFirstDown: false,
            clockStopped: true,
            commentary: 'Pass falls incomplete.',
            statDelta: {
              passAtt: sim.ball.thrownByUser ? 1 : 0,
              targets: player.position === 'WR' || player.position === 'TE' ? (sim.calledForBall ? 1 : 0) : 0,
            },
          });
          return;
        }
      }

      // Carrier Checks
      const carrier = sim.actors.find((a) => a.team === 'OFF' && a.hasBall);
      if (carrier) {
        sim.ball.x = carrier.x;
        sim.ball.y = carrier.y;

        if (carrier.x >= 100) {
          const gained = Math.round(100 - ballYard);
          const wasPass = sim.playType === 'PASS' && carrier.id !== 'off_qb';
          const isUserBall = carrier.role === 'USER';
          finishPlay({
            yardsGained: gained,
            isTouchdown: true,
            isTurnover: false,
            isFirstDown: true,
            clockStopped: true,
            commentary: isUserBall
              ? `TOUCHDOWN ${player.lastName}! ${gained}-yard score!`
              : `TOUCHDOWN ${myTeam.shortName}! ${gained}-yard strike!`,
            statDelta: buildOffenseStats(player.position, sim, gained, true, wasPass, isUserBall),
          });
          return;
        }

        if (carrier.y <= 0.9 || carrier.y >= FIELD_WIDTH_YARDS - 0.9 || carrier.x <= -9.5) {
          const gained = Math.round(carrier.x - ballYard);
          const wasPass = sim.playType === 'PASS' && carrier.id !== 'off_qb';
          const isUserBall = carrier.role === 'USER';
          const isSafety = carrier.x <= 0;
          retroAudio.play('beep', 0.6);
          finishPlay({
            yardsGained: gained,
            isTouchdown: false,
            isTurnover: false,
            isFirstDown: !isSafety && gained >= yardsToGo,
            isSafety,
            clockStopped: true,
            commentary: isSafety
              ? 'SAFETY! Ball carrier forced out in own endzone (+2 PTS)!'
              : `Stepped out of bounds for ${gained >= 0 ? `+${gained}` : gained} yds.`,
            statDelta: buildOffenseStats(player.position, sim, gained, false, wasPass, isUserBall),
          });
          return;
        }

        if (sim.catchProtectTimer <= 0) {
          const tackler = sim.actors.find(
            (d) => d.team === 'DEF' && !d.knockedDown && Math.hypot(d.x - carrier.x, d.y - carrier.y) < 1.35
          );
          if (tackler) {
            const carrierStamFactor = carrier.stamina < 25 ? 0.55 : 1.0;
            const isQBScrambleCarrier = carrier.id === 'off_qb';
            const breakChance = isQBScrambleCarrier
              ? (0.06 + (carrier.role === 'USER' ? player.attributes.strength * 0.012 : 0)) * carrierStamFactor
              : carrier.role === 'USER'
                ? (0.08 + player.attributes.strength * 0.036 + (sim.jukeBoostTimer > 0 ? 0.25 : 0)) * carrierStamFactor
                : (0.18 + (carrier.aiJukeTimer && carrier.aiJukeTimer > 0 ? 0.16 : 0)) * carrierStamFactor;

            if (Math.random() < breakChance && (!carrier.stiffArmCooldown || carrier.stiffArmCooldown <= 0)) {
              tackler.knockedDown = 1.25;
              carrier.stiffArmCooldown = 1.1;
              carrier.stiffArmVisual = 0.4;
              carrier.stamina = clamp(carrier.stamina - 6, 0, 100);
              retroAudio.playOof();
              setBannerText('STIFF ARM!');
            } else {
              const gained = Math.round(carrier.x - ballYard);
              const wasPass = sim.playType === 'PASS' && carrier.id !== 'off_qb';
              const isUserBall = carrier.role === 'USER';
              const isSafety = carrier.x <= 0;
              retroAudio.play('tackle', 0.9);
              retroAudio.playOof();

              if (tackler.role === 'USER') {
                sim.tacklesMade += 1;
                if (carrier.id === 'off_qb' && gained < 0) sim.sacksMade += 1;
              }

              // Realistic Fumble Tendency on live tackles (fatigue, QB exposure, & wet weather!)
              const carrierStr = carrier.role === 'USER' ? player.attributes.strength : myTeam.offense * 0.85;
              const fumbleRisk = clamp(
                0.011 +
                  (carrier.stamina < 25 ? 0.022 : carrier.stamina < 45 ? 0.008 : 0) +
                  (isQBScrambleCarrier ? 0.014 : 0) +
                  (tackler.role === 'USER' ? player.attributes.strength * 0.0018 : 0) +
                  weatherMeta.fumbleAdd -
                  carrierStr * 0.0008,
                0.005,
                0.065
              );

              if (!isSafety && Math.random() < fumbleRisk) {
                const defRecovered = Math.random() < 0.55;
                if (defRecovered) {
                  retroAudio.play(playMode === 'DEFENSE' ? 'success' : 'audience_dis', 0.9);
                }
                const wasPass = sim.playType === 'PASS' && carrier.id !== 'off_qb';
                const isUserBall = carrier.role === 'USER';
                const baseOffStat = buildOffenseStats(player.position, sim, gained, false, wasPass, isUserBall);
                finishPlay({
                  yardsGained: gained,
                  isTouchdown: false,
                  isTurnover: defRecovered,
                  turnoverType: defRecovered ? 'FUMBLE' : undefined,
                  isFirstDown: !defRecovered && gained >= yardsToGo,
                  clockStopped: true,
                  commentary: defRecovered
                    ? tackler.role === 'USER'
                      ? `FORCED FUMBLE! ${player.lastName} strips the ball and ${myTeam.shortName} RECOVERS!`
                      : `FUMBLE! ${oppTeam.shortName} recovers the loose ball!`
                    : `FUMBLE! Ball pops loose after ${gained >= 0 ? `+${gained}` : gained} yds, but offense falls on it.`,
                  statDelta:
                    playMode === 'DEFENSE'
                      ? {
                          tackles: tackler.role === 'USER' ? 1 : 0,
                          sacks: tackler.role === 'USER' && isQBScrambleCarrier && gained < 0 ? 1 : 0,
                          tfl: tackler.role === 'USER' && gained < 0 ? 1 : 0,
                          forcedFumbles: tackler.role === 'USER' ? 1 : 0,
                        }
                      : {
                          ...baseOffStat,
                          fumbles: isUserBall ? 1 : 0,
                        },
                });
                return;
              }

              finishPlay({
                yardsGained: gained,
                isTouchdown: false,
                isTurnover: false,
                isFirstDown: !isSafety && gained >= yardsToGo,
                isSafety,
                clockStopped: isSafety,
                commentary: isSafety
                  ? tackler.role === 'USER'
                    ? `SAFETY! ${player.lastName} drops the ball carrier in the endzone (+2 PTS)!`
                    : 'SAFETY! Tackled in the endzone for 2 points!'
                  : tackler.role === 'USER'
                    ? `${player.lastName} brings down the ball carrier (${gained >= 0 ? `+${gained}` : gained} yds)!`
                    : gained < 0 && carrier.id === 'off_qb'
                      ? `Sacked for ${gained} yds!`
                      : `Tackled after a ${gained >= 0 ? `gain of ${gained}` : `loss of ${Math.abs(gained)}`} yds.`,
                statDelta:
                  playMode === 'DEFENSE'
                    ? {
                        tackles: tackler.role === 'USER' ? 1 : 0,
                        sacks: tackler.role === 'USER' && carrier.id === 'off_qb' && gained < 0 ? 1 : 0,
                        tfl: tackler.role === 'USER' && gained < 0 ? 1 : 0,
                      }
                    : buildOffenseStats(player.position, sim, gained, false, wasPass, isUserBall),
              });
              return;
            }
          }
        }
      }

      // Smooth Retro Bowl camera follow
      const focusX = sim.ball.inAir
        ? sim.ball.x
        : user && playMode === 'DEFENSE'
          ? (user.x + sim.ball.x) / 2
          : sim.ball.x;
      const leadOffset = driveDir === 1 ? 360 : VIEW_W - 360;
      const targetCam = clamp(worldToPxX(focusX) - leadOffset, 0, WORLD_W - VIEW_W);
      sim.camPx += (targetCam - sim.camPx) * Math.min(1, 5.6 * dt);
    };

    const renderField = (ctx: CanvasRenderingContext2D, sim: NonNullable<typeof simRef.current>, now: number) => {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#1d4972';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      const cam = Math.round(sim.camPx);
      const isCollege = era === 'COLLEGE';

      ctx.save();
      ctx.translate(-cam, 0);

      // 1. Authentic Game-Day Stadium Stands (Upper Bowl: 6 dense rows + aisle stairs + LED ribbon)
      const crowdColors = {
        helmet: myUniform.helmet,
        shirt: myUniform.shirt,
        pants: myUniform.pants,
        pantsB: '#e5e5e5',
        cleats: '#1a1a1a',
      };
      const isHighSchool = era === 'HIGH_SCHOOL';
      const turnout = clamp(
        era === 'NFL' ? Math.max(0.76, crowdTurnout) : isCollege ? Math.max(0.65, crowdTurnout) : crowdTurnout,
        0.24,
        1.0
      );

      // Stadium concrete deck & tiered risers
      ctx.fillStyle = '#0d2136';
      ctx.fillRect(0, 0, WORLD_W, FIELD_TOP_Y);
      for (let r = 0; r < 6; r++) {
        ctx.fillStyle = r % 2 === 0 ? '#1c3754' : '#142b44';
        ctx.fillRect(0, 2 + r * 9, WORLD_W, 8);
      }

      // Vertical stadium concrete aisle stairs every 184px
      const firstAisle = Math.floor(Math.max(0, cam - 40) / 184) * 184;
      for (let ax = firstAisle; ax <= cam + VIEW_W + 40; ax += 184) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(ax, 2, 12, FIELD_TOP_Y - 11);
        ctx.fillStyle = '#475569';
        for (let r = 0; r < 6; r++) {
          ctx.fillRect(ax + 1, 3 + r * 9, 10, 3);
        }
      }

      // Dense packed spectators across 6 staggered rows (every 8px!)
      const startSeat = Math.max(0, Math.floor((cam - 30) / 8));
      const endSeat = Math.min(Math.floor(WORLD_W / 8), Math.ceil((cam + VIEW_W + 30) / 8));
      const shirtPool = [myUniform.shirt, myUniform.helmet, '#f8fafc', myUniform.pants, '#e2e8f0'];
      for (let row = 0; row < 6; row++) {
        const sy = 3 + row * 9;
        for (let col = startSeat; col <= endSeat; col++) {
          const sx = col * 8 + (row % 2) * 3;
          // Leave concrete aisle gaps clean
          if (sx % 184 < 12) continue;
          const hash = ((col * 67 + row * 193 + 17) % 100) / 100;
          const sectionBias = col > 270 ? 0.06 : 0;
          if (hash > turnout - sectionBias) continue;
          const isVisitingSection = col > 282 && hash < 0.58;
          const fanColor = isVisitingSection ? oppUniform.shirt : shirtPool[(col * 3 + row) % shirtPool.length];
          const bounce =
            sim.crowdExcited > 0
              ? Math.round(Math.sin(now / 95 + col * 0.8 + row) * 2.5)
              : turnout >= 0.72 && (col + row) % 6 === 0
                ? Math.round(Math.sin(now / 210 + col + row) * 1.2)
                : 0;
          ctx.fillStyle = '#0b1320';
          ctx.fillRect(sx - 1, sy + bounce - 1, 7, 8);
          ctx.fillStyle = SKIN_POOL[(col + row) % SKIN_POOL.length];
          ctx.fillRect(sx + 1, sy + bounce, 4, 3);
          ctx.fillStyle = fanColor;
          ctx.fillRect(sx, sy + bounce + 3, 6, 4);
          if ((sim.crowdExcited > 0 || turnout >= 0.78) && (col + row) % 8 === 0) {
            ctx.fillStyle = isVisitingSection ? oppUniform.helmet : '#fde047';
            ctx.fillRect(sx + 5, sy + bounce - 3, 2, 4);
          }
        }
      }

      // LED Ribbon Fascia Board & Stadium Wall along top sideline
      ctx.fillStyle = '#091524';
      ctx.fillRect(0, FIELD_TOP_Y - 10, WORLD_W, 10);
      ctx.fillStyle = myUniform.shirt;
      ctx.fillRect(0, FIELD_TOP_Y - 9, WORLD_W, 7);
      if (!isHighSchool) {
        // Illuminated LED ribbon accents for NFL & College bowls
        const firstAd = Math.floor(Math.max(0, cam - 160) / 220) * 220;
        ctx.font = 'bold 6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let bx = firstAd; bx <= cam + VIEW_W + 220; bx += 220) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(bx + 10, FIELD_TOP_Y - 9, 130, 7);
          ctx.fillStyle = '#fde047';
          ctx.fillText(
            era === 'NFL' ? `${myTeam.shortName} STADIUM` : `${myTeam.name.toUpperCase()} BOWL`,
            bx + 75,
            FIELD_TOP_Y - 5
          );
        }
      }
      ctx.fillStyle = '#0b1929';
      ctx.fillRect(0, FIELD_TOP_Y - 2, WORLD_W, 2);

      // 2. Retro Bowl Turf (spr_field or spr_field_co for College)
      const fieldSprite = isCollege ? 'spr_field_co' : 'spr_field';
      const fieldFrame = weatherMeta.sprFieldFrame;
      if (!drawRetroSpriteFast(ctx, fieldSprite, fieldFrame, 0, FIELD_TOP_Y, 2, 2)) {
        ctx.fillStyle = '#247c42';
        ctx.fillRect(0, FIELD_TOP_Y, WORLD_W, VIEW_H - FIELD_TOP_Y);
      }

      // 3. Tinted Team Endzones (swap Left vs Right endzones when driving Left)
      const leftEndTeam = driveDir === 1 ? myTeam : oppTeam;
      const rightEndTeam = driveDir === 1 ? oppTeam : myTeam;
      drawRetroSprite(ctx, 'spr_endzone', 0, 100, TURF_TOP_Y, 2, 2, {
        tint: leftEndTeam.uniforms.endzone,
        ignoreOrigin: true,
      });
      drawRetroSprite(ctx, 'spr_endzone', 0, 2302, TURF_TOP_Y, 2, 2, {
        tint: rightEndTeam.uniforms.endzone,
        ignoreOrigin: true,
      });

      // Bold Retro Bowl Endzone Team Text (vertical)
      ctx.save();
      ctx.font = 'bold 26px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.translate(200, FIELD_MID_Y_PX);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(leftEndTeam.shortName.toUpperCase(), 0, 0);
      ctx.restore();

      ctx.save();
      ctx.font = 'bold 26px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.translate(2402, FIELD_MID_Y_PX);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(rightEndTeam.shortName.toUpperCase(), 0, 0);
      ctx.restore();

      // 4. Sideline Crew, Cheerleaders & College Marching Band!
      const crewSprite = isCollege ? 'spr_sideline_crew_co' : 'spr_sideline_crew';
      drawRetroSprite(ctx, crewSprite, 0, 420, 86, 2, 2, {
        portraitColors: crowdColors,
        ignoreOrigin: true,
      });
      drawRetroSprite(ctx, crewSprite, 0, 1340, 86, 2, 2, {
        portraitColors: crowdColors,
        ignoreOrigin: true,
      });
      const cheerFrame = Math.floor(now / 180) % 4;
      drawRetroSprite(ctx, 'spr_cheerleaders1', cheerFrame, 260, 106, 2, 2, {
        portraitColors: crowdColors,
        ignoreOrigin: true,
      });
      drawRetroSprite(ctx, 'spr_cheerleaders2', cheerFrame, 2260, 106, 2, 2, {
        portraitColors: crowdColors,
        ignoreOrigin: true,
      });

      if (isCollege) {
        const bandFrame = Math.floor(now / 170) % 4;
        const bandSprites = ['spr_band_conductor', 'spr_band_drum1', 'spr_band_horn', 'spr_band_trumpet', 'spr_band_drum1'];
        bandSprites.forEach((bs, idx) => {
          drawRetroSprite(ctx, bs, bandFrame, 1960 + idx * 36, 98, 2, 2, {
            portraitColors: crowdColors,
            ignoreOrigin: true,
          });
        });
      }

      // 5. Line of Scrimmage (blue) & First Down (yellow) + spr_chains
      if (playMode !== 'KICK_FG' && playMode !== 'KICK_PAT') {
        const scrimPx = worldToPxX(ballYard);
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(scrimPx - 1, TURF_TOP_Y - 1, 3, TURF_BOT_Y - TURF_TOP_Y);
        ctx.restore();
        drawRetroSprite(ctx, 'spr_chains', 1, scrimPx, TURF_TOP_Y - 6, 2, 2);

        const fdYard = ballYard + yardsToGo;
        if (fdYard > 0 && fdYard < 100 && playMode !== 'KICK_PUNT' && playMode !== 'KICKOFF' && playMode !== 'KICK_ONSIDE') {
          const fdPx = worldToPxX(fdYard);
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#facc15';
          ctx.fillRect(fdPx - 1, TURF_TOP_Y - 1, 3, TURF_BOT_Y - TURF_TOP_Y);
          ctx.restore();
          drawRetroSprite(ctx, 'spr_chains', 0, fdPx, TURF_TOP_Y - 6, 2, 2);
        }
      }

      // 6. Retro Bowl Receiver Route Arrows
      if (sim.phase === 'PRE_SNAP' || (sim.phase === 'LIVE' && sim.liveTime < 1.2 && sim.playType === 'PASS')) {
        const routeAlpha = sim.phase === 'PRE_SNAP' ? 0.92 : Math.max(0, 0.92 - sim.liveTime * 0.75);
        for (const a of sim.actors) {
          if (a.team !== 'OFF' || !a.routePoints || a.routePoints.length === 0) continue;
          const isUserRoute = a.role === 'USER';
          const routeCol = isUserRoute ? '#facc15' : a.role === 'RB' ? '#74a4ff' : '#56d856';

          ctx.save();
          ctx.globalAlpha = routeAlpha;
          const pts = [{ x: a.x, y: a.y }, ...a.routePoints];

          ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          pts.forEach((p, idx) => {
            const px = worldToPxX(p.x);
            const py = yardToPxY(p.y) + 2;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();

          ctx.strokeStyle = routeCol;
          ctx.lineWidth = isUserRoute ? 5 : 4;
          ctx.beginPath();
          pts.forEach((p, idx) => {
            const px = worldToPxX(p.x);
            const py = yardToPxY(p.y);
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();

          const last = pts[pts.length - 1];
          const prev = pts[pts.length - 2];
          const lx = worldToPxX(last.x);
          const ly = yardToPxY(last.y);
          const ang = Math.atan2(yardToPxY(last.y) - yardToPxY(prev.y), worldToPxX(last.x) - worldToPxX(prev.x));
          ctx.fillStyle = routeCol;
          ctx.beginPath();
          ctx.moveTo(lx + Math.cos(ang) * 9, ly + Math.sin(ang) * 9);
          ctx.lineTo(lx - Math.cos(ang - 0.6) * 9, ly - Math.sin(ang - 0.6) * 9);
          ctx.lineTo(lx - Math.cos(ang + 0.6) * 9, ly - Math.sin(ang + 0.6) * 9);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // 7. Goalpost Ground Shadows (Left & Right Endzones)
      drawRetroSprite(ctx, 'spr_goal_shadow', 0, 114, FIELD_MID_Y_PX, 2, 2, { alpha: 0.24 });
      drawRetroSprite(ctx, 'spr_goal_shadow', 0, 2486, FIELD_MID_Y_PX, -2, 2, { alpha: 0.24 });

      // 8. QB Aiming Arc + Landing Reticle (uses exact throw gravity!)
      if (
        playMode === 'OFFENSE' &&
        player.position === 'QB' &&
        sim.drag.active &&
        sim.phase === 'LIVE'
      ) {
        const qb = sim.actors.find((a) => a.role === 'USER');
        if (qb && qb.hasBall) {
          const throwVec = computeThrowVelocity(sim, player);
          const maxDots = 8 + player.attributes.skill;
          const stepDt = throwVec.flightT / Math.max(8, maxDots);
          for (let i = 1; i <= maxDots; i++) {
            const t = i * stepDt;
            const px = worldToPxX(qb.x + throwVec.vx * t);
            const py = yardToPxY(qb.y + throwVec.vy * t);
            const pz = Math.max(0, 1.55 + throwVec.vz * t - 0.5 * throwVec.gravity * t * t) * 16;
            if (!drawRetroSprite(ctx, 'spr_aim', 0, px, py - pz, 2, 2)) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(px - 2, py - pz - 2, 4, 4);
            }
          }
          // Ground landing target spot
          const tx = worldToPxX(throwVec.targetX);
          const ty = yardToPxY(throwVec.targetY);
          drawRetroSprite(ctx, 'spr_bouncespot', 0, tx, ty, 2, 2, { alpha: 0.75 });
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(tx, ty, 13, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Pass Landing Target Indicator when ball is airborne
      if (sim.ball.inAir && !sim.ball.isKick) {
        const tx = worldToPxX(sim.ball.targetX);
        const ty = yardToPxY(sim.ball.targetY);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(tx, ty, 14, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 8b. Retro Bowl On-Field Faint Aiming Triangle + White Outward Kicking Arrow
      if (
        (playMode === 'KICK_FG' ||
          playMode === 'KICK_PAT' ||
          playMode === 'KICK_ONSIDE' ||
          playMode === 'KICKOFF' ||
          playMode === 'KICK_PUNT') &&
        sim.kickMeter.step !== 'FLIGHT'
      ) {
        const km = sim.kickMeter;
        const originYard =
          playMode === 'KICK_PUNT'
            ? ballYard - 10
            : playMode === 'KICK_FG' || playMode === 'KICK_PAT'
              ? ballYard - 4.5
              : ballYard;
        const ox = worldToPxX(originYard);
        const oy = yardToPxY(MID_Y);

        const isFg = playMode === 'KICK_FG' || playMode === 'KICK_PAT';
        const isOnside = playMode === 'KICK_ONSIDE';
        const expectedDist = isOnside
          ? 13.5
          : playMode === 'KICK_PUNT'
            ? 38
            : playMode === 'KICKOFF'
              ? 52
              : Math.max(18, 108 - originYard);
        const maxSpreadYds = isOnside ? 8.2 : isFg ? 8.5 : 7.5;
        const coneLenYds = isOnside ? 14 : isFg ? Math.min(26, expectedDist) : 20;
        const spreadRatio = coneLenYds / expectedDist;

        const edgeX = worldToPxX(originYard + coneLenYds);
        const topEdgeY = yardToPxY(MID_Y - spreadRatio * maxSpreadYds);
        const botEdgeY = yardToPxY(MID_Y + spreadRatio * maxSpreadYds);
        const isAimStep = km.step === 'AIM';

        ctx.save();
        // Faint translucent aiming triangle cone fanning away from the kicker
        const grad = ctx.createLinearGradient(ox, oy, edgeX, oy);
        grad.addColorStop(0, isAimStep ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.1)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.015)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(edgeX, topEdgeY);
        ctx.lineTo(edgeX, botEdgeY);
        ctx.closePath();
        ctx.fill();

        // Subtle outer triangle guide edges
        ctx.strokeStyle = isAimStep ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(edgeX, topEdgeY);
        ctx.moveTo(ox, oy);
        ctx.lineTo(edgeX, botEdgeY);
        ctx.stroke();

        // On FG/PAT, keep a subtle inner faint upright corridor triangle
        if (isFg) {
          const postTopY = yardToPxY(MID_Y - spreadRatio * 2.15);
          const postBotY = yardToPxY(MID_Y + spreadRatio * 2.15);
          ctx.fillStyle = isAimStep ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.06)';
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(edgeX, postTopY);
          ctx.lineTo(edgeX, postBotY);
          ctx.closePath();
          ctx.fill();
        }
        ctx.setLineDash([]);

        // Crisp white pixel arrow pointing strictly away from the kicker along active aim angle
        const aimAngleVal = isAimStep ? km.aimAngle : 0;
        const aimY = yardToPxY(MID_Y + aimAngleVal * spreadRatio * maxSpreadYds);
        const rad = Math.atan2(aimY - oy, edgeX - ox);
        const ux = Math.cos(rad);
        const uy = Math.sin(rad);

        if (isAimStep) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(ox + ux * 46, oy + uy * 46);
          ctx.lineTo(ox + ux * 185, oy + uy * 185);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.translate(ox + ux * 18, oy + uy * 18);
        ctx.rotate(rad);
        ctx.globalAlpha = isAimStep ? 1 : 0.55;
        // Dark pixel border for contrast on green turf
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(14, -10);
        ctx.lineTo(14, -5);
        ctx.lineTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.lineTo(14, 5);
        ctx.lineTo(14, 10);
        ctx.closePath();
        ctx.fill();
        // Pure white inner arrow pointing away from kicker
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(27, 0);
        ctx.lineTo(16, -7);
        ctx.lineTo(16, -3);
        ctx.lineTo(2, -3);
        ctx.lineTo(2, 3);
        ctx.lineTo(16, 3);
        ctx.lineTo(16, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 9. Depth-Sorted Entities + Full 3D Retro Bowl H-Goalposts
      const renderables: { y: number; draw: () => void }[] = [];

      const drawGoalpostSystem = (postX: number, inwardDir: 1 | -1) => {
        // Post base sits near x=112 (left) / x=2488 (right), gooseneck curves INWARD toward field (x=132 / x=2468)
        const crossX = postX + inwardDir * 20;
        const topPostY = FIELD_MID_Y_PX - 26; // exact 2.15 yds half-width match!
        const botPostY = FIELD_MID_Y_PX + 26;
        const barRaise = 44;
        const uprightH = 80;

        // Padded base post, curved gooseneck & crossbar anchored at midfield depth
        renderables.push({
          y: FIELD_MID_Y_PX - 1,
          draw: () => {
            ctx.save();
            // Ground base plate & padded lower stanchion
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(postX - 5, FIELD_MID_Y_PX - 22, 10, 24);
            ctx.fillStyle = myUniform.shirt;
            ctx.fillRect(postX - 3, FIELD_MID_Y_PX - 20, 6, 20);

            // Lower yellow vertical post up to gooseneck bend
            ctx.fillStyle = '#18181b';
            ctx.fillRect(postX - 4, FIELD_MID_Y_PX - barRaise, 8, barRaise - 18);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(postX - 2, FIELD_MID_Y_PX - barRaise + 1, 4, barRaise - 19);

            // Clean angled gooseneck arm reaching forward to crossbar center
            ctx.strokeStyle = '#18181b';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(postX, FIELD_MID_Y_PX - barRaise + 2);
            ctx.lineTo(crossX, FIELD_MID_Y_PX - barRaise);
            ctx.stroke();
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(postX, FIELD_MID_Y_PX - barRaise + 2);
            ctx.lineTo(crossX, FIELD_MID_Y_PX - barRaise);
            ctx.stroke();

            // Main yellow crossbar spanning top & bottom uprights
            ctx.fillStyle = '#18181b';
            ctx.fillRect(crossX - 4, topPostY - barRaise - 2, 8, botPostY - topPostY + 4);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(crossX - 2, topPostY - barRaise, 4, botPostY - topPostY);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(crossX - 2, topPostY - barRaise, 2, botPostY - topPostY);
            ctx.restore();
          },
        });

        // Depth-sorted Top & Bottom Uprights so balls/players pass cleanly between them
        for (const postY of [topPostY, botPostY]) {
          renderables.push({
            y: postY,
            draw: () => {
              const barY = postY - barRaise;
              const topY = barY - uprightH;
              ctx.fillStyle = '#18181b';
              ctx.fillRect(crossX - 4, topY - 2, 8, uprightH + 4);
              ctx.fillStyle = '#eab308';
              ctx.fillRect(crossX - 2, topY, 4, uprightH);
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(crossX - 2, topY, 2, uprightH);
              ctx.fillStyle = '#f97316';
              ctx.fillRect(crossX - 2, topY - 5, 4, 5);
            },
          });
        }
      };

      drawGoalpostSystem(112, 1);
      drawGoalpostSystem(2488, -1);

      for (const a of sim.actors) {
        const px = worldToPxX(a.x);
        const py = yardToPxY(a.y);
        const spriteScaleX = a.facing * driveDir * 2;
        const uni = a.team === 'OFF' ? myUniform : oppUniform;
        const palette: FieldColorPalette = {
          uniform: uni,
          skin: a.skin,
          cleats: '#18181b',
        };

        renderables.push({
          y: py,
          draw: () => {
            ctx.fillStyle = 'rgba(0,0,0,0.32)';
            ctx.beginPath();
            ctx.ellipse(px, py + 2, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Clear Ball Carrier highlight ring on Defense so user immediately spots who has the ball
            if (playMode === 'DEFENSE' && a.hasBall) {
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.ellipse(px, py + 2, 16, 7, 0, 0, Math.PI * 2);
              ctx.stroke();
            }

            // User highlight & pulsing star
            if (a.role === 'USER') {
              const pulse = 0.55 + 0.45 * Math.sin(now / 140);
              drawRetroSprite(
                ctx,
                `spr_stand_highlight${a.bodyType}`,
                0,
                px,
                py - a.z,
                spriteScaleX,
                2,
                { tint: playMode === 'DEFENSE' ? '#38bdf8' : '#facc15', alpha: pulse }
              );
              drawRetroSprite(ctx, 'spr_star_b', 0, px, py - 38 - a.z, 2, 2, {
                tint: playMode === 'DEFENSE' ? '#38bdf8' : '#facc15',
              });
            } else if (sim.ball.inAir && sim.ball.intendedId === a.id) {
              // Subtle target star above intended receiver
              drawRetroSprite(ctx, 'spr_star_b', 0, px, py - 36 - a.z, 1.5, 1.5, {
                tint: '#4ade80',
              });
            }

            let sprName = `spr_stand${a.bodyType}`;
            let frame = 0;

            if (a.celebrating && a.celebrating > 0) {
              sprName = `spr_firstdown${a.bodyType}`;
              frame = Math.floor(a.animPhase) % 6;
            } else if (a.knockedDown && a.knockedDown > 0) {
              sprName = a.hasBall ? `spr_falling_ball${a.bodyType}` : `spr_falling${a.bodyType}`;
              frame = 1;
            } else if (a.role === 'USER' && sim.slideTimer > 0) {
              sprName = `spr_qb_slide${a.bodyType}`;
              frame = Math.min(6, Math.floor((1 - sim.slideTimer / 0.42) * 7));
            } else if (
              (a.role === 'USER' && sim.diveTimer > 0) ||
              (a.aiDiveTimer && a.aiDiveTimer > 0)
            ) {
              const dTimer = a.role === 'USER' ? sim.diveTimer : (a.aiDiveTimer ?? 0);
              sprName = `spr_dive_ball${a.bodyType}`;
              frame = Math.min(2, Math.floor((1 - dTimer / 0.44) * 3));
            } else if (a.stiffArmVisual && a.stiffArmVisual > 0) {
              sprName = `spr_stiffarm${a.bodyType}`;
              frame = Math.floor(a.animPhase) % 6;
            } else if (sim.handoffTimer > 0 && (a.id === 'off_qb' || a.id === 'off_rb')) {
              sprName = `spr_handoff${a.bodyType}`;
              frame = Math.floor(now / 120) % 2;
            } else if (a.jumping && a.jumping > 0) {
              sprName = a.hasBall ? `spr_jump_catch_ball${a.bodyType}` : `spr_jump_catch${a.bodyType}`;
              frame = Math.floor(a.animPhase) % 5;
            } else if (a.id === 'kicker' && sim.kickMeter.step === 'FLIGHT') {
              sprName = `spr_kick2${a.bodyType}`;
              frame = Math.min(4, Math.floor(a.animPhase));
            } else if (a.id === 'kicker' && sim.kickMeter.step === 'AIM' && Math.hypot(a.vx, a.vy) > 0.35) {
              sprName = `spr_run${a.bodyType}`;
              frame = Math.floor(a.animPhase) % 6;
            } else if (a.id === 'kicker') {
              sprName = `spr_kick1${a.bodyType}`;
              frame = 0;
            } else if (a.id === 'off_qb' && a.hasBall && sim.phase === 'LIVE' && a.x <= ballYard + 0.5 && !a.aiScrambling) {
              if (a.role === 'USER' && sim.drag.active) {
                sprName = `spr_qb_aim${a.bodyType}`;
                const dx = (sim.drag.startX - sim.drag.curX) * driveDir;
                const dy = sim.drag.startY - sim.drag.curY;
                const power = clamp(Math.hypot(dx, dy) / 140, 0, 1);
                frame = Math.min(6, Math.floor(power * 6));
              } else {
                sprName = `spr_qb_walk${a.bodyType}`;
                frame = Math.floor(a.animPhase) % 2;
              }
            } else if (a.id === 'off_qb' && sim.qbPostThrowTimer > 0) {
              sprName = `spr_qb_throw${a.bodyType}`;
              frame = 0;
            } else if (
              (a.role === 'OL' || a.role === 'DL') &&
              sim.phase === 'LIVE' &&
              sim.actors.some(
                (other) =>
                  other.team !== a.team &&
                  !other.knockedDown &&
                  Math.hypot(other.x - a.x, other.y - a.y) < 1.9
              )
            ) {
              sprName = `spr_wrestle${a.bodyType}`;
              frame = Math.floor(a.animPhase) % 2;
            } else if (sim.phase === 'LIVE') {
              sprName = a.hasBall ? `spr_run_ball${a.bodyType}` : `spr_run${a.bodyType}`;
              frame = Math.floor(a.animPhase) % 6;
            } else {
              sprName = a.hasBall ? `spr_stand_ball${a.bodyType}` : `spr_stand${a.bodyType}`;
              frame = 0;
            }

            if (
              !drawRetroSprite(ctx, sprName, frame, px, py - a.z, spriteScaleX, 2, {
                fieldPalette: palette,
              })
            ) {
              ctx.fillStyle = uni.shirt;
              ctx.fillRect(px - 8, py - 24, 16, 24);
            }
          },
        });
      }

      if (sim.ball.inAir) {
        const bx = worldToPxX(sim.ball.x);
        const by = yardToPxY(sim.ball.y);
        const bz = Math.max(0, sim.ball.z) * 16;

        renderables.push({
          y: by + 2,
          draw: () => {
            ctx.fillStyle = 'rgba(0,0,0,0.34)';
            ctx.beginPath();
            ctx.ellipse(bx, by, 7, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            for (let i = 0; i < sim.ball.blurTrail.length; i++) {
              const pt = sim.ball.blurTrail[i];
              const alpha = Math.max(0.02, 0.14 * Math.pow(0.86, i));
              drawRetroSprite(ctx, 'spr_ball1', 0, pt.px, pt.py, 2, 2, { alpha });
            }

            const heightStep = clamp(Math.round(sim.ball.z * 0.8) + 1, 1, 7);
            const ballSpr = `spr_ball${heightStep}`;
            const spinAngle =
              Math.atan2(sim.ball.vy * 12, sim.ball.vx * driveDir * 20) + Math.sin(sim.ball.spinPhase) * 0.12;
            if (!drawRetroSprite(ctx, ballSpr, 0, bx, by - bz, 2, 2, { rotationRad: spinAngle })) {
              ctx.fillStyle = '#92400e';
              ctx.fillRect(bx - 5, by - bz - 3, 10, 6);
            }
          },
        });
      }

      renderables.sort((a, b) => a.y - b.y);
      for (const r of renderables) r.draw();

      // 10. Lower Bowl Stadium Stands & Sideline Crowd along bottom of field
      const botWallY = 486;
      ctx.fillStyle = '#091524';
      ctx.fillRect(0, botWallY, WORLD_W, VIEW_H - botWallY);
      ctx.fillStyle = myUniform.shirt;
      ctx.fillRect(0, botWallY + 1, WORLD_W, 5);
      for (let row = 0; row < 5; row++) {
        ctx.fillStyle = row % 2 === 0 ? '#1c3754' : '#142b44';
        ctx.fillRect(0, botWallY + 8 + row * 9, WORLD_W, 8);
      }
      const botTurnout = isHighSchool ? turnout * 0.72 : turnout;
      for (let row = 0; row < 4; row++) {
        const sy = botWallY + 10 + row * 10;
        for (let col = startSeat; col <= endSeat; col++) {
          const sx = col * 8 + ((row + 1) % 2) * 3;
          if (sx % 184 < 12) continue;
          const hash = ((col * 89 + row * 151 + 41) % 100) / 100;
          if (hash > botTurnout) continue;
          const isVisitingSection = col > 282 && hash < 0.55;
          const fanColor = isVisitingSection ? oppUniform.shirt : shirtPool[(col * 5 + row) % shirtPool.length];
          const bounce =
            sim.crowdExcited > 0
              ? Math.round(Math.sin(now / 95 + col * 0.7 + row) * 2)
              : 0;
          ctx.fillStyle = '#0b1320';
          ctx.fillRect(sx - 1, sy + bounce - 1, 7, 8);
          ctx.fillStyle = SKIN_POOL[(col + row + 2) % SKIN_POOL.length];
          ctx.fillRect(sx + 1, sy + bounce, 4, 3);
          ctx.fillStyle = fanColor;
          ctx.fillRect(sx, sy + bounce + 3, 6, 4);
        }
      }

      ctx.restore();

      if (weather === 'STORM') {
        const lightningFlash = Math.sin(now * 0.007) > 0.992 && Math.cos(now * 0.019) > 0.4;
        ctx.fillStyle = lightningFlash ? 'rgba(224, 242, 254, 0.24)' : 'rgba(12, 22, 42, 0.24)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      } else if (weather === 'BLIZZARD') {
        ctx.fillStyle = 'rgba(226, 238, 248, 0.16)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      } else if (weather === 'FOG') {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.26)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }

      if (weather !== 'SUN') {
        if (weather === 'RAIN' || weather === 'STORM') {
          const wSpr = 'spr_rain';
          for (const p of sim.weatherParticles) {
            if (!drawRetroSpriteFast(ctx, wSpr, Math.floor(now / 90) % 2, p.x, p.y, 2, 2)) {
              ctx.fillStyle = weather === 'STORM' ? 'rgba(186,230,253,0.62)' : 'rgba(186,230,253,0.45)';
              ctx.fillRect(p.x, p.y, 2, weather === 'STORM' ? 14 : 10);
            }
          }
        } else if (weather === 'SNOW' || weather === 'BLIZZARD') {
          for (const p of sim.weatherParticles) {
            if (!drawRetroSpriteFast(ctx, 'spr_snow', 0, p.x, p.y, weather === 'BLIZZARD' ? 2.4 : 2, weather === 'BLIZZARD' ? 2.4 : 2)) {
              ctx.fillStyle = 'rgba(255,255,255,0.82)';
              ctx.fillRect(p.x, p.y, 4, 4);
            }
          }
        } else if (weather === 'WIND') {
          ctx.fillStyle = 'rgba(224, 242, 254, 0.36)';
          for (const p of sim.weatherParticles) {
            ctx.fillRect(p.x, p.y, 24, 2);
          }
        } else if (weather === 'FOG') {
          ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
          for (const p of sim.weatherParticles) {
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 75, 22, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Live QB Weather / Crosswind Banner during Pass Plays when severe weather is active
      if (
        playMode === 'OFFENSE' &&
        player.position === 'QB' &&
        sim.phase !== 'RESULT' &&
        weather !== 'SUN' &&
        Math.abs(sim.kickMeter.wind) >= 4.0
      ) {
        ctx.fillStyle = 'rgba(19, 49, 77, 0.86)';
        ctx.fillRect(VIEW_W / 2 - 118, 46, 236, 20);
        ctx.strokeStyle = '#3c6fa1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(VIEW_W / 2 - 118, 46, 236, 20);
        ctx.fillStyle = '#bae6fd';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${weatherMeta.label} · WIND ${Math.abs(sim.kickMeter.wind).toFixed(1)} ${sim.kickMeter.wind > 0 ? '▼' : '▲'}`,
          VIEW_W / 2,
          56
        );
      }

      if (
        (playMode === 'KICK_FG' ||
          playMode === 'KICK_PAT' ||
          playMode === 'KICK_ONSIDE' ||
          playMode === 'KICKOFF' ||
          playMode === 'KICK_PUNT') &&
        sim.kickMeter.step !== 'FLIGHT'
      ) {
        const km = sim.kickMeter;
        ctx.fillStyle = 'rgba(19, 49, 77, 0.92)';
        ctx.fillRect(VIEW_W / 2 - 128, 74, 256, 28);
        ctx.strokeStyle = '#3c6fa1';
        ctx.lineWidth = 2;
        ctx.strokeRect(VIEW_W / 2 - 128, 74, 256, 28);
        ctx.fillStyle = '#fde047';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const windText =
          Math.abs(km.wind) < 0.4
            ? 'WIND CALM'
            : `WIND ${Math.abs(km.wind).toFixed(1)} ${km.wind > 0 ? '▼ DOWN' : '▲ UP'}`;
        ctx.fillText(
          playMode === 'KICK_ONSIDE' ? 'SWEET ZONE: 38-68% PWR' : windText,
          VIEW_W / 2,
          88
        );

        // Single clean Retro Bowl Power Meter + Step Label (Aim arrow lives directly on the field!)
        ctx.fillStyle = km.step === 'POWER' ? '#fde047' : '#4ade80';
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillText(
          km.step === 'POWER' ? '1. SET POWER (SPACE / CLICK)' : '2. AIM ARROW ON FIELD (SPACE / CLICK)',
          VIEW_W / 2,
          VIEW_H - 70
        );

        const barW = 280;
        const barX = VIEW_W / 2 - barW / 2;
        const barY = VIEW_H - 54;
        ctx.fillStyle = '#0e253b';
        ctx.fillRect(barX, barY, barW, 24);
        ctx.strokeStyle = km.step === 'POWER' ? '#facc15' : '#4ade80';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, 24);
        if (playMode === 'KICK_ONSIDE') {
          const s1 = Math.round((barW - 6) * 0.38);
          const s2 = Math.round((barW - 6) * 0.68);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
          ctx.fillRect(barX + 3 + s1, barY + 3, s2 - s1, 18);
        }
        const fillW = Math.round((barW - 6) * km.powerVal);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX + 3, barY + 3, fillW, 18);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(barX + 3, barY + 3, Math.min(fillW, Math.round((barW - 6) * 0.28)), 18);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [atlasReady, fontsLoaded, era, myTeam, oppTeam, myUniform, oppUniform, ballYard, yardsToGo, weather, playMode, player, crowdTurnout, driveDirection, quarter]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (!sim || sim.finished) return;

    if (e.button === 2) {
      e.preventDefault();
      onToggleBulletPass();
      return;
    }

    if (
      playMode === 'KICK_FG' ||
      playMode === 'KICK_PAT' ||
      playMode === 'KICK_ONSIDE' ||
      playMode === 'KICKOFF' ||
      playMode === 'KICK_PUNT'
    ) {
      triggerUserAction();
      return;
    }

    if (playMode === 'OFFENSE' && player.position === 'QB') {
      const pt = getCanvasCoords(e);
      if (sim.phase === 'PRE_SNAP') {
        triggerSnap();
      }
      const qb = sim.actors.find((a) => a.role === 'USER');
      if (qb?.hasBall && qb.x <= ballYard + 0.8) {
        sim.drag = { active: true, startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } else {
      const pt = getCanvasCoords(e);
      sim.drag = { active: true, startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y };
      if (sim.phase === 'PRE_SNAP') triggerSnap();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (!sim || !sim.drag.active) return;
    const pt = getCanvasCoords(e);
    sim.drag.curX = pt.x;
    sim.drag.curY = pt.y;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    if (!sim || !sim.drag.active) return;
    const dy = sim.drag.curY - sim.drag.startY;
    const dx = sim.drag.curX - sim.drag.startX;
    sim.drag.active = false;

    if (playMode === 'OFFENSE' && player.position === 'QB') {
      const qb = sim.actors.find((a) => a.role === 'USER');
      if (qb && qb.hasBall && qb.x <= ballYard + 0.8 && Math.hypot(dx, dy) > 14) {
        const vel = computeThrowVelocity(sim, player);
        qb.hasBall = false;
        sim.qbPostThrowTimer = 0.45;
        sim.ball.inAir = true;
        sim.ball.isBullet = bulletPassEnabled;
        sim.ball.flightElapsed = 0;
        sim.ball.gravity = vel.gravity;
        sim.ball.x = qb.x;
        sim.ball.y = qb.y;
        sim.ball.z = 1.55;
        sim.ball.vx = vel.vx;
        sim.ball.vy = vel.vy;
        sim.ball.vz = vel.vz;
        sim.ball.targetX = vel.targetX;
        sim.ball.targetY = vel.targetY;
        sim.ball.thrownByUser = true;
        assignIntendedReceiver(sim, vel.targetX, vel.targetY, false);
        retroAudio.play('throw', 0.9);
        setBannerText(bulletPassEnabled ? 'BULLET!' : 'PASS!');
      }
    } else if (sim.phase === 'LIVE') {
      if (Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx)) {
        triggerJuke(dy < 0 ? -1 : 1);
      } else if (dx * driveDir > 24) {
        triggerUserAction();
      }
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onPointerDown={() => containerRef.current?.focus()}
      className="h-full flex flex-col gap-2 select-none outline-none min-h-0"
    >
      {/* Classic Retro Bowl Full-Viewport Canvas */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center border-2 border-[#3c6fa1] bg-[#1d4972] shadow-[0_6px_0_#0b1e30] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          onContextMenu={(e) => {
            e.preventDefault();
            if (player.position === 'QB') onToggleBulletPass();
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="max-w-full max-h-full w-full h-full object-contain block cursor-crosshair pixelated touch-none"
        />

        {/* Classic Retro Bowl Pixel Banner */}
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#13314d]/95 border-2 border-[#facc15]">
          <span className="font-pixel text-[11px] sm:text-xs tracking-wider text-[#fde047] drop-shadow-[1px_1px_0_#000]">
            {bannerText}
          </span>
        </div>

        {/* Active Play Call & Audible Chip */}
        {playMode !== 'KICK_FG' &&
          playMode !== 'KICK_PAT' &&
          playMode !== 'KICK_ONSIDE' &&
          playMode !== 'KICKOFF' &&
          playMode !== 'KICK_PUNT' && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="px-2.5 py-1.5 bg-[#13314d]/95 border-2 border-[#3c6fa1] font-pixel text-[9px] text-[#4ade80]">
              {activePlayLabel}
            </div>
            {playPhase === 'PRE_SNAP' && (
              <button
                type="button"
                onClick={triggerAudible}
                disabled={localAudibles <= 0}
                className="px-2.5 py-1.5 bg-[#1a3f62]/95 border-2 border-[#facc15] font-pixel text-[9px] text-[#fde047] hover:bg-[#24537f] disabled:opacity-40"
              >
                AUDIBLE (E) · {localAudibles}
              </button>
            )}
          </div>
        )}

        {/* Top-Right Clock, Timeouts, Drive Direction & QB Bullet Toggle */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div className="pointer-events-none px-2.5 py-1.5 bg-[#13314d]/95 border-2 border-[#3c6fa1] font-pixel text-[9px] text-white tabular-nums flex items-center gap-2">
            <span>
              {quarter <= 4 ? `Q${quarter}` : 'OT'} {Math.floor(clockSec / 60)}:{(clockSec % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-[#4ade80]">{driveDir === 1 ? 'DRIVE →' : '← DRIVE'}</span>
            <span className="text-[#fde047]">TO:{myTimeouts}</span>
          </div>
          {playMode === 'OFFENSE' && player.position === 'QB' && (
            <button
              type="button"
              onClick={onToggleBulletPass}
              className={`px-2.5 py-1.5 font-pixel text-[9px] border-2 ${
                bulletPassEnabled
                  ? 'bg-[#ef4444] border-[#fca5a5] text-white'
                  : 'bg-[#13314d]/95 border-[#3c6fa1] text-slate-200 hover:border-[#fde047]'
              }`}
            >
              {bulletPassEnabled ? 'BULLET ON' : 'LOB PASS'}
            </button>
          )}
        </div>

        {/* Live Stamina Meter */}
        {playMode !== 'KICK_FG' &&
          playMode !== 'KICK_PAT' &&
          playMode !== 'KICK_ONSIDE' &&
          playMode !== 'KICKOFF' &&
          playMode !== 'KICK_PUNT' && (
          <div className="pointer-events-none absolute bottom-3 left-3 px-2.5 py-1.5 bg-[#13314d]/95 border-2 border-[#3c6fa1] flex items-center gap-2">
            <span className="font-pixel text-[8px] text-slate-200">
              {staminaPct < 25 ? 'FATIGUED' : 'STAMINA'}
            </span>
            <div className="w-24 h-2.5 bg-[#0e253b] border border-[#3c6fa1]">
              <div
                className={`h-full transition-all duration-100 ${
                  staminaPct < 25
                    ? 'bg-red-500'
                    : staminaPct < 45
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                }`}
                style={{ width: `${staminaPct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] font-bold text-slate-100 tabular-nums w-7 text-right">
              {staminaPct}%
            </span>
          </div>
        )}

        {/* Stadium Crowd Turnout Badge */}
        <div className="pointer-events-none absolute bottom-3 right-3 px-2.5 py-1 bg-[#13314d]/90 border-2 border-[#3c6fa1] font-pixel text-[8px] text-slate-200">
          CROWD {Math.round(clamp(crowdTurnout, 0.18, 1) * 100)}%
        </div>
      </div>

      {/* Tactile Pixel Control Bar */}
      <div className="w-full rb-panel px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <p className="text-xs text-slate-200 font-medium">{subPrompt}</p>

        <div className="flex items-center gap-2 shrink-0">
          {onCallTimeout && playPhase === 'PRE_SNAP' && (
            <button
              type="button"
              onClick={() => {
                onCallTimeout();
                setBannerText('TIMEOUT!');
              }}
              disabled={myTimeouts <= 0}
              className="rb-btn-slate px-3 py-1.5 font-pixel text-[9px] disabled:opacity-40"
            >
              TIMEOUT (T) · {myTimeouts}
            </button>
          )}

          {playPhase === 'PRE_SNAP' && (
            <>
              <button
                type="button"
                onClick={triggerAudible}
                disabled={localAudibles <= 0}
                className="rb-btn-slate px-3 py-1.5 font-pixel text-[9px] disabled:opacity-40"
              >
                AUDIBLE (E) · {localAudibles}
              </button>
              <button
                type="button"
                onClick={triggerSnap}
                className="rb-btn-gold px-4 py-1.5 font-pixel text-[10px]"
              >
                HIKE (SPACE)
              </button>
            </>
          )}

          {playPhase === 'LIVE' && playMode === 'OFFENSE' && player.position === 'QB' && (
            <button
              type="button"
              onClick={triggerHandoff}
              className="rb-btn-slate px-3 py-1.5 font-pixel text-[9px]"
            >
              HANDOFF (H)
            </button>
          )}

          {playPhase === 'LIVE' && (playMode === 'OFFENSE' || playMode === 'DEFENSE') && (
            <button
              type="button"
              disabled={callForBallCooldown && player.position !== 'WR' && player.position !== 'TE'}
              onClick={triggerUserAction}
              className="rb-btn-green px-4 py-1.5 font-pixel text-[10px] disabled:opacity-40"
            >
              {player.position === 'WR' || player.position === 'TE'
                ? 'CALL / JUMP / DIVE'
                : player.position === 'OL'
                  ? 'PANCAKE'
                  : playMode === 'DEFENSE'
                    ? 'TACKLE / SWAT'
                    : 'DIVE / SLIDE'}
            </button>
          )}

          {(playMode === 'KICK_FG' ||
            playMode === 'KICK_PAT' ||
            playMode === 'KICK_ONSIDE' ||
            playMode === 'KICKOFF' ||
            playMode === 'KICK_PUNT') && (
            <button
              type="button"
              onClick={triggerUserAction}
              className="rb-btn-gold px-4 py-1.5 font-pixel text-[10px]"
            >
              LOCK KICK (SPACE)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function buildOffenseStats(
  pos: Position,
  sim: { blocksLanded: number; pancakesLanded: number; ball: { thrownByUser: boolean } },
  gained: number,
  isTD: boolean,
  wasPass: boolean,
  isUserBall: boolean
): Partial<StatLine> {
  if (pos === 'QB') {
    if (wasPass) {
      return {
        passAtt: sim.ball.thrownByUser ? 1 : 0,
        passComp: sim.ball.thrownByUser ? 1 : 0,
        passYards: gained,
        passTD: isTD ? 1 : 0,
      };
    }
    return {
      rushAtt: 1,
      rushYards: gained,
      rushTD: isTD ? 1 : 0,
      longestPlay: gained,
    };
  }
  if (pos === 'RB' || pos === 'WR' || pos === 'TE') {
    if (isUserBall) {
      return wasPass
        ? {
            targets: 1,
            receptions: 1,
            recYards: gained,
            recTD: isTD ? 1 : 0,
            longestPlay: gained,
          }
        : {
            rushAtt: 1,
            rushYards: gained,
            rushTD: isTD ? 1 : 0,
            longestPlay: gained,
          };
    }
    return {
      blocks: sim.blocksLanded,
      pancakes: sim.pancakesLanded,
    };
  }
  if (pos === 'OL') {
    return {
      blocks: sim.blocksLanded + (gained >= 4 ? 1 : 0),
      pancakes: sim.pancakesLanded,
      sacksAllowed: gained < -3 ? 1 : 0,
    };
  }
  return {};
}
