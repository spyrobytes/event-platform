# Elegant Wedding Invitations — DX-Friendly Implementation Guide (Pure CSS + Light JS)

**Context:** Our Event Platform is wedding-first. The invitation experience is a *first impression* product surface.  
**Goal:** Deliver a premium, “wow” invitation interaction that feels like luxury stationery **without** relying on bloated external animation libraries.

---

## 1. Product goals

### Primary goals
- **Delight:** Create a ceremonial reveal moment (e.g., card emerging from an envelope).
- **Trust:** Feel high-end, stable, and intentional—not gimmicky.
- **Shareability:** A single URL that loads fast, looks great on mobile, and is safe to share broadly.
- **Personalization:** Each invitee can feel “seen” with light-touch bespoke elements.

### Non-goals
- A complex page-builder.
- Heavy WebGL/canvas experiences.
- Autoplay audio/video backgrounds.

---

## 2. Design principles (non-negotiables)

1. **Pure CSS first** for motion and visuals; **Light JS only** for state changes and progressive enhancement.
2. **Mobile-first** and **thumb-friendly** interactions.
3. **Respect accessibility**: `prefers-reduced-motion`, keyboard navigation, semantic HTML.
4. **Performance budgets**:
   - No large libraries for animation.
   - Avoid layout thrash (prefer `transform` and `opacity`).
   - Defer non-critical assets.

---

## 3. Core experience: Envelope Reveal (Anchor Template)

### Narrative
1. Envelope sits centered with subtle texture and shadow.
2. User taps/clicks.
3. Flap opens (hinge effect).
4. Invitation card slides out (eases, shadow deepens).
5. “Primary CTA” becomes visible: RSVP / View details.

### Interaction states
- `idle` → `hover` (desktop only) → `opening` → `open` → `closing` (optional)
- Support a **Replay** button (important for delight + demo value).

### Motion profile
- Ceremony > snappiness.
- Use easing that feels “physical,” not “UI.”

---

## 4. Motion tokens (use these consistently)

Define tokens once and re-use across templates.

```css
:root {
  /* Duration */
  --dur-1: 160ms;
  --dur-2: 240ms;
  --dur-3: 420ms;
  --dur-4: 700ms;

  /* Easing */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-ceremony: cubic-bezier(0.2, 0.9, 0.2, 1);

  /* Depth */
  --shadow-soft: 0 10px 30px rgba(0,0,0,0.12);
  --shadow-deep: 0 18px 50px rgba(0,0,0,0.18);

  /* Paper grain (subtle) */
  --grain-opacity: 0.06;
}
```

**Rule of thumb:** Use `transform` + `opacity`. Avoid animating `top/left/width/height`.

---

## 5. Personal touches that truly wow (high ROI features)

### 5.1 Invitee-aware greeting
- Render: “Dear **Aunt Maria**,” or “Hello **Sam**,”
- Source can be query param (`?to=Maria`) or invite token lookup.

**Implementation tip:** Always sanitize and cap length to prevent layout issues.

### 5.2 Script typography for names
- Couple names + invitee name in a script font pairing.
- Keep font payload small:
  - Prefer 1–2 WOFF2 fonts.
  - Use `font-display: swap`.

### 5.3 Ambient micro-motion (optional)
- Floating dust/petals *very* subtle.
- Disable automatically if `prefers-reduced-motion: reduce`.

### 5.4 Keepsake Mode
- Print-friendly view (`/invite/[token]/print`).
- “Replay animation” button.
- “Add to Calendar” (ICS) is a strong utility delight.

---

## 6. Accessibility checklist

### Reduced motion
- Honor:
  - `@media (prefers-reduced-motion: reduce)` → disable flap hinge + slide; switch to instant open.
- Provide manual “Open invitation” without animation.

### Keyboard & semantics
- Envelope is a `<button>` (not a div).
- Focus rings must be visible.
- `aria-expanded` reflects `open` state.

### Contrast & readability
- Ensure text remains readable over textures.
- Avoid light-on-light sections (weddings often skew pastel).

---

## 7. Technical architecture (Next.js + Tailwind + CSS Modules)

### Recommended component split
- `InvitationShell` (layout, theme tokens, background)
- `EnvelopeReveal` (interactive animation container)
- `InvitationCard` (actual content—names, details, CTA)
- `InviteeGreeting` (personalization)
- `ReplayButton` (state reset)
- `PrintView` (no animation, printer-friendly)

### State management

Use a minimal state machine:

