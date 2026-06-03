// --- タブ切り替え機能（3画面対応） ---
const tabs = {
    task: document.getElementById('tab-task'),
    scenario: document.getElementById('tab-scenario'),
    setting: document.getElementById('tab-setting')
};

const sections = {
    task: document.getElementById('section-task'),
    scenario: document.getElementById('section-scenario'),
    setting: document.getElementById('section-setting')
};

function switchTab(activeKey) {
    Object.keys(tabs).forEach(key => {
        if (key === activeKey) {
            tabs[key].classList.add('active');
            sections[key].classList.add('active');
        } else {
            tabs[key].classList.remove('active');
            sections[key].classList.remove('active');
        }
    });
}

tabs.task.addEventListener('click', () => switchTab('task'));
tabs.scenario.addEventListener('click', () => switchTab('scenario'));
tabs.setting.addEventListener('click', () => switchTab('setting'));


// --- タスク管理機能（3点リーダーメニュー・削除・編集対応版） ---
const taskInput = document.getElementById('task-input');
const taskCategory = document.getElementById('task-category');
const deadlineInput = document.getElementById('task-deadline');
const taskButton = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

// ★【新機能】ポップアップ用の部品を捕まえる★
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const taskModalOverlay = document.getElementById('task-modal-overlay');

// 「＋ タスクを追加する」ボタンを押したらポップアップを表示
openModalBtn.addEventListener('click', function() {
    taskModalOverlay.classList.add('show');
});

// 「キャンセル」ボタンを押したらポップアップを非表示
closeModalBtn.addEventListener('click', function() {
    taskModalOverlay.classList.remove('show');
});

// 背景の黒い部分をクリックしても閉じるようにする
taskModalOverlay.addEventListener('click', function(e) {
    if (e.target === taskModalOverlay) {
        taskModalOverlay.classList.remove('show');
    }
});

let savedTasks = JSON.parse(localStorage.getItem('otome-tasks')) || [];

