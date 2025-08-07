"use strict";
// --- CONFIGURAÇÃO INICIAL E SUPABASE ---
const SUPABASE_URL = 'https://zzrylgsjksrjotgcwavt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnlsZ3Nqa3Nyam90Z2N3YXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4Mjc0OTYsImV4cCI6MjA2NDQwMzQ5Nn0.caBlCmOqKonuxTPacPIHH1FeVZFr8AJKwpz_v1Q3BwM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper function for date formatting
function formatDisplayDate(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting date:", e);
        return isoString; // Fallback to raw string
    }
}

// New helper function for spaced repetition logic
function getSpacedRepetitionStatus(card) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const cadastroDate = new Date(card.data_cadastro);
    cadastroDate.setHours(0, 0, 0, 0);

    let baseDate = cadastroDate;
    let intervalDays = 0; // This will be the interval for the *next* review

    if (card.data_last_view) {
        const lastViewDate = new Date(card.data_last_view);
        lastViewDate.setHours(0, 0, 0, 0);
        baseDate = lastViewDate;

        // Calculate days passed since last review
        const daysSinceLastReview = Math.max(0, Math.floor((today - lastViewDate) / (1000 * 60 * 60 * 24)));
        
        // The next interval is based on the days passed since the last review,
        // multiplied by a factor (1.3 for 30% increase).
        intervalDays = Math.max(1, Math.floor(daysSinceLastReview * 1.3)); // Ensure at least 1 day
    } else {
        // For the very first review, make it available after 1 day from cadastro.
        intervalDays = 1;
    }

    const nextReviewDate = new Date(baseDate);
    nextReviewDate.setDate(baseDate.getDate() + intervalDays);

    const isReadyForReview = today >= nextReviewDate;

    return {
        nextReviewDate: nextReviewDate.toISOString().split('T')[0], // YYYY-MM-DD format
        isReadyForReview: isReadyForReview,
        statusText: isReadyForReview ? 'Pronto para Revisar' : `Próxima Revisão: ${formatDisplayDate(nextReviewDate.toISOString())}`
    };
}

// Função global para gerenciar o arrasto do botão de vídeo
window.handleVideoButtonDrag = function(event, button) {
    event.preventDefault();
    const isTouch = event.type.startsWith('touch');
    let startX, startY, initialX, initialY;
    let transform = { x: 0, y: 0 };

    // Pega a posição inicial do botão relativa à janela
    const rect = button.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;

    // Define o ponto inicial do arrasto
    if (isTouch) {
        startX = event.touches[0].clientX - initialX;
        startY = event.touches[0].clientY - initialY;
    } else {
        startX = event.clientX - initialX;
        startY = event.clientY - initialY;
    }

    // Remove a transformação inicial do botão
    button.style.transform = 'none';
    button.style.left = initialX + 'px';
    button.style.bottom = 'auto';
    button.style.top = initialY + 'px';

    let isDragging = false;
    const moveThreshold = 5; // Pixels mínimos para considerar como arrasto

    function handleMove(e) {
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        if (!isDragging) {
            // Verifica se moveu o suficiente para considerar como arrasto
            const deltaX = Math.abs(clientX - (isTouch ? event.touches[0].clientX : event.clientX));
            const deltaY = Math.abs(clientY - (isTouch ? event.touches[0].clientY : event.clientY));
            if (deltaX > moveThreshold || deltaY > moveThreshold) {
                isDragging = true;
                button.style.cursor = 'move';
            }
        }

        if (isDragging) {
            e.preventDefault();
            // Calcula a nova posição
            const newX = clientX - startX;
            const newY = clientY - startY;

            // Limita o movimento dentro da janela
            const buttonRect = button.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            const limitedX = Math.min(Math.max(newX, 0), windowWidth - buttonRect.width);
            const limitedY = Math.min(Math.max(newY, 0), windowHeight - buttonRect.height);

            button.style.left = limitedX + 'px';
            button.style.top = limitedY + 'px';
        }
    }

    function handleEnd(e) {
        if (!isDragging) {
            // Se não houve arrasto, considera como clique e abre o modal
            const link = button.dataset.link;
            if (typeof window.openMovableVideoModal === 'function') {
                window.openMovableVideoModal(link);
            }
        }

        document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', handleMove);
        document.removeEventListener(isTouch ? 'touchend' : 'mouseup', handleEnd);
        button.style.cursor = 'pointer';
        isDragging = false;
    }

    document.addEventListener(isTouch ? 'touchmove' : 'mousemove', handleMove, { passive: false });
    document.addEventListener(isTouch ? 'touchend' : 'mouseup', handleEnd);
};

