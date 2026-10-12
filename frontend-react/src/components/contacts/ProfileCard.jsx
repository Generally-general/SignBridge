import React, { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { UsernameField } from "./UsernameField";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import { getErrorMessage } from "../../utils/validators";
import { initialOf } from "../../utils/contactsUi";
import { SettingRow, SettingsSection, Toggle } from "../settings/controls";

const BLOCKING = ["invalid", "taken", "checking"];

// Display name, username and "let people find me" - saved to the server, not to this browser.
export const ProfileCard = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [searchable, setSearchable] = useState(true);
  const [usernameState, setUsernameState] = useState("idle");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  // Older sessions were created before usernames existed: fetch the profile once.
  useEffect(() => {
    if (user?.id && !user.username) {
      userService
        .getMe()
        .then(updateUser)
        .catch(() => {});
    }
  }, [user?.id, user?.username, updateUser]);

  useEffect(() => {
    setName(user?.fullName || "");
    setUsername(user?.username || "");
    setSearchable(user?.searchable !== false);
  }, [user?.fullName, user?.username, user?.searchable]);

  const savedSearchable = user?.searchable !== false;
  const changes = {};
  if (name.trim() && name.trim() !== (user?.fullName || ""))
    changes.fullName = name.trim();
  if (username && username !== (user?.username || ""))
    changes.username = username;
  if (searchable !== savedSearchable) changes.searchable = searchable;
  const dirty = Object.keys(changes).length > 0;
  const blocked = "username" in changes && BLOCKING.includes(usernameState);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await userService.updateProfile(changes);
      updateUser(updated);
      setMessage({ type: "success", text: "Profile saved" });
    } catch (e) {
      setMessage({ type: "error", text: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      id="profile"
      title="Profile"
      description="People add you by your username. Your email address is never shown to other people."
    >
      <div className="p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[22px] font-bold shrink-0">
          {initialOf(user?.fullName || user?.username)}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-text-primary truncate">
            {user?.fullName}
          </p>
          <p className="text-[12px] text-text-muted truncate">
            {user?.username ? `@${user.username}` : ""}
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="profile-name"
            className="text-[13px] font-semibold text-text-primary"
          >
            Display name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            className="h-11 bg-background border border-border rounded-standard px-3 text-[13px] text-text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <UsernameField
          tone="app"
          value={username}
          onChange={setUsername}
          onStatusChange={setUsernameState}
          currentUsername={user?.username || ""}
        />
      </div>

      <SettingRow
        title="Let people find me by searching"
        hint="If this is off, only people who type my full username can find me."
      >
        <Toggle
          label="Let people find me by searching"
          checked={searchable}
          onChange={setSearchable}
        />
      </SettingRow>

      <div className="p-4 flex flex-wrap items-center gap-3">
        <Button onClick={save} isLoading={saving} disabled={!dirty || blocked}>
          Save profile
        </Button>
        {dirty && !saving && (
          <span className="text-[12px] text-text-muted">
            You have unsaved changes
          </span>
        )}
        {message && (
          <Alert
            variant={message.type}
            className="!w-auto !py-2 !px-3 !text-[12px]"
          >
            {message.text}
          </Alert>
        )}
      </div>
    </SettingsSection>
  );
};
