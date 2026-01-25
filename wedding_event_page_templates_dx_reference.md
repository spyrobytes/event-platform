# Wedding Event Page Templates — DX Reference

## Goal
Provide a **single, extensible Wedding Page system** with multiple variants that:
- Reflect real user behavior (wedding-heavy usage)
- Avoid page-builder complexity
- Are easy to reason about, extend, and maintain

This document is the **authoritative reference** for implementing wedding templates in the Event Platform.

---

## Core Principle

> **One Wedding Page Engine + Variant Configurations**

- **Template family**: `wedding`
- **Variant**:  
  **Core Variants:**  
  `classic | modern_minimal | rustic_outdoor | destination | intimate_micro`
  
  **Cultural Variants:**  
  `south_asian | jewish | chinese | fusion_multicultural`
  
  **Seasonal Variants:**  
  `spring_garden | summer_beach | fall_foliage | winter_wonderland`
  
  **Specialized Variants:**  
  `contemporary_bold | luxury_high_end | eco_sustainable | second_ceremony`

Each variant differs only by:
- section order
- enabled/disabled modules
- default copy + imagery
- style tokens

No duplicated page logic. No schema forks.

---

## Section Catalog (Building Blocks)

All wedding pages are composed from this shared catalog:

**Core Sections:**
- `Hero` — Main banner with couple names, date, location
- `Story` — Couple's story, how they met
- `Details` — Ceremony & reception details (time, venue, address)
- `Schedule` — Timeline of events
- `TravelStay` — Hotel blocks, accommodation info
- `ThingsToDo` — Local attractions, activities for guests
- `WeddingParty` — Bridal party introductions
- `Gallery` — Photo gallery or slideshow
- `Attire` — Dress code, attire guidance
- `FAQ` — Frequently asked questions
- `RSVP` — RSVP form and meal selection

**Extended Sections:**
- `Registry` — Gift registry links (multiple registries supported)
- `Livestream` — Virtual attendance link and instructions
- `Social` — Wedding hashtag, social media integration
- `Guestbook` — Digital message board for guests
- `Transport` — Shuttle schedules, parking, rideshare info
- `CulturalTraditions` — Explanation of cultural ceremonies/customs
- `SustainabilityInfo` — Eco-friendly practices, carbon offset options
- `SpecialNeeds` — Accessibility info, dietary accommodations

Each section:
- has a stable schema
- supports sensible defaults
- can be toggled per variant

---

## Wedding Variants (v1)

### 1. Classic / Traditional
**Best for:** church, ballroom, formal weddings

**Sections**
1. Hero  
2. Details  
3. Schedule  
4. WeddingParty  
5. TravelStay  
6. RSVP  
7. FAQ  

**Tone:** formal  
**Design:** serif headings, symmetry, minimal motion

---

### 2. Modern Minimal
**Best for:** city weddings, design-forward couples

**Sections**
1. Hero (typography-first)  
2. Story (short)  
3. Details  
4. RSVP  
5. FAQ  

**Tone:** concise, modern  
**Design:** whitespace, large type, subtle transitions

---

### 3. Rustic / Outdoor
**Best for:** barn, vineyard, countryside

**Sections**
1. Hero (photo-forward)  
2. Details  
3. Schedule (weekend-style)  
4. TravelStay  
5. Attire  
6. Gallery  
7. RSVP  

**Tone:** warm, casual  
**Design:** earthy colors, textured backgrounds

---

### 4. Destination
**Best for:** international or multi-day weddings

**Sections**
1. Hero (location-first)  
2. TravelStay  
3. Schedule (multi-day)  
4. ThingsToDo  
5. RSVP  
6. FAQ  

**Tone:** helpful, itinerary-driven  
**Design:** airy layout, clear info cards, maps

---

### 5. Intimate / Micro
**Best for:** small guest lists, personal ceremonies

**Sections**
1. Hero  
2. Story (personal note)  
3. Details  
4. RSVP (with message field)  
5. FAQ  

**Tone:** personal, heartfelt  
**Design:** fewer sections, story emphasis

