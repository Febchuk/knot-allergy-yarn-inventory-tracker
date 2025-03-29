"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const weightOptions = [
  "Lace",
  "Light Fingering",
  "Fingering",
  "Sport",
  "DK",
  "Worsted",
  "Aran",
  "Bulky",
  "Super Bulky",
];

const fiberOptions = [
  "Wool",
  "Merino",
  "Cotton",
  "Acrylic",
  "Alpaca",
  "Silk",
  "Bamboo",
  "Cashmere",
  "Mohair",
  "Linen",
  "Other",
];

const dyeingStatusOptions = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "NATURAL", label: "Natural" },
  { value: "HAND_DYED", label: "Hand Dyed" },
  { value: "MACHINE_DYED", label: "Machine Dyed" },
];

const unitOptions = [
  "grams",
  "yards",
  "meters",
  "skeins",
  "balls",
];

export default function NewYarnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/yarn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          brand: formData.get("brand"),
          weight: formData.get("weight"),
          fiber: formData.get("fiber"),
          color: formData.get("color"),
          dyeingStatus: formData.get("dyeingStatus"),
          quantity: parseFloat(formData.get("quantity") as string) || 0,
          unit: formData.get("unit") || "grams",
          notes: formData.get("notes"),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create yarn");
      }

      toast.success("Yarn added successfully");
      router.push("/dashboard/yarns");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Add New Yarn</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Yarn Details</CardTitle>
          <CardDescription>
            Enter the details of your new yarn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter yarn name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                name="brand"
                placeholder="Enter yarn brand"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Select name="weight" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select yarn weight" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightOptions.map((weight) => (
                      <SelectItem key={weight} value={weight}>
                        {weight}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiber">Fiber</Label>
                <Select name="fiber" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fiber type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fiberOptions.map((fiber) => (
                      <SelectItem key={fiber} value={fiber}>
                        {fiber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                name="color"
                placeholder="Enter yarn color"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dyeingStatus">Dyeing Status</Label>
              <Select name="dyeingStatus" defaultValue="UNKNOWN">
                <SelectTrigger>
                  <SelectValue placeholder="Select dyeing status" />
                </SelectTrigger>
                <SelectContent>
                  {dyeingStatusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" defaultValue="grams">
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Enter any additional notes about the yarn"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Yarn"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 