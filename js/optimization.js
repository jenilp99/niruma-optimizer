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

    // v1.54: Pre-run DOOR thickness gate. Seed size/role-based suggestions, then make
    // the user review & confirm them before optimizing. Re-arms if any door's size or
    // profile config changes (signature mismatch). Windows are unaffected.
    const doorWins = windows.filter(w => w.projectName === selectedProject && w.category === 'Door');
    if (doorWins.length) {
        const sig = doorWins.map(w =>
            `${w.configId}:${w.width}x${w.height}:${w.leaves}:${w.handleProfile}:${w.hingeWidth}:${w.closingMechanism}:${w.frame}`
        ).join('|');
        window._doorThkSig = window._doorThkSig || {};
        if (window._doorThkSig[selectedProject] !== sig) {
            doorWins.forEach(w => applyDoorThicknessPlan(w, false)); // pre-fill suggestions (auto only)
            if (typeof autoSaveWindows === 'function') autoSaveWindows();
            window._pendingDoorSig = window._pendingDoorSig || {};
            window._pendingDoorSig[selectedProject] = sig;
            if (typeof openDoorThicknessGate === 'function') {
                openDoorThicknessGate(selectedProject);
                return;
            }
        }
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

    // Build vendor-by-material map: for each material key, record which vendor(s) supply it
    const vendorByMaterial = {};
    projectWindows.forEach(w => {
        const seriesName = w.series;
        const vendor = w.vendor;
        if (!seriesName || !vendor) return;
        const sd = (window.SUPPLIER_REGISTRY || {})[vendor];
        const formulas = (sd && sd.formulas && sd.formulas[seriesName])
            || seriesFormulas[seriesName] || [];
        formulas.forEach(f => {
            const targetSeries = f.series || seriesName;
            const key = `${targetSeries} | ${f.component}`;
            if (!vendorByMaterial[key]) vendorByMaterial[key] = new Set();
            vendorByMaterial[key].add(vendor);
        });
        if (seriesName === 'Door' && typeof generateDoorProfileFormulas === 'function') {
            const doorFormulas = generateDoorProfileFormulas(w, sd);
            doorFormulas.forEach(f => {
                const targetSeries = f.series || seriesName;
                const key = `${targetSeries} | ${f.component}`;
                if (!vendorByMaterial[key]) vendorByMaterial[key] = new Set();
                vendorByMaterial[key].add(vendor);
            });
        }
    });
    // Convert Sets to arrays for JSON serialization
    Object.keys(vendorByMaterial).forEach(k => { vendorByMaterial[k] = [...vendorByMaterial[k]]; });

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
            // v1.63: imported (survey) units may have no Series/Vendor yet — give a clear,
            // actionable message instead of "Missing formulas for series: " (blank).
            const unset = projectWindows
                .filter(w => w.category !== 'Door' && (!w.series || !w.vendor))
                .map(w => w.configId);
            if (unset.length) {
                showAlert(`❌ ${unset.length} window(s) have no Series/Vendor set:\n${unset.join(', ')}\n\nThese were imported without a vendor/series. Set them via ✏️ Edit on each card, or re-import the Excel and choose a Vendor + Series in the Import dialog.`);
                return;
            }
            showAlert(`❌ Missing formulas for series: ${missingSeries.filter(Boolean).join(', ')}\n\nPlease configure formulas in the "Formulas Master" section.`);
            return;
        }

        showAlert('❌ No pieces calculated for this project!\n\nThis could be due to:\n- Missing or invalid formulas\n- All formula quantities evaluate to 0\n- Formula evaluation errors');
        return;
    }

    const results = {};
    const profilePartialPlan = {};   // v1.65: offcut usage per material (purchase-list only)
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
        // v1.48: use the per-series rate (default ₹520/kg) instead of the global aluminumRate,
        // so the optimizer's cost matches the quotation and the Aluminum Rates panel.
        const currentRate = (typeof stockRates !== 'undefined' && stockRates[materialSeries] != null)
            ? stockRates[materialSeries] : 520;

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
        results[displayKey] = plans;   // full-stock plan — used for costing/quote (UNCHANGED)

        plans.forEach(plan => {
            totalSticks++;
            totalUsed += plan.used;
            totalWaste += plan.waste;
            totalCost += plan.cost;
        });

        // v1.65: PURCHASE-LIST-ONLY offcut plan. Packs pieces into matching leftover
        // offcuts first, then re-optimizes the remainder into new sticks. Stored
        // separately so the customer quote (which reads `results`) stays identical.
        const offcuts = ((typeof window !== 'undefined' && window.profilePartials) ? window.profilePartials : [])
            .filter(p => p.series === materialSeries && p.component === materialName && p.length > 0 && p.qty > 0);
        if (offcuts.length) {
            const { leftoverPlans, remaining } = packIntoProfilePartials(pieces, offcuts, kerf);
            if (leftoverPlans.length) {
                const newPlans = remaining.length ? optimizeMaterialSmart(remaining, effectiveStockInfo, kerf) : [];
                profilePartialPlan[displayKey] = {
                    offcutSticks: leftoverPlans,
                    newSticks: newPlans,
                    origStickCount: plans.length,
                    newStickCount: newPlans.length,
                    weightPerInch: weight ? weight / 144 : 0,
                    rate: currentRate
                };
            }
        }
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

    // Auto-select componentSections for materials with only one thickness option
    for (const compoundKey of Object.keys(results)) {
        if (componentSections[compoundKey]) continue; // already pre-selected
        const [seriesName, componentName] = compoundKey.split(' | ');
        if (!seriesName || !componentName) continue;

        // Resolve vendor filter
        let vf = null;
        const vendors = vendorByMaterial[compoundKey];
        if (vendors && vendors.length === 1) vf = vendors[0];

        let options = [];
        if (window.SUPPLIER_REGISTRY) {
            const suppliers = vf ? [[vf, window.SUPPLIER_REGISTRY[vf]]] : Object.entries(window.SUPPLIER_REGISTRY);
            suppliers.forEach(([sName, sd]) => {
                if (sd && sd.sections && sd.sections[seriesName] && sd.sections[seriesName][componentName]) {
                    sd.sections[seriesName][componentName].forEach(sec => {
                        options.push({ supplier: sName, sectionNo: sec.sectionNo, weight: sec.weight, t: sec.t || 'N/A', w: sec.w != null ? sec.w : null });
                    });
                }
            });
            if (options.length === 0 && vf) {
                Object.entries(window.SUPPLIER_REGISTRY).forEach(([sName, sd]) => {
                    if (sd && sd.sections && sd.sections[seriesName] && sd.sections[seriesName][componentName]) {
                        sd.sections[seriesName][componentName].forEach(sec => {
                            options.push({ supplier: sName, sectionNo: sec.sectionNo, weight: sec.weight, t: sec.t || 'N/A', w: sec.w != null ? sec.w : null });
                        });
                    }
                });
            }
        }
        if (options.length === 1) {
            componentSections[compoundKey] = options[0];
        }
    }

    optimizationResults = {
        project: selectedProject,
        results: results,
        componentSections: componentSections,
        vendorByMaterial: vendorByMaterial,
        netResults: netResults,
        sheetResults: sheetResults,
        profilePartialPlan: profilePartialPlan,
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
// v1.53: width-aware. When requiredWidthMM is given, only consider sections whose
// face width `w` matches (±2mm) before taking the lightest — so e.g. Door Middle
// Single at 85mm uses the 83mm/3.5kg section, not the lighter 47mm one. If no
// section matches the width (or width omitted), falls back to all sections.
function getDoorProfileWeight(materialName, supplierData, requiredWidthMM) {
    const doorSections = supplierData && supplierData.sections && supplierData.sections['Door'];
    if (!doorSections || !doorSections[materialName]) return null;
    let secs = doorSections[materialName];
    if (requiredWidthMM > 0) {
        const matched = secs.filter(s => s.w != null && Math.abs(parseFloat(s.w) - requiredWidthMM) <= 3);
        if (matched.length) secs = matched;
    }
    const weights = secs.map(s => parseFloat(s.weight)).filter(w => w > 0);
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
//
// v1.35: Smarter candidate set:
//   - Door Top (matches topWidth)
//   - Door Bottom (matches if topWidth ≈ 114.5)
//   - Door Middle Single (matches if middleWidth == topWidth)
// Filter by matching width first, then pick cheapest in kg.
function selectTopRailProfile(win, supplierData, handleVW, hingeVW) {
    const topWidthMM    = win.topWidth    || 47.5;
    const bottomWidthMM = win.bottomWidth || 114.5;
    const middleWidthMM = win.middleWidth || 47.5;
    const L        = win.leaves || 1;
    const F        = win.frame  || 0;
    const stileLen = win.height - (F * (40/25.4));
    const railLen  = (win.width  - (F * (80/25.4))) / L - handleVW - hingeVW;

    if (railLen <= 0 || stileLen <= 0) return 'Door Top';

    const doorStock = (supplierData && supplierData.stock && supplierData.stock['Door']) || [];

    // Build candidates that MATCH the topWidth
    const candidates = [];

    // Door Top — always considered (its width is topWidthMM by definition)
    const topStock = doorStock.filter(s => s.material === 'Door Top');
    const wTop     = getDoorProfileWeight('Door Top', supplierData, topWidthMM);
    if (topStock.length && wTop) {
        const kg = estimatePiecesKg([{ length: railLen, qty: L }], topStock, wTop);
        candidates.push({ profile: 'Door Top', kg, mergedKg: null });
    }

    // Door Bottom — only if width matches (~114.5mm) AND bottom rail also uses Door Bottom
    if (Math.abs(topWidthMM - 114.5) < 1 && Math.abs(topWidthMM - bottomWidthMM) < 1) {
        const bottomStock = doorStock.filter(s => s.material === 'Door Bottom');
        const wBottom     = getDoorProfileWeight('Door Bottom', supplierData, bottomWidthMM);
        if (bottomStock.length && wBottom) {
            // Merged: top + bottom + hinge stile all from Door Bottom stock
            const mergedKg = estimatePiecesKg([{ length: railLen, qty: L * 2 }, { length: stileLen, qty: L }], bottomStock, wBottom);
            // Separate: just charge top rail's portion
            const kg = estimatePiecesKg([{ length: railLen, qty: L }], bottomStock, wBottom);
            candidates.push({ profile: 'Door Bottom', kg, mergedKg });
        }
    }

    // Door Middle Single (DMS) — if middleWidth matches topWidth
    if (Math.abs(middleWidthMM - topWidthMM) < 0.5) {
        const dmsStock = doorStock.filter(s => s.material === 'Door Middle Single');
        const wDms     = getDoorProfileWeight('Door Middle Single', supplierData, topWidthMM);
        if (dmsStock.length && wDms) {
            const kg = estimatePiecesKg([{ length: railLen, qty: L }], dmsStock, wDms);
            candidates.push({ profile: 'Door Middle Single', kg, mergedKg: null });
        }
    }

    if (candidates.length === 0) return 'Door Top';

    // If any candidate offers a merged-kg saving (currently only Door Bottom)
    // that beats all separate-kg options, prefer it.
    const sepKgSum = candidates.reduce((s, c) => Math.min(s, c.kg), Infinity);
    const mergedCand = candidates.find(c => c.mergedKg != null);
    if (mergedCand && mergedCand.mergedKg < sepKgSum) {
        console.log(`%c🔄 Top Rail: ${mergedCand.profile} (merged ${mergedCand.mergedKg.toFixed(2)} kg < sep ${sepKgSum.toFixed(2)})`, 'background:#6610f2;color:white;padding:2px 6px;');
        return mergedCand.profile;
    }

    // Otherwise pick cheapest by separate kg
    candidates.sort((a, b) => a.kg - b.kg);
    const winner = candidates[0];
    console.log(`%c🔄 Top Rail: ${winner.profile} (${winner.kg.toFixed(2)} kg, candidates: ${candidates.map(c => c.profile + '/' + c.kg.toFixed(1)).join(', ')})`, 'background:#6610f2;color:white;padding:2px 6px;');
    return winner.profile;
}
// ─────────────────────────────────────────────────────────────────────────────

// v1.34: Single source of truth for door stile widths.
// Used by cutting plan, quotation cost, spec sheets, exports — everything
// that needs to know "how wide is the handle stile" and "how wide is the
// hinge stile" for THIS door. Returns inches.
//
// If generateDoorProfileFormulas has already run (and cached _handleVW/
// _hingeVW on the win object), uses the cache. Otherwise computes inline
// using the same rules as that function.
function computeDoorStileWidths(win, supplierData) {
    if (!win) return { handleVW: 47.5/25.4, hingeVW: 47.5/25.4 };

    // Use cached values if generateDoorProfileFormulas already ran for this win
    if (win._handleVW != null && win._hingeVW != null) {
        return { handleVW: win._handleVW, hingeVW: win._hingeVW };
    }

    const HANDLE_COMP = {
        'Door Vertical':      'Door Vertical',
        'Door Tips Vertical': 'Door Tips Vertical',
        'Door Middle Single': 'Door Middle Single'
    };
    const handleComp = HANDLE_COMP[win.handleProfile] || 'Door Vertical';

    // Handle stile width (computed first since Floor Spring "same as handle" needs it)
    // v1.38: DMS now has its own handle width — prefer handleWidth, fall back to middleWidth.
    let handleWidthMM;
    if      (handleComp === 'Door Tips Vertical')  handleWidthMM = 47.5;
    else if (handleComp === 'Door Middle Single')  handleWidthMM = win.handleWidth || win.middleWidth || 47.5;
    else                                           handleWidthMM = win.handleWidth || win.verticalWidth || 47.5;

    // v1.35: Hinge stile selection
    // - Hinge mechanism: user picks `hingeWidth` (47.5 / 85 / 114.5). Code maps width → profile:
    //     47.5 or 85 → Door Top (only profile besides Door Bottom that exists at these widths)
    //     114.5 → Door Bottom
    //   Door Vertical NOT allowed for Hinge mechanism (per business rule).
    // - Floor Spring: user picks profile via `floorSpringHingeProfile`. Door Vertical allowed.
    let hingeComp, hingeWidthMM;
    if ((win.closingMechanism || 'Hinge') === 'Hinge') {
        const userHingeW = parseFloat(win.hingeWidth);
        // Default: preferred Door Bottom (114.5mm) if not set
        const w = (userHingeW > 0) ? userHingeW : 114.5;
        if (w >= 110) {
            hingeComp = 'Door Bottom';
            const dbSections = supplierData && supplierData.sections &&
                               supplierData.sections['Door'] &&
                               supplierData.sections['Door']['Door Bottom'];
            hingeWidthMM = (dbSections && dbSections[0] && dbSections[0].w) || 114.5;
        } else {
            hingeComp = 'Door Top';
            hingeWidthMM = w;
        }
    } else {
        // Floor Spring — user picks profile; "" = same as handle
        hingeComp = HANDLE_COMP[win.floorSpringHingeProfile] || handleComp;
        if (hingeComp === 'Door Tips Vertical')      hingeWidthMM = 47.5;
        else if (hingeComp === 'Door Middle Single') hingeWidthMM = win.middleWidth || 47.5;
        else /* Door Vertical */                     hingeWidthMM = win.handleWidth || win.verticalWidth || 47.5;
    }

    return {
        handleVW: handleWidthMM / 25.4,
        hingeVW:  hingeWidthMM  / 25.4
    };
}

// v1.53: Resolve the face-width(s) in mm that each door component is used at for
// THIS door. Mirrors the width logic in generateDoorProfileFormulas so the section
// picker modal can filter to applicable widths and weight lookups stay consistent.
// Returns { '<component>': [w1, w2, ...] }. Components a door doesn't use are absent.
function computeDoorComponentWidths(win, supplierData) {
    const map = {};
    const add = (comp, wmm) => {
        if (!comp || !(wmm > 0)) return;
        if (!map[comp]) map[comp] = new Set();
        map[comp].add(Math.round(wmm * 10) / 10);
    };

    const HANDLE_COMP = {
        'Door Vertical':      'Door Vertical',
        'Door Tips Vertical': 'Door Tips Vertical',
        'Door Middle Single': 'Door Middle Single'
    };
    const handleComp = HANDLE_COMP[win.handleProfile] || 'Door Vertical';

    // Handle stile width
    let handleWidthMM;
    if      (handleComp === 'Door Tips Vertical')  handleWidthMM = 47.5;
    else if (handleComp === 'Door Middle Single')  handleWidthMM = win.handleWidth || win.middleWidth || 47.5;
    else                                           handleWidthMM = win.handleWidth || win.verticalWidth || 47.5;
    add(handleComp, handleWidthMM);

    // Hinge stile
    let hingeComp, hingeWidthMM;
    if ((win.closingMechanism || 'Hinge') === 'Hinge') {
        const userHingeW = parseFloat(win.hingeWidth);
        const w = (userHingeW > 0) ? userHingeW : 114.5;
        if (w >= 110) {
            hingeComp = 'Door Bottom';
            const dbSections = supplierData && supplierData.sections &&
                               supplierData.sections['Door'] && supplierData.sections['Door']['Door Bottom'];
            hingeWidthMM = (dbSections && dbSections[0] && dbSections[0].w) || 114.5;
        } else {
            hingeComp = 'Door Top';
            hingeWidthMM = w;
        }
    } else {
        hingeComp = HANDLE_COMP[win.floorSpringHingeProfile] || handleComp;
        if (hingeComp === 'Door Tips Vertical')      hingeWidthMM = 47.5;
        else if (hingeComp === 'Door Middle Single') hingeWidthMM = win.middleWidth || 47.5;
        else                                          hingeWidthMM = win.handleWidth || win.verticalWidth || 47.5;
    }
    add(hingeComp, hingeWidthMM);

    // Top rail — same auto-selection used by the cutting plan
    const topRailComp = selectTopRailProfile(win, supplierData, handleWidthMM / 25.4, hingeWidthMM / 25.4);
    add(topRailComp, win.topWidth || 47.5);

    // Bottom rail (always Door Bottom), Middle rail (always Door Middle Double)
    add('Door Bottom', win.bottomWidth || 114.5);
    add('Door Middle Double', win.middleWidth || 47.5);

    // Frame (Door Leg Partition = 40mm) when framed
    if (win.frame) add('Door Leg Partition', 40);

    const out = {};
    Object.keys(map).forEach(k => { out[k] = [...map[k]]; });
    return out;
}

// v1.54: Recommended door thickness PLAN — assigns each door profile a target gauge
// by structural ROLE, scaled by door SIZE, then snaps to the nearest available
// catalogue section at that profile's width.
// Returns { '<component>': { t, sectionNo, weight, w, role, reason, supplier } }.
//
// Philosophy (hinged door): keep mass low far from the pivot to cut hinge load.
//   - Hinge/pivot stile = thickest (screw pull-out + bending strength)
//   - Bottom & middle rails = mid gauge (impact + sag resistance)
//   - Handle/lock stile = moderate (carries lock/handle hardware — NOT the lightest)
//   - Top rail = lightest (far from pivot, low load)
//   - Glazing clip = THICKEST available (it dents when pressed during fitting)
// Floor-spring doors: shift the heavy gauge to the bottom rail + pivot stile.
function getDoorThicknessPlan(win, supplierData) {
    if (!win || !supplierData || !supplierData.sections || !supplierData.sections['Door']) return {};
    const doorSecs = supplierData.sections['Door'];

    // ── Size band from per-leaf width × height (+ heavy-glass bump) ──
    const leaves   = win.leaves || 1;
    const perLeafW = (win.width || 0) / leaves;
    const height   = win.height || 0;
    let band = 'medium';
    if (perLeafW <= 30 && height <= 84) band = 'small';
    else if (perLeafW > 36 || height > 96) band = 'large';
    const heavyGlass = (win.glassUnit === 'DGU') || (parseFloat(win.glassThickness) >= 8) ||
        (win.upperPartition && win.upperPartition.glassType === 'DGU');
    if (heavyGlass) band = (band === 'small') ? 'medium' : 'large';

    // ── Target gauge (mm) by role × band ──
    // v1.56: bottom & middle rails lightened — the 12mm threaded rod (top+bottom rails)
    // + 38×38×3 tie-angles now carry joint integrity & anti-sag, so rail gauge is no
    // longer the sag-critical factor. Hinge stile stays thick (hinge load / screw
    // pull-out), top rail stays light, handle moderate (hardware load).
    const MATRIX = {
        small:  { hinge: 1.8, bottom: 1.2, middle: 1.2, handle: 1.4, top: 1.1, frame: 1.3 },
        medium: { hinge: 2.0, bottom: 1.2, middle: 1.3, handle: 1.5, top: 1.2, frame: 1.4 },
        large:  { hinge: 2.0, bottom: 1.3, middle: 1.3, handle: 1.6, top: 1.4, frame: 1.5 }
    };
    const tgt = MATRIX[band];
    const reasonBand = `${band} door (${Math.round(perLeafW)}"×${Math.round(height)}"${heavyGlass ? ', heavy glass' : ''})`;
    const isFloorSpring = (win.closingMechanism || 'Hinge') !== 'Hinge';

    // ── Resolve which component fills each role + its width ──
    const widths = computeDoorComponentWidths(win, supplierData);
    const HANDLE_COMP = { 'Door Vertical':'Door Vertical', 'Door Tips Vertical':'Door Tips Vertical', 'Door Middle Single':'Door Middle Single' };
    const handleComp = HANDLE_COMP[win.handleProfile] || 'Door Vertical';
    let hingeComp;
    if (!isFloorSpring) {
        const hw = parseFloat(win.hingeWidth); const w = (hw > 0) ? hw : 114.5;
        hingeComp = (w >= 110) ? 'Door Bottom' : 'Door Top';
    } else {
        hingeComp = HANDLE_COMP[win.floorSpringHingeProfile] || handleComp;
    }
    const sw = computeDoorStileWidths(win, supplierData);
    const topRailComp = selectTopRailProfile(win, supplierData, sw.handleVW, sw.hingeVW);

    // role → component (a component may collect several roles → take the max target)
    const roleByComp = {};
    const addRole = (comp, role) => { if (!comp) return; (roleByComp[comp] = roleByComp[comp] || new Set()).add(role); };
    addRole(handleComp, 'handle');
    addRole(hingeComp, isFloorSpring ? 'bottom' : 'hinge');
    addRole(topRailComp, 'top');
    addRole('Door Bottom', isFloorSpring ? 'hinge' : 'bottom');  // FS: bottom rail bears load
    addRole('Door Middle Double', 'middle');
    if (win.frame) addRole('Door Leg Partition', 'frame');

    // Snap a target gauge to the nearest available section at the component's width.
    const snap = (component, targetT, maxGauge) => {
        let secs = doorSecs[component] || [];
        const reqW = (widths[component] && widths[component][0]) || null;
        if (reqW != null) {
            const m = secs.filter(s => s.w != null && Math.abs(parseFloat(s.w) - reqW) <= 3);
            if (m.length) secs = m;
        }
        secs = secs.filter(s => parseFloat(s.weight) > 0);
        if (!secs.length) return null;
        let chosen;
        if (maxGauge) {
            chosen = secs.reduce((a, b) => parseFloat(b.t) > parseFloat(a.t) ? b : a);
        } else {
            // Asymmetric snap: accept a section up to UNDER_TOL below target before
            // rounding up — avoids a big jump (e.g. 1.5→3.0) when target is 1.6, yet
            // strength-critical targets with no near option still round up.
            const UNDER_TOL = 0.15;
            const sorted = [...secs].sort((a, b) => parseFloat(a.t) - parseFloat(b.t));
            const up = sorted.find(s => parseFloat(s.t) >= targetT - 0.001);
            const downArr = sorted.filter(s => parseFloat(s.t) < targetT);
            const down = downArr.length ? downArr[downArr.length - 1] : null;
            if (down && (targetT - parseFloat(down.t)) <= UNDER_TOL) chosen = down;
            else if (up) chosen = up;
            else chosen = down || sorted[sorted.length - 1];
        }
        return { t: parseFloat(chosen.t), sectionNo: chosen.sectionNo,
                 weight: parseFloat(chosen.weight), w: chosen.w != null ? chosen.w : reqW };
    };

    const plan = {};
    Object.keys(roleByComp).forEach(comp => {
        const roles = [...roleByComp[comp]];
        const targetT = Math.max(...roles.map(r => tgt[r] || 0));
        const primaryRole = roles.sort((a, b) => (tgt[b] || 0) - (tgt[a] || 0))[0];
        const snapped = snap(comp, targetT, false);
        if (snapped) plan[comp] = { ...snapped, role: primaryRole, reason: `${primaryRole} • ${reasonBand}`, supplier: win.vendor };
    });

    // Glazing clip — thickest available (dent resistance), no size scaling
    if (doorSecs['Door Glazing Clip']) {
        const clip = snap('Door Glazing Clip', 0, true);
        if (clip) plan['Door Glazing Clip'] = { ...clip, role: 'clip', reason: 'clip • thickest (dent-resistant for press fitting)', supplier: win.vendor };
    }

    return plan;
}

// Apply the recommended plan into win.componentThicknesses. By default only fills
// components that are missing or were previously auto-filled (_auto), so manual
// edits survive. Pass force=true to overwrite everything. Returns count changed.
function applyDoorThicknessPlan(win, force) {
    const sd = (typeof window !== 'undefined' ? window.SUPPLIER_REGISTRY : SUPPLIER_REGISTRY || {})[win.vendor];
    const plan = getDoorThicknessPlan(win, sd);
    if (!win.componentThicknesses) win.componentThicknesses = {};
    let n = 0;
    Object.entries(plan).forEach(([comp, rec]) => {
        const cur = win.componentThicknesses[comp];
        if (force || !cur || cur._auto) {
            win.componentThicknesses[comp] = {
                t: rec.t, supplier: rec.supplier || win.vendor,
                sectionNo: rec.sectionNo, weight: rec.weight,
                profileWidth: rec.w, _auto: true
            };
            n++;
        }
    });

    // v1.55: Door Tie Angle has a single fixed spec (38×38×3) — seed it so it's
    // weighed in both the optimizer and the quotation, but it is NOT a gate row.
    const tie = (sd && sd.sections && sd.sections['Door'] && sd.sections['Door']['Door Tie Angle'] || [])[0];
    if (tie) {
        const cur = win.componentThicknesses['Door Tie Angle'];
        if (force || !cur || cur._auto) {
            win.componentThicknesses['Door Tie Angle'] = {
                t: tie.t, supplier: win.vendor, sectionNo: tie.sectionNo,
                weight: tie.weight, profileWidth: tie.w, _auto: true
            };
            n++;
        }
    }
    return n;
}

// Generate door profile formulas dynamically based on window properties.
// Replaces the static formula array for Door series.
function generateDoorProfileFormulas(win, supplierData) {
    const HANDLE_COMP = {
        'Door Vertical':      'Door Vertical',
        'Door Tips Vertical': 'Door Tips Vertical',
        'Door Middle Single':  'Door Middle Single'
    };

    const handleComp = HANDLE_COMP[win.handleProfile] || 'Door Vertical';

    // v1.35: delegate to shared helper for consistent stile widths everywhere
    // (cutting plan, quotation cost, spec sheets all agree).
    // The helper handles new Hinge Width selector AND Floor Spring profile choice.
    // We re-do the hinge profile determination here to know `hingeComp` for the formula
    // table (which needs a component name, not just a width).
    let hingeComp;
    if ((win.closingMechanism || 'Hinge') === 'Hinge') {
        const userHingeW = parseFloat(win.hingeWidth);
        const w = (userHingeW > 0) ? userHingeW : 114.5;
        hingeComp = (w >= 110) ? 'Door Bottom' : 'Door Top';
    } else {
        hingeComp = HANDLE_COMP[win.floorSpringHingeProfile] || handleComp;
    }

    // Handle stile width (still needed for top rail kg comparison)
    // v1.38: DMS now has its own handle width (prefer handleWidth over middleWidth)
    let handleWidthMM;
    if      (handleComp === 'Door Tips Vertical')  handleWidthMM = 47.5;
    else if (handleComp === 'Door Middle Single')  handleWidthMM = win.handleWidth || win.middleWidth || 47.5;
    else                                           handleWidthMM = win.handleWidth || win.verticalWidth || 47.5;

    // Hinge stile width
    let hingeWidthMM;
    if (hingeComp === 'Door Bottom') {
        const dbSections = supplierData && supplierData.sections &&
                           supplierData.sections['Door'] &&
                           supplierData.sections['Door']['Door Bottom'];
        hingeWidthMM = (dbSections && dbSections[0] && dbSections[0].w) || 114.5;
    } else if (hingeComp === 'Door Top') {
        // For Hinge mech: width = user's hingeWidth selection; for Floor Spring: win.topWidth
        if ((win.closingMechanism || 'Hinge') === 'Hinge') {
            hingeWidthMM = parseFloat(win.hingeWidth) || 47.5;
        } else {
            hingeWidthMM = win.topWidth || 47.5;
        }
    } else if (hingeComp === 'Door Tips Vertical') {
        hingeWidthMM = 47.5;
    } else if (hingeComp === 'Door Middle Single') {
        hingeWidthMM = win.middleWidth || 47.5;
    } else {
        // Door Vertical (Floor Spring only) — matches handle width
        hingeWidthMM = win.handleWidth || win.verticalWidth || 47.5;
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
        // v1.35 FIX: previously used F*(20/25.4) — half of the 40mm top frame, which made
        // upper too long and lower too short by 20mm each. 3-side frame has NO bottom frame,
        // so vertical lower clip never gets a frame deduction.
        { component: 'Door Glazing Clip',  qty: '4*L', length: 'H - F*(40/25.4) - TW - MW/2 - MRPI',        desc: 'Glazing Clip Vertical Top' },
        { component: 'Door Glazing Clip',  qty: '4*L', length: 'MRPI - BW - MW/2',                          desc: 'Glazing Clip Vertical Bottom' },
        { component: 'Door Glazing Clip',  qty: '8*L', length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Glazing Clip Horizontal' },
        // v1.55: Tie angle 38×38×3 — 8 short cleats (~40mm) per leaf screwed inside the
        // rails to tie the profiles together and resist sag. Weight-based at Door rate.
        { component: 'Door Tie Angle',     qty: '8*L', length: '(40/25.4)',                                  desc: 'Tie Angle (joint cleat)' }
        // v1.48: Door Rod 12mm removed from the profile cut plan — it is now costed as
        // hardware (per nos @ Rs.115), not aluminium by weight. See generateDoorHardware().
    ];
}

// ============================================================================
// PIECE CALCULATION FROM FORMULAS
// ============================================================================

// Safe evaluation helper to prevent crashes from bad formulas
function safeEval(formula, context, defaultValue = 0) {
    try {
        const keys = Object.keys(context);
        const values = keys.map(k => context[k]);
        const fn = new Function(...keys, `return ${formula}`);
        return fn(...values);
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

        // v1.31: 27mm Domal with optional Mosquito Middle Bar
        // Adds one 1" Middle profile per mosquito shutter, length = shutterW - 3.5"
        if (seriesName === '27mm Domal' && MS > 0 && win.mosquitoMiddle) {
            formulas = [...formulas, {
                component: '1" Middle',
                qty: 'MS',
                length: '(W - 3 + 2.5*(S-1))/S - 3.5',
                desc: 'Mosquito Middle Bar',
                series: '1"'  // route to 1" series stock
            }];
            console.log(`%c🦟 Mosquito Middle enabled for ${id} | MS=${MS}`, 'background:#0288d1;color:white;padding:2px 6px;');
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
            SOP: win.shutterOnlyProfile || 0,  // 0=normal, 1=Handle, 2=Middle
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

// v1.65: pack the largest-fitting pieces into leftover offcuts first (FFD, longest
// offcut first). Returns { leftoverPlans: [cost-0 sticks cut from offcuts], remaining }.
function packIntoProfilePartials(pieces, partials, kerf) {
    const leftoverPlans = [];
    let remaining = [...pieces];
    const bins = [];
    partials.forEach(p => { for (let n = 0; n < (p.qty || 1); n++) bins.push({ length: p.length, label: p.label || '' }); });
    bins.sort((a, b) => b.length - a.length);
    bins.forEach(bin => {
        if (!remaining.length) return;
        const pattern = findBestPattern(remaining, bin.length, kerf);
        if (!pattern.pieces.length) return;
        pattern.pieces.forEach(p => { const i = remaining.indexOf(p); if (i !== -1) remaining.splice(i, 1); });
        leftoverPlans.push({
            stock: bin.length + '" (offcut)',
            stockLength: bin.length,
            pieces: pattern.pieces,
            used: pattern.used,
            waste: pattern.waste,
            cost: 0,
            efficiency: ((pattern.used / bin.length) * 100).toFixed(1),
            leftover: true,
            label: bin.label
        });
    });
    return { leftoverPlans, remaining };
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

        // v1.31: If mosquito middle bar is enabled (Domal only), the net is split
        // into 2 pieces per shutter with different dimensions.
        let netW, netH, qtyPerShutter, midNote;
        if (series === '27mm Domal' && win.mosquitoMiddle) {
            // Width: (shutterW - 3.5") + 1.5" = shutterW - 2"  (same as without middle)
            // Height: ((shutterH - 1" - 3.5") / 2) + 1.5"
            // Qty:    2 nos per mosquito shutter
            netW = (shutterW - 3.5) + 1.5;
            netH = ((shutterH - 1 - 3.5) / 2) + 1.5;
            qtyPerShutter = 2;
            midNote = '  | with 1" middle bar (2 pieces/shutter)';
        } else {
            netW = shutterW - deductionCfg.deductW;
            netH = shutterH - deductionCfg.deductH;
            qtyPerShutter = 1;
            midNote = '';
        }

        netW = Math.max(0, netW);
        netH = Math.max(0, netH);

        if (netW <= 0 || netH <= 0) {
            console.warn(`⚠️ Net piece size ≤ 0 for window ${win.configId}: netW=${netW.toFixed(2)}" netH=${netH.toFixed(2)}"`);
            return;
        }

        console.log(
            `%c🕸️ Net ${win.configId} | Series: ${series} | MS=${MS} | ` +
            `shutterH=${shutterH.toFixed(2)}" shutterW=${shutterW.toFixed(2)}" | ` +
            `net ${netW.toFixed(2)}"×${netH.toFixed(2)}"${midNote}`,
            'background: #8e44ad; color: white; padding: 2px 6px;'
        );

        pieces.push({
            w: Math.round(netW * 100) / 100,
            h: Math.round(netH * 100) / 100,
            qty: MS * qtyPerShutter,
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
        // v1.34: use centralized stile width helper (fixes the bottomWidth fallback bug)
        const stiles = computeDoorStileWidths(win, null);
        const HVW = stiles.handleVW;
        const GVW = stiles.hingeVW;

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

            const baseQty = qty * L;
            // ACP double-side coating: customer wants both faces coated, but ACP sheets
            // come only single-side coated commercially → need 2 sheets per panel
            // (one face for front, one face for back, plain sides glued together inside).
            // Emit as two distinct rows so cutting plan shows W01(zone·front) + W01(zone·back).
            const isAcpDouble = part.material === 'ACP' && part.acpFacing === 'double';
            if (isAcpDouble) {
                panels.push({
                    label: `${win.configId} (${zone} · front)`,
                    material: part.material,
                    thickness: String(part.thickness || '0'),
                    w: panelW, h: zoneH,
                    qty: baseQty,
                });
                panels.push({
                    label: `${win.configId} (${zone} · back)`,
                    material: part.material,
                    thickness: String(part.thickness || '0'),
                    w: panelW, h: zoneH,
                    qty: baseQty,
                });
            } else {
                panels.push({
                    label: `${win.configId} (${zone})`,
                    material: part.material,
                    thickness: String(part.thickness || '0'),
                    w: panelW, h: zoneH,
                    qty: baseQty,
                });
            }
        };
        addPanel('upper', upperH);
        addPanel('lower', lowerH);
    });
    return panels;
}

// Sort strategies tried for each combination (FFDH benefits from largest-first)
const _SHEET_SORTS = [
    arr => [...arr].sort((a,b) => (b.w*b.h) - (a.w*a.h)),
    arr => [...arr].sort((a,b) => Math.max(b.w,b.h) - Math.max(a.w,a.h)),
    arr => [...arr].sort((a,b) => b.h - a.h),
    arr => [...arr].sort((a,b) => b.w - a.w),
];

/**
 * Pack pieces across an ordered list of pre-allocated bins (each can be a
 * different size — e.g. one 12'×4' + one 8'×4'). Goes through bins in order;
 * for each bin, runs FFDH-best-fit on remaining pieces. Returns bins (with
 * shelves) and leftover unplaced pieces.
 *
 * @param {Array} items   pre-sorted pieces
 * @param {Array} binSpecs [{kind, width, length, label}] — partials first, then new sheets
 */
function _packAcrossBins(items, binSpecs) {
    let pending = [...items];
    const usedBins = [];
    for (const spec of binSpecs) {
        if (pending.length === 0) break;
        const r = _packBin(pending, spec.width, spec.length);
        usedBins.push({
            kind: spec.kind,
            label: spec.label,
            width: spec.width,
            capacityLength: spec.length,
            usedLength: r.usedLength,
            shelves: r.shelves
        });
        pending = r.remaining;
    }
    return { bins: usedBins, unpacked: pending };
}

/**
 * EXHAUSTIVE multi-size sheet packing (v1.23).
 * Enumerates every combination (n_0, n_1, ..., n_k) of new-sheet counts per
 * size in the catalog, packs pieces into [partials ++ newSheets], and picks
 * the cheapest feasible combination. Tie-breaks by least waste area, then
 * fewer total sheets.
 *
 * Safety cap: COMBO_LIMIT iterations. Above that, falls back to single-size
 * greedy (the original packSheetGroup logic).
 *
 * @param {Array}   rawPanels      [{w, h, qty, label}]
 * @param {Array}   sheetSizes     SHEET_CATALOG entry  [{name, w, h}, ...]
 * @param {Array}   partialSheets  user's leftover stock for this material
 * @param {number}  ratePerSqft    cost rate per sqft
 */
function packSheetGroup(rawPanels, sheetSizes, partialSheets, ratePerSqft) {
    if (!rawPanels.length || !sheetSizes.length) return null;

    // Expand qty → individual pieces
    const allPieces = [];
    rawPanels.forEach(p => {
        for (let i = 0; i < p.qty; i++)
            allPieces.push({ w: p.w, h: p.h, label: p.label, origW: p.w, origH: p.h });
    });

    const piecesArea = allPieces.reduce((s,p) => s + p.w*p.h, 0);

    // Pre-build the partials list (used as fixed prefix in every combo)
    const partials = (partialSheets || [])
        .filter(ps => ps.w >= 1 && ps.h >= 1)
        .flatMap((ps, i) => {
            const qty = Math.max(1, ps.qty || 1);
            return Array.from({ length: qty }, (_, q) => ({
                kind: 'store', width: ps.w, length: ps.h,
                label: ps.label ? `${ps.label} (${ps.w}"×${ps.h}")` : `Stock sheet #${i+1} (${ps.w}"×${ps.h}")`
            }));
        })
        .sort((a, b) => a.length - b.length); // smallest-first

    // Quick estimate of how many sheets of each size could possibly be needed.
    // Upper bound: every remaining piece could need its own sheet → P sheets total.
    // Practical bound: enough capacity to hold the total pieces area.
    // We pad +1 for safety so the search space includes "one extra" sheets.
    const maxPerSize = sheetSizes.map(sz => {
        const sheetArea = sz.w * sz.h;
        const partialsArea = partials.reduce((s, p) => s + p.width * p.length, 0);
        const remainingArea = Math.max(0, piecesArea - partialsArea);
        return Math.max(1, Math.ceil(remainingArea / sheetArea) + 1);
    });

    // Combination cap — if the search space is too large, fall back to greedy
    const totalCombos = maxPerSize.reduce((p, n) => p * (n + 1), 1);
    const COMBO_LIMIT = 10000;
    if (totalCombos > COMBO_LIMIT) {
        return _packSheetGroupGreedy(allPieces, sheetSizes, partials, ratePerSqft, piecesArea);
    }

    let best = null;
    const counts = new Array(sheetSizes.length).fill(0);

    function tryCombo() {
        // Build bin list: partials first (smallest first), then new sheets (LARGEST first
        // so big pieces get the big sheets — critical for mixed packing)
        const newBins = [];
        sheetSizes.forEach((sz, i) => {
            for (let k = 0; k < counts[i]; k++) {
                newBins.push({
                    kind: 'new', width: sz.w, length: sz.h,
                    label: `New ${sz.name} #${k+1}`
                });
            }
        });
        newBins.sort((a, b) => b.length - a.length); // largest first
        const binSpecs = [...partials, ...newBins];

        // Compute this combo's new-sheet cost
        let comboCost = 0;
        sheetSizes.forEach((sz, i) => {
            comboCost += counts[i] * (ratePerSqft * sz.w * sz.h / 144);
        });

        // Pruning: if even the cheapest feasible cost so far is beaten by this combo,
        // and this combo's cost ALREADY ≥ best, skip
        if (best && comboCost > best.cost) return;

        // Try multiple sort orders, pick whichever lets ALL pieces fit
        let feasible = null;
        for (const sort of _SHEET_SORTS) {
            const sorted = sort(allPieces);
            const result = _packAcrossBins(sorted, binSpecs);
            if (result.unpacked.length === 0) { feasible = result; break; }
        }
        if (!feasible) return;

        // Strip empty new bins (sheets we didn't actually use) — saves ordering noise
        const usedBins = feasible.bins.filter(b => b.shelves.length > 0);
        const usedNewBins = usedBins.filter(b => b.kind === 'new');

        // Recompute cost from ACTUAL new sheets used (in case some were skipped)
        const actualCost = usedNewBins.reduce((s, b) => s + (ratePerSqft * b.width * b.capacityLength / 144), 0);
        const consumedArea = usedBins.reduce((s, b) => s + b.width * b.usedLength, 0);
        const wasteArea    = Math.max(0, consumedArea - piecesArea);

        const better = !best
            || actualCost < best.cost
            || (actualCost === best.cost && wasteArea < best.wasteArea)
            || (actualCost === best.cost && wasteArea === best.wasteArea && usedBins.length < best.totalBins);

        if (better) {
            // Rebuild bin labels to use sequential numbering within each size group
            const newCountPerSize = {};
            usedNewBins.forEach(b => {
                const key = `${b.width}x${b.capacityLength}`;
                newCountPerSize[key] = (newCountPerSize[key] || 0) + 1;
                b.label = `New ${b.width}"×${b.capacityLength}" #${newCountPerSize[key]}`;
            });
            // Pick the "primary" sheet size — the most-used new sheet size, for display
            let primarySize = sheetSizes[0];
            let primaryMax = -1;
            sheetSizes.forEach((sz, i) => {
                const cnt = usedNewBins.filter(b => b.width === sz.w && b.capacityLength === sz.h).length;
                if (cnt > primaryMax) { primaryMax = cnt; primarySize = sz; }
            });
            // Build per-size breakdown for display
            const newSheetsBreakdown = {};
            sheetSizes.forEach(sz => {
                const cnt = usedNewBins.filter(b => b.width === sz.w && b.capacityLength === sz.h).length;
                if (cnt > 0) newSheetsBreakdown[sz.name] = cnt;
            });
            best = {
                sheetW: primarySize.w, sheetH: primarySize.h, sheetName: primarySize.name,
                bins: usedBins,
                piecesArea, consumedArea, wasteArea,
                efficiency: consumedArea > 0 ? Math.round(piecesArea / consumedArea * 100) : 0,
                newSheetsUsed: usedNewBins.length,
                newSheetsBreakdown,                    // {"8'×4'": 2, "12'×4'": 1}
                storeSheetsUsed: usedBins.filter(b => b.kind === 'store').length,
                cost: actualCost,
                costPerSheet: ratePerSqft * primarySize.w * primarySize.h / 144,
                totalBins: usedBins.length,
                leftover: usedBins.filter(b => b.kind === 'new' && (b.capacityLength - b.usedLength) > 1)
                    .map(b => ({ kind:'new', width: b.width, remainingAfter: b.capacityLength - b.usedLength, label: b.label })),
            };
        }
    }

    // Recursive enumeration of all combinations
    function enumerate(sizeIdx) {
        if (sizeIdx === sheetSizes.length) { tryCombo(); return; }
        for (let n = 0; n <= maxPerSize[sizeIdx]; n++) {
            counts[sizeIdx] = n;
            enumerate(sizeIdx + 1);
        }
    }
    enumerate(0);

    return best;
}

/**
 * Fallback for very large search spaces — single-size greedy (original behavior).
 * Tries each sheet size independently and picks the best single-size plan.
 */
function _packSheetGroupGreedy(allPieces, sheetSizes, partials, ratePerSqft, piecesArea) {
    let best = null;
    for (const sz of sheetSizes) {
        const costPerSheet = ratePerSqft * sz.w * sz.h / 144;
        const newSpec = { name: sz.name, width: sz.w, length: sz.h };
        for (const sort of _SHEET_SORTS) {
            const sorted = sort(allPieces);
            const bins = _packMultiBin(sorted, partials, newSpec);
            if (!bins) continue;
            const consumedArea  = bins.reduce((s,b) => s + b.width * b.usedLength, 0);
            const wasteArea     = Math.max(0, consumedArea - piecesArea);
            const newSheetsUsed = bins.filter(b => b.kind === 'new').length;
            const cost          = newSheetsUsed * costPerSheet;
            const better = !best
                || cost < best.cost
                || (cost === best.cost && wasteArea < best.wasteArea)
                || (cost === best.cost && wasteArea === best.wasteArea && bins.length < best.totalBins);
            if (better) {
                const newSheetsBreakdown = { [sz.name]: newSheetsUsed };
                best = {
                    sheetW: sz.w, sheetH: sz.h, sheetName: sz.name,
                    bins, piecesArea, consumedArea, wasteArea,
                    efficiency: consumedArea > 0 ? Math.round(piecesArea / consumedArea * 100) : 0,
                    newSheetsUsed, newSheetsBreakdown,
                    storeSheetsUsed: bins.filter(b => b.kind === 'store').length,
                    cost, costPerSheet, totalBins: bins.length,
                    leftover: bins.filter(b => b.kind === 'new' && (b.capacityLength - b.usedLength) > 1)
                        .map(b => ({ kind:'new', width: b.width, remainingAfter: b.capacityLength - b.usedLength, label: b.label })),
                };
            }
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
    const warnings = [];
    const availability = (ratesConfig && ratesConfig.sheetAvailability) || {};

    for (const [key, gPanels] of Object.entries(groups)) {
        const mat = gPanels[0].material;
        const thk = gPanels[0].thickness;
        const allSizes = SHEET_CATALOG[mat];
        if (!allSizes || !allSizes.length) continue;

        // v1.26: filter catalog by user's "Sheet Availability" toggles
        const matAv = availability[mat] || {};
        // Default: enabled if not in toggles (preserves behavior when user hasn't visited the panel)
        const sizes = allSizes.filter(sz => matAv[sz.name] !== false);
        if (sizes.length === 0) {
            warnings.push(`⚠️ All ${mat} sheet sizes are disabled in Sheet Availability. ${mat} ${thk}mm panels skipped.`);
            console.warn(`No enabled sheet sizes for ${mat} — skipping group ${key}`);
            continue;
        }

        const rate = (ratesConfig.partitionRates || {})[key] || 0;
        // Partial sheets from UI have no thickness field — match by material only
        // (user enters physical sheet dimensions; they won't mix thicknesses in same partial)
        const gPartials = (partialSheets || []).filter(ps => ps.material === mat);
        const result = packSheetGroup(gPanels, sizes, gPartials, rate);
        if (result) byGroup[key] = { material: mat, thickness: thk + 'mm', ratePerSqft: rate, panels: gPanels, ...result };
    }

    // Surface availability warnings to the user (non-blocking)
    if (warnings.length > 0 && typeof showAlert === 'function') {
        showAlert(warnings.join('\n'), 'warning');
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

    // ── Assign per-bin cost so quotation summary can read b.cost ─────────────
    if (best) {
        best.bins.forEach(b => {
            if (b.kind === 'new') {
                const spec = availableRolls.find(r => r.width === b.width);
                b.cost = spec ? (spec.costPerRoll || 0) : 0;
            } else {
                b.cost = 0;
            }
        });
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
