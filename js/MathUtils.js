class MathUtils {
    static getAngle(p1, p2, p3) {
        // 計算三點構成的角度 (p2 為頂點)
        let angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                    Math.atan2(p1.y - p2.y, p1.x - p2.x);
        angle = angle * (180 / Math.PI);
        angle = angle < 0 ? angle + 360 : angle;
        return angle > 180 ? 360 - angle : angle;
    }

    static getHorizontalAngle(p1, p2) {
        // 計算兩點與水平線的夾角
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        if (dx === 0) return 90.0;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }
}
