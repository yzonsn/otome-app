// ==========================================
// 🐾 お部屋機能（遙お兄ちゃんシステム）
// ==========================================

// =========================================================================
// 👁️ 遙お兄ちゃんシステム：深層ボイスデータ（480個）連動処理
// =========================================================================

// 外付けファイル (oniichan-voice.js) からランダムにセリフを取得する関数
function getRoomRandomVoice(type) {
    // 万が一ファイルが読み込めていない場合のセーフティ
    if (!window.ONIICHAN_VOICES || !window.ONIICHAN_VOICES[type]) {
        console.warn(`ボイスデータが見つかりません。種別: ${type}`);
        return "「……お兄ちゃんだよ、柚結。がんばっているね」";
    }
    
    const voiceList = window.ONIICHAN_VOICES[type];
    if (voiceList.length === 0) return "「……続きを聴かせておくれ」";
    
    // 420〜480個の配列の中から、毎回完全にランダムで1つをチョイスする
    const randomIndex = Math.floor(Math.random() * voiceList.length);
    return voiceList[randomIndex];
}

// 💡 300個の日記に対応するため上限を300に変更
let ONIICHAN_DIARIES = [];
for (let i = 1; i <= 300; i++) {
    ONIICHAN_DIARIES.push(`（未執筆データ）お兄ちゃんの秘密記録 第${i}頁。柚結の執筆を影から見つめる記録。`);
}

const UNLOCK_INTERVAL = 300; 

// --- タイマー・カウントアップ用変数 ---
let roomTimerId = null;
let timerMode = "countdown"; // "countdown" または "countup"
let defaultCountdownTime = 25 * 60; // デフォルト25分 (秒単位)
let currentSeconds = defaultCountdownTime; // 現在の残り秒数、または経過秒数
let isInterrupted = false; // 中断フラグ（お兄ちゃんのセリフ切り替え用）

// グローバル連動フラグ
window.isRewardActive = false;

let roomState = {
    words: {},
    tasksDone: {},
    unlockedPages: {},
    unlockedDates: {}, 
    pool: {},
    // 💡 解禁されたページに、どの日記インデックスが割り当てられたかを記録するマップ
    diaryMapping: {} 
};

// 画面のタブ切り替えと連動させる処理
function initRoomTabBridge() {
    // タイマーエリアのボタンを最新仕様に自動で書き換える
    const timerBlock = document.querySelector('.timer-block');
    if (timerBlock) {
        timerBlock.innerHTML = `
            <div style="display:flex; justify-content:center; gap:5px; margin-bottom:5px;">
                <button onclick="adjustRoomTime(60)" style="padding:2px 6px; font-size:11px;">+1分</button>
                <button onclick="adjustRoomTime(1)" style="padding:2px 6px; font-size:11px;">+1秒</button>
                <button onclick="adjustRoomTime(-1)" style="padding:2px 6px; font-size:11px;">-1秒</button>
                <button onclick="adjustRoomTime(-60)" style="padding:2px 6px; font-size:11px;">-1分</button>
            </div>
            <div id="timer-display">25:00</div>
            <div style="font-size:11px; color:#718096; margin-bottom:8px;" id="timer-mode-text">⏳ カウントダウンモード</div>
            <div class="timer-controls" style="display:flex; gap:5px; justify-content:center;">
                <button id="timer-start-btn" onclick="toggleRoomTimer()" style="background:#6b46c1; color:white; border:none; padding:6px 12px; border-radius:20px; font-size:12px; cursor:pointer;">スタート</button>
                <button id="timer-reset-btn" onclick="resetRoomTimer()" style="background:#e2e8f0; color:#4a5568; border:none; padding:6px 12px; border-radius:20px; font-size:12px; cursor:pointer;">リセット</button>
                <button id="timer-mode-btn" onclick="switchTimerMode()" style="background:#4a5568; color:white; border:none; padding:6px 12px; border-radius:20px; font-size:12px; cursor:pointer;">⏳⇄⏱️</button>
            </div>
        `;
    }

    const tabButtons = {
        'tab-task': { btn: document.getElementById('tab-task'), sec: document.getElementById('section-task') },
        'tab-scenario': { btn: document.getElementById('tab-scenario'), sec: document.getElementById('section-scenario') },
        'tab-room': { btn: document.getElementById('tab-room'), sec: document.getElementById('section-room') },
        'tab-setting': { btn: document.getElementById('tab-setting'), sec: document.getElementById('section-setting') }
    };

    Object.keys(tabButtons).forEach(key => {
        const item = tabButtons[key];
        if (item.btn) {
            item.btn.addEventListener('click', () => {
                Object.values(tabButtons).forEach(t => {
                    if(t.btn) t.btn.classList.remove('active');
                    if(t.sec) t.sec.style.display = 'none';
                });
                item.btn.classList.add('active');
                if(item.sec) item.sec.style.display = 'block';
                
                if (key === 'tab-room') {
                    syncWithMainProject();
                } else {
                    window.isRewardActive = false;
                }
            });
        }
    });

    const projectSelect = document.getElementById('current-project-select');
    if (projectSelect) {
        projectSelect.addEventListener('change', syncWithMainProject);
    }
}

