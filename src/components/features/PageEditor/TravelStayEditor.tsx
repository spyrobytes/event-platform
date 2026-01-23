"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TravelStaySection, HotelItem } from "@/schemas/event-page";

type TravelStayEditorProps = {
  data: TravelStaySection["data"];
  onChange: (data: TravelStaySection["data"]) => void;
};

/**
 * Editor for Travel & Accommodations section
 * Allows adding hotels with booking info and room blocks
 */
export function TravelStayEditor({ data, onChange }: TravelStayEditorProps) {
  const hotels = data.hotels || [];

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
