// Niruma Aluminum Profile Optimizer - Main App Logic

// ============================================================================
// HARDWARE MASTER CONFIGURATION
// ============================================================================

// ============================================================================
// HARDWARE MASTER CONFIGURATION
// ============================================================================

let hardwareMaster = {}; // Populated from Supplier Registry

// Global data store
let windows = [];
let seriesFormulas = {};
let stockMaster = {};
let stockRates = {}; // Store rate per series (₹/kg)
let optimizationResults = null;
let projectSettings = {}; // Global per-project configuration
let kerf = 0.125;

// Config ID counters for Windows and Doors
let windowCounter = 1;
let doorCounter = 1;

// Get next config ID based on category
function getNextConfigId(category) {
    if (category === 'Door') {
        return 'D' + String(doorCounter).padStart(2, '0');
    } else {
        return 'W' + String(windowCounter).padStart(2, '0');
    }
}

// Increment counter after adding
function incrementConfigCounter(category) {
    if (category === 'Door') {
        doorCounter++;
    } else {
        windowCounter++;
    }
    // Save counters
    localStorage.setItem('windowCounter', windowCounter);
    localStorage.setItem('doorCounter', doorCounter);
}

let aluminumRate = 280;
let unitMode = 'inch';

// New: Rate & Price configuration
let ratesConfig = {
    glass: {
        'toughened_5mm': 85,
        'non_toughened_5mm': 65,
        'toughened_6mm': 110,
        'non_toughened_6mm': 80,
        'toughened_8mm': 145,
        'non_toughened_8mm': 105,
        'DGU_toughened_5mm': 220,
        'DGU_non_toughened_5mm': 180
    },
    powderCoating: {
        '3/4" Handle': 27.66,
        '3/4" Interlock': 34.62,
        '3/4" Bearing Bottom': 21.94,
        '3/4" Middle': 32.48,
        '3/4" 2 track bottom': 69.48,
        '3/4" 2 track top': 62.46,
        '3/4" 3 track bottom': 93.78,
        '3/4" 3 track top': 79.8,
        '3/4" 4 track bottom': 117.96,
        '3/4" 4 track top': 100.62,
        // v1.36: 1" series rates updated to match current shop rates (₹/ft)
        '1" Handle': 11.7,
        '1" Interlock': 16.12,
        '1" Bearing Bottom': 13.1,
        '1" Middle': 13.1,
        '1" 2 track top': 19.9,
        '1" 2 track bottom': 28.25,
        '1" 3 track top': 31.3,
        '1" 3 track bottom': 33.35,
        '1" 4 track top': 42.25,
        '1" 4 track bottom': 45.25,
        // v1.37: Domal series rates updated to current shop rates (₹/ft)
        'Domal Shutter': 18.80,
        'Domal Clip': 8.12,
        'Domal 2 Track': 16.0,
        'Domal 3 Track': 29.5,
        'Domal 4 Track': 41.5,
        'Single Track Top': 33.0,
        'Single Track Bottom': 36.0,
        'Vitco 19mm': 35.0,
        'Vitco 25mm': 45.0,
        // v1.36: C Channel rates updated, added 12mm variant
        'C Channel 25mm': 5.0,
        'C Channel 50mm': 5.0,
        'C Channel 12mm': 4.15,
        // Door series — size-specific rates (₹ per running foot)
        'Door Glazing Clip':        3.5,
        'Tips Vertical':            15.0,
        'Door Leg Partition':       15.2,
        'Door Vertical 45mm':       14.89,
        'Door Vertical 85mm':       19.26,
        'Door Middle Single 45mm':  14.89,
        'Door Middle Double 45mm':  14.89,
        'Door Middle Double 85mm':  19.26,
        'Door Top 45mm':            14.95,
        'Door Top 85mm':            19.25,
        'Door Bottom 45mm':         15.0,
        'Door Bottom 85mm':         20.0,
        'Door Bottom 115mm':        22.47
    },
    global: {
        'glassOffset': 1.5,
        'rubberRate': 5
    },
    // Per-series glass offsets (inches subtracted from shutter piece lengths to get glass pane size).
    // shutterHDesc / shutterWDesc = formula 'desc' value that identifies the shutter vertical/horizontal piece.
    // offsetW / offsetH applied to those derived lengths.
    // msOffsetW / msOffsetH for mosquito shutters (null = no glass for MS).
    glassOffsets: {
        '3/4"':       { offsetW: 1.5,  offsetH: 1.5,  shutterHDesc: 'Handles',           shutterWDesc: 'Bearing Bottom',       msOffsetW: null, msOffsetH: null },
        '1"':         { offsetW: 1.5,  offsetH: 1.5,  shutterHDesc: 'Handles',           shutterWDesc: 'Bearing Bottom',       msOffsetW: null, msOffsetH: null },
        '27mm Domal': { offsetW: 4.25, offsetH: 4.25, shutterHDesc: 'Shutter Verticals', shutterWDesc: 'Shutter Horizontals',  msOffsetW: null, msOffsetH: null },
        'Door':       { offsetW: 2.0,  offsetH: 2.0,  shutterHDesc: 'Vertical Handle',   shutterWDesc: 'Door Top',             msOffsetW: null, msOffsetH: null }
    },
    // Non-glass partition material rates for doors (₹ per sqft).
    // Keys are "<Material>_<thickness>mm" or just "<Material>" for materials
    // without thickness variants (MosquitoNet, SSMosquito, Louvers).
    partitionRates: {
        'ACP_3mm':            0,
        'ACP_4mm':            0,
        'ACP_6mm':            0,
        'Bakelite_2.5mm':     0,
        'Bakelite_4mm':       0,
        'Bakelite_6mm':       0,
        'MosquitoNet':        0,
        'SSMosquito':         0,
        'Louvers':            0,
        'ParticleBoard_12mm': 0,
        'ParticleBoard_18mm': 0,
        'PartitionSheet_3mm': 0,
        'PartitionSheet_4mm': 0
    },
    // SS Mosquito Net Roll Stock — 4 standard widths × 50' (600") rolls
    // costPerRoll: ₹ per full roll (update to current market price)
    netStock: [
        { name: "2' (24\")",  width: 24, length: 600, costPerRoll: 0 },
        { name: "3' (36\")",  width: 36, length: 600, costPerRoll: 0 },
        { name: "4' (48\")",  width: 48, length: 600, costPerRoll: 0 },
        { name: "5' (60\")",  width: 60, length: 600, costPerRoll: 0 }
    ],
    // Net deductions per series: subtract from shutter frame piece dimensions
    // to get the net piece size (both width and height, in inches)
    netDeductions: {
        '27mm Domal': { deductW: 2, deductH: 2 }
    },
    // v1.26: which sheet sizes the user has in stock. Optimizer filters the
    // SHEET_CATALOG by this. Default: all enabled. Keys match catalog `name`.
    sheetAvailability: {
        ACP:           { "8'×4'": true, "10'×4'": true, "12'×4'": true },
        Bakelite:      { "8'×4'": true },
        ParticleBoard: { "8'×4'": true }
    }
};

const MM_TO_INCH = 1 / 25.4;   // exact (0.039370078740157...) — was 0.0393701, lost precision at 7th digit
const INCH_TO_MM = 25.4;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeDefaults() {
    // 1. Initialize Supplier Master Registry (Legacy & New Access)
    if (typeof initializeSupplierMaster === 'function') {
        initializeSupplierMaster();
    }

    // 1a. Restore saved ratesConfig from localStorage (custom items, edited rates)
    try {
        const savedRates = localStorage.getItem('ratesConfig');
        if (savedRates) {
            const parsed = JSON.parse(savedRates);
            // Merge: keep defaults for missing keys, override with saved
            if (parsed.glass)         Object.assign(ratesConfig.glass, parsed.glass);
            if (parsed.global)        Object.assign(ratesConfig.global, parsed.global);
            if (parsed.powderCoating) Object.assign(ratesConfig.powderCoating, parsed.powderCoating);
            if (parsed.partitionRates) Object.assign(ratesConfig.partitionRates, parsed.partitionRates);
            if (parsed.glassOffsets)  {
                // Deep merge so per-series desc fields are preserved alongside numeric offsets
                for (const [s, v] of Object.entries(parsed.glassOffsets)) {
                    ratesConfig.glassOffsets[s] = Object.assign(ratesConfig.glassOffsets[s] || {}, v);
                }
            }
            // Restore net stock (merge by roll width so new widths added to defaults survive)
            if (parsed.netStock && Array.isArray(parsed.netStock)) {
                parsed.netStock.forEach(savedRoll => {
                    const idx = ratesConfig.netStock.findIndex(r => r.width === savedRoll.width);
                    if (idx >= 0) Object.assign(ratesConfig.netStock[idx], savedRoll);
                    else ratesConfig.netStock.push(savedRoll);
                });
            }
            if (parsed.netDeductions) {
                for (const [s, v] of Object.entries(parsed.netDeductions)) {
                    ratesConfig.netDeductions[s] = Object.assign(ratesConfig.netDeductions[s] || {}, v);
                }
            }
            if (parsed.sheetAvailability) {
                // Deep merge per material so newly added sizes default to enabled
                for (const [mat, sizes] of Object.entries(parsed.sheetAvailability)) {
                    ratesConfig.sheetAvailability[mat] = Object.assign(
                        ratesConfig.sheetAvailability[mat] || {}, sizes
                    );
                }
            }
        }
    } catch (e) { console.warn('Could not restore ratesConfig:', e); }

    // 1b. Load Config ID counters from localStorage
    const savedWindowCounter = localStorage.getItem('windowCounter');
    const savedDoorCounter = localStorage.getItem('doorCounter');
    if (savedWindowCounter) windowCounter = parseInt(savedWindowCounter);
    if (savedDoorCounter) doorCounter = parseInt(savedDoorCounter);

    // 2. Fetch Aggregated Defaults from Registry
    const defaultFormulas = (typeof getAggregatedFormulas === 'function') ? getAggregatedFormulas() : {};
    const defaultStock = (typeof getAggregatedStockDefaults === 'function') ? getAggregatedStockDefaults() : {};
    const defaultHardware = (typeof getAggregatedHardware === 'function') ? getAggregatedHardware() : {};

    // 3. Populate Hardware Master
    // Start with registry defaults, then overlay any persisted user edits from localStorage.
    // (Door series is seeded by getDoorHardwareList() if still missing after this merge.)
    hardwareMaster = defaultHardware;
    try {
        const savedHardware = JSON.parse(localStorage.getItem('hardwareMaster') || 'null');
        if (savedHardware && typeof savedHardware === 'object') {
            for (const [series, items] of Object.entries(savedHardware)) {
                if (Array.isArray(items)) hardwareMaster[series] = items;
            }
        }
    } catch (e) { console.warn('Could not restore saved hardware master:', e); }
    // Seed Door series if missing (first-ever load, or older save predates this feature)
    if (typeof getDoorHardwareList === 'function') getDoorHardwareList();

    // ── Migrate existing saved doors (one-shot, silent) ────────────────────────
    // (a) Doors saved before v1.20 lack an explicit accessories array → seed defaults.
    // (b) Doors with ACP partitions before v1.20 lack acpFacing → default to 'single'.
    let doorMigrated = false;
    (windows || []).forEach(w => {
        if (w && w.series === 'Door') {
            if (w.accessories === undefined) {
                const cm = w.closingMechanism || 'Hinge';
                w.accessories = getDoorHardwareList()
                    .filter(it => (it.mechanism || 'both') === 'both' || (it.mechanism || 'both') === cm)
                    .map(it => ({ hardware: it.hardware, unit: it.unit, formula: it.formula, rate: it.rate }));
                doorMigrated = true;
            }
            if (w.upperPartition && w.upperPartition.material === 'ACP' && w.upperPartition.acpFacing === undefined) {
                w.upperPartition.acpFacing = 'single';
                doorMigrated = true;
            }
            if (w.lowerPartition && w.lowerPartition.material === 'ACP' && w.lowerPartition.acpFacing === undefined) {
                w.lowerPartition.acpFacing = 'single';
                doorMigrated = true;
            }
        }
    });
    if (doorMigrated) {
        autoSaveWindows();
        console.log('🚪 Migrated existing door(s): seeded accessories / acpFacing where missing.');
    }

    // 4. Initialize Series Formulas
    // Only initialize if no data loaded from storage, OR check if we need to add missing keys
    if (Object.keys(seriesFormulas).length === 0) {
        seriesFormulas = JSON.parse(JSON.stringify(defaultFormulas));
        autoSaveFormulas();
    } else {
        // Restore missing series keys if they exist in defaults but not in storage
        let updated = false;
        Object.keys(defaultFormulas).forEach(series => {
            if (!seriesFormulas[series]) {
                console.log(`Restoring missing formula series: ${series}`);
                seriesFormulas[series] = defaultFormulas[series];
                updated = true;
            }
        });

        // Always force-refresh 'Door' series from registry — Door formulas are
        // dynamically generated at optimization time, so the static display formulas
        // must always match the latest supplier file (never use stale localStorage version).
        if (defaultFormulas['Door']) {
            seriesFormulas['Door'] = JSON.parse(JSON.stringify(defaultFormulas['Door']));
            console.log('🚪 Door formulas force-refreshed from supplier registry');
            updated = true;
        }

        if (updated) autoSaveFormulas();
    }

    // 5. Initialize Stock Master
    if (Object.keys(stockMaster).length === 0) {
        stockMaster = JSON.parse(JSON.stringify(defaultStock));
        autoSaveStock();
    } else {
        // Ensure standard items exist (restore missing defaults)
        let updated = false;

        // Cleanup: Remove generic "Domal Track" if present (Legacy cleanup)
        if (stockMaster['Domal']) {
            const genericIdx = stockMaster['Domal'].findIndex(i => i.material === 'Domal Track');
            if (genericIdx !== -1) {
                console.log('Removing legacy Generic Domal Track');
                stockMaster['Domal'].splice(genericIdx, 1);
                updated = true;
            }
        }

        Object.entries(defaultStock).forEach(([series, items]) => {
            if (!stockMaster[series]) {
                stockMaster[series] = [];
            }

            items.forEach(defaultItem => {
                const exists = stockMaster[series].find(i => i.material === defaultItem.material);
                if (!exists) {
                    console.log(`Restoring missing stock item: ${series} - ${defaultItem.material}`);
                    stockMaster[series].push(defaultItem);
                    updated = true;
                }
            });
        });

        if (updated) {
            autoSaveStock();
        }
    }

    // Default Project Configuration if missing
    if (Object.keys(projectSettings).length === 0) {
        projectSettings = {
            projectName: "Default Project",
            clientName: "Guest",
            supplier: "" // Empty means Generic/Automatic
        };
    }
}




// ============================================================================
// RATE MANAGEMENT
// ============================================================================

function refreshRatesDisplay() {
    const pcContainer = document.getElementById('powderCoatingRatesList');
    if (!pcContainer) return;

    // Custom user categories saved in localStorage
    const customGroups = JSON.parse(localStorage.getItem('pcCustomGroups') || '[]');

    const groups = {
        '3/4" Series': [],
        '1" Series': [],
        'Domal Series': [],
        'Door Series': [],
        'C Channel & Misc': [],
        'Others': []
    };
    customGroups.forEach(g => { if (!groups[g]) groups[g] = []; });

    const classify = (comp) => {
        if (comp.startsWith('3/4"')) return '3/4" Series';
        if (comp.startsWith('1"')) return '1" Series';
        if (comp.startsWith('Domal') || /Domal/i.test(comp)) return 'Domal Series';
        if (/^Door\s/i.test(comp)) return 'Door Series';
        if (/C\s*Channel|Misc/i.test(comp)) return 'C Channel & Misc';
        for (const cg of customGroups) {
            if (comp.startsWith(cg)) return cg;
        }
        return 'Others';
    };

    Object.entries(ratesConfig.powderCoating).forEach(([comp, rate]) => {
        const g = classify(comp);
        (groups[g] = groups[g] || []).push({ comp, rate });
    });

    let html = '';
    Object.entries(groups).forEach(([groupName, items]) => {
        const safeId = 'pcg_' + groupName.replace(/[^a-z0-9]/gi, '_');
        html += `
            <details class="rate-group" style="margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px; background: white;" ${items.length > 0 ? '' : ''}>
                <summary style="padding: 12px 15px; cursor: pointer; font-weight: bold; background: #f8f9fa; border-radius: 8px; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    <span>✨ ${groupName}</span>
                    <span style="font-size: 0.8em; color: #666;">(${items.length} items)</span>
                </summary>
                <div class="rates-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; padding: 15px; border-top: 1px solid #eee;">
        `;
        items.forEach(item => {
            html += `
                <div class="form-group" style="background: #fdfdfd; padding: 10px; border: 1px solid #f0f0f0; border-radius: 6px; position:relative;">
                    <button type="button" title="Remove" onclick="removePowderCoatingItem('${item.comp.replace(/'/g, "\\'")}')" style="position:absolute; top:4px; right:4px; background:transparent; border:none; color:#c00; font-size:14px; cursor:pointer;">✕</button>
                    <label style="font-size: 0.85em; display: block; margin-bottom: 6px; color: #444; font-weight: 500; padding-right:16px;">${item.comp}</label>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #888; font-size: 0.9em;">₹</span>
                        <input type="number" step="0.01" class="pc-rate-input" data-component="${item.comp}" value="${item.rate}" style="width: 100%; padding: 6px 6px 6px 20px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>`;
        });
        // Add-item form for this group
        html += `
            <div style="grid-column: 1/-1; display:flex; gap:8px; padding-top:8px; border-top:1px dashed #eee; margin-top:6px;">
                <input type="text" id="${safeId}_name" placeholder="New item name (e.g. C Channel 25mm)" style="flex:2; padding:6px 8px; border:1px solid #ddd; border-radius:4px; font-size:13px;">
                <input type="number" id="${safeId}_rate" placeholder="₹ / ft" step="0.01" style="flex:1; padding:6px 8px; border:1px solid #ddd; border-radius:4px; font-size:13px;">
                <button type="button" class="btn btn-primary" onclick="addPowderCoatingItem('${groupName.replace(/'/g, "\\'")}', '${safeId}')" style="padding:6px 12px; font-size:12px;">+ Add</button>
            </div>`;
        html += `</div></details>`;
    });

    // Add-category form
    html += `
        <div style="margin-top:14px; padding:12px; background:#fffbe6; border:1px dashed #d6c069; border-radius:8px;">
            <strong style="font-size:13px;">➕ Add New Product Category</strong>
            <div style="display:flex; gap:8px; margin-top:8px;">
                <input type="text" id="pcNewCategory" placeholder="e.g. Sliding Door, Curtain Wall" style="flex:1; padding:6px 8px; border:1px solid #ddd; border-radius:4px;">
                <button type="button" class="btn btn-success" onclick="addPowderCoatingCategory()" style="padding:6px 14px; font-size:13px;">Create Category</button>
            </div>
            <small style="color:#806000;">Use the category name as the prefix when naming items so they auto-group (e.g. "Sliding Door Vertical").</small>
        </div>`;

    pcContainer.innerHTML = html;

    // Set other global and glass rates
    if (document.getElementById('rateGlassToughened')) {
        document.getElementById('rateGlassToughened').value = ratesConfig.glass['toughened_5mm'];
        document.getElementById('rateGlassNonToughened').value = ratesConfig.glass['non_toughened_5mm'];
        document.getElementById('glassOffset').value = ratesConfig.global['glassOffset'];
        document.getElementById('rateRubber').value = ratesConfig.global['rubberRate'];
    }

    renderGlassOffsetsList();
    renderPartitionRatesList();
    renderNetStockList();
    renderNetPartialRollsList();
    renderSheetPartialsList();
    renderSheetAvailabilityList();
}

// ── Sheet Availability (v1.26) ────────────────────────────────────────────
// Lets the user uncheck sheet sizes they don't keep in stock. Optimizer
// filters SHEET_CATALOG by this map before packing.
function renderSheetAvailabilityList() {
    const container = document.getElementById('sheetAvailabilityList');
    if (!container) return;

    if (!ratesConfig.sheetAvailability) ratesConfig.sheetAvailability = {};
    const av = ratesConfig.sheetAvailability;

    // Use SHEET_CATALOG from optimization.js as the source of truth for
    // what sizes EXIST. The toggle controls which are AVAILABLE.
    const catalog = (typeof SHEET_CATALOG !== 'undefined') ? SHEET_CATALOG : {
        ACP:           [{ name:"8'×4'", w:48, h:96 }, { name:"10'×4'", w:48, h:120 }, { name:"12'×4'", w:48, h:144 }],
        Bakelite:      [{ name:"8'×4'", w:48, h:96 }],
        ParticleBoard: [{ name:"8'×4'", w:48, h:96 }]
    };

    const MAT_TITLE = { ACP: 'ACP', Bakelite: 'Bakelite', ParticleBoard: 'Particle Board' };

    let html = '';
    Object.entries(catalog).forEach(([mat, sizes]) => {
        const matAv = av[mat] || (av[mat] = {});
        const title = MAT_TITLE[mat] || mat;

        html += `<div style="margin-bottom:12px;padding:10px 14px;background:#fffaf3;border:1px solid #ffe0b2;border-radius:6px;">
            <div style="font-weight:600;color:#bf360c;margin-bottom:6px;font-size:13px;">${title}</div>
            <div style="display:flex;flex-wrap:wrap;gap:14px;">`;
        sizes.forEach(sz => {
            // Default to enabled if not stored
            if (matAv[sz.name] === undefined) matAv[sz.name] = true;
            const checked = matAv[sz.name] ? 'checked' : '';
            const id = `sa_${mat}_${sz.name.replace(/[^a-z0-9]/gi, '_')}`;
            html += `<label for="${id}" style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                <input type="checkbox" id="${id}" ${checked}
                    data-material="${mat}" data-size="${sz.name}"
                    onchange="onSheetAvailabilityToggle(this)">
                <span>${sz.name} <span style="color:#999;font-size:11px;">(${sz.w}"×${sz.h}")</span></span>
            </label>`;
        });
        if (sizes.length === 1) {
            html += `<span style="color:#999;font-size:11px;font-style:italic;">(only one size in catalog)</span>`;
        }
        html += `</div></div>`;
    });

    container.innerHTML = html;
}

function onSheetAvailabilityToggle(cb) {
    const mat = cb.getAttribute('data-material');
    const sz  = cb.getAttribute('data-size');
    if (!ratesConfig.sheetAvailability[mat]) ratesConfig.sheetAvailability[mat] = {};
    ratesConfig.sheetAvailability[mat][sz] = cb.checked;
    autoSaveRates();
}

function saveSheetAvailability() {
    // Toggles already autosave via onSheetAvailabilityToggle; this button
    // is just for user reassurance.
    autoSaveRates();
    showAlert('✅ Sheet availability saved');
}

function renderPartitionRatesList() {
    const container = document.getElementById('partitionRatesList');
    if (!container) return;

    const pr = ratesConfig.partitionRates || {};
    const keys = Object.keys(pr).sort();

    // Group keys by material for nicer display
    const groups = {};
    keys.forEach(k => {
        const mat = k.split('_')[0];
        (groups[mat] = groups[mat] || []).push(k);
    });

    const rowStyle = 'display:grid; grid-template-columns:180px 130px 110px; gap:10px; align-items:center; padding:5px 0; border-bottom:1px solid #f0f0f0;';
    const hdrStyle = 'font-weight:600; font-size:11px; color:#555;';

    let html = `<p style="font-size:12px;color:#666;margin:0 0 10px 0;">
        Rates in ₹ per sqft for non-glass door partitions. Leave 0 if not applicable.
    </p>`;
    html += `<div style="${rowStyle}">
        <span style="${hdrStyle}">Material</span>
        <span style="${hdrStyle}">Thickness</span>
        <span style="${hdrStyle}">Rate (₹/sqft)</span>
    </div>`;

    Object.keys(groups).sort().forEach(mat => {
        groups[mat].forEach(key => {
            const thkPart = key.includes('_') ? key.split('_').slice(1).join('_') : '—';
            const safe = key.replace(/[^a-z0-9]/gi, '_');
            html += `<div style="${rowStyle}">
                <span style="font-size:12px;font-weight:500;">${mat}</span>
                <span style="font-size:12px;color:#666;">${thkPart}</span>
                <input type="number" id="prate_${safe}" data-key="${key}" value="${pr[key] || 0}" min="0" step="0.5"
                       class="partition-rate-input"
                       style="padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;">
            </div>`;
        });
    });

    container.innerHTML = html;
}

