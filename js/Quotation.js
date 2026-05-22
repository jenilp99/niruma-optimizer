function getNextQuotationNumber() {
    let lastNo = parseInt(localStorage.getItem('lastQuoteNo') || '1000') + 1;
    localStorage.setItem('lastQuoteNo', lastNo.toString());
    const year = new Date().getFullYear();
    return `NRM/QT/${year}/${String(lastNo).padStart(4, '0')}`;
}

function generateQuotation() {
    const projectSelector = document.getElementById('projectSelector');
    const selectedProject = projectSelector.value;

    if (!selectedProject) {
        showAlert('⚠️ Please select a project first!');
        return;
    }

    // Show confirmation if optimization hasn't been run for current project
    if (!optimizationResults || !optimizationResults.results || optimizationResults.project !== selectedProject) {
        showConfirm('⚠️ Users can generate quotations anytime, but quantities will be more accurate after running Smart Optimization!\n\nDo you want to proceed with estimated quantities?', () => {
            const projectWindows = windows.filter(w => w.projectName === selectedProject);
            if (projectWindows.length === 0) {
                showAlert('⚠️ No windows found for this project!');
                return;
            }
            showQuotationInputDialog(projectWindows, selectedProject);
        });
        return;
    }

    const projectWindows = windows.filter(w => w.projectName === selectedProject);

    if (projectWindows.length === 0) {
        showAlert('⚠️ No windows found for this project!');
        return;
    }

    // Verify sections configured
    if (!verifySectionsConfigured()) return;

    // Show quotation input dialog
    showQuotationInputDialog(projectWindows, selectedProject);
}

function showQuotationInputDialog(projectWindows, selectedProject) {
    document.getElementById('qtModalQuoteNo').value = getNextQuotationNumber();
    document.getElementById('qtModalClientName').value =
        (projectSettings && projectSettings.clientName) ? projectSettings.clientName : '';
    document.getElementById('qtModalClientAddress').value = '';
    document.getElementById('qtModalDeliveryAddress').value = '';
    document.getElementById('qtModalGST').value = '18';
    document.getElementById('qtModalLabor').value = '0';
    document.getElementById('qtModalLeadTime').value = '21 Working Days';
    document.getElementById('qtModalUnit').value = 'mm';

    window._qtWindows = projectWindows;
    window._qtProject = selectedProject;

    document.getElementById('quotationInputModal').classList.add('active');
}

function closeQuotationModal() {
    document.getElementById('quotationInputModal').classList.remove('active');
}

function confirmGenerateQuotation() {
    const formData = {
        quoteNo:         document.getElementById('qtModalQuoteNo').value.trim() || getNextQuotationNumber(),
        clientName:      document.getElementById('qtModalClientName').value.trim() || '',
        clientAddress:   document.getElementById('qtModalClientAddress').value.trim(),
        deliveryAddress: document.getElementById('qtModalDeliveryAddress').value.trim(),
        gstPct:          parseFloat(document.getElementById('qtModalGST').value) || 18,
        laborPerSqft:    parseFloat(document.getElementById('qtModalLabor').value) || 0,
        leadTime:        document.getElementById('qtModalLeadTime').value.trim() || '21 Working Days',
        displayUnit:     document.getElementById('qtModalUnit').value || 'mm',
    };
    closeQuotationModal();
    generateQuotationPDF(window._qtWindows, window._qtProject, formData);
}

// PDF EXPORT FUNCTIONS (STUBS/IMPLEMENTATIONS)
function generateMaterialPurchaseListPDF(projectWindows, selectedProject) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Get Supplier Name (Try optimizationResults, or global registry, or DOM)
    let supplierName = "Generic";
    if (optimizationResults && optimizationResults.supplier) {
        supplierName = optimizationResults.supplier;
    } else {
        const supElem = document.getElementById('supplierSelector');
        if (supElem) supplierName = supElem.value || "Generic";
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Material Purchase List: ${selectedProject}`, 14, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Supplier: ${supplierName}`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 34);

    doc.setTextColor(0, 0, 0);

    const body = [];

    // Group by Material AND Length
    for (const [key, data] of Object.entries(optimizationResults.results)) {
        const section = optimizationResults.componentSections ? optimizationResults.componentSections[key] : null;

        // Group sticks by length for this material
        const sticksByLength = {};
        data.forEach(stick => {
            const len = stick.stockLength;
            if (!sticksByLength[len]) {
                sticksByLength[len] = { qty: 0, weight: 0 };
            }
            sticksByLength[len].qty++;
            // Calculate weight for this stick
            // Weight is usually kg/12ft or kg/meter. 
            // section.weight is "Weight per Sticker (12')" usually? 
            // Let's assume section.weight is weight per piece of 'stockLength' if it's dynamic, 
            // OR section.weight is standard 12' weight. 
            // In optimization.js, weight is often calculated.
            // Let's assume section.weight is for standard length?
            // Actually, best to use weight per meter * length?
            // Existing code used: section.weight (fixed)
            // Let's stick to section.weight logic from before but scale logic if needed.
            // If section.weight is "Wt/Length", we need to know what Length.
            // Assuming section.weight from 'findStockInfo' is for that specific length.
            // But 'componentSections' map might only have one metadata entry.
            // Let's recalculate if possible, or use section.weight normalized.
            // Wait, existing code: section.weight was used directly.
            // Optimization usually stores "weight" in the result? No.
            // Let's try to find correct weight.
            const w = section ? parseFloat(section.weight || 0) : 0;
            // If the stock length is different, does weight change? 
            // Usually stock list has different weights for different lengths.
            // We will assume 'section.weight' is correct for the PRIMARY stock. 
            // NOTE: If user has 12' and 15' stock, their weights differ. 
            // We should findStockInfo again to be safe.
            const specificStock = findStockInfo(key, len); // Need to helper function
            const specificWeight = specificStock ? specificStock.weight : w;

            sticksByLength[len].weight += specificWeight;
        });

        // Add rows for each length
        Object.entries(sticksByLength).forEach(([len, info]) => {
            body.push([
                section ? section.sectionNo : '-',
                key,
                info.qty,
                formatInchesToFeet(parseFloat(len)),
                info.weight.toFixed(2)
            ]);
        });
    }

    doc.autoTable({
        startY: 40,
        head: [['Section No', 'Description', 'Qty', 'Length', 'Total Weight (Kg)']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });
    doc.save(`Material_Purchase_${selectedProject}.pdf`);
}

function generateHardwarePurchaseListPDF(projectWindows, selectedProject) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`Hardware Purchase List: ${selectedProject}`, 14, 20);

    const hardwareMap = aggregateProjectHardware(projectWindows, optimizationResults);
    const body = Object.entries(hardwareMap).map(([name, data]) => [
        name, Math.ceil(data.qty), data.unit
    ]);

    doc.autoTable({
        startY: 30,
        head: [['Hardware Item', 'Qty', 'Unit']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [39, 174, 96] }
    });
    doc.save(`Hardware_Purchase_${selectedProject}.pdf`);
}

function generateOptimizedCutListPDF(projectWindows, selectedProject) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let currentY = 20;

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Workshop Cut List: ${selectedProject}`, 14, currentY);
    currentY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, currentY);
    currentY += 15;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    for (const [key, plans] of Object.entries(optimizationResults.results)) {
        // Material Header
        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, currentY, contentWidth, 8, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(`Material: ${key}`, margin + 2, currentY + 5.5);
        currentY += 15;

        // Iterate Sticks
        plans.forEach((plan, idx) => {
            const stickHeight = 15;
            const gap = 10;

            // Check page break
            if (currentY + stickHeight + gap > 280) {
                doc.addPage();
                currentY = 20;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`Material: ${key} (Continued)`, margin, currentY);
                currentY += 15;
            }

            const totalLength = plan.stockLength;
            const scale = contentWidth / totalLength;

            // Draw Stock bar (Empty/Background)
            doc.setDrawColor(100, 100, 100);
            doc.setFillColor(255, 255, 255);
            doc.rect(margin, currentY, contentWidth, stickHeight, 'S'); // Outline

            // Stick Info
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`#${idx + 1} - ${plan.stockLength}" Stock`, margin, currentY - 2);

            let currentX = margin;

            // Draw Cuts
            plan.pieces.forEach(piece => {
                const pieceWidth = piece.length * scale;

                doc.setFillColor(230, 240, 255); // Light Blue for parts
                doc.rect(currentX, currentY, pieceWidth, stickHeight, 'FD'); // Fill & Draw

                // Label
                if (pieceWidth > 15) { // Only label if space permits
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    const text = `${piece.length}"`;
                    const textWidth = doc.getTextWidth(text);
                    doc.text(text, currentX + (pieceWidth - textWidth) / 2, currentY + 6);

                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    const label = piece.label || '';
                    const labelWidth = doc.getTextWidth(label);
                    // crop label if too long
                    if (labelWidth < pieceWidth - 2) {
                        doc.text(label, currentX + (pieceWidth - labelWidth) / 2, currentY + 11);
                    }
                }

                currentX += pieceWidth;
            });

            // Waste
            const wasteLen = plan.stockLength - plan.used;
            if (wasteLen > 0) {
                const wasteWidth = contentWidth - (currentX - margin); // Remaining width
                // Ensure we don't draw negative if float math is off
                if (wasteWidth > 0) {
                    doc.setFillColor(255, 230, 230); // Light Red for waste
                    doc.rect(currentX, currentY, wasteWidth, stickHeight, 'FD');

                    if (wasteWidth > 10) {
                        doc.setFontSize(7);
                        doc.setTextColor(200, 0, 0);
                        doc.text(`Waste: ${wasteLen.toFixed(1)}"`, currentX + 2, currentY + 9);
                        doc.setTextColor(0, 0, 0);
                    }
                }
            }

            currentY += (stickHeight + gap);
        });

        currentY += 10; // Spacing between materials
    }

    doc.save(`CutList_${selectedProject}.pdf`);
}

function showReportPreview(type) {
    const projectSelector = document.getElementById('projectSelector');
    const selectedProject = projectSelector.value;

    if (!selectedProject) {
        showAlert('⚠️ Please select a project first!');
        return;
    }

    const projectWindows = windows.filter(w => w.projectName === selectedProject);
    if (projectWindows.length === 0) {
        showAlert('⚠️ No windows found for this project!');
        return;
    }

    // Toggle Preview Section
    const previewSection = document.getElementById('section-preview');
    previewSection.style.display = 'block';
    scrollToSection('section-preview');

    const previewContent = document.getElementById('reportPreviewContent');
    let html = '';

    if (type === 'quotation') {
        html = generateQuotationHTML(projectWindows, selectedProject);
        document.getElementById('downloadExportBtn').onclick = () => showQuotationInputDialog(projectWindows, selectedProject);
    } else if (type === 'purchase_material') {
        html = generateMaterialPurchaseHTML(projectWindows, selectedProject);
        document.getElementById('downloadExportBtn').onclick = () => generateMaterialPurchaseListPDF(projectWindows, selectedProject);
    } else if (type === 'purchase_hardware') {
        html = generateHardwarePurchaseHTML(projectWindows, selectedProject);
        document.getElementById('downloadExportBtn').onclick = () => generateHardwarePurchaseListPDF(projectWindows, selectedProject);
    } else if (type === 'cutlist') {
        html = generateCutListHTML(projectWindows, selectedProject);
        document.getElementById('downloadExportBtn').onclick = () => generateOptimizedCutListPDF(projectWindows, selectedProject);
    }

    previewContent.innerHTML = html;
}

function closeExportPreview() {
    document.getElementById('section-preview').style.display = 'none';
    scrollToSection('section-results');
}

function generatePurchaseListPDF() {
    const projectSelector = document.getElementById('projectSelector');
    const selectedProject = projectSelector.value;

    if (!selectedProject) {
        showAlert('⚠️ Please select a project first!');
        return;
    }

    // Show confirmation if optimization hasn't been run for current project
    if (!optimizationResults || !optimizationResults.results || optimizationResults.project !== selectedProject) {
        showConfirm('⚠️ Users can generate purchase lists anytime, but quantities will be more accurate after running Smart Optimization!\n\nDo you want to proceed with estimated quantities?', () => {
            const projectWindows = windows.filter(w => w.projectName === selectedProject);
            if (projectWindows.length === 0) {
                showAlert('⚠️ No windows found for this project!');
                return;
            }
            _continueGeneratePurchaseList(projectWindows, selectedProject);
        });
        return;
    }

    const projectWindows = windows.filter(w => w.projectName === selectedProject);

    if (projectWindows.length === 0) {
        showAlert('⚠️ No windows found for this project!');
        return;
    }

    // Verify sections configured
    if (!verifySectionsConfigured()) return;

    _continueGeneratePurchaseList(projectWindows, selectedProject);
}