---

## Cultural Variants (v1)

### 6. South Asian
**Best for:** Indian, Pakistani, Bangladeshi weddings

**Sections**
1. Hero  
2. CulturalTraditions  
3. Schedule (multi-day: Mehndi, Sangeet, Ceremony, Reception)  
4. WeddingParty  
5. Attire (with cultural context)  
6. TravelStay  
7. Gallery  
8. RSVP (per event)  

**Tone:** vibrant, celebratory  
**Design:** rich colors (gold, red, jewel tones), ornate patterns, multi-event emphasis

---

### 7. Jewish
**Best for:** Jewish weddings

**Sections**
1. Hero  
2. CulturalTraditions (Ketubah, Chuppah, Hora)  
3. Details  
4. Schedule (pre-ceremony, ceremony, reception)  
5. WeddingParty  
6. TravelStay  
7. RSVP  
8. FAQ  

**Tone:** traditional, joyful  
**Design:** classic elegance, Star of David elements, Hebrew typography options

---

### 8. Chinese
**Best for:** Chinese traditional weddings

**Sections**
1. Hero (bilingual options)  
2. CulturalTraditions (Tea ceremony, door games)  
3. Schedule  
4. Details  
5. Gallery  
6. RSVP  
7. FAQ (cultural context)  

**Tone:** respectful, festive  
**Design:** red & gold palette, traditional patterns, double happiness symbol

---

### 9. Fusion / Multicultural
**Best for:** blended cultural traditions

**Sections**
1. Hero  
2. Story (cultural backgrounds)  
3. CulturalTraditions (both/multiple traditions)  
4. Schedule (hybrid ceremonies)  
5. Details  
6. WeddingParty  
7. Gallery  
8. RSVP  
9. FAQ (explaining traditions)  

**Tone:** inclusive, celebratory  
**Design:** balanced visual elements from both cultures, harmonious color blending

---

## Seasonal Variants (v1)

### 10. Spring Garden
**Best for:** spring weddings, garden venues

**Sections**
1. Hero (floral-forward)  
2. Details  
3. Schedule  
4. Gallery  
5. TravelStay  
6. RSVP  

**Tone:** fresh, romantic  
**Design:** pastel palette, floral elements, light and airy

---

### 11. Summer Beach
**Best for:** beach, coastal, resort weddings

**Sections**
1. Hero (ocean backdrop)  
2. Details  
3. TravelStay (resort info)  
4. Attire (casual beach)  
5. ThingsToDo  
6. RSVP  

**Tone:** relaxed, breezy  
**Design:** blues & sandy tones, wave elements, light typography

---

### 12. Fall Foliage
**Best for:** autumn weddings, winery, mountain venues

**Sections**
1. Hero  
2. Details  
3. Schedule  
4. Gallery  
5. TravelStay  
6. Attire  
7. RSVP  

**Tone:** cozy, warm  
**Design:** warm autumn palette (burgundy, gold, orange), rustic textures

---

### 13. Winter Wonderland
**Best for:** winter weddings, holiday season

**Sections**
1. Hero (snowy/elegant)  
2. Details  
3. Schedule  
4. TravelStay (weather considerations)  
5. Attire (weather-appropriate)  
6. RSVP  
7. FAQ  

**Tone:** elegant, magical  
**Design:** cool palette (silver, blue, white), sparkle effects, elegant serif fonts

---

## Specialized Variants (v1)

### 14. Contemporary Bold
**Best for:** artistic couples, photographers, design-forward events

**Sections**
1. Hero (full-screen visual)  
2. Gallery (primary focus)  
3. Details (minimal)  
4. RSVP  

**Tone:** artistic, confident  
**Design:** bold typography, high contrast, immersive imagery, asymmetric layouts

---

### 15. Luxury / High-End
**Best for:** upscale venues, luxury planners, premium events

**Sections**
1. Hero (sophisticated)  
2. Details (venue showcase)  
3. Schedule  
4. WeddingParty  
5. TravelStay (luxury accommodations)  
6. Registry (high-end)  
7. RSVP  

