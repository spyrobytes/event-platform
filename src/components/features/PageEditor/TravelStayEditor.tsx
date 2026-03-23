"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TravelStaySection, HotelItem, Airport } from "@/schemas/event-page";

type TravelStayEditorProps = {
  data: TravelStaySection["data"];
  onChange: (data: TravelStaySection["data"]) => void;
  templateId?: string;
};

/**
 * Editor for Travel & Accommodations section
 * Allows adding hotels with booking info and room blocks
 */
export function TravelStayEditor({ data, onChange, templateId }: TravelStayEditorProps) {
  const hotels = data.hotels || [];
  const isV2 = templateId === "wedding_v2";
  const airports = data.airports || [];
  const tips = data.tips || [];

  const addHotel = useCallback(() => {
    if (hotels.length >= 5) return;
    onChange({
      ...data,
      hotels: [...hotels, { name: "", address: "" }],
    });
  }, [data, hotels, onChange]);

  const updateHotel = useCallback(
    (index: number, updates: Partial<HotelItem>) => {
      const newHotels = [...hotels];
      newHotels[index] = { ...newHotels[index], ...updates };
      onChange({ ...data, hotels: newHotels });
    },
    [data, hotels, onChange]
  );

  const removeHotel = useCallback(
    (index: number) => {
      onChange({
        ...data,
        hotels: hotels.filter((_, i) => i !== index),
      });
    },
    [data, hotels, onChange]
  );

  const addAirport = useCallback(() => {
    if (airports.length >= 3) return;
    onChange({
      ...data,
      airports: [...airports, { code: "", name: "" }],
    });
  }, [data, airports, onChange]);

  const updateAirport = useCallback(
    (index: number, updates: Partial<Airport>) => {
      const newAirports = [...airports];
      newAirports[index] = { ...newAirports[index], ...updates };
      onChange({ ...data, airports: newAirports });
    },
    [data, airports, onChange]
  );

  const removeAirport = useCallback(
    (index: number) => {
      onChange({
        ...data,
        airports: airports.filter((_, i) => i !== index),
      });
    },
    [data, airports, onChange]
  );

  const addTip = useCallback(() => {
    if (tips.length >= 5) return;
    onChange({
      ...data,
      tips: [...tips, ""],
    });
  }, [data, tips, onChange]);

  const updateTip = useCallback(
    (index: number, value: string) => {
      const newTips = [...tips];
      newTips[index] = value;
      onChange({ ...data, tips: newTips });
    },
    [data, tips, onChange]
  );

  const removeTip = useCallback(
    (index: number) => {
      onChange({
        ...data,
        tips: tips.filter((_, i) => i !== index),
      });
    },
    [data, tips, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="travel-heading">Section Heading</Label>
        <Input
          id="travel-heading"
          value={data.heading || "Travel & Accommodations"}
          onChange={(e) => onChange({ ...data, heading: e.target.value })}
          placeholder="Travel & Accommodations"
          maxLength={80}
        />
      </div>

      {/* Hotels List */}
      <div className="space-y-2">
        <Label>Hotels & Accommodations</Label>
        {hotels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hotels added yet. Add accommodation options for your guests.
          </p>
        ) : (
          <div className="space-y-4">
            {hotels.map((hotel, index) => (
              <div
                key={index}
                className="relative rounded-lg border bg-card p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Hotel {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHotel(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    aria-label="Remove hotel"
                  >
                    ×
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`hotel-name-${index}`}>Hotel Name</Label>
                    <Input
                      id={`hotel-name-${index}`}
                      value={hotel.name}
                      onChange={(e) =>
                        updateHotel(index, { name: e.target.value })
                      }
                      placeholder="e.g., The Grand Hotel"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`hotel-address-${index}`}>Address</Label>
                    <Input
                      id={`hotel-address-${index}`}
                      value={hotel.address || ""}
                      onChange={(e) =>
                        updateHotel(index, { address: e.target.value })
                      }
                      placeholder="123 Main St, City, State"
                      maxLength={200}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`hotel-booking-${index}`}>
                        Booking URL (optional)
                      </Label>
                      <Input
                        id={`hotel-booking-${index}`}
                        type="url"
                        value={hotel.bookingUrl || ""}
                        onChange={(e) =>
                          updateHotel(index, { bookingUrl: e.target.value })
                        }
                        placeholder="https://hotel.com/book"
                      />
                      {hotel.bookingUrl && (() => { try { new URL(hotel.bookingUrl); return false; } catch { return true; } })() && (
                        <p className="text-xs text-amber-600">Please enter a valid URL (e.g., https://...)</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`hotel-block-${index}`}>
                        Room Block Code (optional)
                      </Label>
                      <Input
                        id={`hotel-block-${index}`}
                        value={hotel.blockCode || ""}
                        onChange={(e) =>
                          updateHotel(index, { blockCode: e.target.value })
                        }
                        placeholder="e.g., SMITHWEDDING"
                        maxLength={30}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`hotel-deadline-${index}`}>
                      Booking Deadline (optional)
                    </Label>
                    <Input
                      id={`hotel-deadline-${index}`}
                      value={hotel.deadline || ""}
                      onChange={(e) =>
                        updateHotel(index, { deadline: e.target.value })
                      }
                      placeholder="e.g., Book by October 1st for group rate"
                      maxLength={100}
                    />
                  </div>

                  {isV2 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`hotel-desc-${index}`}>
                          Description (optional)
                        </Label>
                        <Textarea
                          id={`hotel-desc-${index}`}
                          value={hotel.description || ""}
                          onChange={(e) =>
                            updateHotel(index, { description: e.target.value || undefined })
                          }
                          placeholder="e.g., Boutique hotel overlooking the vineyard, 5 min from venue"
                          rows={2}
                          maxLength={300}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`hotel-tags-${index}`}>
                          Tags (optional)
                        </Label>
                        <Input
                          id={`hotel-tags-${index}`}
                          value={(hotel.tags || []).join(", ")}
                          onChange={(e) => {
                            const val = e.target.value;
                            const tags = val
                              ? val.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5)
                              : undefined;
                            updateHotel(index, { tags });
                          }}
                          placeholder="e.g., Luxury, Pool, Pet-friendly"
                        />
                        <p className="text-xs text-muted-foreground">
                          Comma-separated, max 5 tags
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addHotel}
          disabled={hotels.length >= 5}
          className="w-full"
        >
          + Add Hotel
          {hotels.length >= 5 && " (max 5)"}
        </Button>
      </div>

      {/* Airports - V2 only */}
      {isV2 && (
        <div className="space-y-2">
          <Label>Nearby Airports</Label>
          <p className="text-xs text-muted-foreground">
            Help guests find the best airports for your venue
          </p>

          {airports.map((airport, index) => (
            <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
              <div className="flex-1 grid gap-2 sm:grid-cols-3">
                <Input
                  value={airport.code}
                  onChange={(e) => updateAirport(index, { code: e.target.value })}
                  placeholder="Code (e.g., LAX)"
                  maxLength={10}
                />
                <Input
                  value={airport.name}
                  onChange={(e) => updateAirport(index, { name: e.target.value })}
                  placeholder="Airport name"
                  maxLength={100}
                />
                <Input
                  value={airport.distance || ""}
                  onChange={(e) => updateAirport(index, { distance: e.target.value || undefined })}
                  placeholder="Distance (e.g., 30 min)"
                  maxLength={50}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeAirport(index)}
                className="mt-1 h-8 w-8 p-0 text-destructive hover:text-destructive"
                aria-label="Remove airport"
              >
                ×
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAirport}
            disabled={airports.length >= 3}
          >
            + Add Airport
            {airports.length >= 3 && " (max 3)"}
          </Button>
        </div>
      )}

      {/* Travel Tips - V2 only */}
      {isV2 && (
        <div className="space-y-2">
          <Label>Travel Tips</Label>
          <p className="text-xs text-muted-foreground">
            Share helpful tips for guests traveling to your venue
          </p>

          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-2">
              <Input
                value={tip}
                onChange={(e) => updateTip(index, e.target.value)}
                placeholder="e.g., Rent a car for the best experience"
                maxLength={200}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTip(index)}
                className="mt-0.5 h-8 w-8 p-0 text-destructive hover:text-destructive"
                aria-label="Remove tip"
              >
                ×
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTip}
            disabled={tips.length >= 5}
          >
            + Add Tip
            {tips.length >= 5 && " (max 5)"}
          </Button>
        </div>
      )}

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label htmlFor="travel-notes">Additional Notes (optional)</Label>
        <Textarea
          id="travel-notes"
          value={data.notes || ""}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Any additional travel tips, airport info, or transportation suggestions..."
          rows={3}
          maxLength={500}
        />
      </div>
    </div>
  );
}
