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
  const [bulkInput, setBulkInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingBulk, setPendingBulk] = useState<CreateInviteInput[] | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      email: "",
      phone: "",
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

  /**
   * Parse bulk input lines. Each line is one of:
   *   Name <email> +N        — "Jane Doe <jane@example.com> +2"
   *   Name, email, N         — "Jane Doe, jane@example.com, 2"
   *   Name <email>           — "Jane Doe <jane@example.com>"       (plus ones = 0)
   *   Name, email            — "Jane Doe, jane@example.com"        (plus ones = 0)
   *   email                  — "jane@example.com"                  (plus ones = 0)
   */
  const parseBulkLines = (raw: string): { entries: CreateInviteInput[]; errors: string[] } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Match: Name <email> optionally followed by +N
    const angleBracketRegex = /^(.+?)\s*<([^>]+)>\s*(?:\+(\d+))?$/;

    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const entries: CreateInviteInput[] = [];
    const errors: string[] = [];

    for (const line of lines) {
      let name: string | undefined;
      let email: string;
      let plusOnesAllowed = 0;

      // Try "Name <email> +N" format
      const angleBracketMatch = line.match(angleBracketRegex);
      if (angleBracketMatch) {
        name = angleBracketMatch[1].trim();
        email = angleBracketMatch[2].trim();
        if (angleBracketMatch[3]) {
          plusOnesAllowed = Math.min(10, parseInt(angleBracketMatch[3], 10));
        }
      } else if (line.includes(",")) {
        // Try "name, email[, N]" format
        const parts = line.split(",").map((p) => p.trim());

        if (parts.length >= 2) {
          // Find which part is the email
          if (emailRegex.test(parts[1])) {
            name = parts[0];
            email = parts[1];
          } else if (emailRegex.test(parts[0])) {
            email = parts[0];
            name = parts[1];
          } else {
            errors.push(line);
            continue;
          }

          // Third part is optional plus-ones count
          if (parts.length >= 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
              plusOnesAllowed = Math.min(10, Math.max(0, parsed));
            }
          }
        } else {
          errors.push(line);
          continue;
        }
      } else {
        // Bare email, possibly with trailing +N: "email +N"
        const plusMatch = line.match(/^(\S+)\s+\+(\d+)$/);
        if (plusMatch) {
          email = plusMatch[1];
          plusOnesAllowed = Math.min(10, parseInt(plusMatch[2], 10));
        } else {
          email = line;
        }
      }

      if (!emailRegex.test(email)) {
        errors.push(line);
        continue;
      }

      entries.push({ email, name: name || undefined, plusOnesAllowed });
    }

    return { entries, errors };
  };

  const handleBulkSubmit = () => {
    setError(null);

    const { entries, errors: parseErrors } = parseBulkLines(bulkInput);

    if (entries.length === 0 && parseErrors.length === 0) {
      setError("Please enter at least one guest");
      return;
    }

    if (parseErrors.length > 0) {
      setError(`Invalid line(s):\n${parseErrors.join("\n")}`);
      return;
    }

    if (entries.length > 100) {
      setError("Maximum 100 guests at once");
      return;
    }

    // Show confirmation before sending
    setPendingBulk(entries);
  };

  const handleConfirmBulk = async () => {
    if (!pendingBulk) return;
    try {
      await onSubmit(pendingBulk);
      setBulkInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invites");
    } finally {
      setPendingBulk(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Invites</CardTitle>
        <CardDescription>
          Invite guests via email, or add their phone number and share the RSVP link directly
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
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Guest name"
                  {...register("name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+14155551234"
                  {...register("phone")}
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  E.164 format. For phone-only invites, copy and share the RSVP link directly.
                </p>
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
              <Label htmlFor="bulkInput">Guest List</Label>
              <Textarea
                id="bulkInput"
                placeholder={"Jane Doe <jane@example.com>\nJohn Smith, john@example.com\nbob@example.com\n..."}
                rows={8}
                value={bulkInput}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                One guest per line, up to 100. Formats: <code>Name &lt;email&gt;</code>, <code>Name, email</code>, or <code>email</code>.
                {" "}Append <code>+N</code> or <code>, N</code> to set plus ones (e.g. <code>Jane &lt;jane@example.com&gt; +2</code>).
              </p>
            </div>

            {pendingBulk ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-left font-medium w-28">Plus Ones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingBulk.map((invite, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {invite.name || <span className="italic">—</span>}
                          </td>
                          <td className="px-3 py-1.5">{invite.email}</td>
                          <td className="px-3 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={invite.plusOnesAllowed ?? 0}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(10, Number(e.target.value) || 0));
                                setPendingBulk((prev) =>
                                  prev!.map((inv, i) =>
                                    i === idx ? { ...inv, plusOnesAllowed: val } : inv
                                  )
                                );
                              }}
                              className="h-7 w-20"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
                  <p className="mb-3 text-sm font-medium text-amber-800 dark:text-amber-200">
                    You are about to send {pendingBulk.length} invite{pendingBulk.length !== 1 ? "s" : ""}. Review the list above and adjust plus ones if needed.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleConfirmBulk}
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? "Sending..." : `Confirm & Send ${pendingBulk.length} Invites`}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingBulk(null)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleBulkSubmit}
                disabled={isLoading || !bulkInput.trim()}
              >
                Review Invites
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
