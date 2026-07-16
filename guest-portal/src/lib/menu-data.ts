import { MenuItem } from './types';

export const menuItems: MenuItem[] = [
  /* ── Breakfast ─────────────────────────────────────────────────── */
  {
    id: 'breakfast-avocado-toast',
    name: 'Avocado Toast',
    price: 16,
    category: 'breakfast',
    description: 'Sourdough topped with smashed avocado, poached egg, chili flakes & microgreens',
    emoji: '🥑',
  },
  {
    id: 'breakfast-acai-bowl',
    name: 'Açaí Bowl',
    price: 14,
    category: 'breakfast',
    description: 'Organic açaí blended with banana, topped with granola, coconut & fresh berries',
    emoji: '🫐',
  },
  {
    id: 'breakfast-eggs-benedict',
    name: 'Eggs Benedict',
    price: 18,
    category: 'breakfast',
    description: 'Free-range poached eggs on brioche with hollandaise & smoked salmon',
    emoji: '🥚',
  },
  {
    id: 'breakfast-pancake-stack',
    name: 'Pancake Stack',
    price: 15,
    category: 'breakfast',
    description: 'Fluffy buttermilk pancakes with maple syrup, butter & seasonal fruit',
    emoji: '🥞',
  },
  {
    id: 'breakfast-fruit-platter',
    name: 'Fresh Fruit Platter',
    price: 12,
    category: 'breakfast',
    description: 'Selection of tropical & seasonal fruits, served with honey yoghurt',
    emoji: '🍓',
  },

  /* ── Drinks ────────────────────────────────────────────────────── */
  {
    id: 'drinks-coconut-water',
    name: 'Fresh Coconut Water',
    price: 8,
    category: 'drinks',
    description: 'Chilled young coconut, served straight from the shell',
    emoji: '🥥',
  },
  {
    id: 'drinks-mango-lassi',
    name: 'Mango Lassi',
    price: 9,
    category: 'drinks',
    description: 'Creamy yoghurt blended with Alphonso mango & cardamom',
    emoji: '🥭',
  },
  {
    id: 'drinks-espresso',
    name: 'Espresso',
    price: 6,
    category: 'drinks',
    description: 'Double-shot single-origin espresso from ethically sourced beans',
    emoji: '☕',
  },
  {
    id: 'drinks-matcha-latte',
    name: 'Matcha Latte',
    price: 7,
    category: 'drinks',
    description: 'Ceremonial-grade matcha whisked with steamed oat milk',
    emoji: '🍵',
  },
  {
    id: 'drinks-fresh-juice',
    name: 'Fresh Juice',
    price: 8,
    category: 'drinks',
    description: 'Cold-pressed juice of the day — ask your server for today\'s blend',
    emoji: '🍊',
  },

  /* ── Poolside ──────────────────────────────────────────────────── */
  {
    id: 'poolside-club-sandwich',
    name: 'Club Sandwich',
    price: 16,
    category: 'poolside',
    description: 'Triple-decker with grilled chicken, bacon, avocado & truffle mayo',
    emoji: '🥪',
  },
  {
    id: 'poolside-caesar-salad',
    name: 'Caesar Salad',
    price: 14,
    category: 'poolside',
    description: 'Crisp romaine, aged parmesan, croutons & anchovy dressing',
    emoji: '🥗',
  },
  {
    id: 'poolside-grilled-prawns',
    name: 'Grilled Prawns',
    price: 22,
    category: 'poolside',
    description: 'Tiger prawns marinated in garlic herb butter, served with lime aioli',
    emoji: '🦐',
  },
  {
    id: 'poolside-fish-tacos',
    name: 'Fish Tacos',
    price: 18,
    category: 'poolside',
    description: 'Baja-style grilled fish with cabbage slaw, mango salsa & chipotle crema',
    emoji: '🌮',
  },
  {
    id: 'poolside-cheese-platter',
    name: 'Cheese Platter',
    price: 20,
    category: 'poolside',
    description: 'Artisan cheese selection with honeycomb, dried fruits & crackers',
    emoji: '🧀',
  },
];

export function getMenuByCategory(category: MenuItem['category']): MenuItem[] {
  return menuItems.filter((item) => item.category === category);
}

export const categories: { key: MenuItem['category']; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'drinks', label: 'Drinks', emoji: '🍹' },
  { key: 'poolside', label: 'Poolside', emoji: '🏊' },
];