function _continueGeneratePurchaseList(projectWindows, selectedProject) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const quoteDate = new Date().toLocaleDateString('en-GB');

    // ========== HEADER ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(46, 125, 50);
    doc.text('NIRUMA - Aluminium Section', 14, currentY);

    currentY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Trimandir Trust, Fatepura, Nadiad - 387001, Gujarat', 14, currentY);

    currentY += 4;
    doc.text('Ph: +91 90999 99887', 14, currentY);

    currentY += 8;
    doc.setDrawColor(46, 125, 50);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);

    currentY += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(46, 125, 50);
    doc.text('Hardware / Purchase List', 14, currentY);

    currentY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Project: ${selectedProject}`, 14, currentY);

    currentY += 4;
    doc.text(`Date: ${quoteDate}`, 14, currentY);

    currentY += 4;
    doc.text(`Total Windows: ${projectWindows.length}`, 14, currentY);

    currentY += 8;

    // ========== ALUMINIUM SECTION PURCHASE LIST ==========
    if (optimizationResults && optimizationResults.results) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(46, 125, 50);
        doc.text('Aluminium Profile Purchase List (Sticks)', 14, currentY);
        currentY += 6;

        const sectionData = [];
        let totalSticks = 0;
        let totalWeight = 0;

        Object.entries(optimizationResults.results).forEach(([material, data]) => {
            const stockItems = data.stockUsage || [];
            stockItems.forEach(stock => {
                const stockInfo = findStockInfo(material, stock.stockLength);
                const weightPerStick = stockInfo ? (stockInfo.weight || 0) : 0;
                const sectionNo = stockInfo ? (stockInfo.sectionNo || 'N/A') : 'N/A';
                const thickness = stockInfo ? (stockInfo.thickness || 0) : 0;
                const totalW = stock.qty * weightPerStick;

                sectionData.push([
                    material,
                    sectionNo,
                    thickness > 0 ? `${thickness} mm` : 'N/A',
                    `${stock.qty} pcs`,
                    `${stock.stockLength}"`,
                    weightPerStick > 0 ? `${weightPerStick.toFixed(3)} Kg` : 'N/A',
                    totalW > 0 ? `${totalW.toFixed(3)} Kg` : 'N/A'
                ]);

                totalSticks += stock.qty;
                totalWeight += totalW;
            });
        });

        doc.autoTable({
            startY: currentY,
            head: [['Material', 'Sec No.', 'T', 'Qty', 'Len', 'Wt/Stick', 'Total Wt']],
            body: sectionData,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50] },
            styles: { fontSize: 8 }
        });

        currentY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(10);
        doc.text(`Total Sticks: ${totalSticks} | Total Approx Weight: ${totalWeight.toFixed(2)} Kg`, 14, currentY);
        currentY += 10;
    }

    // ========== PURCHASE LIST TABLE (HARDWARE) ==========
    const purchaseListData = generatePurchaseListTable(projectWindows, optimizationResults);
    const hardwareTotalCost = calculatePurchaseListTotal(projectWindows, optimizationResults);

    doc.autoTable({
        startY: currentY,
        head: [['Hardware Item', 'Qty', 'Unit', 'Rate (₹)', 'Cost (₹)']],
        body: purchaseListData,
        theme: 'grid',
        headStyles: {
            fillColor: [46, 125, 50],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
        },
        bodyStyles: {
            fontSize: 8
        },
        columnStyles: {
            0: { cellWidth: 90, halign: 'left' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' }
        }
    });

    currentY = doc.lastAutoTable.finalY + 5;

    // ========== TOTALS ==========
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(46, 125, 50);
    doc.text(`Total Hardware Cost: Rs. ${hardwareTotalCost.toFixed(0)}`, 14, currentY);

    // ========== SAVE PDF ==========
    doc.save(`PurchaseList_${selectedProject}_${quoteDate.replace(/\//g, '-')}.pdf`);

    showAlert(`✅ Purchase List generated successfully!\n\nProject: ${selectedProject}\nWindows: ${projectWindows.length}\nHardware Cost: Rs. ${hardwareTotalCost.toFixed(0)}`);
}

// ============================================================================
// SVG → PNG HELPER (module-level, reused by quotation & other exports)
// ============================================================================

function svgToPng(svgString, width, height) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        img.src = url;
    });
}

// ============================================================================
// COST HELPER — all cost components for one window, all in inches.
// Wastage is proportionally included via shareRatio × stockLen logic.
// ============================================================================

function calculateWindowTotalCost(win, opts) {
    opts = opts || {};
    const laborPerSqft = parseFloat(opts.laborPerSqft) || 0;

    // Glass — doors use per-partition glass; windows use single pane
    let glassCost = 0;
    let glass = null;
    let gi    = null;
    if (win.category === 'Door') {
        glassCost = calculateDoorGlassCost(win);
    } else {
        glass = calculateGlassDimensions(win);
        gi    = resolveGlassInfo(win);
        let glassRate = 0;
        if (glass && gi && gi.rateKey) {
            glassRate = ratesConfig.glass[gi.rateKey];
            if (glassRate == null) glassRate = ratesConfig.glass[gi.fallbackKey] || 0;
        }
        glassCost = glass ? glass.totalArea * glassRate : 0;
    }

    // Hardware
    const hardware = calculateWindowHardware(win, optimizationResults);
    const hardwareCost = hardware.reduce((s, h) => s + h.total, 0);

    // Profile weight + powder coating from optimization results.
    // purchased portion = ratio × stockLen (includes proportional wastage)
    // actual piece portion = piece.length (no wastage)
    let powderCoatingCost = 0;
    let purchasedWeightKg = 0;   // includes wastage share
    let pieceWeightKg = 0;       // net pieces only
    let totalPurchasedLenIn = 0; // inches purchased (for efficiency)
    let totalPieceLenIn = 0;     // inches of actual pieces (for efficiency)

    if (optimizationResults && optimizationResults.results) {
        for (const [key, data] of Object.entries(optimizationResults.results)) {
            let purchasedLen = 0;
            const parts = key.split('|').map(s => s.trim());
            const series = parts[0] || '';
            const compName = parts[1] || key;
            const effectiveComp = (series === 'Door') ? doorCompWithSize(compName, win) : compName;
            const pcRate = lookupPowderCoatingRate(series, effectiveComp);
            const sec = optimizationResults.componentSections?.[key];
            const wtPerInch = (sec && sec.weight) ? (sec.weight / 144) : 0; // weight per inch (kg)

            data.forEach(plan => {
                const stockLen = parseFloat(plan.stockLength ?? plan.stock ?? 0);
                const used = plan.used || 0;
                if (used <= 0 || stockLen <= 0) return;
                plan.pieces.forEach(p => {
                    if (p.label && p.label.startsWith(win.configId)) {
                        const ratio = p.length / used;
                        purchasedLen += ratio * stockLen;
                        purchasedWeightKg += ratio * stockLen * wtPerInch;
                        pieceWeightKg    += p.length * wtPerInch;
                        totalPurchasedLenIn += ratio * stockLen;
                        totalPieceLenIn     += p.length;
                    }
                });
            });
            powderCoatingCost += (purchasedLen / 12) * pcRate;
        }
    }

    const efficiency = totalPurchasedLenIn > 0 ? (totalPieceLenIn / totalPurchasedLenIn * 100) : 0;

    const rate = (stockRates && stockRates[win.series]) ? stockRates[win.series] : (aluminumRate || 280);
    const profileCost = pieceWeightKg * rate;
    const wastageWeightKg = Math.max(0, purchasedWeightKg - pieceWeightKg);
    const wastageCost = wastageWeightKg * rate;

    const windowAreaSqft = (win.width * win.height) / 144; // inches → sqft
    const laborCost = windowAreaSqft * laborPerSqft;

    const totalCost = profileCost + wastageCost + powderCoatingCost + glassCost + hardwareCost + laborCost;
    const rateSqft = windowAreaSqft > 0 ? totalCost / windowAreaSqft : 0;

    return {
        profileCost, wastageCost, powderCoatingCost, glassCost, hardwareCost, laborCost,
        totalCost,
        pieceWeightKg, wastageWeightKg, weightKg: purchasedWeightKg,
        windowAreaSqft, rateSqft, efficiency,
        glass, glassInfo: gi
    };
}

// ============================================================================
// QUOTATION PDF — client-facing, reference-style layout
// ============================================================================

