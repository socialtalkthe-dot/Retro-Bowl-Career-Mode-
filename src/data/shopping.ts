import { ShoppingItem } from '../types/career';

// Derived directly from Retro Bowl's Shopping.txt lifestyle catalog
export const SHOPPING_CATALOG: Omit<ShoppingItem, 'owned' | 'condition'>[] = [
  // ITEMS
  { id: 1, name: 'Tattoo', category: 'ITEMS', price: 150, happinessBoost: 3, upkeep: 0 },
  { id: 2, name: 'Designer Cleats & Fit', category: 'ITEMS', price: 300, happinessBoost: 4, upkeep: 10 },
  { id: 3, name: 'Flagship Phone', category: 'ITEMS', price: 900, happinessBoost: 5, upkeep: 25 },
  { id: 4, name: 'Pro Tablet', category: 'ITEMS', price: 1200, happinessBoost: 5, upkeep: 20 },
  { id: 5, name: 'Games Console', category: 'ITEMS', price: 1500, happinessBoost: 7, upkeep: 30 },
  { id: 6, name: 'Gaming Laptop', category: 'ITEMS', price: 2400, happinessBoost: 7, upkeep: 40 },
  { id: 7, name: 'Home Theater TV', category: 'ITEMS', price: 3500, happinessBoost: 8, upkeep: 50 },
  { id: 8, name: 'Custom Chain & Jewelry', category: 'ITEMS', price: 8500, happinessBoost: 10, upkeep: 100 },
  { id: 9, name: 'Luxury Watch', category: 'ITEMS', price: 15000, happinessBoost: 12, upkeep: 150 },
  { id: 10, name: 'Sports Memorabilia', category: 'ITEMS', price: 25000, happinessBoost: 14, upkeep: 200 },

  // VEHICLES
  { id: 11, name: 'Road Bicycle', category: 'VEHICLES', price: 600, happinessBoost: 4, upkeep: 15 },
  { id: 12, name: 'Electric Scooter', category: 'VEHICLES', price: 1100, happinessBoost: 5, upkeep: 25 },
  { id: 13, name: 'Dirt Bike', category: 'VEHICLES', price: 4500, happinessBoost: 8, upkeep: 120 },
  { id: 14, name: 'Jet Ski', category: 'VEHICLES', price: 12000, happinessBoost: 11, upkeep: 250 },
  { id: 15, name: 'Muscle Car', category: 'VEHICLES', price: 38000, happinessBoost: 14, upkeep: 450 },
  { id: 16, name: 'Custom Truck / SUV', category: 'VEHICLES', price: 75000, happinessBoost: 16, upkeep: 700 },
  { id: 17, name: 'Touring Motorbike', category: 'VEHICLES', price: 28000, happinessBoost: 12, upkeep: 300 },
  { id: 18, name: 'Chauffeured Limo', category: 'VEHICLES', price: 140000, happinessBoost: 18, upkeep: 1500 },
  { id: 19, name: 'Italian Sports Car', category: 'VEHICLES', price: 295000, happinessBoost: 22, upkeep: 3000 },
  { id: 20, name: 'Private Yacht', category: 'VEHICLES', price: 1250000, happinessBoost: 28, upkeep: 12000 },
  { id: 21, name: 'Private Helicopter', category: 'VEHICLES', price: 2400000, happinessBoost: 30, upkeep: 20000 },
  { id: 22, name: 'Private Jet', category: 'VEHICLES', price: 8500000, happinessBoost: 35, upkeep: 65000 },

  // PROPERTY
  { id: 23, name: 'Studio Apartment', category: 'PROPERTY', price: 45000, happinessBoost: 12, upkeep: 600 },
  { id: 24, name: 'Suburban House', category: 'PROPERTY', price: 260000, happinessBoost: 18, upkeep: 1800 },
  { id: 25, name: 'Mountain Log Cabin', category: 'PROPERTY', price: 420000, happinessBoost: 20, upkeep: 2400 },
  { id: 26, name: 'Downtown Coffee Shop', category: 'PROPERTY', price: 550000, happinessBoost: 22, upkeep: -4500 }, // generates passive income!
  { id: 27, name: 'Country Estate', category: 'PROPERTY', price: 950000, happinessBoost: 25, upkeep: 5000 },
  { id: 28, name: 'Beach Holiday Home', category: 'PROPERTY', price: 1400000, happinessBoost: 27, upkeep: 7000 },
  { id: 29, name: 'Alpine Ski Chalet', category: 'PROPERTY', price: 2100000, happinessBoost: 29, upkeep: 9500 },
  { id: 30, name: 'Beverly Hills Mansion', category: 'PROPERTY', price: 4800000, happinessBoost: 34, upkeep: 22000 },
  { id: 31, name: 'Training Complex Stake', category: 'PROPERTY', price: 6500000, happinessBoost: 36, upkeep: -35000 }, // generates passive income!
  { id: 32, name: 'Private Island', category: 'PROPERTY', price: 18000000, happinessBoost: 45, upkeep: 75000 },
];

export const NRG_DRINK_PRICE = 120;
