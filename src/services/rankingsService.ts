import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { CareerSave, Position } from '../types/career';

export type RankLeague =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'All-Pro'
  | 'Retro Legend';

export type GlobalRegion = 'US' | 'INTL';

export interface RankingProfile {
  uid: string;
  displayName: string;
  region: GlobalRegion;
  countryCode: string;
  favoriteTeamId: string;
  onlineElo: number;
  onlineWins: number;
  onlineLosses: number;
  onlineLeague: RankLeague;
  legacyScore: number;
  careerLeague: RankLeague;
  careerTitles: number;
  careerYards: number;
  careerTDs: number;
  careerGames: number;
  position: Position;
  starRating: number;
  isPublic: boolean;
}

export function getEloLeague(elo: number): RankLeague {
  if (elo >= 2200) return 'Retro Legend';
  if (elo >= 1900) return 'All-Pro';
  if (elo >= 1650) return 'Diamond';
  if (elo >= 1400) return 'Platinum';
  if (elo >= 1200) return 'Gold';
  if (elo >= 1050) return 'Silver';
  return 'Bronze';
}

export function getCareerLeague(legacyScore: number): RankLeague {
  if (legacyScore >= 45000) return 'Retro Legend';
  if (legacyScore >= 28000) return 'All-Pro';
  if (legacyScore >= 15000) return 'Diamond';
  if (legacyScore >= 8000) return 'Platinum';
  if (legacyScore >= 4000) return 'Gold';
  if (legacyScore >= 1500) return 'Silver';
  return 'Bronze';
}

export function getLeagueBadgeColor(league: RankLeague): string {
  switch (league) {
    case 'Retro Legend':
      return 'bg-[#eab308]/25 border-[#fde047] text-[#fde047]';
    case 'All-Pro':
      return 'bg-[#ef4444]/20 border-[#f87171] text-[#fca5a5]';
    case 'Diamond':
      return 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#7dd3fc]';
    case 'Platinum':
      return 'bg-[#a855f7]/20 border-[#c084fc] text-[#e9d5ff]';
    case 'Gold':
      return 'bg-[#f59e0b]/20 border-[#fbbf24] text-[#fde68a]';
    case 'Silver':
      return 'bg-slate-400/20 border-slate-300 text-slate-200';
    default:
      return 'bg-amber-900/30 border-amber-700 text-amber-300';
  }
}

export function calculateLegacyScore(save: CareerSave | null): number {
  if (!save) return 0;
  const c = save.careerStats;
  const yards = c.passYards + c.rushYards + c.recYards;
  const tds = c.passTD + c.rushTD + c.recTD;
  const defImpact = c.tackles * 18 + c.sacks * 110 + c.defInt * 160 + c.tfl * 45 + c.forcedFumbles * 140;
  const kickImpact = c.fgMade * 85 + c.xpMade * 15;
  const olImpact = c.blocks * 22 + c.pancakes * 95;
  const titlesScore = save.trophies.length * 1400;
  const mvpScore = c.mvpAwards * 1200;
  const eraBonus =
    save.era === 'RETIRED' ? 3500 : save.era === 'NFL' ? 1800 : save.era === 'COLLEGE' ? 750 : 200;
  const wins = save.history.reduce((acc, h) => {
    const w = parseInt(h.record.split('-')[0] || '0', 10);
    return acc + (Number.isFinite(w) ? w : 0);
  }, 0);
  const raw =
    Math.round(yards * 0.45) +
    tds * 95 +
    defImpact +
    kickImpact +
    olImpact +
    titlesScore +
    mvpScore +
    eraBonus +
    wins * 140 +
    Math.round(save.player.starRating * 300);
  return Math.max(0, Math.min(100000, Math.round(raw)));
}

export function calculateNewElo(
  myElo: number,
  oppElo: number,
  won: boolean,
  margin: number
): number {
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const actual = won ? 1 : 0;
  const marginMult = 1 + Math.min(0.45, Math.abs(margin) * 0.02);
  const delta = Math.round(32 * marginMult * (actual - expected));
  return Math.max(100, Math.min(4000, myElo + delta));
}

function sanitizeCountryCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  return cleaned.length >= 2 ? cleaned : 'US';
}

function sanitizeDisplayName(raw: string): string {
  const cleaned = raw.trim().slice(0, 40);
  return cleaned.length > 0 ? cleaned : 'Player';
}

