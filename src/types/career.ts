export type Position =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'OL'
  | 'DL'
  | 'LB'
  | 'CB'
  | 'S'
  | 'K';

export type CareerEra = 'HIGH_SCHOOL' | 'COLLEGE' | 'NFL' | 'RETIRED';

export type Archetype =
  | 'Pocket Passer'
  | 'Dual-Threat'
  | 'Gunslinger'
  | 'Elusive Back'
  | 'Power Back'
  | 'Receiving Back'
  | 'Deep Threat'
  | 'Route Technician'
  | 'Playmaker'
  | 'Vertical Threat'
  | 'Blocking TE'
  | 'Road Grader'
  | 'Pass Protector'
  | 'Speed Rusher'
  | 'Power Interior'
  | 'Field General'
  | 'Pass Rush OLB'
  | 'Lockdown Corner'
  | 'Ball Hawk'
  | 'Box Safety'
  | 'Big Leg';

export interface UniformSet {
  helmet: string;
  logo: string;
  shirt: string;
  sleeve: string;
  pants: string;
  stripe: string;
  socks1: string;
  socks2: string;
}

export interface TeamUniforms {
  home: UniformSet;
  away: UniformSet;
  alt: UniformSet;
  endzone: string;
}

export interface LeagueTeam {
  id: string;
  name: string;
  shortName: string;
  mascot: string;
  city: string;
  state?: string;
  conference: string;
  division: string;
  era: Exclude<CareerEra, 'RETIRED'>;
  offense: number; // 1-10
  defense: number; // 1-10
  prestige: number; // 1-5 stars
  roof: number; // 0 outdoor, 1 dome, 2 retractable
  rainfall: number;
  snowfall: number;
  uniforms: TeamUniforms;
  rivalId?: string;
  stadium?: string;
}

export interface PlayerAttributes {
  speed: number;    // 1-10
  strength: number; // 1-10
  stamina: number;  // 1-10
  skill: number;    // 1-10 (Throwing, Catching, Blocking, Tackling, Kicking)
}

export interface PlayerRelationships {
  coach: number;     // 0-100
  teammates: number; // 0-100
  fans: number;      // 0-100
  agent: number;     // 0-100 (Family/Agent)
  gpa: number;       // 0.0-4.0 (used in HS & College)
}

export interface StatLine {
  games: number;
  passAtt: number;
  passComp: number;
  passYards: number;
  passTD: number;
  interceptions: number;
  rushAtt: number;
  rushYards: number;
  rushTD: number;
  receptions: number;
  targets: number;
  recYards: number;
  recTD: number;
  blocks: number;
  pancakes: number;
  sacksAllowed: number;
  tackles: number;
  tfl: number;
  sacks: number;
  defInt: number;
  passDeflections: number;
  forcedFumbles: number;
  fgMade: number;
  fgAtt: number;
  fgLong: number;
  xpMade: number;
  xpAtt: number;
  fumbles: number;
  longestPlay: number;
  mvpAwards: number;
}

export interface Teammate {
  id: string;
  name: string;
  position: Position;
  jersey: number;
  age: number;
  rating: number; // 1-5 stars in 0.5 steps
  potential: number;
  morale: number; // 0-100
  condition: number; // 0-100
  faceId: number;
  skinTone: string;
  hairColor: string;
  isStar: boolean;
  stats: {
    yards: number;
    tds: number;
    tackles: number;
  };
}

export interface Coordinator {
  name: string;
  role: 'OF' | 'DF' | 'HC';
  rating: number; // 1-5 stars
  trait: string;
  age: number;
}

export type WeatherType = 'SUN' | 'RAIN' | 'SNOW' | 'WIND' | 'FOG' | 'STORM' | 'BLIZZARD';

export interface ScheduleGame {
  week: number;
  opponentId: string;
  isHome: boolean;
  isPlayoff?: boolean;
  playoffRoundName?: string;
  played: boolean;
  playerTeamScore?: number;
  opponentScore?: number;
  weather: WeatherType;
  playerSummary?: string;
  gameRating?: number; // 1-10
}

