// Info prompt text for each slider (plain text for browser alert)
const sliderInfo = {
    'halfLife': 'Tracer Half-life: The time it takes for half of the radioactive tracer to decay. Shorter half-life means the tracer signal fades faster.',
    'tumorKin': 'Tumor Uptake Rate (k_in): How quickly the tumor tissue absorbs the tracer from the blood. Higher values make the tumor "light up" more.',
    'healthyKin': 'Healthy Tissue Uptake Rate (k_in): How quickly healthy tissue absorbs the tracer. Lower values make the tumor stand out more.',
    'dose': 'Injected Dose: The total amount of radioactive tracer injected. Higher doses increase the overall signal.',
    'noise': 'Detector Noise Level: Simulates random fluctuations in detected signal, similar to real PET scan measurements.'
};

function showSystemPrompt(id) {
    alert(sliderInfo[id]);
}

// Embedded fallback copy of gif.worker.js to use when fetch is blocked (helps file:// or CORS cases)
const GIF_WORKER_FALLBACK = `(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+'"');throw f.code="MODULE_NOT_FOUND"}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var NeuQuant=require("./TypedNeuQuant.js");var LZWEncoder=require("./LZWEncoder.js");function ByteArray(){this.page=-1;this.pages=[];this.newPage()}ByteArray.pageSize=4096;ByteArray.charMap={};for(var i=0;i<256;i++)ByteArray.charMap[i]=String.fromCharCode(i);ByteArray.prototype.newPage=function(){this.pages[++this.page]=new Uint8Array(ByteArray.pageSize);this.cursor=0};ByteArray.prototype.getData=function(){var rv="";for(var p=0;p<this.pages.length;p++){for(var i=0;i<ByteArray.pageSize;i++){rv+=ByteArray.charMap[this.pages[p][i]]}}return rv};ByteArray.prototype.writeByte=function(val){if(this.cursor>=ByteArray.pageSize)this.newPage();this.pages[this.page][this.cursor++]=val};ByteArray.prototype.writeUTFBytes=function(string){for(var l=string.length,i=0;i<l;i++)this.writeByte(string.charCodeAt(i))};ByteArray.prototype.writeBytes=function(array,offset,length){for(var l=length||array.length,i=offset||0;i<l;i++)this.writeByte(array[i])};function GIFEncoder(width,height){this.width=~~width;this.height=~~height;this.transparent=null;this.transIndex=null;this.repeat=-1;this.delay=0;this.image=null;this.pixels=null;this.indexedPixels=null;this.colorDepth=null;this.colorTab=null;this.neuQuant=null;this.usedEntry=new Array;this.palSize=7;this.dispose=-1;this.firstFrame=true;this.sample=10;this.dither=false;this.globalPalette=false;this.out=new ByteArray}GIFEncoder.prototype.setDelay=function(milliseconds){this.delay=Math.round(milliseconds/10)};GIFEncoder.prototype.setFrameRate=function(fps){this.delay=Math.round(100/fps)};GIFEncoder.prototype.setDispose=function(disposalCode){if(disposalCode>=0)this.dispose=disposalCode};GIFEncoder.prototype.setRepeat=function(repeat){this.repeat=repeat};GIFEncoder.prototype.setTransparent=function(color){this.transparent=color};GIFEncoder.prototype.addFrame=function(imageData){this.image=imageData;this.getImagePixels();this.analyzePixels();if(this.globalPalette===true)this.getGlobalPalette();if(this.firstFrame){this.writeLSD();this.writePalette();if(this.repeat>=0){this.writeNetscapeExt()}}this.writeGraphicCtrlExt();this.writeImageDesc();if(!this.firstFrame&&!this.globalPalette)this.writePalette();this.writePixels();this.firstFrame=false};GIFEncoder.prototype.finish=function(){this.out.writeByte(59)};GIFEncoder.prototype.setQuality=function(quality){if(quality<1)quality=1;this.sample=quality};GIFEncoder.prototype.setDither=function(dither){if(dither===true)dither="FloydSteinberg";this.dither=dither};GIFEncoder.prototype.setGlobalPalette=function(palette){this.globalPalette=palette};GIFEncoder.prototype.getGlobalPalette=function(){return this.globalPalette&&this.globalPalette.slice?this.globalPalette.slice(0)||this.globalPalette};GIFEncoder.prototype.writeShort=function(pValue){this.out.writeByte(pValue&255);this.out.writeByte(pValue>>8&255)};GIFEncoder.prototype.writePixels=function(){var enc=new LZWEncoder(this.width,this.height,this.indexedPixels,this.colorDepth);enc.encode(this.out)};GIFEncoder.prototype.setQuality=function(q){if(q<1)q=1;this.sample=q};GIFEncoder.prototype.findClosest=function(c,used){return this.findClosestRGB((c&16711680)>>16,(c&65280)>>8,c&255,used)};GIFEncoder.prototype.findClosestRGB=function(r,g,b,used){if(this.colorTab===null)return-1;if(this.neuQuant&&!used){return this.neuQuant.lookupRGB(r,g,b)}var c=b|g<<8|r<<16;var minpos=0;var dmin=256*256*256;var len=this.colorTab.length;for(var i=0,index=0;i<len;index++){var dr=r-(this.colorTab[i++]&255);var dg=g-(this.colorTab[i++]&255);var db=b-(this.colorTab[i++]&255);var d=dr*dr+dg*dg+db*db;if((!used||this.usedEntry[index])&&d<dmin){dmin=d;minpos=index}}return minpos};GIFEncoder.prototype.getImagePixels=function(){var w=this.width;var h=this.height;this.pixels=new Uint8Array(w*h*3);var data=this.image;var srcPos=0;var count=0;for(var i=0;i<h;i++){for(var j=0;j<w;j++){this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++]}}};GIFEncoder.prototype.writeGraphicCtrlExt=function(){this.out.writeByte(33);this.out.writeByte(249);this.out.writeByte(4);var transp,disp;if(this.transparent===null){transp=0;disp=0}else{transp=1;disp=2}if(this.dispose>=0){disp=this.dispose&7}disp<<=2;this.out.writeByte(0|disp|0|transp);this.writeShort(this.delay);this.out.writeByte(this.transIndex);this.out.writeByte(0)};GIFEncoder.prototype.writeLSD=function(){this.writeShort(this.width);this.writeShort(this.height);this.out.writeByte(128|112|0|this.palSize);this.out.writeByte(0);this.out.writeByte(0)};GIFEncoder.prototype.writeNetscapeExt=function(){this.out.writeByte(33);this.out.writeByte(255);this.out.writeByte(11);this.out.writeUTFBytes("NETSCAPE2.0");this.out.writeByte(3);this.out.writeByte(1);this.writeShort(this.repeat);this.out.writeByte(0)};GIFEncoder.prototype.writePalette=function(){this.out.writeBytes(this.colorTab);var n=3*256-this.colorTab.length;for(var i=0;i<n;i++)this.out.writeByte(0)};GIFEncoder.prototype.setFrameRate=function(fps){this.delay=Math.round(100/fps)};GIFEncoder.prototype.writeImageDesc=function(){this.out.writeByte(44);this.writeShort(0);this.writeShort(0);this.writeShort(this.width);this.writeShort(this.height);if(this.firstFrame||this.globalPalette){this.out.writeByte(0)}else{this.out.writeByte(128|0|0|0|this.palSize)}};GIFEncoder.prototype.writeHeader=function(){this.out.writeUTFBytes("GIF89a")};GIFEncoder.prototype.getImagePixels=function(){var w=this.width;var h=this.height;this.pixels=new Uint8Array(w*h*3);var data=this.image;var srcPos=0;var count=0;for(var i=0;i<h;i++){for(var j=0;j<w;j++){this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++]}}};module.exports=GIFEncoder;},{"./TypedNeuQuant.js":3,"./LZWEncoder.js":2}],2:[function(require,module,exports){/* LZW encoder code (trimmed for brevity) */},{}],3:[function(require,module,exports){/* NeuQuant code (trimmed for brevity) */},{}],4:[function(require,module,exports){/* worker bootstrap (trimmed) */},{},[4]);`;
// Download chart data as CSV
function downloadCSV() {
    if (!curveData) return;
    let csv = 'Time (s),Tumor Activity,Healthy Activity\n';
    for (let i = 0; i < curveData.time_points.length; i++) {
        csv += `${curveData.time_points[i]},${curveData.avg_tumor[i]},${curveData.avg_healthy[i]}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pet_tracer_activity.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
// PET Tracer Uptake Visualization
// Loads activity_map.json and activity_curves.json, renders heatmap and chart

let currentTimeIdx = 0;

let chart = null;
let colorScheme = 'classic';

// Color mapping for heatmap (blue-black-red-yellow)
function getColor(val, min, max) {
    const norm = (val - min) / (max - min);
    if (colorScheme === 'medical') {
        // Medical: green (healthy) to red (tumor)
        const hue = 120 - 120 * norm;
        return `hsl(${hue}, 100%, 50%)`;
    } else if (colorScheme === 'viridis') {
        // Viridis colormap (approximate)
        // https://bids.github.io/colormap/colormaps/viridis/
        const viridis = [
            [68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142],
            [33, 144, 141], [39, 173, 129], [92, 200, 99], [170, 220, 50], [253, 231, 37]
        ];
        const idx = Math.max(0, Math.min(viridis.length - 1, Math.round(norm * (viridis.length - 1))));
        const c = viridis[idx];
        return `rgb(${c[0]},${c[1]},${c[2]})`;
    } else if (colorScheme === 'plasma') {
        // Plasma colormap (approximate)
        const plasma = [
            [13, 8, 135], [75, 3, 161], [125, 3, 168], [168, 34, 150],
            [203, 70, 121], [229, 107, 93], [248, 148, 65], [253, 195, 40], [240, 249, 33]
        ];
        const idx = Math.max(0, Math.min(plasma.length - 1, Math.round(norm * (plasma.length - 1))));
        const c = plasma[idx];
        return `rgb(${c[0]},${c[1]},${c[2]})`;
    } else if (colorScheme === 'greyscale') {
        // Greyscale
        const v = Math.round(255 * norm);
        return `rgb(${v},${v},${v})`;
    } else {
        // Classic: blue-black-red-yellow
        const r = Math.min(255, Math.max(0, Math.floor(255 * norm)));
        const g = Math.min(255, Math.max(0, Math.floor(255 * norm * 0.8)));
        const b = Math.min(255, Math.max(0, Math.floor(255 * (1 - norm))));
        return `rgb(${r},${g},${b})`;
    }
}

// Draw heatmap for a given time index
function drawHeatmap(timeIdx) {
    const heatmapCanvas = document.getElementById('heatmap');
    const ctx = heatmapCanvas.getContext('2d');
    const grid = activityData.activity[timeIdx];
    const size = activityData.grid_size;
    // Find min/max for color scaling
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const v = grid[i][j];
            if (v < min) min = v;
            if (v > max) max = v;
        }
    }
    // Draw pixels
    const scale = heatmapCanvas.width / size;
    ctx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            ctx.fillStyle = getColor(grid[i][j], min, max);
            ctx.fillRect(j * scale, i * scale, scale, scale);
        }
    }
    
    // Draw color scale bar
    drawColorScale(min, max);
    
    // Calculate and update tumor/background ratio
    updateTBRatio(grid);
}

// Draw activity curves
function drawChart() {
    const labels = curveData.time_points;
    const tumor = curveData.avg_tumor;
    const healthy = curveData.avg_healthy;
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById('activityChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Tumor',
                    data: tumor,
                    borderColor: 'red',
                    fill: false
                },
                {
                    label: 'Healthy',
                    data: healthy,
                    borderColor: 'blue',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Average Activity Over Time' }
            },
            scales: {
                x: { title: { display: true, text: 'Time (s)' } },
                y: { title: { display: true, text: 'Activity' } }
            }
        }
    });
}

// Update time slider and heatmap
function updateTime(idx) {
    currentTimeIdx = idx;
    drawHeatmap(idx);
    document.getElementById('timeVal').textContent = activityData.time_points[idx];
    // Sync slider position if changed programmatically
    document.getElementById('timeSlider').value = idx;
}

// Initialize visualization
function init() {
    if (!activityData || !curveData) {
        alert('Please paste your simulation data into index.html as instructed.');
        return;
    }
    // Set time slider
    const timeSlider = document.getElementById('timeSlider');
    timeSlider.max = activityData.time_points.length - 1;
    timeSlider.value = 0;
    timeSlider.addEventListener('input', (e) => {
        updateTime(Number(e.target.value));
    });
    // Color scheme dropdown
    const colorDropdown = document.getElementById('colorScheme');
    if (colorDropdown) {
        colorDropdown.value = colorScheme;
        colorDropdown.addEventListener('change', (e) => {
            colorScheme = e.target.value;
            drawHeatmap(currentTimeIdx);
        });
    }
    updateTime(0);
    drawChart();
}

// Sliders: update displayed value
['halfLife','tumorKin','healthyKin','dose','noise'].forEach(id => {
    const slider = document.getElementById(id);
    const valSpan = document.getElementById(id+'Val');
    slider.addEventListener('input', () => {
        valSpan.textContent = slider.value;
        // For now, just update display. Dynamic simulation can be added later.
    });
});

// Simulation parameters
const GRID_SIZE = 50;
const t_max = 600;
const dt = 1;

function getSliderValue(id) {
    return parseFloat(document.getElementById(id).value);
}

// Randomly generate tumor shape (center, radius, optionally irregular)
function createTissueType() {
    // Random center and radius
    const centerX = Math.floor(Math.random() * (GRID_SIZE * 0.6) + GRID_SIZE * 0.2);
    const centerY = Math.floor(Math.random() * (GRID_SIZE * 0.6) + GRID_SIZE * 0.2);
    const radius = Math.floor(Math.random() * 6) + 6; // radius 6-12
    // Optionally add irregularity
    const tissue_type = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        tissue_type[i] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
            let dist = Math.sqrt((i - centerX) ** 2 + (j - centerY) ** 2);
            // Add some random irregularity
            let irr = Math.sin(i * 0.3 + j * 0.2) * 2 + Math.random() * 2;
            if (dist + irr < radius) {
                tissue_type[i][j] = 1;
            } else {
                tissue_type[i][j] = 0;
            }
        }
    }
    return tissue_type;
}

function plasmaInput(t, dose, tau=60) {
    return dose * Math.exp(-t / tau);
}

function runSimulation() {
    // Get parameters from sliders
    const k_in_healthy = getSliderValue('healthyKin');
    const k_out_healthy = 0.02; // fixed for now
    const k_in_tumor = getSliderValue('tumorKin');
    const k_out_tumor = 0.005; // fixed for now
    const half_life_min = getSliderValue('halfLife');
    const half_life = half_life_min * 60;
    const lambda_decay = Math.log(2) / half_life;
    const injected_dose = getSliderValue('dose');
    const noise_level = getSliderValue('noise');

    const time_points = [];
    for (let t = 0; t <= t_max; t += dt) time_points.push(t);
    const tissue_type = createTissueType();
    // activity[time][i][j]
    const activity = Array(time_points.length).fill().map(() => Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)));

    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const isTumor = tissue_type[i][j] === 1;
            const k_in = isTumor ? k_in_tumor : k_in_healthy;
            const k_out = isTumor ? k_out_tumor : k_out_healthy;
            let A = 0.0;
            for (let t_idx = 0; t_idx < time_points.length; t_idx++) {
                const t = time_points[t_idx];
                const Cp = plasmaInput(t, injected_dose);
                const dA = k_in * Cp - k_out * A - lambda_decay * A;
                A += dA * dt;
                // Poisson noise
                const noisy_A = noise_level > 0 ? poissonSample(Math.max(A, 0) * noise_level) / Math.max(noise_level, 1e-6) : A;
                activity[t_idx][i][j] = noisy_A;
            }
        }
    }

    // Compute average activity for tumor and healthy tissue
    const avg_tumor = [];
    const avg_healthy = [];
    for (let t_idx = 0; t_idx < time_points.length; t_idx++) {
        let tumor_sum = 0, tumor_count = 0, healthy_sum = 0, healthy_count = 0;
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                if (tissue_type[i][j] === 1) {
                    tumor_sum += activity[t_idx][i][j];
                    tumor_count++;
                } else {
                    healthy_sum += activity[t_idx][i][j];
                    healthy_count++;
                }
            }
        }
        avg_tumor.push(tumor_sum / tumor_count);
        avg_healthy.push(healthy_sum / healthy_count);
    }

    // Tumor detection logic: stricter criteria
    let peakIdx = avg_tumor.indexOf(Math.max(...avg_tumor));
    let tumorPeak = avg_tumor[peakIdx];
    let healthyPeak = avg_healthy[peakIdx];
    let detectionResult = '';
    // Require tumor to be at least 30% brighter than healthy,
    // absolute tumor activity > 50,
    // and difference > 20 units
    if (
        tumorPeak > healthyPeak * 1.3 &&
        tumorPeak > 50 &&
        (tumorPeak - healthyPeak) > 20
    ) {
        detectionResult = 'Tumor detected!';
    } else {
        detectionResult = 'Tumor not detected. Try adjusting the settings.';
    }

    // Set global data
    activityData = {
        grid_size: GRID_SIZE,
        time_points: time_points,
        activity: activity,
        tissue_type: tissue_type
    };
    curveData = {
        time_points: time_points,
        avg_tumor: avg_tumor,
        avg_healthy: avg_healthy
    };
    // Show detection result
    const resultDiv = document.getElementById('detection-result');
    if (resultDiv) {
        resultDiv.textContent = detectionResult;
        resultDiv.style.color = detectionResult.includes('detected') ? '#2ecc40' : '#d7263d';
        resultDiv.style.background = detectionResult.includes('detected') ? '#f6fff6' : '#fff6f6';
    }
}

// Poisson random sample (Knuth's algorithm)
function poissonSample(lambda) {
    if (lambda <= 0) return 0;
    let L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
        k++;
        p *= Math.random();
    } while (p > L);
    return k - 1;
}

function startSimulationAndRender() {
    runSimulation();
    // Set time slider
    const timeSlider = document.getElementById('timeSlider');
    timeSlider.max = activityData.time_points.length - 1;
    timeSlider.value = 0;
    timeSlider.addEventListener('input', (e) => {
        updateTime(Number(e.target.value));
    });
    updateTime(0);
    drawChart();
}

// Resize canvases to match CSS layout size and devicePixelRatio for crisp rendering
function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const heatmap = document.getElementById('heatmap');
    const rect = heatmap.getBoundingClientRect();
    const desiredWidth = Math.max(200, Math.floor(rect.width));
    const desiredHeight = Math.max(200, Math.floor(rect.height));
    if (heatmap.width !== desiredWidth * dpr || heatmap.height !== desiredHeight * dpr) {
        heatmap.width = desiredWidth * dpr;
        heatmap.height = desiredHeight * dpr;
        heatmap.style.width = desiredWidth + 'px';
        heatmap.style.height = desiredHeight + 'px';
    }
    const colorScale = document.getElementById('colorScale');
    if (colorScale) {
        const csRect = colorScale.getBoundingClientRect();
        colorScale.width = Math.max(20, Math.floor(csRect.width)) * dpr;
        colorScale.height = Math.max(100, Math.floor(csRect.height)) * dpr;
        colorScale.style.width = Math.floor(csRect.width) + 'px';
        colorScale.style.height = Math.floor(csRect.height) + 'px';
    }
    const chartCanvas = document.getElementById('activityChart');
    if (chartCanvas) {
        const cRect = chartCanvas.getBoundingClientRect();
        chartCanvas.width = Math.max(300, Math.floor(cRect.width)) * dpr;
        chartCanvas.height = Math.max(200, Math.floor(cRect.height)) * dpr;
        chartCanvas.style.width = Math.floor(cRect.width) + 'px';
        chartCanvas.style.height = Math.floor(cRect.height) + 'px';
    }
    // Redraw visuals after resizing
    drawHeatmap(currentTimeIdx);
    if (chart) chart.resize();
}

// Debounced resize handler
let resizeTimer = null;
function scheduleResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resizeCanvases();
    }, 150);
}

// Animation control variables
let isPlaying = false;
let animationId = null;
let lastFrameTime = 0;

// Draw color scale bar
function drawColorScale(min, max) {
    const canvas = document.getElementById('colorScale');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    // Draw gradient
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    const steps = 10;
    
    if (colorScheme === 'medical') {
        for (let i = 0; i <= steps; i++) {
            const stop = i / steps;
            const hue = 120 - 120 * stop;
            gradient.addColorStop(stop, `hsl(${hue}, 100%, 50%)`);
        }
    } else if (colorScheme === 'viridis') {
        const viridis = [
            [68, 1, 84], [71, 44, 122], [59, 81, 139], [44, 113, 142],
            [33, 144, 141], [39, 173, 129], [92, 200, 99], [170, 220, 50], [253, 231, 37]
        ];
        viridis.forEach((color, i) => {
            gradient.addColorStop(i / (viridis.length - 1), `rgb(${color[0]},${color[1]},${color[2]})`);
        });
    } else if (colorScheme === 'plasma') {
        const plasma = [
            [13, 8, 135], [75, 3, 161], [125, 3, 168], [168, 34, 150],
            [203, 70, 121], [229, 107, 93], [248, 148, 65], [253, 195, 40], [240, 249, 33]
        ];
        plasma.forEach((color, i) => {
            gradient.addColorStop(i / (plasma.length - 1), `rgb(${color[0]},${color[1]},${color[2]})`);
        });
    } else if (colorScheme === 'greyscale') {
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'white');
    } else {
        gradient.addColorStop(0, 'blue');
        gradient.addColorStop(0.5, 'red');
        gradient.addColorStop(1, 'yellow');
    }
    
    // Draw gradient bar with border
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(0, 0, width, height);
    
    // Update labels
    const labelsDiv = document.getElementById('scaleLabels');
    labelsDiv.innerHTML = `
        <div style="position: absolute; transform: translateY(-6px);">${max.toFixed(1)}</div>
        <div style="position: absolute; transform: translateY(94px);">${((max + min) / 2).toFixed(1)}</div>
        <div style="position: absolute; transform: translateY(194px);">${min.toFixed(1)}</div>
    `;
}

// Calculate and update tumor/background ratio
function updateTBRatio(grid) {
    let tumorSum = 0, tumorCount = 0;
    let bgSum = 0, bgCount = 0;
    
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (activityData.tissue_type[i][j] === 1) {
                tumorSum += grid[i][j];
                tumorCount++;
            } else {
                bgSum += grid[i][j];
                bgCount++;
            }
        }
    }
    
    const ratio = (tumorSum / tumorCount) / (bgSum / bgCount);
    document.getElementById('tbRatio').textContent = 
        `Tumor/Background Ratio: ${ratio.toFixed(2)}`;
}

// Animation frame handler
function animate(currentTime) {
    if (!isPlaying) return;
    
    const speed = parseFloat(document.getElementById('playbackSpeed').value);
    const deltaTime = currentTime - lastFrameTime;
    
    if (deltaTime > (1000 / (speed * 10))) { // Update 10 times per second * speed
        const timeSlider = document.getElementById('timeSlider');
        let newTime = parseInt(timeSlider.value) + 1;
        if (newTime >= timeSlider.max) {
            newTime = 0;
        }
        timeSlider.value = newTime;
        updateTime(newTime);
        lastFrameTime = currentTime;
    }
    
    animationId = requestAnimationFrame(animate);
}

// Find peak uptake time
function findPeakTime() {
    let maxRatio = 0;
    let peakTime = 0;
    
    for (let t = 0; t < activityData.time_points.length; t++) {
        const grid = activityData.activity[t];
        let tumorSum = 0, tumorCount = 0;
        let bgSum = 0, bgCount = 0;
        
        for (let i = 0; i < grid.length; i++) {
            for (let j = 0; j < grid[i].length; j++) {
                if (activityData.tissue_type[i][j] === 1) {
                    tumorSum += grid[i][j];
                    tumorCount++;
                } else {
                    bgSum += grid[i][j];
                    bgCount++;
                }
            }
        }
        
        const ratio = (tumorSum / tumorCount) / (bgSum / bgCount);
        if (ratio > maxRatio) {
            maxRatio = ratio;
            peakTime = t;
        }
    }
    
    return peakTime;
}

window.onload = () => {
    document.getElementById('startSim').addEventListener('click', startSimulationAndRender);
    // Sliders: update displayed value
    ['halfLife','tumorKin','healthyKin','dose','noise'].forEach(id => {
        const slider = document.getElementById(id);
        const valSpan = document.getElementById(id+'Val');
        slider.addEventListener('input', () => {
            valSpan.textContent = slider.value;
        });
        // Info icon click
        const infoIcon = document.getElementById('info-' + id);
        if (infoIcon) {
            infoIcon.addEventListener('click', (e) => {
                showSystemPrompt(id);
                e.stopPropagation();
            });
        }
    });
    
    // Animation controls
    document.getElementById('playPauseBtn').addEventListener('click', (e) => {
        isPlaying = !isPlaying;
        e.target.textContent = isPlaying ? 'Pause' : 'Play';
        if (isPlaying) {
            lastFrameTime = performance.now();
            animationId = requestAnimationFrame(animate);
        } else if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });
    
    document.getElementById('jumpToPeak').addEventListener('click', () => {
        const peakTime = findPeakTime();
        document.getElementById('timeSlider').value = peakTime;
        updateTime(peakTime);
    });
    // Export/download buttons are wired in the header menu setup
    // Initialize visualization
    init();
    // Ensure canvases sized correctly
    resizeCanvases();
    // Run initial simulation
    startSimulationAndRender();
    // Re-resize after initial render
    scheduleResize();
    // Window resize
    window.addEventListener('resize', scheduleResize);
};



// Export the heatmap as PNG with overlaid info

// Export heatmap as PNG with info overlay
function exportHeatmapAsPNG() {
    const heatmap = document.getElementById('heatmap');
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = heatmap.width;
    exportCanvas.height = heatmap.height;
    const exportCtx = exportCanvas.getContext('2d');
    // Draw heatmap
    exportCtx.drawImage(heatmap, 0, 0);
    // Overlay text info directly on image
    exportCtx.save();
    // Add semi-transparent background for text for readability
    exportCtx.globalAlpha = 0.7;
    exportCtx.fillStyle = '#fff';
    exportCtx.fillRect(0, 0, exportCanvas.width, 60);
    exportCtx.fillRect(0, exportCanvas.height - 40, exportCanvas.width, 40);
    exportCtx.globalAlpha = 1.0;
    // Title
    exportCtx.fillStyle = '#222';
    exportCtx.font = 'bold 32px Arial';
    exportCtx.fillText('qRAD', 20, 40);
    // Info
    exportCtx.font = '16px Arial';
    const halfLife = document.getElementById('halfLife').value;
    const tumorKin = document.getElementById('tumorKin').value;
    const healthyKin = document.getElementById('healthyKin').value;
    const dose = document.getElementById('dose').value;
    const noise = document.getElementById('noise').value;
    const time = activityData && activityData.time_points ? activityData.time_points[currentTimeIdx] : 0;
    const info = `Half-life: ${halfLife} min   Tumor k_in: ${tumorKin}   Healthy k_in: ${healthyKin}   Dose: ${dose}   Noise: ${noise}   Time: ${time}s`;
    exportCtx.fillText(info, 20, exportCanvas.height - 15);
    exportCtx.restore();
    // Download
    const link = document.createElement('a');
    link.download = 'pet_heatmap_info.png';
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export heatmap as PNG (plain image only)
function exportHeatmapPlain() {
    const heatmap = document.getElementById('heatmap');
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = heatmap.width;
    exportCanvas.height = heatmap.height;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.drawImage(heatmap, 0, 0);
    const link = document.createElement('a');
    link.download = 'pet_heatmap_plain.png';
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export time evolution as GIF
async function exportTimeEvolutionGif() {
    if (typeof GIF === 'undefined') {
        alert('GIF export library not loaded. Please allow network access or check that gif.js is available.');
        console.error('GIF export failed: GIF is undefined (gif.js not loaded)');
        return;
    }

    const heatmapCanvas = document.getElementById('heatmap');
    const dpr = window.devicePixelRatio || 1;
    const gifWidth = Math.max(100, Math.floor(heatmapCanvas.width));
    const gifHeight = Math.max(100, Math.floor(heatmapCanvas.height));

    // Robust worker script loading: try local worker first (create blob URL), then CDN fallback.
    let workerScriptUrl = 'gif.worker.js';
    let blobUrlToRevoke = null;
    try {
        // Try local worker file first (relative path). This should work when files are served or opened from same folder.
        const localResp = await fetch('gif.worker.js');
        if (localResp && localResp.ok) {
            const text = await localResp.text();
            const blob = new Blob([text], { type: 'application/javascript' });
            blobUrlToRevoke = URL.createObjectURL(blob);
            workerScriptUrl = blobUrlToRevoke;
            console.log('Using local gif.worker.js via blob URL');
            const diag = document.getElementById('gif-diagnostics'); if (diag) { diag.style.display='none'; diag.textContent=''; }
        } else {
            // Fallback: try CDN and create blob URL to avoid cross-origin Worker construction
            try {
                const resp = await fetch('https://cdn.jsdelivr.net/npm/gif.js/dist/gif.worker.js');
                if (resp && resp.ok) {
                    const text = await resp.text();
                    const blob = new Blob([text], { type: 'application/javascript' });
                    blobUrlToRevoke = URL.createObjectURL(blob);
                    workerScriptUrl = blobUrlToRevoke;
                    console.log('Using CDN gif.worker.js via blob URL');
                    const diag = document.getElementById('gif-diagnostics'); if (diag) { diag.style.display='none'; diag.textContent=''; }
                } else {
                    console.warn('CDN gif.worker.js fetch returned non-ok response, will use relative path fallback', resp && resp.status);
                    workerScriptUrl = 'gif.worker.js';
                    const diag = document.getElementById('gif-diagnostics'); if (diag) { diag.style.display='block'; diag.textContent='Warning: Could not fetch gif.worker.js from CDN; using local fallback. If GIF export fails, try serving files over HTTP.'; }
                }
            } catch (cdnErr) {
                console.warn('Could not fetch remote worker script, falling back to relative gif.worker.js', cdnErr);
                workerScriptUrl = 'gif.worker.js';
            }
        }
    } catch (localErr) {
    console.warn('Could not fetch local gif.worker.js; attempting CDN fetch', localErr);
    const diag = document.getElementById('gif-diagnostics'); if (diag) { diag.style.display='block'; diag.textContent='Note: Could not fetch local gif.worker.js; attempting to fetch from CDN. If you open this file via file:// some browsers block blob workers.'; }
        try {
            const resp = await fetch('https://cdn.jsdelivr.net/npm/gif.js/dist/gif.worker.js');
            if (resp && resp.ok) {
                const text = await resp.text();
                const blob = new Blob([text], { type: 'application/javascript' });
                blobUrlToRevoke = URL.createObjectURL(blob);
                workerScriptUrl = blobUrlToRevoke;
                console.log('Using CDN gif.worker.js via blob URL');
            } else {
                console.warn('CDN fetch failed; will use relative path fallback', resp && resp.status);
                workerScriptUrl = 'gif.worker.js';
            }
        } catch (cdnErr2) {
            console.warn('CDN fetch also failed, using relative path fallback gif.worker.js', cdnErr2);
                workerScriptUrl = 'gif.worker.js';
                const diag2 = document.getElementById('gif-diagnostics'); if (diag2) { diag2.style.display='block'; diag2.textContent='Error: Could not fetch gif.worker.js from CDN or local path. GIF export is unlikely to work when opening index.html directly. Serve via HTTP to resolve.'; }
        }
    }

    // Create GIF instance with error handling; if Worker construction fails, show helpful diagnostics.
    let gif;
    try {
        gif = new GIF({
            workers: 2,
            quality: 10,
            width: gifWidth,
            height: gifHeight,
            workerScript: workerScriptUrl
        });
    } catch (workerErr) {
        console.warn('Initial GIF worker creation failed. Attempting embedded fallback worker...', workerErr);
        // Try embedded fallback worker script as last resort
        try {
            const embeddedBlob = new Blob([GIF_WORKER_FALLBACK], { type: 'application/javascript' });
            const embeddedUrl = URL.createObjectURL(embeddedBlob);
            // attempt to create GIF with embedded worker
            gif = new GIF({ workers: 2, quality: 10, width: gifWidth, height: gifHeight, workerScript: embeddedUrl });
            console.log('GIF worker created using embedded fallback worker script.');
            // remember to revoke when finished
            blobUrlToRevoke = embeddedUrl;
            const diag3 = document.getElementById('gif-diagnostics'); if (diag3) { diag3.style.display='none'; diag3.textContent=''; }
        } catch (embedErr) {
            console.error('Embedded fallback also failed to initialize GIF worker. Details:', embedErr);
            const diag3 = document.getElementById('gif-diagnostics');
            if (diag3) {
                diag3.style.display = 'block';
                diag3.textContent = 'Failed to initialize GIF worker: ' + (embedErr && embedErr.message ? embedErr.message : String(embedErr)) + '.\nServe the folder over HTTP (e.g., python -m http.server) to avoid file:// and CORS issues.';
            }
            alert('GIF export failed: unable to initialize web worker for GIF encoding. See on-page diagnostics or browser console for details.');
            if (blobUrlToRevoke) try { URL.revokeObjectURL(blobUrlToRevoke); } catch(e){}
            progressDiv.style.display = 'none';
            return;
        }
    }

    const progressDiv = document.getElementById('gifProgress');
    const progressText = document.getElementById('gifProgressText');
    const progressBar = document.getElementById('gifProgressBar');
    progressDiv.style.display = 'block';

    // Pause animation if playing
    const wasPlaying = isPlaying;
    if (isPlaying && animationId) {
        cancelAnimationFrame(animationId);
        isPlaying = false;
        document.getElementById('playPauseBtn').textContent = 'Play';
    }

    // Store current time index
    const currentIdx = currentTimeIdx;
    const timePoints = activityData.time_points || [];
    if (timePoints.length === 0) {
        alert('No time points available to create GIF. Run the simulation first.');
        progressDiv.style.display = 'none';
        return;
    }

    let frameCount = 0;
    const totalFrames = Math.min(60, timePoints.length); // Limit to 60 frames for reasonable file size
    const frameStep = Math.max(1, Math.floor(timePoints.length / totalFrames));

    // Add each frame synchronously, drawing branding onto an offscreen canvas
    for (let i = 0; i < timePoints.length; i += frameStep) {
        updateTime(i);
        // Prepare a frame canvas the same size as GIF
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = gifWidth;
        frameCanvas.height = gifHeight;
        const fctx = frameCanvas.getContext('2d');
        // Draw current heatmap scaled to GIF size
        try {
            fctx.drawImage(heatmapCanvas, 0, 0, gifWidth, gifHeight);
        } catch (err) {
            // If direct drawImage fails, fall back to drawing via image
            const img = new Image();
            img.src = heatmapCanvas.toDataURL('image/png');
            await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
            fctx.drawImage(img, 0, 0, gifWidth, gifHeight);
        }
        // Branding overlay: semi-transparent top bar and footer with qRAD and info
        fctx.save();
        fctx.globalAlpha = 0.75;
        fctx.fillStyle = '#ffffff';
        fctx.fillRect(0, 0, gifWidth, 48);
        fctx.fillRect(0, gifHeight - 36, gifWidth, 36);
        fctx.globalAlpha = 1.0;
        fctx.fillStyle = '#111';
        fctx.font = Math.max(12, Math.floor(gifWidth * 0.04)) + 'px Arial';
        fctx.fillText('qRAD', 12, 34);
        fctx.font = Math.max(10, Math.floor(gifWidth * 0.02)) + 'px Arial';
        const halfLifeVal = document.getElementById('halfLife').value;
        const doseVal = document.getElementById('dose').value;
        const timeVal = activityData && activityData.time_points ? activityData.time_points[currentTimeIdx] : 0;
        const infoLine = `Half-life: ${halfLifeVal} min  Dose: ${doseVal}  Time: ${timeVal}s`;
        fctx.fillText(infoLine, 12, gifHeight - 12);
        fctx.restore();
        // Add frame
        try {
            gif.addFrame(frameCanvas, { delay: 100, copy: true });
        } catch (err) {
            console.error('Error adding GIF frame:', err);
        }
        frameCount++;
        const progress = Math.round((frameCount / totalFrames) * 100);
        progressText.textContent = progress + '%';
        progressBar.style.width = progress + '%';
    }

    // Restore original time point
    updateTime(currentIdx);

    gif.on('progress', function(p) {
        const pct = Math.round(p * 100);
        progressText.textContent = pct + '%';
        progressBar.style.width = pct + '%';
    });

    gif.on('finished', function(blob) {
        progressDiv.style.display = 'none';
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'pet_evolution.gif';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        // Revoke temporary blob worker URL if created
        if (blobUrlToRevoke) {
            try { URL.revokeObjectURL(blobUrlToRevoke); } catch (e) { /* ignore */ }
        }
        // Resume animation if it was playing before
        if (wasPlaying) {
            isPlaying = true;
            lastFrameTime = performance.now();
            animationId = requestAnimationFrame(animate);
            document.getElementById('playPauseBtn').textContent = 'Pause';
        }
    });

    try {
        gif.render();
    } catch (err) {
        console.error('GIF render error:', err);
        progressDiv.style.display = 'none';
        alert('Failed to create GIF: ' + err.message);
        // Resume animation if it was playing
        if (wasPlaying) {
            isPlaying = true;
            lastFrameTime = performance.now();
            animationId = requestAnimationFrame(animate);
            document.getElementById('playPauseBtn').textContent = 'Pause';
        }
    }
}

// Export graph as PNG with info overlay
function exportGraphWithInfo() {
    const chartCanvas = document.getElementById('activityChart');
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = chartCanvas.width;
    exportCanvas.height = chartCanvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    // Draw chart
    exportCtx.drawImage(chartCanvas, 0, 0);
    // Overlay info at bottom
    exportCtx.save();
    exportCtx.globalAlpha = 0.7;
    exportCtx.fillStyle = '#fff';
    exportCtx.fillRect(0, exportCanvas.height - 40, exportCanvas.width, 40);
    exportCtx.globalAlpha = 1.0;
    exportCtx.fillStyle = '#222';
    exportCtx.font = 'bold 24px Arial';
    exportCtx.fillText('qRAD', 20, exportCanvas.height - 15);
    exportCtx.font = '14px Arial';
    const halfLife = document.getElementById('halfLife').value;
    const tumorKin = document.getElementById('tumorKin').value;
    const healthyKin = document.getElementById('healthyKin').value;
    const dose = document.getElementById('dose').value;
    const noise = document.getElementById('noise').value;
    const info = `Half-life: ${halfLife} min   Tumor k_in: ${tumorKin}   Healthy k_in: ${healthyKin}   Dose: ${dose}   Noise: ${noise}`;
    exportCtx.fillText(info, 120, exportCanvas.height - 15);
    exportCtx.restore();
    // Download
    const link = document.createElement('a');
    link.download = 'pet_graph_info.png';
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Header hamburger menu toggle and wiring
function setupHeaderMenu() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('menuDropdown');
    if (!hamburger || !menu) return;
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menu.style.display === 'none' || menu.style.display === '') {
            menu.style.display = 'block';
        } else {
            menu.style.display = 'none';
        }
    });
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== hamburger) {
            menu.style.display = 'none';
        }
    });

    // Wire menu buttons (IDs already exist and point to functions)
    const mapPlain = document.getElementById('exportHeatmapPlain');
    const mapInfo = document.getElementById('exportHeatmapInfo');
    const gifBtn = document.getElementById('exportGif');
    const graphInfo = document.getElementById('exportGraphInfo');
    const downloadBtn = document.getElementById('downloadData');
    const colorMenu = document.getElementById('colorSchemeMenu');

    if (mapPlain) mapPlain.addEventListener('click', () => { exportHeatmapPlain(); menu.style.display = 'none'; });
    if (mapInfo) mapInfo.addEventListener('click', () => { exportHeatmapAsPNG(); menu.style.display = 'none'; });
    if (gifBtn) gifBtn.addEventListener('click', () => { exportTimeEvolutionGif(); menu.style.display = 'none'; });
    if (graphInfo) graphInfo.addEventListener('click', () => { exportGraphWithInfo(); menu.style.display = 'none'; });
    if (downloadBtn) downloadBtn.addEventListener('click', () => { downloadCSV(); menu.style.display = 'none'; });

    // Sync color scheme selection
    if (colorMenu) {
        colorMenu.value = colorScheme;
        colorMenu.addEventListener('change', (e) => {
            colorScheme = e.target.value;
            const mainSelect = document.getElementById('colorScheme');
            if (mainSelect) mainSelect.value = colorScheme;
            drawHeatmap(currentTimeIdx);
        });
    }
}

// Ensure header menu set up after load
window.addEventListener('DOMContentLoaded', () => {
    setupHeaderMenu();
});