function syncWithMainProject() {
    const projectSelect = document.getElementById('current-project-select');
    let currentWork = "default";
    if (projectSelect && projectSelect.value) {
        currentWork = projectSelect.value;
    }

    roomState.lastLoveMilestone = null;

    if (!roomState.words[currentWork]) roomState.words[currentWork] = 0;
    if (!roomState.tasksDone[currentWork]) roomState.tasksDone[currentWork] = 0;
    if (!roomState.unlockedPages[currentWork]) roomState.unlockedPages[currentWork] = [];
    if (!roomState.unlockedDates) roomState.unlockedDates = {}; 
    if (!roomState.unlockedDates[currentWork]) roomState.unlockedDates[currentWork] = {};
    if (!roomState.diaryMapping) roomState.diaryMapping = {};
    if (!roomState.diaryMapping[currentWork]) roomState.diaryMapping[currentWork] = {};
    
    // 💡 外付けの日記データの数を基準にプールを作成
    const totalDiaries = window.ONIICHAN_DIARIES ? window.ONIICHAN_DIARIES.length : ONIICHAN_DIARIES.length;
    if (!roomState.pool[currentWork] || roomState.pool[currentWork].length === 0) {
        roomState.pool[currentWork] = Array.from({length: totalDiaries}, (_, i) => i);
    }

    const mainCharCountElem = document.getElementById('char-count');
    if (mainCharCountElem) {
        const match = mainCharCountElem.innerText.match(/\d+/);
        if (match) {
            const actualWords = parseInt(match[0], 10);
            if (actualWords > roomState.words[currentWork]) {
                roomState.words[currentWork] = actualWords;
            }
        }
    }

    checkRoomDiaryUnlock(currentWork);
    updateRoomUI(currentWork);
}

