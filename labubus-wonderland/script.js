<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const canvas = document.getElementById('labubu-canvas');
    const ctx = canvas.getContext('2d');
    const paletteContent = document.getElementById('palette-content');
    const colorPicker = document.getElementById('color-picker');
    const scaleSlider = document.getElementById('scale-slider');
    const bringForwardBtn = document.getElementById('bring-forward-btn');
    const sendBackwardBtn = document.getElementById('send-backward-btn');
    const resetBtn = document.getElementById('reset-btn');
    const exportBtn = document.getElementById('export-btn');
    const randomizeBtn = document.getElementById('randomize-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- GAME STATE ---
    let assets = {};
    let placedParts = [];
    let selectedPart = null;
    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    // --- CONFIGURATION ---
    const ASSET_PATH = 'assets/parts/';
    const CANVAS_WIDTH = 500;
    const CANVAS_HEIGHT = 600;

    const PARTS_CONFIG = [
        { id: 'body_base', src: 'body_base.svg', category: 'Body', layer: 1, colorizable: true },
        { id: 'ear_left', src: 'ear_left.svg', category: 'Ears', layer: 2, colorizable: true },
        { id: 'ear_right', src: 'ear_right.svg', category: 'Ears', layer: 2, colorizable: true },
        { id: 'eye_left', src: 'eye_left.svg', category: 'Eyes', layer: 3, colorizable: true },
        { id: 'eye_right', src: 'eye_right.svg', category: 'Eyes', layer: 3, colorizable: true },
        { id: 'mouth', src: 'mouth.svg', category: 'Mouths', layer: 3 },
        { id: 'horn_left', src: 'horn_left.svg', category: 'Horns', layer: 4, colorizable: true },
        { id: 'clothing_shirt', src: 'clothing_shirt.svg', category: 'Tops', layer: 5, colorizable: true },
        { id: 'accessory_hat', src: 'accessory_hat.svg', category: 'Hats', layer: 6, colorizable: true },
    ];

    // --- INITIALIZATION ---
    function init() {
        setupCanvas();
        preloadAssets().then(() => {
            populatePalette();
            resetCanvas();
            addEventListeners();
            loadingOverlay.style.display = 'none';
        }).catch(err => {
            console.error("Failed to load assets:", err);
            loadingOverlay.innerHTML = "<p>Error loading assets. Please try refreshing.</p>";
        });
    }

    function setupCanvas() {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }

    // --- ASSET MANAGEMENT ---
    function preloadAssets() {
        const promises = PARTS_CONFIG.map(part => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = ASSET_PATH + part.src;
                img.onload = () => {
                    assets[part.id] = { ...part, img: img };
                    resolve();
                };
                img.onerror = reject;
            });
        });
        return Promise.all(promises);
    }

    function populatePalette() {
        const categories = {};
        PARTS_CONFIG.forEach(part => {
            if (!categories[part.category]) {
                categories[part.category] = [];
            }
            categories[part.category].push(part);
        });

        for (const categoryName in categories) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'palette-category';
            categoryDiv.innerHTML = `<h3>${categoryName}</h3>`;
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'palette-items';
            
            categories[categoryName].forEach(part => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'palette-item';
                itemDiv.draggable = true;
                itemDiv.dataset.partId = part.id;
                itemDiv.innerHTML = `<img src="${ASSET_PATH + part.src}" alt="${part.id}">`;
                itemsDiv.appendChild(itemDiv);
            });

            categoryDiv.appendChild(itemsDiv);
            paletteContent.appendChild(categoryDiv);
        }
    }

    // --- CORE DRAWING LOGIC ---
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        placedParts.sort((a, b) => a.layer - b.layer);

        placedParts.forEach(part => {
            ctx.save();
            // Center the transformations on the part's center
            ctx.translate(part.x + part.width / 2, part.y + part.height / 2);
            ctx.scale(part.scale, part.scale);
            ctx.translate(-(part.x + part.width / 2), -(part.y + part.height / 2));

            if (part.colorizable && part.color) {
                // Draw color layer
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = part.color;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw image on top
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(part.img, part.x, part.y, part.width, part.height);
                
                 // Apply tint
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = part.color;
                ctx.fillRect(part.x, part.y, part.width, part.height);
                
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(part.img, part.x, part.y, part.width, part.height);

            } else {
                 ctx.drawImage(part.img, part.x, part.y, part.width, part.height);
            }
            
            ctx.restore();
        });

        if (selectedPart) {
            drawSelectionOutline(selectedPart);
        }
    }
    
    function drawSelectionOutline(part) {
        ctx.save();
        ctx.strokeStyle = 'rgba(106, 90, 205, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        const padding = 5;
        const w = part.width * part.scale + padding * 2;
        const h = part.height * part.scale + padding * 2;
        const x = (part.x + part.width / 2) - w/2;
        const y = (part.y + part.height / 2) - h/2;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }


    // --- EVENT HANDLERS ---
    function addEventListeners() {
        // Palette drag
        paletteContent.addEventListener('dragstart', handlePaletteDragStart);

        // Canvas drop
        canvas.addEventListener('dragover', handleCanvasDragOver);
        canvas.addEventListener('drop', handleCanvasDrop);
        
        // Canvas interaction (drag, select)
        canvas.addEventListener('mousedown', handleCanvasMouseDown);
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
        canvas.addEventListener('mouseup', handleCanvasMouseUp);
        canvas.addEventListener('mouseleave', handleCanvasMouseUp); // Stop dragging if mouse leaves

        // Control buttons
        resetBtn.addEventListener('click', resetCanvas);
        exportBtn.addEventListener('click', exportImage);
        randomizeBtn.addEventListener('click', randomizeLabubu);
        
        // Customization controls
        colorPicker.addEventListener('input', updatePartColor);
        scaleSlider.addEventListener('input', updatePartScale);
        bringForwardBtn.addEventListener('click', () => changeLayer(1));
        sendBackwardBtn.addEventListener('click', () => changeLayer(-1));
    }

    function handlePaletteDragStart(e) {
        if (e.target.classList.contains('palette-item')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.partId);
        }
    }

    function handleCanvasDragOver(e) {
        e.preventDefault();
    }

    function handleCanvasDrop(e) {
        e.preventDefault();
        const partId = e.dataTransfer.getData('text/plain');
        const partAsset = assets[partId];
        if (!partAsset) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        addPartToCanvas(partId, x, y);
    }
    
    function handleCanvasMouseDown(e) {
        const pos = getMousePos(e);
        const clickedPart = getPartAtPosition(pos.x, pos.y);
        
        if (clickedPart) {
            selectPart(clickedPart);
            isDragging = true;
            dragOffsetX = pos.x - clickedPart.x;
            dragOffsetY = pos.y - clickedPart.y;
        } else {
            selectPart(null);
        }
        drawCanvas();
    }
    
    function handleCanvasMouseMove(e) {
        if (isDragging && selectedPart) {
            const pos = getMousePos(e);
            selectedPart.x = pos.x - dragOffsetX;
            selectedPart.y = pos.y - dragOffsetY;
            drawCanvas();
        }
    }

    function handleCanvasMouseUp() {
        isDragging = false;
    }

    // --- PART MANIPULATION ---
    function addPartToCanvas(partId, x, y) {
        const asset = assets[partId];
        const newPart = {
            id: Date.now(), // Unique ID for this instance
            assetId: partId,
            img: asset.img,
            x: x - (asset.img.width / 2),
            y: y - (asset.img.height / 2),
            width: asset.img.width,
            height: asset.img.height,
            layer: asset.layer,
            colorizable: asset.colorizable || false,
            color: asset.colorizable ? '#ffffff' : null,
            scale: 1.0,
        };
        placedParts.push(newPart);
        selectPart(newPart);
        drawCanvas();
    }
    
    function getPartAtPosition(x, y) {
        // Iterate backwards to select the top-most part
        for (let i = placedParts.length - 1; i >= 0; i--) {
            const part = placedParts[i];
            const p_x = part.x;
            const p_y = part.y;
            const p_w = part.width * part.scale;
            const p_h = part.height * part.scale;
            if (x >= p_x && x <= p_x + p_w && y >= p_y && y <= p_y + p_h) {
                return part;
            }
        }
        return null;
    }
    
    function selectPart(part) {
        selectedPart = part;
        updateControlsUI();
        drawCanvas();
    }

    function updateControlsUI() {
        if (selectedPart) {
            const isColorizable = selectedPart.colorizable;
            colorPicker.disabled = !isColorizable;
            colorPicker.value = isColorizable ? selectedPart.color : '#ffffff';
            scaleSlider.disabled = false;
            scaleSlider.value = selectedPart.scale;
            bringForwardBtn.disabled = false;
            sendBackwardBtn.disabled = false;
        } else {
            colorPicker.disabled = true;
            scaleSlider.disabled = true;
            bringForwardBtn.disabled = true;
            sendBackwardBtn.disabled = true;
        }
    }
    
    function updatePartColor(e) {
        if (selectedPart && selectedPart.colorizable) {
            selectedPart.color = e.target.value;
            drawCanvas();
        }
    }

    function updatePartScale(e) {
        if (selectedPart) {
            selectedPart.scale = parseFloat(e.target.value);
            drawCanvas();
        }
    }
    
    function changeLayer(direction) {
        if (!selectedPart) return;
        selectedPart.layer += direction;
        // Optional: Clamp layer values if needed
        drawCanvas();
    }

    // --- ACTIONS ---
    function resetCanvas() {
        placedParts = [];
        const bodyAsset = assets['body_base'];
        addPartToCanvas('body_base', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        selectPart(null); // Deselect after reset
    }

    function exportImage() {
        const link = document.createElement('a');
        link.download = 'labubu_creation.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
    
    function randomizeLabubu() {
        placedParts = [];
        
        // Group parts by category
        const categories = {};
        PARTS_CONFIG.forEach(p => {
            if (!categories[p.category]) categories[p.category] = [];
            categories[p.category].push(p.id);
        });

        // Add a base body
        addPartToCanvas('body_base', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

        // Add random parts, avoiding adding all from one category
        for (const category in categories) {
            if (category === 'Body') continue; // Skip body as it's already added
            const partIds = categories[category];
            const randomPartId = partIds[Math.floor(Math.random() * partIds.length)];
            addPartToCanvas(randomPartId, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        }

        // Randomize colors and positions
        placedParts.forEach(part => {
             if (part.colorizable) {
                part.color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            }
            // Add a little random offset
            part.x += (Math.random() - 0.5) * 20;
            part.y += (Math.random() - 0.5) * 20;
        });
        
        selectPart(null);
        drawCanvas();
    }
    
    // --- HELPERS ---
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    // --- START ---
    init();
=======
const canvas = document.getElementById('labubuCanvas');
const ctx = canvas.getContext('2d');
const partsPalette = document.getElementById('parts-palette');
const clearCanvasBtn = document.getElementById('clearCanvas');
const exportImageBtn = document.getElementById('exportImage');
const bodyColorInput = document.getElementById('bodyColor');
const eyeColorInput = document.getElementById('eyeColor');
const drawingSurfaceOverlay = document.getElementById('drawing-surface-overlay');

// Ensure canvas matches its display size for high-res drawing
function setCanvasSize() {
    const dpr = window.devicePixelRatio || 1; // Get device pixel ratio
    const canvasArea = document.getElementById('canvas-area');
    const width = canvasArea.clientWidth;
    const height = canvasArea.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr); // Scale context for high DPI displays

    // Adjust drawing scale for the actual drawing area (e.g., if canvas is square)
    // For now, we'll keep it simple: Labubu will scale to fit the canvas width.
    initialDrawScale = Math.min(width, height) / 400; // Assuming initial drawing is around 400px wide
    // Recalculate positions and redraw if parts are already on canvas
    redrawCanvas();
}

setCanvasSize(); // Set initial size
window.addEventListener('resize', setCanvasSize); // Adjust on resize

// --- Labubu Parts Data ---
// Define the parts and their relative positions (adjust these values!)
// These are relative to a conceptual "Labubu origin" (e.g., center of body)
const labubuParts = [
    { name: 'Body', file: 'body_base.png', layer: 0, x: 0, y: 0, draggable: false, colorable: 'body', type: 'base' },
    { name: 'Left Ear', file: 'ear_left.png', layer: 1, x: -70, y: -100, draggable: true, colorable: false },
    { name: 'Right Ear', file: 'ear_right.png', layer: 1, x: 70, y: -100, draggable: true, colorable: false },
    { name: 'Left Eye', file: 'eye_left.png', layer: 2, x: -30, y: -30, draggable: true, colorable: 'eye' },
    { name: 'Right Eye', file: 'eye_right.png', layer: 2, x: 30, y: -30, draggable: true, colorable: 'eye' },
    { name: 'Mouth', file: 'mouth.png', layer: 2, x: 0, y: 30, draggable: true, colorable: false },
    { name: 'Left Horn', file: 'horn_left.png', layer: 1, x: -50, y: -120, draggable: true, colorable: false },
    { name: 'Right Horn', file: 'horn_right.png', layer: 1, x: 50, y: -120, draggable: true, colorable: false },
    { name: 'Accessory Hat', file: 'accessory_hat.png', layer: 3, x: 0, y: -150, draggable: true, colorable: false },
    // Add more parts as needed (hands, feet, clothes, more accessories, etc.)
];

// Stores the currently placed parts on the canvas
let placedParts = [];
let loadedImages = {}; // Cache for loaded images
let selectedPart = null; // For drag and drop
let offsetX, offsetY; // Offset for drag and drop

// Global colors
let currentColor = {
    body: bodyColorInput.value,
    eye: eyeColorInput.value
};

let initialDrawScale = 1; // Determined by setCanvasSize

// --- Image Loading and Preloading ---
function preloadImages(callback) {
    let imagesToLoad = labubuParts.length;
    let loadedCount = 0;

    labubuParts.forEach(part => {
        const img = new Image();
        img.onload = () => {
            loadedImages[part.file] = img;
            loadedCount++;
            if (loadedCount === imagesToLoad) {
                callback(); // All images loaded, proceed
            }
        };
        img.onerror = () => {
            console.error(`Failed to load image: assets/parts/${part.file}`);
            loadedCount++; // Still count to avoid infinite loop
            if (loadedCount === imagesToLoad) {
                callback();
            }
        };
        img.src = `assets/parts/${part.file}`;
    });
}

// --- Canvas Drawing Functions ---

function drawPart(partData) {
    const img = loadedImages[partData.file];
    if (!img) return;

    ctx.save();
    
    // Apply global color for colorable parts
    if (partData.colorable === 'body' && currentColor.body) {
        // This is a simple color overlay. For more complex tinting, you might need a separate
        // colorized image or a more advanced shader-like approach on canvas.
        // For now, we'll draw the image then overlay a transparent colored rectangle.
        // A better approach for tinting would be to use `ctx.globalCompositeOperation = 'source-atop'`
        // after drawing the image, then fill a rectangle with the color.
        // Or, even better, pre-process base images to be white, then apply tint.
        // For simplicity, we'll draw the image, and if it's 'body' or 'eye', we'll tint it.
    }

    // Calculate position relative to the Labubu's center (canvas center)
    const centerX = canvas.width / (2 * (window.devicePixelRatio || 1));
    const centerY = canvas.height / (2 * (window.devicePixelRatio || 1));

    const drawX = centerX + partData.x * initialDrawScale - (img.width * partData.scale / 2 || img.width / 2);
    const drawY = centerY + partData.y * initialDrawScale - (img.height * partData.scale / 2 || img.height / 2);
    const drawWidth = img.width * (partData.scale || 1);
    const drawHeight = img.height * (partData.scale || 1);

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Simple color overlay for demonstration (less ideal for complex images)
    if (partData.colorable === 'body' && currentColor.body) {
        ctx.globalCompositeOperation = 'source-atop'; // Draw only where something is already drawn
        ctx.fillStyle = currentColor.body;
        ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
        ctx.globalCompositeOperation = 'source-over'; // Reset
    } else if (partData.colorable === 'eye' && currentColor.eye) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = currentColor.eye;
        ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
}


function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas

    // Sort parts by layer to ensure correct drawing order
    placedParts.sort((a, b) => a.layer - b.layer);

    placedParts.forEach(part => drawPart(part));

    // Show/hide overlay based on whether parts are on canvas
    if (placedParts.length === 0) {
        drawingSurfaceOverlay.style.opacity = 1;
    } else {
        drawingSurfaceOverlay.style.opacity = 0;
    }
}

// --- Palette Setup ---

function populatePalette() {
    labubuParts.forEach(part => {
        if (part.draggable) { // Only parts intended for dragging to canvas
            const partElement = document.createElement('div');
            partElement.classList.add('palette-item');
            partElement.draggable = true; // Make it draggable

            const img = document.createElement('img');
            img.src = `assets/parts/${part.file}`;
            img.alt = part.name;
            img.title = part.name;

            partElement.appendChild(img);
            partsPalette.appendChild(partElement);

            // Store part data in the element for drag-and-drop
            partElement.dataset.partName = part.name;
        }
    });
}

// --- Drag and Drop Logic ---

let draggingItem = null;

partsPalette.addEventListener('dragstart', (e) => {
    draggingItem = labubuParts.find(p => p.name === e.target.dataset.partName);
    if (draggingItem) {
        // Provide data that can be retrieved in drop event
        e.dataTransfer.setData('text/plain', draggingItem.name);
        e.dataTransfer.effectAllowed = 'copy';
    }
});

canvas.addEventListener('dragover', (e) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'copy';
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (draggingItem) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Calculate drop position relative to canvas center
        const centerX = canvas.width / (2 * dpr);
        const centerY = canvas.height / (2 * dpr);

        const newX = (e.clientX - rect.left) / dpr - centerX;
        const newY = (e.clientY - rect.top) / dpr - centerY;

        // Create a new instance of the part for the canvas
        const newPart = { ...draggingItem, x: newX, y: newY, scale: 1 }; // Initial scale 1

        // Check if a base body is already present and if not, add it automatically
        const bodyBase = labubuParts.find(p => p.type === 'base');
        if (bodyBase && !placedParts.some(p => p.type === 'base')) {
            placedParts.push({ ...bodyBase, x: 0, y: 0, scale: 1 });
        }

        placedParts.push(newPart);
        redrawCanvas();
        draggingItem = null; // Reset dragging item
    }
});


