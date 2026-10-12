import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { cardService } from "../services/cardService";
import { pendingCard } from "../utils/pendingCard";
import { getErrorMessage } from "../utils/validators";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import AuthLayout from "../components/layout/AuthLayout";
import { HandBadge } from "../components/cards/HandBadge";

const RESULT_TEXT = {
  OUTGOING_PENDING: "Request sent. You can call once they accept.",
  CONTACT: "You are now contacts. You can call each other.",
  INCOMING_PENDING:
    "They already asked to connect with you. Check your requests.",
  NONE: "Nothing changed.",
};

export const CardPage = () => {
  const { token } = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [dead, setDead] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    setDead(false);
    cardService
      .preview(token)
      .then((data) => {
        if (!cancelled) setCard(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          pendingCard.clear();
          setDead(true);
        } else {
          setError(getErrorMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Remember the link so login or signup can bring the person back here.
  useEffect(() => {
    if (!authLoading && !isAuthenticated && card) pendingCard.set(token);
  }, [authLoading, isAuthenticated, card, token]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await cardService.connect(token);
      pendingCard.clear();
      setResult(RESULT_TEXT[res.relationship] || RESULT_TEXT.NONE);
    } catch (err) {
      if (err?.response?.status === 404) setDead(true);
      else setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      {dead ? (
        <div className="text-center">
          <Alert variant="warning" className="mb-4">
            This card is no longer valid. Ask them for a new one.
          </Alert>
          <Link to="/" className="text-primary text-[13px] font-semibold">
            Go to SignBridge
          </Link>
        </div>
      ) : !card ? (
        <p className="text-center text-[13px] text-text-muted">
          {error || "Opening card..."}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <HandBadge
            badge={card.badge}
            color={card.color}
            size={112}
            label={`${card.name}'s hand badge`}
          />
          <div>
            <p className="text-[18px] font-semibold text-text-primary">
              {card.name}
            </p>
            <p className="text-[13px] text-text-secondary mt-1">
              wants to connect with you on SignBridge
            </p>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          {result && <Alert variant="success">{result}</Alert>}
          {!result && isAuthenticated && (
            <Button fullWidth isLoading={busy} onClick={connect}>
              Send contact request
            </Button>
          )}
          {!result && !isAuthenticated && !authLoading && (
            <div className="w-full flex flex-col gap-2">
              <Button fullWidth onClick={() => navigate("/login")}>
                Log in to connect
              </Button>
              <Link
                to="/signup"
                className="text-primary text-[13px] font-semibold"
              >
                New here? Create an account
              </Link>
            </div>
          )}
          {result && (
            <Link to="/" className="text-primary text-[13px] font-semibold">
              Go to SignBridge
            </Link>
          )}
        </div>
      )}
    </AuthLayout>
  );
};
