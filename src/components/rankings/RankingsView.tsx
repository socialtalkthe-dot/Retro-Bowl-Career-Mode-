import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Globe,
  LogIn,
  LogOut,
  RefreshCw,
  Shield,
  Trophy,
  UserCheck,
} from 'lucide-react';
import { CareerSave } from '../../types/career';
import { getTeamById } from '../../data/teams';
import {
  auth,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutFirebase,
  User,
} from '../../firebase';
import {
  calculateLegacyScore,
  fetchGlobalRankings,
  fetchMyRankingProfile,
  getCareerLeague,
  getEloLeague,
  getLeagueBadgeColor,
  GlobalRegion,
  RankLeague,
  RankingProfile,
  upsertMyRankingProfile,
} from '../../services/rankingsService';
import {
  fetchServerRankings,
  PlayerAccount,
  updateServerAccountProfile,
} from '../../services/accountService';
import { retroAudio } from '../../audio/retroAudio';

interface RankingsViewProps {
  activeSave: CareerSave | null;
  account?: PlayerAccount | null;
  onAccountUpdated?: (account: PlayerAccount) => void;
}

type LeaderboardBoard = 'ELO' | 'LEGACY';

const ELO_TIERS: { league: RankLeague; min: string }[] = [
  { league: 'Bronze', min: '< 1050' },
  { league: 'Silver', min: '1050+' },
  { league: 'Gold', min: '1200+' },
  { league: 'Platinum', min: '1400+' },
  { league: 'Diamond', min: '1650+' },
  { league: 'All-Pro', min: '1900+' },
  { league: 'Retro Legend', min: '2200+' },
];

const LEGACY_TIERS: { league: RankLeague; min: string }[] = [
  { league: 'Bronze', min: '< 1,500' },
  { league: 'Silver', min: '1,500+' },
  { league: 'Gold', min: '4,000+' },
  { league: 'Platinum', min: '8,000+' },
  { league: 'Diamond', min: '15,000+' },
  { league: 'All-Pro', min: '28,000+' },
  { league: 'Retro Legend', min: '45,000+' },
];

const COUNTRY_PRESETS = ['US', 'CA', 'GB', 'DE', 'MX', 'AU', 'JP', 'FR', 'BR', 'KR'];

