// ==========================================
// 1. 要素の取得（新機能の部品も含む）
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

const scenarioInput = document.getElementById('scenario-input');
const charCount = document.getElementById('char-count');
const lineCount = document.getElementById('line-count');
const charButtonsArea = document.getElementById('character-buttons-area');

const charConfigInput = document.getElementById('char-config-input');
const saveCharConfigBtn = document.getElementById('save-char-config-btn');

// ★【新機能】作品・章管理の部品★
const projectSelect = document.getElementById('current-project-select');
const chapterSelect = document.getElementById('current-chapter-select');
const addProjectBtn = document.getElementById('add-project-btn');
const deleteProjectBtn = document.getElementById('delete-project-btn');
const addChapterBtn = document.getElementById('add-chapter-btn');
const newProjectNameInput = document.getElementById('new-project-name-input');

// ==========================================
// 2. データの初期化・読み込み
// ==========================================
// アプリ全体の全データ構造
let appData = JSON.parse(localStorage.getItem('otome_app_data'));
let currentProject = localStorage.getItem('otome_current_project');
let currentChapter = localStorage.getItem('otome_current_chapter');

// データが空っぽだった場合の初期データ作成
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

// 選択中の作品や章のつじつま合わせ
if (!currentProject || !appData[currentProject]) {
    currentProject = Object.keys(appData)[0];
}
if (!currentChapter || !appData[currentProject].chapters[currentChapter]) {
    currentChapter = Object.keys(appData[currentProject].chapters)[0];
}

// ==========================================
// 3. 画面描画（レンダリング）の関数群
// ==========================================

// 全体のデータをローカルストレージに保存して画面を再描画する
function saveAndRefreshAll() {
    localStorage.setItem('otome_app_data', JSON.stringify(appData));
    localStorage.setItem('otome_current_project', currentProject);
    localStorage.setItem('otome_current_chapter', currentChapter);
    
    renderProjectSelect();
    renderChapterSelect();
    renderTasks();
    renderScenario();
}

// 作品セレクトボックスの更新
function renderProjectSelect() {
    projectSelect.innerHTML = "";
    Object.keys(appData).forEach(projName => {
        const option = document.createElement('option');
        option.value = projName;
        option.textContent = projName;
        if (projName === currentProject) option.selected = true;
        projectSelect.appendChild(option);
    });
}

