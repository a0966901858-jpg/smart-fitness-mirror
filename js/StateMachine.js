// JS 沒有 Enum，我們用常數物件來替代
const UIState = {
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green'
};

const ExerciseState = {
    IDLE: 'IDLE',
    DOWN: 'DOWN',
    UP: 'UP',
    HOLDING: 'HOLDING',
    COMPLETED: 'COMPLETED'
};

class PoseIssue {
    constructor(msg, pts) {
        this.msg = msg;
        this.pts = pts;
    }
}

class FeedbackState {
    constructor(text = "準備開始，請擺出動作...", color = UIState.RED) {
        this.text = text;
        this.color = color;
    }
}
