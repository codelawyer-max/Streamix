import * as React from "react";

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div>{children}</div>;
}

export function DropdownMenuTrigger({
  children,
}: DropdownMenuProps) {
  return <>{children}</>;
}

export function DropdownMenuContent({
  children,
}: DropdownMenuProps) {
  return (
    <div className="absolute bg-white shadow-lg rounded-lg p-2">
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
}: DropdownMenuProps) {
  return (
    <div className="px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
      {children}
    </div>
  );
}