function generateQuotationPDF(projectWindows, selectedProject, formData) {
    const { jsPDF } = window.jspdf;
    const {
        quoteNo,
        clientName      = '',
        clientAddress   = '',
        deliveryAddress = '',
        gstPct          = 18,
        laborPerSqft    = 0,
        leadTime        = '21 Working Days',
        displayUnit     = 'mm'
    } = formData;

    const quoteDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Pre-calculate all window costs (labor included per window)
    const costData = projectWindows.map(win => ({ win, c: calculateWindowTotalCost(win, { laborPerSqft }) }));

    // Generate diagram PNGs
    const diagPromises = projectWindows.map(win =>
        svgToPng(generateWindowDiagram({
            tracks: win.tracks, shutters: win.shutters,
            mosquitoShutters: win.mosquitoShutters || 0,
            width: win.width, height: win.height,
            windowId: win.configId, series: win.series,
            // Door-specific fields
            frame: win.frame, leaves: win.leaves || 1,
            closingMechanism: win.closingMechanism || 'Hinge',
            topWidth: win.topWidth, bottomWidth: win.bottomWidth, middleWidth: win.middleWidth,
            middleRailPositionMM: win.middleRailPositionMM,
            upperPartition: win.upperPartition, lowerPartition: win.lowerPartition
        }), 200, 150).catch(() => null)
    );

    // Try to load company logo
    const logoPromise = new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.width; c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0);
                resolve(c.toDataURL('image/png'));
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = 'logo.png';
    });

    Promise.all([Promise.all(diagPromises), logoPromise]).then(([diagPngs, logoPng]) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const PW = doc.internal.pageSize.getWidth();
        const PH = doc.internal.pageSize.getHeight();
        const mg = 12;
        const cW = PW - 2 * mg;

        // ── Reusable: page header ──────────────────────────────────────────────
        const drawHeader = () => {
            if (logoPng) doc.addImage(logoPng, 'PNG', mg, mg, 18, 14);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(30, 60, 114);
            doc.text('OUR WINDOW FACTORY', PW / 2, mg + 7, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            doc.text('Mandir Maintenance Dept.', PW / 2, mg + 14, { align: 'center' });
            const lY = mg + 19;
            doc.setDrawColor(30, 60, 114);
            doc.setLineWidth(0.8);
            doc.line(mg, lY, PW - mg, lY);
            return lY + 1;
        };

        // ── Reusable: page footer ──────────────────────────────────────────────
        const drawFooter = (pageNum) => {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(mg, PH - 18, PW - mg, PH - 18);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(80, 80, 80);
            doc.text('Our Window Factory | Mandir Maintenance Dept.', mg, PH - 13);
            doc.setFontSize(8);
            doc.setTextColor(110, 110, 110);
            doc.text(quoteDate, mg, PH - 8);
            const curPage = doc.internal.getNumberOfPages();
            doc.text(`Page No ${curPage}`, PW - mg, PH - 8, { align: 'right' });
        };

        // ══════════════════════════════════════════════════════════════════════
        // PAGE 1
        // ══════════════════════════════════════════════════════════════════════
        let y = drawHeader();

        // "Quotation" title bar
        y += 2;
        doc.setFillColor(235, 235, 235);
        doc.rect(mg, y, cW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('Quotation', PW / 2, y + 5, { align: 'center' });
        y += 9;

        // To / Deliver To boxes
        const halfW = cW / 2;
        const toH = 24;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.rect(mg, y, halfW, toH);
        doc.rect(mg + halfW, y, halfW, toH);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text('To', mg + 2, y + 5);
        doc.text('Deliver to', mg + halfW + 2, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const toLines = doc.splitTextToSize(
            (clientName || '') + (clientAddress ? '\n' + clientAddress : ''), halfW - 4
        );
        doc.text(toLines.slice(0, 4), mg + 2, y + 10);
        if (deliveryAddress) {
            const dlvLines = doc.splitTextToSize(deliveryAddress, halfW - 4);
            doc.text(dlvLines.slice(0, 4), mg + halfW + 2, y + 10);
        }
        y += toH + 1;

        // Meta row: Quote No | Date | Customer Ref | Responsible
        const mC = cW / 4;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.rect(mg, y, cW, 11);
        [1, 2, 3].forEach(i => doc.line(mg + mC * i, y, mg + mC * i, y + 11));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        ['Quote No.', 'Date', 'Project / Supplier', 'Responsible'].forEach((lbl, i) => {
            doc.text(lbl, mg + mC * i + 2, y + 4);
        });
        doc.setFont('helvetica', 'normal');
        doc.text(quoteNo, mg + 2, y + 9);
        doc.text(quoteDate, mg + mC + 2, y + 9);
        // Aggregate distinct suppliers in this project
        const suppliersInUse = [...new Set(projectWindows.map(w => w.vendor).filter(Boolean))].join(', ') || '-';
        const supplierText = `${selectedProject || ''}${suppliersInUse !== '-' ? ' / ' + suppliersInUse : ''}`;
        doc.text(doc.splitTextToSize(supplierText, mC - 4).slice(0, 1), mg + mC * 2 + 2, y + 9);
        doc.text('Mandir Maintenance Dept.', mg + mC * 3 + 2, y + 9);
        y += 13;

        // ── Main window table ─────────────────────────────────────────────────
        const fmtPartitionLabel = (p, legacy) => {
            if (!p || !p.material) return legacy || '-';
            if (p.material === 'None') return 'None';
            if (p.material === 'Glass') {
                const t = p.glassToughened ? 'T' : 'NT';
                return `${p.glassType || 'SGU'} ${p.thickness || ''}mm ${t}`;
            }
            return `${p.material}${p.thickness && p.thickness !== '0' ? ' ' + p.thickness + 'mm' : ''}`;
        };
        const glassLabel = (win) => {
            if (win.category === 'Door') {
                const up = win.upperPartition;
                const lo = win.lowerPartition;
                const mid = win.middleRailPositionMM != null ? `${win.middleRailPositionMM}mm from floor` : 'Center';
                return `TOP: ${fmtPartitionLabel(up, win.partitionMaterial)}\nBOT: ${fmtPartitionLabel(lo)}\nMid Rail: ${mid}`;
            }
            const gi = resolveGlassInfo(win);
            return gi.label;
        };
        const sizeStr = (win) => displayUnit === 'mm'
            ? `${Math.round(win.width * 25.4)} X ${Math.round(win.height * 25.4)}`
            : `${win.width.toFixed(2)}" X ${win.height.toFixed(2)}"`;
        const descStr = (win) => {
            if (win.category === 'Door') {
                const L  = win.leaves || 1;
                const cm = win.closingMechanism || 'Hinge';
                let d = L > 1 ? 'Double Door' : 'Single Door';
                d += `\n${cm === 'FloorSpring' ? 'Floor Spring' : 'On Hinges'}`;
                if (win.frame) d += '\n3-Side Frame';
                if (win.handleProfile) d += `\n${win.handleProfile}`;
                if (win.vendor) d += `\n${win.vendor}`;
                return d + '\nPowder Coating';
            }
            let d = `${win.tracks} Track ${win.shutters} Shutter`;
            if ((win.mosquitoShutters || 0) > 0) d += `\n+ ${win.mosquitoShutters} Mosquito`;
            if (win.series) d += `\nSeries: ${win.series}`;
            if (win.vendor) d += `\nSupplier: ${win.vendor}`;
            return d + '\nPowder Coating';
        };

        const tableRows = costData.map(({ win, c }) => {
            const qty = win.qty || 1;
            return [
                win.configId,
                '',                            // image — drawn in didDrawCell
                win.location || '',
                descStr(win),
                sizeStr(win),
                qty,
                glassLabel(win),
                (c.windowAreaSqft * qty).toFixed(3),
                c.rateSqft.toFixed(2),
                (c.totalCost * qty).toFixed(2)
            ];
        });

        const totalQty  = costData.reduce((s, { win }) => s + (win.qty || 1), 0);
        const totalArea = costData.reduce((s, { win, c }) => s + c.windowAreaSqft * (win.qty || 1), 0);
        const subtotal  = costData.reduce((s, { win, c }) => s + c.totalCost * (win.qty || 1), 0);

        // Totals footer row with colSpan
        tableRows.push([
            { content: 'Total :', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: String(totalQty), styles: { fontStyle: 'bold', halign: 'center', fillColor: [245, 245, 245] } },
            { content: '', styles: { fillColor: [245, 245, 245] } },
            { content: totalArea.toFixed(3), styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: '', styles: { fillColor: [245, 245, 245] } },
            { content: subtotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } }
        ]);

        const pImgW = 22;
        const pImgH = Math.round(pImgW * 140 / 200); // ≈ 15 mm
        const minCellH = pImgH + 8;

        doc.autoTable({
            startY: y,
            margin: { left: mg, right: mg },
            head: [[
                'Type', 'Image', 'Location', 'Description',
                `Size (${displayUnit === 'mm' ? 'MM' : '"'})\nW X H`,
                'Qty', 'Glass',
                'Area\n(Sq.Ft.)', 'Rate/\n(Sq.Ft.)', 'Amount\n(Rs.)'
            ]],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 60, 114], textColor: [255, 255, 255],
                fontSize: 7.5, fontStyle: 'bold', halign: 'center', valign: 'middle', minCellHeight: 10
            },
            bodyStyles: { fontSize: 7.5, valign: 'middle', minCellHeight: minCellH },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 24, halign: 'center' },
                2: { cellWidth: 12, halign: 'center' },
                3: { cellWidth: 36, halign: 'left'   },
                4: { cellWidth: 22, halign: 'center' },
                5: { cellWidth:  8, halign: 'center' },
                6: { cellWidth: 21, halign: 'center' },
                7: { cellWidth: 14, halign: 'right'  },
                8: { cellWidth: 15, halign: 'right'  },
                9: { cellWidth: 17, halign: 'right'  }
            },
            didDrawCell: (data) => {
                if (data.column.index === 1 && data.cell.section === 'body' && data.row.index < diagPngs.length) {
                    const png = diagPngs[data.row.index];
                    if (png) {
                        const ix = data.cell.x + (data.cell.width  - pImgW) / 2;
                        const iy = data.cell.y + (data.cell.height - pImgH) / 2;
                        doc.addImage(png, 'PNG', ix, iy, pImgW, pImgH);
                    }
                }
            }
        });

        y = doc.lastAutoTable.finalY + 5;

        // ── DETAILED COST BREAKUP per window (full transparency – seva work, no privacy) ──
        if (y > PH - 60) { doc.addPage(); y = drawHeader() + 6; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 60, 114);
        doc.text('Detailed Cost Breakup (Per Window)', mg, y);
        y += 2;

        const breakupBody = costData.map(({ win, c }) => {
            const q = win.qty || 1;
            return [
                win.configId,
                q,
                c.pieceWeightKg.toFixed(2),
                c.wastageWeightKg.toFixed(2),
                (c.profileCost * q).toFixed(2),
                (c.wastageCost * q).toFixed(2),
                (c.powderCoatingCost * q).toFixed(2),
                (c.glassCost * q).toFixed(2),
                (c.hardwareCost * q).toFixed(2),
                (c.laborCost * q).toFixed(2),
                (c.totalCost * q).toFixed(2),
                c.efficiency > 0 ? c.efficiency.toFixed(1) + '%' : '-'
            ];
        });

        const tot = costData.reduce((acc, { win, c }) => {
            const q = win.qty || 1;
            acc.piece    += c.pieceWeightKg * q;
            acc.waste    += c.wastageWeightKg * q;
            acc.profile  += c.profileCost * q;
            acc.wasteC   += c.wastageCost * q;
            acc.pc       += c.powderCoatingCost * q;
            acc.glass    += c.glassCost * q;
            acc.hardware += c.hardwareCost * q;
            acc.labor    += c.laborCost * q;
            acc.total    += c.totalCost * q;
            return acc;
        }, { piece: 0, waste: 0, profile: 0, wasteC: 0, pc: 0, glass: 0, hardware: 0, labor: 0, total: 0 });

        breakupBody.push([
            { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.piece.toFixed(2),    styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.waste.toFixed(2),    styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.profile.toFixed(2),  styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.wasteC.toFixed(2),   styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.pc.toFixed(2),       styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.glass.toFixed(2),    styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.hardware.toFixed(2), styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.labor.toFixed(2),    styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: tot.total.toFixed(2),    styles: { fontStyle: 'bold', halign: 'right', fillColor: [245, 245, 245] } },
            { content: '',                      styles: { fillColor: [245, 245, 245] } }
        ]);

        doc.autoTable({
            startY: y + 2,
            margin: { left: mg, right: mg },
            head: [[
                'Type', 'Qty',
                'Net Wt\n(kg)', 'Waste Wt\n(kg)',
                'Profile\n(Rs.)', 'Wastage\n(Rs.)',
                'Powder\nCoat (Rs.)', 'Glass\n(Rs.)',
                'Hardware\n(Rs.)', 'Labor\n(Rs.)',
                'Sub-Total\n(Rs.)', 'Effic.\n(%)'
            ]],
            body: breakupBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 60, 114], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center', valign: 'middle' },
            bodyStyles: { fontSize: 7, halign: 'right', valign: 'middle' },
            columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' }, 11: { halign: 'center' } }
        });

        y = doc.lastAutoTable.finalY + 5;

        // ── Additional Charges ────────────────────────────
        if (y > PH - 60) { doc.addPage(); y = drawHeader() + 8; }

        // All prices are inclusive of GST — no separate GST line
        const grandTotal = subtotal;

        const chargesBody = [
            [
                { content: 'Total Amount (Incl. GST)', styles: { fontStyle: 'bold' } },
                { content: grandTotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right', fillColor: [235, 235, 235] } }
            ]
        ];

        doc.autoTable({
            startY: y,
            margin: { left: PW / 2 + 5, right: mg },
            head: [[{
                content: 'Additional Charges', colSpan: 2,
                styles: { halign: 'center', fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8.5 }
            }]],
            body: chargesBody,
            theme: 'grid',
            headStyles: { minCellHeight: 8 },
            bodyStyles: { fontSize: 8.5 },
            columnStyles: {
                0: { cellWidth: 63 },
                1: { cellWidth: 25, halign: 'right' }
            }
        });

        y = doc.lastAutoTable.finalY + 5;

        // Amount in words
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`( ${numberToWords(Math.round(grandTotal))} Only )`, PW / 2, y, { align: 'center' });
        y += 5;

        // Average rate / sqft
        const avgRate = totalArea > 0 ? subtotal / totalArea : 0;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Average Rate / Sq.Ft. : ${avgRate.toFixed(2)}`, PW - mg, y, { align: 'right' });
        y += 5;

        // Notes
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        doc.text('* Transportation charges will be extra on actual basis.', mg, y);
        y += 4;
        doc.text(`* Lead Time: ${leadTime} from order confirmation & advance payment.`, mg, y);

        drawFooter(1);

        // Helper: round inches up to nearest stock-foot (e.g. 141→12', 177→15', 189→16')
        const formatStockFeet = (inches) => {
            if (!inches || inches <= 0) return "0'";
            return Math.ceil(parseFloat(inches) / 12) + "'";
        };

        // ══════════════════════════════════════════════════════════════════════
        // PAGE 2 — Hardware Detail (Per Window + Aggregated)
        // ══════════════════════════════════════════════════════════════════════
        doc.addPage();
        y = drawHeader();
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 60, 114);
        doc.text('Hardware Detail (Per Window)', PW / 2, y, { align: 'center' });
        y += 6;

        let hwGrandTotal = 0;
        projectWindows.forEach((win, idx) => {
            if (y > PH - 40) { doc.addPage(); y = drawHeader() + 4; }
            const hw = calculateWindowHardware(win, optimizationResults);
            const q = win.qty || 1;
            const winLabel = `${win.configId} (Qty ${q})  —  ${win.tracks}T ${win.shutters}S${(win.mosquitoShutters||0)>0 ? ' + '+win.mosquitoShutters+'MS':''}`;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 60, 114);
            doc.text(winLabel, mg, y);
            y += 1;

            const rows = hw.map(h => {
                const lineTotal = h.qty * q * h.rate;
                hwGrandTotal += lineTotal;
                return [
                    h.hardware,
                    (h.hardware.toLowerCase().includes('wool pile') ? (h.qty * q).toFixed(2) : Math.ceil(h.qty * q).toString()),
                    h.unit,
                    `Rs. ${h.rate.toFixed(2)}`,
                    `Rs. ${lineTotal.toFixed(2)}`
                ];
            });

            const winSubTotal = hw.reduce((s, h) => s + h.qty * q * h.rate, 0);
            rows.push([
                { content: 'Window Sub-Total', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245,245,245] } },
                { content: `Rs. ${winSubTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245,245,245] } }
            ]);

            doc.autoTable({
                startY: y + 2,
                margin: { left: mg, right: mg },
                head: [['Hardware Item', 'Qty', 'Unit', 'Rate', 'Cost']],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [30,60,114], textColor: [255,255,255], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
            });
            y = doc.lastAutoTable.finalY + 4;
        });

        // Aggregated total
        if (y > PH - 60) { doc.addPage(); y = drawHeader() + 4; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 60, 114);
        doc.text('Project Hardware Total (Aggregated)', PW / 2, y, { align: 'center' });
        y += 3;

        const aggHw = {};
        projectWindows.forEach(win => {
            const q = win.qty || 1;
            calculateWindowHardware(win, optimizationResults).forEach(h => {
                if (!aggHw[h.hardware]) aggHw[h.hardware] = { qty: 0, unit: h.unit, rate: h.rate };
                aggHw[h.hardware].qty += h.qty * q;
            });
        });
        const aggRows = Object.entries(aggHw).map(([name, d]) => {
            const qtyShown = name.toLowerCase().includes('wool pile') ? d.qty.toFixed(2) : Math.ceil(d.qty).toString();
            const cost = (name.toLowerCase().includes('wool pile') ? d.qty : Math.ceil(d.qty)) * d.rate;
            return [name, qtyShown, d.unit, `Rs. ${d.rate.toFixed(2)}`, `Rs. ${cost.toFixed(2)}`];
        }).sort((a,b) => a[0].localeCompare(b[0]));

        const aggTotal = Object.entries(aggHw).reduce((s, [n, d]) => s + (n.toLowerCase().includes('wool pile') ? d.qty : Math.ceil(d.qty)) * d.rate, 0);
        aggRows.push([
            { content: 'Grand Total', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [235,235,235] } },
            { content: `Rs. ${aggTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [235,235,235] } }
        ]);

        doc.autoTable({
            startY: y + 2,
            margin: { left: mg, right: mg },
            head: [['Hardware Item', 'Total Qty', 'Unit', 'Rate', 'Cost']],
            body: aggRows,
            theme: 'grid',
            headStyles: { fillColor: [30,60,114], textColor: [255,255,255], fontSize: 8, halign: 'center' },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });

        drawFooter(2);

        // ══════════════════════════════════════════════════════════════════════
        // PAGE 3 — Profile / Section Purchase List (grouped by series)
        // ══════════════════════════════════════════════════════════════════════
        doc.addPage();
        y = drawHeader();
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 60, 114);
        doc.text('Profile / Section Purchase List', PW / 2, y, { align: 'center' });
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100,100,100);
        doc.text('(Stock lengths shown as standard procurement length — 3" cutting buffer included)', PW/2, y, { align: 'center' });
        y += 4;

        // Group results by series
        const seriesGroups = {};
        if (optimizationResults && optimizationResults.results) {
            for (const [key, plans] of Object.entries(optimizationResults.results)) {
                const [series, material] = key.split(' | ').map(s => s.trim());
                const seriesName = series || 'General';
                if (!seriesGroups[seriesName]) seriesGroups[seriesName] = [];

                // Group sticks by length for this material
                const byLen = {};
                plans.forEach(plan => {
                    const len = parseFloat(plan.stockLength ?? plan.stock ?? 0);
                    if (!byLen[len]) byLen[len] = { qty: 0, weight: 0 };
                    byLen[len].qty += 1;
                    const stockInfo = findStockInfo(key, len);
                    const wt = stockInfo ? (stockInfo.weight || 0) : 0;
                    byLen[len].weight += wt;
                });

                Object.entries(byLen).forEach(([len, info]) => {
                    const stockInfo = findStockInfo(key, parseFloat(len));
                    const sectionNo = stockInfo ? (stockInfo.sectionNo || '-') : '-';
                    const wtPerStick = info.qty > 0 ? info.weight / info.qty : 0;
                    const seriesRate = (stockRates && stockRates[seriesName]) ? stockRates[seriesName] : (aluminumRate || 280);
                    const cost = info.weight * seriesRate;
                    seriesGroups[seriesName].push({
                        sectionNo,
                        material: material || key,
                        stockLen: parseFloat(len),
                        qty: info.qty,
                        wtPerStick,
                        totalWt: info.weight,
                        cost
                    });
                });
            }
        }

        let profileGrandTotalCost = 0;
        let profileGrandTotalWt = 0;

        Object.entries(seriesGroups).forEach(([seriesName, items]) => {
            if (y > PH - 40) { doc.addPage(); y = drawHeader() + 4; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 60, 114);
            doc.text(`Series: ${seriesName}`, mg, y);
            y += 1;

            let subWt = 0, subCost = 0, subSticks = 0;
            const rows = items.map(it => {
                subWt += it.totalWt;
                subCost += it.cost;
                subSticks += it.qty;
                return [
                    it.sectionNo,
                    it.material,
                    formatStockFeet(it.stockLen),
                    it.qty,
                    it.wtPerStick.toFixed(2),
                    it.totalWt.toFixed(2),
                    `Rs. ${it.cost.toFixed(2)}`
                ];
            });
            rows.push([
                { content: `Subtotal — ${seriesName}`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245,245,245] } },
                { content: subSticks,            styles: { fontStyle: 'bold', halign: 'right', fillColor: [245,245,245] } },
                { content: '',                   styles: { fillColor: [245,245,245] } },
                { content: subWt.toFixed(2),     styles: { fontStyle: 'bold', halign: 'right', fillColor: [245,245,245] } },
                { content: `Rs. ${subCost.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [245,245,245] } }
            ]);

            doc.autoTable({
                startY: y + 2,
                margin: { left: mg, right: mg },
                head: [['Sec No', 'Material', 'Stock Len', 'Qty', 'Wt/Stick (kg)', 'Total Wt (kg)', 'Cost']],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [30,60,114], textColor: [255,255,255], fontSize: 8, halign: 'center' },
                bodyStyles: { fontSize: 8 },
                columnStyles: { 0: { halign: 'center', cellWidth: 18 }, 1: { cellWidth: 60 }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
            });
            y = doc.lastAutoTable.finalY + 4;
            profileGrandTotalCost += subCost;
            profileGrandTotalWt   += subWt;
        });

        // Grand total
        if (y > PH - 25) { doc.addPage(); y = drawHeader() + 4; }
        doc.autoTable({
            startY: y,
            margin: { left: mg, right: mg },
            body: [[
                { content: 'PROFILE GRAND TOTAL', styles: { fontStyle: 'bold', halign: 'right', fillColor: [30,60,114], textColor:[255,255,255] } },
                { content: `${profileGrandTotalWt.toFixed(2)} kg`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [30,60,114], textColor:[255,255,255] } },
                { content: `Rs. ${profileGrandTotalCost.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [30,60,114], textColor:[255,255,255] } }
            ]],
            theme: 'grid',
            bodyStyles: { fontSize: 9 }
        });

        drawFooter(3);

        // ══════════════════════════════════════════════════════════════════════
        // PAGE 4 — Powder Coating Breakdown
        // ══════════════════════════════════════════════════════════════════════
        doc.addPage();
        y = drawHeader();
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 60, 114);
        doc.text('Powder Coating Calculation', PW / 2, y, { align: 'center' });
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100,100,100);
        doc.text('(Based on purchased stock length — full stick gets coated, including wastage)', PW/2, y, { align: 'center' });
        y += 4;

        const pcRows = [];
        let pcGrandLen = 0, pcGrandCost = 0;

        // configId → window lookup (used to derive Door size variants)
        const _winByConfig = {};
        if (typeof windows !== 'undefined') {
            windows.forEach(w => { _winByConfig[w.configId] = w; });
        }

        if (optimizationResults && optimizationResults.results) {
            for (const [key, plans] of Object.entries(optimizationResults.results)) {
                const [series, material] = key.split(' | ').map(s => s.trim());

                if (series === 'Door') {
                    // Aggregate sticks per size variant — each stick's size is taken
                    // from the window of the first piece on that stick (pieces on
                    // a single stick always come from the same profile width).
                    const buckets = {}; // sizedComp → { sticks, lengthIn, rate }
                    plans.forEach(plan => {
                        const stockLen = parseFloat(plan.stockLength ?? plan.stock ?? 0) || 0;
                        if (stockLen <= 0 || !plan.pieces || !plan.pieces.length) return;
                        const winId = (plan.pieces[0].label || '').split(' - ')[0];
                        const win   = _winByConfig[winId];
                        if (!win) return;
                        const sizedComp = doorCompWithSize(material, win);
                        const rate      = lookupPowderCoatingRate(series, sizedComp);
                        if (!buckets[sizedComp]) buckets[sizedComp] = { sticks: 0, lengthIn: 0, rate };
                        buckets[sizedComp].sticks   += 1;
                        buckets[sizedComp].lengthIn += stockLen;
                    });
                    for (const [sizedComp, b] of Object.entries(buckets)) {
                        const totalFt = b.lengthIn / 12;
                        const cost    = totalFt * b.rate;
                        pcGrandLen  += totalFt;
                        pcGrandCost += cost;
                        pcRows.push([
                            series,
                            sizedComp,
                            b.sticks,
                            totalFt.toFixed(2),
                            `Rs. ${b.rate.toFixed(2)}`,
                            `Rs. ${cost.toFixed(2)}`
                        ]);
                    }
                } else {
                    const totalInches = plans.reduce((s, p) => s + (parseFloat(p.stockLength ?? p.stock ?? 0) || 0), 0);
                    const totalFt = totalInches / 12;
                    const rate = lookupPowderCoatingRate(series, material);
                    const cost = totalFt * rate;
                    pcGrandLen += totalFt;
                    pcGrandCost += cost;
                    pcRows.push([
                        series || '-',
                        material || key,
                        plans.length,
                        totalFt.toFixed(2),
                        `Rs. ${rate.toFixed(2)}`,
                        `Rs. ${cost.toFixed(2)}`
                    ]);
                }
            }
        }
        pcRows.sort((a,b) => (a[0]+a[1]).localeCompare(b[0]+b[1]));
        pcRows.push([
            { content: 'GRAND TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [30,60,114], textColor:[255,255,255] } },
            { content: `${pcGrandLen.toFixed(2)} ft`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [30,60,114], textColor:[255,255,255] } },
            { content: '', styles: { fillColor: [30,60,114] } },
            { content: `Rs. ${pcGrandCost.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [30,60,114], textColor:[255,255,255] } }
        ]);

        doc.autoTable({
            startY: y + 2,
            margin: { left: mg, right: mg },
            head: [['Series', 'Component', 'Sticks', 'Total Length (ft)', 'Rate (Rs/ft)', 'Cost']],
            body: pcRows,
            theme: 'grid',
            headStyles: { fillColor: [30,60,114], textColor: [255,255,255], fontSize: 8, halign: 'center' },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 60 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
        });

        drawFooter(4);

        // ══════════════════════════════════════════════════════════════════════
        // PAGE 5 — Terms & Conditions
        // ══════════════════════════════════════════════════════════════════════
        doc.addPage();
        y = drawHeader();
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Terms & Conditions :', mg, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        [
            '1. GST Extra on Applicable charges.',
            '2. Transportation Charges will be Extra on actual basis.',
            '3. Goods rates will be subject to market fluctuation & government policies.',
            '4. Facilities to be provided to our contractor at site free of cost:',
            '      a) Scaffolding, electricity & water',
            '      b) Safe storage for material',
            `5. Validity: This offer is valid for 30 Days from the date of this offer.`,
            `6. Lead Time: ${leadTime} from date of order confirmation & advance payment.`
        ].forEach(t => { doc.text(t, mg, y); y += 5.5; });

        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Payment Terms :', mg, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        [
            '1. 25% Payment Advance.',
            '2. 50% After Delivery of Material.',
            '3. 25% After Completion of Work.'
        ].forEach(t => { doc.text(t, mg, y); y += 5.5; });

        y += 10;
        doc.text('Your Faithfully,', mg, y); y += 5;
        doc.text('Mandir Maintenance Dept.', mg, y); y += 5;
        doc.text('Niruma Aluminum Sections', mg, y);

        drawFooter(5);

        // Re-apply footer to every page (in case intra-section page breaks were inserted)
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            // Only draw if no footer already present at this y? Simplest: overwrite a clear strip then redraw.
            doc.setFillColor(255, 255, 255);
            doc.rect(0, PH - 19, PW, 19, 'F');
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(mg, PH - 18, PW - mg, PH - 18);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(80, 80, 80);
            doc.text('Our Window Factory | Mandir Maintenance Dept.', mg, PH - 13);
            doc.setFontSize(8);
            doc.setTextColor(110, 110, 110);
            doc.text(quoteDate, mg, PH - 8);
            doc.text(`Page ${p} of ${totalPages}`, PW - mg, PH - 8, { align: 'right' });
        }

        // Save
        doc.save(`Quotation_${selectedProject}_${quoteNo}.pdf`);
        showAlert(`✅ Quotation PDF generated!\nQuote No: ${quoteNo}\nProject: ${selectedProject}`);

    }).catch(err => {
        console.error('Quotation PDF error:', err);
        showAlert('❌ Error generating quotation. Please try again.');
    });
}

