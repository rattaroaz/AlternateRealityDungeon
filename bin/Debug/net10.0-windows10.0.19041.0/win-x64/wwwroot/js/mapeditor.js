// Map Editor JavaScript helpers

window.mapEditor = {
    _panElement: null,
    _panLastX: 0,
    _panLastY: 0,

    startDragPan: function (element, startClientX, startClientY) {
        if (!element) return;

        this._panElement = element;
        this._panLastX = startClientX;
        this._panLastY = startClientY;

        const self = this;

        function onMove(ev) {
            if (!self._panElement) return;
            const dx = ev.clientX - self._panLastX;
            const dy = ev.clientY - self._panLastY;
            self._panElement.scrollLeft -= dx;
            self._panElement.scrollTop -= dy;
            self._panLastX = ev.clientX;
            self._panLastY = ev.clientY;
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            self._panElement = null;
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp, { once: true });
    },

    panBy: function (element, deltaX, deltaY) {
        if (!element) return;
        element.scrollLeft -= deltaX;
        element.scrollTop -= deltaY;
    }
};

// Download map data as JSON file
window.downloadMapFile = function(jsonContent, filename) {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Read map file from input element
window.readMapFile = function(inputId) {
    return new Promise((resolve, reject) => {
        const input = document.getElementById(inputId);
        if (!input || !input.files || input.files.length === 0) {
            resolve(null);
            return;
        }
        
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        
        reader.onerror = function(e) {
            reject(e);
        };
        
        reader.readAsText(file);
        
        // Reset input so same file can be loaded again
        input.value = '';
    });
};
