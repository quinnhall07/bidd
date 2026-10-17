// Empty states end in an action. The photo, when there is one, is from the empty pool (racks, hangers, closets).
import Image from "next/image";
import type { ReactNode } from "react";

export const EMPTY_PHOTOS = {
  rack: "/photos/pexels-10557065.jpg",
  closet: "/photos/pexels-14261308.jpg",
  hangers: "/photos/pexels-18984439.jpg",
};

export function EmptyState({
  title,
  body,
  actions,
  photo,
  size = "l",
}: {
  title: string;
  body: ReactNode;
  actions?: ReactNode;
  photo?: keyof typeof EMPTY_PHOTOS;
  size?: "l" | "s";
}) {
  if (!photo)
    return (
      <div className={`border-t-2 border-ink ${size === "l" ? "py-16 md:py-20" : "py-10"}`}>
        <h2 className={`display ${size === "l" ? "text-[clamp(2.5rem,5vw,4rem)]" : "text-[clamp(2rem,3.4vw,2.75rem)]"} max-w-[16ch]`}>{title}</h2>
        <div className="muted mt-4 max-w-[52ch] text-[clamp(16px,1.4vw,18px)] leading-relaxed">{body}</div>
        {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
      </div>
    );
  return (
    <div className="grid items-center gap-8 border-t-2 border-ink pt-8 md:grid-cols-12 md:gap-12 md:pt-10">
      <div className="media relative aspect-[4/3] overflow-hidden bg-[var(--gray-50)] md:col-span-6 md:aspect-[5/4]">
        <Image src={EMPTY_PHOTOS[photo]} alt="" fill sizes="(min-width: 760px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className="md:col-span-6 md:pr-8">
        <h2 className="display max-w-[14ch] text-[clamp(2.75rem,6vw,5.5rem)]">{title}</h2>
        <div className="muted mt-5 max-w-[46ch] text-[clamp(16px,1.5vw,19px)] leading-relaxed">{body}</div>
        {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}