// Função genérica para criar modais de CRUD (deve estar no topo do arquivo)
function createCrudModal({ title, formFields, onSubmit, initialData = {}, language = null }) {
    const crudModalRoot = document.getElementById('crud-modal-root');
    if (!crudModalRoot) {
        console.error('Elemento #crud-modal-root não encontrado no DOM. Impossível exibir modal CRUD.');
        return;
    }
    const isEdit = !!initialData.id;
    const fieldsHtml = formFields.map(field => {
        if (field.hideOnCreate && !isEdit) return '';
        const value = initialData[field.name] || '';
        const readonly = field.readonly ? 'readonly' : '';
        switch(field.type) {
            case 'textarea':
                return `<textarea name="${field.name}" placeholder="${field.placeholder}" ${readonly}>${value}</textarea>`;
            case 'select':
                const optionsHtml = field.options.map(opt => 
                    `<option value="${opt.value}" ${opt.value == value ? 'selected' : ''}>${opt.label}</option>`
                ).join('');
                return `<select name="${field.name}" ${readonly}>${optionsHtml}</select>`;
            default:
                return `<input type="${field.type}" name="${field.name}" placeholder="${field.placeholder}" value="${value}" ${readonly}>`;
        }
    }).join('');

    // Define estilos baseados no idioma
    let modalStyles = '';
    let headerStyles = 'position: sticky; top: 0; background: #fff; z-index: 1; padding: 16px; border-bottom: 1px solid #eee;';
    let buttonStyles = '';
    
    if (language === 'english') {
        modalStyles = 'border: 3px solid #012169; box-shadow: 0 8px 32px rgba(1, 33, 105, 0.3);';
        headerStyles = 'position: sticky; top: 0; background: linear-gradient(135deg, #012169 0%, #FFFFFF 50%, #C8102E 100%); z-index: 1; padding: 16px; border-bottom: 2px solid #012169;';
        buttonStyles = 'background: linear-gradient(90deg, #012169 0%, #C8102E 100%); border: none; color: white;';
    } else if (language === 'spanish') {
        modalStyles = 'border: 3px solid #C60B1E; box-shadow: 0 8px 32px rgba(198, 11, 30, 0.3);';
        headerStyles = 'position: sticky; top: 0; background: linear-gradient(135deg, #C60B1E 0%, #FFC400 50%, #C60B1E 100%); z-index: 1; padding: 16px; border-bottom: 2px solid #C60B1E;';
        buttonStyles = 'background: linear-gradient(90deg, #C60B1E 0%, #FFC400 100%); border: none; color: white;';
    }

    const modalHtml = `
        <div class="modal-overlay crud-modal ${language ? language + '-modal' : ''}" style="z-index: 2147483647 !important; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="z-index: 2147483647 !important; background: #fff; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); max-width: 400px; width: 100%; position: relative; ${modalStyles}">
                <div class="modal-header" style="${headerStyles}">
                    <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; ${language ? 'color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);' : ''}">${title}</h3>
                    </div>
                    <button class="close-btn" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 1.5em; ${language ? 'color: white;' : 'color: #222;'} cursor: pointer;">×</button>
                </div>
                <div class="modal-body">
                    <form>
                        ${fieldsHtml}
                        <div class="action-buttons">
                            <button type="submit" style="${buttonStyles}">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;

    crudModalRoot.innerHTML = modalHtml;
    const form = crudModalRoot.querySelector('form');
    const modalOverlay = crudModalRoot.querySelector('.modal-overlay');

    // Adiciona classe show para tornar o modal visível (unificado)
    setTimeout(() => modalOverlay.classList.add('show'), 10);

    // Fecha ao clicar fora do modal
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            crudModalRoot.innerHTML = '';
        }
    });

    modalOverlay.querySelector('.close-btn').onclick = () => {
        crudModalRoot.innerHTML = '';
    };

    // Manipulador do botão "Adicionar Novo"
    const addNewButton = modalOverlay.querySelector('.add-new-button');
    if (addNewButton) {
        addNewButton.onclick = () => {
            // Limpa o formulário
            form.reset();
            // Rola para o topo do modal
            modalOverlay.querySelector('.modal-body').scrollTop = 0;
        };
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        await onSubmit(data);
        crudModalRoot.innerHTML = '';
    };
}

// Função para criar modal de confirmação personalizado
function showConfirmModal(message, onConfirm, onCancel = null) {
    const modalHtml = `
        <div class="modal-overlay crud-modal" style="z-index: 2147483647 !important; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="z-index: 2147483647 !important; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); padding: 32px 24px 24px 24px; max-width: 400px; width: 100%; position: relative; text-align: center;">
                <div style="font-size: 3em; margin-bottom: 16px;">⚠️</div>
                <h3 style="margin: 0 0 16px 0; color: #333; font-size: 1.3em;">Confirmação</h3>
                <p style="margin: 0 0 24px 0; color: #666; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="cancel-btn" style="padding: 12px 24px; border: 2px solid #ddd; background: #fff; color: #666; border-radius: 8px; cursor: pointer; font-size: 1em; transition: all 0.2s;">Cancelar</button>
                    <button class="confirm-btn" style="padding: 12px 24px; border: none; background: #dc3545; color: #fff; border-radius: 8px; cursor: pointer; font-size: 1em; transition: all 0.2s;">Confirmar</button>
                </div>
            </div>
        </div>`;

    const crudModalRoot = document.getElementById('crud-modal-root');
    if (!crudModalRoot) {
        console.error('Elemento #crud-modal-root não encontrado no DOM.');
        return;
    }

    crudModalRoot.innerHTML = modalHtml;
    const modalOverlay = crudModalRoot.querySelector('.modal-overlay');
    const confirmBtn = crudModalRoot.querySelector('.confirm-btn');
    const cancelBtn = crudModalRoot.querySelector('.cancel-btn');

    // Adiciona classe show para tornar o modal visível
    setTimeout(() => modalOverlay.classList.add('show'), 10);

    // Eventos dos botões
    confirmBtn.onclick = () => {
        crudModalRoot.innerHTML = '';
        if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
        crudModalRoot.innerHTML = '';
        if (onCancel) onCancel();
    };

    // Fecha ao clicar fora do modal
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            crudModalRoot.innerHTML = '';
            if (onCancel) onCancel();
        }
    });

    // Efeitos hover nos botões
    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.background = '#c82333';
        confirmBtn.style.transform = 'scale(1.05)';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.background = '#dc3545';
        confirmBtn.style.transform = 'scale(1)';
    });

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = '#f8f9fa';
        cancelBtn.style.borderColor = '#adb5bd';
        cancelBtn.style.transform = 'scale(1.05)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = '#fff';
        cancelBtn.style.borderColor = '#ddd';
        cancelBtn.style.transform = 'scale(1)';
    });
}

// Configurações para cada tipo de CRUD (deve estar no escopo global)
function getCrudConfig(type) {
    const configs = {
        video_text: {
            label: 'Vídeo/Text',
            fields: [
                { name: 'link_video', type: 'text', placeholder: 'Link do Vídeo' },
                { name: 'text', type: 'textarea', placeholder: 'Texto' },
                { name: 'id_disciplina', type: 'hidden', placeholder: 'ID da Disciplina', hideOnCreate: true }
            ]
        },
        video: {
            label: 'Vídeo',
            fields: [
                { name: 'title', type: 'text', placeholder: 'Título' },
                { name: 'video_link', type: 'text', placeholder: 'Link do Vídeo (YouTube)' },
            ]
        },
        practice: {
            label: 'Prática',
            fields: [
                 { name: 'tipo', type: 'select', options: [
                     {value: 'Teoria', label: 'Teoria'},
                     {value: 'Exemplo', label: 'Exemplo'},
                     {value: 'Exercício', label: 'Exercício'},
                 ]},
                { name: 'texto', type: 'textarea', placeholder: 'Descrição da prática' },
                { name: 'link', type: 'text', placeholder: 'Link (Opcional)' },
            ]
        },
        disciplina: {
            label: 'Disciplina',
            fields: [
                { name: 'nome', type: 'text', placeholder: 'Nome da disciplina' },
                { name: 'date_inicio', type: 'date', placeholder: 'Data de início' },
                { name: 'situation', type: 'select', options: [
                    { value: 'estudando', label: 'Estudando' },
                    { value: 'finalizado', label: 'Finalizado' }
                ], placeholder: 'Situação' },
                { name: 'date_fim', type: 'date', placeholder: 'Data de fim' },
                { name: 'tipo_disciplina', type: 'select', options: [
                    { value: 'normal', label: 'Normal' },
                    { value: 'idioma', label: 'Idioma' }
                ], placeholder: 'Tipo da Disciplina' }
            ]
        },
        tasks: {
            label: 'Tarefa',
            fields: [
                { name: 'nome', type: 'text', placeholder: 'Nome da tarefa' },
                // { name: 'data_inicio', type: 'date', placeholder: 'Data de início' }, // Removido do formulário
                { name: 'data_fim', type: 'date', placeholder: 'Data de fim' },
                { name: 'situacao', type: 'select', options: [
                    { value: 'pendente', label: 'Pendente' },
                    { value: 'em andamento', label: 'Em andamento' },
                    { value: 'concluída', label: 'Concluída' }
                ], placeholder: 'Situação' }
            ]
        },
        flashcard: {
            label: 'Flashcard',
            fields: [
                { name: 'card', type: 'textarea', placeholder: 'Frente || Verso || Descrição da Imagem' },
                { name: 'data_cadastro', type: 'text', placeholder: 'Data de Cadastro', readonly: true, hideOnCreate: true },
                { name: 'data_last_view', type: 'text', placeholder: 'Última Visualização', readonly: true, hideOnCreate: true }
            ]
        }
    };
    return configs[type];
}

// --- PERSONALIZAÇÃO POR IDIOMA ---
// Função para detectar o idioma da disciplina e personalizar a interface
function detectLanguageAndCustomize(disciplineName) {
    const englishKeywords = ['english', 'inglês', 'ingles', 'english language', 'esl'];
    const spanishKeywords = ['spanish', 'espanhol', 'español', 'castellano', 'spanish language'];
    
    const lowerName = disciplineName.toLowerCase();
    
    let detectedLanguage = null;
    
    if (englishKeywords.some(keyword => lowerName.includes(keyword))) {
        detectedLanguage = 'english';
    } else if (spanishKeywords.some(keyword => lowerName.includes(keyword))) {
        detectedLanguage = 'spanish';
    }
    
    return detectedLanguage;
}

// Função para aplicar personalização visual baseada no idioma
function applyLanguageCustomization(language) {
    const englishFlag = document.querySelector('.flag-icon[alt="Bandeira da Inglaterra"]');
    const spanishFlag = document.querySelector('.flag-icon[alt="Bandeira da Espanha"]');
    const dashboard = document.getElementById('dashboard');
    const contentView = document.getElementById('content-view');
    const header = document.querySelector('.main-header');
    const cards = document.querySelectorAll('.card-disciplina');
    
    if (!englishFlag || !spanishFlag) return;
    
    // Remove personalizações anteriores
    englishFlag.style.border = '';
    spanishFlag.style.border = '';
    englishFlag.style.transform = '';
    spanishFlag.style.transform = '';
    englishFlag.style.opacity = '1';
    spanishFlag.style.opacity = '1';
    englishFlag.style.filter = '';
    spanishFlag.style.filter = '';
    
    // Remove classes de personalização anteriores
    document.body.classList.remove('english-theme', 'spanish-theme');
    
    if (language === 'english') {
        // Destaca a bandeira da Inglaterra
        englishFlag.style.border = '3px solid #FFD700';
        englishFlag.style.transform = 'scale(1.2)';
        englishFlag.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.7)';
        
        // Aplica filtro na bandeira da Espanha
        spanishFlag.style.opacity = '0.5';
        spanishFlag.style.filter = 'grayscale(50%)';
        
        // Aplica tema inglês (cores da bandeira: azul, branco, vermelho)
        document.body.classList.add('english-theme');
        
        // Header com gradiente das cores da bandeira inglesa
        if (header) {
            header.style.background = 'linear-gradient(135deg, #012169 0%, #FFFFFF 50%, #C8102E 100%)';
        }
        
        // Dashboard com fundo sutil das cores inglesas
        if (dashboard) {
            dashboard.style.background = 'linear-gradient(135deg, rgba(1, 33, 105, 0.05) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(200, 16, 46, 0.05) 100%)';
            dashboard.style.border = '2px solid rgba(1, 33, 105, 0.2)';
        }
        
        // Content view com tema inglês
        if (contentView) {
            contentView.style.background = 'linear-gradient(135deg, rgba(1, 33, 105, 0.03) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(200, 16, 46, 0.03) 100%)';
            contentView.style.border = '1px solid rgba(1, 33, 105, 0.1)';
        }
        
        // Cards com bordas temáticas
        cards.forEach(card => {
            card.style.borderLeft = '4px solid #012169';
            card.style.background = 'linear-gradient(135deg, rgba(1, 33, 105, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%)';
        });
        
    } else if (language === 'spanish') {
        // Destaca a bandeira da Espanha
        spanishFlag.style.border = '3px solid #FFD700';
        spanishFlag.style.transform = 'scale(1.2)';
        spanishFlag.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.7)';
        
        // Aplica filtro na bandeira da Inglaterra
        englishFlag.style.opacity = '0.5';
        englishFlag.style.filter = 'grayscale(50%)';
        
        // Aplica tema espanhol (cores da bandeira: vermelho e amarelo)
        document.body.classList.add('spanish-theme');
        
        // Header com gradiente das cores da bandeira espanhola
        if (header) {
            header.style.background = 'linear-gradient(135deg, #C60B1E 0%, #FFC400 50%, #C60B1E 100%)';
        }
        
        // Dashboard com fundo sutil das cores espanholas
        if (dashboard) {
            dashboard.style.background = 'linear-gradient(135deg, rgba(198, 11, 30, 0.05) 0%, rgba(255, 196, 0, 0.1) 50%, rgba(198, 11, 30, 0.05) 100%)';
            dashboard.style.border = '2px solid rgba(198, 11, 30, 0.2)';
        }
        
        // Content view com tema espanhol
        if (contentView) {
            contentView.style.background = 'linear-gradient(135deg, rgba(198, 11, 30, 0.03) 0%, rgba(255, 196, 0, 0.1) 50%, rgba(198, 11, 30, 0.03) 100%)';
            contentView.style.border = '1px solid rgba(198, 11, 30, 0.1)';
        }
        
        // Cards com bordas temáticas
        cards.forEach(card => {
            card.style.borderLeft = '4px solid #C60B1E';
            card.style.background = 'linear-gradient(135deg, rgba(198, 11, 30, 0.02) 0%, rgba(255, 196, 0, 0.05) 50%, rgba(255, 255, 255, 0.8) 100%)';
        });
        
    } else {
        // Sem idioma detectado - remove todas as personalizações
        if (header) {
            header.style.background = '';
        }
        if (dashboard) {
            dashboard.style.background = '';
            dashboard.style.border = '';
        }
        if (contentView) {
            contentView.style.background = '';
            contentView.style.border = '';
        }
        cards.forEach(card => {
            card.style.borderLeft = '';
            card.style.background = '';
        });
    }
}

// Função para aplicar personalização nos botões FAB baseada no idioma
function applyButtonCustomization(language) {
    const editGearBtn = document.getElementById('edit-gear-btn');
    const extraContentBtn = document.getElementById('extra-content-btn');
    const fabButtons = document.querySelectorAll('.fab');
    
    // Remove personalizações anteriores
    fabButtons.forEach(btn => {
        btn.classList.remove('english-fab', 'spanish-fab');
        btn.style.background = '';
        btn.style.border = '';
        btn.style.boxShadow = '';
    });
    
    if (language === 'english') {
        // Personalização para inglês (cores da bandeira: azul, branco, vermelho)
        fabButtons.forEach(btn => {
            btn.classList.add('english-fab');
            btn.style.background = 'linear-gradient(135deg, #012169 0%, #FFFFFF 50%, #C8102E 100%)';
            btn.style.border = '2px solid #012169';
            btn.style.boxShadow = '0 4px 12px rgba(1, 33, 105, 0.3)';
        });
        
        // Personalização específica para o botão de edição
        if (editGearBtn) {
            editGearBtn.style.color = '#012169';
        }
        
        // Personalização específica para o botão de conteúdo extra
        if (extraContentBtn) {
            extraContentBtn.style.color = '#012169';
        }
        
    } else if (language === 'spanish') {
        // Personalização para espanhol (cores da bandeira: vermelho e amarelo)
        fabButtons.forEach(btn => {
            btn.classList.add('spanish-fab');
            btn.style.background = 'linear-gradient(135deg, #C60B1E 0%, #FFC400 50%, #C60B1E 100%)';
            btn.style.border = '2px solid #C60B1E';
            btn.style.boxShadow = '0 4px 12px rgba(198, 11, 30, 0.3)';
        });
        
        // Personalização específica para o botão de edição
        if (editGearBtn) {
            editGearBtn.style.color = '#C60B1E';
        }
        
        // Personalização específica para o botão de conteúdo extra
        if (extraContentBtn) {
            extraContentBtn.style.color = '#C60B1E';
        }
        
    } else {
        // Remove todas as personalizações se não há idioma detectado
        fabButtons.forEach(btn => {
            btn.style.background = '';
            btn.style.border = '';
            btn.style.boxShadow = '';
            btn.style.color = '';
        });
        
        if (editGearBtn) {
            editGearBtn.style.color = '';
        }
        
        if (extraContentBtn) {
            extraContentBtn.style.color = '';
        }
    }
}

// Variável para controlar a fala atual
let currentUtterance = null; 

/**
 * Lê um texto em voz alta usando a API de Síntese de Voz do navegador,
 * buscando a voz mais natural disponível.
 * @param {string} text - O texto a ser lido.
 */
function speakText(text) {
    // Verifica se a API SpeechSynthesis é suportada
    if (!window.speechSynthesis) {
        console.warn("SpeechSynthesis API not supported in this browser.");
        const ttsControlButton = document.getElementById('tts-control-btn');
        if (ttsControlButton) ttsControlButton.innerHTML = '🔊'; // Reseta o botão
        return;
    }

    // Para qualquer fala anterior para evitar sobreposição
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR'; // Definir idioma para português do Brasil
    utterance.rate = 1.0; // Velocidade normal para um som mais natural
    utterance.pitch = 1.0; // Tom normal

    const ttsControlButton = document.getElementById('tts-control-btn');

    utterance.onstart = () => {
        if (ttsControlButton) ttsControlButton.innerHTML = '🤫'; // Ícone para parar
    };

    utterance.onend = () => {
        if (ttsControlButton) ttsControlButton.innerHTML = '🔊'; // Ícone para ouvir de novo
    };
    
    utterance.onerror = (event) => {
        console.error('Erro na síntese de voz:', event.error);
        if (ttsControlButton) ttsControlButton.innerHTML = '🔊';
    };

    currentUtterance = utterance;

    const setVoiceAndSpeak = () => {
        // Garante que as vozes estejam carregadas antes de tentar acessá-las
        const voices = speechSynthesis.getVoices();
        if (!voices || voices.length === 0) {
            console.warn("No voices available or voices list is empty.");
            speechSynthesis.speak(utterance); // Fallback to default if no voices
            return;
        }

        const ptBrVoices = voices.filter(voice => voice.lang === 'pt-BR');
        let selectedVoice = null;

        // Prioriza vozes de alta qualidade conhecidas para pt-BR
        const preferredNames = [/google/i, /natural/i, /felipe/i, /ricardo/i, /vitoria/i]; // Adicione nomes de vozes comuns em pt-BR
        for (const name of preferredNames) {
            selectedVoice = ptBrVoices.find(voice => name.test(voice.name));
            if (selectedVoice) break;
        }

        // Se não encontrar, usa a padrão do navegador para o idioma
        if (!selectedVoice) {
            selectedVoice = ptBrVoices.find(voice => voice.default);
        }

        // Como último recurso, pega a primeira voz em português disponível
        if (!selectedVoice && ptBrVoices.length > 0) {
            selectedVoice = ptBrVoices[0];
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        speechSynthesis.speak(utterance);
    };

    // Tenta obter as vozes imediatamente. Se não estiverem disponíveis, espera por elas.
    const initialVoices = speechSynthesis.getVoices();
    if (initialVoices && initialVoices.length > 0) {
        setVoiceAndSpeak();
    } else {
        // Se as vozes não estiverem prontas, espera que sejam carregadas
        speechSynthesis.onvoiceschanged = () => {
            // Remove o event listener depois que ele é disparado uma vez para evitar chamadas múltiplas
            speechSynthesis.onvoiceschanged = null; 
            setVoiceAndSpeak();
        };
    }
}

/**
 * Para a leitura de texto que está em andamento.
 */
function stopSpeaking() {
    if (window.speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    const ttsControlButton = document.getElementById('tts-control-btn');
    if (ttsControlButton) ttsControlButton.innerHTML = '🔊';
}

// Aguarda o DOM estar completamente carregado para executar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- CACHE DE ELEMENTOS DOM ---
    // Cache de elementos para evitar buscas repetidas no DOM, melhorando a performance.
    const elements = {
        headerUserName: document.getElementById('header-user-name'),
        logoutBtn: document.getElementById('logout-btn'),
        hackerBtn: document.getElementById('hacker-btn'),
        dashboard: document.getElementById('dashboard'),
        dashboardDisciplinas: document.getElementById('dashboard-disciplinas'),
        dashboardInfos: document.getElementById('dashboard-infos'),
        contentView: document.getElementById('content-view'),
        editGearBtn: document.getElementById('edit-gear-btn'),
        extraContentBtn: document.getElementById('extra-content-btn'),
        extraContentMenu: document.getElementById('extra-content-menu'),
        menuTextBtn: document.getElementById('menu-text-btn'), // (button can be relabeled if needed)
        menuVideoBtn: document.getElementById('menu-video-btn'),
        menuPracticeBtn: document.getElementById('menu-practice-btn'),
        menuFlashcardsBtn: document.getElementById('menu-flashcards-btn'), // Added
        menuExtraBtn: document.getElementById('menu-extra-btn'),
        disciplinaModal: document.getElementById('disciplina-modal'),
        closeDisciplinaModalBtn: document.getElementById('close-modal-disciplina'),
        pizzaContainer: document.getElementById('pizza-container'),
        crudModalRoot: document.getElementById('crud-modal-root'),
        addDisciplinaBtn: document.getElementById('add-disciplina-btn'),
        englishFlagBtn: document.getElementById('english-flag-btn'),
        aiWriterBtn: document.getElementById('ai-writer-btn'),
        aiWriterModal: document.getElementById('ai-writer-modal'),
        closeAiWriterModal: document.getElementById('close-ai-writer-modal'),
        aiWriterIframe: document.getElementById('ai-writer-iframe')
    };

    // --- GERENCIAMENTO DE ESTADO ---
    // Centraliza o estado da aplicação em um único objeto.
    const appState = {
        isEditMode: false,
        currentDisciplinaId: null,
        currentContent: [], // Filtered flashcards (ready for review)
        allFlashcards: [], // All flashcards (for table view)
        currentContentType: 'video_text', // 'video_text', 'video', 'practice', ou 'flashcard'
        currentFlashcardIndex: 0, // For flashcards navigation
        isFlashcardFlipped: false // For flashcards
    };

    // --- FUNÇÕES DE AUTENTICAÇÃO E INICIALIZAÇÃO ---

    // Protege a página, redirecionando se o usuário não estiver logado.
    function protectPage() {
        if (!localStorage.getItem('user_id')) {
            window.location.href = 'my_future.html';
        } else {
            const userName = localStorage.getItem('user_name');
            elements.headerUserName.textContent = userName || 'Usuário';
        }
    }

    // Função de logout
    function logout() {
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_name');
        window.location.href = 'my_future.html';
    }

    // --- RENDERIZAÇÃO E LÓGICA DA UI ---
    
    // Mostra/esconde a view do dashboard ou do conteúdo
    function showDashboard() {
        elements.dashboard.classList.remove('hidden');
        elements.contentView.classList.add('hidden');
        elements.editGearBtn.classList.add('hidden');
        elements.extraContentBtn.classList.add('hidden');
        elements.extraContentMenu.classList.add('hidden');
        appState.currentDisciplinaId = null;
        appState.currentFlashcardIndex = 0; // Reset flashcard index
        appState.isFlashcardFlipped = false; // Reset flashcard flip state
        appState.allFlashcards = []; // Clear all flashcards when leaving
        
        // Reaplica a personalização do dashboard baseada nas disciplinas em estudo
        loadDashboard();
        
        // Remove personalização dos botões quando volta ao dashboard
        applyButtonCustomization(null);
    }

    function showContentView() {
        elements.dashboard.classList.add('hidden');
        elements.contentView.classList.remove('hidden');
        elements.editGearBtn.classList.remove('hidden');
        elements.extraContentBtn.classList.remove('hidden');
    }
    
    // Função genérica para renderizar conteúdo (texto, vídeo, prática)
    function renderContent() {
        showContentView();
        const { currentContent, currentContentType, isEditMode, currentDisciplinaId } = appState;

        // CORREÇÃO: Se for tasks, sempre usar renderTasksTable e funções específicas
        if (currentContentType === 'tasks') {
            renderTasksTable(currentContent);
            return;
        }
        
        if (currentContentType === 'flashcard') {
            renderFlashcards(currentContent, isEditMode, currentDisciplinaId);
            return;
        }

        if (!currentContent || currentContent.length === 0) {
            elements.contentView.innerHTML = `
                <button onclick="window.goBackToDashboard()" class="close-btn" style="color:#222; top:12px; right:12px;">×</button>
                <div style="color:var(--danger-color); text-align:center; margin-bottom:16px;">
                    Ainda não há conteúdo de ${currentContentType} para esta disciplina.
                </div>
                <div style="text-align:center;">
                    <button class="add-new-content-btn">➕ Adicionar ${currentContentType}</button>
                </div>`;
            // Só permite adicionar via fluxo genérico se NÃO for tasks
            if(currentContentType !== 'tasks') {
                elements.contentView.querySelector('.add-new-content-btn').onclick = () => handleCreate(currentContentType, currentDisciplinaId);
            }
            return;
        }

        let contentHtml = `<button onclick="window.goBackToDashboard()" class="close-btn" style="color:#222; top:12px; right:12px;">×</button>`;
        currentContent.forEach(item => {
            let itemHtml = '';
            switch(currentContentType) {
                case 'video_text':
                    itemHtml = `
                        ${item.link_video ? `<button class="registro-title open-video-modal-btn modern-video-btn fixed-video-btn" data-link="${item.link_video}"
                            style="
                                position: fixed;
                                bottom: 32px;
                                left: 50%;
                                transform: translateX(-50%);
                                z-index: 2147483646;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                background: linear-gradient(90deg, #1976d2 60%, #764ba2 100%);
                                color: #fff;
                                border: none;
                                border-radius: 32px;
                                padding: 12px 32px;
                                font-size: 1.08em;
                                font-weight: 600;
                                box-shadow: 0 2px 12px rgba(25,118,210,0.10);
                                cursor: pointer;
                                margin-bottom: 0;
                                transition: background 0.2s, box-shadow 0.2s;
                                white-space: nowrap;
                                touch-action: none;
                                user-select: none;
                            "
                            onmousedown="window.handleVideoButtonDrag(event, this)" 
                            ontouchstart="window.handleVideoButtonDrag(event, this)"
                            onmouseover="this.style.background='linear-gradient(90deg,#1565c0 60%,#5a189a 100%)';this.style.transform='translateX(-50%) translateY(-2px) scale(1.03)';this.style.boxShadow='0 4px 18px rgba(25,118,210,0.18)';"
                            onmouseout="this.style.background='linear-gradient(90deg,#1976d2 60%,#764ba2 100%)';this.style.transform='translateX(-50%)';this.style.boxShadow='0 2px 12px rgba(25,118,210,0.10)';"
                        >
                            <span class="video-btn-icon" style="font-size:1.3em;display:flex;align-items:center;">▶️</span>
                            <span class="video-btn-label" style="letter-spacing:0.5px;">Assistir Vídeo</span>
                        </button>` : ''}
                        ${item.text ? `<span class="registro-text">${item.text}</span>` : ''}
                        ${item.id_disciplina ? `<span class="registro-id-disciplina">Disciplina: ${item.id_disciplina}</span>` : ''}
                    `;
                    break;
                case 'video':
                    itemHtml = `
                        ${item.title ? `<span class="registro-title">${item.title}</span>` : ''}
                        ${item.video_link ? renderVideoEmbed(item.video_link) : ''}
                    `;
                    break;
                case 'practice':
                     itemHtml = `
                        ${item.tipo ? `<span class="registro-title">${item.tipo}</span>` : ''}
                        ${item.texto ? `<p class="registro-text">${item.texto}</p>` : ''}
                        ${item.link ? renderLinkEmbed(item.link) : ''}
                    `;
                    break;
            }
            contentHtml += `
                <div class="registro" data-id="${item.id}">
                    ${isEditMode ? `
                        <div class="registro-toolbar">
                            <button class="crud-btn edit" title="Editar">✏️</button>
                            <button class="crud-btn delete" title="Excluir">🗑️</button>
                        </div>
                    ` : ''}
                    ${itemHtml}
                </div>
            `;
        });
        if (isEditMode) {
            contentHtml += `<div style="text-align:center; margin-top:20px;"><button class="add-new-content-btn">➕ Adicionar Novo ${currentContentType}</button></div>`;
        }
        elements.contentView.innerHTML = contentHtml;
        
        elements.contentView.classList.toggle('videos-mode', currentContentType === 'video');
        
        if (isEditMode && currentContentType !== 'tasks') {
            elements.contentView.querySelectorAll('.crud-btn.edit').forEach(btn => {
                const id = btn.closest('.registro').dataset.id;
                btn.onclick = () => handleEdit(currentContentType, id);
            });
            elements.contentView.querySelectorAll('.crud-btn.delete').forEach(btn => {
                const id = btn.closest('.registro').dataset.id;
                btn.onclick = () => handleDelete(currentContentType, id);
            });
            const addBtn = elements.contentView.querySelector('.add-new-content-btn');
            if(addBtn) addBtn.onclick = () => handleCreate(currentContentType, currentDisciplinaId);
        }
    }

    // Função para alternar o modo de encaixe (tiled view)
    function toggleTiledView(modal) {
        const body = document.body;
        const dockButton = modal.querySelector('#video-modal-dock');
        const isTiled = body.classList.contains('tiled-view-active');
        const contentView = document.getElementById('content-view');

        if (isTiled) {
            // Desencaixar
            body.classList.remove('tiled-view-active');
            dockButton.innerHTML = '📌';
            dockButton.title = 'Encaixar Janela';
            
            const container = document.getElementById('tiled-view-container');
            if (container) {
                 // Move content view back to main if it exists
                const contentView = document.getElementById('content-view');
                if(contentView) document.querySelector('main').appendChild(contentView);
                container.remove();
            }
            // Restaura estilos inline para o modo flutuante
            modal.style.cssText = `
                position: fixed; top: 80px; left: 80px; 
                width: ${Math.min(window.innerWidth * 0.6, 800)}px; 
                height: ${Math.min(window.innerWidth * 0.6, 800) / (16/9)}px;
                min-width: 320px; min-height: 180px; background: rgba(255,255,255,0.97);
                border: none; border-radius: 18px; z-index: 2147483647;
                box-shadow: 0 8px 32px 0 rgba(25,118,210,0.18), 0 1.5px 8px 0 rgba(76,0,130,0.10);
                display: flex; flex-direction: column; overflow: hidden;
            `;
            contentView.style.cssText = ''; // Limpa estilos do modo tiled
        } else {
            // Encaixar
            body.classList.add('tiled-view-active');
            dockButton.innerHTML = '🔄';
            dockButton.title = 'Desencaixar Janela';

            // Cria o container para o modo tiled
            const container = document.createElement('div');
            container.id = 'tiled-view-container';
            
            const resizer = document.createElement('div');
            resizer.className = 'tiled-resizer';

            // Move os elementos para dentro do container
            container.appendChild(modal);
            container.appendChild(resizer);
            container.appendChild(contentView);
            document.body.appendChild(container);

            // Limpa estilos inline conflitantes
            modal.style.cssText = '';
            contentView.style.cssText = '';

            // Inicia a lógica do divisor
            initTiledResizer(resizer, modal, contentView);
        }
    }

    function initTiledResizer(resizer, leftPanel, rightPanel) {
        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            let startX = e.clientX;
            let startWidth = leftPanel.offsetWidth;
            
            // Adiciona uma sobreposição para capturar eventos do mouse sobre iframes
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; cursor:col-resize; z-index: 99999;';
            document.body.appendChild(overlay);

            const onMouseMove = (moveEvent) => {
                if (!isResizing) return;
                const dx = moveEvent.clientX - startX;
                const newWidth = startWidth + dx;
                // Adiciona limites de largura mínima
                if (newWidth > 250 && newWidth < (window.innerWidth - 250)) {
                    leftPanel.style.width = `${newWidth}px`;
                }
            };

            const onMouseUp = () => {
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.removeChild(overlay);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // Modal móvel e redimensionável para vídeo embed
    function openMovableVideoModal(link) {
        // Remove modal anterior se existir
        const oldModal = document.getElementById('movable-video-modal');
        if (oldModal) oldModal.remove();
        let embedHtml = '';
        
        // Regexes for different video platforms
        const ytMatch = link.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        const vimeoMatch = link.match(/vimeo\.com\/(\d+)/);
        const dailymotionMatch = link.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
        const driveMatch = link.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9-_]+)/);

        if (ytMatch && ytMatch[1]) {
            const videoId = ytMatch[1];
            embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
        } else if (vimeoMatch && vimeoMatch[1]) {
            const videoId = vimeoMatch[1];
            embedHtml = `<iframe src="https://player.vimeo.com/video/${videoId}" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
        } else if (dailymotionMatch && dailymotionMatch[1]) {
            const videoId = dailymotionMatch[1];
            embedHtml = `<iframe src="https://www.dailymotion.com/embed/video/${videoId}" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
        } else if (driveMatch && driveMatch[1]) {
            const fileId = driveMatch[1];
            embedHtml = `<iframe src="https://drive.google.com/file/d/${fileId}/preview" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
        }
        // Se não for, trata como link genérico
        else {
            embedHtml = `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#000;">
                <a href="${link}" target="_blank" style="color:#1976d2;text-decoration:none;padding:16px;text-align:center;font-size:1.2em;color:#fff;">
                    <span style="display:block;font-size:2em;margin-bottom:8px;">🔗</span>
                    Abrir link em nova aba
                </a>
            </div>`;
        }

        const modal = document.createElement('div');
        modal.id = 'movable-video-modal';
        
        // Calcula dimensões responsivas com base na largura da janela
        const modalWidth = Math.min(window.innerWidth * 0.6, 800); // 60% da largura da tela, max 800px
        const modalHeight = modalWidth / (16 / 9); // Mantém proporção 16:9

        modal.style.cssText = `
            position: fixed; top: 80px; left: 80px; 
            width: ${modalWidth}px; height: ${modalHeight}px;
            min-width: 320px; min-height: 180px; background: rgba(255,255,255,0.97);
            border: none; border-radius: 18px; z-index: 2147483647;
            box-shadow: 0 8px 32px 0 rgba(25,118,210,0.18), 0 1.5px 8px 0 rgba(76,0,130,0.10);
            display: flex; flex-direction: column; overflow: hidden;
        `;
        modal.innerHTML = `
            <div id="video-modal-header" style="cursor:move; background:linear-gradient(90deg,#1976d2 60%,#764ba2 100%); color:#fff; padding:6px 14px; border-radius:18px 18px 0 0; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 8px rgba(25,118,210,0.10); min-height:36px; height:36px;">
                <span style="font-size:1em; font-weight:500; letter-spacing:0.2px; display:flex; align-items:center; gap:6px;">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff2"/><path d="M10 8l6 4-6 4V8z" fill="#fff"/></svg>
                    Vídeo
                </span>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button id="video-modal-dock" title="Encaixar Janela" style="background:none;border:none;color:#fff;font-size:1.1em;cursor:pointer;padding:2px 6px;border-radius:6px;transition:background 0.2s;">📌</button>
                    <button id="video-modal-close" title="Fechar" style="background:none;border:none;color:#fff;font-size:1.3em;cursor:pointer;padding:2px 6px;border-radius:6px;transition:background 0.2s;"><span style="font-size:1.1em;">×</span></button>
                </div>
            </div>
            <div id="video-modal-body" style="flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#111;">${embedHtml}</div>
            <div class="resizer" data-direction="n" style="position:absolute; top:0; left:0; right:0; height:5px; cursor:ns-resize;"></div>
            <div class="resizer" data-direction="s" style="position:absolute; bottom:0; left:0; right:0; height:5px; cursor:ns-resize;"></div>
            <div class="resizer" data-direction="w" style="position:absolute; top:0; bottom:0; left:0; width:5px; cursor:ew-resize;"></div>
            <div class="resizer" data-direction="e" style="position:absolute; top:0; bottom:0; right:0; width:5px; cursor:ew-resize;"></div>
            <div class="resizer" data-direction="nw" style="position:absolute; top:0; left:0; width:10px; height:10px; cursor:nwse-resize;"></div>
            <div class="resizer" data-direction="ne" style="position:absolute; top:0; right:0; width:10px; height:10px; cursor:nesw-resize;"></div>
            <div class="resizer" data-direction="sw" style="position:absolute; bottom:0; left:0; width:10px; height:10px; cursor:nesw-resize;"></div>
            <div class="resizer" data-direction="se" style="position:absolute; bottom:0; right:0; width:10px; height:10px; cursor:nwse-resize;"></div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('#video-modal-close').onclick = () => {
            document.body.classList.remove('tiled-view-active');
            const container = document.getElementById('tiled-view-container');
            if (container) {
                 // Move content view back to main if it exists
                const contentView = document.getElementById('content-view');
                if(contentView) document.querySelector('main').appendChild(contentView);
                container.remove();
            }
            modal.remove();
        };
        modal.querySelector('#video-modal-dock').onclick = () => toggleTiledView(modal);

        const header = modal.querySelector('#video-modal-header');
        const iframe = modal.querySelector('iframe');
        const resizers = modal.querySelectorAll('.resizer');

        let isDragging = false;
        let isResizing = false;
        let startX, startY, startLeft, startTop, startWidth, startHeight;

        const onDrag = (e) => {
            if (!isDragging || document.body.classList.contains('tiled-view-active')) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            modal.style.left = `${startLeft + dx}px`;
            modal.style.top = `${startTop + dy}px`;
        };

        const onResize = (direction, e) => {
            if (!isResizing || document.body.classList.contains('tiled-view-active')) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const minWidth = parseInt(modal.style.minWidth, 10);
            const minHeight = parseInt(modal.style.minHeight, 10);

            if (direction.includes('e')) modal.style.width = `${Math.max(startWidth + dx, minWidth)}px`;
            if (direction.includes('w')) {
                const newWidth = startWidth - dx;
                if (newWidth > minWidth) {
                    modal.style.width = `${newWidth}px`;
                    modal.style.left = `${startLeft + dx}px`;
                }
            }
            if (direction.includes('s')) modal.style.height = `${Math.max(startHeight + dy, minHeight)}px`;
            if (direction.includes('n')) {
                const newHeight = startHeight - dy;
                if (newHeight > minHeight) {
                    modal.style.height = `${newHeight}px`;
                    modal.style.top = `${startTop + dy}px`;
                }
            }
        };

        const stopInteracting = () => {
            isDragging = false;
            isResizing = false;
            if (iframe) iframe.style.pointerEvents = 'auto';
            document.body.style.userSelect = 'auto';
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', stopInteracting);
            resizers.forEach(resizer => {
                const direction = resizer.getAttribute('data-direction');
                document.removeEventListener('mousemove', (e) => onResize(direction, e));
            });
        };

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = modal.offsetLeft;
            startTop = modal.offsetTop;
            if (iframe) iframe.style.pointerEvents = 'none';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', stopInteracting);
        });

        resizers.forEach(resizer => {
            resizer.addEventListener('mousedown', (e) => {
                isResizing = true;
                const direction = resizer.getAttribute('data-direction');
                startX = e.clientX;
                startY = e.clientY;
                startWidth = modal.offsetWidth;
                startHeight = modal.offsetHeight;
                startLeft = modal.offsetLeft;
                startTop = modal.offsetTop;
                if (iframe) iframe.style.pointerEvents = 'none';
                document.body.style.userSelect = 'none';
                
                const resizeHandler = (event) => onResize(direction, event);
                document.addEventListener('mousemove', resizeHandler);
                document.addEventListener('mouseup', () => {
                    document.removeEventListener('mousemove', resizeHandler);
                    stopInteracting();
                }, { once: true });
            });
        });
    }
    
    // **CORRIGIDO** Renderiza o embed do YouTube de forma correta e segura
    function renderVideoEmbed(link) {
        // Regex mais robusta para pegar ID de vários formatos de URL do YouTube
        const ytMatch = link.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/||.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            const videoId = ytMatch[1];
            return `<div class="video-responsive"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`;
        }
        // Se não for um link do YouTube, apenas mostra o link
        return `<a href="${link}" target="_blank">${link}</a>`;
    }

    // **NOVA FUNÇÃO** Renderiza embeds para diferentes tipos de links
    function renderLinkEmbed(link) {
        if (!link) return '';
        
        // YouTube
        const ytMatch = link.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            const videoId = ytMatch[1];
            return `<div class="video-responsive"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`;
        }
        
        // Google Drive (documentos, apresentações, planilhas)
        const driveMatch = link.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9-_]+)/);
        if (driveMatch && driveMatch[1]) {
            const fileId = driveMatch[1];
            return `<div class="video-responsive"><iframe src="https://drive.google.com/file/d/${fileId}/preview" allowfullscreen></iframe></div>`;
        }
        
        // Google Docs
        const docsMatch = link.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (docsMatch && docsMatch[1]) {
            const docId = docsMatch[1];
            return `<div class="video-responsive"><iframe src="https://docs.google.com/document/d/${docId}/preview" allowfullscreen></iframe></div>`;
        }
        
        // Google Slides
        const slidesMatch = link.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/);
        if (slidesMatch && slidesMatch[1]) {
            const slideId = slidesMatch[1];
            return `<div class="video-responsive"><iframe src="https://docs.google.com/presentation/d/${slideId}/embed" allowfullscreen></iframe></div>`;
        }
        
        // Google Sheets
        const sheetsMatch = link.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetsMatch && sheetsMatch[1]) {
            const sheetId = sheetsMatch[1];
            return `<div class="video-responsive"><iframe src="https://docs.google.com/spreadsheets/d/${sheetId}/preview" allowfullscreen></iframe></div>`;
        }
        
        // Vimeo
        const vimeoMatch = link.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch && vimeoMatch[1]) {
            const videoId = vimeoMatch[1];
            return `<div class="video-responsive"><iframe src="https://player.vimeo.com/video/${videoId}" allowfullscreen></iframe></div>`;
        }
        
        // Dailymotion
        const dailymotionMatch = link.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
        if (dailymotionMatch && dailymotionMatch[1]) {
            const videoId = dailymotionMatch[1];
            return `<div class="video-responsive"><iframe src="https://www.dailymotion.com/embed/video/${videoId}" allowfullscreen></iframe></div>`;
        }
        
        // Twitch (clips)
        const twitchMatch = link.match(/twitch\.tv\/\w+\/clip\/([a-zA-Z0-9-]+)/);
        if (twitchMatch && twitchMatch[1]) {
            const clipId = twitchMatch[1];
            return `<div class="video-responsive"><iframe src="https://clips.twitch.tv/embed?clip=${clipId}" allowfullscreen></iframe></div>`;
        }
        
        // PDF (se for um link direto para PDF)
        if (link.toLowerCase().endsWith('.pdf')) {
            return `<div class="video-responsive"><iframe src="${link}" allowfullscreen></iframe></div>`;
        }
        
        // Imagens (jpg, jpeg, png, gif, webp)
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
        if (imageExtensions.test(link)) {
            return `<div class="image-responsive"><img src="${link}" alt="Imagem" class="registro-img" style="max-width:100%; height:auto; border-radius:8px;"></div>`;
        }
        
        // Se não for nenhum dos tipos suportados, mostra como link normal
        return `<a href="${link}" target="_blank" class="link-fallback">🔗 ${link}</a>`;
    }

    // Função para buscar e exibir conteúdo extra de uma disciplina, no padrão de cards
    async function fetchExtraContent(disciplinaId) {
        elements.contentView.innerHTML = `<div style='text-align:center; padding: 40px;'>Carregando...</div>`;
        showContentView();
        const { data, error } = await supabase.from('extra_content').select('*').eq('id_disciplina', disciplinaId);
        if (error) {
            elements.contentView.innerHTML = `<div style='color:var(--danger-color); text-align:center;'>Erro ao buscar conteúdo extra.</div>`;
            return;
        }
        renderExtraContentCards(data, appState.isEditMode, disciplinaId);
        elements.extraContentMenu.classList.add('hidden');
    }

    // Função para renderizar Conteúdo Extra como cards, igual às outras seções
    function renderExtraContentCards(data, isEditMode, idDisciplina) {
        let contentHtml = `<button onclick="window.goBackToDashboard()" class="close-btn" style="color:#222; top:12px; right:12px;">×</button>`;
        if (!data || data.length === 0) {
            contentHtml += `
                <div style="color:var(--danger-color); text-align:center; margin-bottom:16px;">
                    Ainda não há conteúdo extra para esta disciplina.
                </div>
                <div style="text-align:center;">
                    <button class="add-new-extra-content-btn">➕ Adicionar Conteúdo Extra</button>
                </div>`;
            elements.contentView.innerHTML = contentHtml;
            elements.contentView.querySelector('.add-new-extra-content-btn').onclick = () => handleCreateExtraContent(idDisciplina);
            return;
        }
        data.forEach(item => {
            let itemHtml = '';
            if (item.tipo_arquivo === 'Texto') {
                itemHtml = `
                    ${item.title ? `<span class='registro-title'>${item.title}</span>` : ''}
                    <span class='registro-text'>${item.link_or_text}</span>
                `;
            } else if (item.tipo_arquivo === 'Vídeo') {
                itemHtml = `
                    ${item.title ? `<span class='registro-title'>${item.title}</span>` : ''}
                    ${renderLinkEmbed(item.link_or_text)}
                `;
            } else if (item.tipo_arquivo === 'Imagem') {
                itemHtml = `
                    ${item.title ? `<span class='registro-title'>${item.title}</span>` : ''}
                    <img src='${item.link_or_text}' alt='Imagem' class='registro-img' style='max-width:220px;max-height:120px;display:block;margin:8px auto;'>
                    <div><a href='${item.link_or_text}' target='_blank'>Abrir imagem</a></div>
                `;
            } else {
                itemHtml = `
                    ${item.title ? `<span class='registro-title'>${item.title}</span>` : ''}
                    <span class='registro-text'>${item.link_or_text}</span>
                `;
            }
            contentHtml += `
                <div class='registro' data-id='${item.id}'>
                    ${isEditMode ? `
                        <div class='registro-toolbar'>
                            <button class='crud-btn edit' title='Editar'>✏️</button>
                            <button class='crud-btn delete' title='Excluir'>🗑️</button>
                        </div>
                    ` : ''}
                    ${itemHtml}
                </div>
            `;
        });
        if (isEditMode) {
            contentHtml += `<div style='text-align:center; margin-top:20px;'><button class='add-new-extra-content-btn'>➕ Adicionar Conteúdo Extra</button></div>`;
        }
        elements.contentView.innerHTML = contentHtml;
        // Eventos CRUD
        if (isEditMode) {
            elements.contentView.querySelectorAll('.crud-btn.edit').forEach(btn => {
                const id = btn.closest('.registro').dataset.id;
                btn.onclick = () => handleEditExtraContent(id);
            });
            elements.contentView.querySelectorAll('.crud-btn.delete').forEach(btn => {
                const id = btn.closest('.registro').dataset.id;
                btn.onclick = () => handleDeleteExtraContent(id, idDisciplina);
            });
            const addBtn = elements.contentView.querySelector('.add-new-extra-content-btn');
            if (addBtn) addBtn.onclick = () => handleCreateExtraContent(idDisciplina);
        }
    }

    // Funções CRUD para Conteúdo Extra
    async function handleCreateExtraContent(idDisciplina) {
        const userId = localStorage.getItem('user_id');
        
        // Detecta o idioma da disciplina atual para personalizar o modal
        let detectedLanguage = null;
        if (idDisciplina) {
            const { data: disciplinaData } = await supabase
                .from('disciplina')
                .select('nome')
                .eq('id', idDisciplina)
                .single();
            if (disciplinaData) {
                detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
            }
        }
        
        createCrudModal({
            title: 'Novo Conteúdo Extra',
            formFields: [
                { name: 'tipo_arquivo', type: 'select', options: [
                    { value: 'Texto', label: 'Texto' },
                    { value: 'Vídeo', label: 'Vídeo' },
                    { value: 'Imagem', label: 'Imagem' }
                ], placeholder: 'Tipo do Arquivo', headerFixed: true },
                { name: 'title', type: 'text', placeholder: 'Título' },
                { name: 'link_or_text', type: 'text', placeholder: 'Link, texto ou URL da imagem' }
            ],
            language: detectedLanguage,
            onSubmit: async (data) => {
                if (!data.tipo_arquivo || !data.title || !data.link_or_text) {
                    alert('Preencha todos os campos obrigatórios.');
                    return;
                }
                await supabase.from('extra_content').insert([{
                    id_disciplina: idDisciplina,
                    id_usuario: userId,
                    tipo_arquivo: data.tipo_arquivo,
                    title: data.title,
                    link_or_text: data.link_or_text
                }]);
                appState.currentContentType = 'extra';
                await fetchExtraContent(idDisciplina);
            }
        });
    }

    async function handleEditExtraContent(id) {
        const { data: item, error } = await supabase.from('extra_content').select('*').eq('id', id).single();
        if (error) return alert('Erro ao buscar item para edição.');
        
        // Detecta o idioma da disciplina atual para personalizar o modal
        let detectedLanguage = null;
        if (item && item.id_disciplina) {
            const { data: disciplinaData } = await supabase
                .from('disciplina')
                .select('nome')
                .eq('id', item.id_disciplina)
                .single();
            if (disciplinaData) {
                detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
            }
        }
        
        createCrudModal({
            title: 'Editar Conteúdo Extra',
            formFields: [
                { name: 'tipo_arquivo', type: 'select', options: [
                    { value: 'Texto', label: 'Texto' },
                    { value: 'Vídeo', label: 'Vídeo' },
                    { value: 'Imagem', label: 'Imagem' }
                ], placeholder: 'Tipo do Arquivo' },
                { name: 'title', type: 'text', placeholder: 'Título' },
                { name: 'link_or_text', type: 'text', placeholder: 'Link, texto ou URL da imagem' }
            ],
            initialData: item,
            language: detectedLanguage,
            onSubmit: async (data) => {
                await supabase.from('extra_content').update(data).eq('id', id);
                appState.currentContentType = 'extra';
                await fetchExtraContent(item.id_disciplina);
            }
        });
    }

    async function handleDeleteExtraContent(id, idDisciplina) {
        showConfirmModal('Tem certeza que deseja excluir este conteúdo extra?', async () => {
            await supabase.from('extra_content').delete().eq('id', id);
            appState.currentContentType = 'extra';
            await fetchExtraContent(idDisciplina);
        });
    }

    // --- LÓGICA DE DADOS (FETCH & CRUD) ---
    
    // Carrega os dados do dashboard inicial
    async function loadDashboard() {
        const { data: disciplinas, error } = await supabase.from('disciplina').select('*');
        if (error || !Array.isArray(disciplinas)) {
            elements.dashboardDisciplinas.innerHTML = '<div style="color:var(--danger-color);">Erro ao carregar disciplinas.</div>';
            return;
        }

        // Filtra apenas as disciplinas com situation === 'estudando' (case-insensitive) e tipo_disciplina === 'idioma'
        const estudando = disciplinas.filter(d => (d.situation || '').toLowerCase() === 'estudando' && (d.tipo_disciplina || '').toLowerCase() === 'idioma');

        // Detecta o idioma predominante das disciplinas em estudo
        let predominantLanguage = null;
        if (estudando.length > 0) {
            const languageCounts = { english: 0, spanish: 0 };
            
            estudando.forEach(d => {
                const detectedLanguage = detectLanguageAndCustomize(d.nome);
                if (detectedLanguage) {
                    languageCounts[detectedLanguage]++;
                }
            });
            
            // Define o idioma predominante
            if (languageCounts.english > languageCounts.spanish) {
                predominantLanguage = 'english';
            } else if (languageCounts.spanish > languageCounts.english) {
                predominantLanguage = 'spanish';
            }
            
            // Aplica a personalização baseada no idioma predominante
            applyLanguageCustomization(predominantLanguage);
        }

        if (estudando.length === 0) {
            elements.dashboardDisciplinas.innerHTML = '<div>Nenhuma disciplina em estudo.</div>';
            // Remove personalização se não há disciplinas
            applyLanguageCustomization(null);
        } else {
            elements.dashboardDisciplinas.innerHTML = estudando.map(d => {
                const inicio = new Date(d.date_inicio);
                const fim = new Date(d.date_fim);
                const hoje = new Date();
                const totalDias = Math.max(1, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)));
                const diasEstudados = Math.max(0, Math.min(totalDias, Math.ceil((hoje - inicio) / (1000 * 60 * 60 * 24))));
                const percent = Math.round((diasEstudados / totalDias) * 100);
                
                // Detecta o idioma individual da disciplina
                const detectedLanguage = detectLanguageAndCustomize(d.nome);
                
                // Define classes e estilos específicos para cada idioma
                let cardClasses = 'card-disciplina';
                let progressBarColor = '';
                let borderStyle = '';
                let backgroundStyle = '';
                
                if (detectedLanguage === 'english') {
                    cardClasses += ' english-card';
                    progressBarColor = 'background: linear-gradient(90deg, #012169 0%, #C8102E 100%);';
                    borderStyle = 'border-left: 4px solid #012169;';
                    backgroundStyle = 'background: linear-gradient(135deg, rgba(1, 33, 105, 0.02) 0%, rgba(255, 255, 255, 0.8) 100%);';
                } else if (detectedLanguage === 'spanish') {
                    cardClasses += ' spanish-card';
                    progressBarColor = 'background: linear-gradient(90deg, #C60B1E 0%, #FFC400 100%);';
                    borderStyle = 'border-left: 4px solid #C60B1E;';
                    backgroundStyle = 'background: linear-gradient(135deg, rgba(198, 11, 30, 0.02) 0%, rgba(255, 196, 0, 0.05) 50%, rgba(255, 255, 255, 0.8) 100%);';
                }
                
                return `
                    <div class="${cardClasses}" data-id="${d.id}" style="${borderStyle} ${backgroundStyle}">
                        <div class="card-disciplina-title">${d.nome}</div>
                        <div class="card-disciplina-date">${d.date_inicio || ''} até ${d.date_fim || ''}</div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fg" style="width:${percent}%; ${progressBarColor}"></div>
                        </div>
                        <div class="progress-label">${diasEstudados}/${totalDias} dias</div>
                        <div class="card-disciplina-situation">${d.situation || ''}</div>
                        <div class="card-disciplina-type">${d.tipo_disciplina || ''}</div>
                        <div class="card-disciplina-actions">
                            <button class="btn-tasks" data-id="${d.id}" title="Gerenciar Tarefas">✅ Ver Tarefas</button>
                        </div>
                    </div>
                `;
            }).join('');
            elements.dashboardDisciplinas.querySelectorAll('.card-disciplina').forEach(card => {
                card.addEventListener('click', (e) => {
                    // Evita conflito de clique no botão de tarefas
                    if (e.target.classList.contains('btn-tasks')) return;
                    fetchContent('video_text', card.dataset.id);
                });
            });
            // Evento para o botão de tarefas
            elements.dashboardDisciplinas.querySelectorAll('.btn-tasks').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTasksModal(btn.dataset.id);
                });
            });
        }
        
        // Carrega contagens totais
        const [video_texts, videos, practices] = await Promise.all([
            supabase.from('video_text').select('id', { count: 'exact', head: true }),
            supabase.from('video').select('id', { count: 'exact', head: true }),
            supabase.from('practice').select('id', { count: 'exact', head: true })
        ]);

        console.log('Situações das disciplinas:', disciplinas.map(d => d.situation));
    }
    
    // Busca conteúdo (text, video, practice) de uma disciplina
    async function fetchContent(type, disciplinaId) {
        appState.currentContentType = type;
        appState.currentDisciplinaId = disciplinaId;
        
        elements.contentView.innerHTML = `<div style="text-align:center; padding: 40px;">Carregando...</div>`;
        showContentView();
        
        // Busca informações da disciplina para personalização
        const { data: disciplinaData, error: disciplinaError } = await supabase
            .from('disciplina')
            .select('nome')
            .eq('id', disciplinaId)
            .single();
        
        if (!disciplinaError && disciplinaData) {
            const detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
            applyLanguageCustomization(detectedLanguage);
            applyButtonCustomization(detectedLanguage);
        }
        
        const { data, error } = await supabase.from(type).select('*').eq('id_disciplina', disciplinaId);

        if (error || !Array.isArray(data)) {
            console.error(`Erro ao buscar ${type}:`, error);
            appState.currentContent = [];
            appState.allFlashcards = []; // Clear all flashcards if error
        } else {
            if (type === 'flashcard') {
                appState.allFlashcards = data; // Store all flashcards
                // Filter flashcards based on spaced repetition logic
                appState.currentContent = data.filter(card => getSpacedRepetitionStatus(card).isReadyForReview);
            } else {
                appState.currentContent = data;
            }
        }
        
        renderContent();
        
        // Carrega e aplica anotações após renderizar o conteúdo
        if (type === 'video_text') {
            await loadAndApplyAnnotations(disciplinaId);
        }
        
        elements.extraContentMenu.classList.add('hidden');
    }

    // Função para buscar e exibir tarefas da disciplina e usuário logado
    async function fetchTasks(disciplinaId) {
        appState.currentContentType = 'tasks';
        appState.currentDisciplinaId = disciplinaId;
        elements.contentView.innerHTML = `<div style="text-align:center; padding: 40px;">Carregando tarefas...</div>`;
        showContentView();
        elements.extraContentMenu.classList.add('hidden');
        const userId = localStorage.getItem('user_id');
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id_disciplina', String(disciplinaId))
            .eq('id_usuario', String(userId));
        console.log('Tasks retornadas:', tasks, 'Erro:', error, 'userId:', userId, 'disciplinaId:', disciplinaId);
        if (error || !Array.isArray(tasks)) {
            elements.contentView.innerHTML = `<div style='color:var(--danger-color); text-align:center;'>Erro ao buscar tarefas.</div>`;
            appState.currentContent = [];
            return;
        }
        appState.currentContent = tasks;
        renderContent();
    }

    // Função para renderizar tabela de tarefas
    function renderTasksTable(tasks) {
        // Ordena as tarefas: pendente > em andamento > concluída
        const statusOrder = { 'pendente': 0, 'em andamento': 1, 'concluída': 2 };
        tasks = tasks.slice().sort((a, b) => {
            const aOrder = statusOrder[a.situacao] !== undefined ? statusOrder[a.situacao] : 99;
            const bOrder = statusOrder[b.situacao] !== undefined ? statusOrder[b.situacao] : 99;
            return aOrder - bOrder;
        });
        // Função para verificar se deve mostrar o sino de alerta
        function shouldShowBell(task) {
            if (task.situacao !== 'em andamento' || !task.data_fim) return false;
            const fim = new Date(task.data_fim);
            const hoje = new Date();
            // Zera horas para comparar apenas datas
            fim.setHours(0,0,0,0);
            hoje.setHours(0,0,0,0);
            const diff = (fim - hoje) / (1000 * 60 * 60 * 24);
            return diff <= 10 && diff >= 0;
        }
        let html = `<button onclick="window.goBackToDashboard()" class="close-btn" style="color:#222; top:12px; right:12px;">×</button>`;
        const isEditMode = appState.isEditMode;
        const disciplinaId = appState.currentDisciplinaId;
        if (!tasks || tasks.length === 0) {
            html += `<div style='color:var(--danger-color); text-align:center; margin-bottom:16px;'>Nenhuma tarefa encontrada para esta disciplina.</div>`;
            if (isEditMode) {
                html += `<div style='text-align:center;'><button class='add-new-task-btn'>➕ Nova Tarefa</button></div>`;
            }
            elements.contentView.innerHTML = html;
            if (isEditMode) {
                const addBtn = elements.contentView.querySelector('.add-new-task-btn');
                if (addBtn) addBtn.onclick = () => handleCreateTask(disciplinaId);
            }
            return;
        }
        html += `
            <h2 style='text-align:center;'>Tarefas</h2>
            <table class='crud-table' style='width:100%;margin-bottom:16px;'>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Data Início</th>
                        <th>Data Fim</th>
                        <th>Situação</th>
                        ${isEditMode ? '<th>Ações</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => `
                        <tr>
                            <td>${task.nome}</td>
                            <td>${task.data_inicio || ''}</td>
                            <td>${task.data_fim || ''}</td>
                            <td class="task-status ${task.situacao === 'pendente' ? 'status-pendente' : task.situacao === 'em andamento' ? 'status-andamento' : task.situacao === 'concluída' ? 'status-concluida' : ''}">
                                ${task.situacao || ''}
                                ${shouldShowBell(task) ? '<span class="alert-bell" title="Faltam 10 dias ou menos!">🔔</span>' : ''}
                            </td>
                            ${isEditMode ? `<td>
                                <button class='edit-task-btn' data-id='${task.id}'>✏️</button>
                                <button class='delete-task-btn' data-id='${task.id}'>🗑️</button>
                            </td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        if (isEditMode) {
            html += `<div style='text-align:center;'><button class='add-new-task-btn'>➕ Nova Tarefa</button></div>`;
        }
        elements.contentView.innerHTML = html;
        if (isEditMode) {
            elements.contentView.querySelectorAll('.edit-task-btn').forEach(btn => {
                btn.onclick = () => handleEditTask(btn.dataset.id, disciplinaId);
            });
            elements.contentView.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.onclick = () => handleDeleteTask(btn.dataset.id, disciplinaId);
            });
            const addBtn = elements.contentView.querySelector('.add-new-task-btn');
            if (addBtn) addBtn.onclick = () => handleCreateTask(disciplinaId);
        }
    }

    // --- FLASHCARDS ---
    function renderFlashcards(flashcards, isEditMode, disciplinaId) {
        if (!Array.isArray(flashcards)) {
            flashcards = [];
        }

        let flashcardHtml = `<button onclick="window.goBackToDashboard()" class="close-btn" style="color:#222; top:12px; right:12px;">×</button>`;

        if (flashcards.length === 0) {
            flashcardHtml += `
                <div style="color:var(--danger-color); text-align:center; margin-bottom:16px;">
                    Nenhum flashcard pronto para revisão no momento.
                </div>
                <div style="text-align:center;">
                    <button id="view-all-flashcards-btn" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; transition: background 0.2s;">Ver Todos os Flashcards</button>
                </div>`;
            if (isEditMode) {
                flashcardHtml += `<div style="text-align:center; margin-top:20px;"><button class="add-new-flashcard-btn">➕ Adicionar Flashcard</button></div>`;
            }
            elements.contentView.innerHTML = flashcardHtml;
            elements.contentView.querySelector('#view-all-flashcards-btn').onclick = () => {
                renderAllFlashcardsTable(appState.allFlashcards, isEditMode, disciplinaId);
            };
            if (isEditMode) {
                elements.contentView.querySelector('.add-new-flashcard-btn').onclick = () => handleCreate('flashcard', disciplinaId);
            }
            return;
        }

        const currentCard = flashcards[appState.currentFlashcardIndex];
        // Split by '||' to match the new format
        const parts = currentCard.card.split('||').map(s => s.trim());
        const front = parts[0] || '';
        const back = parts[1] || '';
        const imageDesc = parts[2] || ''; // Keep image description if present

        const displayContent = appState.isFlashcardFlipped ? back : front;

        // Update data_last_view for the current card immediately when it's rendered
        if (currentCard && currentCard.id) {
            supabase.from('flashcard').update({ data_last_view: new Date().toISOString() }).eq('id', currentCard.id)
                .then(({ error }) => {
                    if (error) console.error("Error updating data_last_view:", error);
                    else {
                        // Update the local object to reflect the change without re-fetching everything
                        currentCard.data_last_view = new Date().toISOString();
                    }
                });
        }

        flashcardHtml += `
            <div class="flashcard-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 20px;">
                <div class="flashcard" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 12px; padding: 30px; width: 100%; max-width: 500px; min-height: 200px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 1.5em; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: transform 0.3s ease, background 0.3s ease;" data-id="${currentCard.id}">
                    ${displayContent}
                </div>
                <div class="flashcard-controls" style="display: flex; gap: 15px; margin-top: 20px;">
                    <button id="prev-flashcard-btn" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; transition: background 0.2s;">Anterior</button>
                    <button id="flip-flashcard-btn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; transition: background 0.2s;">Virar</button>
                    <button id="next-flashcard-btn" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; transition: background 0.2s;">Próximo</button>
                </div>
                <button id="view-all-flashcards-btn" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; transition: background 0.2s;">Ver Todos os Flashcards</button>
                ${isEditMode ? `
                    <div class="flashcard-edit-controls" style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="crud-btn edit-flashcard-btn" data-id="${currentCard.id}" style="padding: 8px 15px; background: #ffc107; color: black; border: none; border-radius: 6px; cursor: pointer;">✏️ Editar</button>
                        <button class="crud-btn delete-flashcard-btn" data-id="${currentCard.id}" style="padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer;">🗑️ Excluir</button>
                        <button class="add-new-flashcard-btn" style="padding: 8px 15px; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer;">➕ Adicionar Novo</button>
                    </div>
                ` : ''}
            </div>
        `;
        elements.contentView.innerHTML = flashcardHtml;

        // Add event listeners for flashcard navigation and flip
        const flashcardElement = elements.contentView.querySelector('.flashcard');
        const prevBtn = elements.contentView.querySelector('#prev-flashcard-btn');
        const flipBtn = elements.contentView.querySelector('#flip-flashcard-btn');
        const nextBtn = elements.contentView.querySelector('#next-flashcard-btn');
        const viewAllBtn = elements.contentView.querySelector('#view-all-flashcards-btn');

        flashcardElement.onclick = () => {
            appState.isFlashcardFlipped = !appState.isFlashcardFlipped;
            renderFlashcards(flashcards, isEditMode, disciplinaId);
        };
        flipBtn.onclick = () => {
            appState.isFlashcardFlipped = !appState.isFlashcardFlipped;
            renderFlashcards(flashcards, isEditMode, disciplinaId);
        };
        prevBtn.onclick = () => {
            appState.currentFlashcardIndex = (appState.currentFlashcardIndex - 1 + flashcards.length) % flashcards.length;
            appState.isFlashcardFlipped = false;
            renderFlashcards(flashcards, isEditMode, disciplinaId);
        };
        nextBtn.onclick = () => {
            appState.currentFlashcardIndex = (appState.currentFlashcardIndex + 1) % flashcards.length;
            appState.isFlashcardFlipped = false;
            renderFlashcards(flashcards, isEditMode, disciplinaId);
        };
        viewAllBtn.onclick = () => {
            renderAllFlashcardsTable(appState.allFlashcards, isEditMode, disciplinaId);
        };

        // Add event listeners for CRUD buttons if in edit mode
        if (isEditMode) {
            elements.contentView.querySelector('.edit-flashcard-btn').onclick = () => handleEdit('flashcard', currentCard.id);
            elements.contentView.querySelector('.delete-flashcard-btn').onclick = () => handleDelete('flashcard', currentCard.id);
            elements.contentView.querySelector('.add-new-flashcard-btn').onclick = () => handleCreate('flashcard', disciplinaId);
        }
    }

    // NEW FUNCTION: Render all flashcards in a table
    function renderAllFlashcardsTable(flashcards, isEditMode, disciplinaId) {
        let html = `<button onclick="window.goBackToFlashcards()" class="close-btn" style="color:#222; top:12px; right:12px;">×</button>`;
        if (!Array.isArray(flashcards) || flashcards.length === 0) {
            html += `<div style='color:var(--danger-color); text-align:center; margin-bottom:16px;'>Nenhum flashcard encontrado para esta disciplina.</div>`;
            if (isEditMode) {
                html += `<div style='text-align:center;'><button class='add-new-flashcard-btn'>➕ Adicionar Novo Flashcard</button></div>`;
            }
            elements.contentView.innerHTML = html;
            if (isEditMode) {
                const addBtn = elements.contentView.querySelector('.add-new-flashcard-btn');
                if (addBtn) addBtn.onclick = () => handleCreate('flashcard', disciplinaId);
            }
            return;
        }

        html += `
            <h2 style='text-align:center;'>Todos os Flashcards</h2>
            <table class='crud-table no-annotation' style='width:100%;margin-bottom:16px;'>
                <thead>
                    <tr>
                        <th>Conteúdo do Flashcard</th>
                        ${isEditMode ? '<th>Ações</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${flashcards.map(card => {
                        const fullContent = card.card;
                        return `
                            <tr>
                                <td>${fullContent}</td>
                                ${isEditMode ? `<td>
                                    <button class='edit-flashcard-btn' data-id='${card.id}'>✏️</button>
                                    <button class='delete-flashcard-btn' data-id='${card.id}'>🗑️</button>
                                </td>` : ''}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        if (isEditMode) {
            html += `<div style='text-align:center;'><button class='add-new-flashcard-btn'>➕ Adicionar Novo Flashcard</button></div>`;
        }
        elements.contentView.innerHTML = html;

        if (isEditMode) {
            elements.contentView.querySelectorAll('.edit-flashcard-btn').forEach(btn => {
                btn.onclick = () => handleEdit('flashcard', btn.dataset.id);
            });
            elements.contentView.querySelectorAll('.delete-flashcard-btn').forEach(btn => {
                btn.onclick = () => handleDelete('flashcard', btn.dataset.id);
            });
            const addBtn = elements.contentView.querySelector('.add-new-flashcard-btn');
            if (addBtn) addBtn.onclick = () => handleCreate('flashcard', disciplinaId);
        }
    }

    // Function to go back to single flashcard view
    window.goBackToFlashcards = () => {
        renderFlashcards(appState.currentContent, appState.isEditMode, appState.currentDisciplinaId);
    };

    // --- MODAL DE PIZZA ---
    
    // Funções para desenhar o gráfico de pizza SVG
    function polarToCartesian(cx, cy, r, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: cx + (r * Math.cos(angleInRadians)),
            y: cy + (r * Math.sin(angleInRadians))
        };
    }
    function describeArc(cx, cy, r, startAngle, endAngle) {
        const start = polarToCartesian(cx, cy, r, endAngle);
        const end = polarToCartesian(cx, cy, r, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
    }

    // Abre e renderiza o modal de pizza com as disciplinas
    async function openDisciplinaModal() {
        const modal = elements.disciplinaModal;
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
        // Fecha ao clicar fora do conteúdo
        modal.addEventListener('click', function handler(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.classList.add('hidden'), 200);
                modal.removeEventListener('click', handler);
            }
        });
        renderPizzaMenu();
    }

    async function renderPizzaMenu() {
        elements.pizzaContainer.innerHTML = 'Carregando...';
        const { data, error } = await supabase.from('disciplina').select('*');
        if (error || !Array.isArray(data) || data.length === 0) {
            elements.pizzaContainer.innerHTML = '<div style="color:red; text-align:center;">Nenhuma disciplina encontrada.</div>';
            return;
        }
        // Filtra apenas as disciplinas com situation === 'estudando' (case-insensitive) e tipo_disciplina === 'idioma'
        const estudando = data.filter(d => (d.situation || '').toLowerCase() === 'estudando' && (d.tipo_disciplina || '').toLowerCase() === 'idioma');
        if (estudando.length === 0) {
            elements.pizzaContainer.innerHTML = '<div style="text-align:center;">Nenhuma disciplina em estudo.</div>';
            return;
        }
        const n = estudando.length;
        const cx = 190, cy = 190, r = 180;
        const pizzaColors = ["#FFD700", "#FF6347", "#90EE90", "#87CEEB", "#FFB6C1", "#FFA07A", "#20B2AA", "#9370DB", "#F08080", "#40E0D0"];
        let svg = `<svg viewBox="0 0 380 380" style="width: 100%; height: auto; max-width: 380px; max-height: 380px; overflow: visible;">`;
        estudando.forEach((disciplina, i) => {
            const startAngle = (i * 360 / n);
            const endAngle = ((i + 1) * 360 / n);
            const color = pizzaColors[i % pizzaColors.length];
            svg += `<path d="${describeArc(cx, cy, r, startAngle, endAngle)}" fill="${color}" stroke="#fff" stroke-width="2" data-id="${disciplina.id}"/>`;
            const midAngle = (startAngle + endAngle) / 2;
            const textRadius = r * 0.6;
            const pos = polarToCartesian(cx, cy, textRadius, midAngle);
            svg += `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" font-size="14" font-weight="bold" fill="#222">${disciplina.nome}</text>`;
        });
        svg += `</svg>`;
        elements.pizzaContainer.innerHTML = svg + '<div style="text-align:center; margin-top:20px;"><button id="gerenciar-disciplinas-btn" style="padding:8px 18px; border-radius:6px; background:#1976d2; color:#fff; border:none; cursor:pointer;">Gerenciar Disciplinas</button></div>';
        // Adiciona evento de clique nas fatias
        elements.pizzaContainer.querySelectorAll('path').forEach(path => {
            path.addEventListener('click', () => {
                fetchContent('video_text', path.dataset.id);
                elements.disciplinaModal.classList.add('hidden');
            });
        });
        // Evento para gerenciar disciplinas
        const gerenciarBtn = document.getElementById('gerenciar-disciplinas-btn');
        if (gerenciarBtn) {
            gerenciarBtn.onclick = renderDisciplinaListInModal;
        }
    }

    async function renderDisciplinaListInModal() {
        elements.pizzaContainer.innerHTML = 'Carregando...';
        const { data, error } = await supabase.from('disciplina').select('*');
        if (error || !Array.isArray(data)) {
            elements.pizzaContainer.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar disciplinas.</div>';
            return;
        }
        // Filtra apenas disciplinas do tipo 'normal'
        const dataNormal = data.filter(d => (d.tipo_disciplina || '').toLowerCase() === 'idioma');
        if (dataNormal.length === 0) {
            elements.pizzaContainer.innerHTML = '<div style="text-align:center;">Nenhuma disciplina encontrada.</div>';
        } else {
            // Ordena: estudando no topo
            dataNormal.sort((a, b) => {
                const aEst = (a.situation || '').toLowerCase() === 'estudando' ? 0 : 1;
                const bEst = (b.situation || '').toLowerCase() === 'estudando' ? 0 : 1;
                return aEst - bEst;
            });
            elements.pizzaContainer.innerHTML = `
                <table class="crud-table" style="width:100%;margin-bottom:16px;">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Data Início</th>
                            <th>Situação</th>
                            <th>Data Fim</th>
                            <th>Tipo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dataNormal.map(d => `
                            <tr${((d.situation || '').toLowerCase() !== 'estudando') ? ' style="background:#d4edda;"' : ''}>
                                <td>${d.id}</td>
                                <td>${d.nome}</td>
                                <td>${d.date_inicio || ''}</td>
                                <td>${d.situation || ''}</td>
                                <td>${d.date_fim || ''}</td>
                                <td>${d.tipo_disciplina || ''}</td>
                                <td>
                                    <button class="edit-disciplina-btn" data-id="${d.id}">✏️</button>
                                    <button class="delete-disciplina-btn" data-id="${d.id}">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <button id="voltar-pizza-btn" style="margin-right:12px; padding:8px 18px; border-radius:6px; background:#eee; color:#1976d2; border:none; cursor:pointer;">Voltar ao menu pizza</button>
                <button id="add-disciplina-modal-btn" style="padding:8px 18px; border-radius:6px; background:#1976d2; color:#fff; border:none; cursor:pointer;">Nova Disciplina</button>
            `;
            // Eventos de editar
            elements.pizzaContainer.querySelectorAll('.edit-disciplina-btn').forEach(btn => {
                btn.onclick = () => openDisciplinaCrudModal('edit', btn.dataset.id);
            });
            // Eventos de deletar
            elements.pizzaContainer.querySelectorAll('.delete-disciplina-btn').forEach(btn => {
                btn.onclick = () => deleteDisciplina(btn.dataset.id);
            });
            // Evento de adicionar
            const addBtn = elements.pizzaContainer.querySelector('#add-disciplina-modal-btn');
            if (addBtn) addBtn.onclick = () => openDisciplinaCrudModal('create');
            // Evento de voltar
            const voltarBtn = elements.pizzaContainer.querySelector('#voltar-pizza-btn');
            if (voltarBtn) voltarBtn.onclick = renderPizzaMenu;
        }
    }

    async function deleteDisciplina(id) {
        showConfirmModal('Tem certeza que deseja excluir esta disciplina?', async () => {
            await supabase.from('disciplina').delete().eq('id', id);
            renderDisciplinaListInModal();
        });
    }

    // --- LÓGICA DE CRUD (HANDLERS) ---
    
    // **REATORADO** Funções que disparam o modal de CRUD
    async function handleCreate(type, disciplinaId) {
        const config = getCrudConfig(type);
        const userId = localStorage.getItem('user_id');
        
        // Detecta o idioma da disciplina atual para personalizar o modal
        let detectedLanguage = null;
        if (disciplinaId) {
            const { data: disciplinaData } = await supabase
                .from('disciplina')
                .select('nome')
                .eq('id', disciplinaId)
                .single();
            if (disciplinaData) {
                detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
            }
        }
        
        createCrudModal({
            title: `Novo ${config.label}`,
            formFields: config.fields,
            language: detectedLanguage,
            onSubmit: async (data) => {
                let insertData = {};
                let valid = true;
                if (type === 'video_text') {
                    valid = data.link_video && data.text;
                    insertData = {
                        link_video: data.link_video,
                        text: data.text,
                        id_disciplina: disciplinaId
                    };
                } else if (type === 'video') {
                    valid = data.title && data.video_link;
                    insertData = {
                        id_disciplina: disciplinaId,
                        id_usuario: userId,
                        title: data.title,
                        video_link: data.video_link
                    };
                } else if (type === 'practice') {
                    valid = data.tipo && data.texto;
                    insertData = {
                        id_disciplina: disciplinaId,
                        id_usuario: userId,
                        tipo: data.tipo,
                        texto: data.texto,
                        link: data.link
                    };
                } else if (type === 'flashcard') {
                    valid = data.card;
                    insertData = {
                        id_disciplina: disciplinaId,
                        id_usuario: userId,
                        card: data.card,
                        data_cadastro: new Date().toISOString() // Set data_cadastro on creation
                    };
                } else {
                    valid = false;
                }
                if (!valid) {
                    alert('Preencha todos os campos obrigatórios.');
                    return;
                }
                await supabase.from(type).insert([insertData]);
                fetchContent(type, disciplinaId);
            }
        });
    }
    
    async function handleEdit(type, id) {
        const { data: itemData, error } = await supabase.from(type).select('*').eq('id', id).single();
        if (error) { console.error("Erro ao buscar item para edição", error); return; }

        // Detecta o idioma da disciplina atual para personalizar o modal
        let detectedLanguage = null;
        if (itemData && itemData.id_disciplina) {
            const { data: disciplinaData } = await supabase
                .from('disciplina')
                .select('nome')
                .eq('id', itemData.id_disciplina)
                .single();
            if (disciplinaData) {
                detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
            }
        }

        const config = getCrudConfig(type);
        createCrudModal({
            title: `Editar ${config.label}`,
            formFields: config.fields,
            initialData: itemData,
            language: detectedLanguage,
            onSubmit: async (data) => {
                const updateData = { ...data };
                if (type === 'flashcard') {
                    // data_last_view is updated on view, not necessarily on edit.
                    // If you want to update it on edit, uncomment the line below.
                    // updateData.data_last_view = new Date().toISOString();
                }
                await supabase.from(type).update(updateData).eq('id', id);
            }
        });
    }
    
    async function handleDelete(type, id) {
        showConfirmModal(`Tem certeza que deseja excluir este item?`, async () => {
            await supabase.from(type).delete().eq('id', id);
            fetchContent(appState.currentContentType, appState.currentDisciplinaId);
        });
    }

    // Funções CRUD globais para tarefas (fora do modal)
    async function handleEditTask(id, disciplinaId) {
        const { data: item, error } = await supabase.from('tasks').select('*').eq('id', id).single();
        if (error) return alert('Erro ao buscar tarefa para edição.');
        
        // Detecta o idioma da disciplina para personalizar o modal
        let detectedLanguage = null;
        if (disciplinaId) {
            const { data: disciplinaData } = await supabase
                .from('disciplina')
                .select('nome')
                .eq('id', disciplinaId)
                .single();
            if (disciplinaData) {
                detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
            }
        }
        
        const userId = localStorage.getItem('user_id');
        createCrudModal({
            title: 'Editar Tarefa',
            formFields: getCrudConfig('tasks').fields,
            initialData: item,
            language: detectedLanguage,
            onSubmit: async (data) => {
                if (!data.nome || !data.data_fim || !data.situacao) {
                    alert('Preencha todos os campos obrigatórios.');
                    return;
                }
                await supabase.from('tasks').update({
                    id_disciplina: disciplinaId,
                    id_usuario: userId,
                    data_inicio: item.data_inicio,
                    data_fim: data.data_fim,
                    situacao: data.situacao,
                    nome: data.nome
                }).eq('id', id);
                await fetchTasks(disciplinaId);
            }
        });
    }
    async function handleDeleteTask(id, disciplinaId) {
        showConfirmModal('Tem certeza que deseja excluir esta tarefa?', async () => {
            await supabase.from('tasks').delete().eq('id', id);
            await fetchTasks(disciplinaId);
        });
    }

    function openDisciplinaCrudModal(mode, id = null) {
        const fields = getCrudConfig('disciplina').fields;
        if (mode === 'create') {
            const userId = localStorage.getItem('user_id');
            createCrudModal({
                title: 'Nova Disciplina',
                formFields: fields,
                language: null, // Modal neutro para criação de disciplinas
                onSubmit: async (data) => {
                                    if (!data.nome || !data.date_inicio || !data.situation || !data.date_fim || !data.tipo_disciplina) {
                    alert('Preencha todos os campos obrigatórios.');
                    return;
                }
                await supabase.from('disciplina').insert([{
                    id_usuario: userId,
                    nome: data.nome,
                    date_inicio: data.date_inicio,
                    date_fim: data.date_fim,
                    situation: data.situation,
                    tipo_disciplina: data.tipo_disciplina
                }]);
                    renderDisciplinaListInModal();
                }
            });
        } else if (mode === 'edit' && id) {
            supabase.from('disciplina').select('*').eq('id', id).single().then(({ data: disciplina }) => {
                // Detecta o idioma da disciplina para personalizar o modal
                const detectedLanguage = disciplina ? detectLanguageAndCustomize(disciplina.nome) : null;
                
                createCrudModal({
                    title: 'Editar Disciplina',
                    formFields: fields,
                    initialData: disciplina,
                    language: detectedLanguage,
                    onSubmit: async (data) => {
                        await supabase.from('disciplina').update({
                            nome: data.nome,
                            date_inicio: data.date_inicio,
                            date_fim: data.date_fim,
                            situation: data.situation,
                            tipo_disciplina: data.tipo_disciplina
                        }).eq('id', id);
                        renderDisciplinaListInModal();
                    }
                });
            });
        }
    }

    // --- EVENT LISTENERS ---
    
    elements.logoutBtn.addEventListener('click', logout);
    elements.hackerBtn.addEventListener('click', openDisciplinaModal);
    elements.closeDisciplinaModalBtn.addEventListener('click', () => elements.disciplinaModal.classList.add('hidden'));

    elements.editGearBtn.addEventListener('click', () => {
        appState.isEditMode = !appState.isEditMode;
        document.body.classList.toggle('edit-mode', appState.isEditMode);
        // Se estiver em Conteúdo Extra, re-renderiza os cards de extra
        if (appState.currentContentType === 'extra') {
            fetchExtraContent(appState.currentDisciplinaId);
        } else {
            renderContent();
        }
    });

    elements.extraContentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.extraContentMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        // Fecha o menu se clicar fora dele
        elements.extraContentMenu.classList.add('hidden');
    });

    elements.menuTextBtn.onclick = () => fetchContent('video_text', appState.currentDisciplinaId);
    elements.menuVideoBtn.onclick = () => fetchContent('video', appState.currentDisciplinaId);
    elements.menuPracticeBtn.onclick = () => fetchContent('practice', appState.currentDisciplinaId);
    elements.menuFlashcardsBtn.onclick = () => fetchContent('flashcard', appState.currentDisciplinaId); // Added

    if (elements.menuExtraBtn) {
        elements.menuExtraBtn.onclick = async () => {
            appState.currentContentType = 'extra';
            await fetchExtraContent(appState.currentDisciplinaId);
        };
    }

    if (elements.addDisciplinaBtn) {
        elements.addDisciplinaBtn.addEventListener('click', () => {
            elements.crudModalRoot.innerHTML = '';
            // Fecha o modal pizza, se estiver aberto
            elements.disciplinaModal.classList.add('hidden');
            openDisciplinaCrudModal('create');
        });
    }
    
    if (elements.headerUserName) {
        elements.headerUserName.addEventListener('click', () => {
            window.location.reload();
        });
    }

    if (elements.englishFlagBtn) {
        elements.englishFlagBtn.addEventListener('click', function() {
            window.location.href = 'idiomas.html';
        });
    }

    if (elements.closeAiWriterModal) {
        elements.closeAiWriterModal.addEventListener('click', () => {
            elements.aiWriterModal.classList.remove('show');
            setTimeout(() => {
                elements.aiWriterModal.style.display = 'none';
                elements.aiWriterIframe.src = '';
            }, 200); // Tempo para a animação completar
        });
    }

    // Fecha o modal ao clicar fora dele
    if (elements.aiWriterModal) {
        elements.aiWriterModal.addEventListener('click', (e) => {
            if (e.target === elements.aiWriterModal) {
                elements.aiWriterModal.classList.remove('show');
                setTimeout(() => {
                    elements.aiWriterModal.style.display = 'none';
                    elements.aiWriterIframe.src = '';
                }, 200); // Tempo para a animação completar
            }
        });
    }

    // Adicionar bloco para exibir erros JS na tela
    window.addEventListener('error', function(event) {
        let errDiv = document.getElementById('global-js-error');
        if (!errDiv) {
            errDiv = document.createElement('div');
            errDiv.id = 'global-js-error';
            errDiv.style.position = 'fixed';
            errDiv.style.bottom = '0';
            errDiv.style.left = '0';
            errDiv.style.right = '0';
            errDiv.style.background = '#b00';
            errDiv.style.color = '#fff';
            errDiv.style.padding = '8px 16px';
            errDiv.style.zIndex = '9999';
            errDiv.style.fontSize = '1.1em';
            document.body.appendChild(errDiv);
        }
        errDiv.textContent = 'Erro JS: ' + event.message + ' (' + event.filename + ':' + event.lineno + ')';
    });

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    protectPage();
    loadDashboard();
    
    // Inicializa a funcionalidade de anotação
    initAnnotationFeature();

    // Adiciona funções ao escopo global para serem chamadas pelo HTML e outras funções
    window.goBackToDashboard = showDashboard;
    window.fetchTasks = fetchTasks;
    window.appState = appState;
    window.openMovableVideoModal = openMovableVideoModal;
});

// Adiciona função para abrir modal de tarefas (fora do DOMContentLoaded para ser global)
function openTasksModal(disciplinaId) {
    const existingModal = document.querySelector('.modal-overlay[data-modal="tasks"]');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.setAttribute('data-modal', 'tasks');
    modal.innerHTML = `
        <div class="modal-content modal-tasks-content">
            <div class="modal-header" style="position: sticky; top: 0; background: #fff; z-index: 1; padding: 16px; border-bottom: 1px solid #eee;">
                <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Tarefas</h3>
                    <button class="add-new-task-button" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;">➕ Adicionar Nova Tarefa</button>
                </div>
                <button class="close-btn close-tasks-modal" style="position:absolute;top:16px;right:16px;font-size:1.5em;background:none;border:none;cursor:pointer;">×</button>
            </div>
            <div id="tasks-modal-table">Carregando tarefas...</div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Adiciona evento ao botão de nova tarefa
    const addTaskButton = modal.querySelector('.add-new-task-button');
    if (addTaskButton) {
        addTaskButton.onclick = () => handleCreateTask(disciplinaId);
    }
    
    setTimeout(() => modal.classList.add('show'), 10);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeTasksModal(modal);
        }
    });
    
    modal.querySelector('.close-tasks-modal').onclick = () => closeTasksModal(modal);
    
    fetchTasksForModal(disciplinaId, modal.querySelector('#tasks-modal-table'));
}

function closeTasksModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.remove();
        }
    }, 200);
}

async function fetchTasksForModal(disciplinaId, container) {
    if (!container) {
        console.error('Container não encontrado para renderizar tarefas');
        return;
    }
    
    container.innerHTML = 'Carregando tarefas...';
    
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        container.innerHTML = `<div style='color:var(--danger-color); text-align:center;'>Usuário não autenticado.</div>`;
        return;
    }
    
    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id_disciplina', String(disciplinaId))
            .eq('id_usuario', String(userId));
            
        if (error) {
            console.error('Erro ao buscar tarefas:', error);
            container.innerHTML = `<div style='color:var(--danger-color); text-align:center;'>Erro ao buscar tarefas: ${error.message}</div>`;
            return;
        }
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = `
                <h2 style='text-align:center;'>Tarefas</h2>
                <div style='color:var(--danger-color); text-align:center; margin-bottom:16px;'>Nenhuma tarefa encontrada para esta disciplina.</div>
            `;
            return;
        }
        
        container.innerHTML = renderTasksTableForModal(tasks, disciplinaId);
        
        container.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.onclick = () => handleEditTaskModal(btn.dataset.id, disciplinaId, container);
        });
        
        container.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.onclick = () => handleDeleteTaskModal(btn.dataset.id, disciplinaId, container);
        });
        
        const addBtn = container.querySelector('.add-new-task-btn');
        if (addBtn) addBtn.onclick = () => handleCreateTaskModal(disciplinaId, container);
        
    } catch (err) {
        console.error('Erro inesperado ao buscar tarefas:', err);
        container.innerHTML = `<div style='color:var(--danger-color); text-align:center;'>Erro inesperado ao carregar tarefas.</div>`;
    }
}

