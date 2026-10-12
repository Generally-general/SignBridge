import math


def distance(pt1, pt2):
    return math.sqrt((pt1[0] - pt2[0]) ** 2 + (pt1[1] - pt2[1]) ** 2)


class EmotionDetector:
    """
    Rule-based emotion signal from hand motion energy across a gesture window.
    Not facial-expression based (this pipeline only has hand landmarks) -
    approximates intensity/urgency from how much and how fast the hand moved,
    which is the honest signal actually available here.
    """

    def detect(self, landmarks=None):
        if not landmarks or len(landmarks) < 2:
            return "neutral"

        total_motion = 0.0
        frame_count = 0

        for prev_frame, curr_frame in zip(landmarks, landmarks[1:]):
            if len(prev_frame) != len(curr_frame):
                continue
            frame_motion = sum(
                distance(prev_frame[i], curr_frame[i]) for i in range(len(curr_frame))
            )
            total_motion += frame_motion
            frame_count += 1

        if frame_count == 0:
            return "neutral"

        avg_motion = total_motion / frame_count

        if avg_motion > 0.35:
            return "urgent"
        if avg_motion > 0.15:
            return "engaged"
        return "neutral"