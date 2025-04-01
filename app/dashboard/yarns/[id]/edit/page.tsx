"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";

// We'll use a similar schema as the one in lib/schemas/yarn.ts but for client-side validation
const DyeStatus = {
  NOT_TO_BE_DYED: "NOT_TO_BE_DYED",
  TO_BE_DYED: "TO_BE_DYED",
  HAS_BEEN_DYED: "HAS_BEEN_DYED",
} as const;

const yarnSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  productLine: z.string().min(1, "Product line is required"),
  prevColor: z.string().optional().nullable(),
  currColor: z.string().optional().nullable(),
  nextColor: z.string().optional().nullable(),
  dyeStatus: z.enum([DyeStatus.NOT_TO_BE_DYED, DyeStatus.TO_BE_DYED, DyeStatus.HAS_BEEN_DYED]),
  materials: z.string().min(1, "Materials are required"),
  weight: z.number().int().min(1).max(7),
  yardsPerOz: z.string().regex(/^\d+(\.\d+)?\/\d+(\.\d+)?$/, "Must be in format XX/XX e.g. 367/4.9"),
  totalWeight: z.number().positive("Total weight must be positive"),
  totalYards: z.number().positive("Total yards must be positive"),
  organizationData: z.array(z.object({
    typeId: z.string().min(1, "Organization type is required"),
    quantity: z.number().int().positive("Quantity must be positive"),
  })),
  tags: z.string().optional(),
  projectIds: z.array(z.string()).default([]),
});

type YarnFormValues = z.infer<typeof yarnSchema>;

type YarnOrganizationType = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  name: string;
  status: string;
};

