// js/exercises/squat.js

class Squat {
    constructor() {
        this.count = 0;
        this.state = ExerciseState.IDLE;
        this.hit_target_depth = false;
        
        this.SQUAT_FOOT_MAX_ANGLE = 35;
        this.SQUAT_TRUNK_MAX_ANGLE = 45; 
    }

    getWorkingLeg(lmList) {
        const l_z = lmList[23].z + lmList[25].z + lmList[27].z;
        const r_z = lmList[24].z + lmList[26].z + lmList[28].z;
        
        if (l_z < r_z) {
            return {hip: lmList[23], knee: lmList[25], ankle: lmList[27], heel: lmList[29], toe: lmList[31], shoulder: lmList[11], name: '左'};
        } else {
            return {hip: lmList[24], knee: lmList[26], ankle: lmList[28], heel: lmList[30], toe: lmList[32], shoulder: lmList[12], name: '右'};
        }
    }

    validateForm(leg) {
        let issues = [];
        
        const foot_angle = MathUtils.getHorizontalAngle(leg.heel, leg.toe);
        if (foot_angle > this.SQUAT_FOOT_MAX_ANGLE) { 
            issues.push(new PoseIssue(`${leg.name}腳跟浮起`, [leg.heel, leg.toe]));
        }

        // 修正 Y 軸參考點的數值，適應 normalized 座標
        const vertical_point = {x: leg.hip.x, y: leg.hip.y - 0.5};
        const trunk_angle = MathUtils.getAngle(vertical_point, leg.hip, leg.shoulder);
        if (trunk_angle > this.SQUAT_TRUNK_MAX_ANGLE) {
            issues.push(new PoseIssue(`軀幹過度前傾 (${Math.floor(trunk_angle)}°)`, [leg.shoulder, leg.hip]));
        }
            
        return { isValid: issues.length === 0, issues: issues };
    }

    validate(lmList) {
        const leg = this.getWorkingLeg(lmList);
        return this.validateForm(leg);
    }

    processFrame(lmList) {
        const leg = this.getWorkingLeg(lmList);
        const hip_y = leg.hip.y;
        const knee_y = leg.knee.y;
        
        let torso_h = Math.abs(leg.shoulder.y - leg.hip.y);
        torso_h = torso_h > 0 ? torso_h : 1.0; 
        
        // 【修正2】使用 Y 軸相對比例來判斷深度 (最不受攝影機仰角/俯角影響)
        // depth_ratio = (膝蓋Y - 臀部Y) / 軀幹長度
        // 站立時：膝蓋在臀部下方很多，數值約為 1.5 ~ 2.0
        // 平行時：膝蓋與臀部同高，數值約為 0
        // 蹲太低：臀部低於膝蓋，數值為負數
        const depth_ratio = (knee_y - hip_y) / torso_h;
        
        // 物理邊界定義 
        const is_parallel = depth_ratio >= -0.15 && depth_ratio <= 0.25; 
        const is_too_deep = depth_ratio < -0.15;
        const is_standing = depth_ratio > 1.2;
        const is_down_phase = depth_ratio <= 1.2;

        let dashboard_info = `深蹲次數: ${this.count}`;
        let feedback;
        
        if (is_standing) {
            if (this.hit_target_depth) {
                this.count += 1;
            }
            
            this.hit_target_depth = false;
            this.state = ExerciseState.UP;
            feedback = new FeedbackState("準備開始... (請側對鏡頭)", UIState.RED);

        } else if (is_down_phase) {
            this.state = ExerciseState.DOWN;
            const { isValid, issues } = this.validateForm(leg);

            // 【修正1】優先檢查姿勢正確性！只要姿勢錯誤，就不給綠燈，並撤銷完美深度狀態
            if (!isValid) {
                feedback = new FeedbackState(`❌ ${issues[0].msg}\n(請即時調整姿勢)`, UIState.YELLOW);
                this.hit_target_depth = false;
            } 
            // 姿勢完全正確的情況下，才進行深度的判定
            else {
                if (this.hit_target_depth) {
                    if (is_too_deep) {
                        feedback = new FeedbackState("⚠️ 蹲太低了！請稍微抬高臀部", UIState.YELLOW);
                        this.hit_target_depth = false; 
                    } else {
                        feedback = new FeedbackState("完美深度！請保持並站起", UIState.GREEN);
                    }
                } else if (is_parallel) {
                    this.hit_target_depth = true;
                    feedback = new FeedbackState("完美深度！請保持並站起", UIState.GREEN);
                } else if (is_too_deep) {
                    feedback = new FeedbackState("蹲太低了！臀部不可低於膝蓋", UIState.YELLOW);
                } else {
                    feedback = new FeedbackState("請繼續下蹲至大腿與地面平行", UIState.YELLOW);
                }
            }
        } else {
            feedback = new FeedbackState("動作進行中...", UIState.YELLOW);
        }

        return { dashboard_info, feedback };
    }
}