function renderTasksTableForModal(tasks, disciplinaId) {
    const statusOrder = { 'pendente': 0, 'em andamento': 1, 'concluída': 2 };
    tasks = tasks.slice().sort((a, b) => {
        const aOrder = statusOrder[a.situacao] !== undefined ? statusOrder[a.situacao] : 99;
        const bOrder = statusOrder[b.situacao] !== undefined ? statusOrder[b.situacao] : 99;
        return aOrder - bOrder;
    });
    function shouldShowBell(task) {
        if (task.situacao !== 'em andamento' || !task.data_fim) return false;
        const fim = new Date(task.data_fim);
        const hoje = new Date();
        fim.setHours(0,0,0,0);
        hoje.setHours(0,0,0,0);
        const diff = (fim - hoje) / (1000 * 60 * 60 * 24);
        return diff <= 10 && diff >= 0;
    }
    let html = `<h2 style='text-align:center;'>Tarefas</h2>
        <table class='crud-table' style='width:100%;margin-bottom:16px;'>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Data Início</th>
                    <th>Data Fim</th>
                    <th>Situação</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(task => `
                    <tr>
                        <td>${task.nome}</td>
                        <td>${task.data_inicio || ''}</td>
                        <td>${task.data_fim || ''}</td>
                        <td class="task-status ${task.situacao === 'pendente' ? 'status-pendente' : task.situacao === 'em andamento' ? 'status-andamento' : task.situacao === 'concluída' ? 'status-concluida' : ''}">
                            ${task.situacao || ''}
                            ${shouldShowBell(task) ? '<span class="alert-bell" title="Faltam 10 dias ou menos!">🔔</span>' : ''}
                        </td>
                        <td>
                            <button class='edit-task-btn' data-id='${task.id}'>✏️</button>
                            <button class='delete-task-btn' data-id='${task.id}'>🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    html += `<div style='text-align:center;'><button class='add-new-task-btn'>➕ Nova Tarefa</button></div>`;
    return html;
}

