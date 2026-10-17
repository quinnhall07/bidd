"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MeResponse, OrganizationsResponse, Session } from "@/lib/contracts/auth";
import {
  LISTING_CONDITIONS,
  LISTING_SIZES,
  LISTING_TAGS,
  type FeedResponse,
  type ListingDetail,
  type ListingSummary,
} from "@/lib/contracts/listings";
import type { HandoffTokenResponse, Order, OrdersResponse } from "@/lib/contracts/orders";
import type { ChapterRequestsResponse, CupResponse } from "@/lib/contracts/community";

type Turnstile = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

type LogEntry = { at: string; label: string; status: number; body: unknown };

const box: React.CSSProperties = { border: "1px solid #ccc", borderRadius: 6, padding: 12, marginBottom: 12, maxWidth: 720 };
const input: React.CSSProperties = { padding: 6, marginRight: 8, minWidth: 260 };

export default function DevConsole({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [orgs, setOrgs] = useState<OrganizationsResponse["organizations"]>([]);
  const [displayName, setDisplayName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [draft, setDraft] = useState({ title: "", price: "", size: "M", condition: "like_new", tags: [] as string[] });
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [feed, setFeed] = useState<ListingSummary[]>([]);
  const [feedTag, setFeedTag] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [qr, setQr] = useState<Record<string, string>>({});
  const [scanned, setScanned] = useState("");
  const [cup, setCup] = useState<CupResponse | null>(null);
  const [requests, setRequests] = useState<ChapterRequestsResponse["requests"]>([]);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!turnstileSiteKey || !window.turnstile || !widgetRef.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: turnstileSiteKey,
      callback: setCaptchaToken,
      "expired-callback": () => setCaptchaToken(null),
    });
  }, [turnstileSiteKey]);

  useEffect(renderWidget, [renderWidget]);

  async function call(label: string, path: string, init: { method?: string; body?: unknown; token?: string } = {}) {
    const headers: Record<string, string> = {};
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    if (init.token) headers.Authorization = `Bearer ${init.token}`;
    const res = await fetch(path, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const body: unknown = await res.json().catch(() => null);
    // Never log tokens in the panel.
    const shown = body && typeof body === "object" && "session" in body ? { ...body, session: "[hidden]" } : body;
    setLog((l) => [{ at: new Date().toLocaleTimeString(), label, status: res.status, body: shown }, ...l].slice(0, 30));
    return { ok: res.ok, body };
  }

  async function requestCode() {
    await call("request-code", "/api/auth/request-code", {
      method: "POST",
      body: { email, ...(captchaToken ? { captchaToken } : {}) },
    });
    // Turnstile tokens are single-use.
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    setCaptchaToken(null);
  }

  async function verifyCode() {
    const r = await call("verify-code", "/api/auth/verify-code", { method: "POST", body: { email, code } });
    if (r.ok) {
      const s = (r.body as { session: Session }).session;
      setSession(s);
      await loadMe(s.accessToken);
    }
  }

  async function loadMe(token = session?.accessToken) {
    if (!token) return;
    const r = await call("me", "/api/me", { token });
    if (r.ok) setMe(r.body as MeResponse);
    const o = await call("organizations", "/api/organizations", { token });
    if (o.ok) setOrgs((o.body as OrganizationsResponse).organizations);
  }

  async function onboard() {
    if (!session) return;
    await call("onboarding", "/api/onboarding", {
      method: "POST",
      token: session.accessToken,
      body: { displayName, ...(orgId ? { organizationId: orgId } : {}) },
    });
    await loadMe();
  }

  async function refresh() {
    if (!session) return;
    const r = await call("refresh", "/api/auth/refresh", { method: "POST", body: { refreshToken: session.refreshToken } });
    if (r.ok) setSession((r.body as { session: Session }).session);
  }

  async function createListing() {
    if (!session) return;
    const r = await call("create listing", "/api/listings", {
      method: "POST",
      token: session.accessToken,
      body: {
        title: draft.title,
        priceCents: Math.round(Number(draft.price) * 100),
        size: draft.size,
        condition: draft.condition,
        tags: draft.tags,
      },
    });
    if (r.ok) setListing((r.body as { listing: ListingDetail }).listing);
  }

  async function reloadListing(id = listing?.id) {
    if (!session || !id) return;
    const r = await call("listing", `/api/listings/${id}`, { token: session.accessToken });
    if (r.ok) setListing((r.body as { listing: ListingDetail }).listing);
  }

  async function uploadPhoto(file: File) {
    if (!session || !listing) return;
    const form = new FormData();
    form.append("photo", file);
    const res = await fetch(`/api/listings/${listing.id}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: form,
    });
    const body: unknown = await res.json().catch(() => null);
    setLog((l) => [{ at: new Date().toLocaleTimeString(), label: "upload photo", status: res.status, body }, ...l].slice(0, 30));
    await reloadListing();
  }

  async function setStatus(status: "active" | "draft" | "removed") {
    if (!session || !listing) return;
    const r = await call(`set ${status}`, `/api/listings/${listing.id}`, { method: "PATCH", token: session.accessToken, body: { status } });
    if (r.ok) setListing((r.body as { listing: ListingDetail }).listing);
  }

  async function loadFeed() {
    if (!session) return;
    const qs = feedTag ? `?tag=${feedTag}` : "";
    const r = await call("feed", `/api/listings${qs}`, { token: session.accessToken });
    if (r.ok) setFeed((r.body as FeedResponse).listings);
  }

  async function loadOrders() {
    if (!session) return;
    const r = await call("orders", "/api/orders", { token: session.accessToken });
    if (r.ok) setOrders((r.body as OrdersResponse).orders);
  }

  async function buy(listingId: string) {
    if (!session) return;
    await call("checkout", "/api/checkout", { method: "POST", token: session.accessToken, body: { listingId } });
    await Promise.all([loadFeed(), loadOrders()]);
  }

  async function showQr(orderId: string) {
    if (!session) return;
    const r = await call("handoff token", `/api/orders/${orderId}/handoff-token`, { method: "POST", token: session.accessToken });
    if (r.ok) setQr((q) => ({ ...q, [orderId]: (r.body as HandoffTokenResponse).qrPayload }));
  }

  async function confirmHandoff() {
    if (!session) return;
    await call("confirm handoff", "/api/handoffs/confirm", { method: "POST", token: session.accessToken, body: { token: scanned } });
    setScanned("");
    await loadOrders();
  }

  async function cancelOrder(orderId: string) {
    if (!session) return;
    await call("cancel order", `/api/orders/${orderId}/cancel`, { method: "POST", token: session.accessToken });
    await loadOrders();
  }

  async function loadCup() {
    if (!session) return;
    const r = await call("cup", "/api/cup", { token: session.accessToken });
    if (r.ok) setCup(r.body as CupResponse);
  }

  async function report(listingId: string) {
    if (!session) return;
    await call("report", `/api/listings/${listingId}/report`, { method: "POST", token: session.accessToken, body: { reason: "other" } });
    await loadFeed();
  }

  async function block(userId: string) {
    if (!session) return;
    await call("block", "/api/blocks", { method: "POST", token: session.accessToken, body: { userId } });
    await loadFeed();
  }

  async function loadRequests() {
    if (!session) return;
    const r = await call("chapter requests", "/api/chapter/requests", { token: session.accessToken });
    if (r.ok) setRequests((r.body as ChapterRequestsResponse).requests);
  }

  async function decide(id: string, approve: boolean) {
    if (!session) return;
    await call(approve ? "approve" : "reject", `/api/chapter/requests/${id}`, { method: "POST", token: session.accessToken, body: { approve } });
    await loadRequests();
  }

  async function logout() {
    if (!session) return;
    await call("logout", "/api/auth/logout", { method: "POST", token: session.accessToken });
    setSession(null);
    setMe(null);
    setOrgs([]);
  }

  return (
    <main>
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onLoad={renderWidget} />
      )}
      <h1>Bidd /dev</h1>
      <p style={{ color: "#a00" }}>Test UI for the backend team. Not the product.</p>

      <section style={box}>
        <h2>1. Request a code</h2>
        <input style={input} type="email" placeholder="you@crimson.ua.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button onClick={requestCode} disabled={!email || (turnstileSiteKey !== null && !captchaToken)}>Send code</button>
        {turnstileSiteKey ? (
          <>
            <div ref={widgetRef} style={{ marginTop: 8 }} />
            <p><small>{captchaToken ? "Bot check passed. You can send." : "Wait for the bot check to pass before sending."}</small></p>
          </>
        ) : (
          <p><small>No Turnstile site key: sending without CAPTCHA.</small></p>
        )}
      </section>

      <section style={box}>
        <h2>2. Enter the code</h2>
        <input style={input} inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
        <button onClick={verifyCode} disabled={!email || !code}>Verify</button>
        {session && <p>Signed in. Token expires {new Date(session.expiresAt * 1000).toLocaleTimeString()}.</p>}
      </section>

      <section style={box}>
        <h2>3. Account</h2>
        <button onClick={() => loadMe()} disabled={!session}>Reload /api/me</button>{" "}
        <button onClick={refresh} disabled={!session}>Refresh session</button>{" "}
        <button onClick={logout} disabled={!session}>Log out</button>
        {me && (
          <div style={{ marginTop: 8, borderLeft: `6px solid ${me.campus.theme.primary ?? "#999"}`, paddingLeft: 8 }}>
            <strong>{me.user.displayName ?? "(no display name yet)"}</strong> · {me.user.email}
            <br />
            {me.campus.name} ({me.campus.conference}) · {me.badges.map((b) => b.label).join(", ")}
            <br />
            Chapters: {me.memberships.length ? me.memberships.map((m) => `${m.organization?.name ?? "?"} (${m.status})`).join(", ") : "none"}
          </div>
        )}
      </section>

      <section style={box}>
        <h2>4. Onboarding</h2>
        <input style={input} placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ padding: 6, marginRight: 8 }}>
          <option value="">No chapter</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <button onClick={onboard} disabled={!session || displayName.trim().length < 2}>Save</button>
      </section>

      <section style={box}>
        <h2>5. Sell</h2>
        <input style={input} placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input style={{ ...input, minWidth: 80, width: 80 }} placeholder="$ price" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
        <select value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} style={{ padding: 6, marginRight: 8 }}>
          {LISTING_SIZES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })} style={{ padding: 6 }}>
          {LISTING_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div style={{ margin: "8px 0" }}>
          {LISTING_TAGS.map((t) => (
            <label key={t} style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={draft.tags.includes(t)}
                onChange={(e) => setDraft({ ...draft, tags: e.target.checked ? [...draft.tags, t] : draft.tags.filter((x) => x !== t) })}
              />{" "}
              {t}
            </label>
          ))}
        </div>
        <button onClick={createListing} disabled={!session || draft.title.trim().length < 3 || !draft.price}>Create draft</button>
        {listing && (
          <div style={{ marginTop: 10 }}>
            <strong>{listing.title}</strong> · ${(listing.priceCents / 100).toFixed(2)} · {listing.size} · <em>{listing.status}</em>
            <div style={{ display: "flex", gap: 6, margin: "8px 0", flexWrap: "wrap" }}>
              {listing.photos.map((p) => p.url && <img key={p.id} src={p.url} alt="" width={90} height={90} style={{ objectFit: "cover", borderRadius: 4 }} />)}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />{" "}
            <button onClick={() => setStatus("active")}>Publish</button>{" "}
            <button onClick={() => setStatus("draft")}>Unpublish</button>{" "}
            <button onClick={() => setStatus("removed")}>Remove</button>
          </div>
        )}
      </section>

      <section style={box}>
        <h2>6. Campus feed</h2>
        <select value={feedTag} onChange={(e) => setFeedTag(e.target.value)} style={{ padding: 6, marginRight: 8 }}>
          <option value="">All tags</option>
          {LISTING_TAGS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button onClick={loadFeed} disabled={!session}>Load feed</button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 10 }}>
          {feed.map((l) => (
            <div key={l.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 6 }}>
              {l.coverUrl ? <img src={l.coverUrl} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4 }} /> : <div style={{ aspectRatio: "1", background: "#eee" }} />}
              <div style={{ fontSize: 13 }}>
                <strong>{l.title}</strong>
                <br />${(l.priceCents / 100).toFixed(2)} · {l.size}
                <br /><small>{l.seller.displayName ?? "Student"}</small>
              </div>
              <button onClick={() => buy(l.id)} style={{ marginTop: 4, width: "100%" }}>Buy</button>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <button onClick={() => report(l.id)} style={{ flex: 1, fontSize: 11 }}>Report</button>
                <button onClick={() => block(l.seller.id)} style={{ flex: 1, fontSize: 11 }}>Block seller</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={box}>
        <h2>7. Orders + meetup handoff</h2>
        <p><small>Payments aren&apos;t a feature yet: the buyer pays in person. The buyer shows a one-time QR code; the seller scans (pastes) it to complete the sale.</small></p>
        <button onClick={loadOrders} disabled={!session}>Load my orders</button>
        <ul>
          {orders.map((o) => (
            <li key={o.id} style={{ marginBottom: 8 }}>
              <strong>{o.listing?.title ?? "Listing"}</strong> · {o.role} · ${(o.totalCents / 100).toFixed(2)} · <em>{o.status}</em>{" "}
              {o.status === "pending_meetup" && o.role === "buyer" && <button onClick={() => showQr(o.id)}>Show QR</button>}{" "}
              {o.status === "pending_meetup" && <button onClick={() => cancelOrder(o.id)}>Cancel</button>}
              {qr[o.id] && <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", background: "#f4f4f4", padding: 6 }}>{qr[o.id]}</pre>}
            </li>
          ))}
        </ul>
        <input style={input} placeholder="Seller: paste the buyer's QR value" value={scanned} onChange={(e) => setScanned(e.target.value)} />
        <button onClick={confirmHandoff} disabled={!session || scanned.length < 20}>Confirm handoff</button>
      </section>

      <section style={box}>
        <h2>8. Closet Cup</h2>
        <button onClick={loadCup} disabled={!session}>Load standings</button>
        {cup && (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8 }}>
            <ol>
              <strong>{cup.campus.name}</strong>
              {cup.campus.standings.map((c) => (
                <li key={c.organizationId}>{c.name}: {c.points} pts ({c.sales} sales)</li>
              ))}
            </ol>
            <ol>
              <strong>Conference</strong>
              {cup.conference.map((c) => (
                <li key={c.campusId} style={{ fontWeight: c.isYourCampus ? 700 : 400 }}>{c.shortName}: {c.points} pts</li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section style={box}>
        <h2>9. Chapter officer</h2>
        <p><small>Only approved officers see requests. Make the first officer with the SQL in docs/API.md.</small></p>
        <button onClick={loadRequests} disabled={!session}>Load join requests</button>
        <ul>
          {requests.map((r) => (
            <li key={r.id}>
              {r.user.displayName ?? "Student"} → {r.organization.name}{" "}
              <button onClick={() => decide(r.id, true)}>Approve</button> <button onClick={() => decide(r.id, false)}>Reject</button>
            </li>
          ))}
        </ul>
      </section>

      <section style={box}>
        <h2>Responses</h2>
        {log.map((entry, i) => (
          <details key={i} open={i === 0}>
            <summary>
              {entry.at} {entry.label} → {entry.status}
            </summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(entry.body, null, 2)}</pre>
          </details>
        ))}
      </section>
    </main>
  );
}
