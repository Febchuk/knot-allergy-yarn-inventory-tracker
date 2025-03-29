"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";

export type Yarn = {
  id: string;
  name: string;
  brand: string;
  weight: string;
  fiber: string;
  color: string | null;
  dyeingStatus: string;
  quantity: number;
  unit: string;
  notes: string | null;
  photos: { id: string; url: string }[];
  tags: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
};

const dyeingStatusMap = {
  UNKNOWN: "Unknown",
  NATURAL: "Natural",
  HAND_DYED: "Hand Dyed",
  MACHINE_DYED: "Machine Dyed",
};

export const columns: ColumnDef<Yarn>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "brand",
    header: "Brand",
  },
  {
    accessorKey: "weight",
    header: "Weight",
  },
  {
    accessorKey: "fiber",
    header: "Fiber",
  },
  {
    accessorKey: "color",
    header: "Color",
  },
  {
    accessorKey: "dyeingStatus",
    header: "Dyeing Status",
    cell: ({ row }) => {
      const status = row.getValue("dyeingStatus") as keyof typeof dyeingStatusMap;
      return (
        <Badge variant="secondary">
          {dyeingStatusMap[status] || status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      const quantity = row.getValue("quantity") as number;
      const unit = row.original.unit;
      return `${quantity} ${unit}`;
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.original.tags;
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const yarn = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(yarn.id)}
            >
              Copy yarn ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 