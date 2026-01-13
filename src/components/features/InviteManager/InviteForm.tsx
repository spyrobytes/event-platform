"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createInviteSchema, type CreateInviteInput } from "@/schemas/invite";

type InviteFormProps = {
  onSubmit: (data: CreateInviteInput | CreateInviteInput[]) => Promise<void>;
  isLoading?: boolean;
};

export function InviteForm({ onSubmit, isLoading = false }: InviteFormProps) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkEmails, setBulkEmails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      email: "",
      name: "",
      plusOnesAllowed: 0,
    },
  });

  const handleSingleSubmit = async (data: Record<string, unknown>) => {
    setError(null);
    try {
      await onSubmit(data as CreateInviteInput);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    }
  };

  const handleBulkSubmit = async () => {
    setError(null);

    // Parse bulk emails (one per line or comma-separated)
    const emails = bulkEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setError("Please enter at least one email address");
      return;
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      setError(`Invalid email(s): ${invalidEmails.join(", ")}`);
      return;
    }

    if (emails.length > 100) {
      setError("Maximum 100 emails at once");
      return;
    }

    const invites: CreateInviteInput[] = emails.map((email) => ({
      email,
      plusOnesAllowed: 0,
    }));

    try {
      await onSubmit(invites);
      setBulkEmails("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invites");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Invites</CardTitle>
        <CardDescription>
          Invite guests to your event via email
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mode Toggle */}
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={mode === "single" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("single")}
          >
            Single Invite
          </Button>
          <Button
            type="button"
            variant={mode === "bulk" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("bulk")}
          >
            Bulk Invite
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {mode === "single" ? (
          <form onSubmit={handleSubmit(handleSingleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="guest@example.com"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="Guest name"
                  {...register("name")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plusOnesAllowed">Plus Ones Allowed</Label>
              <Input
                id="plusOnesAllowed"
                type="number"
                min={0}
                max={10}
                {...register("plusOnesAllowed", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                How many additional guests can this person bring?
              </p>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulkEmails">Email Addresses</Label>
              <Textarea
                id="bulkEmails"
                placeholder="Enter email addresses, one per line or comma-separated&#10;&#10;john@example.com&#10;jane@example.com&#10;..."
                rows={8}
                value={bulkEmails}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkEmails(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter up to 100 email addresses, one per line or comma-separated
              </p>
            </div>

            <Button
              type="button"
              onClick={handleBulkSubmit}
              disabled={isLoading || !bulkEmails.trim()}
            >
              {isLoading ? "Sending..." : "Send Invites"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
