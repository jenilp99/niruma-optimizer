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
    const fullLen  = bin.capacityLength;   // true capacity
    const usedLen  = bin.usedLength;
    const leftover = fullLen - usedLen;

    // Show only used area + a compact symbolic stub (max 3") instead of the full
    // (often huge) empty tail — a cut-end marker communicates the same info.
    const STUB_IN  = 3.0;
    const drawLen  = leftover > STUB_IN ? usedLen + STUB_IN : fullLen;

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

    const canvasW = rollW   * scale;
    const canvasH = drawLen * scale;       // capped to used + stub
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

    // Bin background (drawn to drawLen, not full capacity)
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

    // ── Cut-end marker + compact leftover stub ──────────────────────────────
    if (leftover > 0.1) {
        const cutY   = (PT + usedLen * scale);
        const stubH  = (drawLen - usedLen) * scale;  // stub zone height in px
        const cutYs  = cutY.toFixed(1);

        // Bold scissors cut-line at usedLen
        svg += `<line x1="${PL}" y1="${cutYs}" x2="${(PL + canvasW).toFixed(1)}" y2="${cutYs}" `
             + `stroke="#e74c3c" stroke-width="2.5" stroke-dasharray="8,4"/>`;

        // Scissors icon + "STORE" text at cut line
        svg += `<text x="${(PL + 4).toFixed(1)}" y="${(cutY - 3).toFixed(1)}" `
             + `font-size="10" fill="#e74c3c" font-weight="bold">✂</text>`;

        // Stub zone: light cross-hatch + "→ store: X" label
        if (stubH > 2) {
            const storeHatchId = isStore ? 'storeStubHatch' : 'newStubHatch';
            svg += `<defs><pattern id="${storeHatchId}" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#bbb" stroke-width="1"/>
            </pattern></defs>`;
            svg += `<rect x="${PL}" y="${cutYs}" `
                 + `width="${canvasW.toFixed(1)}" height="${stubH.toFixed(1)}" `
                 + `fill="url(#${storeHatchId})" opacity="0.4" `
                 + `stroke="#ccc" stroke-width="0.8"/>`;
            const storeLabel = leftover > STUB_IN
                ? `→ store: ${leftover.toFixed(1)}" (${(leftover/12).toFixed(2)} ft)`
                : `→ store: ${leftover.toFixed(1)}"`;
            svg += `<text x="${(PL + canvasW / 2).toFixed(1)}" y="${(cutY + stubH / 2 + 4).toFixed(1)}" `
                 + `text-anchor="middle" font-size="9" fill="#888" font-style="italic">${storeLabel}</text>`;
        }

        // If we cut the display short, show a "⋯" / fade indicator at very bottom
        if (leftover > STUB_IN) {
            const botY = (PT + canvasH).toFixed(1);
            svg += `<text x="${(PL + canvasW / 2).toFixed(1)}" y="${(PT + canvasH - 2).toFixed(1)}" `
                 + `text-anchor="middle" font-size="10" fill="#aaa">▼ ▼ ▼</text>`;
        }
    }

    // Roll width label at top (show true capacity, not capped drawLen)
    svg += `<text x="${(PL + canvasW / 2).toFixed(1)}" y="${(PT - 4).toFixed(1)}" `
         + `text-anchor="middle" font-size="10" fill="${labelTextCol}" font-weight="bold">`
         + `${rollW}" wide × ${fullLen.toFixed(1)}" long (${(fullLen/12).toFixed(2)} ft)</text>`;

    // Bottom annotation
    svg += `<text x="${PL}" y="${(PT + canvasH + 16).toFixed(1)}" `
         + `font-size="9" fill="${labelTextCol}">`
         + `Scale: ${scale.toFixed(1)} px/in `
         + `| Used: ${usedLen.toFixed(1)}" `
         + (leftover > 0.1 ? `| ✂ Store: ${leftover.toFixed(1)}" ` : '')
         + `</text>`;

    svg += '</svg>';
    return svg;
}

// ============================================================================
// WORKSHOP CUTTING BRIEF (profiles + nets + sheets)
// ============================================================================

/**
 * Build a compact, operator-friendly cut brief for the WHOLE project:
 *   • PROFILES  — sticks grouped by identical cut patterns
 *   • NET       — roll-by-roll cuts, grouped by roll width (3' first, then 4', …)
 *   • SHEETS    — sheet-by-sheet cuts for ACP / Bakelite / Particle Board
 * Format matches how fabrication shops hand-write cut lists.
 * All sizes shown in mm (1-decimal precision).
 */
