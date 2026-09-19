/**
 * ==========================================================================
 * MEU DIA — SPATIAL PRODUCTIVITY ENGINE (JAVASCRIPT ES6+)
 * Arquiteto Frontend & Lead Product Designer
 * ==========================================================================
 */

// Chaves de Persistência no LocalStorage
const STORAGE_TASKS_KEY = 'meu_dia_tarefas';
const STORAGE_PREFS_KEY = 'meu_dia_preferencias';

// Estado da Aplicação (App State)
let appState = {
    tasks: [],
    filter: 'all', // 'all' | 'pending' | 'completed'
    preferences: {
        theme: 'obsidian',
        accent: 'purple',
        density: 'comfortable'
    }
};

// Referências aos Elementos do DOM
const DOM = {
    // Formulário e Tarefas
    form: document.getElementById('todo-form'),
    taskInput: document.getElementById('task-input'),
    taskList: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    filterBtns: document.querySelectorAll('.segment-btn'),
    
    // Header & HUD
    liveClock: document.getElementById('live-clock'),
    currentDate: document.getElementById('current-date'),
    systemStatus: document.getElementById('system-status'),
    
    // Métricas e Progresso
    progressCircle: document.getElementById('progress-circle'),
    progressPercent: document.getElementById('progress-percent'),
    metricTotal: document.getElementById('metric-total'),
    metricPending: document.getElementById('metric-pending'),
    metricCompleted: document.getElementById('metric-completed'),
    
    // Painel de Preferências
    prefsToggle: document.getElementById('preferences-toggle'),
    prefsPanel: document.getElementById('preferences-panel'),
    prefsClose: document.getElementById('panel-close'),
    prefsDismiss: document.getElementById('panel-dismiss'),
    themeBtns: document.querySelectorAll('[data-set-theme]'),
    accentBtns: document.querySelectorAll('[data-set-accent]'),
    densityBtns: document.querySelectorAll('[data-set-density]'),
    
    // Bento Cards (para Efeitos Espaciais)
    bentoCards: document.querySelectorAll('.bento-card'),
    toastContainer: document.getElementById('toast-container')
};

/* ==========================================================================
   1. INICIALIZAÇÃO & PERSISTÊNCIA (LOCALSTORAGE)
   ========================================================================== */

/**
 * Inicializa a aplicação carregando dados do LocalStorage e configurando listeners
 */
function initApp() {
    loadPreferences();
    loadTasks();
    setupEventListeners();
    setupSpatialInteractions();
    startClock();
    render();

    // Inicializa os ícones SVG do Lucide
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Carrega e normaliza tarefas salvas no LocalStorage
 */
function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_TASKS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Normalização: suporta tanto array de strings legado quanto objetos modernos
            appState.tasks = parsed.map((item) => {
                if (typeof item === 'string') {
                    return {
                        id: Date.now() + Math.random(),
                        text: item,
                        completed: false,
                        createdAt: Date.now()
                    };
                }
                return item;
            });
        }
    } catch (e) {
        console.error('Falha ao ler tarefas do LocalStorage:', e);
        appState.tasks = [];
    }
}

/**
 * Persiste tarefas no LocalStorage
 */
function saveTasks() {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(appState.tasks));
}

/**
 * Carrega e aplica preferências visuais do usuário
 */
function loadPreferences() {
    try {
        const saved = localStorage.getItem(STORAGE_PREFS_KEY);
        if (saved) {
            appState.preferences = { ...appState.preferences, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Falha ao ler preferências:', e);
    }
    applyPreferences();
}

/**
 * Salva preferências no LocalStorage
 */
function savePreferences() {
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(appState.preferences));
}

/**
 * Aplica as preferências diretamente no elemento raiz <html>
 */
function applyPreferences() {
    const root = document.documentElement;
    root.setAttribute('data-theme', appState.preferences.theme);
    root.setAttribute('data-accent', appState.preferences.accent);
    root.setAttribute('data-density', appState.preferences.density);

    // Atualiza estados ativos nos seletores da UI
    DOM.themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.setTheme === appState.preferences.theme);
    });
    DOM.accentBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.setAccent === appState.preferences.accent);
    });
    DOM.densityBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.setDensity === appState.preferences.density);
    });
}

