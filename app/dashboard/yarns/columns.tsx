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
import { MoreHorizontal, Pencil, Trash, Eye } from "lucide-react";
import Link from "next/link";

export type YarnOrganization = {
  id: string;
  typeId: string;
  quantity: number;
  type: {
    id: string;
    name: string;
  };
};

export type Yarn = {
  id: string;
  brand: string;
  productLine: string;
  prevColor: string | null;
  currColor: string | null;
  nextColor: string | null;
  dyeStatus: "NOT_TO_BE_DYED" | "TO_BE_DYED" | "HAS_BEEN_DYED";
  materials: string;
  weight: number;
  yardsPerOz: string;
  totalWeight: number;
  totalYards: number;
  organization: YarnOrganization[];
  photos: { id: string; url: string }[];
  tags: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
};

const dyeStatusMap = {
  NOT_TO_BE_DYED: "Not to be dyed",
  TO_BE_DYED: "To be dyed",
  HAS_BEEN_DYED: "Has been dyed",
};

export const columns: ColumnDef<Yarn>[] = [
  {
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => {
      const yarn = row.original;
      return (
        <Link href={`/dashboard/yarns/${yarn.id}`} className="hover:underline">
          {yarn.brand}
        </Link>
      );
    },
  },
  {
    accessorKey: "productLine",
    header: "Product Line",
    cell: ({ row }) => {
      const yarn = row.original;
      return (
        <Link href={`/dashboard/yarns/${yarn.id}`} className="hover:underline">
          {yarn.productLine}
        </Link>
      );
    },
  },
  {
    accessorKey: "currColor",
    header: "Current Color",
  },
  {
    accessorKey: "dyeStatus",
    header: "Dye Status",
    cell: ({ row }) => {
      const status = row.getValue("dyeStatus") as keyof typeof dyeStatusMap;
      return (
        <Badge variant="outline">
          {dyeStatusMap[status] || status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "materials",
    header: "Materials",
  },
  {
    accessorKey: "weight",
    header: "Weight",
  },
  {
    accessorKey: "yardsPerOz",
    header: "Yards/Oz",
  },
  {
    accessorKey: "totalWeight",
    header: "Total Weight (oz)",
  },
  {
    accessorKey: "totalYards",
    header: "Total Yards",
  },
  {
    id: "organization",
    header: "Organization",
    cell: ({ row }) => {
      const yarn = row.original;
      return (
        <div>
          {yarn.organization.map((org) => (
            <div key={org.id}>
              {org.type.name}: {org.quantity}
            </div>
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
            <Link href={`/dashboard/yarns/${yarn.id}`} passHref>
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </Link>
            <Link href={`/dashboard/yarns/${yarn.id}/edit`} passHref>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </Link>
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