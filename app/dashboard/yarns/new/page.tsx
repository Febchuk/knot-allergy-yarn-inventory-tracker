"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DyeStatus } from "../../../lib/schemas/yarn";

// Define our own schema to match the form exactly
const formSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  productLine: z.string().min(1, "Product line is required"),
  prevColor: z.string().optional().nullable(),
  currColor: z.string().optional().nullable(),
  nextColor: z.string().optional().nullable(),
  dyeStatus: z.enum([DyeStatus.NOT_TO_BE_DYED, DyeStatus.TO_BE_DYED, DyeStatus.HAS_BEEN_DYED])
    .default(DyeStatus.NOT_TO_BE_DYED),
  materials: z.string().min(1, "Materials are required"),
  weight: z.number().int().min(1).max(7),
  yardsPerOz: z.string().regex(/^\d+(\.\d+)?\/\d+(\.\d+)?$/, "Must be in format XX/XX e.g. 367/4.9"),
  totalWeight: z.number().positive("Total weight must be positive"),
  totalYards: z.number().positive("Total yards must be positive"),
  organization: z.array(z.object({
    typeId: z.string(),
    quantity: z.number().int().positive("Quantity must be positive"),
  })),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type YarnOrganizationType = {
  id: string;
  name: string;
};

export default function NewYarnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizationTypes, setOrganizationTypes] = useState<YarnOrganizationType[]>([]);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dyeStatus: DyeStatus.NOT_TO_BE_DYED,
      organization: [],
    },
  });

  useEffect(() => {
    // Fetch organization types
    fetch("/api/yarn-organization-types")
      .then(res => res.json())
      .then(data => setOrganizationTypes(data))
      .catch(error => {
        console.error("Failed to fetch organization types:", error);
        toast.error("Failed to load organization types");
      });
  }, []);

  // Handle color arrow notation automatically
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if color contains arrow notation (e.g., "StoneGray --> Light Blue")
    if (value.includes("-->")) {
      const colorParts = value.split("-->").map(part => part.trim());
      setValue("currColor", colorParts[0]);
      setValue("nextColor", colorParts[1]);
      setValue("dyeStatus", DyeStatus.TO_BE_DYED);
    } else {
      setValue("currColor", value);
    }
  };

  const handleOrganizationAdd = () => {
    const currentOrganization = watch("organization") || [];
    setValue("organization", [
      ...currentOrganization,
      { typeId: "", quantity: 1 }
    ]);
  };

  const handleOrganizationRemove = (index: number) => {
    const currentOrganization = watch("organization") || [];
    setValue("organization", currentOrganization.filter((_, i) => i !== index));
  };

  async function onSubmit(data: FormValues) {
    setLoading(true);

    try {
      // Create a new object for the API submission
      const apiData = {
        ...data,
        // Convert tags string to array
        tags: data.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
      };

      const response = await fetch("/api/yarn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        // Try to get error message from response
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create yarn");
      }

      toast.success("Yarn added successfully");
      router.push("/dashboard/yarns");
      router.refresh();
    } catch (error) {
      console.error("Error creating yarn:", error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                {...register("brand")}
                placeholder="Enter yarn brand"
              />
              {errors.brand && (
                <p className="text-sm text-red-500">{errors.brand.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="productLine">Product Line</Label>
              <Input
                id="productLine"
                {...register("productLine")}
                placeholder="Enter product line"
              />
              {errors.productLine && (
                <p className="text-sm text-red-500">{errors.productLine.message}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prevColor">Previous Color</Label>
                <Input
                  id="prevColor"
                  {...register("prevColor")}
                  placeholder="Previous color"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currColor">Current Color</Label>
                <Input
                  id="currColor"
                  {...register("currColor")}
                  placeholder="Current color"
                  onChange={handleColorChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextColor">Next Color</Label>
                <Input
                  id="nextColor"
                  {...register("nextColor")}
                  placeholder="Next color"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dyeStatus">Dye Status</Label>
              <Select
                onValueChange={(value: DyeStatus) => setValue("dyeStatus", value)}
                defaultValue={DyeStatus.NOT_TO_BE_DYED}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dye status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DyeStatus.NOT_TO_BE_DYED}>Not to be dyed</SelectItem>
                  <SelectItem value={DyeStatus.TO_BE_DYED}>To be dyed</SelectItem>
                  <SelectItem value={DyeStatus.HAS_BEEN_DYED}>Has been dyed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="materials">Materials</Label>
              <Input
                id="materials"
                {...register("materials")}
                placeholder="e.g. 65% polyester, 35% viscose"
              />
              {errors.materials && (
                <p className="text-sm text-red-500">{errors.materials.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (1-7)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="1"
                  max="7"
                  defaultValue="1"
                  {...register("weight", { valueAsNumber: true })}
                />
                {errors.weight && (
                  <p className="text-sm text-red-500">{errors.weight.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="yardsPerOz">Yards per Oz (XX/XX)</Label>
                <Input
                  id="yardsPerOz"
                  {...register("yardsPerOz")}
                  placeholder="e.g. 367/4.9"
                />
                {errors.yardsPerOz && (
                  <p className="text-sm text-red-500">{errors.yardsPerOz.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalWeight">Total Weight (oz)</Label>
                <Input
                  id="totalWeight"
                  type="number"
                  step="0.01"
                  {...register("totalWeight", { valueAsNumber: true })}
                />
                {errors.totalWeight && (
                  <p className="text-sm text-red-500">{errors.totalWeight.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalYards">Total Yards</Label>
                <Input
                  id="totalYards"
                  type="number"
                  {...register("totalYards", { valueAsNumber: true })}
                />
                {errors.totalYards && (
                  <p className="text-sm text-red-500">{errors.totalYards.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Organization</Label>
                <Button type="button" variant="outline" onClick={handleOrganizationAdd}>
                  Add Organization
                </Button>
              </div>
              {watch("organization")?.map((org, index) => (
                <div key={index} className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Type</Label>
                    <Select
                      onValueChange={(value) => {
                        const org = [...watch("organization")];
                        org[index].typeId = value;
                        setValue("organization", org);
                      }}
                      value={watch(`organization.${index}.typeId`)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizationTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register(`organization.${index}.quantity` as const, { valueAsNumber: true })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleOrganizationRemove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {errors.organization && (
                <p className="text-sm text-red-500">{errors.organization.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                {...register("tags")}
                placeholder="Enter tags (comma separated)"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Yarn"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 