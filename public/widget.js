(function() {
    function initTimeHubWidget() {
        const container = document.getElementById('timehub-widget-container');
        if (!container) return;

        const branchId = container.getAttribute('data-branch-id');
        const accent = container.getAttribute('data-accent') || '#000000';
        const width = container.getAttribute('data-width') || '100%';
        const height = container.getAttribute('data-height') || '600px';
        const baseUrl = container.getAttribute('data-base-url') || window.location.origin;

        if (!branchId) {
            console.error('TimeHub Widget: data-branch-id is required');
            return;
        }

        const iframe = document.createElement('iframe');
        const url = new URL(`${baseUrl}/widget/${branchId}`);
        url.searchParams.set('accent', accent);
        
        iframe.src = url.toString();
        iframe.style.width = width;
        iframe.style.height = height;
        iframe.style.border = 'none';
        iframe.style.borderRadius = '12px';
        iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        iframe.setAttribute('allow', 'payment');

        container.appendChild(iframe);

        // Listen for messages from the widget
        window.addEventListener('message', function(event) {
            if (event.data.type === 'booking_success') {
                console.log('TimeHub: Booking successful for branch', event.data.branchId);
                // Custom event for the parent page
                const customEvent = new CustomEvent('timehubBookingSuccess', { detail: event.data });
                window.dispatchEvent(customEvent);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTimeHubWidget);
    } else {
        initTimeHubWidget();
    }
})();
