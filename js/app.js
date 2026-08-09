// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("Smart Fitness Mirror 系統初始化中...");

    // 取得 HTML 元素
    const videoElement = document.getElementById('input_video');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');
    
    // UI 節點
    const modeText = document.getElementById('mode_text');
    const infoText = document.getElementById('info_text');
    const feedbackText = document.getElementById('feedback_text');

    // ==========================================
    // 狀態管理器與緩衝切換參數 (Debounce)
    // ==========================================
    const exerciseInstances = {
        "SQUAT": new Squat(),
        "LUNGE": new Lunge(),
        "PLANK": new Plank()
    };
    
    let currentModeName = "SQUAT";
    let currentExercise = exerciseInstances[currentModeName];
    
    // 防呆切換機制：需連續 5 幀偵測到新動作才切換
    let candidateMode = currentModeName;
    let modeSwitchCounter = 0;
    const MODE_SWITCH_THRESHOLD = 5;

    // ==========================================
    // 初始化 MediaPipe Pose AI 引擎
    // ==========================================
    const pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 1, 
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults((results) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

        if (results.poseLandmarks) {
            // 畫骨架與關節點
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#FFFFFF', lineWidth: 4});
            drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2, radius: 4});
            
            // 座標轉換：將比例轉換回真實像素
            const w = canvasElement.width;
            const h = canvasElement.height;
            const lmList = results.poseLandmarks.map(lm => ({
                x: lm.x * w,
                y: lm.y * h,
                z: lm.z * w  
            }));

            // ==========================================
            // 自動偵測切換模式 (判斷跨距與身體比例)
            // ==========================================
            const canSwitch = (
                (currentModeName === "SQUAT" && currentExercise.state !== ExerciseState.DOWN) || 
                (currentModeName === "LUNGE" && !currentExercise.is_holding) || 
                (currentModeName === "PLANK" && !currentExercise.is_planking)
            );

            if (canSwitch) {
                // 取肩膀、臀部、腳踝的中點
                const sx = (lmList[11].x + lmList[12].x) / 2;
                const sy = (lmList[11].y + lmList[12].y) / 2;
                const hx = (lmList[23].x + lmList[24].x) / 2;
                const hy = (lmList[23].y + lmList[24].y) / 2;
                const ax = (lmList[27].x + lmList[28].x) / 2;
                const ay = (lmList[27].y + lmList[28].y) / 2;

                const body_w = Math.abs(sx - ax);
                const body_h = Math.abs(sy - ay);
                const torso_h = Math.abs(sy - hy);
                const ankle_dist_x = Math.abs(lmList[27].x - lmList[28].x);

                let detectedMode = "SQUAT";
                if (body_w > body_h * 1.2) {
                    detectedMode = "PLANK";
                } else if (ankle_dist_x > torso_h * 1.1) {
                    detectedMode = "LUNGE";
                }

                // 緩衝切換機制 (Debounce)：避免雜訊導致瞬間跳轉
                if (detectedMode !== currentModeName) {
                    if (detectedMode === candidateMode) {
                        modeSwitchCounter++;
                        if (modeSwitchCounter >= MODE_SWITCH_THRESHOLD) {
                            currentModeName = detectedMode;
                            currentExercise = exerciseInstances[currentModeName];
                            
                            // 更新左上角 UI 標題
                            const modeTw = {"SQUAT": "深蹲", "LUNGE": "弓箭步", "PLANK": "棒式"}[currentModeName];
                            modeText.innerText = `[自動切換] ${modeTw}模式`;
                            
                            // 初始化狀態回饋
                            feedbackText.innerText = "切換模式，準備開始... (請側對鏡頭)";
                            feedbackText.className = "feedback red";
                            modeSwitchCounter = 0;
                        }
                    } else {
                        candidateMode = detectedMode;
                        modeSwitchCounter = 1;
                    }
                } else {
                    modeSwitchCounter = 0;
                }
            }

            // ==========================================
            // 核心判定邏輯
            // ==========================================
            const { dashboard_info, feedback } = currentExercise.processFrame(lmList);

            // 更新 HTML DOM 文字 (如果是切換模式的瞬間，保留切換提示)
            if (dashboard_info) {
                infoText.innerText = dashboard_info;
            }
            // 避免覆蓋剛切換時的 UI 提示
            if (modeSwitchCounter === 0 && candidateMode === currentModeName) {
                feedbackText.innerText = feedback.text;
                feedbackText.className = 'feedback'; 
                feedbackText.classList.add(feedback.color); 
            }
        }
        
        canvasCtx.restore();
    });

    // ==========================================
    // 啟動相機並綁定 AI 引擎
    // ==========================================
    console.log("正在請求相機權限...");
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await pose.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });

    camera.start()
        .then(() => {
            console.log("相機啟動成功！");
            feedbackText.innerText = "相機已啟動，請站到鏡頭前！";
            feedbackText.className = "feedback yellow";
        })
        .catch((err) => {
            console.error("相機啟動失敗：", err);
            feedbackText.innerText = "相機啟動失敗，請檢查權限設定";
            feedbackText.className = "feedback red";
        });
});
