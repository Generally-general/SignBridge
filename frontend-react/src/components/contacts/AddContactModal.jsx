import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "../ui/Modal";
import { contactService } from "../../services/contactService";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  initialOf,
  normalizeUsername,
  relationshipAction,
} from "../../utils/contactsUi";
import { getErrorMessage } from "../../utils/validators";

const TONES = {
  primary: "bg-primary text-white hover:bg-primary/90",
  success: "bg-success text-white hover:bg-success/90",
  muted: "bg-muted text-text-muted cursor-default",
};

// Find people by username and send them a contact request.
export const AddContactModal = ({ isOpen, onClose, onChanged }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null); // username whose request is in flight
  const debounced = useDebouncedValue(query, 350);
  const ticket = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setError("");
      setBusy(null);
      setSearching(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const mine = ++ticket.current; // only the newest search may update the list
    const q = normalizeUsername(debounced);
    if (!isOpen || q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    setError("");
    contactService
      .search(q)
      .then((found) => {
        if (ticket.current === mine) setResults(found);
      })
      .catch((e) => {
        if (ticket.current === mine) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (ticket.current === mine) setSearching(false);
      });
  }, [debounced, isOpen]);

  const act = async (item) => {
    setBusy(item.username);
    setError("");
    try {
      // asking someone who already asked you simply accepts their request
      const { relationship } = await contactService.send(item.username);
      setResults((prev) =>
        prev.map((r) =>
          r.username === item.username ? { ...r, relationship } : r,
        ),
      );
      onChanged?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const typed = normalizeUsername(query);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add contact" size="md">
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username"
          aria-label="Search by username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full h-10 bg-background border border-border rounded-standard py-2 pl-9 pr-3 text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-all"
        />
      </div>

      {error && <p className="text-[12px] text-danger mb-2">{error}</p>}

      <div className="flex flex-col gap-2 min-h-[120px] max-h-72 overflow-y-auto">
        {typed.length > 0 && typed.length < 3 && (
          <p className="text-[12px] text-text-muted text-center py-6">
            Type at least 3 characters
          </p>
        )}
        {typed.length === 0 && (
          <p className="text-[12px] text-text-muted text-center py-6">
            Ask your friend for their username, then search for it here.
          </p>
        )}
        {searching && (
          <p className="text-[12px] text-text-muted text-center py-6">
            Searching...
          </p>
        )}
        {!searching && typed.length >= 3 && results.length === 0 && !error && (
          <p className="text-[12px] text-text-muted text-center py-6">
            No one found. Check the spelling, or ask them for the exact
            username.
          </p>
        )}

        {!searching &&
          results.map((item) => {
            const action = relationshipAction(item.relationship);
            return (
              <div
                key={item.username}
                className="flex items-center gap-3 p-3 bg-background border border-border rounded-standard"
              >
                <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center text-text-primary font-semibold text-[13px] shrink-0">
                  {initialOf(item.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium truncate text-[13px]">
                    {item.fullName}
                  </p>
                  <p className="text-text-muted truncate text-[11px]">
                    @{item.username}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={action.disabled || busy === item.username}
                  onClick={() => act(item)}
                  className={`shrink-0 px-3 py-1.5 rounded-standard text-[12px] font-bold transition-all disabled:opacity-100 ${TONES[action.tone]}`}
                >
                  {busy === item.username ? "..." : action.label}
                </button>
              </div>
            );
          })}
      </div>
    </Modal>
  );
};