// --- Part Manipulation on Canvas (Simple Dragging Placed Parts) ---
let isDraggingOnCanvas = false;
let draggedCanvasPart = null;

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const mouseX = (e.clientX - rect.left) / dpr;
    const mouseY = (e.clientY - rect.top) / dpr;

    // Convert mouse coordinates to Labubu's relative coordinates
    const centerX = canvas.width / (2 * dpr);
    const centerY = canvas.height / (2 * dpr);
    const relativeMouseX = mouseX - centerX;
    const relativeMouseY = mouseY - centerY;

    // Find if a part was clicked
    // Iterate in reverse order to select top-most part
    for (let i = placedParts.length - 1; i >= 0; i--) {
        const part = placedParts[i];
        const img = loadedImages[part.file];
        if (!img) continue;

        // Calculate part's bounding box on canvas
        const drawX = centerX + part.x * initialDrawScale - (img.width * part.scale / 2 || img.width / 2);
        const drawY = centerY + part.y * initialDrawScale - (img.height * part.scale / 2 || img.height / 2);
        const drawWidth = img.width * (part.scale || 1);
        const drawHeight = img.height * (part.scale || 1);

        if (mouseX >= drawX && mouseX <= drawX + drawWidth &&
            mouseY >= drawY && mouseY <= drawY + drawHeight && part.draggable) { // Only draggable parts
            
            isDraggingOnCanvas = true;
            draggedCanvasPart = part;
            
            // Store offset from part's origin to mouse click point
            offsetX = relativeMouseX - part.x;
            offsetY = relativeMouseY - part.y;
            
            // Bring the dragged part to the top layer for drawing
            placedParts = placedParts.filter(p => p !== part);
            placedParts.push(part);
            redrawCanvas(); // Redraw to bring it to front visually
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDraggingOnCanvas || !draggedCanvasPart) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const mouseX = (e.clientX - rect.left) / dpr;
    const mouseY = (e.clientY - rect.top) / dpr;

    const centerX = canvas.width / (2 * dpr);
    const centerY = canvas.height / (2 * dpr);
    const relativeMouseX = mouseX - centerX;
    const relativeMouseY = mouseY - centerY;

    draggedCanvasPart.x = relativeMouseX - offsetX;
    draggedCanvasPart.y = relativeMouseY - offsetY;
    
    redrawCanvas();
});