function buildCNCBrief() {
    if (!optimizationResults) return '(No results yet — run optimization first)';
    const r = optimizationResults;
    const today = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });
    const lines = [];
    const SEP = '═'.repeat(60);
    const SUB = '─'.repeat(52);

    lines.push(`WORKSHOP CUTTING BRIEF`);
    lines.push(`Project : ${r.project}`);
    lines.push(`Date    : ${today}`);
    lines.push(`Kerf    : ${(r.config && r.config.kerf) ? r.config.kerf + '"' : '—'}  (all sizes in mm)`);
    lines.push(SEP);

    // ── Summary collector (for grand-total block at the end) ────────────────
    const grand = {
        profileSticks: 0, profilePieces: 0,
        netRolls:     0,  netPieces:    0,
        sheetRolls:   {},  // { 'ACP 4mm': { sheets:X, pieces:Y }, ... }
    };

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 1: PROFILES (aluminium sticks)
    // ════════════════════════════════════════════════════════════════════════
    if (r.results && Object.keys(r.results).length > 0) {
        lines.push('');
        lines.push('████  PROFILES  ████');

        for (const [key, plans] of Object.entries(r.results)) {
            if (!plans || plans.length === 0) continue;
            const stockLen = parseFloat((plans[0].stock || '0').replace('"', ''));
            const stockMM  = (stockLen * 25.4).toFixed(1);

            lines.push('');
            lines.push(`▶  ${key}   [${plans[0].stock} stick = ${stockMM}mm]`);
            lines.push(SUB);

            // Group sticks by ordered cut-length signature (1-decimal mm precision)
            const groups = new Map();
            plans.forEach((plan, idx) => {
                const sig = plan.pieces.map(p => (p.length * 25.4).toFixed(1)).join('|');
                if (!groups.has(sig)) groups.set(sig, { pieces: plan.pieces, stickNums: [] });
                groups.get(sig).stickNums.push(idx + 1);
            });

            let lineNum = 1, groupSticks = 0, groupPieces = 0;
            for (const [, grp] of groups) {
                const cnt = grp.stickNums.length;
                groupSticks += cnt;
                groupPieces += cnt * grp.pieces.length;
                const mmArr    = grp.pieces.map(p => (p.length * 25.4).toFixed(1));
                const sumMM    = grp.pieces.reduce((s, p) => s + p.length * 25.4, 0).toFixed(1);
                const stickRef = cnt > 4
                    ? `Stick #${grp.stickNums[0]}–#${grp.stickNums[cnt - 1]}`
                    : `Stick #${grp.stickNums.join(', #')}`;
                lines.push(`  ${lineNum++}. ${mmArr.join(' + ')}  = ${sumMM}mm   ×${cnt} nos   (${stickRef})`);
            }
            lines.push(`  ──── ${groupSticks} sticks, ${groupPieces} pieces ────`);
            grand.profileSticks += groupSticks;
            grand.profilePieces += groupPieces;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 2: MOSQUITO NET (rolls — grouped by width, smallest first)
    // ════════════════════════════════════════════════════════════════════════
    if (r.netResults && r.netResults.bins && r.netResults.bins.length > 0) {
        lines.push('');
        lines.push('████  MOSQUITO NET  ████');

        // Group bins by roll width
        const binsByWidth = {};
        r.netResults.bins.forEach((bin, idx) => {
            const w = bin.width;
            if (!binsByWidth[w]) binsByWidth[w] = [];
            binsByWidth[w].push({ bin, globalIdx: idx + 1 });
        });

        // Iterate widths in ascending order ("3' first, then 4'")
        const widths = Object.keys(binsByWidth).map(Number).sort((a, b) => a - b);
        for (const w of widths) {
            const rollsHere = binsByWidth[w];
            const wMM = (w * 25.4).toFixed(1);
            const ftLabel = (w % 12 === 0) ? `${w/12}'` : `${w}"`;

            lines.push('');
            lines.push(`▣  ${ftLabel} Roll  (${wMM}mm wide)  —  ${rollsHere.length} roll${rollsHere.length>1?'s':''}`);

            rollsHere.forEach((entry, localIdx) => {
                const bin = entry.bin;
                const isStore = bin.kind === 'store';
                const srcTag  = isStore ? `[FROM STOCK: ${bin.label}]` : `[NEW]`;
                const lenMM   = (bin.capacityLength * 25.4).toFixed(1);
                const usedMM  = (bin.usedLength * 25.4).toFixed(1);
                const leftMM  = ((bin.capacityLength - bin.usedLength) * 25.4).toFixed(1);

                lines.push('');
                lines.push(`▶  Roll #${entry.globalIdx} ${srcTag}   (${wMM}mm × ${lenMM}mm)`);
                lines.push(SUB);

                bin.shelves.forEach((shelf, si) => {
                    const y1 = (shelf.y * 25.4).toFixed(1);
                    const y2 = ((shelf.y + shelf.shelfH) * 25.4).toFixed(1);
                    const shH = (shelf.shelfH * 25.4).toFixed(1);
                    lines.push(`  Row ${si + 1} — cut at ${y1} → ${y2}mm  (height ${shH}mm):`);
                    shelf.pieces.forEach(p => {
                        const pW = (p.w * 25.4).toFixed(1);
                        const pH = (p.h * 25.4).toFixed(1);
                        const rot = p.rotated ? '  ↺ rotated' : '';
                        const short = (p.label || '').split(/[\s(]/)[0];
                        lines.push(`     • ${pW} × ${pH} mm     ${short}${rot}`);
                    });
                    grand.netPieces += shelf.pieces.length;
                });

                lines.push(`  Used: ${usedMM}mm  |  Leftover: ${leftMM}mm → store`);
                grand.netRolls++;
            });
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 3: PARTITION SHEETS (ACP / Bakelite / Particle Board)
    // ════════════════════════════════════════════════════════════════════════
    if (r.sheetResults && r.sheetResults.byGroup && Object.keys(r.sheetResults.byGroup).length > 0) {
        lines.push('');
        lines.push('████  PARTITION SHEETS  ████');

        const MAT_TITLE = { ACP: 'ACP', Bakelite: 'Bakelite', ParticleBoard: 'Particle Board' };
        for (const [groupKey, gr] of Object.entries(r.sheetResults.byGroup)) {
            const matTitle = MAT_TITLE[gr.material] || gr.material;

            // v1.23: per-size breakdown when mixed sizes used
            const breakdown = gr.newSheetsBreakdown || { [gr.sheetName]: gr.newSheetsUsed };
            const breakdownEntries = Object.entries(breakdown).filter(([, n]) => n > 0);
            const isMixed = breakdownEntries.length > 1;
            const breakdownStr = breakdownEntries.map(([nm, n]) => `${n} × ${nm}`).join(' + ');
            const headerSheets = isMixed
                ? `${breakdownStr}  (mixed)`
                : `${gr.bins.length} × ${gr.sheetName}`;

            lines.push('');
            lines.push(`▣  ${matTitle} ${gr.thickness}  —  ${headerSheets}`);

            let sumPieces = 0;
            gr.bins.forEach((bin, idx) => {
                const isStore = bin.kind === 'store';
                const srcTag  = isStore ? `[FROM STOCK: ${bin.label}]` : `[NEW]`;
                const wMM   = (bin.width * 25.4).toFixed(1);
                const lMM   = (bin.capacityLength * 25.4).toFixed(1);
                const uMM   = (bin.usedLength * 25.4).toFixed(1);
                const leftMM= ((bin.capacityLength - bin.usedLength) * 25.4).toFixed(1);

                lines.push('');
                lines.push(`▶  Sheet #${idx + 1} ${srcTag}   (${wMM} × ${lMM} mm)`);
                lines.push(SUB);

                bin.shelves.forEach((shelf, si) => {
                    const y1 = (shelf.y * 25.4).toFixed(1);
                    const y2 = ((shelf.y + shelf.shelfH) * 25.4).toFixed(1);
                    const shH = (shelf.shelfH * 25.4).toFixed(1);
                    lines.push(`  Row ${si + 1} — cut at ${y1} → ${y2}mm  (height ${shH}mm):`);
                    shelf.pieces.forEach(p => {
                        const pW = (p.w * 25.4).toFixed(1);
                        const pH = (p.h * 25.4).toFixed(1);
                        const rot = p.rotated ? '  ↺ rotated' : '';
                        lines.push(`     • ${pW} × ${pH} mm     ${p.label}${rot}`);
                    });
                    sumPieces += shelf.pieces.length;
                });

                lines.push(`  Used: ${uMM}mm  |  Leftover: ${leftMM}mm → store`);
            });

            const labelKey = `${matTitle} ${gr.thickness}`;
            grand.sheetRolls[labelKey] = {
                sheets: gr.bins.length,
                pieces: sumPieces,
                sheetName: isMixed ? breakdownStr : gr.sheetName
            };
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // GRAND TOTALS
    // ════════════════════════════════════════════════════════════════════════
    lines.push('');
    lines.push(SEP);
    lines.push(`GRAND TOTALS`);
    if (grand.profileSticks > 0)
        lines.push(`  Profiles      : ${grand.profileSticks} sticks, ${grand.profilePieces} pieces`);
    if (grand.netRolls > 0)
        lines.push(`  Mosquito Net  : ${grand.netRolls} rolls, ${grand.netPieces} pieces`);
    for (const [matLabel, info] of Object.entries(grand.sheetRolls)) {
        lines.push(`  ${matLabel.padEnd(14)}: ${info.sheets} sheets (${info.sheetName}), ${info.pieces} pieces`);
    }
    if (r.stats) {
        lines.push(SEP);
        lines.push(`Profile Used    : ${r.stats.totalUsed}"`);
        lines.push(`Profile Waste   : ${r.stats.totalWaste}"`);
        lines.push(`Profile Eff     : ${r.stats.efficiency}%`);
        lines.push(`Profile Cost    : ₹${r.stats.totalCost}`);
    }
    return lines.join('\n');
}

function showCNCBrief() {
    const text = buildCNCBrief();
    document.getElementById('cncBriefText').value = text;
    document.getElementById('cncBriefModal').style.display = 'flex';
}

function closeCNCBriefModal() {
    document.getElementById('cncBriefModal').style.display = 'none';
}

function shareViaWhatsApp_CNC() {
    const text = document.getElementById('cncBriefText').value;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function copyCNCBrief() {
    const ta = document.getElementById('cncBriefText');
    ta.select();
    ta.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy');
        const btn = document.getElementById('copyCNCBtn');
        const orig = btn.textContent;
        btn.textContent = '✅ Copied!';
        btn.style.background = '#2e7d32';
        setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 2000);
    } catch (e) { alert('Copy failed — please select all text and copy manually.'); }
}

// ── PDF export — monospace, paginated, A4 portrait ─────────────────────────
function exportCuttingBriefPDF() {
    if (!optimizationResults) { showAlert('⚠️ No results to export!'); return; }
    const text = buildCNCBrief();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 28;
    const marginTop = 28;
    const marginBottom = 30;
    const lineH = 10.5;

    // Title bar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Workshop Cutting Brief — ${optimizationResults.project || ''}`, marginX, marginTop + 2);

    // Body in courier (monospace) so the alignment from buildCNCBrief is preserved
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);

    let y = marginTop + 20;
    const lines = text.split('\n');
    for (const line of lines) {
        // Section banners get extra visual weight
        if (line.startsWith('████')) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            if (y + 16 > pageH - marginBottom) { doc.addPage(); y = marginTop; }
            doc.setFillColor(245, 245, 245);
            doc.rect(marginX - 4, y - 9, pageW - 2*(marginX - 4), 13, 'F');
            doc.text(line.replace(/█/g, '').trim(), marginX, y);
            y += 16;
            doc.setFont('courier', 'normal');
            doc.setFontSize(8);
            continue;
        }
        // ▶ rows get bold for scannability
        const isHead = /^▶/.test(line) || /^▣/.test(line);
        if (isHead) doc.setFont('courier', 'bold');

        if (y + lineH > pageH - marginBottom) {
            doc.addPage();
            y = marginTop;
        }
        doc.text(line, marginX, y);
        y += lineH;

        if (isHead) doc.setFont('courier', 'normal');
    }

    // Footer page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        doc.text(`Page ${p} / ${totalPages}`, pageW - marginX, pageH - 12, { align: 'right' });
    }

    doc.save(`${optimizationResults.project || 'Project'}_Cutting_Brief.pdf`);
}

// ── Excel export — sheet per category, structured rows ─────────────────────
function exportCuttingBriefExcel() {
    if (!optimizationResults) { showAlert('⚠️ No results to export!'); return; }
    const r = optimizationResults;
    const wb = XLSX.utils.book_new();

    // Helper: a fat title row
    const hdrRow = label => [label];

    // ── Sheet 1: Profiles ──────────────────────────────────────────────────
    if (r.results && Object.keys(r.results).length > 0) {
        const rows = [];
        rows.push(['WORKSHOP CUT BRIEF — PROFILES']);
        rows.push(['Project', r.project]);
        rows.push(['Date', new Date().toLocaleDateString('en-IN')]);
        rows.push([]);
        rows.push(['Material', 'Stock (mm)', 'Cut Pattern (mm)', 'Sum (mm)', 'Qty', 'Stick Refs']);

        for (const [key, plans] of Object.entries(r.results)) {
            if (!plans || plans.length === 0) continue;
            const stockMM = parseFloat((plans[0].stock || '0').replace('"', '')) * 25.4;

            const groups = new Map();
            plans.forEach((plan, idx) => {
                const sig = plan.pieces.map(p => (p.length * 25.4).toFixed(1)).join('|');
                if (!groups.has(sig)) groups.set(sig, { pieces: plan.pieces, stickNums: [] });
                groups.get(sig).stickNums.push(idx + 1);
            });

            for (const [, grp] of groups) {
                const cnt    = grp.stickNums.length;
                const mmArr  = grp.pieces.map(p => (p.length * 25.4).toFixed(1));
                const sumMM  = grp.pieces.reduce((s, p) => s + p.length * 25.4, 0).toFixed(1);
                const ref    = cnt > 4 ? `#${grp.stickNums[0]}–#${grp.stickNums[cnt - 1]}` : grp.stickNums.map(n => '#' + n).join(', ');
                rows.push([key, stockMM.toFixed(1), mmArr.join(' + '), sumMM, cnt, ref]);
            }
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{wch:32},{wch:11},{wch:50},{wch:11},{wch:6},{wch:22}];
        XLSX.utils.book_append_sheet(wb, ws, 'Profiles');
    }

    // ── Sheet 2: Mosquito Net ──────────────────────────────────────────────
    if (r.netResults && r.netResults.bins && r.netResults.bins.length > 0) {
        const rows = [];
        rows.push(['WORKSHOP CUT BRIEF — MOSQUITO NET']);
        rows.push([]);
        rows.push(['Roll #', 'Source', 'Roll Size (mm)', 'Row', 'Cut From (mm)', 'Cut To (mm)', 'Piece W (mm)', 'Piece H (mm)', 'Label', 'Rotated']);

        // Group by width, ascending
        const binsByWidth = {};
        r.netResults.bins.forEach((bin, idx) => {
            const w = bin.width;
            if (!binsByWidth[w]) binsByWidth[w] = [];
            binsByWidth[w].push({ bin, globalIdx: idx + 1 });
        });
        const widths = Object.keys(binsByWidth).map(Number).sort((a, b) => a - b);
        for (const w of widths) {
            for (const e of binsByWidth[w]) {
                const bin = e.bin;
                const src = bin.kind === 'store' ? `STOCK: ${bin.label}` : 'NEW';
                const sz  = `${(bin.width*25.4).toFixed(1)} × ${(bin.capacityLength*25.4).toFixed(1)}`;
                bin.shelves.forEach((shelf, si) => {
                    const y1 = (shelf.y * 25.4).toFixed(1);
                    const y2 = ((shelf.y + shelf.shelfH) * 25.4).toFixed(1);
                    shelf.pieces.forEach(p => {
                        rows.push([
                            e.globalIdx, src, sz, si + 1, y1, y2,
                            (p.w * 25.4).toFixed(1), (p.h * 25.4).toFixed(1),
                            (p.label || '').split(/[\s(]/)[0],
                            p.rotated ? 'Yes' : ''
                        ]);
                    });
                });
            }
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{wch:7},{wch:18},{wch:18},{wch:5},{wch:13},{wch:12},{wch:12},{wch:12},{wch:20},{wch:8}];
        XLSX.utils.book_append_sheet(wb, ws, 'Mosquito Net');
    }

    // ── Sheet 3: Partition Sheets ──────────────────────────────────────────
    if (r.sheetResults && r.sheetResults.byGroup && Object.keys(r.sheetResults.byGroup).length > 0) {
        const rows = [];
        rows.push(['WORKSHOP CUT BRIEF — PARTITION SHEETS']);
        rows.push([]);
        rows.push(['Material', 'Sheet #', 'Source', 'Sheet Size (mm)', 'Row', 'Cut From (mm)', 'Cut To (mm)', 'Piece W (mm)', 'Piece H (mm)', 'Label', 'Rotated']);

        const MAT_TITLE = { ACP: 'ACP', Bakelite: 'Bakelite', ParticleBoard: 'Particle Board' };
        for (const [, gr] of Object.entries(r.sheetResults.byGroup)) {
            const matLabel = `${MAT_TITLE[gr.material] || gr.material} ${gr.thickness}`;
            gr.bins.forEach((bin, idx) => {
                const src = bin.kind === 'store' ? `STOCK: ${bin.label}` : 'NEW';
                const sz  = `${(bin.width*25.4).toFixed(1)} × ${(bin.capacityLength*25.4).toFixed(1)}`;
                bin.shelves.forEach((shelf, si) => {
                    const y1 = (shelf.y * 25.4).toFixed(1);
                    const y2 = ((shelf.y + shelf.shelfH) * 25.4).toFixed(1);
                    shelf.pieces.forEach(p => {
                        rows.push([
                            matLabel, idx + 1, src, sz, si + 1, y1, y2,
                            (p.w * 25.4).toFixed(1), (p.h * 25.4).toFixed(1),
                            p.label, p.rotated ? 'Yes' : ''
                        ]);
                    });
                });
            });
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{wch:18},{wch:7},{wch:22},{wch:18},{wch:5},{wch:13},{wch:12},{wch:12},{wch:12},{wch:22},{wch:8}];
        XLSX.utils.book_append_sheet(wb, ws, 'Sheets');
    }

    // ── Sheet 4: Raw Text (for ops who want the formatted brief) ──────────
    {
        const text = buildCNCBrief();
        const rows = text.split('\n').map(l => [l]);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 100 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Brief Text');
    }

    XLSX.writeFile(wb, `${r.project || 'Project'}_Cutting_Brief.xlsx`);
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

    // Capture which material sections are collapsed before re-render
    const collapsedKeys = new Set();
    document.querySelectorAll('#resultsContent details[data-mat-key]').forEach(det => {
        if (!det.open) collapsedKeys.add(det.getAttribute('data-mat-key'));
    });

    let html = '<div class="alert alert-success">Smart Cost-Optimized Results for Project <strong>' + r.project + '</strong></div>';
    
    // v1.25 — Export buttons reorganized into 4 logical groups
    const grpHdr = 'font-size:14px;font-weight:700;color:#2c3e50;margin-bottom:8px;text-align:center;';
    const btnGrp = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
    html += `
    <div class="import-export-section">
        <div style="${grpHdr}">📦 Vendor Orders</div>
        <div style="${btnGrp}">
            <button class="btn btn-success" onclick="showReportPreview('purchase_material')">🏭 Aluminum Profile Order</button>
            <button class="btn" style="background:#0288d1;color:white;" onclick="exportGlassOrderPDF()">🪟 Glass Order</button>
            <button class="btn" style="background:#bf360c;color:white;" onclick="exportPartitionSheetOrderPDF()">📄 Partition Sheets</button>
            <button class="btn" style="background:#6a1b9a;color:white;" onclick="exportNetRollOrderPDF()">🕸️ Mosquito Net Rolls</button>
            <button class="btn btn-info" onclick="showReportPreview('purchase_hardware')">🔩 Hardware List</button>
            <button class="btn" style="background:#558b2f;color:white;" onclick="exportPowderCoatingPDF()">✨ Powder Coating</button>
        </div>
    </div>
    <div class="import-export-section">
        <div style="${grpHdr}">🔨 Workshop / Floor</div>
        <div style="${btnGrp}">
            <button class="btn" style="background:#e67e22;color:white;" onclick="showCNCBrief()">🔧 Workshop Cut Brief</button>
            <button class="btn btn-warning" onclick="showReportPreview('cutlist')">🪚 Profile Cut List</button>
            <button class="btn" style="background:#8e44ad;color:white;" onclick="exportNetCutDiagramsPDF()">📐 Net Cut Diagrams</button>
            <button class="btn" style="background:#bf360c;color:white;" onclick="exportSheetCutDiagramsPDF()">📐 Sheet Cut Diagrams</button>
        </div>
    </div>
    <div class="import-export-section">
        <div style="${grpHdr}">📜 Customer / Project</div>
        <div style="${btnGrp}">
            <button class="btn btn-primary" onclick="showReportPreview('quotation')">📜 Customer Quotation</button>
            <button class="btn" style="background:#1e3c72;color:white;" onclick="exportMasterOrderSummaryPDF()">📊 Master Order Summary</button>
            <button class="btn" style="background:#283593;color:white;" onclick="exportProjectSpecSheetPDF()">📋 Project Spec Sheet</button>
        </div>
    </div>
    <div class="import-export-section">
        <div style="${grpHdr}">💾 Records & Share</div>
        <div style="${btnGrp}">
            <button class="btn btn-primary btn-sm" onclick="exportFullResultsExcel()">📊 Full Excel</button>
            <button class="btn btn-danger btn-sm" onclick="exportFullResultsPDF()">📄 Full PDF</button>
            <button class="btn btn-secondary btn-sm" onclick="exportProject()">💾 Save JSON</button>
            <button class="btn btn-success btn-sm" onclick="shareViaWhatsApp()">📱 WhatsApp</button>
            <button class="btn btn-primary btn-sm" onclick="shareViaEmail()">✉️ Email</button>
            <button class="btn btn-warning btn-sm" onclick="generatePrintableLabels()">🏷️ Print Labels</button>
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
        
        const matCost = plans.reduce((s, p) => s + p.cost, 0);
        const detOpen = collapsedKeys.has(key) ? '' : ' open';
        html += `<details class="material-section collapsible-section" data-mat-key="${key}"${detOpen}>
<summary class="collapsible-summary"><span class="cs-title">📏 ${materialTitle}</span><span class="cs-meta">${requirementStr}&ensp;·&ensp;Eff:&nbsp;${materialEfficiency}%&ensp;·&ensp;₹${matCost.toFixed(0)}</span><span class="cs-arrow"></span></summary>
<div class="cs-body">`;

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
            'Glazing Clip Vertical':        'background:#37474f;color:#fff',  // legacy label (kept for safety)
            'Glazing Clip Vertical Top':    'background:#37474f;color:#fff',
            'Glazing Clip Vertical Bottom': 'background:#546e7a;color:#fff',
            'Glazing Clip Horizontal':      'background:#37474f;color:#fff',
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

        html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
            <div>${doorFuncBadges}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                ${sectionInfo}
                <button class="btn btn-warning btn-sm" onclick="openSectionSelectModal('${safeKey}')">🔗 Select Thickness</button>
            </div>
        </div>`;

        html += `<div style="background:#e8f5e9;padding:8px 12px;border-radius:6px;margin-bottom:8px;border-left:4px solid #4caf50;font-size:13px;line-height:1.7;">
            <strong style="color:#2e7d32;">Req:</strong> ${requirementStr} &nbsp;|&nbsp;
            <strong>Used:</strong> ${materialUsed.toFixed(2)}" &nbsp;|&nbsp;
            <strong>Waste:</strong> ${materialWaste.toFixed(2)}" &nbsp;|&nbsp;
            <strong>Eff:</strong> ${materialEfficiency}%
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
        
        html += '</tbody></table></div></details>';
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

        // ── Precompute labels needed for summary ─────────────────────────────
        const CS = 'background:#f3e5f5;border:1px solid #ce93d8;border-radius:8px;padding:7px 10px;flex:1;min-width:90px;text-align:center;';
        const CS_GREEN = 'background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:7px 10px;flex:1;min-width:90px;text-align:center;';
        const effColor = eff >= 80 ? '#2e7d32' : eff >= 55 ? '#e65100' : '#c62828';
        // Build "Best Roll Width" label — handle mixed-width case
        const widthsUsedSet = new Set(netLayout.bins.map(b => b.width));
        const widthsUsedArr = [...widthsUsedSet].sort((a, b) => a - b);
        const widthLabel = netLayout.mixed
            ? widthsUsedArr.map(w => `${w}"`).join(' + ') + ' (mixed)'
            : roll.name;

        // ── Stat cards ───────────────────────────────────────────────────────
        html += `<details class="material-section collapsible-section net-collapsible" open style="border-left:4px solid #8e44ad;margin-top:16px;">
<summary class="collapsible-summary net-summary"><span class="cs-title" style="color:#6c3483;">🕸️ Mosquito Net Cutting Plan</span><span class="cs-meta" style="color:#555;">${widthLabel}&ensp;·&ensp;${storeRollsUsed>0?storeRollsUsed+' from stock, ':''}${newRollsUsed} new roll${newRollsUsed!==1?'s':''}&ensp;·&ensp;Eff:&nbsp;${eff}%</span><span class="cs-arrow"></span></summary>
<div class="cs-body">
<p style="font-size:12px;color:#666;margin:0 0 10px;">2D optimized — partial rolls from store used first, new rolls only as needed. Sizes after deducting 2" from shutter frame dimensions.</p>`;

        html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
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
        html += `<div style="background:#ede7f6;border-radius:8px;padding:7px 12px;margin-bottom:10px;font-size:13px;line-height:1.8;">
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
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin:5px 0 10px 0;">
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
        <div style="font-size:11px;color:#777;margin:3px 0 6px 0;">
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

            html += `<details style="border:2px solid ${bColor};border-radius:8px;margin-bottom:8px;overflow:hidden;" open>
<summary style="background:${bColor};color:white;padding:6px 12px;font-size:13px;font-weight:700;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;cursor:pointer;list-style:none;user-select:none;">
    <span>${bIcon} ${bKindText}: ${bin.label}</span>
    <span style="font-weight:400;font-size:11px;opacity:0.9;">Used&nbsp;${bin.usedLength.toFixed(1)}" / ${bin.capacityLength.toFixed(1)}" &nbsp;|&nbsp; Left:&nbsp;${(bin.capacityLength-bin.usedLength).toFixed(1)}" &nbsp;▼</span>
</summary>
<div style="padding:8px 12px;background:${bBg};">`;

            // Row-by-row cutting instructions for THIS bin
            bin.shelves.forEach((shelf, si) => {
                const y1 = shelf.y.toFixed(2);
                const y2 = (shelf.y + shelf.shelfH).toFixed(2);
                const usedW = shelf.pieces.reduce((s, p) => s + p.w, 0).toFixed(2);
                const piecesDesc = shelf.pieces.map(p => {
                    const short = p.label.split(/[\s(]/)[0];
                    return `<strong>${short}</strong>: ${p.w.toFixed(2)}"×${p.h.toFixed(2)}"${p.rotated ? ' <span style="color:#e65100">↺</span>' : ''}`;
                }).join(' &nbsp;|&nbsp; ');
                html += `<div style="background:white;border:1px solid ${isStore?'#c8e6c9':'#e1bee7'};border-radius:5px;padding:4px 9px;margin-bottom:3px;font-size:12px;line-height:1.7;">
                    <strong style="color:${isStore?'#1b5e20':'#6c3483'};">Row ${si + 1}</strong>
                    &nbsp; Cut: <strong>${y1}"</strong> → <strong>${y2}"</strong>
                    &nbsp; (height ${shelf.shelfH.toFixed(2)}", width used ${usedW}")
                    &nbsp;&nbsp; ${piecesDesc}
                </div>`;
            });

            // Diagram for this bin
            html += `<div style="margin-top:6px;overflow:auto;max-height:420px;border:1px solid ${isStore?'#c8e6c9':'#e1bee7'};border-radius:6px;padding:6px;background:white;">
                ${generateNetDiagramBin(bin, labelColorCache)}
            </div>`;

            html += `</div></details>`;  // close bin body & wrapper
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

        html += '</div></details>';  // close net section cs-body + details
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── Partition Sheet Optimization Results ──────────────────────────────────
    if (optimizationResults.sheetResults && optimizationResults.sheetResults.byGroup) {
        const MAT_COLOR = { ACP: '#e67e22', Bakelite: '#795548', ParticleBoard: '#546e7a' };
        const MAT_BG    = { ACP: '#fff3e0', Bakelite: '#efebe9', ParticleBoard: '#eceff1' };
        const MAT_DARK  = { ACP: '#bf360c', Bakelite: '#4e342e', ParticleBoard: '#263238' };
        const MAT_TITLE = { ACP: 'ACP Panel', Bakelite: 'Bakelite Board', ParticleBoard: 'Particle Board' };

        for (const [key, gr] of Object.entries(optimizationResults.sheetResults.byGroup)) {
            const mat    = gr.material;
            const mCol   = MAT_COLOR[mat] || '#607d8b';
            const mBg    = MAT_BG[mat]    || '#eceff1';
            const mDark  = MAT_DARK[mat]  || '#263238';
            const mTitle = MAT_TITLE[mat] || mat;

            const piecesAreaSqft   = (gr.piecesArea  / 144).toFixed(2);
            const consumedAreaSqft = (gr.consumedArea / 144).toFixed(2);
            const wasteAreaSqft    = (gr.wasteArea   / 144).toFixed(2);
            const eff      = gr.efficiency;
            const effColor = eff >= 80 ? '#2e7d32' : eff >= 60 ? '#f57f17' : '#c62828';
            const totalPieces = gr.panels.reduce((s, p) => s + p.qty, 0);
            const CS_SH = `background:white;border-radius:8px;padding:10px 14px;font-size:12px;border:1.5px solid ${mCol}30;flex:1;min-width:100px;`;

            // v1.23: mix breakdown (e.g. "2 × 8'×4' + 1 × 12'×4'")
            const breakdown = gr.newSheetsBreakdown || { [gr.sheetName]: gr.newSheetsUsed };
            const breakdownStr = Object.entries(breakdown)
                .filter(([, n]) => n > 0)
                .map(([nm, n]) => `${n} × ${nm}`)
                .join(' + ');
            const isMixed = Object.keys(breakdown).filter(k => breakdown[k] > 0).length > 1;
            const sheetSizeLabel = isMixed ? 'Mixed sizes' : gr.sheetName;

            html += `<details class="material-section collapsible-section" open style="border-left:4px solid ${mCol};margin-top:16px;">
<summary class="collapsible-summary" style="background:${mBg};">
  <span class="cs-title" style="color:${mDark};">📄 ${mTitle} — ${gr.thickness} Cutting Plan</span>
  <span class="cs-meta" style="color:#555;">${breakdownStr || gr.sheetName}&ensp;·&ensp;${gr.storeSheetsUsed > 0 ? gr.storeSheetsUsed + ' from stock, ' : ''}${gr.newSheetsUsed} new sheet${gr.newSheetsUsed !== 1 ? 's' : ''}&ensp;·&ensp;Eff:&nbsp;${eff}%</span>
  <span class="cs-arrow"></span>
</summary>
<div class="cs-body">
<p style="font-size:12px;color:#666;margin:0 0 10px;">2D optimized — partial sheets from store used first, new sheets opened only as needed. Kerf (⅛") deducted from each panel.${isMixed ? ' <strong>Mixed sheet sizes</strong> for best material use.' : ''}</p>`;

            // Stat cards
            html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
    <div style="${CS_SH}">
        <div style="font-size:11px;color:${mCol};margin-bottom:3px;">${isMixed ? 'Sheet Sizes Used' : 'Best Sheet Size'}</div>
        <div style="font-size:16px;font-weight:700;color:${mDark};">${sheetSizeLabel}</div>
        ${isMixed ? `<div style="font-size:10px;color:#888;margin-top:2px;">${breakdownStr}</div>` : ''}
    </div>
    ${gr.storeSheetsUsed > 0 ? `<div style="${CS_SH}">
        <div style="font-size:11px;color:#1b5e20;margin-bottom:3px;">From Stock</div>
        <div style="font-size:16px;font-weight:700;color:#1b5e20;">${gr.storeSheetsUsed} sheet${gr.storeSheetsUsed > 1 ? 's' : ''}</div>
    </div>` : ''}
    <div style="${CS_SH}">
        <div style="font-size:11px;color:${mCol};margin-bottom:3px;">Order New</div>
        <div style="font-size:16px;font-weight:700;color:${gr.newSheetsUsed > 0 ? mDark : '#2e7d32'};">${gr.newSheetsUsed} sheet${gr.newSheetsUsed !== 1 ? 's' : ''}</div>
    </div>
    <div style="${CS_SH}">
        <div style="font-size:11px;color:${mCol};margin-bottom:3px;">Panel Area</div>
        <div style="font-size:16px;font-weight:700;color:${mDark};">${piecesAreaSqft} sqft</div>
    </div>
    <div style="${CS_SH}">
        <div style="font-size:11px;color:${mCol};margin-bottom:3px;">Cut Efficiency</div>
        <div style="font-size:16px;font-weight:700;color:${effColor};">${eff}%</div>
        <div style="font-size:10px;color:#888;margin-top:2px;">of consumed area</div>
    </div>
    ${gr.cost > 0 ? `<div style="${CS_SH}">
        <div style="font-size:11px;color:${mCol};margin-bottom:3px;">New Sheet Cost</div>
        <div style="font-size:16px;font-weight:700;color:${mDark};">₹${gr.cost.toFixed(0)}</div>
        ${gr.ratePerSqft > 0 ? `<div style="font-size:10px;color:#888;margin-top:2px;">₹${gr.ratePerSqft}/sqft × ${gr.sheetName}</div>` : ''}
    </div>` : ''}
</div>`;

            // Order summary block
            html += `<div style="background:${mBg};border-radius:8px;padding:7px 12px;margin-bottom:10px;font-size:13px;line-height:1.8;">
    <strong style="color:${mDark};">📦 Order Summary:</strong>
    ${gr.storeSheetsUsed > 0 ? `<strong style="color:#1b5e20;">Use ${gr.storeSheetsUsed} from stock</strong>` : ''}
    ${gr.storeSheetsUsed > 0 && gr.newSheetsUsed > 0 ? ' &nbsp;+&nbsp; ' : ''}
    ${gr.newSheetsUsed > 0 ? `<strong style="color:${mDark};">Order ${breakdownStr} of ${mTitle}</strong>` : ''}
    <br>
    <span style="font-size:12px;color:#555;">
        Panels: <strong>${totalPieces}</strong>
        &nbsp;|&nbsp; Panel area: <strong>${piecesAreaSqft} sqft</strong>
        &nbsp;|&nbsp; Consumed: <strong>${consumedAreaSqft} sqft</strong>
        &nbsp;|&nbsp; Waste: <strong>${wasteAreaSqft} sqft</strong>
        ${gr.cost > 0 ? `&nbsp;|&nbsp; New sheet cost: <strong>₹${gr.cost.toFixed(0)}</strong>` : ''}
    </span>
</div>`;

            // Piece summary table (grouped by panel label)
            const pieceSumS = {};
            gr.bins.forEach(bin => {
                bin.shelves.forEach(shelf => {
                    shelf.pieces.forEach(p => {
                        const k = `${p.label}|${p.origW}|${p.origH}`;
                        if (!pieceSumS[k]) pieceSumS[k] = { label: p.label, origW: p.origW, origH: p.origH, qty: 0, rotatedCount: 0, binSet: new Set() };
                        pieceSumS[k].qty++;
                        if (p.rotated) pieceSumS[k].rotatedCount++;
                        pieceSumS[k].binSet.add(bin.label.replace(/New roll/, 'New sheet'));
                    });
                });
            });

            html += `<strong style="font-size:13px;color:${mDark};">🧩 Panels Required</strong>
<table style="width:100%;border-collapse:collapse;font-size:12px;margin:5px 0 10px 0;">
    <thead><tr style="background:${mCol};color:white;">
        <th style="padding:6px 10px;text-align:left;">Door / Panel</th>
        <th style="padding:6px 10px;text-align:center;">Panel Size (W×H)</th>
        <th style="padding:6px 10px;text-align:center;">Qty</th>
        <th style="padding:6px 10px;text-align:center;">Placed As</th>
        <th style="padding:6px 10px;text-align:left;">Cut From</th>
    </tr></thead><tbody>`;
            let psiS = 0;
            for (const [, ps] of Object.entries(pieceSumS)) {
                const rowBg = psiS++ % 2 === 0 ? mBg : 'white';
                const placedDesc = ps.rotatedCount === ps.qty
                    ? `${ps.origH.toFixed(2)}"×${ps.origW.toFixed(2)}" ↺`
                    : ps.rotatedCount === 0
                    ? `${ps.origW.toFixed(2)}"×${ps.origH.toFixed(2)}"`
                    : `Mixed (some rotated ↺)`;
                html += `<tr style="background:${rowBg};border-bottom:1px solid #e0e0e0;">
        <td style="padding:6px 10px;font-weight:600;color:${mDark};">${ps.label}</td>
        <td style="padding:6px 10px;text-align:center;">${ps.origW.toFixed(2)}" × ${ps.origH.toFixed(2)}"</td>
        <td style="padding:6px 10px;text-align:center;font-weight:700;">${ps.qty}</td>
        <td style="padding:6px 10px;text-align:center;color:${ps.rotatedCount > 0 ? '#e65100' : '#2e7d32'};">${placedDesc}</td>
        <td style="padding:6px 10px;color:#555;">${[...ps.binSet].join(', ')}</td>
    </tr>`;
            }
            html += '</tbody></table>';

            // Per-bin cutting instructions + diagram
            html += `<strong style="font-size:13px;color:${mDark};">📐 Sheet-by-Sheet Cutting Layout</strong>
<div style="font-size:11px;color:#777;margin:3px 0 6px 0;">
    <span style="display:inline-block;width:18px;height:10px;background:#f1f8f4;border:1.5px solid #27ae60;vertical-align:middle;border-radius:2px;"></span> From your stock
    &nbsp;
    <span style="display:inline-block;width:18px;height:10px;background:${mBg};border:1.5px solid ${mCol};vertical-align:middle;border-radius:2px;"></span> New sheet
    &nbsp;
    <span style="display:inline-block;width:18px;height:3px;background:#2980b9;vertical-align:middle;"></span> H-cut
    &nbsp;
    <span style="display:inline-block;width:18px;height:3px;background:#e74c3c;vertical-align:middle;"></span> V-cut
    &nbsp; ↺ Rotated piece
</div>`;

            const sheetColorCache = {};
            gr.bins.forEach((bin) => {
                const isStore = bin.kind === 'store';
                const bColor  = isStore ? '#27ae60' : mCol;
                const bBg     = isStore ? '#f1f8f4' : mBg;
                const bIcon   = isStore ? '📦' : '🆕';
                const bKindText = isStore ? 'FROM STOCK' : 'NEW SHEET';
                const bLabel  = bin.label.replace(/New roll/, 'New sheet');

                html += `<details style="border:2px solid ${bColor};border-radius:8px;margin-bottom:8px;overflow:hidden;" open>
<summary style="background:${bColor};color:white;padding:6px 12px;font-size:13px;font-weight:700;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;cursor:pointer;list-style:none;user-select:none;">
    <span>${bIcon} ${bKindText}: ${bLabel} (${bin.width}"×${bin.capacityLength}")</span>
    <span style="font-weight:400;font-size:11px;opacity:0.9;">Used&nbsp;${bin.usedLength.toFixed(1)}" / ${bin.capacityLength.toFixed(1)}" &nbsp;|&nbsp; Left:&nbsp;${(bin.capacityLength - bin.usedLength).toFixed(1)}" &nbsp;▼</span>
</summary>
<div style="padding:8px 12px;background:${bBg};">`;

                bin.shelves.forEach((shelf, si) => {
                    const y1 = shelf.y.toFixed(2);
                    const y2 = (shelf.y + shelf.shelfH).toFixed(2);
                    const usedW = shelf.pieces.reduce((s, p) => s + p.w, 0).toFixed(2);
                    const piecesDesc = shelf.pieces.map(p => {
                        const short = p.label.split(/[\s(]/)[0];
                        return `<strong>${short}</strong>: ${p.w.toFixed(2)}"×${p.h.toFixed(2)}"${p.rotated ? ' <span style="color:#e65100">↺</span>' : ''}`;
                    }).join(' &nbsp;|&nbsp; ');
                    html += `<div style="background:white;border:1px solid ${isStore ? '#c8e6c9' : mCol + '55'};border-radius:5px;padding:4px 9px;margin-bottom:3px;font-size:12px;line-height:1.7;">
        <strong style="color:${isStore ? '#1b5e20' : mDark};">Row ${si + 1}</strong>
        &nbsp; Cut: <strong>${y1}"</strong> → <strong>${y2}"</strong>
        &nbsp; (height ${shelf.shelfH.toFixed(2)}", width used ${usedW}")
        &nbsp;&nbsp; ${piecesDesc}
    </div>`;
                });

                html += `<div style="margin-top:6px;overflow:auto;max-height:420px;border:1px solid ${isStore ? '#c8e6c9' : mCol + '55'};border-radius:6px;padding:6px;background:white;">
    ${generateNetDiagramBin(bin, sheetColorCache)}
</div>`;
                html += `</div></details>`; // close bin body + wrapper
            });

            // Leftover suggestion
            if (gr.leftover && gr.leftover.length > 0) {
                html += `<div style="background:#fff8e1;border-left:4px solid #ffa000;border-radius:6px;padding:11px 14px;margin-top:12px;font-size:13px;line-height:1.9;">
    <strong style="color:#e65100;">💡 Leftover After This Project</strong>
    <span style="font-size:11px;color:#888;">— informational, update your store records manually</span>
    <ul style="margin:6px 0 0 18px;padding:0;">`;
                gr.leftover.forEach(lo => {
                    html += `<li><strong>🆕 ${lo.width}"×${lo.remainingAfter.toFixed(1)}"</strong>
        <span style="font-size:11px;color:#777;">(from newly purchased ${mTitle})</span>
        ${lo.label ? `<span style="font-size:11px;color:#999;">— ${lo.label.replace(/New roll/, 'New sheet')}</span>` : ''}
    </li>`;
                });
                html += `</ul></div>`;
            }

            html += '</div></details>'; // close cs-body + details for this material group
        }
    }
    // ──────────────────────────────────────────────────────────────────────────

    container.innerHTML = html;
}

// ============================================================================
// PROJECT EXPORT/IMPORT
// ============================================================================

function exportProject() {
    const projectData = {
        version: '1.1',
        exportDate: new Date().toISOString(),
        windows: windows,
        seriesFormulas: seriesFormulas,
        stockMaster: stockMaster,
        kerf: kerf,
        unitMode: unitMode,
        componentSections: optimizationResults ? optimizationResults.componentSections : null
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

                if (projectData.componentSections && optimizationResults) {
                    optimizationResults.componentSections = projectData.componentSections;
                    autoSaveResults();
                }

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
    const projectWindows = windows.filter(w => w.projectName === r.project);

    // ── Tab 1: Project Summary ─────────────────────────────────────────────
    const summary = [
        ['Niruma Aluminum Profile Optimizer'],
        ['Project:', r.project],
        ['Date:', new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })],
        ['Items:', projectWindows.length],
        [''],
        ['── Aluminum Profile Stats ──'],
        ['Total Sticks', r.stats.totalSticks],
        ['Total Used Length', r.stats.totalUsed + '"'],
        ['Total Waste Length', r.stats.totalWaste + '"'],
        ['Overall Efficiency', r.stats.efficiency + '%'],
        ['Profile Cost', '₹' + r.stats.totalCost],
        ['']
    ];
    if (r.sheetResults && r.sheetResults.byGroup) {
        summary.push(['── Partition Sheet Stats ──']);
        let totalSheets = 0, totalSheetCost = 0;
        for (const [, gr] of Object.entries(r.sheetResults.byGroup)) {
            totalSheets += gr.bins.length;
            totalSheetCost += gr.cost || 0;
            summary.push([`${gr.material} ${gr.thickness}`, `${gr.bins.length} sheets`, '₹' + (gr.cost || 0).toFixed(0)]);
        }
        summary.push(['Total sheets', totalSheets, '₹' + totalSheetCost.toFixed(0)]);
        summary.push(['']);
    }
    if (r.netResults && r.netResults.bins) {
        summary.push(['── Mosquito Net Stats ──']);
        summary.push(['Total rolls used', r.netResults.bins.length]);
        summary.push(['New rolls', r.netResults.newRollsUsed || 0]);
        summary.push(['From stock', r.netResults.storeRollsUsed || 0]);
        summary.push(['Net cost (rolls)', '₹' + (r.netResults.cost || 0).toFixed(0)]);
        summary.push(['']);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

    // ── Tab 2: Profile Cutting Plans (preserves the original layout) ───────
    const profile = [];
    for (const [key, plans] of Object.entries(r.results)) {
        const matUsed  = plans.reduce((s, p) => s + p.used, 0);
        const matWaste = plans.reduce((s, p) => s + p.waste, 0);
        const matTotal = matUsed + matWaste;
        const matEff   = matTotal > 0 ? ((matUsed / matTotal) * 100).toFixed(2) : '0.00';
        const stockCounts = {};
        plans.forEach(plan => {
            const sz = plan.stock.replace('"', '');
            stockCounts[sz] = (stockCounts[sz] || 0) + 1;
        });
        const requirementStr = Object.entries(stockCounts)
            .map(([sz, c]) => `${sz}" - ${c} nos`).join(' | ');

        profile.push([`Material: ${key}`]);
        profile.push(['Requirements', requirementStr]);
        profile.push(['Used', matUsed.toFixed(2) + '"',  'Waste', matWaste.toFixed(2) + '"', 'Efficiency', matEff + '%']);
        profile.push(['Stick #', 'Stock', 'Pieces', 'Used', 'Waste', 'Efficiency', 'Cost']);
        plans.forEach((plan, idx) => {
            const piecesStr = plan.pieces.map(p => `${p.length.toFixed(2)}" (${p.label})`).join(' | ');
            profile.push([idx + 1, plan.stock, piecesStr, plan.used.toFixed(2) + '"', plan.waste.toFixed(2) + '"', plan.efficiency + '%', '₹' + plan.cost]);
        });
        profile.push(['']);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(profile), 'Profile Cuts');

    // ── Tab 3: Partition Sheets ────────────────────────────────────────────
    if (r.sheetResults && r.sheetResults.byGroup && Object.keys(r.sheetResults.byGroup).length > 0) {
        const sheets = [['Material', 'Thickness', 'Sheet Size', 'Source', 'Used Length', 'Capacity', 'Pieces', 'Cost']];
        for (const [, gr] of Object.entries(r.sheetResults.byGroup)) {
            sheets.push([`${gr.material} ${gr.thickness} — Order Summary`,
                Object.entries(gr.newSheetsBreakdown || { [gr.sheetName]: gr.newSheetsUsed })
                    .filter(([, n]) => n > 0).map(([nm, n]) => `${n} × ${nm}`).join(' + '),
                '', '', '', '', '', '₹' + (gr.cost || 0).toFixed(0)]);
            gr.bins.forEach((bin, idx) => {
                const pieces = bin.shelves.reduce((s, shelf) => s + shelf.pieces.length, 0);
                sheets.push([
                    gr.material, gr.thickness, `${bin.width}"×${bin.capacityLength}"`,
                    bin.kind === 'store' ? `STOCK: ${bin.label}` : `NEW #${idx + 1}`,
                    bin.usedLength.toFixed(1) + '"', bin.capacityLength.toFixed(1) + '"',
                    pieces, ''
                ]);
            });
            sheets.push(['']);
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheets), 'Partition Sheets');
    }

    // ── Tab 4: Mosquito Net Rolls ──────────────────────────────────────────
    if (r.netResults && r.netResults.bins) {
        const net = [['Roll #', 'Source', 'Width', 'Capacity Length', 'Used Length', 'Leftover', 'Pieces']];
        r.netResults.bins.forEach((bin, idx) => {
            const pieces = (bin.shelves || []).reduce((s, shelf) => s + (shelf.pieces || []).length, 0);
            net.push([
                idx + 1,
                bin.kind === 'store' ? `STOCK: ${bin.label}` : 'NEW',
                bin.width + '"',
                bin.capacityLength.toFixed(1) + '"',
                bin.usedLength.toFixed(1) + '"',
                (bin.capacityLength - bin.usedLength).toFixed(1) + '"',
                pieces
            ]);
        });
        net.push(['']);
        net.push(['Total cost (new rolls)', '', '', '', '', '', '₹' + (r.netResults.cost || 0).toFixed(0)]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(net), 'Net Rolls');
    }

    // ── Tab 5: Glass List ──────────────────────────────────────────────────
    const glassRows = [['Window/Door', 'Location', 'Zone', 'Type', 'Thickness', 'Toughened', 'W (mm)', 'H (mm)', 'Qty', 'Area sqft']];
    projectWindows.forEach(win => {
        const winQty = win.qty || 1;
        if (win.category !== 'Door') {
            const glass = (typeof calculateGlassDimensions === 'function') ? calculateGlassDimensions(win) : null;
            const gi    = (typeof resolveGlassInfo === 'function') ? resolveGlassInfo(win) : null;
            if (glass && gi && gi.hasGlass) {
                const qty = (glass.qty || 1) * winQty;
                glassRows.push([
                    win.configId, win.location || '-', 'Pane',
                    gi.unit === 'DGU' ? 'DGU' : 'SGU',
                    `${gi.thickness}mm`, gi.toughened ? 'Yes' : 'No',
                    Math.round(glass.width * 25.4), Math.round(glass.height * 25.4),
                    qty,
                    (((glass.width * glass.height) / 144) * qty).toFixed(2)
                ]);
            }
        } else {
            const F = win.frame || 0;
            const L = win.leaves || 1;
            // v1.34: use actual handle + hinge stile widths (not 2 × assumed)
            const stiles = (typeof computeDoorStileWidths === 'function')
                ? computeDoorStileWidths(win, null)
                : { handleVW: 47.5/25.4, hingeVW: 47.5/25.4 };
            const TW = (win.topWidth || 47.5) / 25.4;
            const BW = (win.bottomWidth || 114.5) / 25.4;
            const MW = (win.middleWidth || 47.5) / 25.4;
            const innerW = Math.max(0, (win.width - F * (80/25.4)) / L - stiles.handleVW - stiles.hingeVW);
            const innerH = win.height - F * (40/25.4);
            const midMM = win.middleRailPositionMM;
            let upperH, lowerH;
            if (midMM != null) {
                const midIn = midMM / 25.4;
                lowerH = Math.max(0, midIn - BW - MW/2);
                upperH = Math.max(0, innerH - midIn - TW - MW/2);
            } else {
                const half = (innerH - TW - BW - MW) / 2;
                upperH = lowerH = Math.max(0, half);
            }
            [['Upper', win.upperPartition, upperH], ['Lower', win.lowerPartition, lowerH]].forEach(([zone, part, h]) => {
                if (!part || part.material !== 'Glass') return;
                const w = Math.max(0, innerW - 0.3125);
                const hh = Math.max(0, h - 0.3125);
                if (w <= 0 || hh <= 0) return;
                const qty = winQty * L;
                glassRows.push([
                    win.configId, win.location || '-', zone,
                    part.glassType === 'DGU' ? 'DGU' : 'SGU',
                    `${part.thickness || '6'}mm`, part.glassToughened ? 'Yes' : 'No',
                    Math.round(w * 25.4), Math.round(hh * 25.4),
                    qty, ((w * hh * qty) / 144).toFixed(2)
                ]);
            });
        }
    });
    if (glassRows.length > 1) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(glassRows), 'Glass');
    }

    // ── Tab 6: Hardware List ───────────────────────────────────────────────
    const hwRows = [['Window/Door', 'Item — Variant', 'Qty', 'Unit', 'Rate', 'Total']];
    const hwAgg = {};
    projectWindows.forEach(win => {
        if (typeof calculateWindowHardware !== 'function') return;
        const list = calculateWindowHardware(win, r);
        const winQty = win.qty || 1;
        list.forEach(h => {
            const q = h.qty * winQty;
            const t = h.total * winQty;
            hwRows.push([win.configId, h.hardware, Math.round(q * 100) / 100, h.unit, '₹' + h.rate, '₹' + t.toFixed(2)]);
            if (!hwAgg[h.hardware]) hwAgg[h.hardware] = { qty: 0, total: 0, unit: h.unit, rate: h.rate };
            hwAgg[h.hardware].qty   += q;
            hwAgg[h.hardware].total += t;
        });
    });
    if (hwRows.length > 1) {
        hwRows.push(['']);
        hwRows.push(['── Project Aggregate ──']);
        hwRows.push(['', 'Item — Variant', 'Total Qty', 'Unit', 'Rate', 'Total']);
        let hwGrand = 0;
        Object.entries(hwAgg)
            .sort(([,a], [,b]) => b.total - a.total)
            .forEach(([name, info]) => {
                hwRows.push(['', name, Math.round(info.qty * 100) / 100, info.unit, '₹' + info.rate, '₹' + info.total.toFixed(2)]);
                hwGrand += info.total;
            });
        hwRows.push(['', 'GRAND TOTAL', '', '', '', '₹' + hwGrand.toFixed(2)]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hwRows), 'Hardware');
    }

    // ── Tab 7: Per-Window Cost Breakdown ───────────────────────────────────
    if (typeof calculateWindowTotalCost === 'function') {
        const labelEl = document.getElementById('qtModalLaborPerSqft');
        const laborPerSqft = labelEl ? (parseFloat(labelEl.value) || 0) : 0;
        const costRows = [['Window/Door', 'Qty', 'Profile', 'Prof.Wastage', 'Powder Coat', 'Glass/Partition', 'Sheet Waste', 'Hardware', 'Labor', 'Per-Unit', 'Line Total']];
        let tot = { profile: 0, waste: 0, pc: 0, glass: 0, snw: 0, hw: 0, labor: 0, grand: 0 };
        projectWindows.forEach(win => {
            try {
                const c = calculateWindowTotalCost(win, { laborPerSqft });
                const q = win.qty || 1;
                costRows.push([
                    win.configId, q,
                    (c.profileCost || 0).toFixed(2),
                    (c.wastageCost || 0).toFixed(2),
                    (c.powderCoatingCost || 0).toFixed(2),
                    (c.glassCost || 0).toFixed(2),
                    (c.partitionWastageCost || 0).toFixed(2),
                    (c.hardwareCost || 0).toFixed(2),
                    (c.laborCost || 0).toFixed(2),
                    (c.totalCost || 0).toFixed(2),
                    ((c.totalCost || 0) * q).toFixed(2)
                ]);
                tot.profile += (c.profileCost || 0) * q;
                tot.waste   += (c.wastageCost || 0) * q;
                tot.pc      += (c.powderCoatingCost || 0) * q;
                tot.glass   += (c.glassCost || 0) * q;
                tot.snw     += (c.partitionWastageCost || 0) * q;
                tot.hw      += (c.hardwareCost || 0) * q;
                tot.labor   += (c.laborCost || 0) * q;
                tot.grand   += (c.totalCost || 0) * q;
            } catch (e) { /* skip */ }
        });
        costRows.push(['']);
        costRows.push([
            'TOTAL', '',
            tot.profile.toFixed(2), tot.waste.toFixed(2), tot.pc.toFixed(2),
            tot.glass.toFixed(2), tot.snw.toFixed(2), tot.hw.toFixed(2),
            tot.labor.toFixed(2), '', tot.grand.toFixed(2)
        ]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(costRows), 'Cost Breakdown');
    }

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

    const projectWindows = windows.filter(w => w.projectName === r.project);

    // ── Section: Partition Sheets (ACP/Bakelite/PB) ────────────────────────
    if (r.sheetResults && r.sheetResults.byGroup && Object.keys(r.sheetResults.byGroup).length > 0) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(191, 54, 12);
        doc.text('Partition Sheets', 14, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 7;

        const sheetBody = [];
        let sheetGrand = 0;
        for (const [, gr] of Object.entries(r.sheetResults.byGroup)) {
            const breakdown = gr.newSheetsBreakdown || { [gr.sheetName]: gr.newSheetsUsed };
            const bdStr = Object.entries(breakdown).filter(([,n]) => n > 0)
                .map(([nm, n]) => `${n} × ${nm}`).join(' + ');
            sheetBody.push([
                gr.material, gr.thickness, bdStr || '0',
                gr.storeSheetsUsed > 0 ? `${gr.storeSheetsUsed} from stock` : '-',
                '₹' + (gr.cost || 0).toFixed(0)
            ]);
            sheetGrand += gr.cost || 0;
        }
        sheetBody.push([
            { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
            { content: '₹' + sheetGrand.toFixed(0), styles: { fontStyle: 'bold', fillColor: [240,240,240] } }
        ]);
        doc.autoTable({
            startY: currentY,
            head: [['Material', 'Thickness', 'New Order', 'Stock Used', 'Cost']],
            body: sheetBody,
            theme: 'grid',
            headStyles: { fillColor: [191, 54, 12] },
            styles: { fontSize: 9 }
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    // ── Section: Mosquito Net Rolls ───────────────────────────────────────
    if (r.netResults && r.netResults.bins && r.netResults.bins.length > 0) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(106, 27, 154);
        doc.text('Mosquito Net Rolls', 14, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 7;

        const byWidth = {};
        let newRolls = 0;
        r.netResults.bins.filter(b => b.kind === 'new').forEach(b => {
            byWidth[b.width] = (byWidth[b.width] || 0) + 1;
            newRolls++;
        });
        const storeBins = r.netResults.bins.filter(b => b.kind === 'store');
        const netBody = [];
        Object.entries(byWidth).forEach(([w, n]) => {
            netBody.push([`${w}" × 50 ft`, 'NEW', n, '']);
        });
        storeBins.forEach(b => {
            netBody.push([`${b.width}" × ${b.capacityLength.toFixed(1)}"`, 'FROM STOCK', 1, b.label || '-']);
        });
        netBody.push([
            { content: 'Total rolls', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
            { content: r.netResults.bins.length, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
            { content: 'Cost: ₹' + (r.netResults.cost || 0).toFixed(0), styles: { fontStyle: 'bold', fillColor: [240,240,240] } }
        ]);
        doc.autoTable({
            startY: currentY,
            head: [['Roll', 'Source', 'Qty', 'Notes']],
            body: netBody,
            theme: 'grid',
            headStyles: { fillColor: [106, 27, 154] },
            styles: { fontSize: 9 }
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    // ── Section: Per-Window Cost Breakdown ────────────────────────────────
    if (typeof calculateWindowTotalCost === 'function' && projectWindows.length > 0) {
        if (currentY > 220) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14);
        doc.setTextColor(30, 60, 114);
        doc.text('Per-Window Cost Breakdown', 14, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 7;

        const labelEl = document.getElementById('qtModalLaborPerSqft');
        const laborPerSqft = labelEl ? (parseFloat(labelEl.value) || 0) : 0;
        const costBody = [];
        let tot = { profile: 0, waste: 0, pc: 0, glass: 0, snw: 0, hw: 0, labor: 0, grand: 0 };

        projectWindows.forEach(win => {
            try {
                const c = calculateWindowTotalCost(win, { laborPerSqft });
                const q = win.qty || 1;
                costBody.push([
                    win.configId, q,
                    ((c.profileCost || 0) * q).toFixed(0),
                    ((c.wastageCost || 0) * q).toFixed(0),
                    ((c.powderCoatingCost || 0) * q).toFixed(0),
                    ((c.glassCost || 0) * q).toFixed(0),
                    ((c.partitionWastageCost || 0) * q).toFixed(0),
                    ((c.hardwareCost || 0) * q).toFixed(0),
                    ((c.laborCost || 0) * q).toFixed(0),
                    ((c.totalCost || 0) * q).toFixed(0)
                ]);
                tot.profile += (c.profileCost || 0) * q;
                tot.waste   += (c.wastageCost || 0) * q;
                tot.pc      += (c.powderCoatingCost || 0) * q;
                tot.glass   += (c.glassCost || 0) * q;
                tot.snw     += (c.partitionWastageCost || 0) * q;
                tot.hw      += (c.hardwareCost || 0) * q;
                tot.labor   += (c.laborCost || 0) * q;
                tot.grand   += (c.totalCost || 0) * q;
            } catch (e) { /* skip */ }
        });
        costBody.push([
            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [235, 235, 235] } },
            { content: tot.profile.toFixed(0), styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } },
            { content: tot.waste.toFixed(0),   styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } },
            { content: tot.pc.toFixed(0),      styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } },
            { content: tot.glass.toFixed(0),   styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } },
            { content: tot.snw.toFixed(0),     styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } },
            { content: tot.hw.toFixed(0),      styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } },
            { content: tot.labor.toFixed(0),   styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } },
            { content: tot.grand.toFixed(0),   styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } }
        ]);

        doc.autoTable({
            startY: currentY,
            margin: { left: 10, right: 10 },
            head: [['ID', 'Qty', 'Profile', 'Prof.\nWaste', 'Powder\nCoat', 'Glass /\nPart.', 'Sheet\nWaste', 'Hardware', 'Labor', 'Line\nTotal']],
            body: costBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 60, 114], textColor: [255,255,255], fontSize: 7, halign: 'center' },
            bodyStyles: { fontSize: 7, halign: 'right' },
            columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' } }
        });
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

