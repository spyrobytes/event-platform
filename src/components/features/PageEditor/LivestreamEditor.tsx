"use client";

import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { parseStreamUrl } from "@/lib/livestream/parse-stream-url";
import { fromDatetimeLocalInTz, toDatetimeLocalInTz } from "@/lib/datetime";
import type {
  LivestreamSection,
  LivestreamProvider,
  StreamReference,
} from "@/schemas/event-page";

type LivestreamEditorProps = {
  data: LivestreamSection["data"];
  onChange: (data: LivestreamSection["data"]) => void;
  // Event timezone for converting the ISO startAt/endAt to/from
  // <input type="datetime-local">. Fallback to UTC if missing.
  timezone: string;
};

const PROVIDER_LABELS: Record<LivestreamProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  facebook: "Facebook",
};

// Provider-specific guidance shown under the URL input once a provider is
// detected from the pasted URL. Keep terse — full event-day checklist
// belongs in operator docs, not in the editor surface.
const PROVIDER_HINTS: Record<LivestreamProvider, string> = {
  youtube:
    "Tip: for private weddings, set the YouTube stream to Unlisted so only people with the link can watch.",
  vimeo:
    "Tip: for private events, use a Vimeo unlisted link (the URL includes a hash like /123456/abc123). The renderer preserves it.",
  facebook:
    "Best effort: Facebook embeds require both the video AND its source page to be public. Live streams sometimes refuse to embed even with a valid URL. Test on a real device before event day, and confirm the fallback link works.",
};

