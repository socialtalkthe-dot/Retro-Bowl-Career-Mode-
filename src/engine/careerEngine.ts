import {
  Archetype,
  CareerEra,
  CareerSave,
  Coordinator,
  LeagueTeam,
  OfferOption,
  PlayerAttributes,
  Position,
  ScheduleGame,
  StandingsRow,
  StatLine,
  Teammate,
  WeatherType,
} from '../types/career';
import {
  COLLEGE_TEAMS,
  getTeamById,
  getTeamsForEra,
  NFL_TEAMS,
} from '../data/teams';
import { generatePlayerDilemma } from '../data/dilemmas';
import { getLifestylePerks } from '../data/shopping';

export const POSITIONS: {
  id: Position;
  label: string;
  unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL';
  skillName: string;
  archetypes: Archetype[];
  description: string;
}[] = [
  {
    id: 'QB',
    label: 'Quarterback',
    unit: 'OFFENSE',
    skillName: 'Throwing',
    archetypes: ['Pocket Passer', 'Dual-Threat', 'Gunslinger'],
    description: 'Aim & throw passes, call audibles, hand off to RB, or scramble for yards.',
  },
  {
    id: 'RB',
    label: 'Running Back',
    unit: 'OFFENSE',
    skillName: 'Catching',
    archetypes: ['Elusive Back', 'Power Back', 'Receiving Back'],
    description: 'Take handoffs & checkdowns, hit blocks, juke, stiff-arm, and dive for TDs.',
  },
  {
    id: 'WR',
    label: 'Wide Receiver',
    unit: 'OFFENSE',
    skillName: 'Catching',
    archetypes: ['Deep Threat', 'Route Technician', 'Playmaker'],
    description: 'Run routes to beat coverage, call for the ball, make grabs, and rack up YAC.',
  },
  {
    id: 'TE',
    label: 'Tight End',
    unit: 'OFFENSE',
    skillName: 'Catching',
    archetypes: ['Vertical Threat', 'Blocking TE', 'Playmaker'],
    description: 'Split snaps between seam/flat routes and heavy edge blocking.',
  },
  {
    id: 'OL',
    label: 'Offensive Lineman',
    unit: 'OFFENSE',
    skillName: 'Blocking',
    archetypes: ['Pass Protector', 'Road Grader'],
    description: 'Anchor the pocket, seal rushers, deliver pancake blocks, and protect QB1.',
  },
  {
    id: 'DL',
    label: 'Defensive Lineman',
    unit: 'DEFENSE',
    skillName: 'Tackling',
    archetypes: ['Speed Rusher', 'Power Interior'],
    description: 'Time the snap, shed OL blocks with swim/bull moves, and sack the QB.',
  },
  {
    id: 'LB',
    label: 'Linebacker',
    unit: 'DEFENSE',
    skillName: 'Tackling',
    archetypes: ['Field General', 'Pass Rush OLB'],
    description: 'Read run vs. pass, fill gaps for TFLs, blitz, or jump middle routes.',
  },
  {
    id: 'CB',
    label: 'Cornerback',
    unit: 'DEFENSE',
    skillName: 'Tackling',
    archetypes: ['Lockdown Corner', 'Ball Hawk'],
    description: 'Mirror WR1 routes, break on passes for swats or Pick-6s, make open tackles.',
  },
  {
    id: 'S',
    label: 'Safety',
    unit: 'DEFENSE',
    skillName: 'Tackling',
    archetypes: ['Ball Hawk', 'Box Safety'],
    description: 'Patrol deep zones, hawk overthrows, and deliver big hits in run support.',
  },
  {
    id: 'K',
    label: 'Kicker',
    unit: 'SPECIAL',
    skillName: 'Kicking',
    archetypes: ['Big Leg'],
    description: 'Master the Retro Bowl pendulum kick meter for clutch FGs, PATs & kickoffs.',
  },
];

const FIRST_NAMES = [
  'Marcus', 'Jalen', 'Trey', 'Caleb', 'Darius', 'Devon', 'Bryce', 'Kyler',
  'Trevor', 'Malik', 'Cooper', 'Jordan', 'Isaiah', 'Landon', 'Xavier', 'Tyreek',
  'Micah', 'Cole', 'Cam', 'Garrett', 'Devin', 'Justin', 'Chase', 'Aiden',
  'Brock', 'Jaxon', 'Braxton', 'Tanner', 'Gavin', 'Zion', 'Nolan', 'Grant',
];

const LAST_NAMES = [
  'Vance', 'Mercer', 'Jackson', 'Williams', 'Carter', 'Brooks', 'Hayes', 'Mitchell',
  'Sullivan', 'Ramirez', 'Washington', 'Coleman', 'Henderson', 'Foster', 'Bryant',
  'Sanders', 'Patterson', 'Simmons', 'Jenkins', 'Bennett', 'Price', 'Reed', 'Howard',
  'Douglas', 'Wallace', 'Griffin', 'Kelley', 'Dawson', 'Bishop', 'Tucker',
];

const COACH_FIRST = ['Dan', 'Mike', 'Kyle', 'Sean', 'John', 'Nick', 'Ryan', 'Matt', 'Kirby', 'Lincoln', 'Todd', 'Steve'];
const COACH_LAST = ['Campbell', 'Shanahan', 'Harbaugh', 'Tomlin', 'Reid', 'Smart', 'Day', 'Saban', 'McVay', 'Ryans', 'Lanning', 'Freeman'];
const COACH_TRAITS = ['Motivator', 'Talent Spotter', 'Physio', 'Likeable', 'Experience', 'Positive', 'None'];
const PLAYER_TRAITS = ['Clutch Gene', 'Iron Man', 'Captain', 'Route Artist', 'Ball Hawk', 'Bulldozer', 'Film Junkie'];

export const SKIN_TONES = ['#f5d0b5', '#e0ac82', '#c68642', '#8d5524', '#5c3818'];
export const HAIR_COLORS = ['#18181b', '#451a03', '#78350f', '#ca8a04', '#991b1b', '#e2e8f0'];

export function emptyStats(): StatLine {
  return {
    games: 0,
    passAtt: 0,
    passComp: 0,
    passYards: 0,
    passTD: 0,
    interceptions: 0,
    rushAtt: 0,
    rushYards: 0,
    rushTD: 0,
    receptions: 0,
    targets: 0,
    recYards: 0,
    recTD: 0,
    blocks: 0,
    pancakes: 0,
    sacksAllowed: 0,
    tackles: 0,
    tfl: 0,
    sacks: 0,
    defInt: 0,
    passDeflections: 0,
    forcedFumbles: 0,
    fgMade: 0,
    fgAtt: 0,
    fgLong: 0,
    xpMade: 0,
    xpAtt: 0,
    fumbles: 0,
    longestPlay: 0,
    mvpAwards: 0,
  };
}

