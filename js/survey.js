// ============================================================================
// SITE SURVEY FORM (v1.61)
// Generate a printable .xlsx measurement form, and import the filled form back
// to bulk-create windows/doors. Uses the SheetJS (XLSX) build already loaded.
// Vendor/series are intentionally left blank on import — set in-app afterwards.
// ============================================================================

// Coded legend (matches the printed form).
const SURVEY_PART_CODES = {
    '1':  { material: 'Glass' },
    '2':  { material: 'ACP', acpFacing: 'single' },
    '22': { material: 'ACP', acpFacing: 'double' },
    '3':  { material: 'Bakelite' },
    '4':  { material: 'MosquitoNet' },
    '5':  { material: 'Louvers' }
};
const SURVEY_FIXTURE_CODES = {
    '1': { mech: 'FloorSpring' },
    '2': { acc: 'Door Closer' },
    '3': { mech: 'Hinge' },
    '4': { acc: 'Magnet' },
    '5': { acc: 'Door Stopper' },
    '6': { doubleDoor: true }
};
const SURVEY_PART_LEGEND = [['1', 'Glass'], ['2', 'ACP'], ['22', 'ACP double'], ['3', 'Bakelite'], ['4', 'Mosquito net'], ['5', 'Louvers']];
const SURVEY_FIX_LEGEND  = [['1', 'Floor spring'], ['2', 'Door closer'], ['3', 'Heavy Hing'], ['4', 'Magnet'], ['5', 'Stopper'], ['6', 'Double Door']];

const SURVEY_WIN_COLS  = ['Location', 'Code', 'Width', 'Height', 'Track', 'S', 'MS', 'Remark'];
const SURVEY_DOOR_COLS = ['Location', 'Code', 'Width', 'Height', 'Frame', 'U-Partition', 'L-Partition', 'Fixture', 'Remark'];
const SURVEY_HEADER_ROW = 5;   // 1-based row of the column header in each sheet

// ── Generate dialog ───────────────────────────────────────────────────────────
function openSurveyGenerateDialog() {
    const m = document.getElementById('surveyGenModal');
    if (!m) return;
    const today = new Date();
    const d = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const sel = document.getElementById('projectSelector');
    if (sel && sel.value) document.getElementById('svSite').value = sel.value;
    document.getElementById('svDate').value = d;
    m.classList.add('active');
}
function closeSurveyGenerateDialog() {
    const m = document.getElementById('surveyGenModal');
    if (m) m.classList.remove('active');
}

function generateSurveyForm() {
    if (typeof XLSX === 'undefined') { showAlert('❌ XLSX library not loaded.', 'error'); return; }
    const meta = {
        site:  (document.getElementById('svSite').value || '').trim(),
        poc:   (document.getElementById('svPOC').value || '').trim(),
        units: document.getElementById('svUnits').value || 'mm',
        date:  (document.getElementById('svDate').value || '').trim(),
        nWin:  Math.max(0, parseInt(document.getElementById('svWinRows').value) || 0),
        nDoor: Math.max(0, parseInt(document.getElementById('svDoorRows').value) || 0)
    };
    if (!meta.site) { showAlert('❌ Please enter a Site / Project name.', 'error'); return; }
    if (meta.nWin === 0 && meta.nDoor === 0) { showAlert('❌ Enter at least 1 window or door row.', 'error'); return; }

    const wb = XLSX.utils.book_new();

    if (meta.nWin > 0) {
        const aoa = [
            ['Site Name', meta.site, '', '', '', '', '', `Date: ${meta.date}`],
            ['POC', meta.poc],
            ['Inch / mm', meta.units, '', '', '', '', 'Site Photo'],
            [],
            SURVEY_WIN_COLS.slice()
        ];
        for (let i = 1; i <= meta.nWin; i++) aoa.push(['', 'W' + String(i).padStart(2, '0')]);
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{ wch: 14 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 8 }, { wch: 6 }, { wch: 6 }, { wch: 26 }];
        ws['!merges'] = [{ s: { r: 2, c: 6 }, e: { r: 2, c: 7 } }];
        ws['!autofilter'] = { ref: `A${SURVEY_HEADER_ROW}:H${SURVEY_HEADER_ROW + meta.nWin}` };
        XLSX.utils.book_append_sheet(wb, ws, 'Windows');
    }

    if (meta.nDoor > 0) {
        const aoa = [
            ['Site Name', meta.site, '', '', '', '', '', `Date: ${meta.date}`],
            ['POC', meta.poc, '', '', '', '', '', 'Total Doors: ___'],
            ['Inch / mm', meta.units, '', '', '', '', 'Site Photo'],
            [],
            SURVEY_DOOR_COLS.slice()
        ];
        for (let i = 1; i <= meta.nDoor; i++) aoa.push(['', 'D' + String(i).padStart(2, '0')]);
        // legend block (a few rows below the table)
        const legStart = aoa.length + 3;
        while (aoa.length < legStart - 1) aoa.push([]);
        aoa.push(['', '', '', '', '', 'LEGEND (enter the code number)']);
        aoa.push(['', '', '', '', '', 'U / L-Partition', '', 'Fixture']);
        for (let i = 0; i < Math.max(SURVEY_PART_LEGEND.length, SURVEY_FIX_LEGEND.length); i++) {
            const p = SURVEY_PART_LEGEND[i], f = SURVEY_FIX_LEGEND[i];
            aoa.push(['', '', '', '', '', p ? `${p[0]} - ${p[1]}` : '', '', f ? `${f[0]} - ${f[1]}` : '']);
        }
        aoa.push(['', '', '', '', '', 'Fixture: combine codes with commas, e.g. 1,4,5']);
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{ wch: 14 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 24 }];
        ws['!merges'] = [{ s: { r: 2, c: 6 }, e: { r: 2, c: 7 } }];
        ws['!autofilter'] = { ref: `A${SURVEY_HEADER_ROW}:I${SURVEY_HEADER_ROW + meta.nDoor}` };
        XLSX.utils.book_append_sheet(wb, ws, 'Doors');
    }

    const safe = meta.site.replace(/[^\w\-]+/g, '_');
    XLSX.writeFile(wb, `Survey_Form_${safe}.xlsx`);
    closeSurveyGenerateDialog();
    showAlert(`✅ Survey form generated (${meta.nWin} windows + ${meta.nDoor} doors).`);
}

