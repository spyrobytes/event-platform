"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemePicker, TypographyPicker } from "@/components/features/Invitation";
import type { ThemeId, TypographyPair } from "@/lib/invitation-themes";
import {
  CONTENT_LIMITS,
  type InvitationTemplate,
  type TextDirection,
} from "@/schemas/invitation";

type TimelineEntry = {
  date: string;
  label: string;
  description?: string;
};

type InvitationConfig = {
  id: string;
  eventId: string;
  template: InvitationTemplate;
  themeId: ThemeId;
  typographyPair: TypographyPair;
  coupleDisplayName: string | null;
  person1Name: string | null;
  person2Name: string | null;
  headerText: string | null;
  eventTypeText: string | null;
  monogram: string | null;
  customMessage: string | null;
  dressCode: string | null;
  heroImageUrl: string | null;
  couplePhotoUrl: string | null;
  venuePhotoUrl: string | null;
  receptionTime: string | null;
  receptionVenue: string | null;
  receptionAddress: string | null;
  rsvpDeadline: string | null;
  storyHeading: string | null;
  storyParagraphs: string[];
  timelineJson: TimelineEntry[] | null;
  person1Quote: string | null;
  person1QuoteAttr: string | null;
  person2Quote: string | null;
  person2QuoteAttr: string | null;
  locale: string;
  textDirection: TextDirection;
};

type EventBasic = {
  id: string;
  title: string;
};

const TEMPLATE_OPTIONS: { value: InvitationTemplate; label: string; available: boolean }[] = [
  { value: "ENVELOPE_REVEAL", label: "Envelope Reveal", available: true },
  { value: "ENVELOPE_REVEAL_V2", label: "Envelope Reveal V2", available: true },
  { value: "SPLIT_REVEAL", label: "Split Reveal", available: true },
  { value: "LAYERED_UNFOLD", label: "Layered Unfold", available: true },
  { value: "CINEMATIC_SCROLL", label: "Cinematic Scroll", available: true },
  { value: "TIME_BASED_REVEAL", label: "Time-Based Reveal", available: true },
  { value: "GOLDEN_CARD_REVEAL", label: "Golden Card Reveal", available: true },
  { value: "FLIP_FLAP_REVEAL", label: "Flip Flap Reveal", available: true },
  { value: "WEDDING_STORYBOOK", label: "Wedding Storybook (Premium)", available: true },
];

const LOCALE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "fr-FR", label: "French" },
  { value: "es-ES", label: "Spanish" },
  { value: "de-DE", label: "German" },
  { value: "ar-SA", label: "Arabic" },
  { value: "he-IL", label: "Hebrew" },
];

const TEXT_DIRECTION_OPTIONS: { value: TextDirection; label: string }[] = [
  { value: "LTR", label: "Left to Right" },
  { value: "RTL", label: "Right to Left" },
];

