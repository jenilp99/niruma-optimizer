// Niruma Aluminum Profile Optimizer - Optimization Algorithms

// ============================================================================
// MAIN OPTIMIZATION ENTRY POINT
// ============================================================================

function runOptimization() {
    const selectedProject = document.getElementById('projectSelector').value;

    if (!selectedProject) {
        showAlert('❌ Please select a project first!');
        return;
    }

    console.log(`%c🏭 Optimization started for project: "${selectedProject}"`, 'background: #007bff; color: white; padding: 2px 6px;');

    // Collect pre-selected thickness from window configurations
    const projectWindows = windows.filter(w => w.projectName === selectedProject);
    const preSelectedThicknesses = {};

    projectWindows.forEach(w => {
        if (w.componentThicknesses) {
            Object.entries(w.componentThicknesses).forEach(([component, thicknessData]) => {
                const key = `${w.series} | ${component}`;
                if (!preSelectedThicknesses[key]) {
                    preSelectedThicknesses[key] = thicknessData;
                }
            });
        }
    });

    console.log('📋 Pre-selected thicknesses from window configs:', preSelectedThicknesses);

    const piecesByMaterial = calculatePieces(selectedProject, '');

    if (Object.keys(piecesByMaterial).length === 0) {
        if (projectWindows.length === 0) {
            showAlert('❌ No windows found for this project!\n\nPlease add windows to the project first.');
            return;
        }

        // Check if formulas exist for window series
        const missingSeries = [];
        projectWindows.forEach(win => {
            const seriesName = win.series;
            const normName = seriesName.replace(/\(.*\)/, '').replace(/^Vitco\s+/i, '').trim();

            // Check global formulas
            let exists = seriesFormulas[seriesName] ||
                seriesFormulas[normName] ||
                seriesFormulas[normName + ' (Frame)'] ||
                seriesFormulas['Vitco ' + normName] ||
                (seriesName === '1' && seriesFormulas['1"']) ||
                (seriesName === '1"' && seriesFormulas['1']) ||
                (seriesName === '3/4' && seriesFormulas['3/4"']) ||
                (seriesName === '3/4"' && seriesFormulas['3/4']);

            // Also check SUPPLIER_REGISTRY for vendor-specific formulas
            if (!exists && win.vendor && window.SUPPLIER_REGISTRY && window.SUPPLIER_REGISTRY[win.vendor]) {
                const supplierData = window.SUPPLIER_REGISTRY[win.vendor];
                if (supplierData.formulas && supplierData.formulas[seriesName]) {
                    exists = true;
                }
            }

            if (!exists) {
                if (!missingSeries.includes(win.series)) {
                    missingSeries.push(win.series);
                }
            }
        });

        if (missingSeries.length > 0) {
            showAlert(`❌ Missing formulas for series: ${missingSeries.join(', ')}\n\nPlease configure formulas in the "Formulas Master" section.`);
            return;
        }

        showAlert('❌ No pieces calculated for this project!\n\nThis could be due to:\n- Missing or invalid formulas\n- All formula quantities evaluate to 0\n- Formula evaluation errors');
        return;
    }

    const results = {};
    let totalSticks = 0;
    let totalUsed = 0;
    let totalWaste = 0;
    let totalCost = 0;

    // Pre-populate componentSections from pre-selected thicknesses
    const componentSections = { ...preSelectedThicknesses };

    for (const [compoundKey, pieces] of Object.entries(piecesByMaterial)) {
        const [materialSeries, materialName] = compoundKey.split(' | ');

        let stockList = stockMaster[materialSeries];

        // Fallback for series name migration
        if (!stockList) {
            if (materialSeries === '1') stockList = stockMaster['1"'];
            else if (materialSeries === '1"') stockList = stockMaster['1'];
        }

        if (!stockList) {
            console.warn('No stock list for series:', materialSeries);
            continue;
        }

        const stockInfo = stockList.find(s => s.material === materialName);

        if (!stockInfo) {
            console.warn(`No stock info for material "${materialName}" in series "${materialSeries}"`);
            continue;
        }

        // --- WEIGHT-BASED COST CALCULATION ---
        // Priority: pre-selected thickness > selected section in results > stock item weight
        let weight = stockInfo.weight;

        // Check pre-selected thickness first (from window configurations)
        if (preSelectedThicknesses[compoundKey]) {
            weight = preSelectedThicknesses[compoundKey].weight;
            console.log(`✅ Using pre-selected thickness for ${compoundKey}: ${preSelectedThicknesses[compoundKey].t}mm`);
        }
        // Fallback to existing results if any
        else if (optimizationResults && optimizationResults.componentSections && optimizationResults.componentSections[compoundKey]) {
            weight = optimizationResults.componentSections[compoundKey].weight;
        }

        let effectiveStock1Cost = stockInfo.stock1Cost || 100;
        let effectiveStock2Cost = stockInfo.stock2Cost || 125;
        const currentRate = (typeof aluminumRate !== 'undefined') ? aluminumRate : 280;

        if (weight) {
            // weight is for 12' (144")
            effectiveStock1Cost = (stockInfo.stock1 / 144) * weight * currentRate;
            if (stockInfo.stock2) {
                effectiveStock2Cost = (stockInfo.stock2 / 144) * weight * currentRate;
            }
        }

        const effectiveStockInfo = {
            ...stockInfo,
            stock1Cost: effectiveStock1Cost,
            stock2Cost: effectiveStock2Cost
        };

        const plans = optimizeMaterialSmart(pieces, effectiveStockInfo, kerf);
        const displayKey = `${materialSeries} | ${materialName}`;
        results[displayKey] = plans;

        plans.forEach(plan => {
            totalSticks++;
            totalUsed += plan.used;
            totalWaste += plan.waste;
            totalCost += plan.cost;
        });
    }

    // ── Mosquito Net Optimization ──────────────────────────────────────────────
    let netResults = null;
    // Only use rolls that are flagged in-stock (inStock === false means user unchecked it)
    const availableNetRolls = (ratesConfig.netStock || []).filter(r => r.width > 0 && r.length > 0 && r.inStock !== false);
    if (availableNetRolls.length > 0) {
        const netPieces = computeNetPieces(projectWindows);
        if (netPieces.length > 0) {
            const partialRolls = (window.netPartialRolls || []).slice();
            netResults = packNetFFDH(netPieces, availableNetRolls, partialRolls);
            console.log('%c🕸️ Net FFDH optimization complete:', 'background: #8e44ad; color: white; padding: 2px 6px;', netResults);
            if (partialRolls.length > 0) {
                console.log(`%c📦 Used ${netResults?.storeRollsUsed||0} partial roll(s) + ${netResults?.newRollsUsed||0} new roll(s)`, 'color: #1b5e20; font-weight: bold;');
            }
        }
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── Partition Sheet Optimization (ACP / Bakelite / Particle Board) ─────────
    let sheetResults = null;
    {
        const sheetPartials = (window.sheetPartials || []).slice();
        sheetResults = packAllSheets(projectWindows, sheetPartials);
        if (sheetResults) console.log('%c📄 Sheet optimization complete:', 'background:#e67e22;color:white;padding:2px 6px;', sheetResults);
    }
    // ──────────────────────────────────────────────────────────────────────────

    optimizationResults = {
        project: selectedProject,
        results: results,
        componentSections: componentSections, // Include pre-selected thicknesses
        netResults: netResults,               // Mosquito net 2D cutting plans
        sheetResults: sheetResults,           // Partition sheet 2D cutting plans
        stats: {
            totalSticks: totalSticks,
            totalUsed: totalUsed.toFixed(2),
            totalWaste: totalWaste.toFixed(2),
            totalCost: totalCost.toFixed(0),
            efficiency: (totalUsed + totalWaste) > 0 ? ((totalUsed / (totalUsed + totalWaste)) * 100).toFixed(1) : "0.0"
        },
        config: { kerf }
    };

    autoSaveResults();
    displayResults();
    scrollToSection('section-results');
}

// ============================================================================
// DOOR FORMULA GENERATOR
// ============================================================================

// Auto-select hinge side vertical profile (Door Bottom vs Door Top) by comparing
// cut wastage against available stock lengths. Defaults to Door Bottom.
function selectHingeSideProfile(win, supplierData) {
    const pieceLen = win.height - ((win.frame || 0) * (40/25.4));
    const doorStock = (supplierData && supplierData.stock && supplierData.stock['Door']) || [];

    const calcMinWaste = (materialName) => {
        const items = doorStock.filter(s => s.material === materialName);
        if (!items.length) return Infinity;
        let minWaste = Infinity;
        for (const item of items) {
            for (const sLen of [item.stock1, item.stock2].filter(s => s > 0)) {
                const rem = pieceLen % sLen;
                minWaste = Math.min(minWaste, rem === 0 ? 0 : sLen - rem);
            }
        }
        return minWaste;
    };

    return calcMinWaste('Door Top') < calcMinWaste('Door Bottom') ? 'Door Top' : 'Door Bottom';
}

// ── Top Rail Profile Selection ────────────────────────────────────────────────
// Get minimum section weight (kg per 12ft / 144") for a Door profile.
function getDoorProfileWeight(materialName, supplierData) {
    const doorSections = supplierData && supplierData.sections && supplierData.sections['Door'];
    if (!doorSections || !doorSections[materialName]) return null;
    const weights = doorSections[materialName]
        .map(s => parseFloat(s.weight))
        .filter(w => w > 0);
    return weights.length ? Math.min(...weights) : null;
}

// Estimate total kg purchased for a set of pieces against a stock pool.
// pieces: [{length (inches), qty}], stockItems: [{stock1, stock2}], weightPer144: kg per 144"
function estimatePiecesKg(pieces, stockItems, weightPer144) {
    if (!stockItems || !stockItems.length || !weightPer144) return Infinity;
    const KERF = 0.125;
    let bestKg = Infinity;
    for (const stock of stockItems) {
        for (const stockLen of [stock.stock1, stock.stock2].filter(Boolean)) {
            // Total length needed (with kerf per piece)
            const totalLen = pieces.reduce((s, p) => s + (p.length + KERF) * p.qty, 0);
            const sticks   = Math.ceil(totalLen / stockLen);
            const kg       = sticks * (weightPer144 * stockLen / 144);
            if (kg < bestKg) bestKg = kg;
        }
    }
    return bestKg;
}

// Select top rail profile: Door Top (lighter, default) vs Door Bottom (merged pool).
// Rules:
//  1. topWidth must equal bottomWidth — otherwise must stay Door Top
//  2. Compare total kg for Option A (Door Top separate + Door Bottom for bottom+hinge)
//     vs Option B (Door Bottom for top+bottom+hinge merged)
//  3. Use Door Bottom only if it strictly reduces total kg; tie → Door Top
function selectTopRailProfile(win, supplierData, handleVW, hingeVW) {
    const topWidthMM    = win.topWidth    || 47.5;
    const bottomWidthMM = win.bottomWidth || 114.3;

    // Rule 1: widths must match
    if (Math.abs(topWidthMM - bottomWidthMM) > 0.1) return 'Door Top';

    const L        = win.leaves || 1;
    const F        = win.frame  || 0;
    const stileLen = win.height - (F * (40/25.4));
    const railLen  = (win.width  - (F * (80/25.4))) / L - handleVW - hingeVW;

    if (railLen <= 0 || stileLen <= 0) return 'Door Top';

    const doorStock   = (supplierData && supplierData.stock && supplierData.stock['Door']) || [];
    const topStock    = doorStock.filter(s => s.material === 'Door Top');
    const bottomStock = doorStock.filter(s => s.material === 'Door Bottom');

    if (!topStock.length || !bottomStock.length) return 'Door Top';

    const wTop    = getDoorProfileWeight('Door Top',    supplierData);
    const wBottom = getDoorProfileWeight('Door Bottom', supplierData);

    if (!wTop || !wBottom) return 'Door Top';

    // Option A: Door Top for top rail + Door Bottom for bottom rail + hinge stile
    const kgA = estimatePiecesKg([{ length: railLen, qty: L }], topStock, wTop)
              + estimatePiecesKg([{ length: railLen, qty: L }, { length: stileLen, qty: L }], bottomStock, wBottom);

    // Option B: Door Bottom for top rail + bottom rail + hinge stile (all merged)
    const kgB = estimatePiecesKg([{ length: railLen, qty: L * 2 }, { length: stileLen, qty: L }], bottomStock, wBottom);

    console.log(`%c🔄 Top Rail selection | topW=${topWidthMM}mm == bottomW=${bottomWidthMM}mm | kgA(separate)=${kgA.toFixed(2)} kgB(merged)=${kgB.toFixed(2)} → ${kgB < kgA ? 'Door Bottom (merged saves kg)' : 'Door Top (lighter wins)'}`, 'background:#6610f2;color:white;padding:2px 6px;');

    // Rule 2: strictly less kg wins; tie → prefer Door Top
    return kgB < kgA ? 'Door Bottom' : 'Door Top';
}
// ─────────────────────────────────────────────────────────────────────────────

// Generate door profile formulas dynamically based on window properties.
// Replaces the static formula array for Door series.
function generateDoorProfileFormulas(win, supplierData) {
    const HANDLE_COMP = {
        'Door Vertical':      'Door Vertical',
        'Door Tips Vertical': 'Door Tips Vertical',
        'Door Middle Single':  'Door Middle Single'
    };

    const handleComp = HANDLE_COMP[win.handleProfile] || 'Door Vertical';

    let hingeComp;
    if ((win.closingMechanism || 'Hinge') === 'Hinge') {
        // Hinge side is always Door Bottom (preferred) or Door Top (by least wastage)
        // — regardless of which handle profile is selected
        hingeComp = selectHingeSideProfile(win, supplierData);
    } else {
        // Floor Spring: user-selectable hinge side (default = same as handle side)
        hingeComp = HANDLE_COMP[win.floorSpringHingeProfile] || handleComp;
    }

    // ── Compute actual profile widths (mm → inches) ──────────────────────────
    // Handle side width
    let handleWidthMM;
    if      (handleComp === 'Door Tips Vertical')  handleWidthMM = 47.5;
    else if (handleComp === 'Door Middle Single')  handleWidthMM = win.middleWidth || 47.5;
    else                                           handleWidthMM = win.handleWidth || win.verticalWidth || 47.5; // Door Vertical

    // Hinge side width — use the ACTUAL hinge profile's width, NOT win.bottomWidth
    // (win.bottomWidth = bottom RAIL profile choice; hingeComp = auto-selected hinge profile)
    // Door Bottom profile is always 114.5mm wide; Door Top width comes from win.topWidth
    let hingeWidthMM;
    if (hingeComp === 'Door Bottom') {
        // Read from supplier sections if available, else use 114.5mm (JK ALU standard)
        const dbSections = supplierData && supplierData.sections &&
                           supplierData.sections['Door'] &&
                           supplierData.sections['Door']['Door Bottom'];
        hingeWidthMM = (dbSections && dbSections[0] && dbSections[0].w) || 114.5;
    } else if (hingeComp === 'Door Top') {
        hingeWidthMM = win.topWidth || 47.5;
    } else {
        hingeWidthMM = win.middleWidth || 47.5;
    }

    // Store on win so calculatePieces can inject into safeEval context
    win._handleVW = handleWidthMM / 25.4;
    win._hingeVW  = hingeWidthMM  / 25.4;

    // Select top rail profile — Door Top (default/lighter) or Door Bottom (if kg saving)
    const topRailComp = selectTopRailProfile(win, supplierData, win._handleVW, win._hingeVW);
    // ─────────────────────────────────────────────────────────────────────────

    return [
        { component: handleComp,           qty: 'L',   length: 'H - (F*(40/25.4))',                            desc: 'Vertical Handle' },
        { component: hingeComp,            qty: 'L',   length: 'H - (F*(40/25.4))',                            desc: 'Vertical Hing' },
        { component: topRailComp,          qty: 'L',   length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Top Rail' },
        { component: 'Door Bottom',        qty: 'L',   length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Bottom Rail' },
        { component: 'Door Middle Double', qty: 'L',   length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Middle Rail' },
        { component: 'Door Leg Partition', qty: '1*F', length: 'W',                                        desc: 'Frame Top' },
        { component: 'Door Leg Partition', qty: '1*F', length: 'H',                                        desc: 'Frame Left' },
        { component: 'Door Leg Partition', qty: '1*F', length: 'H',                                        desc: 'Frame Right' },
        // Glazing Clip Vertical: split into Top panel + Bottom panel so off-centre middle rail
        // produces the correct independent lengths for each zone. MRPI (middle-rail position
        // in inches from floor) is injected into context by calculatePieces; for a centred
        // rail it equals exactly half, so both lengths remain equal.
        { component: 'Door Glazing Clip',  qty: '4*L', length: 'H - F*(20/25.4) - TW - MW/2 - MRPI',        desc: 'Glazing Clip Vertical Top' },
        { component: 'Door Glazing Clip',  qty: '4*L', length: 'MRPI - F*(20/25.4) - BW - MW/2',            desc: 'Glazing Clip Vertical Bottom' },
        { component: 'Door Glazing Clip',  qty: '8*L', length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Glazing Clip Horizontal' }
    ];
}

// ============================================================================
// PIECE CALCULATION FROM FORMULAS
// ============================================================================

// Safe evaluation helper to prevent crashes from bad formulas
function safeEval(formula, context, defaultValue = 0) {
    try {
        // Create variables from context (MRPI = Middle Rail Position in Inches)
        const { W, H, S, MS, T, P, CJ, IT, GT, MT, MIT, F, VW, TW, MW, BW, L, HandleVW, HingeVW, MRPI } = context;
        // Use a function constructor for slightly better safety than eval()
        const fn = new Function('W', 'H', 'S', 'MS', 'T', 'P', 'CJ', 'IT', 'GT', 'MT', 'MIT', 'F', 'VW', 'TW', 'MW', 'BW', 'L', 'HandleVW', 'HingeVW', 'MRPI', `return ${formula}`);
        return fn(W, H, S, MS, T, P, CJ, IT, GT, MT, MIT, F, VW, TW, MW, BW, L, HandleVW, HingeVW, MRPI);
    } catch (e) {
        console.error('SafeEval Error:', e, 'Formula:', formula);
        return defaultValue;
    }
}

function calculatePieces(selectedProject, preferredSupplier) {
    const pieces = {};
    const projectWindows = windows.filter(w => w.projectName === selectedProject);

    console.log('🔍 calculatePieces:', {
        project: selectedProject,
        preferredSupplier: preferredSupplier || 'None',
        windowCount: projectWindows.length,
        windows: projectWindows
    });

    projectWindows.forEach(win => {
        const W = win.width;
        const H = win.height;
        const S = win.shutters;
        const MS = win.mosquitoShutters || 0;
        const T = win.tracks;
        const F = win.frame || 0; // Frame for doors (1=YES, 0=NO)
        const id = win.configId;

        // Use preferred supplier if specified, otherwise fall back to window's vendor
        const effectiveVendor = preferredSupplier || win.vendor;

        let seriesName = win.series;
        // Robust lookup: Try specific supplier formulas FIRST
        let formulas = null;

        if (effectiveVendor && window.SUPPLIER_REGISTRY && window.SUPPLIER_REGISTRY[effectiveVendor]) {
            const supplierData = window.SUPPLIER_REGISTRY[effectiveVendor];
            if (supplierData.formulas && supplierData.formulas[seriesName]) {
                formulas = supplierData.formulas[seriesName];
                console.log(`%c✅ USING SUPPLIER REGISTRY: ${effectiveVendor} → ${seriesName}`, 'background: #28a745; color: white; padding: 2px 6px; border-radius: 3px;');
                console.log('   Formulas loaded:', formulas.length, 'items');
            } else {
                console.log(`%c⚠️ Registry has ${effectiveVendor} but NO formulas for "${seriesName}"`, 'background: #ffc107; color: black; padding: 2px 6px;');
            }
        } else {
            console.log(`%c⚠️ No registry entry for vendor: "${effectiveVendor}"`, 'background: #ffc107; color: black; padding: 2px 6px;');
        }

        // Fallback: Use Global/Saved formulas
        if (!formulas) {
            console.log(`%cℹ️ FALLBACK: Using global seriesFormulas for "${seriesName}"`, 'background: #17a2b8; color: white; padding: 2px 6px;');
            formulas = seriesFormulas[seriesName];
        }

        if (!formulas) {
            // Try normalization (strip brackets, Vitco prefix, etc.)
            const normName = seriesName.replace(/\(.*\)/, '').replace(/^Vitco\s+/i, '').trim();
            formulas = seriesFormulas[normName] ||
                seriesFormulas[normName + ' (Frame)'] ||
                seriesFormulas['Vitco ' + normName];
        }

        // Fallback for series name migration (1 vs 1")
        if (!formulas) {
            if (seriesName === '1') formulas = seriesFormulas['1"'];
            else if (seriesName === '1"') formulas = seriesFormulas['1'];
            else if (seriesName === '3/4') formulas = seriesFormulas['3/4"'];
            else if (seriesName === '3/4"') formulas = seriesFormulas['3/4'];
        }

        if (!formulas) {
            console.warn('%c❌ NO FORMULAS FOUND for series: ' + seriesName, 'background: #dc3545; color: white; padding: 2px 6px;');
            return;
        }

        // Door formulas are generated dynamically based on closing mechanism & profile choices
        if (seriesName === 'Door') {
            const supplierData = (window.SUPPLIER_REGISTRY && window.SUPPLIER_REGISTRY[effectiveVendor]) || null;
            formulas = generateDoorProfileFormulas(win, supplierData);
            console.log(
                `%c🚪 Door ${id} | Handle: ${win.handleProfile || 'Door Vertical'} | Hinge: (auto) | HandleVW: ${(win._handleVW||0).toFixed(3)}" | HingeVW: ${(win._hingeVW||0).toFixed(3)}"`,
                'background: #6f42c1; color: white; padding: 2px 6px;'
            );
            console.log(`   W=${win.width}" H=${win.height}" F=${win.frame||0} L=${win.leaves||1} bottomProfile=${win.bottomProfile}`);
        }

        console.log(`%c📐 Window ${id} | Vendor: ${win.vendor} | Series: ${seriesName} | MS: ${MS} | Formulas: ${formulas.length}`, 'background: #343a40; color: white; padding: 2px 6px; border-radius: 3px;');

        // ── Middle-rail position in inches (for door glazing clip vertical formulas) ──
        // middleRailPositionMM = mm from floor to centre of middle rail; null = centred.
        // When centred we synthesise the equivalent MRPI so both clip zones are equal.
        const _TW = (win.topWidth    || 47.5)  / 25.4;
        const _MW = (win.middleWidth || 47.5)  / 25.4;
        const _BW = (win.bottomWidth || 114.3) / 25.4;
        const _F  = win.frame || 0;
        const _totalPanelH = win.height - _F * (40/25.4) - _TW - _BW - _MW;
        const MRPI = (win.middleRailPositionMM != null)
            ? win.middleRailPositionMM / 25.4
            : _F * (20/25.4) + _BW + _totalPanelH / 2 + _MW / 2; // centred fallback
        // ───────────────────────────────────────────────────────────────────────

        const context = {
            W: win.width,
            H: win.height,
            S: win.shutters,
            MS: MS,
            T: win.tracks,
            F: win.frame || 0, // Frame for doors (1=YES, 0=NO)
            // Profile widths for doors (stored in mm, convert to inches)
            VW: (win.verticalWidth || 47.5) / 25.4,  // Legacy fallback (shared vertical width)
            TW: _TW,   // Top Width
            MW: _MW,   // Middle Width
            BW: _BW,   // Bottom Width
            // Door-specific: individual stile widths (set by generateDoorProfileFormulas)
            HandleVW: win._handleVW || (win.handleWidth || win.verticalWidth || 47.5) / 25.4,
            HingeVW:  win._hingeVW  || (win.bottomWidth || 114.3) / 25.4,
            P: (win.width * 2 + win.height * 2),
            CJ: win.cornerJoint || 90,
            IT: win.interlockType || 'slim',
            GT: win.glassUnit || 'SGU',
            MT: win.mosquitoType || 'V-2513',
            MIT: win.mosquitoInterlock || 'V-2516',
            L: win.leaves || 1,
            MRPI,  // Middle Rail Position in Inches (from floor to rail centre)
        };

        formulas.forEach(formula => {
            // Safety check for formula existence and contents
            if (!formula.qty || !formula.length) {
                console.warn('⚠️ Invalid formula (missing qty or length):', formula);
                return;
            }

            let qtyVal = safeEval(formula.qty, context, 0);
            let lenVal = safeEval(formula.length, context, 0);

            const qty = parseInt(qtyVal, 10);
            // Round length to 2 decimal places to avoid float precision issues
            const length = Math.round(parseFloat(lenVal) * 100) / 100;

            if (qty > 0 && length > 0) {
                // Component name comes directly from generateDoorProfileFormulas (already correct)
                let componentName = formula.component;

                // If user chose a Door Top variant as bottom rail, map to 'Door Top'
                // ('Door Top 47.5' / 'Door Top 85' are width choices, not separate stock names)
                if (componentName === 'Door Bottom' && win.bottomProfile) {
                    const bp = win.bottomProfile;
                    if (bp === 'Door Top 47.5' || bp === 'Door Top 85') {
                        componentName = 'Door Top'; // Both variants use 'Door Top' stock
                    } else if (bp !== 'Door Bottom') {
                        componentName = bp; // Unknown custom profile — use as-is
                    }
                    // bp === 'Door Bottom' → leave componentName as 'Door Bottom'
                }

                const targetSeries = formula.series || seriesName;
                addPieces(pieces, targetSeries, componentName, length, id + ' - ' + formula.desc, qty);
            } else {
                console.warn(`⏭️ Skipped [${seriesName}] ${formula.component} — ${formula.desc} | qty=${qty} length=${length} | qtyExpr="${formula.qty}" lenExpr="${formula.length}"`);
            }
        });
    });

    console.log('✅ Calculated pieces:', pieces);
    return pieces;
}

function addPieces(pieces, series, material, length, label, qty) {
    const key = `${series} | ${material}`;
    if (!pieces[key]) {
        pieces[key] = [];
    }

    for (let i = 0; i < qty; i++) {
        pieces[key].push({ length: length, label: label });
    }
}

// ============================================================================
// SMART OPTIMIZATION ALGORITHM
// ============================================================================

function optimizeMaterialSmart(pieces, stockInfo, kerf) {
    pieces.sort((a, b) => b.length - a.length);

    const strategies = [];

    // Strategy 1: Only Stock 1
    strategies.push(solveSpecificStock(pieces, stockInfo.stock1, stockInfo.stock1Cost, kerf));

    // Strategy 2: Only Stock 2 (if different)
    if (stockInfo.stock2 && stockInfo.stock2 !== stockInfo.stock1) {
        strategies.push(solveSpecificStock(pieces, stockInfo.stock2, stockInfo.stock2Cost, kerf));
    }

    // Strategy 3: Smart Cost Focused
    strategies.push(optimizeCostFocused(pieces, stockInfo, kerf));

    // Strategy 4: Greedy Efficiency
    strategies.push(optimizeGreedy(pieces, stockInfo, kerf));

    // Find best strategy (lowest cost)
    let bestPlan = null;
    let minCost = Infinity;

    strategies.forEach(plan => {
        const currentCost = plan.reduce((sum, stick) => sum + stick.cost, 0);

        if (currentCost < minCost) {
            minCost = currentCost;
            bestPlan = plan;
        } else if (Math.abs(currentCost - minCost) < 0.01) {
            if (plan.length < bestPlan.length) {
                bestPlan = plan;
            }
        }
    });

    return bestPlan;
}

// ============================================================================
// STRATEGY: SPECIFIC STOCK SIZE ONLY
// ============================================================================

function solveSpecificStock(pieces, stockLength, stockCost, kerf) {
    const plan = [];
    const remaining = [...pieces];

    while (remaining.length > 0) {
        const pattern = findBestPattern(remaining, stockLength, kerf);

        if (pattern.pieces.length === 0) {
            break;
        }

        pattern.pieces.forEach(p => {
            const idx = remaining.indexOf(p);
            if (idx !== -1) remaining.splice(idx, 1);
        });

        plan.push({
            stock: stockLength + '"',
            pieces: pattern.pieces,
            used: pattern.used,
            waste: pattern.waste,
            cost: stockCost,
            efficiency: ((pattern.used / stockLength) * 100).toFixed(1)
        });
    }

    return plan;
}

// ============================================================================
// STRATEGY: GREEDY EFFICIENCY
// ============================================================================

function optimizeGreedy(pieces, stockInfo, kerf) {
    const plans = [];
    const remaining = [...pieces];

    while (remaining.length > 0) {
        const strategies = [];

        const fillStock1 = findBestPattern(remaining, stockInfo.stock1, kerf);
        if (fillStock1.pieces.length > 0) {
            strategies.push({
                pattern: fillStock1,
                stock: stockInfo.stock1,
                cost: stockInfo.stock1Cost,
                efficiency: fillStock1.used / stockInfo.stock1,
                costPerInch: stockInfo.stock1Cost / fillStock1.used
            });
        }

        const fillStock2 = findBestPattern(remaining, stockInfo.stock2, kerf);
        if (fillStock2.pieces.length > 0) {
            strategies.push({
                pattern: fillStock2,
                stock: stockInfo.stock2,
                cost: stockInfo.stock2Cost,
                efficiency: fillStock2.used / stockInfo.stock2,
                costPerInch: stockInfo.stock2Cost / fillStock2.used
            });
        }

        if (strategies.length === 0) break;

        strategies.sort((a, b) => {
            if (a.efficiency >= 0.7 && b.efficiency < 0.7) return -1;
            if (b.efficiency >= 0.7 && a.efficiency < 0.7) return 1;
            if (Math.abs(a.costPerInch - b.costPerInch) > 0.01) {
                return a.costPerInch - b.costPerInch;
            }
            return a.pattern.waste - b.pattern.waste;
        });

        const bestStrategy = strategies[0];

        bestStrategy.pattern.pieces.forEach(p => {
            const idx = remaining.findIndex(r => r.length === p.length && r.label === p.label);
            if (idx !== -1) remaining.splice(idx, 1);
        });

        plans.push({
            stock: bestStrategy.stock + '"',
            pieces: bestStrategy.pattern.pieces,
            used: bestStrategy.pattern.used,
            waste: bestStrategy.pattern.waste,
            cost: bestStrategy.cost,
            efficiency: (bestStrategy.efficiency * 100).toFixed(1)
        });
    }

    return plans;
}

// ============================================================================
// STRATEGY: COST FOCUSED
// ============================================================================

function optimizeCostFocused(pieces, stockInfo, kerf) {
    const plans = [];
    const remaining = [...pieces];

    while (remaining.length > 0) {
        const scenarios = [];

        // Single stock 1
        const s1Result = findBestPattern(remaining, stockInfo.stock1, kerf);
        if (s1Result.pieces.length > 0) {
            const s1Remaining = remaining.filter(r => !s1Result.pieces.includes(r));
            scenarios.push({
                firstCut: {
                    pattern: s1Result,
                    stock: stockInfo.stock1,
                    cost: stockInfo.stock1Cost
                },
                remaining: s1Remaining,
                twoStocks: false
            });
        }

        // Single stock 2
        const s2Result = findBestPattern(remaining, stockInfo.stock2, kerf);
        if (s2Result.pieces.length > 0) {
            const s2Remaining = remaining.filter(r => !s2Result.pieces.includes(r));
            scenarios.push({
                firstCut: {
                    pattern: s2Result,
                    stock: stockInfo.stock2,
                    cost: stockInfo.stock2Cost
                },
                remaining: s2Remaining,
                twoStocks: false
            });
        }

        // Two stock 1s (if smaller than stock 2)
        if (stockInfo.stock1 < stockInfo.stock2) {
            const firstStock1 = findBestPattern(remaining, stockInfo.stock1, kerf);
            if (firstStock1.pieces.length > 0) {
                const temp1Remaining = remaining.filter(r => !firstStock1.pieces.includes(r));
                const secondStock1 = findBestPattern(temp1Remaining, stockInfo.stock1, kerf);

                if (secondStock1.pieces.length > 0) {
                    const totalCost = stockInfo.stock1Cost * 2;
                    const totalUsed = firstStock1.used + secondStock1.used;
                    const finalRemaining = temp1Remaining.filter(r => !secondStock1.pieces.includes(r));
                    const avgEfficiency = totalUsed / (stockInfo.stock1 * 2);

                    if (avgEfficiency > 0.5) {
                        scenarios.push({
                            twoStocks: true,
                            cuts: [
                                {
                                    pattern: firstStock1,
                                    stock: stockInfo.stock1,
                                    cost: stockInfo.stock1Cost
                                },
                                {
                                    pattern: secondStock1,
                                    stock: stockInfo.stock1,
                                    cost: stockInfo.stock1Cost
                                }
                            ],
                            totalCost: totalCost,
                            avgEfficiency: avgEfficiency,
                            remaining: finalRemaining
                        });
                    }
                }
            }
        }

        if (scenarios.length === 0) break;

        // Find best scenario
        let bestScenario = null;
        let bestScore = Infinity;

        scenarios.forEach(scenario => {
            let cost, efficiency;

            if (scenario.twoStocks) {
                cost = scenario.totalCost;
                efficiency = scenario.avgEfficiency;
            } else {
                cost = scenario.firstCut.cost;
                efficiency = scenario.firstCut.pattern.used / scenario.firstCut.stock;
            }

            let score = cost;
            if (efficiency < 0.5) score *= 1.5;
            if (efficiency < 0.3) score *= 2.0;

            if (score < bestScore) {
                bestScore = score;
                bestScenario = scenario;
            }
        });

        // Apply best scenario
        if (bestScenario.twoStocks) {
            bestScenario.cuts.forEach(cut => {
                plans.push({
                    stock: cut.stock + '"',
                    pieces: cut.pattern.pieces,
                    used: cut.pattern.used,
                    waste: cut.pattern.waste,
                    cost: cut.cost,
                    efficiency: ((cut.pattern.used / cut.stock) * 100).toFixed(1)
                });
            });
            remaining.length = 0;
            remaining.push(...bestScenario.remaining);
        } else {
            const cut = bestScenario.firstCut;
            plans.push({
                stock: cut.stock + '"',
                pieces: cut.pattern.pieces,
                used: cut.pattern.used,
                waste: cut.pattern.waste,
                cost: cut.cost,
                efficiency: ((cut.pattern.used / cut.stock) * 100).toFixed(1)
            });
            remaining.length = 0;
            remaining.push(...bestScenario.remaining);
        }
    }

    return plans;
}

// ============================================================================
// PATTERN FINDING (FIRST FIT DECREASING)
// ============================================================================

function findBestPattern(pieces, stockLen, kerf) {
    let bestPattern = { pieces: [], used: 0, waste: stockLen };
    let used = 0;
    let pattern = [];

    for (const piece of pieces) {
        const needed = piece.length + (pattern.length > 0 ? kerf : 0);

        if (used + needed <= stockLen) {
            pattern.push(piece);
            used += needed;
        }
    }

    if (used > bestPattern.used) {
        bestPattern = {
            pieces: pattern,
            used: used,
            waste: stockLen - used
        };
    }

    return bestPattern;
}

// ============================================================================
// MOSQUITO NET 2D OPTIMIZATION
// ============================================================================

/**
 * Compute all net pieces required for project windows that have mosquito shutters.
 * Returns [{w, h, qty, label, series}] — one entry per unique window config.
 */
function computeNetPieces(projectWindows) {
    const pieces = [];

    projectWindows.forEach(win => {
        const MS = win.mosquitoShutters || 0;
        if (MS <= 0) return;

        const series = win.series;
        const deductionCfg = (ratesConfig.netDeductions && ratesConfig.netDeductions[series]) || null;
        if (!deductionCfg) {
            console.log(`ℹ️ No net deduction config for series "${series}" — skipping mosquito net`);
            return;
        }

        const W = win.width;
        const H = win.height;
        const S = win.shutters || 2;

        // Mosquito shutter frame piece lengths (same formula as C-channel / shutter pieces)
        let shutterH, shutterW;

        if (series === '27mm Domal') {
            shutterH = H - 2.75;                          // vertical profile length
            shutterW = (W - 3 + 2.5 * (S - 1)) / S;      // horizontal profile length
        } else {
            // Fallback for future series: use full window dims
            shutterH = H;
            shutterW = W / Math.max(1, S);
        }

        const netW = Math.max(0, shutterW - deductionCfg.deductW);
        const netH = Math.max(0, shutterH - deductionCfg.deductH);

        if (netW <= 0 || netH <= 0) {
            console.warn(`⚠️ Net piece size ≤ 0 for window ${win.configId}: netW=${netW.toFixed(2)}" netH=${netH.toFixed(2)}"`);
            return;
        }

        console.log(
            `%c🕸️ Net ${win.configId} | Series: ${series} | MS=${MS} | ` +
            `shutterH=${shutterH.toFixed(2)}" shutterW=${shutterW.toFixed(2)}" | ` +
            `net ${netW.toFixed(2)}"×${netH.toFixed(2)}"`,
            'background: #8e44ad; color: white; padding: 2px 6px;'
        );

        pieces.push({
            w: Math.round(netW * 100) / 100,
            h: Math.round(netH * 100) / 100,
            qty: MS,
            label: `${win.configId} (${series})`,
            series
        });
    });

    return pieces;
}

/**
 * Pack pieces into ONE bin (single roll segment) using FFDH-BF with rotation.
 * Returns { shelves, usedLength, placed[], remaining[] }
 *
 * @param {Array}  items     [{w, h, label}] in chosen sort order
 * @param {number} binWidth  bin's roll/sheet width
 * @param {number} binLength bin's available length/height (remaining for partials, full for new)
 */

// ============================================================================
// SHEET CATALOG & PARTITION PANEL OPTIMIZER
// ============================================================================

/** Standard available sheet sizes per material (all in inches). */
const SHEET_CATALOG = {
    'ACP':           [{ name:"8'×4'", w:48, h:96 }, { name:"10'×4'", w:48, h:120 }, { name:"12'×4'", w:48, h:144 }],
    'Bakelite':      [{ name:"8'×4'", w:48, h:96 }],
    'ParticleBoard': [{ name:"8'×4'", w:48, h:96 }],
};

/**
 * Derive the 2D sheet panel pieces for all door partitions in a project.
 * Panel W = glazing-clip-horizontal analogue; Panel H = zone height (Top or Bottom).
 * Kerf of 0.125" per cut is deducted on each edge.
 */
function collectPartitionPanels(windows) {
    const SHEET_MATS = new Set(['ACP', 'Bakelite', 'ParticleBoard']);
    const KERF = 0.125;
    const panels = [];

    windows.forEach(win => {
        if (win.category !== 'Door') return;
        const qty = win.qty || 1;
        const L   = win.leaves || 1;
        const H   = win.height,  W = win.width;
        const F   = win.frame || 0;
        const TW  = (win.topWidth    || 47.5)  / 25.4;
        const MW  = (win.middleWidth || 47.5)  / 25.4;
        const BW  = (win.bottomWidth || 114.3) / 25.4;
        const HVW = win._handleVW || (win.handleWidth || win.verticalWidth || 47.5) / 25.4;
        const GVW = win._hingeVW  || (win.bottomWidth || 114.3) / 25.4;

        const totalPanelH = H - F*(40/25.4) - TW - BW - MW;
        const MRPI = (win.middleRailPositionMM != null)
            ? win.middleRailPositionMM / 25.4
            : F*(20/25.4) + BW + totalPanelH/2 + MW/2;

        const upperH = Math.max(0.5, H - F*(20/25.4) - TW - MW/2 - MRPI - KERF);
        const lowerH = Math.max(0.5, MRPI - F*(20/25.4) - BW - MW/2 - KERF);
        const panelW = Math.max(0.5, (W - F*(80/25.4)) / L - HVW - GVW - KERF);

        const addPanel = (zone, zoneH) => {
            const part = zone === 'upper'
                ? (win.upperPartition || (win.partitionMaterial ? { material: win.partitionMaterial, thickness: String(win.partitionThickness || '0') } : null))
                : win.lowerPartition;
            if (!part || !SHEET_MATS.has(part.material)) return;
            panels.push({
                label: `${win.configId} (${zone})`,
                material: part.material,
                thickness: String(part.thickness || '0'),
                w: panelW, h: zoneH,
                qty: qty * L,
            });
        };
        addPanel('upper', upperH);
        addPanel('lower', lowerH);
    });
    return panels;
}

/**
 * Pack one material+thickness group of door panels into sheets using FFDH+rotation.
 * Reuses _packBin/_packMultiBin with sheetH as the bounded bin length.
 */
function packSheetGroup(rawPanels, sheetSizes, partialSheets, ratePerSqft) {
    if (!rawPanels.length || !sheetSizes.length) return null;

    // Expand panels by qty into individual pieces
    const allPieces = [];
    rawPanels.forEach(p => {
        for (let i = 0; i < p.qty; i++)
            allPieces.push({ w: p.w, h: p.h, label: p.label, origW: p.w, origH: p.h });
    });

    const SORTS = [
        arr => [...arr].sort((a,b) => (b.w*b.h) - (a.w*a.h)),
        arr => [...arr].sort((a,b) => Math.max(b.w,b.h) - Math.max(a.w,a.h)),
        arr => [...arr].sort((a,b) => b.h - a.h),
        arr => [...arr].sort((a,b) => b.w - a.w),
    ];

    let best = null;

    for (const sz of sheetSizes) {
        const costPerSheet = ratePerSqft * sz.w * sz.h / 144;

        const partials = (partialSheets || [])
            .filter(ps => ps.w >= 1 && ps.h >= 1)
            .flatMap((ps, i) => {
                const qty = Math.max(1, ps.qty || 1);
                return Array.from({ length: qty }, (_, q) => ({
                    kind: 'store', width: ps.w, length: ps.h,
                    label: ps.label ? `${ps.label} (${ps.w}"×${ps.h}")` : `Stock sheet #${i+1} (${ps.w}"×${ps.h}")`
                }));
            })
            .sort((a, b) => a.length - b.length); // smallest-first for _packMultiBin

        const newSpec = { name: sz.name, width: sz.w, length: sz.h };

        for (const sort of SORTS) {
            const sorted = sort(allPieces);
            const bins = _packMultiBin(sorted, partials, newSpec);
            if (!bins) continue;

            const piecesArea    = allPieces.reduce((s,p) => s + p.w*p.h, 0);
            const consumedArea  = bins.reduce((s,b) => s + b.width * b.usedLength, 0);
            const wasteArea     = Math.max(0, consumedArea - piecesArea);
            const eff           = consumedArea > 0 ? Math.round(piecesArea / consumedArea * 100) : 0;
            const newSheetsUsed = bins.filter(b => b.kind === 'new').length;
            const storeSheetsUsed = bins.filter(b => b.kind === 'store').length;
            const cost          = newSheetsUsed * costPerSheet;

            const cand = {
                sheetW: sz.w, sheetH: sz.h, sheetName: sz.name,
                bins, piecesArea, consumedArea, wasteArea, efficiency: eff,
                newSheetsUsed, storeSheetsUsed, cost, costPerSheet,
                leftover: bins.filter(b => b.kind === 'new' && (b.capacityLength - b.usedLength) > 1)
                    .map(b => ({ kind:'new', width: b.width, remainingAfter: b.capacityLength - b.usedLength, label: b.label })),
            };

            const better = !best
                || cand.cost < best.cost
                || (cand.cost === best.cost && cand.newSheetsUsed < best.newSheetsUsed)
                || (cand.cost === best.cost && cand.newSheetsUsed === best.newSheetsUsed && cand.consumedArea < best.consumedArea);
            if (better) best = cand;
        }
    }
    return best;
}

/** Entry point: collect door panels, group by material+thickness, pack each group. */
function packAllSheets(windows, partialSheets) {
    const panels = collectPartitionPanels(windows);
    if (!panels.length) return null;

    const groups = {};
    panels.forEach(p => {
        const key = `${p.material}_${p.thickness}mm`;
        (groups[key] = groups[key] || []).push(p);
    });

    const byGroup = {};
    for (const [key, gPanels] of Object.entries(groups)) {
        const mat = gPanels[0].material;
        const thk = gPanels[0].thickness;
        const sizes = SHEET_CATALOG[mat];
        if (!sizes || !sizes.length) continue;
        const rate = (ratesConfig.partitionRates || {})[key] || 0;
        // Partial sheets from UI have no thickness field — match by material only
        // (user enters physical sheet dimensions; they won't mix thicknesses in same partial)
        const gPartials = (partialSheets || []).filter(ps => ps.material === mat);
        const result = packSheetGroup(gPanels, sizes, gPartials, rate);
        if (result) byGroup[key] = { material: mat, thickness: thk + 'mm', ratePerSqft: rate, panels: gPanels, ...result };
    }
    return Object.keys(byGroup).length > 0 ? { byGroup } : null;
}

function _packBin(items, binWidth, binLength) {
    const shelves   = [];          // [{y, shelfH, nextX, pieces:[...]}]
    let usedLength  = 0;
    const placed    = [];
    const remaining = [];

    for (const item of items) {
        const orients = [];
        if (item.w <= binWidth) orients.push({ pw: item.w, ph: item.h, rotated: false });
        if (item.h !== item.w && item.h <= binWidth) orients.push({ pw: item.h, ph: item.w, rotated: true });
        if (orients.length === 0) { remaining.push(item); continue; }

        // Best-Fit on existing shelves
        let bestSi = -1, bestO = null, bestWaste = Infinity;
        for (const o of orients) {
            for (let si = 0; si < shelves.length; si++) {
                const sh = shelves[si];
                if (o.ph <= sh.shelfH && sh.nextX + o.pw <= binWidth) {
                    const waste = sh.shelfH - o.ph;
                    if (waste < bestWaste) { bestWaste = waste; bestSi = si; bestO = o; }
                }
            }
        }

        if (bestSi >= 0) {
            const sh = shelves[bestSi];
            const placedPiece = { x: sh.nextX, w: bestO.pw, h: bestO.ph,
                                  label: item.label, origW: item.w, origH: item.h, rotated: bestO.rotated };
            sh.pieces.push(placedPiece);
            sh.nextX += bestO.pw;
            placed.push(item);
            continue;
        }

        // Try opening a new shelf — must fit within bin's remaining length
        const o = orients.reduce((a, b) => a.ph <= b.ph ? a : b);
        if (usedLength + o.ph <= binLength) {
            shelves.push({
                y: usedLength, shelfH: o.ph, nextX: o.pw,
                pieces: [{ x: 0, w: o.pw, h: o.ph,
                           label: item.label, origW: item.w, origH: item.h, rotated: o.rotated }]
            });
            usedLength += o.ph;
            placed.push(item);
        } else {
            remaining.push(item);
        }
    }

    return { shelves, usedLength, placed, remaining };
}

/**
 * Multi-bin packer: tries to place ALL items, using partial bins (in priority order)
 * first, then opening new rolls as needed. Returns array of bins or null on failure.
 *
 * @param {Array}  sortedItems    pre-sorted items
 * @param {Array}  partialBins    [{kind:'store', width, length, label, sourceQtyIdx}] — pre-sorted (smallest length first)
 * @param {Object} newRollSpec    {name, width, length, costPerRoll} — used to open new rolls
 */
function _packMultiBin(sortedItems, partialBins, newRollSpec) {
    let pending = [...sortedItems];
    const usedBins = [];

    // Phase 1: try partial bins (smallest first) for the chosen width
    for (const pBin of partialBins) {
        if (pending.length === 0) break;
        const res = _packBin(pending, pBin.width, pBin.length);
        if (res.shelves.length > 0) {
            usedBins.push({
                kind: 'store',
                label: pBin.label || `Stock partial (${pBin.width}"×${pBin.length}")`,
                width: pBin.width,
                capacityLength: pBin.length,
                usedLength: res.usedLength,
                shelves: res.shelves
            });
        }
        pending = res.remaining;
    }

    // Phase 2: use new rolls for remaining items
    let newRollIdx = 0;
    while (pending.length > 0) {
        newRollIdx++;
        const res = _packBin(pending, newRollSpec.width, newRollSpec.length);
        if (res.shelves.length === 0) {
            // Even a fresh new roll can't accept any of the pending pieces → fail
            return null;
        }
        usedBins.push({
            kind: 'new',
            label: `New roll #${newRollIdx}`,
            width: newRollSpec.width,
            capacityLength: newRollSpec.length,
            usedLength: res.usedLength,
            shelves: res.shelves
        });
        pending = res.remaining;
    }

    return usedBins;
}

/**
 * Main net cutting entry point: 2D FFDH with rotation + multi-bin (store + new rolls).
 * Tries 4 sort strategies × all available roll widths → returns minimum-cost layout.
 *
 * @param {Array}  allPieces      [{w, h, qty, label, series}]
 * @param {Array}  availableRolls [{name, width, length, costPerRoll}] (new-roll specs)
 * @param {Array}  partialRolls   [{width, remainingLength, qty, label}] — leftover stock (optional)
 * @returns best layout object, or null if nothing fits
 */
function packNetFFDH(allPieces, availableRolls, partialRolls) {
    if (!allPieces.length || !availableRolls.length) return null;
    partialRolls = partialRolls || [];

    // Expand qty → individual item entries
    const items = [];
    allPieces.forEach(p => {
        for (let i = 0; i < p.qty; i++) {
            items.push({ w: p.w, h: p.h, label: p.label });
        }
    });

    // 4 sort strategies (all descending)
    const sorts = [
        arr => [...arr].sort((a, b) => b.w * b.h                  - a.w * a.h),           // area ↓
        arr => [...arr].sort((a, b) => Math.max(b.w, b.h)         - Math.max(a.w, a.h)),  // max-dim ↓
        arr => [...arr].sort((a, b) => b.w                         - a.w),                 // width ↓
        arr => [...arr].sort((a, b) => b.h                         - a.h),                 // height ↓
    ];
    const sortNames = ['area↓', 'maxDim↓', 'width↓', 'height↓'];

    // Expand partial rolls (qty) into individual bins, indexed by width
    const partialBinsByWidth = {};
    partialRolls.forEach(p => {
        if (!p.width || !p.remainingLength || p.remainingLength <= 0) return;
        const w = p.width;
        if (!partialBinsByWidth[w]) partialBinsByWidth[w] = [];
        const qty = Math.max(1, p.qty || 1);
        for (let i = 0; i < qty; i++) {
            partialBinsByWidth[w].push({
                kind: 'store',
                width: w,
                length: p.remainingLength,
                label: p.label ? `${p.label} (${w}"×${p.remainingLength}")` : `Stock partial (${w}"×${p.remainingLength}")`
            });
        }
    });

    const widthsAvailable = availableRolls.map(r => r.width).sort((a, b) => a - b);
    const piecesArea = items.reduce((s, p) => s + p.w * p.h, 0);

    // ── Debug log: list every piece and which widths it fits on ──────────────
    const piecesAnalysis = items.map(it => {
        const fitsOn = widthsAvailable.filter(W => it.w <= W || it.h <= W);
        return { label: it.label, w: it.w, h: it.h, fitsOn: fitsOn.join(',') };
    });
    console.log('%c🔍 Net optimizer — pieces analysis:', 'background: #4a148c; color: white; padding: 2px 6px;');
    console.table(piecesAnalysis);
    console.log(`Available widths: ${widthsAvailable.join('", ')}"`);

    let best = null;
    const debugCandidates = [];

    // Helper to compute candidate metrics
    function makeCandidate(bins, newRollSpec, label) {
        const totalLength = bins.reduce((s, b) => s + b.usedLength, 0);
        const linearArea  = bins.reduce((s, b) => s + b.width * b.usedLength, 0);
        const newRollsUsed = bins.filter(b => b.kind === 'new').length;
        const storeRollsUsed = bins.filter(b => b.kind === 'store').length;
        const wasteArea = linearArea - piecesArea;
        const efficiency = linearArea > 0 ? Math.round(piecesArea / linearArea * 1000) / 10 : 0;
        // Cost: sum of (rolls used × that width's costPerRoll). Group by width.
        let cost = 0;
        bins.filter(b => b.kind === 'new').forEach(b => {
            const spec = availableRolls.find(r => r.width === b.width);
            cost += (spec ? spec.costPerRoll || 0 : 0);
        });
        return {
            roll: newRollSpec, bins,
            piecesArea, totalLength, linearArea, wasteArea, efficiency,
            newRollsUsed, storeRollsUsed, cost, strategyLabel: label
        };
    }

    function isBetter(c, b) {
        // Priority: less linear area > fewer new rolls > lower cost
        // (linear area is the actual material consumed — directly impacts waste & quotation)
        if (c.linearArea !== b.linearArea) return c.linearArea < b.linearArea;
        if (c.newRollsUsed !== b.newRollsUsed) return c.newRollsUsed < b.newRollsUsed;
        return c.cost < b.cost;
    }

    // ── Strategy A: single-width (all pieces on ONE roll width) ──────────────
    availableRolls.forEach(newRoll => {
        const partialsForWidth = (partialBinsByWidth[newRoll.width] || [])
            .slice().sort((a, b) => a.length - b.length);

        sorts.forEach((sortFn, si) => {
            const sortedItems = sortFn(items);
            const bins = _packMultiBin(sortedItems, partialsForWidth, newRoll);
            if (!bins) {
                debugCandidates.push({
                    strategy: `single-${newRoll.width}"-${sortNames[si]}`,
                    status: '✗ pieces too wide for this roll'
                });
                return;
            }
            const candidate = makeCandidate(bins, newRoll, `single-${newRoll.width}"-${sortNames[si]}`);
            const wasBetter = !best || isBetter(candidate, best);
            if (wasBetter) best = candidate;
            debugCandidates.push({
                strategy: candidate.strategyLabel,
                status: '✓',
                newRolls: candidate.newRollsUsed,
                storeRolls: candidate.storeRollsUsed,
                linearArea: candidate.linearArea.toFixed(0),
                linearSqft: (candidate.linearArea/144).toFixed(2),
                efficiency: candidate.efficiency + '%',
                cost: '₹' + candidate.cost.toFixed(0),
                _best: wasBetter ? '★ NEW BEST' : ''
            });
        });
    });

    // ── Strategy B: MIXED-WIDTH (split pieces by best-fit width) ──────────────
    // For each "narrow" width N and "wider" width W (where W > N):
    //   pieces fitting on N → packed on N
    //   pieces NOT fitting on N (but fitting on W) → packed on W
    // This handles cases where one piece forces a wide roll for everything.
    for (let ni = 0; ni < widthsAvailable.length; ni++) {
        const N = widthsAvailable[ni];
        const narrowRoll = availableRolls.find(r => r.width === N);
        if (!narrowRoll) continue;

        const fitsOnN = items.filter(it => it.w <= N || it.h <= N);
        const tooBigForN = items.filter(it => !(it.w <= N || it.h <= N));
        if (fitsOnN.length === 0 || tooBigForN.length === 0) continue;  // not a real split

        for (let wi = ni + 1; wi < widthsAvailable.length; wi++) {
            const W = widthsAvailable[wi];
            const wideRoll = availableRolls.find(r => r.width === W);
            if (!wideRoll) continue;

            // Wide group must fit on W
            const allFitOnW = tooBigForN.every(it => it.w <= W || it.h <= W);
            if (!allFitOnW) continue;

            sorts.forEach((sortFn1, s1) => {
                sorts.forEach((sortFn2, s2) => {
                    const narrowSorted = sortFn1(fitsOnN);
                    const wideSorted   = sortFn2(tooBigForN);
                    const narrowPartials = (partialBinsByWidth[N] || []).slice().sort((a, b) => a.length - b.length);
                    const widePartials   = (partialBinsByWidth[W] || []).slice().sort((a, b) => a.length - b.length);

                    const narrowBins = _packMultiBin(narrowSorted, narrowPartials, narrowRoll);
                    if (!narrowBins) return;
                    const wideBins = _packMultiBin(wideSorted, widePartials, wideRoll);
                    if (!wideBins) return;

                    const allBins = [...narrowBins, ...wideBins];
                    const label = `mixed-${N}"+${W}"-${sortNames[s1]}/${sortNames[s2]}`;
                    const candidate = makeCandidate(allBins, wideRoll, label);
                    candidate.mixed = true;
                    candidate.narrowWidth = N;
                    candidate.wideWidth = W;

                    const wasBetter = !best || isBetter(candidate, best);
                    if (wasBetter) best = candidate;
                    debugCandidates.push({
                        strategy: label,
                        status: '✓ MIXED',
                        newRolls: candidate.newRollsUsed,
                        storeRolls: candidate.storeRollsUsed,
                        linearArea: candidate.linearArea.toFixed(0),
                        linearSqft: (candidate.linearArea/144).toFixed(2),
                        efficiency: candidate.efficiency + '%',
                        cost: '₹' + candidate.cost.toFixed(0),
                        _best: wasBetter ? '★ NEW BEST' : ''
                    });
                });
            });
        }
    }

    // ── Print debug log (helps diagnose unexpected choices) ──────────────────
    console.log('%c🕸️ Net optimizer — all candidates evaluated:', 'background: #8e44ad; color: white; padding: 2px 6px;');
    console.table(debugCandidates);
    if (best) {
        console.log('%c✅ Winning strategy: ' + best.strategyLabel,
            'background: #27ae60; color: white; padding: 2px 6px; font-weight: bold;');
        if (best.mixed) {
            console.log(`   Mixed widths: narrow=${best.narrowWidth}", wide=${best.wideWidth}"`);
        }
    } else {
        console.warn('⚠️ No valid layout found — some pieces are too wide for any available roll');
    }

    // ── Compute leftover suggestion (informational only) ─────────────────────
    if (best) {
        best.leftover = best.bins
            .filter(b => b.capacityLength - b.usedLength > 0)
            .map(b => ({
                kind: b.kind,
                width: b.width,
                remainingAfter: b.capacityLength - b.usedLength,
                label: b.label
            }));
        Object.entries(partialBinsByWidth).forEach(([w, bins]) => {
            bins.forEach(pb => {
                const wasUsed = best.bins.some(used =>
                    used.kind === 'store' && used.width === pb.width
                    && used.capacityLength === pb.length && used.label === pb.label);
                if (!wasUsed) {
                    best.leftover.push({
                        kind: 'store-unused',
                        width: pb.width,
                        remainingAfter: pb.length,
                        label: pb.label
                    });
                }
            });
        });
    }

    return best;
}

// ============================================================================
// CUTTING DIAGRAM GENERATOR
// ============================================================================

function generateCuttingDiagram(plan, maxLength) {
    const svgWidth = 800;
    const svgHeight = 60;
    const scale = svgWidth / maxLength;

    let svg = `<svg width="${svgWidth}" height="${svgHeight}" style="border: 1px solid #ddd; background: white;">`;
    svg += `<rect x="0" y="10" width="${maxLength * scale}" height="40" fill="#ecf0f1" stroke="#95a5a6" stroke-width="2"/>`;

    let currentX = 0;
    const colors = ['#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e'];

    plan.pieces.forEach((piece, idx) => {
        const pieceWidth = piece.length * scale;
        const color = colors[idx % colors.length];

        svg += `<rect x="${currentX}" y="10" width="${pieceWidth}" height="40" fill="${color}" opacity="0.7" stroke="white" stroke-width="1"/>`;

        const label = `${piece.length.toFixed(1)}"`;
        const windowId = piece.label.split(' - ')[0];

        svg += `<text x="${currentX + pieceWidth / 2}" y="25" font-size="10" fill="white" text-anchor="middle" font-weight="bold">${windowId}</text>`;
        svg += `<text x="${currentX + pieceWidth / 2}" y="40" font-size="9" fill="white" text-anchor="middle">${label}</text>`;

        currentX += pieceWidth;

        if (idx < plan.pieces.length - 1) {
            svg += `<rect x="${currentX}" y="10" width="${kerf * scale}" height="40" fill="#e74c3c"/>`;
            currentX += kerf * scale;
        }
    });

    if (plan.waste > 0) {
        const wasteWidth = plan.waste * scale;
        svg += `<rect x="${currentX}" y="10" width="${wasteWidth}" height="40" fill="#95a5a6" opacity="0.5"/>`;
        svg += `<text x="${currentX + wasteWidth / 2}" y="35" font-size="10" fill="#2c3e50" text-anchor="middle">Waste: ${plan.waste.toFixed(1)}"</text>`;
    }

    svg += '</svg>';
    return svg;
}