function savePartitionRates() {
    if (!ratesConfig.partitionRates) ratesConfig.partitionRates = {};
    document.querySelectorAll('.partition-rate-input').forEach(input => {
        const key = input.getAttribute('data-key');
        ratesConfig.partitionRates[key] = parseFloat(input.value) || 0;
    });
    autoSaveRates();
    showAlert('✅ Partition rates saved!');
}

// ── Net Stock UI ─────────────────────────────────────────────────────────────

function renderNetStockList() {
    const container = document.getElementById('netStockList');
    if (!container) return;

    const rolls = ratesConfig.netStock || [];
    const rowStyle = 'display:grid;grid-template-columns:100px 80px 80px 130px;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0;';
    const hdrStyle = 'font-weight:600;font-size:11px;color:#6c3483;';

    let html = `<div style="${rowStyle}">
        <span style="${hdrStyle}">Roll Width</span>
        <span style="${hdrStyle}">Length (ft)</span>
        <span style="${hdrStyle}">In Stock</span>
        <span style="${hdrStyle}">Cost / Roll (₹)</span>
    </div>`;

    rolls.forEach((roll, idx) => {
        html += `<div style="${rowStyle}">
            <span style="font-size:13px;font-weight:600;color:#6c3483;">${roll.name}</span>
            <span style="font-size:12px;color:#555;">${(roll.length/12).toFixed(0)} ft</span>
            <input type="checkbox" id="netRollInStock_${idx}" ${roll.inStock !== false ? 'checked' : ''}
                   title="Uncheck if this roll width is currently not available in stock"
                   style="width:20px;height:20px;cursor:pointer;">
            <input type="number" id="netRollCost_${idx}" value="${roll.costPerRoll || 0}" min="0" step="50"
                   style="padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;width:110px;"
                   placeholder="₹ per roll">
        </div>`;
    });

    container.innerHTML = html;
}

function saveNetStock() {
    const rolls = ratesConfig.netStock || [];
    rolls.forEach((roll, idx) => {
        const costEl    = document.getElementById(`netRollCost_${idx}`);
        const stockEl   = document.getElementById(`netRollInStock_${idx}`);
        if (costEl)  roll.costPerRoll = parseFloat(costEl.value) || 0;
        if (stockEl) roll.inStock     = stockEl.checked;
    });
    autoSaveRates();
    showAlert('✅ Net stock prices saved!');
}

// ── Net Partial Rolls (per-project, in-memory only — not persisted) ──────────

// Global in-memory list of partial rolls for the current session
window.netPartialRolls = window.netPartialRolls || [];

function renderNetPartialRollsList() {
    const container = document.getElementById('netPartialRollsList');
    if (!container) return;

    const rolls = window.netPartialRolls;
    const rowStyle = 'display:grid;grid-template-columns:130px 150px 80px 200px 50px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid #f0f0f0;';
    const hdrStyle = 'font-weight:600;font-size:11px;color:#1b5e20;';

    let html = `<div style="${rowStyle}">
        <span style="${hdrStyle}">Roll Width</span>
        <span style="${hdrStyle}">Remaining Length (")</span>
        <span style="${hdrStyle}">Qty</span>
        <span style="${hdrStyle}">Label (optional)</span>
        <span style="${hdrStyle}"></span>
    </div>`;

    if (rolls.length === 0) {
        html += `<div style="text-align:center;padding:20px 10px;color:#888;font-size:12px;font-style:italic;">
            No partial rolls added. Click "➕ Add Partial Roll" to enter leftover stock for this project.
        </div>`;
    } else {
        rolls.forEach((r, idx) => {
            html += `<div style="${rowStyle}">
                <select id="npr_width_${idx}" onchange="updateNetPartialRoll(${idx})" style="padding:5px 6px;border:1px solid #c8e6c9;border-radius:4px;font-size:13px;">
                    <option value="24" ${r.width===24?'selected':''}>2' (24")</option>
                    <option value="36" ${r.width===36?'selected':''}>3' (36")</option>
                    <option value="48" ${r.width===48?'selected':''}>4' (48")</option>
                    <option value="60" ${r.width===60?'selected':''}>5' (60")</option>
                </select>
                <input type="number" id="npr_len_${idx}" value="${r.remainingLength}" min="1" step="1"
                       onchange="updateNetPartialRoll(${idx})"
                       style="padding:5px 6px;border:1px solid #c8e6c9;border-radius:4px;font-size:13px;width:100%;"
                       placeholder="inches">
                <input type="number" id="npr_qty_${idx}" value="${r.qty}" min="1" step="1"
                       onchange="updateNetPartialRoll(${idx})"
                       style="padding:5px 6px;border:1px solid #c8e6c9;border-radius:4px;font-size:13px;width:60px;">
                <input type="text" id="npr_label_${idx}" value="${r.label || ''}"
                       onchange="updateNetPartialRoll(${idx})"
                       style="padding:5px 6px;border:1px solid #c8e6c9;border-radius:4px;font-size:12px;width:100%;"
                       placeholder="e.g. From Project X">
                <button onclick="deleteNetPartialRoll(${idx})"
                        style="background:#e74c3c;color:white;border:none;border-radius:4px;width:36px;height:30px;cursor:pointer;font-size:14px;">🗑️</button>
            </div>`;
        });

        // Summary line
        const totalRolls = rolls.reduce((s, r) => s + r.qty, 0);
        const totalLen   = rolls.reduce((s, r) => s + r.qty * r.remainingLength, 0);
        html += `<div style="margin-top:10px;padding:8px 12px;background:#f1f8f4;border-radius:6px;font-size:12px;color:#1b5e20;">
            <strong>Summary:</strong> ${totalRolls} partial roll${totalRolls>1?'s':''}, total ${totalLen.toFixed(0)}" (${(totalLen/12).toFixed(1)} ft) available.
        </div>`;
    }

    container.innerHTML = html;
}

function addNetPartialRoll() {
    window.netPartialRolls.push({
        width: 48,
        remainingLength: 200,
        qty: 1,
        label: ''
    });
    renderNetPartialRollsList();
}

function updateNetPartialRoll(idx) {
    const r = window.netPartialRolls[idx];
    if (!r) return;
    const wEl = document.getElementById(`npr_width_${idx}`);
    const lEl = document.getElementById(`npr_len_${idx}`);
    const qEl = document.getElementById(`npr_qty_${idx}`);
    const labEl = document.getElementById(`npr_label_${idx}`);
    if (wEl)  r.width           = parseInt(wEl.value, 10) || 48;
    if (lEl)  r.remainingLength = Math.max(1, parseFloat(lEl.value) || 0);
    if (qEl)  r.qty             = Math.max(1, parseInt(qEl.value, 10) || 1);
    if (labEl) r.label          = labEl.value.trim();
    renderNetPartialRollsList();
}

function deleteNetPartialRoll(idx) {
    if (idx < 0 || idx >= window.netPartialRolls.length) return;
    window.netPartialRolls.splice(idx, 1);
    renderNetPartialRollsList();
}

function clearNetPartialRolls() {
    if (window.netPartialRolls.length === 0) return;
    if (!confirm('Clear all partial rolls? This cannot be undone.')) return;
    window.netPartialRolls = [];
    renderNetPartialRollsList();
}

// ── Partial Sheets (ACP / Bakelite / Particle Board) ────────────────────────
window.sheetPartials = window.sheetPartials || [];

function renderSheetPartialsList() {
    const container = document.getElementById('sheetPartialsList');
    if (!container) return;

    const sheets = window.sheetPartials;
    const rowStyle = 'display:grid;grid-template-columns:130px 100px 100px 80px 180px 50px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #f0f0f0;';
    const hdrStyle = 'font-weight:600;font-size:11px;color:#bf360c;';

    let html = `<div style="${rowStyle}">
        <span style="${hdrStyle}">Material</span>
        <span style="${hdrStyle}">Width (")</span>
        <span style="${hdrStyle}">Height (")</span>
        <span style="${hdrStyle}">Qty</span>
        <span style="${hdrStyle}">Label (optional)</span>
        <span style="${hdrStyle}"></span>
    </div>`;

    if (sheets.length === 0) {
        html += `<div style="text-align:center;padding:20px 10px;color:#888;font-size:12px;font-style:italic;">
            No partial sheets added. Click "➕ Add Partial Sheet" to enter leftover stock for this project.
        </div>`;
    } else {
        sheets.forEach((s, idx) => {
            html += `<div style="${rowStyle}">
                <select id="sps_mat_${idx}" onchange="updateSheetPartial(${idx})" style="padding:5px 6px;border:1px solid #ffe0b2;border-radius:4px;font-size:12px;">
                    <option value="ACP"          ${s.material==='ACP'          ?'selected':''}>ACP</option>
                    <option value="Bakelite"      ${s.material==='Bakelite'     ?'selected':''}>Bakelite</option>
                    <option value="ParticleBoard" ${s.material==='ParticleBoard'?'selected':''}>Particle Board</option>
                </select>
                <input type="number" id="sps_w_${idx}" value="${s.w}" min="1" step="0.5"
                       onchange="updateSheetPartial(${idx})"
                       style="padding:5px 6px;border:1px solid #ffe0b2;border-radius:4px;font-size:13px;width:100%;">
                <input type="number" id="sps_h_${idx}" value="${s.h}" min="1" step="0.5"
                       onchange="updateSheetPartial(${idx})"
                       style="padding:5px 6px;border:1px solid #ffe0b2;border-radius:4px;font-size:13px;width:100%;">
                <input type="number" id="sps_qty_${idx}" value="${s.qty}" min="1" step="1"
                       onchange="updateSheetPartial(${idx})"
                       style="padding:5px 6px;border:1px solid #ffe0b2;border-radius:4px;font-size:13px;width:60px;">
                <input type="text" id="sps_label_${idx}" value="${s.label || ''}"
                       onchange="updateSheetPartial(${idx})"
                       style="padding:5px 6px;border:1px solid #ffe0b2;border-radius:4px;font-size:12px;width:100%;"
                       placeholder="e.g. From Project X">
                <button onclick="deleteSheetPartial(${idx})"
                        style="background:#e74c3c;color:white;border:none;border-radius:4px;width:36px;height:30px;cursor:pointer;font-size:14px;">🗑️</button>
            </div>`;
        });

        const totalSheets = sheets.reduce((s, r) => s + r.qty, 0);
        const totalArea   = sheets.reduce((s, r) => s + r.qty * r.w * r.h / 144, 0);
        html += `<div style="margin-top:10px;padding:8px 12px;background:#fff3e0;border-radius:6px;font-size:12px;color:#bf360c;">
            <strong>Summary:</strong> ${totalSheets} partial sheet${totalSheets>1?'s':''}, total area ${totalArea.toFixed(1)} sqft available.
        </div>`;
    }

    container.innerHTML = html;
}

function addSheetPartial() {
    window.sheetPartials.push({ material: 'ACP', w: 48, h: 48, qty: 1, label: '' });
    renderSheetPartialsList();
}

function updateSheetPartial(idx) {
    const s = window.sheetPartials[idx];
    if (!s) return;
    const mEl   = document.getElementById(`sps_mat_${idx}`);
    const wEl   = document.getElementById(`sps_w_${idx}`);
    const hEl   = document.getElementById(`sps_h_${idx}`);
    const qEl   = document.getElementById(`sps_qty_${idx}`);
    const labEl = document.getElementById(`sps_label_${idx}`);
    if (mEl)   s.material = mEl.value;
    if (wEl)   s.w        = Math.max(1, parseFloat(wEl.value) || 1);
    if (hEl)   s.h        = Math.max(1, parseFloat(hEl.value) || 1);
    if (qEl)   s.qty      = Math.max(1, parseInt(qEl.value, 10) || 1);
    if (labEl) s.label    = labEl.value.trim();
    renderSheetPartialsList();
}

function deleteSheetPartial(idx) {
    if (idx < 0 || idx >= window.sheetPartials.length) return;
    window.sheetPartials.splice(idx, 1);
    renderSheetPartialsList();
}

function clearSheetPartials() {
    if (window.sheetPartials.length === 0) return;
    if (!confirm('Clear all partial sheets? This cannot be undone.')) return;
    window.sheetPartials = [];
    renderSheetPartialsList();
}
// ─────────────────────────────────────────────────────────────────────────────

function renderGlassOffsetsList() {
    const container = document.getElementById('glassOffsetsList');
    if (!container) return;

    const allSeries = Object.keys(ratesConfig.glassOffsets || {});
    // Also include any series in stockMaster not yet in glassOffsets
    Object.keys(stockMaster || {}).forEach(s => { if (!allSeries.includes(s)) allSeries.push(s); });

    if (allSeries.length === 0) {
        container.innerHTML = '<p style="color:#999;font-size:12px;">No series configured yet.</p>';
        return;
    }

    const rowStyle = 'display:grid; grid-template-columns:130px 75px 75px 160px 160px 75px 75px; gap:8px; align-items:center; padding:6px 0; border-bottom:1px solid #f0f0f0;';
    const hdrStyle = 'font-weight:600; font-size:11px; color:#555;';
    let html = `<div style="${rowStyle}">
        <span style="${hdrStyle}">Series</span>
        <span style="${hdrStyle}">Offset W"</span>
        <span style="${hdrStyle}">Offset H"</span>
        <span style="${hdrStyle}">Shutter H desc (formula)</span>
        <span style="${hdrStyle}">Shutter W desc (formula)</span>
        <span style="${hdrStyle}">MS Off W"</span>
        <span style="${hdrStyle}">MS Off H"</span>
    </div>`;

    allSeries.forEach(series => {
        const cfg  = (ratesConfig.glassOffsets && ratesConfig.glassOffsets[series]) || {};
        const safe = series.replace(/[^a-z0-9]/gi, '_');
        const num  = (id, val) => `<input type="number" id="goff_${safe}_${id}" value="${val !== null && val !== undefined ? val : ''}" placeholder="none" step="0.25" style="width:100%;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:12px;">`;
        const txt  = (id, val) => `<input type="text"   id="goff_${safe}_${id}" value="${val || ''}" placeholder="e.g. Shutter Verticals" style="width:100%;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;font-family:monospace;">`;
        html += `<div style="${rowStyle}">
            <span style="font-size:12px;font-weight:500;">${series}</span>
            ${num('w',  cfg.offsetW)}
            ${num('h',  cfg.offsetH)}
            ${txt('hd', cfg.shutterHDesc)}
            ${txt('wd', cfg.shutterWDesc)}
            ${num('mw', cfg.msOffsetW)}
            ${num('mh', cfg.msOffsetH)}
        </div>`;
    });

    container.innerHTML = html;
}

function saveGlassOffsets() {
    if (!ratesConfig.glassOffsets) ratesConfig.glassOffsets = {};
    const allSeries = Object.keys(ratesConfig.glassOffsets);
    Object.keys(stockMaster || {}).forEach(s => { if (!allSeries.includes(s)) allSeries.push(s); });

    allSeries.forEach(series => {
        const safe   = series.replace(/[^a-z0-9]/gi, '_');
        const getNum = id => { const el = document.getElementById(`goff_${safe}_${id}`); return (!el || el.value === '') ? null : parseFloat(el.value); };
        const getTxt = id => { const el = document.getElementById(`goff_${safe}_${id}`); return el ? el.value.trim() : ''; };
        ratesConfig.glassOffsets[series] = {
            offsetW:      getNum('w'),
            offsetH:      getNum('h'),
            shutterHDesc: getTxt('hd'),
            shutterWDesc: getTxt('wd'),
            msOffsetW:    getNum('mw'),
            msOffsetH:    getNum('mh')
        };
    });

    autoSaveRates();
    showAlert('✅ Glass offsets saved!');
}

function addPowderCoatingItem(groupName, safeId) {
    const nameEl = document.getElementById(safeId + '_name');
    const rateEl = document.getElementById(safeId + '_rate');
    let name = (nameEl?.value || '').trim();
    const rate = parseFloat(rateEl?.value);
    if (!name) { showAlert('⚠️ Please enter an item name'); return; }
    if (isNaN(rate) || rate < 0) { showAlert('⚠️ Please enter a valid rate'); return; }

    // Auto-prefix with category if not already prefixed (so it groups correctly)
    const prefixMap = {
        '3/4" Series': '3/4" ',
        '1" Series': '1" ',
        'Domal Series': 'Domal ',
        'Door Series': 'Door ',
        'C Channel & Misc': '',
        'Others': ''
    };
    const prefix = prefixMap[groupName];
    if (prefix && !name.toLowerCase().startsWith(prefix.toLowerCase().trim())) {
        name = prefix + name;
    } else if (prefix === undefined) {
        // Custom category — prefix with the category name
        if (!name.toLowerCase().startsWith(groupName.toLowerCase())) {
            name = `${groupName} ${name}`;
        }
    }

    if (ratesConfig.powderCoating[name] != null) {
        showAlert(`⚠️ "${name}" already exists`);
        return;
    }
    ratesConfig.powderCoating[name] = rate;
    autoSaveRates();
    refreshRatesDisplay();
    showAlert(`✅ Added "${name}" @ ₹${rate}/ft`);
}

function removePowderCoatingItem(comp) {
    if (!confirm(`Remove "${comp}" from powder coating rates?`)) return;
    delete ratesConfig.powderCoating[comp];
    autoSaveRates();
    refreshRatesDisplay();
}

function addPowderCoatingCategory() {
    const el = document.getElementById('pcNewCategory');
    const name = (el?.value || '').trim();
    if (!name) { showAlert('⚠️ Enter a category name'); return; }
    const customGroups = JSON.parse(localStorage.getItem('pcCustomGroups') || '[]');
    if (customGroups.includes(name)) { showAlert('⚠️ Category already exists'); return; }
    customGroups.push(name);
    localStorage.setItem('pcCustomGroups', JSON.stringify(customGroups));
    refreshRatesDisplay();
    showAlert(`✅ Category "${name}" created. Add items using the form inside it.`);
}

function saveAllRates() {
    // Collect powder coating rates
    const pcInputs = document.querySelectorAll('.pc-rate-input');
    pcInputs.forEach(input => {
        const comp = input.getAttribute('data-component');
        ratesConfig.powderCoating[comp] = parseFloat(input.value);
    });

    // Collect glass and global rates
    ratesConfig.glass['toughened_5mm'] = parseFloat(document.getElementById('rateGlassToughened').value);
    ratesConfig.glass['non_toughened_5mm'] = parseFloat(document.getElementById('rateGlassNonToughened').value);
    ratesConfig.global['glassOffset'] = parseFloat(document.getElementById('glassOffset').value);
    ratesConfig.global['rubberRate'] = parseFloat(document.getElementById('rateRubber').value);

    autoSaveRates();
    showAlert('✅ All rates saved successfully!');
}

function autoSaveRates() {
    localStorage.setItem('ratesConfig', JSON.stringify(ratesConfig));
}

// ============================================================================
// UI MANAGEMENT
// ============================================================================

// Smooth scroll to sections - called from navigation links
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        // Refresh content based on which section we're scrolling to
        const sectionName = sectionId.replace('section-', '');
        refreshSectionContent(sectionName);

        // Ensure section is expanded if it was collapsed
        const header = section.querySelector('.collapsible-header');
        const content = section.querySelector('.collapsible-content');
        if (header && header.classList.contains('collapsed')) {
            header.classList.remove('collapsed');
        }
        if (content && content.classList.contains('collapsed-content')) {
            content.classList.remove('collapsed-content');
        }
        if (section.classList.contains('collapsed-section')) {
            section.classList.remove('collapsed-section');
        }

        // Smooth scroll with custom offset - Delayed to allow expansion animation to start/layout to update
        setTimeout(() => {
            const yOffset = -80; // Offset for sticky navbar
            const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }, 150);
    }
}

// Keep showTab for backward compatibility (for any inline onclick handlers)
function showTab(tabName) {
    // Map old tab names to new section IDs
    const sectionMap = {
        'input': 'section-add-windows',
        'windows': 'section-window-list',
        'formulas': 'section-formulas',
        'stock': 'section-stock',
        'hardware': 'section-hardware',
        'optimize': 'section-optimize',
        'results': 'section-results'
    };

    const sectionId = sectionMap[tabName] || 'section-' + tabName;
    scrollToSection(sectionId);
}

/**
 * Toggles a collapsible section
 * @param {HTMLElement} header - The header element of the section
 */
function toggleSection(header) {
    const section = header.parentElement;
    const content = header.nextElementSibling;

    if (!content || !content.classList.contains('collapsible-content')) {
        console.warn('No collapsible content found after header');
        return;
    }

    const isExpanding = header.classList.contains('collapsed');

    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed-content');
    section.classList.toggle('collapsed-section');

    // If expanding, refresh the content inside
    if (isExpanding) {
        const sectionId = section.getAttribute('id') || '';
        const sectionName = sectionId.replace('section-', '');
        refreshSectionContent(sectionName);
    }
}

// Global helper to refresh specific section data
function refreshSectionContent(sectionName) {
    if (sectionName === 'window-list') {
        displayWindows();
    } else if (sectionName === 'formulas') {
        refreshFormulasDisplay();
    } else if (sectionName === 'stock') {
        refreshStockMaster();
    } else if (sectionName === 'hardware') {
        refreshHardwareMaster();
    } else if (sectionName === 'optimize') {
        refreshProjectSelector();
    } else if (sectionName === 'results') {
        if (typeof displayResults === 'function') displayResults();
    } else if (sectionName === 'supplier') {
        renderSupplierMaster();
    }
}

/**
 * Updates the statistics shown on the dashbaord tiles
 */
function updateDashboardStats() {
    const windowCountEl = document.getElementById('stat-window-count');
    const stockCountEl = document.getElementById('stat-stock-count');

    if (windowCountEl) {
        windowCountEl.textContent = `${windows.length} Windows Added`;
    }

    if (stockCountEl) {
        let totalMaterials = 0;
        Object.values(stockMaster).forEach(list => totalMaterials += list.length);
        stockCountEl.textContent = `${totalMaterials} Stock Items`;
    }
}

function refreshAllUI() {
    refreshSeriesDropdown();
    refreshFormulasDisplay();
    displayWindows();
    refreshStockMaster();
    refreshHardwareMaster();
    refreshProjectSelector();
    updateDashboardStats();
    // updateSupplierDatalist(); // New (Function implementation seems missing, temporarily disabling)
    initializeAddWindowSeriesSelector(); // New Wizard Flow
    initializeAddWindowVendorSelector(); // For Edit Modal (only)
    refreshRatesDisplay(); // New
    if (typeof renderAluminumRatesSummary === 'function') renderAluminumRatesSummary(); // v1.41
    renderSupplierMaster(); // New
}

function refreshSeriesDropdown() {
    const select = document.getElementById('newStockSeries');
    if (select) {
        select.innerHTML = '';
        Object.keys(seriesFormulas).forEach(series => {
            select.innerHTML += `<option value="${escapeAttr(series)}">${escapeAttr(series)} Series</option>`;
        });
    }
}

function initializeAddWindowVendorSelector() {
    // Only for Edit Modal
    const editSelector = document.getElementById('editWindowVendor');
    if (editSelector) {
        const suppliers = Object.keys(supplierMaster);
        editSelector.innerHTML = '<option value="">-- Select Vendor --</option>';
        suppliers.forEach(s => {
            editSelector.innerHTML += `<option value="${escapeAttr(s)}">${escapeAttr(s)}</option>`;
        });
    }
}

// ============================================================================
// WIZARD FLOW LOGIC
// ============================================================================

let currentWizardStep = 1;

function showStep(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.step-dot').forEach(el => el.classList.remove('active'));

    const target = document.getElementById(`step${step}`);
    if (target) target.classList.remove('hidden');

    for (let i = 1; i <= step; i++) {
        const dot = document.querySelector(`.step-dot[data-step="${i}"]`);
        if (dot) dot.classList.add('active');
    }
    currentWizardStep = step;
}

