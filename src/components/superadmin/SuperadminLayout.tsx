import { ReactNode } from "react";
import { SuperadminSidebar } from "./SuperadminSidebar";

export function SuperadminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <SuperadminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="border-b border-border bg-card h-16 flex items-center px-6">
          <h1 className="text-lg font-semibold text-foreground">Platform Administration</h1>
        </div>
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