// ============================================================================
// v1.25 — VENDOR ORDER EXPORTS (PDFs)
// ============================================================================

// Shared header drawer for vendor-order PDFs
function _drawVendorOrderHeader(doc, title, opts) {
    opts = opts || {};
    const PW = doc.internal.pageSize.width;
    const project = (optimizationResults && optimizationResults.project) || '—';
    const today = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    doc.setFillColor(30, 60, 114);
    doc.rect(0, 0, PW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${project}`, PW - 14, 8, { align: 'right' });
    doc.text(`Date: ${today}`, PW - 14, 14, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    return 24; // y after header
}

// --- Glass Order Sheet ------------------------------------------------------
function exportGlassOrderPDF() {
    if (!optimizationResults) { showAlert('⚠️ Run optimization first.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const project = optimizationResults.project;
    const projectWindows = windows.filter(w => w.projectName === project);

    let y = _drawVendorOrderHeader(doc, '🪟 Glass Order Sheet');
    doc.setFontSize(9);
    doc.text('All sizes in mm. Each row = one cut piece. Group by glass type when ordering.', 14, y);
    y += 6;

    const rows = [];   // [winId, location, zone, type, thickness, toughened, w_mm, h_mm, qty, area_sqft]
    let totalArea = 0;
    let totalPieces = 0;

    projectWindows.forEach(win => {
        const winQty = win.qty || 1;
        const isDoor = win.category === 'Door';

        if (!isDoor) {
            // Window: full glass pane
            const glass = (typeof calculateGlassDimensions === 'function') ? calculateGlassDimensions(win) : null;
            const gi = (typeof resolveGlassInfo === 'function') ? resolveGlassInfo(win) : null;
            if (glass && gi && gi.hasGlass) {
                const wMM = Math.round(glass.width * 25.4);
                const hMM = Math.round(glass.height * 25.4);
                const qty = (glass.qty || 1) * winQty;
                const areaSqft = ((glass.width * glass.height) / 144) * qty;
                rows.push([
                    win.configId, win.location || '-', 'Pane',
                    (gi.unit === 'DGU' ? 'DGU' : 'SGU'),
                    `${gi.thickness}mm`,
                    gi.toughened ? 'Yes' : 'No',
                    String(wMM), String(hMM),
                    String(qty),
                    areaSqft.toFixed(2)
                ]);
                totalArea += areaSqft;
                totalPieces += qty;
            }
        } else {
            // Door: upper + lower partitions, each if glass
            const F  = win.frame || 0;
            const L  = win.leaves || 1;
            // v1.34: use actual handle + hinge stile widths
            const stiles = (typeof computeDoorStileWidths === 'function')
                ? computeDoorStileWidths(win, null)
                : { handleVW: 47.5/25.4, hingeVW: 47.5/25.4 };
            const TW = (win.topWidth    || 47.5) / 25.4;
            const BW = (win.bottomWidth || 114.5)/ 25.4;
            const MW = (win.middleWidth || 47.5) / 25.4;
            const leafW = (win.width - (F * (80/25.4))) / L - stiles.handleVW - stiles.hingeVW;
            const innerW = Math.max(0, leafW);
            const innerH = win.height - (F * (40/25.4));
            const midMM = win.middleRailPositionMM;
            let upperZoneH, lowerZoneH;
            if (midMM != null) {
                const midIn = midMM / 25.4;
                lowerZoneH = Math.max(0, midIn - BW - MW/2);
                upperZoneH = Math.max(0, innerH - midIn - TW - MW/2);
            } else {
                const halfH = (innerH - TW - BW - MW) / 2;
                lowerZoneH = upperZoneH = Math.max(0, halfH);
            }
            const GLASS_DEDUCT = 0.3125; // 8mm rubber + buffer

            const addZone = (zone, part, zoneH) => {
                if (!part || part.material !== 'Glass') return;
                const w  = Math.max(0, innerW - GLASS_DEDUCT);
                const h  = Math.max(0, zoneH  - GLASS_DEDUCT);
                if (w <= 0 || h <= 0) return;
                const qty = winQty * L;
                const wMM = Math.round(w * 25.4);
                const hMM = Math.round(h * 25.4);
                const areaSqft = (w * h * qty) / 144;
                rows.push([
                    win.configId, win.location || '-', zone,
                    (part.glassType === 'DGU' ? 'DGU' : 'SGU'),
                    `${part.thickness || '6'}mm`,
                    part.glassToughened ? 'Yes' : 'No',
                    String(wMM), String(hMM),
                    String(qty),
                    areaSqft.toFixed(2)
                ]);
                totalArea += areaSqft;
                totalPieces += qty;
            };
            addZone('Upper', win.upperPartition, upperZoneH);
            addZone('Lower', win.lowerPartition, lowerZoneH);
        }
    });

    if (rows.length === 0) {
        doc.text('No glass pieces in this project.', 14, y + 8);
    } else {
        rows.push([
            { content: 'TOTAL', colSpan: 8, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
            { content: String(totalPieces), styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
            { content: totalArea.toFixed(2), styles: { fontStyle: 'bold', fillColor: [240,240,240] } }
        ]);
        doc.autoTable({
            startY: y,
            margin: { left: 14, right: 14 },
            head: [['Window/Door', 'Location', 'Zone', 'Type', 'Thk', 'Tough.', 'W (mm)', 'H (mm)', 'Qty', 'Area sqft']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [2, 136, 209], textColor: [255,255,255], fontSize: 8, halign: 'center' },
            bodyStyles: { fontSize: 8, halign: 'center' }
        });
    }

    doc.save(`${project}_Glass_Order.pdf`);
}

// --- Partition Sheet Order --------------------------------------------------
function exportPartitionSheetOrderPDF() {
    if (!optimizationResults) { showAlert('⚠️ Run optimization first.'); return; }
    const sheetRes = optimizationResults.sheetResults;
    if (!sheetRes || !sheetRes.byGroup || Object.keys(sheetRes.byGroup).length === 0) {
        showAlert('No partition sheets in this project.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const project = optimizationResults.project;

    let y = _drawVendorOrderHeader(doc, '📄 Partition Sheet Order');
    doc.setFontSize(9);
    doc.text('Order the sheets listed below. Sizes shown are the actual sheet dimensions to purchase.', 14, y);
    y += 6;

    const MAT_TITLE = { ACP: 'ACP', Bakelite: 'Bakelite', ParticleBoard: 'Particle Board' };
    const rows = [];
    let grandSheets = 0;
    let grandCost = 0;

    for (const [groupKey, gr] of Object.entries(sheetRes.byGroup)) {
        const matTitle = MAT_TITLE[gr.material] || gr.material;
        const ratePerSqft = gr.ratePerSqft || 0;
        const breakdown = gr.newSheetsBreakdown || { [gr.sheetName]: gr.newSheetsUsed };
        Object.entries(breakdown).forEach(([size, count]) => {
            if (count <= 0) return;
            const catalogEntry = (SHEET_CATALOG[gr.material] || []).find(s => s.name === size);
            const sheetArea = catalogEntry ? (catalogEntry.w * catalogEntry.h / 144) : 32;
            const cost = count * sheetArea * ratePerSqft;
            rows.push([
                matTitle,
                gr.thickness,
                size,
                String(count),
                (count * sheetArea).toFixed(1),
                ratePerSqft ? `₹${ratePerSqft}` : '-',
                cost > 0 ? `₹${cost.toFixed(0)}` : '-'
            ]);
            grandSheets += count;
            grandCost   += cost;
        });

        // From-stock line if any
        if (gr.storeSheetsUsed > 0) {
            rows.push([
                matTitle,
                gr.thickness,
                'From stock (partials)',
                String(gr.storeSheetsUsed),
                '-', '-', '— used from your stock'
            ]);
        }
    }

    rows.push([
        { content: 'GRAND TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
        { content: String(grandSheets) + ' new sheets', styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
        { content: '', styles: { fillColor: [240,240,240] } },
        { content: '', styles: { fillColor: [240,240,240] } },
        { content: grandCost > 0 ? `₹${grandCost.toFixed(0)}` : '-', styles: { fontStyle: 'bold', fillColor: [240,240,240] } }
    ]);

    doc.autoTable({
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['Material', 'Thickness', 'Sheet Size', 'Qty', 'Total Area (sqft)', 'Rate ₹/sqft', 'Cost']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [191, 54, 12], textColor: [255,255,255], fontSize: 9, halign: 'center' },
        bodyStyles: { fontSize: 9, halign: 'center' }
    });

    doc.save(`${project}_Partition_Sheet_Order.pdf`);
}

// --- Mosquito Net Roll Order ------------------------------------------------
function exportNetRollOrderPDF() {
    if (!optimizationResults) { showAlert('⚠️ Run optimization first.'); return; }
    const netRes = optimizationResults.netResults;
    if (!netRes || !netRes.bins || netRes.bins.length === 0) {
        showAlert('No mosquito net in this project.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const project = optimizationResults.project;

    let y = _drawVendorOrderHeader(doc, '🕸️ Mosquito Net Roll Order');
    doc.setFontSize(9);
    doc.text('New rolls needed for this project. Stock partials (if any) are listed at the end for reference.', 14, y);
    y += 6;

    // Group new rolls by width
    const byWidth = {};
    let totalNewRolls = 0;
    netRes.bins.filter(b => b.kind === 'new').forEach(b => {
        const w = b.width;
        if (!byWidth[w]) byWidth[w] = { count: 0, totalLength: 0 };
        byWidth[w].count++;
        byWidth[w].totalLength += b.capacityLength;
        totalNewRolls++;
    });

    const rows = [];
    Object.entries(byWidth).forEach(([w, info]) => {
        const wFt = parseFloat(w) / 12;
        const lFt = info.totalLength / 12;
        rows.push([
            `${w}" (${wFt.toFixed(1)}')`,
            `${info.totalLength.toFixed(1)}" (${lFt.toFixed(1)} ft)`,
            String(info.count),
            `${(info.totalLength * 25.4).toFixed(0)} mm`
        ]);
    });

    // From-stock (partials used) summary
    const storeBins = netRes.bins.filter(b => b.kind === 'store');
    if (storeBins.length > 0) {
        rows.push([
            { content: '— Partials from your stock —', colSpan: 4, styles: { fontStyle: 'italic', halign: 'center', fillColor: [232, 245, 233], textColor: [27, 94, 32] } }
        ]);
        storeBins.forEach(b => {
            rows.push([
                `${b.width}"`,
                `${b.capacityLength.toFixed(1)}"`,
                '1',
                `${b.label || '—'}`
            ]);
        });
    }

    rows.push([
        { content: 'TOTAL NEW ROLLS', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
        { content: String(totalNewRolls), styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
        { content: '', styles: { fillColor: [240,240,240] } }
    ]);

    doc.autoTable({
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['Roll Width', 'Roll Length', 'Qty (rolls)', 'Notes / Source']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [106, 27, 154], textColor: [255,255,255], fontSize: 9, halign: 'center' },
        bodyStyles: { fontSize: 9, halign: 'center' }
    });

    doc.save(`${project}_Net_Roll_Order.pdf`);
}

