// ===== MELHORIAS PARA MOBILE =====
// Este arquivo contém funcionalidades específicas para melhorar a experiência mobile

class MobileEnhancements {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this.isScrolling = false;
        
        this.init();
    }
    
    init() {
        this.setupTouchGestures();
        this.setupScrollOptimizations();
        this.setupFormEnhancements();
        this.setupModalImprovements();
        this.setupPerformanceOptimizations();
    }
    
    // Configurar gestos de toque
    setupTouchGestures() {
        // Detectar gestos de swipe para navegação
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
            this.isScrolling = false;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.isScrolling) {
                const touchY = e.changedTouches[0].screenY;
                const touchX = e.changedTouches[0].screenX;
                
                // Detectar se é scroll vertical
                if (Math.abs(touchY - this.touchStartY) > Math.abs(touchX - this.touchStartX)) {
                    this.isScrolling = true;
                }
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (this.isScrolling) return;
            
            this.touchEndX = e.changedTouches[0].screenX;
            this.touchEndY = e.changedTouches[0].screenY;
            
            this.handleSwipe();
        }, { passive: true });
    }
    
    // Lidar com gestos de swipe
    handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        
        // Verificar se é um swipe horizontal significativo
        if (Math.abs(deltaX) > this.minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                // Swipe para direita - voltar ao dashboard
                this.handleSwipeRight();
            } else {
                // Swipe para esquerda - abrir menu de conteúdo extra
                this.handleSwipeLeft();
            }
        }
    }
    
    // Swipe para direita - voltar ao dashboard
    handleSwipeRight() {
        const contentView = document.getElementById('content-view');
        if (contentView && !contentView.classList.contains('hidden')) {
            // Mostrar feedback visual
            this.showSwipeFeedback('Voltando ao dashboard...');
            
            // Voltar ao dashboard
            setTimeout(() => {
                if (window.showDashboard) {
                    window.showDashboard();
                }
            }, 300);
        }
    }
    
    // Swipe para esquerda - abrir menu de conteúdo extra
    handleSwipeLeft() {
        const extraContentBtn = document.getElementById('extra-content-btn');
        if (extraContentBtn && !extraContentBtn.classList.contains('hidden')) {
            // Mostrar feedback visual
            this.showSwipeFeedback('Abrindo menu...');
            
            // Simular clique no botão
            setTimeout(() => {
                extraContentBtn.click();
            }, 300);
        }
    }
    
    // Mostrar feedback visual para gestos
    showSwipeFeedback(message) {
        // Criar elemento de feedback
        const feedback = document.createElement('div');
        feedback.className = 'swipe-feedback';
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        document.body.appendChild(feedback);
        
        // Animar entrada
        setTimeout(() => {
            feedback.style.opacity = '1';
        }, 10);
        
        // Remover após 1.5 segundos
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 1500);
    }
    
    // Otimizações de scroll
    setupScrollOptimizations() {
        // Melhorar performance de scroll
        let ticking = false;
        
        const updateScroll = () => {
            // Otimizações de scroll podem ser adicionadas aqui
            ticking = false;
        };
        
        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateScroll);
                ticking = true;
            }
        };
        
        // Usar passive listeners para melhor performance
        document.addEventListener('scroll', requestTick, { passive: true });
        
        // Melhorar scroll em containers específicos
        const scrollContainers = document.querySelectorAll('.modal-content, #dashboard, #content-view');
        scrollContainers.forEach(container => {
            container.style.webkitOverflowScrolling = 'touch';
        });
    }
    
    // Melhorias em formulários
    setupFormEnhancements() {
        // Prevenir zoom em inputs no iOS
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                // Scroll suave para o input
                setTimeout(() => {
                    input.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 300);
            });
            
            // Melhorar feedback visual
            input.addEventListener('input', () => {
                this.addInputFeedback(input);
            });
        });
    }
    
    // Adicionar feedback visual aos inputs
    addInputFeedback(input) {
        // Remover feedback anterior
        input.classList.remove('input-feedback');
        
        // Adicionar feedback
        input.classList.add('input-feedback');
        
        // Remover após animação
        setTimeout(() => {
            input.classList.remove('input-feedback');
        }, 200);
    }
    
    // Melhorias em modais
    setupModalImprovements() {
        // Fechar modal com gesto de swipe para baixo
        document.addEventListener('touchstart', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                this.setupModalSwipe(modal, e);
            }
        });
        
        // Melhorar acessibilidade dos modais
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            // Focar no primeiro input quando modal abrir
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => {
                    firstInput.focus();
                }, 100);
            }
        });
    }
    
    // Configurar swipe para fechar modal
    setupModalSwipe(modal, startEvent) {
        let startY = startEvent.touches[0].clientY;
        let currentY = startY;
        let isDragging = false;
        
        const handleTouchMove = (e) => {
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            if (deltaY > 20 && !isDragging) {
                isDragging = true;
                modal.style.transition = 'none';
            }
            
            if (isDragging && deltaY > 0) {
                modal.style.transform = `translateY(${deltaY}px)`;
                modal.style.opacity = Math.max(0.3, 1 - (deltaY / 300));
            }
        };
        
        const handleTouchEnd = () => {
            const deltaY = currentY - startY;
            
            if (isDragging && deltaY > 100) {
                // Fechar modal
                modal.style.transition = 'all 0.3s ease';
                modal.style.transform = 'translateY(100%)';
                modal.style.opacity = '0';
                
                setTimeout(() => {
                    const closeBtn = modal.querySelector('.close-btn');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                }, 300);
            } else {
                // Restaurar modal
                modal.style.transition = 'all 0.3s ease';
                modal.style.transform = 'translateY(0)';
                modal.style.opacity = '1';
            }
            
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
        
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);
    }
    
    // Otimizações de performance
    setupPerformanceOptimizations() {
        // Lazy loading para imagens
        this.setupLazyLoading();
        
        // Debounce para eventos de resize
        this.setupResizeDebounce();
        
        // Otimizar animações
        this.optimizeAnimations();
    }
    
    // Configurar lazy loading
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }
    
    // Debounce para eventos de resize
    setupResizeDebounce() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }
    
    // Lidar com mudanças de tamanho de tela
    handleResize() {
        // Recalcular posições dos FABs se necessário
        this.updateFABPositions();
        
        // Ajustar layout se necessário
        this.adjustLayout();
    }
    
    // Atualizar posições dos FABs
    updateFABPositions() {
        const fabs = document.querySelectorAll('.fab');
        const isLandscape = window.innerWidth > window.innerHeight;
        
        fabs.forEach((fab, index) => {
            if (isLandscape && window.innerWidth < 768) {
                // Ajustar posições para landscape em mobile
                const bottom = 8 + (index * 56);
                fab.style.bottom = `${bottom}px`;
                fab.style.right = '8px';
            }
        });
    }
    
    // Ajustar layout
    adjustLayout() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Ajustes específicos para mobile
            document.body.classList.add('mobile-layout');
        } else {
            document.body.classList.remove('mobile-layout');
        }
    }
    
    // Otimizar animações
    optimizeAnimations() {
        // Usar transform e opacity para animações mais suaves
        const animatedElements = document.querySelectorAll('.fab, .card-disciplina, .modal-content');
        
        animatedElements.forEach(element => {
            element.style.willChange = 'transform, opacity';
        });
    }
    
    // Método para mostrar loading
    showLoading(message = 'Carregando...') {
        const loading = document.createElement('div');
        loading.className = 'mobile-loading';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
        `;
        
        document.body.appendChild(loading);
        return loading;
    }
    
    // Método para esconder loading
    hideLoading(loadingElement) {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                loadingElement.parentNode.removeChild(loadingElement);
            }, 300);
        }
    }
}

// Inicializar melhorias mobile quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se é um dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
    
    if (isMobile) {
        window.mobileEnhancements = new MobileEnhancements();
        
        // Adicionar classe ao body para estilos específicos
        document.body.classList.add('mobile-device');
        
        // Configurar viewport para melhor experiência
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
    }
});

// Exportar para uso global
window.MobileEnhancements = MobileEnhancements; 