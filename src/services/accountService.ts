import { CareerSave, Position } from '../types/career';
import { GlobalRegion, RankLeague, RankingProfile } from './rankingsService';

const TOKEN_STORAGE_KEY = 'rb_account_session_token_v1';

export interface PlayerAccount {
  id: string;
  username: string;
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
  saves: CareerSave[];
}

export function getStoredAccountToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccountToken(token: string) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage quota issues
  }
}

export function clearStoredAccountToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage issues
  }
}

async function apiJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredAccountToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function registerAccount(params: {
  username: string;
  password: string;
  countryCode?: string;
}): Promise<PlayerAccount> {
  const data = await apiJson<{ token: string; account: PlayerAccount }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  setStoredAccountToken(data.token);
  return data.account;
}

export async function loginAccount(params: {
  username: string;
  password: string;
}): Promise<PlayerAccount> {
  const data = await apiJson<{ token: string; account: PlayerAccount }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  setStoredAccountToken(data.token);
  return data.account;
}

export async function fetchCurrentAccount(): Promise<PlayerAccount | null> {
  const token = getStoredAccountToken();
  if (!token) return null;
  try {
    const data = await apiJson<{ account: PlayerAccount }>('/api/auth/me');
    return data.account;
  } catch {
    return null;
  }
}

export async function syncSavesToServer(saves: CareerSave[]): Promise<PlayerAccount | null> {
  const token = getStoredAccountToken();
  if (!token) return null;
  try {
    const data = await apiJson<{ account: PlayerAccount }>('/api/account/saves', {
      method: 'PUT',
      body: JSON.stringify({ saves }),
    });
    return data.account;
  } catch {
    return null;
  }
}

export async function updateServerAccountProfile(params: {
  displayName?: string;
  countryCode?: string;
  region?: GlobalRegion;
}): Promise<PlayerAccount | null> {
  const token = getStoredAccountToken();
  if (!token) return null;
  const data = await apiJson<{ account: PlayerAccount }>('/api/account/profile', {
    method: 'PUT',
    body: JSON.stringify(params),
  });
  return data.account;
}

export async function recordOnlineEloToServer(params: {
  won: boolean;
  oppElo: number;
  margin: number;
  favoriteTeamId?: string;
}): Promise<{ account: PlayerAccount; eloDelta: number } | null> {
  const token = getStoredAccountToken();
  if (!token) return null;
  try {
    return await apiJson<{ account: PlayerAccount; eloDelta: number }>('/api/account/elo', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  } catch {
    return null;
  }
}

export async function fetchServerRankings(
  region: 'ALL' | GlobalRegion = 'ALL'
): Promise<RankingProfile[]> {
  try {
    const data = await apiJson<{ profiles: RankingProfile[] }>(
      `/api/rankings?region=${encodeURIComponent(region)}`
    );
    return Array.isArray(data.profiles) ? data.profiles : [];
  } catch {
    return [];
  }
}
