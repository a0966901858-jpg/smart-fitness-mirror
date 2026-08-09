class Squat {
    constructor() {
        this.name = '深蹲模式';
        this.count = 0;
        this.state = 'UP'; // 動作狀態機：'UP' (站立) 或 'DOWN' (蹲下)
        
        // 動作判定閥值 (Thresholds)
        this.UP_THRESHOLD = 160;       // 膝蓋伸直角度 (大於此角度視為站立)
        this.DOWN_THRESHOLD = 100;     // 膝蓋深蹲角度 (小於此角度視為進入深蹲)
        this.TOO_LOW_THRESHOLD = 70;   // [修正] 膝蓋過低角度 (小於 70 度判定為蹲太低)
        this.TORSO_LEAN_THRESHOLD = 45;// [修正] 軀幹前傾容許最大角度 (原為 35，放寬至 45 度)
    }

    // 重置計數
    reset() {
        this.count = 0;
        this.state = 'UP';
    }

    // 將名稱從 process 改為 processFrame 以符合 app.js 的呼叫
    processFrame(landmarks) {
        // MediaPipe Pose 節點索引：左側 (11 肩膀, 23 髖, 25 膝, 27 踝)
        const shoulder = landmarks[11];
        const hip = landmarks[23];
        const knee = landmarks[25];
        const ankle = landmarks[27];

        // 確保關鍵節點都在畫面上，避免計算錯誤
        if (!shoulder || !hip || !knee || !ankle) {
            return {
                modeText: `[自動切換] ${this.name}`,
                count: this.count,
                feedback: '請確保全身入鏡 (側對鏡頭)',
                color: 'red'
            };
        }

        // --- 核心數學計算 ---
        const kneeAngle = MathUtils.calculateAngle(hip, knee, ankle);
        const torsoAngle = MathUtils.calculateVerticalAngle(shoulder, hip);

        // --- 錯誤姿勢偵測 ---
        let feedback = '姿勢正確';
        let color = 'green';

        // 檢查軀幹是否過度前傾
        if (torsoAngle > this.TORSO_LEAN_THRESHOLD) {
            feedback = `❌ 軀幹過度前傾 (${Math.round(torsoAngle)}°)\n(請即時調整姿勢)`;
            color = 'red';
        }
        // 檢查是否蹲太低
        else if (kneeAngle < this.TOO_LOW_THRESHOLD) {
            feedback = '❌ 蹲太低了！臀部不可低於膝蓋\n(請即時調整姿勢)';
            color = 'red';
        }

        // --- 動作狀態機 (計算次數) ---
        if (this.state === 'UP' && kneeAngle < this.DOWN_THRESHOLD && kneeAngle >= this.TOO_LOW_THRESHOLD) {
            this.state = 'DOWN';
            if (color === 'green') {
                feedback = '保持穩定...';
                color = '#ffa500'; // 橘黃色
            }
        }
        
        if (this.state === 'DOWN' && kneeAngle > this.UP_THRESHOLD) {
            this.state = 'UP';
            if (color !== 'red') {
                this.count++;
                feedback = '✅ 完美！完成一次';
                color = '#00ff00'; // 亮綠色
            }
        }

        return {
            modeText: `[自動切換] ${this.name}`,
            count: this.count,
            feedback: feedback,
            color: color
        };
    }
}
