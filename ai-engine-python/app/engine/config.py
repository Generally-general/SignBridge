from dataclasses import dataclass


@dataclass(frozen=True)
class EngineConfig:
    """Tunable behaviour of the sign-to-sentence engine.

    Values are initial engineering choices (not validated on a dataset yet);
    they are meant to be tuned against recorded sessions.
    """

    hold_ms: float = 450.0  # a pose must dominate this long to count as a sign
    min_agreement: float = 0.7  # share of frames in the hold window that must agree
    unlatch_agreement: float = (
        0.3  # a latched pose is released once its share falls below this
    )
    gap_ms: float = (
        400.0  # no frames for this long = the hand left; clears hold + latch
    )
    pause_ms: float = 1600.0  # no new sign for this long ends the utterance
    max_words: int = 12  # utterance is closed when it reaches this many signs
    session_ttl_s: float = 600.0  # idle sessions are dropped after this long
    uncertain_below: float = (
        0.8  # signs recognised with less confidence are reported as uncertain
    )
    collapse_repeats: bool = (
        True  # an immediate repeat of the same sign reads as one word
    )

    # ---- Indian Sign Language recognizer (word level): cutting the camera stream into signs.
    # Initial engineering values, meant to be tuned against real recordings (see the debug log).
    isl_start_ms: float = 120.0      # hands must be in view this long before a sign starts
    isl_gap_ms: float = 350.0        # hands out of view for this long ends the sign
    isl_still_ms: float = 600.0      # hands in view but not moving this long ends a sign that has moved
    isl_min_ms: float = 800.0        # shorter than this is not a sign (the training signs lasted 1.8 s or more)
    isl_max_ms: float = 5000.0       # a longer movement is cut here
    isl_move_speed: float = 3.0      # hand speed (palm widths per second) that counts as "moving"
    isl_still_speed: float = 1.5     # below this speed the hands count as "still" (landmark jitter is about 1)
    isl_min_extent: float = 0.8      # the hands must travel at least this many palm widths during the sign
    isl_lead_ms: float = 0.0         # "no hands" padding before the sign: the training videos had none
    isl_trail_ms: float = 0.0        # ... and after it
    isl_accept_prob: float = 0.50    # a sign is only accepted when the best guess is at least this likely
    isl_min_margin: float = 0.10     # ... and this far ahead of the second guess