// ============================================================================
// WINDOW DIAGRAM GENERATOR - SVG BASED
// ============================================================================

function generateWindowDiagram(config) {
    // config = { tracks: 2, shutters: 2, mosquitoShutters: 1, width: 1143, height: 1121, windowId: "W1" }

    // Check for Door
    if (config.series && config.series.includes('Door')) {
        return generateDoorDiagram(config);
    }

    const svgWidth = 200;
    const svgHeight = 140;
    const frameThickness = 8;
    const trackWidth = 10;
    const shutterGap = 3;

    // Calculate proportional window size maintaining aspect ratio
    const aspectRatio = config.width / config.height;
    let windowWidth = 200;
    let windowHeight = 200 / aspectRatio;

    if (windowHeight > 130) {
        windowHeight = 130;
        windowWidth = 130 * aspectRatio;
    }

    const startX = (svgWidth - windowWidth) / 2;
    const startY = 25;

    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;

    // Title - Include mosquito shutter info
    const typeStr = `${config.tracks}T${config.shutters}S${config.mosquitoShutters > 0 ? config.mosquitoShutters + 'MS' : ''}`;
    svg += `<text x="${svgWidth / 2}" y="12" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#2c3e50">${config.windowId} - ${typeStr}</text>`;

    // Draw outer frame
    svg += `<rect x="${startX}" y="${startY}" width="${windowWidth}" height="${windowHeight}" 
            fill="#d5d8dc" stroke="#34495e" stroke-width="${frameThickness}" rx="4"/>`;

    // Top frame shadow
    svg += `<rect x="${startX}" y="${startY}" width="${windowWidth}" height="${frameThickness * 1.5}" 
            fill="#34495e" opacity="0.4"/>`;

    // Bottom sill
    svg += `<rect x="${startX}" y="${startY + windowHeight - frameThickness}" 
            width="${windowWidth}" height="${frameThickness}" fill="#34495e" opacity="0.4"/>`;

    // Draw tracks
    const trackStartY = startY + frameThickness * 1.5;
    const trackHeight = windowHeight - frameThickness * 2.5;

    for (let i = 0; i < config.tracks; i++) {
        const trackX = startX + frameThickness + (i * trackWidth * 0.7);

        // Top track
        svg += `<rect x="${trackX}" y="${startY + 3}" width="${trackWidth}" height="${frameThickness}" 
                fill="#7f8c8d" stroke="#5d6d7e" stroke-width="0.5" opacity="0.6" rx="1"/>`;

        svg += `<text x="${trackX + trackWidth / 2}" y="${startY - 2}" text-anchor="middle" 
                font-family="Arial, sans-serif" font-size="7" fill="#5d6d7e" font-weight="bold">T${i + 1}</text>`;
    }

    // Draw shutters
    const availableWidth = windowWidth - frameThickness * 2;
    const shutterWidth = (availableWidth - (config.shutters - 1) * shutterGap) / config.shutters;

    for (let i = 0; i < config.shutters; i++) {
        const shutterX = startX + frameThickness + (i * (shutterWidth + shutterGap));
        const shutterY = trackStartY;
        const shutterHeight = trackHeight;

        // Shutter frame
        svg += `<rect x="${shutterX}" y="${shutterY}" width="${shutterWidth}" height="${shutterHeight}" 
                fill="#ffffff" stroke="#3498db" stroke-width="2.5" rx="2"/>`;

        // Glass area
        svg += `<rect x="${shutterX + 4}" y="${shutterY + 4}" width="${shutterWidth - 8}" height="${shutterHeight - 8}" 
                fill="#e8f4f8" stroke="#85c1e9" stroke-width="1" rx="1"/>`;

        // Glass reflection
        svg += `<rect x="${shutterX + 6}" y="${shutterY + 6}" width="${shutterWidth - 12}" height="${shutterHeight * 0.25}" 
                fill="white" opacity="0.4"/>`;

        // Horizontal mullions
        const mullionCount = Math.max(2, Math.floor(shutterHeight / 50));
        for (let m = 1; m < mullionCount; m++) {
            const mullionY = shutterY + (shutterHeight * m / mullionCount);
            svg += `<line x1="${shutterX + 4}" y1="${mullionY}" x2="${shutterX + shutterWidth - 4}" y2="${mullionY}" 
                    stroke="#3498db" stroke-width="2"/>`;
        }

        // Vertical mullion for wider shutters
        if (shutterWidth > 40) {
            svg += `<line x1="${shutterX + shutterWidth / 2}" y1="${shutterY + 4}" 
                    x2="${shutterX + shutterWidth / 2}" y2="${shutterY + shutterHeight - 4}" 
                    stroke="#3498db" stroke-width="2"/>`;
        }

        // Handle - Only on corner shutters (first and last)
        // First shutter: lock on left side, Last shutter: lock on right side
        if (i === 0) {
            // First shutter - lock on LEFT side
            const handleX = shutterX + 5;
            const handleY = shutterY + shutterHeight / 2;
            svg += `<rect x="${handleX}" y="${handleY - 6}" width="5" height="12" 
                    fill="#2c3e50" rx="1.5"/>`;
            svg += `<circle cx="${handleX + 2.5}" cy="${handleY}" r="2" fill="#34495e"/>`;
        } else if (i === config.shutters - 1) {
            // Last shutter - lock on RIGHT side
            const handleX = shutterX + shutterWidth - 10;
            const handleY = shutterY + shutterHeight / 2;
            svg += `<rect x="${handleX}" y="${handleY - 6}" width="5" height="12" 
                    fill="#2c3e50" rx="1.5"/>`;
            svg += `<circle cx="${handleX + 2.5}" cy="${handleY}" r="2" fill="#34495e"/>`;
        }

        // Shutter label
        svg += `<text x="${shutterX + shutterWidth / 2}" y="${shutterY + 18}" text-anchor="middle" 
                font-family="Arial, sans-serif" font-size="11" fill="#2980b9" font-weight="bold">S${i + 1}</text>`;

        // Sliding arrow - shows direction of shutter movement toward center
        const arrowY = shutterY + shutterHeight - 15;
        if (i === 0) {
            // First shutter - arrow points RIGHT (slides right)
            svg += `<path d="M ${shutterX + shutterWidth / 2 - 8},${arrowY} L ${shutterX + shutterWidth / 2 + 4},${arrowY} 
                    L ${shutterX + shutterWidth / 2},${arrowY - 4} M ${shutterX + shutterWidth / 2 + 4},${arrowY} 
                    L ${shutterX + shutterWidth / 2},${arrowY + 4}" 
                    stroke="#e74c3c" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        } else if (i === config.shutters - 1) {
            // Last shutter - arrow points LEFT (slides left)
            svg += `<path d="M ${shutterX + shutterWidth / 2 + 8},${arrowY} L ${shutterX + shutterWidth / 2 - 4},${arrowY} 
                    L ${shutterX + shutterWidth / 2},${arrowY - 4} M ${shutterX + shutterWidth / 2 - 4},${arrowY} 
                    L ${shutterX + shutterWidth / 2},${arrowY + 4}" 
                    stroke="#e74c3c" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        } else {
            // Middle shutters - alternating directions
            if (i % 2 === 0) {
                svg += `<path d="M ${shutterX + shutterWidth / 2 - 8},${arrowY} L ${shutterX + shutterWidth / 2 + 4},${arrowY} 
                        L ${shutterX + shutterWidth / 2},${arrowY - 4} M ${shutterX + shutterWidth / 2 + 4},${arrowY} 
                        L ${shutterX + shutterWidth / 2},${arrowY + 4}" 
                        stroke="#e74c3c" stroke-width="2" fill="none" stroke-linecap="round"/>`;
            } else {
                svg += `<path d="M ${shutterX + shutterWidth / 2 + 8},${arrowY} L ${shutterX + shutterWidth / 2 - 4},${arrowY} 
                        L ${shutterX + shutterWidth / 2},${arrowY - 4} M ${shutterX + shutterWidth / 2 - 4},${arrowY} 
                        L ${shutterX + shutterWidth / 2},${arrowY + 4}" 
                        stroke="#e74c3c" stroke-width="2" fill="none" stroke-linecap="round"/>`;
            }
        }
    }

    // Mosquito shutter indicator
    if (config.mosquitoShutters > 0) {
        svg += `<circle cx="${svgWidth - 8}" cy="8" r="5" fill="#e74c3c"/>`;
        svg += `<text x="${svgWidth - 8}" y="11" text-anchor="middle" 
                font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="white">MS</text>`;
    }

    // Draw bottom tracks last so they appear on top (visible)
    for (let i = 0; i < config.tracks; i++) {
        const trackX = startX + frameThickness + (i * trackWidth * 0.7);
        svg += `<rect x="${trackX}" y="${startY + windowHeight - frameThickness - 2}" width="${trackWidth}" height="${frameThickness}" 
                fill="#7f8c8d" stroke="#5d6d7e" stroke-width="0.5" opacity="0.6" rx="1"/>`;
    }

    svg += '</svg>';
    return svg;
}