// ── Import ────────────────────────────────────────────────────────────────────
function surveyFileChosen(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { try { parseSurveyWorkbook(e.target.result); } catch (err) { console.error(err); showAlert('❌ Could not read this file. Is it a survey .xlsx?', 'error'); } };
    reader.readAsArrayBuffer(file);
    input.value = '';   // allow re-importing the same file
}

// Pull metadata (project name + units) from the top rows of a sheet AOA.
function surveyMeta(aoa) {
    let site = '', units = 'mm';
    for (let r = 0; r < Math.min(aoa.length, SURVEY_HEADER_ROW); r++) {
        const row = aoa[r] || [];
        const label = String(row[0] || '').toLowerCase();
        if (label === 'site name') site = String(row[1] || '').trim();
        if (label === 'inch / mm') units = String(row[1] || 'mm').trim().toLowerCase().startsWith('i') ? 'inch' : 'mm';
    }
    return { site, units };
}
const surveyToInches = (v, units) => (units === 'inch' ? v : v / 25.4);

function parseSurveyWorkbook(buf) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const units = [];     // collect parsed units across both sheets
    let project = '';
    const warnings = [];

    ['Windows', 'Doors'].forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        if (!ws) return;
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
        const meta = surveyMeta(aoa);
        if (meta.site) project = meta.site;
        // find the header row (starts with 'Location','Code')
        let hr = aoa.findIndex(r => String((r || [])[0]).toLowerCase() === 'location' && String((r || [])[1]).toLowerCase() === 'code');
        if (hr < 0) return;
        for (let i = hr + 1; i < aoa.length; i++) {
            const row = aoa[i] || [];
            const code = String(row[1] || '').trim();
            // stop at the legend / blank-code region
            if (!code || !/^[WD]\d/i.test(code)) continue;
            const w = parseFloat(row[2]), h = parseFloat(row[3]);
            if (!(w > 0) || !(h > 0)) continue;   // skip un-measured rows
            const u = (sheetName === 'Doors')
                ? buildSurveyDoor(row, meta, code)
                : buildSurveyWindow(row, meta, code);
            if (u) units.push(u);
        }
    });

    if (!units.length) { showAlert('⚠️ No measured rows found (each row needs a Code + Width + Height).', 'warning'); return; }
    surveyPreview(units, project || 'Imported');
}

function buildSurveyWindow(row, meta, code) {
    return {
        configId: code,
        projectName: meta.site || 'Imported',
        location: String(row[0] || '').trim(),
        category: 'Window',
        vendor: '', series: '',
        width: surveyToInches(parseFloat(row[2]), meta.units),
        height: surveyToInches(parseFloat(row[3]), meta.units),
        qty: 1,
        tracks: parseInt(row[4]) || 0,
        shutters: parseInt(row[5]) || 1,
        mosquitoShutters: parseInt(row[6]) || 0,
        interlockType: 'slim',
        glassUnit: 'SGU', glassThickness: '5', glassToughened: false, cornerJoint: '90',
        description: String(row[7] || '').trim(),
        _surveyRemark: String(row[7] || '').trim()
    };
}

// Build the door accessory list from master defaults + fixture-driven extras.
function buildSurveyDoorAccessories(mechanism, extraAccNames) {
    if (typeof getDoorHardwareList !== 'function') return undefined;
    const master = getDoorHardwareList();
    const want = new Set(['Door Handle', 'Lock Body', 'Cylinder', 'Silicon Sealant', 'Door Rod Nut', 'Door Rod Washer', 'Door Leg Stopper']);
    want.add(mechanism === 'FloorSpring' ? 'Floor Spring' : 'Door Hinge');
    (extraAccNames || []).forEach(n => want.add(n));
    return master.filter(it => it && want.has(it.hardware)).map(it => ({
        hardware: it.hardware, variant: it.defaultVariant || null,
        unit: it.unit, formula: it.formula, rate: it.rate
    }));
}

