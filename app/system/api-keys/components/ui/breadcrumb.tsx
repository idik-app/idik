"use client";

import * as React from "react";
import Link from "next/link";

type BreadcrumbProps = {
  children: React.ReactNode;
  className?: string;
};

export function Breadcrumb({ children, className }: BreadcrumbProps) {
  return (
    <nav
      className={`flex items-center gap-1 text-sm text-cyan-400/80 ${
        className ?? ""
      }`}
      aria-label="breadcrumb"
    >
      {children}
    </nav>
  );
}

export function BreadcrumbItem({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center">{children}</span>;
}

export function BreadcrumbLink({
  href,
  children,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`transition-colors ${
        active ? "text-gold" : "text-cyan-400/70 hover:text-cyan-300"
      }`}
    >
      {children}
    </Link>
  );
}

export function BreadcrumbSeparator() {
  return <span className="mx-1 text-cyan-500/40">/</span>;
}
