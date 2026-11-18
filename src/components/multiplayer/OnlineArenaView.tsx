import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Eye,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  CareerSave,
  PlayerProfile,
  Position,
  WeatherType,
} from '../../types/career';
import { COLLEGE_TEAMS, NFL_TEAMS, getTeamById } from '../../data/teams';
import {
  FieldCanvas,
  OnlineActorSlot,
  OnlineFieldSnapshot,
  OnlineRemoteAction,
  PlayOutcome,
} from '../game/FieldCanvas';
import { retroAudio } from '../../audio/retroAudio';
import { auth, onAuthStateChanged, User } from '../../firebase';
import {
  fetchMyRankingProfile,
  getEloLeague,
  getLeagueBadgeColor,
  GlobalRegion,
  RankingProfile,
  recordOnlineMatchResult,
  upsertMyRankingProfile,
} from '../../services/rankingsService';
import { PlayerAccount, recordOnlineEloToServer } from '../../services/accountService';

type TeamSide = 'MY' | 'OPP';
type MemberSide = TeamSide | 'SPECTATOR';
type RoomMode = 'SOLO' | 'COOP';
type RoomStatus = 'LOBBY' | 'LIVE' | 'FINAL';

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
  matchmakingOpen?: boolean;
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
}

interface PublicRoomSummary {
  code: string;
  name: string;
  mode: RoomMode;
  matchmakingOpen?: boolean;
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
}

interface OnlineArenaViewProps {
  activeSave: CareerSave | null;
  account?: PlayerAccount | null;
  onAccountUpdated?: (account: PlayerAccount) => void;
  onOpenRankings: () => void;
}

const OFFENSE_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'OL'];
const DEFENSE_POSITIONS: Position[] = ['DL', 'LB', 'CB', 'S'];
const WEATHERS: WeatherType[] = ['SUN', 'RAIN', 'SNOW', 'WIND', 'STORM', 'FOG', 'BLIZZARD'];