export interface StandingsRow {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface DilemmaChoice {
  id: string;
  label: string;
  summary: string;
  effects: {
    coach?: number;
    teammates?: number;
    fans?: number;
    agent?: number;
    gpa?: number;
    morale?: number;
    condition?: number;
    cash?: number;
    xp?: number;
    starBoost?: number;
  };
  outcomeText: string;
}

export interface DilemmaEvent {
  id: string;
  title: string;
  category: 'LOCKER_ROOM' | 'COACH' | 'MEDIA' | 'NIL_FINANCE' | 'ACADEMICS' | 'DISCIPLINE' | 'CAREER';
  prompt: string;
  choices: [DilemmaChoice, DilemmaChoice];
}

export interface ShoppingItem {
  id: number;
  name: string;
  category: 'ITEMS' | 'VEHICLES' | 'PROPERTY';
  price: number;
  happinessBoost: number;
  upkeep: number;
  owned: boolean;
  condition: number;
}

export interface ContractInfo {
  salaryPerYear: number; // In $K for NIL, $M for NFL, $0 for HS
  tdBonus: number;
  yearsLeft: number;
  role: 'Backup' | 'Starter' | 'Captain' | 'Franchise Star';
  nilDeals: string[];
}

export interface CareerMilestone {
  season: number;
  era: CareerEra;
  teamName: string;
  record: string;
  finish: string;
  highlights: string;
  awards: string[];
}

export interface OfferOption {
  id: string;
  teamId: string;
  type: 'SCHOLARSHIP' | 'TRANSFER_PORTAL' | 'NFL_CONTRACT' | 'NFL_TRADE';
  pitch: string;
  role: 'Backup' | 'Starter' | 'Captain' | 'Franchise Star';
  salaryOrNil: number;
  years: number;
  tdBonus: number;
}

export interface PlayerProfile {
  firstName: string;
  lastName: string;
  jersey: number;
  position: Position;
  archetype: Archetype;
  height: string;
  weight: number;
  age: number;
  faceStyle: number;
  skinTone: string;
  hairColor: string;
  homeState: string;
  highSchoolId: string;
  starRating: number; // 1.0 - 5.0
  recruitingStars: number; // 2 - 5
  level: number;
  xp: number;
  xpToNext: number;
  skillPoints: number;
  attributes: PlayerAttributes;
  maxAttributes: PlayerAttributes;
  trainingProgress?: Record<keyof PlayerAttributes, number>;
  condition: number; // 0-100
  morale: number; // 0-100
  injuryWeeks: number;
  injuryType: string;
  traits: string[];
  relationships: PlayerRelationships;
  cash: number;
  nrgDrinks: number;
  ownedItemIds: number[];
  contract: ContractInfo;
}

export interface CareerSave {
  id: string;
  createdAt: number;
  updatedAt: number;
  era: CareerEra;
  seasonNumber: number; // Overall season #
  eraYear: number;      // e.g. Junior (1) / Senior (2) in HS, Fr/So/Jr/Sr in College, Yr 1..15 in NFL
  week: number;
  totalWeeks: number;
  phase:
    | 'REGULAR_SEASON'
    | 'PLAYOFFS'
    | 'OFFSEASON_RECRUITING'
    | 'OFFSEASON_PORTAL_OR_DRAFT'
    | 'NFL_COMBINE'
    | 'NFL_DRAFT_DAY'
    | 'OFFSEASON_FREE_AGENCY'
    | 'HALL_OF_FAME';
  selectedState: string;
  teamId: string;
  player: PlayerProfile;
  roster: Teammate[];
  coaches: {
    hc: Coordinator;
    of: Coordinator;
    df: Coordinator;
  };
  schedule: ScheduleGame[];
  standings: Record<string, StandingsRow>;
  seasonStats: StatLine;
  careerStats: StatLine;
  careerByEra: {
    HIGH_SCHOOL: StatLine;
    COLLEGE: StatLine;
    NFL: StatLine;
  };
  history: CareerMilestone[];
  trophies: string[];
  achievements: string[];
  newsFeed: { id: string; week: number; headline: string; body: string }[];
  pendingDilemma: DilemmaEvent | null;
  pendingOffers: OfferOption[];
  combineScore?: {
    fortyYard: number;
    benchReps: number;
    shuttle: number;
    draftRoundProj: number;
  };
  draftInfo?: {
    round: number;
    pick: number;
    teamId: string;
  };
  weeklyTrainingDone: boolean;
  weeklyMeetingDone: boolean;
  uniformChoice: 'home' | 'away' | 'alt';
  difficulty: 'Dynamic' | 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  quarterLength: 1 | 2 | 3;
  driveDirection?: 'RIGHT' | 'LEFT' | 'BOTH';
}