function generateDoorDiagram(config) {
    const svgWidth  = 200;
    const svgHeight = 150;

    const aspectRatio = config.width / config.height;
    let doorH = 128;
    let doorW = doorH * aspectRatio;
    if (doorW > 176) { doorW = 176; doorH = doorW / aspectRatio; }

    const startX = (svgWidth - doorW) / 2;
    const startY = 16;

    const FT = config.frame ? 5 : 0; // frame thickness in SVG px
    const leaves = config.leaves || 1;

    // Partition fill colours
    const PART_CLR = {
        'Glass':          '#d6eaf8',
        'ACP':            '#fdebd0',
        'Bakelite':       '#f5e6d3',
        'MosquitoNet':    '#eafaf1',
        'SSMosquito':     '#e8f8f5',
        'Louvers':        '#eaf0fb',
        'ParticleBoard':  '#fdf2e9',
        'PartitionSheet': '#f9f9f9',
        'None':           '#ffffff'
    };
    const partClr = (p) => (p && PART_CLR[p.material]) || '#f4f6f7';

    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;

    // Title
    const typeStr = leaves > 1 ? 'Double' : 'Single';
    svg += `<text x="${svgWidth/2}" y="11" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="#2c3e50">${config.windowId} · ${typeStr} Door</text>`;

    // Outer opening rectangle (background)
    svg += `<rect x="${startX}" y="${startY}" width="${doorW}" height="${doorH}" fill="#f0f0f0" stroke="#95a5a6" stroke-width="1"/>`;

    // 3-sided frame: top, left, right (NO bottom — floor)
    if (config.frame) {
        svg += `<rect x="${startX}" y="${startY}" width="${doorW}" height="${FT}" fill="#7f8c8d"/>`;           // top
        svg += `<rect x="${startX}" y="${startY}" width="${FT}" height="${doorH}" fill="#7f8c8d"/>`;           // left
        svg += `<rect x="${startX+doorW-FT}" y="${startY}" width="${FT}" height="${doorH}" fill="#7f8c8d"/>`;  // right
    }

    // Inner area (inside frame)
    const innerX = startX + FT;
    const innerY = startY + FT;
    const innerW = doorW - FT * 2;
    const innerH = doorH - FT;  // no bottom frame

    // Proportional rail heights
    const TW = config.topWidth    || 47.5;  // mm
    const BW = config.bottomWidth || 114.5;
    const MW = config.middleWidth || 47.5;
    const totalProfileMM = TW + BW + MW;
    const TH = innerH * (TW / (totalProfileMM + config.height * 25.4 * 0.5));  // rough proportional
    const topRailH    = Math.max(4, Math.min(14, innerH * 0.08));
    const botRailH    = Math.max(6, Math.min(20, innerH * 0.14));
    const midRailH    = Math.max(4, Math.min(10, innerH * 0.06));

    // Middle rail Y position
    let midRailY;
    if (config.middleRailPositionMM != null) {
        const midFrac = config.middleRailPositionMM / (config.height * 25.4);
        midRailY = innerY + innerH * (1 - midFrac) - midRailH / 2;
    } else {
        midRailY = innerY + innerH * 0.5 - midRailH / 2;
    }
    midRailY = Math.max(innerY + topRailH + 2, Math.min(innerY + innerH - botRailH - midRailH - 2, midRailY));

    // Zone heights
    const upperZoneY = innerY + topRailH;
    const upperZoneH = midRailY - upperZoneY;
    const lowerZoneY = midRailY + midRailH;
    const lowerZoneH = innerY + innerH - botRailH - lowerZoneY;

    // Leaf width
    const singleLeafW = innerW / leaves;

    for (let li = 0; li < leaves; li++) {
        const lx = innerX + li * singleLeafW;
        const vlw = Math.max(3, singleLeafW * 0.06); // vertical stile width

        // Leaf background
        svg += `<rect x="${lx}" y="${innerY}" width="${singleLeafW}" height="${innerH}" fill="#f4f6f7" stroke="#3498db" stroke-width="1.5"/>`;

        // Upper zone fill (partition color)
        const up = config.upperPartition;
        svg += `<rect x="${lx+vlw}" y="${upperZoneY}" width="${singleLeafW-vlw*2}" height="${upperZoneH}" fill="${partClr(up)}" stroke="#aab" stroke-width="0.5" opacity="0.9"/>`;

        // Lower zone fill
        const lo = config.lowerPartition;
        svg += `<rect x="${lx+vlw}" y="${lowerZoneY}" width="${singleLeafW-vlw*2}" height="${lowerZoneH}" fill="${partClr(lo)}" stroke="#aab" stroke-width="0.5" opacity="0.9"/>`;

        // Top rail
        svg += `<rect x="${lx}" y="${innerY}" width="${singleLeafW}" height="${topRailH}" fill="#d5d8dc" stroke="#aaa" stroke-width="0.5"/>`;
        // Bottom rail
        svg += `<rect x="${lx}" y="${innerY+innerH-botRailH}" width="${singleLeafW}" height="${botRailH}" fill="#d5d8dc" stroke="#aaa" stroke-width="0.5"/>`;
        // Middle rail
        svg += `<rect x="${lx}" y="${midRailY}" width="${singleLeafW}" height="${midRailH}" fill="#d5d8dc" stroke="#aaa" stroke-width="0.5"/>`;
        // Left stile (hinge side) and right stile (handle side)
        svg += `<rect x="${lx}" y="${innerY}" width="${vlw}" height="${innerH}" fill="#bdc3c7" stroke="#aaa" stroke-width="0.5"/>`;
        svg += `<rect x="${lx+singleLeafW-vlw}" y="${innerY}" width="${vlw}" height="${innerH}" fill="#bdc3c7" stroke="#aaa" stroke-width="0.5"/>`;

        // Handle on the right stile (non-hinge side)
        const hx = lx + singleLeafW - vlw / 2;
        const hy = innerY + innerH * 0.48;
        svg += `<circle cx="${hx}" cy="${hy}" r="2" fill="#2c3e50"/>`;
        svg += `<rect x="${hx-1}" y="${hy+2}" width="2" height="9" fill="#2c3e50" rx="0.5"/>`;

        // Hinge marks on left stile
        for (const hpct of [0.25, 0.75]) {
            const hy2 = innerY + innerH * hpct;
            svg += `<rect x="${lx}" y="${hy2-3}" width="${vlw}" height="4" fill="#7f8c8d" rx="1"/>`;
        }

        // Partition labels
        const upLabel = (up && up.material !== 'None' && up.material) ? up.material : '';
        const loLabel = (lo && lo.material !== 'None' && lo.material) ? lo.material : '';
        if (upLabel && upperZoneH > 10) {
            svg += `<text x="${lx + singleLeafW/2}" y="${upperZoneY + upperZoneH/2 + 3}" text-anchor="middle" font-family="Arial" font-size="7" fill="#2c3e50" font-weight="bold">${upLabel}</text>`;
        }
        if (loLabel && lowerZoneH > 10) {
            svg += `<text x="${lx + singleLeafW/2}" y="${lowerZoneY + lowerZoneH/2 + 3}" text-anchor="middle" font-family="Arial" font-size="7" fill="#2c3e50" font-weight="bold">${loLabel}</text>`;
        }
    }

    // Center divider line for double door
    if (leaves > 1) {
        svg += `<line x1="${innerX + singleLeafW}" y1="${innerY}" x2="${innerX + singleLeafW}" y2="${innerY + innerH}" stroke="#7f8c8d" stroke-width="1.5" stroke-dasharray="3,2"/>`;
    }

    // Floor line (no bottom frame)
    svg += `<line x1="${startX}" y1="${startY+doorH}" x2="${startX+doorW}" y2="${startY+doorH}" stroke="#bbb" stroke-width="1" stroke-dasharray="4,3"/>`;

    // Closing mechanism badge
    const cmLabel = config.closingMechanism === 'FloorSpring' ? 'FS' : 'HG';
    svg += `<rect x="${startX+2}" y="${startY+doorH-13}" width="16" height="11" rx="2" fill="${config.closingMechanism === 'FloorSpring' ? '#8e44ad' : '#2980b9'}" opacity="0.85"/>`;
    svg += `<text x="${startX+10}" y="${startY+doorH-5}" text-anchor="middle" font-family="Arial" font-size="7" font-weight="bold" fill="white">${cmLabel}</text>`;

    svg += '</svg>';
    return svg;
}