```typescript
type InvitationState = 'idle' | 'opening' | 'open' | 'closing';

const stateMachine: Record<InvitationState, Partial<Record<string, InvitationState>>> = {
  idle: { CLICK: 'opening' },
  opening: { COMPLETE: 'open' },
  open: { CLICK_REPLAY: 'closing', CLICK_CLOSE: 'closing' },
  closing: { COMPLETE: 'idle' }
};

function transition(current: InvitationState, event: string): InvitationState {
  return stateMachine[current]?.[event] ?? current;
}
```

### Component interface

```typescript
interface EnvelopeRevealProps {
  /** Current animation state */
  state: InvitationState;
  /** State change handler */
  onStateChange: (state: InvitationState) => void;
  /** Respect prefers-reduced-motion */
  reducedMotion?: boolean;
  /** Auto-open on mount (use sparingly) */
  autoOpen?: boolean;
  /** Duration in ms (use motion tokens) */
  duration?: number;
  /** Child content (InvitationCard) */
  children: React.ReactNode;
  /** Accessible label */
  ariaLabel?: string;
}

interface InvitationCardProps {
  /** Couple display names */
  coupleNames: string;
  /** Event title */
  eventTitle: string;
  /** Event date/time */
  eventDate: Date;
  /** Venue information */
  venue: VenueInfo;
  /** RSVP URL or callback */
  rsvpAction: string | (() => void);
  /** Personalized greeting */
  inviteeName?: string;
  /** Theme variant */
  themeId?: string;
}

interface VenueInfo {
  name: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
}
```

### JS responsibilities
- Toggle states via state machine
- Set CSS classnames based on state
- Manage focus for accessibility
- Lock scroll during reveal (optional)
- Handle transitionend events
- Debounce rapid clicks

Avoid animation libraries; do not compute per-frame positions.

---

## 8. Animation implementation strategy (CSS-driven)

### Envelope layers
- Back panel
- Front panel
- Flap (hinged with `transform-origin: top`)
- Card (slides with translateY)

**Key technique:** stacking context + careful z-index.

### Example class approach
- `.root`
- `.root.isOpen`
- `.flap`
- `.card`
- `.shadow`

**Open state changes**:
- flap rotates
- card translates upward
- shadow deepens
- background vignette fades in

### Avoid layout thrash
- Don’t measure DOM every tick.
- Avoid forced reflows (e.g., reading layout immediately after writing).

---

## 9. Theming system (premium without complexity)

Offer a small, curated set of themes.

### Theme axes
- Paper texture: linen / cotton / pearl / kraft
- Palette: ivory / blush / sage / midnight / champagne
- Typography pair: serif+script / sans+script / serif+smallcaps

### Theme implementation

```typescript
const themes = {
  ivory: {
    '--paper-bg': '#FFFFF8',
    '--paper-texture': 'url(/textures/linen.png)',
    '--text-primary': '#2C2C2C',
    '--text-secondary': '#6B6B6B',
    '--accent': '#D4AF37',
    '--envelope-color': '#F5F5DC',
    '--card-bg': '#FFFEF9',
  },
  blush: {
    '--paper-bg': '#FFF5F5',
    '--paper-texture': 'url(/textures/cotton.png)',
    '--text-primary': '#4A4A4A',
    '--text-secondary': '#8A8A8A',
    '--accent': '#D4A5A5',
    '--envelope-color': '#FFE4E4',
    '--card-bg': '#FFFAFA',
  },
  sage: {
    '--paper-bg': '#F5F8F5',
    '--paper-texture': 'url(/textures/pearl.png)',
    '--text-primary': '#3A4A3A',
    '--text-secondary': '#6A7A6A',
    '--accent': '#8B9B8B',
    '--envelope-color': '#E8EDE8',
    '--card-bg': '#FAFCFA',
  },
  midnight: {
    '--paper-bg': '#1A1A2E',
    '--paper-texture': 'url(/textures/linen-dark.png)',
    '--text-primary': '#EEEEF0',
    '--text-secondary': '#B8B8C0',
    '--accent': '#FFD700',
    '--envelope-color': '#252540',
    '--card-bg': '#2A2A40',
  },
  champagne: {
    '--paper-bg': '#F7F3E9',
    '--paper-texture': 'url(/textures/kraft.png)',
    '--text-primary': '#4A3F35',
    '--text-secondary': '#7A6F65',
    '--accent': '#C9A961',
    '--envelope-color': '#E8DFC8',
    '--card-bg': '#FAF6ED',
  },
} as const;

type ThemeId = keyof typeof themes;

// Apply theme on server or client
function applyTheme(themeId: ThemeId): string {
  const vars = themes[themeId];
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}
```

### Typography pairs

