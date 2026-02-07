const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
let rules = [];
let baseImg = new Image();
let originalData = null;
let isDragging = false;
let renderPending = false;
let groupLeaderId = null;
const gradientCache = new Map();

// --- Universal Loaders ---
window.addEventListener('paste', e => {
    const item = Array.from(e.clipboardData.items).find(x => x.type.startsWith('image'));
    if (item) { 
        const reader = new FileReader(); 
        reader.onload = ev => initImage(ev.target.result); 
        reader.readAsDataURL(item.getAsFile()); 
    }
});

function loadUrl() { 
    const url = document.getElementById('urlInput').value; 
    if(url) initImage(url); 
}

document.getElementById('upload').onchange = e => {
    const reader = new FileReader(); 
    reader.onload = ev => initImage(ev.target.result); 
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

function initImage(src) {
    baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.onload = () => {
        canvas.width = baseImg.width; canvas.height = baseImg.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImg, 0, 0);
        originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        gradientCache.clear();
        if(rules.length === 0) addRule("#ffffff");
        requestRender();
    };
    baseImg.src = src;
}

// --- Rule Management ---
function addRule(hex) {
    const id = Date.now() + Math.random();
    rules.push({ id, targetHex: hex, tolerance: 30, c1: '#6366f1', c2: '#ec4899', type: 'linear', angle: 45, isGrouped: false, isMirrored: false });
    if (!groupLeaderId) groupLeaderId = id;
    renderUI(); 
    requestRender();
}

function setLeader(id) { 
    groupLeaderId = id; 
    renderUI(); 
    requestRender(); 
}

function requestRender() { 
    if (!renderPending) { 
        renderPending = true; 
        requestAnimationFrame(() => { 
            renderCanvas(); 
            renderPending = false; 
        }); 
    } 
}

function updateRule(id, key, value) { 
    const r = rules.find(r => r.id === id); 
    if (r) { 
        r[key] = value; 
        if(key === 'isGrouped') renderUI(); 
        requestRender(); 
    } 
}

function removeRule(id) { 
    rules = rules.filter(r => r.id !== id); 
    if (groupLeaderId === id) groupLeaderId = rules[0]?.id; 
    renderUI(); 
    requestRender(); 
}

// --- Processing Logic ---
function getCachedGrad(rule, width, height) {
    const key = `${rule.c1}-${rule.c2}-${rule.type}-${rule.angle}-${rule.isMirrored}-${width}-${height}`;
    if (gradientCache.has(key)) return gradientCache.get(key);
    
    const b = document.createElement('canvas'); b.width = width; b.height = height;
    const bc = b.getContext('2d');
    let g;
    
    if(rule.type === 'linear'){
        const rad = rule.angle * Math.PI/180;
        g = bc.createLinearGradient(0,0, Math.cos(rad)*width, Math.sin(rad)*height);
    } else {
        g = bc.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
    }
    
    g.addColorStop(0, rule.c1);
    if(rule.isMirrored) { 
        g.addColorStop(0.5, rule.c2); 
        g.addColorStop(1, rule.c1); 
    } else { 
        g.addColorStop(1, rule.c2); 
    }
    
    bc.fillStyle = g; bc.fillRect(0,0,width,height);
    const data = bc.getImageData(0,0,width,height).data;
    gradientCache.set(key, data);
    return data;
}

function hexToRgb(hex) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return res ? [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16)] : [0,0,0];
}

