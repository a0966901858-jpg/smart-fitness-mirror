// js/exercises/lunge.js

class Lunge {
    constructor() {
        this.lunge_hold_start = 0;
        this.is_holding = false;
    }

    validate(lmList) {
        let issues = [];
        
        // 取得左右腳節點
        const l_leg = {hip: lmList[23], knee: lmList[25], ankle: lmList[27], heel: lmList[29], toe: lmList[31]};
        const r_leg = {hip: lmList[24], knee: lmList[26], ankle: lmList[28], heel: lmList[30], toe: lmList[32]};
        
        // 計算雙膝角度
        const l_knee_ang = MathUtils.getAngle(l_leg.hip, l_leg.knee, l_leg.ankle);
        const r_knee_ang = MathUtils.getAngle(r_leg.hip, r_leg.knee, r_leg.ankle); 
        
        // 判斷前後腳 (膝蓋彎曲角度較小的為前腳)
        let front_leg, back_leg, f_ang, b_ang;
        if (l_knee_ang < r_knee_ang) {
            front_leg = l_leg;
            back_leg = r_leg;
            f_ang = l_knee_ang;
            b_ang = r_knee_ang;
        } else {
            front_leg = r_leg;
            back_leg = l_leg;
            f_ang = r_knee_ang;
            b_ang = l_knee_ang;
        }

        // 姿勢幾何驗證
        if (!(f_ang >= 80 && f_ang <= 130)) {
            issues.push(new PoseIssue(`前膝彎曲未達90度 (${Math.floor(f_ang)}°)`, [front_leg.hip, front_leg.knee, front_leg.ankle]));
        }
            
        if (b_ang < 130) {
            issues.push(new PoseIssue(`後腳未打直 (${Math.floor(b_ang)}°)`, [back_leg.hip, back_leg.knee, back_leg.ankle]));
        }

        const back_foot_angle = MathUtils.getHorizontalAngle(back_leg.heel, back_leg.toe);
        if (back_foot_angle > 50) {
            issues.push(new PoseIssue("後腳跟浮起 (請貼地)", [back_leg.heel, back_leg.toe]));
        }
            
        const shoulder = (front_leg === l_leg) ? lmList[11] : lmList[12];
        const vertical_point = {x: front_leg.hip.x, y: front_leg.hip.y - 100};
        const trunk_angle = MathUtils.getAngle(vertical_point, front_leg.hip, shoulder);
        
        if (trunk_angle > 40) {
            issues.push(new PoseIssue(`上半身未直立 (${Math.floor(trunk_angle)}°)`, [shoulder, front_leg.hip]));
        }
            
        return { isValid: issues.length === 0, issues: issues };
    }

    getFrontKneeAngle(lmList) {
        const l_knee_ang = MathUtils.getAngle(lmList[23], lmList[25], lmList[27]);
        const r_knee_ang = MathUtils.getAngle(lmList[24], lmList[26], lmList[28]);
        
        const pts = (l_knee_ang < r_knee_ang) 
            ? [lmList[23], lmList[25], lmList[27]] 
            : [lmList[24], lmList[26], lmList[28]];
            
        return { front_knee_ang: Math.min(l_knee_ang, r_knee_ang), track_pts: pts };
    }

    processFrame(lmList) {
        // 封裝弓箭步的動作狀態機 (FSM) 與物理邊界啟動邏輯。
        const { front_knee_ang, track_pts } = this.getFrontKneeAngle(lmList);
        
        const torso_h = Math.abs(
            ((lmList[11].y + lmList[12].y) / 2) - ((lmList[23].y + lmList[24].y) / 2)
        );
        const ankle_dist_x = Math.abs(lmList[27].x - lmList[28].x);

        // 確保上下限門檻在每一幀即時運算
        const is_in_posture = (ankle_dist_x > torso_h * 0.6) && (front_knee_ang <= 140);

        let dashboard_info = "";
        let feedback;

        if (is_in_posture) {
            const { isValid, issues } = this.validate(lmList);
            
            if (isValid) {
                if (!this.is_holding) {
                    this.is_holding = true;
                    // 將 Python 的 time.time() 轉換為 JS 的秒數
                    this.lunge_hold_start = Date.now() / 1000; 
                }

                const elapsed = Math.floor((Date.now() / 1000) - this.lunge_hold_start);
                
                if (elapsed < 5) {
                    dashboard_info = `維持中: ${elapsed} 秒`;
                    feedback = new FeedbackState("姿勢完美！請繼續維持", UIState.GREEN);
                } else {
                    dashboard_info = "完成！請換邊";
                    feedback = new FeedbackState("目標達成！", UIState.GREEN);
                }
            } else {
                this.is_holding = false;
                feedback = new FeedbackState(`❌ ${issues[0].msg}\n(請即時調整姿勢)`, UIState.YELLOW);
            }
        } else {
            this.is_holding = false;
            dashboard_info = "請下蹲進入弓箭步";
            feedback = new FeedbackState("準備開始... (請側對鏡頭)", UIState.RED);
        }

        return { dashboard_info, feedback };
    }
}
