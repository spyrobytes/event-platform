# Luxury Invitation Design Concepts
## Core Interaction Patterns for the Event Platform

**Purpose of this document**  
This document defines the **four foundational invitation design concepts** that will anchor our luxury wedding invitation experience. These are not experiments or one-off effects — they are **first-class product primitives** that the platform will support, refine, and extend over time.

Each concept is:
- Emotion-first
- Technically feasible with **Pure CSS + Light JS**
- Mobile-friendly and accessible
- Distinct enough to suit different couple personalities

---

## 1. The Envelope Reveal (Anchor Experience)

### Concept summary
A virtual envelope opens and reveals the invitation card inside — mirroring the timeless ritual of receiving a physical wedding invitation.

This is the **default and flagship** experience of the platform.

### UX criteria
- **Engagement time:** 3–5 seconds from load to reveal
- **Interaction clarity:** Single tap/click with immediate visual feedback
- **Familiarity score:** High (universally understood metaphor)
- **Cognitive load:** Low (no learning curve)
- **Shareability:** Excellent (works across all age groups)

### Interaction flow
1. Envelope rests centered on the page
2. Subtle hover or idle animation (desktop only)
3. User taps/clicks
4. Envelope flap opens (hinged motion)
5. Card slides out with soft shadow and depth
6. Primary invitation content becomes visible

### Why this matters
- Universally understood interaction
- Instantly communicates “wedding”
- Works beautifully across age groups and devices
- Sets a premium baseline for all other designs

### Technical notes
- CSS `transform` + `transform-origin` for flap hinge
- Card movement via `translateY`
- Z-index choreography is critical
- JS used only for state transitions and replay control

### Mobile interaction pattern
- **Touch target:** Entire envelope (min 280×200px)
- **Gesture:** Single tap anywhere on envelope
- **Feedback:** Immediate scale transform (95%) on touch
- **Orientation:** Works in portrait and landscape
- **Scroll behavior:** No scroll-lock required

### When to recommend this template
- Traditional or semi-traditional weddings
- Couples who want timeless elegance
- Default selection for first-time organizers

---

## 2. Layered Card Unfold (Modern + Minimal)

### Concept summary
Instead of a single card, the invitation unfolds in **stacked layers**, each revealing content progressively.

Think of it as a refined, editorial take on an invitation.

### UX criteria
- **Engagement time:** 4–6 seconds (sequential reveals)
- **Interaction clarity:** Progressive disclosure with clear affordances
- **Visual polish:** Clean, intentional pacing
- **Cognitive load:** Medium (user controls pacing)
- **Content scalability:** Excellent (handles variable content lengths)

### Interaction flow
1. Compact folded stack appears
2. User interaction triggers sequential unfolding
3. Each layer reveals a section:
   - Names
   - Date
   - Venue
   - RSVP

### Why this matters
- Ideal for minimalist aesthetics
- Feels designed, not decorative
- Excellent mobile ergonomics
- Naturally scales to different content lengths

### Technical notes
- Accordion-like behavior with softened timing
- `transform-origin` used to simulate folds
- Slight parallax offsets for depth
- No scroll dependency required

### Mobile interaction pattern
- **Touch target:** Each layer (min 44×44px tap area)
- **Gesture:** Sequential taps or single tap to unfold all
- **Feedback:** Haptic feedback on each layer reveal (if supported)
- **Orientation:** Optimized for portrait
- **Scroll behavior:** Minimal scroll-lock during transitions

### When to recommend this template
- Modern weddings
- Design-conscious couples
- Smaller, intimate ceremonies

---

## 3. Cinematic Scroll Invitation (Storytelling Mode)

### Concept summary
The invitation unfolds as the user scrolls, revealing content in a carefully choreographed narrative sequence.

This is a **story-first** invitation.

### UX criteria
- **Engagement time:** 8–12 seconds (user-paced)
- **Interaction clarity:** Natural scroll progression
- **Narrative flow:** Story-driven content reveals
- **Cognitive load:** Low (familiar scroll interaction)
- **SEO friendliness:** Excellent (crawlable content)

### Interaction flow
1. Opening title / couple names
2. Supporting quote or message
3. Date and venue reveal
4. Additional details (dress code, notes)
5. RSVP call-to-action

### Why this matters
- Feels like a short, elegant story
- Highly shareable
- SEO-friendly and indexable
- Strong emotional payoff without heavy animation

### Technical notes
- IntersectionObserver-based reveals
- No timeline libraries
- Progressive enhancement approach
- Fully functional without animation

### Mobile interaction pattern
- **Touch target:** N/A (scroll-based)
- **Gesture:** Natural vertical scroll
- **Feedback:** Content fades/slides in as user scrolls
- **Orientation:** Best in portrait; adapts to landscape
- **Scroll behavior:** Native scroll (no hijacking)

### When to recommend this template
- Destination weddings
- Couples with a strong narrative or theme
- Invitations that double as mini wedding sites

---

## 4. Time-Based Reveal (Drama Done Right)