async function handleCreateTaskModal(disciplinaId, container) {
    const userId = localStorage.getItem('user_id');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    // Detecta o idioma da disciplina para personalizar o modal
    let detectedLanguage = null;
    if (disciplinaId) {
        const { data: disciplinaData } = await supabase
            .from('disciplina')
            .select('nome')
            .eq('id', disciplinaId)
            .single();
        if (disciplinaData) {
            detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
        }
    }
    
    createCrudModal({
        title: 'Nova Tarefa',
        formFields: getCrudConfig('tasks').fields,
        initialData: { id_disciplina: disciplinaId, id_usuario: userId, data_inicio: todayStr },
        language: detectedLanguage,
        onSubmit: async (data) => {
            if (!data.nome || !data.data_fim || !data.situacao) {
                alert('Preencha todos os campos obrigatórios.');
                return;
            }
            await supabase.from('tasks').insert([{
                id_disciplina: disciplinaId,
                id_usuario: userId,
                data_inicio: todayStr,
                data_fim: data.data_fim,
                situacao: data.situacao,
                nome: data.nome
            }]);
            await fetchTasksForModal(disciplinaId, container);
        }
    });

async function handleEditTaskModal(id, disciplinaId, container) {
    const { data: item, error } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (error) return alert('Erro ao buscar tarefa para edição.');
    
    // Detecta o idioma da disciplina para personalizar o modal
    let detectedLanguage = null;
    if (disciplinaId) {
        const { data: disciplinaData } = await supabase
            .from('disciplina')
            .select('nome')
            .eq('id', disciplinaId)
            .single();
        if (disciplinaData) {
            detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
        }
    }
    
    const userId = localStorage.getItem('user_id');
    createCrudModal({
        title: 'Editar Tarefa',
        formFields: getCrudConfig('tasks').fields,
        initialData: item,
        language: detectedLanguage,
        onSubmit: async (data) => {
                if (!data.nome || !data.data_fim || !data.situacao) {
                    alert('Preencha todos os campos obrigatórios.');
                    return;
                }
                await supabase.from('tasks').update({
                    id_disciplina: disciplinaId,
                    id_usuario: userId,
                    data_inicio: item.data_inicio,
                    data_fim: data.data_fim,
                    situacao: data.situacao,
                    nome: data.nome
                }).eq('id', id);
                await fetchTasksForModal(disciplinaId, container);
            }
        });
    };
}