// 💡 作品ごとにダブリなしでランダムに日記を解禁するロジック
function checkRoomDiaryUnlock(currentWork) {
    const currentWords = roomState.words[currentWork] || 0;
    const totalDiaries = window.ONIICHAN_DIARIES ? window.ONIICHAN_DIARIES.length : ONIICHAN_DIARIES.length;
    
    // 現在の文字数から、本来解禁されているべき「枠の数」を計算
    const deservedPagesCount = Math.floor(currentWords / UNLOCK_INTERVAL);
    const targetPagesCount = Math.min(deservedPagesCount, totalDiaries);
    
    if (!roomState.unlockedPages[currentWork]) roomState.unlockedPages[currentWork] = [];
    if (!roomState.unlockedDates) roomState.unlockedDates = {};
    if (!roomState.unlockedDates[currentWork]) roomState.unlockedDates[currentWork] = {};
    if (!roomState.diaryMapping[currentWork]) roomState.diaryMapping[currentWork] = {};

    // 💡 必要な数だけ、ランダムにクジを引いてページに割り当てる
    while (roomState.unlockedPages[currentWork].length < targetPagesCount) {
        const nextPageIndex = roomState.unlockedPages[currentWork].length;
        
        // プール（抽選箱）からランダムに日記インデックスを1つ引き抜く
        const currentPool = roomState.pool[currentWork];
        if (currentPool && currentPool.length > 0) {
            const rIdx = Math.floor(Math.random() * currentPool.length);
            const chosenDiaryIndex = currentPool.splice(rIdx, 1)[0]; // 抽選箱から削除しつつ取得
            
            // ページ位置に対して、引いた日記番号をマッピング（固定保存）
            roomState.diaryMapping[currentWork][nextPageIndex] = chosenDiaryIndex;
        } else {
            // 万が一プールが空なら、そのままのインデックスをフォールバック
            roomState.diaryMapping[currentWork][nextPageIndex] = nextPageIndex;
        }

        // ページを解禁済みにする
        roomState.unlockedPages[currentWork].push(nextPageIndex);
        
        // 解禁した瞬間の今日の日付を固定保存
        const now = new Date();
        const todayStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
        roomState.unlockedDates[currentWork][nextPageIndex] = todayStr;
    }

    const listContainer = document.getElementById('diary-list');
    const contentContainer = document.getElementById('diary-content-text');
    if (!listContainer || !contentContainer) return;

    listContainer.innerHTML = "";
    
    // 画面上は第1ページから順番に並べる（中身はランダムに固定されている）
    for (let index = 0; index < totalDiaries; index++) {
        const item = document.createElement('div');
        item.className = "diary-item";

        const isUnlocked = roomState.unlockedPages[currentWork].includes(index);

        if (isUnlocked) {
            item.innerText = `🔒 第 ${index + 1} ページ (解禁済み)`;
            item.style.cursor = "pointer";
            item.addEventListener('click', () => {
                // 💡 マッピングされたランダム日記テキストを取得して表示
                contentContainer.innerText = getFormattedDiaryText(currentWork, index);
            });
        } else {
            item.innerText = `🔒 第 ${index + 1} ページ (未解禁)`;
            item.style.color = "#666";
            item.style.cursor = "not-allowed";
        }
        listContainer.appendChild(item);
    }
}

function updateRoomUI(currentWork) {
    const currentWords = roomState.words[currentWork] || 0;
    
    let totalTasks = 5; 
    let currentTasks = 0;
    
    if (typeof appData !== 'undefined' && appData[currentWork]) {
        const projectTasks = appData[currentWork].tasks || [];
        totalTasks = projectTasks.length === 0 ? 5 : projectTasks.length;
        currentTasks = projectTasks.filter(t => t.completed).length;
    } else {
        currentTasks = roomState.tasksDone[currentWork] || 0;
    }

    document.getElementById('word-count-display').innerHTML = `${currentWords} <span class="unit">文字</span>`;
    
    const diaries = window.ONIICHAN_DIARIES || ONIICHAN_DIARIES;
    const unlockedCount = roomState.unlockedPages[currentWork] ? roomState.unlockedPages[currentWork].length : 0;
    const nextThreshold = (unlockedCount + 1) * UNLOCK_INTERVAL;
    const wordsLeft = nextThreshold - currentWords;
    
    if (unlockedCount >= diaries.length) {
        document.getElementById('next-unlock-text').innerText = "🎉 全ての日記をコンプリートしました！";
    } else {
        document.getElementById('next-unlock-text').innerText = `次の日記解禁まで あと ${wordsLeft} 文字`;
    }

    // すごろく描画
    const totalSteps = totalTasks;
    const currentStep = Math.min(currentTasks, totalSteps);
    document.getElementById('sugoroku-progress-text').innerText = `${currentStep} / ${totalSteps} マス`;
    
    const progressPercent = (currentStep / totalSteps) * 100;
    const leftPos = (progressPercent / 100) * 85; 
    document.getElementById('sugoroku-player').style.left = `${leftPos}%`;

    const trackElem = document.querySelector('.sugoroku-track');
    if (trackElem) {
        trackElem.style.background = `linear-gradient(to right, #00bfff ${progressPercent}%, #e2e8f0 ${progressPercent}%)`;
    }

    // セリフと表情の制御
    const avatar = document.getElementById('oniichan-avatar');
    const statusText = document.getElementById('oniichan-status-text');
    const speech = document.getElementById('oniichan-speech');

    if (avatar && statusText && speech) {
        if (window.isRewardActive) {
            return;
        } 
        else if (isInterrupted) {
            avatar.className = "oniichan-avatar-box avatar-placeholder-angry";
            statusText.innerText = "遙（不穏）";
            speech.innerText = getRoomRandomVoice('angry');
            roomState.lastLoveMilestone = null; 
        } 
        else if (roomTimerId && currentWords >= 500) {
            avatar.className = "oniichan-avatar-box avatar-placeholder-love";
            statusText.innerText = "遙（蕩け）";
            
            const currentMilestone = Math.floor(currentWords / 100);
            
            if (roomState.lastLoveMilestone !== currentMilestone || !speech.innerText.startsWith("「")) {
                speech.innerText = getRoomRandomVoice('love');
                roomState.lastLoveMilestone = currentMilestone; 
            }
        } 
        else {
            avatar.className = "oniichan-avatar-box avatar-placeholder-normal";
            statusText.innerText = "遙（通常）";
            speech.innerText = getRoomRandomVoice('normal');
            roomState.lastLoveMilestone = null; 
        }
    }

    displayRoomTime();
}