export default function InvitationConfigPage() {
  const params = useParams<{ id: string }>();
  const { getIdToken } = useAuthContext();

  const [event, setEvent] = useState<EventBasic | null>(null);
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [template, setTemplate] = useState<InvitationTemplate>("ENVELOPE_REVEAL");
  const [themeId, setThemeId] = useState<ThemeId>("ivory");
  const [typographyPair, setTypographyPair] = useState<TypographyPair>("classic");
  const [coupleDisplayName, setCoupleDisplayName] = useState("");
  const [person1Name, setPerson1Name] = useState("");
  const [person2Name, setPerson2Name] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [eventTypeText, setEventTypeText] = useState("");
  const [monogram, setMonogram] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [locale, setLocale] = useState("en-US");
  const [textDirection, setTextDirection] = useState<TextDirection>("LTR");
  // Wedding Storybook fields
  const [couplePhotoUrl, setCouplePhotoUrl] = useState("");
  const [venuePhotoUrl, setVenuePhotoUrl] = useState("");
  const [receptionTime, setReceptionTime] = useState("");
  const [receptionVenue, setReceptionVenue] = useState("");
  const [receptionAddress, setReceptionAddress] = useState("");
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [storyHeading, setStoryHeading] = useState("");
  const [storyParagraphs, setStoryParagraphs] = useState<string[]>([""]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([{ date: "", label: "", description: "" }]);
  const [person1Quote, setPerson1Quote] = useState("");
  const [person1QuoteAttr, setPerson1QuoteAttr] = useState("");
  const [person2Quote, setPerson2Quote] = useState("");
  const [person2QuoteAttr, setPerson2QuoteAttr] = useState("");

  // Track if form has been modified
  const [isDirty, setIsDirty] = useState(false);

  // Fetch event and config
  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        // Fetch event details
        const eventResponse = await fetch(`/api/events/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!eventResponse.ok) {
          if (eventResponse.status === 404) {
            throw new Error("Event not found");
          }
          throw new Error("Failed to fetch event");
        }

        const eventData = await eventResponse.json();
        setEvent({ id: eventData.data.id, title: eventData.data.title });

        // Fetch invitation config
        const configResponse = await fetch(
          `/api/events/${params.id}/invitation-config`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.data) {
            setConfig(configData.data);
            // Populate form
            setTemplate(configData.data.template);
            setThemeId(configData.data.themeId);
            setTypographyPair(configData.data.typographyPair);
            setCoupleDisplayName(configData.data.coupleDisplayName || "");
            setPerson1Name(configData.data.person1Name || "");
            setPerson2Name(configData.data.person2Name || "");
            setHeaderText(configData.data.headerText || "");
            setEventTypeText(configData.data.eventTypeText || "");
            setMonogram(configData.data.monogram || "");
            setCustomMessage(configData.data.customMessage || "");
            setDressCode(configData.data.dressCode || "");
            setHeroImageUrl(configData.data.heroImageUrl || "");
            setLocale(configData.data.locale);
            setTextDirection(configData.data.textDirection);
            // Wedding Storybook fields
            setCouplePhotoUrl(configData.data.couplePhotoUrl || "");
            setVenuePhotoUrl(configData.data.venuePhotoUrl || "");
            setReceptionTime(configData.data.receptionTime || "");
            setReceptionVenue(configData.data.receptionVenue || "");
            setReceptionAddress(configData.data.receptionAddress || "");
            setRsvpDeadline(configData.data.rsvpDeadline || "");
            setStoryHeading(configData.data.storyHeading || "");
            setStoryParagraphs(configData.data.storyParagraphs?.length ? configData.data.storyParagraphs : [""]);
            setTimelineEntries(configData.data.timelineJson?.length ? configData.data.timelineJson : [{ date: "", label: "", description: "" }]);
            setPerson1Quote(configData.data.person1Quote || "");
            setPerson1QuoteAttr(configData.data.person1QuoteAttr || "");
            setPerson2Quote(configData.data.person2Quote || "");
            setPerson2QuoteAttr(configData.data.person2QuoteAttr || "");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id, getIdToken]);

  // Mark form as dirty when any value changes
  const handleFieldChange = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
      (value: T) => {
        setter(value);
        setIsDirty(true);
        setSuccessMessage(null);
      },
    []
  );

  // Save configuration
  const handleSave = async () => {
    if (saving) return;

    // Validate required fields for WEDDING_STORYBOOK
    if (template === "WEDDING_STORYBOOK") {
      if (!couplePhotoUrl.trim()) {
        setError("Couple Photo URL is required for the Wedding Storybook template");
        return;
      }
      if (!venuePhotoUrl.trim()) {
        setError("Venue Photo URL is required for the Wedding Storybook template");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${params.id}/invitation-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          template,
          themeId,
          typographyPair,
          coupleDisplayName: coupleDisplayName || undefined,
          person1Name: person1Name || undefined,
          person2Name: person2Name || undefined,
          headerText: headerText || undefined,
          eventTypeText: eventTypeText || undefined,
          monogram: monogram || undefined,
          customMessage: customMessage || undefined,
          dressCode: dressCode || undefined,
          heroImageUrl: heroImageUrl || undefined,
          // Wedding Storybook fields
          couplePhotoUrl: couplePhotoUrl || undefined,
          venuePhotoUrl: venuePhotoUrl || undefined,
          receptionTime: receptionTime || undefined,
          receptionVenue: receptionVenue || undefined,
          receptionAddress: receptionAddress || undefined,
          rsvpDeadline: rsvpDeadline || undefined,
          storyHeading: storyHeading || undefined,
          storyParagraphs: storyParagraphs.filter((p) => p.trim()) || undefined,
          timelineJson: timelineEntries.filter((e) => e.label.trim()) || undefined,
          person1Quote: person1Quote || undefined,
          person1QuoteAttr: person1QuoteAttr || undefined,
          person2Quote: person2Quote || undefined,
          person2QuoteAttr: person2QuoteAttr || undefined,
          locale,
          textDirection,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save configuration");
      }

      const result = await response.json();
      setConfig(result.data);
      setIsDirty(false);
      setSuccessMessage("Configuration saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Delete configuration
  const handleDelete = async () => {
    if (deleting || !config) return;

    if (
      !confirm(
        "Are you sure you want to disable elegant invitations? Guests will see the legacy RSVP form instead."
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/events/${params.id}/invitation-config`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete configuration");
      }

      // Reset to defaults
      setConfig(null);
      setTemplate("ENVELOPE_REVEAL");
      setThemeId("ivory");
      setTypographyPair("classic");
      setCoupleDisplayName("");
      setPerson1Name("");
      setPerson2Name("");
      setHeaderText("");
      setEventTypeText("");
      setMonogram("");
      setCustomMessage("");
      setDressCode("");
      setHeroImageUrl("");
      setLocale("en-US");
      setTextDirection("LTR");
      setCouplePhotoUrl("");
      setVenuePhotoUrl("");
      setReceptionTime("");
      setReceptionVenue("");
      setReceptionAddress("");
      setRsvpDeadline("");
      setStoryHeading("");
      setStoryParagraphs([""]);
      setTimelineEntries([{ date: "", label: "", description: "" }]);
      setPerson1Quote("");
      setPerson1QuoteAttr("");
      setPerson2Quote("");
      setPerson2QuoteAttr("");
      setIsDirty(false);
      setSuccessMessage("Elegant invitations disabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="space-y-4">
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <Link href="/dashboard/events">
          <Button variant="outline">Back to Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Invitation Design</h1>
          <p className="text-muted-foreground">
            Configure the elegant invitation for{" "}
            <span className="font-medium text-foreground">{event?.title}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config && (
            <Link href={`/invite/preview/${params.id}`} target="_blank">
              <Button variant="outline">Preview</Button>
            </Link>
          )}
          <Link href={`/dashboard/events/${params.id}`}>
            <Button variant="outline">Back to Event</Button>
          </Link>
        </div>
      </div>

      {/* Success/Error messages */}
      {successMessage && (
        <div className="rounded-lg border border-success/50 bg-success/10 p-4">
          <p className="text-sm text-success">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Configuration form */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="template">Animation Style</Label>
              <Select
                id="template"
                value={template}
                onChange={(e) =>
                  handleFieldChange(setTemplate)(e.target.value as InvitationTemplate)
                }
              >
                {TEMPLATE_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={!opt.available}
                  >
                    {opt.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how the invitation reveals itself to guests
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Couple Names */}
        <Card>
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="coupleDisplayName">
                Couple Names{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="coupleDisplayName"
                value={coupleDisplayName}
                onChange={(e) =>
                  handleFieldChange(setCoupleDisplayName)(e.target.value)
                }
                placeholder="Sarah & James"
                maxLength={CONTENT_LIMITS.coupleDisplayName.max}
              />
              <p className="text-xs text-muted-foreground">
                {coupleDisplayName.length}/{CONTENT_LIMITS.coupleDisplayName.max}{" "}
                characters. Defaults to event title if not set.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invitation Wording - Shows for templates that support custom wording */}
        {(template === "SPLIT_REVEAL" || template === "GOLDEN_CARD_REVEAL" || template === "FLIP_FLAP_REVEAL" || template === "WEDDING_STORYBOOK") && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Invitation Wording</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="person1Name">
                    First Person Name{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="person1Name"
                    value={person1Name}
                    onChange={(e) =>
                      handleFieldChange(setPerson1Name)(e.target.value)
                    }
                    placeholder="Emma Rose Williams"
                    maxLength={CONTENT_LIMITS.personName.max}
                  />
                  <p className="text-xs text-muted-foreground">
                    {person1Name.length}/{CONTENT_LIMITS.personName.max} characters
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="person2Name">
                    Second Person Name{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="person2Name"
                    value={person2Name}
                    onChange={(e) =>
                      handleFieldChange(setPerson2Name)(e.target.value)
                    }
                    placeholder="James Oliver Smith"
                    maxLength={CONTENT_LIMITS.personName.max}
                  />
                  <p className="text-xs text-muted-foreground">
                    {person2Name.length}/{CONTENT_LIMITS.personName.max} characters
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="headerText">
                    Header Text{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="headerText"
                    value={headerText}
                    onChange={(e) =>
                      handleFieldChange(setHeaderText)(e.target.value)
                    }
                    placeholder="Together with their families"
                    maxLength={CONTENT_LIMITS.headerText.max}
                  />
                  <p className="text-xs text-muted-foreground">
                    {headerText.length}/{CONTENT_LIMITS.headerText.max} characters.
                    Appears above couple names.
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="eventTypeText">
                    Event Type Text{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="eventTypeText"
                    value={eventTypeText}
                    onChange={(e) =>
                      handleFieldChange(setEventTypeText)(e.target.value)
                    }
                    placeholder="Request the pleasure of your company"
                    maxLength={CONTENT_LIMITS.eventTypeText.max}
                  />
                  <p className="text-xs text-muted-foreground">
                    {eventTypeText.length}/{CONTENT_LIMITS.eventTypeText.max} characters.
                    Appears below couple names.
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="monogram">
                    Monogram{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="monogram"
                    value={monogram}
                    onChange={(e) =>
                      handleFieldChange(setMonogram)(e.target.value)
                    }
                    placeholder="E&J"
                    maxLength={CONTENT_LIMITS.monogram.max}
                  />
                  <p className="text-xs text-muted-foreground">
                    {monogram.length}/{CONTENT_LIMITS.monogram.max} characters.
                    Auto-generated from names if empty.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Theme Picker */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Color Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemePicker
              value={themeId}
              onChange={handleFieldChange(setThemeId)}
            />
          </CardContent>
        </Card>

        {/* Typography Picker */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Typography</CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyPicker
              value={typographyPair}
              onChange={handleFieldChange(setTypographyPair)}
            />
          </CardContent>
        </Card>

        {/* Custom Message / Our Story */}
        <Card>
          <CardHeader>
            <CardTitle>
              {template === "WEDDING_STORYBOOK" ? "Our Story" : "Custom Message"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="customMessage">
                {template === "WEDDING_STORYBOOK" ? (
                  <>How You Met <span className="text-destructive">*</span></>
                ) : (
                  <>Personal Note <span className="text-muted-foreground">(optional)</span></>
                )}
              </Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) =>
                  handleFieldChange(setCustomMessage)(e.target.value)
                }
                placeholder={
                  template === "WEDDING_STORYBOOK"
                    ? "Share your love story in 1-3 sentences. How did you meet? What makes your relationship special?"
                    : "We can't wait to celebrate with you..."
                }
                maxLength={CONTENT_LIMITS.customMessage.max}
                rows={4}
                required={template === "WEDDING_STORYBOOK"}
              />
              <p className="text-xs text-muted-foreground">
                {customMessage.length}/{CONTENT_LIMITS.customMessage.max} characters
                {template === "WEDDING_STORYBOOK" && (
                  <span className="text-destructive ml-1">
                    {!customMessage.trim() && " — Required for Wedding Storybook"}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Wedding Storybook: Photos */}
        {template === "WEDDING_STORYBOOK" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="couplePhotoUrl">
                    Couple Photo URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="couplePhotoUrl"
                    type="url"
                    value={couplePhotoUrl}
                    onChange={(e) => handleFieldChange(setCouplePhotoUrl)(e.target.value)}
                    placeholder="https://example.com/couple-photo.jpg"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Circular photo on the book cover
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="venuePhotoUrl">
                    Venue Photo URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="venuePhotoUrl"
                    type="url"
                    value={venuePhotoUrl}
                    onChange={(e) => handleFieldChange(setVenuePhotoUrl)(e.target.value)}
                    placeholder="https://example.com/venue-photo.jpg"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Background photo on the details spread
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wedding Storybook: Reception Details */}
        {template === "WEDDING_STORYBOOK" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Reception Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <Label htmlFor="receptionTime">Reception Time</Label>
                  <Input
                    id="receptionTime"
                    value={receptionTime}
                    onChange={(e) => handleFieldChange(setReceptionTime)(e.target.value)}
                    placeholder="Six O'Clock in the Evening"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="receptionVenue">Reception Venue</Label>
                  <Input
                    id="receptionVenue"
                    value={receptionVenue}
                    onChange={(e) => handleFieldChange(setReceptionVenue)(e.target.value)}
                    placeholder="The Glasshouse at Royal Botanic"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="receptionAddress">Reception Address</Label>
                  <Input
                    id="receptionAddress"
                    value={receptionAddress}
                    onChange={(e) => handleFieldChange(setReceptionAddress)(e.target.value)}
                    placeholder="20A Inverleith Row, Edinburgh"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <Label htmlFor="rsvpDeadline">RSVP Deadline</Label>
                <Input
                  id="rsvpDeadline"
                  value={rsvpDeadline}
                  onChange={(e) => handleFieldChange(setRsvpDeadline)(e.target.value)}
                  placeholder="the First of May, 2026"
                />
                <p className="text-xs text-muted-foreground">
                  Displayed on the RSVP spread
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wedding Storybook: Story Section */}
        {template === "WEDDING_STORYBOOK" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Our Story</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="storyHeading">Story Heading</Label>
                  <Input
                    id="storyHeading"
                    value={storyHeading}
                    onChange={(e) => handleFieldChange(setStoryHeading)(e.target.value)}
                    placeholder="How We Met"
                    maxLength={CONTENT_LIMITS.storyHeading.max}
                  />
                  <p className="text-xs text-muted-foreground">
                    {storyHeading.length}/{CONTENT_LIMITS.storyHeading.max} characters
                  </p>
                </div>
                {storyParagraphs.map((p, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Paragraph {i + 1}</Label>
                      {storyParagraphs.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleFieldChange(setStoryParagraphs)(
                              storyParagraphs.filter((_, idx) => idx !== i)
                            );
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={p}
                      onChange={(e) => {
                        const updated = [...storyParagraphs];
                        updated[i] = e.target.value;
                        handleFieldChange(setStoryParagraphs)(updated);
                      }}
                      placeholder="Share a part of your love story..."
                      maxLength={CONTENT_LIMITS.storyParagraph.max}
                      rows={3}
                    />
                  </div>
                ))}
                {storyParagraphs.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleFieldChange(setStoryParagraphs)([...storyParagraphs, ""])}
                  >
                    + Add Paragraph
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wedding Storybook: Timeline */}
        {template === "WEDDING_STORYBOOK" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Timeline Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineEntries.map((entry, i) => (
                  <div key={i} className="grid gap-3 md:grid-cols-3 items-start border-b border-border pb-4 last:border-0">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        value={entry.date}
                        onChange={(e) => {
                          const updated = [...timelineEntries];
                          updated[i] = { ...updated[i], date: e.target.value };
                          handleFieldChange(setTimelineEntries)(updated);
                        }}
                        placeholder="June 2021"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={entry.label}
                        onChange={(e) => {
                          const updated = [...timelineEntries];
                          updated[i] = { ...updated[i], label: e.target.value };
                          handleFieldChange(setTimelineEntries)(updated);
                        }}
                        placeholder="First Date"
                        maxLength={CONTENT_LIMITS.timelineEventLabel.max}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Description</Label>
                        {timelineEntries.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleFieldChange(setTimelineEntries)(
                                timelineEntries.filter((_, idx) => idx !== i)
                              );
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <Input
                        value={entry.description || ""}
                        onChange={(e) => {
                          const updated = [...timelineEntries];
                          updated[i] = { ...updated[i], description: e.target.value };
                          handleFieldChange(setTimelineEntries)(updated);
                        }}
                        placeholder="A brief description..."
                        maxLength={CONTENT_LIMITS.timelineEventDescription.max}
                      />
                    </div>
                  </div>
                ))}
                {timelineEntries.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFieldChange(setTimelineEntries)([
                        ...timelineEntries,
                        { date: "", label: "", description: "" },
                      ])
                    }
                  >
                    + Add Timeline Event
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wedding Storybook: Quotes */}
        {template === "WEDDING_STORYBOOK" && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="person1Quote">Person 1 Quote</Label>
                  <Textarea
                    id="person1Quote"
                    value={person1Quote}
                    onChange={(e) => handleFieldChange(setPerson1Quote)(e.target.value)}
                    placeholder="A meaningful quote about your love..."
                    maxLength={CONTENT_LIMITS.quote.max}
                    rows={3}
                  />
                  <Input
                    value={person1QuoteAttr}
                    onChange={(e) => handleFieldChange(setPerson1QuoteAttr)(e.target.value)}
                    placeholder="Attribution (e.g., Emma)"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="person2Quote">Person 2 Quote</Label>
                  <Textarea
                    id="person2Quote"
                    value={person2Quote}
                    onChange={(e) => handleFieldChange(setPerson2Quote)(e.target.value)}
                    placeholder="A meaningful quote about your love..."
                    maxLength={CONTENT_LIMITS.quote.max}
                    rows={3}
                  />
                  <Input
                    value={person2QuoteAttr}
                    onChange={(e) => handleFieldChange(setPerson2QuoteAttr)(e.target.value)}
                    placeholder="Attribution (e.g., James)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dress Code */}
        <Card>
          <CardHeader>
            <CardTitle>Dress Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="dressCode">
                Attire <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="dressCode"
                value={dressCode}
                onChange={(e) => handleFieldChange(setDressCode)(e.target.value)}
                placeholder="Black Tie Optional"
                maxLength={CONTENT_LIMITS.dressCode.max}
              />
              <p className="text-xs text-muted-foreground">
                {dressCode.length}/{CONTENT_LIMITS.dressCode.max} characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hero Image */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="heroImageUrl">
                Image URL <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="heroImageUrl"
                type="url"
                value={heroImageUrl}
                onChange={(e) => handleFieldChange(setHeroImageUrl)(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
              />
              <p className="text-xs text-muted-foreground">
                A photo to display on the invitation card
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Locale & Direction */}
        <Card>
          <CardHeader>
            <CardTitle>Language Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="locale">Date/Time Format</Label>
              <Select
                id="locale"
                value={locale}
                onChange={(e) => handleFieldChange(setLocale)(e.target.value)}
              >
                {LOCALE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-3">
              <Label htmlFor="textDirection">Text Direction</Label>
              <Select
                id="textDirection"
                value={textDirection}
                onChange={(e) =>
                  handleFieldChange(setTextDirection)(e.target.value as TextDirection)
                }
              >
                {TEXT_DIRECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <div>
          {config && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              isLoading={deleting}
            >
              Disable Elegant Invitations
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
          )}
          <Button onClick={handleSave} disabled={saving} isLoading={saving}>
            {config ? "Save Changes" : "Enable Elegant Invitations"}
          </Button>
        </div>
      </div>
    </div>
  );
}