function handleDeleteTaskModal(id, disciplinaId, container) {
    showConfirmModal('Tem certeza que deseja excluir esta tarefa?', () => {
        supabase.from('tasks').delete().eq('id', id).then(() => {
            fetchTasksForModal(disciplinaId, container);
        });
    });
}

// Movendo função handleCreateTask para o escopo global
async function handleCreateTask(disciplinaId) {
    const userId = localStorage.getItem('user_id');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    // Detecta o idioma da disciplina para personalizar o modal
    let detectedLanguage = null;
    if (disciplinaId) {
        const { data: disciplinaData } = await supabase
            .from('disciplina')
            .select('nome')
            .eq('id', disciplinaId)
            .single();
        if (disciplinaData) {
            detectedLanguage = detectLanguageAndCustomize(disciplinaData.nome);
        }
    }
    
    createCrudModal({
        title: 'Nova Tarefa',
        formFields: getCrudConfig('tasks').fields,
        initialData: { id_disciplina: disciplinaId, id_usuario: userId, data_inicio: todayStr },
        language: detectedLanguage,
        onSubmit: async (data) => {
            if (!data.nome || !data.data_fim || !data.situacao) {
                alert('Preencha todos os campos obrigatórios.');
                return;
            }
            await supabase.from('tasks').insert([{
                id_disciplina: disciplinaId,
                id_usuario: userId,
                data_inicio: todayStr,
                data_fim: data.data_fim,
                situacao: data.situacao,
                nome: data.nome
            }]);
            await fetchTasksForModal(disciplinaId, document.querySelector('#tasks-modal-table'));
        }
    });
}