function renderCanvas() {
    if (!originalData) return;
    const width = canvas.width;
    const height = canvas.height;
    const out = new ImageData(new Uint8ClampedArray(originalData.data), width, height);
    const data = out.data;
    
    const bgMode = document.getElementById('bgMode').value;
    const bgRepl = hexToRgb(document.getElementById('bgReplacementColor').value);
    const corner = [originalData.data[0], originalData.data[1], originalData.data[2]];

    const dLock = document.getElementById('detailLock').value / 100;
    const fx = document.getElementById('fxType').value;
    const fxD = parseInt(document.getElementById('fxDepth').value);
    const surface = document.getElementById('surfaceType').value;
    const sInt = document.getElementById('sInt').value / 100;
    const sAng = document.getElementById('sAngle').value * Math.PI / 180;

    const leader = rules.find(r => r.id === groupLeaderId) || rules[0] || { c1: '#000', c2: '#fff', type: 'linear', angle: 45, isMirrored: false };
    const globalGrad = getCachedGrad(leader, width, height);

    const preparedRules = rules.map(r => ({
        target: hexToRgb(r.targetHex),
        tolSq: r.tolerance * r.tolerance,
        grad: r.isGrouped ? globalGrad : getCachedGrad(r, width, height)
    }));

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        
        if (bgMode !== 'keep') {
            const distSq = Math.pow(r-corner[0],2) + Math.pow(g-corner[1],2) + Math.pow(b-corner[2],2);
            if (distSq < 900 || a < 10) {
                if (bgMode === 'remove') { data[i+3] = 0; continue; }
                else { data[i]=bgRepl[0]; data[i+1]=bgRepl[1]; data[i+2]=bgRepl[2]; data[i+3]=255; continue; }
            }
        }

        for (let j = 0; j < preparedRules.length; j++) {
            const pr = preparedRules[j];
            const rD = r-pr.target[0], gD = g-pr.target[1], bD = b-pr.target[2];
            
            if ((rD*rD + gD*gD + bD*bD) < pr.tolSq) {
                const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
                let fR = pr.grad[i], fG = pr.grad[i+1], fB = pr.grad[i+2];
                
                const detailFactor = 1 + (lum - 0.5) * dLock;
                fR *= detailFactor; fG *= detailFactor; fB *= detailFactor;

                if (fx !== 'none') {
                    const offset = fxD * 4;
                    const prevA = data[i - offset] || 0;
                    const nextA = data[i + offset] || 0;
                    const shadow = (prevA - nextA) * (fx === 'bevel' ? 0.2 : -0.2);
                    fR += shadow; fG += shadow; fB += shadow;
                }

                if (surface !== 'flat') {
                    const px = (i/4) % width;
                    const py = (i/4) / width;
                    const rotX = px * Math.cos(sAng) - py * Math.sin(sAng);
                    let h = 0;
                    if (surface === 'glossy') h = Math.pow(Math.abs(Math.sin(rotX * 0.01)), 40) * 200 * sInt;
                    else if (surface === 'metallic') h = (Math.sin(rotX * 0.9) * 20) * sInt;
                    fR += h; fG += h; fB += h;
                }

                data[i] = Math.max(0, Math.min(255, fR));
                data[i+1] = Math.max(0, Math.min(255, fG));
                data[i+2] = Math.max(0, Math.min(255, fB));
                break;
            }
        }
    }
    ctx.putImageData(out, 0, 0);
}

function renderUI() {
    const container = document.getElementById('rulesContainer');
    container.innerHTML = '';
    rules.forEach(rule => {
        const isLeader = groupLeaderId === rule.id;
        const card = document.createElement('div');
        card.className = `rule-card ${rule.isGrouped ? 'is-grouped' : ''} ${isLeader ? 'is-leader' : ''}`;
        card.innerHTML = `
            <button class="remove-btn" onclick="removeRule(${rule.id})">×</button>
            <div class="flex">
                <button class="leader-btn ${isLeader?'active':''}" onclick="setLeader(${rule.id})">${isLeader?'Current Leader':'Set Leader'}</button>
                <select onchange="updateRule(${rule.id}, 'isGrouped', this.value==='true')" style="font-size:10px">
                    <option value="false" ${!rule.isGrouped?'selected':''}>Separate Style</option>
                    <option value="true" ${rule.isGrouped?'selected':''}>Follow Leader</option>
                </select>
            </div>
            <div class="flex">
                <input type="color" value="${rule.targetHex}" oninput="updateRule(${rule.id}, 'targetHex', this.value)">
                <div style="flex:1"><label>Match Range</label>
                <input type="range" min="0" max="150" value="${rule.tolerance}" oninput="updateRule(${rule.id}, 'tolerance', parseInt(this.value))"></div>
            </div>
            <div style="${rule.isGrouped && !isLeader ? 'opacity:0.2; pointer-events:none' : ''}">
                <div class="flex">
                    <input type="color" value="${rule.c1}" oninput="updateRule(${rule.id}, 'c1', this.value)">
                    <input type="color" value="${rule.c2}" oninput="updateRule(${rule.id}, 'c2', this.value)">
                    <select onchange="updateRule(${rule.id}, 'type', this.value)">
                        <option value="linear" ${rule.type==='linear'?'selected':''}>Lin</option>
                        <option value="radial" ${rule.type==='radial'?'selected':''}>Rad</option>
                    </select>
                </div>
                <label>Gradient Angle: ${rule.angle}°</label>
                <input type="range" min="0" max="360" value="${rule.angle}" oninput="updateRule(${rule.id}, 'angle', parseInt(this.value))">
                <div class="flex"><label>Mirror Mode (A-B-A):</label><input type="checkbox" ${rule.isMirrored?'checked':''} onchange="updateRule(${rule.id}, 'isMirrored', this.checked)" style="width:20px"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Interaction ---
canvas.addEventListener('mousedown', e => { isDragging = true; pick(e); });
canvas.addEventListener('mousemove', e => { if(isDragging) pick(e); });
window.addEventListener('mouseup', () => isDragging = false);

function pick(e) {
    if (!originalData) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    const idx = (y * canvas.width + x) * 4;
    const hex = "#" + ((1 << 24) + (originalData.data[idx] << 16) + (originalData.data[idx+1] << 8) + originalData.data[idx+2]).toString(16).slice(1);
    if (!rules.some(r => r.targetHex === hex)) addRule(hex);
}

function download() {
    const link = document.createElement('a');
    link.download = 'surface-lab-elite.png';
    link.href = canvas.toDataURL("image/png");
    link.click();
}