/// 外部から呼ばれるご褒美トリガー関数
window.triggerOniichanReward = function() {
    window.isRewardActive = true;
    
    const avatar = document.getElementById('oniichan-avatar');
    const statusText = document.getElementById('oniichan-status-text');
    const speech = document.getElementById('oniichan-speech');
    
    if (avatar && statusText && speech) {
        avatar.className = "oniichan-avatar-box avatar-placeholder-love";
        statusText.innerText = "遙（歓喜）";
        speech.innerText = getRoomRandomVoice('reward');
    }
};

// --- タイマー機能 ---
function displayRoomTime() {
    const mins = Math.floor(currentSeconds / 60).toString().padStart(2, '0');
    const secs = (currentSeconds % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${mins}:${secs}`;
}

function toggleRoomTimer() {
    const btn = document.getElementById('timer-start-btn');
    const projectSelect = document.getElementById('current-project-select');
    const currentWork = projectSelect ? projectSelect.value : "default";

    if (roomTimerId) {
        clearInterval(roomTimerId);
        roomTimerId = null;
        btn.innerText = "スタート";
        isInterrupted = true;
        roomState.lastLoveMilestone = null; 
        updateRoomUI(currentWork);
    } else {
        btn.innerText = "ストップ";
        isInterrupted = false;
        updateRoomUI(currentWork);

        roomTimerId = setInterval(() => {
            if (timerMode === "countdown") {
                if (currentSeconds > 0) {
                    currentSeconds--;
                } else {
                    clearInterval(roomTimerId);
                    roomTimerId = null;
                    btn.innerText = "スタート";
                    
                    if (typeof window.triggerOniichanReward === 'function') {
                        window.triggerOniichanReward();
                    } else {
                        document.getElementById('oniichan-speech').innerText = getRoomRandomVoice('reward');
                    }

                    // 電子音アラーム
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const playTone = (time, delay) => {
                        setTimeout(() => {
                            const osc = audioCtx.createOscillator();
                            const gain = audioCtx.createGain();
                            osc.type = "sine";
                            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
                            osc.connect(gain);
                            gain.connect(audioCtx.destination);
                            osc.start();
                            osc.stop(audioCtx.currentTime + 0.2);
                        }, delay);
                    };
                    playTone(audioCtx, 0);
                    playTone(audioCtx, 150);
                    playTone(audioCtx, 500);
                    playTone(audioCtx, 650);
                }
            } else {
                currentSeconds++;
            }
            displayRoomTime();
        }, 1000);
    }
}

function resetRoomTimer() {
    if (roomTimerId) {
        clearInterval(roomTimerId);
        roomTimerId = null;
        document.getElementById('timer-start-btn').innerText = "スタート";
    }
    isInterrupted = false;
    currentSeconds = (timerMode === "countdown") ? defaultCountdownTime : 0;
    
    roomState.lastLoveMilestone = null; 
    window.isRewardActive = false; 
    
    const projectSelect = document.getElementById('current-project-select');
    const currentWork = projectSelect ? projectSelect.value : "default";
    updateRoomUI(currentWork);
}

function switchTimerMode() {
    timerMode = (timerMode === "countdown") ? "countup" : "countdown";
    document.getElementById('timer-mode-text').innerText = (timerMode === "countdown") ? "⏳ カウントダウンモード" : "⏱️ カウントアップモード";
    resetRoomTimer();
}

function adjustRoomTime(amount) {
    if (roomTimerId) return; 
    currentSeconds += amount;
    if (currentSeconds < 0) currentSeconds = 0;
    
    if (timerMode === "countdown") {
        defaultCountdownTime = currentSeconds;
    }
    displayRoomTime();
}

// 💡 モーダル表示側も、固定された達成日を読み込むように修正
function toggleRoomDiaryModal() {
    const modal = document.getElementById('room-diary-modal');
    const isHidden = modal.style.display === "none";
    modal.style.display = isHidden ? "flex" : "none";

    if (isHidden) {
        const projectSelect = document.getElementById('current-project-select');
        const currentWork = projectSelect ? projectSelect.value : "default";
        const container = document.getElementById('room-diary-list-container');
        container.innerHTML = "";
        
        const unlockedIndices = roomState.unlockedPages[currentWork] || [];
        
        if (unlockedIndices.length === 0) {
            container.innerHTML = '<div class="diary-locked">まだ解放された記録はありません。<br>執筆して、お兄ちゃんの秘密を暴いてください。</div>';
            return;
        }

        unlockedIndices.forEach((pageIndex, order) => {
            // 💡 ページインデックスに紐づいた固定テキストを取得してモーダルに描画
            const formattedText = getFormattedDiaryText(currentWork, pageIndex);
            container.innerHTML += `
                <div class="diary-item" style="margin-bottom:15px; padding:10px; border-bottom:1px solid #e2e8f0;">
                    <div class="diary-meta" style="font-size:11px; color:#6b46c1; font-weight:bold; margin-bottom:5px;">🔓 秘密の記録 発見No.${order + 1} (総第 ${pageIndex + 1} 頁)</div>
                    <div style="white-space: pre-wrap;">${formattedText}</div>
                </div>
            `;
        });
    }
}

// 初期化実行
document.addEventListener('DOMContentLoaded', () => {
    initRoomTabBridge();
    setTimeout(syncWithMainProject, 500);
});

// =========================================================================
// 📅 日記の日付動的生成システム（達成日固定版・マッピング対応）
// =========================================================================
function getFormattedDiaryText(currentWork, pageIndex) {
    // 💡 ページインデックスに紐づく、抽選で引いた日記の生インデックスを取得
    let diaryIndex = pageIndex;
    if (roomState.diaryMapping && roomState.diaryMapping[currentWork] && roomState.diaryMapping[currentWork][pageIndex] !== undefined) {
        diaryIndex = roomState.diaryMapping[currentWork][pageIndex];
    }

    if (!window.ONIICHAN_DIARIES || !window.ONIICHAN_DIARIES[diaryIndex]) {
        return "「……日記のページが破られているようだ」";
    }

    const rawDiaryText = window.ONIICHAN_DIARIES[diaryIndex];

    let dateStr = "";
    if (roomState.unlockedDates && roomState.unlockedDates[currentWork] && roomState.unlockedDates[currentWork][pageIndex]) {
        dateStr = roomState.unlockedDates[currentWork][pageIndex];
    } else {
        const now = new Date();
        dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    }

    return `■ ${dateStr}\n\n${rawDiaryText}`;
}