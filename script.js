// ==========================================
// 1. 要素の取得
// ==========================================
const tabButtons = document.querySelectorAll('.tab-menu button');
const tabContents = document.querySelectorAll('.tab-content');

const taskList = document.getElementById('task-list');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const taskModalOverlay = document.getElementById('task-modal-overlay');
const addTaskBtn = document.getElementById('add-task-btn');

const taskInput = document.getElementById('task-input');
const categorySelect = document.getElementById('task-category');
const deadlineInput = document.getElementById('task-deadline');

const alertContainer = document.getElementById('alert-container');
const sortDeadlineBtn = document.getElementById('sort-deadline-btn');

const scenarioInput = document.getElementById('scenario-input');
const charCount = document.getElementById('char-count');
const lineCount = document.getElementById('line-count');
const charButtonsArea = document.getElementById('character-buttons-area');

const charConfigInput = document.getElementById('char-config-input');
const saveCharConfigBtn = document.getElementById('save-char-config-btn');

const projectSelect = document.getElementById('current-project-select');
const chapterSelect = document.getElementById('current-chapter-select');
const addProjectBtn = document.getElementById('add-project-btn');
const deleteProjectBtn = document.getElementById('delete-project-btn');
const addChapterBtn = document.getElementById('add-chapter-btn');
const newProjectNameInput = document.getElementById('new-project-name-input');

// ==========================================
// 2. データの初期化・読み込み
// ==========================================
let appData = JSON.parse(localStorage.getItem('otome_app_data'));
let currentProject = localStorage.getItem('otome_current_project');
let currentChapter = localStorage.getItem('otome_current_chapter');

if (!appData || Object.keys(appData).length === 0) {
    appData = {
        "デフォルト作品": {
            tasks: [
                { text: "プロット作成", category: "シナリオ", deadline: "", completed: false },
                { text: "メインヒーロー立ち絵発注", category: "イラスト", deadline: "", completed: false }
            ],
            chapters: {
                "共通プロット": "ここに作品の共通プロットや全体の流れを書き留めてください。\n\n【キャラクター設定】\nヒーローA:\nヒロイン:",
                "第1章": "第1章のシナリオ本文をここに執筆してください。"
            }
        }
    };
}

if (!currentProject || !appData[currentProject]) {
    currentProject = Object.keys(appData)[0];
}
if (!currentChapter || !appData[currentProject].chapters[currentChapter]) {
    currentChapter = Object.keys(appData[currentProject].chapters)[0];
}

// ==========================================
// 3. 画面描画（レンダリング）の関数群
// ==========================================
function saveAndRefreshAll() {
    localStorage.setItem('otome_app_data', JSON.stringify(appData));
    localStorage.setItem('otome_current_project', currentProject);
    localStorage.setItem('otome_current_chapter', currentChapter);
    
    renderProjectSelect();
    renderChapterSelect();
    renderTasks();
    renderScenario();
}

function renderProjectSelect() {
    if (!projectSelect) return;
    projectSelect.innerHTML = "";
    Object.keys(appData).forEach(projName => {
        const option = document.createElement('option');
        option.value = projName;
        option.textContent = projName;
        if (projName === currentProject) option.selected = true;
        projectSelect.appendChild(option);
    });
}

// ⚠️【ここを修正】：chapterSelectが存在しない場合のガードを追加
function renderChapterSelect() {
    if (!chapterSelect) return;
    chapterSelect.innerHTML = "";
    const chapters = appData[currentProject].chapters;
    Object.keys(chapters).forEach(chapName => {
        const option = document.createElement('option');
        option.value = chapName;
        option.textContent = chapName;
        if (chapName === currentChapter) option.selected = true;
        chapterSelect.appendChild(option);
    });
}

