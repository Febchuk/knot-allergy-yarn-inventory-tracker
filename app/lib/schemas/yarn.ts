import { z } from "zod";

export const DyeStatus = {
  NOT_TO_BE_DYED: "NOT_TO_BE_DYED",
  TO_BE_DYED: "TO_BE_DYED",
  HAS_BEEN_DYED: "HAS_BEEN_DYED",
} as const;

export type DyeStatus = (typeof DyeStatus)[keyof typeof DyeStatus];

export const yarnSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  productLine: z.string().min(1, "Product line is required"),
  prevColor: z.string().optional(),
  currColor: z.string().optional(),
  nextColor: z.string().optional(),
  dyeStatus: z.nativeEnum(DyeStatus).default(DyeStatus.NOT_TO_BE_DYED),
  materials: z.string().min(1, "Materials are required"),
  weight: z.number().int().min(1).max(7),
  yardsPerOz: z.string().regex(/^\d+(\.\d+)?\/\d+(\.\d+)?$/, "Must be in format XX/XX e.g. 367/4.9"),
  totalWeight: z.number().positive("Total weight must be positive"),
  totalYards: z.number().positive("Total yards must be positive"),
  organization: z.array(z.object({
    typeId: z.string(),
    quantity: z.number().int().positive("Quantity must be positive"),
  })),
  tags: z.array(z.string()).optional(),
}); 