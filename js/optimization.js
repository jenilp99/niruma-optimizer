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

    optimizationResults = {
        project: selectedProject,
        results: results,
        componentSections: componentSections, // Include pre-selected thicknesses
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
    const pieceLen = win.height - ((win.frame || 0) * 1.575) - 1.634;
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

// Generate door profile formulas dynamically based on window properties.
// Replaces the static formula array for Door series.
function generateDoorProfileFormulas(win, supplierData) {
    const HANDLE_COMP = {
        'Door Vertical':      'Door Vertical',
        'Door Tips Vertical': 'Tips Vertical',
        'Door Middle Single':  'Door Middle Single'
    };

    const handleComp = HANDLE_COMP[win.handleProfile] || 'Door Vertical';

    let hingeComp;
    if ((win.closingMechanism || 'Hinge') === 'Hinge') {
        hingeComp = selectHingeSideProfile(win, supplierData);
    } else {
        // Floor Spring: user-selectable hinge side (default = same as handle side)
        hingeComp = HANDLE_COMP[win.floorSpringHingeProfile] || handleComp;
    }

    return [
        { component: handleComp,           qty: 'L', length: 'H - (F*1.575) - 1.634',         desc: 'Vertical Handle' },
        { component: hingeComp,            qty: 'L', length: 'H - (F*1.575) - 1.634',         desc: 'Vertical Hing' },
        { component: 'Door Top',           qty: 'L', length: '(W - (F*3.15)) / L - 2*VW',     desc: 'Top Rail' },
        { component: 'Door Bottom',        qty: 'L', length: '(W - (F*3.15)) / L - 2*VW',     desc: 'Bottom Rail' },
        { component: 'Door Middle Double', qty: 'L', length: '(W - (F*3.15)) / L - 2*VW',     desc: 'Middle Rail' },
        { component: 'Door Leg Partition', qty: '1*F', length: 'W',                            desc: 'Frame Top' },
        { component: 'Door Leg Partition', qty: '1*F', length: 'H',                            desc: 'Frame Left' },
        { component: 'Door Leg Partition', qty: '1*F', length: 'H',                            desc: 'Frame Right' },
        { component: 'Door Glazing Clip',  qty: '8*L', length: '(H - (F*1.575) - TW - BW - MW) / 2', desc: 'Glazing Clip Vertical' },
        { component: 'Door Glazing Clip',  qty: '8*L', length: '(W - (F*3.15)) / L - 2*VW',  desc: 'Glazing Clip Horizontal' }
    ];
}

// ============================================================================
// PIECE CALCULATION FROM FORMULAS
// ============================================================================

// Safe evaluation helper to prevent crashes from bad formulas
function safeEval(formula, context, defaultValue = 0) {
    try {
        // Create variables from context
        const { W, H, S, MS, T, P, CJ, IT, GT, MT, MIT, F, VW, TW, MW, BW, L } = context;
        // Use a function constructor for slightly better safety than eval()
        const fn = new Function('W', 'H', 'S', 'MS', 'T', 'P', 'CJ', 'IT', 'GT', 'MT', 'MIT', 'F', 'VW', 'TW', 'MW', 'BW', 'L', `return ${formula}`);
        return fn(W, H, S, MS, T, P, CJ, IT, GT, MT, MIT, F, VW, TW, MW, BW, L);
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
            console.log(`%c🚪 Door formulas generated dynamically | Mechanism: ${win.closingMechanism || 'Hinge'} | Handle: ${win.handleProfile || 'Door Vertical'}`, 'background: #6f42c1; color: white; padding: 2px 6px;');
        }

        console.log(`%c📐 Window ${id} | Vendor: ${win.vendor} | Series: ${seriesName} | MS: ${MS} | Formulas: ${formulas.length}`, 'background: #343a40; color: white; padding: 2px 6px; border-radius: 3px;');

        const context = {
            W: win.width,
            H: win.height,
            S: win.shutters,
            MS: MS,
            T: win.tracks,
            F: win.frame || 0, // Frame for doors (1=YES, 0=NO)
            // Profile widths for doors (stored in mm, convert to inches)
            VW: (win.verticalWidth || 47.5) / 25.4,  // Vertical Width (Handle + Hing)
            TW: (win.topWidth || 47.5) / 25.4,       // Top Width
            MW: (win.middleWidth || 47.5) / 25.4,    // Middle Width  
            BW: (win.bottomWidth || 85) / 25.4,      // Bottom Width
            P: (win.width * 2 + win.height * 2),
            CJ: win.cornerJoint || 90,
            IT: win.interlockType || 'slim',
            GT: win.glassUnit || 'SGU',
            MT: win.mosquitoType || 'V-2513',
            MIT: win.mosquitoInterlock || 'V-2516',
            L: win.leaves || 1
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
                // Override component name based on user selection
                let componentName = formula.component;

                // Special case: "Door Middle Single" implies Vertical Hing uses "Door Top"
                if (win.handleProfile === 'Door Middle Single' && formula.desc === 'Vertical Hing') {
                    componentName = 'Door Top';
                }
                // Standard case: Replace "Door Vertical" placeholder with selected handle profile
                else if (win.handleProfile && componentName === 'Door Vertical') {
                    componentName = win.handleProfile;
                }

                if (win.bottomProfile && componentName === 'Door Bottom') {
                    componentName = win.bottomProfile;
                }

                // Top Rail Optimization: Use "Door Middle Single" if that is the handle profile (consolidate material)
                if (componentName === 'Door Top' && win.handleProfile === 'Door Middle Single') {
                    componentName = 'Door Middle Single';
                }

                const targetSeries = formula.series || seriesName;
                addPieces(pieces, targetSeries, componentName, length, id + ' - ' + formula.desc, qty);
            } else {
                console.log('⏭️ Skipped formula (qty or length is 0):', formula.desc, 'qty:', qty, 'length:', length);
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
