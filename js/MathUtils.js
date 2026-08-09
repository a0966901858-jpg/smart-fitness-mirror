// js/MathUtils.js

class MathUtils {
    /**
     * 計算三點之間的夾角 (p2 為頂點)
     * 加入長寬比校正，解決手機直向與電腦橫向的座標失真問題
     */
    static getAngle(p1, p2, p3) {
        // 動態抓取當前螢幕的長寬比 (例如手機通常是 0.56，電腦通常是 1.77)
        const ratio = window.innerWidth / window.innerHeight;

        // 將 x 座標乘上比例尺，還原真實的物理幾何比例
        const x1 = p1.x * ratio;
        const y1 = p1.y;
        const x2 = p2.x * ratio;
        const y2 = p2.y;
        const x3 = p3.x * ratio;
        const y3 = p3.y;

        const radians = Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y1 - y2, x1 - x2);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        return angle;
    }

    /**
     * 計算兩點連線與水平線的夾角 (例如腳跟到腳尖)
     */
    static getHorizontalAngle(p1, p2) {
        const ratio = window.innerWidth / window.innerHeight;
        
        const x1 = p1.x * ratio;
        const y1 = p1.y;
        const x2 = p2.x * ratio;
        const y2 = p2.y;

        const radians = Math.atan2(y2 - y1, x2 - x1);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        return angle;
    }
}