function renderTasks() {
    if (!taskList) return;
    taskList.innerHTML = "";
    if (alertContainer) alertContainer.innerHTML = ""; 
    
    const projectData = appData[currentProject];
    const savedTasks = projectData.tasks;
    
    const now = new Date();
    const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 1. まず、画面全体の「本日締切・期限切れ」の警告チェックを走らせる
    let hasAlertTask = false;
    savedTasks.forEach(task => {
        if (!task.completed && task.deadline) {
            if (task.deadline <= todayString) {
                hasAlertTask = true;
            }
        }
    });

    if (hasAlertTask && alertContainer) {
        alertContainer.innerHTML = `<div class="deadline-alert-box">⚠️ 警告：本日締切、または期限切れのタスクがあります！</div>`;
    }

    // 2. 【ここがポイント】：タスクを種類（カテゴリ）ごとにグループ化する器を作る
    const categories = ['シナリオ', 'イラスト', 'システム', 'その他'];
    const groupedTasks = { 'シナリオ': [], 'イラスト': [], 'システム': [], 'その他': [] };

    // すべてのタスクをそれぞれのカテゴリの器に仕分ける
    savedTasks.forEach((task, index) => {
        const cat = task.category || 'その他';
        // 元の配列のインデックス（削除や完了で使う）を一緒に記憶しておく
        groupedTasks[cat].push({ data: task, originalIndex: index });
    });

    // 3. カテゴリごとに画面に描画していく
    categories.forEach(cat => {
        const tasksInCat = groupedTasks[cat];
        
        // そのカテゴリにタスクが1つでもある場合だけ、カテゴリの見出しを作る
        if (tasksInCat.length > 0) {
            const categoryHeader = document.createElement('div');
            categoryHeader.className = `task-category-group-header cat-${cat}`;
            categoryHeader.style.cssText = "font-weight: bold; margin-top: 15px; margin-bottom: 8px; padding-left: 5px; border-left: 4px solid var(--primary-color, #78909c); color: #37474f;";
            categoryHeader.textContent = `■ ${cat}`;
            taskList.appendChild(categoryHeader);

            // そのカテゴリに属するタスクを順番に生成
            tasksInCat.forEach(item => {
                const task = item.data;
                const index = item.originalIndex; // 元の配列の正しい位置

                const listItem = document.createElement('li');
                
                const badgeSpan = document.createElement('span');
                badgeSpan.className = `category-badge badge-${task.category || 'その他'}`;
                badgeSpan.textContent = task.category || 'その他';
                listItem.appendChild(badgeSpan);

                const textSpan = document.createElement('span');
                textSpan.style.flex = "1";
                if (task.deadline) {
                    textSpan.textContent = `${task.text} (締切: ${task.deadline})`;
                    if (!task.completed && task.deadline <= todayString) listItem.classList.add('overdue');
                } else {
                    textSpan.textContent = task.text;
                }
                if (task.completed) {
                    textSpan.style.textDecoration = 'line-through';
                    listItem.classList.remove('overdue');
                }
                listItem.appendChild(textSpan);

                const completeButton = document.createElement('button');
                completeButton.textContent = task.completed ? '戻す' : '完了';
                completeButton.style.cssText = `background-color: ${task.completed ? '#b0bec5' : '#81c784'}; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; margin-right: 5px;`;
                completeButton.addEventListener('click', function(e) {
                    e.stopPropagation();
                    task.completed = !task.completed;
                    saveAndRefreshAll();
                });
                listItem.appendChild(completeButton);

                const menuTrigger = document.createElement('button');
                menuTrigger.className = 'menu-trigger-btn';
                menuTrigger.innerHTML = '&#8942;';
                listItem.appendChild(menuTrigger);

                const popover = document.createElement('div');
                popover.className = 'task-menu-popover';

                const editBtn = document.createElement('button');
                editBtn.textContent = '✏ タスクを編集';
                editBtn.addEventListener('click', function() {
                    const newText = prompt("タスク内容を編集してください", task.text);
                    if (newText && newText.trim() !== "") {
                        task.text = newText;
                        saveAndRefreshAll();
                    }
                });
                popover.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑 タスクを削除';
                deleteBtn.className = 'delete-btn';
                deleteBtn.addEventListener('click', function() {
                    if (confirm(`「${task.text}」を削除しますか？`)) {
                        savedTasks.splice(index, 1); // 正しいインデックスで削除
                        saveAndRefreshAll();
                    }
                });
                popover.appendChild(deleteBtn);
                listItem.appendChild(popover);

                menuTrigger.addEventListener('click', function(e) {
                    e.stopPropagation();
                    document.querySelectorAll('.task-menu-popover').forEach(p => { if (p !== popover) p.classList.remove('show'); });
                    popover.classList.toggle('show');
                });

                taskList.appendChild(listItem);
            });
        }
    });

    // 4. 進捗バー（パーセンテージ）の更新処理（現状維持）
    categories.forEach(cat => {
        const catTasks = savedTasks.filter(t => (t.category || 'その他') === cat);
        const total = catTasks.length;
        const completed = catTasks.filter(t => t.completed).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        const bar = document.getElementById(`bar-${cat === 'シナリオ' ? 'scenario' : cat === 'イラスト' ? 'illustration' : cat === 'システム' ? 'system' : 'other'}`);
        const txt = document.getElementById(`percent-${cat === 'シナリオ' ? 'scenario' : cat === 'イラスト' ? 'illustration' : cat === 'システム' ? 'system' : 'other'}`);
        if (bar && txt) {
            bar.style.width = `${percent}%`;
            txt.textContent = `${percent}%`;
        }
    });
}