function nextStep(targetStep) {
    if (targetStep === 2) {
        const width = document.getElementById('width').value;
        const height = document.getElementById('height').value;
        const series = document.getElementById('series').value;

        if (!width || !height) { showAlert('❌ Please enter valid dimensions', 'error'); return; }
        if (!series) { showAlert('❌ Please select a Series Type', 'error'); return; }

        // Populate vendors for this series
        updateVendorOptionsForSeries(series);
    }

    if (targetStep === 3) {
        const vendor = document.getElementById('windowVendor').value;
        if (!vendor) { showAlert('❌ Please select a Supplier', 'error'); return; }
    }

    showStep(targetStep);
}

function prevStep(targetStep) {
    showStep(targetStep);
}

// Category Selection (Window/Door)
function selectCategory(category) {
    const categoryInput = document.getElementById('category');
    const windowBtn = document.getElementById('categoryWindow');
    const doorBtn = document.getElementById('categoryDoor');
    const configIdInput = document.getElementById('configId');
    const submitBtn = document.getElementById('submitBtn');

    // Update buttons
    windowBtn.classList.remove('active', 'door-active');
    doorBtn.classList.remove('active', 'door-active');

    if (category === 'Window') {
        windowBtn.classList.add('active');
        categoryInput.value = 'Window';
        // Auto-generate next Window ID
        configIdInput.value = getNextConfigId('Window');
        if (submitBtn) submitBtn.textContent = '✅ Add Window';

        // Show window-specific fields, hide door fields
        toggleWindowDoorFields('Window');
    } else {
        doorBtn.classList.add('active', 'door-active');
        categoryInput.value = 'Door';
        // Auto-generate next Door ID
        configIdInput.value = getNextConfigId('Door');
        if (submitBtn) submitBtn.textContent = '✅ Add Door';

        // Show door-specific fields, hide window fields
        toggleWindowDoorFields('Door');

        // Auto-select Door series
        const seriesSelect = document.getElementById('series');
        if (seriesSelect) {
            for (let i = 0; i < seriesSelect.options.length; i++) {
                if (seriesSelect.options[i].value === 'Door') {
                    seriesSelect.selectedIndex = i;
                    onSeriesChanged();
                    break;
                }
            }
        }
    }
}

function toggleWindowDoorFields(category) {
    // Window-specific rows (hide for Doors)
    const windowOnlyRows = [
        document.getElementById('windowTracksRow'),     // Tracks, Shutters, Mosquito Shutters
        document.getElementById('windowGlassRow'),      // Glass Unit, Thickness, Corner Joint
        document.getElementById('windowInterlockRow'),  // Interlock Design, Description
        document.getElementById('mosquitoConfigRow')    // Mosquito Shutter Type/Interlock
    ];

    // Door-specific container
    const doorConfigRow = document.getElementById('doorConfigRow');

    if (category === 'Window') {
        // Show window fields
        windowOnlyRows.forEach(row => { if (row) row.style.display = 'flex'; });
        // Always hide mosquito config unless mosquitoShutters > 0
        const ms = parseInt(document.getElementById('mosquitoShutters')?.value || 0);
        const mosquitoRow = document.getElementById('mosquitoConfigRow');
        if (mosquitoRow) mosquitoRow.style.display = ms > 0 ? 'flex' : 'none';
        // Hide door fields
        if (doorConfigRow) doorConfigRow.style.display = 'none';
    } else {
        // Hide ALL window-only fields for Doors
        windowOnlyRows.forEach(row => { if (row) row.style.display = 'none'; });
        // Show door config
        if (doorConfigRow) doorConfigRow.style.display = 'block';
    }
}

// Update Partition Thickness options based on selected material
function updateDoorPartitionThickness() {
    const material = document.getElementById('doorPartitionMaterial')?.value || 'Glass';
    const thicknessSelect = document.getElementById('doorPartitionThickness');
    if (!thicknessSelect) return;

    // Define thickness options per material
    const thicknessOptions = {
        'Glass': [{ v: '5', t: '5mm' }, { v: '6', t: '6mm' }, { v: '8', t: '8mm' }],
        'Bakelite': [{ v: '2.5', t: '2.5mm' }, { v: '4', t: '4mm' }],
        'ACP': [{ v: '3', t: '3mm' }, { v: '4', t: '4mm' }, { v: '6', t: '6mm' }],
        'Louvers': [{ v: '0', t: 'N/A' }],
        'SSMosquito': [{ v: '0', t: 'N/A' }],
        'ParticleBoard': [{ v: '12', t: '12mm' }, { v: '18', t: '18mm' }],
        'PartitionSheet': [{ v: '3', t: '3mm' }, { v: '4', t: '4mm' }]
    };

    const options = thicknessOptions[material] || [{ v: '0', t: 'N/A' }];
    thicknessSelect.innerHTML = options.map(o =>
        `<option value="${o.v}">${o.t}</option>`
    ).join('');
}

// Switch between Window and Door add modes
function switchAddMode(mode) {
    const windowContainer = document.getElementById('windowFormContainer');
    const doorContainer = document.getElementById('doorFormContainer');
    const windowTab = document.getElementById('modeTabWindow');
    const doorTab = document.getElementById('modeTabDoor');

    if (mode === 'Window') {
        windowContainer.style.display = 'block';
        doorContainer.style.display = 'none';
        windowTab.classList.add('active');
        doorTab.classList.remove('active');
    } else {
        windowContainer.style.display = 'none';
        doorContainer.style.display = 'block';
        windowTab.classList.remove('active');
        doorTab.classList.add('active');
        // Update the door config ID
        document.getElementById('doorConfigId').value = getNextConfigId('Door');
        // Init accessories checklist if not yet rendered
        const tbody = document.getElementById('doorAccessoriesBody');
        if (tbody && tbody.children.length === 0) {
            const cm = document.getElementById('doorClosingMechanism')?.value || 'Hinge';
            renderDoorAccessoriesChecklist(cm);
        }
    }
}

// ============================================================================
// DOOR ACCESSORIES — Now sourced from hardwareMaster['Door']
// (seeded once on first load; user manages via Hardware Master Configuration)
// ============================================================================

// v1.22: each item can carry a `variants` array. When non-empty, the per-door
// form shows a variant dropdown next to the item; the chosen variant's `rate`
// overrides the base rate on that door's saved accessories entry.
// `defaultVariant` (label) controls which one is preselected on the form.
// Placeholder rate ₹100 — user updates rates via Hardware Master UI.
const DOOR_HARDWARE_DEFAULTS = [
    {
        hardware: 'Door Hinge',      mechanism: 'Hinge',       unit: 'Nos',  formula: '4 * L',      rate: 100,
        variants: [
            { label: '5"×1.25"', rate: 100 },
            { label: '4"×1.25"', rate: 100 }
        ],
        defaultVariant: '4"×1.25"'
    },
    {
        hardware: 'Floor Spring',    mechanism: 'FloorSpring', unit: 'Nos',  formula: '1 * L',      rate: 100,
        variants: [
            { label: '90 kg',  rate: 100 },
            { label: '100 kg', rate: 100 },
            { label: '120 kg', rate: 100 }
        ],
        defaultVariant: '90 kg'
    },
    {
        hardware: 'Door Handle',     mechanism: 'both',        unit: 'Nos',  formula: '2 * L',      rate: 100,
        variants: [
            { label: 'None',             rate: 0   },
            { label: 'American Handle',  rate: 100 },
            { label: 'H-Handle',         rate: 100 },
            { label: 'D-Handle',         rate: 100 }
        ],
        defaultVariant: 'American Handle'
    },
    {
        hardware: 'Door Closer',     mechanism: 'Hinge',       unit: 'Nos',  formula: '1 * L',      rate: 100,
        variants: [],   defaultVariant: null
    },
    {
        // v1.35: 1 per door (single OR double) — was 1*L which over-counted double doors.
        // Mortise Lock blocked for double doors (UI cascade in onLockVariantChange).
        hardware: 'Lock Body',       mechanism: 'both',        unit: 'Nos',  formula: '1',          rate: 100,
        variants: [
            { label: 'Dead Lock (both side key)',     rate: 100 },
            { label: 'Dead Lock (key + knob)',        rate: 100 },
            { label: 'Dead Lock (both side knob)',    rate: 100 },
            { label: 'Mortise Lock',                  rate: 100 },
            { label: 'Pad Lock',                      rate: 100 },
            { label: 'Kaptan Lock',                   rate: 100 }
        ],
        defaultVariant: 'Dead Lock (both side key)'
    },
    {
        // v1.35: 1 per door. Auto-checked only with Dead Lock or Mortise Lock variants.
        hardware: 'Cylinder',        mechanism: 'both',        unit: 'Nos',  formula: '1',          rate: 100,
        variants: [],   defaultVariant: null
    },
    {
        // v1.35: 1 per door. Auto-checked ONLY with Mortise Lock variant.
        hardware: 'Mortise Handle',  mechanism: 'both',        unit: 'Nos',  formula: '1',          rate: 100,
        variants: [],   defaultVariant: null
    },
    {
        hardware: 'Silicon Sealant', mechanism: 'both',        unit: 'R.Ft', formula: '(W+H)*2/12', rate: 10,
        variants: [],   defaultVariant: null
    },
    // v1.35: Door Rod 12mm moved from hardware → profile cutting plan.
    // Length = top rail + 3", cut from 2m stock. See generateDoorProfileFormulas.
    // Auxiliary hardware (nuts + washers) below:
    {
        hardware: 'Door Rod Nut',    mechanism: 'both',        unit: 'Nos',  formula: '4 * L',      rate: 5,
        variants: [],   defaultVariant: null
    },
    {
        hardware: 'Door Rod Washer', mechanism: 'both',        unit: 'Nos',  formula: '4 * L',      rate: 3,
        variants: [],   defaultVariant: null
    },
    {
        hardware: 'Door Stopper',    mechanism: 'both',        unit: 'Nos',  formula: '1',          rate: 100,
        variants: [
            { label: '4"',  rate: 100 },
            { label: '6"',  rate: 100 },
            { label: '8"',  rate: 100 },
            { label: '10"', rate: 100 },
            { label: '12"', rate: 100 },
            { label: '18"', rate: 100 },
            { label: '24"', rate: 100 }
        ],
        defaultVariant: '6"'
    },
    {
        hardware: 'Door Leg Stopper', mechanism: 'both',       unit: 'Nos',  formula: '1 * L',      rate: 100,
        variants: [],   defaultVariant: null
    },
    {
        hardware: 'Magnet',          mechanism: 'both',        unit: 'Nos',  formula: '1 * L',      rate: 100,
        variants: [
            { label: 'No. 2 Magnet', rate: 100 },
            { label: 'Ball Magnet',  rate: 100 }
        ],
        defaultVariant: 'No. 2 Magnet'
    }
];

// Convenience accessor — always returns array (seeds if missing) + auto-migrates
// to ensure new schema fields (variants, defaultVariant) and any newly-added
// seed items are present without wiping user customizations.
function getDoorHardwareList() {
    if (!hardwareMaster.Door || hardwareMaster.Door.length === 0) {
        hardwareMaster.Door = JSON.parse(JSON.stringify(DOOR_HARDWARE_DEFAULTS));
        if (typeof autoSaveHardwareMaster === 'function') autoSaveHardwareMaster();
        return hardwareMaster.Door;
    }
    // Migration: ensure each existing item has variants[] + defaultVariant fields,
    // and add any new seed items the user doesn't have yet (e.g. Door Stopper,
    // Door Leg Stopper, Magnet, Mortise Handle introduced in v1.22).
    let changed = false;
    const byName = {};
    hardwareMaster.Door.forEach(it => { if (it && it.hardware) byName[it.hardware] = it; });

    DOOR_HARDWARE_DEFAULTS.forEach(seed => {
        const existing = byName[seed.hardware];
        if (!existing) {
            hardwareMaster.Door.push(JSON.parse(JSON.stringify(seed)));
            changed = true;
        } else {
            if (!Array.isArray(existing.variants)) {
                existing.variants = JSON.parse(JSON.stringify(seed.variants || []));
                changed = true;
            }
            if (existing.defaultVariant === undefined) {
                existing.defaultVariant = seed.defaultVariant || null;
                changed = true;
            }
        }
    });
    if (changed && typeof autoSaveHardwareMaster === 'function') autoSaveHardwareMaster();
    return hardwareMaster.Door;
}

