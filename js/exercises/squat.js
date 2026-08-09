// js/exercises/squat.js

class SquatExercise {
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

    // 處理每一幀的骨架資料
    process(landmarks) {
        // MediaPipe Pose 節點索引：左側 (11 肩膀, 23 髖, 25 膝, 27 踝)，右側 (12, 24, 26, 28)
        // 實務上通常取左右兩側在 Z 軸上較靠近鏡頭的一側，這裡以左側為代表
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

        // --- 核心數學計算 (調用 MathUtils.js) ---
        // 1. 膝蓋夾角 (髖關節 - 膝蓋 - 腳踝)
        const kneeAngle = MathUtils.calculateAngle(hip, knee, ankle);
        // 2. 軀幹與垂直線的夾角 (測量前傾程度)
        const torsoAngle = MathUtils.calculateVerticalAngle(shoulder, hip);


        // --- 錯誤姿勢偵測 ---
        let feedback = '姿勢正確';
        let color = 'green';

        // [修正邏輯 1]：檢查軀幹是否過度前傾 (容錯率放寬至 45 度)
        if (torsoAngle > this.TORSO_LEAN_THRESHOLD) {
            feedback = `❌ 軀幹過度前傾 (${Math.round(torsoAngle)}°)\n(請即時調整姿勢)`;
            color = 'red';
        }
        // [修正邏輯 2]：檢查是否蹲太低 (改用膝蓋夾角小於 70 度作為判定基準)
        else if (kneeAngle < this.TOO_LOW_THRESHOLD) {
            feedback = '❌ 蹲太低了！臀部不可低於膝蓋\n(請即時調整姿勢)';
            color = 'red';
        }


        // --- 動作狀態機 (計算次數) ---
        // 當處於站立狀態，且膝蓋角度小於深蹲閥值，且沒有蹲過低時，進入 DOWN 狀態
        if (this.state === 'UP' && kneeAngle < this.DOWN_THRESHOLD && kneeAngle >= this.TOO_LOW_THRESHOLD) {
            this.state = 'DOWN';
            if (color === 'green') { // 只有姿勢正確時才給予鼓勵提示
                feedback = '保持穩定...';
                color = '#ffa500'; // 橘黃色
            }
        }
        
        // 當處於深蹲狀態，且膝蓋角度恢復到站立閥值以上時，完成一次完整動作
        if (this.state === 'DOWN' && kneeAngle > this.UP_THRESHOLD) {
            this.state = 'UP';
            
            // 只有在沒有觸發紅字警告時，才計入成功次數
            if (color !== 'red') {
                this.count++;
                feedback = '✅ 完美！完成一次';
                color = '#00ff00';
            }
        }

        // 回傳處理結果，供 app.js 更新儀表板 UI
        return {
            modeText: `[自動切換] ${this.name}`,
            count: this.count,
            feedback: feedback,
            color: color
        };
    }
}

// 匯出物件供主程式使用
window.squatExercise = new SquatExercise();