export function LivestreamEditor({ data, onChange, timezone }: LivestreamEditorProps) {
  const tz = timezone || "UTC";

  // Local state for the URL inputs so the user sees their raw paste during
  // typing; the parsed reference only commits to `data` once parsing succeeds.
  // On mount we seed from the saved canonical sourceUrl.
  const [primaryUrl, setPrimaryUrl] = useState<string>(data.primary?.sourceUrl ?? "");
  const [replayUrl, setReplayUrl] = useState<string>(data.replay?.sourceUrl ?? "");

  const primaryResult = useMemo(
    () => (primaryUrl.trim() ? parseStreamUrl(primaryUrl) : null),
    [primaryUrl]
  );
  const replayResult = useMemo(
    () => (replayUrl.trim() ? parseStreamUrl(replayUrl) : null),
    [replayUrl]
  );

  const commitPrimary = useCallback(
    (raw: string) => {
      setPrimaryUrl(raw);
      const result = parseStreamUrl(raw);
      if (result.ok) {
        const ref: StreamReference = {
          provider: result.stream.provider,
          sourceUrl: result.stream.sourceUrl,
          videoId: result.stream.videoId,
          ...(result.stream.vimeoHash ? { vimeoHash: result.stream.vimeoHash } : {}),
        };
        onChange({ ...data, primary: ref });
      }
      // On failure we leave the previously-saved `data.primary` intact —
      // the user is mid-edit; we only overwrite when we have a valid value.
    },
    [data, onChange]
  );

  const commitReplay = useCallback(
    (raw: string) => {
      setReplayUrl(raw);
      const trimmed = raw.trim();
      if (!trimmed) {
        // Clearing the field removes the replay reference entirely.
        const { replay: _replay, ...rest } = data;
        void _replay;
        onChange(rest as LivestreamSection["data"]);
        return;
      }
      const result = parseStreamUrl(raw);
      if (result.ok) {
        const ref: StreamReference = {
          provider: result.stream.provider,
          sourceUrl: result.stream.sourceUrl,
          videoId: result.stream.videoId,
          ...(result.stream.vimeoHash ? { vimeoHash: result.stream.vimeoHash } : {}),
        };
        onChange({ ...data, replay: ref });
      }
    },
    [data, onChange]
  );

  const setStartAt = useCallback(
    (wallClock: string) => {
      if (!wallClock) {
        const { startAt: _startAt, ...rest } = data;
        void _startAt;
        onChange(rest as LivestreamSection["data"]);
        return;
      }
      const utc = fromDatetimeLocalInTz(wallClock, tz);
      if (utc) onChange({ ...data, startAt: utc.toISOString() });
    },
    [data, onChange, tz]
  );

  const setEndAt = useCallback(
    (wallClock: string) => {
      if (!wallClock) {
        const { endAt: _endAt, ...rest } = data;
        void _endAt;
        onChange(rest as LivestreamSection["data"]);
        return;
      }
      const utc = fromDatetimeLocalInTz(wallClock, tz);
      if (utc) onChange({ ...data, endAt: utc.toISOString() });
    },
    [data, onChange, tz]
  );

  const primaryProvider = primaryResult?.ok ? primaryResult.stream.provider : null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="livestream-heading">Section Heading</Label>
        <Input
          id="livestream-heading"
          value={data.heading || "Live Stream"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="Live Stream"
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="livestream-description">Description (optional)</Label>
        <Textarea
          id="livestream-description"
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Ceremony will broadcast live. Tap the button to watch."
          maxLength={300}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="livestream-primary">Stream URL *</Label>
        <Input
          id="livestream-primary"
          type="url"
          value={primaryUrl}
          onChange={(e) => commitPrimary(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          aria-invalid={primaryResult?.ok === false ? true : undefined}
        />
        <UrlFeedback result={primaryResult} />
        {primaryProvider && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {PROVIDER_HINTS[primaryProvider]}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="livestream-start">Stream Start (event time)</Label>
          <Input
            id="livestream-start"
            type="datetime-local"
            value={toDatetimeLocalInTz(data.startAt ?? null, tz)}
            onChange={(e) => setStartAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Times use the event timezone ({tz}).</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="livestream-end">Stream End (event time, optional)</Label>
          <Input
            id="livestream-end"
            type="datetime-local"
            value={toDatetimeLocalInTz(data.endAt ?? null, tz)}
            onChange={(e) => setEndAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            When set, viewers see &quot;ended&quot; (or the replay) afterwards.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="livestream-replay">Replay URL (optional)</Label>
        <Input
          id="livestream-replay"
          type="url"
          value={replayUrl}
          onChange={(e) => commitReplay(e.target.value)}
          placeholder="Same as stream URL, or paste a different replay link"
          aria-invalid={replayResult?.ok === false ? true : undefined}
        />
        <UrlFeedback result={replayResult} />
        <p className="text-xs text-muted-foreground">
          Shown after the stream end time passes. Leave blank to show the
          &quot;livestream ended&quot; message only.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="livestream-fallback">Fallback Message (optional)</Label>
        <Textarea
          id="livestream-fallback"
          value={data.fallbackMessage || ""}
          onChange={(e) => onChange({ ...data, fallbackMessage: e.target.value })}
          placeholder="If the player doesn't load, tap 'Open stream directly' below."
          maxLength={300}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="livestream-cta">CTA Label on Main Page</Label>
        <Input
          id="livestream-cta"
          value={data.ctaLabel || "Watch live"}
          onChange={(e) => onChange({ ...data, ctaLabel: e.target.value })}
          placeholder="Watch live"
          maxLength={40}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-4">
        <ToggleRow
          id="livestream-show-countdown"
          label="Show countdown before stream starts"
          checked={data.showCountdown !== false}
          onChange={(checked) => onChange({ ...data, showCountdown: checked })}
        />
      </div>
    </div>
  );
}

function UrlFeedback({
  result,
}: {
  result: ReturnType<typeof parseStreamUrl> | null;
}) {
  if (!result) return null;
  if (result.ok) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400">
        Detected: {PROVIDER_LABELS[result.stream.provider]}
        {result.stream.vimeoHash ? " (private/unlisted hash preserved)" : ""}
      </p>
    );
  }
  return (
    <p className="text-xs text-destructive">{result.error.message}</p>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="flex-1 space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer text-sm">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
