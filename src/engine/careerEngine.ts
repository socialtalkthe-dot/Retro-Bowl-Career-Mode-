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
  HIGH_SCHOOL_TEAMS,
  NFL_TEAMS,
} from '../data/teams';
import { generatePlayerDilemma } from '../data/dilemmas';

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

  return {
    attrs: { speed, strength, stamina, skill },
    max: {
      speed: Math.min(10, speed + 4),
      strength: Math.min(10, strength + 4),
      stamina: Math.min(10, stamina + 5),
      skill: 10,
    },
  };
}

export function calculateStarRating(attrs: PlayerAttributes): number {
  const avg = (attrs.speed + attrs.strength + attrs.stamina + attrs.skill) / 4;
  return Math.round(Math.min(5, Math.max(1, avg / 2)) * 2) / 2;
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

  const baseAge = era === 'HIGH_SCHOOL' ? 16 : era === 'COLLEGE' ? 19 : 24;

  return slots.map((pos, idx) => {
    const teamRating = (team.offense + team.defense) / 4; // ~2.5 - 5.0
    const rating = Math.round(Math.min(5, Math.max(2, teamRating + (Math.random() * 1.4 - 0.7))) * 2) / 2;
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
      age: baseAge + Math.floor(Math.random() * (era === 'NFL' ? 7 : 3)),
      rating,
      potential: Math.min(5, rating + (Math.random() > 0.5 ? 0.5 : 0)),
      morale: 68 + Math.floor(Math.random() * 25),
      condition: 82 + Math.floor(Math.random() * 18),
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
    // 12-game FBS regular season:
    // SEC / ACC: 8 conference + 4 non-conference
    // Big Ten / Big 12: 9 conference + 3 non-conference
    // Independents / AAC / MW: rival + 11 unique national FBS opponents
    const sameConf = shuffleArr(others.filter((t) => t.conference === myTeam.conference));
    const nonConfPool = shuffleArr(others.filter((t) => t.conference !== myTeam.conference));
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
      // Include rival if non-conf
      const rival = nonConfPool.find((t) => t.id === myTeam.rivalId);
      if (rival && !usedIds.has(rival.id)) {
        usedIds.add(rival.id);
        nonConfGames.push({ opp: rival, isHome: Math.random() > 0.5, tag: 'RIVAL' });
      }
      for (const opp of nonConfPool) {
        if (confGames.length + nonConfGames.length >= 12) break;
        if (usedIds.has(opp.id)) continue;
        usedIds.add(opp.id);
        nonConfGames.push({ opp, isHome: nonConfGames.length % 2 === 0, tag: 'NONCONF' });
      }
    } else {
      // Independents / G5: play same-conf opponents + rival + marquee FBS slate (12 unique)
      sameConf.forEach((opp, idx) => {
        usedIds.add(opp.id);
        confGames.push({ opp, isHome: idx % 2 === 0, tag: 'CONF' });
      });
      const rival = nonConfPool.find((t) => t.id === myTeam.rivalId);
      if (rival && !usedIds.has(rival.id)) {
        usedIds.add(rival.id);
        nonConfGames.push({ opp: rival, isHome: true, tag: 'RIVAL' });
      }
      for (const opp of nonConfPool) {
        if (confGames.length + nonConfGames.length >= 12) break;
        if (usedIds.has(opp.id)) continue;
        usedIds.add(opp.id);
        nonConfGames.push({ opp, isHome: (confGames.length + nonConfGames.length) % 2 === 0, tag: 'NONCONF' });
      }
    }

    // Place non-conference games early (Weeks 1-3) and rivalry week 12 if non-conf rival exists
    const rivalGame = nonConfGames.find((g) => g.tag === 'RIVAL');
    const earlyNonConf = nonConfGames.filter((g) => g.tag !== 'RIVAL');
    const orderedCol = [...earlyNonConf, ...shuffleArr(confGames)];
    if (rivalGame) orderedCol.push(rivalGame);
    matchups.push(...orderedCol.slice(0, 12));
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
  const { attrs, max } = getBaseAttributes(config.position, config.archetype);

  // Give slightly higher starting attributes if starting directly in College or NFL
  if (era === 'COLLEGE') {
    attrs.speed = Math.min(max.speed, attrs.speed + 1);
    attrs.skill = Math.min(max.skill, attrs.skill + 1);
  } else if (era === 'NFL') {
    attrs.speed = Math.min(max.speed, attrs.speed + 2);
    attrs.strength = Math.min(max.strength, attrs.strength + 1);
    attrs.skill = Math.min(max.skill, attrs.skill + 2);
  }

  const starRating = calculateStarRating(attrs);
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
      skillPoints: era === 'HIGH_SCHOOL' ? 1 : 2,
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
    quarterLength: 2,
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

  // Pair mostly within-conference teams when possible for authentic conference standings
  const paired: [string, string][] = [];
  const remaining = [...shuffled];
  while (remaining.length >= 2) {
    const a = remaining.shift()!;
    const teamA = getTeamById(a);
    let oppIdx = -1;
    if (Math.random() < 0.72) {
      oppIdx = remaining.findIndex((id) => getTeamById(id).conference === teamA.conference);
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

  // Update teammates' simulated season stats
  next.roster = next.roster.map((tm) => {
    const yds = tm.position === 'QB' ? 180 + Math.floor(Math.random() * 110) :
      tm.position === 'RB' || tm.position === 'WR' ? 45 + Math.floor(Math.random() * 70) : 0;
    const tds = yds > 75 && Math.random() > 0.45 ? 1 : 0;
    const tackles = ['DL', 'LB', 'CB', 'S'].includes(tm.position) ? 3 + Math.floor(Math.random() * 6) : 0;
    return {
      ...tm,
      stats: {
        yards: tm.stats.yards + yds,
        tds: tm.stats.tds + tds,
        tackles: tm.stats.tackles + tackles,
      },
    };
  });

  // Balanced XP & Leveling (~1 skill point every 2-3 solid games)
  const earnedXP = Math.round(28 + gameRating * 7.5 + (won ? 18 : 6));
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

  // Condition, Morale, Relationships, Payday
  const staminaFactor = Math.max(0.5, 1.15 - next.player.attributes.stamina * 0.05);
  next.player.condition = Math.max(35, Math.round(next.player.condition - 12 * staminaFactor));
  next.player.morale = Math.min(100, Math.max(15, next.player.morale + (won ? 5 : -4) + (gameRating >= 7 ? 3 : -2)));
  next.player.relationships.coach = Math.min(100, Math.max(10, next.player.relationships.coach + (gameRating >= 7 ? 4 : -2) + (won ? 2 : -1)));
  next.player.relationships.fans = Math.min(100, Math.max(10, next.player.relationships.fans + (won ? 4 : -3) + (gameRating >= 8 ? 4 : 0)));

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

  // Cash payout (NIL / NFL Game Check + TD Bonus)
  const gameTds = (matchStats.passTD ?? 0) + (matchStats.rushTD ?? 0) + (matchStats.recTD ?? 0);
  const gamePay =
    next.era === 'HIGH_SCHOOL'
      ? 50
      : Math.round(next.player.contract.salaryPerYear / next.totalWeeks) +
        gameTds * next.player.contract.tdBonus;
  next.player.cash = Math.max(0, next.player.cash + gamePay);

  // News item
  next.newsFeed.unshift({
    id: `n_${Date.now()}`,
    week: next.week,
    headline: `${team.shortName} ${won ? 'Defeats' : 'Falls to'} ${opp.shortName} (${playerScore}-${oppScore})`,
    body: `${next.player.firstName} ${next.player.lastName} earned a ${gameRating.toFixed(1)}/10 game grade (+${earnedXP} XP${gamePay > 0 ? `, +$${gamePay.toLocaleString()}` : ''}).`,
  });
  next.newsFeed = next.newsFeed.slice(0, 20);

  // Achievements check
  if (won && !next.achievements.includes('First Victory')) next.achievements.push('First Victory');
  if (gameTds >= 3 && !next.achievements.includes('3+ TD Explosion')) next.achievements.push('3+ TD Explosion');
  if ((matchStats.defInt ?? 0) >= 2 && !next.achievements.includes('Ball Hawk (2+ INT)')) next.achievements.push('Ball Hawk (2+ INT)');
  if ((matchStats.sacks ?? 0) >= 2 && !next.achievements.includes('Sack Artist (2+ Sacks)')) next.achievements.push('Sack Artist (2+ Sacks)');
  if ((matchStats.fgLong ?? 0) >= 50 && !next.achievements.includes('50+ Yard Bomb')) next.achievements.push('50+ Yard Bomb');

  // Helper to compute College CFP 12-team field (Major conf champs + top at-large)
  const getCfpField = (): LeagueTeam[] => {
    const natSorted = sortStandingsRows(Object.values(next.standings)).map((r) => getTeamById(r.teamId));
    const majorConfs = ['SEC', 'Big Ten', 'ACC', 'Big 12'];
    const confChamps: LeagueTeam[] = [];
    majorConfs.forEach((cf) => {
      const topTeam = natSorted.find((t) => t.conference === cf);
      if (topTeam) confChamps.push(topTeam);
    });
    const sortedChamps = sortStandingsRows(
      confChamps.map((t) => next.standings[t.id] ?? { teamId: t.id, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 })
    ).map((r) => getTeamById(r.teamId));
    const champIds = new Set(sortedChamps.map((t) => t.id));
    const atLarge = natSorted.filter((t) => !champIds.has(t.id));
    return [...sortedChamps, ...atLarge].slice(0, 12);
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
      const majorConfs = ['SEC', 'Big Ten', 'ACC', 'Big 12'];
      const natSorted = sortStandingsRows(Object.values(next.standings)).map((r) => getTeamById(r.teamId));
      const myNatRank = natSorted.findIndex((t) => t.id === team.id) + 1;

      if (majorConfs.includes(team.conference)) {
        const confSorted = natSorted.filter((t) => t.conference === team.conference);
        const myConfRank = confSorted.findIndex((t) => t.id === team.id) + 1;
        if (myConfRank <= 2) {
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
            body: `Facing #${myConfRank === 1 ? 2 : 1} ${confOpp.name} for the conference crown & CFP bye.`,
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
        // Bowl eligible (6+ wins)
        const bowls = ['Citrus Bowl', 'Alamo Bowl', 'Gator Bowl', 'Holiday Bowl', 'Sun Bowl'];
        const bowlName = bowls[(myNatRank + next.seasonNumber) % bowls.length];
        const bowlOpp =
          natSorted.find((t, idx) => t.id !== team.id && t.conference !== team.conference && Math.abs(idx + 1 - myNatRank) <= 8) ??
          natSorted.find((t) => t.id !== team.id && t.conference !== team.conference) ??
          natSorted[myNatRank] ??
          natSorted[0];
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
    } else {
      // High School: Top 8 in the 20-team State Standings qualify for State Playoffs
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
      !roundName.includes('CFP');

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
      roundName === `${next.selectedState} State Championship`;

    if (isFinalRound) {
      const titleName =
        next.era === 'HIGH_SCHOOL'
          ? `${next.selectedState} State Champions`
          : next.era === 'COLLEGE'
            ? 'CFP National Champions'
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
        // #4/#5/#6/#7 tends to visit #1 or #2; #2/#3 hosts
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
        // Won AFC/NFC Championship -> Retro Bowl Championship vs opposite conference #1/#2 seed
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
      const cfpField = getCfpField();
      const myCfpSeed = cfpField.findIndex((t) => t.id === team.id) + 1;
      const availableCfp = cfpField.filter((t) => t.id !== team.id && !priorPlayoffOppIds.has(t.id));

      if (roundName.endsWith('Championship') && !roundName.includes('National')) {
        // Won Major Conference Championship -> auto Top-4 CFP Seed & Bye straight to Quarterfinal Bowl!
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
        // CFP Semifinal -> CFP National Championship
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
    if (next.eraYear >= 3) {
      // Eligible for Transfer Portal OR NFL Draft!
      next.phase = 'OFFSEASON_PORTAL_OR_DRAFT';
      next.pendingOffers = generateTransferPortalOffers(next.player.starRating, next.teamId);
    } else {
      next.phase = 'OFFSEASON_PORTAL_OR_DRAFT';
      next.pendingOffers = generateTransferPortalOffers(next.player.starRating, next.teamId);
    }
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
    // Kicker
    const fgPct = hs.fgAtt > 0 ? hs.fgMade / hs.fgAtt : 0.7;
    prodPoints = Math.min(48, fgPct * 24 + (hs.fgMade / games) * 8 + (hs.fgLong >= 45 ? 10 : 0));
    highlightsSummary = `${hs.fgMade}/${hs.fgAtt} FG (Long ${hs.fgLong} yds)`;
  }

  const starComponent = save.player.starRating * 6.5; // up to 32.5
  const teamSuccess = winPct * 12 + hsTitles * 8 + allStateCount * 7;
  const gpaAdj = gpa >= 3.2 ? 4 : gpa < 2.2 ? -14 : 0;
  const rawScore = Math.max(20, Math.min(100, Math.round(prodPoints + starComponent + teamSuccess + gpaAdj)));

  let stars = 2;
  if (rawScore >= 76 && gpaEligible) stars = 5;
  else if (rawScore >= 56) stars = 4;
  else if (rawScore >= 38) stars = 3;

  const tierLabel =
    stars === 5
      ? '5★ Five-Star Blue Chip'
      : stars === 4
        ? '4★ National Prospect'
        : stars === 3
          ? '3★ Power/G5 Recruit'
          : '2★ Sleeper Prospect';

  const productionNote = !gpaEligible
    ? `Academic GPA (${gpa.toFixed(2)}) limited top-tier scholarship offers.`
    : hsTitles > 0
      ? `State Championship pedigree & ${highlightsSummary} drove elite D1 demand.`
      : `Evaluation based on ${hs.games} varsity games (${highlightsSummary}) and ${myRow.wins}-${myRow.losses} record.`;

  return { score: rawScore, stars, tierLabel, gpaEligible, highlightsSummary, productionNote };
}

export function generateCollegeOffers(save: CareerSave): OfferOption[] {
  const evalRes = evaluateHighSchoolRecruiting(save);
  const sorted = [...COLLEGE_TEAMS].sort((a, b) => (b.offense + b.defense) - (a.offense + a.defense));
  let pool: LeagueTeam[];

  if (evalRes.stars >= 5 && evalRes.gpaEligible) {
    pool = sorted.slice(0, 14);
  } else if (evalRes.stars >= 4) {
    pool = sorted.slice(8, 30);
  } else if (evalRes.stars >= 3) {
    pool = sorted.slice(20, 42);
  } else {
    pool = sorted.slice(28);
  }

  const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
  return chosen.map((t, i) => {
    const isTopOffer = i === 0;
    const role: OfferOption['role'] =
      evalRes.stars >= 5 || (evalRes.stars >= 4 && t.prestige <= 4) ? 'Starter' : 'Backup';
    const pitch = isTopOffer
      ? `${evalRes.stars}★ HS Tape (${evalRes.highlightsSummary}) · Immediate ${t.conference} Opportunity`
      : role === 'Starter'
        ? `Full-Ride Scholarship + Projected Year-1 Starter · ${t.conference}`
        : `Full-Ride Developmental Scholarship · ${t.conference}`;
    return {
      id: `col_off_${t.id}_${i}`,
      teamId: t.id,
      type: 'SCHOLARSHIP',
      pitch,
      role,
      salaryOrNil: Math.round((t.prestige * 11000) + evalRes.stars * 9500 + (save.player.starRating * 5000)),
      years: 4,
      tdBonus: 400 + t.prestige * 175,
    };
  });
}

export function generateTransferPortalOffers(starRating: number, currentTeamId: string): OfferOption[] {
  const pool = COLLEGE_TEAMS.filter((t) => t.id !== currentTeamId).sort(() => Math.random() - 0.5).slice(0, 5);
  return pool.map((t, i) => ({
    id: `tp_off_${t.id}_${i}`,
    teamId: t.id,
    type: 'TRANSFER_PORTAL',
    pitch: `NIL Package + Starting Job in ${t.conference}`,
    role: starRating >= 3.5 ? 'Captain' : 'Starter',
    salaryOrNil: Math.round(t.prestige * 18000 + starRating * 15000),
    years: 2,
    tdBonus: 1000,
  }));
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
    // Refresh teammates condition & age
    next.roster = next.roster.map((tm) => ({
      ...tm,
      age: tm.age + 1,
      condition: 100,
      stats: { yards: 0, tds: 0, tackles: 0 },
    }));
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
