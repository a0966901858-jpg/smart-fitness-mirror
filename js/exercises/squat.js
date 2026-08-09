// js/exercises/squat.js

class Squat {
    constructor() {
        this.count = 0;
        this.state = ExerciseState.IDLE;
        // 確保狀態變數在實例化時正確初始化，避免執行時標籤卡死
        this.hit_target_depth = false;
        
        // 替代原本 ExerciseConfig 的參數
        this.SQUAT_FOOT_MAX_ANGLE = 35;
        this.SQUAT_TRUNK_MAX_ANGLE = 35;
    }

    getWorkingLeg(lmList) {
        /*
        動態取得靠近鏡頭的受力腳。
        將提取邏輯獨立，確保每幀的座標與邊界都是即時抓取，防止運算下/上限時發生延遲或未更新。
        */
        const l_z = lmList[23].z + lmList[25].z + lmList[27].z;
        const r_z = lmList[24].z + lmList[26].z + lmList[28].z;
        
        if (l_z < r_z) {
            return {hip: lmList[23], knee: lmList[25], ankle: lmList[27], heel: lmList[29], toe: lmList[31], shoulder: lmList[11], name: '左'};
        } else {
            return {hip: lmList[24], knee: lmList[26], ankle: lmList[28], heel: lmList[30], toe: lmList[32], shoulder: lmList[12], name: '右'};
        }
    }

    validateForm(leg) {
        /*
        僅保留基本姿勢的幾何驗證（軀幹前傾、腳跟浮起）。
        註：已將「下蹲深度不足」的判定移除，交由底下的動態 FSM 統一處理，消滅重工衝突。
        */
        let issues = [];
        
        const foot_angle = MathUtils.getHorizontalAngle(leg.heel, leg.toe);
        if (foot_angle > this.SQUAT_FOOT_MAX_ANGLE) { 
            issues.push(new PoseIssue(`${leg.name}腳跟浮起`, [leg.heel, leg.toe]));
        }

        const vertical_point = {x: leg.hip.x, y: leg.hip.y - 100};
        const trunk_angle = MathUtils.getAngle(vertical_point, leg.hip, leg.shoulder);
        if (trunk_angle > this.SQUAT_TRUNK_MAX_ANGLE) {
            issues.push(new PoseIssue(`軀幹過度前傾 (${Math.floor(trunk_angle)}°)`, [leg.shoulder, leg.hip]));
        }
            
        return { isValid: issues.length === 0, issues: issues };
    }

    validate(lmList) {
        // 實作 BaseExercise 的抽象方法，維持介面相容性
        const leg = this.getWorkingLeg(lmList);
        return this.validateForm(leg);
    }

    processFrame(lmList) {
        /*
        封裝完整的深蹲狀態機 (FSM) 與物理邊界邏輯。
        主程式 app.js 只需要呼叫此函式，即可直接取得儀表板文字與 UI 回饋狀態。
        */
        const leg = this.getWorkingLeg(lmList);
        const hip_y = leg.hip.y;
        const knee_y = leg.knee.y;
        
        // 【修正】加入動態比例尺：軀幹長度
        let torso_h = Math.abs(leg.shoulder.y - leg.hip.y);
        // 避免除以零
        torso_h = torso_h > 0 ? torso_h : 1.0; 
        
        const angle = MathUtils.getAngle(leg.hip, leg.knee, leg.ankle);

        // 【修正】使用相對比例替代絕對像素，確保上下限動態適應
        const depth_ratio = (knee_y - hip_y) / torso_h;
        
        // 物理邊界定義 (採用動態比例數據)
        // 參數可依據實際測試微調，例如 -0.1 到 0.15 之間代表大腿約略平行
        const is_parallel = depth_ratio >= -0.1 && depth_ratio <= 0.15;
        const is_good_angle = angle >= 40 && angle <= 165;
        const is_too_deep = angle < 40 || depth_ratio < -0.1;
        const is_standing = angle >= 165;

        let dashboard_info = `深蹲次數: ${this.count}`;
        let feedback;
        
        // 狀態機判定邏輯
        if (is_standing) {
            // 【計次邏輯】只有拿過綠卡，站直後才算 1 次
            if (this.hit_target_depth) {
                this.count += 1;
            }
            
            // 確實重置狀態，確保下一輪的上下限重新判定
            this.hit_target_depth = false;
            this.state = ExerciseState.UP;
            feedback = new FeedbackState("準備開始... (請側對鏡頭)", UIState.RED);

        } else if (angle <= 140) {
            this.state = ExerciseState.DOWN;
            const { isValid, issues } = this.validateForm(leg);

            if (this.hit_target_depth) {
                // 💡 防呆機制：若已達完美深度卻繼續硬往下蹲，剝奪綠卡並警告
                if (is_too_deep) {
                    feedback = new FeedbackState("⚠️ 蹲太低了！請稍微抬高臀部", UIState.YELLOW);
                    this.hit_target_depth = false; 
                } else {
                    feedback = new FeedbackState("完美深度！請保持並站起", UIState.GREEN);
                }
            
            } else if (isValid && is_parallel && is_good_angle) {
                this.hit_target_depth = true;
                feedback = new FeedbackState("完美深度！請保持並站起", UIState.GREEN);
            
            } else {
                let msg = "請微調姿勢，保持重心穩定";
                if (!isValid) {
                    msg = issues[0].msg;
                } else if (is_too_deep) {
                    msg = "蹲太低了！臀部不可低於膝蓋";
                } else if (angle > 110) {
                    msg = "請繼續下蹲至大腿與地面平行";
                }
                
                feedback = new FeedbackState(`❌ ${msg}\n(請即時調整姿勢)`, UIState.YELLOW);
            }
        } else {
            // 介於 140~165 度之間，正在下蹲或站起的過渡期
            feedback = new FeedbackState("動作進行中...", UIState.YELLOW);
        }

        return { dashboard_info, feedback };
    }
}