canvas.addEventListener('mouseup', () => {
    isDraggingOnCanvas = false;
    draggedCanvasPart = null;
});

canvas.addEventListener('mouseleave', () => { // Stop dragging if mouse leaves canvas
    isDraggingOnCanvas = false;
    draggedCanvasPart = null;
});

// --- Color Control Handlers ---

bodyColorInput.addEventListener('input', (e) => {
    currentColor.body = e.target.value;
    redrawCanvas();
});

eyeColorInput.addEventListener('input', (e) => {
    currentColor.eye = e.target.value;
    redrawCanvas();
});

// --- Action Buttons ---

clearCanvasBtn.addEventListener('click', () => {
    placedParts = [];
    redrawCanvas();
});

exportImageBtn.addEventListener('click', () => {
    // Hide the overlay before exporting
    drawingSurfaceOverlay.style.opacity = 0; // Temporarily hide it

    // Create a temporary off-screen canvas to draw a clean image without overlay
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set export canvas size to match current display size for proper resolution
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    exportCtx.scale(dpr, dpr); // Scale for high DPI
    
    exportCtx.fillStyle = '#FFFFFF'; // White background for export
    exportCtx.fillRect(0, 0, exportCanvas.width / dpr, exportCanvas.height / dpr);

    // Draw all placed parts onto the export canvas
    placedParts.sort((a, b) => a.layer - b.layer); // Ensure correct layering for export
    placedParts.forEach(part => {
        const img = loadedImages[part.file];
        if (!img) return;

        const centerX = exportCanvas.width / (2 * dpr);
        const centerY = exportCanvas.height / (2 * dpr);

        const drawX = centerX + part.x * initialDrawScale - (img.width * part.scale / 2 || img.width / 2);
        const drawY = centerY + part.y * initialDrawScale - (img.height * part.scale / 2 || img.height / 2);
        const drawWidth = img.width * (part.scale || 1);
        const drawHeight = img.height * (part.scale || 1);

        exportCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // Apply colors to the export as well
        if (part.colorable === 'body' && currentColor.body) {
            exportCtx.globalCompositeOperation = 'source-atop';
            exportCtx.fillStyle = currentColor.body;
            exportCtx.fillRect(drawX, drawY, drawWidth, drawHeight);
            exportCtx.globalCompositeOperation = 'source-over';
        } else if (part.colorable === 'eye' && currentColor.eye) {
            exportCtx.globalCompositeOperation = 'source-atop';
            exportCtx.fillStyle = currentColor.eye;
            exportCtx.fillRect(drawX, drawY, drawWidth, drawHeight);
            exportCtx.globalCompositeOperation = 'source-over';
        }
    });

    // Convert the export canvas to an image and download
    const image = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'labubu_creation.png';
    link.href = image;
    link.click();

    // Bring overlay back
    redrawCanvas(); // This will restore the overlay's visibility if no parts are there
});


// --- Initialization ---
preloadImages(() => {
    populatePalette();
    // Add the base body automatically when images are loaded
    const bodyBase = labubuParts.find(p => p.type === 'base');
    if (bodyBase) {
        // Initial position of the body base
        placedParts.push({ ...bodyBase, x: 0, y: 0, scale: 1 }); 
    }
    redrawCanvas(); // Initial draw
    console.log("Labubu Creative Canvas Loaded!");
>>>>>>> d7cebbf1746b44fd748cb480ec586c397776ffae
});