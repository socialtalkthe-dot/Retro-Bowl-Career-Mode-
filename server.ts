import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';

type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S' | 'K';
type TeamSide = 'MY' | 'OPP';
type MemberSide = TeamSide | 'SPECTATOR';
type RoomMode = 'SOLO' | 'COOP';
type MatchPrefMode = 'ANY' | 'COOP' | 'SOLO';
type RoomStatus = 'LOBBY' | 'LIVE' | 'FINAL';
type WeatherType = 'SUN' | 'RAIN' | 'SNOW' | 'WIND' | 'STORM' | 'FOG' | 'BLIZZARD';

const VALID_POSITIONS = new Set<Position>(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']);
const VALID_WEATHERS = new Set<WeatherType>(['SUN', 'RAIN', 'SNOW', 'WIND', 'STORM', 'FOG', 'BLIZZARD']);
const QUICKMATCH_TEAMS = ['kc', 'phi', 'buf', 'sf', 'bal', 'det', 'cin', 'dal', 'min', 'mia', 'gb', 'hou'];

interface RoomMember {
  clientId: string;
  uid?: string;
  name: string;
  elo: number;
  side: MemberSide;
  position?: Position;
}

interface RoomChatMessage {
  id: string;
  senderName: string;
  side: MemberSide;
  position?: Position;
  text: string;
  ts: number;
  isSystem?: boolean;
}

interface RoomRecord {
  code: string;
  name: string;
  isPublic: boolean;
  matchmakingOpen: boolean;
  mode: RoomMode;
  status: RoomStatus;
  quarterLength: 2 | 2.5 | 3;
  teamAId: string;
  teamBId: string;
  weather: WeatherType;
  hostClientId: string;
  quarter: number;
  clockSec: number;
  myScore: number;
  oppScore: number;
  possession: TeamSide;
  ballYard: number;
  down: number;
  yardsToGo: number;
  playSeed: number;
  latestPlay: string;
  members: RoomMember[];
  chat: RoomChatMessage[];
  createdAt: number;
}

interface ClientSocketMeta {
  ws: WebSocket;
  clientId: string;
  uid?: string;
  name: string;
  elo: number;
  roomCode: string | null;
  isAlive: boolean;
}

interface MatchmakingEntry {
  clientId: string;
  preferredMode: MatchPrefMode;
  preferredPosition?: Position;
  queuedAt: number;
}

interface StoredAccount {
  id: string;
  username: string;
  usernameLower: string;
  displayName: string;
  passwordSalt: string;
  passwordHash: string;
  region: 'US' | 'INTL';
  countryCode: string;
  favoriteTeamId: string;
  onlineElo: number;
  onlineWins: number;
  onlineLosses: number;
  legacyScore: number;
  careerTitles: number;
  careerYards: number;
  careerTDs: number;
  careerGames: number;
  position: Position;
  starRating: number;
  saves: unknown[];
  createdAt: number;
  updatedAt: number;
}

interface AccountStoreFile {
  tokenSecret: string;
  accounts: StoredAccount[];
}

const DATA_DIR = path.resolve('data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

function loadAccountStore(): AccountStoreFile {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')) as AccountStoreFile;
      if (parsed && Array.isArray(parsed.accounts) && typeof parsed.tokenSecret === 'string') {
        return parsed;
      }
    }
  } catch {
    // Fall back to fresh store
  }
  return {
    tokenSecret: crypto.randomBytes(32).toString('hex'),
    accounts: [],
  };
}

const accountStore: AccountStoreFile = loadAccountStore();

function persistAccountStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${ACCOUNTS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(accountStore, null, 2), 'utf8');
    fs.renameSync(tmp, ACCOUNTS_FILE);
  } catch (err) {
    console.error('Failed to persist accounts:', err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function signAccountToken(accountId: string): string {
  const payload = Buffer.from(JSON.stringify({ id: accountId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', accountStore.tokenSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAccountToken(token: string | undefined): StoredAccount | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.', 2);
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', accountStore.tokenSecret).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { id?: string };
    if (!decoded.id) return null;
    return accountStore.accounts.find((acc) => acc.id === decoded.id) ?? null;
  } catch {
    return null;
  }
}

function getLeagueFromElo(elo: number): string {
  if (elo >= 2200) return 'Retro Legend';
  if (elo >= 1900) return 'All-Pro';
  if (elo >= 1650) return 'Diamond';
  if (elo >= 1400) return 'Platinum';
  if (elo >= 1200) return 'Gold';
  if (elo >= 1050) return 'Silver';
  return 'Bronze';
}

function getLeagueFromLegacy(legacy: number): string {
  if (legacy >= 45000) return 'Retro Legend';
  if (legacy >= 28000) return 'All-Pro';
  if (legacy >= 15000) return 'Diamond';
  if (legacy >= 8000) return 'Platinum';
  if (legacy >= 4000) return 'Gold';
  if (legacy >= 1500) return 'Silver';
  return 'Bronze';
}

function computeSaveLegacyStats(saves: unknown[]): {
  legacyScore: number;
  careerTitles: number;
  careerYards: number;
  careerTDs: number;
  careerGames: number;
  position: Position;
  starRating: number;
  favoriteTeamId: string;
} {
  let bestLegacy = 0;
  let bestTitles = 0;
  let bestYards = 0;
  let bestTDs = 0;
  let bestGames = 0;
  let bestPos: Position = 'QB';
  let bestStars = 3.0;
  let bestTeam = 'kc';

  for (const raw of saves) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    const c = (s.careerStats && typeof s.careerStats === 'object' ? s.careerStats : {}) as Record<string, unknown>;
    const p = (s.player && typeof s.player === 'object' ? s.player : {}) as Record<string, unknown>;
    const trophies = Array.isArray(s.trophies) ? s.trophies.length : 0;
    const history = Array.isArray(s.history) ? s.history : [];

    const passYards = Number(c.passYards) || 0;
    const rushYards = Number(c.rushYards) || 0;
    const recYards = Number(c.recYards) || 0;
    const passTD = Number(c.passTD) || 0;
    const rushTD = Number(c.rushTD) || 0;
    const recTD = Number(c.recTD) || 0;
    const tackles = Number(c.tackles) || 0;
    const sacks = Number(c.sacks) || 0;
    const defInt = Number(c.defInt) || 0;
    const tfl = Number(c.tfl) || 0;
    const forcedFumbles = Number(c.forcedFumbles) || 0;
    const fgMade = Number(c.fgMade) || 0;
    const xpMade = Number(c.xpMade) || 0;
    const blocks = Number(c.blocks) || 0;
    const pancakes = Number(c.pancakes) || 0;
    const mvpAwards = Number(c.mvpAwards) || 0;
    const games = Number(c.games) || 0;
    const starRating = Math.max(1, Math.min(5, Number(p.starRating) || 3.0));

    const yards = passYards + rushYards + recYards;
    const tds = passTD + rushTD + recTD;
    const defImpact = tackles * 18 + sacks * 110 + defInt * 160 + tfl * 45 + forcedFumbles * 140;
    const kickImpact = fgMade * 85 + xpMade * 15;
    const olImpact = blocks * 22 + pancakes * 95;
    const eraBonus =
      s.era === 'RETIRED' ? 3500 : s.era === 'NFL' ? 1800 : s.era === 'COLLEGE' ? 750 : 200;
    const wins = history.reduce((acc: number, item: unknown) => {
      const recStr = item && typeof item === 'object' && typeof (item as { record?: string }).record === 'string'
        ? (item as { record: string }).record
        : '0-0';
      const w = parseInt(recStr.split('-')[0] || '0', 10);
      return acc + (Number.isFinite(w) ? w : 0);
    }, 0);

    const legacy = Math.max(
      0,
      Math.min(
        100000,
        Math.round(
          yards * 0.45 +
            tds * 95 +
            defImpact +
            kickImpact +
            olImpact +
            trophies * 1400 +
            mvpAwards * 1200 +
            eraBonus +
            wins * 140 +
            starRating * 300
        )
      )
    );

    if (legacy >= bestLegacy) {
      bestLegacy = legacy;
      bestTitles = trophies;
      bestYards = Math.round(yards);
      bestTDs = Math.round(tds);
      bestGames = Math.round(games);
      if (typeof p.position === 'string' && VALID_POSITIONS.has(p.position as Position)) {
        bestPos = p.position as Position;
      }
      bestStars = Number(starRating.toFixed(1));
      if (typeof s.teamId === 'string' && s.teamId.trim()) {
        bestTeam = s.teamId.slice(0, 48);
      }
    }
  }

  return {
    legacyScore: bestLegacy,
    careerTitles: bestTitles,
    careerYards: bestYards,
    careerTDs: bestTDs,
    careerGames: bestGames,
    position: bestPos,
    starRating: bestStars,
    favoriteTeamId: bestTeam,
  };
}

function toPublicAccount(acc: StoredAccount) {
  return {
    id: acc.id,
    username: acc.username,
    displayName: acc.displayName,
    region: acc.region,
    countryCode: acc.countryCode,
    favoriteTeamId: acc.favoriteTeamId,
    onlineElo: acc.onlineElo,
    onlineWins: acc.onlineWins,
    onlineLosses: acc.onlineLosses,
    onlineLeague: getLeagueFromElo(acc.onlineElo),
    legacyScore: acc.legacyScore,
    careerLeague: getLeagueFromLegacy(acc.legacyScore),
    careerTitles: acc.careerTitles,
    careerYards: acc.careerYards,
    careerTDs: acc.careerTDs,
    careerGames: acc.careerGames,
    position: acc.position,
    starRating: acc.starRating,
    saves: acc.saves,
  };
}

const rooms = new Map<string, RoomRecord>();
const clients = new Map<string, ClientSocketMeta>();
const matchmakingQueue = new Map<string, MatchmakingEntry>();

function sanitizeName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim().slice(0, 24) : '';
  return s.length > 0 ? s : 'Player';
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function pushSystemChat(room: RoomRecord, text: string) {
  room.chat.push({
    id: crypto.randomUUID(),
    senderName: 'ROOM',
    side: 'SPECTATOR',
    text: text.slice(0, 240),
    ts: Date.now(),
    isSystem: true,
  });
  if (room.chat.length > 80) {
    room.chat.splice(0, room.chat.length - 80);
  }
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getPublicRoomSummaries() {
  const list: Array<{
    code: string;
    name: string;
    mode: RoomMode;
    matchmakingOpen: boolean;
    status: RoomStatus;
    quarterLength: 2 | 2.5 | 3;
    teamAId: string;
    teamBId: string;
    weather: WeatherType;
    teamACount: number;
    teamBCount: number;
    spectatorCount: number;
    myScore: number;
    oppScore: number;
    quarter: number;
  }> = [];

  for (const r of rooms.values()) {
    if (!r.isPublic) continue;
    list.push({
      code: r.code,
      name: r.name,
      mode: r.mode,
      matchmakingOpen: r.matchmakingOpen,
      status: r.status,
      quarterLength: r.quarterLength,
      teamAId: r.teamAId,
      teamBId: r.teamBId,
      weather: r.weather,
      teamACount: r.members.filter((m) => m.side === 'MY').length,
      teamBCount: r.members.filter((m) => m.side === 'OPP').length,
      spectatorCount: r.members.filter((m) => m.side === 'SPECTATOR').length,
      myScore: r.myScore,
      oppScore: r.oppScore,
      quarter: r.quarter,
    });
  }
  return list.sort((a, b) => (a.status === 'LOBBY' ? -1 : 1) - (b.status === 'LOBBY' ? -1 : 1));
}

function broadcastRoomState(room: RoomRecord) {
  const payload = { type: 'room:state', room };
  for (const m of room.members) {
    const meta = clients.get(m.clientId);
    if (meta) sendJson(meta.ws, payload);
  }
}

function broadcastPublicRoomsList() {
  const payload = { type: 'rooms:list', rooms: getPublicRoomSummaries() };
  for (const meta of clients.values()) {
    sendJson(meta.ws, payload);
  }
}

function pickAvailablePosition(room: RoomRecord, side: TeamSide, preferred?: Position): Position | null {
  const taken = new Set(room.members.filter((m) => m.side === side && m.position).map((m) => m.position!));
  if (preferred && VALID_POSITIONS.has(preferred) && !taken.has(preferred)) {
    return preferred;
  }
  const order: Position[] = ['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'CB', 'S', 'OL'];
  for (const p of order) {
    if (!taken.has(p)) return p;
  }
  return null;
}

function removeClientFromCurrentRoom(meta: ClientSocketMeta) {
  if (!meta.roomCode) return;
  const room = rooms.get(meta.roomCode);
  meta.roomCode = null;
  if (!room) return;

  const prevMember = room.members.find((m) => m.clientId === meta.clientId);
  room.members = room.members.filter((m) => m.clientId !== meta.clientId);

  if (room.members.length === 0) {
    rooms.delete(room.code);
    broadcastPublicRoomsList();
    return;
  }

  if (prevMember) {
    pushSystemChat(room, `${prevMember.name} left the locker room.`);
  }

  if (room.hostClientId === meta.clientId) {
    const nextHost =
      room.members.find((m) => m.side === 'MY') ??
      room.members.find((m) => m.side === 'OPP') ??
      room.members[0];
    room.hostClientId = nextHost.clientId;
    pushSystemChat(room, `${nextHost.name} is now match host.`);
  }

  broadcastRoomState(room);
  broadcastPublicRoomsList();
}

function removeFromMatchmakingQueue(clientId: string) {
  if (matchmakingQueue.delete(clientId)) {
    const queueSize = matchmakingQueue.size;
    for (const entry of matchmakingQueue.values()) {
      const m = clients.get(entry.clientId);
      if (m) sendJson(m.ws, { type: 'matchmake:searching', queueSize });
    }
  }
}

function isModeCompatible(roomMode: RoomMode, pref: MatchPrefMode): boolean {
  if (pref === 'ANY') return true;
  return roomMode === pref;
}

function findBalancedTeamSide(room: RoomRecord): TeamSide | null {
  const maxPer = room.mode === 'SOLO' ? 1 : 5;
  const countMy = room.members.filter((m) => m.side === 'MY').length;
  const countOpp = room.members.filter((m) => m.side === 'OPP').length;
  if (countMy >= maxPer && countOpp >= maxPer) return null;
  if (countOpp < countMy && countOpp < maxPer) return 'OPP';
  if (countMy < countOpp && countMy < maxPer) return 'MY';
  if (countMy === countOpp) return countMy > 0 && countOpp < maxPer ? 'OPP' : 'MY';
  return countMy < maxPer ? 'MY' : 'OPP';
}

function pickRandomMatchupTeams(): [string, string] {
  const i = Math.floor(Math.random() * QUICKMATCH_TEAMS.length);
  let j = Math.floor(Math.random() * QUICKMATCH_TEAMS.length);
  if (j === i) j = (i + 1) % QUICKMATCH_TEAMS.length;
  return [QUICKMATCH_TEAMS[i], QUICKMATCH_TEAMS[j]];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      rooms: rooms.size,
      clients: clients.size,
    });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getPublicRoomSummaries() });
  });

  // --- Account Auth & Persistent Progress Routes (No Firebase Required) ---
  app.post('/api/auth/register', (req, res) => {
    const rawUser = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const rawCountry = typeof req.body?.countryCode === 'string' ? req.body.countryCode.trim().toUpperCase().slice(0, 4) : 'US';
    const countryCode = /^[A-Z]{2,4}$/.test(rawCountry) ? rawCountry : 'US';

    if (rawUser.length < 3 || rawUser.length > 22 || !/^[a-zA-Z0-9_ -]+$/.test(rawUser)) {
      res.status(400).json({ error: 'Username must be 3-22 characters (letters, numbers, spaces, _ or -).' });
      return;
    }
    if (password.length < 4 || password.length > 64) {
      res.status(400).json({ error: 'Password must be at least 4 characters.' });
      return;
    }
    const lower = rawUser.toLowerCase();
    if (accountStore.accounts.some((a) => a.usernameLower === lower)) {
      res.status(409).json({ error: 'That username is already taken. Try another or sign in.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const now = Date.now();
    const acc: StoredAccount = {
      id: crypto.randomUUID(),
      username: rawUser,
      usernameLower: lower,
      displayName: rawUser,
      passwordSalt: salt,
      passwordHash: hash,
      region: countryCode === 'US' ? 'US' : 'INTL',
      countryCode,
      favoriteTeamId: 'kc',
      onlineElo: 1000,
      onlineWins: 0,
      onlineLosses: 0,
      legacyScore: 0,
      careerTitles: 0,
      careerYards: 0,
      careerTDs: 0,
      careerGames: 0,
      position: 'QB',
      starRating: 3.0,
      saves: [],
      createdAt: now,
      updatedAt: now,
    };

    accountStore.accounts.push(acc);
    persistAccountStore();
    const token = signAccountToken(acc.id);
    res.json({ token, account: toPublicAccount(acc) });
  });

  app.post('/api/auth/login', (req, res) => {
    const rawUser = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const acc = accountStore.accounts.find((a) => a.usernameLower === rawUser);
    if (!acc) {
      res.status(401).json({ error: 'Incorrect username or password.' });
      return;
    }
    const attempt = hashPassword(password, acc.passwordSalt);
    const aBuf = Buffer.from(attempt, 'hex');
    const bBuf = Buffer.from(acc.passwordHash, 'hex');
    if (aBuf.length !== bBuf.length || !crypto.timingSafeEqual(aBuf, bBuf)) {
      res.status(401).json({ error: 'Incorrect username or password.' });
      return;
    }
    const token = signAccountToken(acc.id);
    res.json({ token, account: toPublicAccount(acc) });
  });

  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const acc = verifyAccountToken(token);
    if (!acc) {
      res.status(401).json({ error: 'Session expired or invalid.' });
      return;
    }
    res.json({ account: toPublicAccount(acc) });
  });

  app.put('/api/account/saves', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const acc = verifyAccountToken(token);
    if (!acc) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const saves = Array.isArray(req.body?.saves) ? req.body.saves.slice(0, 12) : [];
    acc.saves = saves;
    const derived = computeSaveLegacyStats(saves);
    acc.legacyScore = Math.max(acc.legacyScore, derived.legacyScore);
    acc.careerTitles = Math.max(acc.careerTitles, derived.careerTitles);
    acc.careerYards = Math.max(acc.careerYards, derived.careerYards);
    acc.careerTDs = Math.max(acc.careerTDs, derived.careerTDs);
    acc.careerGames = Math.max(acc.careerGames, derived.careerGames);
    if (saves.length > 0) {
      acc.position = derived.position;
      acc.starRating = derived.starRating;
      acc.favoriteTeamId = derived.favoriteTeamId;
    }
    acc.updatedAt = Date.now();
    persistAccountStore();
    res.json({ account: toPublicAccount(acc) });
  });

  app.put('/api/account/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const acc = verifyAccountToken(token);
    if (!acc) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (typeof req.body?.displayName === 'string' && req.body.displayName.trim()) {
      acc.displayName = req.body.displayName.trim().slice(0, 32);
    }
    if (typeof req.body?.countryCode === 'string') {
      const code = req.body.countryCode.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      if (code.length >= 2) {
        acc.countryCode = code;
        acc.region = code === 'US' ? 'US' : 'INTL';
      }
    }
    if (req.body?.region === 'US' || req.body?.region === 'INTL') {
      acc.region = acc.countryCode === 'US' ? 'US' : req.body.region;
    }
    acc.updatedAt = Date.now();
    persistAccountStore();
    res.json({ account: toPublicAccount(acc) });
  });

  app.post('/api/account/elo', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const acc = verifyAccountToken(token);
    if (!acc) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const won = Boolean(req.body?.won);
    const oppElo = Math.max(100, Math.min(4000, Number(req.body?.oppElo) || 1000));
    const margin = Number(req.body?.margin) || 0;
    const expected = 1 / (1 + Math.pow(10, (oppElo - acc.onlineElo) / 400));
    const marginMult = 1 + Math.min(0.45, Math.abs(margin) * 0.02);
    const delta = Math.round(32 * marginMult * ((won ? 1 : 0) - expected));
    acc.onlineElo = Math.max(100, Math.min(4000, acc.onlineElo + delta));
    if (won) acc.onlineWins += 1;
    else acc.onlineLosses += 1;
    if (typeof req.body?.favoriteTeamId === 'string' && req.body.favoriteTeamId.trim()) {
      acc.favoriteTeamId = req.body.favoriteTeamId.trim().slice(0, 48);
    }
    acc.updatedAt = Date.now();
    persistAccountStore();
    res.json({ account: toPublicAccount(acc), eloDelta: delta });
  });

  app.get('/api/rankings', (req, res) => {
    const reg = req.query.region === 'US' ? 'US' : req.query.region === 'INTL' ? 'INTL' : 'ALL';
    const profiles = accountStore.accounts
      .filter((a) => reg === 'ALL' || a.region === reg)
      .map((a) => ({
        uid: a.id,
        displayName: a.displayName,
        region: a.region,
        countryCode: a.countryCode,
        favoriteTeamId: a.favoriteTeamId,
        onlineElo: a.onlineElo,
        onlineWins: a.onlineWins,
        onlineLosses: a.onlineLosses,
        onlineLeague: getLeagueFromElo(a.onlineElo),
        legacyScore: a.legacyScore,
        careerLeague: getLeagueFromLegacy(a.legacyScore),
        careerTitles: a.careerTitles,
        careerYards: a.careerYards,
        careerTDs: a.careerTDs,
        careerGames: a.careerGames,
        position: a.position,
        starRating: a.starRating,
        isPublic: true,
      }));
    res.json({ profiles });
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientId = crypto.randomUUID();
    const meta: ClientSocketMeta = {
      ws,
      clientId,
      name: 'Player',
      elo: 1000,
      roomCode: null,
      isAlive: true,
    };
    clients.set(clientId, meta);

    sendJson(ws, {
      type: 'welcome',
      clientId,
      rooms: getPublicRoomSummaries(),
    });

    ws.on('pong', () => {
      meta.isAlive = true;
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type;
      if (typeof type !== 'string') return;

      if (type === 'hello') {
        meta.name = sanitizeName(msg.name);
        if (typeof msg.uid === 'string' && msg.uid.length > 0) meta.uid = msg.uid.slice(0, 128);
        if (typeof msg.elo === 'number' && Number.isFinite(msg.elo)) meta.elo = Math.round(msg.elo);
        sendJson(ws, { type: 'welcome', clientId: meta.clientId, rooms: getPublicRoomSummaries() });
        return;
      }

      if (type === 'rooms:list') {
        sendJson(ws, { type: 'rooms:list', rooms: getPublicRoomSummaries() });
        return;
      }

      if (type === 'room:create') {
        removeFromMatchmakingQueue(meta.clientId);
        removeClientFromCurrentRoom(meta);
        if (typeof msg.playerName === 'string') {
          meta.name = sanitizeName(msg.playerName);
        } else if (typeof msg.name === 'string') {
          meta.name = sanitizeName(msg.name);
        }
        if (typeof msg.uid === 'string' && msg.uid.length > 0) meta.uid = msg.uid.slice(0, 128);
        if (typeof msg.elo === 'number' && Number.isFinite(msg.elo)) meta.elo = Math.round(msg.elo);

        const code = generateRoomCode();
        const mode: RoomMode = msg.mode === 'SOLO' ? 'SOLO' : 'COOP';
        const qtrRaw = msg.quarterLength;
        const quarterLength: 2 | 2.5 | 3 = qtrRaw === 2 ? 2 : qtrRaw === 3 ? 3 : 2.5;
        const weatherRaw = typeof msg.weather === 'string' && VALID_WEATHERS.has(msg.weather as WeatherType)
          ? (msg.weather as WeatherType)
          : 'SUN';
        const posRaw = typeof msg.position === 'string' && VALID_POSITIONS.has(msg.position as Position)
          ? (msg.position as Position)
          : 'QB';
        const isPublic = msg.isPublic !== false;
        const matchmakingOpen =
          typeof msg.matchmakingOpen === 'boolean'
            ? msg.matchmakingOpen && isPublic
            : isPublic && mode === 'COOP';

        const room: RoomRecord = {
          code,
          name: (typeof msg.roomName === 'string' && msg.roomName.trim() ? msg.roomName.trim() : `${meta.name}'s Room`).slice(0, 36),
          isPublic,
          matchmakingOpen,
          mode,
          status: 'LOBBY',
          quarterLength,
          teamAId: typeof msg.teamAId === 'string' && msg.teamAId.trim() ? msg.teamAId.slice(0, 48) : 'kc',
          teamBId: typeof msg.teamBId === 'string' && msg.teamBId.trim() ? msg.teamBId.slice(0, 48) : 'phi',
          weather: weatherRaw,
          hostClientId: meta.clientId,
          quarter: 1,
          clockSec: Math.round(quarterLength * 60),
          myScore: 0,
          oppScore: 0,
          possession: 'MY',
          ballYard: 25,
          down: 1,
          yardsToGo: 10,
          playSeed: 1,
          latestPlay: 'Lobby open. Pick your positions!',
          members: [
            {
              clientId: meta.clientId,
              uid: meta.uid,
              name: meta.name,
              elo: meta.elo,
              side: 'MY',
              position: posRaw,
            },
          ],
          chat: [],
          createdAt: Date.now(),
        };

        pushSystemChat(room, `${meta.name} opened ${mode === 'COOP' ? '5v5 Co-Op' : '1v1 Solo'} room (${code}).`);
        rooms.set(code, room);
        meta.roomCode = code;
        broadcastRoomState(room);
        broadcastPublicRoomsList();
        return;
      }

      if (type === 'matchmake:cancel') {
        removeFromMatchmakingQueue(meta.clientId);
        sendJson(ws, { type: 'matchmake:cancelled' });
        return;
      }

      if (type === 'matchmake:find') {
        removeFromMatchmakingQueue(meta.clientId);
        removeClientFromCurrentRoom(meta);

        if (typeof msg.playerName === 'string') meta.name = sanitizeName(msg.playerName);
        if (typeof msg.uid === 'string' && msg.uid.length > 0) meta.uid = msg.uid.slice(0, 128);
        if (typeof msg.elo === 'number' && Number.isFinite(msg.elo)) meta.elo = Math.round(msg.elo);

        const prefMode: MatchPrefMode =
          msg.preferredMode === 'SOLO' ? 'SOLO' : msg.preferredMode === 'COOP' ? 'COOP' : 'ANY';
        const prefPos =
          typeof msg.preferredPosition === 'string' && VALID_POSITIONS.has(msg.preferredPosition as Position)
            ? (msg.preferredPosition as Position)
            : undefined;

        // 1) Look for an existing open LOBBY matchmaking room with open spots so more players keep joining the same room
        const candidateRooms = Array.from(rooms.values())
          .filter(
            (r) =>
              r.status === 'LOBBY' &&
              r.matchmakingOpen &&
              isModeCompatible(r.mode, prefMode) &&
              findBalancedTeamSide(r) !== null
          )
          .sort((a, b) => a.createdAt - b.createdAt);

        for (const openRoom of candidateRooms) {
          const targetSide = findBalancedTeamSide(openRoom);
          if (!targetSide) continue;
          const assignedPos = pickAvailablePosition(openRoom, targetSide, prefPos);
          if (!assignedPos) continue;

          openRoom.members.push({
            clientId: meta.clientId,
            uid: meta.uid,
            name: meta.name,
            elo: meta.elo,
            side: targetSide,
            position: assignedPos,
          });
          meta.roomCode = openRoom.code;

          pushSystemChat(
            openRoom,
            `${meta.name} joined via Find a Player (${targetSide === 'MY' ? 'Home' : 'Away'} ${assignedPos}).`
          );
          sendJson(ws, { type: 'matchmake:matched', code: openRoom.code });
          broadcastRoomState(openRoom);
          broadcastPublicRoomsList();
          return;
        }

        // 2) Otherwise pair with a compatible player waiting in queue and open an expanding matchmaking room
        let matchedEntry: MatchmakingEntry | null = null;
        for (const entry of matchmakingQueue.values()) {
          if (entry.clientId === meta.clientId) continue;
          const otherMeta = clients.get(entry.clientId);
          if (!otherMeta || otherMeta.ws.readyState !== WebSocket.OPEN) {
            matchmakingQueue.delete(entry.clientId);
            continue;
          }
          const compatible =
            entry.preferredMode === 'ANY' ||
            prefMode === 'ANY' ||
            entry.preferredMode === prefMode;
          if (compatible) {
            matchedEntry = entry;
            break;
          }
        }

        if (matchedEntry) {
          matchmakingQueue.delete(matchedEntry.clientId);
          const p1 = clients.get(matchedEntry.clientId)!;
          const p2 = meta;
          const roomMode: RoomMode =
            matchedEntry.preferredMode === 'SOLO' && prefMode === 'SOLO' ? 'SOLO' : 'COOP';
          const code = generateRoomCode();
          const [teamAId, teamBId] = pickRandomMatchupTeams();
          const pos1 = matchedEntry.preferredPosition && VALID_POSITIONS.has(matchedEntry.preferredPosition)
            ? matchedEntry.preferredPosition
            : 'QB';
          const pos2 = prefPos ?? 'QB';

          const newRoom: RoomRecord = {
            code,
            name: roomMode === 'COOP' ? `Quick Match ${code}` : `1v1 Match ${code}`,
            isPublic: true,
            matchmakingOpen: roomMode === 'COOP',
            mode: roomMode,
            status: 'LOBBY',
            quarterLength: 2.5,
            teamAId,
            teamBId,
            weather: 'SUN',
            hostClientId: p1.clientId,
            quarter: 1,
            clockSec: 150,
            myScore: 0,
            oppScore: 0,
            possession: 'MY',
            ballYard: 25,
            down: 1,
            yardsToGo: 10,
            playSeed: 1,
            latestPlay: 'Players matched! Lock positions and kick off.',
            members: [
              {
                clientId: p1.clientId,
                uid: p1.uid,
                name: p1.name,
                elo: p1.elo,
                side: 'MY',
                position: pos1,
              },
              {
                clientId: p2.clientId,
                uid: p2.uid,
                name: p2.name,
                elo: p2.elo,
                side: 'OPP',
                position: pos2,
              },
            ],
            chat: [],
            createdAt: Date.now(),
          };

          pushSystemChat(
            newRoom,
            roomMode === 'COOP'
              ? `Match found: ${p1.name} vs ${p2.name}. More players finding a match can join this room up to 5v5!`
              : `1v1 Match found: ${p1.name} vs ${p2.name}.`
          );
          rooms.set(code, newRoom);
          p1.roomCode = code;
          p2.roomCode = code;

          sendJson(p1.ws, { type: 'matchmake:matched', code });
          sendJson(p2.ws, { type: 'matchmake:matched', code });
          broadcastRoomState(newRoom);
          broadcastPublicRoomsList();

          // Update remaining queued searchers
          for (const rem of matchmakingQueue.values()) {
            const m = clients.get(rem.clientId);
            if (m) sendJson(m.ws, { type: 'matchmake:searching', queueSize: matchmakingQueue.size });
          }
          return;
        }

        // 3) No open room or waiting player yet — add to queue
        matchmakingQueue.set(meta.clientId, {
          clientId: meta.clientId,
          preferredMode: prefMode,
          preferredPosition: prefPos,
          queuedAt: Date.now(),
        });
        for (const rem of matchmakingQueue.values()) {
          const m = clients.get(rem.clientId);
          if (m) sendJson(m.ws, { type: 'matchmake:searching', queueSize: matchmakingQueue.size });
        }
        return;
      }

      if (type === 'room:join') {
        removeFromMatchmakingQueue(meta.clientId);
        const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
        const room = rooms.get(code);
        if (!room) {
          sendJson(ws, { type: 'room:error', error: `Room "${code}" not found.` });
          return;
        }
        if (typeof msg.playerName === 'string') meta.name = sanitizeName(msg.playerName);
        if (typeof msg.uid === 'string' && msg.uid.length > 0) meta.uid = msg.uid.slice(0, 128);
        if (typeof msg.elo === 'number' && Number.isFinite(msg.elo)) meta.elo = Math.round(msg.elo);

        removeClientFromCurrentRoom(meta);

        const maxPerTeam = room.mode === 'SOLO' ? 1 : 5;
        const requestedSide: MemberSide =
          msg.side === 'OPP' ? 'OPP' : msg.side === 'SPECTATOR' ? 'SPECTATOR' : 'MY';
        let finalSide: MemberSide = requestedSide;

        const countMy = room.members.filter((m) => m.side === 'MY').length;
        const countOpp = room.members.filter((m) => m.side === 'OPP').length;

        if (finalSide !== 'SPECTATOR') {
          if (finalSide === 'MY' && countMy >= maxPerTeam) {
            finalSide = countOpp < maxPerTeam ? 'OPP' : 'SPECTATOR';
          } else if (finalSide === 'OPP' && countOpp >= maxPerTeam) {
            finalSide = countMy < maxPerTeam ? 'MY' : 'SPECTATOR';
          }
        }

        let assignedPos: Position | undefined = undefined;
        if (finalSide === 'MY' || finalSide === 'OPP') {
          const preferred = typeof msg.position === 'string' ? (msg.position as Position) : undefined;
          const openPos = pickAvailablePosition(room, finalSide, preferred);
          if (!openPos) {
            finalSide = 'SPECTATOR';
          } else {
            assignedPos = openPos;
          }
        }

        room.members.push({
          clientId: meta.clientId,
          uid: meta.uid,
          name: meta.name,
          elo: meta.elo,
          side: finalSide,
          position: assignedPos,
        });
        meta.roomCode = room.code;

        pushSystemChat(
          room,
          finalSide === 'SPECTATOR'
            ? `${meta.name} joined as Spectator.`
            : `${meta.name} locked ${finalSide === 'MY' ? 'HOME' : 'AWAY'} ${assignedPos}.`
        );
        broadcastRoomState(room);
        broadcastPublicRoomsList();
        return;
      }

      if (type === 'room:leave') {
        removeClientFromCurrentRoom(meta);
        sendJson(ws, { type: 'room:left' });
        return;
      }

      if (!meta.roomCode) return;
      const room = rooms.get(meta.roomCode);
      if (!room) {
        meta.roomCode = null;
        return;
      }
      const member = room.members.find((m) => m.clientId === meta.clientId);
      if (!member) return;

      if (type === 'room:select_slot') {
        if (room.status === 'LIVE') {
          sendJson(ws, { type: 'room:error', error: 'Cannot switch team/position mid-game.' });
          return;
        }
        const nextSide: MemberSide =
          msg.side === 'OPP' ? 'OPP' : msg.side === 'SPECTATOR' ? 'SPECTATOR' : 'MY';
        const maxPerTeam = room.mode === 'SOLO' ? 1 : 5;

        if (nextSide === 'SPECTATOR') {
          member.side = 'SPECTATOR';
          member.position = undefined;
        } else {
          const teamMembers = room.members.filter((m) => m.side === nextSide && m.clientId !== meta.clientId);
          if (teamMembers.length >= maxPerTeam) {
            sendJson(ws, {
              type: 'room:error',
              error: `${nextSide === 'MY' ? 'Home' : 'Away'} team already has max ${maxPerTeam} player(s).`,
            });
            return;
          }
          const reqPos = typeof msg.position === 'string' && VALID_POSITIONS.has(msg.position as Position)
            ? (msg.position as Position)
            : undefined;
          const takenByOther = reqPos && teamMembers.some((m) => m.position === reqPos);
          if (takenByOther) {
            sendJson(ws, {
              type: 'room:error',
              error: `Position ${reqPos} is already locked by another teammate.`,
            });
            return;
          }
          const chosen = reqPos ?? pickAvailablePosition(room, nextSide);
          if (!chosen) {
            sendJson(ws, { type: 'room:error', error: 'No open positions remaining on that team.' });
            return;
          }
          member.side = nextSide;
          member.position = chosen;
        }

        if (room.hostClientId === meta.clientId) {
          if (typeof msg.teamAId === 'string' && msg.teamAId.trim()) room.teamAId = msg.teamAId.slice(0, 48);
          if (typeof msg.teamBId === 'string' && msg.teamBId.trim()) room.teamBId = msg.teamBId.slice(0, 48);
          if (typeof msg.weather === 'string' && VALID_WEATHERS.has(msg.weather as WeatherType)) {
            room.weather = msg.weather as WeatherType;
          }
          if (msg.quarterLength === 2 || msg.quarterLength === 2.5 || msg.quarterLength === 3) {
            room.quarterLength = msg.quarterLength;
            room.clockSec = Math.round(msg.quarterLength * 60);
          }
        }

        broadcastRoomState(room);
        broadcastPublicRoomsList();
        return;
      }

      if (type === 'room:config' && room.hostClientId === meta.clientId && room.status === 'LOBBY') {
        if (typeof msg.teamAId === 'string' && msg.teamAId.trim()) room.teamAId = msg.teamAId.slice(0, 48);
        if (typeof msg.teamBId === 'string' && msg.teamBId.trim()) room.teamBId = msg.teamBId.slice(0, 48);
        if (typeof msg.weather === 'string' && VALID_WEATHERS.has(msg.weather as WeatherType)) {
          room.weather = msg.weather as WeatherType;
        }
        if (msg.quarterLength === 2 || msg.quarterLength === 2.5 || msg.quarterLength === 3) {
          room.quarterLength = msg.quarterLength;
          room.clockSec = Math.round(msg.quarterLength * 60);
        }
        if (typeof msg.matchmakingOpen === 'boolean') {
          room.matchmakingOpen = msg.matchmakingOpen && room.isPublic;
        }
        broadcastRoomState(room);
        broadcastPublicRoomsList();
        return;
      }

      if (type === 'room:chat') {
        const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 240) : '';
        if (!text) return;
        const chatMsg: RoomChatMessage = {
          id: crypto.randomUUID(),
          senderName: member.name,
          side: member.side,
          position: member.position,
          text,
          ts: Date.now(),
        };
        room.chat.push(chatMsg);
        if (room.chat.length > 80) room.chat.splice(0, room.chat.length - 80);
        for (const m of room.members) {
          const target = clients.get(m.clientId);
          if (target) sendJson(target.ws, { type: 'room:chat', message: chatMsg });
        }
        return;
      }

      if (type === 'room:start') {
        if (room.hostClientId !== meta.clientId) return;
        room.status = 'LIVE';
        room.matchmakingOpen = false;
        room.quarter = 1;
        room.clockSec = Math.round(room.quarterLength * 60);
        room.myScore = 0;
        room.oppScore = 0;
        room.possession = 'MY';
        room.ballYard = 25;
        room.down = 1;
        room.yardsToGo = 10;
        room.playSeed = 1;
        room.latestPlay = 'KICKOFF! Match is underway.';
        pushSystemChat(room, 'Match started! Good luck to both teams.');
        broadcastRoomState(room);
        broadcastPublicRoomsList();
        return;
      }

      if (type === 'room:rematch') {
        if (room.hostClientId !== meta.clientId) return;
        room.status = 'LOBBY';
        room.quarter = 1;
        room.clockSec = Math.round(room.quarterLength * 60);
        room.myScore = 0;
        room.oppScore = 0;
        room.possession = 'MY';
        room.ballYard = 25;
        room.down = 1;
        room.yardsToGo = 10;
        room.playSeed += 1;
        room.latestPlay = 'Rematch lobby open — adjust positions or start!';
        pushSystemChat(room, 'Host opened Rematch lobby.');
        broadcastRoomState(room);
        broadcastPublicRoomsList();
        return;
      }

      if (type === 'room:play_outcome') {
        if (room.hostClientId !== meta.clientId || room.status !== 'LIVE') return;
        if (typeof msg.playSeed === 'number' && msg.playSeed !== room.playSeed) return;

        room.myScore = Math.max(0, Math.min(200, Number(msg.myScore ?? room.myScore)));
        room.oppScore = Math.max(0, Math.min(200, Number(msg.oppScore ?? room.oppScore)));
        room.possession = msg.possession === 'OPP' ? 'OPP' : 'MY';
        room.ballYard = Math.max(1, Math.min(99, Number(msg.ballYard ?? room.ballYard)));
        room.down = Math.max(1, Math.min(4, Number(msg.down ?? room.down)));
        room.yardsToGo = Math.max(1, Math.min(99, Number(msg.yardsToGo ?? room.yardsToGo)));
        room.quarter = Math.max(1, Math.min(5, Number(msg.quarter ?? room.quarter)));
        room.clockSec = Math.max(0, Math.min(300, Number(msg.clockSec ?? room.clockSec)));
        if (typeof msg.latestPlay === 'string' && msg.latestPlay.trim()) {
          room.latestPlay = msg.latestPlay.trim().slice(0, 180);
        }
        if (msg.isGameOver) {
          room.status = 'FINAL';
          pushSystemChat(room, `FINAL: HOME ${room.myScore} — AWAY ${room.oppScore}.`);
        }
        room.playSeed += 1;
        broadcastRoomState(room);
        if (room.status === 'FINAL') broadcastPublicRoomsList();
        return;
      }

      if (type === 'game:snapshot') {
        if (room.hostClientId !== meta.clientId || room.status !== 'LIVE') return;
        const payload = { type: 'game:snapshot', snapshot: msg.snapshot };
        for (const m of room.members) {
          if (m.clientId === meta.clientId) continue;
          const target = clients.get(m.clientId);
          if (target) sendJson(target.ws, payload);
        }
        return;
      }

      if (type === 'game:input') {
        if (room.status !== 'LIVE' || (member.side !== 'MY' && member.side !== 'OPP') || !member.position) return;
        const expectedSlotKey = `${member.side}:${member.position}`;
        if (msg.slotKey !== expectedSlotKey) return;
        const host = clients.get(room.hostClientId);
        if (host) {
          sendJson(host.ws, {
            type: 'game:input',
            slotKey: expectedSlotKey,
            mx: Number(msg.mx) || 0,
            my: Number(msg.my) || 0,
          });
        }
        return;
      }

      if (type === 'game:action') {
        if (room.status !== 'LIVE' || (member.side !== 'MY' && member.side !== 'OPP') || !member.position) return;
        const expectedSlotKey = `${member.side}:${member.position}`;
        const action = msg.action as Record<string, unknown> | undefined;
        if (!action || action.slotKey !== expectedSlotKey) return;
        const host = clients.get(room.hostClientId);
        if (host) {
          sendJson(host.ws, {
            type: 'game:action',
            action,
          });
        }
      }
    });

    ws.on('close', () => {
      removeFromMatchmakingQueue(meta.clientId);
      removeClientFromCurrentRoom(meta);
      clients.delete(meta.clientId);
    });
  });

  // Clean up disconnected sockets
  setInterval(() => {
    for (const [id, meta] of clients.entries()) {
      if (!meta.isAlive) {
        meta.ws.terminate();
        removeFromMatchmakingQueue(meta.clientId);
        removeClientFromCurrentRoom(meta);
        clients.delete(id);
        continue;
      }
      meta.isAlive = false;
      if (meta.ws.readyState === WebSocket.OPEN) {
        meta.ws.ping();
      }
    }
  }, 25000);

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Retro Bowl Career + Multiplayer server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
