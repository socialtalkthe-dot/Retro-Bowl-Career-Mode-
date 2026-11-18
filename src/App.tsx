import { useEffect, useState } from 'react';
import { CareerSave, ScheduleGame, StatLine } from './types/career';
import { applyMatchOutcome } from './engine/careerEngine';
import { CareerCreator } from './components/career/CareerCreator';
import { CareerHub } from './components/career/CareerHub';
import { RosterStandingsView } from './components/career/RosterStandingsView';
import { LifeAndLegacyView } from './components/career/LifeAndLegacyView';
import { OffseasonView } from './components/career/OffseasonView';
import { MatchDayView } from './components/game/MatchDayView';
import { OnlineArenaView } from './components/multiplayer/OnlineArenaView';
import { RankingsView } from './components/rankings/RankingsView';
import { AccountGateView, ModeSelectView } from './components/auth/AccountGateView';
import {
  clearStoredAccountToken,
  fetchCurrentAccount,
  PlayerAccount,
  syncSavesToServer,
} from './services/accountService';
import { auth, onAuthStateChanged } from './firebase';
import { fetchMyRankingProfile, upsertMyRankingProfile } from './services/rankingsService';
import { retroAudio } from './audio/retroAudio';

const STORAGE_KEY = 'rb_career_mode_saves_v1';

type AppMode = 'CAREER' | 'ONLINE' | 'RANKINGS';
type NavTab = 'HUB' | 'CLUBHOUSE' | 'LIFE';