// Initial render — called when door tab opens or form is cleared
function renderDoorAccessoriesChecklist(mechanism) {
    const tbody = document.getElementById('doorAccessoriesBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const items = getDoorHardwareList();
    items.forEach((item, i) => {
        const mech = item.mechanism || 'both';
        const checked = mech === 'both' || mech === mechanism;
        const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;

        // Build variant cell content
        let variantCell = '<span style="color:#bbb;font-size:11px;">—</span>';
        let initialRate = item.rate;
        if (hasVariants) {
            const preselect = item.defaultVariant || item.variants[0].label;
            const preselectVariant = item.variants.find(v => v.label === preselect) || item.variants[0];
            initialRate = preselectVariant.rate != null ? preselectVariant.rate : item.rate;
            const opts = item.variants.map(v =>
                `<option value="${escapeHtml(v.label)}" data-rate="${v.rate}" ${v.label === preselect ? 'selected' : ''}>${escapeHtml(v.label)}</option>`
            ).join('');
            variantCell = `<select id="accVariant_${i}" onchange="onAccessoryVariantChange(${i})"
                style="width:100%;max-width:170px;padding:3px 6px;border:1px solid #d8a878;border-radius:3px;font-size:12px;background:#fffceb;">
                ${opts}
            </select>`;
        }

        tbody.insertAdjacentHTML('beforeend', `
            <tr id="accRow_${i}" style="border-bottom:1px solid #f5e0c8;">
                <td style="text-align:center;padding:5px;width:36px;">
                    <input type="checkbox" id="accCheck_${i}" ${checked ? 'checked' : ''}>
                </td>
                <td style="padding:5px 8px;font-size:13px;">${escapeHtml(item.hardware)}</td>
                <td style="padding:5px 6px;">${variantCell}</td>
                <td style="padding:5px 6px;">
                    <input type="text" id="accFormula_${i}" value="${escapeHtml(item.formula)}"
                        style="width:80px;padding:3px 6px;border:1px solid #ddd;border-radius:3px;font-size:12px;font-family:monospace;">
                </td>
                <td style="padding:5px 8px;font-size:12px;color:#777;">${escapeHtml(item.unit)}</td>
                <td style="padding:5px 6px;">
                    <input type="number" id="accRate_${i}" value="${initialRate}" min="0"
                        style="width:72px;padding:3px 6px;border:1px solid #ddd;border-radius:3px;font-size:12px;">
                </td>
            </tr>`);
    });
}

// When user changes variant dropdown on a door accessory row, auto-fill the rate
// input from the variant's rate. User can still manually edit the rate after.
//
// v1.35: also runs the Lock Body cascade — picking Mortise/Dead Lock variants
// auto-checks dependent accessories (Cylinder, Mortise Handle) and blocks
// Mortise Lock when the door is double.
function onAccessoryVariantChange(idx) {
    const sel = document.getElementById(`accVariant_${idx}`);
    const rateEl = document.getElementById(`accRate_${idx}`);
    if (!sel || !rateEl) return;
    const opt = sel.options[sel.selectedIndex];
    if (opt) {
        const r = parseFloat(opt.getAttribute('data-rate'));
        if (!isNaN(r)) rateEl.value = r;
    }

    // Lock Body cascade (only fires for the Lock Body row)
    const items = getDoorHardwareList();
    const master = items[idx];
    if (!master || master.hardware !== 'Lock Body') return;
    applyLockCascade(sel.value);
}

// Auto-check Cylinder / Mortise Handle based on the lock variant.
// Block Mortise Lock when door is double (warn + revert to default).
function applyLockCascade(lockVariant) {
    const doorType = document.getElementById('doorType')?.value || 'single';
    if (lockVariant === 'Mortise Lock' && doorType === 'double') {
        showAlert('⚠️ Mortise Lock is not used on double doors. Please pick a Dead Lock or Pad Lock variant.', 'warning');
        // Revert to default
        const items = getDoorHardwareList();
        const lockIdx = items.findIndex(it => it.hardware === 'Lock Body');
        if (lockIdx >= 0) {
            const sel = document.getElementById(`accVariant_${lockIdx}`);
            if (sel) sel.value = items[lockIdx].defaultVariant || 'Dead Lock (both side key)';
        }
        return;
    }

    const items = getDoorHardwareList();
    const findIdx = name => items.findIndex(it => it.hardware === name);
    const cylIdx = findIdx('Cylinder');
    const morIdx = findIdx('Mortise Handle');
    const cylCb  = (cylIdx >= 0) ? document.getElementById(`accCheck_${cylIdx}`) : null;
    const morCb  = (morIdx >= 0) ? document.getElementById(`accCheck_${morIdx}`) : null;

    const v = (lockVariant || '').toLowerCase();
    const isDead    = v.startsWith('dead lock');
    const isMortise = v === 'mortise lock';

    // Cylinder: required for Dead Lock or Mortise Lock
    if (cylCb) cylCb.checked = (isDead || isMortise);
    // Mortise Handle: required only for Mortise Lock
    if (morCb) morCb.checked = isMortise;
}

// Called from the door form when Door Type (single/double) changes
// — re-validates Lock Body variant.
function onDoorTypeChangeForLock() {
    const items = getDoorHardwareList();
    const lockIdx = items.findIndex(it => it.hardware === 'Lock Body');
    if (lockIdx < 0) return;
    const sel = document.getElementById(`accVariant_${lockIdx}`);
    if (!sel) return;
    applyLockCascade(sel.value);
}

// When closing mechanism changes — only flip mechanism-specific rows, leave user edits alone
function updateAccessoriesForMechanism(mechanism) {
    const items = getDoorHardwareList();
    items.forEach((item, i) => {
        const mech = item.mechanism || 'both';
        if (mech === 'both') return;
        const cb = document.getElementById(`accCheck_${i}`);
        if (cb) cb.checked = (mech === mechanism);
    });
}

// Read checked accessories from the table — includes selected variant (if any)
function readDoorAccessories() {
    const tbody = document.getElementById('doorAccessoriesBody');
    if (!tbody) return [];
    const result = [];
    const items = getDoorHardwareList();

    tbody.querySelectorAll('tr').forEach(row => {
        const cb = row.querySelector('input[type="checkbox"]');
        if (!cb || !cb.checked) return;
        if (!row.id || !row.id.startsWith('accRow_')) return;

        const idx = parseInt(row.id.replace('accRow_', ''));
        const master = items[idx];
        if (!master) return;
        const formula = document.getElementById(`accFormula_${idx}`)?.value?.trim() || master.formula;
        const rate    = parseFloat(document.getElementById(`accRate_${idx}`)?.value);
        const variantEl = document.getElementById(`accVariant_${idx}`);
        const variant   = variantEl ? variantEl.value : null;

        result.push({
            hardware: master.hardware,
            variant:  variant || null,
            unit:     master.unit,
            formula,
            rate:     isNaN(rate) ? master.rate : rate
        });
    });
    return result;
}

// Add Door from single-page form
function addDoor(event) {
    event.preventDefault();

    const widthRaw  = parseDimension(document.getElementById('doorWidth').value);
    const heightRaw = parseDimension(document.getElementById('doorHeight').value);
    const bottomProfile = document.getElementById('doorBottomProfileNew').value;

    let bottomWidth = 114.5;
    if (bottomProfile === 'Door Top 47.5') bottomWidth = 47.5;
    else if (bottomProfile === 'Door Top 85') bottomWidth = 85;

    // Door type (single / double)
    const doorType = document.getElementById('doorType')?.value || 'single';
    const leaves   = doorType === 'double' ? 2 : 1;

    // Closing mechanism
    const closingMechanism = document.getElementById('doorClosingMechanism')?.value || 'Hinge';
    const floorSpringHingeProfile = (closingMechanism === 'FloorSpring')
        ? (document.getElementById('doorHingeSideProfileFS')?.value || '')
        : '';
    // v1.35: Hinge stile width (Hinge mechanism only — Floor Spring uses profile selector)
    const hingeWidth = (closingMechanism === 'Hinge')
        ? parseFloat(document.getElementById('doorHingeWidth')?.value || '114.5')
        : null;

    // Middle rail position
    // v1.35: input is "top edge of middle rail from floor" (mm).
    // Convert to centre (= top edge − middleWidth/2) for storage so formulas stay unchanged.
    const customPos = document.getElementById('doorMiddleCustomPos').checked;
    const middleWidthMM = parseFloat(document.getElementById('doorMiddleWidthNew')?.value) || 47.5;
    const userTopEdgeMM = customPos ? (parseFloat(document.getElementById('doorMiddlePosition').value) || null) : null;
    const middleRailPositionMM = (userTopEdgeMM != null) ? (userTopEdgeMM - middleWidthMM / 2) : null;

    // Upper partition
    const upperMat    = document.getElementById('doorUpperMaterial').value;
    const upperPartition = {
        material:       upperMat,
        thickness:      document.getElementById('doorUpperThickness').value,
        glassType:      upperMat === 'Glass' ? document.getElementById('doorUpperGlassType').value : null,
        glassToughened: upperMat === 'Glass' ? document.getElementById('doorUpperGlassToughened').value === '1' : false,
        // ACP facing: 'single' (1 sheet/panel, default) or 'double' (2 sheets/panel — front + back)
        // ACP commercially comes single-side coated only; 'double' = customer wants both faces coated → 2 sheets
        acpFacing:      upperMat === 'ACP' ? (document.getElementById('doorUpperAcpFacing')?.value || 'single') : null
    };

    // Lower partition
    const lowerMat    = document.getElementById('doorLowerMaterial').value;
    const lowerPartition = {
        material:       lowerMat,
        thickness:      document.getElementById('doorLowerThickness').value,
        glassType:      lowerMat === 'Glass' ? document.getElementById('doorLowerGlassType').value : null,
        glassToughened: lowerMat === 'Glass' ? document.getElementById('doorLowerGlassToughened').value === '1' : false,
        acpFacing:      lowerMat === 'ACP' ? (document.getElementById('doorLowerAcpFacing')?.value || 'single') : null
    };

    // Primary glass unit derived from upper partition (used by existing quotation glass lookup)
    const primaryGlassType = upperMat === 'Glass' ? upperPartition.glassType
                           : (lowerMat === 'Glass' ? lowerPartition.glassType : 'SGU');
    const primaryToughened = upperMat === 'Glass' ? upperPartition.glassToughened
                           : (lowerMat === 'Glass' ? lowerPartition.glassToughened : false);

    const doorData = {
        category:   'Door',
        configId:   document.getElementById('doorConfigId').value,
        projectName: document.getElementById('doorProjectName').value,
        location:   document.getElementById('doorLocation')?.value || '',
        vendor:     document.getElementById('doorVendor').value,
        width:      convertToInches(widthRaw),
        height:     convertToInches(heightRaw),
        qty:        parseInt(document.getElementById('doorQty')?.value) || 1,
        series:     'Door',
        description: document.getElementById('doorDescription').value,
        glassUnit:      primaryGlassType,
        glassThickness: upperMat === 'Glass' ? upperPartition.thickness : (lowerMat === 'Glass' ? lowerPartition.thickness : '6'),
        glassToughened: primaryToughened,
        cornerJoint: '90',
        frame: parseInt(document.getElementById('doorFrameSelect').value),
        doorType,               // 'single' | 'double'
        leaves,                 // 1 | 2
        closingMechanism,       // 'Hinge' | 'FloorSpring'
        floorSpringHingeProfile, // '' | 'Door Vertical' | 'Door Middle Single' | 'Door Tips Vertical'
        hingeWidth,              // v1.35: 47.5 | 85 | 114.5 (Hinge mechanism only; null for Floor Spring)
        middleRailPositionMM,
        upperPartition,
        lowerPartition,
        handleProfile: document.getElementById('doorHandleProfileNew').value,
        handleWidth:   parseFloat(document.getElementById('doorHandleWidthNew').value) || 47.5,
        accessories:   readDoorAccessories(),
        bottomProfile,
        topWidth:    parseFloat(document.getElementById('doorTopWidthNew').value),
        middleWidth: parseFloat(document.getElementById('doorMiddleWidthNew').value),
        bottomWidth,
        shutters: 1,
        tracks: 0,
        mosquitoShutters: 0
    };

    if (editingDoorIndex !== null && windows[editingDoorIndex]) {
        // EDIT MODE — merge into existing door, preserve any fields not in the form
        // (e.g. componentThicknesses set via the Thickness modal)
        const original = windows[editingDoorIndex];
        windows[editingDoorIndex] = { ...original, ...doorData };
        autoSaveWindows();
        const editedId = doorData.configId;
        exitDoorEditMode(/*resetForm=*/true);
        showAlert(`✅ Door ${editedId} updated successfully!`);
    } else {
        // ADD MODE — push new door
        windows.push(doorData);
        autoSaveWindows();
        incrementConfigCounter('Door');
        document.getElementById('doorConfigId').value = getNextConfigId('Door');
        showAlert(`✅ Door ${doorData.configId} added successfully!`);
    }

    refreshProjectSelector();
    displayWindows();
}

// Clear Door form (user-triggered "Clear" button)
function clearDoorForm() {
    // Also abort any in-progress edit
    if (editingDoorIndex !== null) {
        exitDoorEditMode(/*resetForm=*/false);
    }
    document.getElementById('doorForm').reset();
    document.getElementById('doorConfigId').value = getNextConfigId('Door');
    renderDoorAccessoriesChecklist('Hinge');
    // Re-run conditional UI handlers after reset so ACP/Glass rows reflect reset state
    if (typeof updateDoorPartitionThickness === 'function') {
        updateDoorPartitionThickness('upper');
        updateDoorPartitionThickness('lower');
    }
    if (typeof toggleClosingMechanism === 'function') toggleClosingMechanism();
    if (typeof updateHandleWidthOptions === 'function') updateHandleWidthOptions();
    if (typeof toggleDoubleDoorOptions === 'function') toggleDoubleDoorOptions();
}

// ============================================================================
// DOOR — IN-PLACE EDIT MODE (Phase 2)
// ============================================================================

let editingDoorIndex = null;

function editDoorInPlace(idx) {
    const w = windows[idx];
    if (!w || w.series !== 'Door') {
        showAlert('Not a door — use the standard editor.', 'error');
        return;
    }

    editingDoorIndex = idx;

    // 1. Switch to Door tab + scroll to add section
    if (typeof switchAddMode === 'function') switchAddMode('Door');
    scrollToSection('section-add');

    // 2. Populate every form field from the saved door
    populateDoorFormFromObject(w);

    // 3. Flip submit button + show cancel button + show editing badge
    setDoorFormEditingUI(true, w.configId);
}

function cancelDoorEdit() {
    if (editingDoorIndex === null) return;
    exitDoorEditMode(/*resetForm=*/true);
    showAlert('✕ Edit cancelled');
}

function exitDoorEditMode(resetForm) {
    editingDoorIndex = null;
    setDoorFormEditingUI(false, null);
    if (resetForm) {
        document.getElementById('doorForm').reset();
        document.getElementById('doorConfigId').value = getNextConfigId('Door');
        renderDoorAccessoriesChecklist('Hinge');
        if (typeof updateDoorPartitionThickness === 'function') {
            updateDoorPartitionThickness('upper');
            updateDoorPartitionThickness('lower');
        }
        if (typeof toggleClosingMechanism === 'function') toggleClosingMechanism();
        if (typeof updateHandleWidthOptions === 'function') updateHandleWidthOptions();
        if (typeof toggleDoubleDoorOptions === 'function') toggleDoubleDoorOptions();
    }
}

function setDoorFormEditingUI(isEditing, configId) {
    const submitBtn = document.getElementById('doorSubmitBtn');
    const cancelBtn = document.getElementById('doorCancelEditBtn');
    const badge     = document.getElementById('doorEditModeBadge');
    const idInput   = document.getElementById('doorConfigId');

    if (submitBtn) submitBtn.innerHTML = isEditing ? '💾 Update Door' : '✅ Add Door';
    if (cancelBtn) cancelBtn.style.display = isEditing ? '' : 'none';
    if (badge)     {
        badge.style.display = isEditing ? '' : 'none';
        badge.textContent   = isEditing ? `✏️ Editing ${configId}` : '';
    }
    // Lock Config ID during edit (changing it would break references)
    if (idInput)   idInput.readOnly = !!isEditing;
}

function populateDoorFormFromObject(w) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el != null && val != null) el.value = val; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el != null) el.checked = !!val; };

    // Identity / location
    setVal('doorConfigId',    w.configId);
    setVal('doorProjectName', w.projectName);
    setVal('doorLocation',    w.location || '');
    setVal('doorVendor',      w.vendor || '');
    setVal('doorDescription', w.description || '');

    // Dimensions — respect current unit mode for display
    const displayW = unitMode === 'mm' ? Math.round((w.width  || 0) * 25.4) : w.width;
    const displayH = unitMode === 'mm' ? Math.round((w.height || 0) * 25.4) : w.height;
    setVal('doorWidth',  displayW);
    setVal('doorHeight', displayH);

    setVal('doorQty', w.qty || 1);

    // Door type / leaves
    setVal('doorType', w.doorType || ((w.leaves || 1) > 1 ? 'double' : 'single'));
    if (typeof toggleDoubleDoorOptions === 'function') toggleDoubleDoorOptions();

    // Frame
    setVal('doorFrameSelect', String(w.frame != null ? w.frame : 1));

    // Closing mechanism + floor spring profile + handle profile / width
    setVal('doorClosingMechanism',        w.closingMechanism || 'Hinge');
    setVal('doorHingeSideProfileFS',      w.floorSpringHingeProfile || '');
    setVal('doorHandleProfileNew',        w.handleProfile || 'Door Vertical');
    setVal('doorHandleWidthNew',          String(w.handleWidth || 47.5));
    setVal('doorBottomProfileNew',        w.bottomProfile || 'Door Bottom');
    setVal('doorMiddleWidthNew',          String(w.middleWidth || 47.5));
    setVal('doorTopWidthNew',             String(w.topWidth || 47.5));

    // v1.35: Hinge stile width (Hinge mechanism)
    if (w.hingeWidth != null) setVal('doorHingeWidth', String(w.hingeWidth));

    // Middle rail position: checkbox + value pair
    // v1.35: input is top-edge from floor; stored value is centre. Convert back.
    const mrCustom = document.getElementById('doorMiddleCustomPos');
    const mrPos    = document.getElementById('doorMiddlePosition');
    const hasCustom = w.middleRailPositionMM != null;
    if (mrCustom) {
        mrCustom.checked = hasCustom;
        // Fire change handler if there is one so the position input enables/disables
        try { mrCustom.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    if (mrPos && hasCustom) {
        const mwMM = parseFloat(w.middleWidth) || 47.5;
        // centre → top edge (top edge = centre + width/2)
        const topEdge = w.middleRailPositionMM + mwMM / 2;
        mrPos.value = Math.round(topEdge);
    }

    // Partitions
    const up = w.upperPartition || {};
    const lo = w.lowerPartition || {};
    setVal('doorUpperMaterial', up.material || 'Glass');
    setVal('doorLowerMaterial', lo.material || 'Bakelite');
    // Rebuild thickness option lists for current materials, THEN set thickness
    if (typeof updateDoorPartitionThickness === 'function') {
        updateDoorPartitionThickness('upper');
        updateDoorPartitionThickness('lower');
    }
    setVal('doorUpperThickness',      up.thickness   != null ? String(up.thickness) : '');
    setVal('doorLowerThickness',      lo.thickness   != null ? String(lo.thickness) : '');
    setVal('doorUpperGlassType',      up.glassType   || 'SGU');
    setVal('doorLowerGlassType',      lo.glassType   || 'SGU');
    setVal('doorUpperGlassToughened', up.glassToughened ? '1' : '0');
    setVal('doorLowerGlassToughened', lo.glassToughened ? '1' : '0');
    setVal('doorUpperAcpFacing',      up.acpFacing || 'single');
    setVal('doorLowerAcpFacing',      lo.acpFacing || 'single');

    // Re-fire conditional UI handlers
    if (typeof toggleClosingMechanism === 'function') toggleClosingMechanism();
    if (typeof updateHandleWidthOptions === 'function') updateHandleWidthOptions();

    // Accessories — render fresh checklist, then apply this door's selections
    const cm = w.closingMechanism || 'Hinge';
    renderDoorAccessoriesChecklist(cm);
    applyAccessorySelectionsToForm(w.accessories);
}

// Take the saved accessories array (the items checked at door-creation time)
// and apply to the rendered checklist: tick matching items, untick others,
// and write the saved formula / rate overrides back into the inputs.
function applyAccessorySelectionsToForm(savedAccessories) {
    const items = getDoorHardwareList();
    const savedByName = {};
    (savedAccessories || []).forEach(a => { if (a && a.hardware) savedByName[a.hardware] = a; });

    items.forEach((master, i) => {
        const saved = savedByName[master.hardware];
        const cb    = document.getElementById(`accCheck_${i}`);
        const fEl   = document.getElementById(`accFormula_${i}`);
        const rEl   = document.getElementById(`accRate_${i}`);
        const vEl   = document.getElementById(`accVariant_${i}`);
        if (cb) cb.checked = !!saved;
        if (saved) {
            if (fEl && saved.formula != null) fEl.value = saved.formula;
            if (vEl && saved.variant)         vEl.value = saved.variant;
            if (rEl && saved.rate    != null) rEl.value = saved.rate;
        }
    });
}

// Thickness options per material
const _partitionThicknessOpts = {
    'Glass':          [{ v: '5', t: '5mm' }, { v: '6', t: '6mm' }, { v: '8', t: '8mm' }, { v: '10', t: '10mm' }],
    'ACP':            [{ v: '3', t: '3mm' }, { v: '4', t: '4mm' }, { v: '6', t: '6mm' }],
    'Bakelite':       [{ v: '2.5', t: '2.5mm' }, { v: '4', t: '4mm' }, { v: '6', t: '6mm' }],
    'MosquitoNet':    [{ v: '0', t: 'N/A' }],
    'SSMosquito':     [{ v: '0', t: 'N/A' }],
    'Louvers':        [{ v: '0', t: 'N/A' }],
    'ParticleBoard':  [{ v: '12', t: '12mm' }, { v: '18', t: '18mm' }],
    'PartitionSheet': [{ v: '3', t: '3mm' }, { v: '4', t: '4mm' }],
    'None':           [{ v: '0', t: 'N/A' }]
};

function updateDoorPartitionThickness(zone) {
    const cap = zone.charAt(0).toUpperCase() + zone.slice(1);
    const mat       = document.getElementById(`door${cap}Material`)?.value || 'Glass';
    const thickSel  = document.getElementById(`door${cap}Thickness`);
    const glassRow  = document.getElementById(`door${cap}GlassRow`);
    const acpRow    = document.getElementById(`door${cap}AcpFacingRow`);

    if (glassRow) glassRow.style.display = mat === 'Glass' ? 'flex' : 'none';
    if (acpRow)   acpRow.style.display   = mat === 'ACP'   ? '' : 'none';

    if (thickSel) {
        const opts = _partitionThicknessOpts[mat] || [{ v: '0', t: 'N/A' }];
        thickSel.innerHTML = opts.map(o => `<option value="${o.v}">${o.t}</option>`).join('');
    }
}

// Legacy alias (kept so old code paths don't break)
function updateDoorPartitionThicknessNew() { updateDoorPartitionThickness('upper'); }

function toggleDoubleDoorOptions() {
    const isDouble = document.getElementById('doorType')?.value === 'double';
    const opts = document.getElementById('doubleDoorOptions');
    if (opts) opts.style.display = isDouble ? 'block' : 'none';
    // v1.35: re-validate Lock Body variant (Mortise Lock not allowed for double)
    if (typeof onDoorTypeChangeForLock === 'function') onDoorTypeChangeForLock();
}

// Show/hide Handle Width dropdown — Tips Vertical is always 47.5mm (fixed),
// Door Vertical AND DMS both let user pick 47.5 or 85.
// v1.38: DMS now gets its own handle width selector (was hidden — used middleWidth).
function updateHandleWidthOptions() {
    const profile   = document.getElementById('doorHandleProfileNew')?.value;
    const widthGrp  = document.getElementById('doorHandleWidthGroup');
    const widthSel  = document.getElementById('doorHandleWidthNew');
    if (!widthGrp || !widthSel) return;

    if (profile === 'Door Tips Vertical') {
        // Fixed width — hide selector, force 47.5
        widthGrp.style.display = 'none';
        widthSel.value = '47.5';
    } else {
        // Door Vertical OR Door Middle Single — user picks 47.5mm or 85mm
        widthGrp.style.display = '';
    }
}

function toggleClosingMechanism() {
    const cm = document.getElementById('doorClosingMechanism')?.value || 'Hinge';
    const fsGroup   = document.getElementById('doorHingeSideFSGroup');
    const hingeInfo = document.getElementById('doorHingeSideHingeInfo');
    if (fsGroup)   fsGroup.style.display   = (cm === 'FloorSpring') ? '' : 'none';
    if (hingeInfo) hingeInfo.style.display = (cm === 'Hinge') ? '' : 'none';
    updateAccessoriesForMechanism(cm);
}

function toggleDoorMiddlePosition() {
    const checked = document.getElementById('doorMiddleCustomPos')?.checked;
    const grp     = document.getElementById('doorMiddlePosGroup');
    if (grp) grp.style.display = checked ? 'flex' : 'none';
    if (!checked) {
        const inp = document.getElementById('doorMiddlePosition');
        if (inp) inp.value = '';
    }
}

function toggleDoorFrame() {
    const frameSelect = document.getElementById('doorFrame');
    const frameValue = document.getElementById('frameValue');
    const frameInfo = document.getElementById('doorFrameInfo');

    if (frameSelect && frameValue) {
        frameValue.value = frameSelect.value;
    }

    // Show/hide frame info based on selection
    if (frameInfo) {
        frameInfo.style.display = frameSelect.value === '1' ? 'flex' : 'none';
    }
}

// Toggle Interlock row visibility based on vendor
// Only VITCO has multiple interlock options; JK ALU and Windalco have single option per series
function toggleInterlockByVendor() {
    const vendor = document.getElementById('windowVendor')?.value || '';
    const interlockRow = document.getElementById('windowInterlockRow');
    const interlockSelect = document.getElementById('interlockType');

    if (!interlockRow) return;

    // Only show interlock selection for VITCO
    if (vendor.toUpperCase().includes('VITCO')) {
        interlockRow.style.display = 'flex';
    } else {
        // Hide for JK ALU, Windalco, etc. - they have single interlock option
        interlockRow.style.display = 'none';
        // Set default interlock type
        if (interlockSelect) interlockSelect.value = 'slim';
    }
}

function getAllUniqueSeries() {
    const seriesSet = new Set();
    Object.values(supplierMaster).forEach(seriesObj => {
        Object.keys(seriesObj).forEach(s => seriesSet.add(s));
    });
    return Array.from(seriesSet).sort();
}

function initializeAddWindowSeriesSelector() {
    const selector = document.getElementById('series');
    if (!selector) return;

    const allSeries = getAllUniqueSeries();
    selector.innerHTML = '<option value="">-- Select Series First --</option>';
    allSeries.forEach(s => {
        selector.innerHTML += `<option value="${escapeAttr(s)}">${escapeAttr(s)}</option>`;
    });
}

function onSeriesChanged() {
    const series = document.getElementById('series').value;
    const display = document.getElementById('selectedSeriesDisplay');
    if (display) display.textContent = series || '...';
    // v1.31: re-fire mosquito-config toggle so the "Mosquito Middle" option
    // shows/hides based on the new series selection (Domal only).
    if (typeof toggleMosquitoConfig === 'function') toggleMosquitoConfig();
    // v1.42: hide Corner Joint + Interlock Design for series that don't use them.
    // CJ/IT are only referenced in '25mm Shutter (Shared)' formulas — every other
    // series ignores them, so showing the dropdowns is misleading.
    if (typeof updateCJITVisibility === 'function') updateCJITVisibility(series);
}

// v1.42: Show Corner Joint + Interlock Design only for series whose formulas
// reference CJ or IT. Currently that's just '25mm Shutter (Shared)'.
function updateCJITVisibility(series) {
    const cjGroup  = document.getElementById('cornerJointGroup');
    const itGroup  = document.getElementById('interlockTypeGroup');
    const useCJIT = !!series && /25mm Shutter/i.test(series);
    if (cjGroup) cjGroup.style.display = useCJIT ? '' : 'none';
    if (itGroup) itGroup.style.display = useCJIT ? '' : 'none';
}

function updateVendorOptionsForSeries(series) {
    const selector = document.getElementById('windowVendor');
    if (!selector) return;

    selector.innerHTML = '<option value="">-- Select Vendor --</option>';
    if (!series) return;

    const validSuppliers = Object.keys(supplierMaster).filter(supName =>
        supplierMaster[supName] && supplierMaster[supName][series]
    );

    if (validSuppliers.length === 0) {
        selector.innerHTML = '<option value="">❌ No Suppliers Found</option>';
    } else {
        validSuppliers.forEach(s => {
            selector.innerHTML += `<option value="${escapeAttr(s)}">${escapeAttr(s)}</option>`;
        });

        // Auto-select if only one supplier
        if (validSuppliers.length === 1) {
            selector.value = validSuppliers[0];
        }

        // Pre-select if project preference matches
        const activeProject = document.getElementById('projectName').value;
        if (activeProject && projectSettings[activeProject] && projectSettings[activeProject].preferredSupplier) {
            const pref = projectSettings[activeProject].preferredSupplier;
            if (validSuppliers.includes(pref)) {
                selector.value = pref;
            }
        }
    }
}

function filterEditSeriesByVendor() {
    const vendor = document.getElementById('editWindowVendor').value;
    const seriesSelect = document.getElementById('editSeries');

    if (!vendor) {
        seriesSelect.innerHTML = '<option value="">-- Select Vendor First --</option>';
        return;
    }

    const availableSeries = Object.keys(supplierMaster[vendor] || {});
    seriesSelect.innerHTML = '';

    if (availableSeries.length === 0) {
        seriesSelect.innerHTML = '<option value="">No Series Found</option>';
        return;
    }

    availableSeries.forEach(s => {
        seriesSelect.innerHTML += `<option value="${escapeAttr(s)}">${escapeAttr(s)}</option>`;
    });
}

function updateUnitLabels() {
    const unit = unitMode === 'inch' ? 'inches' : 'mm';
    document.querySelectorAll('.unit-label').forEach(el => {
        if (el.tagName === 'SPAN' && el.classList.contains('unit-label')) {
            el.textContent = '(' + unit + ')';
        } else {
            el.textContent = unit;
        }
    });
}

// ============================================================================
// UNIT CONVERSION
// ============================================================================

function parseDimension(input) {
    if (!input) return 0;
    if (typeof input === 'number') return input;
    let str = input.toString().trim().replace(',', '.');
    if (str.includes('/')) {
        let whole = 0;
        let fractionStr = str;
        let parts = str.split(/[\s\-_]+/);
        if (parts.length > 1) {
            whole = parseFloat(parts[0]) || 0;
            fractionStr = parts[1];
        }
        let fracParts = fractionStr.split('/');
        if (fracParts.length === 2) {
            let num = parseFloat(fracParts[0]) || 0;
            let den = parseFloat(fracParts[1]) || 1;
            if (den !== 0) return (whole + (num / den));
        }
    }
    return parseFloat(str) || 0;
}

function convertToInches(value) {
    return unitMode === 'mm' ? value * MM_TO_INCH : value;
}

function convertFromInches(value) {
    return unitMode === 'mm' ? value * INCH_TO_MM : value;
}

function toggleUnit() {
    unitMode = unitMode === 'inch' ? 'mm' : 'inch';

    // Sync all unit toggle checkboxes
    const allUnitToggles = document.querySelectorAll('input[id*="unitToggle"]');
    const isMetric = unitMode === 'mm';
    allUnitToggles.forEach(toggle => {
        if (toggle) {
            toggle.checked = isMetric;
        }
    });

    updateUnitLabels();
    displayWindows();
    if (optimizationResults) displayResults();
    autoSaveSettings();
}

// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

function addWindow(event) {
    event.preventDefault();

    // Get category
    const category = document.getElementById('category')?.value || 'Window';

    // Get values
    const widthRaw = parseDimension(document.getElementById('width').value);
    const heightRaw = parseDimension(document.getElementById('height').value);
    const tracks = parseInt(document.getElementById('tracks')?.value || '0', 10);
    const shutters = parseInt(document.getElementById('shutters')?.value || '1', 10);

    // Validation
    if (widthRaw <= 0 || heightRaw <= 0) {
        showAlert('❌ Error: Width and Height must be greater than zero.', 'error');
        return;
    }

    // Validation for windows only
    if (category === 'Window' && shutters <= 0) {
        showAlert('❌ Error: Number of shutters must be at least 1.', 'error');
        return;
    }

    const seriesVal = document.getElementById('series').value;
    const msCount = parseInt(document.getElementById('mosquitoShutters')?.value || '0');

    const windowData = {
        configId: document.getElementById('configId').value,
        projectName: document.getElementById('projectName').value,
        location: document.getElementById('windowLocation')?.value || '',
        qty: parseInt(document.getElementById('windowQty')?.value) || 1,
        category: category,
        vendor: document.getElementById('windowVendor').value,
        width: convertToInches(widthRaw),
        height: convertToInches(heightRaw),
        series: seriesVal,
        description: document.getElementById('description').value,
        glassUnit: document.getElementById('glassUnit')?.value || 'SGU',
        glassThickness: document.getElementById('glassThickness')?.value || '5',
        glassToughened: document.getElementById('glassToughened')?.checked || false,
        cornerJoint: document.getElementById('cornerJoint')?.value || '90'
    };

    // v1.32: only write fields when they actually apply. Avoids polluting
    // the saved JSON with default values that don't belong on this window.
    if (category === 'Window') {
        windowData.tracks = tracks;
        windowData.shutters = shutters;
        windowData.mosquitoShutters = msCount;
        windowData.interlockType = document.getElementById('interlockType')?.value || 'slim';
        // Mosquito-only fields: only when MS > 0
        if (msCount > 0) {
            windowData.mosquitoType      = document.getElementById('mosquitoType')?.value || 'V-2513';
            windowData.mosquitoInterlock = document.getElementById('mosquitoInterlock')?.value || 'V-2516';
            // mosquitoMiddle: only for 27mm Domal AND MS > 0
            if (seriesVal === '27mm Domal') {
                windowData.mosquitoMiddle = document.getElementById('mosquitoMiddle')?.checked || false;
            }
        }
    }

    // Door-specific properties
    if (category === 'Door') {
        windowData.frame = parseInt(document.getElementById('doorFrame')?.value || '1');
        windowData.doorGlassType = document.getElementById('doorGlassType')?.value || 'SGU';
        windowData.partitionMaterial = document.getElementById('doorPartitionMaterial')?.value || 'Glass';
        windowData.partitionThickness = document.getElementById('doorPartitionThickness')?.value || '6';
        windowData.handleProfile = document.getElementById('doorHandleProfile')?.value || 'Door Vertical';
        windowData.bottomProfile = document.getElementById('doorBottomProfile')?.value || 'Door Bottom';

        // Profile widths (in mm)
        windowData.verticalWidth = 47.5; // Standard for all current handle options
        windowData.topWidth = parseFloat(document.getElementById('doorTopWidth')?.value || '47.5');
        windowData.middleWidth = parseFloat(document.getElementById('doorMiddleWidth')?.value || '47.5');

        // Bottom width depends on selected profile
        if (windowData.bottomProfile === 'Door Top 47.5') {
            windowData.bottomWidth = 47.5;
        } else if (windowData.bottomProfile === 'Door Top 85') {
            windowData.bottomWidth = 85;
        } else {
            windowData.bottomWidth = 114.5; // Door Bottom (Standard) is 114.5mm
        }
        // For Door formulas: S=1 (single door), T=0 (no tracks), MS=0
        windowData.shutters = 1;
        windowData.tracks = 0;
        windowData.mosquitoShutters = 0;
    }

    if (editingWindowIndex !== null && windows[editingWindowIndex]) {
        // EDIT MODE — merge into existing window, preserve unspecified fields
        // (componentThicknesses, accessories on doors that route here, etc.)
        // v1.32: also strip fields that no longer apply (e.g. mosquitoMiddle when
        // user changes series from Domal to something else, or disables MS).
        const original = windows[editingWindowIndex];
        const merged = { ...original, ...windowData };
        if (category === 'Window') {
            if (msCount === 0) {
                delete merged.mosquitoType;
                delete merged.mosquitoInterlock;
                delete merged.mosquitoMiddle;
            } else if (seriesVal !== '27mm Domal') {
                delete merged.mosquitoMiddle;
            }
        }
        windows[editingWindowIndex] = merged;
        autoSaveWindows();
        const editedId = windowData.configId;
        exitWindowEditMode(/*resetForm=*/true);
        showAlert(`✅ ${category} ${editedId} updated successfully!`);
    } else {
        // ADD MODE — push new window
        windows.push(windowData);
        autoSaveWindows();
        incrementConfigCounter(category);
        document.getElementById('configId').value = getNextConfigId(category);
        showAlert(`✅ ${category} ${windowData.configId} added successfully!`);
    }

    refreshProjectSelector();
    displayWindows();
}

function clearForm() {
    // v1.32: also abort any in-progress edit
    if (editingWindowIndex !== null) {
        exitWindowEditMode(/*resetForm=*/false);
    }
    document.getElementById('windowForm').reset();
    document.getElementById('configId').value = getNextConfigId('Window');
    document.getElementById('projectName').value = 'check';
    initializeAddWindowVendorSelector();
    // Re-fire conditional handlers after reset
    if (typeof toggleMosquitoConfig === 'function') toggleMosquitoConfig();
    if (typeof onSeriesChanged === 'function') onSeriesChanged();
}

// ============================================================================
// WINDOW — IN-PLACE EDIT MODE (v1.32, mirrors door v1.21)
// ============================================================================

let editingWindowIndex = null;

function editWindowInPlace(idx) {
    const w = windows[idx];
    if (!w || w.category === 'Door') {
        showAlert('Use Edit on door cards for doors.', 'error');
        return;
    }
    editingWindowIndex = idx;

    // 1. Switch to Window tab + scroll to add section
    if (typeof switchAddMode === 'function') switchAddMode('Window');
    scrollToSection('section-add');

    // 2. Populate every form field from the saved window
    populateWindowFormFromObject(w);

    // 3. Flip submit button + show cancel + show editing badge
    setWindowFormEditingUI(true, w.configId);
}

function cancelWindowEdit() {
    if (editingWindowIndex === null) return;
    exitWindowEditMode(/*resetForm=*/true);
    showAlert('✕ Edit cancelled');
}

function exitWindowEditMode(resetForm) {
    editingWindowIndex = null;
    setWindowFormEditingUI(false, null);
    if (resetForm) {
        document.getElementById('windowForm').reset();
        document.getElementById('configId').value = getNextConfigId('Window');
        document.getElementById('projectName').value = 'check';
        initializeAddWindowVendorSelector();
        if (typeof toggleMosquitoConfig === 'function') toggleMosquitoConfig();
        if (typeof onSeriesChanged === 'function') onSeriesChanged();
    }
}

function setWindowFormEditingUI(isEditing, configId) {
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('windowCancelEditBtn');
    const badge     = document.getElementById('windowEditModeBadge');
    const idInput   = document.getElementById('configId');

    if (submitBtn) submitBtn.innerHTML = isEditing ? '💾 Update Window' : '✅ Add Window';
    if (cancelBtn) cancelBtn.style.display = isEditing ? '' : 'none';
    if (badge) {
        badge.style.display = isEditing ? '' : 'none';
        badge.textContent   = isEditing ? `✏️ Editing ${configId}` : '';
    }
    if (idInput) idInput.readOnly = !!isEditing;
}

function populateWindowFormFromObject(w) {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el != null && val != null) el.value = val; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el != null) el.checked = !!val; };

    // Identity / location / qty
    setVal('configId',       w.configId);
    setVal('projectName',    w.projectName);
    setVal('windowLocation', w.location || '');
    setVal('windowQty',      w.qty || 1);
    setVal('description',    w.description || '');

    // Dimensions — respect current unit mode for display
    const displayW = unitMode === 'mm' ? Math.round((w.width  || 0) * 25.4) : w.width;
    const displayH = unitMode === 'mm' ? Math.round((w.height || 0) * 25.4) : w.height;
    setVal('width',  displayW);
    setVal('height', displayH);

    // Vendor + series (filter series by vendor first)
    setVal('windowVendor', w.vendor || '');
    if (typeof updateVendorOptionsForSeries === 'function') updateVendorOptionsForSeries(w.series);
    // Trigger any vendor-change handlers to populate series dropdown
    const venEl = document.getElementById('windowVendor');
    if (venEl && venEl.onchange) try { venEl.onchange(); } catch (e) {}
    setTimeout(() => {
        setVal('series', w.series || '');
        if (typeof onSeriesChanged === 'function') onSeriesChanged();
    }, 0);

    // Window-only fields
    setVal('tracks',           String(w.tracks  != null ? w.tracks  : 2));
    setVal('shutters',         String(w.shutters != null ? w.shutters : 2));
    setVal('mosquitoShutters', String(w.mosquitoShutters || 0));
    setVal('interlockType',    w.interlockType || 'slim');

    // Glass
    setVal('glassUnit',      w.glassUnit || 'SGU');
    if (typeof updateGlassThicknessOptions === 'function') updateGlassThicknessOptions();
    setVal('glassThickness', w.glassThickness || '5');
    setChk('glassToughened', !!w.glassToughened);
    setVal('cornerJoint',    w.cornerJoint || '90');

    // Mosquito config (visible only when MS > 0)
    setVal('mosquitoType',      w.mosquitoType || 'V-2513');
    setVal('mosquitoInterlock', w.mosquitoInterlock || 'V-2516');
    setChk('mosquitoMiddle',    !!w.mosquitoMiddle);
    if (typeof toggleMosquitoConfig === 'function') toggleMosquitoConfig();
}

