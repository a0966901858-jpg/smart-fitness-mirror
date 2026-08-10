// js/MathUtils.js

class MathUtils {
    /**
     * 計算三點之間的夾角 (p2 為頂點)
     * 核心修正：抓取相機真實的硬體解析度比例，不受 CSS 螢幕裁切影響
     */
    static getAngle(p1, p2, p3) {
        // 抓取真實的影片原始長寬比，若尚未載入則預設為 16:9 (1.777)
        const videoElement = document.getElementById('input_video');
        let ratio = 1280 / 720; 
        if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
            ratio = videoElement.videoWidth / videoElement.videoHeight;
        }

        // 將 x 座標乘上相機比例尺，還原真實的物理幾何比例
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
        const videoElement = document.getElementById('input_video');
        let ratio = 1280 / 720;
        if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
            ratio = videoElement.videoWidth / videoElement.videoHeight;
        }
        
        const x1 = p1.x * ratio;
        const y1 = p1.y;
        const x2 = p2.x * ratio;
        const y2 = p2.y;

        // 【關鍵修正】加上 Math.abs() 絕對值
        // 這樣無論面向左邊或右邊，算出來的角度都會是銳角 (0 ~ 90度)
        const dy = Math.abs(y2 - y1);
        const dx = Math.abs(x2 - x1);

        const radians = Math.atan2(dy, dx);
        return radians * 180.0 / Math.PI;
    }
}