**Tone:** refined, sophisticated  
**Design:** elegant fonts, premium color palettes, subtle animations, generous spacing

---

### 16. Eco / Sustainable
**Best for:** environmentally-conscious couples

**Sections**
1. Hero  
2. SustainabilityInfo  
3. Details (eco-venue)  
4. Registry (sustainable options)  
5. Transport (carbon offset)  
6. RSVP  
7. FAQ  

**Tone:** mindful, authentic  
**Design:** natural palette, organic shapes, minimal footprint design, native plants imagery

---

### 17. Second Ceremony / Vow Renewal
**Best for:** vow renewals, elopement receptions, commitment ceremonies

**Sections**
1. Hero  
2. Story (journey together)  
3. Details  
4. Schedule (simplified)  
5. RSVP  
6. FAQ  

**Tone:** celebratory, established  
**Design:** mature elegance, focus on celebration over formality

---

## Variant Configuration Shape

Each variant is defined by configuration, not code.

```ts
type WeddingVariantConfig = {
  id: string;
  displayName: string;
  description: string;
  category: 'core' | 'cultural' | 'seasonal' | 'specialized';
  bestFor: string[]; // Tags for matching

  styleTokens: {
    fontHeading: string;
    fontBody: string;
    colorPalette: string;
    accentColor: string;
    backgroundPattern?: string;
  };

  sections: Array<{
    type: string;
    enabled: boolean;
    order: number;
    defaultContent?: Record<string, any>;
  }>;

  featureFlags: {
    weddingParty?: boolean;
    attire?: boolean;
    multiDaySchedule?: boolean;
    culturalTraditions?: boolean;
    livestream?: boolean;
    bilingual?: boolean;
  };

  // New properties
  animations: 'none' | 'subtle' | 'moderate' | 'dynamic';
  
  accessibility: {
    minContrast: number;
    focusIndicators: boolean;
    screenReaderOptimized: boolean;
  };
  
  seoDefaults: {
    titleTemplate: string;
    descriptionTemplate: string;
    ogImageStyle: string;
  };
  
  mobileOptimizations: {
    stackingSections: boolean;
    touchGestures: boolean;
    reducedMotion: boolean;
  };
  
  customizationLevel: 'locked' | 'curated' | 'flexible';
  
  validation: ValidationRules;
};

type ValidationRules = {
  maxSections: number;
  requiredSections: string[];
  incompatibleSections: Array<[string, string]>;
  maxImageSizes: Record<string, number>; // in KB
  copyLengthLimits: Record<string, { min: number; max: number }>;
  allowedColorPalettes?: string[];
  allowedFonts?: string[];
};
```

---

## Rendering Model

```
Event Content (DB)
+ Variant Config
+ Section Registry
→ Final Page
```

The renderer:
- iterates sections in order
- injects content + defaults
- applies style tokens

---

## Template Picker UX (Required)

During event creation:
1. User selects **Event Type: Wedding**
2. Show the 5 variants with:
   - thumbnail
   - short description
   - “Best for” label
3. Store `templateFamily = wedding` + `variantId`

Optional (recommended):
- Ask: **“What kind of wedding vibe?”**
- Preselect variant automatically

---
## Customization Boundaries

### What Users CAN Customize

**Within "Curated" Level:**
- ✅ Color palette selection (from 5-8 pre-tested combinations per variant)
- ✅ Font pairing selection (from 3-5 tested combinations)
- ✅ Section toggling (show/hide non-required sections)
- ✅ Copy editing (with character count guidance)
- ✅ Image uploads (with dimension/size recommendations)
- ✅ Section reordering (within sensible constraints)

**Within "Flexible" Level:**
- ✅ All of the above, plus:
- ✅ Custom color hex codes (with contrast validation)
- ✅ Animation speed/style preferences
- ✅ Layout density (compact, standard, spacious)

### What Users CANNOT Customize (v1)

- ❌ Arbitrary drag-and-drop layout builder
- ❌ Per-section CSS overrides
- ❌ Custom component injection
- ❌ Typography outside curated pairings (except Luxury tier)
- ❌ Breakpoint modifications