export default function App() {
  const [saves, setSaves] = useState<CareerSave[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CareerSave[]) : [];
    } catch {
      return [];
    }
  });
  const [activeSaveId, setActiveSaveId] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as CareerSave[]) : [];
      return parsed.length > 0 ? parsed[0].id : null;
    } catch {
      return null;
    }
  });
  const [appMode, setAppMode] = useState<AppMode>('CAREER');
  const [tab, setTab] = useState<NavTab>('HUB');
  const [inMatch, setInMatch] = useState(false);
  const [activeMatchGame, setActiveMatchGame] = useState<ScheduleGame | null>(null);
  const [signedInUid, setSignedInUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [account, setAccount] = useState<PlayerAccount | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showModeSelect, setShowModeSelect] = useState(false);

  const persistSaves = (nextSaves: CareerSave[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSaves));
    } catch {
      // Ignore quota issues
    }
  };

  useEffect(() => {
    persistSaves(saves);
  }, [saves]);

  useEffect(() => {
    let active = true;
    (async () => {
      const acc = await fetchCurrentAccount();
      if (!active) return;
      if (acc) {
        setAccount(acc);
        if (acc.saves && acc.saves.length > 0) {
          setSaves(acc.saves);
          setActiveSaveId(acc.saves[0].id);
        }
        setShowModeSelect(true);
      }
      setAuthChecking(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Automatically keep saves & Career Legacy synced to server account
  useEffect(() => {
    if (!account) return;
    const timer = setTimeout(async () => {
      const updatedAcc = await syncSavesToServer(saves);
      if (updatedAcc) {
        setAccount(updatedAcc);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [account?.id, saves]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setSignedInUid(u?.uid ?? null);
    });
    return () => unsub();
  }, []);

  const activeSave = saves.find((s) => s.id === activeSaveId) ?? null;

  // Optionally sync Career Legacy Score to Firestore if user also linked Google
  useEffect(() => {
    if (!signedInUid || !activeSave || !auth.currentUser?.emailVerified) return;
    const timer = setTimeout(async () => {
      try {
        const existing = await fetchMyRankingProfile(signedInUid);
        await upsertMyRankingProfile({
          displayName:
            existing?.displayName ??
            (`${activeSave.player.firstName} ${activeSave.player.lastName}` ||
              account?.username ||
              auth.currentUser?.displayName ||
              'Player'),
          region: existing?.region ?? 'US',
          countryCode: existing?.countryCode ?? 'US',
          save: activeSave,
        });
      } catch {
        // Ignore silent background sync errors
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    signedInUid,
    account?.username,
    activeSave?.id,
    activeSave?.careerStats.games,
    activeSave?.trophies.length,
    activeSave?.era,
    activeSave?.player.starRating,
  ]);

  const handleAccountAuthenticated = (acc: PlayerAccount) => {
    setAccount(acc);
    if (acc.saves && acc.saves.length > 0) {
      setSaves(acc.saves);
      persistSaves(acc.saves);
      setActiveSaveId(acc.saves[0].id);
    } else if (saves.length > 0) {
      void syncSavesToServer(saves);
    }
    setShowModeSelect(true);
    setInMatch(false);
  };

  const handleSignOutAccount = () => {
    retroAudio.play('click');
    clearStoredAccountToken();
    setAccount(null);
    setShowModeSelect(false);
    setInMatch(false);
    setActiveMatchGame(null);
  };

  const updateActiveSave = (next: CareerSave) => {
    setSaves((prev) => {
      const updated = prev.map((s) => (s.id === next.id ? next : s));
      persistSaves(updated);
      return updated;
    });
  };

  const handleCreateSave = (save: CareerSave) => {
    setSaves((prev) => {
      const updated = [save, ...prev];
      persistSaves(updated);
      return updated;
    });
    setActiveSaveId(save.id);
    setAppMode('CAREER');
    setTab('HUB');
    setInMatch(false);
  };

  const handleDeleteSave = (saveId: string) => {
    retroAudio.play('click');
    setSaves((prev) => {
      const updated = prev.filter((s) => s.id !== saveId);
      persistSaves(updated);
      return updated;
    });
    if (activeSaveId === saveId) {
      setActiveSaveId(null);
      setInMatch(false);
    }
  };

  const handleSaveMatchResult = (
    myScore: number,
    oppScore: number,
    matchStats: StatLine,
    gameRating: number
  ) => {
    if (!activeSave) return;
    const updated = applyMatchOutcome(activeSave, myScore, oppScore, matchStats, gameRating);
    updateActiveSave(updated);
  };

  const handleFinishMatch = (
    myScore: number,
    oppScore: number,
    matchStats: StatLine,
    gameRating: number,
    alreadySaved = false
  ) => {
    if (activeSave && !alreadySaved) {
      const updated = applyMatchOutcome(activeSave, myScore, oppScore, matchStats, gameRating);
      updateActiveSave(updated);
    }
    setInMatch(false);
    setActiveMatchGame(null);
    setTab('HUB');
  };

  const isOffseason =
    activeSave &&
    activeSave.phase !== 'REGULAR_SEASON' &&
    activeSave.phase !== 'PLAYOFFS';

  const nextGame = activeSave?.schedule.find((g) => g.week === activeSave.week && !g.played);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#1d4972] text-slate-100 flex items-center justify-center px-4">
        <div className="rb-panel px-6 py-5 font-pixel text-xs text-[#fde047]">
          LOADING ACCOUNT...
        </div>
      </div>
    );
  }

  if (!account) {
    return <AccountGateView onAuthenticated={handleAccountAuthenticated} />;
  }

  if (showModeSelect) {
    return (
      <ModeSelectView
        account={account}
        saveCount={saves.length}
        onPickCareer={() => {
          setAppMode('CAREER');
          setShowModeSelect(false);
        }}
        onPickOnline={() => {
          setAppMode('ONLINE');
          setShowModeSelect(false);
        }}
        onPickRankings={() => {
          setAppMode('RANKINGS');
          setShowModeSelect(false);
        }}
        onSignOut={handleSignOutAccount}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#1d4972] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar */}
      {!(appMode === 'CAREER' && inMatch) && (
        <header className="border-b-2 border-[#3c6fa1] bg-[#143554] sticky top-0 z-30">
          <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between gap-4 sm:gap-8">
            {/* Zone 1: Single-line Wordmark */}
            <button
              type="button"
              onClick={() => {
                retroAudio.play('click');
                setAppMode('CAREER');
                setInMatch(false);
                setTab('HUB');
              }}
              className="font-pixel text-xs sm:text-sm tracking-wide text-[#fde047] whitespace-nowrap shrink-0 hover:text-white transition-colors drop-shadow-[2px_2px_0_#000]"
            >
              RETRO BOWL CAREER
            </button>

            {/* Zone 2: Primary Mode & Career Nav Links */}
            <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-slate-300">
              {appMode === 'CAREER' && activeSave && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.play('click');
                      setTab('HUB');
                    }}
                    className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
                      tab === 'HUB' ? 'text-[#fde047] underline underline-offset-4' : ''
                    }`}
                  >
                    Career Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.play('click');
                      setTab('CLUBHOUSE');
                    }}
                    className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
                      tab === 'CLUBHOUSE' ? 'text-[#fde047] underline underline-offset-4' : ''
                    }`}
                  >
                    Roster & Standings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.play('click');
                      setTab('LIFE');
                    }}
                    className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
                      tab === 'LIFE' ? 'text-[#fde047] underline underline-offset-4' : ''
                    }`}
                  >
                    Stats & Shop
                  </button>
                  <span className="text-[#3c6fa1]">|</span>
                </>
              )}

              {appMode !== 'CAREER' && (
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.play('click');
                    setAppMode('CAREER');
                  }}
                  className="whitespace-nowrap shrink-0 hover:text-white transition-colors"
                >
                  Career Mode
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  retroAudio.play('click');
                  setAppMode('ONLINE');
                }}
                className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
                  appMode === 'ONLINE' ? 'text-[#fde047] underline underline-offset-4' : ''
                }`}
              >
                Online Arena
              </button>

              <button
                type="button"
                onClick={() => {
                  retroAudio.play('click');
                  setAppMode('RANKINGS');
                }}
                className={`whitespace-nowrap shrink-0 hover:text-white transition-colors ${
                  appMode === 'RANKINGS' ? 'text-[#fde047] underline underline-offset-4' : ''
                }`}
              >
                Rankings
              </button>
            </nav>

            {/* Zone 3: Account, Modes & Switch Career Actions */}
            <div className="shrink-0 flex items-center gap-2">
              <span className="hidden lg:inline-block px-2.5 py-1 bg-[#0e253b] border border-[#3c6fa1] text-[11px] font-bold text-[#fde047]">
                {account.username}
              </span>
              <button
                type="button"
                onClick={() => {
                  retroAudio.play('click');
                  setShowModeSelect(true);
                }}
                className="rb-btn-slate px-3 py-2 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Modes
              </button>
              {appMode === 'CAREER' && activeSave ? (
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.play('click');
                    setActiveSaveId(null);
                    setTab('HUB');
                  }}
                  className="rb-btn-slate px-3 py-2 text-xs font-bold whitespace-nowrap shrink-0"
                >
                  Switch Career
                </button>
              ) : appMode !== 'CAREER' ? (
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.play('click');
                    setAppMode('CAREER');
                  }}
                  className="rb-btn-slate px-3 py-2 text-xs font-bold whitespace-nowrap shrink-0"
                >
                  Career
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSignOutAccount}
                className="rb-btn-slate px-3 py-2 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile quick sub-nav */}
          <div className="md:hidden border-t border-[#24344d] px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => setAppMode('CAREER')}
              className={appMode === 'CAREER' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}
            >
              Career
            </button>
            {appMode === 'CAREER' && activeSave && (
              <>
                <button
                  type="button"
                  onClick={() => setTab('HUB')}
                  className={tab === 'HUB' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}
                >
                  Hub
                </button>
                <button
                  type="button"
                  onClick={() => setTab('CLUBHOUSE')}
                  className={tab === 'CLUBHOUSE' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}
                >
                  Roster
                </button>
                <button
                  type="button"
                  onClick={() => setTab('LIFE')}
                  className={tab === 'LIFE' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}
                >
                  Shop
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setAppMode('ONLINE')}
              className={appMode === 'ONLINE' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}
            >
              Online Arena
            </button>
            <button
              type="button"
              onClick={() => setAppMode('RANKINGS')}
              className={appMode === 'RANKINGS' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}
            >
              Rankings
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {appMode === 'ONLINE' ? (
          <OnlineArenaView
            activeSave={activeSave}
            account={account}
            onAccountUpdated={setAccount}
            onOpenRankings={() => setAppMode('RANKINGS')}
          />
        ) : appMode === 'RANKINGS' ? (
          <RankingsView
            activeSave={activeSave}
            account={account}
            onAccountUpdated={setAccount}
          />
        ) : !activeSave ? (
          <CareerCreator
            saves={saves}
            onSelectSave={(id) => {
              setActiveSaveId(id);
              setTab('HUB');
            }}
            onDeleteSave={handleDeleteSave}
            onCreateSave={handleCreateSave}
          />
        ) : inMatch && activeMatchGame ? (
          <MatchDayView
            save={activeSave}
            game={activeMatchGame}
            onSaveMatchResult={handleSaveMatchResult}
            onFinishGame={handleFinishMatch}
            onAbortMatch={() => {
              setInMatch(false);
              setActiveMatchGame(null);
            }}
          />
        ) : isOffseason ? (
          <OffseasonView
            save={activeSave}
            onUpdateSave={updateActiveSave}
            onReturnHome={() => setActiveSaveId(null)}
          />
        ) : tab === 'CLUBHOUSE' ? (
          <RosterStandingsView save={activeSave} />
        ) : tab === 'LIFE' ? (
          <LifeAndLegacyView save={activeSave} onUpdateSave={updateActiveSave} />
        ) : (
          <CareerHub
            save={activeSave}
            onUpdateSave={updateActiveSave}
            onPlayGame={() => {
              if (nextGame) {
                setActiveMatchGame(nextGame);
                setInMatch(true);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}