// --- FUNCIONALIDADE DE ANOTAÇÃO DE TEXTO ---

let annotationPopup = null;
let currentSelection = null;

/**
 * Inicializa o recurso de anotação, adicionando o listener de eventos.
 */
function initAnnotationFeature() {
    document.addEventListener('mouseup', handleTextSelection);
}

/**
 * Lida com a seleção de texto pelo usuário.
 * @param {MouseEvent} e - O evento do mouse.
 */
function handleTextSelection(e) {
    // Para qualquer fala em andamento quando uma nova seleção é feita
    stopSpeaking();

    // Verifica se o clique foi dentro do modal de anotação
    if (e.target.closest('#annotation-popup')) {
        return;
    }
    
    // Atraso para garantir que a seleção foi finalizada
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        // Verifica se a seleção está dentro de um elemento com a classe 'no-annotation'
        if (selection.anchorNode && selection.anchorNode.parentElement.closest('.no-annotation')) {
            // Se um pop-up existir de uma seleção anterior, remove-o
            if (annotationPopup) {
                annotationPopup.remove();
                annotationPopup = null;
            }
            return; // Sai da função se a anotação estiver desabilitada para esta área
        }

        // Remove pop-up anterior se existir
        if (annotationPopup) {
            annotationPopup.remove();
            annotationPopup = null;
        }

        // Verifica se há texto selecionado e se a seleção está dentro do #content-view
        if (selectedText.length > 0 && selection.anchorNode && document.getElementById('content-view').contains(selection.anchorNode.parentElement)) {
            currentSelection = selection.getRangeAt(0).cloneRange();
            
            // Verifica se o texto selecionado já tem destaque
            const range = selection.getRangeAt(0);
            const startContainer = range.startContainer;
            const endContainer = range.endContainer;
            
            // Verifica se a seleção está dentro de um elemento com classe 'annotated-text'
            let hasExistingAnnotation = false;
            let existingAnnotation = null;
            
            // Verifica se o nó inicial está dentro de uma anotação
            if (startContainer.nodeType === Node.TEXT_NODE) {
                const parentSpan = startContainer.parentElement;
                if (parentSpan && parentSpan.classList.contains('annotated-text')) {
                    hasExistingAnnotation = true;
                    existingAnnotation = {
                        element: parentSpan,
                        text: parentSpan.textContent,
                        css: parentSpan.style.cssText,
                        comment: parentSpan.title || ''
                    };
                }
            }
            
            // Se não encontrou no início, verifica se o nó final está dentro de uma anotação
            if (!hasExistingAnnotation && endContainer.nodeType === Node.TEXT_NODE) {
                const parentSpan = endContainer.parentElement;
                if (parentSpan && parentSpan.classList.contains('annotated-text')) {
                    hasExistingAnnotation = true;
                    existingAnnotation = {
                        element: parentSpan,
                        text: parentSpan.textContent,
                        css: parentSpan.style.cssText,
                        comment: parentSpan.title || ''
                    };
                }
            }
            
            if (hasExistingAnnotation && existingAnnotation) {
                // Marca o elemento que está sendo editado
                existingAnnotation.element.setAttribute('data-editing', 'true');
            }
            createAnnotationPopup(e.clientX, e.clientY, hasExistingAnnotation, existingAnnotation);
        }
    }, 10);
}

/**
 * Cria e exibe o pop-up de anotação na tela.
 * @param {number} x - Posição X do mouse.
 * @param {number} y - Posição Y do mouse.
 */