// --- Powder Coating Calculation ---------------------------------------------
function exportPowderCoatingPDF() {
    if (!optimizationResults || !optimizationResults.results) { showAlert('⚠️ Run optimization first.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const project = optimizationResults.project;

    let y = _drawVendorOrderHeader(doc, '✨ Powder Coating Calculation');
    doc.setFontSize(9);
    doc.text('Per-section running-foot cost. Length = total purchased aluminum (includes wastage offcuts).', 14, y);
    y += 6;

    // Aggregate by (series, component)
    const lookupPC = (typeof lookupPowderCoatingRate === 'function') ? lookupPowderCoatingRate : null;
    const aggregated = {};

    for (const [key, plans] of Object.entries(optimizationResults.results)) {
        const parts = key.split('|').map(s => s.trim());
        const series = parts[0] || '';
        const compName = parts[1] || key;

        let purchasedLenIn = 0;
        plans.forEach(plan => {
            const stockLen = parseFloat(plan.stockLength ?? plan.stock ?? 0);
            if (stockLen > 0) purchasedLenIn += stockLen;
        });

        const rate = lookupPC ? (lookupPC(series, compName) || 0) : 0;
        const lenFt = purchasedLenIn / 12;
        const cost = lenFt * rate;
        const aggKey = key;
        aggregated[aggKey] = { series, component: compName, lenFt, rate, cost };
    }

    const rows = [];
    let grandLen = 0;
    let grandCost = 0;
    Object.values(aggregated)
        .sort((a, b) => a.series.localeCompare(b.series) || a.component.localeCompare(b.component))
        .forEach(r => {
            rows.push([
                r.series,
                r.component,
                r.lenFt.toFixed(2),
                r.rate ? `₹${r.rate}` : '-',
                r.cost ? `₹${r.cost.toFixed(0)}` : '-'
            ]);
            grandLen  += r.lenFt;
            grandCost += r.cost;
        });

    if (rows.length === 0) {
        doc.text('No powder coating data — run optimization first.', 14, y + 8);
    } else {
        rows.push([
            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
            { content: grandLen.toFixed(2), styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
            { content: '', styles: { fillColor: [240,240,240] } },
            { content: grandCost > 0 ? `₹${grandCost.toFixed(0)}` : '-', styles: { fontStyle: 'bold', fillColor: [240,240,240] } }
        ]);
        doc.autoTable({
            startY: y,
            margin: { left: 14, right: 14 },
            head: [['Series', 'Component / Section', 'Length (ft)', 'Rate ₹/ft', 'Cost']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [85, 139, 47], textColor: [255,255,255], fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 9, halign: 'center' },
            columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } }
        });
    }

    doc.save(`${project}_Powder_Coating.pdf`);
}

// ============================================================================
// v1.27 — MASTER ORDER SUMMARY (single-page vendor overview)
// ============================================================================

function exportMasterOrderSummaryPDF() {
    if (!optimizationResults || !optimizationResults.results) {
        showAlert('⚠️ Run optimization first.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const project = optimizationResults.project;
    const projectWindows = windows.filter(w => w.projectName === project);
    const PW = doc.internal.pageSize.width;
    const today = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    // ── Top banner ─────────────────────────────────────────────────────────
    doc.setFillColor(30, 60, 114);
    doc.rect(0, 0, PW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('📊 Master Order Summary', 14, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${project}`, PW - 14, 9, { align: 'right' });
    doc.text(`Date: ${today}`, PW - 14, 16, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    let y = 28;

    // ── Helper to draw a section header strip ──────────────────────────────
    function drawSection(title, colorRGB, summary, totalText) {
        const padX = 14;
        // Header strip
        doc.setFillColor(...colorRGB);
        doc.rect(padX, y, PW - 2 * padX, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(title, padX + 3, y + 5);
        if (totalText) {
            doc.text(totalText, PW - padX - 3, y + 5, { align: 'right' });
        }
        y += 8;

        // Body lines (v1.30: wrap to box width)
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const lineH = 4.5;
        const lines = Array.isArray(summary) ? summary : [summary];
        const maxW = PW - 2 * padX - 6;
        // First pass: split each input line into wrapped segments
        const wrapped = [];
        lines.forEach(line => {
            const parts = doc.splitTextToSize(line, maxW);
            parts.forEach(p => wrapped.push(p));
        });
        const bgR = colorRGB[0] + (255 - colorRGB[0]) * 0.88;
        const bgG = colorRGB[1] + (255 - colorRGB[1]) * 0.88;
        const bgB = colorRGB[2] + (255 - colorRGB[2]) * 0.88;
        doc.setFillColor(bgR, bgG, bgB);
        doc.rect(padX, y, PW - 2 * padX, wrapped.length * lineH + 4, 'F');
        wrapped.forEach((line, i) => {
            doc.text(line, padX + 3, y + 4 + i * lineH);
        });
        y += wrapped.length * lineH + 6;
    }

    // ── 1. Aluminum Profiles ────────────────────────────────────────────────
    let totalSticks = 0;
    let totalAluminumWt = 0;
    let totalAluminumCost = 0;
    const aluminumSeriesCounts = {};
    for (const [key, plans] of Object.entries(optimizationResults.results)) {
        plans.forEach(plan => {
            totalSticks++;
            totalAluminumCost += plan.cost || 0;
        });
        const sec = optimizationResults.componentSections && optimizationResults.componentSections[key];
        if (sec && sec.weight) {
            plans.forEach(plan => {
                const stockLen = parseFloat(plan.stock) || 0;
                totalAluminumWt += (stockLen / 144) * sec.weight;
            });
        }
        const seriesName = key.split('|')[0].trim();
        aluminumSeriesCounts[seriesName] = (aluminumSeriesCounts[seriesName] || 0) + plans.length;
    }
    const seriesBreak = Object.entries(aluminumSeriesCounts)
        .map(([s, n]) => `${s}: ${n} sticks`).join('   |   ');
    drawSection(
        '🏭 Aluminum Profiles',
        [108, 117, 125],
        [
            `Total: ${totalSticks} sticks   |   Weight: ${totalAluminumWt.toFixed(1)} kg`,
            seriesBreak ? `Breakdown: ${seriesBreak}` : ''
        ].filter(Boolean),
        `₹ ${totalAluminumCost.toFixed(0)}`
    );

    // ── 2. Glass ───────────────────────────────────────────────────────────
    let glassPieces = 0;
    let glassAreaSqft = 0;
    let glassCost = 0;
    const glassByType = {};
    projectWindows.forEach(win => {
        const winQty = win.qty || 1;
        const isDoor = win.category === 'Door';
        if (!isDoor) {
            const glass = (typeof calculateGlassDimensions === 'function') ? calculateGlassDimensions(win) : null;
            const gi    = (typeof resolveGlassInfo === 'function') ? resolveGlassInfo(win) : null;
            if (glass && gi && gi.hasGlass) {
                const qty = (glass.qty || 1) * winQty;
                const a = ((glass.width * glass.height) / 144) * qty;
                glassPieces += qty;
                glassAreaSqft += a;
                const r = (gi.rateKey ? ratesConfig.glass[gi.rateKey] : 0) || 0;
                glassCost += a * r;
                const k = `${gi.unit} ${gi.thickness}mm${gi.toughened ? ' Tough' : ''}`;
                glassByType[k] = (glassByType[k] || 0) + qty;
            }
        } else {
            // Doors — use calculateDoorGlassCost for cost; count pieces from partitions
            if (typeof calculateDoorGlassCost === 'function') {
                glassCost += calculateDoorGlassCost(win);
            }
            const L = win.leaves || 1;
            const up = win.upperPartition;
            const lo = win.lowerPartition;
            [up, lo].forEach(part => {
                if (part && part.material === 'Glass') {
                    const qty = winQty * L;
                    glassPieces += qty;
                    const k = `${part.glassType || 'SGU'} ${part.thickness || '6'}mm${part.glassToughened ? ' Tough' : ''}`;
                    glassByType[k] = (glassByType[k] || 0) + qty;
                }
            });
        }
    });
    const glassTypeBreak = Object.entries(glassByType)
        .map(([t, n]) => `${n} × ${t}`).join('   |   ');
    if (glassPieces > 0) {
        drawSection(
            '🪟 Glass',
            [2, 136, 209],
            [
                `Total: ${glassPieces} pieces   |   Area: ${glassAreaSqft.toFixed(1)} sqft (windows)`,
                glassTypeBreak ? `By type: ${glassTypeBreak}` : ''
            ].filter(Boolean),
            `₹ ${glassCost.toFixed(0)}`
        );
    }

    // ── 3. Partition Sheets ────────────────────────────────────────────────
    const sheetRes = optimizationResults.sheetResults;
    if (sheetRes && sheetRes.byGroup && Object.keys(sheetRes.byGroup).length > 0) {
        const MAT_TITLE = { ACP: 'ACP', Bakelite: 'Bakelite', ParticleBoard: 'PB' };
        let sheetTotalCost = 0;
        let sheetTotalCount = 0;
        const sheetLines = [];
        for (const [, gr] of Object.entries(sheetRes.byGroup)) {
            const matTitle = MAT_TITLE[gr.material] || gr.material;
            const bd = gr.newSheetsBreakdown || { [gr.sheetName]: gr.newSheetsUsed };
            const bdStr = Object.entries(bd).filter(([,n]) => n > 0)
                .map(([nm,n]) => `${n} × ${nm}`).join(' + ');
            const stockNote = gr.storeSheetsUsed > 0 ? ` + ${gr.storeSheetsUsed} from stock` : '';
            sheetLines.push(`${matTitle} ${gr.thickness}: ${bdStr || '0 new'}${stockNote}   →   ₹${(gr.cost || 0).toFixed(0)}`);
            sheetTotalCost  += gr.cost || 0;
            sheetTotalCount += gr.bins.length;
        }
        drawSection(
            '📄 Partition Sheets',
            [191, 54, 12],
            sheetLines,
            `₹ ${sheetTotalCost.toFixed(0)}`
        );
    }

    // ── 4. Mosquito Net ────────────────────────────────────────────────────
    const netRes = optimizationResults.netResults;
    if (netRes && netRes.bins && netRes.bins.length > 0) {
        const storeBins = netRes.bins.filter(b => b.kind === 'store');
        const newBins   = netRes.bins.filter(b => b.kind === 'new');
        const byWidth = {};
        newBins.forEach(b => { byWidth[b.width] = (byWidth[b.width] || 0) + 1; });
        const newStr = Object.entries(byWidth).map(([w, n]) => `${n} × ${w}" × 50ft`).join(' + ');
        const lines = [];
        if (newStr) lines.push(`Order: ${newStr}`);
        if (storeBins.length > 0) lines.push(`From stock: ${storeBins.length} partial roll${storeBins.length > 1 ? 's' : ''}`);
        const totalPieces = countNetPieces(netRes);
        lines.push(`Total pieces to cut: ${totalPieces}`);
        drawSection(
            '🕸️ Mosquito Net',
            [142, 68, 173],
            lines,
            `₹ ${(netRes.cost || 0).toFixed(0)}`
        );
    }

    // ── 5. Hardware ────────────────────────────────────────────────────────
    let hwTotalQty = 0;
    let hwTotalCost = 0;
    const hwByName = {};
    projectWindows.forEach(win => {
        if (typeof calculateWindowHardware !== 'function') return;
        const hwList = calculateWindowHardware(win, optimizationResults);
        const winQty = win.qty || 1;
        hwList.forEach(h => {
            const q = (h.qty || 0) * winQty;
            const c = (h.total || 0) * winQty;
            hwTotalQty  += q;
            hwTotalCost += c;
            hwByName[h.hardware] = (hwByName[h.hardware] || 0) + q;
        });
    });
    if (hwTotalQty > 0) {
        const distinctNames = Object.keys(hwByName).length;
        const topItems = Object.entries(hwByName)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 4)
            .map(([n,q]) => `${q} × ${n}`)
            .join('   |   ');
        drawSection(
            '🔩 Hardware',
            [0, 121, 107],
            [
                `Total: ${Math.round(hwTotalQty * 100) / 100} items across ${distinctNames} types`,
                topItems ? `Top items: ${topItems}` : ''
            ].filter(Boolean),
            `₹ ${hwTotalCost.toFixed(0)}`
        );
    }

    // ── 6. Powder Coating ──────────────────────────────────────────────────
    let pcTotalFt = 0;
    let pcTotalCost = 0;
    const lookupPC = (typeof lookupPowderCoatingRate === 'function') ? lookupPowderCoatingRate : null;
    for (const [key, plans] of Object.entries(optimizationResults.results)) {
        const parts = key.split('|').map(s => s.trim());
        const series = parts[0] || '';
        const compName = parts[1] || key;
        const rate = lookupPC ? (lookupPC(series, compName) || 0) : 0;
        let purchasedLenIn = 0;
        plans.forEach(plan => {
            const stockLen = parseFloat(plan.stockLength ?? plan.stock ?? 0);
            if (stockLen > 0) purchasedLenIn += stockLen;
        });
        const ft = purchasedLenIn / 12;
        pcTotalFt   += ft;
        pcTotalCost += ft * rate;
    }
    drawSection(
        '✨ Powder Coating',
        [85, 139, 47],
        [`Total: ${pcTotalFt.toFixed(1)} ft purchased aluminum (includes wastage offcuts)`],
        `₹ ${pcTotalCost.toFixed(0)}`
    );

    // ── Grand Total strip ──────────────────────────────────────────────────
    const grandTotal = totalAluminumCost + glassCost
                     + ((sheetRes && sheetRes.byGroup) ? Object.values(sheetRes.byGroup).reduce((s, g) => s + (g.cost || 0), 0) : 0)
                     + (netRes ? (netRes.cost || 0) : 0)
                     + hwTotalCost
                     + pcTotalCost;

    y += 4;
    doc.setFillColor(30, 60, 114);
    doc.rect(14, y, PW - 28, 11, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('GRAND TOTAL (Vendor Side)', 17, y + 7.5);
    doc.text(`₹ ${grandTotal.toFixed(0)}`, PW - 17, y + 7.5, { align: 'right' });

    y += 14;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('Note: vendor-side cost — does not include labor, transport, GST adjustments, or markups.', 14, y);
    y += 4;
    doc.text('Customer-facing pricing is on the Customer Quotation PDF.', 14, y);

    doc.save(`${project}_Master_Order_Summary.pdf`);
}

// ============================================================================
// v1.28 — PROJECT SPEC SHEET (one A4 page per window/door)
// ============================================================================

async function exportProjectSpecSheetPDF() {
    if (!optimizationResults) { showAlert('⚠️ Run optimization first.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const project = optimizationResults.project;
    const projectWindows = windows.filter(w => w.projectName === project);
    if (projectWindows.length === 0) { showAlert('No windows/doors in this project.'); return; }

    // Read labor rate once (same as quotation modal)
    const labelEl = document.getElementById('qtModalLaborPerSqft');
    const laborPerSqft = labelEl ? (parseFloat(labelEl.value) || 0) : 0;

    for (let i = 0; i < projectWindows.length; i++) {
        if (i > 0) doc.addPage();
        await _drawSpecPage(doc, projectWindows[i], i + 1, projectWindows.length, project, laborPerSqft);
    }

    doc.save(`${project}_Project_Spec_Sheet.pdf`);
}

async function _drawSpecPage(doc, win, pageNum, totalPages, project, laborPerSqft) {
    const PW = doc.internal.pageSize.width;
    const PH = doc.internal.pageSize.height;
    const MG = 10;                              // v1.30: tighter margins
    const isDoor = win.category === 'Door';
    const today = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    // ── Top banner (compact, 16mm) ─────────────────────────────────────────
    const bannerColor = isDoor ? [191, 54, 12] : [30, 60, 114];
    doc.setFillColor(...bannerColor);
    doc.rect(0, 0, PW, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${isDoor ? '🚪' : '🪟'} ${win.configId}  —  ${win.description || (isDoor ? 'Door' : 'Window')}`, MG, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Project: ${project}   |   Date: ${today}   |   Page ${pageNum} of ${totalPages}`,
        PW - MG, 12, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    let y = 20;

    // ── Top row: Identification + Dimensions combined (left) + Diagram (right)
    const diagW = 60;
    const idW = PW - 2 * MG - 4 - diagW;
    const wMm = Math.round(win.width * 25.4);
    const hMm = Math.round(win.height * 25.4);
    const areaSqft = (win.width * win.height / 144);
    const idLines = [
        `ID: ${win.configId}    Qty: ${win.qty || 1}    ${isDoor ? ((win.leaves || 1) > 1 ? 'Double Door' : 'Single Door') : 'Window'}`,
        `Location: ${win.location || '—'}`,
        `Vendor: ${win.vendor || '—'}   |   Series: ${win.series || '—'}`,
        `Size: ${wMm} × ${hMm} mm   (${win.width.toFixed(2)}" × ${win.height.toFixed(2)}")   |   Area: ${areaSqft.toFixed(2)} sqft`
    ];
    _drawSpecBlock(doc, 'Identification & Dimensions', idLines, [108, 117, 125], MG, y, idW, 25);

    // Diagram on the right — compact, frame around
    try {
        const svgString = (typeof generateWindowDiagram === 'function') ? generateWindowDiagram(win) : null;
        if (svgString) {
            const png = await _svgToPngDataUrl(svgString, 1.5, 'png');
            if (png && png.dataUrl) {
                const maxH = 25;
                let imgW = diagW - 2;
                let imgH = (png.h / png.w) * imgW;
                if (imgH > maxH) { imgH = maxH; imgW = (png.w / png.h) * imgH; }
                const dx = PW - MG - diagW + (diagW - imgW) / 2;
                const dy = y + (25 - imgH) / 2;
                doc.setDrawColor(220, 220, 220);
                doc.rect(PW - MG - diagW, y, diagW, 25);
                doc.addImage(png.dataUrl, png.fmt || 'PNG', dx, dy, imgW, imgH);
            }
        }
    } catch (e) { console.warn('Spec sheet diagram error:', e); }

    y += 27;

    // ── Construction + Partitions combined (doors) ────────────────────────
    const constrLines = [];
    if (isDoor) {
        constrLines.push(`Frame: ${win.frame ? '3-Side' : 'No frame'}   |   Closing: ${win.closingMechanism === 'FloorSpring' ? 'Floor Spring' : 'Hinge'}`);
        constrLines.push(`Handle: ${win.handleProfile || 'Door Vertical'} (${win.handleWidth || 47.5}mm)   |   Bottom: ${win.bottomProfile || 'Door Bottom'} (${win.bottomWidth || 114.5}mm)`);
        constrLines.push(`Top: ${win.topWidth || 47.5}mm   |   Middle: ${win.middleWidth || 47.5}mm${win.floorSpringHingeProfile ? '   |   FS Hinge: ' + win.floorSpringHingeProfile : ''}`);
        // Add partitions inline (saves a whole block)
        const fmt = (p) => {
            if (!p || !p.material || p.material === 'None') return 'None / Open';
            if (p.material === 'Glass') return `Glass ${p.glassType || 'SGU'} ${p.thickness || '6'}mm${p.glassToughened ? ' Tough' : ''}`;
            if (p.material === 'ACP') return `ACP ${p.thickness || '4'}mm (${p.acpFacing === 'double' ? '2 sheets/panel' : '1 sheet/panel'})`;
            return `${p.material} ${p.thickness || ''}mm`.trim();
        };
        const midPos = win.middleRailPositionMM != null ? `${win.middleRailPositionMM}mm from bottom` : 'Centre';
        constrLines.push(`⬆ Upper: ${fmt(win.upperPartition)}   |   ⬇ Lower: ${fmt(win.lowerPartition)}`);
        constrLines.push(`Middle Rail: ${midPos}`);
    } else {
        constrLines.push(`Tracks: ${win.tracks || '—'}   |   Shutters: ${win.shutters || '—'}   |   Mosquito: ${win.mosquitoShutters || 0}`);
        constrLines.push(`Glass: ${win.glassUnit || 'SGU'} ${win.glassThickness || '5'}mm${win.glassToughened ? ' Toughened' : ''}`);
        if (win.interlockType) constrLines.push(`Interlock: ${win.interlockType}   |   Corner Joint: ${win.cornerJoint || 90}°`);
        if (win.mosquitoShutters > 0) constrLines.push(`Mosquito Type: ${win.mosquitoType || 'V-2513'}, Interlock: ${win.mosquitoInterlock || 'V-2516'}`);
    }
    _drawSpecBlock(doc,
        isDoor ? 'Construction & Partitions' : 'Construction',
        constrLines, bannerColor, MG, y, PW - 2 * MG,
        constrLines.length * 3.5 + 7);
    y += constrLines.length * 3.5 + 9;

    // ── Accessories table (compact) ───────────────────────────────────────
    const accList = (typeof calculateWindowHardware === 'function')
        ? calculateWindowHardware(win, optimizationResults)
        : [];
    if (accList.length > 0) {
        doc.setFillColor(0, 121, 107);
        doc.rect(MG, y, PW - 2 * MG, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(isDoor ? 'Accessories' : 'Hardware', MG + 2, y + 3.6);
        y += 6;
        doc.setTextColor(0, 0, 0);

        const accBody = accList.map(h => [
            h.hardware,
            (Math.round(h.qty * 100) / 100).toString(),
            h.unit || 'Nos',
            `₹${h.rate}`,
            `₹${(h.total).toFixed(0)}`
        ]);
        const hwTotal = accList.reduce((s, h) => s + h.total, 0);
        accBody.push([
            { content: 'Hardware Subtotal', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [240,240,240] } },
            { content: `₹${hwTotal.toFixed(0)}`, styles: { fontStyle: 'bold', fillColor: [240,240,240] } }
        ]);

        doc.autoTable({
            startY: y,
            margin: { left: MG, right: MG },
            head: [['Item — Variant', 'Qty', 'Unit', 'Rate', 'Total']],
            body: accBody,
            theme: 'grid',
            headStyles: { fillColor: [0, 121, 107], textColor: [255,255,255], fontSize: 7.5, halign: 'center', cellPadding: 1.2 },
            bodyStyles:  { fontSize: 7, valign: 'middle', cellPadding: 1 },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'center', cellWidth: 14 },
                2: { halign: 'center', cellWidth: 12 },
                3: { halign: 'right',  cellWidth: 18 },
                4: { halign: 'right',  cellWidth: 22 }
            }
        });
        y = doc.lastAutoTable.finalY + 2;
    }

    // ── Cost Summary (compact, 2-column layout for tighter fit) ──────────
    if (typeof calculateWindowTotalCost === 'function') {
        try {
            const c = calculateWindowTotalCost(win, { laborPerSqft });
            const q = win.qty || 1;

            // Don't break to a new page — try to fit on the same page (v1.30 goal)
            doc.setFillColor(30, 60, 114);
            doc.rect(MG, y, PW - 2 * MG, 5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`Cost Summary (Per Unit × Qty ${q})`, MG + 2, y + 3.6);
            y += 6;
            doc.setTextColor(0, 0, 0);

            const costRows = [
                ['Profile',         `₹${(c.profileCost || 0).toFixed(0)}`,           `₹${((c.profileCost || 0) * q).toFixed(0)}`],
                ['Profile Waste',   `₹${(c.wastageCost || 0).toFixed(0)}`,           `₹${((c.wastageCost || 0) * q).toFixed(0)}`],
                ['Powder Coat',     `₹${(c.powderCoatingCost || 0).toFixed(0)}`,     `₹${((c.powderCoatingCost || 0) * q).toFixed(0)}`],
                ['Glass / Part.',   `₹${(c.glassCost || 0).toFixed(0)}`,             `₹${((c.glassCost || 0) * q).toFixed(0)}`],
                ['Sheet Waste',     `₹${(c.partitionWastageCost || 0).toFixed(0)}`,  `₹${((c.partitionWastageCost || 0) * q).toFixed(0)}`],
                ['Hardware',        `₹${(c.hardwareCost || 0).toFixed(0)}`,          `₹${((c.hardwareCost || 0) * q).toFixed(0)}`],
                ['Labor',           `₹${(c.laborCost || 0).toFixed(0)}`,             `₹${((c.laborCost || 0) * q).toFixed(0)}`],
                [
                    { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [235, 235, 235] } },
                    { content: `₹${(c.totalCost || 0).toFixed(0)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [235, 235, 235] } },
                    { content: `₹${((c.totalCost || 0) * q).toFixed(0)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [235, 235, 235] } }
                ]
            ];

            doc.autoTable({
                startY: y,
                margin: { left: MG, right: MG },
                head: [['Item', 'Per Unit', `Line Total (×${q})`]],
                body: costRows,
                theme: 'grid',
                headStyles: { fillColor: [30, 60, 114], textColor: [255,255,255], fontSize: 7.5, halign: 'center', cellPadding: 1.2 },
                bodyStyles:  { fontSize: 7.5, cellPadding: 1 },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'right', cellWidth: 30 },
                    2: { halign: 'right', cellWidth: 36 }
                }
            });
            y = doc.lastAutoTable.finalY + 2;
        } catch (e) {
            console.warn('Spec page cost calc error:', e);
        }
    }

    // ── Sign-off footer ────────────────────────────────────────────────────
    if (y < PH - 12) {
        doc.setDrawColor(180, 180, 180);
        doc.line(MG, PH - 10, PW - MG, PH - 10);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Approved by: ______________________________', MG, PH - 5);
        doc.text('Date: ________________', PW - MG - 45, PH - 5);
    }
}

// Helper to draw a labeled rectangular spec block (v1.30: compact)
function _drawSpecBlock(doc, title, lines, color, x, y, w, h) {
    // Header bar (4.5mm tall)
    doc.setFillColor(...color);
    doc.rect(x, y, w, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(title, x + 2, y + 3.3);
    // Body box (light tint)
    const bgR = color[0] + (255 - color[0]) * 0.9;
    const bgG = color[1] + (255 - color[1]) * 0.9;
    const bgB = color[2] + (255 - color[2]) * 0.9;
    doc.setFillColor(bgR, bgG, bgB);
    doc.rect(x, y + 4.5, w, h - 4.5, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, w, h);
    // Body lines — auto-wrap to box width to avoid overflow
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const maxTextW = w - 4;
    let curY = y + 8;
    lines.forEach(line => {
        const wrapped = doc.splitTextToSize(line, maxTextW);
        wrapped.forEach(wl => {
            if (curY < y + h) {
                doc.text(wl, x + 2, curY);
                curY += 3.5;
            }
        });
    });
}


// Format an inch value as "Xmm (Y")" — used everywhere in the diagram PDFs
function _fmtMmIn(inches) {
    const mm = Math.round(inches * 25.4);
    return `${mm}mm (${inches.toFixed(1)}")`;
}

// Carpenter-friendly fraction format — always denominator 8 (NEVER simplifies
// to 1/4 or 1/2). Carpenters count in 1/8 marks on their tapes.
// 30.25" → "30 2/8\"", 30.5" → "30 4/8\"", 30.125" → "30 1/8\""
function _fmtCarpenterFraction(inches) {
    if (inches == null || isNaN(inches)) return '-';
    const sign = inches < 0 ? '-' : '';
    const abs = Math.abs(inches);
    const whole = Math.floor(abs);
    const remainder = abs - whole;
    const eighths = Math.round(remainder * 8);
    if (eighths === 0) return `${sign}${whole}"`;
    if (eighths === 8) return `${sign}${whole + 1}"`;
    if (whole === 0)   return `${sign}${eighths}/8"`;
    return `${sign}${whole} ${eighths}/8"`;
}

// For site / cutter PDFs: shows both mm and carpenter fraction.
// "762mm (30 2/8\")"
function _fmtMmInFrac(inches) {
    const mm = Math.round(inches * 25.4);
    return `${mm}mm (${_fmtCarpenterFraction(inches)})`;
}

// Convert an SVG string into an image data URL via off-screen canvas.
// v1.30: switched from PNG to JPEG and dropped default scale from 2× → 1×
// to reduce file size dramatically (Sheet Cut PDF was 130 MB, now ~5-10 MB).
// JPEG quality 0.78 keeps diagrams readable; canvas pixel-cap prevents huge
// renders.
//
// fmt: 'jpeg' (default, small) or 'png' (use only when you need transparency)
function _svgToPngDataUrl(svgString, scale, fmt, quality) {
    scale   = scale   || 1;       // was 2
    fmt     = fmt     || 'jpeg';
    quality = quality || 0.78;
    const MAX_DIM = 1400;         // cap canvas to keep file size sane

    return new Promise(resolve => {
        try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
            const svgEl  = svgDoc.documentElement;
            const w = parseFloat(svgEl.getAttribute('width'))  || 600;
            const h = parseFloat(svgEl.getAttribute('height')) || 400;

            let cw = Math.ceil(w * scale);
            let ch = Math.ceil(h * scale);
            // Scale down further if either dimension exceeds the cap
            const overshoot = Math.max(cw / MAX_DIM, ch / MAX_DIM);
            if (overshoot > 1) { cw = Math.ceil(cw / overshoot); ch = Math.ceil(ch / overshoot); }

            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url  = URL.createObjectURL(blob);
            const img  = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width  = cw;
                    canvas.height = ch;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const mime = (fmt === 'png') ? 'image/png' : 'image/jpeg';
                    const dataUrl = (fmt === 'png')
                        ? canvas.toDataURL(mime)
                        : canvas.toDataURL(mime, quality);
                    URL.revokeObjectURL(url);
                    resolve({ dataUrl, w, h, fmt: (fmt === 'png') ? 'PNG' : 'JPEG' });
                } catch (e) {
                    URL.revokeObjectURL(url);
                    console.error('SVG → canvas error:', e);
                    resolve(null);
                }
            };
            img.onerror = (e) => {
                URL.revokeObjectURL(url);
                console.error('SVG image load failed:', e);
                resolve(null);
            };
            img.src = url;
        } catch (e) {
            console.error('SVG parse error:', e);
            resolve(null);
        }
    });
}

