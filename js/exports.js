// Niruma Aluminum Profile Optimizer - Export & Display Functions

// ============================================================================
// NET CUTTING VISUAL DIAGRAM  (2D FFDH — uniform proportional scale, per bin)
// ============================================================================

// Per-label color cache so the same window keeps the same color across bins
function _netLabelColor(label, cache) {
    if (cache[label]) return cache[label];
    const PALETTE = [
        '#9b59b6','#2980b9','#27ae60','#e67e22',
        '#e74c3c','#16a085','#d35400','#1a237e',
        '#880e4f','#006064','#33691e','#4a148c'
    ];
    const idx = Object.keys(cache).length;
    cache[label] = PALETTE[idx % PALETTE.length];
    return cache[label];
}

/**
 * Generate a proportionally-correct SVG for ONE bin (store partial or new roll).
 * Uses uniform px/inch scale for both axes.
 *
 * @param {Object} bin         {kind, label, width, capacityLength, usedLength, shelves}
 * @param {Object} labelColorCache  shared across bins so colors stay consistent
 */
function generateNetDiagramBin(bin, labelColorCache) {
    if (!bin || !bin.shelves || bin.shelves.length === 0) {
        return '<em style="color:#999;font-size:12px;">No pieces in this bin</em>';
    }

    const rollW    = bin.width;
    const totalLen = bin.capacityLength;   // draw full bin so leftover is visible
    const usedLen  = bin.usedLength;

    const isStore = bin.kind === 'store';
    const borderColor   = isStore ? '#27ae60' : '#8e44ad';
    const bgFill        = isStore ? '#f1f8f4' : '#f5f0ff';
    const labelTextCol  = isStore ? '#1b5e20' : '#6c3483';

    // Uniform scale: same px/inch for BOTH axes
    const scale = Math.min(530 / rollW, 14);

    const PT = 18;
    const PL = 4;
    const PR = 46;
    const PB = 22;

    const canvasW = rollW    * scale;
    const canvasH = totalLen * scale;
    const svgW    = Math.ceil(canvasW + PL + PR);
    const svgH    = Math.ceil(canvasH + PT + PB);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" `
            + `width="${svgW}" height="${svgH}" `
            + `style="display:block;margin:6px 0;font-family:sans-serif;">`;

    // Hatch pattern (unique id per bin kind to avoid SVG id collision)
    const hatchId = isStore ? 'netHatchStore' : 'netHatchNew';
    const hatchColor = isStore ? '#a5d6a7' : '#c8a8e0';
    svg += `<defs>
        <pattern id="${hatchId}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="${hatchColor}" stroke-width="1.5"/>
        </pattern>
    </defs>`;

    // Bin background (full capacity length shown; unused tail visible as leftover)
    svg += `<rect x="${PL}" y="${PT}" `
         + `width="${canvasW.toFixed(1)}" height="${canvasH.toFixed(1)}" `
         + `fill="${bgFill}" stroke="${borderColor}" stroke-width="1.5"/>`;

    // Draw shelves (only within usedLength)
    bin.shelves.forEach((shelf, si) => {
        const sy = PT + shelf.y * scale;
        const sh = shelf.shelfH * scale;

        // Shelf-wide hatch (cutting waste between pieces & right of last piece)
        svg += `<rect x="${PL}" y="${sy.toFixed(1)}" `
             + `width="${canvasW.toFixed(1)}" height="${sh.toFixed(1)}" `
             + `fill="url(#${hatchId})" opacity="0.35"/>`;

        shelf.pieces.forEach(p => {
            const px = PL + p.x * scale;
            const py = sy;
            const pw = p.w * scale;
            const ph = p.h * scale;
            const col = _netLabelColor(p.label, labelColorCache);
            const shortLbl = p.label.split(/[\s(]/)[0];

            svg += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" `
                 + `width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" `
                 + `fill="${col}" opacity="0.85" stroke="white" stroke-width="1.2"/>`;

            if (pw >= 20 && ph >= 14) {
                const cx = (px + pw / 2).toFixed(1);
                if (ph >= 30) {
                    svg += `<text x="${cx}" y="${(py + ph/2 - 5).toFixed(1)}" `
                         + `text-anchor="middle" font-size="9" fill="white" font-weight="bold">`
                         + `${shortLbl}</text>`;
                    svg += `<text x="${cx}" y="${(py + ph/2 + 6).toFixed(1)}" `
                         + `text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.92)">`
                         + `${p.w.toFixed(1)}"×${p.h.toFixed(1)}"${p.rotated ? ' ↺' : ''}</text>`;
                } else {
                    svg += `<text x="${cx}" y="${(py + ph/2 + 3).toFixed(1)}" `
                         + `text-anchor="middle" font-size="8" fill="white" font-weight="bold">`
                         + `${shortLbl}${p.rotated ? ' ↺' : ''}</text>`;
                }
            }
        });

        // Horizontal cut line at bottom of shelf
        if (si < bin.shelves.length - 1) {
            const cutY = (PT + (shelf.y + shelf.shelfH) * scale).toFixed(1);
            svg += `<line x1="${PL}" y1="${cutY}" x2="${(PL + canvasW).toFixed(1)}" y2="${cutY}" `
                 + `stroke="#2980b9" stroke-width="1.5" stroke-dasharray="5,3"/>`;
            svg += `<text x="${(PL + canvasW + 4).toFixed(1)}" y="${(parseFloat(cutY) + 4).toFixed(1)}" `
                 + `font-size="9" fill="#2980b9" font-weight="bold">H${si + 1}</text>`;
        }

        // Vertical cut lines between pieces
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

    // Unused leftover region at bottom (between usedLength and capacityLength)
    if (totalLen - usedLen > 0.5) {
        const ly = (PT + usedLen * scale).toFixed(1);
        const lh = ((totalLen - usedLen) * scale).toFixed(1);
        // Cross-hatch pattern for "available for next project"
        svg += `<rect x="${PL}" y="${ly}" `
             + `width="${canvasW.toFixed(1)}" height="${lh}" `
             + `fill="rgba(255,255,255,0.5)" stroke="${borderColor}" stroke-width="0.8" stroke-dasharray="4,3"/>`;
        // "leftover" label centred in the region (if room)
        const lTextY = (parseFloat(ly) + parseFloat(lh) / 2).toFixed(1);
        if (parseFloat(lh) > 24) {
            svg += `<text x="${(PL + canvasW / 2).toFixed(1)}" y="${lTextY}" `
                 + `text-anchor="middle" font-size="11" fill="${labelTextCol}" font-style="italic">`
                 + `↓ Leftover ${(totalLen - usedLen).toFixed(1)}" — keep for next project ↓</text>`;
        }
        // Cut line at usedLength
        svg += `<line x1="${PL}" y1="${ly}" x2="${(PL + canvasW).toFixed(1)}" y2="${ly}" `
             + `stroke="${borderColor}" stroke-width="2" stroke-dasharray="6,3"/>`;
    }

    // Roll width label at top
    svg += `<text x="${(PL + canvasW / 2).toFixed(1)}" y="${(PT - 4).toFixed(1)}" `
         + `text-anchor="middle" font-size="10" fill="${labelTextCol}" font-weight="bold">`
         + `${rollW}" wide × ${totalLen.toFixed(1)}" long (${(totalLen/12).toFixed(2)} ft)</text>`;

    // Bottom annotation
    svg += `<text x="${PL}" y="${(PT + canvasH + 16).toFixed(1)}" `
         + `font-size="9" fill="${labelTextCol}">`
         + `Scale: ${scale.toFixed(1)} px/in (proportional) `
         + `| Used: ${usedLen.toFixed(1)}" of ${totalLen.toFixed(1)}" `
         + `| Leftover: ${(totalLen - usedLen).toFixed(1)}"`
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

    // ── Mosquito Net Section (2D FFDH with rotation + multi-bin partial rolls) ─
    const netLayout = r.netResults;
    if (netLayout && netLayout.bins && netLayout.bins.length > 0) {
        const roll            = netLayout.roll;          // new-roll spec used for cost
        const newRollsUsed    = netLayout.newRollsUsed;
        const storeRollsUsed  = netLayout.storeRollsUsed;
        const totalLen        = netLayout.totalLength;
        const eff             = netLayout.efficiency;
        const piecesAreaSqft  = (netLayout.piecesArea  / 144).toFixed(2);
        const linearAreaSqft  = (netLayout.linearArea  / 144).toFixed(2);
        const wasteAreaSqft   = (netLayout.wasteArea   / 144).toFixed(2);
        const newCost         = netLayout.cost;

        html += `<div class="material-section" style="border-left:4px solid #8e44ad;margin-top:24px;">
            <h3 style="margin:0 0 4px 0;color:#6c3483;">🕸️ Mosquito Net Cutting Plan</h3>
            <p style="font-size:13px;color:#555;margin:0 0 14px 0;">
                2D optimized layout — partial rolls from store used first (smallest leftover first), new rolls only as needed.
                Piece sizes are after deducting 2" from each shutter frame dimension.
            </p>`;

        // ── Stat cards ───────────────────────────────────────────────────────
        const CS = 'background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:10px 16px;flex:1;min-width:110px;text-align:center;';
        const CS_GREEN = 'background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:10px 16px;flex:1;min-width:110px;text-align:center;';
        const effColor = eff >= 80 ? '#2e7d32' : eff >= 55 ? '#e65100' : '#c62828';
        // Build "Best Roll Width" label — handle mixed-width case
        const widthsUsedSet = new Set(netLayout.bins.map(b => b.width));
        const widthsUsedArr = [...widthsUsedSet].sort((a, b) => a - b);
        const widthLabel = netLayout.mixed
            ? widthsUsedArr.map(w => `${w}"`).join(' + ') + ' (mixed)'
            : roll.name;

        html += `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">${netLayout.mixed ? 'Roll Widths (mixed)' : 'Best Roll Width'}</div>
                <div style="font-size:16px;font-weight:700;color:#4a0072;">${widthLabel}</div>
            </div>
            ${storeRollsUsed > 0 ? `<div style="${CS_GREEN}">
                <div style="font-size:11px;color:#1b5e20;margin-bottom:3px;">From Stock</div>
                <div style="font-size:16px;font-weight:700;color:#1b5e20;">${storeRollsUsed} partial${storeRollsUsed>1?'s':''}</div>
            </div>` : ''}
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Order New</div>
                <div style="font-size:16px;font-weight:700;color:${newRollsUsed>0?'#4a0072':'#2e7d32'};">${newRollsUsed} roll${newRollsUsed!==1?'s':''}</div>
            </div>
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Net Area</div>
                <div style="font-size:16px;font-weight:700;color:#4a0072;">${piecesAreaSqft} sqft</div>
            </div>
            <div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">Cut Efficiency</div>
                <div style="font-size:16px;font-weight:700;color:${effColor};">${eff}%</div>
                <div style="font-size:10px;color:#888;margin-top:2px;">of consumed length</div>
            </div>
            ${newCost > 0 ? `<div style="${CS}">
                <div style="font-size:11px;color:#6c3483;margin-bottom:3px;">New Roll Cost</div>
                <div style="font-size:16px;font-weight:700;color:#4a0072;">₹${newCost.toFixed(0)}</div>
            </div>` : ''}
        </div>`;

        // ── Order summary block ──────────────────────────────────────────────
        // Group new rolls by width (for mixed-width orders)
        const newRollsByWidth = {};
        netLayout.bins.filter(b => b.kind === 'new').forEach(b => {
            newRollsByWidth[b.width] = (newRollsByWidth[b.width] || 0) + 1;
        });
        const orderActions = [];
        if (storeRollsUsed > 0) orderActions.push(`<strong style="color:#1b5e20;">Use ${storeRollsUsed} from stock</strong>`);
        if (newRollsUsed > 0) {
            const parts = Object.entries(newRollsByWidth).map(([w, cnt]) =>
                `${cnt} new roll${cnt>1?'s':''} of ${w}"`).join(' + ');
            orderActions.push(`<strong style="color:#6c3483;">Order ${parts}</strong>`);
        }
        html += `<div style="background:#ede7f6;border-radius:8px;padding:11px 14px;margin-bottom:16px;font-size:13px;line-height:2;">
            <strong style="color:#4a0072;">📦 Order Summary:</strong>
            ${orderActions.join(' &nbsp;+&nbsp; ') || `<em>${newRollsUsed} rolls needed</em>`}
            ${netLayout.mixed ? `<span style="background:#ffa000;color:white;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px;">MIXED WIDTHS</span>` : ''}
            <br>
            <span style="font-size:12px;color:#555;">
                Total linear cut: <strong>${totalLen.toFixed(1)}"</strong> (${(totalLen/12).toFixed(2)} ft)
                &nbsp;|&nbsp; Area consumed: <strong>${linearAreaSqft} sqft</strong>
                &nbsp;|&nbsp; Cut waste: <strong>${wasteAreaSqft} sqft</strong>
                ${newRollsUsed > 0 ? `&nbsp;|&nbsp; New roll cost: <strong>₹${newCost.toFixed(0)}</strong>` : ''}
            </span>
        </div>`;

        // ── Piece summary table (grouped by window label across ALL bins) ────
        const pieceSummary = {};
        netLayout.bins.forEach(bin => {
            bin.shelves.forEach(shelf => {
                shelf.pieces.forEach(p => {
                    const key = `${p.label}|${p.origW}|${p.origH}`;
                    if (!pieceSummary[key]) {
                        pieceSummary[key] = { label: p.label, origW: p.origW, origH: p.origH,
                                             qty: 0, rotatedCount: 0, bins: new Set() };
                    }
                    pieceSummary[key].qty++;
                    if (p.rotated) pieceSummary[key].rotatedCount++;
                    pieceSummary[key].bins.add(bin.label);
                });
            });
        });

        html += `<strong style="font-size:13px;color:#6c3483;">🧩 Pieces Required</strong>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0 16px 0;">
            <thead><tr style="background:#8e44ad;color:white;">
                <th style="padding:6px 10px;text-align:left;">Window / Label</th>
                <th style="padding:6px 10px;text-align:center;">Net Size (W×H)</th>
                <th style="padding:6px 10px;text-align:center;">Qty</th>
                <th style="padding:6px 10px;text-align:center;">Placed As</th>
                <th style="padding:6px 10px;text-align:left;">Cut From</th>
            </tr></thead><tbody>`;

        let psi = 0;
        for (const [, ps] of Object.entries(pieceSummary)) {
            const rowBg = psi++ % 2 === 0 ? '#faf5ff' : 'white';
            const placedDesc = ps.rotatedCount === ps.qty
                ? `${ps.origH.toFixed(2)}"×${ps.origW.toFixed(2)}" ↺`
                : ps.rotatedCount === 0
                ? `${ps.origW.toFixed(2)}"×${ps.origH.toFixed(2)}"`
                : `Mixed (some rotated ↺)`;
            const binsList = [...ps.bins].join(', ');
            html += `<tr style="background:${rowBg};border-bottom:1px solid #e8d5f0;">
                <td style="padding:6px 10px;font-weight:600;color:#4a0072;">${ps.label}</td>
                <td style="padding:6px 10px;text-align:center;">${ps.origW.toFixed(2)}" × ${ps.origH.toFixed(2)}"</td>
                <td style="padding:6px 10px;text-align:center;font-weight:700;">${ps.qty}</td>
                <td style="padding:6px 10px;text-align:center;color:${ps.rotatedCount > 0 ? '#e65100' : '#2e7d32'};">${placedDesc}</td>
                <td style="padding:6px 10px;color:#555;">${binsList}</td>
            </tr>`;
        }
        html += '</tbody></table>';

        // ── Per-bin cutting instructions + diagram ───────────────────────────
        html += `<strong style="font-size:13px;color:#6c3483;">📐 Roll-by-Roll Cutting Layout</strong>
        <div style="font-size:11px;color:#777;margin:4px 0 10px 0;">
            <span style="display:inline-block;width:18px;height:10px;background:#f1f8f4;border:1.5px solid #27ae60;vertical-align:middle;border-radius:2px;"></span> From your stock
            &nbsp;
            <span style="display:inline-block;width:18px;height:10px;background:#f5f0ff;border:1.5px solid #8e44ad;vertical-align:middle;border-radius:2px;"></span> New roll
            &nbsp;
            <span style="display:inline-block;width:18px;height:3px;background:#2980b9;vertical-align:middle;"></span> H-cut
            &nbsp;
            <span style="display:inline-block;width:18px;height:3px;background:#e74c3c;vertical-align:middle;"></span> V-cut
            &nbsp; ↺ Rotated piece
        </div>`;

        const labelColorCache = {};
        netLayout.bins.forEach((bin, bi) => {
            const isStore = bin.kind === 'store';
            const bColor  = isStore ? '#27ae60' : '#8e44ad';
            const bBg     = isStore ? '#f1f8f4' : '#faf5ff';
            const bIcon   = isStore ? '📦' : '🆕';
            const bKindText = isStore ? 'FROM STOCK' : 'NEW ROLL';

            html += `<div style="border:2px solid ${bColor};border-radius:8px;margin-bottom:18px;background:white;overflow:hidden;">
                <div style="background:${bColor};color:white;padding:8px 14px;font-size:13px;font-weight:700;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                    <span>${bIcon} ${bKindText}: ${bin.label}</span>
                    <span style="font-weight:500;font-size:12px;opacity:0.95;">
                        Capacity: ${bin.width}"×${bin.capacityLength.toFixed(1)}"
                        &nbsp;|&nbsp; Used: ${bin.usedLength.toFixed(1)}"
                        &nbsp;|&nbsp; Leftover: ${(bin.capacityLength - bin.usedLength).toFixed(1)}"
                    </span>
                </div>
                <div style="padding:12px 14px;background:${bBg};">`;

            // Row-by-row cutting instructions for THIS bin
            bin.shelves.forEach((shelf, si) => {
                const y1 = shelf.y.toFixed(2);
                const y2 = (shelf.y + shelf.shelfH).toFixed(2);
                const usedW = shelf.pieces.reduce((s, p) => s + p.w, 0).toFixed(2);
                const piecesDesc = shelf.pieces.map(p => {
                    const short = p.label.split(/[\s(]/)[0];
                    return `<strong>${short}</strong>: ${p.w.toFixed(2)}"×${p.h.toFixed(2)}"${p.rotated ? ' <span style="color:#e65100">↺</span>' : ''}`;
                }).join(' &nbsp;|&nbsp; ');
                html += `<div style="background:white;border:1px solid ${isStore?'#c8e6c9':'#e1bee7'};border-radius:6px;padding:7px 11px;margin-bottom:5px;font-size:12px;line-height:1.9;">
                    <strong style="color:${isStore?'#1b5e20':'#6c3483'};">Row ${si + 1}</strong>
                    &nbsp; Cut: <strong>${y1}"</strong> → <strong>${y2}"</strong>
                    &nbsp; (height ${shelf.shelfH.toFixed(2)}", width used ${usedW}")
                    &nbsp;&nbsp; ${piecesDesc}
                </div>`;
            });

            // Diagram for this bin
            html += `<div style="margin-top:10px;overflow:auto;max-height:480px;border:1px solid ${isStore?'#c8e6c9':'#e1bee7'};border-radius:6px;padding:8px;background:white;">
                ${generateNetDiagramBin(bin, labelColorCache)}
            </div>`;

            html += `</div></div>`;  // close bin body & wrapper
        });

        // ── Leftover suggestion ──────────────────────────────────────────────
        if (netLayout.leftover && netLayout.leftover.length > 0) {
            html += `<div style="background:#fff8e1;border-left:4px solid #ffa000;border-radius:6px;padding:11px 14px;margin-top:12px;font-size:13px;line-height:1.9;">
                <strong style="color:#e65100;">💡 Leftover After This Project</strong>
                <span style="font-size:11px;color:#888;">— informational, update your store records manually</span>
                <ul style="margin:6px 0 0 18px;padding:0;">`;
            netLayout.leftover.forEach(lo => {
                const kindIcon = lo.kind === 'new' ? '🆕' : (lo.kind === 'store' ? '📦' : '📦↩️');
                const kindText = lo.kind === 'new' ? 'from newly purchased roll'
                              : (lo.kind === 'store-unused' ? 'unused stock partial (untouched)' : 'stock partial after cuts');
                html += `<li><strong>${kindIcon} ${lo.width}" wide × ${lo.remainingAfter.toFixed(1)}"</strong>
                    <span style="font-size:11px;color:#777;">(${kindText})</span>
                    ${lo.label ? `<span style="font-size:11px;color:#999;">— ${lo.label}</span>` : ''}
                </li>`;
            });
            html += `</ul></div>`;
        }

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