### Concept summary
The invitation reveals itself automatically over time, like a cinematic intro — no scrolling required.

This is the most theatrical option and should feel **intentional, not flashy**.

### UX criteria
- **Engagement time:** 6–8 seconds (auto-paced)
- **Interaction clarity:** Passive viewing with skip option
- **Visual impact:** High (cinematic presentation)
- **Cognitive load:** Very low (sit back and watch)
- **Control:** Skip button always visible for user control

### Interaction flow
1. Soft ambient background appears
2. Names fade in
3. Supporting details follow in sequence
4. RSVP CTA appears last
5. User can replay or skip at any time

### Why this matters
- Creates a memorable first impression
- Ideal for high-end weddings
- Feels like a personal presentation

### Technical notes
- Deterministic CSS animation timelines
- JS used only for play / pause / replay
- Skip animation always available
- Reduced-motion users see static reveal

### Mobile interaction pattern
- **Touch target:** Skip button (min 44×44px, top-right)
- **Gesture:** Tap to skip; tap to replay after completion
- **Feedback:** Progress indicator (subtle)
- **Orientation:** Works in both; pauses on orientation change
- **Scroll behavior:** Scroll-locked during auto-play

### When to recommend this template
- Luxury weddings
- Black-tie or formal events
- Couples who want a strong emotional entrance

---

## Choosing the Right Concept (Product Guidance)

| Couple Preference            | Recommended Concept        |
|-----------------------------|----------------------------|
| Timeless & classic          | Envelope Reveal            |
| Modern & minimalist         | Layered Card Unfold        |
| Romantic & narrative        | Cinematic Scroll           |
| Dramatic & luxurious        | Time-Based Reveal          |

---

## Performance Comparison Matrix

| Concept              | JS Payload | CSS Payload | Animation Complexity | Mobile Performance | Accessibility |
|---------------------|-----------|-------------|---------------------|-------------------|---------------|
| Envelope Reveal     | ~2KB      | ~3KB        | Medium              | Excellent         | ⭐⭐⭐⭐⭐     |
| Layered Card Unfold | ~1.5KB    | ~2.5KB      | Low                 | Excellent         | ⭐⭐⭐⭐⭐     |
| Cinematic Scroll    | ~3KB      | ~2KB        | Low                 | Good              | ⭐⭐⭐⭐       |
| Time-Based Reveal   | ~2.5KB    | ~3.5KB      | High                | Good              | ⭐⭐⭐⭐       |

### Performance notes

**Envelope Reveal:**
- Moderate transform calculations
- Benefits from GPU acceleration
- Minimal repaints

**Layered Card Unfold:**
- Lightest option
- Simple transforms only
- Best for low-end devices

**Cinematic Scroll:**
- Requires IntersectionObserver polyfill for older browsers
- Performs well due to browser-native scroll
- Slightly heavier content due to multiple sections

**Time-Based Reveal:**
- Most complex animation timeline
- Requires careful frame budget management
- Skip button essential for UX

---

## Content Requirements Matrix

| Concept              | Min Content         | Max Content          | Required Fields            | Optional Fields        |
|---------------------|---------------------|---------------------|----------------------------|------------------------|
| Envelope Reveal     | Names + Date + RSVP | + Venue + 2 details | coupleNames, eventDate     | venueName, dressCode   |
| Layered Card Unfold | Names + Date + RSVP | + 4 detail sections | coupleNames, eventDate     | venue, schedule, notes |
| Cinematic Scroll    | Names + Date + RSVP | + Story + 5 sections| coupleNames, eventDate     | narrative, photos      |
| Time-Based Reveal   | Names + Date + RSVP | + Venue + 3 details | coupleNames, eventDate     | quote, venueName       |

### Content constraints (all concepts)

```typescript
interface ContentConstraints {
  coupleNames: {
    max: 60;          // Total characters including separator
    recommended: 40;  // For best visual balance
    minFontSize: 24;  // Scale down if needed
    maxLines: 2;      // Wrap if necessary
  };
  eventTitle: {
    max: 40;
    recommended: 30;
    maxLines: 1;
  };
  venueName: {
    max: 50;
    recommended: 35;
    maxLines: 2;
  };
  address: {
    max: 100;
    maxLines: 3;
    truncate: true;   // Use ellipsis
  };
  inviteeName: {
    max: 40;
    recommended: 25;
    salutation: 20;   // "Dear", "Hello", etc.
  };
  customMessage: {
    max: 200;
    recommended: 150;
    maxLines: 4;
  };
}
```

### Text overflow handling

- **Names:** Scale font-size down (min 24px) or wrap to 2 lines
- **Venue:** Truncate with ellipsis after 2 lines
- **Address:** Show first 3 lines, add "View full address" link
- **Messages:** Hard limit at 200 chars with character counter

---

## Platform Strategy Notes

- These four concepts are **the core system**, not optional extras.
- Future variations should extend these patterns, not replace them.
- All concepts must:
  - Share the same content model
  - Respect accessibility settings
  - Support personalization
  - Degrade gracefully without JS

---

