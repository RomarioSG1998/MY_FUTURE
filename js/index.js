// Aguarda o DOM estar completamente carregado para executar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO INICIAL E SUPABASE ---
    const SUPABASE_URL = 'https://zzrylgsjksrjotgcwavt.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6cnlsZ3Nqa3Nyam90Z2N3YXZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4Mjc0OTYsImV4cCI6MjA2NDQwMzQ5Nn0.caBlCmOqKonuxTPacPIHH1FeVZFr8AJKwpz_v1Q3BwM';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
        menuTextBtn: document.getElementById('menu-text-btn'),
        menuVideoBtn: document.getElementById('menu-video-btn'),
        menuPracticeBtn: document.getElementById('menu-practice-btn'),
        disciplinaModal: document.getElementById('disciplina-modal'),
        closeDisciplinaModalBtn: document.getElementById('close-modal-disciplina'),
        pizzaContainer: document.getElementById('pizza-container'),
        crudModalRoot: document.getElementById('crud-modal-root'),
    };

    // --- GERENCIAMENTO DE ESTADO ---
    // Centraliza o estado da aplicação em um único objeto.
    const appState = {
        isEditMode: false,
        currentDisciplinaId: null,
        currentContent: [],
        currentContentType: 'text', // 'text', 'video', ou 'practice'
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

        if (!currentContent || currentContent.length === 0) {
            elements.contentView.innerHTML = `
                <button onclick="window.goBackToDashboard()" class="close-btn" style="color:#222; top:12px; right:12px;">&times;</button>
                <div style="color:var(--danger-color); text-align:center; margin-bottom:16px;">
                    Ainda não há conteúdo de ${currentContentType} para esta disciplina.
                </div>
                <div style="text-align:center;">
                    <button class="add-new-content-btn">➕ Adicionar ${currentContentType}</button>
                </div>`;
            elements.contentView.querySelector('.add-new-content-btn').onclick = () => handleCreate(currentContentType, currentDisciplinaId);
            return;
        }

        let contentHtml = `<button onclick="window.goBackToDashboard()" class="close-btn" style="color:#222; top:12px; right:12px;">&times;</button>`;
        
        currentContent.forEach(item => {
            let itemHtml = '';
            // Constrói o HTML para cada tipo de conteúdo
            switch(currentContentType) {
                case 'text':
                    itemHtml = `
                        ${item.title ? `<span class="registro-title">${item.title}</span>` : ''}
                        ${item.complete_text ? `<span class="registro-text">${item.complete_text}</span>` : ''}
                        ${item.image ? `<img src="${item.image}" alt="Imagem do registro" class="registro-img">` : ''}
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
                        ${item.link ? `<a href="${item.link}" target="_blank">🔗 Acessar Link</a>` : ''}
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

        // Adiciona eventos aos botões de CRUD
        if (isEditMode) {
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
    
    // **CORRIGIDO** Renderiza o embed do YouTube de forma correta e segura
    function renderVideoEmbed(link) {
        // Regex mais robusta para pegar ID de vários formatos de URL do YouTube
        const ytMatch = link.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytMatch && ytMatch[1]) {
            const videoId = ytMatch[1];
            return `<div class="video-responsive"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`;
        }
        // Se não for um link do YouTube, apenas mostra o link
        return `<a href="${link}" target="_blank">${link}</a>`;
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
        let contentHtml = `<button onclick="window.goBackToDashboard()" class="close-btn" style="color:#222; top:12px; right:12px;">&times;</button>`;
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
                const ytMatch = item.link_or_text && item.link_or_text.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                if (ytMatch && ytMatch[1]) {
                    itemHtml = `
                        ${item.title ? `<span class='registro-title'>${item.title}</span>` : ''}
                        <div class='video-responsive'><iframe src='https://www.youtube.com/embed/${ytMatch[1]}' allowfullscreen></iframe></div>
                    `;
                } else {
                    itemHtml = `
                        ${item.title ? `<span class='registro-title'>${item.title}</span>` : ''}
                        <a href='${item.link_or_text}' target='_blank'>${item.link_or_text}</a>
                    `;
                }
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
        createCrudModal({
            title: 'Novo Conteúdo Extra',
            formFields: [
                { name: 'tipo_arquivo', type: 'select', options: [
                    { value: 'Texto', label: 'Texto' },
                    { value: 'Vídeo', label: 'Vídeo' },
                    { value: 'Imagem', label: 'Imagem' }
                ], placeholder: 'Tipo do Arquivo' },
                { name: 'title', type: 'text', placeholder: 'Título' },
                { name: 'link_or_text', type: 'text', placeholder: 'Link, texto ou URL da imagem' }
            ],
            onSubmit: async (data) => {
                await supabase.from('extra_content').insert([{ ...data, id_disciplina: idDisciplina }]);
                appState.currentContentType = 'extra';
                await fetchExtraContent(idDisciplina);
            }
        });
    }

    async function handleEditExtraContent(id) {
        const { data: item, error } = await supabase.from('extra_content').select('*').eq('id', id).single();
        if (error) return alert('Erro ao buscar item para edição.');
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
            onSubmit: async (data) => {
                await supabase.from('extra_content').update(data).eq('id', id);
                appState.currentContentType = 'extra';
                await fetchExtraContent(item.id_disciplina);
            }
        });
    }

    async function handleDeleteExtraContent(id, idDisciplina) {
        if (confirm('Tem certeza que deseja excluir este conteúdo extra?')) {
            await supabase.from('extra_content').delete().eq('id', id);
            appState.currentContentType = 'extra';
            await fetchExtraContent(idDisciplina);
        }
    }

    // --- LÓGICA DE DADOS (FETCH & CRUD) ---
    
    // Carrega os dados do dashboard inicial
    async function loadDashboard() {
        const { data: disciplinas, error } = await supabase.from('disciplina').select('*');
        if (error || !disciplinas) {
            elements.dashboardDisciplinas.innerHTML = '<div style="color:var(--danger-color);">Erro ao carregar disciplinas.</div>';
            return;
        }

        // Filtra apenas as disciplinas com situation === 'estudando' (case-insensitive)
        const estudando = disciplinas.filter(d => (d.situation || '').toLowerCase() === 'estudando');

        if (estudando.length === 0) {
            elements.dashboardDisciplinas.innerHTML = '<div>Nenhuma disciplina em estudo.</div>';
        } else {
            elements.dashboardDisciplinas.innerHTML = estudando.map(d => {
                const inicio = new Date(d.date_inicio);
                const fim = new Date(d.date_fim);
                const hoje = new Date();
                const totalDias = Math.max(1, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)));
                const diasEstudados = Math.max(0, Math.min(totalDias, Math.ceil((hoje - inicio) / (1000 * 60 * 60 * 24))));
                const percent = Math.round((diasEstudados / totalDias) * 100);
                return `
                    <div class="card-disciplina" data-id="${d.id}">
                        <div class="card-disciplina-title">${d.nome}</div>
                        <div class="card-disciplina-date">${d.date_inicio || ''} até ${d.date_fim || ''}</div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fg" style="width:${percent}%;"></div>
                        </div>
                        <div class="progress-label">${diasEstudados}/${totalDias} dias</div>
                        <div class="card-disciplina-situation">${d.situation || ''}</div>
                    </div>
                `;
            }).join('');
            elements.dashboardDisciplinas.querySelectorAll('.card-disciplina').forEach(card => {
                card.addEventListener('click', () => {
                    fetchContent('text', card.dataset.id);
                });
            });
        }
        
        // Carrega contagens totais
        const [textos, videos, practices] = await Promise.all([
            supabase.from('text').select('id', { count: 'exact', head: true }),
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
        
        const { data, error } = await supabase.from(type).select('*').eq('id_disciplina', disciplinaId);

        if (error) {
            console.error(`Erro ao buscar ${type}:`, error);
            appState.currentContent = [];
        } else {
            appState.currentContent = data;
        }
        
        renderContent();
        elements.extraContentMenu.classList.add('hidden');
    }

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
        elements.disciplinaModal.classList.remove('hidden');
        renderPizzaMenu();
    }

    async function renderPizzaMenu() {
        elements.pizzaContainer.innerHTML = 'Carregando...';
        const { data, error } = await supabase.from('disciplina').select('*');
        if (error || !data || data.length === 0) {
            elements.pizzaContainer.innerHTML = '<div style="color:red; text-align:center;">Nenhuma disciplina encontrada.</div>';
            return;
        }
        // Filtra apenas as disciplinas com situation === 'estudando' (case-insensitive)
        const estudando = data.filter(d => (d.situation || '').toLowerCase() === 'estudando');
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
                fetchContent('text', path.dataset.id);
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
        if (error || !data) {
            elements.pizzaContainer.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar disciplinas.</div>';
            return;
        }
        if (data.length === 0) {
            elements.pizzaContainer.innerHTML = '<div style="text-align:center;">Nenhuma disciplina encontrada.</div>';
        } else {
            // Ordena: estudando no topo
            data.sort((a, b) => {
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
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(d => `
                            <tr${((d.situation || '').toLowerCase() !== 'estudando') ? ' style="background:#d4edda;"' : ''}>
                                <td>${d.id}</td>
                                <td>${d.nome}</td>
                                <td>${d.date_inicio || ''}</td>
                                <td>${d.situation || ''}</td>
                                <td>${d.date_fim || ''}</td>
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

    // --- LÓGICA DE CRUD (HANDLERS) ---
    
    // **REATORADO** Função genérica para criar modais de CRUD
    function createCrudModal({ title, formFields, onSubmit, initialData = {} }) {
        const fieldsHtml = formFields.map(field => {
            const value = initialData[field.name] || '';
            switch(field.type) {
                case 'textarea':
                    return `<textarea name="${field.name}" placeholder="${field.placeholder}">${value}</textarea>`;
                case 'select':
                    const optionsHtml = field.options.map(opt => 
                        `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
                    ).join('');
                    return `<select name="${field.name}">${optionsHtml}</select>`;
                default:
                    return `<input type="${field.type}" name="${field.name}" placeholder="${field.placeholder}" value="${value}">`;
            }
        }).join('');

        const modalHtml = `
            <div class="modal-overlay crud-modal">
                <div class="modal-content">
                    <button class="close-btn">&times;</button>
                    <h3>${title}</h3>
                    <form>
                        ${fieldsHtml}
                        <button type="submit">Salvar</button>
                    </form>
                </div>
            </div>`;

        elements.crudModalRoot.innerHTML = modalHtml;
        const form = elements.crudModalRoot.querySelector('form');
        const modalOverlay = elements.crudModalRoot.querySelector('.modal-overlay');

        modalOverlay.querySelector('.close-btn').onclick = () => {
            elements.crudModalRoot.innerHTML = '';
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            await onSubmit(data);
            elements.crudModalRoot.innerHTML = '';
            // Remover chamada para fetchContent(appState.currentContentType, appState.currentDisciplinaId);
            // O onSubmit de cada CRUD já faz o refresh correto
        };
    }

    // **REATORADO** Funções que disparam o modal de CRUD
    async function handleCreate(type, disciplinaId) {
        const config = getCrudConfig(type);
        createCrudModal({
            title: `Novo ${config.label}`,
            formFields: config.fields,
            onSubmit: async (data) => {
                await supabase.from(type).insert([{ ...data, id_disciplina: disciplinaId }]);
            }
        });
    }
    
    async function handleEdit(type, id) {
        const { data: itemData, error } = await supabase.from(type).select('*').eq('id', id).single();
        if (error) { console.error("Erro ao buscar item para edição", error); return; }

        const config = getCrudConfig(type);
        createCrudModal({
            title: `Editar ${config.label}`,
            formFields: config.fields,
            initialData: itemData,
            onSubmit: async (data) => {
                await supabase.from(type).update(data).eq('id', id);
            }
        });
    }
    
    async function handleDelete(type, id) {
        if (confirm(`Tem certeza que deseja excluir este item?`)) {
            await supabase.from(type).delete().eq('id', id);
            fetchContent(appState.currentContentType, appState.currentDisciplinaId);
        }
    }
    
    // Configurações para cada tipo de CRUD
    function getCrudConfig(type) {
        const configs = {
            text: {
                label: 'Texto',
                fields: [
                    { name: 'title', type: 'text', placeholder: 'Título' },
                    { name: 'complete_text', type: 'textarea', placeholder: 'Texto completo' },
                    { name: 'image', type: 'text', placeholder: 'URL da Imagem (opcional)' },
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
            }
        };
        return configs[type];
    }

    function openDisciplinaCrudModal(mode, id = null) {
        const fields = [
            { name: 'nome', type: 'text', placeholder: 'Nome da disciplina' },
            { name: 'date_inicio', type: 'date', placeholder: 'Data de início' },
            { name: 'situation', type: 'select', options: [
                { value: 'estudando', label: 'Estudando' },
                { value: 'finalizado', label: 'Finalizado' }
            ], placeholder: 'Situação' },
            { name: 'date_fim', type: 'date', placeholder: 'Data de fim' }
        ];
        if (mode === 'create') {
            createCrudModal({
                title: 'Nova Disciplina',
                formFields: fields,
                onSubmit: async (data) => {
                    await supabase.from('disciplina').insert([data]);
                    // Opcional: atualizar a lista de disciplinas ou dar feedback ao usuário
                }
            });
        } else if (mode === 'edit' && id) {
            supabase.from('disciplina').select('*').eq('id', id).single().then(({ data: disciplina }) => {
                createCrudModal({
                    title: 'Editar Disciplina',
                    formFields: fields,
                    initialData: disciplina,
                    onSubmit: async (data) => {
                        await supabase.from('disciplina').update(data).eq('id', id);
                        // Opcional: atualizar a lista de disciplinas ou dar feedback ao usuário
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

    elements.menuTextBtn.onclick = () => fetchContent('text', appState.currentDisciplinaId);
    elements.menuVideoBtn.onclick = () => fetchContent('video', appState.currentDisciplinaId);
    elements.menuPracticeBtn.onclick = () => fetchContent('practice', appState.currentDisciplinaId);

    // Adiciona função ao escopo global para ser chamada pelo HTML
    window.goBackToDashboard = showDashboard;

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    protectPage();
    loadDashboard();

    // Função para popular a tabela de disciplinas
    async function carregarDisciplinas() {
        const { data: disciplinas, error } = await supabase.from('disciplina').select('*');
        const tbody = document.querySelector("#disciplinas-table tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        if (error || !disciplinas || disciplinas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#b00;">Nenhuma disciplina encontrada.</td></tr>';
            return;
        }
        // Filtra apenas as disciplinas com situation === 'estudando' (case-insensitive)
        const estudando = disciplinas.filter(d => (d.situation || '').toLowerCase() === 'estudando');
        if (estudando.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#b00;">Nenhuma disciplina em estudo.</td></tr>';
            return;
        }
        estudando.forEach(d => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${d.id}</td>
                <td>${d.nome} <button class="edit-dashboard-disciplina-btn" data-id="${d.id}" title="Editar" style="background:none;border:none;cursor:pointer;font-size:1em;">✏️</button></td>
                <td>${d.date_inicio || ''}</td>
                <td>${d.situation || ''}</td>
                <td>${d.date_fim || ''}</td>
            `;
            tbody.appendChild(tr);
        });
        // Adiciona evento aos botões de editar
        tbody.querySelectorAll('.edit-dashboard-disciplina-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDisciplinaCrudModal('edit', btn.dataset.id);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", carregarDisciplinas);

    // Evento para abrir o modal de disciplinas ao clicar no botão +
    const addDisciplinaBtn = document.getElementById('add-disciplina-btn');
    if (addDisciplinaBtn) {
        addDisciplinaBtn.addEventListener('click', () => {
            elements.crudModalRoot.innerHTML = '';
            // Fecha o modal pizza, se estiver aberto
            elements.disciplinaModal.classList.add('hidden');
            openDisciplinaCrudModal('create');
        });
    }

    // Recarregar a página ao clicar em 'Olá, Usuário'
    const headerUserName = document.getElementById('header-user-name');
    if (headerUserName) {
        headerUserName.addEventListener('click', () => {
            window.location.reload();
        });
    }

    async function deleteDisciplina(id) {
        if (confirm('Tem certeza que deseja excluir esta disciplina?')) {
            await supabase.from('disciplina').delete().eq('id', id);
            renderDisciplinaListInModal();
        }
    }

    // Evento do menu lateral para Conteúdo Extra
    const menuExtraBtn = document.getElementById('menu-extra-btn');
    if (menuExtraBtn) {
        menuExtraBtn.onclick = async () => {
            appState.currentContentType = 'extra';
            await fetchExtraContent(appState.currentDisciplinaId);
        };
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
});