export function addStats(a: StatLine, b: Partial<StatLine>): StatLine {
  const next = { ...a };
  (Object.keys(b) as (keyof StatLine)[]).forEach((k) => {
    const val = b[k] ?? 0;
    if (k === 'longestPlay' || k === 'fgLong') {
      next[k] = Math.max(next[k], val);
    } else {
      next[k] += val;
    }
  });
  return next;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

export function getSkillLabel(pos: Position): string {
  return POSITIONS.find((p) => p.id === pos)?.skillName ?? 'Skill';
}

export const POSITION_RATING_CAPS: Record<
  Position,
  { speed: number; strength: number; stamina: number; skill: number; maxSum: number }
> = {
  QB: { speed: 7, strength: 10, stamina: 10, skill: 10, maxSum: 37 },
  RB: { speed: 10, strength: 9, stamina: 9, skill: 6, maxSum: 34 },
  WR: { speed: 10, strength: 6, stamina: 8, skill: 10, maxSum: 34 },
  TE: { speed: 7, strength: 8, stamina: 10, skill: 8, maxSum: 33 },
  OL: { speed: 5, strength: 10, stamina: 10, skill: 10, maxSum: 35 },
  DL: { speed: 5, strength: 10, stamina: 10, skill: 10, maxSum: 35 },
  LB: { speed: 7, strength: 8, stamina: 10, skill: 8, maxSum: 33 },
  CB: { speed: 9, strength: 6, stamina: 10, skill: 8, maxSum: 33 },
  S: { speed: 9, strength: 6, stamina: 10, skill: 8, maxSum: 33 },
  K: { speed: 7, strength: 10, stamina: 10, skill: 10, maxSum: 37 },
};

export type BuildPotentialTier = '2_5' | '25_45' | '3_4';

export function getMoraleInfo(morale: number): {
  frame: number;
  label: string;
  textClass: string;
} {
  // Exact Retro Bowl spr_attitude frame order (0=Toxic .. 6=Exceptional)
  if (morale <= 15) return { frame: 0, label: 'Toxic', textClass: 'text-rose-400' };
  if (morale <= 30) return { frame: 1, label: 'Bad', textClass: 'text-orange-400' };
  if (morale <= 45) return { frame: 2, label: 'Poor', textClass: 'text-amber-400' };
  if (morale <= 60) return { frame: 3, label: 'Okay', textClass: 'text-slate-300' };
  if (morale <= 75) return { frame: 4, label: 'Good', textClass: 'text-sky-300' };
  if (morale <= 90) return { frame: 5, label: 'Happy', textClass: 'text-emerald-300' };
  return { frame: 6, label: 'Exceptional', textClass: 'text-[#fde047]' };
}

export function getBaseAttributes(pos: Position, archetype: Archetype): {
  attrs: PlayerAttributes;
  max: PlayerAttributes;
} {
  let speed = 4;
  let strength = 4;
  let stamina = 4;
  let skill = 4;

  if (pos === 'QB') {
    speed = archetype === 'Dual-Threat' ? 5 : 3;
    strength = archetype === 'Gunslinger' ? 5 : 4;
    skill = 5;
  } else if (pos === 'RB') {
    speed = archetype === 'Elusive Back' ? 6 : 4;
    strength = archetype === 'Power Back' ? 6 : 4;
    skill = 4;
  } else if (pos === 'WR') {
    speed = archetype === 'Deep Threat' ? 6 : 5;
    strength = 3;
    skill = archetype === 'Route Technician' ? 5 : 4;
  } else if (pos === 'TE') {
    speed = 4;
    strength = archetype === 'Blocking TE' ? 6 : 5;
    skill = 4;
  } else if (pos === 'OL') {
    speed = 2;
    strength = 6;
    stamina = 5;
    skill = 5;
  } else if (pos === 'DL') {
    speed = archetype === 'Speed Rusher' ? 5 : 3;
    strength = 6;
    skill = 4;
  } else if (pos === 'LB') {
    speed = 5;
    strength = 5;
    skill = 4;
  } else if (pos === 'CB' || pos === 'S') {
    speed = 6;
    strength = pos === 'S' ? 4 : 3;
    skill = 4;
  } else if (pos === 'K') {
    speed = 2;
    strength = 5;
    stamina = 5;
    skill = 5;
  }

  const caps = POSITION_RATING_CAPS[pos];
  return {
    attrs: {
      speed: Math.min(caps.speed, speed),
      strength: Math.min(caps.strength, strength),
      stamina: Math.min(caps.stamina, stamina),
      skill: Math.min(caps.skill, skill),
    },
    max: {
      speed: Math.min(caps.speed, speed + 4),
      strength: Math.min(caps.strength, strength + 4),
      stamina: Math.min(caps.stamina, stamina + 5),
      skill: caps.skill,
    },
  };
}

export function calculateStarRating(attrs: PlayerAttributes, pos?: Position): number {
  const maxSum = pos ? POSITION_RATING_CAPS[pos].maxSum : 35;
  const sum = attrs.speed + attrs.strength + attrs.stamina + attrs.skill;
  const halfStars = Math.max(2, Math.min(10, Math.round((sum / maxSum) * 10)));
  return halfStars / 2;
}

export function generatePlayerBuildPreset(
  pos: Position,
  archetype: Archetype,
  tier: BuildPotentialTier,
  era: Exclude<CareerEra, 'RETIRED'>
): {
  attrs: PlayerAttributes;
  max: PlayerAttributes;
  bonusPoints: number;
} {
  const caps = POSITION_RATING_CAPS[pos];
  const base = getBaseAttributes(pos, archetype).attrs;
  const keys: (keyof PlayerAttributes)[] = ['skill', 'speed', 'strength', 'stamina'];

  const targetStartStars = tier === '2_5' ? 2.0 : tier === '25_45' ? 2.5 : 3.0;
  const targetMaxStars = tier === '2_5' ? 5.0 : tier === '25_45' ? 4.5 : 4.0;

  const targetStartSum = Math.max(
    8,
    Math.round((targetStartStars * 2 * caps.maxSum) / 10) + (Math.random() < 0.35 ? -1 : Math.random() < 0.35 ? 1 : 0)
  );
  const targetMaxSum = Math.min(
    caps.maxSum,
    Math.max(targetStartSum + 4, Math.round((targetMaxStars * 2 * caps.maxSum) / 10))
  );

  // Randomize max ceilings with position bias + natural variation
  const max: PlayerAttributes = {
    speed: Math.min(caps.speed, Math.max(4, caps.speed - Math.floor(Math.random() * 2))),
    strength: Math.min(caps.strength, Math.max(4, caps.strength - Math.floor(Math.random() * 2))),
    stamina: Math.min(caps.stamina, Math.max(5, caps.stamina - Math.floor(Math.random() * 2))),
    skill: Math.min(caps.skill, Math.max(5, caps.skill - Math.floor(Math.random() * 2))),
  };

  let guard = 0;
  while (max.speed + max.strength + max.stamina + max.skill > targetMaxSum && guard < 40) {
    guard++;
    const k = keys[Math.floor(Math.random() * keys.length)];
    if (max[k] > 3) max[k] -= 1;
  }
  guard = 0;
  while (max.speed + max.strength + max.stamina + max.skill < targetMaxSum && guard < 40) {
    guard++;
    const k = keys[Math.floor(Math.random() * keys.length)];
    if (max[k] < caps[k]) max[k] += 1;
  }

  // Randomize starting bars around archetype identity + tier floor with genuine variation
  const attrs: PlayerAttributes = {
    speed: Math.max(1, Math.min(max.speed, base.speed + Math.floor(Math.random() * 3) - 1)),
    strength: Math.max(1, Math.min(max.strength, base.strength + Math.floor(Math.random() * 3) - 1)),
    stamina: Math.max(1, Math.min(max.stamina, base.stamina + Math.floor(Math.random() * 3) - 1)),
    skill: Math.max(1, Math.min(max.skill, base.skill + Math.floor(Math.random() * 3) - 1)),
  };

  guard = 0;
  while (attrs.speed + attrs.strength + attrs.stamina + attrs.skill > targetStartSum && guard < 40) {
    guard++;
    const k = keys[Math.floor(Math.random() * keys.length)];
    if (attrs[k] > 2) attrs[k] -= 1;
  }
  guard = 0;
  while (attrs.speed + attrs.strength + attrs.stamina + attrs.skill < targetStartSum && guard < 40) {
    guard++;
    const k = keys[Math.floor(Math.random() * keys.length)];
    if (attrs[k] < max[k]) attrs[k] += 1;
  }

  const bonusPoints = era === 'HIGH_SCHOOL' ? 4 : era === 'COLLEGE' ? 5 : 6;
  return { attrs, max, bonusPoints };
}

export function getTeamRank(save: CareerSave, targetTeamId: string): {
  rank: number;
  total: number;
  wins: number;
  losses: number;
  hasGames: boolean;
} {
  const rows = sortStandingsRows(Object.values(save.standings));
  const idx = rows.findIndex((r) => r.teamId === targetTeamId);
  const row = save.standings[targetTeamId] ?? { wins: 0, losses: 0, ties: 0 };
  const totalPlayed = Object.values(save.standings).reduce(
    (sum, r) => sum + r.wins + r.losses + r.ties,
    0
  );
  return {
    rank: idx >= 0 ? idx + 1 : rows.length,
    total: Math.max(1, rows.length),
    wins: row.wins,
    losses: row.losses,
    hasGames: totalPlayed > 0,
  };
}

export function getPlayerRank(save: CareerSave): {
  rank: number;
  poolSize: number;
  label: string;
} {
  const pos = save.player.position;
  const st = save.seasonStats;
  const games = Math.max(1, st.games);
  const myTeamInfo = getTeamRank(save, save.teamId);

  let statMomentum = 0;
  if (pos === 'QB') {
    statMomentum = (st.passYards / games) * 0.08 + ((st.passTD + st.rushTD) / games) * 6 - st.interceptions * 1.5;
  } else if (pos === 'RB') {
    statMomentum = ((st.rushYards + st.recYards) / games) * 0.14 + ((st.rushTD + st.recTD) / games) * 7;
  } else if (pos === 'WR' || pos === 'TE') {
    statMomentum = (st.recYards / games) * 0.16 + (st.recTD / games) * 7;
  } else if (pos === 'OL') {
    statMomentum = (st.blocks / games) * 3.5 + (st.pancakes / games) * 6;
  } else if (pos === 'K') {
    statMomentum = (st.fgMade / games) * 7 + (st.fgLong >= 45 ? 4 : 0);
  } else {
    statMomentum = (st.tackles / games) * 3.2 + ((st.sacks * 2 + st.defInt * 3 + st.passDeflections) / games) * 6;
  }

  const poolSize = save.era === 'HIGH_SCHOOL' ? 50 : save.era === 'COLLEGE' ? 48 : 32;
  const ratingFactor = save.player.starRating * 9.5;
  const teamBoost = Math.max(0, 12 - myTeamInfo.rank);
  const overallScore = Math.min(100, ratingFactor + (st.games > 0 ? statMomentum : 10) + teamBoost);
  const rank = Math.max(1, Math.min(poolSize, Math.round(poolSize - (overallScore / 100) * (poolSize - 1))));

  const label =
    save.era === 'HIGH_SCHOOL'
      ? `${save.selectedState} ${pos} Rank`
      : save.era === 'COLLEGE'
        ? `National ${pos} Rank`
        : `NFL ${pos} Rank`;

  return { rank, poolSize, label };
}

export function generateCoaches(era: Exclude<CareerEra, 'RETIRED'>): {
  hc: Coordinator;
  of: Coordinator;
  df: Coordinator;
} {
  const base = era === 'HIGH_SCHOOL' ? 3 : era === 'COLLEGE' ? 4 : 4;
  return {
    hc: {
      name: `${pick(COACH_FIRST)} ${pick(COACH_LAST)}`,
      role: 'HC',
      rating: base,
      trait: pick(COACH_TRAITS),
      age: 42 + Math.floor(Math.random() * 18),
    },
    of: {
      name: `${pick(COACH_FIRST)} ${pick(COACH_LAST)}`,
      role: 'OF',
      rating: Math.max(2, base - (Math.random() > 0.5 ? 0 : 1)),
      trait: pick(COACH_TRAITS),
      age: 34 + Math.floor(Math.random() * 18),
    },
    df: {
      name: `${pick(COACH_FIRST)} ${pick(COACH_LAST)}`,
      role: 'DF',
      rating: Math.max(2, base - (Math.random() > 0.5 ? 0 : 1)),
      trait: pick(COACH_TRAITS),
      age: 35 + Math.floor(Math.random() * 18),
    },
  };
}

export function generateRoster(
  era: Exclude<CareerEra, 'RETIRED'>,
  playerPos: Position,
  team: LeagueTeam
): Teammate[] {
  const needed: Position[] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
  // Replace one matching slot so the player IS the starter at their position
  let replaced = false;
  const slots = needed.filter((p) => {
    if (!replaced && p === playerPos) {
      replaced = true;
      return false;
    }
    return true;
  });

  const baseAge = era === 'HIGH_SCHOOL' ? 16 : era === 'COLLEGE' ? 19 : 22;
  const teamOverall = (team.offense + team.defense) / 20; // ~0.45 - 0.95
  const keys: (keyof PlayerAttributes)[] = ['skill', 'speed', 'strength', 'stamina'];

  return slots.map((pos, idx) => {
    const caps = POSITION_RATING_CAPS[pos];
    const age = baseAge + Math.floor(Math.random() * (era === 'NFL' ? 9 : 3));
    const isYoung = age <= baseAge + 2;
    const targetStars = Math.max(
      2.0,
      Math.min(5.0, Math.round((2.0 + teamOverall * 2.5 + (Math.random() * 1.4 - 0.6)) * 2) / 2)
    );
    const potStars = Math.max(
      targetStars,
      Math.min(5.0, targetStars + (isYoung ? (Math.random() < 0.7 ? 1.0 : 0.5) : Math.random() < 0.35 ? 0.5 : 0))
    );

    const targetSum = Math.max(8, Math.round((targetStars * 2 * caps.maxSum) / 10));
    const potSum = Math.min(caps.maxSum, Math.max(targetSum, Math.round((potStars * 2 * caps.maxSum) / 10)));

    const maxAttrs: PlayerAttributes = {
      speed: Math.min(caps.speed, Math.max(3, Math.round(caps.speed * (0.65 + Math.random() * 0.35)))),
      strength: Math.min(caps.strength, Math.max(3, Math.round(caps.strength * (0.65 + Math.random() * 0.35)))),
      stamina: Math.min(caps.stamina, Math.max(4, Math.round(caps.stamina * (0.65 + Math.random() * 0.35)))),
      skill: Math.min(caps.skill, Math.max(4, Math.round(caps.skill * (0.65 + Math.random() * 0.35)))),
    };
    let g = 0;
    while (maxAttrs.speed + maxAttrs.strength + maxAttrs.stamina + maxAttrs.skill < potSum && g < 40) {
      g++;
      const k = keys[Math.floor(Math.random() * keys.length)];
      if (maxAttrs[k] < caps[k]) maxAttrs[k] += 1;
    }
    g = 0;
    while (maxAttrs.speed + maxAttrs.strength + maxAttrs.stamina + maxAttrs.skill > potSum && g < 40) {
      g++;
      const k = keys[Math.floor(Math.random() * keys.length)];
      if (maxAttrs[k] > 3) maxAttrs[k] -= 1;
    }

    const attrs: PlayerAttributes = {
      speed: Math.max(2, Math.min(maxAttrs.speed, maxAttrs.speed - Math.floor(Math.random() * 3))),
      strength: Math.max(2, Math.min(maxAttrs.strength, maxAttrs.strength - Math.floor(Math.random() * 3))),
      stamina: Math.max(2, Math.min(maxAttrs.stamina, maxAttrs.stamina - Math.floor(Math.random() * 3))),
      skill: Math.max(2, Math.min(maxAttrs.skill, maxAttrs.skill - Math.floor(Math.random() * 3))),
    };
    g = 0;
    while (attrs.speed + attrs.strength + attrs.stamina + attrs.skill < targetSum && g < 40) {
      g++;
      const k = keys[Math.floor(Math.random() * keys.length)];
      if (attrs[k] < maxAttrs[k]) attrs[k] += 1;
    }
    g = 0;
    while (attrs.speed + attrs.strength + attrs.stamina + attrs.skill > targetSum && g < 40) {
      g++;
      const k = keys[Math.floor(Math.random() * keys.length)];
      if (attrs[k] > 2) attrs[k] -= 1;
    }

    const rating = calculateStarRating(attrs, pos);
    const potential = calculateStarRating(maxAttrs, pos);

    // Realistic locker room morale spread: mostly Good/Happy/Exceptional (65..96), rare grumpy vet (~44..58)
    const moraleRoll = Math.random();
    const morale =
      moraleRoll < 0.08
        ? 44 + Math.floor(Math.random() * 14) // occasional Okay/Poor guy
        : moraleRoll < 0.72
          ? 64 + Math.floor(Math.random() * 22) // Good / Happy (64..85)
          : 86 + Math.floor(Math.random() * 12); // Happy / Exceptional (86..97)

    const jerseyBase =
      pos === 'QB' ? 1 + (idx % 15) :
      pos === 'RB' ? 20 + (idx % 12) :
      pos === 'WR' ? 80 + (idx % 9) :
      pos === 'TE' ? 84 + (idx % 6) :
      pos === 'OL' ? 70 + (idx % 9) :
      pos === 'DL' ? 90 + (idx % 9) :
      pos === 'LB' ? 50 + (idx % 9) :
      pos === 'CB' || pos === 'S' ? 21 + (idx % 18) : 3;

    return {
      id: `tm_${pos}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      name: randomName(),
      position: pos,
      jersey: jerseyBase,
      age,
      rating,
      potential,
      attributes: attrs,
      maxAttributes: maxAttrs,
      morale,
      condition: 84 + Math.floor(Math.random() * 16),
      faceId: idx % 6,
      skinTone: pick(SKIN_TONES),
      hairColor: pick(HAIR_COLORS),
      isStar: rating >= 3.5,
      stats: { yards: 0, tds: 0, tackles: 0 },
    };
  });
}

function getWeatherForTeam(team: LeagueTeam): WeatherType {
  if (team.roof === 1) return 'SUN';
  const r = Math.random() * 100;
  const blizzardChance = team.snowfall > 35 ? team.snowfall * 0.08 : 0;
  const snowChance = team.snowfall * 0.22;
  const stormChance = team.rainfall > 25 ? team.rainfall * 0.09 : 0;
  const rainChance = team.rainfall * 0.26;
  const windChance = 10 + (team.snowfall > 15 ? 4 : 0);
  const fogChance = 6 + (team.rainfall > 25 ? 3 : 0);

  let acc = blizzardChance;
  if (r < acc) return 'BLIZZARD';
  acc += snowChance;
  if (r < acc) return 'SNOW';
  acc += stormChance;
  if (r < acc) return 'STORM';
  acc += rainChance;
  if (r < acc) return 'RAIN';
  acc += windChance;
  if (r < acc) return 'WIND';
  acc += fogChance;
  if (r < acc) return 'FOG';
  return 'SUN';
}

function shuffleArr<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sortStandingsRows(rows: StandingsRow[]): StandingsRow[] {
  return [...rows].sort((a, b) => {
    const gA = a.wins + a.losses + a.ties;
    const gB = b.wins + b.losses + b.ties;
    const pctA = gA > 0 ? (a.wins + a.ties * 0.5) / gA : 0.5;
    const pctB = gB > 0 ? (b.wins + b.ties * 0.5) / gB : 0.5;
    if (pctB !== pctA) return pctB - pctA;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    const tA = getTeamById(a.teamId);
    const tB = getTeamById(b.teamId);
    return (tB.offense + tB.defense) - (tA.offense + tA.defense);
  });
}

function getNflConferenceSeeds(
  standings: Record<string, StandingsRow>,
  conference: string
): LeagueTeam[] {
  const confTeams = NFL_TEAMS.filter((t) => t.conference === conference);
  const divisions = Array.from(new Set(confTeams.map((t) => t.division)));
  const divWinners: StandingsRow[] = [];
  const divWinnerIds = new Set<string>();

  divisions.forEach((div) => {
    const divRows = confTeams
      .filter((t) => t.division === div)
      .map((t) => standings[t.id] ?? { teamId: t.id, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 });
    const top = sortStandingsRows(divRows)[0];
    if (top) {
      divWinners.push(top);
      divWinnerIds.add(top.teamId);
    }
  });

  const orderedDivWinners = sortStandingsRows(divWinners).map((r) => getTeamById(r.teamId));
  const wildCards = sortStandingsRows(
    confTeams
      .filter((t) => !divWinnerIds.has(t.id))
      .map((t) => standings[t.id] ?? { teamId: t.id, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 })
  )
    .slice(0, 3)
    .map((r) => getTeamById(r.teamId));

  return [...orderedDivWinners, ...wildCards];
}

export function generateSchedule(
  era: Exclude<CareerEra, 'RETIRED'>,
  teamId: string,
  state?: string
): { schedule: ScheduleGame[]; standings: Record<string, StandingsRow> } {
  const pool =
    era === 'HIGH_SCHOOL'
      ? getTeamsForEra('HIGH_SCHOOL', state)
      : era === 'COLLEGE'
        ? COLLEGE_TEAMS
        : NFL_TEAMS;

  const myTeam = getTeamById(teamId);
  const others = pool.filter((t) => t.id !== teamId);
  const matchups: { opp: LeagueTeam; isHome: boolean; tag: string }[] = [];

  if (era === 'NFL') {
    // 17-game NFL formula:
    // 6 divisional (H+A vs 3 division rivals)
    // 4 intra-conference rotation (all 4 teams in 1 other division in conference)
    // 2 intra-conference parity (1 team from each of remaining 2 divisions in conference)
    // 4 cross-conference rotation (all 4 teams in 1 division in opposite conference)
    // 1 cross-conference 17th game (1 team from another opposite-conference division)
    const divRivals = others.filter((t) => t.division === myTeam.division);
    divRivals.forEach((opp) => {
      matchups.push({ opp, isHome: true, tag: 'DIV_H' });
      matchups.push({ opp, isHome: false, tag: 'DIV_A' });
    });

    const otherSameConfDivs = shuffleArr(
      Array.from(new Set(others.filter((t) => t.conference === myTeam.conference && t.division !== myTeam.division).map((t) => t.division)))
    );
    const intraRotDiv = otherSameConfDivs[0];
    if (intraRotDiv) {
      const rotTeams = shuffleArr(others.filter((t) => t.division === intraRotDiv));
      rotTeams.forEach((opp, idx) => matchups.push({ opp, isHome: idx % 2 === 0, tag: 'CONF' }));
    }

    const myOvr = myTeam.offense + myTeam.defense;
    otherSameConfDivs.slice(1, 3).forEach((div, idx) => {
      const candidates = others
        .filter((t) => t.division === div)
        .sort((a, b) => Math.abs((a.offense + a.defense) - myOvr) - Math.abs((b.offense + b.defense) - myOvr));
      if (candidates[0]) {
        matchups.push({ opp: candidates[0], isHome: idx % 2 === 0, tag: 'CONF' });
      }
    });

    const otherConfDivs = shuffleArr(
      Array.from(new Set(others.filter((t) => t.conference !== myTeam.conference).map((t) => t.division)))
    );
    const crossRotDiv = otherConfDivs[0];
    if (crossRotDiv) {
      const crossTeams = shuffleArr(others.filter((t) => t.division === crossRotDiv));
      crossTeams.forEach((opp, idx) => matchups.push({ opp, isHome: idx % 2 === 1, tag: 'CROSS' }));
    }

    const seventeenthDiv = otherConfDivs[1];
    if (seventeenthDiv) {
      const candidates = others
        .filter((t) => t.division === seventeenthDiv)
        .sort((a, b) => Math.abs((a.offense + a.defense) - myOvr) - Math.abs((b.offense + b.defense) - myOvr));
      if (candidates[0]) {
        matchups.push({ opp: candidates[0], isHome: true, tag: 'CROSS17' });
      }
    }

    // Order across 17 weeks: spread division games cleanly (never back-to-back vs same rival)
    const divGames = shuffleArr(matchups.filter((m) => m.tag.startsWith('DIV')));
    const nonDivGames = shuffleArr(matchups.filter((m) => !m.tag.startsWith('DIV')));
    const ordered: typeof matchups = new Array(17);
    // Place division games at classic NFL weeks: 2, 4, 7, 10, 14, 17 (indices 1,3,6,9,13,16)
    const divSlots = [1, 3, 6, 9, 13, 16];
    // Ensure same rival isn't placed in consecutive div slots
    const arrangedDiv: typeof matchups = [];
    const remainingDiv = [...divGames];
    while (remainingDiv.length > 0) {
      const lastId = arrangedDiv[arrangedDiv.length - 1]?.opp.id;
      const pickIdx = remainingDiv.findIndex((g) => g.opp.id !== lastId);
      arrangedDiv.push(remainingDiv.splice(pickIdx >= 0 ? pickIdx : 0, 1)[0]);
    }
    divSlots.forEach((slot, idx) => {
      if (arrangedDiv[idx]) ordered[slot] = arrangedDiv[idx];
    });
    let ndIdx = 0;
    for (let w = 0; w < 17; w++) {
      if (!ordered[w] && nonDivGames[ndIdx]) {
        ordered[w] = nonDivGames[ndIdx++];
      }
    }
    const finalNfl = ordered.filter(Boolean);
    matchups.splice(0, matchups.length, ...finalNfl);
  } else if (era === 'COLLEGE') {
    const isFcs = myTeam.subdivision === 'FCS';
    if (isFcs) {
      // 11-game FCS regular season: up to 7 conference games + 4 OOC (incl. rival + 1 FBS money game + regional FCS)
      const sameSub = others.filter((t) => t.subdivision === 'FCS');
      const sameConf = shuffleArr(sameSub.filter((t) => t.conference === myTeam.conference));
      const otherFcs = shuffleArr(sameSub.filter((t) => t.conference !== myTeam.conference));
      const fbsPool = shuffleArr(others.filter((t) => t.subdivision !== 'FCS'));

      const usedIds = new Set<string>();
      const confGames: { opp: LeagueTeam; isHome: boolean; tag: string }[] = [];
      const nonConfGames: { opp: LeagueTeam; isHome: boolean; tag: string }[] = [];

      sameConf.slice(0, 7).forEach((opp, idx) => {
        usedIds.add(opp.id);
        confGames.push({ opp, isHome: idx % 2 === 0, tag: 'CONF' });
      });

      const rival = otherFcs.find((t) => t.id === myTeam.rivalId);
      if (rival && !usedIds.has(rival.id)) {
        usedIds.add(rival.id);
        nonConfGames.push({ opp: rival, isHome: Math.random() > 0.5, tag: 'RIVAL' });
      }
      if (fbsPool[0] && !usedIds.has(fbsPool[0].id)) {
        usedIds.add(fbsPool[0].id);
        nonConfGames.push({ opp: fbsPool[0], isHome: false, tag: 'MONEY' });
      }
      for (const opp of otherFcs) {
        if (confGames.length + nonConfGames.length >= 11) break;
        if (usedIds.has(opp.id)) continue;
        usedIds.add(opp.id);
        nonConfGames.push({ opp, isHome: nonConfGames.length % 2 === 0, tag: 'NONCONF' });
      }
      const rivalGame = nonConfGames.find((g) => g.tag === 'RIVAL');
      const earlyNonConf = nonConfGames.filter((g) => g.tag !== 'RIVAL');
      const orderedFcs = [...earlyNonConf, ...shuffleArr(confGames)];
      if (rivalGame) orderedFcs.push(rivalGame);
      matchups.push(...orderedFcs.slice(0, 11));
    } else {
      // 12-game FBS regular season:
      // SEC / ACC: 8 conference + 4 non-conference
      // Big Ten / Big 12: 9 conference + 3 non-conference
      // Independents / AAC / MW / Sun Belt / MAC / C-USA / Pac-12: conf + rival + national FBS/1 FCS tune-up
      const fbsOthers = others.filter((t) => t.subdivision !== 'FCS');
      const fcsOthers = shuffleArr(others.filter((t) => t.subdivision === 'FCS'));
      const sameConf = shuffleArr(fbsOthers.filter((t) => t.conference === myTeam.conference));
      const nonConfPool = shuffleArr(fbsOthers.filter((t) => t.conference !== myTeam.conference));
      const isNineConf = myTeam.conference === 'Big Ten' || myTeam.conference === 'Big 12';
      const isMajorConf = isNineConf || myTeam.conference === 'SEC' || myTeam.conference === 'ACC';

      const usedIds = new Set<string>();
      const confGames: { opp: LeagueTeam; isHome: boolean; tag: string }[] = [];
      const nonConfGames: { opp: LeagueTeam; isHome: boolean; tag: string }[] = [];

      if (isMajorConf) {
        const targetConf = Math.min(sameConf.length, isNineConf ? 9 : 8);
        sameConf.slice(0, targetConf).forEach((opp, idx) => {
          usedIds.add(opp.id);
          confGames.push({ opp, isHome: idx % 2 === 0, tag: 'CONF' });
        });
        const rival = nonConfPool.find((t) => t.id === myTeam.rivalId);
        if (rival && !usedIds.has(rival.id)) {
          usedIds.add(rival.id);
          nonConfGames.push({ opp: rival, isHome: Math.random() > 0.5, tag: 'RIVAL' });
        }
        // Optional Week 1 FCS tune-up for P4 schools
        if (fcsOthers[0] && Math.random() < 0.55) {
          usedIds.add(fcsOthers[0].id);
          nonConfGames.push({ opp: fcsOthers[0], isHome: true, tag: 'NONCONF' });
        }
        for (const opp of nonConfPool) {
          if (confGames.length + nonConfGames.length >= 12) break;
          if (usedIds.has(opp.id)) continue;
          usedIds.add(opp.id);
          nonConfGames.push({ opp, isHome: nonConfGames.length % 2 === 0, tag: 'NONCONF' });
        }
      } else {
        sameConf.slice(0, 8).forEach((opp, idx) => {
          usedIds.add(opp.id);
          confGames.push({ opp, isHome: idx % 2 === 0, tag: 'CONF' });
        });
        const rival = nonConfPool.find((t) => t.id === myTeam.rivalId);
        if (rival && !usedIds.has(rival.id)) {
          usedIds.add(rival.id);
          nonConfGames.push({ opp: rival, isHome: true, tag: 'RIVAL' });
        }
        if (fcsOthers[0] && confGames.length + nonConfGames.length < 12) {
          usedIds.add(fcsOthers[0].id);
          nonConfGames.push({ opp: fcsOthers[0], isHome: true, tag: 'NONCONF' });
        }
        for (const opp of nonConfPool) {
          if (confGames.length + nonConfGames.length >= 12) break;
          if (usedIds.has(opp.id)) continue;
          usedIds.add(opp.id);
          nonConfGames.push({ opp, isHome: (confGames.length + nonConfGames.length) % 2 === 0, tag: 'NONCONF' });
        }
      }

      const rivalGame = nonConfGames.find((g) => g.tag === 'RIVAL');
      const earlyNonConf = nonConfGames.filter((g) => g.tag !== 'RIVAL');
      const orderedCol = [...earlyNonConf, ...shuffleArr(confGames)];
      if (rivalGame) orderedCol.push(rivalGame);
      matchups.push(...orderedCol.slice(0, 12));
    }
  } else {
    // High School: 10-game varsity regular season (unique in-state opponents)
    const classPrefix = myTeam.division.split(' ')[0];
    const sameDiv = shuffleArr(others.filter((t) => t.division === myTeam.division));
    const sameClass = shuffleArr(
      others.filter((t) => t.division !== myTeam.division && t.division.startsWith(classPrefix))
    );
    const otherState = shuffleArr(
      others.filter((t) => t.division !== myTeam.division && !t.division.startsWith(classPrefix))
    );

    const usedIds = new Set<string>();
    const districtGames: { opp: LeagueTeam; isHome: boolean; tag: string }[] = [];
    const nonDistrictGames: { opp: LeagueTeam; isHome: boolean; tag: string }[] = [];

    // Up to 7 district / classification games
    for (const opp of [...sameDiv, ...sameClass]) {
      if (districtGames.length >= 7) break;
      if (usedIds.has(opp.id)) continue;
      usedIds.add(opp.id);
      districtGames.push({ opp, isHome: districtGames.length % 2 === 0, tag: 'DIST' });
    }
    // Fill remaining up to 10 with non-district opponents
    for (const opp of [...otherState, ...sameClass, ...sameDiv]) {
      if (districtGames.length + nonDistrictGames.length >= 10) break;
      if (usedIds.has(opp.id)) continue;
      usedIds.add(opp.id);
      nonDistrictGames.push({ opp, isHome: nonDistrictGames.length % 2 === 1, tag: 'NONDIST' });
    }

    // Non-district tune-ups early (Weeks 1-3), then district/region slate (Weeks 4-10)
    matchups.push(...nonDistrictGames, ...districtGames);
  }

  const schedule: ScheduleGame[] = matchups.map((m, idx) => {
    const homeTeam = m.isHome ? myTeam : m.opp;
    return {
      week: idx + 1,
      opponentId: m.opp.id,
      isHome: m.isHome,
      played: false,
      weather: getWeatherForTeam(homeTeam),
    };
  });

  const standings: Record<string, StandingsRow> = {};
  pool.forEach((t) => {
    standings[t.id] = {
      teamId: t.id,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  });

  return { schedule, standings };
}

export interface NewCareerConfig {
  firstName: string;
  lastName: string;
  jersey: number;
  position: Position;
  archetype: Archetype;
  faceStyle: number;
  skinTone: string;
  hairColor: string;
  state: string;
  highSchoolId: string;
  startEra: 'HIGH_SCHOOL' | 'COLLEGE' | 'NFL';
  collegeTeamId?: string;
  nflTeamId?: string;
  customBuild?: {
    attrs: PlayerAttributes;
    max: PlayerAttributes;
    remainingSkillPoints?: number;
  };
}

export function createNewCareer(config: NewCareerConfig): CareerSave {
  const era = config.startEra;
  const teamId =
    era === 'HIGH_SCHOOL'
      ? config.highSchoolId
      : era === 'COLLEGE'
        ? config.collegeTeamId ?? COLLEGE_TEAMS[0].id
        : config.nflTeamId ?? NFL_TEAMS[0].id;
  const team = getTeamById(teamId);

  let attrs: PlayerAttributes;
  let max: PlayerAttributes;
  let startingSkillPoints: number;

  if (config.customBuild) {
    attrs = { ...config.customBuild.attrs };
    max = { ...config.customBuild.max };
    startingSkillPoints = Math.max(0, config.customBuild.remainingSkillPoints ?? 0);
  } else {
    const preset = generatePlayerBuildPreset(config.position, config.archetype, '25_45', era);
    attrs = preset.attrs;
    max = preset.max;
    startingSkillPoints = preset.bonusPoints;
  }

  const starRating = calculateStarRating(attrs, config.position);
  const { schedule, standings } = generateSchedule(era, teamId, config.state);
  const coaches = generateCoaches(era);
  const roster = generateRoster(era, config.position, team);

  const eraLabel =
    era === 'HIGH_SCHOOL'
      ? `${team.name} Varsity`
      : era === 'COLLEGE'
        ? `${team.name}`
        : `${team.name}`;

  const save: CareerSave = {
    id: `rb_career_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    era,
    seasonNumber: 1,
    eraYear: 1,
    week: 1,
    totalWeeks: schedule.length,
    phase: 'REGULAR_SEASON',
    selectedState: config.state,
    teamId,
    player: {
      firstName: config.firstName.trim() || 'Marcus',
      lastName: config.lastName.trim() || 'Vance',
      jersey: config.jersey,
      position: config.position,
      archetype: config.archetype,
      height: config.position === 'OL' || config.position === 'DL' ? `6'4"` : config.position === 'WR' || config.position === 'QB' ? `6'2"` : `6'0"`,
      weight: config.position === 'OL' ? 305 : config.position === 'DL' ? 280 : config.position === 'TE' || config.position === 'LB' ? 242 : 204,
      age: era === 'HIGH_SCHOOL' ? 16 : era === 'COLLEGE' ? 19 : 22,
      faceStyle: config.faceStyle,
      skinTone: config.skinTone,
      hairColor: config.hairColor,
      homeState: config.state,
      highSchoolId: config.highSchoolId,
      starRating,
      recruitingStars: era === 'HIGH_SCHOOL' ? 3 : 4,
      level: 1,
      xp: 0,
      xpToNext: 190,
      skillPoints: startingSkillPoints,
      attributes: attrs,
      maxAttributes: max,
      trainingProgress: { speed: 0, strength: 0, stamina: 0, skill: 0 },
      condition: 96,
      morale: 80,
      injuryWeeks: 0,
      injuryType: '',
      traits: [],
      relationships: {
        coach: 65,
        teammates: 70,
        fans: era === 'HIGH_SCHOOL' ? 45 : 55,
        agent: 65,
        gpa: 3.4,
      },
      cash: era === 'HIGH_SCHOOL' ? 450 : era === 'COLLEGE' ? 6500 : 120000,
      nrgDrinks: 2,
      ownedItemIds: [],
      contract: {
        salaryPerYear: era === 'HIGH_SCHOOL' ? 0 : era === 'COLLEGE' ? 25000 : 1400000,
        tdBonus: era === 'HIGH_SCHOOL' ? 0 : era === 'COLLEGE' ? 500 : 15000,
        yearsLeft: era === 'HIGH_SCHOOL' ? 2 : era === 'COLLEGE' ? 3 : 4,
        role: 'Starter',
        nilDeals: era === 'COLLEGE' ? ['Local Campus Athletics'] : [],
      },
    },
    roster,
    coaches,
    schedule,
    standings,
    seasonStats: emptyStats(),
    careerStats: emptyStats(),
    careerByEra: {
      HIGH_SCHOOL: emptyStats(),
      COLLEGE: emptyStats(),
      NFL: emptyStats(),
    },
    history: [],
    trophies: [],
    achievements: [],
    newsFeed: [
      {
        id: 'news_init',
        week: 1,
        headline: `${config.firstName} ${config.lastName} Named Starting ${config.position} for ${eraLabel}`,
        body: `Out of ${config.state}, ${config.firstName} ${config.lastName} (#${config.jersey}) steps onto the field as a ${config.archetype}. Coaches expect big things this season.`,
      },
    ],
    pendingDilemma: null,
    pendingOffers: [],
    weeklyTrainingDone: false,
    weeklyMeetingDone: false,
    uniformChoice: 'home',
    difficulty: 'Dynamic',
    quarterLength: 2.5,
    driveDirection: 'BOTH',
  };

  return save;
}

export function simulateLeagueWeek(
  save: CareerSave,
  playedWeek: number,
  userOpponentId?: string
): Record<string, StandingsRow> {
  const next = { ...save.standings };
  // Exclude BOTH the user's team and the user's opponent this week so no team plays twice in one week
  const ids = Object.keys(next).filter((id) => id !== save.teamId && id !== userOpponentId);
  const shuffled = shuffleArr(ids);

  // Pair mostly within-conference & same-subdivision teams when possible
  const paired: [string, string][] = [];
  const remaining = [...shuffled];
  while (remaining.length >= 2) {
    const a = remaining.shift()!;
    const teamA = getTeamById(a);
    let oppIdx = -1;
    if (Math.random() < 0.72) {
      oppIdx = remaining.findIndex((id) => getTeamById(id).conference === teamA.conference);
    }
    if (oppIdx === -1 && save.era === 'COLLEGE' && Math.random() < 0.92) {
      oppIdx = remaining.findIndex((id) => getTeamById(id).subdivision === teamA.subdivision);
    }
    const b = remaining.splice(oppIdx >= 0 ? oppIdx : 0, 1)[0];
    paired.push([a, b]);
  }

  const eraBase = save.era === 'NFL' ? 14 : save.era === 'COLLEGE' ? 16 : 14;
  for (const [a, b] of paired) {
    const teamA = getTeamById(a);
    const teamB = getTeamById(b);
    const diffAB = (teamA.offense - teamB.defense) * 1.15;
    const diffBA = (teamB.offense - teamA.defense) * 1.15;
    const scoreA = Math.max(7, Math.round(eraBase + teamA.offense * 1.45 + diffAB + Math.random() * 14));
    const scoreB = Math.max(7, Math.round(eraBase + teamB.offense * 1.45 + diffBA + Math.random() * 14));
    let finalA = scoreA;
    let finalB = scoreB;
    if (finalA === finalB) {
      // Occasional NFL tie (~12% of tied regulation games), OT winner otherwise
      if (save.era === 'NFL' && Math.random() < 0.12) {
        // Leave as tie
      } else if (teamA.offense + teamA.defense + Math.random() * 4 >= teamB.offense + teamB.defense) {
        finalA += 3;
      } else {
        finalB += 3;
      }
    }

    const rowA = { ...next[a] };
    const rowB = { ...next[b] };
    rowA.pointsFor += finalA;
    rowA.pointsAgainst += finalB;
    rowB.pointsFor += finalB;
    rowB.pointsAgainst += finalA;
    if (finalA > finalB) {
      rowA.wins += 1;
      rowB.losses += 1;
    } else if (finalB > finalA) {
      rowB.wins += 1;
      rowA.losses += 1;
    } else {
      rowA.ties += 1;
      rowB.ties += 1;
    }
    next[a] = rowA;
    next[b] = rowB;
  }
  void playedWeek;
  return next;
}

export function applyMatchOutcome(
  save: CareerSave,
  playerScore: number,
  oppScore: number,
  matchStats: Partial<StatLine>,
  gameRating: number
): CareerSave {
  const next: CareerSave = JSON.parse(JSON.stringify(save));
  const gameIndex = next.schedule.findIndex((g) => g.week === next.week && !g.played);
  if (gameIndex === -1) return next;

  const game = next.schedule[gameIndex];
  const team = getTeamById(next.teamId);
  const opp = getTeamById(game.opponentId);

  game.played = true;
  game.playerTeamScore = playerScore;
  game.opponentScore = oppScore;
  game.gameRating = gameRating;

  const won = playerScore > oppScore;
  const tied = playerScore === oppScore;

  // Update standings during regular season
  if (!game.isPlayoff) {
    const myRow = { ...next.standings[next.teamId] };
    const oppRow = { ...next.standings[opp.id] };
    myRow.pointsFor += playerScore;
    myRow.pointsAgainst += oppScore;
    if (oppRow) {
      oppRow.pointsFor += oppScore;
      oppRow.pointsAgainst += playerScore;
    }
    if (won) {
      myRow.wins += 1;
      if (oppRow) oppRow.losses += 1;
    } else if (tied) {
      myRow.ties += 1;
      if (oppRow) oppRow.ties += 1;
    } else {
      myRow.losses += 1;
      if (oppRow) oppRow.wins += 1;
    }
    next.standings[next.teamId] = myRow;
    if (oppRow) next.standings[opp.id] = oppRow;
    next.standings = simulateLeagueWeek(next, next.week, opp.id);
  }

  // Merge stats
  const fullGameStats: Partial<StatLine> = { ...matchStats, games: 1 };
  next.seasonStats = addStats(next.seasonStats, fullGameStats);
  next.careerStats = addStats(next.careerStats, fullGameStats);
  if (next.era !== 'RETIRED') {
    next.careerByEra[next.era] = addStats(next.careerByEra[next.era], fullGameStats);
  }

  // Update teammates' simulated season stats, morale, & young player in-season growth
  next.roster = next.roster.map((tm) => {
    const yds = tm.position === 'QB' ? 180 + Math.floor(Math.random() * 110) :
      tm.position === 'RB' || tm.position === 'WR' ? 45 + Math.floor(Math.random() * 70) : 0;
    const tds = yds > 75 && Math.random() > 0.45 ? 1 : 0;
    const tackles = ['DL', 'LB', 'CB', 'S'].includes(tm.position) ? 3 + Math.floor(Math.random() * 6) : 0;

    // Realistic morale shift after game (wins lift morale, losses dip slightly with personal variance)
    const moraleShift = won ? 3 + Math.floor(Math.random() * 4) : -(2 + Math.floor(Math.random() * 3));
    const nextMorale = Math.max(18, Math.min(99, tm.morale + moraleShift));

    // Young teammates with potential room can gain a bar mid-season on wins
    let nextAttrs = tm.attributes;
    let nextRating = tm.rating;
    if (nextAttrs && tm.maxAttributes && tm.age <= 25 && won && Math.random() < 0.16) {
      const growKeys = (['skill', 'speed', 'strength', 'stamina'] as const).filter(
        (k) => nextAttrs![k] < tm.maxAttributes![k]
      );
      if (growKeys.length > 0) {
        const pickedKey = growKeys[Math.floor(Math.random() * growKeys.length)];
        nextAttrs = { ...nextAttrs, [pickedKey]: nextAttrs[pickedKey] + 1 };
        nextRating = calculateStarRating(nextAttrs, tm.position);
      }
    }

    return {
      ...tm,
      attributes: nextAttrs,
      rating: nextRating,
      isStar: nextRating >= 3.5,
      morale: nextMorale,
      condition: Math.max(58, Math.min(100, tm.condition - (2 + Math.floor(Math.random() * 6)))),
      stats: {
        yards: tm.stats.yards + yds,
        tds: tm.stats.tds + tds,
        tackles: tm.stats.tackles + tackles,
      },
    };
  });

  // Balanced XP & Leveling + Lifestyle Perks
  const perks = getLifestylePerks(next.player.ownedItemIds ?? []);
  const baseXP = Math.round(28 + gameRating * 7.5 + (won ? 18 : 6));
  const earnedXP = Math.round(baseXP * (1 + perks.xpBonusPct / 100));
  next.player.xp += earnedXP;
  while (next.player.xp >= next.player.xpToNext) {
    next.player.xp -= next.player.xpToNext;
    next.player.level += 1;
    next.player.skillPoints += 1;
    next.player.xpToNext = Math.round(next.player.xpToNext * 1.16 + 25);
    if (next.player.level === 4 && next.player.traits.length === 0) {
      next.player.traits.push(pick(PLAYER_TRAITS));
    }
  }

  // Condition, Morale, Relationships, Payday (with Lifestyle Recovery & Outside-Life Perks)
  const staminaFactor = Math.max(0.5, 1.15 - (next.player.attributes.stamina + perks.attrBoost.stamina) * 0.05);
  const condDrain = Math.max(3, Math.round(12 * staminaFactor - perks.conditionRegenBonus * 0.45));
  next.player.condition = Math.max(35, Math.min(100, next.player.condition - condDrain));
  next.player.morale = Math.min(100, Math.max(15, next.player.morale + (won ? 5 : -4) + (gameRating >= 7 ? 3 : -2)));
  next.player.relationships.coach = Math.min(100, Math.max(10, next.player.relationships.coach + (gameRating >= 7 ? 4 : -2) + (won ? 2 : -1) + Math.round(perks.coachBonus * 0.5)));
  next.player.relationships.fans = Math.min(100, Math.max(10, next.player.relationships.fans + (won ? 4 : -3) + (gameRating >= 8 ? 4 : 0) + Math.round(perks.fansBonus * 0.5)));
  next.player.relationships.agent = Math.min(100, Math.max(10, next.player.relationships.agent + Math.round(perks.agentBonus * 0.5)));
  next.player.relationships.gpa = Number(Math.min(4.0, Math.max(1.5, next.player.relationships.gpa + perks.gpaBonus * 0.35)).toFixed(2));

  // Role promotion
  if (next.player.relationships.coach >= 85 && next.player.starRating >= 4) {
    next.player.contract.role = 'Franchise Star';
  } else if (next.player.relationships.coach >= 75) {
    next.player.contract.role = 'Captain';
  }

  // Recruiting star growth in HS driven dynamically by actual on-field production, record & GPA
  if (next.era === 'HIGH_SCHOOL') {
    const prevStars = next.player.recruitingStars;
    const evalRes = evaluateHighSchoolRecruiting(next);
    next.player.recruitingStars = evalRes.stars;
    if (evalRes.stars > prevStars) {
      next.newsFeed.unshift({
        id: `rec_${Date.now()}`,
        week: next.week,
        headline: `RECRUITING STOCK UP: ${next.player.firstName} ${next.player.lastName} Elevated to ${evalRes.stars}★ Prospect!`,
        body: `National scouts bumped ${next.player.lastName} after strong ${next.selectedState} Varsity production (${evalRes.highlightsSummary}).`,
      });
    }
  }

  // Cash payout (NIL / NFL Game Check + TD Bonus + Outside-Life Passive Income / Upkeep)
  const gameTds = (matchStats.passTD ?? 0) + (matchStats.rushTD ?? 0) + (matchStats.recTD ?? 0);
  const gamePay =
    next.era === 'HIGH_SCHOOL'
      ? 50
      : Math.round(next.player.contract.salaryPerYear / next.totalWeeks) +
        gameTds * next.player.contract.tdBonus;
  const outsideLifeNet = -Math.round(perks.weeklyNetUpkeep * 0.35);
  next.player.cash = Math.max(0, next.player.cash + gamePay + outsideLifeNet);

  // News item
  next.newsFeed.unshift({
    id: `n_${Date.now()}`,
    week: next.week,
    headline: `${team.shortName} ${won ? 'Defeats' : 'Falls to'} ${opp.shortName} (${playerScore}-${oppScore})`,
    body: `${next.player.firstName} ${next.player.lastName} earned a ${gameRating.toFixed(1)}/10 game grade (+${earnedXP} XP${gamePay > 0 ? `, +$${gamePay.toLocaleString()}` : ''}${outsideLifeNet > 0 ? `, +$${outsideLifeNet.toLocaleString()} passive` : ''}).`,
  });
  next.newsFeed = next.newsFeed.slice(0, 20);

  // Achievements check
  if (won && !next.achievements.includes('First Victory')) next.achievements.push('First Victory');
  if (gameTds >= 3 && !next.achievements.includes('3+ TD Explosion')) next.achievements.push('3+ TD Explosion');
  if ((matchStats.defInt ?? 0) >= 2 && !next.achievements.includes('Ball Hawk (2+ INT)')) next.achievements.push('Ball Hawk (2+ INT)');
  if ((matchStats.sacks ?? 0) >= 2 && !next.achievements.includes('Sack Artist (2+ Sacks)')) next.achievements.push('Sack Artist (2+ Sacks)');
  if ((matchStats.fgLong ?? 0) >= 50 && !next.achievements.includes('50+ Yard Bomb')) next.achievements.push('50+ Yard Bomb');

  // Helper to compute FBS College CFP 12-team field (Major conf champs + top FBS at-large)
  const getCfpField = (): LeagueTeam[] => {
    const fbsRows = Object.values(next.standings).filter((r) => getTeamById(r.teamId).subdivision !== 'FCS');
    const natSorted = sortStandingsRows(fbsRows).map((r) => getTeamById(r.teamId));
    const fbsConfs = ['SEC', 'Big Ten', 'ACC', 'Big 12', 'MW', 'AAC', 'Sun Belt'];
    const confChamps: LeagueTeam[] = [];
    fbsConfs.forEach((cf) => {
      const topTeam = natSorted.find((t) => t.conference === cf);
      if (topTeam) confChamps.push(topTeam);
    });
    const sortedChamps = sortStandingsRows(
      confChamps.map((t) => next.standings[t.id] ?? { teamId: t.id, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 })
    )
      .slice(0, 5)
      .map((r) => getTeamById(r.teamId));
    const champIds = new Set(sortedChamps.map((t) => t.id));
    const atLarge = natSorted.filter((t) => !champIds.has(t.id));
    return [...sortedChamps, ...atLarge].slice(0, 12);
  };

  // Helper to compute 16-Team FCS Playoffs field
  const getFcsPlayoffField = (): LeagueTeam[] => {
    const fcsRows = Object.values(next.standings).filter((r) => getTeamById(r.teamId).subdivision === 'FCS');
    return sortStandingsRows(fcsRows).slice(0, 16).map((r) => getTeamById(r.teamId));
  };

  // Postseason Qualification & Seeded Bracket Progression
  const myRow = next.standings[next.teamId];
  const priorPlayoffOppIds = new Set(next.schedule.filter((g) => g.isPlayoff).map((g) => g.opponentId));

  if (next.phase === 'REGULAR_SEASON' && next.week >= next.totalWeeks) {
    if (next.era === 'NFL') {
      const confSeeds = getNflConferenceSeeds(next.standings, team.conference);
      const mySeedIdx = confSeeds.findIndex((t) => t.id === team.id);
      if (mySeedIdx === -1) {
        return finishSeason(next, 'Missed Playoffs');
      }
      const mySeed = mySeedIdx + 1;
      next.phase = 'PLAYOFFS';
      next.week += 1;

      if (mySeed === 1) {
        // #1 Seed gets First-Round Bye straight to Divisional Round!
        const divOpp = confSeeds[4] ?? confSeeds[3] ?? confSeeds[confSeeds.length - 1];
        next.schedule.push({
          week: next.week,
          opponentId: divOpp.id,
          isHome: true,
          isPlayoff: true,
          playoffRoundName: 'Divisional Round',
          played: false,
          weather: getWeatherForTeam(team),
        });
        next.newsFeed.unshift({
          id: `po_${Date.now()}`,
          week: next.week,
          headline: `#1 Seed ${team.name} Earn First-Round Bye!`,
          body: `Locked up the ${team.conference} #1 seed (${myRow.wins}-${myRow.losses}). Next up: Divisional Round vs #5 ${divOpp.shortName}.`,
        });
      } else {
        const oppSeed = 9 - mySeed; // 2v7, 3v6, 4v5
        const oppPlayoff = confSeeds[oppSeed - 1] ?? confSeeds[confSeeds.length - 1];
        const isHome = mySeed <= 4;
        next.schedule.push({
          week: next.week,
          opponentId: oppPlayoff.id,
          isHome,
          isPlayoff: true,
          playoffRoundName: 'Wild Card Round',
          played: false,
          weather: getWeatherForTeam(isHome ? team : oppPlayoff),
        });
        next.newsFeed.unshift({
          id: `po_${Date.now()}`,
          week: next.week,
          headline: `#${mySeed} ${team.name} Clinch ${team.conference} Playoff Berth!`,
          body: `Wild Card Round: ${isHome ? 'Hosting' : '@'} #${oppSeed} ${oppPlayoff.name}.`,
        });
      }
    } else if (next.era === 'COLLEGE') {
      if (team.subdivision === 'FCS') {
        const fcsField = getFcsPlayoffField();
        const myFcsSeed = fcsField.findIndex((t) => t.id === team.id) + 1;
        if (myFcsSeed < 1 || myFcsSeed > 16) {
          return finishSeason(next, 'Missed FCS Playoffs');
        }
        const oppSeed = 17 - myFcsSeed;
        const firstOpp = fcsField[oppSeed - 1] ?? fcsField[fcsField.length - 1];
        const isHome = myFcsSeed <= 8;
        next.phase = 'PLAYOFFS';
        next.week += 1;
        next.schedule.push({
          week: next.week,
          opponentId: firstOpp.id,
          isHome,
          isPlayoff: true,
          playoffRoundName: 'FCS First Round',
          played: false,
          weather: getWeatherForTeam(isHome ? team : firstOpp),
        });
        next.newsFeed.unshift({
          id: `po_${Date.now()}`,
          week: next.week,
          headline: `#${myFcsSeed} ${team.name} Clinch 16-Team FCS Playoffs!`,
          body: `FCS First Round: ${isHome ? 'Hosting' : '@'} #${oppSeed} ${firstOpp.name}.`,
        });
      } else {
        const fbsConfs = ['SEC', 'Big Ten', 'ACC', 'Big 12', 'MW', 'AAC', 'Sun Belt', 'MAC', 'C-USA'];
        const fbsSorted = sortStandingsRows(
          Object.values(next.standings).filter((r) => getTeamById(r.teamId).subdivision !== 'FCS')
        ).map((r) => getTeamById(r.teamId));
        const myNatRank = fbsSorted.findIndex((t) => t.id === team.id) + 1;

        if (fbsConfs.includes(team.conference)) {
          const confSorted = fbsSorted.filter((t) => t.conference === team.conference);
          const myConfRank = confSorted.findIndex((t) => t.id === team.id) + 1;
          if (myConfRank <= 2 && confSorted.length >= 2) {
            const confOpp = confSorted[myConfRank === 1 ? 1 : 0];
            next.phase = 'PLAYOFFS';
            next.week += 1;
            next.schedule.push({
              week: next.week,
              opponentId: confOpp.id,
              isHome: myConfRank === 1,
              isPlayoff: true,
              playoffRoundName: `${team.conference} Championship`,
              played: false,
              weather: getWeatherForTeam(team),
            });
            next.newsFeed.unshift({
              id: `po_${Date.now()}`,
              week: next.week,
              headline: `${team.name} Reach ${team.conference} Championship Game!`,
              body: `Facing #${myConfRank === 1 ? 2 : 1} ${confOpp.name} for the conference crown & CFP bid.`,
            });
            next.weeklyTrainingDone = false;
            next.weeklyMeetingDone = false;
            next.pendingDilemma = null;
            next.updatedAt = Date.now();
            return next;
          }
        }

        // Not in Conference Championship -> Check 12-team CFP vs Bowl Game
        const cfpField = getCfpField();
        const myCfpSeed = cfpField.findIndex((t) => t.id === team.id) + 1;
        if (myCfpSeed >= 1 && myCfpSeed <= 12) {
          next.phase = 'PLAYOFFS';
          next.week += 1;
          if (myCfpSeed <= 4) {
            const qfBowls = ['Rose Bowl', 'Sugar Bowl', 'Orange Bowl', 'Cotton Bowl'];
            const qfOpp = cfpField[12 - myCfpSeed] ?? cfpField[7];
            const roundName = `CFP Quarterfinal · ${qfBowls[(myCfpSeed - 1) % qfBowls.length]}`;
            next.schedule.push({
              week: next.week,
              opponentId: qfOpp.id,
              isHome: true,
              isPlayoff: true,
              playoffRoundName: roundName,
              played: false,
              weather: getWeatherForTeam(team),
            });
            next.newsFeed.unshift({
              id: `po_${Date.now()}`,
              week: next.week,
              headline: `#${myCfpSeed} ${team.name} Earn CFP First-Round Bye!`,
              body: `Advancing directly to the ${roundName} vs ${qfOpp.name}.`,
            });
          } else {
            const oppSeed = 17 - myCfpSeed; // 5v12, 6v11, 7v10, 8v9
            const firstOpp = cfpField[oppSeed - 1] ?? cfpField[cfpField.length - 1];
            const isHome = myCfpSeed <= 8;
            next.schedule.push({
              week: next.week,
              opponentId: firstOpp.id,
              isHome,
              isPlayoff: true,
              playoffRoundName: 'CFP First Round',
              played: false,
              weather: getWeatherForTeam(isHome ? team : firstOpp),
            });
            next.newsFeed.unshift({
              id: `po_${Date.now()}`,
              week: next.week,
              headline: `#${myCfpSeed} ${team.name} Selected for 12-Team CFP!`,
              body: `CFP First Round: ${isHome ? 'Hosting' : '@'} #${oppSeed} ${firstOpp.name}.`,
            });
          }
        } else if (myRow.wins >= 6) {
          const bowls = ['Citrus Bowl', 'Alamo Bowl', 'Gator Bowl', 'Holiday Bowl', 'Sun Bowl', 'Liberty Bowl'];
          const bowlName = bowls[(myNatRank + next.seasonNumber) % bowls.length];
          const bowlOpp =
            fbsSorted.find((t, idx) => t.id !== team.id && t.conference !== team.conference && Math.abs(idx + 1 - myNatRank) <= 10) ??
            fbsSorted.find((t) => t.id !== team.id && t.conference !== team.conference) ??
            fbsSorted[0];
          next.phase = 'PLAYOFFS';
          next.week += 1;
          next.schedule.push({
            week: next.week,
            opponentId: bowlOpp.id,
            isHome: false,
            isPlayoff: true,
            playoffRoundName: bowlName,
            played: false,
            weather: getWeatherForTeam(bowlOpp),
          });
          next.newsFeed.unshift({
            id: `po_${Date.now()}`,
            week: next.week,
            headline: `${team.name} Accept Bid to the ${bowlName}!`,
            body: `At ${myRow.wins}-${myRow.losses}, ${team.shortName} will face ${bowlOpp.name}.`,
          });
        } else {
          return finishSeason(next, 'Missed Bowl Season');
        }
      }
    } else {
      // High School: Top 8 in the State Standings qualify for State Playoffs
      const stateSorted = sortStandingsRows(Object.values(next.standings)).map((r) => getTeamById(r.teamId));
      const myStateSeed = stateSorted.findIndex((t) => t.id === team.id) + 1;
      if (myStateSeed < 1 || myStateSeed > 8) {
        return finishSeason(next, 'Missed State Playoffs');
      }
      const oppSeed = 9 - myStateSeed; // 1v8, 2v7, 3v6, 4v5
      const qfOpp = stateSorted[oppSeed - 1] ?? stateSorted[7];
      const isHome = myStateSeed <= 4;
      next.phase = 'PLAYOFFS';
      next.week += 1;
      next.schedule.push({
        week: next.week,
        opponentId: qfOpp.id,
        isHome,
        isPlayoff: true,
        playoffRoundName: 'State Quarterfinal',
        played: false,
        weather: getWeatherForTeam(isHome ? team : qfOpp),
      });
      next.newsFeed.unshift({
        id: `po_${Date.now()}`,
        week: next.week,
        headline: `#${myStateSeed} ${team.name} Clinch ${next.selectedState} State Playoffs!`,
        body: `Quarterfinal matchup vs #${oppSeed} ${qfOpp.name}.`,
      });
    }
  } else if (next.phase === 'PLAYOFFS') {
    const roundName = game.playoffRoundName ?? 'Playoffs';
    const isStandaloneBowl =
      next.era === 'COLLEGE' &&
      !roundName.includes('Championship') &&
      !roundName.includes('CFP') &&
      !roundName.includes('FCS');

    if (isStandaloneBowl) {
      if (won) {
        next.trophies.push(`Season ${next.seasonNumber}: ${roundName} Champions (${team.shortName})`);
        return finishSeason(next, `${roundName} Champions`);
      }
      return finishSeason(next, `${roundName} Participant`);
    }

    if (!won) {
      // Special College case: losing a Conference Championship while ranked Top 12 still earns an at-large CFP bid!
      if (next.era === 'COLLEGE' && roundName.endsWith('Championship') && !roundName.includes('National')) {
        const cfpField = getCfpField();
        const atLargeSeed = cfpField.findIndex((t) => t.id === team.id) + 1;
        if (atLargeSeed >= 5 && atLargeSeed <= 12) {
          const oppSeed = 17 - atLargeSeed;
          const firstOpp =
            cfpField.find((t, i) => i + 1 === oppSeed && !priorPlayoffOppIds.has(t.id)) ??
            cfpField.find((t) => t.id !== team.id && !priorPlayoffOppIds.has(t.id)) ??
            cfpField[cfpField.length - 1];
          next.week += 1;
          next.schedule.push({
            week: next.week,
            opponentId: firstOpp.id,
            isHome: atLargeSeed <= 8,
            isPlayoff: true,
            playoffRoundName: 'CFP First Round',
            played: false,
            weather: getWeatherForTeam(atLargeSeed <= 8 ? team : firstOpp),
          });
          next.newsFeed.unshift({
            id: `po_${Date.now()}`,
            week: next.week,
            headline: `${team.name} Secure At-Large #${atLargeSeed} CFP Seed`,
            body: `Despite falling in the ${roundName}, ${team.shortName} enter the CFP First Round vs ${firstOpp.name}.`,
          });
          next.weeklyTrainingDone = false;
          next.weeklyMeetingDone = false;
          next.pendingDilemma = null;
          next.updatedAt = Date.now();
          return next;
        }
      }
      return finishSeason(next, `Eliminated in ${roundName}`);
    }

    // Won current playoff round -> check if Championship won or advance to next seeded round
    const isFinalRound =
      roundName === 'Retro Bowl Championship' ||
      roundName === 'CFP National Championship' ||
      roundName === 'FCS National Championship' ||
      roundName === `${next.selectedState} State Championship`;

    if (isFinalRound) {
      const titleName =
        next.era === 'HIGH_SCHOOL'
          ? `${next.selectedState} State Champions`
          : next.era === 'COLLEGE'
            ? roundName.startsWith('FCS')
              ? 'FCS National Champions'
              : 'CFP National Champions'
            : 'Retro Bowl Champions';
      next.trophies.push(`Season ${next.seasonNumber}: ${titleName} (${team.shortName})`);
      if (next.era === 'HIGH_SCHOOL' && !next.achievements.includes('State Champion')) {
        next.achievements.push('State Champion');
      }
      if (next.era === 'COLLEGE' && !next.achievements.includes('National Champion')) {
        next.achievements.push('National Champion');
      }
      if (next.era === 'NFL' && !next.achievements.includes('Retro Bowl Ring')) {
        next.achievements.push('Retro Bowl Ring');
      }
      return finishSeason(next, titleName);
    }

    next.week += 1;

    if (next.era === 'NFL') {
      const confSeeds = getNflConferenceSeeds(next.standings, team.conference);
      const mySeed = Math.max(1, confSeeds.findIndex((t) => t.id === team.id) + 1);
      const remainingConf = confSeeds.filter((t) => t.id !== team.id && !priorPlayoffOppIds.has(t.id));

      if (roundName === 'Wild Card Round') {
        const nextOpp = (mySeed >= 4 ? remainingConf[0] : remainingConf[remainingConf.length - 1]) ?? remainingConf[0];
        const oppSeed = confSeeds.findIndex((t) => t.id === nextOpp.id) + 1;
        const isHome = mySeed < oppSeed;
        next.schedule.push({
          week: next.week,
          opponentId: nextOpp.id,
          isHome,
          isPlayoff: true,
          playoffRoundName: 'Divisional Round',
          played: false,
          weather: getWeatherForTeam(isHome ? team : nextOpp),
        });
      } else if (roundName === 'Divisional Round') {
        const nextOpp = remainingConf[0] ?? confSeeds.find((t) => t.id !== team.id)!;
        const oppSeed = confSeeds.findIndex((t) => t.id === nextOpp.id) + 1;
        const isHome = mySeed < oppSeed;
        next.schedule.push({
          week: next.week,
          opponentId: nextOpp.id,
          isHome,
          isPlayoff: true,
          playoffRoundName: `${team.conference} Championship`,
          played: false,
          weather: getWeatherForTeam(isHome ? team : nextOpp),
        });
      } else {
        const oppConf = team.conference === 'AFC' ? 'NFC' : 'AFC';
        const oppConfSeeds = getNflConferenceSeeds(next.standings, oppConf);
        const sbOpp = oppConfSeeds[0] ?? oppConfSeeds[1];
        next.schedule.push({
          week: next.week,
          opponentId: sbOpp.id,
          isHome: false,
          isPlayoff: true,
          playoffRoundName: 'Retro Bowl Championship',
          played: false,
          weather: getWeatherForTeam(sbOpp),
        });
      }
    } else if (next.era === 'COLLEGE') {
      if (team.subdivision === 'FCS') {
        const fcsField = getFcsPlayoffField();
        const myFcsSeed = Math.max(1, fcsField.findIndex((t) => t.id === team.id) + 1);
        const availableFcs = fcsField.filter((t) => t.id !== team.id && !priorPlayoffOppIds.has(t.id));
        const nextOpp = availableFcs[0] ?? fcsField[0];
        const nextRound =
          roundName === 'FCS First Round'
            ? 'FCS Quarterfinal'
            : roundName === 'FCS Quarterfinal'
              ? 'FCS Semifinal'
              : 'FCS National Championship';
        const isHome = nextRound !== 'FCS National Championship' && myFcsSeed <= 4;
        next.schedule.push({
          week: next.week,
          opponentId: nextOpp.id,
          isHome,
          isPlayoff: true,
          playoffRoundName: nextRound,
          played: false,
          weather: getWeatherForTeam(isHome ? team : nextOpp),
        });
      } else {
        const cfpField = getCfpField();
        const myCfpSeed = cfpField.findIndex((t) => t.id === team.id) + 1;
        const availableCfp = cfpField.filter((t) => t.id !== team.id && !priorPlayoffOppIds.has(t.id));

        if (roundName.endsWith('Championship') && !roundName.includes('National')) {
          const qfBowls = ['Rose Bowl', 'Sugar Bowl', 'Orange Bowl', 'Cotton Bowl'];
          const effectiveSeed = myCfpSeed >= 1 && myCfpSeed <= 4 ? myCfpSeed : 2;
          const qfOpp = availableCfp[Math.max(0, availableCfp.length - effectiveSeed)] ?? availableCfp[0];
          next.schedule.push({
            week: next.week,
            opponentId: qfOpp.id,
            isHome: true,
            isPlayoff: true,
            playoffRoundName: `CFP Quarterfinal · ${qfBowls[(effectiveSeed - 1) % qfBowls.length]}`,
            played: false,
            weather: getWeatherForTeam(team),
          });
        } else if (roundName === 'CFP First Round') {
          const qfBowls = ['Rose Bowl', 'Sugar Bowl', 'Orange Bowl', 'Cotton Bowl'];
          const qfOpp = availableCfp[0] ?? cfpField[0];
          next.schedule.push({
            week: next.week,
            opponentId: qfOpp.id,
            isHome: false,
            isPlayoff: true,
            playoffRoundName: `CFP Quarterfinal · ${qfBowls[myCfpSeed % qfBowls.length]}`,
            played: false,
            weather: getWeatherForTeam(qfOpp),
          });
        } else if (roundName.startsWith('CFP Quarterfinal')) {
          const sfBowls = ['Peach Bowl', 'Fiesta Bowl'];
          const sfOpp = availableCfp[0] ?? cfpField[1];
          next.schedule.push({
            week: next.week,
            opponentId: sfOpp.id,
            isHome: myCfpSeed <= 2,
            isPlayoff: true,
            playoffRoundName: `CFP Semifinal · ${sfBowls[myCfpSeed % 2]}`,
            played: false,
            weather: getWeatherForTeam(team),
          });
        } else {
          const natOpp = availableCfp[0] ?? cfpField[0];
          next.schedule.push({
            week: next.week,
            opponentId: natOpp.id,
            isHome: false,
            isPlayoff: true,
            playoffRoundName: 'CFP National Championship',
            played: false,
            weather: getWeatherForTeam(natOpp),
          });
        }
      }
    } else {
      // High School State Playoffs: Quarterfinal -> Semifinal -> State Championship
      const stateSorted = sortStandingsRows(Object.values(next.standings)).map((r) => getTeamById(r.teamId));
      const myStateSeed = Math.max(1, stateSorted.findIndex((t) => t.id === team.id) + 1);
      const remainingTop = stateSorted
        .slice(0, 8)
        .filter((t) => t.id !== team.id && !priorPlayoffOppIds.has(t.id));

      if (roundName === 'State Quarterfinal') {
        const sfOpp = remainingTop[Math.min(remainingTop.length - 1, myStateSeed <= 2 ? 1 : 0)] ?? remainingTop[0];
        const oppSeed = stateSorted.findIndex((t) => t.id === sfOpp.id) + 1;
        const isHome = myStateSeed < oppSeed;
        next.schedule.push({
          week: next.week,
          opponentId: sfOpp.id,
          isHome,
          isPlayoff: true,
          playoffRoundName: 'State Semifinal',
          played: false,
          weather: getWeatherForTeam(isHome ? team : sfOpp),
        });
      } else {
        const finalOpp = remainingTop[0] ?? stateSorted.find((t) => t.id !== team.id)!;
        next.schedule.push({
          week: next.week,
          opponentId: finalOpp.id,
          isHome: false,
          isPlayoff: true,
          playoffRoundName: `${next.selectedState} State Championship`,
          played: false,
          weather: getWeatherForTeam(team),
        });
      }
    }
  } else {
    next.week += 1;
  }

  // Trigger a player-perspective dilemma on most weeks
  next.weeklyTrainingDone = false;
  next.weeklyMeetingDone = false;
  if (next.phase === 'REGULAR_SEASON' && Math.random() < 0.72) {
    const mate = pick(next.roster);
    next.pendingDilemma = generatePlayerDilemma(
      next.era === 'RETIRED' ? 'NFL' : next.era,
      next.player.position,
      next.coaches.hc.name,
      mate?.name ?? 'Devin Brooks',
      team.name,
      opp.name
    );
  } else {
    next.pendingDilemma = null;
  }

  next.updatedAt = Date.now();
  return next;
}

function finishSeason(save: CareerSave, finishLabel: string): CareerSave {
  const next = { ...save };
  const team = getTeamById(next.teamId);
  const myRow = next.standings[next.teamId] ?? { wins: 0, losses: 0, ties: 0 };
  const record = `${myRow.wins}-${myRow.losses}${myRow.ties ? `-${myRow.ties}` : ''}`;

  const awards: string[] = [];
  const totalTDs = next.seasonStats.passTD + next.seasonStats.rushTD + next.seasonStats.recTD;
  if (totalTDs >= 18 || next.seasonStats.sacks >= 10 || next.seasonStats.defInt >= 5 || next.seasonStats.fgMade >= 18) {
    const awardName =
      next.era === 'HIGH_SCHOOL'
        ? `${next.selectedState} All-State First Team`
        : next.era === 'COLLEGE'
          ? 'All-American & Trophy Finalist'
          : 'All-Pro / MVP Contender';
    awards.push(awardName);
    next.seasonStats.mvpAwards += 1;
    next.careerStats.mvpAwards += 1;
  }

  next.history.push({
    season: next.seasonNumber,
    era: next.era,
    teamName: team.name,
    record,
    finish: finishLabel,
    highlights: `${next.seasonStats.passYards + next.seasonStats.rushYards + next.seasonStats.recYards} total yds · ${totalTDs} TDs · ${next.seasonStats.tackles} tck`,
    awards,
  });

  // Decide offseason phase
  if (next.era === 'HIGH_SCHOOL') {
    if (next.eraYear >= 2) {
      // Graduate HS -> National Signing Day!
      const evalRes = evaluateHighSchoolRecruiting(next);
      next.player.recruitingStars = evalRes.stars;
      next.phase = 'OFFSEASON_RECRUITING';
      next.pendingOffers = generateCollegeOffers(next);
    } else {
      // Advance to Senior Year HS
      return startNextSeasonSameTeam(next);
    }
  } else if (next.era === 'COLLEGE') {
    next.phase = 'OFFSEASON_PORTAL_OR_DRAFT';
    next.pendingOffers = generateTransferPortalOffers(next);
  } else if (next.era === 'NFL') {
    if (next.player.age >= 38) {
      next.phase = 'HALL_OF_FAME';
      next.era = 'RETIRED';
    } else if (next.player.contract.yearsLeft <= 1) {
      next.phase = 'OFFSEASON_FREE_AGENCY';
      next.pendingOffers = generateNflFreeAgencyOffers(next.player.starRating, next.teamId);
    } else {
      next.player.contract.yearsLeft -= 1;
      return startNextSeasonSameTeam(next);
    }
  }

  next.updatedAt = Date.now();
  return next;
}

export interface RecruitingEvaluation {
  score: number; // 0..100
  stars: number; // 2..5
  tierLabel: string;
  gpaEligible: boolean;
  highlightsSummary: string;
  productionNote: string;
}

export function evaluateHighSchoolRecruiting(save: CareerSave): RecruitingEvaluation {
  const hs = save.careerByEra.HIGH_SCHOOL;
  const pos = save.player.position;
  const games = Math.max(1, hs.games);
  const myRow = save.standings[save.teamId] ?? { wins: 0, losses: 0, ties: 0 };
  const winPct = myRow.wins / Math.max(1, myRow.wins + myRow.losses);
  const hsTitles = save.trophies.filter((t) => t.includes('State Champion')).length;
  const allStateCount = save.history.reduce(
    (sum, h) => sum + h.awards.filter((a) => a.includes('All-State')).length,
    0
  );
  const gpa = save.player.relationships.gpa;
  const gpaEligible = gpa >= 2.2;

  let prodPoints = 0;
  let highlightsSummary = '';

  if (pos === 'QB') {
    const passYpg = hs.passYards / games;
    const rushYpg = hs.rushYards / games;
    const tdPg = (hs.passTD + hs.rushTD) / games;
    const compPct = hs.passAtt > 0 ? hs.passComp / hs.passAtt : 0.55;
    prodPoints = Math.min(48, passYpg * 0.14 + rushYpg * 0.12 + tdPg * 7.5 + compPct * 12 - hs.interceptions * 0.9);
    highlightsSummary = `${hs.passYards} pass yds, ${hs.passTD + hs.rushTD} total TDs`;
  } else if (pos === 'RB') {
    const scrimYpg = (hs.rushYards + hs.recYards) / games;
    const tdPg = (hs.rushTD + hs.recTD) / games;
    prodPoints = Math.min(48, scrimYpg * 0.25 + tdPg * 9);
    highlightsSummary = `${hs.rushYards + hs.recYards} scrimmage yds, ${hs.rushTD + hs.recTD} TDs`;
  } else if (pos === 'WR' || pos === 'TE') {
    const recYpg = hs.recYards / games;
    const tdPg = hs.recTD / games;
    prodPoints = Math.min(48, recYpg * 0.28 + tdPg * 9 + (hs.blocks / games) * 2.5);
    highlightsSummary = `${hs.receptions} rec, ${hs.recYards} yds, ${hs.recTD} TDs`;
  } else if (pos === 'OL') {
    const blkPg = hs.blocks / games;
    const panPg = hs.pancakes / games;
    prodPoints = Math.min(48, blkPg * 5.5 + panPg * 11 - (hs.sacksAllowed / games) * 5);
    highlightsSummary = `${hs.blocks} key blocks, ${hs.pancakes} pancakes`;
  } else if (pos === 'DL' || pos === 'LB' || pos === 'CB' || pos === 'S') {
    const tckPg = hs.tackles / games;
    const impactPg = (hs.sacks * 2.2 + hs.defInt * 2.8 + hs.tfl * 1.4 + hs.passDeflections * 1.2) / games;
    prodPoints = Math.min(48, tckPg * 4.8 + impactPg * 10);
    highlightsSummary = `${hs.tackles} tck, ${hs.sacks} sk, ${hs.defInt} INT`;
  } else {
    const fgPct = hs.fgAtt > 0 ? hs.fgMade / hs.fgAtt : 0.7;
    prodPoints = Math.min(48, fgPct * 24 + (hs.fgMade / games) * 8 + (hs.fgLong >= 45 ? 10 : 0));
    highlightsSummary = `${hs.fgMade}/${hs.fgAtt} FG (Long ${hs.fgLong} yds)`;
  }

  const starComponent = save.player.starRating * 6.5;
  const teamSuccess = winPct * 12 + hsTitles * 8 + allStateCount * 7;
  const gpaAdj = gpa >= 3.2 ? 4 : gpa < 2.2 ? -14 : 0;
  const rawScore = Math.max(20, Math.min(100, Math.round(prodPoints + starComponent + teamSuccess + gpaAdj)));

  let stars = 2;
  if (rawScore >= 76 && gpaEligible) stars = 5;
  else if (rawScore >= 56 && gpaEligible) stars = 4;
  else if (rawScore >= 38) stars = 3;

  const tierLabel =
    stars === 5
      ? '5★ Blue-Chip (Power 4)'
      : stars === 4
        ? '4★ National Prospect (P4 / Top G5)'
        : stars === 3
          ? '3★ G5 / Top FCS Recruit'
          : '2★ FCS / Developmental Recruit';

  const productionNote = !gpaEligible
    ? `Academic GPA (${gpa.toFixed(2)}) limited offers primarily to FCS & Group of 5 qualifiers.`
    : hsTitles > 0
      ? `State Championship pedigree & ${highlightsSummary} drove elite college demand.`
      : `Evaluation based on ${hs.games} varsity games (${highlightsSummary}) and ${myRow.wins}-${myRow.losses} record.`;

  return { score: rawScore, stars, tierLabel, gpaEligible, highlightsSummary, productionNote };
}

export function generateCollegeOffers(save: CareerSave): OfferOption[] {
  const evalRes = evaluateHighSchoolRecruiting(save);
  const powerConfs = new Set(['SEC', 'Big Ten', 'ACC', 'Big 12', 'Indep.']);
  const fbsSorted = COLLEGE_TEAMS.filter((t) => t.subdivision !== 'FCS').sort(
    (a, b) => b.offense + b.defense - (a.offense + a.defense)
  );
  const fcsSorted = COLLEGE_TEAMS.filter((t) => t.subdivision === 'FCS').sort(
    (a, b) => b.offense + b.defense - (a.offense + a.defense)
  );

  let pool: LeagueTeam[];
  if (evalRes.stars >= 5 && evalRes.gpaEligible) {
    pool = fbsSorted.filter((t) => powerConfs.has(t.conference) && t.offense + t.defense >= 16);
  } else if (evalRes.stars >= 4 && evalRes.gpaEligible) {
    pool = fbsSorted.filter((t) => t.offense + t.defense >= 14).slice(4, 34);
  } else if (evalRes.stars >= 3) {
    const g5 = fbsSorted.filter((t) => !powerConfs.has(t.conference) || t.offense + t.defense <= 14);
    pool = [...g5.slice(0, 14), ...fcsSorted.slice(0, 6)];
  } else {
    const lowerG5 = fbsSorted.filter((t) => !powerConfs.has(t.conference) && t.offense + t.defense <= 13);
    pool = [...fcsSorted, ...lowerG5];
  }

  if (pool.length < 6) pool = [...fcsSorted, ...fbsSorted.slice(-10)];
  const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
  return chosen.map((t, i) => {
    const isTopOffer = i === 0;
    const isFcs = t.subdivision === 'FCS';
    const role: OfferOption['role'] =
      evalRes.stars >= 5 || (evalRes.stars >= 4 && t.prestige <= 4) || isFcs ? 'Starter' : 'Backup';
    const pitch = isTopOffer
      ? `${evalRes.stars}★ HS Tape (${evalRes.highlightsSummary}) · ${t.subdivision ?? 'FBS'} ${t.conference}`
      : role === 'Starter'
        ? `Full-Ride Scholarship + Projected Year-1 Starter · ${t.conference}`
        : `Developmental Scholarship · ${t.conference}`;
    const baseNil = isFcs ? 6000 : 11500;
    return {
      id: `col_off_${t.id}_${i}`,
      teamId: t.id,
      type: 'SCHOLARSHIP',
      pitch,
      role,
      salaryOrNil: Math.round(t.prestige * baseNil + evalRes.stars * (isFcs ? 3500 : 9500) + save.player.starRating * 3500),
      years: 4,
      tdBonus: (isFcs ? 200 : 400) + t.prestige * 150,
    };
  });
}

export function generateTransferPortalOffers(save: CareerSave): OfferOption[] {
  const col = save.careerByEra.COLLEGE;
  const g = Math.max(1, col.games);
  const totalTds = col.passTD + col.rushTD + col.recTD;
  const prod =
    col.passYards / g * 0.1 +
    (col.rushYards + col.recYards) / g * 0.22 +
    (totalTds / g) * 8 +
    ((col.tackles + col.sacks * 2 + col.defInt * 3) / g) * 3.5 +
    (col.blocks + col.pancakes) / g * 3;
  const portalScore = save.player.starRating * 10 + prod;

  const current = getTeamById(save.teamId);
  const eligible = COLLEGE_TEAMS.filter((t) => t.id !== save.teamId);
  const pool =
    portalScore >= 62
      ? eligible.filter((t) => t.subdivision !== 'FCS' && t.offense + t.defense >= 15)
      : portalScore >= 46
        ? eligible.filter((t) => t.offense + t.defense >= 13)
        : eligible.filter((t) => t.subdivision === 'FCS' || t.offense + t.defense <= 14 || t.conference === current.conference);

  const chosen = (pool.length >= 5 ? pool : eligible).sort(() => Math.random() - 0.5).slice(0, 5);
  return chosen.map((t, i) => ({
    id: `tp_off_${t.id}_${i}`,
    teamId: t.id,
    type: 'TRANSFER_PORTAL',
    pitch: `${t.subdivision ?? 'FBS'} ${t.conference} · Projected ${save.player.starRating >= 3.5 ? 'Captain' : 'Starter'}`,
    role: save.player.starRating >= 3.5 ? 'Captain' : 'Starter',
    salaryOrNil: Math.round((t.subdivision === 'FCS' ? 8500 : 18500) * t.prestige + save.player.starRating * 12000),
    years: 2,
    tdBonus: t.subdivision === 'FCS' ? 450 : 1000,
  }));
}

export interface DraftBoardPick {
  round: number;
  pickInRound: number;
  overall: number;
  teamId: string;
  isUserPick: boolean;
  prospectName: string;
  prospectPos: Position;
  prospectSchool: string;
}

export function evaluateCollegeDraftStock(
  save: CareerSave,
  combineClicks: number
): {
  round: number;
  overall: number;
  teamId: string;
  fortyYard: number;
  benchReps: number;
  shuttle: number;
  gradeScore: number;
  report: string;
} {
  const col = save.careerByEra.COLLEGE;
  const games = Math.max(1, col.games);
  const myTeam = getTeamById(save.teamId);
  const pos = save.player.position;
  let prod = 0;

  if (pos === 'QB') {
    prod = (col.passYards / games) * 0.11 + ((col.passTD + col.rushTD) / games) * 6.5 - col.interceptions * 0.7;
  } else if (pos === 'RB' || pos === 'WR' || pos === 'TE') {
    prod = ((col.rushYards + col.recYards) / games) * 0.22 + ((col.rushTD + col.recTD) / games) * 7.5;
  } else if (pos === 'OL') {
    prod = (col.blocks / games) * 4.5 + (col.pancakes / games) * 9 - (col.sacksAllowed / games) * 4;
  } else if (pos === 'K') {
    prod = (col.fgAtt > 0 ? col.fgMade / col.fgAtt : 0.75) * 20 + (col.fgLong >= 48 ? 8 : 0);
  } else {
    prod = (col.tackles / games) * 3.8 + ((col.sacks * 2.4 + col.defInt * 3 + col.tfl * 1.4) / games) * 8;
  }

  const levelAdj = myTeam.subdivision === 'FCS' ? -5 : myTeam.prestige >= 4 ? 5 : 0;
  const natTitleBonus = save.trophies.some((t) => t.includes('National Champions')) ? 8 : 0;
  const allAmBonus = save.history.some((h) => h.awards.some((a) => a.includes('All-American'))) ? 6 : 0;
  const combineBonus = Math.min(18, combineClicks * 0.55);
  const gradeScore = Math.max(
    18,
    Math.min(100, Math.round(save.player.starRating * 8.5 + prod + levelAdj + natTitleBonus + allAmBonus + combineBonus))
  );

  const round =
    gradeScore >= 82 ? 1 :
    gradeScore >= 68 ? 2 :
    gradeScore >= 56 ? 3 :
    gradeScore >= 45 ? 4 :
    gradeScore >= 36 ? 5 :
    gradeScore >= 28 ? 6 : 7;

  const slotInRound = Math.max(1, Math.min(32, Math.round(32 - ((gradeScore % 14) / 14) * 30)));
  const overall = (round - 1) * 32 + slotInRound;
  const draftTeam = NFL_TEAMS[Math.floor(Math.random() * NFL_TEAMS.length)];

  const fortyYard = Math.round((4.88 - Math.min(0.58, (combineClicks * 0.5 + save.player.attributes.speed * 3.2) * 0.011)) * 100) / 100;
  const benchReps = Math.round(14 + save.player.attributes.strength * 1.9 + combineClicks * 0.25);
  const shuttle = Math.round((4.36 - save.player.attributes.speed * 0.032) * 100) / 100;

  const report =
    round === 1
      ? `First-round franchise cornerstone out of ${myTeam.shortName} (${myTeam.conference}).`
      : round <= 3
        ? `Day 2 starter-grade prospect from ${myTeam.name}.`
        : `High-upside Day 3 value pick ready to compete in NFL camp.`;

  return { round, overall, teamId: draftTeam.id, fortyYard, benchReps, shuttle, gradeScore, report };
}

export function generateDraftOrderBoard(
  save: CareerSave,
  userDraft: { round: number; pick: number; teamId: string }
): DraftBoardPick[] {
  const draftPositions: Position[] = ['QB', 'WR', 'DL', 'CB', 'OL', 'RB', 'LB', 'TE', 'S', 'K'];
  const collegeNames = COLLEGE_TEAMS.filter((c) => c.subdivision !== 'FCS').map((c) => c.shortName);
  const board: DraftBoardPick[] = [];
  for (let overall = 1; overall <= 224; overall++) {
    const round = Math.floor((overall - 1) / 32) + 1;
    const pickInRound = ((overall - 1) % 32) + 1;
    const isUser = overall === userDraft.pick;
    const team = isUser
      ? getTeamById(userDraft.teamId)
      : NFL_TEAMS[(overall * 7 + save.seasonNumber * 3) % NFL_TEAMS.length];
    board.push({
      round,
      pickInRound,
      overall,
      teamId: team.id,
      isUserPick: isUser,
      prospectName: isUser
        ? `${save.player.firstName} ${save.player.lastName}`
        : `${FIRST_NAMES[(overall * 5) % FIRST_NAMES.length]} ${LAST_NAMES[(overall * 11) % LAST_NAMES.length]}`,
      prospectPos: isUser ? save.player.position : draftPositions[(overall * 3) % draftPositions.length],
      prospectSchool: isUser
        ? getTeamById(save.teamId).shortName
        : collegeNames[(overall * 13) % collegeNames.length] ?? 'UGA',
    });
  }
  return board;
}

export function getPlayerLegacyScore(save: CareerSave): number {
  const st = save.careerStats;
  const yds = st.passYards + st.rushYards + st.recYards;
  const tds = st.passTD + st.rushTD + st.recTD;
  const defPts = st.tackles * 1.8 + st.sacks * 12 + st.defInt * 18 + st.passDeflections * 5 + st.tfl * 6;
  const stPts = st.fgMade * 7 + st.xpMade * 2 + (st.fgLong >= 50 ? 25 : 0);
  const olPts = st.blocks * 4 + st.pancakes * 11;
  const titles = save.trophies.length * 140;
  const nflRings = save.trophies.filter((t) => t.includes('Retro Bowl')).length * 220;
  const mvps = st.mvpAwards * 85;
  const eraBonus = save.era === 'NFL' || save.era === 'RETIRED' ? 180 : save.era === 'COLLEGE' ? 75 : 20;
  return Math.max(
    100,
    Math.round(
      100 +
        save.player.starRating * 45 +
        yds * 0.045 +
        tds * 9 +
        defPts +
        stPts +
        olPts +
        titles +
        nflRings +
        mvps +
        eraBonus
    )
  );
}

export function generateNflFreeAgencyOffers(starRating: number, currentTeamId: string): OfferOption[] {
  const pool = NFL_TEAMS.filter((t) => t.id !== currentTeamId).sort(() => Math.random() - 0.5).slice(0, 5);
  return pool.map((t, i) => ({
    id: `nfl_fa_${t.id}_${i}`,
    teamId: t.id,
    type: 'NFL_CONTRACT',
    pitch: `${t.division} Contender · Guaranteed Starting Role`,
    role: starRating >= 4.0 ? 'Franchise Star' : 'Starter',
    salaryOrNil: Math.round((starRating * 4200000) + Math.random() * 2500000),
    years: 3 + (i % 2),
    tdBonus: Math.round(25000 + starRating * 10000),
  }));
}

export function startNextSeasonSameTeam(save: CareerSave, newTeamId?: string, newEra?: Exclude<CareerEra, 'RETIRED'>): CareerSave {
  const next: CareerSave = JSON.parse(JSON.stringify(save));
  const targetEra = newEra ?? (next.era === 'RETIRED' ? 'NFL' : next.era);
  const targetTeamId = newTeamId ?? next.teamId;
  const team = getTeamById(targetTeamId);

  next.era = targetEra;
  next.seasonNumber += 1;
  next.eraYear = newEra ? 1 : next.eraYear + 1;
  next.player.age += 1;
  next.teamId = targetTeamId;
  next.week = 1;
  next.phase = 'REGULAR_SEASON';
  next.pendingOffers = [];
  next.pendingDilemma = null;
  next.player.condition = 100;
  next.seasonStats = emptyStats();
  next.weeklyTrainingDone = false;
  next.weeklyMeetingDone = false;

  if (newTeamId || newEra) {
    next.coaches = generateCoaches(targetEra);
    next.roster = generateRoster(targetEra, next.player.position, team);
    // Moving up an era unlocks higher athletic ceilings as your body matures
    if (newEra === 'COLLEGE' || newEra === 'NFL') {
      next.player.maxAttributes = {
        speed: Math.min(10, next.player.maxAttributes.speed + 1),
        strength: Math.min(10, next.player.maxAttributes.strength + 1),
        stamina: Math.min(10, next.player.maxAttributes.stamina + 1),
        skill: 10,
      };
    }
  } else {
    // Realistic offseason teammate development & veteran regression
    next.roster = next.roster.map((tm) => {
      const nextAge = tm.age + 1;
      let nextAttrs = tm.attributes ? { ...tm.attributes } : undefined;
      let nextRating = tm.rating;

      if (nextAttrs && tm.maxAttributes) {
        if (nextAge <= 26) {
          // Young players develop 1-2 bars toward their potential ceiling
          const upgrades = nextAge <= 23 ? 2 : 1;
          for (let u = 0; u < upgrades; u++) {
            const room = (['skill', 'speed', 'strength', 'stamina'] as const).filter(
              (k) => nextAttrs![k] < tm.maxAttributes![k]
            );
            if (room.length > 0) {
              const k = room[Math.floor(Math.random() * room.length)];
              nextAttrs[k] += 1;
            }
          }
        } else if (nextAge >= 31) {
          // Aging veterans gradually lose speed & stamina like Retro Bowl
          if (nextAttrs.speed > 2 && Math.random() < 0.65) nextAttrs.speed -= 1;
          if (nextAttrs.stamina > 2 && Math.random() < 0.55) nextAttrs.stamina -= 1;
        }
        nextRating = calculateStarRating(nextAttrs, tm.position);
      }

      return {
        ...tm,
        age: nextAge,
        attributes: nextAttrs,
        rating: nextRating,
        isStar: nextRating >= 3.5,
        morale: Math.max(55, Math.min(92, tm.morale + (nextAge <= 26 ? 6 : 0))),
        condition: 100,
        stats: { yards: 0, tds: 0, tackles: 0 },
      };
    });
  }

  const { schedule, standings } = generateSchedule(targetEra, targetTeamId, next.selectedState);
  next.schedule = schedule;
  next.totalWeeks = schedule.length;
  next.standings = standings;

  next.newsFeed.unshift({
    id: `ns_${Date.now()}`,
    week: 1,
    headline: `Season ${next.seasonNumber} Kicks Off with ${team.name}`,
    body: `${next.player.firstName} ${next.player.lastName} enters Year ${next.eraYear} (${targetEra.replace('_', ' ')}) rated ${next.player.starRating.toFixed(1)}★.`,
  });

  return next;
}