function createAnnotationPopup(x, y, hasExistingAnnotation = false, existingAnnotation = null) {
    annotationPopup = document.createElement('div');
    annotationPopup.id = 'annotation-popup';
    annotationPopup.style.zIndex = '2000'; // Ajustado para ser menor que o modal de CRUD

    // Armazena o texto selecionado para uso posterior
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Determina o título e botões baseado se já existe anotação
    const title = hasExistingAnnotation ? 'Editar Destaque' : 'Destacar Texto';
    const saveButtonText = hasExistingAnnotation ? 'Atualizar' : 'Salvar';
    const removeButton = hasExistingAnnotation ? '<button id="remove-annotation" class="btn-remove">🗑️ Remover</button>' : '';
    
    annotationPopup.innerHTML = `
        <div class="popup-header">
            <h3>${title}</h3>
            <button class="close-popup-btn">×</button>
        </div>
        <div class="selected-text-data" style="display: none;" data-selected-text="${selectedText}"></div>
        <div class="popup-body">
            <div class="ai-explanation">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4>🤖 Explicação IA</h4>
                    <button id="tts-control-btn" title="Ouvir explicação" style="background:none; border:none; cursor:pointer; font-size: 1.2em;">🔊</button>
                </div>
                <p class="explanation-text"></p>
            </div>
            <div class="annotation-controls">
                <div class="annotation-section">
                    <label for="annotation-comment">Comentário:</label>
                    <textarea id="annotation-comment" placeholder="Adicione um comentário sobre este texto...">${hasExistingAnnotation ? existingAnnotation.comment : ''}</textarea>
                </div>
                
                <div class="annotation-section">
                    <label for="annotation-css">Estilo CSS:</label>
                    <input type="text" id="annotation-css" placeholder="Selecione um estilo rápido acima ou digite CSS personalizado" value="${hasExistingAnnotation ? existingAnnotation.css : ''}">
                </div>
                
                <div class="annotation-section">
                    <label>Estilos Rápidos:</label>
                    <div class="quick-styles">
                        <button class="quick-style-btn" data-style="background-color: yellow; color: black;">🟡 Destaque</button>
                        <button class="quick-style-btn" data-style="background-color: #ff6b6b; color: white;">🔴 Importante</button>
                        <button class="quick-style-btn" data-style="background-color: #4ecdc4; color: white;">🟢 Conceito</button>
                        <button class="quick-style-btn" data-style="background-color: #45b7d1; color: white;">🔵 Definição</button>
                        <button class="quick-style-btn" data-style="font-weight: bold; color: black;">⚫ Negrito</button>
                        <button class="quick-style-btn" data-style="font-style: italic; color: black;">📝 Itálico</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="popup-footer">
            <div class="footer-right">
                <button id="ai-explain-btn" class="btn-ai-explain">🤖 Explicar IA</button>
                <button id="create-flashcard-btn" class="btn-ai-explain" style="display:none;">🎴 Criar Flashcard</button>
                <button id="cancel-annotation" class="btn-cancel">Cancelar</button>
                ${removeButton}
                <button id="save-annotation" class="btn-save">${saveButtonText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(annotationPopup);

    // Posiciona o pop-up perto da seleção, mas dentro da viewport
    const rect = annotationPopup.getBoundingClientRect();
    let left = x;
    let top = y + window.scrollY;
    
    // Ajusta posição se estiver fora da viewport
    if (left + rect.width > window.innerWidth) {
        left = window.innerWidth - rect.width - 10;
    }
    if (top + rect.height > window.innerHeight + window.scrollY) {
        top = y + window.scrollY - rect.height - 10;
    }
    
    annotationPopup.style.left = `${Math.max(10, left)}px`;
    annotationPopup.style.top = `${Math.max(10, top)}px`;

    // Adiciona eventos aos botões do pop-up
    document.getElementById('save-annotation').onclick = saveAnnotation;
    document.getElementById('cancel-annotation').onclick = () => { annotationPopup.remove(); stopSpeaking(); }; // Adicionado stopSpeaking
    document.querySelector('.close-popup-btn').onclick = () => { annotationPopup.remove(); stopSpeaking(); }; // Adicionado stopSpeaking
    
    // Adiciona evento para o botão de remover (se existir)
    const removeBtn = document.getElementById('remove-annotation');
    if (removeBtn) {
        removeBtn.onclick = removeAnnotation;
    }
    
    // Fecha o modal quando clicar fora dele
    document.addEventListener('click', function closeModalOnOutsideClick(e) {
        if (annotationPopup && !annotationPopup.contains(e.target)) {
            annotationPopup.remove();
            stopSpeaking(); // Adicionado stopSpeaking
            document.removeEventListener('click', closeModalOnOutsideClick);
        }
    });
    
    // Adiciona eventos aos botões de estilo rápido
    document.querySelectorAll('.quick-style-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const style = btn.dataset.style;
            const cssInput = document.getElementById('annotation-css');
            cssInput.value = style;
            cssInput.classList.add('filled');
            
            // Feedback visual - destaca o botão selecionado
            document.querySelectorAll('.quick-style-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            // Foca no campo CSS para mostrar que foi preenchido
            cssInput.focus();
            
            // Remove a seleção após 1 segundo
            setTimeout(() => {
                btn.classList.remove('selected');
            }, 1000);
            
            console.log('Estilo aplicado:', style); // Debug
        };
    });
    
    // Adiciona evento ao botão de IA
    const aiExplainBtn = document.getElementById('ai-explain-btn');
    if (aiExplainBtn) {
        aiExplainBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            generateAIExplanation();
        };
    }

    // Adiciona evento ao botão de controle de TTS
    const ttsControlButton = document.getElementById('tts-control-btn');
    if (ttsControlButton) {
        ttsControlButton.onclick = () => {
            const textToSpeak = annotationPopup.querySelector('.explanation-text').textContent;
            if (textToSpeak) {
                if (speechSynthesis.speaking) {
                    stopSpeaking();
                } else {
                    speakText(textToSpeak);
                }
            }
        };
    }

    // Adiciona evento ao botão "Criar Flashcard"
    const createFlashcardBtn = document.getElementById('create-flashcard-btn');
    if (createFlashcardBtn) {
        createFlashcardBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const selectedText = annotationPopup.querySelector('.selected-text-data').getAttribute('data-selected-text');
            const aiFlashcardContent = annotationPopup.querySelector('.explanation-text').getAttribute('data-ai-flashcard-content'); // Pega o conteúdo do flashcard já formatado
            createFlashcardFromAI(selectedText, aiFlashcardContent);
        };
    }
    
    // Foca no textarea
    document.getElementById('annotation-comment').focus();
    
    // Adiciona evento para detectar mudanças no campo CSS
    const cssInput = document.getElementById('annotation-css');
    cssInput.addEventListener('input', function() {
        if (this.value.trim()) {
            this.classList.add('filled');
        } else {
            this.classList.remove('filled');
        }
    });
    
    // Inicializa a funcionalidade de arrastar o modal
    initDragModal(annotationPopup);
}

/**
 * Inicializa a funcionalidade de arrastar o modal.
 * @param {HTMLElement} modal - O elemento do modal a ser arrastado.
 */
function initDragModal(modal) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    const header = modal.querySelector('.popup-header');
    
    // Função para iniciar o arraste
    function startDrag(e) {
        // Previne o arraste se clicar no botão de fechar
        if (e.target.classList.contains('close-popup-btn')) {
            return;
        }
        
        isDragging = true;
        modal.classList.add('dragging');
        
        // Captura a posição inicial do mouse
        startX = e.clientX;
        startY = e.clientY;
        
        // Captura a posição inicial do modal
        const rect = modal.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        // Previne seleção de texto durante o arraste
        e.preventDefault();
        
        // Adiciona listeners para o arraste
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        
        // Adiciona listener para tecla ESC
        document.addEventListener('keydown', handleEscape);
    }
    
    // Função para arrastar
    function drag(e) {
        if (!isDragging) return;
        
        // Calcula a nova posição
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;
        
        // Limita o modal dentro da viewport
        const rect = modal.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;
        
        const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
        const clampedTop = Math.max(0, Math.min(newTop, maxTop));
        
        // Aplica a nova posição
        modal.style.left = `${clampedLeft}px`;
        modal.style.top = `${clampedTop}px`;
    }
    
    // Função para parar o arraste
    function stopDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        modal.classList.remove('dragging');
        
        // Remove os listeners
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('keydown', handleEscape);
    }
    
    // Função para lidar com a tecla ESC
    function handleEscape(e) {
        if (e.key === 'Escape') {
            stopDrag();
        }
    }
    
    // Adiciona o listener para iniciar o arraste no header
    header.addEventListener('mousedown', startDrag);
}

/**
 * Salva a anotação no Supabase e aplica o estilo.
 */
async function saveAnnotation() {
    if (!currentSelection) return;

    const comment = document.getElementById('annotation-comment').value;
    const css = document.getElementById('annotation-css').value;
    const selectedText = currentSelection.toString();
    const isEditing = document.getElementById('remove-annotation') !== null; // Verifica se está editando

    if (!css.trim()) {
        alert('Por favor, selecione um estilo rápido ou digite CSS personalizado antes de salvar.');
        return;
    }

    try {
        if (isEditing) {
            // Modo de edição - atualiza a anotação existente
            const existingSpan = document.querySelector('.annotated-text[data-editing="true"]');
            if (existingSpan) {
                existingSpan.style.cssText = css;
                existingSpan.title = comment;
                existingSpan.removeAttribute('data-editing');
                
                // Feedback visual de sucesso
                existingSpan.style.animation = 'annotationSaved 0.5s ease-in-out';
                setTimeout(() => {
                    existingSpan.style.animation = '';
                }, 500);
            }
        } else {
            // Modo de criação - cria nova anotação
            const span = document.createElement('span');
            span.className = 'annotated-text';
            span.style.cssText = css;
            span.title = comment;
            span.dataset.annotationId = Date.now();
            
            // Método mais robusto para envolver o conteúdo
            span.appendChild(currentSelection.extractContents());
            currentSelection.insertNode(span);
            
            // 2. Prepara os dados para o Supabase
            const annotationData = {
                text_marcado: selectedText,
                text_comentario: comment,
                css: css,
                id_disciplina: window.appState.currentDisciplinaId,
            };

            // 3. Insere no Supabase
            const { error } = await supabase.from('css_coment_table').insert([annotationData]);

            if (error) {
                console.error('Erro ao salvar anotação:', error);
                alert('Falha ao salvar o flashcard: ' + error.message);
                // Reverter a alteração no DOM em caso de erro
                span.parentNode.insertBefore(document.createTextNode(selectedText), span);
                span.remove();
                return;
            }

            // 4. Feedback visual de sucesso
            span.style.animation = 'annotationSaved 0.5s ease-in-out';
            setTimeout(() => {
                span.style.animation = '';
            }, 500);
        }

    } catch (e) {
        console.error("Erro ao manipular o DOM com a seleção:", e);
        alert("Não foi possível aplicar a anotação. A seleção pode ser muito complexa (ex: cruzar múltiplos parágrafos). Tente selecionar um trecho menor e contínuo.");
    } finally {
        // 5. Limpa e remove o pop-up
        if (annotationPopup) annotationPopup.remove();
        currentSelection = null;
        window.getSelection().removeAllRanges();
    }
}

/**
 * Remove a anotação existente.
 */
async function removeAnnotation() {
    try {
        // Encontra o span da anotação existente
        const existingSpan = document.querySelector('.annotated-text[data-editing="true"]');
        if (!existingSpan) {
            alert("Nenhuma anotação encontrada para remover.");
            return;
        }

        const textContent = existingSpan.textContent;
        const disciplinaId = window.appState.currentDisciplinaId;

        // Remove do banco de dados
        const { error } = await supabase
            .from('css_coment_table')
            .delete()
            .eq('id_disciplina', disciplinaId)
            .eq('text_marcado', textContent);

        if (error) {
            console.error("Erro ao remover do banco de dados:", error);
            alert("Erro ao remover a anotação do banco de dados.");
            return;
        }

        // Remove o span e mantém apenas o texto
        const textNode = document.createTextNode(existingSpan.textContent);
        existingSpan.parentNode.replaceChild(textNode, existingSpan);
        
        // Feedback visual
        textNode.style.animation = 'annotationRemoved 0.5s ease-in-out';
        setTimeout(() => {
            textNode.style.animation = '';
        }, 500);

        // Feedback de sucesso
        alert("Anotação removida com sucesso!");
        
    } catch (e) {
        console.error("Erro ao remover anotação:", e);
        // Não mostra alerta genérico, pois o erro pode ser não crítico
    } finally {
        // Limpa e remove o pop-up
        if (annotationPopup) annotationPopup.remove();
        currentSelection = null;
        window.getSelection().removeAllRanges();
    }
}

/**
 * Carrega as anotações do Supabase e as aplica no conteúdo da página.
 * @param {number} disciplinaId - O ID da disciplina atual.
 */
async function loadAndApplyAnnotations(disciplinaId) {
    if (!disciplinaId) return;
    
    const { data, error } = await supabase
        .from('css_coment_table')
        .select('*')
        .eq('id_disciplina', disciplinaId);

    if (error || !Array.isArray(data)) {
        console.error('Erro ao carregar anotações:', error);
        return;
    }

    const contentView = document.getElementById('content-view');
    if (!contentView || data.length === 0) return;

    // Cria um elemento temporário para manipular o HTML de forma mais segura
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentView.innerHTML;

    data.forEach(annotation => {
        if (!annotation.text_marcado || !annotation.css) return;
        
        // Função para processar nós de texto recursivamente
        function processTextNodes(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const searchText = annotation.text_marcado;
                
                if (text.includes(searchText)) {
                    const parts = text.split(searchText);
                    const fragment = document.createDocumentFragment();
                    
                    parts.forEach((part, index) => {
                        if (part) {
                            fragment.appendChild(document.createTextNode(part));
                        }
                        if (index < parts.length - 1) {
                            const span = document.createElement('span');
                            span.className = 'annotated-text';
                            span.style.cssText = annotation.css;
                            span.title = annotation.text_comentario || '';
                            span.textContent = searchText;
                            fragment.appendChild(span);
                        }
                    });
                    
                    node.parentNode.replaceChild(fragment, node);
                    return true; // Indica que houve mudança
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Não processa elementos que já são anotações
                if (node.classList.contains('annotated-text')) {
                    return false;
                }
                
                // Processa filhos recursivamente
                const children = Array.from(node.childNodes);
                children.forEach(child => {
                    processTextNodes(child);
                });
            }
            return false;
        }
        
        // Processa todo o conteúdo
        processTextNodes(tempDiv);
    });

    contentView.innerHTML = tempDiv.innerHTML;
}

/**
 * Nova função: Chama a API do Gemini para gerar uma explicação DETALHADA.
 */
async function callAIDetailedExplanationAPI(text) {
    const geminiApiKey = 'AIzaSyAI-H7rdl-aPkxFJZn9FU6hrLlMKVG96ro';
    
    if (!geminiApiKey || geminiApiKey === 'SUA_CHAVE_DE_API_VAI_AQUI') {
        throw new Error("A chave da API não foi configurada.");
    }
    
    const prompt = `
Act as a friendly, native English-speaking language tutor. Your goal is to explain the following text or concept to a language learner in a simple, clear, and encouraging way.

1.  **Explain in Simple English:** Use common vocabulary and straightforward sentence structures. Avoid jargon or complex idioms.
2.  **Provide Context and Examples:** Give one or two clear examples of how the selected text is used in a real-life sentence.
3.  **Keep it Brief:** The explanation should be short and to the point.
4.  **Be Encouraging:** Maintain a positive and helpful tone.

Selected Text to Explain:
"""
${text}
"""

Your Explanation (in English):
`;

    try {
        const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return response.text();

    } catch (error) {
        console.error("Erro detalhado na chamada da API do Gemini para explicação:", error);
        throw new Error("Falha ao comunicar com a IA para explicação. Verifique sua chave de API e a conexão.");
    }
}

/**
 * Função existente: Chama a API do Gemini para gerar o conteúdo do flashcard no formato específico.
 */
async function callAIFlashcardAPI(text) {
    const geminiApiKey = 'AIzaSyAI-H7rdl-aPkxFJZn9FU6hrLlMKVG96ro';
    
    if (!geminiApiKey || geminiApiKey === 'SUA_CHAVE_DE_API_VAI_AQUI') {
        throw new Error("A chave da API não foi configurada.");
    }
    
    const prompt = `
Act as an EXCLUSIVE flashcard generator. Your ONLY output must be the flashcard in the format "Front || Back || Image Description".

STRICT RULES FOR EACH SECTION:
1.  **Front (Question)**: A simple, direct question. MAXIMUM 4 WORDS.
2.  **Back (Answer)**: A detailed and contextualized answer, yet concise for a flashcard. MÁXIMO 15 WORDS.
3.  **Image Description**: A VERY brief description of the image. MÁXIMO 5 WORDS. Describe something related to the context.

MANDATORY OUTPUT FORMAT:
"Front Question || Back Answer || Image Description"

DO NOT include:
-   Any introduction or greeting.
-   Any conclusion or farewell.
-   Any explanatory text about the flashcard.
-   Any text outside the "Front || Back || Image Description" format.

Example for the text "Photosynthesis is the process by which plants convert light into energy.":
Plants make energy? || Yes, through photosynthesis, converting sunlight into glucose and oxygen, essential for life on Earth. || Green leaf with sun.

Text to transform into Flashcard:
"""
${text}
"""

Flashcard:
`;

    try {
        const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        return response.text();

    } catch (error) {
        console.error("Erro detalhado na chamada da API do Gemini para flashcard:", error);
        throw new Error("Falha ao comunicar com a IA para flashcard. Verifique sua chave de API e a conexão.");
    }
}

/**
 * Gera explicação da IA para o texto selecionado e prepara o flashcard.
 */
async function generateAIExplanation() {
    // Obtém o texto selecionado armazenado no modal
    const selectedTextData = document.querySelector('.selected-text-data');
    const selectedText = selectedTextData ? selectedTextData.getAttribute('data-selected-text') : '';
    
    const aiExplanationDiv = document.querySelector('.ai-explanation');
    const explanationText = aiExplanationDiv.querySelector('.explanation-text');
    const aiExplainBtn = document.getElementById('ai-explain-btn');
    const createFlashcardBtn = document.getElementById('create-flashcard-btn');
    
    if (!selectedText) {
        alert('Por favor, selecione um texto primeiro.');
        return;
    }
    
    // Mostra loading para a explicação detalhada
    aiExplanationDiv.classList.add('show');
    explanationText.innerHTML = '<div class="loading">Gerando explicação detalhada...</div>';
    aiExplainBtn.disabled = true;
    if (createFlashcardBtn) createFlashcardBtn.style.display = 'none'; // Esconde enquanto carrega
    
    try {
        // 1. Chama a API para gerar a explicação DETALHADA
        const detailedExplanation = await callAIDetailedExplanationAPI(selectedText);
        explanationText.innerHTML = detailedExplanation; // Exibe a explicação detalhada
        
        // 2. Agora, chama a API para gerar o conteúdo do flashcard (conciso)
        explanationText.innerHTML += '<div class="loading" style="margin-top: 10px;">Preparando flashcard...</div>'; // Mensagem de carregamento para o flashcard
        const flashcardContent = await callAIFlashcardAPI(selectedText);
        
        // Armazena o conteúdo do flashcard em um atributo de dados para uso posterior
        explanationText.setAttribute('data-ai-flashcard-content', flashcardContent);
        
        // Remove a mensagem de carregamento do flashcard
        const loadingDiv = explanationText.querySelector('.loading');
        if (loadingDiv) loadingDiv.remove();

        // Inicia a leitura automática com o texto puro da explicação detalhada
        speakText(detailedExplanation);

        // Mostra e habilita o botão de criar flashcard
        if (createFlashcardBtn) createFlashcardBtn.style.display = 'inline-flex';
    } catch (error) {
        console.error('Erro ao gerar explicação ou flashcard:', error);
        explanationText.innerHTML = `<p style="color: #dc3545;">Erro: ${error.message}</p>`;
        if (createFlashcardBtn) createFlashcardBtn.style.display = 'none'; // Mantém escondido em caso de erro
    } finally {
        aiExplainBtn.disabled = false;
    }
}

/**
 * Cria um flashcard a partir do texto selecionado e da explicação da IA.
 * Abre um modal para o usuário confirmar e editar antes de salvar.
 * @param {string} selectedText - O texto selecionado pelo usuário (frente do flashcard).
 * @param {string} aiFlashcardContent - O conteúdo do flashcard já formatado pela IA.
 */
async function createFlashcardFromAI(selectedText, aiFlashcardContent) {
    const disciplinaId = window.appState.currentDisciplinaId;
    const userId = localStorage.getItem('user_id');

    if (!disciplinaId || !userId) {
        alert('Erro: ID da disciplina ou do usuário não encontrado. Por favor, selecione uma disciplina.');
        return;
    }

    // aiFlashcardContent já contém o conteúdo formatado "Frente || Verso || Descrição da Imagem"
    const defaultCardContent = aiFlashcardContent;

    createCrudModal({
        title: 'Confirmar Flashcard',
        formFields: [
            { name: 'card', type: 'textarea', placeholder: 'Frente || Verso || Descrição da Imagem' }
        ],
        initialData: { card: defaultCardContent },
        onSubmit: async (data) => {
            if (!data.card.trim()) {
                alert('O conteúdo do flashcard não pode estar vazio.');
                return;
            }
            const { error } = await supabase.from('flashcard').insert([{
                id_disciplina: disciplinaId,
                id_usuario: userId,
                card: data.card.trim(),
                data_cadastro: new Date().toISOString() // Set data_cadastro on creation
            }]);

            if (error) {
                console.error('Erro ao salvar flashcard:', error);
                alert('Falha ao salvar o flashcard: ' + error.message);
            } else {
                alert('Flashcard salvo com sucesso!');
                if (window.appState.currentContentType === 'flashcard') {
                    fetchContent('flashcard', disciplinaId);
                }
            }
        }
    });
}