// ============================================================================
// HARDWARE CALCULATIONS
// ============================================================================

// Safe evaluation helper — shared by optimization and hardware/quotation formulas
// Must include ALL variables used by any formula (door rail formulas need HandleVW, HingeVW)
function safeEval(formula, context, defaultValue = 0) {
    try {
        const { W, H, S, MS, T, P, GL, CJ, IT, GT, MT, MIT, F, VW, TW, MW, BW, L, HandleVW, HingeVW } = context;
        const fn = new Function(
            'W', 'H', 'S', 'MS', 'T', 'P', 'GL', 'CJ', 'IT', 'GT', 'MT', 'MIT',
            'F', 'VW', 'TW', 'MW', 'BW', 'L', 'HandleVW', 'HingeVW',
            `return ${formula}`
        );
        const result = fn(W, H, S, MS, T, P, GL, CJ, IT, GT, MT, MIT, F, VW, TW, MW, BW, L, HandleVW, HingeVW);
        return isNaN(result) ? defaultValue : result;
    } catch (e) {
        console.error('SafeEval Error:', e, 'Formula:', formula);
        return defaultValue;
    }
}

function generateDoorHardware(win) {
    // Use accessories saved on the door config (set via checklist in door form)
    if (win.accessories && win.accessories.length > 0) {
        return win.accessories;
    }

    // Fallback for older saved doors that don't have accessories stored
    const cm = win.closingMechanism || 'Hinge';
    const items = [];
    if (cm === 'Hinge') {
        items.push({ hardware: 'Door Hinge',   unit: 'Nos',  formula: '4 * L',            rate: 52   });
    } else {
        items.push({ hardware: 'Floor Spring', unit: 'Nos',  formula: '1 * L',            rate: 3500 });
    }
    items.push({ hardware: 'Door Handle',      unit: 'Nos',  formula: '2 * L',            rate: 450  });
    if (cm === 'Hinge') {
        items.push({ hardware: 'Door Closer',  unit: 'Nos',  formula: '1 * L',            rate: 1800 });
    }
    items.push(
        { hardware: 'Lock Body',               unit: 'Nos',  formula: '1 * L',            rate: 850  },
        { hardware: 'Cylinder',                unit: 'Nos',  formula: '1 * L',            rate: 450  },
        { hardware: 'Silicon Sealant',         unit: 'R.Ft', formula: '(W+H)*2/12',       rate: 10   },
        { hardware: 'Door Rod 12mm',           unit: 'Nos',  formula: '2 * L',            rate: 60   }
    );
    return items;
}

function calculateWindowHardware(window, optimizationResults = null) {
    /**
     * Calculate hardware quantities for a single window based on series
     * Returns object with hardware items and their quantities
     */
    const series = window.series;
    const shutters = window.shutters || 0;
    const mosquitoShutters = window.mosquitoShutters || 0;
    const width = window.width || 0;
    const height = window.height || 0;

    // Helper to get total length of a material for this window from optimization results
    const GL = (materialName) => {
        if (!optimizationResults || !optimizationResults.results) return 0;
        let total = 0;

        // The results are now keyed by "Series | Material"
        const expectedKey = `${series} | ${materialName}`.toLowerCase();
        const fallbackKey = materialName.toLowerCase(); // For backward compatibility

        for (const [key, plans] of Object.entries(optimizationResults.results)) {
            const lowerKey = key.toLowerCase();
            if (lowerKey === expectedKey || lowerKey === fallbackKey) {
                plans.forEach(plan => {
                    plan.pieces.forEach(piece => {
                        if (piece.label && piece.label.startsWith(window.configId)) {
                            total += piece.length;
                        }
                    });
                });
            }
        }
        return total;
    };

    // Get hardware items for this series
    // Door hardware is generated dynamically based on closing mechanism
    let hardwareList = (series === 'Door')
        ? generateDoorHardware(window)
        : hardwareMaster[series];

    if (!hardwareList) {
        // Fallback for migrated names
        if (series === '1') hardwareList = hardwareMaster['1"'];
        else if (series === '1"') hardwareList = hardwareMaster['1'];
    }

    if (!hardwareList) {
        console.warn(`No hardware items found for series: ${series}`);
        return [];
    }

    const context = {
        W: window.width,
        H: window.height,
        S: window.shutters,
        MS: window.mosquitoShutters || 0,
        T: window.tracks,
        F: window.frame || 0, // Frame for doors (1=YES, 0=NO)
        // Profile widths for doors (stored in mm, convert to inches)
        VW: (window.verticalWidth || 47.5) / 25.4,
        TW: (window.topWidth || 47.5) / 25.4,
        MW: (window.middleWidth || 47.5) / 25.4,
        BW: (window.bottomWidth || 85) / 25.4,
        P: (window.width * 2 + window.height * 2),
        L: window.leaves || 1,
        GL: GL // Passing the helper function itself
    };

    let results = [];

    hardwareList.forEach(item => {
        let quantity = safeEval(item.formula, context, 0);

        // Round quantity to 2 decimal places to prevent floating point issues in reports
        quantity = Math.round(quantity * 100) / 100;

        if (quantity > 0) {
            results.push({
                hardware: item.hardware,
                qty: quantity,
                unit: item.unit,
                rate: item.rate,
                total: Math.round(quantity * item.rate * 100) / 100
            });
        }
    });

    // Add Glass Rubber automatically if glass is selected
    const glass = calculateGlassDimensions(window);
    if (glass) {
        const rubberFeet = glass.perimeter * glass.qty * 1.05; // 5% extra
        results.push({
            hardware: '5mm Aluminum Rubber',
            qty: rubberFeet,
            unit: 'Ft',
            rate: ratesConfig.global.rubberRate || 5,
            total: Math.round(rubberFeet * (ratesConfig.global.rubberRate || 5))
        });
    }

    return results;
}