## Migration Path Between Concepts

### Switching templates

Couples can switch between concepts at any time. The platform handles this through:

1. **Shared content model:** All concepts use the same data structure
2. **Preview mode:** Live preview before committing to a new concept
3. **No data loss:** Content constraints are validated upfront

### Migration rules

```typescript
const migrationRules = {
  from: {
    'envelope-reveal': {
      to: ['layered-unfold', 'time-based-reveal'],
      warnings: {
        'cinematic-scroll': 'Requires additional narrative content',
      },
    },
    'layered-unfold': {
      to: ['envelope-reveal', 'time-based-reveal', 'cinematic-scroll'],
      warnings: {},
    },
    'cinematic-scroll': {
      to: ['envelope-reveal', 'layered-unfold'],
      warnings: {
        'time-based-reveal': 'Narrative sections will be condensed',
      },
    },
    'time-based-reveal': {
      to: ['envelope-reveal', 'layered-unfold'],
      warnings: {
        'cinematic-scroll': 'Requires additional narrative content',
      },
    },
  },
};
```

### Content validation on switch

- Check if new concept supports current content length
- Warn if optional fields will be hidden
- Auto-truncate if necessary (with user confirmation)

---

## Analytics & Engagement Tracking

### Key metrics per concept

```typescript
interface InvitationAnalytics {
  conceptId: string;
  events: {
    // Core events
    pageView: number;
    interactionStart: number;    // First tap/scroll
    interactionComplete: number; // Reached RSVP
    rsvpClick: number;
    
    // Concept-specific events
    envelopeOpened?: number;
    envelopeReplayed?: number;
    layersUnfoldedCount?: number;
    scrollDepth?: number[];       // [25%, 50%, 75%, 100%]
    animationSkipped?: number;
    animationCompleted?: number;
  };
  timing: {
    timeToFirstInteraction: number; // ms
    timeToRSVP: number;            // ms
    totalEngagementTime: number;    // ms
  };
}
```

### Recommended tracking events

**Envelope Reveal:**
- `envelope_opened`
- `envelope_replayed`
- `time_to_open` (latency metric)

**Layered Card Unfold:**
- `layer_unfolded` (with layer index)
- `unfold_method` ('sequential' | 'all-at-once')

**Cinematic Scroll:**
- `scroll_depth` (25%, 50%, 75%, 100%)
- `section_viewed` (which sections reached)

**Time-Based Reveal:**
- `animation_completed`
- `animation_skipped`
- `replay_triggered`

---

## Accessibility Compliance Matrix

| Concept              | WCAG Level | Screen Reader | Keyboard Nav | Reduced Motion | Touch Targets |
|---------------------|-----------|---------------|--------------|----------------|---------------|
| Envelope Reveal     | AA        | ✅ Full       | ✅ Full      | ✅ Instant     | ✅ 280×200px  |
| Layered Card Unfold | AA        | ✅ Full       | ✅ Full      | ✅ Instant     | ✅ 44×44px    |
| Cinematic Scroll    | AA        | ✅ Full       | ✅ Full      | ✅ No animate  | N/A (scroll)  |
| Time-Based Reveal   | AA        | ✅ Full       | ✅ Full      | ✅ Static view | ✅ 44×44px    |

### Accessibility requirements (all concepts)

**Screen reader announcements:**
```html
<!-- Envelope Reveal -->
<button aria-expanded="false" aria-label="Open wedding invitation">
  <!-- Envelope visual -->
</button>

<!-- On open -->
<div role="region" aria-live="polite" aria-label="Wedding invitation details">
  <!-- Card content -->
</div>
```

**Keyboard shortcuts:**
- `Space` / `Enter`: Trigger interaction (open/unfold/play)
- `Esc`: Close or reset to initial state
- `R`: Replay animation (when supported)
- `Tab`: Navigate to RSVP button

**Focus management:**
- Focus moves to card content after envelope opens
- Focus returns to replay button after closing
- Skip link always available for time-based reveals

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .envelope,
  .card-layer,
  .scroll-reveal,
  .time-based {
    animation: none;
    transition: none;
  }
  
  /* Show final state immediately */
  .envelope { /* open state */ }
}
```

---

## Definition of Success

### Technical criteria
- Each concept feels distinct but shares core brand DNA
- Zero external animation libraries required
- Performs at 60fps on iPhone 8 / equivalent Android
- FCP < 1.2s on 3G networks
- LCP < 2.5s on 3G networks
- CLS < 0.1

### UX criteria
- Creates an emotional "moment" within first 5 seconds
- > 80% of users reach RSVP button
- < 5% skip rate (for skippable animations)
- > 90% mobile usability score
- Zero accessibility violations (WCAG AA)

### Business criteria
- RSVP conversion rate > 70%
- Share rate > 40% (social/messaging)
- Return visit rate > 30% (check status)
- Template satisfaction score > 4.5/5

---

*This document is intended to guide both design and engineering decisions as we evolve the invitation system. It should be kept in sync with the DX implementation guide and updated as new templates are added.*
