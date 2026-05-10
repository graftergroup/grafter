import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabContext } from "@/hooks/useTabs";

export function TabBar() {
  const { tabs, closeTab, closeAll } = useTabContext();
  const location = useLocation();

  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-center h-9 flex-shrink-0 overflow-hidden select-none"
      style={{
        background: "hsl(var(--sidebar-bg))",
        borderBottom: "1px solid hsl(var(--border))",
      }}
    >
      {/* Scrollable tab strip */}
      <div className="flex items-end h-full overflow-x-auto flex-1 min-w-0"
           style={{ scrollbarWidth: "none" }}>
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <div
              key={tab.path}
              className={cn(
                "relative flex items-center flex-shrink-0 h-full group nav-transition",
                "border-r",
                active ? "bg-background" : "hover:bg-[hsl(var(--muted))]"
              )}
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {/* Active top-border indicator */}
              {active && (
                <span
                  className="absolute top-0 left-0 right-0 h-0.5 rounded-b-none"
                  style={{ background: "hsl(var(--amber))" }}
                />
              )}

              <Link
                to={tab.path}
                className={cn(
                  "pl-4 pr-2 text-xs font-medium whitespace-nowrap nav-transition leading-none",
                  active
                    ? "text-foreground"
                    : "text-[hsl(var(--muted-foreground))] hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeTab(tab.path);
                }}
                className={cn(
                  "mr-2 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 nav-transition",
                  "text-[hsl(var(--muted-foreground))] hover:text-foreground",
                  "hover:bg-[hsl(var(--accent))]",
                  !active && "opacity-0 group-hover:opacity-100"
                )}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Close all */}
      {tabs.length > 1 && (
        <button
          onClick={closeAll}
          className="flex-shrink-0 px-3 text-xs nav-transition whitespace-nowrap"
          style={{ color: "hsl(var(--muted-foreground))" }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "hsl(var(--foreground))")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "hsl(var(--muted-foreground))")}
        >
          Close all
        </button>
      )}
    </div>
  );
}