// Helper: find best-match powder-coating rate for a (series, component) pair.
// Handles case mismatch and prefix variations like:
//   - rates use "3/4\" 2 track top"     vs  component "3/4\" 2 Track Top"
//   - rates use "Domal Shutter"          vs  component "27mm Domal Shutter"
//   - rates use "Domal 3 Track"          vs  series="Domal" + component="3 Track"
// For Door series, append the correct size suffix (45mm / 85mm / 115mm) to the
// component name so the size-specific PC rate is selected.
function doorCompWithSize(compName, win) {
    const sizeLabel = mm => mm >= 110 ? '115mm' : mm >= 80 ? '85mm' : '45mm';
    const c = (compName || '').toLowerCase();
    if (c === 'door top')           return `Door Top ${sizeLabel(win.topWidth    || 47.5)}`;
    if (c === 'door bottom')        return `Door Bottom ${sizeLabel(win.bottomWidth || 114.5)}`;
    if (c === 'door middle double') return `Door Middle Double ${sizeLabel(win.middleWidth || 47.5)}`;
    if (c === 'door middle single') return `Door Middle Single ${sizeLabel(win.verticalWidth || 47.5)}`;
    if (c === 'door vertical')      return `Door Vertical ${sizeLabel(win.verticalWidth || 47.5)}`;
    // Tips Vertical, Door Glazing Clip, Door Leg Partition have no size variant
    return compName;
}

function lookupPowderCoatingRate(series, compName) {
    const pc = (typeof ratesConfig !== 'undefined') ? (ratesConfig.powderCoating || {}) : {};
    const norm = s => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

    const seriesPrefix = (series || '').replace(/\s*Series\s*$/i, '').trim();
    const candidates = [
        compName,
        `${seriesPrefix} ${compName}`,
        `${series} ${compName}`
    ].map(norm).filter(Boolean);

    // 1) exact (case-insensitive) match
    for (const [k, v] of Object.entries(pc)) {
        const nk = norm(k);
        if (candidates.includes(nk)) return v;
    }

    // 2) fuzzy: rate key is a suffix/substring of candidate (e.g., "domal shutter" inside "27mm domal shutter")
    //    Prefer the LONGEST matching rate key to avoid over-matching.
    let bestRate = 0, bestLen = 0;
    for (const [k, v] of Object.entries(pc)) {
        const nk = norm(k);
        if (!nk) continue;
        for (const cand of candidates) {
            if (cand.endsWith(nk) || cand.includes(' ' + nk) || cand === nk) {
                if (nk.length > bestLen) { bestLen = nk.length; bestRate = v; }
            }
        }
    }
    if (bestLen > 0) return bestRate;

    // 3) fallback: candidate is a suffix of rate key (e.g., comp "Shutter" matches "Domal Shutter")
    bestRate = 0; bestLen = 0;
    for (const [k, v] of Object.entries(pc)) {
        const nk = norm(k);
        for (const cand of candidates) {
            if (cand && (nk.endsWith(cand) || nk.includes(' ' + cand))) {
                if (cand.length > bestLen) { bestLen = cand.length; bestRate = v; }
            }
        }
    }
    return bestRate;
}

// Calculate glass cost for a door using its upper/lower partition definitions.
// Each glass partition's area = (inner door width) × (zone height), converted to sqft.
function calculateDoorGlassCost(win) {
    if (!win || win.category !== 'Door') return 0;

    const VW = (win.verticalWidth || 47.5) / 25.4;    // inches
    const TW = (win.topWidth    || 47.5) / 25.4;
    const BW = (win.bottomWidth || 114.5)/ 25.4;
    const MW = (win.middleWidth || 47.5) / 25.4;
    const F  = win.frame || 0;
    const L  = win.leaves || 1;

    // For double doors each leaf is narrower; glass width = per-leaf interior width
    const leafW   = (win.width - (F * 3.15)) / L - 2 * VW;
    const innerW  = Math.max(0, leafW);                    // per-leaf glass width
    const innerH  = win.height - (F * 1.575);             // door interior height
    const midMM   = win.middleRailPositionMM;

    // Heights of lower and upper zones (excluding top/bottom/middle rail profiles)
    let lowerZoneH, upperZoneH;
    if (midMM != null) {
        const midIn = midMM / 25.4;
        lowerZoneH = Math.max(0, midIn - BW - MW / 2);
        upperZoneH = Math.max(0, innerH - midIn - TW - MW / 2);
    } else {
        // Center: both zones equal
        const halfH = (innerH - TW - BW - MW) / 2;
        lowerZoneH = upperZoneH = Math.max(0, halfH);
    }

    const GLASS_DEDUCT  = 0.3125; // 8mm for glass (rubber + buffer)
    const OTHER_DEDUCT  = 0.25;   // 6mm for ACP, Bakelite, etc.

    const partitionDimensions = (partition, openingW, openingH) => {
        const isGlass = partition && partition.material === 'Glass';
        const d = isGlass ? GLASS_DEDUCT : OTHER_DEDUCT;
        return { w: Math.max(0, openingW - d), h: Math.max(0, openingH - d) };
    };

    const glassRateForPartition = (partition) => {
        if (!partition || !partition.material || partition.material === 'None') return 0;
        if (partition.material === 'Glass') {
            const toughened = !!partition.glassToughened;
            const thk       = partition.thickness || '6';
            const prefix    = (partition.glassType === 'DGU') ? 'DGU_' : '';
            const key       = `${prefix}${toughened ? 'toughened' : 'non_toughened'}_${thk}mm`;
            const fallback  = `${toughened ? 'toughened' : 'non_toughened'}_5mm`;
            let rate = ratesConfig.glass[key];
            if (rate == null) rate = ratesConfig.glass[fallback] || 0;
            return rate;
        }
        // Non-glass partition: look up partitionRates by material + thickness
        const pr = (ratesConfig.partitionRates || {});
        const thk = partition.thickness && partition.thickness !== '0' ? `_${partition.thickness}mm` : '';
        const key = partition.material + thk;
        return pr[key] || pr[partition.material] || 0;
    };

    const qty = win.qty || 1;

    // Upper zone
    const up = win.upperPartition || (win.partitionMaterial ? { material: win.partitionMaterial, thickness: win.partitionThickness, glassType: win.glassUnit || 'SGU', glassToughened: win.glassToughened } : null);
    const upperRate = glassRateForPartition(up);
    const upperDim  = partitionDimensions(up, innerW, upperZoneH);
    const upperArea = (upperDim.w * upperDim.h) / 144;

    // Lower zone
    const lo = win.lowerPartition || null;
    const lowerRate = glassRateForPartition(lo);
    const lowerDim  = partitionDimensions(lo, innerW, lowerZoneH);
    const lowerArea = (lowerDim.w * lowerDim.h) / 144;

    return (upperArea * upperRate + lowerArea * lowerRate) * qty * L;
}

// Helper: resolve glass info from window (supports new glassUnit/glassThickness and legacy glassType)
function resolveGlassInfo(win) {
    if (win.glassUnit && win.glassUnit !== 'none') {
        const thk = win.glassThickness || '5';
        const toughened = !!win.glassToughened;
        // Build rate key like "toughened_5mm" / "non_toughened_6mm" / "DGU_toughened_8mm"
        const prefix = (win.glassUnit === 'DGU') ? 'DGU_' : '';
        const rateKey = `${prefix}${toughened ? 'toughened' : 'non_toughened'}_${thk}mm`;
        const fallbackKey = `${toughened ? 'toughened' : 'non_toughened'}_5mm`; // fallback to base rate
        const unitLabel = (win.glassUnit === 'DGU') ? 'DGU Double Glass' : 'SGU Single Glass';
        const tLabel = toughened ? 'Toughened' : 'Non-Toughened';
        return {
            hasGlass: true, rateKey, fallbackKey,
            label: `${thk} MM ${tLabel}\n${unitLabel}`,
            thickness: thk, unit: win.glassUnit, toughened
        };
    }
    if (win.glassType && win.glassType !== 'none') {
        const label = win.glassType === 'toughened_5mm' ? '5 MM Toughened\nGlass' : '5 MM Non-Toughened\nGlass';
        return { hasGlass: true, rateKey: win.glassType, fallbackKey: win.glassType, label, thickness: '5', unit: 'SGU', toughened: win.glassType === 'toughened_5mm' };
    }
    return { hasGlass: false, rateKey: null, fallbackKey: null, label: 'No Glass', thickness: '0', unit: 'none', toughened: false };
}

// Helper to calculate glass dimensions for a window.
// Shutter piece lengths are read from optimization results using the formula 'desc' identifiers
// configured in ratesConfig.glassOffsets[series].shutterHDesc / shutterWDesc.
function calculateGlassDimensions(window) {
    const gi = resolveGlassInfo(window);
    if (!gi.hasGlass) return null;

    const fallbackOffset = ratesConfig.global.glassOffset || 1.5;
    const seriesCfg      = (ratesConfig.glassOffsets && ratesConfig.glassOffsets[window.series]) || {};
    const offsetW        = seriesCfg.offsetW  != null ? seriesCfg.offsetW  : fallbackOffset;
    const offsetH        = seriesCfg.offsetH  != null ? seriesCfg.offsetH  : fallbackOffset;
    const shutterHDesc   = (seriesCfg.shutterHDesc || '').toLowerCase();
    const shutterWDesc   = (seriesCfg.shutterWDesc || '').toLowerCase();

    // Find shutter piece lengths from optimization results.
    // Pieces are labelled: "<configId> - <formula.desc>"
    let shutterH = 0;
    let shutterW = 0;

    if (optimizationResults && optimizationResults.results && shutterHDesc && shutterWDesc) {
        const prefix = window.configId + ' - ';
        for (const plans of Object.values(optimizationResults.results)) {
            for (const plan of plans) {
                for (const p of plan.pieces) {
                    if (!p.label || !p.label.startsWith(prefix)) continue;
                    const desc = p.label.slice(prefix.length).toLowerCase();
                    if (!shutterH && desc === shutterHDesc) shutterH = p.length;
                    if (!shutterW && desc === shutterWDesc) shutterW = p.length;
                    if (shutterH && shutterW) break;
                }
                if (shutterH && shutterW) break;
            }
            if (shutterH && shutterW) break;
        }
    }

    // Fallback when optimization hasn't been run
    if (!shutterH) shutterH = window.height;
    if (!shutterW) shutterW = window.width / Math.max(1, window.shutters);

    const gw = Math.max(0, shutterW - offsetW);
    const gh = Math.max(0, shutterH - offsetH);

    const regularQty  = window.shutters || 0;
    const regularArea = (gw * gh) / 144; // sqft per shutter

    // Mosquito shutter glass — only when msOffsets are explicitly set
    let msArea = 0, msQty = 0;
    if (seriesCfg.msOffsetW != null && seriesCfg.msOffsetH != null && (window.mosquitoShutters || 0) > 0) {
        const msW = Math.max(0, shutterW - seriesCfg.msOffsetW);
        const msH = Math.max(0, shutterH - seriesCfg.msOffsetH);
        msQty  = window.mosquitoShutters;
        msArea = (msW * msH) / 144;
    }

    return {
        width: gw, height: gh,
        area: regularArea,
        perimeter: (gw * 2 + gh * 2) / 12,
        qty: regularQty,
        msQty, msArea,
        totalArea: regularArea * regularQty + msArea * msQty
    };
}

