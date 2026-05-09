import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchFilterProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

export function SearchFilter({
  placeholder = "Search...",
  value,
  onChange,
  onClear,
}: SearchFilterProps) {
  return (
    <div className="relative flex items-center gap-2">
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
      {value && onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-1"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