```typescript
const typographyPairs = {
  classic: {
    heading: "'Playfair Display', serif",
    script: "'Dancing Script', cursive",
    body: "'Lato', sans-serif",
  },
  modern: {
    heading: "'Montserrat', sans-serif",
    script: "'Allura', cursive",
    body: "'Inter', sans-serif",
  },
  traditional: {
    heading: "'Cormorant Garamond', serif",
    script: "'Great Vibes', cursive",
    body: "'Crimson Text', serif",
  },
} as const;
```

### Preventing theme flicker

```tsx
// In app layout or document head
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        const theme = '${themeId}';
        const vars = ${JSON.stringify(themes[themeId])};
        const root = document.documentElement;
        Object.entries(vars).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
      })();
    `,
  }}
/>
```

Represent as:
- `themeId` persisted on event/invitation record
- CSS variables per theme (server-rendered inline script prevents flicker)
- Font pairs loaded via `<link rel="preload">` for critical fonts only

---

## 10. Content model (minimal but future-proof)

### Invitation fields (suggested)
- `coupleDisplayName` (max 60 chars, handles "& " or "and")
- `eventTitle` (max 40 chars)
- `startAt`, `endAt`, `timezone`
- `venueName` (max 50 chars)
- `address` (max 100 chars, max 3 lines)
- `city`, `state`, `zipCode`
- `dressCode` (optional, max 30 chars)
- `rsvpUrl` or internal RSVP route
- `themeId`
- `heroImageUrl` (optional, must be optimized)
- `locale` (for i18n, defaults to 'en-US')
- `textDirection` ('ltr' | 'rtl')

### Invitee fields (personalization)
- `inviteeDisplayName` (max 40 chars, sanitized)
- `salutation` (optional, max 20 chars)
- `groupName` / `household` (max 50 chars)
- `token` (unique, unguessable, min 32 chars)

### Content constraints (enforced)

```typescript
const CONTENT_LIMITS = {
  coupleDisplayName: { max: 60, recommendedMax: 40 },
  eventTitle: { max: 40, recommendedMax: 30 },
  venueName: { max: 50, recommendedMax: 35 },
  address: { max: 100, maxLines: 3 },
  inviteeDisplayName: { max: 40, recommendedMax: 25 },
  dressCode: { max: 30, recommendedMax: 20 },
} as const;

// Text overflow handling
function truncateWithEllipsis(text: string, maxLength: number): string {
  return text.length > maxLength
    ? text.slice(0, maxLength - 1) + '…'
    : text;
}
```

### RTL language support

```css
/* Auto-detect direction */
.invitation-card {
  direction: var(--text-direction, ltr);
  text-align: start;
}

/* Flip envelope for RTL */
[dir="rtl"] .envelope__flap {
  transform-origin: top center; /* Same, but visually flipped */
}

