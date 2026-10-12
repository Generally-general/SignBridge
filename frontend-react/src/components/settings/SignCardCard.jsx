import React, { useCallback, useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { HandBadge } from "../cards/HandBadge";
import { cardService } from "../../services/cardService";
import {
  BADGE_IDS,
  BADGE_LABELS,
  COLORS,
  COLOR_IDS,
} from "../../utils/handBadges";
import { getErrorMessage } from "../../utils/validators";
import { SettingsSection } from "./controls";

const EXPIRY = [
  ["DAY", "1 day"],
  ["WEEK", "1 week"],
  ["MONTH", "30 days"],
  ["NEVER", "No expiry"],
];
const USES = [
  [1, "1 person"],
  [5, "5 people"],
  [20, "20 people"],
  [0, "Unlimited"],
];

const selectClass =
  "h-11 w-full bg-background border border-border rounded-standard px-3 text-[13px] text-text-primary focus:outline-none focus:border-primary";

export const SignCardCard = () => {
  const [card, setCard] = useState(undefined); // undefined = loading, null = none
  const [badge, setBadge] = useState("open");
  const [color, setColor] = useState("sky");
  const [expiry, setExpiry] = useState("MONTH");
  const [maxUses, setMaxUses] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [qr, setQr] = useState(null);

  const adopt = useCallback((c) => {
    setCard(c);
    if (c) {
      setBadge(c.badge);
      setColor(c.color);
      setMaxUses(c.maxUses ?? 0);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    cardService
      .mine()
      .then((c) => !cancelled && adopt(c))
      .catch((err) => {
        if (!cancelled) {
          setCard(null);
          setError(getErrorMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  const link = card ? `${window.location.origin}/c/${card.token}` : "";

  useEffect(() => {
    let cancelled = false;
    setQr(null);
    if (!link) return undefined;
    import("qrcode")
      .then((m) => (m.default || m).toDataURL(link, { margin: 1, width: 192 }))
      .then((url) => !cancelled && setQr(url))
      .catch(() => {
        /* no QR: the link and Copy still work */
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  const run = async (fn, message) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await fn();
      if (message) setNote(message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(async () =>
      adopt(await cardService.save({ badge, color, expiry, maxUses })),
    );
  const saveLook = () =>
    run(async () => adopt(await cardService.save({ badge, color })), "Saved");
  const saveLimits = (regenerate) =>
    run(
      async () =>
        adopt(await cardService.save({ expiry, maxUses, regenerate })),
      regenerate ? "New link created. The old one no longer works." : "Saved",
    );
  const turnOff = () =>
    run(async () => {
      await cardService.turnOff();
      setCard(null);
    }, "Card turned off. The link no longer works.");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setNote("Link copied");
    } catch {
      setNote("Copy failed. Select the link and copy it.");
    }
  };
  const share = () => {
    const text = "Connect with me on SignBridge";
    if (navigator.share) {
      navigator.share({ title: "SignBridge", text, url: link }).catch(() => {});
    } else {
      copy();
    }
  };

  const expiryText = !card
    ? ""
    : card.expiresAt
      ? `Works until ${new Date(card.expiresAt + "Z").toLocaleDateString()}`
      : "Never expires";
  const usesText = !card
    ? ""
    : card.maxUses
      ? `${card.uses} of ${card.maxUses} uses`
      : `${card.uses} uses so far`;

  return (
    <SettingsSection
      id="card"
      title="Sign card"
      description="A link that lets someone ask to connect with you. They still need your approval before they can call."
      bare
    >
      {card === undefined ? (
        <p className="text-[13px] text-text-muted">Loading...</p>
      ) : (
        <div className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}
          {note && <Alert variant="success">{note}</Alert>}

          <div className="flex items-center gap-4">
            <HandBadge
              badge={badge}
              color={color}
              size={88}
              label="Card preview"
            />
            <p className="text-[12px] text-text-muted">
              This hand shows on your card. Pick a shape and colour.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Hand shape"
            className="grid grid-cols-6 gap-2"
          >
            {BADGE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={badge === id}
                aria-label={BADGE_LABELS[id]}
                title={BADGE_LABELS[id]}
                onClick={() => setBadge(id)}
                className={`rounded-card p-1 border-2 ${
                  badge === id ? "border-primary" : "border-transparent"
                }`}
              >
                <HandBadge
                  badge={id}
                  color={color}
                  size={48}
                  animate={false}
                  label={BADGE_LABELS[id]}
                />
              </button>
            ))}
          </div>

          <div
            role="radiogroup"
            aria-label="Colour"
            className="flex flex-wrap gap-2"
          >
            {COLOR_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={color === id}
                aria-label={id}
                onClick={() => setColor(id)}
                style={{ background: COLORS[id].fg }}
                className={`w-8 h-8 rounded-full border-2 ${
                  color === id ? "border-text-primary" : "border-transparent"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-[12px] text-text-secondary flex flex-col gap-1.5">
              Link works for
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className={selectClass}
              >
                {EXPIRY.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] text-text-secondary flex flex-col gap-1.5">
              Can be used by
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className={selectClass}
              >
                {USES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {card === null ? (
            <Button isLoading={busy} onClick={create}>
              Create my card
            </Button>
          ) : (
            <>
              <div className="flex gap-4 items-start">
                {qr && (
                  <img
                    src={qr}
                    alt="QR code for your card link"
                    width={96}
                    height={96}
                    className="rounded-standard border border-border"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                    aria-label="Card link"
                    className="w-full h-11 bg-background border border-border rounded-standard px-3 text-[12px] text-text-primary"
                  />
                  <p className="text-[12px] text-text-muted">
                    {expiryText} · {usesText}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={copy}>
                      <Copy className="inline w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button onClick={share}>
                      <Share2 className="inline w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button isLoading={busy} onClick={saveLook}>
                  Save look
                </Button>
                <Button isLoading={busy} onClick={() => saveLimits(false)}>
                  Save limits
                </Button>
                <Button isLoading={busy} onClick={() => saveLimits(true)}>
                  New link
                </Button>
                <Button variant="danger" isLoading={busy} onClick={turnOff}>
                  Turn off
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </SettingsSection>
  );
};
