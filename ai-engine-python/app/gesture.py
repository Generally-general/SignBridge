import math


def vector(p1, p2):
    return (p2[0] - p1[0], p2[1] - p1[1])


def angle_between(v1, v2):
    """Angle in degrees between two 2D vectors."""
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    mag1 = math.sqrt(v1[0] ** 2 + v1[1] ** 2)
    mag2 = math.sqrt(v2[0] ** 2 + v2[1] ** 2)
    if mag1 == 0 or mag2 == 0:
        return 0
    cos_angle = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_angle))


def distance(pt1, pt2):
    return math.sqrt((pt1[0] - pt2[0]) ** 2 + (pt1[1] - pt2[1]) ** 2)


def finger_curl_angle(mcp, pip, tip):
    """
    Angle at the PIP joint between the MCP->PIP bone and the PIP->TIP bone.
    ~180deg = fully straight, small angle = fully curled into the palm.
    Robust to hand rotation/camera angle, unlike a single Y-axis comparison.
    """
    v1 = vector(mcp, pip)
    v2 = vector(pip, tip)
    # angle_between gives the angle at the "bend" - straight finger bends ~0deg between the two
    # bone vectors, curled finger bends close to 180deg. Convert so higher = straighter.
    bend = angle_between(v1, v2)
    return 180 - bend


# Thresholds (degrees). A finger reads as "up" if its curl angle is above STRAIGHT_THRESHOLD.
STRAIGHT_THRESHOLD = 140
CURLED_THRESHOLD = 100


def finger_state(mcp, pip, tip):
    angle = finger_curl_angle(mcp, pip, tip)
    if angle >= STRAIGHT_THRESHOLD:
        return "up"
    if angle <= CURLED_THRESHOLD:
        return "down"
    return "mid"


def detect_gesture(landmarks):
    thumb_cmc, thumb_mcp, thumb_ip, thumb_tip = landmarks[1], landmarks[2], landmarks[3], landmarks[4]
    index_mcp, index_pip, index_tip = landmarks[5], landmarks[6], landmarks[8]
    middle_mcp, middle_pip, middle_tip = landmarks[9], landmarks[10], landmarks[12]
    ring_mcp, ring_pip, ring_tip = landmarks[13], landmarks[14], landmarks[16]
    pinky_mcp, pinky_pip, pinky_tip = landmarks[17], landmarks[18], landmarks[20]
    wrist = landmarks[0]

    # Palm width - used to normalize all distance-based measurements so they're
    # scale-invariant regardless of how close the hand is to the camera.
    palm_width = distance(index_mcp, pinky_mcp)
    if palm_width == 0:
        return "UNKNOWN"

    # 1. Finger states via joint angle, not a single-axis comparison
    index_state = finger_state(index_mcp, index_pip, index_tip)
    middle_state = finger_state(middle_mcp, middle_pip, middle_tip)
    ring_state = finger_state(ring_mcp, ring_pip, ring_tip)
    pinky_state = finger_state(pinky_mcp, pinky_pip, pinky_tip)

    index_up = index_state == "up"
    middle_up = middle_state == "up"
    ring_up = ring_state == "up"
    pinky_up = pinky_state == "up"

    # 2. Thumb - curl angle at the IP joint (thumb only has 2 real bends: MCP and IP)
    thumb_curl = finger_curl_angle(thumb_mcp, thumb_ip, thumb_tip)
    thumb_is_up = thumb_curl >= STRAIGHT_THRESHOLD and thumb_tip[1] < thumb_mcp[1]

    # Thumb "out" (extended sideways, away from the palm) - normalized by palm width
    # instead of raw pixel distance, so it works at any distance from the camera.
    thumb_spread = distance(thumb_tip, index_mcp) / palm_width
    thumb_out = thumb_spread > 0.9

    # 3. Pinch distance, normalized
    thumb_index_dist = distance(thumb_tip, index_tip) / palm_width
    is_pinch_ok = thumb_index_dist < 0.35

    # 4. Finger spread (index-middle gap), normalized - distinguishes tightly-closed
    # vs spread fingers even when curl states look identical
    index_middle_spread = distance(index_tip, middle_tip) / palm_width

    # --- GESTURE LOGIC (same 16 gestures, robust inputs) ---

    if is_pinch_ok and middle_up and ring_up and pinky_up:
        return "OK"

    if index_up and pinky_up and not middle_up and not ring_up and thumb_out:
        return "I_LOVE_YOU"

    if index_up and pinky_up and not middle_up and not ring_up and not thumb_out:
        return "ROCK"

    if thumb_is_up and not index_up and not middle_up and not ring_up and not pinky_up:
        return "THUMBS_UP"

    if thumb_out and pinky_up and not index_up and not middle_up and not ring_up:
        return "CALL_ME"

    if index_up and pinky_up and thumb_out and not middle_up and not ring_up:
        return "SPIDERMAN"

    if index_up and thumb_out and not middle_up and not ring_up and not pinky_up:
        return "L_OR_GUN"

    if index_up and middle_up and not ring_up and not pinky_up:
        if index_middle_spread < 0.6:
            return "LETTER_R"
        return "PEACE"

    if index_up and middle_up and ring_up and not pinky_up:
        return "THREE"

    if index_up and middle_up and ring_up and pinky_up and not thumb_out:
        return "FOUR"

    if index_up and middle_up and ring_up and pinky_up and thumb_out:
        return "HELLO"

    if index_up and not middle_up and not ring_up and not pinky_up:
        return "ONE"

    if pinky_up and not index_up and not middle_up and not ring_up:
        return "LETTER_I"

    if not index_up and not middle_up and not ring_up and not pinky_up:
        return "FIST"

    return "UNKNOWN"