export const OnlineArenaView: React.FC<OnlineArenaViewProps> = ({
  activeSave,
  account,
  onAccountUpdated,
  onOpenRankings,
}) => {
  const [fbUser, setFbUser] = useState<User | null>(auth.currentUser);
  const [myRankProfile, setMyRankProfile] = useState<RankingProfile | null>(null);

  const defaultHandle = useMemo(() => {
    if (account?.username) return account.username.slice(0, 22);
    if (activeSave) return `${activeSave.player.firstName[0]}. ${activeSave.player.lastName}`.slice(0, 22);
    if (fbUser?.displayName) return fbUser.displayName.slice(0, 22);
    return 'Player';
  }, [account?.username, activeSave, fbUser]);

  const [playerName, setPlayerName] = useState<string>(defaultHandle);
  const [clientId, setClientId] = useState<string>('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Quick matchmaking state
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [matchQueueCount, setMatchQueueCount] = useState(0);
  const [matchPrefMode, setMatchPrefMode] = useState<'ANY' | 'COOP' | 'SOLO'>('ANY');
  const [matchPrefPos, setMatchPrefPos] = useState<Position>(activeSave?.player.position ?? 'QB');

  // Create room form state
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('Friday Night 5v5');
  const [roomMode, setRoomMode] = useState<RoomMode>('COOP');
  const [isPublic, setIsPublic] = useState(true);
  const [matchmakingOpenOnCreate, setMatchmakingOpenOnCreate] = useState(true);
  const [quarterLength, setQuarterLength] = useState<2 | 2.5 | 3>(2.5);
  const [teamAId, setTeamAId] = useState<string>(activeSave?.teamId && getTeamById(activeSave.teamId) ? activeSave.teamId : 'kc');
  const [teamBId, setTeamBId] = useState<string>('phi');
  const [weather, setWeather] = useState<WeatherType>('SUN');
  const [startPos, setStartPos] = useState<Position>(activeSave?.player.position ?? 'QB');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Live match UI controls
  const [bulletPassEnabled, setBulletPassEnabled] = useState(false);
  const [driveDirection, setDriveDirection] = useState<'RIGHT' | 'LEFT' | 'BOTH'>('RIGHT');
  const [isMuted, setIsMuted] = useState(retroAudio.isMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fieldContainerRef = useRef<HTMLDivElement | null>(null);

  // Multiplayer WebSocket & Bridge Refs
  const wsRef = useRef<WebSocket | null>(null);
  const remoteInputsRef = useRef<Record<string, { mx: number; my: number }>>({});
  const pendingActionsRef = useRef<OnlineRemoteAction[]>([]);
  const remoteSnapshotRef = useRef<OnlineFieldSnapshot | null>(null);
  const recordedFinalSeedRef = useRef<string>('');
  const [eloSummaryMsg, setEloSummaryMsg] = useState<string | null>(null);

  const onlineTeams = useMemo(() => [...NFL_TEAMS, ...COLLEGE_TEAMS.slice(0, 40)], []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFbUser(u);
      if (u) {
        try {
          const prof = await fetchMyRankingProfile(u.uid);
          setMyRankProfile(prof);
        } catch {
          // Ignore transient read issue
        }
      } else {
        setMyRankProfile(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    let active = true;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        ws.send(
          JSON.stringify({
            type: 'hello',
            name: playerName,
            uid: account?.id ?? fbUser?.uid,
            elo: account?.onlineElo ?? myRankProfile?.onlineElo ?? 1000,
          })
        );
      };

      ws.onmessage = (evt) => {
        if (!active) return;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(evt.data as string) as Record<string, unknown>;
        } catch {
          return;
        }

        if (msg.type === 'welcome') {
          if (typeof msg.clientId === 'string') setClientId(msg.clientId);
          if (Array.isArray(msg.rooms)) setPublicRooms(msg.rooms as PublicRoomSummary[]);
          return;
        }

        if (msg.type === 'rooms:list') {
          if (Array.isArray(msg.rooms)) setPublicRooms(msg.rooms as PublicRoomSummary[]);
          return;
        }

        if (msg.type === 'matchmake:searching') {
          setIsSearchingMatch(true);
          if (typeof msg.queueSize === 'number') setMatchQueueCount(msg.queueSize);
          return;
        }

        if (msg.type === 'matchmake:cancelled') {
          setIsSearchingMatch(false);
          setMatchQueueCount(0);
          return;
        }

        if (msg.type === 'matchmake:matched') {
          setIsSearchingMatch(false);
          setMatchQueueCount(0);
          retroAudio.play('beep2');
          return;
        }

        if (msg.type === 'room:error') {
          setErrorBanner(typeof msg.error === 'string' ? msg.error : 'Action failed.');
          setTimeout(() => setErrorBanner(null), 4000);
          return;
        }

        if (msg.type === 'room:left') {
          setRoom(null);
          remoteSnapshotRef.current = null;
          remoteInputsRef.current = {};
          pendingActionsRef.current = [];
          return;
        }

        if (msg.type === 'room:state') {
          const nextRoom = msg.room as RoomRecord;
          setRoom(nextRoom);
          setIsSearchingMatch(false);
          if (nextRoom.status === 'LOBBY') {
            remoteSnapshotRef.current = null;
            setEloSummaryMsg(null);
          }
          return;
        }

        if (msg.type === 'room:chat') {
          const chatMsg = msg.message as RoomChatMessage;
          setRoom((prev) => (prev ? { ...prev, chat: [...prev.chat.slice(-79), chatMsg] } : prev));
          setChatDrawerOpen((open) => {
            if (!open) setUnreadCount((u) => u + 1);
            return open;
          });
          return;
        }

        if (msg.type === 'game:snapshot') {
          remoteSnapshotRef.current = msg.snapshot as OnlineFieldSnapshot;
          return;
        }

        if (msg.type === 'game:input') {
          const slotKey = typeof msg.slotKey === 'string' ? msg.slotKey : '';
          if (slotKey) {
            remoteInputsRef.current[slotKey] = {
              mx: Number(msg.mx) || 0,
              my: Number(msg.my) || 0,
            };
          }
          return;
        }

        if (msg.type === 'game:action') {
          const act = msg.action as OnlineRemoteAction | undefined;
          if (act) {
            pendingActionsRef.current.push(act);
          }
        }
      };

      ws.onclose = () => {
        if (active) {
          setTimeout(() => {
            if (active) connect();
          }, 1800);
        }
      };
    };

    connect();
    return () => {
      active = false;
      wsRef.current?.close();
    };
  }, []);

  // Re-identify when playerName, account, fbUser, or ELO updates
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'hello',
          name: playerName,
          uid: account?.id ?? fbUser?.uid,
          elo: account?.onlineElo ?? myRankProfile?.onlineElo ?? 1000,
        })
      );
    }
  }, [playerName, account?.id, account?.onlineElo, fbUser?.uid, myRankProfile?.onlineElo]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat.length, chatDrawerOpen]);

  // Persist ELO + Online Match record when match finishes
  useEffect(() => {
    if (!room || room.status !== 'FINAL') return;
    const key = `${room.code}:${room.playSeed}`;
    if (recordedFinalSeedRef.current === key) return;
    recordedFinalSeedRef.current = key;

    const localMember = room.members.find((m) => m.clientId === clientId);
    const isHost = room.hostClientId === clientId;
    const teamA = getTeamById(room.teamAId);
    const teamB = getTeamById(room.teamBId);

    const runSave = async () => {
      if (localMember && (localMember.side === 'MY' || localMember.side === 'OPP')) {
        const oppMembers = room.members.filter(
          (m) => m.side !== localMember.side && m.side !== 'SPECTATOR'
        );
        const avgOppElo =
          oppMembers.length > 0
            ? Math.round(oppMembers.reduce((a, m) => a + m.elo, 0) / oppMembers.length)
            : 1000;
        const myFinal = localMember.side === 'MY' ? room.myScore : room.oppScore;
        const oppFinal = localMember.side === 'MY' ? room.oppScore : room.myScore;
        const won = myFinal > oppFinal;
        const margin = myFinal - oppFinal;

        if (account) {
          const serverRes = await recordOnlineEloToServer({
            won,
            oppElo: avgOppElo,
            margin,
            favoriteTeamId: localMember.side === 'MY' ? room.teamAId : room.teamBId,
          });
          if (serverRes) {
            onAccountUpdated?.(serverRes.account);
            const diff = serverRes.eloDelta;
            setEloSummaryMsg(
              `ELO ${diff >= 0 ? `+${diff}` : diff} (${serverRes.account.onlineElo} · ${serverRes.account.onlineLeague})`
            );
          }
        }

        if (auth.currentUser && auth.currentUser.emailVerified) {
          try {
            const prevElo = myRankProfile?.onlineElo ?? 1000;
            const updated = await upsertMyRankingProfile({
              displayName: playerName,
              region: (myRankProfile?.region ?? 'US') as GlobalRegion,
              countryCode: myRankProfile?.countryCode ?? 'US',
              save: activeSave,
              onlineEloDelta: { won, oppElo: avgOppElo, margin },
            });
            if (updated) {
              setMyRankProfile(updated);
              if (!account) {
                const diff = updated.onlineElo - prevElo;
                setEloSummaryMsg(
                  `ELO ${diff >= 0 ? `+${diff}` : diff} (${updated.onlineElo} · ${updated.onlineLeague})`
                );
              }
            }
          } catch {
            // Ignore non-fatal ELO update error
          }
        }
      }

      if (isHost && auth.currentUser && auth.currentUser.emailVerified) {
        try {
          const participantUids = room.members
            .map((m) => m.uid)
            .filter((u): u is string => Boolean(u));
          await recordOnlineMatchResult({
            matchId: `${room.code}_${Date.now()}`,
            mode: room.mode === 'COOP' ? 'COOP_VS_PVP' : 'SOLO_PVP',
            homeTeamName: teamA.name,
            awayTeamName: teamB.name,
            homeScore: room.myScore,
            awayScore: room.oppScore,
            participantUids,
          });
        } catch {
          // Ignore non-fatal match log error
        }
      }
    };

    void runSave();
  }, [room?.status, room?.code, room?.playSeed]);

  const sendWs = (payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setErrorBanner('Connecting to game server... try again in a moment.');
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  const handleFindMatch = () => {
    retroAudio.play('click');
    setIsSearchingMatch(true);
    sendWs({
      type: 'matchmake:find',
      playerName,
      uid: account?.id ?? fbUser?.uid,
      elo: account?.onlineElo ?? myRankProfile?.onlineElo ?? 1000,
      preferredMode: matchPrefMode,
      preferredPosition: matchPrefPos,
    });
  };

  const handleCancelSearch = () => {
    retroAudio.play('click');
    setIsSearchingMatch(false);
    setMatchQueueCount(0);
    sendWs({ type: 'matchmake:cancel' });
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    retroAudio.play('click');
    sendWs({
      type: 'room:create',
      roomName,
      playerName,
      uid: account?.id ?? fbUser?.uid,
      elo: account?.onlineElo ?? myRankProfile?.onlineElo ?? 1000,
      isPublic,
      matchmakingOpen: isPublic && matchmakingOpenOnCreate,
      mode: roomMode,
      quarterLength,
      teamAId,
      teamBId,
      weather,
      position: startPos,
    });
    setShowCreate(false);
  };

  const handleJoinRoom = (code: string, preferredSide: MemberSide = 'MY') => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    retroAudio.play('click');
    sendWs({
      type: 'room:join',
      code: clean,
      playerName,
      uid: account?.id ?? fbUser?.uid,
      elo: account?.onlineElo ?? myRankProfile?.onlineElo ?? 1000,
      side: preferredSide,
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt) return;
    sendWs({ type: 'room:chat', text: txt });
    setChatInput('');
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && fieldContainerRef.current) {
        await fieldContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Ignore fullscreen browser restriction
    }
  };

  const localMember = room?.members.find((m) => m.clientId === clientId) ?? null;
  const isHost = Boolean(room && room.hostClientId === clientId);

  const handleHostPlayComplete = (outcome: PlayOutcome) => {
    if (!room || !isHost || room.status !== 'LIVE') return;

    let myScore = room.myScore;
    let oppScore = room.oppScore;
    let possession: TeamSide = room.possession;
    let ballYard = room.ballYard;
    let down = room.down;
    let yardsToGo = room.yardsToGo;
    let quarter = room.quarter;
    let clockSec = room.clockSec;
    let isGameOver = false;

    const addPoints = (side: TeamSide, pts: number) => {
      if (side === 'MY') myScore += pts;
      else oppScore += pts;
    };

    const otherSide = (s: TeamSide): TeamSide => (s === 'MY' ? 'OPP' : 'MY');

    const timeUsed = outcome.clockStopped
      ? Math.floor(Math.random() * 4) + 3
      : Math.floor(Math.random() * 6) + 6;
    clockSec -= timeUsed;
    if (clockSec <= 0) {
      if (quarter < 4) {
        quarter += 1;
        clockSec = Math.round(room.quarterLength * 60);
      } else if (quarter === 4 && myScore === oppScore) {
        quarter = 5; // OT
        clockSec = Math.round(room.quarterLength * 60);
      } else {
        clockSec = 0;
        isGameOver = true;
      }
    }

    if (outcome.isTouchdown) {
      addPoints(possession, 7);
      possession = otherSide(possession);
      ballYard = 25;
      down = 1;
      yardsToGo = 10;
    } else if (outcome.isSafety) {
      addPoints(otherSide(possession), 2);
      possession = otherSide(possession);
      ballYard = 35;
      down = 1;
      yardsToGo = 10;
    } else if (outcome.isTurnover) {
      const spot = Math.max(5, Math.min(95, ballYard + outcome.yardsGained));
      possession = otherSide(possession);
      ballYard = Math.max(1, Math.min(99, 100 - spot));
      down = 1;
      yardsToGo = Math.min(10, 100 - ballYard);
    } else {
      const newSpot = Math.max(1, Math.min(99, ballYard + outcome.yardsGained));
      if (outcome.yardsGained >= yardsToGo || outcome.isFirstDown) {
        ballYard = newSpot;
        down = 1;
        yardsToGo = Math.min(10, 100 - ballYard);
      } else if (down >= 4) {
        // Turnover on downs
        possession = otherSide(possession);
        ballYard = Math.max(1, Math.min(99, 100 - newSpot));
        down = 1;
        yardsToGo = Math.min(10, 100 - ballYard);
      } else {
        ballYard = newSpot;
        down += 1;
        yardsToGo = Math.max(1, yardsToGo - outcome.yardsGained);
      }
    }

    sendWs({
      type: 'room:play_outcome',
      playSeed: room.playSeed,
      myScore,
      oppScore,
      possession,
      ballYard,
      down,
      yardsToGo,
      quarter,
      clockSec,
      isGameOver,
      latestPlay: outcome.commentary,
    });
  };

  // Build PlayerProfile + ActiveSlots for FieldCanvas during LIVE play
  const activeSlots: OnlineActorSlot[] = useMemo(() => {
    if (!room) return [];
    const list: OnlineActorSlot[] = [];
    for (const m of room.members) {
      if ((m.side === 'MY' || m.side === 'OPP') && m.position) {
        list.push({
          slotKey: `${m.side}:${m.position}`,
          side: m.side,
          position: m.position,
          playerName: m.name,
          clientId: m.clientId,
        });
      }
    }
    return list;
  }, [room]);

  const myPlayerProfile: PlayerProfile = useMemo(() => {
    const base = activeSave?.player;
    const lockedPos = localMember?.position ?? 'QB';
    if (base) {
      return {
        ...base,
        position: lockedPos,
        condition: 96,
      };
    }
    return {
      firstName: playerName.split(' ')[0] ?? 'Online',
      lastName: playerName.split(' ').slice(1).join(' ') || 'Pro',
      jersey: lockedPos === 'QB' ? 12 : lockedPos === 'RB' ? 24 : lockedPos === 'WR' ? 81 : 54,
      position: lockedPos,
      archetype: 'Playmaker',
      height: '6\'1"',
      weight: 210,
      age: 24,
      faceStyle: 0,
      skinTone: '#d49a6a',
      hairColor: '#1f2937',
      homeState: 'TX',
      highSchoolId: 'hs_tx_1',
      starRating: 4.0,
      recruitingStars: 4,
      level: 5,
      xp: 0,
      xpToNext: 1000,
      skillPoints: 0,
      attributes: { speed: 7, strength: 6, stamina: 8, skill: 7 },
      maxAttributes: { speed: 9, strength: 8, stamina: 9, skill: 9 },
      condition: 96,
      morale: 85,
      injuryWeeks: 0,
      injuryType: '',
      traits: [],
      relationships: { coach: 80, teammates: 80, fans: 80, agent: 80, gpa: 3.5 },
      cash: 0,
      nrgDrinks: 0,
      ownedItemIds: [],
      contract: {
        salaryPerYear: 10,
        tdBonus: 1,
        yearsLeft: 2,
        role: 'Starter',
        nilDeals: [],
      },
    };
  }, [activeSave, localMember?.position, playerName]);

  // 1) LIVE MATCH RENDER (FULL-VIEWPORT FIELD + COLLAPSIBLE CHAT)
  if (room && room.status === 'LIVE') {
    const teamA = getTeamById(room.teamAId);
    const teamB = getTeamById(room.teamBId);
    const localSlotKey =
      localMember && (localMember.side === 'MY' || localMember.side === 'OPP') && localMember.position
        ? `${localMember.side}:${localMember.position}`
        : undefined;

    const bridgeMode: 'HOST' | 'CLIENT' | 'SPECTATOR' = isHost
      ? 'HOST'
      : localMember?.side === 'SPECTATOR'
        ? 'SPECTATOR'
        : 'CLIENT';

    // When Host runs the field simulation:
    // FieldCanvas marks USER only when `player.position` belongs to the team with the ball (`OFFENSE`) or defending (`DEFENSE`).
    // If Host chose a slot on MY (`playMode` when MY has ball is 'OFFENSE', when OPP has ball is 'DEFENSE'),
    // passing `localMember.position` directly makes FieldCanvas ONLY let Host control that exact locked position!
    // What if Host is on OPP or SPECTATOR while another client is on MY? Then Host must NOT steal a MY actor as USER,
    // so we pass a role that stays non-USER on MY (and OPP's slot runs via remoteInputsRef!).
    const hostCanBeUser =
      localMember &&
      ((localMember.side === 'MY' &&
        ((room.possession === 'MY' && OFFENSE_POSITIONS.includes(localMember.position ?? 'QB')) ||
          (room.possession === 'OPP' && DEFENSE_POSITIONS.includes(localMember.position ?? 'QB')))) ||
        (localMember.side === 'OPP' &&
          ((room.possession === 'OPP' && OFFENSE_POSITIONS.includes(localMember.position ?? 'QB')) ||
            (room.possession === 'MY' && DEFENSE_POSITIONS.includes(localMember.position ?? 'QB')))));

    // Wait: inside FieldCanvas, `USER` is strictly on `myTeam` (either OFF when playMode==='OFFENSE', or DEF when playMode==='DEFENSE').
    // So if Host locked an `OPP` slot, `OPP` is simulated via `remoteInputsRef`? Let's make Host ONLY control `USER` if `localMember.side === 'MY'`, OR allow `activeSlots` to include Host if Host is `OPP` and feed Host's local keys? Wait: even better, if `localMember.side === 'MY'` && `hostCanBeUser`, Host is native `USER`! And if Host is `OPP`, or `SPECTATOR`, pass `position: 'K'` so no MY scrimmage actor becomes `USER`, while keeping Host's `OPP` slot out/managed cleanly — actually wait: let's simply keep Host on `'MY'` Team A by default or if Host joins `'OPP'`, pass `K` (non-scrimmage) AND allow keyboard local input to drive Host's `remoteInputsRef[localSlotKey]` directly! Look how clean that is!
    const canvasPlayer: PlayerProfile = isHost
      ? localMember?.side === 'MY' && hostCanBeUser
        ? myPlayerProfile
        : { ...myPlayerProfile, position: 'K' }
      : myPlayerProfile;

    const remoteHostKeySlots = activeSlots.filter((s) => !(isHost && s.clientId === clientId && localMember?.side === 'MY'));

    return (
      <div
        ref={fieldContainerRef}
        className="relative w-full h-[calc(100vh-4.1rem)] min-h-[500px] bg-[#0a1929] overflow-hidden flex flex-col"
      >
        <div className="flex-1 w-full h-full relative">
          <FieldCanvas
            key={isHost ? `${room.code}-${room.playSeed}` : `${room.code}-client`}
            player={canvasPlayer}
            myTeam={teamA}
            oppTeam={teamB}
            myUniform={teamA.uniforms.home}
            oppUniform={teamB.uniforms.away}
            era={teamA.era === 'NFL' ? 'NFL' : 'COLLEGE'}
            ballYard={room.ballYard}
            down={room.down}
            yardsToGo={room.yardsToGo}
            weather={room.weather}
            playMode={room.possession === 'MY' ? 'OFFENSE' : 'DEFENSE'}
            quarter={room.quarter}
            clockSec={room.clockSec}
            driveDirection={driveDirection}
            crowdTurnout={0.95}
            bulletPassEnabled={bulletPassEnabled}
            onToggleBulletPass={() => setBulletPassEnabled((b) => !b)}
            onPlayComplete={handleHostPlayComplete}
            fullscreenHud={{
              myScore: room.myScore,
              oppScore: room.oppScore,
              latestPlay: `${room.mode === 'COOP' ? '5v5 CO-OP' : '1v1'} · ${room.latestPlay}`,
              isMuted,
              isFullscreen,
              onToggleMute: () => {
                const next = !isMuted;
                retroAudio.setMuted(next);
                setIsMuted(next);
              },
              onToggleFullscreen: handleToggleFullscreen,
              onCycleDriveDirection: () =>
                setDriveDirection((d) => (d === 'RIGHT' ? 'LEFT' : d === 'LEFT' ? 'BOTH' : 'RIGHT')),
              onExitMatch: () => sendWs({ type: 'room:leave' }),
            }}
            multiplayerBridge={{
              mode: bridgeMode,
              localSlotKey,
              activeSlots: remoteHostKeySlots,
              remoteInputsRef,
              pendingActionsRef,
              remoteSnapshotRef,
              onEmitSnapshot: (snap) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'game:snapshot', snapshot: snap }));
                }
              },
              onEmitClientInput: (input) => {
                if (wsRef.current?.readyState === WebSocket.OPEN && localSlotKey) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'game:input',
                      slotKey: localSlotKey,
                      mx: input.mx,
                      my: input.my,
                    })
                  );
                }
              },
              onEmitClientAction: (action) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'game:action', action }));
                }
              },
            }}
          />

          {/* Compact Slot Indicator Pill (Bottom Right, above Chat toggle) */}
          <div className="pointer-events-none absolute bottom-14 right-3 z-20 px-2.5 py-1 bg-[#0e253b]/90 border border-[#3c6fa1] text-[10px] font-bold text-slate-200 flex items-center gap-2">
            {localMember?.side === 'SPECTATOR' ? (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>SPECTATING</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#fde047]" />
                <span>
                  {localMember?.side === 'MY' ? teamA.shortName : teamB.shortName} ·{' '}
                  <strong className="text-[#fde047]">{localMember?.position}</strong>
                </span>
              </>
            )}
          </div>

          {/* Collapsible Live Chat Drawer Button */}
          <button
            type="button"
            onClick={() => {
              setChatDrawerOpen((o) => !o);
              setUnreadCount(0);
            }}
            className="absolute bottom-3 right-3 z-30 rb-btn-slate px-3 py-2 text-xs font-bold flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-[#fde047]" />
            <span>Room Chat</span>
            {unreadCount > 0 && !chatDrawerOpen && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-pixel">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Expandable Live Chat Overlay */}
          {chatDrawerOpen && (
            <div className="absolute bottom-14 right-3 z-30 w-80 max-w-[92vw] h-80 rb-panel flex flex-col">
              <div className="px-3 py-2 border-b border-[#2b547c] flex items-center justify-between bg-[#0e253b]">
                <span className="font-pixel text-[10px] text-[#fde047]">
                  ROOM {room.code} CHAT
                </span>
                <button
                  type="button"
                  onClick={() => setChatDrawerOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 text-xs">
                {room.chat.map((c) => (
                  <div key={c.id} className={c.isSystem ? 'text-sky-300 italic' : 'text-slate-100'}>
                    {!c.isSystem && (
                      <span
                        className={`font-bold mr-1.5 ${
                          c.side === 'MY'
                            ? 'text-[#fde047]'
                            : c.side === 'OPP'
                              ? 'text-rose-400'
                              : 'text-sky-400'
                        }`}
                      >
                        [{c.side === 'SPECTATOR' ? 'SPEC' : `${c.side === 'MY' ? teamA.shortName : teamB.shortName} ${c.position ?? ''}`}] {c.senderName}:
                      </span>
                    )}
                    <span>{c.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="p-2 border-t border-[#2b547c] flex gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Say something..."
                  maxLength={240}
                  className="flex-1 bg-[#0b1e30] border border-[#3c6fa1] px-2 py-1 text-xs text-white focus:outline-none focus:border-[#fde047]"
                />
                <button type="submit" className="rb-btn-gold px-2.5 py-1 text-xs font-bold">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2) ROOM LOCKER ROOM / FINAL SCREEN
  if (room) {
    const teamA = getTeamById(room.teamAId);
    const teamB = getTeamById(room.teamBId);
    const maxPerTeam = room.mode === 'SOLO' ? 1 : 5;
    const teamAMembers = room.members.filter((m) => m.side === 'MY');
    const teamBMembers = room.members.filter((m) => m.side === 'OPP');
    const spectators = room.members.filter((m) => m.side === 'SPECTATOR');

    const renderTeamRoster = (side: TeamSide, teamObj: ReturnType<typeof getTeamById>, members: RoomMember[]) => (
      <div className="rb-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#2b547c] pb-2.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {side === 'MY' ? 'HOME TEAM' : 'AWAY TEAM'} · {members.length}/{maxPerTeam} PLAYERS
            </div>
            <div className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
              <span
                className="inline-block w-3.5 h-3.5 border border-white/60"
                style={{ backgroundColor: teamObj.uniforms.home.shirt }}
              />
              {teamObj.name}
            </div>
          </div>
          {isHost && room.status === 'LOBBY' && (
            <select
              value={side === 'MY' ? room.teamAId : room.teamBId}
              onChange={(e) =>
                sendWs({
                  type: 'room:config',
                  ...(side === 'MY' ? { teamAId: e.target.value } : { teamBId: e.target.value }),
                })
              }
              className="bg-[#0e253b] border border-[#3c6fa1] px-2 py-1 text-xs text-white"
            >
              {onlineTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.shortName} · {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase text-[#fde047] mb-1.5">
              Offense (CPU fills open spots)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {OFFENSE_POSITIONS.map((pos) => {
                const holder = members.find((m) => m.position === pos);
                const isMine = holder?.clientId === clientId;
                const league = holder ? getEloLeague(holder.elo) : null;
                return (
                  <button
                    key={pos}
                    type="button"
                    disabled={room.status !== 'LOBBY' || Boolean(holder && !isMine)}
                    onClick={() => {
                      retroAudio.play('click');
                      sendWs({ type: 'room:select_slot', side, position: pos });
                    }}
                    className={`px-2.5 py-2 border text-left flex items-center justify-between transition-colors ${
                      isMine
                        ? 'bg-[#1f4d78] border-[#fde047]'
                        : holder
                          ? 'bg-[#0b1e30] border-[#2b547c] opacity-90 cursor-not-allowed'
                          : 'bg-[#0e253b] border-[#3c6fa1]/60 hover:border-[#fde047]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-pixel text-[10px] text-[#fde047] w-6">{pos}</span>
                      <span className="text-xs font-semibold truncate text-slate-100">
                        {holder ? holder.name : 'CPU · Tap to Claim'}
                      </span>
                    </div>
                    {holder && league ? (
                      <span className={`text-[9px] px-1.5 py-0.5 border font-bold shrink-0 ${getLeagueBadgeColor(league)}`}>
                        {holder.elo}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-bold shrink-0">OPEN</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-sky-300 mb-1.5">
              Defense (CPU fills open spots)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DEFENSE_POSITIONS.map((pos) => {
                const holder = members.find((m) => m.position === pos);
                const isMine = holder?.clientId === clientId;
                const league = holder ? getEloLeague(holder.elo) : null;
                return (
                  <button
                    key={pos}
                    type="button"
                    disabled={room.status !== 'LOBBY' || Boolean(holder && !isMine)}
                    onClick={() => {
                      retroAudio.play('click');
                      sendWs({ type: 'room:select_slot', side, position: pos });
                    }}
                    className={`px-2.5 py-2 border text-left flex items-center justify-between transition-colors ${
                      isMine
                        ? 'bg-[#1f4d78] border-[#fde047]'
                        : holder
                          ? 'bg-[#0b1e30] border-[#2b547c] opacity-90 cursor-not-allowed'
                          : 'bg-[#0e253b] border-[#3c6fa1]/60 hover:border-[#fde047]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-pixel text-[10px] text-sky-300 w-6">{pos}</span>
                      <span className="text-xs font-semibold truncate text-slate-100">
                        {holder ? holder.name : 'CPU · Tap to Claim'}
                      </span>
                    </div>
                    {holder && league ? (
                      <span className={`text-[9px] px-1.5 py-0.5 border font-bold shrink-0 ${getLeagueBadgeColor(league)}`}>
                        {holder.elo}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-bold shrink-0">OPEN</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">
        {errorBanner && (
          <div className="p-3 bg-red-900/60 border-2 border-red-400 text-xs font-semibold text-red-100">
            {errorBanner}
          </div>
        )}

        {/* Header Strip */}
        <div className="rb-panel p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-pixel text-xs text-[#fde047]">{room.name}</span>
              <span className="px-2 py-0.5 bg-[#0e253b] border border-[#3c6fa1] text-[10px] font-bold text-emerald-300">
                {room.mode === 'COOP' ? 'CO-OP (UP TO 5v5)' : 'SOLO 1v1'}
              </span>
              <span className="px-2 py-0.5 bg-[#0e253b] border border-[#3c6fa1] text-[10px] font-bold text-slate-300">
                {room.isPublic ? 'PUBLIC' : 'PRIVATE'}
              </span>
              {room.matchmakingOpen && room.status === 'LOBBY' && (
                <span className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-400 text-[10px] font-bold text-emerald-300">
                  MATCHMAKING OPEN
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-300 flex-wrap">
              <span>
                Room Code: <strong className="font-pixel text-[#fde047] tracking-widest">{room.code}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(room.code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 1800);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0e253b] border border-[#3c6fa1] hover:border-[#fde047] text-[11px]"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
              <span>Qtr: {room.quarterLength === 2.5 ? '2:30' : `${room.quarterLength}:00`}</span>
              <span>Weather: {room.weather}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {room.status === 'LOBBY' && (
              <button
                type="button"
                onClick={() => sendWs({ type: 'room:select_slot', side: 'SPECTATOR' })}
                className={`px-3 py-2 text-xs font-bold border-2 flex items-center gap-1.5 ${
                  localMember?.side === 'SPECTATOR'
                    ? 'bg-sky-800/60 border-sky-400 text-white'
                    : 'rb-btn-slate'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Spectate ({spectators.length})
              </button>
            )}

            {isHost && room.status === 'LOBBY' && (
              <button
                type="button"
                onClick={() => {
                  retroAudio.play('beep2');
                  sendWs({ type: 'room:start' });
                }}
                className="rb-btn-gold px-5 py-2 text-xs font-pixel flex items-center gap-2"
              >
                <Swords className="w-4 h-4" />
                KICK OFF MATCH
              </button>
            )}

            {isHost && room.status === 'FINAL' && (
              <button
                type="button"
                onClick={() => sendWs({ type: 'room:rematch' })}
                className="rb-btn-green px-4 py-2 text-xs font-pixel"
              >
                REMATCH LOBBY
              </button>
            )}

            <button
              type="button"
              onClick={() => sendWs({ type: 'room:leave' })}
              className="rb-btn-slate px-3 py-2 text-xs font-bold"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Final Box Score Banner when FINAL */}
        {room.status === 'FINAL' && (
          <div className="rb-panel p-6 text-center space-y-2 border-2 border-[#fde047]">
            <div className="font-pixel text-xs text-[#fde047]">FINAL SCORE</div>
            <div className="font-display text-4xl font-extrabold text-white flex items-center justify-center gap-6">
              <span>{teamA.shortName} {room.myScore}</span>
              <span className="text-slate-500 text-2xl">—</span>
              <span>{room.oppScore} {teamB.shortName}</span>
            </div>
            {eloSummaryMsg && (
              <div className="inline-block px-3 py-1 bg-emerald-950/60 border border-emerald-400 text-xs font-bold text-emerald-300">
                {eloSummaryMsg}
              </div>
            )}
          </div>
        )}

        {/* Host Match Settings Bar (Lobby) */}
        {isHost && room.status === 'LOBBY' && (
          <div className="rb-panel-inset p-3 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-[#fde047] flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> Host Rules:
            </span>
            <label className="flex items-center gap-2">
              <span className="text-slate-400">Quarter Length</span>
              <select
                value={room.quarterLength}
                onChange={(e) => sendWs({ type: 'room:config', quarterLength: Number(e.target.value) })}
                className="bg-[#13314d] border border-[#3c6fa1] px-2 py-1 text-white"
              >
                <option value={2}>2:00</option>
                <option value={2.5}>2:30</option>
                <option value={3}>3:00</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-slate-400">Weather</span>
              <select
                value={room.weather}
                onChange={(e) => sendWs({ type: 'room:config', weather: e.target.value })}
                className="bg-[#13314d] border border-[#3c6fa1] px-2 py-1 text-white"
              >
                {WEATHERS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            {room.isPublic && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(room.matchmakingOpen)}
                  onChange={(e) => sendWs({ type: 'room:config', matchmakingOpen: e.target.checked })}
                  className="accent-[#fde047]"
                />
                <span className="text-slate-200">Allow Find-a-Player joins</span>
              </label>
            )}
          </div>
        )}

        {/* Team Rosters + Integrated Room Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderTeamRoster('MY', teamA, teamAMembers)}
            {renderTeamRoster('OPP', teamB, teamBMembers)}
          </div>

          <div className="lg:col-span-4 rb-panel flex flex-col h-[460px]">
            <div className="px-4 py-3 border-b border-[#2b547c] flex items-center justify-between bg-[#0e253b]">
              <span className="font-pixel text-[10px] text-[#fde047] flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> LOCKER ROOM CHAT
              </span>
              <span className="text-[11px] text-slate-400">{room.members.length} in room</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {room.chat.map((c) => (
                <div key={c.id} className={c.isSystem ? 'text-sky-300 italic' : 'text-slate-100'}>
                  {!c.isSystem && (
                    <span
                      className={`font-bold mr-1.5 ${
                        c.side === 'MY'
                          ? 'text-[#fde047]'
                          : c.side === 'OPP'
                            ? 'text-rose-400'
                            : 'text-sky-400'
                      }`}
                    >
                      [{c.side === 'SPECTATOR' ? 'SPEC' : `${c.side === 'MY' ? teamA.shortName : teamB.shortName} ${c.position ?? ''}`}] {c.senderName}:
                    </span>
                  )}
                  <span>{c.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="p-2.5 border-t border-[#2b547c] flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Coordinate plays with your squad..."
                maxLength={240}
                className="flex-1 bg-[#0b1e30] border border-[#3c6fa1] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#fde047]"
              />
              <button type="submit" className="rb-btn-gold px-3 py-1.5 text-xs font-bold">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 3) SERVER BROWSER, QUICK MATCH & CREATE / JOIN LOBBY
  const myElo = account?.onlineElo ?? myRankProfile?.onlineElo ?? 1000;
  const myLeague = getEloLeague(myElo);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      {errorBanner && (
        <div className="p-3 bg-red-900/60 border-2 border-red-400 text-xs font-semibold text-red-100">
          {errorBanner}
        </div>
      )}

      {/* Header / Player Identity Bar */}
      <div className="rb-panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#fde047]" />
            <h1 className="font-pixel text-sm sm:text-base text-[#fde047]">
              ONLINE MULTIPLAYER ARENA
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Find a player automatically or open a room with friends. Play 1v1 or team up up to 5v5 at locked field positions while CPU runs the remaining spots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rb-panel-inset px-3 py-2 flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Name:</span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 22))}
              className="bg-transparent border-b border-[#3c6fa1] text-xs font-bold text-white w-32 focus:outline-none focus:border-[#fde047]"
            />
          </div>

          <button
            type="button"
            onClick={onOpenRankings}
            className={`px-3 py-2 border text-xs font-bold flex items-center gap-2 ${getLeagueBadgeColor(myLeague)}`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{myElo} ELO · {myLeague}</span>
          </button>
        </div>
      </div>

      {/* Quick Matchmaking: Find a Player + Expanding Rooms */}
      <div className="rb-panel p-5 border-2 border-emerald-400/70 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-pixel text-xs text-emerald-300 flex items-center gap-2">
              <Search className="w-4 h-4" /> FIND A PLAYER (QUICK MATCH)
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Pairs you with an opponent right away — and more players searching can drop straight into the same lobby up to 5v5.
            </p>
          </div>
          {!isSearchingMatch ? (
            <button
              type="button"
              onClick={handleFindMatch}
              className="rb-btn-green px-5 py-2.5 text-xs font-pixel flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              FIND A PLAYER
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-2 bg-emerald-950/70 border border-emerald-400 text-xs font-bold text-emerald-200 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Searching... ({matchQueueCount} in queue)
              </span>
              <button
                type="button"
                onClick={() => {
                  handleCancelSearch();
                  sendWs({
                    type: 'room:create',
                    roomName: `Open Match (${playerName})`,
                    playerName,
                    uid: account?.id ?? fbUser?.uid,
                    elo: myElo,
                    isPublic: true,
                    matchmakingOpen: true,
                    mode: matchPrefMode === 'SOLO' ? 'SOLO' : 'COOP',
                    quarterLength: 2.5,
                    teamAId,
                    teamBId,
                    weather: 'SUN',
                    position: matchPrefPos,
                  });
                }}
                className="rb-btn-gold px-3 py-2 text-xs font-bold"
              >
                Open Matchmaking Room Now
              </button>
              <button
                type="button"
                onClick={handleCancelSearch}
                className="rb-btn-slate px-3 py-2 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-[#2b547c]">
          <label className="flex items-center justify-between gap-2 rb-panel-inset px-3 py-2">
            <span className="text-slate-300 font-semibold">Match Type</span>
            <select
              value={matchPrefMode}
              onChange={(e) => setMatchPrefMode(e.target.value as 'ANY' | 'COOP' | 'SOLO')}
              className="bg-[#13314d] border border-[#3c6fa1] px-2 py-1 text-white"
            >
              <option value="ANY">Any (Open 5v5 or 1v1)</option>
              <option value="COOP">Expanding Squads (up to 5v5)</option>
              <option value="SOLO">1v1 Solo Only</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 rb-panel-inset px-3 py-2">
            <span className="text-slate-300 font-semibold">Preferred Position</span>
            <select
              value={matchPrefPos}
              onChange={(e) => setMatchPrefPos(e.target.value as Position)}
              className="bg-[#13314d] border border-[#3c6fa1] px-2 py-1 text-white"
            >
              {[...OFFENSE_POSITIONS, ...DEFENSE_POSITIONS].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Action Row: Create Room + Join by Code */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7 rb-panel p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold text-sm text-white">Create a Custom Room</div>
            <div className="text-xs text-slate-400">
              Pick teams, weather, quarter length, and share your invite code.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              retroAudio.play('click');
              setShowCreate((s) => !s);
            }}
            className="rb-btn-gold px-4 py-2.5 text-xs font-pixel flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showCreate ? 'HIDE FORM' : 'CREATE ROOM'}
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoinRoom(joinCodeInput, 'MY');
          }}
          className="md:col-span-5 rb-panel p-4 flex items-center gap-2"
        >
          <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="ENTER ROOM CODE..."
            className="flex-1 bg-[#0e253b] border-2 border-[#3c6fa1] px-3 py-2 text-xs font-pixel text-[#fde047] uppercase focus:outline-none focus:border-[#fde047]"
          />
          <button type="submit" className="rb-btn-green px-4 py-2.5 text-xs font-pixel">
            JOIN
          </button>
        </form>
      </div>

      {/* Create Room Drawer */}
      {showCreate && (
        <form onSubmit={handleCreateRoom} className="rb-panel p-5 space-y-4 border-2 border-[#fde047]">
          <div className="font-pixel text-xs text-[#fde047]">NEW MATCH SETTINGS</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <label className="space-y-1">
              <span className="text-slate-300 font-semibold block">Room Name</span>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={36}
                className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-2 text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="text-slate-300 font-semibold block">Mode</span>
              <select
                value={roomMode}
                onChange={(e) => setRoomMode(e.target.value as RoomMode)}
                className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-2 text-white"
              >
                <option value="COOP">Co-Op Squads (Up to 5v5)</option>
                <option value="SOLO">Solo Matchup (1v1)</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-300 font-semibold block">Visibility</span>
              <select
                value={isPublic ? 'PUBLIC' : 'PRIVATE'}
                onChange={(e) => setIsPublic(e.target.value === 'PUBLIC')}
                className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-2 text-white"
              >
                <option value="PUBLIC">Public (Shown in Server List)</option>
                <option value="PRIVATE">Private (Invite Code Only)</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-300 font-semibold block">Quarter Length</span>
              <select
                value={quarterLength}
                onChange={(e) => setQuarterLength(Number(e.target.value) as 2 | 2.5 | 3)}
                className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-2 text-white"
              >
                <option value={2}>2:00</option>
                <option value={2.5}>2:30</option>
                <option value={3}>3:00</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-300 font-semibold block">Home Team</span>
              <select
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-2 text-white"
              >
                {onlineTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortName} · {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-300 font-semibold block">Away Team</span>
              <select
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
                className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-2 text-white"
              >
                {onlineTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortName} · {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-300 font-semibold block">Weather</span>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value as WeatherType)}
                className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-2 text-white"
              >
                {WEATHERS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-slate-300 font-semibold block">Your Position</span>
              <select
                value={startPos}
                onChange={(e) => setStartPos(e.target.value as Position)}
                className="w-full bg-[#0e253b] border border-[#3c6fa1] px-2.5 py-2 text-white"
              >
                {[...OFFENSE_POSITIONS, ...DEFENSE_POSITIONS].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {isPublic && (
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchmakingOpenOnCreate}
                  onChange={(e) => setMatchmakingOpenOnCreate(e.target.checked)}
                  className="accent-[#fde047]"
                />
                <span>Allow Find-a-Player matchmaking joins into this lobby</span>
              </label>
            )}
            <div className="flex justify-end gap-2 ml-auto">
              <button type="button" onClick={() => setShowCreate(false)} className="rb-btn-slate px-4 py-2 text-xs font-bold">
                Cancel
              </button>
              <button type="submit" className="rb-btn-gold px-5 py-2 text-xs font-pixel">
                OPEN ROOM
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Active Public Rooms Browser */}
      <div className="rb-panel p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2b547c] pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="font-pixel text-xs text-white">PUBLIC MATCH ROOMS</h2>
          </div>
          <button
            type="button"
            onClick={() => sendWs({ type: 'rooms:list' })}
            className="rb-btn-slate px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {publicRooms.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No public rooms open right now. Create a room above to invite friends or wait for challengers!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {publicRooms.map((r) => {
              const tA = getTeamById(r.teamAId);
              const tB = getTeamById(r.teamBId);
              const maxPer = r.mode === 'SOLO' ? 1 : 5;
              return (
                <div key={r.code} className="rb-panel-inset p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{r.name}</span>
                        <span className="px-1.5 py-0.5 bg-[#13314d] border border-[#3c6fa1] font-pixel text-[9px] text-[#fde047]">
                          {r.code}
                        </span>
                        {r.matchmakingOpen && r.status === 'LOBBY' && (
                          <span className="px-1.5 py-0.5 bg-emerald-950/70 border border-emerald-400 text-[9px] font-bold text-emerald-300">
                            MATCHMAKING
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        {tA.shortName} vs {tB.shortName} · {r.mode === 'COOP' ? '5v5 Co-Op' : '1v1 Solo'} · {r.weather}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold border ${
                        r.status === 'LIVE'
                          ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300'
                          : 'bg-amber-950/60 border-amber-400 text-amber-300'
                      }`}
                    >
                      {r.status === 'LIVE' ? `LIVE Q${r.quarter} (${r.myScore}-${r.oppScore})` : 'LOBBY'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      Home {r.teamACount}/{maxPer} · Away {r.teamBCount}/{maxPer} · Specs {r.spectatorCount}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {r.status === 'LOBBY' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleJoinRoom(r.code, 'MY')}
                            className="rb-btn-gold px-2.5 py-1 text-[11px] font-bold"
                          >
                            Join Home
                          </button>
                          <button
                            type="button"
                            onClick={() => handleJoinRoom(r.code, 'OPP')}
                            className="rb-btn-green px-2.5 py-1 text-[11px] font-bold"
                          >
                            Join Away
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleJoinRoom(r.code, 'SPECTATOR')}
                        className="rb-btn-slate px-2.5 py-1 text-[11px] font-bold"
                      >
                        Spectate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
