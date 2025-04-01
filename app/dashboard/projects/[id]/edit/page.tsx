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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { ArrowLeft } from "lucide-react";

// Project schema for form validation
const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "frogged"]).default("planned"),
  yarnIds: z.array(z.string()).optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

type Yarn = {
  id: string;
  brand: string;
  productLine: string;
  currColor: string | null;
};

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [yarnsLoading, setYarnsLoading] = useState(true);
  
  const { register, handleSubmit, setValue, formState: { errors }, reset, getValues } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: "planned",
      yarnIds: [],
    },
  });

  // Fetch the project data and available yarns
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setYarnsLoading(true);
      
      try {
        // Fetch project data
        const projectResponse = await fetch(`/api/projects/${params.id}`);
        if (!projectResponse.ok) {
          if (projectResponse.status === 404) {
            toast.error("Project not found");
            router.push("/dashboard/projects");
            return;
          }
          throw new Error("Failed to fetch project");
        }
        
        const projectData = await projectResponse.json();
        
        // Fetch available yarns
        const yarnsResponse = await fetch('/api/yarns');
        if (!yarnsResponse.ok) {
          throw new Error("Failed to fetch yarns");
        }
        const yarnsData = await yarnsResponse.json();
        setYarns(yarnsData);
        
        // Set project data to form
        reset({
          name: projectData.name,
          description: projectData.description || "",
          status: projectData.status,
          yarnIds: projectData.yarns?.map((yarn: { id: string }) => yarn.id) || [],
        });

        // Check for any selected yarns
        const selectedYarnIds = projectData.yarns?.map((yarn: { id: string }) => yarn.id) || [];
        setValue("yarnIds", selectedYarnIds);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load project data");
      } finally {
        setIsLoading(false);
        setYarnsLoading(false);
      }
    };

    fetchData();
  }, [params.id, reset, router, setValue]);

  async function onSubmit(data: ProjectFormValues) {
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      toast.success("Project updated successfully");
      router.push(`/dashboard/projects/${params.id}`);
      router.refresh();
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
          <p className="mt-4 text-muted-foreground">Loading project data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/projects/${params.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Edit Project</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Update the details of your project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter project name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Enter project description"
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(value: "planned" | "in_progress" | "completed" | "frogged") => 
                  setValue("status", value)
                }
                value={getValues("status")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="frogged">Frogged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Yarn selection after status field */}
            <div className="space-y-2">
              <Label>Yarns for this Project</Label>
              {yarnsLoading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading yarns...</p>
                </div>
              ) : yarns.length > 0 ? (
                <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                  <CheckboxGroup
                    value={getValues("yarnIds")}
                    onValueChange={(values: string[]) => setValue("yarnIds", values)}
                  >
                    {yarns.map((yarn) => (
                      <div key={yarn.id} className="flex items-start space-x-2">
                        <CheckboxItem 
                          id={`yarn-${yarn.id}`}
                          value={yarn.id}
                        />
                        <div>
                          <Label 
                            htmlFor={`yarn-${yarn.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {yarn.brand} {yarn.productLine}
                          </Label>
                          {yarn.currColor && (
                            <p className="text-sm text-muted-foreground">Color: {yarn.currColor}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CheckboxGroup>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-2 border rounded-md">
                  No yarns available. <Link href="/dashboard/yarns/new" className="text-primary hover:underline">Add some yarns first</Link>.
                </p>
              )}
            </div>
            
            <div className="pt-4 flex justify-end space-x-4">
              <Link href={`/dashboard/projects/${params.id}`}>
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