[dir="rtl"] .envelope__card {
  left: auto;
  right: 5%;
}
```

### Fallback fonts strategy

```css
:root {
  --font-heading: 'Playfair Display', 'Times New Roman', serif;
  --font-script: 'Dancing Script', cursive, serif;
  --font-body: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

---

## 11. Performance budgets & metrics

### Hard budgets
- **First Contentful Paint:** < 1.2s (3G)
- **Largest Contentful Paint:** < 2.5s (3G)
- **Time to Interactive:** < 3.0s
- **Cumulative Layout Shift:** < 0.1
- **Animation frame budget:** 16.67ms (60fps)
- **Total JS payload:** < 50KB (gzipped)
- **Total CSS payload:** < 20KB (gzipped)
- **Font payload:** < 40KB total (WOFF2)
- **Hero image:** < 150KB (WebP/AVIF with fallback)

### Optimization tactics

**Images:**
```tsx
<Image
  src="/invitations/hero.jpg"
  alt="Wedding invitation"
  width={800}
  height={600}
  quality={85}
  formats={['avif', 'webp', 'jpg']}
  loading="eager"
  priority
/>
```

**Fonts:**
```html
<!-- Preload critical fonts only -->
<link
  rel="preload"
  href="/fonts/playfair-display-v30.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<style>
  @font-face {
    font-family: 'Playfair Display';
    src: url('/fonts/playfair-display-v30.woff2') format('woff2');
    font-display: swap;
    font-weight: 400 700;
  }
</style>
```

**Code splitting:**
```typescript
// Lazy load non-critical features
const PrintView = dynamic(() => import('./PrintView'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});

const ReplayButton = dynamic(() => import('./ReplayButton'), {
  ssr: false,
});
```

**No blocking calls:**
- Render skeleton + hydrate
- Stream RSC payload
- Defer analytics

**Graceful degradation:**
- Open state defaults to "open" on no-JS
- Critical content visible immediately
- Progressive enhancement for animations

---

## 12. Quality & testing

### Visual QA
- Test on:
  - iOS Safari
  - Android Chrome
  - Desktop Chrome/Safari/Firefox
- Verify z-index correctness during animation.

### Interaction QA
- spam clicks (debounce transitions)
- replay works reliably
- open/close works without stuck intermediate states

### Accessibility QA
- keyboard navigation
- screen reader announcements
- reduced-motion behavior

---

## 13. Rollout plan

### MVP (ship this first)
- Envelope Reveal template
- 2 themes
- Invitee greeting personalization
- Replay + Print view

### V2
- Layered unfold template
- Scroll-based storytelling template (progressive reveal)
- Add-to-calendar (ICS)

### V3
- More premium textures + typographic pairings
- Subtle ambient particles (opt-in, reduced-motion aware)

---

## 14. “Don’t do this” list

- Autoplay audio.
- Heavy animation frameworks.
- Video backgrounds.
- Unbounded theme customization (keeps complexity in check).
- Measuring layout in animation loops.

---

## 15. Error handling

### Animation cleanup

```typescript
useEffect(() => {
  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'transform') {
      onStateChange(transition(state, 'COMPLETE'));
    }
  };

  const element = envelopeRef.current;
  element?.addEventListener('transitionend', handleTransitionEnd);

  return () => {
    element?.removeEventListener('transitionend', handleTransitionEnd);
  };
}, [state, onStateChange]);
```

### Handling interrupted animations

```typescript
// Cancel in-flight animations
function handleInterrupt() {
  if (state === 'opening' || state === 'closing') {
    // Force completion
    onStateChange(state === 'opening' ? 'open' : 'idle');
  }
}
```

### Image load failures

```tsx
<Image
  src={heroImageUrl}
  alt="Invitation"
  onError={() => setImageFailed(true)}
  fallback={<div className="invitation-placeholder" />}
/>
```

### CSS animation fallback

```typescript
// Detect animation support
const supportsAnimations = typeof window !== 'undefined' &&
  'animate' in HTMLElement.prototype;

if (!supportsAnimations) {
  // Skip animations, show open state immediately
  onStateChange('open');
}
```

---

## 16. Loading states

### Skeleton while fonts load

```tsx
const [fontsLoaded, setFontsLoaded] = useState(false);

useEffect(() => {
  document.fonts.ready.then(() => {
    setFontsLoaded(true);
  });
}, []);

return (
  <div className={fontsLoaded ? 'fonts-ready' : 'fonts-loading'}>
    {/* Content */}
  </div>
);
```

### Progressive enhancement pattern

```tsx
// Server: render static open state
// Client: hydrate with interaction

function InvitationWrapper({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Server-rendered: static open state
    return <div className="envelope envelope--open">{children}</div>;
  }

  // Client: interactive version
  return <EnvelopeReveal>{children}</EnvelopeReveal>;
}
```

### Slow network handling

```typescript
// Show loading indicator if fonts/images take > 2s
const [isLoading, setIsLoading] = useState(true);
const [showSlowWarning, setShowSlowWarning] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    if (isLoading) {
      setShowSlowWarning(true);
    }
  }, 2000);

  return () => clearTimeout(timer);
}, [isLoading]);
```

---

## 17. Testing strategy

### Animation QA matrix

| Test Case                    | Chrome | Safari | Firefox | Mobile Safari | Mobile Chrome |
|-----------------------------|--------|--------|---------|---------------|---------------|
| Envelope open/close         | ✓      | ✓      | ✓       | ✓             | ✓             |
| Reduced motion              | ✓      | ✓      | ✓       | ✓             | ✓             |
| Replay button               | ✓      | ✓      | ✓       | ✓             | ✓             |
| Z-index correctness         | ✓      | ✓      | ✓       | ✓             | ✓             |
| Rapid clicks (debounce)     | ✓      | ✓      | ✓       | ✓             | ✓             |
| Interrupted animation       | ✓      | ✓      | ✓       | ✓             | ✓             |
| Focus management            | ✓      | ✓      | ✓       | ✓             | ✓             |

### Automated tests

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react';
import { EnvelopeReveal } from './EnvelopeReveal';

describe('EnvelopeReveal', () => {
  it('transitions from idle to open on click', async () => {
    const onStateChange = jest.fn();
    const { getByRole } = render(
      <EnvelopeReveal state="idle" onStateChange={onStateChange}>
        <div>Card content</div>
      </EnvelopeReveal>
    );

    const envelope = getByRole('button');
    fireEvent.click(envelope);

    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith('opening');
    });
  });

  it('respects reduced motion preference', () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    const { container } = render(
      <EnvelopeReveal state="idle" onStateChange={jest.fn()} reducedMotion>
        <div>Card content</div>
      </EnvelopeReveal>
    );

    expect(container.querySelector('.envelope')).toHaveClass('reduced-motion');
  });
});
```

### Visual regression tests

```typescript
// Using Playwright or similar
import { test, expect } from '@playwright/test';