### Content Guidelines

**Copy Length Limits (enforced):**
- Hero headline: 60 characters
- Story section: 500-1500 characters
- Section descriptions: 200 characters
- FAQ answers: 300 characters each

**Image Upload Specs:**
- Hero: 1920×1080px, max 500KB, JPEG/WebP
- Gallery: 1200×800px, max 300KB each
- Portrait shots: 600×900px, max 200KB
- Thumbnails: auto-generated

**Accessibility Requirements:**
- Alt text: required for all images
- Color contrast: minimum 4.5:1 for body text
- Heading hierarchy: enforced by template
- Focus indicators: always visible

---
## Defaults Matter

Every variant must ship with:
- tasteful placeholder copy
- sample imagery
- complete-looking layout on first render

Empty pages kill confidence.

---

## Technical Specifications

### Performance Requirements

**Load Time Targets:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Total Blocking Time (TBT): < 200ms

**Optimization Strategies:**
- Progressive image loading (blur-up placeholders)
- Lazy loading for below-fold sections
- Route-based code splitting
- Critical CSS inlining
- WebP with JPEG fallbacks
- CDN delivery for static assets

### Accessibility Standards (WCAG 2.1 Level AA)

**Required:**
- ✓ Semantic HTML structure
- ✓ Keyboard navigation support
- ✓ Screen reader optimization
- ✓ Color contrast compliance
- ✓ Focus management
- ✓ Skip navigation links
- ✓ ARIA labels for interactive elements
- ✓ Alternative text for images
- ✓ Responsive text sizing
- ✓ Form field labels and error messages

