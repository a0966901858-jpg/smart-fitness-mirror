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
        
        // 1. 計算膝蓋夾角 (用於判斷站立與下蹲的過渡狀態，不受腿長比例影響)
        const knee_angle = MathUtils.getAngle(leg.hip, leg.knee, leg.ankle);
        
        // 2. 計算 Y 軸相對高度 (專門用於判斷深蹲到底部時的「平行深度」，最精準)
        const depth_ratio = (knee_y - hip_y) / torso_h;
        
        // 物理邊界定義：混搭判定
        // 深度判定：看 Y 軸落差
        const is_parallel = depth_ratio >= -0.15 && depth_ratio <= 0.25; 
        const is_too_deep = depth_ratio < -0.15;
        
        // 狀態判定：看膝蓋角度
        const is_standing = knee_angle >= 150;     // 腳打直 (150~180度) 視為站立
        const is_down_phase = knee_angle <= 110;   // 膝蓋明顯彎曲，進入深蹲評分區間

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

            if (!isValid) {
                feedback = new FeedbackState(`❌ ${issues[0].msg}\n(請即時調整姿勢)`, UIState.YELLOW);
                this.hit_target_depth = false;
            } 
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
            // 介於 110度 ~ 150度 之間，就是單純的動作過渡區間
            feedback = new FeedbackState("動作進行中...", UIState.YELLOW);
        }

        return { dashboard_info, feedback };
    }
}