// Shared cover page drawer for both diagram PDFs.
function _drawDiagramCover(doc, title, project, orderSummaryLines, requiredRows, headColor) {
    const PW = doc.internal.pageSize.width;
    const today = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

    // Top banner
    doc.setFillColor(...headColor);
    doc.rect(0, 0, PW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(title, 14, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${project}`, PW - 14, 9, { align: 'right' });
    doc.text(`Date: ${today}`, PW - 14, 16, { align: 'right' });

    let y = 32;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Summary', 14, y);
    y += 6;

    // Order summary box
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(248, 248, 248);
    doc.rect(14, y, PW - 28, orderSummaryLines.length * 5 + 4, 'F');
    orderSummaryLines.forEach((line, i) => {
        doc.text(line, 18, y + 6 + i * 5);
    });
    y += orderSummaryLines.length * 5 + 10;

    // Required pieces table
    if (requiredRows && requiredRows.body && requiredRows.body.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Pieces Required', 14, y);
        y += 4;
        doc.autoTable({
            startY: y,
            margin: { left: 14, right: 14 },
            head: [requiredRows.head],
            body: requiredRows.body,
            theme: 'grid',
            headStyles: { fillColor: headColor, textColor: [255,255,255], fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 9, halign: 'center' }
        });
    }
}

// --- Net Cut Diagrams PDF --------------------------------------------------
async function exportNetCutDiagramsPDF() {
    if (!optimizationResults || !optimizationResults.netResults || !optimizationResults.netResults.bins) {
        showAlert('No mosquito net in this project.');
        return;
    }
    const netRes = optimizationResults.netResults;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const project = optimizationResults.project;
    const PW = doc.internal.pageSize.width;

    // === COVER PAGE ===
    const storeBins = netRes.bins.filter(b => b.kind === 'store');
    const newBins   = netRes.bins.filter(b => b.kind === 'new');
    const byWidth = {};
    newBins.forEach(b => {
        const w = b.width;
        byWidth[w] = (byWidth[w] || 0) + 1;
    });
    const orderLines = [];
    if (storeBins.length > 0) orderLines.push(`From stock: ${storeBins.length} partial roll${storeBins.length > 1 ? 's' : ''}`);
    Object.entries(byWidth).forEach(([w, n]) => {
        orderLines.push(`Order new: ${n} × ${w}" × 50 ft roll${n > 1 ? 's' : ''}`);
    });
    orderLines.push(`Total bins to cut: ${netRes.bins.length}    |    Pieces: ${countNetPieces(netRes)}`);

    // Required pieces table (grouped by label+size)
    const piecesByKey = {};
    netRes.bins.forEach(bin => {
        (bin.shelves || []).forEach(shelf => {
            (shelf.pieces || []).forEach(p => {
                const key = `${p.label}|${p.origW.toFixed(2)}|${p.origH.toFixed(2)}`;
                if (!piecesByKey[key]) piecesByKey[key] = { label: p.label, w: p.origW, h: p.origH, qty: 0 };
                piecesByKey[key].qty++;
            });
        });
    });
    const requiredBody = Object.values(piecesByKey)
        .sort((a,b) => a.label.localeCompare(b.label))
        .map(r => [
            r.label,
            _fmtMmInFrac(r.w),
            _fmtMmInFrac(r.h),
            String(r.qty)
        ]);

    _drawDiagramCover(
        doc,
        '🕸️ Mosquito Net Cutting Plan',
        project,
        orderLines,
        { head: ['Window / Label', 'Width', 'Height', 'Qty'], body: requiredBody },
        [142, 68, 173] // purple
    );

    // === ROLL PAGES ===
    const labelColorCache = {};
    for (let i = 0; i < netRes.bins.length; i++) {
        const bin = netRes.bins[i];
        doc.addPage();
        await _drawBinPage(doc, bin, i + 1, netRes.bins.length, labelColorCache,
            [142, 68, 173], '🕸️ Mosquito Net Roll');
    }

    doc.save(`${project}_Net_Cutting_Diagrams.pdf`);
}

