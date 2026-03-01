def finger_is_up(tip, pip):
    return tip[1] < pip[1]


def detect_gesture(landmarks):

    # landmarks = [[x,y,z], ...]

    thumb_tip = landmarks[4]
    index_tip = landmarks[8]
    middle_tip = landmarks[12]
    ring_tip = landmarks[16]
    pinky_tip = landmarks[20]

    index_pip = landmarks[6]
    middle_pip = landmarks[10]
    ring_pip = landmarks[14]
    pinky_pip = landmarks[18]

    fingers = [
        finger_is_up(index_tip, index_pip),
        finger_is_up(middle_tip, middle_pip),
        finger_is_up(ring_tip, ring_pip),
        finger_is_up(pinky_tip, pinky_pip),
    ]

    # Example gestures
    if fingers == [True, True, True, True]:
        return "HELLO"

    if fingers == [True, False, False, False]:
        return "ONE"

    if fingers == [True, True, False, False]:
        return "TWO"

    if fingers == [False, False, False, False]:
        return "FIST"

    return "UNKNOWN"