import { useEffect, useState } from 'react';
import { CareerSave, ScheduleGame, StatLine } from './types/career';
import { applyMatchOutcome } from './engine/careerEngine';
import { CareerCreator } from './components/career/CareerCreator';
import { CareerHub } from './components/career/CareerHub';
import { RosterStandingsView } from './components/career/RosterStandingsView';
import { LifeAndLegacyView } from './components/career/LifeAndLegacyView';
import { OffseasonView } from './components/career/OffseasonView';
import { MatchDayView } from './components/game/MatchDayView';
import { retroAudio } from './audio/retroAudio';

const STORAGE_KEY = 'rb_career_mode_saves_v1';

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
  const [tab, setTab] = useState<NavTab>('HUB');
  const [inMatch, setInMatch] = useState(false);
  const [activeMatchGame, setActiveMatchGame] = useState<ScheduleGame | null>(null);

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

  const activeSave = saves.find((s) => s.id === activeSaveId) ?? null;

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

  return (
    <div className="min-h-screen bg-[#1d4972] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="border-b-2 border-[#3c6fa1] bg-[#143554] sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Wordmark */}
          <button
            type="button"
            onClick={() => {
              retroAudio.play('click');
              setInMatch(false);
              setTab('HUB');
            }}
            className="font-pixel text-xs sm:text-sm tracking-wide text-[#fde047] whitespace-nowrap shrink-0 hover:text-white transition-colors drop-shadow-[2px_2px_0_#000]"
          >
            RETRO BOWL CAREER
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
            {activeSave && !inMatch && (
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
              </>
            )}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            {activeSave && !inMatch && (
              <button
                type="button"
                onClick={() => {
                  retroAudio.play('click');
                  setActiveSaveId(null);
                  setTab('HUB');
                }}
                className="rb-btn-slate px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0"
              >
                Switch Career
              </button>
            )}
          </div>
        </div>

        {/* Mobile quick sub-nav when inside career */}
        {activeSave && !inMatch && (
          <div className="md:hidden border-t border-[#24344d] px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-semibold text-slate-300">
            <button type="button" onClick={() => setTab('HUB')} className={tab === 'HUB' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}>
              Career Hub
            </button>
            <button type="button" onClick={() => setTab('CLUBHOUSE')} className={tab === 'CLUBHOUSE' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}>
              Roster & Standings
            </button>
            <button type="button" onClick={() => setTab('LIFE')} className={tab === 'LIFE' ? 'text-[#fde047] whitespace-nowrap' : 'whitespace-nowrap'}>
              Stats & Shop
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {!activeSave ? (
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