test('envelope appears correctly', async ({ page }) => {
  await page.goto('/invite/test-token');
  await expect(page).toHaveScreenshot('envelope-idle.png');
});

test('envelope opens correctly', async ({ page }) => {
  await page.goto('/invite/test-token');
  await page.click('.envelope');
  await page.waitForTimeout(1000); // Wait for animation
  await expect(page).toHaveScreenshot('envelope-open.png');
});
```

---

## 18. Debugging guide

### Common animation issues

**Problem: Flap doesn't rotate**
- Check `transform-style: preserve-3d` on parent
- Verify `transform-origin: top center`
- Inspect z-index stacking

**Problem: Card doesn't slide**
- Ensure `position: absolute` or `relative`
- Check transition property includes `transform`
- Verify state class is applied (`.envelope--open`)

**Problem: Jank during animation**
- Use Chrome DevTools Performance tab
- Look for Layout/Paint in timeline (should only see Composite)
- Ensure animating only `transform` and `opacity`

**Problem: Animation stuck in intermediate state**
- Add `transitionend` event listener
- Implement timeout fallback (force state completion)
- Check for event bubbling issues

### Debugging tools

```typescript
// Add to development build only
if (process.env.NODE_ENV === 'development') {
  useEffect(() => {
    console.log('[Envelope] State:', state);
    console.log('[Envelope] Reduced motion:', reducedMotion);
  }, [state, reducedMotion]);
}
```

### Performance profiling

```typescript
// Measure animation performance
const measureAnimation = () => {
  const start = performance.now();
  
  requestAnimationFrame(function measure() {
    const now = performance.now();
    const delta = now - start;
    
    if (delta > 16.67) {
      console.warn('Frame dropped:', delta);
    }
    
    if (state === 'opening' || state === 'closing') {
      requestAnimationFrame(measure);
    }
  });
};
```

---

## 19. Bundle size tracking

### Measurement

```bash
# Generate bundle analysis
npx @next/bundle-analyzer

# Track component size
npm run build -- --profile
```

### Targets

```typescript
// .bundlewatch.config.json
{
  "files": [
    {
      "path": "./out/**/*.js",
      "maxSize": "50KB"
    },
    {
      "path": "./out/**/*.css",
      "maxSize": "20KB"
    }
  ]
}
```

### Optimization checklist

- [ ] No unnecessary dependencies
- [ ] Tree-shaking enabled
- [ ] Dynamic imports for non-critical code
- [ ] CSS purged of unused styles
- [ ] Fonts subseted to needed glyphs
- [ ] Images optimized and responsive

---

## 20. Definition of done (Envelope Reveal)

### Functional
- [ ] Opens within 1 tap/click; no jank
- [ ] Replay works reliably
- [ ] Personalized greeting supported
- [ ] Print view available
- [ ] Core RSVP CTA is always reachable

### Performance
- [ ] FCP < 1.2s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] 60fps during animations

### Accessibility
- [ ] Works with reduced motion
- [ ] Keyboard navigation functional
- [ ] Screen reader announcements correct
- [ ] Focus management works
- [ ] Touch targets ≥ 44×44px

### Cross-browser
- [ ] Chrome (desktop + mobile)
- [ ] Safari (desktop + mobile)
- [ ] Firefox
- [ ] Edge

### Visual
- [ ] Looks premium on mobile + desktop
- [ ] Handles long names gracefully
- [ ] RTL languages work correctly
- [ ] Theme switching works without flicker

---

## Appendix: Implementation notes (DX)

- Use **CSS Modules** for animation-heavy styles and pseudo-elements.
- Use **Tailwind** for layout, spacing, typography defaults, responsiveness.
- Keep **theme tokens** as CSS variables to avoid class explosion.
- Keep state transitions in JS minimal: toggle `isOpen` and `isAnimating`.
- Measure performance continuously during development.
- Test on real devices, not just emulators.

---

*This document is intended as a living implementation reference for our dev team. Add concrete theme presets and design tokens as the product evolves.*
