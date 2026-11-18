import { WeatherType } from '../types/career';

export interface WeatherMeta {
  id: WeatherType;
  label: string;
  shortTag: string;
  impactNote: string;
  sprWeatherFrame: number; // 0=SUN, 1=RAIN, 2=SNOW, 3=WIND/ALT
  sprFieldFrame: number;   // 0=CLEAR, 1=RAIN, 4=SNOW
  windRange: [number, number];
  passWindDrift: number;
  throwScatter: number;
  speedMult: number;
  staminaDrainMult: number;
  catchPenalty: number;
  fumbleAdd: number;
  kickDistMult: number;
  kickWindFactor: number;
  dbReactAdd: number;
  runCallBoost: number;
  simExpMult: number;
  simIncompAdd: number;
  simFgMakeMod: number;
  simToIntMod: number;
  simToFumbleMod: number;
  badgeClass: string;
}

const WEATHER_MAP: Record<WeatherType, WeatherMeta> = {
  SUN: {
    id: 'SUN',
    label: 'CLEAR',
    shortTag: 'CLEAR',
    impactNote: 'Dry turf & clean passing conditions',
    sprWeatherFrame: 0,
    sprFieldFrame: 0,
    windRange: [0.4, 3.4],
    passWindDrift: 0.12,
    throwScatter: 0.04,
    speedMult: 1.0,
    staminaDrainMult: 1.0,
    catchPenalty: 0,
    fumbleAdd: 0,
    kickDistMult: 1.0,
    kickWindFactor: 0.25,
    dbReactAdd: 0,
    runCallBoost: 0,
    simExpMult: 1.0,
    simIncompAdd: 0,
    simFgMakeMod: 0,
    simToIntMod: 0,
    simToFumbleMod: 0,
    badgeClass: 'text-[#fde047]',
  },
  WIND: {
    id: 'WIND',
    label: 'WINDY',
    shortTag: 'GUSTS',
    impactNote: 'Strong crosswinds alter deep passes & kicks',
    sprWeatherFrame: 3,
    sprFieldFrame: 0,
    windRange: [8.0, 14.2],
    passWindDrift: 0.88,
    throwScatter: 0.24,
    speedMult: 0.99,
    staminaDrainMult: 1.04,
    catchPenalty: 0.015,
    fumbleAdd: 0.001,
    kickDistMult: 0.96,
    kickWindFactor: 0.42,
    dbReactAdd: 0,
    runCallBoost: 0.14,
    simExpMult: 0.91,
    simIncompAdd: 0.03,
    simFgMakeMod: -0.1,
    simToIntMod: 0.002,
    simToFumbleMod: 0,
    badgeClass: 'text-cyan-300',
  },
  FOG: {
    id: 'FOG',
    label: 'HEAVY FOG',
    shortTag: 'LOW VIS',
    impactNote: 'Low visibility downfield & slower coverage breaks',
    sprWeatherFrame: 3,
    sprFieldFrame: 0,
    windRange: [0.3, 2.2],
    passWindDrift: 0.08,
    throwScatter: 0.42,
    speedMult: 0.98,
    staminaDrainMult: 1.02,
    catchPenalty: 0.03,
    fumbleAdd: 0.002,
    kickDistMult: 0.99,
    kickWindFactor: 0.2,
    dbReactAdd: 0.1,
    runCallBoost: 0.06,
    simExpMult: 0.93,
    simIncompAdd: 0.03,
    simFgMakeMod: -0.02,
    simToIntMod: 0.002,
    simToFumbleMod: 0.001,
    badgeClass: 'text-slate-300',
  },
  RAIN: {
    id: 'RAIN',
    label: 'RAIN',
    shortTag: 'WET TURF',
    impactNote: 'Slick ball, faster fatigue & slightly slower cuts',
    sprWeatherFrame: 1,
    sprFieldFrame: 1,
    windRange: [2.4, 6.4],
    passWindDrift: 0.34,
    throwScatter: 0.22,
    speedMult: 0.95,
    staminaDrainMult: 1.12,
    catchPenalty: 0.045,
    fumbleAdd: 0.009,
    kickDistMult: 0.94,
    kickWindFactor: 0.3,
    dbReactAdd: 0.02,
    runCallBoost: 0.1,
    simExpMult: 0.92,
    simIncompAdd: 0.04,
    simFgMakeMod: -0.05,
    simToIntMod: 0.001,
    simToFumbleMod: 0.005,
    badgeClass: 'text-sky-300',
  },
  STORM: {
    id: 'STORM',
    label: 'THUNDERSTORM',
    shortTag: 'DOWNPOUR',
    impactNote: 'Heavy rain, strong gusts, slick ball & extra fatigue',
    sprWeatherFrame: 1,
    sprFieldFrame: 1,
    windRange: [7.5, 13.5],
    passWindDrift: 0.8,
    throwScatter: 0.52,
    speedMult: 0.91,
    staminaDrainMult: 1.22,
    catchPenalty: 0.075,
    fumbleAdd: 0.015,
    kickDistMult: 0.89,
    kickWindFactor: 0.44,
    dbReactAdd: 0.05,
    runCallBoost: 0.18,
    simExpMult: 0.84,
    simIncompAdd: 0.06,
    simFgMakeMod: -0.14,
    simToIntMod: 0.003,
    simToFumbleMod: 0.007,
    badgeClass: 'text-indigo-300',
  },
  SNOW: {
    id: 'SNOW',
    label: 'SNOW',
    shortTag: 'SNOWY',
    impactNote: 'Cold slippery footing, shorter kicks & stiffer hands',
    sprWeatherFrame: 2,
    sprFieldFrame: 4,
    windRange: [2.5, 6.8],
    passWindDrift: 0.38,
    throwScatter: 0.25,
    speedMult: 0.93,
    staminaDrainMult: 1.16,
    catchPenalty: 0.055,
    fumbleAdd: 0.008,
    kickDistMult: 0.92,
    kickWindFactor: 0.32,
    dbReactAdd: 0.03,
    runCallBoost: 0.12,
    simExpMult: 0.9,
    simIncompAdd: 0.04,
    simFgMakeMod: -0.06,
    simToIntMod: 0.001,
    simToFumbleMod: 0.005,
    badgeClass: 'text-white',
  },
  BLIZZARD: {
    id: 'BLIZZARD',
    label: 'BLIZZARD',
    shortTag: 'WHITEOUT',
    impactNote: 'Heavy snow & gusts: slick turf, shorter kicks & tough catches',
    sprWeatherFrame: 2,
    sprFieldFrame: 4,
    windRange: [8.5, 14.5],
    passWindDrift: 0.92,
    throwScatter: 0.6,
    speedMult: 0.88,
    staminaDrainMult: 1.28,
    catchPenalty: 0.09,
    fumbleAdd: 0.014,
    kickDistMult: 0.86,
    kickWindFactor: 0.46,
    dbReactAdd: 0.08,
    runCallBoost: 0.22,
    simExpMult: 0.8,
    simIncompAdd: 0.07,
    simFgMakeMod: -0.16,
    simToIntMod: 0.003,
    simToFumbleMod: 0.007,
    badgeClass: 'text-sky-100',
  },
};

export function getWeatherMeta(weather?: WeatherType | string, isDome?: boolean): WeatherMeta {
  const key = (weather && weather in WEATHER_MAP ? weather : 'SUN') as WeatherType;
  const base = WEATHER_MAP[key];
  if (key === 'SUN' && isDome) {
    return {
      ...base,
      label: 'DOME',
      shortTag: 'INDOOR',
      impactNote: 'Indoor dome: no wind & fast turf',
      windRange: [0, 0.2],
      passWindDrift: 0,
      throwScatter: 0.01,
    };
  }
  return base;
}

export function rollWeatherWind(weather?: WeatherType | string, isDome?: boolean): number {
  if (isDome) return 0;
  const meta = getWeatherMeta(weather, isDome);
  const [minW, maxW] = meta.windRange;
  const mag = minW + Math.random() * Math.max(0.1, maxW - minW);
  const sign = Math.random() < 0.5 ? -1 : 1;
  return Math.round(mag * sign * 10) / 10;
}
