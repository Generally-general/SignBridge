import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, KeyRound, Type, User, Video } from "lucide-react";
import { ProfileCard } from "../components/contacts/ProfileCard";
import { ChangePasswordCard } from "../components/settings/ChangePasswordCard";
import { CallAlertsCard } from "../components/settings/CallAlertsCard";
import { DevicesCard } from "../components/settings/DevicesCard";
import { CaptionsCard } from "../components/settings/CaptionsCard";

const SECTIONS = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "alerts", label: "Call alerts", Icon: Bell },
  { id: "devices", label: "Camera and audio", Icon: Video },
  { id: "captions", label: "Speech captions", Icon: Type },
  { id: "security", label: "Password", Icon: KeyRound },
];

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(SECTIONS[0].id);

  // Highlight the section that is currently in view.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const seen = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        const first = SECTIONS.find((s) => seen.get(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const go = (id) => {
    setActive(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-full text-text-secondary hover:bg-muted transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[24px] font-bold text-text-primary">Settings</h1>
        </div>

        <div className="md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-10">
          <nav
            aria-label="Settings sections"
            className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-6 bg-background/90 backdrop-blur flex gap-2 overflow-x-auto md:mx-0 md:px-0 md:py-0 md:mb-0 md:top-6 md:self-start md:flex-col md:gap-1 md:overflow-visible md:bg-transparent"
          >
            {SECTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active === id ? "true" : undefined}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-standard text-[13px] font-medium whitespace-nowrap transition-colors ${
                  active === id
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="space-y-10 min-w-0 pb-16">
            <ProfileCard />
            <ChangePasswordCard />
            <CallAlertsCard />
            <DevicesCard />
            <CaptionsCard />
          </div>
        </div>
      </div>
    </div>
  );
};
