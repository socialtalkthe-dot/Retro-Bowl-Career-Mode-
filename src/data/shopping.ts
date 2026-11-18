import { PlayerAttributes, ShoppingItem } from '../types/career';

// Derived from Retro Bowl's Shopping catalog, upgraded with subtle gameplay micro-boosts & outside-life perks
export const SHOPPING_CATALOG: Omit<ShoppingItem, 'owned' | 'condition'>[] = [
  // ITEMS
  {
    id: 1,
    name: 'Tattoo',
    category: 'ITEMS',
    price: 150,
    happinessBoost: 3,
    upkeep: 0,
    fansBonus: 1,
    perkLabel: '+1 Fans/wk · Swag boost',
  },
  {
    id: 2,
    name: 'Designer Cleats & Fit',
    category: 'ITEMS',
    price: 300,
    happinessBoost: 4,
    upkeep: 10,
    attrBoost: { speed: 0.15 },
    fansBonus: 1,
    perkLabel: '+0.15 SPD · +1 Fans/wk',
  },
  {
    id: 3,
    name: 'Flagship Phone',
    category: 'ITEMS',
    price: 900,
    happinessBoost: 5,
    upkeep: 25,
    fansBonus: 1,
    agentBonus: 1,
    perkLabel: '+1 Fans & Agent/wk · Media reach',
  },
  {
    id: 4,
    name: 'Pro Tablet',
    category: 'ITEMS',
    price: 1200,
    happinessBoost: 5,
    upkeep: 20,
    attrBoost: { skill: 0.15 },
    xpBonusPct: 4,
    gpaBonus: 0.03,
    perkLabel: '+0.15 SKL · +4% XP · +0.03 GPA/wk',
  },
  {
    id: 5,
    name: 'Games Console',
    category: 'ITEMS',
    price: 1500,
    happinessBoost: 7,
    upkeep: 30,
    conditionRegenBonus: 2,
    perkLabel: '+2% Condition recovery · Stress relief',
  },
  {
    id: 6,
    name: 'Gaming Laptop',
    category: 'ITEMS',
    price: 2400,
    happinessBoost: 7,
    upkeep: 40,
    xpBonusPct: 5,
    gpaBonus: 0.04,
    perkLabel: '+5% XP · +0.04 GPA/wk · Film study',
  },
  {
    id: 7,
    name: 'Home Theater TV',
    category: 'ITEMS',
    price: 3500,
    happinessBoost: 8,
    upkeep: 50,
    attrBoost: { skill: 0.1 },
    coachBonus: 1,
    perkLabel: '+0.10 SKL · +1 Coach/wk · Tape room',
  },
  {
    id: 8,
    name: 'Custom Chain & Jewelry',
    category: 'ITEMS',
    price: 8500,
    happinessBoost: 10,
    upkeep: 100,
    fansBonus: 2,
    agentBonus: 1,
    perkLabel: '+2 Fans & +1 Agent/wk · NIL spotlight',
  },
  {
    id: 9,
    name: 'Luxury Watch',
    category: 'ITEMS',
    price: 15000,
    happinessBoost: 12,
    upkeep: 150,
    agentBonus: 2,
    coachBonus: 1,
    perkLabel: '+2 Agent & +1 Coach/wk · Executive image',
  },
  {
    id: 10,
    name: 'Sports Memorabilia',
    category: 'ITEMS',
    price: 25000,
    happinessBoost: 14,
    upkeep: 200,
    xpBonusPct: 6,
    fansBonus: 2,
    perkLabel: '+6% XP · +2 Fans/wk · Legend inspiration',
  },

  // VEHICLES
  {
    id: 11,
    name: 'Road Bicycle',
    category: 'VEHICLES',
    price: 600,
    happinessBoost: 4,
    upkeep: 15,
    attrBoost: { stamina: 0.15 },
    conditionRegenBonus: 1,
    perkLabel: '+0.15 STA · +1% Condition/wk',
  },
  {
    id: 12,
    name: 'Electric Scooter',
    category: 'VEHICLES',
    price: 1100,
    happinessBoost: 5,
    upkeep: 25,
    conditionRegenBonus: 2,
    gpaBonus: 0.02,
    perkLabel: '+2% Condition · +0.02 GPA/wk (on-time)',
  },
  {
    id: 13,
    name: 'Dirt Bike',
    category: 'VEHICLES',
    price: 4500,
    happinessBoost: 8,
    upkeep: 120,
    attrBoost: { speed: 0.1 },
    fansBonus: 1,
    perkLabel: '+0.10 SPD · +1 Fans/wk',
  },
  {
    id: 14,
    name: 'Jet Ski',
    category: 'VEHICLES',
    price: 12000,
    happinessBoost: 11,
    upkeep: 250,
    attrBoost: { stamina: 0.1 },
    conditionRegenBonus: 2,
    perkLabel: '+0.10 STA · +2% Condition/wk',
  },
  {
    id: 15,
    name: 'Muscle Car',
    category: 'VEHICLES',
    price: 38000,
    happinessBoost: 14,
    upkeep: 450,
    attrBoost: { strength: 0.15 },
    fansBonus: 2,
    perkLabel: '+0.15 STR · +2 Fans/wk',
  },
  {
    id: 16,
    name: 'Custom Truck / SUV',
    category: 'VEHICLES',
    price: 75000,
    happinessBoost: 16,
    upkeep: 700,
    attrBoost: { strength: 0.2 },
    coachBonus: 1,
    perkLabel: '+0.20 STR · +1 Coach/wk',
  },
  {
    id: 17,
    name: 'Touring Motorbike',
    category: 'VEHICLES',
    price: 28000,
    happinessBoost: 12,
    upkeep: 300,
    attrBoost: { speed: 0.15 },
    perkLabel: '+0.15 SPD · Open-road focus',
  },
  {
    id: 18,
    name: 'Chauffeured Limo',
    category: 'VEHICLES',
    price: 140000,
    happinessBoost: 18,
    upkeep: 1500,
    conditionRegenBonus: 3,
    agentBonus: 2,
    perkLabel: '+3% Condition · +2 Agent/wk',
  },
  {
    id: 19,
    name: 'Italian Sports Car',
    category: 'VEHICLES',
    price: 295000,
    happinessBoost: 22,
    upkeep: 3000,
    attrBoost: { speed: 0.2 },
    fansBonus: 3,
    perkLabel: '+0.20 SPD · +3 Fans/wk',
  },
  {
    id: 20,
    name: 'Private Yacht',
    category: 'VEHICLES',
    price: 1250000,
    happinessBoost: 28,
    upkeep: 12000,
    conditionRegenBonus: 4,
    agentBonus: 2,
    perkLabel: '+4% Condition · +2 Agent/wk · VIP hosting',
  },
  {
    id: 21,
    name: 'Private Helicopter',
    category: 'VEHICLES',
    price: 2400000,
    happinessBoost: 30,
    upkeep: 20000,
    conditionRegenBonus: 5,
    coachBonus: 2,
    perkLabel: '+5% Condition · +2 Coach/wk · Zero commute',
  },
  {
    id: 22,
    name: 'Private Jet',
    category: 'VEHICLES',
    price: 8500000,
    happinessBoost: 35,
    upkeep: 65000,
    conditionRegenBonus: 6,
    fansBonus: 3,
    agentBonus: 3,
    perkLabel: '+6% Condition · +3 Fans & Agent/wk',
  },

  // PROPERTY (Includes passive outside-life income investments!)
  {
    id: 23,
    name: 'Studio Apartment',
    category: 'PROPERTY',
    price: 45000,
    happinessBoost: 12,
    upkeep: 600,
    conditionRegenBonus: 2,
    gpaBonus: 0.03,
    perkLabel: '+2% Condition · +0.03 GPA/wk',
  },
  {
    id: 24,
    name: 'Suburban House',
    category: 'PROPERTY',
    price: 260000,
    happinessBoost: 18,
    upkeep: 1800,
    conditionRegenBonus: 3,
    coachBonus: 1,
    perkLabel: '+3% Condition · +1 Coach/wk',
  },
  {
    id: 25,
    name: 'Mountain Log Cabin',
    category: 'PROPERTY',
    price: 420000,
    happinessBoost: 20,
    upkeep: 2400,
    attrBoost: { stamina: 0.2 },
    conditionRegenBonus: 3,
    perkLabel: '+0.20 STA · +3% Condition/wk',
  },
  {
    id: 26,
    name: 'Downtown Coffee Shop',
    category: 'PROPERTY',
    price: 550000,
    happinessBoost: 22,
    upkeep: -5500, // generates $5,500/wk passive income!
    fansBonus: 2,
    agentBonus: 1,
    perkLabel: '+$5.5K/wk Income · +2 Fans & +1 Agent/wk',
  },
  {
    id: 27,
    name: 'Country Estate',
    category: 'PROPERTY',
    price: 950000,
    happinessBoost: 25,
    upkeep: 5000,
    attrBoost: { strength: 0.2 },
    conditionRegenBonus: 4,
    perkLabel: '+0.20 STR · +4% Condition/wk',
  },
  {
    id: 28,
    name: 'Beach Holiday Home',
    category: 'PROPERTY',
    price: 1400000,
    happinessBoost: 27,
    upkeep: 7000,
    conditionRegenBonus: 5,
    xpBonusPct: 5,
    perkLabel: '+5% Condition · +5% XP · Cryo & recovery',
  },
  {
    id: 29,
    name: 'Alpine Ski Chalet',
    category: 'PROPERTY',
    price: 2100000,
    happinessBoost: 29,
    upkeep: 9500,
    attrBoost: { stamina: 0.2, skill: 0.15 },
    perkLabel: '+0.20 STA & +0.15 SKL · Altitude camp',
  },
  {
    id: 30,
    name: 'Beverly Hills Mansion',
    category: 'PROPERTY',
    price: 4800000,
    happinessBoost: 34,
    upkeep: 22000,
    fansBonus: 4,
    agentBonus: 3,
    perkLabel: '+4 Fans & +3 Agent/wk · Media empire',
  },
  {
    id: 31,
    name: 'Training Complex Stake',
    category: 'PROPERTY',
    price: 6500000,
    happinessBoost: 36,
    upkeep: -38000, // generates $38,000/wk passive income!
    attrBoost: { speed: 0.15, strength: 0.15, stamina: 0.15, skill: 0.15 },
    xpBonusPct: 10,
    perkLabel: '+$38K/wk Income · +0.15 ALL · +10% XP',
  },
  {
    id: 32,
    name: 'Private Island',
    category: 'PROPERTY',
    price: 18000000,
    happinessBoost: 45,
    upkeep: 75000,
    attrBoost: { speed: 0.15, strength: 0.15, stamina: 0.15, skill: 0.15 },
    conditionRegenBonus: 8,
    fansBonus: 4,
    perkLabel: '+0.15 ALL · +8% Condition · +4 Fans/wk',
  },
];