export async function fetchGlobalRankings(regionFilter: 'ALL' | GlobalRegion = 'ALL'): Promise<RankingProfile[]> {
  const path = 'rankings';
  try {
    const q = query(
      collection(db, path),
      where('isPublic', '==', true),
      limit(100)
    );
    const snap = await getDocs(q);
    const rows: RankingProfile[] = [];
    snap.forEach((d) => {
      const data = d.data() as RankingProfile;
      if (regionFilter === 'ALL' || data.region === regionFilter) {
        rows.push(data);
      }
    });
    return rows;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchMyRankingProfile(uid: string): Promise<RankingProfile | null> {
  const path = `rankings/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'rankings', uid));
    if (!snap.exists()) return null;
    return snap.data() as RankingProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function upsertMyRankingProfile(params: {
  displayName: string;
  region: GlobalRegion;
  countryCode: string;
  save: CareerSave | null;
  onlineEloDelta?: { won: boolean; oppElo: number; margin: number };
}): Promise<RankingProfile | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;

  const uid = user.uid;
  const rankPath = `rankings/${uid}`;
  const privPath = `users/${uid}/private/profile`;

  let existing: RankingProfile | null = null;
  try {
    const existingSnap = await getDoc(doc(db, 'rankings', uid));
    if (existingSnap.exists()) {
      existing = existingSnap.data() as RankingProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, rankPath);
  }

  let onlineElo = existing?.onlineElo ?? 1000;
  let onlineWins = existing?.onlineWins ?? 0;
  let onlineLosses = existing?.onlineLosses ?? 0;

  if (params.onlineEloDelta) {
    onlineElo = calculateNewElo(
      onlineElo,
      params.onlineEloDelta.oppElo,
      params.onlineEloDelta.won,
      params.onlineEloDelta.margin
    );
    if (params.onlineEloDelta.won) onlineWins += 1;
    else onlineLosses += 1;
  }

  const save = params.save;
  const legacyFromSave = calculateLegacyScore(save);
  const legacyScore = Math.max(existing?.legacyScore ?? 0, legacyFromSave);
  const careerTitles = Math.max(existing?.careerTitles ?? 0, save?.trophies.length ?? 0);
  const careerYards = Math.max(
    existing?.careerYards ?? 0,
    save ? save.careerStats.passYards + save.careerStats.rushYards + save.careerStats.recYards : 0
  );
  const careerTDs = Math.max(
    existing?.careerTDs ?? 0,
    save ? save.careerStats.passTD + save.careerStats.rushTD + save.careerStats.recTD : 0
  );
  const careerGames = Math.max(existing?.careerGames ?? 0, save?.careerStats.games ?? 0);

  const countryCode = sanitizeCountryCode(params.countryCode || (params.region === 'US' ? 'US' : 'CA'));
  const region: GlobalRegion = countryCode === 'US' ? 'US' : params.region;

  const payload = {
    uid,
    displayName: sanitizeDisplayName(params.displayName || user.displayName || 'Player'),
    region,
    countryCode,
    favoriteTeamId: (save?.teamId || existing?.favoriteTeamId || 'kc').slice(0, 64),
    onlineElo: Math.max(100, Math.min(4000, Math.round(onlineElo))),
    onlineWins: Math.max(0, Math.min(100000, Math.round(onlineWins))),
    onlineLosses: Math.max(0, Math.min(100000, Math.round(onlineLosses))),
    onlineLeague: getEloLeague(onlineElo),
    legacyScore: Math.max(0, Math.min(100000, Math.round(legacyScore))),
    careerLeague: getCareerLeague(legacyScore),
    careerTitles: Math.max(0, Math.min(100, Math.round(careerTitles))),
    careerYards: Math.max(0, Math.min(500000, Math.round(careerYards))),
    careerTDs: Math.max(0, Math.min(5000, Math.round(careerTDs))),
    careerGames: Math.max(0, Math.min(1000, Math.round(careerGames))),
    position: (save?.player.position || existing?.position || 'QB') as Position,
    starRating: Math.max(1, Math.min(5, Number((save?.player.starRating ?? existing?.starRating ?? 3.0).toFixed(1)))),
    isPublic: true,
    createdAt: existing ? (existing as RankingProfile & { createdAt: unknown }).createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'rankings', uid), payload);
  } catch (err) {
    handleFirestoreError(err, existing ? OperationType.UPDATE : OperationType.CREATE, rankPath);
  }

  // Keep owner-only private PII isolated in /users/{uid}/private/profile
  try {
    const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'profile'));
    const privPayload = {
      uid,
      email: (user.email || 'player@retrobowl.app').slice(0, 120),
      preferredRegion: region,
      createdAt: privSnap.exists() ? privSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid, 'private', 'profile'), privPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, privPath);
  }

  return payload as unknown as RankingProfile;
}

export async function recordOnlineMatchResult(params: {
  matchId: string;
  mode: 'COOP_VS_PVP' | 'SOLO_PVP';
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  participantUids: string[];
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const cleanMatchId = params.matchId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  if (!cleanMatchId) return;

  const uniqueParticipants = Array.from(
    new Set([user.uid, ...params.participantUids.filter((id) => /^[a-zA-Z0-9_-]{1,128}$/.test(id))])
  ).slice(0, 10);

  const path = `onlineMatches/${cleanMatchId}`;
  try {
    await setDoc(doc(db, 'onlineMatches', cleanMatchId), {
      matchId: cleanMatchId,
      hostUid: user.uid,
      mode: params.mode,
      homeTeamName: params.homeTeamName.trim().slice(0, 48) || 'Home',
      awayTeamName: params.awayTeamName.trim().slice(0, 48) || 'Away',
      homeScore: Math.max(0, Math.min(200, Math.round(params.homeScore))),
      awayScore: Math.max(0, Math.min(200, Math.round(params.awayScore))),
      participantUids: uniqueParticipants,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