export default function EditYarnPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizationTypes, setOrganizationTypes] = useState<YarnOrganizationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<YarnFormValues>({
    resolver: zodResolver(yarnSchema),
    defaultValues: {
      dyeStatus: DyeStatus.NOT_TO_BE_DYED,
      organizationData: [],
    },
  });

  // Fetch the yarn data and organization types
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setProjectsLoading(true);
      try {
        // Fetch organization types
        const typesResponse = await fetch("/api/yarns-organization-types");
        if (!typesResponse.ok) throw new Error("Failed to fetch organization types");
        const typesData = await typesResponse.json();
        setOrganizationTypes(typesData);

        // Fetch all projects
        const projectsResponse = await fetch("/api/projects");
        if (!projectsResponse.ok) throw new Error("Failed to fetch projects");
        const projectsData = await projectsResponse.json();
        setProjects(projectsData.projects || []);
        setProjectsLoading(false);

        // Fetch yarn data
        const yarnResponse = await fetch(`/api/yarns/${params.id}`);
        if (!yarnResponse.ok) {
          if (yarnResponse.status === 404) {
            toast.error("Yarn not found");
            router.push("/dashboard/yarns");
            return;
          }
          throw new Error("Failed to fetch yarn");
        }
        
        const yarnData = await yarnResponse.json();
        
        // Debug yarn data
        console.log("Yarn data received:", JSON.stringify({
          projects: yarnData.projects,
          projectIds: yarnData.projects?.map((project: { id: string }) => project.id) || []
        }));
        
        // Convert the data to the form format
        reset({
          brand: yarnData.brand,
          productLine: yarnData.productLine,
          prevColor: yarnData.prevColor,
          currColor: yarnData.currColor,
          nextColor: yarnData.nextColor,
          dyeStatus: yarnData.dyeStatus,
          materials: yarnData.materials,
          weight: yarnData.weight,
          yardsPerOz: yarnData.yardsPerOz,
          totalWeight: yarnData.totalWeight,
          totalYards: yarnData.totalYards,
          organizationData: yarnData.organization?.map((org: { typeId: string; quantity: number }) => ({
            typeId: org.typeId,
            quantity: org.quantity,
          })) || [],
          tags: yarnData.tags?.map((tag: { name: string }) => tag.name).join(", "),
          projectIds: yarnData.projects?.map((project: { id: string }) => project.id) || [],
        });
        
        // Debug after reset
        console.log("Form values after reset:", JSON.stringify({
          projectIds: watch("projectIds")
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load yarn data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id, reset, router]);

  // Add effect to explicitly set projectIds after loading
  useEffect(() => {
    if (!isLoading && !projectsLoading) {
      const currentProjectIds = watch("projectIds");
      console.log("Setting projectIds in effect:", currentProjectIds);
    }
  }, [isLoading, projectsLoading, watch]);

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

  const organizationData = watch("organizationData") || [];

  const handleOrganizationAdd = () => {
    setValue("organizationData", [
      ...organizationData,
      { typeId: "", quantity: 1 }
    ]);
  };

  const handleOrganizationRemove = (index: number) => {
    setValue("organizationData", organizationData.filter((_, i) => i !== index));
  };

  async function onSubmit(data: YarnFormValues) {
    setLoading(true);

    try {
      // Convert tags string to array or empty array
      const tagsArray = data.tags?.split(",").map(tag => tag.trim()).filter(Boolean) || [];
      
      // Prepare data for API
      const { organizationData, projectIds, ...rest } = data;
      
      const apiData = {
        ...rest,
        tags: tagsArray,
        organization: organizationData,
        projectIds: projectIds || [],
      };

      console.log("Sending data to API:", JSON.stringify(apiData));

      const response = await fetch(`/api/yarns/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      const responseData = await response.json();
      console.log("Response from API:", JSON.stringify(responseData));

      if (!response.ok) {
        throw new Error("Failed to update yarn");
      }

      toast.success("Yarn updated successfully");
      
      // Force a hard reload to ensure the data is refreshed
      window.location.href = `/dashboard/yarns/${params.id}`;
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading yarn data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/yarns/${params.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Edit Yarn</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Yarn Details</CardTitle>
          <CardDescription>
            Update the details of your yarn.
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
                onValueChange={(value) => setValue("dyeStatus", value as keyof typeof DyeStatus)}
                defaultValue={watch("dyeStatus")}
                value={watch("dyeStatus")}
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
              {organizationData.map((_, index) => (
                <div key={index} className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Type</Label>
                    <Select
                      onValueChange={(value) => {
                        const org = [...organizationData];
                        org[index].typeId = value;
                        setValue("organizationData", org);
                      }}
                      value={organizationData[index].typeId}
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
                      value={organizationData[index].quantity}
                      onChange={(e) => {
                        const org = [...organizationData];
                        org[index].quantity = parseInt(e.target.value);
                        setValue("organizationData", org);
                      }}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                {...register("tags")}
                placeholder="Enter tags (comma separated)"
              />
            </div>
            <div className="space-y-4">
              <Label>Associated Projects</Label>
              {projectsLoading ? (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading projects...</p>
                </div>
              ) : projects.length > 0 ? (
                <SearchableMultiSelect
                  options={projects.map(project => ({
                    label: project.name,
                    value: project.id,
                    description: `Status: ${project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1)}`
                  }))}
                  selected={watch("projectIds") || []}
                  onChange={(values) => {
                    console.log("SearchableMultiSelect onChange called with:", JSON.stringify(values));
                    setValue("projectIds", values);
                    
                    // Force immediate update
                    const apiData = {
                      projectIds: values
                    };
                    
                    console.log("Sending immediate update with:", JSON.stringify(apiData));
                    
                    // Update projects immediately
                    fetch(`/api/yarns/${params.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(apiData),
                    })
                      .then(response => response.json())
                      .then(data => {
                        console.log("Project update response:", JSON.stringify(data));
                        toast.success("Project associations updated");
                      })
                      .catch(error => {
                        console.error("Error updating projects:", error);
                        toast.error("Failed to update project associations");
                      });
                  }}
                  placeholder="Select projects..."
                  emptyMessage="No projects found"
                  loading={projectsLoading}
                />
              ) : (
                <div className="text-center py-4 border rounded-md">
                  <p className="text-sm text-muted-foreground">No projects available</p>
                  <Link href="/dashboard/projects/new" className="text-sm text-primary hover:underline mt-2 inline-block">
                    Create a project
                  </Link>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-4 pt-4">
              <Link href={`/dashboard/yarns/${params.id}`}>
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 