export const NRG_DRINK_PRICE = 120;

export interface LifestylePerks {
  attrBoost: PlayerAttributes;
  xpBonusPct: number;
  conditionRegenBonus: number;
  coachBonus: number;
  fansBonus: number;
  agentBonus: number;
  gpaBonus: number;
  weeklyNetUpkeep: number; // negative means net passive income!
}

export function getLifestylePerks(ownedItemIds: number[]): LifestylePerks {
  const ownedSet = new Set(ownedItemIds);
  const rawAttr: PlayerAttributes = { speed: 0, strength: 0, stamina: 0, skill: 0 };
  let xpBonusPct = 0;
  let conditionRegenBonus = 0;
  let coachBonus = 0;
  let fansBonus = 0;
  let agentBonus = 0;
  let gpaBonus = 0;
  let weeklyNetUpkeep = 0;

  for (const item of SHOPPING_CATALOG) {
    if (!ownedSet.has(item.id)) continue;
    if (item.attrBoost) {
      rawAttr.speed += item.attrBoost.speed ?? 0;
      rawAttr.strength += item.attrBoost.strength ?? 0;
      rawAttr.stamina += item.attrBoost.stamina ?? 0;
      rawAttr.skill += item.attrBoost.skill ?? 0;
    }
    xpBonusPct += item.xpBonusPct ?? 0;
    conditionRegenBonus += item.conditionRegenBonus ?? 0;
    coachBonus += item.coachBonus ?? 0;
    fansBonus += item.fansBonus ?? 0;
    agentBonus += item.agentBonus ?? 0;
    gpaBonus += item.gpaBonus ?? 0;
    weeklyNetUpkeep += item.upkeep;
  }

  // Cap stat micro-boosts strictly at +0.75 per attribute so lifestyle adds edge without breaking balance
  return {
    attrBoost: {
      speed: Number(Math.min(0.75, rawAttr.speed).toFixed(2)),
      strength: Number(Math.min(0.75, rawAttr.strength).toFixed(2)),
      stamina: Number(Math.min(0.75, rawAttr.stamina).toFixed(2)),
      skill: Number(Math.min(0.75, rawAttr.skill).toFixed(2)),
    },
    xpBonusPct: Math.min(25, xpBonusPct),
    conditionRegenBonus: Math.min(18, conditionRegenBonus),
    coachBonus: Math.min(6, coachBonus),
    fansBonus: Math.min(10, fansBonus),
    agentBonus: Math.min(8, agentBonus),
    gpaBonus: Number(Math.min(0.12, gpaBonus).toFixed(2)),
    weeklyNetUpkeep,
  };
}
