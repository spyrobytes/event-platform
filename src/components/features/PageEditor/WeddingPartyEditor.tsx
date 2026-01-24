"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WeddingPartySection, PartyMember } from "@/schemas/event-page";

type Asset = {
  id: string;
  kind: string;
  publicUrl: string | null;
  alt: string;
};

type WeddingPartyEditorProps = {
  data: WeddingPartySection["data"];
  assets: Asset[];
  onChange: (data: WeddingPartySection["data"]) => void;
};

/**
 * Editor for Wedding Party section
 * Allows adding bridesmaids, groomsmen, and other party members
 */
export function WeddingPartyEditor({
  data,
  assets,
  onChange,
}: WeddingPartyEditorProps) {
  const members = data.members || [];
  const partyAssets = assets.filter((a) => a.kind === "GALLERY");

  const addMember = useCallback(() => {
    if (members.length >= 16) return;
    onChange({
      ...data,
      members: [...members, { name: "", role: "" }],
    });
  }, [data, members, onChange]);

  const updateMember = useCallback(
    (index: number, updates: Partial<PartyMember>) => {
      const newMembers = [...members];
      newMembers[index] = { ...newMembers[index], ...updates };
      onChange({ ...data, members: newMembers });
    },
    [data, members, onChange]
  );

  const removeMember = useCallback(
    (index: number) => {
      onChange({
        ...data,
        members: members.filter((_, i) => i !== index),
      });
    },
    [data, members, onChange]
  );

  const moveItem = useCallback(
    (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= members.length) return;

      const newMembers = [...members];
      [newMembers[index], newMembers[newIndex]] = [
        newMembers[newIndex],
        newMembers[index],
      ];
      onChange({ ...data, members: newMembers });
    },
    [data, members, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="party-heading">Section Heading</Label>
        <Input
          id="party-heading"
          value={data.heading || "The Wedding Party"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="The Wedding Party"
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="party-description">Description (optional)</Label>
        <Textarea
          id="party-description"
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Meet the special people who will be standing by our side..."
          rows={2}
          maxLength={300}
        />
      </div>

      {/* Members List */}
      <div className="space-y-2">
        <Label>Party Members</Label>
        <p className="text-xs text-muted-foreground">
          Tip: Use roles like &quot;Maid of Honor&quot;, &quot;Best Man&quot;,
          &quot;Bridesmaid&quot;, &quot;Groomsman&quot; to auto-group by side
        </p>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No party members added yet. Add your bridesmaids, groomsmen, and
            other special people.
          </p>
        ) : (
          <div className="space-y-4">
            {members.map((member, index) => (
              <div
                key={index}
                className="relative rounded-lg border bg-card p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Member {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                      aria-label="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, "down")}
                      disabled={index === members.length - 1}
                      className="h-8 w-8 p-0"
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      aria-label="Remove member"
                    >
                      ×
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`member-name-${index}`}>Name</Label>
                      <Input
                        id={`member-name-${index}`}
                        value={member.name}
                        onChange={(e) =>
                          updateMember(index, { name: e.target.value })
                        }
                        placeholder="Jane Smith"
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`member-role-${index}`}>Role</Label>
                      <Input
                        id={`member-role-${index}`}
                        value={member.role}
                        onChange={(e) =>
                          updateMember(index, { role: e.target.value })
                        }
                        placeholder="e.g., Maid of Honor"
                        maxLength={50}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`member-bio-${index}`}>Bio (optional)</Label>
                    <Textarea
                      id={`member-bio-${index}`}
                      value={member.bio || ""}
                      onChange={(e) =>
                        updateMember(index, { bio: e.target.value })
                      }
                      placeholder="A short bio about this person and your relationship..."
                      rows={2}
                      maxLength={300}
                    />
                  </div>

                  {/* Photo Selection */}
                  <div className="space-y-2">
                    <Label>Photo (optional)</Label>
                    {partyAssets.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateMember(index, { imageAssetId: undefined })
                          }
                          className={`h-16 w-16 rounded border-2 p-1 transition-all ${
                            !member.imageAssetId
                              ? "border-primary bg-primary/10"
                              : "border-muted hover:border-muted-foreground"
                          }`}
                          title={member.imageAssetId ? "Clear selection" : "No photo selected"}
                        >
                          <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
                            <svg
                              className="mb-0.5 h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {member.imageAssetId ? "Clear" : "None"}
                          </div>
                        </button>
                        {partyAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() =>
                              updateMember(index, { imageAssetId: asset.id })
                            }
                            className={`h-16 w-16 overflow-hidden rounded border-2 transition-all ${
                              member.imageAssetId === asset.id
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-muted hover:border-muted-foreground"
                            }`}
                            title={asset.alt || "Select photo"}
                          >
                            {asset.publicUrl && (
                              <img
                                src={asset.publicUrl}
                                alt={asset.alt}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Upload images in the Media Library to add photos
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addMember}
          disabled={members.length >= 16}
          className="w-full"
        >
          + Add Party Member
          {members.length >= 16 && " (max 16)"}
        </Button>
      </div>
    </div>
  );
}
