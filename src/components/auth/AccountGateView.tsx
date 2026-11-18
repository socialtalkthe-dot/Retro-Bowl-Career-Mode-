import React, { useState } from 'react';
import { ChevronRight, Globe, LogIn, Shield, Swords, Trophy, UserPlus } from 'lucide-react';
import {
  loginAccount,
  PlayerAccount,
  registerAccount,
} from '../../services/accountService';
import { getLeagueBadgeColor } from '../../services/rankingsService';
import { retroAudio } from '../../audio/retroAudio';

interface AccountGateViewProps {
  onAuthenticated: (account: PlayerAccount) => void;
}

const COUNTRY_OPTIONS = [
  { code: 'US', label: 'United States (US)' },
  { code: 'CA', label: 'Canada (CA)' },
  { code: 'GB', label: 'United Kingdom (GB)' },
  { code: 'DE', label: 'Germany (DE)' },
  { code: 'MX', label: 'Mexico (MX)' },
  { code: 'AU', label: 'Australia (AU)' },
  { code: 'JP', label: 'Japan (JP)' },
  { code: 'FR', label: 'France (FR)' },
  { code: 'BR', label: 'Brazil (BR)' },
  { code: 'KR', label: 'South Korea (KR)' },
];

export const AccountGateView: React.FC<AccountGateViewProps> = ({ onAuthenticated }) => {
  const [authTab, setAuthTab] = useState<'SIGNUP' | 'LOGIN'>('SIGNUP');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }
    if (authTab === 'SIGNUP' && password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      retroAudio.play('click');
      const account =
        authTab === 'SIGNUP'
          ? await registerAccount({ username: cleanUser, password, countryCode })
          : await loginAccount({ username: cleanUser, password });
      retroAudio.play('success');
      onAuthenticated(account);
    } catch (err) {
      retroAudio.play('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1d4972] text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="font-pixel text-xs text-[#fde047] tracking-wider drop-shadow-[2px_2px_0_#000]">
            RETRO BOWL CAREER
          </div>
          <h1 className="font-display text-4xl font-extrabold text-white tracking-tight">
            Player Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Create a username and password to save your career progress, online ELO, and leaderboard rank.
          </p>
        </div>

        <div className="rb-panel p-6 space-y-5">
          {/* Switch Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                retroAudio.play('click');
                setAuthTab('SIGNUP');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-pixel flex items-center justify-center gap-1.5 ${
                authTab === 'SIGNUP' ? 'rb-btn-gold' : 'rb-btn-slate'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              CREATE
            </button>
            <button
              type="button"
              onClick={() => {
                retroAudio.play('click');
                setAuthTab('LOGIN');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-pixel flex items-center justify-center gap-1.5 ${
                authTab === 'LOGIN' ? 'rb-btn-gold' : 'rb-btn-slate'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              SIGN IN
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-900/60 border-2 border-red-400 text-xs font-semibold text-red-100">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-300 block">Username</span>
              <input
                type="text"
                required
                maxLength={22}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username..."
                autoComplete="username"
                className="w-full rb-panel-inset px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#fde047]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-300 block">Password</span>
              <input
                type="password"
                required
                maxLength={64}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 4 characters..."
                autoComplete={authTab === 'SIGNUP' ? 'new-password' : 'current-password'}
                className="w-full rb-panel-inset px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#fde047]"
              />
            </label>

            {authTab === 'SIGNUP' && (
              <>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-300 block">Confirm Password</span>
                  <input
                    type="password"
                    required
                    maxLength={64}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password..."
                    autoComplete="new-password"
                    className="w-full rb-panel-inset px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#fde047]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-300 block">Region / Country</span>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full rb-panel-inset px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#fde047]"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="rb-btn-green w-full py-3 px-4 font-pixel text-xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>
                {busy
                  ? 'SAVING...'
                  : authTab === 'SIGNUP'
                    ? 'CREATE ACCOUNT & PLAY'
                    : 'SIGN IN & CONTINUE'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

interface ModeSelectViewProps {
  account: PlayerAccount;
  saveCount: number;
  onPickCareer: () => void;
  onPickOnline: () => void;
  onPickRankings: () => void;
  onSignOut: () => void;
}

export const ModeSelectView: React.FC<ModeSelectViewProps> = ({
  account,
  saveCount,
  onPickCareer,
  onPickOnline,
  onPickRankings,
  onSignOut,
}) => {
  return (
    <div className="min-h-screen bg-[#1d4972] text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="rb-panel p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-pixel text-[10px] text-[#fde047]">
              SIGNED IN AS {account.username.toUpperCase()}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-1">
              Choose Your Mode
            </h1>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`px-3 py-1.5 border text-xs font-bold ${getLeagueBadgeColor(account.onlineLeague)}`}>
              {account.onlineElo} ELO · {account.onlineLeague}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="rb-btn-slate px-3 py-1.5 text-xs font-bold"
            >
              Switch Account
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Career Mode Card */}
          <button
            type="button"
            onClick={() => {
              retroAudio.play('click');
              onPickCareer();
            }}
            className="rb-panel p-6 text-left flex flex-col justify-between gap-5 border-2 border-[#3c6fa1] hover:border-[#fde047] transition-colors group"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 bg-[#143554] border-2 border-[#fde047] flex items-center justify-center">
                <Trophy className="w-6 h-6 text-[#fde047]" />
              </div>
              <div>
                <div className="font-pixel text-xs text-[#fde047]">SINGLE PLAYER</div>
                <h2 className="font-display text-3xl font-extrabold text-white mt-1 group-hover:text-[#fde047] transition-colors">
                  Career Mode
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Start in High School, earn College offers across FBS &amp; FCS conferences, enter the NFL Draft, and build a Hall of Fame career playing your locked position.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#2b547c]">
              <span className="text-xs font-bold text-emerald-300">
                {saveCount > 0 ? `${saveCount} Saved Career${saveCount > 1 ? 's' : ''}` : 'Start New Career'}
              </span>
              <span className="rb-btn-gold px-4 py-2 font-pixel text-[10px] inline-flex items-center gap-1.5">
                PLAY <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>

          {/* Online Arena Card */}
          <button
            type="button"
            onClick={() => {
              retroAudio.play('click');
              onPickOnline();
            }}
            className="rb-panel p-6 text-left flex flex-col justify-between gap-5 border-2 border-[#3c6fa1] hover:border-emerald-400 transition-colors group"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 bg-[#143554] border-2 border-emerald-400 flex items-center justify-center">
                <Swords className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="font-pixel text-xs text-emerald-300">MULTIPLAYER</div>
                <h2 className="font-display text-3xl font-extrabold text-white mt-1 group-hover:text-emerald-300 transition-colors">
                  Online Arena
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Find a player automatically or open a room with friends. Play 1v1 or team up up to 5v5 at individual positions with live room chat and ELO rating.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#2b547c]">
              <span className="text-xs font-bold text-slate-300">
                {account.onlineWins}-{account.onlineLosses} Online Record
              </span>
              <span className="rb-btn-green px-4 py-2 font-pixel text-[10px] inline-flex items-center gap-1.5">
                ENTER <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              retroAudio.play('click');
              onPickRankings();
            }}
            className="rb-btn-slate px-5 py-2.5 text-xs font-bold inline-flex items-center gap-2"
          >
            <Globe className="w-4 h-4 text-[#fde047]" />
            <span>View World Rankings &amp; ELO Leagues</span>
            <Shield className="w-4 h-4 text-sky-300" />
          </button>
        </div>
      </div>
    </div>
  );
};
