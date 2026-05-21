"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateSelector, getDefaultTemplateId } from "@/components/features";
import { CoverImagePicker } from "@/components/features/CoverImagePicker";
import { createEventSchema, type CreateEventInput, type TemplateId } from "@/schemas/event";
import { fromDatetimeLocalInTz, toDatetimeLocalInTz } from "@/lib/datetime";

type EventFormMode = "create" | "edit";

type EventFormProps = {
  mode: EventFormMode;
  defaultValues?: Partial<CreateEventInput>;
  onSubmit: (data: CreateEventInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  /** Event ID — required to enable cover image upload / library in edit mode. */
  eventId?: string;
  /** Firebase ID token getter — required to enable cover image upload / library. */
  getIdToken?: () => Promise<string | null>;
};

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public - Anyone can see and join" },
  { value: "UNLISTED", label: "Unlisted - Only people with link can see" },
  { value: "PRIVATE", label: "Private - Invite only" },
] as const;

// Curated IANA timezone list. Grouped by region for `<optgroup>` rendering.
// Add zones here as new markets onboard — fully exhaustive coverage (all ~430
// IANA zones via `Intl.supportedValuesOf`) is deferred until a typeahead UI
// replaces the basic <select>.
const TIMEZONE_GROUPS = [
  {
    label: "UTC",
    zones: [{ value: "UTC", label: "UTC" }],
  },
  {
    label: "Americas",
    zones: [
      { value: "America/New_York", label: "New York (ET)" },
      { value: "America/Chicago", label: "Chicago (CT)" },
      { value: "America/Denver", label: "Denver (MT)" },
      { value: "America/Phoenix", label: "Phoenix (MST, no DST)" },
      { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
      { value: "America/Anchorage", label: "Anchorage (AKT)" },
      { value: "Pacific/Honolulu", label: "Honolulu (HST)" },
      { value: "America/Toronto", label: "Toronto (ET)" },
      { value: "America/Vancouver", label: "Vancouver (PT)" },
      { value: "America/Mexico_City", label: "Mexico City (CT, Mexico)" },
      { value: "America/Bogota", label: "Bogotá (COT)" },
      { value: "America/Lima", label: "Lima (PET)" },
      { value: "America/Santiago", label: "Santiago (Chile)" },
      { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
      { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART)" },
    ],
  },
  {
    label: "Europe",
    zones: [
      { value: "Europe/London", label: "London (GMT/BST)" },
      { value: "Europe/Dublin", label: "Dublin (GMT/IST)" },
      { value: "Europe/Lisbon", label: "Lisbon (WET/WEST)" },
      { value: "Europe/Paris", label: "Paris (CET/CEST)" },
      { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
      { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
      { value: "Europe/Rome", label: "Rome (CET/CEST)" },
      { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
      { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)" },
      { value: "Europe/Athens", label: "Athens (EET/EEST)" },
      { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
      { value: "Europe/Moscow", label: "Moscow (MSK)" },
    ],
  },
  {
    label: "Africa",
    zones: [
      { value: "Africa/Casablanca", label: "Casablanca (WET)" },
      { value: "Africa/Lagos", label: "Lagos (WAT)" },
      { value: "Africa/Accra", label: "Accra (GMT)" },
      { value: "Africa/Cairo", label: "Cairo (EET)" },
      { value: "Africa/Nairobi", label: "Nairobi (EAT)" },
      { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
    ],
  },
  {
    label: "Middle East",
    zones: [
      { value: "Asia/Beirut", label: "Beirut (EET/EEST)" },
      { value: "Asia/Jerusalem", label: "Jerusalem (Israel)" },
      { value: "Asia/Riyadh", label: "Riyadh (AST)" },
      { value: "Asia/Dubai", label: "Dubai (GST)" },
      { value: "Asia/Tehran", label: "Tehran (IRST)" },
    ],
  },
  {
    label: "South & Southeast Asia",
    zones: [
      { value: "Asia/Karachi", label: "Karachi (PKT)" },
      { value: "Asia/Kolkata", label: "Kolkata (India)" },
      { value: "Asia/Dhaka", label: "Dhaka (Bangladesh)" },
      { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
      { value: "Asia/Jakarta", label: "Jakarta (WIB)" },
      { value: "Asia/Singapore", label: "Singapore (SGT)" },
      { value: "Asia/Manila", label: "Manila (PHT)" },
    ],
  },
  {
    label: "East Asia",
    zones: [
      { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
      { value: "Asia/Shanghai", label: "Shanghai (China)" },
      { value: "Asia/Taipei", label: "Taipei (Taiwan)" },
      { value: "Asia/Seoul", label: "Seoul (KST)" },
      { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    ],
  },
  {
    label: "Pacific",
    zones: [
      { value: "Australia/Perth", label: "Perth (AWST)" },
      { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)" },
      { value: "Australia/Brisbane", label: "Brisbane (AEST, no DST)" },
      { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
      { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
      { value: "Pacific/Fiji", label: "Fiji (FJT)" },
    ],
  },
] as const;

// Flat lookup so the dropdown can render a fallback option for events whose
// stored timezone isn't (or no longer is) in the curated list — without it,
// the <select> would auto-select the first option (UTC) and silently
// overwrite the organizer's choice on save.
const KNOWN_TIMEZONES = new Set<string>(
  TIMEZONE_GROUPS.flatMap((g) => g.zones.map((z) => z.value))
);

export function EventForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  eventId,
  getIdToken,
}: EventFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema) as never,
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      timezone: defaultValues?.timezone ?? "UTC",
      visibility: defaultValues?.visibility ?? "PUBLIC",
      venueName: defaultValues?.venueName ?? "",
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      country: defaultValues?.country ?? "",
      maxAttendees: defaultValues?.maxAttendees,
      coverImageUrl: defaultValues?.coverImageUrl ?? "",
      // Seeded only in create mode — TemplateSelector (the only UI for this
      // field) renders only when mode === "create". In edit mode the template
      // is owned by the page editor; seeding a default here would let it
      // leak into the PATCH body and overwrite the organizer's choice.
      templateId:
        mode === "create"
          ? defaultValues?.templateId ?? getDefaultTemplateId()
          : undefined,
      reminderDays: defaultValues?.reminderDays,
      reminderEnabled: defaultValues?.reminderEnabled ?? false,
      attachQrToConfirmation: defaultValues?.attachQrToConfirmation ?? true,
      passBackdropStyle: defaultValues?.passBackdropStyle ?? "NONE",
      passBackdropImageUrl: defaultValues?.passBackdropImageUrl ?? "",
      // Date fields render in `<input type="datetime-local">` as wall-clock
      // strings interpreted in the event's timezone. The empty default and
      // the cast match RHF's expected shape; setValueAs (below) keeps the
      // form-state value as a string for isDirty stability, then
      // handleFormSubmit converts it to a UTC Date using the form's
      // current `timezone` field.
      startAt: toDatetimeLocalInTz(
        defaultValues?.startAt,
        defaultValues?.timezone ?? "UTC"
      ) as unknown as Date,
      endAt: toDatetimeLocalInTz(
        defaultValues?.endAt,
        defaultValues?.timezone ?? "UTC"
      ) as unknown as Date,
      rsvpDeadline: toDatetimeLocalInTz(
        defaultValues?.rsvpDeadline,
        defaultValues?.timezone ?? "UTC"
      ) as unknown as Date,
    },
  });

  // String form state keeps datetime-local inputs and isDirty stable.
  // Empty -> undefined so cleared optional fields don't fail z.coerce.date().
  const dateFieldOptions = {
    setValueAs: (v: unknown): string | undefined => {
      if (typeof v !== "string" || v === "") return undefined;
      return v;
    },
  };

  const visibility = watch("visibility");
  const timezone = watch("timezone");
  const templateId = watch("templateId");
  const reminderEnabled = watch("reminderEnabled");
  const coverImageUrl = watch("coverImageUrl");
  const passBackdropImageUrl = watch("passBackdropImageUrl");

  const handleFormSubmit: SubmitHandler<CreateEventInput> = async (data) => {
    try {
      // zod's coerce.date() validates against the browser's tz; its output
      // is discarded here. We re-interpret the raw form-state wall-clock
      // strings in the event's timezone so what the organizer typed is
      // what lands in DB. getValues() returns the pre-coerce string state.
      const raw = getValues() as unknown as {
        startAt?: string;
        endAt?: string;
        rsvpDeadline?: string;
      };
      const tz = (data.timezone as string) || "UTC";
      const startAtUtc = fromDatetimeLocalInTz(raw.startAt, tz);
      const endAtUtc = fromDatetimeLocalInTz(raw.endAt, tz);
      const rsvpDeadlineUtc = fromDatetimeLocalInTz(raw.rsvpDeadline, tz);

      await onSubmit({
        ...data,
        startAt: startAtUtc as Date,
        endAt: endAtUtc ?? undefined,
        rsvpDeadline: rsvpDeadlineUtc ?? undefined,
      });
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Template Selection - only show on create */}
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Template</CardTitle>
            <CardDescription>
              Select a visual style for your event page. You can customize it later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateSelector
              value={templateId || null}
              onChange={(id) => setValue("templateId", id as TemplateId)}
              disabled={isLoading}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Set the title, description, and visibility for your event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              placeholder="Enter event title"
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your event..."
              rows={5}
              {...register("description")}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              id="visibility"
              value={visibility}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue("visibility", e.target.value as CreateEventInput["visibility"], {
                  shouldDirty: true,
                })
              }
              aria-invalid={!!errors.visibility}
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {errors.visibility && (
              <p className="text-sm text-destructive">{errors.visibility.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cover Image</Label>
            <CoverImagePicker
              eventId={eventId}
              value={coverImageUrl ?? ""}
              onChange={(url) =>
                setValue("coverImageUrl", url, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              getIdToken={getIdToken}
              disabled={isLoading}
            />
            {errors.coverImageUrl && (
              <p className="text-sm text-destructive">{errors.coverImageUrl.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
          <CardDescription>
            When will your event take place?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startAt">Start Date & Time *</Label>
              <Input
                id="startAt"
                type="datetime-local"
                {...register("startAt", dateFieldOptions)}
                aria-invalid={!!errors.startAt}
              />
              {errors.startAt && (
                <p className="text-sm text-destructive">{errors.startAt.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endAt">End Date & Time</Label>
              <Input
                id="endAt"
                type="datetime-local"
                {...register("endAt", dateFieldOptions)}
                aria-invalid={!!errors.endAt}
              />
              {errors.endAt && (
                <p className="text-sm text-destructive">{errors.endAt.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              id="timezone"
              value={timezone}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setValue("timezone", e.target.value, { shouldDirty: true })
              }
            >
              {timezone && !KNOWN_TIMEZONES.has(timezone) && (
                <option value={timezone}>{timezone} (custom)</option>
              )}
              {TIMEZONE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.zones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Where will your event be held?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name</Label>
            <Input
              id="venueName"
              placeholder="e.g., Convention Center"
              {...register("venueName")}
              aria-invalid={!!errors.venueName}
            />
            {errors.venueName && (
              <p className="text-sm text-destructive">{errors.venueName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Street address"
              {...register("address")}
              aria-invalid={!!errors.address}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="City"
                {...register("city")}
                aria-invalid={!!errors.city}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Country"
                {...register("country")}
                aria-invalid={!!errors.country}
              />
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity</CardTitle>
          <CardDescription>
            Set attendance limits (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="maxAttendees">Maximum Attendees</Label>
            <Input
              id="maxAttendees"
              type="number"
              min={1}
              max={10000}
              placeholder="Leave empty for unlimited"
              {...register("maxAttendees", { valueAsNumber: true })}
              aria-invalid={!!errors.maxAttendees}
            />
            {errors.maxAttendees && (
              <p className="text-sm text-destructive">{errors.maxAttendees.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RSVP Settings</CardTitle>
          <CardDescription>
            Set a deadline for RSVPs and configure automatic reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rsvpDeadline">RSVP Deadline</Label>
            <Input
              id="rsvpDeadline"
              type="datetime-local"
              {...register("rsvpDeadline", dateFieldOptions)}
              aria-invalid={!!errors.rsvpDeadline}
            />
            <p className="text-sm text-muted-foreground">
              After this date, guests will not be able to RSVP
            </p>
            {errors.rsvpDeadline && (
              <p className="text-sm text-destructive">{errors.rsvpDeadline.message}</p>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reminderEnabled" className="text-base">
                  Automatic Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send follow-up emails to guests who haven&apos;t responded
                </p>
              </div>
              <input
                id="reminderEnabled"
                type="checkbox"
                className="h-5 w-5 rounded border-border"
                {...register("reminderEnabled")}
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="reminderDays">Send reminder every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="reminderDays"
                    type="number"
                    min={1}
                    max={30}
                    className="w-24"
                    placeholder="7"
                    {...register("reminderDays", { valueAsNumber: true })}
                    aria-invalid={!!errors.reminderDays}
                  />
                  <span className="text-sm text-muted-foreground">days after invite is sent</span>
                </div>
                {errors.reminderDays && (
                  <p className="text-sm text-destructive">{errors.reminderDays.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Reminders will stop when the guest responds or the event/deadline passes
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="attachQrToConfirmation" className="text-base">
                  Include scannable QR code in confirmation email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Confirmed guests receive an inline QR code they can show at the venue.
                </p>
              </div>
              <input
                id="attachQrToConfirmation"
                type="checkbox"
                className="h-5 w-5 rounded border-border"
                {...register("attachQrToConfirmation")}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4">
            <div>
              <Label className="text-base">Access card backdrop</Label>
              <p className="text-sm text-muted-foreground">
                Pick an image and choose how it appears on the guest&apos;s access card.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Backdrop image</Label>
              <CoverImagePicker
                eventId={eventId}
                value={passBackdropImageUrl ?? ""}
                onChange={(url) =>
                  setValue("passBackdropImageUrl", url, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                getIdToken={getIdToken}
                disabled={isLoading}
              />
              {errors.passBackdropImageUrl && (
                <p className="text-sm text-destructive">
                  {errors.passBackdropImageUrl.message}
                </p>
              )}
            </div>

            {!passBackdropImageUrl && (
              <p className="text-sm text-muted-foreground">
                Set a backdrop image to enable the photo options below.
              </p>
            )}

            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="NONE"
                  className="mt-1 h-4 w-4 border-border"
                  {...register("passBackdropStyle")}
                />
                <div>
                  <p className="text-sm font-medium">None</p>
                  <p className="text-xs text-muted-foreground">
                    Default white card.
                  </p>
                </div>
              </label>
              <label
                className={`flex items-start gap-3 ${passBackdropImageUrl ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
              >
                <input
                  type="radio"
                  value="CARD"
                  disabled={!passBackdropImageUrl}
                  className="mt-1 h-4 w-4 border-border"
                  {...register("passBackdropStyle")}
                />
                <div>
                  <p className="text-sm font-medium">Use as card backdrop</p>
                  <p className="text-xs text-muted-foreground">
                    The card itself becomes a photo card; text appears over a dark scrim.
                  </p>
                </div>
              </label>
              <label
                className={`flex items-start gap-3 ${passBackdropImageUrl ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
              >
                <input
                  type="radio"
                  value="PAGE"
                  disabled={!passBackdropImageUrl}
                  className="mt-1 h-4 w-4 border-border"
                  {...register("passBackdropStyle")}
                />
                <div>
                  <p className="text-sm font-medium">Use as page backdrop</p>
                  <p className="text-xs text-muted-foreground">
                    The page fills with the image; the card stays white over it.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || (mode === "edit" && !isDirty)}>
          {isLoading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create Event"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