function renderTasks() {
    taskList.innerHTML = "";
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${date}`;

    savedTasks.forEach(function(task, index) {
        const listItem = document.createElement('li');
        
        // 1. カテゴリーバッジ
        const badgeSpan = document.createElement('span');
        badgeSpan.className = `category-badge badge-${task.category || 'その他'}`;
        badgeSpan.textContent = task.category || 'その他';
        listItem.appendChild(badgeSpan);

        // 2. タスク本文と締切
        const textSpan = document.createElement('span');
        textSpan.style.flex = "1";
        
        if (task.deadline !== "") {
            textSpan.textContent = `${task.text} (締切: ${task.deadline})`;
            if (!task.completed && task.deadline <= todayString) {
                listItem.classList.add('overdue');
            }
        } else {
            textSpan.textContent = task.text;
        }

        if (task.completed) {
            textSpan.style.textDecoration = 'line-through';
            listItem.classList.remove('overdue');
        }
        listItem.appendChild(textSpan);

        // 3. ★【復活】完了 / 戻す ボタンをここに再配置★
        const completeButton = document.createElement('button');
        completeButton.textContent = task.completed ? '戻す' : '完了';
        completeButton.style.backgroundColor = task.completed ? '#b0bec5' : '#81c784';
        completeButton.style.color = 'white';
        completeButton.style.border = 'none';
        completeButton.style.borderRadius = '4px';
        completeButton.style.padding = '6px 12px';
        completeButton.style.fontSize = '12px';
        completeButton.style.cursor = 'pointer';
        completeButton.style.marginRight = '5px'; // 3点リーダーとの間に少し隙間を作る

        completeButton.addEventListener('click', function() {
            savedTasks[index].completed = !savedTasks[index].completed;
            saveAndRefreshTasks();
        });
        listItem.appendChild(completeButton);

        // 4. 3点リーダーボタン
        const menuTrigger = document.createElement('button');
        menuTrigger.className = 'menu-trigger-btn';
        menuTrigger.innerHTML = '&#8942;';
        listItem.appendChild(menuTrigger);

        // 5. 浮き出るメニュー（ポップアップ）本体
        const popover = document.createElement('div');
        popover.className = 'task-menu-popover';

        // ★メニュー内からは完了ボタンを削除し、「編集」と「削除」だけにする★
        
        // 編集ボタン
        const editBtn = document.createElement('button');
        editBtn.textContent = '✏ タスクを編集';
        editBtn.addEventListener('click', function() {
            const newText = prompt("タスク内容を編集してください", task.text);
            if (newText !== null && newText.trim() !== "") {
                savedTasks[index].text = newText;
                saveAndRefreshTasks();
            }
        });
        popover.appendChild(editBtn);

        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑 タスクを削除';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', function() {
            if (confirm(`「${task.text}」を削除しますか？`)) {
                savedTasks.splice(index, 1);
                saveAndRefreshTasks();
            }
        });
        popover.appendChild(deleteBtn);

        listItem.appendChild(popover);

        // 3点リーダーの開閉処理
        menuTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            document.querySelectorAll('.task-menu-popover').forEach(p => {
                if (p !== popover) p.classList.remove('show');
            });
            popover.classList.toggle('show');
        });

        taskList.appendChild(listItem);
    });

    // 進捗グラフの更新処理（ここはそのまま）
    const categories = ['シナリオ', 'イラスト', 'システム', 'その他'];
    const barElements = {
        'シナリオ': document.getElementById('bar-scenario'),
        'イラスト': document.getElementById('bar-illustration'),
        'システム': document.getElementById('bar-system'),
        'その他': document.getElementById('bar-other')
    };
    const percentElements = {
        'シナリオ': document.getElementById('percent-scenario'),
        'イラスト': document.getElementById('percent-illustration'),
        'システム': document.getElementById('percent-system'),
        'その他': document.getElementById('percent-other')
    };

    categories.forEach(cat => {
        const catTasks = savedTasks.filter(t => (t.category || 'その他') === cat);
        const total = catTasks.length;
        const completed = catTasks.filter(t => t.completed).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        if (barElements[cat] && percentElements[cat]) {
            barElements[cat].style.width = `${percent}%`;
            percentElements[cat].textContent = `${percent}%`;
        }
    });
}
// 画面のどこかを変更したときに、メニューを閉じる処理
document.addEventListener('click', function() {
    document.querySelectorAll('.task-menu-popover').forEach(p => p.classList.remove('show'));
});

function saveAndRefreshTasks() {
    localStorage.setItem('otome-tasks', JSON.stringify(savedTasks));
    renderTasks();
}

taskButton.addEventListener('click', function() {
    const taskText = taskInput.value;
    const categoryText = taskCategory.value;
    const deadlineText = deadlineInput.value;

    if (taskText === "") {
        alert("タスクを入力してください");
        return;
    }

    savedTasks.push({
        text: taskText,
        category: categoryText,
        deadline: deadlineText,
        completed: false
    });

    saveAndRefreshTasks();
    taskInput.value = "";
    deadlineInput.value = "";
    saveAndRefreshTasks();
    taskInput.value = "";
    deadlineInput.value = "";
    taskModalOverlay.classList.remove('show'); // ★【新機能】追加し終わったらポップアップを閉じる
});

// --- シナリオ作成機能 ＆ 設定機能 ---
const scenarioInput = document.getElementById('scenario-input');
const charCount = document.getElementById('char-count');
const lineCount = document.getElementById('line-count');

const charConfigInput = document.getElementById('char-config-input');
const saveCharConfigBtn = document.getElementById('save-char-config-btn');
const characterButtonsArea = document.getElementById('character-buttons-area');

const savedScenario = localStorage.getItem('otome-scenario') || "";
scenarioInput.value = savedScenario;
updateCounts(savedScenario);

let savedCharNames = localStorage.getItem('otome-char-names') || "主人公,キャラA,キャラB";
charConfigInput.value = savedCharNames;

scenarioInput.addEventListener('input', function() {
    const textValue = scenarioInput.value;
    updateCounts(textValue);
    localStorage.setItem('otome-scenario', textValue);
});

function updateCounts(text) {
    charCount.textContent = `現在の文字数: ${text.length} 文字`;
    const lines = text === "" ? 1 : text.split('\n').length;
    lineCount.textContent = `現在の行数: ${lines} 行`;
}

function renderCharacterButtons() {
    characterButtonsArea.innerHTML = "";
    const nameList = savedCharNames.split(',');
    
    nameList.forEach(function(name) {
        const trimmedName = name.trim();
        if (trimmedName === "") return;
        
        const button = document.createElement('button');
        button.className = 'char-btn';
        button.textContent = trimmedName;
        
        button.addEventListener('click', function() {
            const insertText = `${trimmedName}\n「」`; 
            
            const startPos = scenarioInput.selectionStart;
            const endPos = scenarioInput.selectionEnd;
            const currentText = scenarioInput.value;
            
            scenarioInput.value = currentText.substring(0, startPos) + insertText + currentText.substring(endPos);
            
            updateCounts(scenarioInput.value);
            localStorage.setItem('otome-scenario', scenarioInput.value);
            
            const newCursorPos = startPos + insertText.length;
            scenarioInput.focus();
            scenarioInput.setSelectionRange(newCursorPos, newCursorPos);
        });
        
        characterButtonsArea.appendChild(button);
    });
}

saveCharConfigBtn.addEventListener('click', function() {
    const inputValue = charConfigInput.value;
    if (inputValue.trim() === "") {
        alert("キャラクター名を入力してください");
        return;
    }
    
    savedCharNames = inputValue;
    localStorage.setItem('otome-char-names', savedCharNames);
    renderCharacterButtons();
    alert("設定を保存しました！");
});

renderCharacterButtons();
renderTasks();