function countNetPieces(netRes) {
    let n = 0;
    netRes.bins.forEach(bin => (bin.shelves || []).forEach(shelf => { n += (shelf.pieces || []).length; }));
    return n;
}

// --- Sheet Cut Diagrams PDF ------------------------------------------------
async function exportSheetCutDiagramsPDF() {
    if (!optimizationResults || !optimizationResults.sheetResults || !optimizationResults.sheetResults.byGroup) {
        showAlert('No partition sheets in this project.');
        return;
    }
    const sheetRes = optimizationResults.sheetResults;
    const groups = Object.values(sheetRes.byGroup);
    if (groups.length === 0) { showAlert('No partition sheets in this project.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const project = optimizationResults.project;
    const MAT_TITLE = { ACP: 'ACP', Bakelite: 'Bakelite', ParticleBoard: 'Particle Board' };

    // Combined cover page covering ALL material groups
    const orderLines = [];
    const requiredBody = [];
    let totalPieces = 0;
    let totalSheets = 0;
    groups.forEach(gr => {
        const title = MAT_TITLE[gr.material] || gr.material;
        const breakdown = gr.newSheetsBreakdown || { [gr.sheetName]: gr.newSheetsUsed };
        const bdStr = Object.entries(breakdown).filter(([,n]) => n > 0)
            .map(([nm,n]) => `${n} × ${nm}`).join(' + ');
        if (gr.storeSheetsUsed > 0) orderLines.push(`${title} ${gr.thickness}: ${gr.storeSheetsUsed} from stock + Order ${bdStr || '0 new'}`);
        else                        orderLines.push(`${title} ${gr.thickness}: Order ${bdStr || '0 new'}`);
        totalSheets += gr.bins.length;

        // Aggregate required pieces for this group
        const piecesByKey = {};
        (gr.bins || []).forEach(bin => {
            (bin.shelves || []).forEach(shelf => {
                (shelf.pieces || []).forEach(p => {
                    const key = `${p.label}|${p.origW.toFixed(2)}|${p.origH.toFixed(2)}`;
                    if (!piecesByKey[key]) piecesByKey[key] = { label: p.label, w: p.origW, h: p.origH, qty: 0 };
                    piecesByKey[key].qty++;
                    totalPieces++;
                });
            });
        });
        Object.values(piecesByKey)
            .sort((a,b) => a.label.localeCompare(b.label))
            .forEach(r => {
                requiredBody.push([
                    `${title} ${gr.thickness}`,
                    r.label,
                    _fmtMmInFrac(r.w),
                    _fmtMmInFrac(r.h),
                    String(r.qty)
                ]);
            });
    });
    orderLines.push(`Total sheets to cut: ${totalSheets}    |    Panels: ${totalPieces}`);

    _drawDiagramCover(
        doc,
        '📄 Partition Sheet Cutting Plan',
        project,
        orderLines,
        { head: ['Material', 'Door / Panel', 'Width', 'Height', 'Qty'], body: requiredBody },
        [191, 54, 12] // orange-brown
    );

    // Per-sheet pages, grouped by material
    let runningSheetNum = 0;
    const totalSheetsCount = totalSheets;
    const labelColorCache = {};
    for (const gr of groups) {
        const matTitle = MAT_TITLE[gr.material] || gr.material;
        for (let i = 0; i < gr.bins.length; i++) {
            runningSheetNum++;
            const bin = gr.bins[i];
            doc.addPage();
            await _drawBinPage(doc, bin, runningSheetNum, totalSheetsCount, labelColorCache,
                [191, 54, 12], `📄 ${matTitle} ${gr.thickness}`);
        }
    }

    doc.save(`${project}_Sheet_Cutting_Diagrams.pdf`);
}

// Shared per-bin page drawer (used by both Net + Sheet diagram PDFs)
async function _drawBinPage(doc, bin, binIndex, binTotal, labelColorCache, headColor, materialPrefix) {
    const PW = doc.internal.pageSize.width;
    const PH = doc.internal.pageSize.height;
    const today = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const project = (optimizationResults && optimizationResults.project) || '—';

    // Top banner
    doc.setFillColor(...headColor);
    doc.rect(0, 0, PW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const sourceTag = bin.kind === 'store' ? `FROM STOCK: ${bin.label}` : `NEW ROLL/SHEET: ${bin.label}`;
    doc.text(`${materialPrefix}  |  ${sourceTag}  |  Page ${binIndex} of ${binTotal}`, 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${project}    |    Date: ${today}`, PW - 14, 11, { align: 'right' });

    let y = 26;
    doc.setTextColor(0, 0, 0);

    // Dimensions header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Width: ${_fmtMmInFrac(bin.width)}    |    Length: ${_fmtMmInFrac(bin.capacityLength)}`, 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Used: ${_fmtMmInFrac(bin.usedLength)}    Leftover: ${_fmtMmInFrac(bin.capacityLength - bin.usedLength)} → return to store`, 14, y);
    y += 6;

    // Render SVG diagram → JPEG via canvas (v1.30 fix for 130 MB file size)
    if (typeof generateNetDiagramBin === 'function') {
        const svgString = generateNetDiagramBin(bin, labelColorCache);
        const pngResult = await _svgToPngDataUrl(svgString, 1, 'jpeg', 0.78);
        if (pngResult && pngResult.dataUrl) {
            // Fit width to page minus margins (PW - 28), keep aspect ratio
            const maxW = PW - 28;
            const maxH = 100; // cap at 100mm tall
            let imgW = maxW;
            let imgH = (pngResult.h / pngResult.w) * imgW;
            if (imgH > maxH) { imgH = maxH; imgW = (pngResult.w / pngResult.h) * imgH; }
            const xCenter = (PW - imgW) / 2;
            doc.addImage(pngResult.dataUrl, pngResult.fmt || 'PNG', xCenter, y, imgW, imgH);
            y += imgH + 6;
        }
    }

    // Row-by-row cutting sequence
    if (y > PH - 80) { doc.addPage(); y = 18; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cutting Sequence', 14, y);
    y += 4;

    const rowsBody = [];
    (bin.shelves || []).forEach((shelf, si) => {
        const cutFromTo = `${_fmtMmInFrac(shelf.y)} → ${_fmtMmInFrac(shelf.y + shelf.shelfH)}`;
        const piecesDesc = (shelf.pieces || []).map(p => {
            const rotMark = p.rotated ? ' ↺' : '';
            return `${_fmtMmInFrac(p.w)} × ${_fmtMmInFrac(p.h)} → ${p.label}${rotMark}`;
        }).join('\n');
        rowsBody.push([
            `Row ${si + 1}`,
            cutFromTo,
            _fmtMmInFrac(shelf.shelfH),
            piecesDesc
        ]);
    });

    doc.autoTable({
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['#', 'Cut Position', 'Row Height', 'Pieces (W × H → Label)']],
        body: rowsBody,
        theme: 'grid',
        headStyles: { fillColor: headColor, textColor: [255,255,255], fontSize: 9, halign: 'center' },
        bodyStyles: { fontSize: 8.5, valign: 'middle' },
        columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 1: { halign: 'center', cellWidth: 40 }, 2: { halign: 'center', cellWidth: 30 }, 3: { halign: 'left' } }
    });
}
