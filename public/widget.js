(function() {
    // 1. Get widget code from the script's own URL (e.g., widget.js?id=CODE)
    const script = document.currentScript || (function() {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();
    
    const scriptUrl = new URL(script.src);
    const widgetCode = scriptUrl.searchParams.get('id');
    const scriptOrigin = scriptUrl.origin;

    if (!widgetCode) {
        console.warn('TimeHub Widget: Missing id parameter. Please use widget.js?id=YOUR_CODE');
        return;
    }

    const apiUrl = scriptOrigin.includes('localhost:3000') 
        ? 'http://localhost:8080' 
        : scriptOrigin;

    let overlay = null;

    window.TimeHub = {
        open: function() {
            if (overlay) return;
            overlay = document.createElement('div');
            overlay.className = 'timehub-overlay';
            const url = `${scriptOrigin}/widget/${widgetCode}`;
            overlay.innerHTML = `
                <div class="timehub-modal">
                    <button class="timehub-close">&times;</button>
                    <iframe src="${url}" class="timehub-iframe" allow="payment"></iframe>
                </div>
            `;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);
            overlay.querySelector('.timehub-close').onclick = () => {
                overlay.classList.remove('active');
                setTimeout(() => { overlay.remove(); overlay = null; }, 300);
            };
            overlay.onclick = (e) => { if (e.target === overlay) overlay.querySelector('.timehub-close').click(); };
        }
    };

    const injectStyles = (accentColor, textColor, position) => {
        let positionStyles = 'bottom: 24px; right: 24px;';
        if (position === 'bottom-left') positionStyles = 'bottom: 24px; left: 24px;';
        else if (position === 'top-right') positionStyles = 'top: 24px; right: 24px;';
        else if (position === 'top-left') positionStyles = 'top: 24px; left: 24px;';

        const styles = `
            .timehub-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 999999; opacity: 0; transition: opacity 0.3s ease; backdrop-filter: blur(4px); }
            .timehub-overlay.active { opacity: 1; }
            .timehub-modal { position: relative; width: 100%; max-width: 450px; height: 90vh; max-height: 800px; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2); transform: translateY(20px); transition: transform 0.3s ease; }
            .timehub-overlay.active .timehub-modal { transform: translateY(0); }
            .timehub-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; background: rgba(0, 0, 0, 0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; font-size: 20px; color: #666; }
            .timehub-iframe { width: 100%; height: 100%; border: none; }
            .timehub-floating-btn { 
                position: fixed; ${positionStyles}
                width: 100px; height: 100px; border-radius: 50%; 
                background: ${accentColor}; color: ${textColor}; border: none; 
                cursor: pointer; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); 
                z-index: 999998; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                display: flex; align-items: center; justify-content: center; 
                text-align: center; padding: 10px; line-height: 1.2;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 14px; font-weight: bold; word-wrap: break-word;
            }
            .timehub-floating-btn:hover { transform: translateY(-4px) scale(1.05); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25); }
            
            /* Animations */
            @keyframes th-pulse { 0% { box-shadow: 0 0 0 0 ${accentColor}66; } 70% { box-shadow: 0 0 0 20px ${accentColor}00; } 100% { box-shadow: 0 0 0 0 ${accentColor}00; } }
            .th-pulse { animation: th-pulse 2s infinite; }
            
            @keyframes th-shake { 0%, 100% { transform: rotate(0); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-5deg); } 20%, 40%, 60%, 80% { transform: rotate(5deg); } }
            .th-shake { animation: th-shake 0.8s cubic-bezier(.36,.07,.19,.97) both infinite; }
            
            @keyframes th-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            .th-float { animation: th-float 3s ease-in-out infinite; }
            
            @keyframes th-glow { 0%, 100% { box-shadow: 0 8px 24px ${accentColor}66; } 50% { box-shadow: 0 8px 40px ${accentColor}; } }
            .th-glow { animation: th-glow 2s ease-in-out infinite; }

            @media (max-width: 480px) { .timehub-modal { width: 100%; height: 100%; max-height: 100%; border-radius: 0; } }
        `;
        const styleTag = document.createElement('style');
        styleTag.innerHTML = styles;
        document.head.appendChild(styleTag);
    };

    fetch(`${apiUrl}/widgets/${widgetCode}`)
        .then(r => r.json())
        .then(widget => {
            const settings = typeof widget.settings === 'string' ? JSON.parse(widget.settings) : widget.settings || {};
            const accent = settings.accentColor || '#F5FF82';
            const textColor = settings.buttonTextColor || '#000000';
            const btnText = settings.buttonText || 'Записаться онлайн';
            const animation = settings.animationType || 'th-pulse';
            const position = settings.buttonPosition || 'bottom-right';
            
            injectStyles(accent, textColor, position);

            if (settings.floatingButton !== false) {
                const btn = document.createElement('button');
                btn.className = 'timehub-floating-btn';
                if (settings.buttonAnimation !== false) {
                    btn.classList.add(animation);
                }
                btn.innerText = btnText;
                btn.onclick = window.TimeHub.open;
                document.body.appendChild(btn);
            }

            document.querySelectorAll(`[data-timehub-widget="${widgetCode}"]`).forEach(btn => {
                btn.onclick = (e) => { e.preventDefault(); window.TimeHub.open(); };
            });
        })
        .catch(e => console.error('TimeHub Widget: Error', e));
})();