function renderScenario() {
    if (!scenarioInput) return;
    const text = appData[currentProject].chapters[currentChapter] || "";
    scenarioInput.value = text;
    updateCounts(text);
}

function updateCounts(text) {
    if (charCount) charCount.textContent = `現在の文字数: ${text.length} 文字`;
    const lines = text === "" ? 1 : text.split('\n').length;
    if (lineCount) lineCount.textContent = `現在の行数: ${lines} 行`;
}

// ==========================================
// 4. イベントリスナー（安全対策付き）
// ==========================================
tabButtons.forEach(button => {
    button.addEventListener('click', function() {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        const targetId = button.id.replace('tab-', 'section-');
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');
    });
});

if (openModalBtn) openModalBtn.addEventListener('click', () => taskModalOverlay && taskModalOverlay.classList.add('show'));
if (closeModalBtn) closeModalBtn.addEventListener('click', () => taskModalOverlay && taskModalOverlay.classList.remove('show'));
if (taskModalOverlay) {
    taskModalOverlay.addEventListener('click', (e) => { if (e.target === taskModalOverlay) taskModalOverlay.classList.remove('show'); });
}

if (addTaskBtn) {
    addTaskBtn.addEventListener('click', function() {
        const text = taskInput.value.trim();
        const category = categorySelect.value;
        const deadline = deadlineInput.value;

        if (text === "") {
            alert("タスク名を入力してください");
            return;
        }

        appData[currentProject].tasks.push({ text: text, category: category, deadline: deadline, completed: false });
        taskInput.value = "";
        deadlineInput.value = "";
        taskModalOverlay.classList.remove('show');
        saveAndRefreshAll();
    });
}

function handleScenarioInput() {
    if (!scenarioInput) return;
    appData[currentProject].chapters[currentChapter] = scenarioInput.value;
    localStorage.setItem('otome_app_data', JSON.stringify(appData)); 
    updateCounts(scenarioInput.value);
}

if (scenarioInput) {
    scenarioInput.addEventListener('input', handleScenarioInput);
    scenarioInput.addEventListener('keyup', handleScenarioInput);
    scenarioInput.addEventListener('compositionend', handleScenarioInput);
}

function renderCharacterButtons() {
    if (!charButtonsArea) return;
    charButtonsArea.innerHTML = "";
    const savedNames = localStorage.getItem('otome_char_names') || "主人公,ルカ,カイル";
    if (charConfigInput) charConfigInput.value = savedNames;
    
    if(savedNames.trim() === "") return;
    
    const nameArray = savedNames.split(',');
    nameArray.forEach(name => {
        const cleanName = name.trim();
        if(cleanName === "") return;
        
        const btn = document.createElement('button');
        btn.textContent = cleanName;
        btn.addEventListener('click', function() {
            if (!scenarioInput) return;
            const start = scenarioInput.selectionStart;
            const end = scenarioInput.selectionEnd;
            const oldText = scenarioInput.value;
            const insertText = `${cleanName}`;
            
            scenarioInput.value = oldText.substring(0, start) + insertText + oldText.substring(end);
            scenarioInput.focus();
            scenarioInput.selectionStart = scenarioInput.selectionEnd = start + cleanName.length;
            
            appData[currentProject].chapters[currentChapter] = scenarioInput.value;
            saveAndRefreshAll();
        });
        charButtonsArea.appendChild(btn);
    });
}

if (saveCharConfigBtn) {
    saveCharConfigBtn.addEventListener('click', function() {
        if (charConfigInput) {
            localStorage.setItem('otome_char_names', charConfigInput.value);
            renderCharacterButtons();
            alert("キャラクターショートカットを更新しました！");
        }
    });
}

if (projectSelect) {
    projectSelect.addEventListener('change', function() {
        currentProject = projectSelect.value;
        currentChapter = Object.keys(appData[currentProject].chapters)[0];
        saveAndRefreshAll();
    });
}