function buildSurveyDoor(row, meta, code) {
    const frame = String(row[4] || '').trim().toLowerCase().startsWith('y') ? 1 : 0;
    const partFrom = codeStr => {
        const c = SURVEY_PART_CODES[String(codeStr || '').trim()];
        if (!c) return { material: 'None', thickness: '0', glassType: null, glassToughened: false, acpFacing: null };
        const thk = c.material === 'Glass' ? '6' : (c.material === 'ACP' ? '4' : (c.material === 'Bakelite' ? '4' : '6'));
        return {
            material: c.material, thickness: thk,
            glassType: c.material === 'Glass' ? 'SGU' : null,
            glassToughened: false,
            acpFacing: c.material === 'ACP' ? (c.acpFacing || 'single') : null
        };
    };
    const upper = partFrom(row[5]);
    const lower = partFrom(row[6]);

    // Fixtures (comma-separated codes)
    let mechanism = 'Hinge', leaves = 1, doorType = 'single';
    const extraAcc = [];
    String(row[7] || '').split(/[,\s]+/).forEach(tok => {
        const f = SURVEY_FIXTURE_CODES[tok.trim()];
        if (!f) return;
        if (f.mech) mechanism = f.mech;
        if (f.doubleDoor) { leaves = 2; doorType = 'double'; }
        if (f.acc) extraAcc.push(f.acc);
    });

    const primaryGlass = upper.material === 'Glass' ? upper : (lower.material === 'Glass' ? lower : null);
    return {
        category: 'Door', series: 'Door',
        configId: code,
        projectName: meta.site || 'Imported',
        location: String(row[0] || '').trim(),
        vendor: '',
        width: surveyToInches(parseFloat(row[2]), meta.units),
        height: surveyToInches(parseFloat(row[3]), meta.units),
        qty: 1,
        frame,
        doorType, leaves,
        closingMechanism: mechanism,
        floorSpringHingeProfile: mechanism === 'FloorSpring' ? 'Door Vertical' : '',
        hingeWidth: mechanism === 'Hinge' ? 85 : null,
        middleRailPositionMM: null,
        upperPartition: upper,
        lowerPartition: lower,
        handleProfile: 'Door Vertical', handleWidth: 47.5,
        accessories: buildSurveyDoorAccessories(mechanism, extraAcc),
        bottomProfile: 'Door Bottom', bottomWidth: 114.5,
        topWidth: 47.5, middleWidth: 47.5, verticalWidth: 47.5,
        glassUnit: primaryGlass ? primaryGlass.glassType : 'SGU',
        glassThickness: primaryGlass ? primaryGlass.thickness : '6',
        glassToughened: false, cornerJoint: '90',
        shutters: 1, tracks: 0, mosquitoShutters: 0,
        description: String(row[8] || '').trim(),
        _surveyRemark: String(row[8] || '').trim()
    };
}

// ── Preview + commit ──────────────────────────────────────────────────────────
let _surveyPending = null;
function surveyPreview(parsedUnits, project) {
    _surveyPending = { units: parsedUnits, project };
    const nW = parsedUnits.filter(u => u.category !== 'Door').length;
    const nD = parsedUnits.filter(u => u.category === 'Door').length;
    const body = document.getElementById('surveyPreviewBody');
    if (body) {
        body.innerHTML = parsedUnits.map(u =>
            `<tr><td>${u.configId}</td><td>${u.category === 'Door' ? '🚪' : '🪟'}</td>` +
            `<td>${Math.round(u.width)}" × ${Math.round(u.height)}"</td>` +
            `<td>${u.location || ''}</td></tr>`).join('');
    }
    const sum = document.getElementById('surveyPreviewSummary');
    if (sum) sum.textContent = `Project "${project}" — ${nW} window(s) + ${nD} door(s) will be added. Vendor & series are left blank (set them in the app afterward).`;
    const m = document.getElementById('surveyImportModal');
    if (m) m.classList.add('active');
}
function closeSurveyImportModal() {
    const m = document.getElementById('surveyImportModal');
    if (m) m.classList.remove('active');
    _surveyPending = null;
}

function commitSurveyImport() {
    if (!_surveyPending) return;
    const { units, project } = _surveyPending;
    let added = 0, skipped = 0;
    const reserved = new Set();
    units.forEach(u => {
        // ensure a unique config ID within the project (rename collisions, don't block import)
        let id = u.configId;
        if (isConfigIdTaken(id, project, -1) || reserved.has(id.toLowerCase())) {
            id = nextAvailableConfigId(u.category === 'Door' ? 'Door' : 'Window', project, reserved);
            skipped++;
        }
        u.configId = id;
        reserved.add(id.toLowerCase());
        windows.push(u);
        added++;
    });
    autoSaveWindows();
    refreshProjectSelector();
    displayWindows();
    closeSurveyImportModal();
    showAlert(`✅ Imported ${added} unit(s) into "${project}".${skipped ? `\n(${skipped} Config ID(s) were auto-renumbered to avoid collisions.)` : ''}`);
}
