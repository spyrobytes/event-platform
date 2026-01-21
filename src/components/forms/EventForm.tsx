"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateSelector, getDefaultTemplateId } from "@/components/features";
import { createEventSchema, type CreateEventInput, type TemplateId } from "@/schemas/event";

type EventFormMode = "create" | "edit";

type EventFormProps = {
  mode: EventFormMode;
  defaultValues?: Partial<CreateEventInput>;
  onSubmit: (data: CreateEventInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
};

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public - Anyone can see and join" },
  { value: "UNLISTED", label: "Unlisted - Only people with link can see" },
  { value: "PRIVATE", label: "Private - Invite only" },
] as const;

const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
] as const;

function formatDateTimeLocal(date: Date | undefined): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function EventForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: EventFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
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
      templateId: defaultValues?.templateId ?? getDefaultTemplateId(),
      ...defaultValues,
    },
  });

  const visibility = watch("visibility");
  const timezone = watch("timezone");
  const templateId = watch("templateId");

  const handleFormSubmit: SubmitHandler<CreateEventInput> = async (data) => {
    try {
      await onSubmit(data);
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue("visibility", e.target.value as CreateEventInput["visibility"])}
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
            <Label htmlFor="coverImageUrl">Cover Image URL</Label>
            <Input
              id="coverImageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              {...register("coverImageUrl")}
              aria-invalid={!!errors.coverImageUrl}
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
                defaultValue={formatDateTimeLocal(defaultValues?.startAt)}
                {...register("startAt")}
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
                defaultValue={formatDateTimeLocal(defaultValues?.endAt)}
                {...register("endAt")}
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue("timezone", e.target.value)}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
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

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
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
