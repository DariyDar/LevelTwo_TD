// GlucoDefense — Food database

// Counts represent peasant units (each unit = GLUCOSE_PER_UNIT mg/dL)
// Original mg/dL values divided by 5
export const FOODS = {
  // === Unhealthy (fast absorption) ===
  burger:    { key: 'burger',    name: 'Burger',           emoji: '\u{1F354}', count: 32, speed: 'fast',      boat: 'L' },
  pizza:     { key: 'pizza',     name: 'Pizza',            emoji: '\u{1F355}', count: 30, speed: 'fast',      boat: 'L' },
  fries:     { key: 'fries',     name: 'French Fries',     emoji: '\u{1F35F}', count: 24, speed: 'fast',      boat: 'M' },
  muffin:    { key: 'muffin',    name: 'Chocolate Muffin', emoji: '\u{1F9C1}', count: 22, speed: 'fast',      boat: 'M' },
  cola:      { key: 'cola',      name: 'Cola',             emoji: '\u{1F964}', count: 20, speed: 'very_fast', boat: 'S' },
  chocolate: { key: 'chocolate', name: 'Chocolate Bar',    emoji: '\u{1F36B}', count: 18, speed: 'fast',      boat: 'S' },
  donut:     { key: 'donut',     name: 'Donut',            emoji: '\u{1F369}', count: 18, speed: 'fast',      boat: 'S' },
  iceCream:  { key: 'iceCream',  name: 'Ice Cream',        emoji: '\u{1F366}', count: 16, speed: 'fast',      boat: 'S' },
  cookie:    { key: 'cookie',    name: 'Cookie',           emoji: '\u{1F36A}', count: 14, speed: 'fast',      boat: 'S' },
  chips:     { key: 'chips',     name: 'Chips',            emoji: '\u{1F954}', count: 14, speed: 'fast',      boat: 'S' },
  juice:     { key: 'juice',     name: 'Fruit Juice',      emoji: '\u{1F9C3}', count: 16, speed: 'very_fast', boat: 'S' },

  // === Neutral (medium absorption) ===
  rice:      { key: 'rice',      name: 'Rice',             emoji: '\u{1F35A}', count: 30, speed: 'medium', boat: 'M' },
  pasta:     { key: 'pasta',     name: 'Pasta',            emoji: '\u{1F35D}', count: 28, speed: 'medium', boat: 'M' },
  oatmeal:   { key: 'oatmeal',   name: 'Oatmeal',          emoji: '\u{1F963}', count: 24, speed: 'slow',   boat: 'L' },
  cereal:    { key: 'cereal',    name: 'Cereal with Milk', emoji: '\u{1F95B}', count: 22, speed: 'medium', boat: 'M' },
  sandwich:  { key: 'sandwich',  name: 'Sandwich',         emoji: '\u{1F96A}', count: 28, speed: 'medium', boat: 'M' },
  banana:    { key: 'banana',    name: 'Banana',           emoji: '\u{1F34C}', count: 16, speed: 'medium', boat: 'S' },
  bread:     { key: 'bread',     name: 'Bread & Butter',   emoji: '\u{1F35E}', count: 18, speed: 'medium', boat: 'S' },
  apple:     { key: 'apple',     name: 'Apple',            emoji: '\u{1F34E}', count: 14, speed: 'medium', boat: 'S' },
  fruitSalad:{ key: 'fruitSalad',name: 'Fruit Salad',      emoji: '\u{1F957}', count: 12, speed: 'medium', boat: 'S' },
  milk:      { key: 'milk',      name: 'Milk',             emoji: '\u{1F95B}', count: 10, speed: 'medium', boat: 'S' },
  yogurt:    { key: 'yogurt',    name: 'Yogurt',           emoji: '\u{1F957}', count: 10, speed: 'medium', boat: 'S' },

  // === Healthy (slow absorption) ===
  stew:      { key: 'stew',      name: 'Vegetable Stew',   emoji: '\u{1F958}', count: 18, speed: 'slow', boat: 'M' },
  veggies:   { key: 'veggies',   name: 'Steamed Vegetables',emoji: '\u{1F966}', count: 12, speed: 'slow', boat: 'M' },
  turkey:    { key: 'turkey',    name: 'Grilled Turkey',   emoji: '\u{1F983}', count: 10, speed: 'slow', boat: 'L' },
  chicken:   { key: 'chicken',   name: 'Chicken',          emoji: '\u{1F357}', count: 8,  speed: 'slow', boat: 'M' },
  fish:      { key: 'fish',      name: 'Fish',             emoji: '\u{1F41F}', count: 8,  speed: 'slow', boat: 'M' },
  salad:     { key: 'salad',     name: 'Salad',            emoji: '\u{1F96C}', count: 6,  speed: 'slow', boat: 'S' },
  cheese:    { key: 'cheese',    name: 'Cottage Cheese',   emoji: '\u{1F9C0}', count: 6,  speed: 'slow', boat: 'S' },
  broccoli:  { key: 'broccoli',  name: 'Broccoli',         emoji: '\u{1F966}', count: 5,  speed: 'slow', boat: 'S' },
  eggs:      { key: 'eggs',      name: 'Egg Whites',       emoji: '\u{1F95A}', count: 6,  speed: 'slow', boat: 'S' },
};

// Helper: create food entry with optional count override
export function food(key, countOverride) {
  const f = FOODS[key];
  if (!f) throw new Error(`Unknown food: ${key}`);
  return countOverride !== undefined
    ? { ...f, count: countOverride }
    : { ...f };
}
