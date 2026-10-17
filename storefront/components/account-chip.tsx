"use client";
// Header account state. A real (live) session shows the student's name and Sign out; a demo campus shows a Demo tag
// with "Create account"; signed out falls back to the server-rendered Sign in pill passed as children.
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut, useSessionUser } from "@/lib/session-user";

export function AccountChip({ demoCampus, children }: { demoCampus: boolean; children: ReactNode }) {
  const me = useSessionUser();

  if (me) {
    const name = me.user.displayName || me.user.email.split("@")[0];
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Link href={`/?school=${me.campus.slug}`} className="chip chip-quiet max-w-[180px] truncate" title={`${me.user.email} · ${me.campus.fullName}`}>
          {name} · {me.campus.name}
        </Link>
        <button type="button" onClick={() => signOut()} className="text-[14px] font-semibold text-[var(--gray-600)] hover:text-ink">
          Sign out
        </button>
      </div>
    );
  }

  if (demoCampus) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <span className="stamp">Demo</span>
        <Link href="/login" className="text-[14px] font-semibold underline-offset-4 hover:underline">
          Create account
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
