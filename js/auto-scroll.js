// --- FUNCIONALIDADE DO BOTÃO DE SCROLL AUTOMÁTICO ---
(function() {
    let scrollTimeout;
    let isScrolling = false;
    let lastScrollTop = 0;
    let scrollDirection = 'down';
    
    // Função para criar o botão se não existir
    function createAutoScrollButton() {
        if (document.getElementById('auto-scroll-btn')) return;
        
        const button = document.createElement('button');
        button.id = 'auto-scroll-btn';
        button.title = 'Scroll Automático';
        button.className = 'fab hidden';
        button.style.cssText = 'bottom: 220px; right: 24px; position: fixed; z-index: 1000;';
        
        button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 10L12 15L17 10" stroke="#ff0000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
        `;
        
        document.body.appendChild(button);
        return button;
    }
    
    const autoScrollBtn = createAutoScrollButton();
    
    if (!autoScrollBtn) return;
    
    // Função para mostrar/esconder o botão
    function toggleScrollButton(show) {
        if (show) {
            autoScrollBtn.classList.remove('hidden');
            autoScrollBtn.classList.add('show');
        } else {
            autoScrollBtn.classList.remove('show');
            setTimeout(() => {
                if (!autoScrollBtn.classList.contains('show')) {
                    autoScrollBtn.classList.add('hidden');
                }
            }, 300);
        }
    }
    
    // Função para detectar direção do scroll
    function updateScrollDirection() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        scrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
        lastScrollTop = scrollTop;
        
        // Atualizar ícone do botão
        if (scrollDirection === 'up') {
            autoScrollBtn.classList.add('scrolling-up');
        } else {
            autoScrollBtn.classList.remove('scrolling-up');
        }
    }
    
    // Função para scroll automático
    function autoScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        
        if (scrollDirection === 'down') {
            // Scroll completo para baixo até o final da página
            window.scrollTo({
                top: documentHeight - windowHeight,
                behavior: 'smooth'
            });
        } else {
            // Scroll completo para cima até o topo da página
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }
    
    // Event listener para scroll
    window.addEventListener('scroll', function() {
        if (!isScrolling) {
            isScrolling = true;
            toggleScrollButton(true);
            updateScrollDirection();
        }
        
        // Limpar timeout anterior
        clearTimeout(scrollTimeout);
        
        // Definir novo timeout para esconder o botão
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            toggleScrollButton(false);
        }, 1500); // Esconder após 1.5 segundos sem scroll
    });
    
    // Event listener para clique no botão
    autoScrollBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        autoScroll();
    });
    
    // Event listener para touch (mobile)
    autoScrollBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        autoScroll();
    });
    
    // Ajustar posição do botão baseado no tamanho da tela
    function adjustButtonPosition() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (width <= 320) {
            autoScrollBtn.style.bottom = '164px';
            autoScrollBtn.style.right = '8px';
            autoScrollBtn.style.width = '44px';
            autoScrollBtn.style.height = '44px';
        } else if (width <= 480) {
            autoScrollBtn.style.bottom = '180px';
            autoScrollBtn.style.right = '12px';
            autoScrollBtn.style.width = '44px';
            autoScrollBtn.style.height = '44px';
        } else if (width <= 768) {
            autoScrollBtn.style.bottom = '200px';
            autoScrollBtn.style.right = '16px';
            autoScrollBtn.style.width = '48px';
            autoScrollBtn.style.height = '48px';
        } else {
            autoScrollBtn.style.bottom = '220px';
            autoScrollBtn.style.right = '24px';
            autoScrollBtn.style.width = '52px';
            autoScrollBtn.style.height = '52px';
        }
    }
    
    // Ajustar posição inicial e em mudanças de tamanho
    adjustButtonPosition();
    window.addEventListener('resize', adjustButtonPosition);
})(); 