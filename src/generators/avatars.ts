// Car vehicles + driver portraits (#489, docs/story/vehicles-portraits.md).
// Every rack car rolls a vehicle and every pool driver a portrait: one
// weighted draw each, on the icons' own stream, so adding (or retuning) them
// never moves a stat or the golden fingerprint. Nothing is stored in saves:
// the icon re-derives from (seed, id), so it never changes mid-season.

import { mulberry32, deriveSeed } from '../engine/rng';
import type { IconId } from '../icons/registry';

export interface AvatarPick { id: IconId; weight: number }

/** Radio's vehicle table (Pax: 90% race cars). Weights sum to 100. */
export const VEHICLES: readonly AvatarPick[] = [
  { id: 'f1-car', weight: 90 },
  // Road + works
  { id: 'city-car', weight: 1 },
  { id: 'jeep', weight: 1 },
  { id: 'truck', weight: 1 },
  { id: 'tow-truck', weight: 1 },
  { id: 'farm-tractor', weight: 1 },
  { id: 'food-truck', weight: 1 },
  { id: 'surfer-van', weight: 0.5 },
  { id: 'bus', weight: 0.5 },
  { id: 'steamroller', weight: 0.5 },
  { id: 'caravan', weight: 0.25 },
  { id: 'forklift', weight: 0.25 },
  // Rare oddballs
  { id: 'kick-scooter', weight: 0.4 },
  { id: 'dutch-bike', weight: 0.4 },
  { id: 'aero-bike', weight: 0.4 },
  { id: 'unicycle', weight: 0.2 },
  { id: 'shopping-cart', weight: 0.2 },
  { id: 'mine-truck', weight: 0.2 },
  { id: 'bulldozer', weight: 0.2 },
];

/** Radio's portrait table (Pax: 90% racing helmets). Weights sum to 100. */
export const PORTRAITS: readonly AvatarPick[] = [
  { id: 'full-motorcycle-helmet', weight: 90 },
  // Paddock faces + hats
  { id: 'billed-cap', weight: 2 },
  { id: 'plane-pilot', weight: 1.5 },
  { id: 'mustache', weight: 1 },
  { id: 'sunglasses', weight: 1 },
  { id: 'beard', weight: 0.5 },
  { id: 'western-hat', weight: 0.5 },
  { id: 'steampunk-goggles', weight: 0.5 },
  { id: 'outback-hat', weight: 0.25 },
  { id: 'winter-hat', weight: 0.25 },
  { id: 'skimmer-hat', weight: 0.25 },
  { id: 'captain-hat-profile', weight: 0.25 },
  // Rare oddballs
  { id: 'baby-face', weight: 0.4 },
  { id: 'astronaut-helmet', weight: 0.4 },
  { id: 'diving-helmet', weight: 0.4 },
  { id: 'mining-helmet', weight: 0.4 },
  { id: 'flower-hat', weight: 0.2 },
  { id: 'party-hat', weight: 0.2 },
];

function draw(table: readonly AvatarPick[], r: number): IconId {
  const total = table.reduce((s, p) => s + p.weight, 0);
  let x = r * total;
  for (const p of table) {
    if (x < p.weight) return p.id;
    x -= p.weight;
  }
  return table[table.length - 1].id;
}

/** A rack car's vehicle icon (`car-3` → 'f1-car', usually). */
export function vehicleFor(seed: number, carId: string): IconId {
  return draw(VEHICLES, mulberry32(deriveSeed(seed, 'icons', 'vehicle', carId))());
}

/** A pool driver's portrait icon (usually the racing helmet). */
export function portraitFor(seed: number, driverId: number): IconId {
  return draw(PORTRAITS, mulberry32(deriveSeed(seed, 'icons', 'portrait', driverId))());
}