// 章セレクトボックスの更新
function renderChapterSelect() {
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

// タスク一覧と進捗グラフの描画
function renderTasks() {
    taskList.innerHTML = "";
    const projectData = appData[currentProject];
    const savedTasks = projectData.tasks;
    
    const now = new Date();
    const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    savedTasks.forEach(function(task, index) {
        const listItem = document.createElement('li');
        
        // カテゴリーバッジ
        const badgeSpan = document.createElement('span');
        badgeSpan.className = `category-badge badge-${task.category || 'その他'}`;
        badgeSpan.textContent = task.category || 'その他';
        listItem.appendChild(badgeSpan);

        // タスク本文
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

        // 完了ボタン
        const completeButton = document.createElement('button');
        completeButton.textContent = task.completed ? '戻す' : '完了';
        completeButton.style.cssText = `background-color: ${task.completed ? '#b0bec5' : '#81c784'}; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; margin-right: 5px;`;
        completeButton.addEventListener('click', function() {
            task.completed = !task.completed;
            saveAndRefreshAll();
        });
        listItem.appendChild(completeButton);

        // 3点リーダーメニュー
        const menuTrigger = document.createElement('button');
        menuTrigger.className = 'menu-trigger-btn';
        menuTrigger.innerHTML = '&#8942;';
        listItem.appendChild(menuTrigger);

        const popover = document.createElement('div');
        popover.className = 'task-menu-popover';

        // 編集
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

        // 削除
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑 タスクを削除';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', function() {
            if (confirm(`「${task.text}」を削除しますか？`)) {
                savedTasks.splice(index, 1);
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

    // グラフ更新
    const categories = ['シナリオ', 'イラスト', 'システム', 'その他'];
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

// シナリオ本文の描画と文字数計算
function renderScenario() {
    const text = appData[currentProject].chapters[currentChapter] || "";
    scenarioInput.value = text;
    updateCounts(text);
}

function updateCounts(text) {
    charCount.textContent = `現在の文字数: ${text.length} 文字`;
    const lines = text === "" ? 1 : text.split('\n').length;
    lineCount.textContent = `現在の行数: ${lines} 行`;
}

// ==========================================
// 4. イベントリスナー（ボタン操作の制御）
// ==========================================

// タブ切り替え
tabButtons.forEach(button => {
    button.addEventListener('click', function() {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        const targetId = button.id.replace('tab-', 'section-');
        document.getElementById(targetId).classList.add('active');
    });
});

// ポップアップ（モーダル）の開閉
openModalBtn.addEventListener('click', () => taskModalOverlay.classList.add('show'));
closeModalBtn.addEventListener('click', () => taskModalOverlay.classList.remove('show'));
taskModalOverlay.addEventListener('click', (e) => { if (e.target === taskModalOverlay) taskModalOverlay.classList.remove('show'); });

// タスクの追加
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

// シナリオの入力検知（リアルタイム保存）
scenarioInput.addEventListener('input', function() {
    appData[currentProject].chapters[currentChapter] = scenarioInput.value;
    localStorage.setItem('otome_app_data', JSON.stringify(appData)); // メモリ節約のためここだけ直接保存
    updateCounts(scenarioInput.value);
});

// キャラクターボタン機能（ここは以前のものをそのまま流用）
function renderCharacterButtons() {
    charButtonsArea.innerHTML = "";
    const savedNames = localStorage.getItem('otome_char_names') || "主人公,ルカ,カイル";
    charConfigInput.value = savedNames;
    
    if(savedNames.trim() === "") return;
    
    const nameArray = savedNames.split(',');
    nameArray.forEach(name => {
        const cleanName = name.trim();
        if(cleanName === "") return;
        
        const btn = document.createElement('button');
        btn.textContent = cleanName;
        btn.addEventListener('click', function() {
            const start = scenarioInput.selectionStart;
            const end = scenarioInput.selectionEnd;
            const oldText = scenarioInput.value;
            const insertText = `【${cleanName}】「」`;
            
            scenarioInput.value = oldText.substring(0, start) + insertText + oldText.substring(end);
            scenarioInput.focus();
            scenarioInput.selectionStart = scenarioInput.selectionEnd = start + cleanName.length + 4;
            
            appData[currentProject].chapters[currentChapter] = scenarioInput.value;
            saveAndRefreshAll();
        });
        charButtonsArea.appendChild(btn);
    });
}

saveCharConfigBtn.addEventListener('click', function() {
    localStorage.setItem('otome_char_names', charConfigInput.value);
    renderCharacterButtons();
    alert("キャラクターショートカットを更新しました！");
});

// ------------------------------------------
// ★【新機能】作品・章のイベント操作群★
// ------------------------------------------

// 作品を切り替えたとき
projectSelect.addEventListener('change', function() {
    currentProject = projectSelect.value;
    currentChapter = Object.keys(appData[currentProject].chapters)[0]; // その作品の最初の章にする
    saveAndRefreshAll();
});

// 章を切り替えたとき
chapterSelect.addEventListener('change', function() {
    currentChapter = chapterSelect.value;
    saveAndRefreshAll();
});

// 新しい作品を追加するボタン
addProjectBtn.addEventListener('click', function() {
    const name = newProjectNameInput.value.trim();
    if (!name) { alert("作品タイトルを入力してください"); return; }
    if (appData[name]) { alert("その作品はすでに存在します"); return; }
    
    // 新規作品の型を作る
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

// 選択中の作品を完全に削除する
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

// 新しい章を追加するボタン
addChapterBtn.addEventListener('click', function() {
    const chapName = prompt("新しい章の名前を入力してください（例：第2章、ルカルートなど）");
    if (!chapName || chapName.trim() === "") return;
    if (appData[currentProject].chapters[chapName]) { alert("その章はすでに存在します"); return; }
    
    appData[currentProject].chapters[chapName] = `${chapName}の本文をここに…`;
    currentChapter = chapName;
    saveAndRefreshAll();
    alert(`「${chapName}」を作成しました。`);
});

// 閉じるポップオーバーを画面クリックで隠すおまじない
document.addEventListener('click', () => {
    document.querySelectorAll('.task-menu-popover').forEach(p => p.classList.remove('show'));
});

// ==========================================
// 5. アプリ起動時のファースト実行
// ==========================================
renderCharacterButtons();
saveAndRefreshAll();