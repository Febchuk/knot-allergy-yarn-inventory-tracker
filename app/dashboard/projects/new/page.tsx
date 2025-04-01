"use client";

import { useState } from "react";
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
import { useEffect } from "react";

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

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [yarnsLoading, setYarnsLoading] = useState(true);
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: "planned",
      yarnIds: [],
    },
  });

  // Fetch available yarns
  useEffect(() => {
    const fetchYarns = async () => {
      setYarnsLoading(true);
      try {
        const response = await fetch('/api/yarns');
        if (!response.ok) {
          throw new Error("Failed to fetch yarns");
        }
        const data = await response.json();
        setYarns(data);
      } catch (error) {
        console.error("Error fetching yarns:", error);
        toast.error("Failed to load yarns");
      } finally {
        setYarnsLoading(false);
      }
    };

    fetchYarns();
  }, []);

  async function onSubmit(data: ProjectFormValues) {
    setLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          status: data.status,
          yarnIds: data.yarnIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const projectData = await response.json();
      toast.success("Project created successfully");
      router.push(`/dashboard/projects/${projectData.id}`);
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
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/projects">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">New Project</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create a New Project</CardTitle>
          <CardDescription>
            Fill in the details to create your new project.
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
                defaultValue="planned"
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
              <Link href="/dashboard/projects">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 