/* ==========================================================================
   2. LÓGICA DE NEGÓCIO (CRUD DE TAREFAS & REGRAS)
   ========================================================================== */

/**
 * Adiciona uma nova tarefa à lista
 * @param {Event} event 
 */
function handleAddTask(event) {
    event.preventDefault();

    const text = DOM.taskInput.value.trim();

    // Validação estrita: se vazio, notifica o usuário
    if (!text) {
        showToast('Por favor, digite uma tarefa antes de adicionar!', 'error');
        DOM.taskInput.focus();
        return;
    }

    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: Date.now()
    };

    appState.tasks.unshift(newTask);
    saveTasks();
    render();

    DOM.taskInput.value = '';
    DOM.taskInput.focus();
    showToast('Tarefa adicionada ao seu fluxo!');
}

/**
 * Alterna estado de conclusão da tarefa
 * @param {number} taskId 
 */
function toggleTask(taskId) {
    appState.tasks = appState.tasks.map(task => {
        if (task.id === taskId) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    saveTasks();
    render();
}

/**
 * Exclui uma tarefa da lista com microinteração
 * @param {number} taskId 
 */
function deleteTask(taskId) {
    appState.tasks = appState.tasks.filter(task => task.id !== taskId);
    saveTasks();
    render();
    showToast('Tarefa excluída.');
}

/* ==========================================================================
   3. RENDERIZAÇÃO DA INTERFACE & MÉTRICAS
   ========================================================================== */

/**
 * Renderiza todos os componentes sincronizados
 */
function render() {
    renderTasksList();
    renderMetrics();
}

/**
 * Renderiza a lista de tarefas aplicando filtros ativos
 */
function renderTasksList() {
    DOM.taskList.innerHTML = '';

    // Filtragem de dados
    const filteredTasks = appState.tasks.filter(task => {
        if (appState.filter === 'pending') return !task.completed;
        if (appState.filter === 'completed') return task.completed;
        return true;
    });

    // Controle de estado vazio
    if (filteredTasks.length === 0) {
        DOM.emptyState.classList.add('visible');
    } else {
        DOM.emptyState.classList.remove('visible');
    }

    // Criação dos nós DOM com proteção XSS (usando textContent)
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', task.id);

        // Conteúdo Principal (Checkbox + Texto)
        const mainContent = document.createElement('div');
        mainContent.className = 'task-main-content';

        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'task-checkbox-container';
        
        const checkboxCustom = document.createElement('div');
        checkboxCustom.className = 'task-checkbox-custom';
        checkboxCustom.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        const textSpan = document.createElement('span');
        textSpan.className = 'task-text';
        textSpan.textContent = task.text;

        checkboxContainer.appendChild(checkboxCustom);
        mainContent.appendChild(checkboxContainer);
        mainContent.appendChild(textSpan);

        // Alternar conclusão ao clicar no texto ou checkbox
        mainContent.addEventListener('click', () => toggleTask(task.id));

        // Botão Excluir (Vermelho Tátil)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-spatial';
        deleteBtn.innerHTML = `<i data-lucide="trash-2"></i><span>Excluir</span>`;
        deleteBtn.setAttribute('aria-label', `Excluir tarefa: ${task.text}`);

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });

        li.appendChild(mainContent);
        li.appendChild(deleteBtn);
        DOM.taskList.appendChild(li);
    });

    // Re-renderiza ícones SVG recém-adicionados
    if (window.lucide) {
        window.lucide.createIcons({ root: DOM.taskList });
    }
}

/**
 * Atualiza o radar radial de progresso e métricas numéricas
 */
