// Niruma Aluminum Profile Optimizer - Export & Display Functions

// ============================================================================
// NET CUTTING VISUAL DIAGRAM
// ============================================================================

/**
 * Render a simple SVG grid showing how pieces tile on a roll.
 * seg = one segment from _optimiseSingleSize (single roll usage for k pieces).
 */
function generateNetDiagram(pieceW, pieceH, qty, seg) {
    const rollW = seg.roll.width;
    const cpp   = seg.piecesPerRow;    // pieces across roll width
    const rows  = seg.rowsNeeded;
    const orientation = seg.orientation;

    // Displayed grid dimensions (piece in grid coords: across = acrossSize, along = alongSize)
    let acrossSize, alongSize;
    if (orientation === 'w-across') { acrossSize = pieceW; alongSize = pieceH; }
    else                            { acrossSize = pieceH; alongSize = pieceW; }

    // SVG canvas: show up to 10 rows before truncating (just visual)
    const maxRows = Math.min(rows, 10);
    const svgW  = 700;
    const scaleA = Math.min(svgW / rollW, 8);  // px per inch (across)
    const svgH  = Math.min(maxRows * alongSize * scaleA + 30, 300);
    const scaleL = (svgH - 30) / (maxRows * alongSize); // px per inch (along)
    const scale  = Math.min(scaleA, scaleL);

    const canvasW = rollW  * scale;
    const canvasH = maxRows * alongSize * scale;

    let pieceCount = 0;
    let svg = `<svg width="${canvasW + 2}" height="${canvasH + 30}" style="border:1px solid #ccc;display:block;margin:6px 0;">`;
    // Roll background
    svg += `<rect x="0" y="0" width="${canvasW}" height="${canvasH}" fill="#f5f0ff" stroke="#8e44ad" stroke-width="1.5"/>`;

    // Draw pieces
    const colors = ['#9b59b6','#8e44ad','#6c3483','#a569bd','#c39bd3'];
    for (let row = 0; row < maxRows; row++) {
        for (let col = 0; col < cpp; col++) {
            if (pieceCount >= qty) break;
            const x = col * acrossSize * scale;
            const y = row * alongSize  * scale;
            const pw = acrossSize * scale;
            const ph = alongSize  * scale;
            const color = colors[pieceCount % colors.length];
            svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="${color}" opacity="0.75" stroke="white" stroke-width="1"/>`;
            // Label
            const lx = (x + pw / 2).toFixed(1);
            const ly = (y + ph / 2).toFixed(1);
            const label = orientation === 'w-across'
                ? `${pieceW.toFixed(1)}"×${pieceH.toFixed(1)}"`
                : `${pieceH.toFixed(1)}"×${pieceW.toFixed(1)}"`;
            svg += `<text x="${lx}" y="${ly}" font-size="9" fill="white" text-anchor="middle" dy="3">#${pieceCount+1} ${label}</text>`;
            pieceCount++;
        }
        if (pieceCount >= qty) break;
    }

    // Waste strip on right (if not full width)
    const usedAcross = cpp * acrossSize * scale;
    if (rollW * scale - usedAcross > 1) {
        svg += `<rect x="${usedAcross.toFixed(1)}" y="0" width="${(rollW*scale - usedAcross).toFixed(1)}" height="${canvasH}" fill="#e0c8f0" opacity="0.5"/>`;
        svg += `<text x="${(usedAcross + (rollW*scale-usedAcross)/2).toFixed(1)}" y="${(canvasH/2).toFixed(1)}" font-size="8" fill="#6c3483" text-anchor="middle">waste</text>`;
    }

    // Annotation line
    const truncNote = rows > maxRows ? ` (showing ${maxRows} of ${rows} rows)` : '';
    svg += `<text x="4" y="${(canvasH + 18).toFixed(1)}" font-size="10" fill="#6c3483">
        Roll ${seg.roll.name} | ${cpp} piece${cpp>1?'s':''}/row × ${rows} rows = ${seg.lengthUsed.toFixed(1)}" linear (${(seg.lengthUsed/12).toFixed(2)} ft)${truncNote}
    </text>`;

    svg += '</svg>';
    return svg;
}

// ============================================================================
// RESULTS DISPLAY
// ============================================================================