function displayWindows() {
    const container = document.getElementById('windowList');

    if (windows.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 40px;">No windows or doors added yet.</p>';
        return;
    }

    // Get unique projects and group items
    const projects = getUniqueProjects();
    let html = '';

    projects.forEach(projectName => {
        const projectItems = windows.filter(w => (w.projectName || 'Unassigned') === projectName);
        const windowItems = projectItems.filter(w => w.category !== 'Door');
        const doorItems = projectItems.filter(w => w.category === 'Door');

        html += `<details class="project-group-section">
            <summary class="project-group-header">
                <div class="project-header-content">
                    <span class="project-icon">📁</span>
                    <span class="project-name">${projectName}</span>
                    <span class="project-count">(${projectItems.length} items)</span>
                </div>
                <div class="project-actions">
                    <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); openRenameProjectModal('${escapeHtml(projectName)}')" title="Rename Project">✏️</button>
                    <button class="btn btn-sm btn-outline btn-danger-outline" onclick="event.stopPropagation(); deleteProject('${escapeHtml(projectName)}')" title="Delete Project">🗑️</button>
                    <span class="toggle-icon">▼</span>
                </div>
            </summary>
            <div class="project-group-content">`;

        // Windows within this project
        if (windowItems.length > 0) {
            html += `<details class="list-group-section" open>
                <summary class="list-group-header">
                    <span>🪟 Windows (${windowItems.length})</span>
                    <span class="toggle-icon">▼</span>
                </summary>
                <div class="list-group-content">`;

            windowItems.forEach(w => {
                const idx = windows.indexOf(w);
                html += renderWindowCard(w, idx);
            });

            html += `</div></details>`;
        }

        // Doors within this project
        if (doorItems.length > 0) {
            html += `<details class="list-group-section" open>
                <summary class="list-group-header">
                    <span>🚪 Doors (${doorItems.length})</span>
                    <span class="toggle-icon">▼</span>
                </summary>
                <div class="list-group-content">`;

            doorItems.forEach(w => {
                const idx = windows.indexOf(w);
                html += renderWindowCard(w, idx);
            });

            html += `</div></details>`;
        }

        html += `</div></details>`;
    });

    container.innerHTML = html;
}

// Helper function to get unique project names
function getUniqueProjects() {
    const projectSet = new Set();
    windows.forEach(w => {
        projectSet.add(w.projectName || 'Unassigned');
    });
    // Sort with 'Unassigned' always at the end
    const projects = Array.from(projectSet).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });
    return projects;
}

// Helper to escape HTML for safe insertion
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/'/g, "\\'");
}