export const RankingsView: React.FC<RankingsViewProps> = ({
  activeSave,
  account,
  onAccountUpdated,
}) => {
  const [fbUser, setFbUser] = useState<User | null>(auth.currentUser);
  const [board, setBoard] = useState<LeaderboardBoard>('ELO');
  const [regionFilter, setRegionFilter] = useState<'ALL' | GlobalRegion>('ALL');
  const [profiles, setProfiles] = useState<RankingProfile[]>([]);
  const [myProfile, setMyProfile] = useState<RankingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(
    account?.displayName ||
      (activeSave
        ? `${activeSave.player.firstName} ${activeSave.player.lastName}`
        : fbUser?.displayName ?? 'Player')
  );
  const [region, setRegion] = useState<GlobalRegion>(account?.region ?? 'US');
  const [countryCode, setCountryCode] = useState(account?.countryCode ?? 'US');

  const localLegacy = useMemo(() => calculateLegacyScore(activeSave), [activeSave]);

  useEffect(() => {
    if (account) {
      setDisplayName(account.displayName || account.username);
      setRegion(account.region);
      setCountryCode(account.countryCode);
    }
  }, [account?.id, account?.displayName, account?.region, account?.countryCode]);

  const loadRankings = async (reg: 'ALL' | GlobalRegion) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [serverList, fbList] = await Promise.all([
        fetchServerRankings(reg),
        fetchGlobalRankings(reg).catch(() => [] as RankingProfile[]),
      ]);
      const mergedMap = new Map<string, RankingProfile>();
      serverList.forEach((p) => mergedMap.set(p.uid, p));
      fbList.forEach((p) => {
        if (!mergedMap.has(p.uid)) {
          mergedMap.set(p.uid, p);
        }
      });
      setProfiles(Array.from(mergedMap.values()));
    } catch {
      setErrorMsg('Unable to load global leaderboard right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRankings(regionFilter);
  }, [regionFilter]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFbUser(u);
      if (u) {
        try {
          const mine = await fetchMyRankingProfile(u.uid);
          if (mine) {
            setMyProfile(mine);
            if (!account) {
              setDisplayName(mine.displayName);
              setRegion(mine.region);
              setCountryCode(mine.countryCode);
            }
          } else if (u.displayName && !account) {
            setDisplayName(u.displayName);
          }
        } catch {
          // Ignore non-fatal initial fetch
        }
      } else {
        setMyProfile(null);
      }
    });
    return () => unsub();
  }, [account]);

  const handleSignIn = async () => {
    retroAudio.play('click');
    setErrorMsg(null);
    try {
      const user = await signInWithGooglePopup();
      if (user) {
        const saved = await upsertMyRankingProfile({
          displayName: activeSave
            ? `${activeSave.player.firstName} ${activeSave.player.lastName}`
            : user.displayName || displayName,
          region,
          countryCode,
          save: activeSave,
        });
        if (saved) setMyProfile(saved);
        await loadRankings(regionFilter);
      }
    } catch {
      setErrorMsg('Google sign-in was cancelled or blocked.');
    }
  };

  const handleSyncProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account && !fbUser) return;
    retroAudio.play('click');
    setSyncing(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const nextRegion: GlobalRegion = countryCode.toUpperCase() === 'US' ? 'US' : region;
      if (account) {
        const updated = await updateServerAccountProfile({
          displayName,
          countryCode,
          region: nextRegion,
        });
        if (updated) {
          onAccountUpdated?.(updated);
          setStatusMsg('Competitor profile updated.');
        }
      }
      if (fbUser) {
        const saved = await upsertMyRankingProfile({
          displayName,
          region: nextRegion,
          countryCode,
          save: activeSave,
        });
        if (saved) setMyProfile(saved);
      }
      await loadRankings(regionFilter);
    } catch {
      setErrorMsg('Failed to update your ranking profile.');
    } finally {
      setSyncing(false);
    }
  };

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) =>
      board === 'ELO' ? b.onlineElo - a.onlineElo : b.legacyScore - a.legacyScore
    );
  }, [profiles, board]);

  const myUid = account?.id ?? fbUser?.uid ?? null;

  const myRankIndex = useMemo(() => {
    if (!myUid) return -1;
    return sortedProfiles.findIndex((p) => p.uid === myUid);
  }, [sortedProfiles, myUid]);

  const displayedElo = account?.onlineElo ?? myProfile?.onlineElo ?? 1000;
  const displayedLegacy = Math.max(
    account?.legacyScore ?? 0,
    myProfile?.legacyScore ?? 0,
    localLegacy
  );

  const tiers = board === 'ELO' ? ELO_TIERS : LEGACY_TIERS;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      {errorMsg && (
        <div className="p-3 bg-red-900/60 border-2 border-red-400 text-xs font-semibold text-red-100">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div className="p-3 bg-emerald-900/50 border-2 border-emerald-400 text-xs font-semibold text-emerald-100">
          {statusMsg}
        </div>
      )}

      {/* Header */}
      <div className="rb-panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#fde047]" />
            <h1 className="font-pixel text-sm sm:text-base text-[#fde047]">
              GLOBAL RANKINGS &amp; LEAGUES
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Compete across the US and internationally in Online Competitive ELO and Career Legacy Score. Climb from Bronze up to Retro Legend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {account && (
            <span className="px-3 py-1.5 bg-[#0e253b] border border-[#3c6fa1] text-xs font-bold text-[#fde047]">
              Account: {account.username}
            </span>
          )}
          {fbUser ? (
            <button
              type="button"
              onClick={() => {
                retroAudio.play('click');
                void signOutFirebase();
              }}
              className="rb-btn-slate px-3 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Unlink Google
            </button>
          ) : !account ? (
            <button
              type="button"
              onClick={handleSignIn}
              className="rb-btn-gold px-4 py-2 text-xs font-pixel flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              SIGN IN TO RANK
            </button>
          ) : null}
        </div>
      </div>

      {/* Player Personal Card & Profile Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rb-panel p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2b547c] pb-2">
            <span className="font-pixel text-[10px] text-[#fde047] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> YOUR COMPETITOR CARD
            </span>
            {myRankIndex >= 0 && (
              <span className="text-xs font-bold text-emerald-300">
                Global #{myRankIndex + 1}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rb-panel-inset p-3 space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Online ELO</div>
              <div className="font-display text-2xl font-extrabold text-white">
                {displayedElo}
              </div>
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-bold border ${getLeagueBadgeColor(
                  getEloLeague(displayedElo)
                )}`}
              >
                {getEloLeague(displayedElo)}
              </span>
            </div>

            <div className="rb-panel-inset p-3 space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Career Legacy</div>
              <div className="font-display text-2xl font-extrabold text-white">
                {displayedLegacy.toLocaleString()}
              </div>
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-bold border ${getLeagueBadgeColor(
                  getCareerLeague(displayedLegacy)
                )}`}
              >
                {getCareerLeague(displayedLegacy)}
              </span>
            </div>
          </div>

          {account || fbUser ? (
            <form onSubmit={handleSyncProfile} className="space-y-2.5 pt-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="sm:col-span-2 space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Display Name</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                    className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-1.5 text-white"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Country</span>
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setCountryCode(code);
                      setRegion(code === 'US' ? 'US' : 'INTL');
                    }}
                    className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2 py-1.5 text-white"
                  >
                    {COUNTRY_PRESETS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="submit"
                disabled={syncing}
                className="w-full rb-btn-green py-2 text-xs font-pixel disabled:opacity-50"
              >
                {syncing ? 'UPDATING...' : 'UPDATE COMPETITOR PROFILE'}
              </button>
            </form>
          ) : (
            <div className="text-xs text-slate-400 pt-1">
              Sign in above to update your Online ELO and Career Legacy Score ({localLegacy.toLocaleString()} pts) on the leaderboard.
            </div>
          )}
        </div>

        {/* Rank League Tiers Breakdown */}
        <div className="lg:col-span-7 rb-panel p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between border-b border-[#2b547c] pb-2">
            <span className="font-pixel text-[10px] text-[#fde047] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              {board === 'ELO' ? 'COMPETITIVE ELO LEAGUES' : 'CAREER LEGACY LEAGUES'}
            </span>
            <span className="text-[11px] text-slate-400">7 Rank Tiers</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {tiers.map((t) => (
              <div
                key={t.league}
                className={`p-2.5 border text-center flex flex-col justify-center gap-1 ${getLeagueBadgeColor(
                  t.league
                )}`}
              >
                <div className="text-[11px] font-extrabold leading-tight">{t.league}</div>
                <div className="text-[10px] opacity-85 font-mono">{t.min}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-400">
            Online wins against higher-ranked opponents award larger ELO gains; Career Legacy combines career yards, touchdowns, defensive/OL impact, MVP awards, and championships.
          </div>
        </div>
      </div>

      {/* Filter & Board Switcher + Leaderboard Table */}
      <div className="rb-panel p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2b547c] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBoard('ELO')}
              className={`px-3.5 py-2 text-xs font-pixel flex items-center gap-1.5 ${
                board === 'ELO' ? 'rb-btn-gold' : 'rb-btn-slate'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              ONLINE ELO
            </button>
            <button
              type="button"
              onClick={() => setBoard('LEGACY')}
              className={`px-3.5 py-2 text-xs font-pixel flex items-center gap-1.5 ${
                board === 'LEGACY' ? 'rb-btn-gold' : 'rb-btn-slate'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              CAREER LEGACY
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(['ALL', 'US', 'INTL'] as const).map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => setRegionFilter(reg)}
                className={`px-3 py-1.5 text-xs font-bold border ${
                  regionFilter === reg
                    ? 'bg-[#1f4d78] border-[#fde047] text-[#fde047]'
                    : 'bg-[#0e253b] border-[#3c6fa1] text-slate-300 hover:text-white'
                }`}
              >
                {reg === 'ALL' ? 'Global (All)' : reg === 'US' ? 'United States' : 'International'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadRankings(regionFilter)}
              className="rb-btn-slate px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading global rankings...</div>
        ) : sortedProfiles.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No ranked players in this region yet. Play matches to claim #1!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2b547c] text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-2">Rank</th>
                  <th className="py-2.5 px-2">Player</th>
                  <th className="py-2.5 px-2">Region</th>
                  <th className="py-2.5 px-2">League</th>
                  {board === 'ELO' ? (
                    <>
                      <th className="py-2.5 px-2 text-right">Online W-L</th>
                      <th className="py-2.5 px-2 text-right">ELO Rating</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2.5 px-2 text-right">Pos / Titles</th>
                      <th className="py-2.5 px-2 text-right">Yds / TD</th>
                      <th className="py-2.5 px-2 text-right">Legacy Score</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedProfiles.map((p, idx) => {
                  const isMe = myUid === p.uid;
                  const league = board === 'ELO' ? p.onlineLeague : p.careerLeague;
                  const favTeam = getTeamById(p.favoriteTeamId);
                  return (
                    <tr
                      key={p.uid}
                      className={`border-b border-[#1c3b59] ${
                        isMe ? 'bg-[#1f4d78]/60' : 'hover:bg-[#0e253b]/70'
                      }`}
                    >
                      <td className="py-2.5 px-2 font-pixel text-[10px] text-[#fde047]">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{p.displayName}</span>
                          {isMe && (
                            <span className="px-1.5 py-0.5 bg-[#fde047] text-[#090d16] text-[9px] font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{favTeam.shortName}</div>
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-200">
                        {p.countryCode} <span className="text-slate-500">({p.region})</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 border text-[10px] font-bold ${getLeagueBadgeColor(league)}`}>
                          {league}
                        </span>
                      </td>
                      {board === 'ELO' ? (
                        <>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-200">
                            {p.onlineWins}-{p.onlineLosses}
                          </td>
                          <td className="py-2.5 px-2 text-right font-display text-lg font-extrabold text-[#fde047]">
                            {p.onlineElo}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-2 text-right text-slate-200">
                            {p.position} · {p.careerTitles} 🏆
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                            {p.careerYards.toLocaleString()} / {p.careerTDs}
                          </td>
                          <td className="py-2.5 px-2 text-right font-display text-lg font-extrabold text-[#fde047]">
                            {p.legacyScore.toLocaleString()}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
