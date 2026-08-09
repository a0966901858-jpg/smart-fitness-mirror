// js/exercises/plank.js

class Plank {
    constructor() {
        this.accumulated_time = 0.0;
        this.last_tick = 0.0;
        this.is_planking = false;
    }

    validate(lmList) {
        let issues = [];
        
        // 取得所需關節節點
        const shoulder = lmList[12];
        const elbow = lmList[14];
        const hip = lmList[24];
        const knee = lmList[26];
        const ankle = lmList[28];
        
        // 身體角度 (判斷是否塌腰/翹臀)
        const body_angle = MathUtils.getAngle(shoulder, hip, ankle);
        if (body_angle < 140) {
            issues.push(new PoseIssue("核心未收緊(塌腰/翹臀)", [shoulder, hip, ankle]));
        }

        // 膝蓋角度 (判斷是否彎曲)
        const knee_angle = MathUtils.getAngle(hip, knee, ankle);
        if (knee_angle < 140) {
            issues.push(new PoseIssue("膝蓋彎曲 (請打直雙腿)", [hip, knee, ankle]));
        }
            
        // 手肘與肩膀垂直度
        const vertical_point = { x: elbow.x, y: elbow.y - 100 };
        const arm_alignment = MathUtils.getAngle(vertical_point, elbow, shoulder);
        if (arm_alignment > 40) {
            issues.push(new PoseIssue("手肘未垂直於肩膀下方", [shoulder, elbow]));
        }
            
        return { isValid: issues.length === 0, issues: issues };
    }

    processFrame(lmList) {
        // 封裝棒式的動作狀態機 (FSM) 與倒數計時邏輯
        const body_h_diff = Math.abs(lmList[11].y - lmList[27].y);
        const body_w_diff = Math.abs(lmList[11].x - lmList[27].x);
        
        let dashboard_info = "";
        let feedback;

        // 寬鬆門檻：身體高度差不大，代表呈現趴姿
        if (body_h_diff < body_w_diff * 0.8) {
            const { isValid, issues } = this.validate(lmList);
            
            if (isValid) {
                if (!this.is_planking) {
                    this.is_planking = true;
                    // 將 Python 的 time.time() 轉換為 JS 的秒數
                    this.last_tick = Date.now() / 1000;
                }

                // 限制單次增加的秒數 (最大不超過 0.5 秒)，防止嚴重掉幀時時間暴衝
                const currentTime = Date.now() / 1000;
                const time_delta = Math.min(currentTime - this.last_tick, 0.5);
                this.accumulated_time += time_delta;
                this.last_tick = currentTime;
                
                const remain = Math.max(0, 60 - Math.floor(this.accumulated_time));
                
                if (remain > 0) {
                    dashboard_info = `棒式倒數: ${remain} 秒`;
                    feedback = new FeedbackState("核心收緊，棒式維持中！", UIState.GREEN);
                } else {
                    dashboard_info = "目標達成！太棒了！";
                    feedback = new FeedbackState("恭喜完成 60 秒棒式！", UIState.GREEN);
                }
            } else {
                // 修復偷吃步 Bug：姿勢錯誤時必須中斷狀態，避免將錯誤的時間累加
                this.is_planking = false;
                feedback = new FeedbackState(`❌ ${issues[0].msg}\n(請即時調整姿勢)`, UIState.YELLOW);
            }
        } else {
            this.is_planking = false;
            dashboard_info = "請撐起進入棒式";
            feedback = new FeedbackState("準備開始... (請側對鏡頭)", UIState.RED);
        }

        return { dashboard_info, feedback };
    }
}
