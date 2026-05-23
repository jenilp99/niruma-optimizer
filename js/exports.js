// Niruma Aluminum Profile Optimizer - Export & Display Functions

// ============================================================================
// NET CUTTING VISUAL DIAGRAM  (2D FFDH — uniform proportional scale)
// ============================================================================

/**
 * Generate a proportionally-correct SVG diagram of the FFDH layout.
 * Uses ONE uniform px/inch scale for BOTH axes so piece aspect ratios are accurate.
 *
 * @param {Object} layout — result from packNetFFDH()
 *   { roll, shelves:[{y,shelfH,nextX,pieces:[{x,w,h,label,origW,origH,rotated}]}],
 *     totalLength, rollsNeeded, areaUsed, wasteArea, piecesArea, efficiency }
 */
function generateNetDiagramFFDH(layout) {
    if (!layout || !layout.shelves || layout.shelves.length === 0) {
        return '<em style="color:#999;font-size:12px;">No pieces to display</em>';
    }

    const rollW    = layout.roll.width;
    const totalLen = layout.totalLength;
    const rollLen  = layout.roll.length;   // length of one physical roll

    // ── Uniform scale: same px/inch for BOTH axes ──────────────────────────
    // Target: roll width ~530px, capped at 14 px/in so narrow rolls aren't huge.
    const scale = Math.min(530 / rollW, 14);

    // Padding for labels around the drawing
    const PT = 18;   // top  (roll-width label)
    const PL = 4;    // left
    const PR = 46;   // right (H-cut number labels)
    const PB = 22;   // bottom (scale annotation)

    const canvasW = rollW    * scale;
    const canvasH = totalLen * scale;
    const svgW    = Math.ceil(canvasW + PL + PR);
    const svgH    = Math.ceil(canvasH + PT + PB);

    // ── Per-label colour palette ───────────────────────────────────────────
    const PALETTE = [
        '#9b59b6','#2980b9','#27ae60','#e67e22',
        '#e74c3c','#16a085','#d35400','#1a237e',
        '#880e4f','#006064','#33691e','#4a148c'
    ];
    const labelColor = {};
    let ci = 0;
    layout.shelves.forEach(sh => sh.pieces.forEach(p => {
        if (!labelColor[p.label]) labelColor[p.label] = PALETTE[ci++ % PALETTE.length];
    }));

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" `
            + `width="${svgW}" height="${svgH}" `
            + `style="display:block;margin:6px 0;font-family:sans-serif;">`;

    // Hatch pattern for waste
    svg += `<defs>
        <pattern id="netHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#c8a8e0" stroke-width="1.5"/>
        </pattern>
    </defs>`;

    // Roll background
    svg += `<rect x="${PL}" y="${PT}" `
         + `width="${canvasW.toFixed(1)}" height="${canvasH.toFixed(1)}" `
         + `fill="#f5f0ff" stroke="#8e44ad" stroke-width="1.5"/>`;

    // ── Draw shelves ───────────────────────────────────────────────────────
    layout.shelves.forEach((shelf, si) => {
        const sy = PT + shelf.y * scale;
        const sh = shelf.shelfH * scale;

        // Waste background for entire shelf row (hatch)
        svg += `<rect x="${PL}" y="${sy.toFixed(1)}" `
             + `width="${canvasW.toFixed(1)}" height="${sh.toFixed(1)}" `
             + `fill="url(#netHatch)" opacity="0.35"/>`;

        // Pieces in this shelf
        shelf.pieces.forEach(p => {
            const px = PL + p.x * scale;
            const py = sy;
            const pw = p.w * scale;
            const ph = p.h * scale;          // actual placed height (may be < shelf height)
            const col = labelColor[p.label] || '#9b59b6';
            const shortLbl = p.label.split(/[\s(]/)[0];   // e.g. "W01"

            // Piece fill
            svg += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" `
                 + `width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" `
                 + `fill="${col}" opacity="0.85" stroke="white" stroke-width="1.2"/>`;

            // Text inside piece (only if big enough to read)
            if (pw >= 20 && ph >= 14) {
                const cx = (px + pw / 2).toFixed(1);
                if (ph >= 30) {
                    // Two-line label: window ID + placed dimensions
                    svg += `<text x="${cx}" y="${(py + ph/2 - 5).toFixed(1)}" `
                         + `text-anchor="middle" font-size="9" fill="white" font-weight="bold">`
                         + `${shortLbl}</text>`;
                    svg += `<text x="${cx}" y="${(py + ph/2 + 6).toFixed(1)}" `
                         + `text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.92)">`
                         + `${p.w.toFixed(1)}"×${p.h.toFixed(1)}"${p.rotated ? ' ↺' : ''}</text>`;
                } else {
                    // One-line label
                    svg += `<text x="${cx}" y="${(py + ph/2 + 3).toFixed(1)}" `
                         + `text-anchor="middle" font-size="8" fill="white" font-weight="bold">`
                         + `${shortLbl}${p.rotated ? ' ↺' : ''}</text>`;
                }
            }
        });

        // ── Horizontal cut line at bottom of shelf (blue dashed) ──────────
        if (si < layout.shelves.length - 1) {
            const cutY = (PT + (shelf.y + shelf.shelfH) * scale).toFixed(1);
            svg += `<line x1="${PL}" y1="${cutY}" x2="${(PL + canvasW).toFixed(1)}" y2="${cutY}" `
                 + `stroke="#2980b9" stroke-width="1.5" stroke-dasharray="5,3"/>`;
            svg += `<text x="${(PL + canvasW + 4).toFixed(1)}" y="${(parseFloat(cutY) + 4).toFixed(1)}" `
                 + `font-size="9" fill="#2980b9" font-weight="bold">H${si + 1}</text>`;
        }

        // ── Vertical cut lines between pieces (red dashed) ────────────────
        let vx = 0;
        shelf.pieces.forEach((p, pi) => {
            vx += p.w;
            if (pi < shelf.pieces.length - 1) {
                const vcx = (PL + vx * scale).toFixed(1);
                svg += `<line x1="${vcx}" y1="${sy.toFixed(1)}" x2="${vcx}" y2="${(sy + sh).toFixed(1)}" `
                     + `stroke="#e74c3c" stroke-width="1" stroke-dasharray="3,2"/>`;
            }
        });
    });

    // ── Roll length boundaries (dashed red, only when multiple rolls) ──────
    for (let rn = 1; rn < layout.rollsNeeded; rn++) {
        const boundY = (PT + rollLen * rn * scale).toFixed(1);
        svg += `<line x1="${PL}" y1="${boundY}" x2="${(PL + canvasW).toFixed(1)}" y2="${boundY}" `
             + `stroke="#c0392b" stroke-width="2" stroke-dasharray="8,4"/>`;
        svg += `<text x="${(PL + 4).toFixed(1)}" y="${(parseFloat(boundY) - 3).toFixed(1)}" `
             + `font-size="9" fill="#c0392b" font-weight="bold">↑ Roll ${rn} ends | Roll ${rn + 1} starts ↓</text>`;
    }

    // ── Dimension annotations ──────────────────────────────────────────────
    // Roll width label at top-centre
    svg += `<text x="${(PL + canvasW / 2).toFixed(1)}" y="${(PT - 4).toFixed(1)}" `
         + `text-anchor="middle" font-size="10" fill="#6c3483" font-weight="bold">`
         + `${rollW}" wide</text>`;

    // Scale + linear length annotation at bottom
    svg += `<text x="${PL}" y="${(PT + canvasH + 16).toFixed(1)}" `
         + `font-size="9" fill="#6c3483">`
         + `Scale: ${scale.toFixed(1)} px/in (proportional) `
         + `| Linear used: ${totalLen.toFixed(1)}" (${(totalLen / 12).toFixed(2)} ft)`
         + `</text>`;

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

    // ── Mosquito Net Section (2D FFDH with rotation) ──────────────────────────
    const netLayout = r.netResults;
    if (netLayout) {
        const roll            = netLayout.roll;
        const rollsNeeded     = netLayout.rollsNeeded;
        const totalLen        = netLayout.totalLength;
        const eff             = netLayout.efficiency;           // based on linear area consumed
        const piecesAreaSqft  = (netLayout.piecesArea  / 144).toFixed(2);
        const linearAreaSqft  = (netLayout.linearArea  / 144).toFixed(2);  // width × totalLength
        const wasteAreaSqft   = (netLayout.wasteArea   / 144).toFixed(2);  // linearArea - piecesArea
        const rollCost        = rollsNeeded * (roll.costPerRoll || 0);

        html += `<div class="material-section" style="border-left:4px solid #8e44ad;margin-top:24px;">
            <h3 style="margin:0 0 4px 0;color:#6c3483;">🕸️ Mosquito Net Cutting Plan</h3>
            <p style="font-size:13px;color:#555;margin:0 0 14px 0;">
                2D optimized layout — pieces mixed across all windows, rotation allowed for minimum waste.
                Piece sizes are after deducting 2" from each shutter frame dimension.
            </p>`;

        // ── Stat cards ───────────────────────────────────────────────────────
        const CS = 'background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:10px 16px;flex:1;min-width:110px;text-align:center;';
        const effColor = eff >= 80 ? '#2e7d32' : eff >= 55 ? '#e65100' : '#c62828';
        html += `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Best Roll</div>
                <div style="font-size:16px;font-weight:700;color:#4a0072;">${roll.name}</div>
            </div>
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Rolls to Order</div>
                <div style="font-size:16px;font-weight:700;color:#4a0072;">${rollsNeeded}</div>
            </div>
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Net Area</div>
                <div style="font-size:16px;font-weight:700;color:#4a0072;">${piecesAreaSqft} sqft</div>
            </div>
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Consumed Area</div>
                <div style="font-size:16px;font-weight:700;color:#4a0072;">${linearAreaSqft} sqft</div>
            </div>
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Cut Efficiency</div>
                <div style="font-size:16px;font-weight:700;color:${effColor};">${eff}%</div>
                <div style="font-size:10px;color:#888;margin-top:2px;">of consumed length</div>
            </div>
            ${rollCost > 0 ? `<div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Net Cost</div>
                <div style="font-size:16px;font-weight:700;color:#4a0072;">₹${rollCost.toFixed(0)}</div>
            </div>` : ''}
        </div>`;

        // ── Order summary block ──────────────────────────────────────────────
        html += `<div style="background:#ede7f6;border-radius:8px;padding:11px 14px;margin-bottom:16px;font-size:13px;line-height:2;">
            <strong style="color:#4a0072;">📦 Order Summary:</strong>
            <strong>${rollsNeeded}</strong> roll${rollsNeeded > 1 ? 's' : ''} of
            <strong>${roll.name}</strong>
            (${roll.width}" wide × ${(roll.length / 12).toFixed(0)}ft long each)
            &nbsp;|&nbsp; Linear cut: <strong>${totalLen.toFixed(1)}"</strong> (${(totalLen / 12).toFixed(2)} ft)
            &nbsp;|&nbsp; Area consumed: <strong>${linearAreaSqft} sqft</strong>
            <span style="font-size:11px;color:#6c3483;">(= ${roll.width}" × ${totalLen.toFixed(1)}", leftover stored &amp; reused)</span>
            &nbsp;|&nbsp; Waste in cut: <strong>${wasteAreaSqft} sqft</strong>
            ${rollsNeeded > 1 ? `<br><em style="color:#880e4f;">⚠️ Layout spans ${rollsNeeded} rolls — continue cut on next roll after ${(roll.length / 12).toFixed(0)} ft.</em>` : ''}
        </div>`;

        // ── Piece summary table (grouped by window label) ────────────────────
        const pieceSummary = {};
        netLayout.shelves.forEach((shelf, si) => {
            shelf.pieces.forEach(p => {
                const key = `${p.label}|${p.origW}|${p.origH}`;
                if (!pieceSummary[key]) {
                    pieceSummary[key] = { label: p.label, origW: p.origW, origH: p.origH,
                                         qty: 0, rotatedCount: 0, rows: [] };
                }
                pieceSummary[key].qty++;
                if (p.rotated) pieceSummary[key].rotatedCount++;
                pieceSummary[key].rows.push(si + 1);
            });
        });

        html += `<strong style="font-size:13px;color:#6c3483;">🧩 Pieces Required</strong>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0 16px 0;">
            <thead><tr style="background:#8e44ad;color:white;">
                <th style="padding:6px 10px;text-align:left;">Window / Label</th>
                <th style="padding:6px 10px;text-align:center;">Net Size (W×H)</th>
                <th style="padding:6px 10px;text-align:center;">Qty</th>
                <th style="padding:6px 10px;text-align:center;">Placed As</th>
                <th style="padding:6px 10px;text-align:center;">In Row(s)</th>
            </tr></thead><tbody>`;

        let psi = 0;
        for (const [, ps] of Object.entries(pieceSummary)) {
            const rowBg = psi++ % 2 === 0 ? '#faf5ff' : 'white';
            const placedDesc = ps.rotatedCount === ps.qty
                ? `${ps.origH.toFixed(2)}"×${ps.origW.toFixed(2)}" ↺`
                : ps.rotatedCount === 0
                ? `${ps.origW.toFixed(2)}"×${ps.origH.toFixed(2)}"`
                : `Mixed (some rotated ↺)`;
            const uniqueRows = [...new Set(ps.rows)].sort((a, b) => a - b).join(', ');
            html += `<tr style="background:${rowBg};border-bottom:1px solid #e8d5f0;">
                <td style="padding:6px 10px;font-weight:600;color:#4a0072;">${ps.label}</td>
                <td style="padding:6px 10px;text-align:center;">${ps.origW.toFixed(2)}" × ${ps.origH.toFixed(2)}"</td>
                <td style="padding:6px 10px;text-align:center;font-weight:700;">${ps.qty}</td>
                <td style="padding:6px 10px;text-align:center;color:${ps.rotatedCount > 0 ? '#e65100' : '#2e7d32'};">${placedDesc}</td>
                <td style="padding:6px 10px;text-align:center;color:#555;">Row ${uniqueRows}</td>
            </tr>`;
        }
        html += '</tbody></table>';

        // ── Row-by-row cutting instructions ──────────────────────────────────
        html += `<strong style="font-size:13px;color:#6c3483;">✂️ Row-by-Row Cutting Instructions</strong>
        <div style="margin:8px 0 16px 0;">`;
        netLayout.shelves.forEach((shelf, si) => {
            const y1 = shelf.y.toFixed(2);
            const y2 = (shelf.y + shelf.shelfH).toFixed(2);
            const usedW = shelf.pieces.reduce((s, p) => s + p.w, 0).toFixed(2);
            const piecesDesc = shelf.pieces.map(p => {
                const short = p.label.split(/[\s(]/)[0];
                return `<strong>${short}</strong>: ${p.w.toFixed(2)}"×${p.h.toFixed(2)}"${p.rotated ? ' <span style="color:#e65100">↺</span>' : ''}`;
            }).join(' &nbsp;|&nbsp; ');
            html += `<div style="background:#faf5ff;border:1px solid #e1bee7;border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:12px;line-height:1.9;">
                <strong style="color:#6c3483;">Row ${si + 1}</strong>
                &nbsp; Cut: <strong>${y1}"</strong> → <strong>${y2}"</strong>
                &nbsp; (row height = ${shelf.shelfH.toFixed(2)}", width used = ${usedW}")
                &nbsp;&nbsp; ${piecesDesc}
            </div>`;
        });
        html += '</div>';

        // ── 2D layout diagram ─────────────────────────────────────────────────
        html += `<strong style="font-size:13px;color:#6c3483;">📐 2D Layout Diagram</strong>
        <div style="font-size:11px;color:#777;margin:4px 0 6px 0;">
            <span style="display:inline-block;width:18px;height:3px;background:#2980b9;vertical-align:middle;"></span> Horizontal cuts
            &nbsp;
            <span style="display:inline-block;width:18px;height:3px;background:#e74c3c;vertical-align:middle;"></span> Vertical cuts
            &nbsp;
            <span style="display:inline-block;width:14px;height:10px;background:repeating-linear-gradient(135deg,#c8a8e0 0 2px,transparent 2px 6px);vertical-align:middle;border:1px solid #c8a8e0;"></span> Waste
            &nbsp;
            ↺ Rotated piece
        </div>
        <div style="overflow:auto;max-height:580px;border:1px solid #e1bee7;border-radius:6px;padding:8px;background:#fefefe;">
            ${generateNetDiagramFFDH(netLayout)}
        </div>`;

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
