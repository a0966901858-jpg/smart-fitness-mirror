// js/exercises/squat.js

class Squat {
    constructor() {
        this.count = 0;
        this.state = ExerciseState.IDLE;
        // 確保狀態變數在實例化時正確初始化，避免執行時標籤卡死
        this.hit_target_depth = false;
        
        // 【修正】放寬軀幹前傾的容忍度 (符合人體工學，原為 35度)
        this.SQUAT_FOOT_MAX_ANGLE = 35;
        this.SQUAT_TRUNK_MAX_ANGLE = 45; 
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
        
        let torso_h = Math.abs(leg.shoulder.y - leg.hip.y);
        torso_h = torso_h > 0 ? torso_h : 1.0; 
        
        // 【修正】主邏輯改用膝蓋夾角 (Hip-Knee-Ankle) 來判定深度，徹底解決仰角拍攝導致的 Y 軸透視誤差
        const angle = MathUtils.getAngle(leg.hip, leg.knee, leg.ankle);

        const depth_ratio = (knee_y - hip_y) / torso_h;
        
        // 物理邊界定義 
        // 完美的深蹲區間：膝蓋角度介於 70度 到 110度 之間 (大腿約略平行地面)
        const is_parallel = angle >= 70 && angle <= 110; 
        // 蹲太低：膝蓋角度小於 70度 (不受相機高低影響)
        const is_too_deep = angle < 70;
        // 站立：膝蓋角度大於 165度
        const is_standing = angle >= 165;

        let dashboard_info = `深蹲次數: ${this.count}`;
        let feedback;
        
        // 狀態機判定邏輯
        if (is_standing) {
            if (this.hit_target_depth) {
                this.count += 1;
            }
            
            this.hit_target_depth = false;
            this.state = ExerciseState.UP;
            feedback = new FeedbackState("準備開始... (請側對鏡頭)", UIState.RED);

        } else if (angle <= 140) {
            this.state = ExerciseState.DOWN;
            const { isValid, issues } = this.validateForm(leg);

            if (this.hit_target_depth) {
                if (is_too_deep) {
                    feedback = new FeedbackState("⚠️ 蹲太低了！請稍微抬高臀部", UIState.YELLOW);
                    this.hit_target_depth = false; 
                } else {
                    feedback = new FeedbackState("完美深度！請保持並站起", UIState.GREEN);
                }
            
            } else if (isValid && is_parallel) {
                this.hit_target_depth = true;
                feedback = new FeedbackState("完美深度！請保持並站起", UIState.GREEN);
            
            } else {
                let msg = "請微調姿勢，保持重心穩定";
                if (!isValid) {
                    msg = issues[0].msg;
                } else if (is_too_deep) {
                    msg = "蹲太低了！膝蓋彎曲角度過大";
                } else if (angle > 110) {
                    msg = "請繼續下蹲至大腿與地面平行";
                }
                
                feedback = new FeedbackState(`❌ ${msg}
(請即時調整姿勢)`, UIState.YELLOW);
            }
        } else {
            feedback = new FeedbackState("動作進行中...", UIState.YELLOW);
        }

        return { dashboard_info, feedback };
    }
}