function renderMetrics() {
    const total = appState.tasks.length;
    const completed = appState.tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Atualiza números
    DOM.metricTotal.textContent = total;
    DOM.metricPending.textContent = pending;
    DOM.metricCompleted.textContent = completed;
    DOM.progressPercent.textContent = `${percentage}%`;

    // Atualiza o círculo SVG (circunferência = 2 * PI * 50 = 314.159)
    const circumference = 314.159;
    const offset = circumference - (percentage / 100) * circumference;
    DOM.progressCircle.style.strokeDashoffset = offset;

    // Atualiza status do sistema no cabeçalho
    if (total === 0) {
        DOM.systemStatus.textContent = 'Aguardando Tarefas';
    } else if (percentage === 100) {
        DOM.systemStatus.textContent = 'Metas do Dia Concluídas!';
    } else {
        DOM.systemStatus.textContent = `${pending} ${pending === 1 ? 'pendência ativa' : 'pendências ativas'}`;
    }
}

/* ==========================================================================
   4. INTERAÇÕES ESPACIAIS, MOUSE SPOTLIGHT & FÍSICA 3D
   ========================================================================== */

/**
 * Configura o spotlight e rotação 3D espacial nos Bento Cards
 */
function setupSpatialInteractions() {
    DOM.bentoCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Variáveis CSS para o Spotlight de Luz
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);

            // Rotação 3D suave com perspectiva
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -3; // Max 3 graus
            const rotateY = ((x - centerX) / centerX) * 3;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            // Retorno à posição de repouso
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        });
    });
}

/* ==========================================================================
   5. RELÓGIO & DATA EM TEMPO REAL
   ========================================================================== */

function startClock() {
    function update() {
        const now = new Date();
        
        // Relógio HUD
        DOM.liveClock.textContent = now.toLocaleTimeString('pt-BR');
        
        // Data formatada com sofisticação
        const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        DOM.currentDate.textContent = now.toLocaleDateString('pt-BR', dateOptions);
    }
    update();
    setInterval(update, 1000);
}

/* ==========================================================================
   6. SISTEMA DE TOAST MODERNO
   ========================================================================== */

/**
 * Exibe notificação tátil tipo Toast
 * @param {string} message 
 * @param {'info'|'error'} type 
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    
    const iconName = type === 'error' ? 'alert-circle' : 'check';
    toast.innerHTML = `<i data-lucide="${iconName}" class="toast-icon"></i><span>${message}</span>`;
    
    DOM.toastContainer.appendChild(toast);
    
    if (window.lucide) {
        window.lucide.createIcons({ root: toast });
    }

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

/* ==========================================================================
   7. EVENT LISTENERS
   ========================================================================== */

function setupEventListeners() {
    // Submissão do formulário
    DOM.form.addEventListener('submit', handleAddTask);

    // Filtros de visualização
    DOM.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.filter = btn.dataset.filter;
            renderTasksList();
        });
    });

    // Abertura / Fechamento do Painel de Preferências
    DOM.prefsToggle.addEventListener('click', () => {
        DOM.prefsPanel.classList.add('active');
        DOM.prefsPanel.setAttribute('aria-hidden', 'false');
    });

    const closePanel = () => {
        DOM.prefsPanel.classList.remove('active');
        DOM.prefsPanel.setAttribute('aria-hidden', 'true');
    };

    DOM.prefsClose.addEventListener('click', closePanel);
    DOM.prefsDismiss.addEventListener('click', closePanel);

    // Seletores de Tema
    DOM.themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            appState.preferences.theme = btn.dataset.setTheme;
            savePreferences();
            applyPreferences();
        });
    });

    // Seletores de Acento Cromático
    DOM.accentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            appState.preferences.accent = btn.dataset.setAccent;
            savePreferences();
            applyPreferences();
        });
    });

    // Seletores de Densidade
    DOM.densityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            appState.preferences.density = btn.dataset.setDensity;
            savePreferences();
            applyPreferences();
        });
    });
}

// Inicializa a aplicação ao carregar o DOM
document.addEventListener('DOMContentLoaded', initApp);
