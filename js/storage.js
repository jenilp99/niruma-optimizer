// storage.js - Local Storage Manager for Niruma Optimizer
// Add this as a new file: js/storage.js

const StorageManager = {
    // Storage keys
    KEYS: {
        WINDOWS: 'niruma_windows',
        FORMULAS: 'niruma_formulas',
        STOCK: 'niruma_stock',
        KERF: 'niruma_kerf',
        UNIT: 'niruma_unit',
        RESULTS: 'niruma_results',
        HARDWARE: 'niruma_hardware',
        SUPPLIER: 'niruma_supplier',
        ALUMINUM_RATE: 'niruma_aluminum_rate',
        PROJECT_SETTINGS: 'niruma_project_settings'
    },

    // Save data to localStorage
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            return false;
        }
    },

    // Load data from localStorage
    load(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage load error:', error);
            return defaultValue;
        }
    },

    // Delete specific key
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },

    // Clear all app data
    clearAll() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    },

    // Auto-save windows
    saveWindows(windows) {
        return this.save(this.KEYS.WINDOWS, windows);
    },

    // Load windows
    loadWindows() {
        return this.load(this.KEYS.WINDOWS, []);
    },

    // Auto-save formulas
    saveFormulas(formulas) {
        return this.save(this.KEYS.FORMULAS, formulas);
    },

    // Load formulas
    loadFormulas() {
        return this.load(this.KEYS.FORMULAS, null);
    },

    // Auto-save stock
    saveStock(stock) {
        return this.save(this.KEYS.STOCK, stock);
    },

    // Load stock
    loadStock() {
        return this.load(this.KEYS.STOCK, null);
    },

    // Save settings
    saveSettings(kerf, unit, aluminumRate) {
        this.save(this.KEYS.KERF, kerf);
        this.save(this.KEYS.UNIT, unit);
        this.save(this.KEYS.ALUMINUM_RATE, aluminumRate);
    },

    // Load settings
    loadSettings() {
        return {
            kerf: this.load(this.KEYS.KERF, 0.125),
            unit: this.load(this.KEYS.UNIT, 'inch'),
            aluminumRate: this.load(this.KEYS.ALUMINUM_RATE, 280)
        };
    },

    // Save optimization results
    saveResults(results) {
        return this.save(this.KEYS.RESULTS, results);
    },

    // Load optimization results
    loadResults() {
        return this.load(this.KEYS.RESULTS, null);
    },

    // Save hardware master
    saveHardwareMaster(hardware) {
        return this.save(this.KEYS.HARDWARE, hardware);
    },

    // Load hardware master
    loadHardwareMaster() {
        return this.load(this.KEYS.HARDWARE, null);
    },

    // Save supplier master
    saveSupplierMaster(supplier) {
        return this.save(this.KEYS.SUPPLIER, supplier);
    },

    // Load supplier master
    loadSupplierMaster() {
        return this.load(this.KEYS.SUPPLIER, null);
    },

    // Save project settings
    saveProjectSettings(settings) {
        return this.save(this.KEYS.PROJECT_SETTINGS, settings);
    },

    // Load project settings
    loadProjectSettings() {
        return this.load(this.KEYS.PROJECT_SETTINGS, {});
    },

    // Export all data as JSON
    exportAll() {
        return {
            windows: this.loadWindows(),
            formulas: this.loadFormulas(),
            stock: this.loadStock(),
            settings: this.loadSettings(),
            results: this.loadResults(),
            projectSettings: this.loadProjectSettings(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    },

    // Import data from JSON
    importAll(data) {
        try {
            if (data.windows) this.saveWindows(data.windows);
            if (data.formulas) this.saveFormulas(data.formulas);
            if (data.stock) this.saveStock(data.stock);
            if (data.settings) {
                this.saveSettings(data.settings.kerf, data.settings.unit);
            }
            if (data.results) this.saveResults(data.results);
            if (data.projectSettings) this.saveProjectSettings(data.projectSettings);
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }
};

// Auto-save wrapper functions
function autoSaveWindows() {
    StorageManager.saveWindows(windows);
    console.log('✅ Windows auto-saved');
}

function autoSaveFormulas() {
    StorageManager.saveFormulas(seriesFormulas);
    console.log('✅ Formulas auto-saved');
}

function autoSaveStock() {
    StorageManager.saveStock(stockMaster);
    console.log('✅ Stock auto-saved');
}

function autoSaveSettings() {
    StorageManager.saveSettings(kerf, unitMode, aluminumRate);
    console.log('✅ Settings auto-saved');
}

function autoSaveResults() {
    if (optimizationResults) {
        StorageManager.saveResults(optimizationResults);
        console.log('✅ Results auto-saved');
    }
}

function autoSaveHardwareMaster() {
    StorageManager.saveHardwareMaster(hardwareMaster);
    console.log('✅ Hardware auto-saved');
}

function autoSaveSupplierMaster() {
    StorageManager.saveSupplierMaster(supplierMaster);
    console.log('✅ Supplier Master auto-saved');
}

function autoSaveProjectSettings() {
    StorageManager.saveProjectSettings(projectSettings);
    console.log('✅ Project Settings auto-saved');
}

// Load all data on startup
function loadAllData() {
    const loadedWindows = StorageManager.loadWindows();
    const loadedFormulas = StorageManager.loadFormulas();
    const loadedStock = StorageManager.loadStock();
    const settings = StorageManager.loadSettings();
    const loadedResults = StorageManager.loadResults();
    const loadedProjectSettings = StorageManager.loadProjectSettings();

    // Only load if data exists, otherwise keep defaults
    if (loadedWindows.length > 0) {
        windows = loadedWindows;
        console.log(`✅ Loaded ${windows.length} windows from storage`);
    }

    if (loadedFormulas) {
        seriesFormulas = loadedFormulas;
        console.log('✅ Loaded formulas from storage');
    }

    if (loadedStock) {
        stockMaster = loadedStock;
        console.log('✅ Loaded stock from storage');
    }

    kerf = settings.kerf;
    unitMode = settings.unit;
    aluminumRate = settings.aluminumRate;

    // Update kerf if element exists
    const kerfElement = document.getElementById('kerfGlobal');
    if (kerfElement) {
        kerfElement.value = kerf;
    }

    const rateElement = document.getElementById('aluminumRate');
    if (rateElement) {
        rateElement.value = aluminumRate;
    }

    // Update all unit toggle checkboxes
    const isMetric = (unitMode === 'mm');
    const unitToggles = document.querySelectorAll('input[id*="unitToggle"]');
    unitToggles.forEach(toggle => {
        if (toggle) {
            toggle.checked = isMetric;
        }
    });

    console.log('✅ Loaded settings from storage');

    if (loadedResults) {
        optimizationResults = loadedResults;
        console.log('✅ Loaded previous results');
    }

    if (loadedProjectSettings) {
        projectSettings = loadedProjectSettings;
        console.log('✅ Loaded project settings');
    }

    // --- MIGRATION LOGIC: Deep normalization of series names ---
    let migrated = false;

    const normalizeSeries = (series) => {
        if (series === '1') return '1"';
        if (series === '3/4') return '3/4"';
        return series;
    };

    const deepNormalize = (name) => {
        if (typeof name !== 'string') return name;
        if (name.startsWith('1 ') && !name.startsWith('1"')) return name.replace('1 ', '1" ');
        if (name.startsWith('3/4 ') && !name.startsWith('3/4"')) return name.replace('3/4 ', '3/4" ');
        return name;
    };

    // 1. Migrate Windows
    windows.forEach(win => {
        const oldS = win.series;
        win.series = normalizeSeries(win.series);
        if (oldS !== win.series) migrated = true;
    });

    // 2. Migrate Formulas
    ['1', '3/4'].forEach(oldKey => {
        if (seriesFormulas && seriesFormulas[oldKey]) {
            const newKey = normalizeSeries(oldKey);
            seriesFormulas[newKey] = seriesFormulas[oldKey];
            delete seriesFormulas[oldKey];
            migrated = true;
        }
    });

    Object.values(seriesFormulas).forEach(list => {
        list.forEach(item => {
            const old = item.component;
            item.component = deepNormalize(item.component);
            if (old !== item.component) migrated = true;
        });
    });

    // 3. Migrate Stock
    ['1', '3/4'].forEach(oldKey => {
        if (stockMaster && stockMaster[oldKey]) {
            const newKey = normalizeSeries(oldKey);
            stockMaster[newKey] = stockMaster[oldKey];
            delete stockMaster[oldKey];
            migrated = true;
        }
    });

    Object.values(stockMaster).forEach(list => {
        list.forEach(item => {
            const old = item.material;
            item.material = deepNormalize(item.material);
            if (old !== item.material) migrated = true;
        });
    });

    // 4. Migrate Hardware
    const loadedHardware = StorageManager.loadHardwareMaster();
    if (loadedHardware) {
        hardwareMaster = loadedHardware;
        console.log('✅ Loaded hardware from storage');
    }

    ['1', '3/4'].forEach(oldKey => {
        if (hardwareMaster && hardwareMaster[oldKey]) {
            const newKey = normalizeSeries(oldKey);
            hardwareMaster[newKey] = hardwareMaster[oldKey];
            delete hardwareMaster[oldKey];
            migrated = true;
        }
    });

    Object.values(hardwareMaster).forEach(list => {
        list.forEach(item => {
            const old = item.hardware;
            item.hardware = deepNormalize(item.hardware);
            if (old !== item.hardware) migrated = true;
        });
    });

    if (migrated) {
        console.log('🔄 Data migrated: Deep normalization of series names (X")');
        // Save migrated data immediately
        autoSaveWindows();
        autoSaveFormulas();
        autoSaveStock();
        autoSaveHardwareMaster();
        autoSaveSupplierMaster();
    }

    // 5. Load Supplier Master
    const loadedSupplier = StorageManager.loadSupplierMaster();
    if (loadedSupplier) {
        supplierMaster = loadedSupplier;
        console.log('✅ Loaded supplier master from storage');
    }
}
