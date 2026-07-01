---
name: Sahaay Emergency Response System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#5c403c'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#916f6b'
  outline-variant: '#e6bdb8'
  surface-tint: '#bf0715'
  primary: '#b70011'
  on-primary: '#ffffff'
  primary-container: '#dc2626'
  on-primary-container: '#fff6f5'
  inverse-primary: '#ffb4ab'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed01b'
  on-secondary-container: '#6f5900'
  tertiary: '#004ed0'
  on-tertiary: '#ffffff'
  tertiary-container: '#2d68f0'
  on-tertiary-container: '#f8f7ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000b'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-sos:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  status-number:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 16px
  safe-margin: 20px
---

## Brand & Style

The design system is engineered for high-stress, critical environments where every millisecond counts. The brand personality is **Urgent, Reliable, and Hyper-Accessible**, prioritizing functional utility over decorative flair. 

The aesthetic follows a **High-Contrast Modern Flat** approach. By utilizing a strictly utilitarian framework, the interface eliminates cognitive load, ensuring that users in distress can identify actions and information instantly. Visual hierarchy is established through extreme color contrast and clear spatial grouping rather than complex gradients or textures. The emotional response is one of safety and immediate assistance, achieved through a "Zero-Friction" interface.

## Colors

The palette is rooted in international safety standards to ensure immediate recognition of intent.

- **Primary (Emergency Red):** Reserved exclusively for critical "SOS" triggers and life-threatening alerts. It must never be used for non-emergency decorative elements.
- **Secondary (Safety Yellow):** Used for cautionary information, pending states, or warnings that require attention but not immediate panic.
- **Tertiary (Medical Blue):** Dedicated to clinical information, hospital locations, and non-emergency medical data.
- **Success Green:** Indicates safe zones, resolved incidents, or successfully sent signals.
- **Neutral (Deep Charcoal & Off-White):** Provides a high-contrast foundation (AA/AAA compliant) to ensure readability in high-glare or low-light outdoor environments.

## Typography

This design system utilizes **Inter** for its exceptional legibility and high x-height, which is critical for reading short, urgent bursts of information.

- **Legibility First:** All body text must maintain a minimum weight of 400. 
- **Scale:** Headlines are aggressively sized to anchor the page. On mobile, the `display-sos` and `headline-lg` roles scale down slightly to ensure critical words do not wrap awkwardly.
- **Labels:** Use `label-bold` for metadata and status caps to distinguish them from actionable body text.
- **Numeric Data:** For coordinates or timers, use `status-number` to ensure figures are distinct and easy to communicate verbally over a call.

## Layout & Spacing

The layout philosophy is based on a **Fluid-Responsive Grid** with a strict 4px baseline.

- **Desktop:** 12-column grid with 24px gutters. Content is centered with a max-width of 1280px for dashboard views.
- **Mobile:** 4-column fluid grid. A mandatory "Safe Margin" of 20px is maintained on edges to prevent accidental triggers and ensure visibility on curved displays.
- **Touch Targets:** All interactive elements must adhere to a minimum 48x48px touch zone. Critical actions (SOS) should span the full width of the mobile viewport.
- **Rhythm:** Use `xl` (48px) spacing to separate distinct functional blocks (e.g., Map vs. Action Panel) to prevent clutter.

## Elevation & Depth

To maintain high contrast and speed, the design system avoids heavy shadows and skeuomorphism.

- **Flat Foundation:** Backgrounds are primarily `Off-White` (#F9FAFB) with `Deep Charcoal` (#111827) text.
- **Functional Shadows:** Use a single, high-diffusion "Safety Shadow" for floating action buttons and critical modals. (0px 4px 20px rgba(0,0,0, 0.1)).
- **Tonal Tiers:** Use subtle gray fills (#F3F4F6) to define container areas (like list items) instead of borders, reducing visual noise.
- **Active State:** Elements under interaction use a 2px solid stroke in the brand color rather than a shadow change, ensuring visibility for users with visual impairments.

## Shapes

The design system uses **Soft (1)** roundedness.

- **Standard Elements:** Buttons, inputs, and cards use a 4px (0.25rem) corner radius. This provides a professional, "tooled" look that feels more precise than rounder shapes.
- **Action Buttons:** Large SOS buttons may use `rounded-xl` (12px) to differentiate them from standard form inputs.
- **Iconography:** Icons should follow a 2px stroke weight with slightly rounded joins to match the component radius.

## Components

### Buttons
- **SOS Primary:** Full-width, #DC2626 background, White bold text, 56px height. Use an inner white 2px border for extra definition.
- **Secondary Action:** Ghost style with a 2px Charcoal border and bold text.

### Cards & Map Markers
- **Incident Card:** High-contrast white background with a 4px left-accent border colored by severity (Red/Yellow/Blue).
- **Map Markers:** Teardrop shape with a 32px diameter. Use white center icons for high legibility against the marker color.

### Input Fields
- **Emergency Inputs:** 48px height, 2px Charcoal border on focus. Placeholders must be high-contrast gray (#6B7280) to ensure they are readable before typing.

### Status Indicators
- **Live Pulse:** Use a subtle CSS animation (pulse) on the SOS indicator to confirm the app is actively transmitting data/location.
- **Connection Badge:** A persistent header element showing "GPS Active" or "Offline" using Success Green or Safety Yellow respectively.

### Lists
- **Resource List:** Tight vertical padding, 16px horizontal padding. Every list item must have a clear trailing chevron or action icon to signify interactability.