/**
 * SKETCH DESIGN SYSTEM - TYPESCRIPT TOKEN DEFINITIONS
 *
 * Central source of truth matching design system requirements:
 * - Background: #fdfbf7
 * - Foreground: #2d2d2d
 * - Muted: #e5e0d8
 * - Accent: #ff4d4d
 * - Secondary Accent: #2d5da1
 * - Headings: Kalam, 700
 * - Body: Patrick Hand, 400
 */

export const SKETCH_COLORS = {
  bg: '#fdfbf7',
  fg: '#2d2d2d',
  muted: '#e5e0d8',
  accent: '#ff4d4d',
  secondary: '#2d5da1',
  paper: '#f9f6ef',
  card: '#ffffff',
  border: '#2d2d2d',
} as const;

export const SKETCH_FONTS = {
  heading: 'Kalam, cursive, sans-serif',
  body: '"Patrick Hand", cursive, sans-serif',
} as const;

export const SKETCH_SHADOWS = {
  xs: '1px 1px 0px #2d2d2d',
  sm: '2px 2px 0px #2d2d2d',
  base: '3px 3px 0px #2d2d2d',
  md: '4px 4px 0px #2d2d2d',
  lg: '6px 6px 0px #2d2d2d',
  accent: '3px 3px 0px #ff4d4d',
  secondary: '3px 3px 0px #2d5da1',
  active: '1px 1px 0px #2d2d2d',
} as const;

export const SKETCH_RADII = {
  wobbly: '255px 15px 225px 15px / 15px 225px 15px 255px',
  card: '255px 25px 225px 25px / 25px 225px 25px 255px',
  button: '255px 20px 225px 20px / 20px 225px 20px 255px',
  input: '255px 15px 225px 15px / 15px 225px 15px 255px',
  badge: '120px 20px 100px 20px / 20px 100px 20px 120px',
  round: '50% 50% 50% 50% / 60% 60% 40% 40%',
} as const;