function displayResults() {
    const container = document.getElementById('resultsContent');
    
    if (!optimizationResults) {
        container.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 40px">No results yet</p>';
        return;
    }
    
    const r = optimizationResults;
    let html = '<div class="alert alert-success">Smart Cost-Optimized Results for Project <strong>' + r.project + '</strong></div>';
    
    // Export buttons
    html += `
    <div class="import-export-section">
        <div style="text-align: center; margin-bottom: 15px;"><strong style="font-size: 16px;">📦 Project Exports & Previews</strong></div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
            <button class="btn btn-primary" onclick="showReportPreview('quotation')">📜 Customer Quotation</button>
            <button class="btn btn-success" onclick="showReportPreview('purchase_material')">🏢 Material Purchase</button>
            <button class="btn btn-info" onclick="showReportPreview('purchase_hardware')">🔩 Hardware Vendor List</button>
            <button class="btn btn-warning" onclick="showReportPreview('cutlist')">🪚 Optimized Cut List</button>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 10px; opacity: 0.8;">
            <button class="btn btn-primary btn-sm" onclick="exportFullResultsExcel()">📊 Full Excel</button>
            <button class="btn btn-danger btn-sm" onclick="exportFullResultsPDF()">📄 Full PDF</button>
            <button class="btn btn-secondary btn-sm" onclick="exportProject()">💾 Save JSON</button>
        </div>
    </div>
    <div class="import-export-section">
        <div style="text-align: center; margin-bottom: 15px;"><strong style="font-size: 16px;">📤 Share Results</strong></div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
            <button class="btn btn-success" onclick="shareViaWhatsApp()">📱 Share via WhatsApp</button>
            <button class="btn btn-primary" onclick="shareViaEmail()">✉️ Share via Email</button>
            <button class="btn btn-warning" onclick="generatePrintableLabels()">🏷️ Print Labels (A4)</button>
        </div>
    </div>`;
    
    // Cost breakdown
    const materialCost = parseFloat(r.stats.totalCost || 0);
    const totalUsed = parseFloat(r.stats.totalUsed || 0);
    const totalWaste = parseFloat(r.stats.totalWaste || 0);
    const totalLength = totalUsed + totalWaste;
    
    const wastePercentage = totalLength > 0 ? totalWaste / totalLength : 0;
    const wasteCost = (materialCost * wastePercentage).toFixed(0);
    const usedCost = (materialCost - parseFloat(wasteCost)).toFixed(0);
    
    html += `<div class="cost-breakdown-card">
        <h3 style="margin-top: 0;">💰 Cost Breakdown</h3>
        <div class="cost-breakdown-row"><span>Material (Used)</span><span><strong>₹${usedCost}</strong></span></div>
        <div class="cost-breakdown-row"><span>Material (Waste)</span><span><strong>₹${wasteCost}</strong></span></div>
        <div class="cost-breakdown-row" style="border-bottom: 2px solid white; font-size: 18px;">
            <span><strong>Total Cost</strong></span><span><strong>₹${r.stats.totalCost}</strong></span>
        </div>
    </div>`;
    
    // Stats grid
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><h4>Total Sticks</h4><p>' + r.stats.totalSticks + '</p></div>';
    html += '<div class="stat-card"><h4>Used Length</h4><p>' + r.stats.totalUsed + '"</p></div>';
    html += '<div class="stat-card"><h4>Waste Length</h4><p>' + r.stats.totalWaste + '"</p></div>';
    html += '<div class="stat-card"><h4>Efficiency</h4><p>' + r.stats.efficiency + '%</p></div>';
    html += '</div>';
    
    // Material details
    for (const [key, plans] of Object.entries(r.results)) {
        // Parse key if it contains series part
        const hasSeries = key.includes(' | ');
        const materialTitle = hasSeries ? key : key; // Keep as is, it's already descriptive
        
        const materialUsed = plans.reduce((sum, p) => sum + p.used, 0);
        const materialWaste = plans.reduce((sum, p) => sum + p.waste, 0);
        const materialTotal = materialUsed + materialWaste;
        const materialEfficiency = ((materialUsed / materialTotal) * 100).toFixed(2);
        
        const stockCounts = {};
        plans.forEach(plan => {
            const stockSize = plan.stock.replace('"', '');
            stockCounts[stockSize] = (stockCounts[stockSize] || 0) + 1;
        });
        
        const requirementStr = Object.entries(stockCounts)
            .map(([size, count]) => size + '" - ' + count + ' nos')
            .join(', ');
        
        html += '<div class="material-section">';
        
        // Find if already configured in results or stockMaster
        let selectedSection = r.componentSections ? r.componentSections[key] : null;
        if (!selectedSection) {
            // Try to find in stockMaster
            const [sName, mName] = key.split(' | ');
            const stockList = stockMaster[sName] || [];
            const stockItem = stockList.find(s => s.material === mName);
            if (stockItem && stockItem.sectionNo) {
                selectedSection = {
                    supplier: stockItem.supplier,
                    sectionNo: stockItem.sectionNo,
                    t: stockItem.thickness,
                    weight: stockItem.weight
                };
                // Initialize in results
                if (!r.componentSections) r.componentSections = {};
                r.componentSections[key] = selectedSection;
            }
        }

        const sectionInfo = selectedSection 
            ? `<span style="color: #2e7d32; font-size: 0.9em;">✅ <strong>${selectedSection.supplier} / ${selectedSection.sectionNo}</strong> (T: ${selectedSection.t}mm)</span>`
            : `<span style="color: #c0392b; font-size: 0.9em;">❌ <strong>Section Not Selected</strong></span>`;

        // Escape quotes to prevent broken HTML attributes
        const safeKey = key.replace(/"/g, '&quot;').replace(/'/g, "\\'");

        // ── Door function badges ─────────────────────────────────────────────
        // For Door profiles, extract which door functions use this profile
        // so the user can see e.g. "Door Bottom → Bottom Rail • Hinge Stile"
        const DOOR_FUNC_STYLE = {
            'Vertical Handle':       'background:#1565c0;color:#fff',
            'Vertical Hing':         'background:#6a1b9a;color:#fff',
            'Top Rail':              'background:#00695c;color:#fff',
            'Bottom Rail':           'background:#2e7d32;color:#fff',
            'Middle Rail':           'background:#e65100;color:#fff',
            'Frame Top':             'background:#4e342e;color:#fff',
            'Frame Left':            'background:#4e342e;color:#fff',
            'Frame Right':           'background:#4e342e;color:#fff',
            'Glazing Clip Vertical': 'background:#37474f;color:#fff',
            'Glazing Clip Horizontal':'background:#37474f;color:#fff',
        };
        let doorFuncBadges = '';
        if (key.startsWith('Door |')) {
            const funcSet = new Set();
            plans.forEach(plan => plan.pieces.forEach(p => {
                // label format: "D01 - Bottom Rail"
                const parts = p.label.split(' - ');
                if (parts.length >= 2) funcSet.add(parts.slice(1).join(' - '));
            }));
            if (funcSet.size > 0) {
                const badges = [...funcSet].map(fn => {
                    const style = DOOR_FUNC_STYLE[fn] || 'background:#546e7a;color:#fff';
                    return `<span style="${style};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;margin-right:4px;">${fn}</span>`;
                }).join('');
                doorFuncBadges = `<div style="margin-top:6px;margin-bottom:2px;">
                    <span style="font-size:11px;color:#666;margin-right:6px;">Used as:</span>${badges}</div>`;
            }
        }
        // ────────────────────────────────────────────────────────────────────

        html += `<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
                <h3 style="margin: 0;">📏 ${materialTitle}</h3>
                ${doorFuncBadges}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;padding-top:2px;">
                ${sectionInfo}
                <button class="btn btn-warning btn-sm" onclick="openSectionSelectModal('${safeKey}')">🔗 Select Thickness</button>
            </div>
        </div>`;

        html += `<div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #4caf50">
            <strong style="font-size: 15px; color: #2e7d32">Material Summary</strong><br>
            <div style="margin-top: 8px; font-size: 14px; line-height: 1.8">
                <strong>Requirements:</strong> ${requirementStr}<br>
                <strong>Total Used Length:</strong> ${materialUsed.toFixed(2)}"
                <strong>Total Waste:</strong> ${materialWaste.toFixed(2)}"
                <strong>Efficiency:</strong> ${materialEfficiency}%
            </div>
        </div>`;
        
        html += '<table><thead><tr><th>Stick #</th><th>Stock</th><th>Cut Sequence</th><th>Pieces</th><th>Used</th><th>Waste</th><th>Efficiency</th><th>Cost</th></tr></thead><tbody>';
        
        let cutNumber = 1;
        plans.forEach((plan, idx) => {
            const piecesStr = plan.pieces.map(p => {
                // For door pieces, show function first, config ID secondary
                if (key.startsWith('Door |') && p.label.includes(' - ')) {
                    const [configId, ...funcParts] = p.label.split(' - ');
                    const func = funcParts.join(' - ');
                    return `${p.length.toFixed(2)}" (<strong>${func}</strong> <span style="color:#999;font-size:11px;">${configId}</span>)`;
                }
                return p.length.toFixed(2) + '" (' + p.label + ')';
            }).join(', ');
            const cutSequence = plan.pieces.map(() => '#' + (cutNumber++)).join(', ');
            
            html += '<tr>';
            html += '<td>' + (idx + 1) + '</td>';
            html += '<td>' + formatInchesToFeet(parseFloat(plan.stock.replace('"', ''))) + '</td>';
            html += '<td><strong>' + cutSequence + '</strong></td>';
            html += '<td>' + piecesStr + '</td>';
            html += '<td>' + plan.used.toFixed(2) + '"</td>';
            html += '<td>' + plan.waste.toFixed(2) + '"</td>';
            html += '<td>' + plan.efficiency + '%</td>';
            html += '<td>₹' + plan.cost.toFixed(0) + '</td>';
            html += '</tr>';
            
            const stockLength = parseFloat(plan.stock.replace('"', ''));
            const diagram = generateCuttingDiagram(plan, stockLength);
            html += '<tr><td colspan="8"><div class="cutting-diagram">' + diagram + '</div></td></tr>';
        });
        
        html += '</tbody></table></div>';
    }

    // ── Mosquito Net Section ───────────────────────────────────────────────────
    const netResults = r.netResults || [];
    if (netResults.length > 0) {
        html += `<div class="material-section" style="border-left:4px solid #8e44ad;margin-top:24px;">
            <h3 style="margin:0 0 4px 0;color:#6c3483;">🕸️ Mosquito Net Cutting Plan</h3>
            <p style="font-size:13px;color:#555;margin:0 0 14px 0;">
                SS Mosquito Net — cuts grouped by roll width for easy ordering &amp; site use.
                Piece sizes are after deducting 2" from each shutter frame dimension.
            </p>`;

        // ── 1. Collect all errors (groups with no plan) ──────────────────────
        netResults.forEach(group => {
            if (!group.plan) {
                html += `<div style="background:#fdecea;padding:10px;border-radius:6px;margin-bottom:10px;">
                    ⚠️ No suitable roll found for piece ${group.w.toFixed(2)}"×${group.h.toFixed(2)}"
                    — check that at least one net roll width ≥ ${Math.min(group.w,group.h).toFixed(2)}".
                </div>`;
            }
        });

        // ── 2. Build roll-width index: rollWidth → [{group, seg}] ───────────
        //    Order by roll.width ascending (24 → 36 → 48 → 60)
        const rollMap = new Map();  // key = roll.width, value = { roll, entries:[] }
        netResults.forEach(group => {
            if (!group.plan) return;
            group.plan.segments.forEach(seg => {
                const w = seg.roll.width;
                if (!rollMap.has(w)) rollMap.set(w, { roll: seg.roll, entries: [] });
                rollMap.get(w).entries.push({ group, seg });
            });
        });
        // Sort by width ascending
        const sortedRolls = [...rollMap.entries()].sort((a, b) => a[0] - b[0]);

        // ── 3. ORDER SUMMARY TABLE ───────────────────────────────────────────
        let grandTotalRolls = 0, grandTotalArea = 0, grandPieceArea = 0, grandCost = 0;
        netResults.forEach(g => {
            if (!g.plan) return;
            grandPieceArea += g.qty * g.w * g.h;
            g.plan.segments.forEach(seg => {
                grandTotalRolls += seg.rollsNeeded;
                grandTotalArea  += seg.areaUsed;
                grandCost       += seg.rollsNeeded * seg.roll.costPerRoll;
            });
        });

        html += `<div style="background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:14px;margin-bottom:18px;">
            <strong style="font-size:14px;color:#6c3483;">📋 Order Summary — Rolls to Purchase</strong>
            <table style="width:100%;margin-top:10px;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:#8e44ad;color:white;">
                <th style="padding:7px 12px;text-align:left;">Roll Width</th>
                <th style="padding:7px 12px;text-align:center;">Rolls to Order</th>
                <th style="padding:7px 12px;text-align:center;">Roll Length Each</th>
                <th style="padding:7px 12px;text-align:center;">Total Roll Area</th>
                <th style="padding:7px 12px;text-align:right;">Cost</th>
            </tr></thead><tbody>`;

        let summaryRollCount = 0;
        sortedRolls.forEach(([, { roll, entries }]) => {
            const rollsHere   = entries.reduce((s, e) => s + e.seg.rollsNeeded, 0);
            const areaHere    = entries.reduce((s, e) => s + e.seg.areaUsed, 0);
            const costHere    = entries.reduce((s, e) => s + e.seg.rollsNeeded * e.seg.roll.costPerRoll, 0);
            summaryRollCount += rollsHere;
            html += `<tr style="border-bottom:1px solid #e1bee7;">
                <td style="padding:7px 12px;font-weight:700;color:#6c3483;">${roll.name}</td>
                <td style="padding:7px 12px;text-align:center;"><strong>${rollsHere}</strong></td>
                <td style="padding:7px 12px;text-align:center;color:#555;">${(roll.length/12).toFixed(0)} ft (${roll.length}")</td>
                <td style="padding:7px 12px;text-align:center;color:#555;">${(areaHere/144).toFixed(1)} sqft</td>
                <td style="padding:7px 12px;text-align:right;">${costHere > 0 ? '₹' + costHere.toFixed(0) : '<em style="color:#aaa">—</em>'}</td>
            </tr>`;
        });

        const grandEfficiency = grandTotalArea > 0 ? ((grandPieceArea / grandTotalArea) * 100).toFixed(1) : '0.0';
        html += `<tr style="background:#6c3483;color:white;font-weight:700;">
            <td style="padding:8px 12px;">TOTAL</td>
            <td style="padding:8px 12px;text-align:center;">${grandTotalRolls} rolls</td>
            <td style="padding:8px 12px;text-align:center;">—</td>
            <td style="padding:8px 12px;text-align:center;">${(grandTotalArea/144).toFixed(1)} sqft</td>
            <td style="padding:8px 12px;text-align:right;">${grandCost > 0 ? '₹' + grandCost.toFixed(0) : '—'}</td>
        </tr>`;
        html += `</tbody></table>
            <div style="font-size:12px;color:#6c3483;margin-top:8px;">
                Net area needed: ${(grandPieceArea/144).toFixed(2)} sqft &nbsp;|&nbsp;
                Waste: ${((grandTotalArea-grandPieceArea)/144).toFixed(2)} sqft &nbsp;|&nbsp;
                Overall efficiency: ${grandEfficiency}%
            </div>
        </div>`;

        // ── 4. ROLL-BY-ROLL CUTTING DETAIL ───────────────────────────────────
        sortedRolls.forEach(([, { roll, entries }]) => {
            const rollsHere = entries.reduce((s, e) => s + e.seg.rollsNeeded, 0);
            const costHere  = entries.reduce((s, e) => s + e.seg.rollsNeeded * e.seg.roll.costPerRoll, 0);

            html += `<div style="border:2px solid #8e44ad;border-radius:10px;margin-bottom:20px;overflow:hidden;">
                <!-- Roll header -->
                <div style="background:#8e44ad;color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
                    <strong style="font-size:15px;">📦 ${roll.name} — ${rollsHere} roll${rollsHere>1?'s':''} needed</strong>
                    <span style="font-size:13px;opacity:0.9;">
                        Roll size: ${roll.width}" wide × ${(roll.length/12).toFixed(0)}ft long
                        ${costHere > 0 ? ' &nbsp;|&nbsp; ₹' + costHere.toFixed(0) : ''}
                    </span>
                </div>`;

            // One row per cut entry from this roll width
            entries.forEach((entry, ei) => {
                const { group, seg } = entry;
                const { w, h, labels } = group;
                const pq = seg.pieceQty;  // actual pieces allocated to this roll

                // Orientation description
                const acrossInch = seg.orientation === 'w-across' ? w : h;
                const alongInch  = seg.orientation === 'w-across' ? h : w;
                const orientDesc = `${acrossInch.toFixed(2)}" across roll width, ${alongInch.toFixed(2)}" along roll`;

                // Piece size label (w × h, always width × height)
                const pieceDims = `${w.toFixed(2)}" × ${h.toFixed(2)}" (${(w/12).toFixed(2)}ft × ${(h/12).toFixed(2)}ft)`;

                const rollAreaSqft = (seg.rollsNeeded * roll.width * roll.length / 144).toFixed(2);
                const piecesAreaSqft = (pq * w * h / 144).toFixed(2);
                const wasteAreaSqft  = ((seg.areaUsed - pq*w*h) / 144).toFixed(2);
                const eff = seg.areaUsed > 0 ? ((pq*w*h / seg.areaUsed)*100).toFixed(1) : '0.0';
                const entryBg = ei % 2 === 0 ? '#faf5ff' : 'white';

                html += `<div style="padding:14px 16px;background:${entryBg};border-top:1px solid #e1bee7;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                        <div>
                            <span style="font-size:14px;font-weight:700;color:#4a0072;">
                                Piece: ${pieceDims}
                            </span>
                            <span style="background:#8e44ad;color:white;border-radius:10px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">
                                Qty: ${pq}
                            </span><br>
                            <span style="font-size:12px;color:#666;margin-top:3px;display:inline-block;">
                                From: ${labels.join(', ')}
                            </span>
                        </div>
                        <div style="text-align:right;font-size:12px;color:#555;line-height:1.8;">
                            <strong>${seg.rollsNeeded}</strong> roll${seg.rollsNeeded>1?'s':''} of ${roll.name} &nbsp;|&nbsp;
                            Efficiency: <strong>${eff}%</strong><br>
                            Roll area used: ${rollAreaSqft} sqft &nbsp;|&nbsp; Waste: ${wasteAreaSqft} sqft
                        </div>
                    </div>

                    <!-- Cut instructions -->
                    <div style="background:#ede7f6;border-radius:6px;padding:8px 12px;margin-top:10px;font-size:13px;line-height:1.9;">
                        <strong style="color:#4a0072;">✂️ Cutting Instructions:</strong><br>
                        Place piece <strong>${orientDesc}</strong><br>
                        Pieces per row: <strong>${seg.piecesPerRow}</strong> &nbsp;|&nbsp;
                        Rows to cut: <strong>${seg.rowsNeeded}</strong> &nbsp;|&nbsp;
                        Linear length to cut: <strong>${(seg.lengthUsed/12).toFixed(2)} ft (${seg.lengthUsed.toFixed(2)}")</strong>
                        ${seg.rollsNeeded > 1 ? `<br><em style="color:#880e4f;">⚠️ Requires ${seg.rollsNeeded} rolls — continue on next roll after ${(roll.length/12).toFixed(0)} ft.</em>` : ''}
                    </div>

                    <!-- 2D diagram -->
                    <div style="margin-top:10px;">
                        ${generateNetDiagram(w, h, pq, seg)}
                    </div>
                </div>`;
            });

            html += '</div>';  // close roll block
        });

        html += '</div>';  // close net section
    }
    // ──────────────────────────────────────────────────────────────────────────

    container.innerHTML = html;
}

// ============================================================================
// PROJECT EXPORT/IMPORT
// ============================================================================

function exportProject() {
    const projectData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        windows: windows,
        seriesFormulas: seriesFormulas,
        stockMaster: stockMaster,
        kerf: kerf,
        unitMode: unitMode
    };
    
    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Niruma_Project_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showAlert('✅ Project exported successfully!');
}

function importProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const projectData = JSON.parse(event.target.result);
                
                if (!projectData.windows || !projectData.seriesFormulas || !projectData.stockMaster) {
                    throw new Error('Invalid project file format');
                }
                
                windows = projectData.windows;
                seriesFormulas = projectData.seriesFormulas;
                stockMaster = projectData.stockMaster;
                kerf = projectData.kerf || 0.125;
                unitMode = projectData.unitMode || 'inch';
                
                document.getElementById('kerfGlobal').value = kerf;
                const allUnitToggles = document.querySelectorAll('input[id*="unitToggle"]');
                allUnitToggles.forEach(toggle => {
                    if (toggle) toggle.checked = (unitMode === 'mm');
                });                
                // Save to local storage
                autoSaveWindows();
                autoSaveFormulas();
                autoSaveStock();
                autoSaveSettings();
                
                refreshAllUI();
                showAlert(`✅ Project imported successfully!\n${windows.length} windows loaded.`);
            } catch (error) {
                showAlert('❌ Error importing project: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// ============================================================================
// WHATSAPP SHARING
// ============================================================================

function shareViaWhatsApp() {
    if (!optimizationResults) {
        showAlert('⚠️ Please run optimization first!');
        return;
    }
    
    const r = optimizationResults;
    let message = `*Niruma Aluminum Profile Optimizer*\n*Project:* ${r.project}\n\n*SUMMARY*\nTotal Sticks: ${r.stats.totalSticks}\nTotal Cost: ₹${r.stats.totalCost}\nEfficiency: ${r.stats.efficiency}%\n\n*PURCHASE LIST*\n`;
    
    for (const [key, plans] of Object.entries(r.results)) {
        const stockCounts = {};
        plans.forEach(plan => {
            const stockSize = plan.stock.replace('"', '');
            stockCounts[stockSize] = (stockCounts[stockSize] || 0) + 1;
        });
        
        message += `\n${key}:\n`;
        for (const [size, count] of Object.entries(stockCounts)) {
            message += `  • ${size}" - ${count} nos\n`;
        }
    }
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// ============================================================================
// EMAIL SHARING
// ============================================================================

function shareViaEmail() {
    if (!optimizationResults) {
        showAlert('⚠️ Please run optimization first!');
        return;
    }
    
    const r = optimizationResults;
    let body = `NIRUMA ALUMINUM PROFILE OPTIMIZER\nProject: ${r.project}\n\nSUMMARY\nTotal Sticks: ${r.stats.totalSticks}\nTotal Cost: ₹${r.stats.totalCost}\nEfficiency: ${r.stats.efficiency}%\n\nPURCHASE LIST\n`;
    
    for (const [key, plans] of Object.entries(r.results)) {
        const stockCounts = {};
        plans.forEach(plan => {
            const stockSize = plan.stock.replace('"', '');
            stockCounts[stockSize] = (stockCounts[stockSize] || 0) + 1;
        });
        
        body += `\n${key}:\n`;
        for (const [size, count] of Object.entries(stockCounts)) {
            body += `  ${size}" - ${count} nos\n`;
        }
    }
    
    window.location.href = `mailto:?subject=${encodeURIComponent('Niruma Cutting Plan - ' + r.project)}&body=${encodeURIComponent(body)}`;
}

// ============================================================================
// PRINTABLE LABELS
// ============================================================================

function generatePrintableLabels() {
    if (!optimizationResults) {
        showAlert('⚠️ Please run optimization first!');
        return;
    }
    
    const r = optimizationResults;
    let labelHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cutting Labels - ${r.project}</title><style>
@page { size: A4; margin: 10mm; }
body { font-family: 'Courier New', monospace; }
.label-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; padding: 0; }
.label-item { border: 2px solid #000; padding: 3mm; height: 25mm; display: flex; flex-direction: column; justify-content: center; font-size: 10pt; page-break-inside: avoid; }
.label-header { font-weight: bold; font-size: 12pt; border-bottom: 1px solid #000; margin-bottom: 2mm; }
@media print { .no-print { display: none; } }
</style></head><body>
<div class="no-print" style="text-align: center; padding: 20px;">
    <h2>Niruma Labels - ${r.project}</h2>
    <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer;">🖨️ Print Labels</button>
</div>
<div class="label-grid">`;
    
    for (const [key, plans] of Object.entries(r.results)) {
        let cutNumber = 1;
        plans.forEach((plan, stickIdx) => {
            plan.pieces.forEach(piece => {
                const windowId = piece.label.split(' - ')[0];
                labelHTML += `<div class="label-item">
                    <div class="label-header">${r.project}</div>
                    <div><strong>Window:</strong> ${windowId}</div>
                    <div><strong>Material:</strong> ${key}</div>
                    <div><strong>Cut #:</strong> ${cutNumber}</div>
                    <div><strong>Length:</strong> ${piece.length.toFixed(2)}"</div>
                </div>`;
                cutNumber++;
            });
        });
    }
    
    labelHTML += `</div></body></html>`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(labelHTML);
    printWindow.document.close();
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

function exportFullResultsExcel() {
    if (!optimizationResults) {
        showAlert('⚠️ No results to export!');
        return;
    }
    
    const r = optimizationResults;
    const wb = XLSX.utils.book_new();
    
    const summaryData = [
        ['Niruma Aluminum Profile Optimizer'],
        ['Project:', r.project],
        [''],
        ['Overall Statistics'],
        ['Total Sticks', r.stats.totalSticks],
        ['Total Used Length', r.stats.totalUsed + '"'],
        ['Total Waste Length', r.stats.totalWaste + '"'],
        ['Overall Efficiency', r.stats.efficiency + '%'],
        ['Total Cost', '₹' + r.stats.totalCost],
        ['']
    ];
    
    for (const [key, plans] of Object.entries(r.results)) {
        const materialUsed = plans.reduce((sum, p) => sum + p.used, 0);
        const materialWaste = plans.reduce((sum, p) => sum + p.waste, 0);
        const materialTotal = materialUsed + materialWaste;
        const materialEfficiency = ((materialUsed / materialTotal) * 100).toFixed(2);
        
        const stockCounts = {};
        plans.forEach(plan => {
            const stockSize = plan.stock.replace('"', '');
            stockCounts[stockSize] = (stockCounts[stockSize] || 0) + 1;
        });
        
        const requirementStr = Object.entries(stockCounts)
            .map(([size, count]) => `${size}" - ${count} nos`)
            .join(' | ');
        
        summaryData.push([`Material: ${key}`]);
        summaryData.push(['Requirements', requirementStr]);
        summaryData.push(['Used Length', materialUsed.toFixed(2) + '"']);
        summaryData.push(['Waste Length', materialWaste.toFixed(2) + '"']);
        summaryData.push(['Efficiency', materialEfficiency + '%']);
        summaryData.push(['']);
        
        summaryData.push(['Detailed Cutting Plan']);
        summaryData.push(['Stick #', 'Stock', 'Pieces', 'Used', 'Waste', 'Efficiency', 'Cost']);
        
        plans.forEach((plan, idx) => {
            const piecesStr = plan.pieces.map(p => `${p.length.toFixed(2)}" (${p.label})`).join(' | ');
            summaryData.push([
                idx + 1,
                plan.stock,
                piecesStr,
                plan.used.toFixed(2) + '"',
                plan.waste.toFixed(2) + '"',
                plan.efficiency + '%',
                '₹' + plan.cost
            ]);
        });
        
        summaryData.push(['']);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Full Results');
    XLSX.writeFile(wb, `${r.project}_Full_Results.xlsx`);
}

// ============================================================================
// PDF EXPORT
// ============================================================================

function exportFullResultsPDF() {
    if (!optimizationResults) {
        showAlert('⚠️ No results to export!');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const r = optimizationResults;
    
    doc.setFontSize(18);
    doc.text('Niruma Aluminum Profile Optimizer', 14, 20);
    doc.setFontSize(12);
    doc.text(`Project: ${r.project}`, 14, 30);
    
    doc.setFontSize(14);
    doc.text('Overall Statistics', 14, 45);
    
    doc.autoTable({
        startY: 50,
        head: [['Metric', 'Value']],
        body: [
            ['Total Sticks', r.stats.totalSticks],
            ['Total Used Length', r.stats.totalUsed + '"'],
            ['Total Waste Length', r.stats.totalWaste + '"'],
            ['Overall Efficiency', r.stats.efficiency + '%'],
            ['Total Cost', '₹' + r.stats.totalCost]
        ],
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219] }
    });
    
    let currentY = doc.lastAutoTable.finalY + 10;
    
    for (const [key, plans] of Object.entries(r.results)) {
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }
        
        const materialUsed = plans.reduce((sum, p) => sum + p.used, 0);
        const materialWaste = plans.reduce((sum, p) => sum + p.waste, 0);
        const materialTotal = materialUsed + materialWaste;
        const materialEfficiency = ((materialUsed / materialTotal) * 100).toFixed(2);
        
        const stockCounts = {};
        plans.forEach(plan => {
            const stockSize = plan.stock.replace('"', '');
            stockCounts[stockSize] = (stockCounts[stockSize] || 0) + 1;
        });
        
        const requirementStr = Object.entries(stockCounts)
            .map(([size, count]) => `${size}" - ${count} nos`)
            .join(' | ');
        
        doc.setFontSize(14);
        doc.text(`Material: ${key}`, 14, currentY);
        currentY += 7;
        
        doc.setFontSize(10);
        doc.text(`Requirements: ${requirementStr}`, 14, currentY);
        currentY += 5;
        doc.text(`Used: ${materialUsed.toFixed(2)}" | Waste: ${materialWaste.toFixed(2)}" | Efficiency: ${materialEfficiency}%`, 14, currentY);
        currentY += 10;
        
        const tableData = plans.map((plan, idx) => {
            const piecesStr = plan.pieces.map(p => `${p.length.toFixed(2)}" (${p.label})`).join(' | ');
            return [
                idx + 1,
                plan.stock,
                piecesStr,
                plan.used.toFixed(2) + '"',
                plan.waste.toFixed(2) + '"',
                plan.efficiency + '%',
                '₹' + plan.cost
            ];
        });
        
        doc.autoTable({
            startY: currentY,
            head: [['#', 'Stock', 'Pieces', 'Used', 'Waste', 'Eff%', 'Cost']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
            styles: { fontSize: 8 }
        });
        
        currentY = doc.lastAutoTable.finalY + 10;
    }
    
    doc.save(`${r.project}_Full_Results.pdf`);
}

// function generateQuotation() {
//     const projectSelector = document.getElementById('projectSelector');
//     const selectedProject = projectSelector.value;
    
//     if (!selectedProject) {
//         alert('⚠️ Please select a project first!');
//         return;
//     }
    
//     const projectWindows = windows.filter(w => w.projectName === selectedProject);
//     if (projectWindows.length === 0) {
//         alert('⚠️ No windows found for this project!');
//         return;
//     }
    
//     const { jsPDF } = window.jspdf;
//     const doc = new jsPDF();
    
//     // Company logo (text-based)
//     doc.setFontSize(20);
//     doc.setFont('helvetica', 'bold');
//     doc.text('🏭 NIRUMA', 14, 20);
//     doc.setFontSize(14);
//     doc.text('ALUMINUM SECTIONS', 14, 30);
//     doc.setFontSize(10);
//     doc.text('Quality Aluminum Profiles Since 2025', 14, 35);
    
//     // Company details
//     doc.setFontSize(10);
//     doc.text('123 Industrial Area, City, State - 123456', 120, 20);
//     doc.text('Phone: +91-9876543210', 120, 25);
//     doc.text('Email: info@niruma.com', 120, 30);
//     doc.text('GST: 22AAAAA0000A1Z5', 120, 35);
    
//     // Quotation header
//     doc.setFontSize(18);
//     doc.text('QUOTATION', 14, 50);
//     doc.setFontSize(12);
//     doc.text(`Quotation No: QT-${Date.now()}`, 14, 60);
//     doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 65);
//     doc.text(`Project: ${selectedProject}`, 14, 70);
    
//     // Client details (placeholder)
//     doc.text('Client: [Client Name]', 120, 60);
//     doc.text('Address: [Client Address]', 120, 65);
    
//     // Window details
//     let yPos = 80;
//     doc.setFontSize(14);
//     doc.text('Window Details:', 14, yPos);
//     yPos += 10;
    
//     const windowData = projectWindows.map((w, idx) => [
//         idx + 1,
//         w.configId,
//         w.description,
//         `${w.width}" × ${w.height}"`,
//         w.tracks,
//         w.shutters,
//         w.mosquitoShutters,
//         w.series
//     ]);
    
//     doc.autoTable({
//         startY: yPos,
//         head: [['#', 'Config ID', 'Description', 'Size', 'Tracks', 'Shutters', 'MS', 'Series']],
//         body: windowData,
//         theme: 'grid',
//         headStyles: { fillColor: [52, 152, 219] },
//         styles: { fontSize: 8 }
//     });
    
//     yPos = doc.lastAutoTable.finalY + 10;
    
//     // Cost summary (if optimization results exist)
//     if (optimizationResults && optimizationResults.project === selectedProject) {
//         const r = optimizationResults;
//         doc.setFontSize(14);
//         doc.text('Cost Summary:', 14, yPos);
//         yPos += 10;
        
//         const materialCost = parseFloat(r.stats.totalCost || 0);
//         const wastePercentage = parseFloat(r.stats.totalWaste || 0) / (parseFloat(r.stats.totalUsed || 1) + parseFloat(r.stats.totalWaste || 0));
//         const wasteCost = (materialCost * wastePercentage).toFixed(0);
//         const usedCost = (materialCost - wasteCost).toFixed(0);
        
//         doc.autoTable({
//             startY: yPos,
//             head: [['Item', 'Amount (₹)']],
//             body: [
//                 ['Material Cost (Used)', usedCost],
//                 ['Material Cost (Waste)', wasteCost],
//                 ['Total Material Cost', r.stats.totalCost],
//                 ['Labor Charges (10%)', (parseFloat(r.stats.totalCost) * 0.1).toFixed(0)],
//                 ['Transportation (5%)', (parseFloat(r.stats.totalCost) * 0.05).toFixed(0)],
//                 ['GST (18%)', (parseFloat(r.stats.totalCost) * 1.15 * 0.18).toFixed(0)],
//                 ['Grand Total', (parseFloat(r.stats.totalCost) * 1.15 * 1.18).toFixed(0)]
//             ],
//             theme: 'grid',
//             headStyles: { fillColor: [46, 125, 50] }
//         });
        
//         yPos = doc.lastAutoTable.finalY + 10;
//     } else {
//         doc.setFontSize(12);
//         doc.text('Note: Please run optimization first for accurate cost estimates.', 14, yPos);
//         yPos += 10;
//     }
    
//     // Terms and conditions
//     doc.setFontSize(10);
//     doc.text('Terms & Conditions:', 14, yPos);
//     yPos += 5;
//     doc.text('1. Prices are valid for 30 days from the date of quotation.', 14, yPos);
//     yPos += 5;
//     doc.text('2. Payment terms: 50% advance, 50% before delivery.', 14, yPos);
//     yPos += 5;
//     doc.text('3. Delivery within 15-20 working days after confirmation.', 14, yPos);
//     yPos += 5;
//     doc.text('4. All disputes subject to [City] jurisdiction.', 14, yPos);
    
//     // Footer
//     const pageHeight = doc.internal.pageSize.height;
//     doc.setFontSize(8);
//     doc.text('Thank you for your business!', 14, pageHeight - 20);
//     doc.text('Niruma Aluminum Sections - Quality You Can Trust', 14, pageHeight - 15);
    
//     doc.save(`Quotation_${selectedProject}_${Date.now()}.pdf`);
// }