function generateQuotationHTML(projectWindows, selectedProject) {
    let html = `<div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2980b9; margin: 0;">NIRUMA ALUMINUM</h1>
        <p style="margin: 5px 0; color: #7f8c8d;">Internal Project Quotation for <strong>${selectedProject}</strong></p>
    </div>`;

    let grandTotal = 0;

    projectWindows.forEach(win => {
        let glassCost = 0;
        let rubberCost = 0;
        if (win.category === 'Door') {
            glassCost = calculateDoorGlassCost(win);
        } else {
            const glass = calculateGlassDimensions(win);
            const _gi = resolveGlassInfo(win);
            const glassRate = (glass && _gi && _gi.rateKey) ? (ratesConfig.glass[_gi.rateKey] || 0) : 0;
            glassCost = glass ? glass.totalArea * glassRate : 0;
            const rubberFeet = glass ? glass.perimeter * glass.qty * 1.05 : 0;
            rubberCost = rubberFeet * (ratesConfig.global.rubberRate || 5);
        }
        const hardware = calculateWindowHardware(win, optimizationResults);
        const hardwareCost = hardware.reduce((sum, h) => sum + h.total, 0);

        let powderCoatingCost = 0;
        let weightTotal = 0;

        if (optimizationResults && optimizationResults.results) {
            for (const [key, data] of Object.entries(optimizationResults.results)) {
                let purchasedLenForWindow = 0;
                let weightForWindow = 0;
                let compName = key.includes('|') ? key.split('|')[1].trim() : key;
                const _seriesKey = key.includes('|') ? key.split('|')[0].trim() : '';
                const _effComp = (_seriesKey === 'Door') ? doorCompWithSize(compName, win) : compName;
                const pcRate = lookupPowderCoatingRate(_seriesKey, _effComp) || 1;

                data.forEach(plan => {
                    const stockLen = parseFloat(plan.stock);
                    const totalUsedInStick = plan.used;
                    if (totalUsedInStick <= 0) return;

                    plan.pieces.forEach(p => {
                        if (p.label && p.label.startsWith(win.configId)) {
                            const shareRatio = p.length / totalUsedInStick;
                            purchasedLenForWindow += shareRatio * stockLen;

                            const section = optimizationResults.componentSections ? optimizationResults.componentSections[key] : null;
                            if (section && section.weight) {
                                const stickWeight = (stockLen / 144) * section.weight;
                                weightForWindow += shareRatio * stickWeight;
                            }
                        }
                    });
                });
                powderCoatingCost += (purchasedLenForWindow / 12) * pcRate;
                weightTotal += weightForWindow;
            }
        }

        const _seriesRate = (typeof stockRates !== 'undefined' && stockRates[win.series]) ? stockRates[win.series] : (typeof aluminumRate !== 'undefined' ? aluminumRate : 280);
        const profileCost = weightTotal * _seriesRate;
        const winTotal = profileCost + powderCoatingCost + glassCost + hardwareCost + rubberCost;
        grandTotal += winTotal;

        html += `
        <div style="border: 1px solid #eee; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
                Window ${win.configId} (${win.width}" x ${win.height}") - ${win.description}
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f8f9fa;">
                    <th style="text-align: left; padding: 8px;">Category</th>
                    <th style="text-align: right; padding: 8px;">Cost (₹)</th>
                </tr>
                <tr><td style="padding: 8px;">Aluminum Profiles (${weightTotal.toFixed(2)} Kg)</td><td style="text-align: right; padding: 8px;">${profileCost.toFixed(0)}</td></tr>
                <tr><td style="padding: 8px;">Powder Coating</td><td style="text-align: right; padding: 8px;">${powderCoatingCost.toFixed(0)}</td></tr>
                ${glass ? `<tr><td style="padding: 8px;">Glass Area (${(glass.area * glass.qty).toFixed(1)} sqft)</td><td style="text-align: right; padding: 8px;">${glassCost.toFixed(0)}</td></tr>` : ''}
                <tr><td style="padding: 8px;">Hardware & Rubber</td><td style="text-align: right; padding: 8px;">${(hardwareCost + rubberCost).toFixed(0)}</td></tr>
                <tr style="font-weight: bold;"><td style="padding: 8px;">Subtotal</td><td style="text-align: right; padding: 8px;">₹${winTotal.toFixed(0)}</td></tr>
            </table>
        </div>`;
    });

    html += `<h2 style="text-align: right; background: #34495e; color: white; padding: 15px; border-radius: 5px;">Total: ₹${grandTotal.toFixed(0)}</h2>`;
    return html;
}

function generateMaterialPurchaseHTML(projectWindows, selectedProject) {
    let html = `<h2 style="color: #2c3e50;">Raw Material Purchase List - ${selectedProject}</h2>`;
    if (!optimizationResults) return html + '<p>No optimization results found.</p>';

    html += `<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background: #3498db; color: white;">
            <th style="padding: 10px; text-align: left;">Section No</th>
            <th style="padding: 10px; text-align: left;">Description</th>
            <th style="padding: 10px; text-align: center;">Qty (Sticks)</th>
            <th style="padding: 10px; text-align: center;">Length</th>
            <th style="padding: 10px; text-align: right;">Total Weight (Kg)</th>
        </tr>`;

    for (const [key, data] of Object.entries(optimizationResults.results)) {
        const section = optimizationResults.componentSections ? optimizationResults.componentSections[key] : null;
        const totalWeight = data.reduce((sum, plan) => sum + (section ? section.weight : 0), 0);

        // Collect unique stock lengths
        const lengths = [...new Set(data.map(plan => parseFloat(plan.stock)))];
        const lengthStr = lengths.map(l => formatInchesToFeet(l)).join(', ');

        html += `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${section ? section.sectionNo : '-'}</td>
            <td style="padding: 10px;">${key}</td>
            <td style="padding: 10px; text-align: center;">${data.length}</td>
            <td style="padding: 10px; text-align: center;">${lengthStr}</td>
            <td style="padding: 10px; text-align: right;">${totalWeight.toFixed(2)}</td>
        </tr>`;
    }
    html += `</table>`;
    return html;
}

function generateHardwarePurchaseHTML(projectWindows, selectedProject) {
    let html = `<h2 style="color: #2c3e50;">Hardware Purchase List - ${selectedProject}</h2>`;
    const hardwareMap = aggregateProjectHardware(projectWindows, optimizationResults);

    html += `<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background: #27ae60; color: white;">
            <th style="padding: 10px; text-align: left;">Hardware Item</th>
            <th style="padding: 10px; text-align: center;">Quantity</th>
            <th style="padding: 10px; text-align: left;">Unit</th>
        </tr>`;

    for (const [name, data] of Object.entries(hardwareMap)) {
        html += `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${name}</td>
            <td style="padding: 10px; text-align: center;">${Math.ceil(data.qty)}</td>
            <td style="padding: 10px;">${data.unit}</td>
        </tr>`;
    }
    html += `</table>`;
    return html;
}

function generateCutListHTML(projectWindows, selectedProject) {
    let html = `<h2 style="color: #2c3e50;">Workshop Cut List - ${selectedProject}</h2>`;
    if (!optimizationResults) return html + '<p>No optimization results found.</p>';

    for (const [key, plans] of Object.entries(optimizationResults.results)) {
        html += `<div style="margin-top: 20px; border: 1px solid #ddd; padding: 10px;">
            <h4 style="margin: 0; background: #f1c40f; padding: 5px;">${key}</h4>`;

        plans.forEach((plan, idx) => {
            html += `<div style="margin: 10px 0; padding: 5px; border-left: 3px solid #f39c12;">
                <strong>Stick #${idx + 1} (${parseFloat(plan.stock)}"):</strong>
                <div style="display: flex; gap: 5px; margin-top: 5px; flex-wrap: wrap;">`;
            plan.pieces.forEach(p => {
                html += `<span style="background: #ecf3f9; padding: 2px 8px; border: 1px solid #bdc3c7; border-radius: 3px;">
                    ${p.length}" <small>(${p.label})</small>
                </span>`;
            });
            html += `<span style="background: #fee; padding: 2px 8px; border: 1px solid #fab; color: #c0392b;">Waste: ${plan.waste.toFixed(2)}"</span>`;
            html += `</div></div>`;
        });
        html += `</div>`;
    }
    return html;
}

function aggregateProjectHardware(projectWindows, optimizationResults = null) {
    const aggregated = {};
    projectWindows.forEach(window => {
        const windowHardware = calculateWindowHardware(window, optimizationResults);
        windowHardware.forEach(item => {
            if (!aggregated[item.hardware]) {
                aggregated[item.hardware] = { qty: 0, unit: item.unit, rate: item.rate };
            }
            aggregated[item.hardware].qty += item.qty;
        });
    });
    return aggregated;
}

function generatePurchaseListTable(projectWindows, optimizationResults = null) {
    /**
     * Generate purchase list showing hardware items with quantities and costs
     */
    const aggregatedHardware = aggregateProjectHardware(projectWindows, optimizationResults);
    const purchaseListData = [];

    Object.entries(aggregatedHardware).forEach(([hardwareName, data]) => {
        let cost = 0;
        const qty = data.qty;
        const rate = data.rate;

        // For Wool Pile (in meters), calculate cost directly
        // For other items (in Nos), round up the quantity
        if (hardwareName.toLowerCase().includes('wool pile')) {
            cost = qty * rate;
        } else {
            cost = Math.ceil(qty) * rate;
        }

        purchaseListData.push([
            hardwareName,
            hardwareName.toLowerCase().includes('wool pile') ? qty.toFixed(2) : Math.ceil(qty),
            data.unit,
            `Rs. ${rate}`,
            `Rs. ${cost.toFixed(0)}`
        ]);
    });

    // Sort by hardware name for consistent display
    purchaseListData.sort((a, b) => a[0].localeCompare(b[0]));

    return purchaseListData;
}

function calculatePurchaseListTotal(projectWindows, optimizationResults = null) {
    /**
     * Calculate total hardware cost for the project
     */
    const aggregatedHardware = aggregateProjectHardware(projectWindows, optimizationResults);
    let totalHardwareCost = 0;

    Object.values(aggregatedHardware).forEach(data => {
        totalHardwareCost += (data.qty * data.rate);
    });

    return totalHardwareCost;
}

// ============================================================================
// HELPER: NUMBER TO WORDS (INDIAN SYSTEM)
// ============================================================================

function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    num = parseInt(num);

    if (num >= 10000000) {
        const crore = Math.floor(num / 10000000);
        const remainder = num % 10000000;
        return numberToWords(crore) + ' Crore ' + (remainder > 0 ? numberToWords(remainder) : '');
    }

    if (num >= 100000) {
        const lakh = Math.floor(num / 100000);
        const remainder = num % 100000;
        return numberToWords(lakh) + ' Lakh ' + (remainder > 0 ? numberToWords(remainder) : '');
    }

    if (num >= 1000) {
        const thousand = Math.floor(num / 1000);
        const remainder = num % 1000;
        return numberToWords(thousand) + ' Thousand ' + (remainder > 0 ? numberToWords(remainder) : '');
    }

    if (num >= 100) {
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        return ones[hundred] + ' Hundred ' + (remainder > 0 ? numberToWords(remainder) : '');
    }

    if (num >= 20) {
        const ten = Math.floor(num / 10);
        const one = num % 10;
        return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }

    if (num >= 10) {
        return teens[num - 10];
    }

    return ones[num];
}

function verifySectionsConfigured() {
    if (!optimizationResults || !optimizationResults.results) return true;

    const missing = [];
    Object.keys(optimizationResults.results).forEach(key => {
        // Door components use ₹/ft PC rates directly — section weight not required
        const seriesKey = key.split('|')[0].trim();
        if (seriesKey === 'Door') return;

        const selected = optimizationResults.componentSections ? optimizationResults.componentSections[key] : null;
        if (!selected) {
            missing.push(key);
        }
    });

    if (missing.length > 0) {
        showAlert(`⚠️ Missing Thickness Selection!\n\nPlease select the thickness (section) for the following components in the results section before generating a quotation:\n\n${missing.join('\n')}`);
        scrollToSection('section-results');
        return false;
    }
    return true;
}

function findStockInfo(materialKey, length) {
    /**
     * Helper to find weight and section info.
     * Prefers data from componentSections in optimizationResults.
     */
    if (optimizationResults && optimizationResults.componentSections && optimizationResults.componentSections[materialKey]) {
        const choice = optimizationResults.componentSections[materialKey];
        return {
            sectionNo: choice.sectionNo,
            thickness: choice.t,
            weight: choice.weight,
            supplier: choice.supplier
        };
    }

    // Fallback to stockMaster
    const [series, material] = materialKey.includes(' | ') ? materialKey.split(' | ') : ['', materialKey];

    for (const [sName, stocks] of Object.entries(stockMaster)) {
        if (series && sName !== series) continue;
        const stock = stocks.find(s => s.material === material);
        if (stock) return stock;
    }
    return null;
}