// v1.33: proper HTML attribute escape — escapes the double quote `"` which
// escapeHtml (textContent-based) does NOT. Critical for series names like
// `1"` or `3/4"` which would otherwise break <option value="..."> attributes
// and corrupt the selected value to just `1` / `3/4`.
function escapeAttr(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Helper function to render a window/door card
function renderWindowCard(w, idx) {
    const isDoor = w.category === 'Door';

    // Check thickness configuration status
    const hasThickness = w.componentThicknesses && Object.keys(w.componentThicknesses).length > 0;
    const thicknessStatus = hasThickness ? '✅' : '⚠️';
    const thicknessLabel = hasThickness
        ? `${Object.values(w.componentThicknesses)[0].t}mm`
        : 'Not Set';

    return `<div class="window-card ${isDoor ? 'door-card' : ''}">
        <div>
            <h3>${w.configId} - ${w.description}</h3>
            <div class="window-details">
                <div><strong>Project:</strong> ${w.projectName}</div>
                ${w.location ? `<div><strong>Location:</strong> ${w.location}</div>` : ''}
                <div><strong>Vendor:</strong> ${w.vendor || 'Not Set'}</div>
                <div><strong>Size:</strong> ${w.width}" × ${w.height}"</div>
                ${isDoor ? (() => {
                    const up = w.upperPartition || {};
                    const lo = w.lowerPartition || {};
                    const fmtPartition = (p, legacy) => {
                        if (!p || !p.material) return legacy || '-';
                        if (p.material === 'None') return 'None';
                        if (p.material === 'Glass') return `Glass ${p.glassType || ''} ${p.thickness || ''}mm${p.glassToughened ? ' (T)' : ''}`;
                        return `${p.material} ${p.thickness ? p.thickness+'mm' : ''}`.trim();
                    };
                    const midPos = w.middleRailPositionMM != null
                        ? `${w.middleRailPositionMM}mm from bottom`
                        : 'Center';
                    const doorTypeLabel = (w.leaves || 1) > 1 ? '🚪🚪 Double Door' : '🚪 Single Door';
                    const cmLabel = w.closingMechanism === 'FloorSpring' ? '🌀 Floor Spring' : '🔩 Hinge';
                    return `<div><strong>Type:</strong> ${doorTypeLabel}</div>
                <div><strong>Mechanism:</strong> ${cmLabel}</div>
                <div><strong>Frame:</strong> ${w.frame ? 'Yes' : 'No'}</div>
                <div><strong>Middle Rail:</strong> ${midPos}</div>
                <div style="grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;">
                    <span style="background:#e8f4fd;padding:2px 8px;border-radius:4px;font-size:12px;">⬆ ${fmtPartition(up, w.partitionMaterial)}</span>
                    <span style="background:#eafaf1;padding:2px 8px;border-radius:4px;font-size:12px;">⬇ ${fmtPartition(lo)}</span>
                </div>`;
                })() :
            `<div><strong>Tracks:</strong> ${w.tracks}</div>
                <div><strong>Shutters:</strong> ${w.shutters}</div>
                <div><strong>Mosquito:</strong> ${w.mosquitoShutters}${w.mosquitoMiddle ? ' <span style="color:#0288d1;font-size:11px;">(with 1" middle bar)</span>' : ''}</div>`}
                <div><strong>Series:</strong> ${w.series}</div>
                <div><strong>Qty:</strong> ${w.qty || 1}</div>
                <div><strong>Thickness:</strong> <span style="color: ${hasThickness ? '#2e7d32' : '#e67e22'};">${thicknessStatus} ${thicknessLabel}</span></div>
            </div>
            <div class="window-actions">
                <button class="btn btn-warning btn-sm" onclick="${isDoor ? `editDoorInPlace(${idx})` : `editWindowInPlace(${idx})`}">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteWindow(${idx})">🗑️ Delete</button>
                <button class="btn btn-info btn-sm" onclick="openComponentThicknessModal(${idx})">🔗 Thickness</button>
            </div>
        </div>
    </div>`;
}

// ============================================================================
// PROJECT MANAGEMENT FUNCTIONS
// ============================================================================

let currentProjectToRename = null;

function openRenameProjectModal(projectName) {
    currentProjectToRename = projectName;
    document.getElementById('renameProjectOldName').textContent = projectName;
    document.getElementById('renameProjectNewName').value = projectName;
    const modal = document.getElementById('renameProjectModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.getElementById('renameProjectNewName').focus();
        document.getElementById('renameProjectNewName').select();
    }
}

function closeRenameProjectModal() {
    const modal = document.getElementById('renameProjectModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    currentProjectToRename = null;
}

function confirmRenameProject() {
    const newName = document.getElementById('renameProjectNewName').value.trim();

    if (!newName) {
        showAlert('⚠️ Please enter a valid project name.', 'warning');
        return;
    }

    if (newName === currentProjectToRename) {
        closeRenameProjectModal();
        return;
    }

    // Check if new name already exists
    const existingProjects = getUniqueProjects();
    if (existingProjects.includes(newName)) {
        showAlert('⚠️ A project with this name already exists. Please choose a different name.', 'warning');
        return;
    }

    // Update all windows with this project name
    let count = 0;
    windows.forEach(w => {
        if ((w.projectName || 'Unassigned') === currentProjectToRename) {
            w.projectName = newName;
            count++;
        }
    });

    autoSaveWindows();
    closeRenameProjectModal();
    displayWindows();
    refreshProjectSelector();

    showAlert(`✅ Project renamed! Updated ${count} item(s) from "${currentProjectToRename}" to "${newName}".`);
}

function deleteProject(projectName) {
    if (projectName === 'Unassigned') {
        showAlert('⚠️ Cannot delete the "Unassigned" project.', 'warning');
        return;
    }

    const projectItems = windows.filter(w => (w.projectName || 'Unassigned') === projectName);

    showConfirm(
        `🗑️ Delete Project "${projectName}"?\n\nThis will move ${projectItems.length} item(s) to "Unassigned".`,
        () => {
            // Move all items to Unassigned
            windows.forEach(w => {
                if ((w.projectName || 'Unassigned') === projectName) {
                    w.projectName = 'Unassigned';
                }
            });

            autoSaveWindows();
            displayWindows();
            refreshProjectSelector();

            showAlert(`✅ Project "${projectName}" deleted. ${projectItems.length} item(s) moved to "Unassigned".`);
        }
    );
}

function editWindow(idx) {
    const win = windows[idx];
    document.getElementById('editWindowIndex').value = idx;
    document.getElementById('editConfigId').value = win.configId;
    document.getElementById('editProjectName').value = win.projectName;
    document.getElementById('editWidth').value = convertFromInches(win.width);
    document.getElementById('editHeight').value = convertFromInches(win.height);
    document.getElementById('editTracks').value = win.tracks;
    document.getElementById('editShutters').value = win.shutters;
    document.getElementById('editMosquitoShutters').value = win.mosquitoShutters;

    // Set Vendor and filter series
    const vendorSelector = document.getElementById('editWindowVendor');
    vendorSelector.value = win.vendor || '';
    filterEditSeriesByVendor();

    document.getElementById('editSeries').value = win.series;
    document.getElementById('editDescription').value = win.description;

    // New Vitco fields
    if (document.getElementById('editGlassUnit')) {
        document.getElementById('editGlassUnit').value = win.glassUnit || 'SGU';
        updateEditGlassThicknessOptions();
        document.getElementById('editGlassThickness').value = win.glassThickness || '5';
    }
    if (document.getElementById('editGlassToughened')) {
        document.getElementById('editGlassToughened').checked = !!win.glassToughened;
    }
    if (document.getElementById('editCornerJoint')) document.getElementById('editCornerJoint').value = win.cornerJoint || '90';
    if (document.getElementById('editInterlockType')) document.getElementById('editInterlockType').value = win.interlockType || 'slim';

    if (document.getElementById('editMosquitoType')) document.getElementById('editMosquitoType').value = win.mosquitoType || 'V-2513';
    if (document.getElementById('editMosquitoInterlock')) document.getElementById('editMosquitoInterlock').value = win.mosquitoInterlock || 'V-2516';
    if (document.getElementById('editMosquitoMiddle')) document.getElementById('editMosquitoMiddle').checked = !!win.mosquitoMiddle;
    toggleEditMosquitoConfig();

    // Toggle specific fields based on series/category
    const isDoor = (win.series === 'Door');
    const winFields = document.getElementById('editWindowSpecificFields');
    const doorFields = document.getElementById('editDoorSpecificFields');

    if (isDoor) {
        if (winFields) winFields.style.display = 'none';
        if (doorFields) {
            doorFields.style.display = 'block';
            document.getElementById('editDoorFrame').value = win.frame || '1';
            document.getElementById('editDoorHandleProfile').value = win.handleProfile || 'Door Vertical';
            document.getElementById('editDoorBottomProfile').value = win.bottomProfile || 'Door Bottom';
            document.getElementById('editDoorMiddleWidth').value = win.middleWidth || '47.5';
            document.getElementById('editDoorTopWidth').value = win.topWidth || '47.5';
        }
    } else {
        if (winFields) winFields.style.display = 'block';
        if (doorFields) doorFields.style.display = 'none';
    }

    document.getElementById('editWindowModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function toggleMosquitoConfig() {
    const msCount = parseInt(document.getElementById('mosquitoShutters').value);
    const row = document.getElementById('mosquitoConfigRow');
    if (row) {
        row.style.display = msCount > 0 ? 'flex' : 'none';
    }
    // Show "Mosquito Middle" only for 27mm Domal series (per v1.31 spec)
    const mmGrp = document.getElementById('mosquitoMiddleGroup');
    if (mmGrp) {
        const seriesEl = document.getElementById('series');
        const seriesVal = seriesEl ? seriesEl.value : '';
        mmGrp.style.display = (msCount > 0 && seriesVal === '27mm Domal') ? '' : 'none';
    }
}

function updateGlassThicknessOptions() {
    const unit = document.getElementById('glassUnit').value;
    const thicknessSelect = document.getElementById('glassThickness');
    if (!thicknessSelect) return;

    thicknessSelect.innerHTML = '';
    if (unit === 'SGU') {
        ['5', '6', '8'].forEach(t => {
            thicknessSelect.innerHTML += `<option value="${t}">${t}mm</option>`;
        });
    } else if (unit === 'DGU') {
        ['12', '15', '18'].forEach(t => {
            thicknessSelect.innerHTML += `<option value="${t}">${t}mm</option>`;
        });
    } else {
        thicknessSelect.innerHTML = '<option value="0">N/A</option>';
    }
}

function closeEditWindowModal() {
    document.getElementById('editWindowModal').classList.remove('active');
    document.body.style.overflow = '';
}

function toggleEditMosquitoConfig() {
    const msCount = parseInt(document.getElementById('editMosquitoShutters').value);
    const row = document.getElementById('editMosquitoConfigRow');
    if (row) {
        row.style.display = msCount > 0 ? 'flex' : 'none';
    }
    const mmGrp = document.getElementById('editMosquitoMiddleGroup');
    if (mmGrp) {
        const seriesEl = document.getElementById('editSeries');
        const seriesVal = seriesEl ? seriesEl.value : '';
        mmGrp.style.display = (msCount > 0 && seriesVal === '27mm Domal') ? '' : 'none';
    }
}

function updateEditGlassThicknessOptions() {
    const unit = document.getElementById('editGlassUnit').value;
    const thicknessSelect = document.getElementById('editGlassThickness');
    if (!thicknessSelect) return;

    thicknessSelect.innerHTML = '';
    if (unit === 'SGU') {
        ['5', '6', '8'].forEach(t => {
            thicknessSelect.innerHTML += `<option value="${t}">${t}mm</option>`;
        });
    } else if (unit === 'DGU') {
        ['12', '15', '18'].forEach(t => {
            thicknessSelect.innerHTML += `<option value="${t}">${t}mm</option>`;
        });
    } else {
        thicknessSelect.innerHTML = '<option value="0">N/A</option>';
    }
}

function saveWindowEdit(event) {
    event.preventDefault();
    const idx = parseInt(document.getElementById('editWindowIndex').value);

    const widthRaw = parseDimension(document.getElementById('editWidth').value);
    const heightRaw = parseDimension(document.getElementById('editHeight').value);
    const shutters = parseInt(document.getElementById('editShutters').value, 10);

    const isDoor = (document.getElementById('editSeries').value === 'Door');

    // Validation
    if (widthRaw <= 0 || heightRaw <= 0) {
        showAlert('❌ Error: Width and Height must be greater than zero.', 'error');
        return;
    }

    const updatedWindow = {
        configId: document.getElementById('editConfigId').value,
        projectName: document.getElementById('editProjectName').value,
        vendor: document.getElementById('editWindowVendor').value,
        width: convertToInches(widthRaw),
        height: convertToInches(heightRaw),
        series: document.getElementById('editSeries').value,
        description: document.getElementById('editDescription').value,
        glassUnit: document.getElementById('editGlassUnit')?.value || 'SGU',
        glassThickness: document.getElementById('editGlassThickness')?.value || '5',
        glassToughened: document.getElementById('editGlassToughened')?.checked || false,
        cornerJoint: document.getElementById('editCornerJoint')?.value || '90',
        interlockType: document.getElementById('editInterlockType')?.value || 'slim',
        mosquitoType: document.getElementById('editMosquitoType')?.value || 'V-2513',
        mosquitoInterlock: document.getElementById('editMosquitoInterlock')?.value || 'V-2516',
        mosquitoMiddle: document.getElementById('editMosquitoMiddle')?.checked || false
    };

    if (isDoor) {
        updatedWindow.frame = parseInt(document.getElementById('editDoorFrame').value);
        updatedWindow.handleProfile = document.getElementById('editDoorHandleProfile').value;
        updatedWindow.bottomProfile = document.getElementById('editDoorBottomProfile').value;
        updatedWindow.verticalWidth = 47.5; // Standard
        updatedWindow.topWidth = parseFloat(document.getElementById('editDoorTopWidth').value);
        updatedWindow.middleWidth = parseFloat(document.getElementById('editDoorMiddleWidth').value);

        // Bottom width logic (must match addDoor() logic)
        if (updatedWindow.bottomProfile === 'Door Top 47.5')  updatedWindow.bottomWidth = 47.5;
        else if (updatedWindow.bottomProfile === 'Door Top 85') updatedWindow.bottomWidth = 85;
        else updatedWindow.bottomWidth = 114.5; // Door Bottom is always 114.5mm

        // Force defaults
        updatedWindow.tracks = 0;
        updatedWindow.shutters = 1;
        updatedWindow.mosquitoShutters = 0;
    } else {
        updatedWindow.tracks = parseInt(document.getElementById('editTracks').value);
        updatedWindow.shutters = parseInt(document.getElementById('editShutters').value);
        updatedWindow.mosquitoShutters = parseInt(document.getElementById('editMosquitoShutters').value);
    }

    // MERGE instead of REPLACE — preserves fields the edit modal doesn't expose
    // (accessories, upperPartition, lowerPartition, leaves, closingMechanism,
    //  middleRailPositionMM, floorSpringHingeProfile, handleWidth, handleProfileNew,
    //  doorType, qty, location, acpFacing, etc.)
    // Without this, editing any field silently wiped all unedited data.
    const original = windows[idx] || {};
    windows[idx] = { ...original, ...updatedWindow };

    autoSaveWindows();
    closeEditWindowModal();
    displayWindows();
    refreshProjectSelector();
    showAlert('✅ Window updated successfully!');
}

function deleteWindow(idx) {
    showConfirm('Delete this window?', () => {
        windows.splice(idx, 1);
        autoSaveWindows();
        displayWindows();
        refreshProjectSelector();
    });
}

// ============================================================================
// FORMULA MANAGEMENT
// ============================================================================

function refreshFormulasDisplay() {
    const container = document.getElementById('formulasList');
    if (!container) return;
    let html = '';

    Object.entries(seriesFormulas).forEach(([series, formulas]) => {
        html += `
        <details class="formula-card" style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <summary style="padding: 15px; background: #f8f9fa; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 1.1em; border-bottom: 1px solid #eee;">
                <span>🧪 ${series} Series</span>
                <div onclick="event.preventDefault();">
                    <button class="btn btn-success btn-sm" onclick="showAddComponentModal('${series}')">➕ Add Component</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSeries('${series}')">🗑️ Delete Series</button>
                    <span style="font-size: 0.8em; color: #666; margin-left: 10px;">(${formulas.length} items)</span>
                </div>
            </summary>
            <div style="padding: 15px;">`;

        formulas.forEach((f, idx) => {
            html += `
                <div class="formula-item" style="border-bottom: 1px solid #f0f0f0; margin-bottom: 15px; padding-bottom: 15px; last-child { border-bottom: none; }">
                    <div class="formula-content">
                        <strong>${f.desc}:</strong><br>
                        Component: <code>${f.component}</code><br>
                        Quantity: <code>${f.qty}</code> pieces<br>
                        Length: <code>${f.length}</code> inches
                    </div>
                    <div class="formula-actions" style="margin-top: 10px;">
                        <button class="btn btn-warning btn-sm" onclick="editFormula('${series}', ${idx})">✏️ Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteFormula('${series}', ${idx})">🗑️</button>
                    </div>
                </div>`;
        });

        if (formulas.length === 0) {
            html += `<p style="color: #666; font-style: italic;">No components added for this series yet.</p>`;
        }

        html += `
            </div>
        </details>`;
    });

    container.innerHTML = html || '<p class="alert alert-warning">No series formulas configured yet.</p>';
}

function showAddComponentModal(series) {
    document.getElementById('addComponentSeries').value = series;
    document.getElementById('modalComponentName').value = '';
    document.getElementById('modalComponentQty').value = '';
    document.getElementById('modalComponentLength').value = '';
    document.getElementById('modalComponentDesc').value = '';
    document.getElementById('addComponentModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddComponentModal() {
    document.getElementById('addComponentModal').classList.remove('active');
    document.body.style.overflow = '';
}

function saveNewComponent(event) {
    event.preventDefault();
    const series = document.getElementById('addComponentSeries').value;
    const component = document.getElementById('modalComponentName').value;
    const qty = document.getElementById('modalComponentQty').value;
    const length = document.getElementById('modalComponentLength').value;
    const desc = document.getElementById('modalComponentDesc').value;

    if (!seriesFormulas[series]) {
        seriesFormulas[series] = [];
    }

    seriesFormulas[series].push({ component, qty, length, desc });
    autoSaveFormulas();
    closeAddComponentModal();
    refreshFormulasDisplay();
    showAlert('✅ Component added successfully!');
}

function editFormula(series, idx) {
    const formula = seriesFormulas[series][idx];
    document.getElementById('editFormulaSeries').value = series;
    document.getElementById('editFormulaIndex').value = idx;
    document.getElementById('editFormulaComponent').value = formula.component;
    document.getElementById('editFormulaDesc').value = formula.desc;
    document.getElementById('editFormulaQty').value = formula.qty;
    document.getElementById('editFormulaLength').value = formula.length;
    document.getElementById('editFormulaModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeEditFormulaModal() {
    document.getElementById('editFormulaModal').classList.remove('active');
    document.body.style.overflow = '';
}

function saveFormulaEdit(event) {
    event.preventDefault();
    const series = document.getElementById('editFormulaSeries').value;
    const idx = parseInt(document.getElementById('editFormulaIndex').value);

    seriesFormulas[series][idx] = {
        component: document.getElementById('editFormulaComponent').value,
        desc: document.getElementById('editFormulaDesc').value,
        qty: document.getElementById('editFormulaQty').value,
        length: document.getElementById('editFormulaLength').value
    };

    autoSaveFormulas();
    closeEditFormulaModal();
    refreshFormulasDisplay();
    showAlert('✅ Formula updated successfully!');
}

function deleteFormula(series, idx) {
    showConfirm('Delete this formula?', () => {
        seriesFormulas[series].splice(idx, 1);
        autoSaveFormulas();
        refreshFormulasDisplay();
    });
}

function addNewSeries(event) {
    event.preventDefault();
    let seriesName = document.getElementById('newSeriesName').value.trim();

    // Market Standard Normalization
    if (seriesName === '1') seriesName = '1"';
    if (seriesName === '3/4') seriesName = '3/4"';

    if (!seriesFormulas[seriesName]) {
        seriesFormulas[seriesName] = [];
        stockMaster[seriesName] = [];
        hardwareMaster[seriesName] = []; // Ensure hardware entry exists too
    }

    seriesFormulas[seriesName].push({
        component: document.getElementById('newComponentName').value,
        qty: document.getElementById('newQtyFormula').value,
        length: document.getElementById('newLengthFormula').value,
        desc: document.getElementById('newComponentDesc').value
    });

    autoSaveFormulas();
    autoSaveStock();
    showAlert('✅ Component added to ' + seriesName + ' series!');
    document.getElementById('newSeriesForm').reset();
    refreshAllUI();
}

function deleteSeries(series) {
    showConfirm('Delete entire ' + series + ' series?', () => {
        delete seriesFormulas[series];
        delete stockMaster[series];
        autoSaveFormulas();
        autoSaveStock();
        refreshAllUI();
    });
}

// ============================================================================
// STOCK MANAGEMENT
// ============================================================================

function refreshStockMaster() {
    const container = document.getElementById('stockMasterList');
    if (!container) return;
    container.innerHTML = '';

    // Backfill missing supplier info from Registry
    if (window.SUPPLIER_REGISTRY) {
        Object.entries(stockMaster).forEach(([series, stocks]) => {
            // Check if this series belongs to a known supplier
            let foundSupplier = null;
            Object.entries(window.SUPPLIER_REGISTRY).forEach(([supName, supData]) => {
                if (supData.sections && supData.sections[series]) {
                    foundSupplier = supName;
                }
            });

            // Heuristic for VITCO series not in registry (User Request)
            if (!foundSupplier) {
                if (series.includes('UMA') || series.includes('Gulf') || series.includes('Pro')) {
                    foundSupplier = 'VITCO';
                }
            }

            if (foundSupplier) {
                stocks.forEach(stock => {
                    if (!stock.supplier) stock.supplier = foundSupplier;
                });
            }
        });
    }

    // Reorganize stockMaster by Supplier -> Series -> Items
    const bySupplier = {};

    Object.entries(stockMaster).forEach(([series, stocks]) => {
        stocks.forEach((stock, idx) => {
            const supplierName = stock.supplier || 'Unknown Supplier';
            if (!bySupplier[supplierName]) bySupplier[supplierName] = {};
            if (!bySupplier[supplierName][series]) bySupplier[supplierName][series] = [];
            bySupplier[supplierName][series].push({ ...stock, _origIdx: idx, _origSeries: series });
        });
    });

    // Create UI for each supplier
    Object.entries(bySupplier).forEach(([supplierName, seriesData]) => {
        // Count total items for this supplier
        let totalItems = 0;
        Object.values(seriesData).forEach(items => totalItems += items.length);

        // Supplier-level collapsible
        const supplierDetails = document.createElement('details');
        supplierDetails.className = 'supplier-group';
        supplierDetails.style.marginBottom = '15px';
        supplierDetails.style.border = '2px solid #3498db';
        supplierDetails.style.borderRadius = '10px';
        supplierDetails.style.background = 'white';
        supplierDetails.open = true;

        supplierDetails.innerHTML = `
            <summary style="padding: 15px; cursor: pointer; font-weight: bold; background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; border-radius: 8px 8px 0 0; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                <span>🏭 ${supplierName}</span>
                <span style="font-size: 0.85em; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px;">${totalItems} items</span>
            </summary>
            <div class="supplier-content" style="padding: 10px;"></div>
        `;

        const supplierContent = supplierDetails.querySelector('.supplier-content');

        // Create series-level collapsibles inside supplier
        Object.entries(seriesData).forEach(([series, stocks]) => {
            // Sort by material then thickness
            stocks.sort((a, b) => {
                if (a.material < b.material) return -1;
                if (a.material > b.material) return 1;
                return (parseFloat(a.thickness) || 0) - (parseFloat(b.thickness) || 0);
            });

            const seriesDetails = document.createElement('details');
            seriesDetails.className = 'series-group';
            seriesDetails.style.marginBottom = '8px';
            seriesDetails.style.border = '1px solid #ddd';
            seriesDetails.style.borderRadius = '6px';
            seriesDetails.style.background = '#fafafa';
            // Auto-expand Door series
            if (series.includes('Door')) seriesDetails.open = true;

            seriesDetails.innerHTML = `
                <summary style="padding: 10px 12px; cursor: pointer; font-weight: 600; background: #f0f0f0; border-radius: 6px; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>📦 ${series} Series</span>
                        <button class="btn btn-outline-secondary btn-sm" onclick="event.preventDefault(); resetStockSeries('${series}')" style="font-size: 0.65em; padding: 2px 5px;">↻ Refetch</button>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size: 0.75em; color: #666;">(${stocks.length} items)</span>
                        <input type="number" value="${stockRates[series] || 250}" onchange="updateStockRate('${series}', this.value)" style="width: 65px; padding: 3px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.8em;" title="Rate ₹/kg">
                    </div>
                </summary>
                <div style="padding: 10px; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                        <thead>
                            <tr style="border-bottom: 2px solid #eee; text-align: left;">
                                <th style="padding: 6px;">Material</th>
                                <th style="padding: 6px;">Section No</th>
                                <th style="padding: 6px;">Thickness</th>
                                <th style="padding: 6px;">Weight</th>
                                <th style="padding: 6px;">Stock 1</th>
                                <th style="padding: 6px;">Cost ₹</th>
                                <th style="padding: 6px;">Stock 2</th>
                                <th style="padding: 6px;">Cost ₹</th>
                                <th style="padding: 6px; text-align: center;">❌</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            `;

            const tbody = seriesDetails.querySelector('tbody');
            const rate = parseFloat(stockRates[series] || 250);

            stocks.forEach((stock) => {
                const row = tbody.insertRow();
                row.style.borderBottom = '1px solid #f0f0f0';

                const currentWeight = stock.weight || 0;
                const calcCost1 = (currentWeight > 0) ? Math.round((parseFloat(stock.stock1 || 0) / 144) * currentWeight * rate) : stock.stock1Cost;
                const calcCost2 = (currentWeight > 0) ? Math.round((parseFloat(stock.stock2 || 0) / 144) * currentWeight * rate) : stock.stock2Cost;
                const origSeries = stock._origSeries;
                const origIdx = stock._origIdx;

                row.innerHTML = `
                    <td style="padding: 6px; font-weight: 500;">${stock.material}</td>
                    <td style="padding: 6px; font-size: 0.85em; color: #666;">${stock.sectionNo || '-'}</td>
                    <td style="padding: 6px; font-weight: bold; color: #007bff;">${stock.thickness ? stock.thickness + 'mm' : '-'}</td>
                    <td style="padding: 6px; color: #555;">${currentWeight ? parseFloat(currentWeight).toFixed(3) : '-'}</td>
                    <td style="padding: 6px;"><input type="number" value="${stock.stock1}" onchange="updateStock('${origSeries}', ${origIdx}, 'stock1', this.value)" style="width: 60px; padding: 4px; border: 1px solid #ddd; border-radius: 3px;"></td>
                    <td style="padding: 6px;"><input type="number" value="${calcCost1}" style="width: 60px; padding: 4px; border: 1px solid #ddd; border-radius: 3px; background: #f9f9f9;" readonly></td>
                    <td style="padding: 6px;"><input type="number" value="${stock.stock2}" onchange="updateStock('${origSeries}', ${origIdx}, 'stock2', this.value)" style="width: 60px; padding: 4px; border: 1px solid #ddd; border-radius: 3px;"></td>
                    <td style="padding: 6px;"><input type="number" value="${calcCost2}" style="width: 60px; padding: 4px; border: 1px solid #ddd; border-radius: 3px; background: #f9f9f9;" readonly></td>
                    <td style="padding: 6px; text-align:center"><button class="btn btn-danger btn-sm" onclick="deleteStock('${origSeries}', ${origIdx})" style="padding: 2px 6px; font-size: 0.75em;">🗑️</button></td>
                `;
            });

            supplierContent.appendChild(seriesDetails);
        });

        container.appendChild(supplierDetails);
    });
}

function addNewStock(event) {
    event.preventDefault();
    const series = document.getElementById('newStockSeries').value;

    if (!stockMaster[series]) {
        stockMaster[series] = [];
    }

    stockMaster[series].push({
        material: document.getElementById('newStockMaterial').value,
        supplier: document.getElementById('newStockSupplier').value,
        sectionNo: document.getElementById('newStockSectionNo').value,
        thickness: tempSupData.t,
        weight: tempSupData.weight,
        stock1: parseFloat(document.getElementById('newStock1').value),
        stock1Cost: parseFloat(document.getElementById('newStock1Cost').value),
        stock2: parseFloat(document.getElementById('newStock2').value),
        stock2Cost: parseFloat(document.getElementById('newStock2Cost').value)
    });

    autoSaveStock();
    showAlert('✅ Stock material added!');
    document.getElementById('newStockForm').reset();
    tempSupData = { t: 0, weight: 0 };
    refreshStockMaster();
}

function updateStock(series, idx, field, value) {
    stockMaster[series][idx][field] = parseFloat(value);
    autoSaveStock();
}

function deleteStock(series, idx) {
    showConfirm('Delete this stock material?', () => {
        stockMaster[series].splice(idx, 1);
        autoSaveStock();
        refreshStockMaster();
    });
}

function updateKerf() {
    kerf = parseFloat(document.getElementById('kerfGlobal').value);
    autoSaveSettings();
}

function updateAluminumRate() {
    const el = document.getElementById('aluminumRate');
    if (el) aluminumRate = parseFloat(el.value);
    autoSaveSettings();
}

// ============================================================================
// HARDWARE MASTER MANAGEMENT
// ============================================================================

function refreshHardwareMaster() {
    const container = document.getElementById('hardwareMasterList');
    if (!container) return;
    // Ensure Door series is seeded (in case localStorage didn't have it yet)
    getDoorHardwareList();

    let html = '';

    // Pin Door series at top of the list so users find it quickly
    const seriesKeys = Object.keys(hardwareMaster);
    seriesKeys.sort((a, b) => {
        if (a === 'Door') return -1;
        if (b === 'Door') return 1;
        return 0;
    });

    seriesKeys.forEach(series => {
        const hardwareItems = hardwareMaster[series];
        const isDoor = series === 'Door';
        const titleIcon = isDoor ? '🚪' : '🪟';
        const colTitle = isDoor ? `${titleIcon} Door Accessories` : `${titleIcon} ${series} Series Hardware`;

        // Column widths differ slightly for Door (extra mechanism column)
        const cols = isDoor
            ? `<th style="width: 22%">Hardware Item</th>
               <th style="width: 14%">Mechanism</th>
               <th style="width: 10%">Unit</th>
               <th style="width: 30%">Quantity Formula <span class="formula-info-icon" title="L: Number of leaves (1 single, 2 double). W,H: door width/height.">ⓘ</span></th>
               <th style="width: 14%">Rate (₹)</th>
               <th style="width: 10%">Actions</th>`
            : `<th style="width: 25%">Hardware Item</th>
               <th style="width: 10%">Unit</th>
               <th style="width: 40%">Quantity Formula <span class="formula-info-icon" title="H: Height, W: Width, S: Shutters, MS: Mosquito, T: Tracks, GL: Get Length">ⓘ</span></th>
               <th style="width: 15%">Rate (₹)</th>
               <th style="width: 10%">Actions</th>`;

        html += `< div class="stock-material-card" >
            <h4>${colTitle}
                <button class="btn btn-success btn-sm" style="float: right;" onclick="showAddHardwareModal('${series}')">➕ Add Item</button>
            </h4>
            <div style="overflow-x: auto;">
                <table class="hardware-table">
                    <thead><tr>${cols}</tr></thead>
                    <tbody>`;

        hardwareItems.forEach((item, idx) => {
            // Per-item row
            const nameCell = `<td><input type="text" value="${item.hardware || ''}" onchange="updateHardwareField('${series}', ${idx}, 'hardware', this.value)" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px; font-weight: 500;"></td>`;
            const unitCell = `<td><input type="text" value="${item.unit || 'Nos'}" onchange="updateHardwareField('${series}', ${idx}, 'unit', this.value)" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>`;
            const formulaCell = `<td><input type="text" value="${item.formula || ''}" onchange="updateHardwareField('${series}', ${idx}, 'formula', this.value)" style="width: 100%; font-family: monospace; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>`;
            const rateCell = `<td><input type="number" value="${item.rate}" onchange="updateHardwareField('${series}', ${idx}, 'rate', this.value)" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;"></td>`;
            const actionCell = `<td><button class="btn btn-danger btn-sm" onclick="deleteHardwareItem('${series}', ${idx})">🗑️</button></td>`;

            if (isDoor) {
                const mech = item.mechanism || 'both';
                const mechCell = `<td>
                    <select onchange="updateHardwareField('${series}', ${idx}, 'mechanism', this.value)" style="width:100%;padding:5px;border:1px solid #ddd;border-radius:4px;">
                        <option value="both"        ${mech==='both'        ?'selected':''}>Both</option>
                        <option value="Hinge"       ${mech==='Hinge'       ?'selected':''}>Hinge only</option>
                        <option value="FloorSpring" ${mech==='FloorSpring' ?'selected':''}>Floor Spring only</option>
                    </select>
                </td>`;
                html += `<tr>${nameCell}${mechCell}${unitCell}${formulaCell}${rateCell}${actionCell}</tr>`;
                // Variant editor row (collapsible, full-width sub-table)
                html += `<tr class="hardware-variant-row" style="background:#fffaf3;">
                    <td colspan="6" style="padding:0;">
                        ${renderDoorVariantEditor(idx, item)}
                    </td>
                </tr>`;
            } else {
                html += `<tr>${nameCell}${unitCell}${formulaCell}${rateCell}${actionCell}</tr>`;
            }
        });

        html += '</tbody></table></div></div > ';
    });

    container.innerHTML = html;
}

function updateHardwareField(series, idx, field, value) {
    if (field === 'rate') {
        hardwareMaster[series][idx][field] = parseFloat(value);
    } else {
        hardwareMaster[series][idx][field] = value;
    }
    autoSaveHardwareMaster();
}

// ── Door variant editor (Hardware Master Configuration) ────────────────────
function renderDoorVariantEditor(idx, item) {
    const variants = Array.isArray(item.variants) ? item.variants : [];
    const defaultLabel = item.defaultVariant || '';
    const countLabel = variants.length === 0
        ? 'No variants — uses base rate only'
        : `${variants.length} variant${variants.length > 1 ? 's' : ''}`;

    let rowsHtml = '';
    variants.forEach((v, vi) => {
        const isDefault = v.label === defaultLabel;
        rowsHtml += `<tr style="border-bottom:1px solid #f0e0c8;">
            <td style="padding:4px 8px;">
                <input type="text" value="${escapeHtml(v.label || '')}"
                    onchange="updateDoorVariantField(${idx}, ${vi}, 'label', this.value)"
                    style="width:100%;padding:4px 6px;border:1px solid #ddd;border-radius:3px;font-size:12px;">
            </td>
            <td style="padding:4px 8px;width:90px;">
                <input type="number" value="${v.rate != null ? v.rate : 0}" min="0"
                    onchange="updateDoorVariantField(${idx}, ${vi}, 'rate', this.value)"
                    style="width:100%;padding:4px 6px;border:1px solid #ddd;border-radius:3px;font-size:12px;">
            </td>
            <td style="padding:4px 8px;width:90px;text-align:center;">
                <button type="button" onclick="setDoorVariantDefault(${idx}, ${vi})"
                    style="padding:2px 8px;font-size:11px;background:${isDefault ? '#27ae60' : '#ecf0f1'};color:${isDefault ? 'white' : '#555'};border:none;border-radius:3px;cursor:pointer;">
                    ${isDefault ? '★ Default' : 'Make Default'}
                </button>
            </td>
            <td style="padding:4px 8px;width:50px;text-align:center;">
                <button type="button" onclick="deleteDoorVariant(${idx}, ${vi})"
                    style="padding:2px 8px;font-size:12px;background:#e74c3c;color:white;border:none;border-radius:3px;cursor:pointer;">🗑</button>
            </td>
        </tr>`;
    });

    return `<details ${variants.length > 0 ? '' : ''} style="padding:6px 14px 8px;">
        <summary style="cursor:pointer;font-size:12px;color:#bf360c;font-weight:600;user-select:none;list-style:none;">
            ▸ Variants — <span style="font-weight:400;color:#888;">${countLabel}</span>
        </summary>
        <div style="margin:8px 0 4px;">
            ${variants.length === 0 ? '' : `
            <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #f0e0c8;border-radius:4px;font-size:12px;">
                <thead><tr style="background:#fff3e0;">
                    <th style="padding:4px 8px;text-align:left;font-size:11px;color:#7f4e00;">Variant Label</th>
                    <th style="padding:4px 8px;text-align:left;font-size:11px;color:#7f4e00;">Rate (₹)</th>
                    <th style="padding:4px 8px;text-align:center;font-size:11px;color:#7f4e00;">Default</th>
                    <th style="padding:4px 8px;text-align:center;font-size:11px;color:#7f4e00;"></th>
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>`}
            <button type="button" onclick="addDoorVariant(${idx})"
                style="margin-top:8px;padding:4px 12px;font-size:12px;background:#e67e22;color:white;border:none;border-radius:4px;cursor:pointer;">
                ➕ Add Variant
            </button>
            <p style="font-size:11px;color:#888;margin:6px 0 0;">
                When a door is added/edited, this item's row shows a dropdown of these variants.
                The chosen variant's rate overrides the base rate for that door.
            </p>
        </div>
    </details>`;
}

function addDoorVariant(itemIdx) {
    const list = hardwareMaster.Door || [];
    const item = list[itemIdx];
    if (!item) return;
    if (!Array.isArray(item.variants)) item.variants = [];
    item.variants.push({ label: 'New Variant', rate: item.rate || 100 });
    if (!item.defaultVariant && item.variants.length === 1) item.defaultVariant = 'New Variant';
    autoSaveHardwareMaster();
    refreshHardwareMaster();
}

function updateDoorVariantField(itemIdx, variantIdx, field, value) {
    const list = hardwareMaster.Door || [];
    const item = list[itemIdx];
    if (!item || !Array.isArray(item.variants) || !item.variants[variantIdx]) return;
    const v = item.variants[variantIdx];
    const oldLabel = v.label;
    if (field === 'rate') {
        v.rate = parseFloat(value) || 0;
    } else if (field === 'label') {
        v.label = value;
        // If this variant was the default, keep it as default under the new label
        if (item.defaultVariant === oldLabel) item.defaultVariant = value;
    }
    autoSaveHardwareMaster();
    // No full refresh — let the edited input keep focus
}

function setDoorVariantDefault(itemIdx, variantIdx) {
    const list = hardwareMaster.Door || [];
    const item = list[itemIdx];
    if (!item || !Array.isArray(item.variants) || !item.variants[variantIdx]) return;
    item.defaultVariant = item.variants[variantIdx].label;
    autoSaveHardwareMaster();
    refreshHardwareMaster();
}

function deleteDoorVariant(itemIdx, variantIdx) {
    const list = hardwareMaster.Door || [];
    const item = list[itemIdx];
    if (!item || !Array.isArray(item.variants) || !item.variants[variantIdx]) return;
    const removed = item.variants.splice(variantIdx, 1)[0];
    // If we removed the default, pick the next one (or null if empty)
    if (item.defaultVariant === removed.label) {
        item.defaultVariant = item.variants[0]?.label || null;
    }
    autoSaveHardwareMaster();
    refreshHardwareMaster();
}

function showAddHardwareModal(series) {
    document.getElementById('addHardwareSeries').value = series;
    document.getElementById('modalHardwareName').value = '';
    document.getElementById('modalHardwareUnit').value = 'Nos';
    document.getElementById('modalHardwareFormula').value = '';
    document.getElementById('modalHardwareRate').value = '';
    // Show mechanism dropdown only when adding to Door series
    const mechRow = document.getElementById('modalHardwareMechanismRow');
    if (mechRow) {
        mechRow.style.display = (series === 'Door') ? '' : 'none';
        const mechEl = document.getElementById('modalHardwareMechanism');
        if (mechEl) mechEl.value = 'both';
    }
    document.getElementById('addHardwareModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddHardwareModal() {
    document.getElementById('addHardwareModal').classList.remove('active');
    document.body.style.overflow = '';
}

function saveNewHardwareItem(event) {
    event.preventDefault();
    const series = document.getElementById('addHardwareSeries').value;
    const hardware = document.getElementById('modalHardwareName').value;
    const unit = document.getElementById('modalHardwareUnit').value;
    const formula = document.getElementById('modalHardwareFormula').value;
    const rate = parseFloat(document.getElementById('modalHardwareRate').value) || 0;

    if (!hardwareMaster[series]) hardwareMaster[series] = [];

    const newItem = { hardware, unit, formula, rate };
    if (series === 'Door') {
        const mechEl = document.getElementById('modalHardwareMechanism');
        newItem.mechanism = (mechEl && mechEl.value) || 'both';
    }
    hardwareMaster[series].push(newItem);
    autoSaveHardwareMaster();
    closeAddHardwareModal();
    refreshHardwareMaster();
    showAlert('✅ Hardware item added!');
}

function deleteHardwareItem(series, idx) {
    showConfirm(`Delete ${hardwareMaster[series][idx].hardware}?`, () => {
        hardwareMaster[series].splice(idx, 1);
        autoSaveHardwareMaster();
        refreshHardwareMaster();
    });
}

function autoSaveHardwareMaster() {
    localStorage.setItem('hardwareMaster', JSON.stringify(hardwareMaster));
}

// ============================================================================
// PROJECT SELECTOR
// ============================================================================

function refreshProjectSelector() {
    const select = document.getElementById('projectSelector');
    const projects = [...new Set(windows.map(w => w.projectName))];

    select.innerHTML = '<option value="">-- Select Project --</option>';
    projects.forEach(proj => {
        const count = windows.filter(w => w.projectName === proj).length;
        select.innerHTML += `<option value="${proj}">${proj} (${count} windows)</option>`;
    });

    select.onchange = function () {
        const info = document.getElementById('projectInfo');
        const supplierSelect = document.getElementById('projectSupplierSelector');

        if (this.value) {
            const count = windows.filter(w => w.projectName === this.value).length;
            const seriesTypes = [...new Set(windows.filter(w => w.projectName === this.value).map(w => w.series))];
            info.innerHTML = `<strong>${count}</strong> windows | Series: <strong>${seriesTypes.join(', ')}</strong>`;

            // Load saved supplier for this project
            if (projectSettings[this.value] && projectSettings[this.value].preferredSupplier) {
                supplierSelect.value = projectSettings[this.value].preferredSupplier;
            } else {
                supplierSelect.value = '';
            }
        } else {
            info.innerHTML = 'No project selected';
            supplierSelect.value = '';
        }
    };
}

// (initializeProjectSupplierSelector removed, moved to js/supplier_master.js)

function saveProjectSupplier() {
    const project = document.getElementById('projectSelector').value;
    const supplier = document.getElementById('projectSupplierSelector').value;

    if (!project) {
        showAlert('⚠️ Please select a project first!');
        document.getElementById('projectSupplierSelector').value = '';
        return;
    }

    if (!projectSettings[project]) {
        projectSettings[project] = {};
    }

    projectSettings[project].preferredSupplier = supplier;
    autoSaveProjectSettings();
    showAlert(`✅ Preferred supplier for ${project} set to: ${supplier || 'Automatic'}`);
}

// ============================================================================
// CLEAR DATA
// ============================================================================

// ----------------------------
// Custom themed alert & confirm modals
// ----------------------------
let __confirmCallback = null;

function showAlert(message, type = 'info', title = 'Notification') {
    const modal = document.getElementById('alertModal');
    const msgEl = document.getElementById('alertModalMessage');
    const titleEl = document.getElementById('alertModalTitle');
    const iconEl = document.getElementById('alertModalIcon');
    const okBtn = modal ? modal.querySelector('.btn-modal-success') : null;

    if (!modal || !msgEl) {
        alert(message);
        return;
    }

    // Set content
    msgEl.textContent = message;
    if (titleEl) titleEl.textContent = title;

    // Handle icons & button colors based on type
    if (iconEl) {
        if (message.includes('✅') || type === 'success') iconEl.textContent = '✅';
        else if (message.includes('⚠️') || type === 'warning') iconEl.textContent = '⚠️';
        else if (message.includes('❌') || type === 'error') iconEl.textContent = '❌';
        else iconEl.textContent = 'ℹ️';
    }

    if (okBtn) {
        // Reset classes
        okBtn.className = 'btn-modal';
        if (type === 'error' || message.includes('❌')) okBtn.classList.add('btn-modal-confirm');
        else okBtn.classList.add('btn-modal-success');
    }

    // Strip leading icon if found in text to avoid duplication
    msgEl.textContent = message.replace(/^[✅⚠️❌ℹ️]\s*/, '');

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function showConfirm(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmModalMessage');
    const iconEl = document.getElementById('confirmModalIcon');

    if (!modal || !msg) {
        if (confirm(message)) onConfirm && onConfirm();
        return;
    }

    msg.textContent = message;

    // Auto-detect warning icon
    if (iconEl) {
        if (message.includes('⚠️')) iconEl.textContent = '⚠️';
        else if (message.includes('🗑️')) iconEl.textContent = '🗑️';
        else iconEl.textContent = '❓';
    }

    // Strip icon from text
    msg.textContent = message.replace(/^[⚠️🗑️❓]\s*/, '');

    __confirmCallback = onConfirm;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    __confirmCallback = null;
}

// wire up buttons (if present)
function _wireConfirmButtons() {
    const ok = document.getElementById('confirmOkBtn');
    const cancel = document.getElementById('confirmCancelBtn');
    if (ok) {
        // avoid attaching multiple handlers
        ok.removeEventListener && ok.removeEventListener('click', ok._confirmHandler);
        ok._confirmHandler = function () {
            const cb = __confirmCallback; // capture before closing
            closeConfirmModal();
            if (typeof cb === 'function') cb();
        };
        ok.addEventListener('click', ok._confirmHandler);
    }
    if (cancel) {
        cancel.removeEventListener && cancel.removeEventListener('click', cancel._cancelHandler);
        cancel._cancelHandler = function () {
            closeConfirmModal();
        };
        cancel.addEventListener('click', cancel._cancelHandler);
    }
}

// Attempt immediate wiring and also wire on DOMContentLoaded as a fallback
_wireConfirmButtons();
document.addEventListener('DOMContentLoaded', _wireConfirmButtons);

function clearAllData() {
    showConfirm('⚠️ This will delete ALL saved data. Continue?', () => {
        StorageManager.clearAll();
        // Replace alert with modal-less notification or simple reload
        // you can add a toast later; for now reload to reflect cleared state
        location.reload();
    });
}

// ============================================================================
// INITIALIZATION ON PAGE LOAD
// ============================================================================

window.onload = function () {
    loadAllData();
    initializeDefaults();
    initializeSupplierMaster(); // New
    initializeProjectSupplierSelector(); // New
    repairVitcoFormulas(); // Force fix broken names/formulas
    refreshAllUI();

    // Initialize Vitco UI state
    updateGlassThicknessOptions();
    toggleMosquitoConfig();
};

/**
 * Force-repairs Vitco series data to fix naming mismatches and formula errors
 */
function repairVitcoFormulas() {
    const gulfKey = '25mm Gulf (Frame)';
    const highEndKey = '25mm High-End (Frame)';

    const gulfFormulas = [
        { component: 'Track', qty: '1', length: 'W', desc: 'Track Top' },
        { component: 'Track', qty: '1', length: 'W', desc: 'Track Bottom' },
        { component: 'Track', qty: '2', length: 'H', desc: 'Vertical Side Track' },
        { series: '25mm Shutter (Shared)', component: 'Sash', qty: '2', length: 'CJ == 90 ? H - 2.22 : H - 1.25', desc: 'Vertical Handles' },
        { series: '25mm Shutter (Shared)', component: 'Interlock', qty: 'IT == "slim" ? 2*S-2 : 0', length: 'CJ == 90 ? H - 2.22 : H - 1.25', desc: 'Slim Interlocks' },
        { series: '25mm Shutter (Shared)', component: 'Interlock', qty: 'IT == "universal" ? 2*S-2 : 0', length: 'CJ == 90 ? H - 2.22 : H - 1.25', desc: 'Universal Interlock (V-2521)' },
        { series: '25mm Shutter (Shared)', component: 'Sash', qty: '2*S', length: '(W - 1.02 + (IT == "slim" ? 0.787 : 0) * (S-1)) / S', desc: 'Shutter Top/Bottom' },
        { component: 'Auxiliary', qty: 'T', length: 'W', desc: 'Rail Cap (Bottom)' },
        { component: 'Auxiliary', qty: 'T', length: 'W', desc: 'Top Track Guide' },
        { component: 'Auxiliary', qty: '2*S + (MS > 0 ? 1 : 0)', desc: 'Locking Adapter', length: '0' },
        { series: '25mm Mosquito', component: 'Sash', qty: 'MS > 0 ? 2 : 0', length: 'MT == "V-2517" ? H - 2.22 : H - 1.25', desc: 'MS Vertical' },
        { series: '25mm Mosquito', component: 'Interlock', qty: 'MS > 0 ? 1 : 0', length: 'MT == "V-2517" ? H - 2.22 : H - 1.25', desc: 'MS Interlock' },
        { series: '25mm Mosquito', component: 'Sash', qty: 'MS > 0 ? 2 : 0', length: '(W - 1.02 + 0.787 * (S-1)) / S', desc: 'MS Top/Bottom' },
        { series: '25mm Mosquito', component: 'Auxiliary', qty: '4 * MS', desc: 'Mosquito Clip', length: '0' }
    ];

    const highEndFormulas = [
        { component: 'Track', qty: '4', length: 'H', desc: 'Track All Sides' },
        { series: '25mm Shutter (Shared)', component: 'Sash', qty: '2', length: 'CJ == 90 ? H - 2.22 : H - 1.25', desc: 'Vertical Handles' },
        { series: '25mm Shutter (Shared)', component: 'Interlock', qty: 'IT == "slim" ? 2*S-2 : 0', length: 'CJ == 90 ? H - 2.22 : H - 1.25', desc: 'Slim Interlocks' },
        { series: '25mm Shutter (Shared)', component: 'Interlock', qty: 'IT == "universal" ? 2*S-2 : 0', length: 'CJ == 90 ? H - 2.22 : H - 1.25', desc: 'Universal Interlock (V-2521)' },
        { series: '25mm Shutter (Shared)', component: 'Sash', qty: '2*S', length: '(W - 1.02 + (IT == "slim" ? 0.787 : 0) * (S-1)) / S', desc: 'Shutter Top/Bottom' },
        { component: 'Auxiliary', qty: 'T', length: 'W', desc: 'Rail Cap (Bottom)' },
        { component: 'Auxiliary', qty: '2*S + (MS > 0 ? 1 : 0)', desc: 'Locking Adapter', length: '0' }
    ];

    // Repair keys and formulas
    seriesFormulas[gulfKey] = gulfFormulas;
    seriesFormulas[highEndKey] = highEndFormulas;

    // Remove old broken keys if they exist
    delete seriesFormulas['Vitco 25mm Gulf'];
    delete seriesFormulas['Vitco 25mm High-End'];

    // Patch for JK ALU - Domal Legacy Name Fix
    // This forces it to re-load from the Registry (jk_alu.js) where we renamed components
    if (seriesFormulas['27mm Domal'] && seriesFormulas['27mm Domal'][0].component === '27mm Domal Shutter') {
        console.log('🧹 Clearing legacy 27mm Domal formulas to allow registry refresh.');
        delete seriesFormulas['27mm Domal'];
    }

    // Provide legacy aliases
    seriesFormulas['25mm Gulf'] = gulfFormulas;
    seriesFormulas['25mm High-End'] = highEndFormulas;

    // --- REPAIR STOCK MASTER NAMES & MISSING SERIES ---
    const shutterKey = '25mm Shutter (Shared)';
    const mosquitoKey = '25mm Mosquito';

    if (!stockMaster[shutterKey]) {
        stockMaster[shutterKey] = [
            { material: 'Sash', weight: 0.6, stock1: 189, stock1Cost: 100 },
            { material: 'Interlock', weight: 0.5, stock1: 189, stock1Cost: 100 }
        ];
    }
    if (!stockMaster[mosquitoKey]) {
        stockMaster[mosquitoKey] = [
            { material: 'Sash', weight: 0.4, stock1: 189, stock1Cost: 100 },
            { material: 'Interlock', weight: 0.4, stock1: 189, stock1Cost: 100 },
            { material: 'Auxiliary', weight: 0.1, stock1: 189, stock1Cost: 100 }
        ];
    }

    // Fix names in Frame series
    [gulfKey, highEndKey, '25mm Gulf', '25mm High-End'].forEach(key => {
        if (stockMaster[key]) {
            stockMaster[key].forEach(item => {
                // Rename old fragmented names to unified ones
                if (item.material === 'Track (Horiz)' || item.material === 'Frame (Vert)') {
                    item.material = 'Track';
                }
                if (item.material === 'Sash Component' || item.material === 'Sash Profile') {
                    item.material = 'Sash';
                }
                if (item.material === 'Hardware' || item.material === 'Extra') {
                    item.material = 'Auxiliary';
                }
                // Ensure weight exists
                if (!item.weight) {
                    if (item.material === 'Track') item.weight = 1.1;
                    else if (item.material === 'Sash') item.weight = 0.6;
                    else if (item.material === 'Interlock') item.weight = 0.5;
                    else item.weight = 0.3;
                }
            });

            // Ensure we have 'Track' and 'Auxiliary' at minimum
            if (!stockMaster[key].find(i => i.material === 'Track')) {
                stockMaster[key].push({ material: 'Track', weight: 1.1, stock1: 189, stock1Cost: 100 });
            }
            if (!stockMaster[key].find(i => i.material === 'Auxiliary')) {
                stockMaster[key].push({ material: 'Auxiliary', weight: 0.2, stock1: 189, stock1Cost: 100 });
            }
        } else {
            // Missing entirely
            stockMaster[key] = [
                { material: 'Track', weight: 1.1, stock1: 189, stock1Cost: 100 },
                { material: 'Auxiliary', weight: 0.2, stock1: 189, stock1Cost: 100 }
            ];
        }
    });

    autoSaveFormulas();
    autoSaveStock();
}
// ============================================================================
// (Supplier Master UI and Modal Logic removed, moved to js/supplier_master.js)

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 App Starting...');

    // Load persisted data
    if (typeof loadAllData === 'function') {
        loadAllData();
    }

    // Initialize logic & defaults
    initializeDefaults();

    // Initial Render
    refreshAllUI();

    console.log('✅ App Initialized');
});


// ============================================================================
// SECTION SELECTION MODAL (Restored)
// ============================================================================

let currentSelectionTarget = null; // Stores the material key we are selecting for

function openSectionSelectModal(materialKey) {
    currentSelectionTarget = materialKey;

    // Parse the key to get Series Name and Component Name
    // Format is usually "SeriesName | ComponentName"
    const parts = materialKey.split(' | ');
    let seriesName = parts[0];
    let componentName = parts[1];

    if (!seriesName || !componentName) {
        // Fallback for non-series keys if any
        seriesName = 'General';
        componentName = materialKey;
    }

    // Set the material name display
    const materialNameSpan = document.getElementById('selectMaterialName');
    if (materialNameSpan) {
        materialNameSpan.textContent = `${seriesName} - ${componentName}`;
    }

    // Attempt to find relevant sections from Stock Master or Supplier Registry
    // We want to show ALL available options for this type of component

    // 1. Get sections from Supplier Registry directly if possible (Highest fidelity)
    // We need to loop through all suppliers and find sections that match this series/component
    let options = [];

    console.log(`%c🔍 Searching for sections: Series="${seriesName}", Component="${componentName}"`, 'background: #6f42c1; color: white; padding: 2px 6px;');

    if (window.SUPPLIER_REGISTRY) {
        Object.entries(window.SUPPLIER_REGISTRY).forEach(([supplierName, supplierData]) => {
            console.log(`   Checking supplier: ${supplierName}`);
            if (supplierData.sections && supplierData.sections[seriesName]) {
                const sectionGroup = supplierData.sections[seriesName];
                console.log(`   ✓ Found series "${seriesName}" in ${supplierName}, keys:`, Object.keys(sectionGroup));
                // Check if direct match exists
                if (sectionGroup[componentName]) {
                    console.log(`   ✓ Found component "${componentName}" with ${sectionGroup[componentName].length} variants`);
                    // Add all variants
                    sectionGroup[componentName].forEach(sec => {
                        options.push({
                            supplier: supplierName,
                            sectionNo: sec.sectionNo,
                            weight: sec.weight,
                            t: sec.t || 'N/A',
                            desc: sec.desc || componentName
                        });
                    });
                } else {
                    console.log(`   ✗ Component "${componentName}" NOT found in this series`);
                    // Fuzzy match? Or maybe the component name in results is generic (e.g. "Track") 
                    // and registry has specific "2 Track", "3 Track".
                    // For now, simple matching.
                }
            }
        });
    }

    console.log(`   Total options found: ${options.length}`);

    // 2. If no registry options found, fallback to looking at Stock Master (Legacy/Simple way)
    if (options.length === 0 && stockMaster[seriesName]) {
        stockMaster[seriesName].forEach(item => {
            if (item.material === componentName) {
                options.push({
                    supplier: item.supplier || 'Generic',
                    sectionNo: item.sectionNo || item.material,
                    weight: item.weight,
                    t: item.thickness || 'N/A',
                    desc: item.material
                });
            }
        });
    }

    // Store options globally for selection callback
    window.currentSectionOptions = options;

    // Populate the thicknessSelect dropdown
    const thicknessSelect = document.getElementById('thicknessSelect');
    if (!thicknessSelect) {
        console.error('Thickness select dropdown not found!');
        return;
    }

    thicknessSelect.innerHTML = '<option value="">-- Select Thickness --</option>';

    if (options.length === 0) {
        thicknessSelect.innerHTML += '<option value="" disabled>No options available</option>';
        console.log('%c⚠️ No thickness options available for this component', 'color: orange;');
    } else {
        options.forEach((opt, idx) => {
            thicknessSelect.innerHTML += `<option value="${idx}">${opt.supplier} - ${opt.sectionNo} (T: ${opt.t}mm, Wt: ${opt.weight}kg)</option>`;
        });
        console.log(`%c✅ Populated ${options.length} thickness options in dropdown`, 'color: green;');
        console.log('Dropdown options count:', thicknessSelect.options.length);
    }

    // Clear previous selection details
    const detailsDiv = document.getElementById('selectedSectionDetails');
    if (detailsDiv) detailsDiv.style.display = 'none';

    // Populate catalogue list
    const catalogueList = document.getElementById('catalogueList');
    if (catalogueList) {
        let catalogueHtml = '';
        options.forEach(opt => {
            catalogueHtml += `<div style="padding: 8px; border-bottom: 1px solid #eee;">
                <strong>${opt.supplier}</strong> - ${opt.sectionNo}<br>
                <small>Thickness: ${opt.t}mm | Weight: ${opt.weight}kg</small>
            </div>`;
        });
        catalogueList.innerHTML = catalogueHtml || '<p>No sections in catalogue.</p>';
    }

    // Show Modal
    const modal = document.getElementById('sectionSelectModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSectionSelectModal() {
    const modal = document.getElementById('sectionSelectModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function showSelectedSectionDetails() {
    const select = document.getElementById('thicknessSelect');
    const detailsDiv = document.getElementById('selectedSectionDetails');
    const contentDiv = document.getElementById('sectionDetailsContent');

    if (!select || !detailsDiv || !contentDiv) return;

    const idx = select.value;
    if (idx === '' || !window.currentSectionOptions) {
        detailsDiv.style.display = 'none';
        return;
    }

    const opt = window.currentSectionOptions[parseInt(idx)];
    if (!opt) {
        detailsDiv.style.display = 'none';
        return;
    }

    contentDiv.innerHTML = `
        <p><strong>Supplier:</strong> ${opt.supplier}</p>
        <p><strong>Section No:</strong> ${opt.sectionNo}</p>
        <p><strong>Thickness:</strong> ${opt.t} mm</p>
        <p><strong>Weight:</strong> ${opt.weight} kg/12ft</p>
    `;
    detailsDiv.style.display = 'block';
}

function confirmSectionSelection() {
    const select = document.getElementById('thicknessSelect');
    if (!select || select.value === '') {
        showAlert('⚠️ Please select a thickness option first.', 'warning');
        return;
    }

    const idx = parseInt(select.value);
    if (!window.currentSectionOptions || !window.currentSectionOptions[idx]) {
        showAlert('⚠️ Invalid selection. Please try again.', 'error');
        return;
    }

    const opt = window.currentSectionOptions[idx];
    selectSectionForResult(opt);
}


function selectSectionForResult(sectionData) {
    if (!currentSelectionTarget || !optimizationResults) return;

    // Save choice to optimization results
    if (!optimizationResults.componentSections) {
        optimizationResults.componentSections = {};
    }

    optimizationResults.componentSections[currentSelectionTarget] = sectionData;

    // Auto-save results to persist choice
    autoSaveResults();

    closeSectionSelectModal();

    // Re-render results to show selection
    displayResults();

    showAlert(`✅ Selected ${sectionData.sectionNo} for ${currentSelectionTarget}`);
}

function toggleDoorFrame() {
    const val = document.getElementById('doorFrame')?.value;
    const info = document.getElementById('doorFrameInfo');
    if (info) {
        info.style.display = (val === '1') ? 'flex' : 'none';
    }
}

function updateStockRate(series, val) {
    stockRates[series] = parseFloat(val);
    localStorage.setItem('stockRates', JSON.stringify(stockRates));
    refreshStockMaster();
    renderAluminumRatesSummary();
}

// v1.41: Aluminum Rates summary panel in Rate Management — one place to scan
// per-series ₹/kg without scrolling through Stock Master's full table.
function renderAluminumRatesSummary() {
    const container = document.getElementById('aluminumRatesSummary');
    if (!container) return;
    const seriesList = Object.keys(stockMaster || {}).sort();
    if (seriesList.length === 0) {
        container.innerHTML = '<p style="color:#888;font-style:italic;font-size:12px;">No series in Stock Master yet.</p>';
        return;
    }
    const rowStyle = 'display:grid;grid-template-columns:180px 100px 1fr;gap:10px;align-items:center;padding:7px 8px;border-bottom:1px solid #eceff1;font-size:13px;';
    let html = `<div style="${rowStyle.replace('border-bottom:1px solid #eceff1;','')}background:#cfd8dc;font-weight:600;color:#37474f;border-radius:4px 4px 0 0;">
        <span>Series</span><span style="text-align:right;">₹ / kg</span><span style="font-size:11px;color:#546e7a;font-weight:500;">Stock items</span>
    </div>`;
    seriesList.forEach(series => {
        const items = (stockMaster[series] || []).length;
        const rate = stockRates[series] != null ? stockRates[series] : 250;
        html += `<div style="${rowStyle}">
            <span style="font-weight:600;color:#37474f;">${series}</span>
            <input type="number" value="${rate}" min="0" step="1"
                onchange="updateStockRate('${series.replace(/'/g, "\\'")}', this.value)"
                style="width:100%;padding:4px 8px;border:1px solid #b0bec5;border-radius:4px;font-size:13px;text-align:right;">
            <span style="font-size:11px;color:#78909c;">${items} item${items===1?'':'s'} in Stock Master</span>
        </div>`;
    });
    container.innerHTML = html;
}

function updateStockThickness(series, idx, tStr) {
    const t = parseFloat(tStr);
    const stock = stockMaster[series][idx];
    stock.thickness = tStr; // store as string to preserve selection if needed or float

    // Find weight and section
    const supplier = stock.supplier || 'JK ALU EXTRUSION';
    if (SUPPLIER_REGISTRY[supplier] && SUPPLIER_REGISTRY[supplier].sections && SUPPLIER_REGISTRY[supplier].sections[series]) {
        const sections = SUPPLIER_REGISTRY[supplier].sections[series][stock.material];
        if (sections) {
            const s = sections.find(s => s.t == t);
            if (s) {
                stock.weight = s.weight;
                stock.sectionNo = s.sectionNo; // Update section number if it changes based on thickness
            } else if (!t) {
                stock.weight = 0;
            }
        }
    }

    // Trigger auto save logic
    // We assume there is autoSaveStock, if not we call persistence manually
    if (typeof autoSaveStock === 'function') {
        autoSaveStock();
    } else {
        localStorage.setItem('stockMaster', JSON.stringify(stockMaster));
    }

    refreshStockMaster();
}

// Load stockRates on init
window.addEventListener('load', function () {
    try {
        const stored = localStorage.getItem('stockRates');
        if (stored) stockRates = JSON.parse(stored);
    } catch (e) { console.error('Error loading stockRates', e); }

    // Ensure refresh happens after load
    setTimeout(() => {
        syncStockWithRegistry();
    }, 1000);
});

function resetStockSeries(series) {
    if (confirm('Verify: This will reset stock items for ' + series + ' to defaults from the registry. Custom items might be lost. Continue?')) {
        stockMaster[series] = []; // explicit clear
        syncStockWithRegistry(true);
        // refreshStockMaster(); // sync calls it
    }
}

// Function to populate stockMaster with ALL variants from Registry
function syncStockWithRegistry(showDebug) {
    if (typeof SUPPLIER_REGISTRY === 'undefined') return;

    let changed = false;
    let debugReport = "Sync Report:\n";
    let totalAdded = 0;

    Object.keys(SUPPLIER_REGISTRY).forEach(supplier => {
        if (!SUPPLIER_REGISTRY[supplier].sections) return;
        const seriesMap = SUPPLIER_REGISTRY[supplier].sections;

        Object.keys(seriesMap).forEach(series => {
            const components = seriesMap[series];
            if (!stockMaster[series]) stockMaster[series] = [];

            // Build a Set of existing items
            const existingKeys = new Set();
            stockMaster[series].forEach(s => {
                existingKeys.add(s.material + '_' + parseFloat(s.thickness || 0) + '_' + (s.supplier || ''));
            });

            // Iterate components
            let seriesAdded = 0;
            Object.entries(components).forEach(([compName, variants]) => {
                if (Array.isArray(variants)) {
                    // Report for Door series
                    if (showDebug && series === 'Door' && compName === 'Door Top') {
                        debugReport += `Door Top: Found ${variants.length} variants.\n`;
                    }

                    variants.forEach(variant => {
                        // Skip if thickness is not defined
                        if (variant.t === undefined || variant.t === null) return;

                        const tVal = parseFloat(variant.t);
                        const key = compName + '_' + tVal + '_' + supplier;

                        if (!existingKeys.has(key)) {
                            stockMaster[series].push({
                                material: compName,
                                thickness: variant.t.toString(),
                                weight: variant.weight || 0,
                                sectionNo: variant.sectionNo || '',
                                supplier: supplier,
                                stock1: 144, stock1Cost: 0,
                                stock2: 180, stock2Cost: 0
                            });
                            existingKeys.add(key);
                            changed = true;
                            seriesAdded++;
                            totalAdded++;
                        }
                    });
                }
            });
            if (showDebug && series.includes('Door')) {
                debugReport += `Door Series: Added ${seriesAdded} new items.\n`;
            }
        });
    });

    if (changed) {
        if (typeof autoSaveStock === 'function') autoSaveStock();
        else localStorage.setItem('stockMaster', JSON.stringify(stockMaster));
        refreshStockMaster();
    } else {
        refreshStockMaster();
    }

    if (showDebug) {
        debugReport += `Total Added: ${totalAdded}\nItems in Door Series: ${stockMaster['Door'] ? stockMaster['Door'].length : 0}`;
        alert(debugReport);
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatInchesToFeet(totalInches) {
    if (!totalInches || totalInches <= 0) return '0\'';
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    if (inches === 0) return `${feet}'`;
    return `${feet}' - ${inches}"`;
}

// ============================================================================
// PROJECT THICKNESS SELECTION FUNCTIONS
// ============================================================================

/**
 * Get recommended thickness based on window dimensions
 * Engineering logic: larger windows need thicker profiles for structural integrity
 */
function getRecommendedThickness(height, width) {
    const maxDimension = Math.max(height, width);

    if (maxDimension < 48) {
        return { t: 0.79, reason: 'Small window - lightweight profile sufficient' };
    } else if (maxDimension < 72) {
        return { t: 0.89, reason: 'Medium window - standard thickness' };
    } else if (maxDimension < 96) {
        return { t: 1.0, reason: 'Large window - reinforced profile recommended' };
    } else {
        return { t: 1.1, reason: 'Very large window - heavy-duty profile required' };
    }
}

/**
 * Get available thickness options for a supplier and series
 */
function getThicknessOptionsForVendor(vendor, series) {
    const options = [];

    if (window.SUPPLIER_REGISTRY && window.SUPPLIER_REGISTRY[vendor]) {
        const supplierData = window.SUPPLIER_REGISTRY[vendor];
        if (supplierData.sections && supplierData.sections[series]) {
            const sectionGroup = supplierData.sections[series];
            // Collect unique thickness values
            const thicknessSet = new Map();

            Object.entries(sectionGroup).forEach(([componentName, variants]) => {
                if (Array.isArray(variants)) {
                    variants.forEach(v => {
                        const key = `${v.t}`;
                        if (!thicknessSet.has(key)) {
                            thicknessSet.set(key, {
                                t: v.t,
                                supplier: vendor,
                                sampleSectionNo: v.sectionNo,
                                weight: v.weight
                            });
                        }
                    });
                }
            });

            // Convert to array and sort by thickness
            thicknessSet.forEach(val => options.push(val));
            options.sort((a, b) => a.t - b.t);
        }
    }

    // Fallback to supplierMaster if no registry options
    if (options.length === 0 && supplierMaster[series]) {
        const thicknessSet = new Map();
        supplierMaster[series].forEach(item => {
            if (item.supplier === vendor || !vendor) {
                const key = `${item.thickness || 0.89}`;
                if (!thicknessSet.has(key)) {
                    thicknessSet.set(key, {
                        t: item.thickness || 0.89,
                        supplier: item.supplier || vendor,
                        sampleSectionNo: item.sectionNo || 'N/A',
                        weight: item.weight || 0
                    });
                }
            }
        });
        thicknessSet.forEach(val => options.push(val));
        options.sort((a, b) => a.t - b.t);
    }

    // If still no options, provide defaults
    if (options.length === 0) {
        options.push(
            { t: 0.79, supplier: vendor || 'Generic', sampleSectionNo: 'Default', weight: 1.0 },
            { t: 0.89, supplier: vendor || 'Generic', sampleSectionNo: 'Default', weight: 1.1 },
            { t: 1.0, supplier: vendor || 'Generic', sampleSectionNo: 'Default', weight: 1.2 },
            { t: 1.1, supplier: vendor || 'Generic', sampleSectionNo: 'Default', weight: 1.3 }
        );
    }

    return options;
}

/**
 * Get available thickness options for a SPECIFIC component
 * This ensures each component only shows its own thickness variants
 * @param {string} vendor - Supplier name
 * @param {string} series - Series name (e.g., "Door")
 * @param {string} componentName - Component name (e.g., "Door Vertical")
 * @param {number} profileWidth - Optional width to filter by (e.g., 47 or 85mm)
 */
function getComponentThicknessOptions(vendor, series, componentName, profileWidth = null) {
    const options = [];

    if (window.SUPPLIER_REGISTRY && window.SUPPLIER_REGISTRY[vendor]) {
        const supplierData = window.SUPPLIER_REGISTRY[vendor];
        if (supplierData.sections && supplierData.sections[series]) {
            const sectionGroup = supplierData.sections[series];

            // Look for the specific component
            if (sectionGroup[componentName] && Array.isArray(sectionGroup[componentName])) {
                sectionGroup[componentName].forEach(v => {
                    // Filter by profile width if specified
                    if (profileWidth !== null && v.w) {
                        // Allow some tolerance for width matching (±0.5mm)
                        if (Math.abs(v.w - profileWidth) > 0.5) {
                            return; // Skip this option if width doesn't match
                        }
                    }

                    options.push({
                        t: v.t,
                        supplier: vendor,
                        sectionNo: v.sectionNo,
                        weight: v.weight,
                        w: v.w,
                        h: v.h
                    });
                });
            }
        }
    }

    // Sort by thickness
    options.sort((a, b) => a.t - b.t);

    // Fallback: if no component-specific options, use series defaults
    if (options.length === 0) {
        console.log(`⚠️ No specific options for component "${componentName}"${profileWidth ? ` with width ${profileWidth}mm` : ''}, using series defaults`);
        return getThicknessOptionsForVendor(vendor, series);
    }

    console.log(`📋 Component "${componentName}"${profileWidth ? ` (${profileWidth}mm)` : ''} has ${options.length} thickness options:`, options.map(o => o.t + 'mm'));
    return options;
}

/**
 * Open the Project Thickness Configuration Modal
 */
function openProjectThicknessModal() {
    const projectSelector = document.getElementById('projectSelector');
    const selectedProject = projectSelector?.value;

    if (!selectedProject) {
        showAlert('⚠️ Please select a project first!', 'warning');
        return;
    }

    const projectWindows = windows.filter(w => w.projectName === selectedProject);
    if (projectWindows.length === 0) {
        showAlert('⚠️ No windows or doors found for this project!', 'warning');
        return;
    }

    // Populate bulk apply dropdowns
    populateBulkThicknessDropdowns(projectWindows);

    // Populate individual items list
    renderProjectThicknessItems(projectWindows);

    // Show modal
    const modal = document.getElementById('projectThicknessModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Populate the bulk thickness selection dropdowns
 */
function populateBulkThicknessDropdowns(projectWindows) {
    const windowSelect = document.getElementById('bulkWindowThickness');
    const doorSelect = document.getElementById('bulkDoorThickness');

    // Get all unique vendors from project windows
    const windowVendors = new Set();
    const doorVendors = new Set();

    projectWindows.forEach(w => {
        if (w.category === 'Door') {
            doorVendors.add(w.vendor);
        } else {
            windowVendors.add(w.vendor);
        }
    });

    // Collect all thickness options across vendors
    const allWindowThicknesses = new Map();
    const allDoorThicknesses = new Map();

    windowVendors.forEach(vendor => {
        projectWindows.filter(w => w.vendor === vendor && w.category !== 'Door').forEach(w => {
            const options = getThicknessOptionsForVendor(vendor, w.series);
            options.forEach(opt => {
                const key = `${opt.t}`;
                if (!allWindowThicknesses.has(key)) {
                    allWindowThicknesses.set(key, opt);
                }
            });
        });
    });

    doorVendors.forEach(vendor => {
        projectWindows.filter(w => w.vendor === vendor && w.category === 'Door').forEach(w => {
            const options = getThicknessOptionsForVendor(vendor, w.series);
            options.forEach(opt => {
                const key = `${opt.t}`;
                if (!allDoorThicknesses.has(key)) {
                    allDoorThicknesses.set(key, opt);
                }
            });
        });
    });

    // Populate window thickness dropdown
    if (windowSelect) {
        windowSelect.innerHTML = '<option value="">-- Select Thickness --</option>';
        Array.from(allWindowThicknesses.values()).sort((a, b) => a.t - b.t).forEach(opt => {
            windowSelect.innerHTML += `<option value="${opt.t}">${opt.t}mm (${opt.supplier})</option>`;
        });
    }

    // Populate door thickness dropdown
    if (doorSelect) {
        doorSelect.innerHTML = '<option value="">-- Select Thickness --</option>';
        Array.from(allDoorThicknesses.values()).sort((a, b) => a.t - b.t).forEach(opt => {
            doorSelect.innerHTML += `<option value="${opt.t}">${opt.t}mm (${opt.supplier})</option>`;
        });
    }
}

/**
 * Render the individual thickness configuration list
 */
function renderProjectThicknessItems(projectWindows) {
    const container = document.getElementById('projectThicknessItemsList');
    if (!container) return;

    let html = '';

    projectWindows.forEach((w, idx) => {
        const globalIdx = windows.indexOf(w);
        const isDoor = w.category === 'Door';
        const icon = isDoor ? '🚪' : '🪟';
        const recommended = getRecommendedThickness(w.height, w.width);

        // Check current selection status
        const hasThickness = w.componentThicknesses && Object.keys(w.componentThicknesses).length > 0;
        const statusIcon = hasThickness ? '✅' : '⚠️';
        const statusColor = hasThickness ? '#2e7d32' : '#f57c00';

        // Get current thickness display
        let currentThicknessDisplay = 'Not Set';
        if (hasThickness) {
            const firstComp = Object.values(w.componentThicknesses)[0];
            currentThicknessDisplay = `${firstComp.t}mm`;
        }

        html += `
        <div style="padding: 12px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; ${hasThickness ? '' : 'background: #fff8e1;'}">
            <div style="flex: 2;">
                <div style="font-weight: bold;">${icon} ${w.configId} - ${w.description}</div>
                <div style="font-size: 0.85em; color: #666;">
                    ${w.width}" × ${w.height}" | ${w.vendor} | ${w.series}
                </div>
                <div style="font-size: 0.8em; color: #3498db; margin-top: 3px;">
                    💡 Suggested: <strong>${recommended.t}mm</strong> (${recommended.reason})
                </div>
            </div>
            <div style="flex: 1; text-align: center;">
                <span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${currentThicknessDisplay}</span>
            </div>
            <div style="flex: 1; text-align: right;">
                <button class="btn btn-warning btn-sm" onclick="openComponentThicknessModal(${globalIdx})">
                    ✏️ Edit
                </button>
            </div>
        </div>`;
    });

    container.innerHTML = html || '<p style="padding: 20px; text-align: center; color: #666;">No items found.</p>';
}

/**
 * Apply bulk thickness to all windows or doors
 */
function applyBulkThickness(type) {
    const projectSelector = document.getElementById('projectSelector');
    const selectedProject = projectSelector?.value;

    if (!selectedProject) {
        showAlert('⚠️ Please select a project first!', 'warning');
        return;
    }

    const selectId = type === 'Door' ? 'bulkDoorThickness' : 'bulkWindowThickness';
    const thicknessSelect = document.getElementById(selectId);
    const selectedThickness = parseFloat(thicknessSelect?.value);

    if (isNaN(selectedThickness)) {
        showAlert('⚠️ Please select a thickness first!', 'warning');
        return;
    }

    const projectWindows = windows.filter(w =>
        w.projectName === selectedProject &&
        (type === 'Door' ? w.category === 'Door' : w.category !== 'Door')
    );

    if (projectWindows.length === 0) {
        showAlert(`⚠️ No ${type.toLowerCase()}s found in this project!`, 'warning');
        return;
    }

    let updatedCount = 0;

    projectWindows.forEach(w => {
        const options = getThicknessOptionsForVendor(w.vendor, w.series);
        const matchingOption = options.find(opt => opt.t === selectedThickness);

        if (matchingOption) {
            // Apply thickness to all components of this window
            if (!w.componentThicknesses) w.componentThicknesses = {};

            // Get components from formulas
            const formulas = seriesFormulas[w.series] || [];
            formulas.forEach(f => {
                w.componentThicknesses[f.component] = {
                    t: selectedThickness,
                    supplier: w.vendor,
                    sectionNo: matchingOption.sampleSectionNo,
                    weight: matchingOption.weight
                };
            });

            updatedCount++;
        }
    });

    // Refresh the display
    renderProjectThicknessItems(windows.filter(w => w.projectName === selectedProject));

    autoSaveWindows();

    showAlert(`✅ Applied ${selectedThickness}mm thickness to ${updatedCount} ${type.toLowerCase()}(s)!`);
}

/**
 * Close the project thickness modal
 */
function closeProjectThicknessModal() {
    const modal = document.getElementById('projectThicknessModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Save all thickness selections and close modal
 */
function saveAllThicknessSelections() {
    autoSaveWindows();
    closeProjectThicknessModal();
    showAlert('✅ All thickness selections saved!');
}

/**
 * Open modal for individual component thickness editing
 */
function openComponentThicknessModal(windowIdx) {
    const w = windows[windowIdx];
    if (!w) {
        showAlert('⚠️ Window not found!', 'error');
        return;
    }

    document.getElementById('editComponentWindowIdx').value = windowIdx;
    document.getElementById('editComponentWindowName').textContent = `${w.configId} - ${w.description}`;

    const container = document.getElementById('componentThicknessList');
    if (!container) return;

    // Get components from formulas
    const formulas = seriesFormulas[w.series] || [];
    const recommended = getRecommendedThickness(w.height, w.width);

    let html = `
    <div class="alert alert-success" style="margin-bottom: 15px; padding: 10px;">
        💡 <strong>Recommended:</strong> ${recommended.t}mm - ${recommended.reason}
    </div>`;

    if (formulas.length === 0) {
        html += '<p style="color: #e67e22;">⚠️ No component formulas found for this series. Please configure series formulas first.</p>';
    } else {
        formulas.forEach((f, idx) => {
            const currentSelection = w.componentThicknesses?.[f.component];
            const currentValue = currentSelection?.t || '';
            const currentWidth = currentSelection?.profileWidth || null;

            // Get all options for this component (without width filter) to find unique widths
            const allOptions = getComponentThicknessOptions(w.vendor, w.series, f.component, null);

            // Extract unique widths
            const uniqueWidths = [...new Set(allOptions.filter(o => o.w).map(o => o.w))].sort((a, b) => a - b);
            const hasMultipleWidths = uniqueWidths.length > 1;

            // Get filtered options based on selected width or show all
            const componentOptions = hasMultipleWidths && currentWidth
                ? getComponentThicknessOptions(w.vendor, w.series, f.component, currentWidth)
                : allOptions;

            html += `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: ${hasMultipleWidths ? '8px' : '0'};">
                    <div style="flex: 1; font-weight: bold;">${f.component}</div>
                    <div style="flex: 1; color: #666; font-size: 0.9em;">${f.desc}</div>
                    ${hasMultipleWidths ? `
                    <div style="flex: 0.7;">
                        <select id="compWidth_${idx}" class="component-width-select" data-component="${f.component}" data-idx="${idx}" 
                                style="width: 100%; padding: 6px; background: #fff3cd; border: 1px solid #ffc107;"
                                onchange="updateThicknessForWidth(${windowIdx}, '${f.component}', ${idx})">
                            <option value="">📐 Profile Width</option>
                            ${uniqueWidths.map(w =>
                `<option value="${w}" ${w === currentWidth ? 'selected' : ''}>${w}mm</option>`
            ).join('')}
                        </select>
                    </div>` : ''}
                    <div style="flex: 1;">
                        <select id="compThickness_${idx}" class="component-thickness-select" data-component="${f.component}" style="width: 100%; padding: 6px;">
                            <option value="">-- Select --</option>
                            ${componentOptions.map(opt =>
                `<option value="${opt.t}" data-sectionno="${opt.sectionNo}" data-weight="${opt.weight}" data-width="${opt.w || ''}" ${opt.t === currentValue ? 'selected' : ''} 
                             ${opt.t === recommended.t ? 'style="font-weight: bold; color: #2e7d32;"' : ''}>
                                ${opt.t}mm ${opt.t === recommended.t ? '★' : ''} (${opt.sectionNo})
                            </option>`
            ).join('')}
                        </select>
                    </div>
                </div>
            </div>`;
        });
    }

    container.innerHTML = html;

    // Show modal
    const modal = document.getElementById('componentThicknessModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Update thickness dropdown when profile width is selected
 */
function updateThicknessForWidth(windowIdx, componentName, idx) {
    const w = windows[windowIdx];
    if (!w) return;

    const widthSelect = document.getElementById(`compWidth_${idx}`);
    const thicknessSelect = document.getElementById(`compThickness_${idx}`);
    if (!widthSelect || !thicknessSelect) return;

    const selectedWidth = parseFloat(widthSelect.value) || null;

    // Get filtered thickness options
    const componentOptions = getComponentThicknessOptions(w.vendor, w.series, componentName, selectedWidth);
    const recommended = getRecommendedThickness(w.height, w.width);

    // Rebuild thickness dropdown
    let optionsHtml = '<option value="">-- Select --</option>';
    componentOptions.forEach(opt => {
        const isRecommended = opt.t === recommended.t;
        optionsHtml += `<option value="${opt.t}" data-sectionno="${opt.sectionNo}" data-weight="${opt.weight}" data-width="${opt.w || ''}"
            ${isRecommended ? 'style="font-weight: bold; color: #2e7d32;"' : ''}>
            ${opt.t}mm ${isRecommended ? '★' : ''} (${opt.sectionNo})
        </option>`;
    });

    thicknessSelect.innerHTML = optionsHtml;

    console.log(`🔄 Updated thickness options for "${componentName}" with width ${selectedWidth}mm: ${componentOptions.length} options`);
}

/**
 * Close component thickness modal
 */
function closeComponentThicknessModal() {
    const modal = document.getElementById('componentThicknessModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Save component thickness edits
 */
function saveComponentThicknessEdits() {
    const windowIdx = parseInt(document.getElementById('editComponentWindowIdx').value);
    const w = windows[windowIdx];

    if (!w) {
        showAlert('⚠️ Window not found!', 'error');
        return;
    }

    if (!w.componentThicknesses) w.componentThicknesses = {};

    const selects = document.querySelectorAll('.component-thickness-select');

    selects.forEach((select, selectIdx) => {
        const component = select.dataset.component;
        const thickness = parseFloat(select.value);
        const selectedOption = select.options[select.selectedIndex];

        // Get width from width dropdown if it exists
        const widthSelect = document.querySelector(`.component-width-select[data-component="${component}"]`);
        const profileWidth = widthSelect ? parseFloat(widthSelect.value) || null : null;

        // Also try to get width from data attribute on thickness option
        const optionWidth = parseFloat(selectedOption?.dataset?.width) || profileWidth;

        if (!isNaN(thickness) && selectedOption) {
            // Get values from data attributes on the selected option
            const sectionNo = selectedOption.dataset?.sectionno || 'N/A';
            const weight = parseFloat(selectedOption.dataset?.weight) || 0;

            w.componentThicknesses[component] = {
                t: thickness,
                supplier: w.vendor,
                sectionNo: sectionNo,
                weight: weight,
                profileWidth: optionWidth
            };
        } else {
            // Clear selection if empty
            delete w.componentThicknesses[component];
        }
    });

    autoSaveWindows();
    closeComponentThicknessModal();

    // Refresh project thickness list if open
    const projectSelector = document.getElementById('projectSelector');
    if (projectSelector?.value) {
        const projectWindows = windows.filter(w => w.projectName === projectSelector.value);
        renderProjectThicknessItems(projectWindows);
    }

    showAlert('✅ Component thickness settings saved!');
}
