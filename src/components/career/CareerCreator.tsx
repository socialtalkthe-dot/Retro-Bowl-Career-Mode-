import React, { useMemo, useState } from 'react';
import { Archetype, CareerSave, Position } from '../../types/career';
import {
  COLLEGE_TEAMS,
  getTeamsForEra,
  NFL_TEAMS,
  US_STATES,
} from '../../data/teams';
import {
  createNewCareer,
  HAIR_COLORS,
  POSITIONS,
  SKIN_TONES,
} from '../../engine/careerEngine';
import { PixelPortrait } from '../shared/PixelPortrait';
import { PixelJerseyPreview } from '../shared/PixelJerseyPreview';
import { retroAudio } from '../../audio/retroAudio';
import { ChevronRight, Trash2 } from 'lucide-react';

interface CareerCreatorProps {
  saves: CareerSave[];
  onSelectSave: (saveId: string) => void;
  onDeleteSave: (saveId: string) => void;
  onCreateSave: (save: CareerSave) => void;
}

export const CareerCreator: React.FC<CareerCreatorProps> = ({
  saves,
  onSelectSave,
  onDeleteSave,
  onCreateSave,
}) => {
  const [firstName, setFirstName] = useState('Marcus');
  const [lastName, setLastName] = useState('Vance');
  const [jersey, setJersey] = useState(7);
  const [position, setPosition] = useState<Position>('QB');
  const [archetype, setArchetype] = useState<Archetype>('Dual-Threat');
  const [faceStyle, setFaceStyle] = useState(0);
  const [skinTone, setSkinTone] = useState(SKIN_TONES[2]);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [startEra, setStartEra] = useState<'HIGH_SCHOOL' | 'COLLEGE' | 'NFL'>('HIGH_SCHOOL');
  const [selectedState, setSelectedState] = useState<string>('Texas');
  const [hsQuery, setHsQuery] = useState<string>('');

  const stateSchools = useMemo(() => getTeamsForEra('HIGH_SCHOOL', selectedState), [selectedState]);
  const filteredSchools = useMemo(() => {
    const q = hsQuery.trim().toLowerCase();
    if (!q) return stateSchools;
    return stateSchools.filter(
      (s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.division.toLowerCase().includes(q)
    );
  }, [stateSchools, hsQuery]);

  const [highSchoolId, setHighSchoolId] = useState<string>(stateSchools[0]?.id ?? '');
  const [collegeTeamId, setCollegeTeamId] = useState<string>(COLLEGE_TEAMS[0].id);
  const [nflTeamId, setNflTeamId] = useState<string>(NFL_TEAMS[0].id);

  const posMeta = POSITIONS.find((p) => p.id === position)!;

  const handleStateChange = (st: string) => {
    retroAudio.play('click');
    setSelectedState(st);
    setHsQuery('');
    const schools = getTeamsForEra('HIGH_SCHOOL', st);
    if (schools.length > 0) setHighSchoolId(schools[0].id);
  };

  const handlePositionChange = (pos: Position) => {
    retroAudio.play('click');
    setPosition(pos);
    const meta = POSITIONS.find((p) => p.id === pos)!;
    setArchetype(meta.archetypes[0]);
  };

  const activeTeam =
    startEra === 'HIGH_SCHOOL'
      ? stateSchools.find((t) => t.id === highSchoolId) ?? stateSchools[0]
      : startEra === 'COLLEGE'
        ? COLLEGE_TEAMS.find((t) => t.id === collegeTeamId) ?? COLLEGE_TEAMS[0]
        : NFL_TEAMS.find((t) => t.id === nflTeamId) ?? NFL_TEAMS[0];

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    retroAudio.play('success');
    const save = createNewCareer({
      firstName,
      lastName,
      jersey: Math.max(0, Math.min(99, jersey)),
      position,
      archetype,
      faceStyle,
      skinTone,
      hairColor,
      state: selectedState,
      highSchoolId: stateSchools.find((t) => t.id === highSchoolId)?.id ?? stateSchools[0].id,
      startEra,
      collegeTeamId,
      nflTeamId,
    });
    onCreateSave(save);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Hero Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b-2 border-[#24344d] pb-6">
        <div>
          <div className="font-pixel text-[10px] text-[#fde047] mb-2">
            HIGH SCHOOL · COLLEGE · PRO CAREER
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none text-balance">
            Retro Bowl Career Mode
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl">
            Play only your position from Friday night state championships to National Signing Day, NIL deals, the NFL Draft, and the Retro Bowl.
          </p>
        </div>
      </div>

      {/* Existing Save Slots */}
      {saves.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-pixel text-xs text-[#fde047]">CONTINUE CAREER</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {saves.map((s) => {
              const t =
                s.era === 'HIGH_SCHOOL'
                  ? getTeamsForEra('HIGH_SCHOOL', s.selectedState).find((x) => x.id === s.teamId)
                  : s.era === 'COLLEGE'
                    ? COLLEGE_TEAMS.find((x) => x.id === s.teamId)
                    : NFL_TEAMS.find((x) => x.id === s.teamId);
              const uni = t?.uniforms.home ?? NFL_TEAMS[0].uniforms.home;
              const rec = s.standings[s.teamId];
              return (
                <div
                  key={s.id}
                  className="rb-panel p-4 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.play('click');
                      onSelectSave(s.id);
                    }}
                    className="flex items-center gap-3 text-left flex-1 min-w-0 group"
                  >
                    <PixelPortrait
                      skinTone={s.player.skinTone}
                      hairColor={s.player.hairColor}
                      faceStyle={s.player.faceStyle}
                      jerseyColor={uni.shirt}
                      sleeveColor={uni.sleeve}
                      helmetColor={uni.helmet}
                      jerseyNumber={s.player.jersey}
                      size={52}
                    />
                    <div className="min-w-0">
                      <div className="font-display text-xl font-bold text-white truncate group-hover:text-[#fde047] transition-colors">
                        {s.player.firstName} {s.player.lastName}
                      </div>
                      <div className="text-xs text-slate-300 truncate">
                        {s.player.position} · #{s.player.jersey} · {t?.name ?? s.teamId}
                      </div>
                      <div className="text-xs font-mono-num text-slate-400 mt-0.5">
                        {s.era.replace('_', ' ')} · S{s.seasonNumber} Wk {s.week} · {rec ? `${rec.wins}-${rec.losses}` : '0-0'}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSave(s.id)}
                    className="p-2 text-slate-400 hover:text-rose-400"
                    aria-label="Delete career save"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* New Career Builder */}
      <form onSubmit={handleStart} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Identity & Position (7 cols) */}
        <div className="lg:col-span-7 rb-panel p-6 flex flex-col gap-6">
          <h2 className="font-pixel text-xs text-[#fde047] border-b-2 border-[#24344d] pb-3">
            01. CREATE YOUR PLAYER
          </h2>

          {/* Name & Jersey */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">First Name</label>
              <input
                type="text"
                maxLength={14}
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rb-panel-inset px-3 py-2 text-sm text-white focus:outline-none focus:border-[#fde047]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Last Name</label>
              <input
                type="text"
                maxLength={14}
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rb-panel-inset px-3 py-2 text-sm text-white focus:outline-none focus:border-[#fde047]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Jersey #</label>
              <input
                type="number"
                min={0}
                max={99}
                value={jersey}
                onChange={(e) => setJersey(Number(e.target.value))}
                className="w-full rb-panel-inset px-3 py-2 text-sm font-mono-num text-white focus:outline-none focus:border-[#fde047]"
              />
            </div>
          </div>

          {/* Appearance */}
          <div className="flex flex-wrap items-center gap-6">
            <PixelPortrait
              skinTone={skinTone}
              hairColor={hairColor}
              faceStyle={faceStyle}
              jerseyColor={activeTeam.uniforms.home.shirt}
              sleeveColor={activeTeam.uniforms.home.sleeve}
              helmetColor={activeTeam.uniforms.home.helmet}
              jerseyNumber={jersey}
              size={72}
            />
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-16">Skin</span>
                <div className="flex gap-1.5">
                  {SKIN_TONES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSkinTone(c)}
                      className={`w-6 h-6 border-2 ${skinTone === c ? 'border-[#fde047] scale-110' : 'border-white/20'}`}
                      style={{ backgroundColor: c }}
                      aria-label="Select skin tone"
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-16">Hair</span>
                <div className="flex gap-1.5">
                  {HAIR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setHairColor(c)}
                      className={`w-6 h-6 border-2 ${hairColor === c ? 'border-[#fde047] scale-110' : 'border-white/20'}`}
                      style={{ backgroundColor: c }}
                      aria-label="Select hair color"
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-16">Face</span>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFaceStyle(st)}
                      className={`px-2.5 py-1 text-xs font-mono-num border-2 ${
                        faceStyle === st
                          ? 'bg-[#eab308] text-slate-950 border-[#fde047] font-bold'
                          : 'bg-[#0e1624] text-slate-300 border-[#24344d]'
                      }`}
                    >
                      {st + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Position Picker */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Select Position (Play Only Your Role)</label>
            <div className="grid grid-cols-5 gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePositionChange(p.id)}
                  className={`py-2.5 px-2 border-2 text-center transition-colors ${
                    position === p.id
                      ? 'bg-[#eab308] text-slate-950 border-[#fde047] font-bold'
                      : 'bg-[#0e1624] text-slate-200 border-[#24344d] hover:border-[#3c5173]'
                  }`}
                >
                  <div className="font-display text-lg leading-none">{p.id}</div>
                  <div className={`text-[10px] mt-1 ${position === p.id ? 'text-slate-900' : 'text-slate-400'}`}>
                    {p.unit === 'OFFENSE' ? 'OFF' : p.unit === 'DEFENSE' ? 'DEF' : 'ST'}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-300 mt-2.5">{posMeta.description}</p>
          </div>

          {/* Archetype */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Player Archetype</label>
            <div className="flex flex-wrap gap-2">
              {posMeta.archetypes.map((arch) => (
                <button
                  key={arch}
                  type="button"
                  onClick={() => setArchetype(arch)}
                  className={`px-3.5 py-2 text-xs font-bold border-2 transition-colors ${
                    archetype === arch
                      ? 'bg-white text-slate-950 border-white'
                      : 'bg-[#0e1624] text-slate-300 border-[#24344d] hover:border-[#3c5173]'
                  }`}
                >
                  {arch}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Starting Era & Real Team Selection (5 cols) */}
        <div className="lg:col-span-5 rb-panel p-6 flex flex-col gap-5">
          <h2 className="font-pixel text-xs text-[#fde047] border-b-2 border-[#24344d] pb-3">
            02. PATH & REAL TEAM
          </h2>

          {/* Starting Level */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Starting Career Era</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'HIGH_SCHOOL', label: 'High School' },
                  { id: 'COLLEGE', label: 'College' },
                  { id: 'NFL', label: 'NFL Pro' },
                ] as const
              ).map((era) => (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => setStartEra(era.id)}
                  className={`py-2 px-3 text-xs font-bold border-2 whitespace-nowrap ${
                    startEra === era.id
                      ? 'bg-[#eab308] text-slate-950 border-[#fde047]'
                      : 'bg-[#0e1624] text-slate-300 border-[#24344d] hover:border-[#3c5173]'
                  }`}
                >
                  {era.label}
                </button>
              ))}
            </div>
          </div>

          {/* State & High School Selection */}
          {startEra === 'HIGH_SCHOOL' && (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs text-slate-400">
                    Select State <span className="text-[#fde047]">(50 States · 1,000 Schools)</span>
                  </label>
                </div>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full rb-panel-inset px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#fde047]"
                >
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs text-slate-400">
                    Real {selectedState} High Schools ({filteredSchools.length}/{stateSchools.length})
                  </label>
                </div>
                <input
                  type="text"
                  value={hsQuery}
                  onChange={(e) => setHsQuery(e.target.value)}
                  placeholder={`Filter ${selectedState} schools or cities...`}
                  className="w-full rb-panel-inset px-3 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-[#fde047]"
                />
                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredSchools.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => {
                        retroAudio.play('click');
                        setHighSchoolId(school.id);
                      }}
                      className={`flex items-center justify-between px-3 py-2 border-2 text-left transition-colors ${
                        highSchoolId === school.id
                          ? 'bg-[#1f2d42] border-[#fde047] text-white'
                          : 'bg-[#0e1624] border-[#24344d] text-slate-300 hover:border-[#3c5173]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-6 border border-white/25 shrink-0"
                          style={{ backgroundColor: school.uniforms.home.shirt }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{school.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {school.city} · {school.division}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono-num text-xs text-[#fde047] shrink-0">
                        OFF {school.offense} / DEF {school.defense}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* College Team Selector */}
          {startEra === 'COLLEGE' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Select Real FBS Program</label>
              <select
                value={collegeTeamId}
                onChange={(e) => setCollegeTeamId(e.target.value)}
                className="w-full rb-panel-inset px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#fde047]"
              >
                {COLLEGE_TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.conference})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* NFL Team Selector */}
          {startEra === 'NFL' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Select Real NFL Franchise</label>
              <select
                value={nflTeamId}
                onChange={(e) => setNflTeamId(e.target.value)}
                className="w-full rb-panel-inset px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#fde047]"
              >
                {NFL_TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.division})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Retro Bowl Player Sprite Preview */}
          <div className="rb-panel-inset p-4 flex items-center gap-4">
            <PixelJerseyPreview
              uniform={activeTeam.uniforms.home}
              jerseyNumber={jersey}
              skinTone={skinTone}
              position={position}
              size={76}
              animate
            />
            <div className="min-w-0">
              <div className="font-pixel text-[9px] text-[#fde047]">
                {activeTeam.conference} · {activeTeam.division}
              </div>
              <div className="font-display text-2xl font-bold text-white truncate mt-1">
                {activeTeam.name}
              </div>
              <div className="text-xs text-slate-400">
                {activeTeam.city} · {activeTeam.stadium ?? 'Home Field'}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="rb-btn-gold w-full py-3.5 px-5 font-pixel text-xs inline-flex items-center justify-center gap-2"
          >
            START CAREER
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