**Testing:**
- Automated: Lighthouse, axe DevTools
- Manual: Screen reader testing (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation testing

### SEO Implementation

**Structured Data (JSON-LD):**
```json
{
  "@type": "Event",
  "@context": "https://schema.org",
  "name": "[Couple Names] Wedding",
  "startDate": "[ISO 8601 date]",
  "location": {
    "@type": "Place",
    "name": "[Venue name]",
    "address": "[Full address]"
  },
  "eventStatus": "https://schema.org/EventScheduled"
}
```

**Meta Tags:**
- Dynamic og:image generation per variant
- Twitter Card support
- Canonical URLs
- robots.txt configuration
- Sitemap generation

### Mobile-First Design

**Breakpoints:**
- xs: 320px (mobile small)
- sm: 640px (mobile large)
- md: 768px (tablet)
- lg: 1024px (desktop)
- xl: 1280px (large desktop)

**Mobile Optimizations:**
- Touch-friendly tap targets (min 44×44px)
- Thumb-zone consideration for CTAs
- Swipe gestures for galleries
- Collapsible sections for long content
- Sticky RSVP button on mobile
- Reduced motion for animations (respects prefers-reduced-motion)

### Analytics & Tracking

**Event Tracking (per section):**
- Section views (scroll depth)
- RSVP form interactions
- Registry link clicks
- Gallery image views
- FAQ expansions
- Social share actions

**Conversion Funnels:**
1. Landing → RSVP viewed
2. RSVP viewed → Form started
3. Form started → Form submitted
4. Registry section view → Registry click

**Privacy Compliance:**
- GDPR consent management
- Cookie-less analytics option
- Anonymous IP tracking
- No PII in analytics data

---

## Content Strategy

### Copy Templates

Each variant ships with contextually appropriate placeholder copy:

**Hero Section:**
- Classic: "Together with their families, [Name] & [Name] invite you to celebrate their wedding"
- Modern Minimal: "[Name] & [Name] are getting married"
- Rustic: "Join us for a celebration in the countryside"
- Destination: "Join us for a wedding adventure in [Location]"

**Tone Guidelines:**

| Variant | Voice | Adjectives | Avoid |
|---------|-------|------------|-------|
| Classic | Formal, traditional | Elegant, timeless | Slang, contractions |
| Modern Minimal | Concise, contemporary | Clean, simple | Overly formal language |
| Rustic | Warm, casual | Cozy, natural | Corporate language |
| Destination | Helpful, informative | Adventurous, welcoming | Demanding tone |
| Intimate | Personal, heartfelt | Meaningful, close | Generic phrases |

### Image Guidelines

**Photography Style per Variant:**
- **Classic:** Traditional posed shots, symmetry, formal lighting
- **Modern Minimal:** Editorial style, negative space, geometric
- **Rustic:** Natural light, candid moments, outdoor settings
- **Destination:** Landscape integration, location showcase
- **Luxury:** High-end, magazine-quality, architectural focus

**Diversity & Representation:**
- Represent multiple ethnicities in stock imagery
- Various body types and ages
- LGBTQ+ couples included
- Different ability representations
- Cultural diversity in wedding traditions

**Authentic Scenarios:**
- Real venue types (not just stock photos)
- Genuine emotional moments
- Realistic guest interactions
- Actual wedding details (not just models)

---

## Preview & Quality Assurance

Every variant must pass the following checklist before release:

### Cross-Browser Testing
- [ ] Chrome (latest, -1)
- [ ] Safari (latest, -1)
- [ ] Firefox (latest, -1)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Chrome Mobile (Android 11+)

### Device Testing
- [ ] iPhone SE (small mobile)
- [ ] iPhone 14 Pro (standard mobile)
- [ ] iPad (tablet)
- [ ] Desktop 1920×1080
- [ ] Desktop 2560×1440 (hi-res)

### Accessibility Audit
- [ ] Lighthouse accessibility score ≥ 95
- [ ] axe DevTools 0 violations
- [ ] Keyboard navigation complete
- [ ] Screen reader testing (2 readers minimum)
- [ ] Color contrast verification
- [ ] Focus indicators visible

### Performance Benchmarks
- [ ] Load time < 3s on 3G
- [ ] Load time < 1.5s on 4G
- [ ] Lighthouse performance score ≥ 90
- [ ] Total page weight < 2MB
- [ ] No layout shifts (CLS < 0.1)

### Content Testing
- [ ] Min content length (sparse data)
- [ ] Max content length (verbose data)
- [ ] Edge cases (very long names, multiple venues)
- [ ] Missing optional sections
- [ ] All sections enabled

### Internationalization
- [ ] RTL language support (for applicable variants)
- [ ] Special character rendering
- [ ] Date/time format localization
- [ ] Currency format (for registry)

---

## Migration & Version Management

### Variant Switching

**User Can Switch Variants:**
- ✅ During draft phase (no restrictions)
- ✅ After publication (with content mapping)
- ⚠️ Warning shown if sections will be hidden
- ⚠️ Preview before confirming

**Content Preservation:**
1. Map common sections automatically
2. Store hidden section data (recoverable)
3. Prompt user for unmapped sections
4. Create snapshot before switch

### Upgrade Path (v1 → v2)

**When adding new features:**
- Existing pages continue working (no breaking changes)
- New features opt-in by default
- Migration tool for bulk updates
- Version pinning option for stability

**Data Migration Strategy:**
```ts
type MigrationPlan = {
  fromVersion: string;
  toVersion: string;
  steps: Array<{
    action: 'add' | 'rename' | 'remove' | 'transform';
    target: string;
    transformer?: (data: any) => any;
  }>;
  rollbackSupported: boolean;
};
```

### Deprecation Policy

**Variant Lifecycle:**
1. **Active:** Full support, recommended
2. **Maintenance:** Bug fixes only, not recommended for new
3. **Deprecated:** 12-month notice, migration path provided
4. **Retired:** Read-only, forced migration on edit

**Communication:**
- In-app notifications
- Email to event owners
- Migration deadline clearly stated
- One-click migration tool

---

## Non-Goals (v1)

- No arbitrary drag-and-drop
- No freeform layout editor
- No per-section styling overrides

Those are future features — not MVP.

---

## Future-Proofing

This architecture supports future enhancements without schema changes:

**Proven Extensibility:**
- ✓ Seasonal wedding variants (implemented in v1)
- ✓ Cultural wedding variants (implemented in v1)
- ✓ Analytics on variant performance (tracking in place)
- ✓ Planner-specific templates (configuration-driven)

**Future Possibilities:**
- Partner vendor integrations (florist, photographer)
- AI-powered content suggestions
- Template A/B testing framework
- White-label templates for wedding planners
- Industry-specific variants (corporate events, non-profits)
- Regional variants (US, EU, APAC customizations)
- Dynamic personalization based on guest data
- Multi-language template support
- Template marketplace (user-generated variants)

**Extension Points:**
```ts
// Variants are data, not code
const newVariant: WeddingVariantConfig = {
  // Configure, don't program
};

// Sections are pluggable
const customSection: SectionComponent = {
  // Register new section types
};

// Themes are tokenized
const brandTheme: StyleTokens = {
  // Override at theme level
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Core variants + infrastructure

**Deliverables:**
- [ ] Section component library (13 core sections)
- [ ] Variant configuration system
- [ ] 5 core variants (Classic, Modern Minimal, Rustic, Destination, Intimate)
- [ ] Template picker UI
- [ ] Basic customization (colors, fonts)
- [ ] Mobile responsive layouts
- [ ] RSVP form integration

**Success Metrics:**
- All 5 variants render correctly
- Performance targets met
- Lighthouse score ≥ 90

---

### Phase 2: Cultural Expansion (Weeks 5-7)
**Goal:** Cultural inclusivity

**Deliverables:**
- [ ] 4 cultural variants (South Asian, Jewish, Chinese, Fusion)
- [ ] CulturalTraditions section component
- [ ] Multi-day schedule support
- [ ] Bilingual content support
- [ ] Extended section catalog (Registry, Livestream, Social)

**Success Metrics:**
- Cultural representation validated by community feedback
- Multi-day schedules working
- Bilingual rendering tested

---

### Phase 3: Seasonal & Specialized (Weeks 8-10)
**Goal:** Seasonal + niche coverage

**Deliverables:**
- [ ] 4 seasonal variants (Spring, Summer, Fall, Winter)
- [ ] 4 specialized variants (Bold, Luxury, Eco, Second Ceremony)
- [ ] SustainabilityInfo section
- [ ] Advanced customization (flexible tier)
- [ ] Variant switching functionality

**Success Metrics:**
- 17 total variants live
- Variant switching preserves content
- Zero data loss in migrations

---

### Phase 4: Polish & Optimization (Weeks 11-12)
**Goal:** Production-ready quality

**Deliverables:**
- [ ] Accessibility audit completion (all variants)
- [ ] Cross-browser testing passed
- [ ] Performance optimization (images, lazy loading)
- [ ] Analytics integration
- [ ] SEO structured data
- [ ] User documentation
- [ ] Migration tools

**Success Metrics:**
- WCAG 2.1 AA compliant
- < 3s load time on 3G
- 95+ Lighthouse accessibility score

---

### Phase 5: Launch & Iteration (Week 13+)
**Goal:** User feedback & refinement

**Activities:**
- Beta testing with real users
- Analytics review (which variants most popular)
- A/B testing variant picker flow
- Content template refinement
- Bug fixes and polish

**Metrics to Track:**
- Variant selection distribution
- Customization usage rates
- RSVP completion rates
- User satisfaction (NPS)
- Performance in production

---

## Summary

You are building:
- **Depth**, not template sprawl
- **Structure**, not page-builder chaos
- **A wedding product**, not just an event page
- **Inclusive design**, representing diverse couples and cultures
- **Technical excellence**, meeting performance and accessibility standards

This document is the **authoritative reference** for all wedding template work.

---

## Document Version

**Version:** 2.0  
**Last Updated:** January 22, 2026  
**Status:** Active  
**Next Review:** Q2 2026

**Changelog:**
- v2.0 (2026-01-22): Added 12 new variants, technical specs, content strategy, migration plan
- v1.0 (Initial): Core 5 variants and basic architecture
