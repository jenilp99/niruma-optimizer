/**
 * supplier_master.js
 * Acts as the centralized registry for all supplier modules.
 * Manages data aggregation and provides accessors for the application.
 */

window.SUPPLIER_REGISTRY = {};

/**
 * Registers a supplier module.
 * @param {string} name - The unique name of the supplier (e.g., "Windalco Aluminium").
 * @param {object} data - The supplier data object.
 * @param {object} data.sections - Section weights and thickness (formerly supplierMaster).
 * @param {object} [data.formulas] - Series formulas specific to this supplier.
 * @param {object} [data.stock] - Default stock items for this supplier.
 * @param {object} [data.hardware] - Default hardware items for this supplier.
 */
window.registerSupplier = function (name, data) {
    if (window.SUPPLIER_REGISTRY[name]) {
        console.warn(`Supplier "${name}" is already registered. Overwriting.`);
    }
    window.SUPPLIER_REGISTRY[name] = data;
    console.log(`✅ Registered Supplier Module: ${name}`);
};

// ============================================================================
// DATA AGGREGATION & INITIALIZATION HELPERS
// ============================================================================

/**
 * Merges all registered supplier sections into the format expected by the UI.
 * This effectively replaces the old 'supplierMaster' global object.
 */
function getAllSupplierSections() {
    let aggregated = {};
    for (const [name, data] of Object.entries(window.SUPPLIER_REGISTRY)) {
        if (data.sections) {
            aggregated[name] = data.sections;
        }
    }
    return aggregated;
}

/**
 * Merges default stock from all suppliers.
 * Used by app.js during initialization to populate stockMaster.
 */
function getAggregatedStockDefaults() {
    let aggregatedStock = {};
    for (const [name, data] of Object.entries(window.SUPPLIER_REGISTRY)) {
        if (data.stock) {
            for (const [series, items] of Object.entries(data.stock)) {
                if (!aggregatedStock[series]) aggregatedStock[series] = [];
                // Clone items to avoid reference issues
                const supplierItems = items.map(item => ({ ...item, supplier: name }));
                aggregatedStock[series].push(...supplierItems);
            }
        }
    }
    return aggregatedStock;
}

/**
 * Merges formula definitions from all suppliers.
 */
function getAggregatedFormulas() {
    let aggregatedFormulas = {};
    for (const [name, data] of Object.entries(window.SUPPLIER_REGISTRY)) {
        if (data.formulas) {
            for (const [series, formulas] of Object.entries(data.formulas)) {
                // If collision, we might want to warn or merge. 
                // For now, simple overwrite or first-wins strategy.
                // We'll assume unique Series names for now (e.g. "25mm Gulf").
                if (!aggregatedFormulas[series]) {
                    aggregatedFormulas[series] = formulas;
                } else {
                    // Collision: Could append " (SupplierName)" if needed, 
                    // but for "3/4\"" generic series, we might just want to keep the first one 
                    // or merge if different components.
                    console.log(`ℹ️ Merging formulas for series "${series}" from ${name}`);
                    // Optional: Concatenate arrays if we want additive components
                    // aggregatedFormulas[series] = [...aggregatedFormulas[series], ...formulas]; 
                }
            }
        }
    }
    return aggregatedFormulas;
}

/**
 * Merges hardware definitions.
 */
function getAggregatedHardware() {
    let aggregatedHardware = {};
    for (const [name, data] of Object.entries(window.SUPPLIER_REGISTRY)) {
        if (data.hardware) {
            for (const [series, items] of Object.entries(data.hardware)) {
                if (!aggregatedHardware[series]) aggregatedHardware[series] = [];
                aggregatedHardware[series].push(...items);
            }
        }
    }
    return aggregatedHardware;
}

// ============================================================================
// UI & LOGIC (Kept from original supplier_master.js but updated to use Registry)
// ============================================================================

// Global variable maintained for backward compatibility with app.js
// It will be populated from the registry.
let supplierMaster = {};

function initializeSupplierMaster() {
    // Populate the legacy global object from our registry
    supplierMaster = getAllSupplierSections();

    // If local storage has overrides, we might want to merge them here.
    // For now, we trust the registry logic as the source of truth for defaults.
    // Real persistence logic handles saving *user edits*, which is separate.
}

function initializeProjectSupplierSelector() {
    const selector = document.getElementById('projectSupplierSelector');
    if (!selector) return;

    const suppliers = Object.keys(supplierMaster);
    selector.innerHTML = '<option value="">-- Generic (Automatic) --</option>';
    suppliers.forEach(s => {
        selector.innerHTML += `<option value="${s}">${s}</option>`;
    });
}

function getSupplierSections(supplier, series, material) {
    if (supplierMaster[supplier] && supplierMaster[supplier][series]) {
        return supplierMaster[supplier][series][material] || [];
    }
    return [];
}

// ============================================================================
// DOM ACTIONS
// ============================================================================

function renderSupplierMaster() {
    // Re-fetch latest in case of dynamic updates
    supplierMaster = getAllSupplierSections();

    const list = document.getElementById('supplierMasterList');
    if (!list) return;

    list.innerHTML = '';

    if (Object.keys(supplierMaster).length === 0) {
        list.innerHTML = '<div class="alert alert-info">No supplier sections registered. Check loaded modules.</div>';
        return;
    }

    for (const [supplier, seriesObj] of Object.entries(supplierMaster)) {
        const supDetails = document.createElement('details');
        supDetails.className = 'supplier-details';

        const supSummary = document.createElement('summary');
        supSummary.className = 'supplier-summary';
        supSummary.innerHTML = `<span>🏭 ${supplier}</span>`;
        supDetails.appendChild(supSummary);

        const supContent = document.createElement('div');
        supContent.className = 'supplier-content';

        for (const [series, materials] of Object.entries(seriesObj)) {
            const seriesDetails = document.createElement('details');
            seriesDetails.className = 'series-details';

            const seriesSummary = document.createElement('summary');
            seriesSummary.className = 'series-summary';
            seriesSummary.textContent = `${series} Series`;
            seriesDetails.appendChild(seriesSummary);

            const seriesContent = document.createElement('div');
            seriesContent.className = 'series-content';

            for (const [material, sections] of Object.entries(materials)) {
                const matBlock = document.createElement('div');
                matBlock.className = 'material-block';
                matBlock.innerHTML = `<h6>${material}</h6>`;

                const table = document.createElement('table');
                table.className = 'stock-table';
                table.style.width = '100%';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Section No.</th>
                            <th>T (mm)</th>
                            <th>Wt (Kg/12')</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector('tbody');
                sections.forEach((sec, idx) => {
                    const row = tbody.insertRow();
                    row.innerHTML = `
                        <td>${sec.sectionNo}</td>
                        <td>${sec.t}</td>
                        <td>${sec.weight}</td>
                    `;
                });

                matBlock.appendChild(table);
                seriesContent.appendChild(matBlock);
            }
            seriesDetails.appendChild(seriesContent);
            supContent.appendChild(seriesDetails);
        }
        supDetails.appendChild(supContent);
        list.appendChild(supDetails);
    }
}

// ... (Retain other UI helpers like addNewSupplierSection if we want to allow runtime edits,
// but for now, we are focusing on File-based structure.
// Runtime edits would need to update the Registry or a separate "Custom" supplier object).