if (chapterSelect) {
    chapterSelect.addEventListener('change', function() {
        currentChapter = chapterSelect.value;
        saveAndRefreshAll();
    });
}

if (addProjectBtn) {
    addProjectBtn.addEventListener('click', function() {
        if (!newProjectNameInput) return;
        const name = newProjectNameInput.value.trim();
        if (!name) { alert("作品タイトルを入力してください"); return; }
        if (appData[name]) { alert("その作品はすでに存在します"); return; }
        
        appData[name] = {
            tasks: [],
            chapters: { "共通プロット": "ここに設定やプロットを書いてください。" }
        };
        
        currentProject = name;
        currentChapter = "共通プロット";
        newProjectNameInput.value = "";
        alert(`作品『${name}』を新設しました！`);
        saveAndRefreshAll();
    });
}

if (deleteProjectBtn) {
    deleteProjectBtn.addEventListener('click', function() {
        if (Object.keys(appData).length <= 1) { alert("最後の1つは削除できません"); return; }
        
        if (confirm(`本当に作品『${currentProject}』のデータをタスク・シナリオ含めてすべて【完全に削除】しますか？`)) {
            delete appData[currentProject];
            currentProject = Object.keys(appData)[0];
            currentChapter = Object.keys(appData[currentProject].chapters)[0];
            saveAndRefreshAll();
            alert("作品を削除しました。");
        }
    });
}

if (addChapterBtn) {
    addChapterBtn.addEventListener('click', function() {
        const chapName = prompt("新しい章の名前を入力してください（例：第2章、ルカルートなど）");
        if (!chapName || chapName.trim() === "") return;
        if (appData[currentProject].chapters[chapName]) { alert("その章はすでに存在します"); return; }
        
        appData[currentProject].chapters[chapName] = `${chapName}の本文をここに…`;
        currentChapter = chapName;
        saveAndRefreshAll();
        alert(`「${chapName}」を作成しました。`);
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.task-menu-popover').forEach(p => p.classList.remove('show'));
});

if (sortDeadlineBtn) {
    sortDeadlineBtn.addEventListener('click', function() {
        const projectData = appData[currentProject];
        projectData.tasks.sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
        });
        saveAndRefreshAll();
        alert("タスクを締切が近い順に並び替えました！");
    });
}

// ==========================================
// 5. 【通知機能】安全に動作する判定ロジック
// ==========================================

function checkDeadlines() {
    const projectData = appData[currentProject];
    if (!projectData || !projectData.tasks) return;

    const now = new Date();
    // 今日の日付を「YYYY-MM-DD」の文字列にする
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // 比較用に、今日の日付の「時刻を 00:00:00 にした Time オブジェクト」を作る
    const today = new Date(todayStr);

    let hasDeadlineOrOverdue = false;

    // 未完了のタスクをチェック
    projectData.tasks.forEach(task => {
        if (task.deadline && task.completed === false) {
            // タスクの締切日を比較用のオブジェクトに変換
            const taskDate = new Date(task.deadline);
            
            // 【修正】：今日が締切、または、締切日が今日よりも過去（期限切れ）の場合
            if (task.deadline === todayStr || taskDate < today) {
                hasDeadlineOrOverdue = true;
            }
        }
    });

    // 画面上の警告エリア（アラート）の表示制御
    // ※柚結のHTMLにある、赤い警告ボックスのID（'alert-container' など）に合わせてください
    const alertElement = document.getElementById('alert-container') || document.getElementById('deadline-alert') || document.querySelector('.alert'); 
    if (alertElement) {
        if (hasDeadlineOrOverdue) {
            // 🚨 今日締切、または期限切れの未完了タスクがあれば警告を出す
            alertElement.style.display = 'block';  
        } else {
            alertElement.style.display = 'none';   // なければ隠す
        }
    }
}


// ==========================================
// 6. 起動時の安全な処理フロー
// ==========================================
// 🚨【大修正】: まず最優先でデータを読み込んで画面を描画する（これで真っ白を防止）
renderCharacterButtons();
saveAndRefreshAll(); 

// 画面がしっかり出た後、安全に通知の許可を求めるおねだりを開始
if ('Notification' in window) {
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                checkDeadlines(); 
            }
        });
    } else if (Notification.permission === 'granted') {
        checkDeadlines();
    }
}

