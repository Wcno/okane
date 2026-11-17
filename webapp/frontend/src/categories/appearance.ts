import {
  CarFront,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  House,
  Shapes,
  Tag,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * The initial Categories are told apart by the `key` api-service gives each User's copy;
 * ids are per Category, so nothing here depends on them. A Category the User creates has no key.
 * The hue follows the key, in the order of the validated palette (DESIGN.md, The Entity Keeps Its Hue Rule).
 */
const initial: Record<string, { icon: LucideIcon; hue: number }> = {
  housing: { icon: House, hue: 1 },
  food: { icon: Utensils, hue: 2 },
  transport: { icon: CarFront, hue: 3 },
  utilities: { icon: Zap, hue: 4 },
  health: { icon: HeartPulse, hue: 5 },
  entertainment: { icon: Clapperboard, hue: 6 },
  education: { icon: GraduationCap, hue: 7 },
  other: { icon: Shapes, hue: 0 },
}

/** The icon of an initial Category; every other one wears the generic tag. */
export const iconOf = (key: string | null): LucideIcon => (key ? initial[key]?.icon : undefined) ?? Tag

/** The CSS variable of a Category's hue; any Category beyond the seven hues, "Otros" included, is neutral. */
export const toneOf = (key: string | null): string => `var(--cat-${(key ? initial[key]?.hue : undefined) ?? 0})`
