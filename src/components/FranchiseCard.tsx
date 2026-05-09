import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FranchiseCardData {
  id: string;
  name: string;
  email: string;
  city?: string;
  state?: string;
  is_active: boolean;
  approval_status: string;
  subscription_status: string;
}

interface FranchiseCardProps {
  franchise: FranchiseCardData;
  onEdit: (franchise: FranchiseCardData) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

export function FranchiseCard({
  franchise,
  onEdit,
  onToggleActive,
  onDelete,
}: FranchiseCardProps) {
  const statusColor = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
  };

  const subscriptionColor = {
    active: "bg-blue-100 text-blue-800",
    suspended: "bg-orange-100 text-orange-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{franchise.name}</CardTitle>
            <CardDescription className="text-sm mt-1">{franchise.email}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(franchise)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive(franchise.id, !franchise.is_active)}
              >
                {franchise.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(franchise.id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(franchise.city || franchise.state) && (
          <div className="text-sm text-muted-foreground">
            {[franchise.city, franchise.state].filter(Boolean).join(", ")}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={statusColor[franchise.approval_status as keyof typeof statusColor] || ""}
          >
            {franchise.approval_status}
          </Badge>
          <Badge
            variant="outline"
            className={
              subscriptionColor[franchise.subscription_status as keyof typeof subscriptionColor] || ""
            }
          >
            {franchise.subscription_status}
          </Badge>
          <Badge variant="outline">
            {franchise.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
