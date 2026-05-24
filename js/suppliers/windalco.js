/**
 * js/suppliers/windalco.js
 * Definitions for Windalco Aluminium
 */

window.registerSupplier("Windalco Aluminium", {
    // 1. SECTION WEIGHTS
    sections: {
        "3/4\"": {
            "3/4\" Handle": [
                { sectionNo: "20011", t: 0.60, weight: 0.900 },
                { sectionNo: "20012", t: 0.79, weight: 1.200 },
                { sectionNo: "20013", t: 0.92, weight: 1.400 },
                { sectionNo: "20014", t: 1.20, weight: 1.600 },
                { sectionNo: "20015", t: 1.50, weight: 1.950 }
            ],
            "3/4\" Interlock": [
                { sectionNo: "20016", t: 0.79, weight: 1.400 },
                { sectionNo: "20017", t: 0.95, weight: 1.550 },
                { sectionNo: "20018", t: 1.20, weight: 1.700 },
                { sectionNo: "20019", t: 1.50, weight: 2.200 }
            ],
            "3/4\" Sash Top/Bottom": [ // Labeled "3/4" Top Bottom" in catalog
                { sectionNo: "20020", t: 0.73, weight: 1.200 },
                { sectionNo: "20021", t: 0.93, weight: 1.400 },
                { sectionNo: "20022", t: 1.10, weight: 1.600 },
                { sectionNo: "20023", t: 1.20, weight: 1.750 },
                { sectionNo: "20024", t: 1.35, weight: 1.950 }
            ],
            "3/4\" Bearing Bottom": [ // Labeled "3/4" Long Bearing Bottom"
                { sectionNo: "20027", t: 0.85, weight: 1.400 },
                { sectionNo: "20028", t: 1.10, weight: 1.600 },
                { sectionNo: "20029", t: 1.50, weight: 2.500 }
            ],
            "3/4\" Middle": [
                { sectionNo: "20025", t: 0.60, weight: 1.000 },
                { sectionNo: "20026", t: 1.00, weight: 1.400 }
            ],
            // TRACKS
            "3/4\" 2 Track Top": [
                { sectionNo: "20030", t: 0.84, weight: 1.800 },
                { sectionNo: "20031", t: 0.94, weight: 2.000 },
                { sectionNo: "20032", t: 1.04, weight: 2.200 },
                { sectionNo: "20033", t: 1.14, weight: 2.500 },
                { sectionNo: "20034", t: 1.20, weight: 2.700 },
                { sectionNo: "20035", t: 1.50, weight: 2.900 }
            ],
            "3/4\" 2 Track Bottom": [
                { sectionNo: "20036", t: 0.85, weight: 1.900 },
                { sectionNo: "20037", t: 1.00, weight: 2.200 },
                { sectionNo: "20038", t: 1.15, weight: 2.500 },
                { sectionNo: "20039", t: 1.50, weight: 3.400 }
            ],
            "3/4\" 3 Track Top": [
                { sectionNo: "20040", t: 0.85, weight: 2.400 },
                { sectionNo: "20041", t: 0.95, weight: 3.000 },
                { sectionNo: "20042", t: 1.30, weight: 3.600 },
                { sectionNo: "20043", t: 1.50, weight: 3.900 }
            ],
            "3/4\" 3 Track Bottom": [
                { sectionNo: "20044", t: 0.80, weight: 2.800 },
                { sectionNo: "20045", t: 1.10, weight: 3.400 },
                { sectionNo: "20046", t: 1.50, weight: 4.700 }
            ],
            "3/4\" 4 Track Top": [
                { sectionNo: "20047", t: 0.97, weight: 3.400 }
            ],
            "3/4\" 4 Track Bottom": [
                { sectionNo: "20048", t: 1.00, weight: 5.100 }
            ]
        },
        "1\"": {
            "1\" Handle": [
                { sectionNo: "20049", t: 0.80, weight: 1.300 },
                { sectionNo: "20050", t: 0.75, weight: 1.350 },
                { sectionNo: "20051", t: 0.80, weight: 1.500 },
                { sectionNo: "20052", t: 0.85, weight: 1.700 },
                { sectionNo: "20053", t: 1.20, weight: 2.300 },
                { sectionNo: "20054", t: 1.40, weight: 2.600 },
                { sectionNo: "20055", t: 1.50, weight: 2.800 },
                { sectionNo: "20056", t: 1.20, weight: 3.000 }
            ],
            "1\" Interlock": [
                { sectionNo: "20057", t: 0.92, weight: 2.400 }
            ],
            "1\" Sash Top/Bottom": [ // 20063 Labeled "1" Top Bottom"
                { sectionNo: "20063", t: 0.92, weight: 1.450 }
            ],
            "1\" Bearing Bottom": [ // 20058/20059 Labeled "1" Bearing Bottom"
                { sectionNo: "20058", t: 0.70, weight: 2.600 },
                { sectionNo: "20059", t: 1.00, weight: 3.100 }
            ],
            "1\" Middle": [
                { sectionNo: "20060", t: 0.70, weight: 1.550 },
                { sectionNo: "20061", t: 1.40, weight: 2.400 },
                { sectionNo: "20062", t: 1.70, weight: 3.200 }
            ],
            // TRACKS
            "1\" 2 Track Top": [
                { sectionNo: "20077", t: 1.30, weight: 2.500 }
            ],
            "1\" 2 Track Bottom": [
                { sectionNo: "20078", t: 1.30, weight: 2.500 }
            ],
            "1\" 3 Track Top": [
                { sectionNo: "20080", t: 1.20, weight: 3.400 },
                { sectionNo: "20081", t: 1.20, weight: 3.700, desc: "41mm Top" } // Variant
            ],
            "1\" 3 Track Bottom": [
                { sectionNo: "20079", t: 1.13, weight: 3.600 }
            ],
            "1\" 4 Track Top/Bottom": [ // Speculative based on Image 2 Bottom Right
                { sectionNo: "20082", t: 1.50, weight: 7.450, desc: "Heavy/4 Track?" }
            ]
        },
        "Door": {
            // Leg Partition (2.5"x1.50") - Frame profile
            "Door Leg Partition": [
                { sectionNo: "20178", t: 1.10, weight: 3.000, w: 63.5, h: 49.5 },
                { sectionNo: "20179", t: 1.40, weight: 3.400, w: 63.5, h: 49.5 },
                { sectionNo: "20180", t: 1.50, weight: 3.800, w: 63.5, h: 49.5 },
                { sectionNo: "20181", t: 2.65, weight: 6.000, w: 63.5, h: 49.5 },
                { sectionNo: "20182", t: 3.00, weight: 7.100, w: 63.5, h: 49.5 }
            ],
            // Door Top & Door Bottom (combined widths: 47mm, 85mm, 114.30mm)
            "Door Top": [
                { sectionNo: "20183", t: 1.10, weight: 2.600, w: 47.0, h: 44.45 },
                { sectionNo: "20184", t: 2.00, weight: 3.000, w: 47.0, h: 44.45 },
                { sectionNo: "20185", t: 3.00, weight: 5.200, w: 47.0, h: 44.45 },
                { sectionNo: "20186", t: 1.50, weight: 3.800, w: 85.0, h: 44.45 },
                { sectionNo: "20187", t: 2.00, weight: 4.100, w: 85.0, h: 44.45 },
                { sectionNo: "20188", t: 3.00, weight: 7.500, w: 85.0, h: 44.45 }
            ],
            "Door Bottom": [
                { sectionNo: "20189", t: 1.17, weight: 4.800, w: 114.30, h: 44.45 },
                { sectionNo: "20190", t: 3.00, weight: 11.500, w: 114.30, h: 44.45 }
            ],
            // Door Vertical (47mm and 85mm widths)
            "Door Vertical": [
                { sectionNo: "20191", t: 1.15, weight: 2.500, w: 47.0, h: 44.45 },
                { sectionNo: "20192", t: 1.50, weight: 2.950, w: 47.0, h: 44.45 },
                { sectionNo: "20193", t: 3.00, weight: 5.200, w: 47.0, h: 44.45 },
                { sectionNo: "20194", t: 1.40, weight: 3.800, w: 85.0, h: 44.45 },
                { sectionNo: "20195", t: 2.00, weight: 5.500, w: 85.0, h: 44.45 },
                { sectionNo: "20196", t: 3.00, weight: 7.400, w: 85.0, h: 44.45 }
            ],
            // Door Middle (47mm and 85mm widths)
            "Door Middle Double": [
                { sectionNo: "20197", t: 1.00, weight: 2.000, w: 47.0, h: 44.45 },
                { sectionNo: "20198", t: 1.15, weight: 2.400, w: 47.0, h: 44.45 },
                { sectionNo: "20199", t: 1.35, weight: 3.700, w: 83.5, h: 44.45 },
                { sectionNo: "20200", t: 1.50, weight: 3.200, w: 47.0, h: 44.45 },
                { sectionNo: "20201", t: 3.00, weight: 5.300, w: 47.0, h: 44.75 },
                { sectionNo: "20202", t: 3.00, weight: 10.200, w: 83.5, h: 44.45 }
            ],
            // Door Center Single (47mm and 85mm widths)
            "Door Middle Single": [
                { sectionNo: "20203", t: 1.35, weight: 3.500, w: 83.05, h: 44.45 },
                { sectionNo: "20204", t: 1.30, weight: 2.500, w: 47.0, h: 44.45 },
                { sectionNo: "20205", t: 1.10, weight: 2.000, w: 47.0, h: 44.45 }
            ],
            // Tips Vertical
            "Door Tips Vertical": [
                { sectionNo: "20177", t: 1.20, weight: 3.350, w: 47.5, h: 44.45 }
            ],
            // Corner Section
            "Door Corner Section": [
                { sectionNo: "20206", t: 1.00, weight: 3.800 }
            ],
            // Glazing Clip (from catalog page 17)
            "Door Glazing Clip": [
                { sectionNo: "20157", t: 0.40, weight: 0.200 },
                { sectionNo: "20158", t: 0.72, weight: 0.320 },
                { sectionNo: "20159", t: 0.90, weight: 0.420 }
            ]
        }
    },

    // 2. SERIES FORMULAS (Standard 3/4" and 1")
    formulas: {
        '3/4"': [
            { component: '3/4" Handle', qty: '2', length: 'H-1.5', desc: 'Handles' },
            { component: '3/4" Interlock', qty: '2*S-2', length: 'H-1.5', desc: 'Interlocks' },
            // Logic: If bearing bottom exists, use it. Else use Top/Bottom for both.
            { component: '3/4" Bearing Bottom', qty: '2*S', length: '(W-5-1.5*(S-1))/S', desc: 'Bearing Bottom' },
            // Note: If user selects regular top/bottom in UI, we might need a separate formula or logic.
            // For now, assuming Bearing Bottom is standard for Windows.

            { component: '3/4" 2 Track Top', qty: '1', length: 'T==2 ? W : 0', desc: '2T Track Top' },
            { component: '3/4" 2 Track Bottom', qty: '1', length: 'T==2 ? W : 0', desc: '2T Track Bottom' },
            { component: '3/4" 2 Track Top', qty: '2', length: 'T==2 ? H : 0', desc: '2T Track Sides' }, // Use Top for Sides if Vertical not defined

            { component: '3/4" 3 Track Top', qty: '1', length: 'T==3 ? W : 0', desc: '3T Track Top' },
            { component: '3/4" 3 Track Bottom', qty: '1', length: 'T==3 ? W : 0', desc: '3T Track Bottom' },
            { component: '3/4" 3 Track Top', qty: '2', length: 'T==3 ? H : 0', desc: '3T Track Sides' },

            { component: '3/4" 4 Track Top', qty: '1', length: 'T==4 ? W : 0', desc: '4T Track Top' },
            { component: '3/4" 4 Track Bottom', qty: '1', length: 'T==4 ? W : 0', desc: '4T Track Bottom' },
            { component: '3/4" 4 Track Top', qty: '2', length: 'T==4 ? H : 0', desc: '4T Track Sides' },

            // Mosquito
            { component: '3/4" Handle', qty: '1*MS', length: 'H-1.5', desc: 'MS Handle' },
            { component: '3/4" Interlock', qty: '1*MS', length: 'H-1.5', desc: 'MS Interlock' },
            { component: '3/4" Bearing Bottom', qty: '2*MS', length: '(W-5-1.5*(S-1))/S', desc: 'MS Bearing Bottom' }
        ],
        '1"': [
            { component: '1" Handle', qty: '2', length: 'H-1.125', desc: 'Handles' },
            { component: '1" Interlock', qty: '2*S-2', length: 'H-1.125', desc: 'Interlocks' },
            { component: '1" Bearing Bottom', qty: '2*S', length: '(W-5-2*(S-1))/S', desc: 'Bearing Bottom' },

            { component: '1" 2 Track Top', qty: '1', length: 'T==2 ? W : 0', desc: '2T Track Top' },
            { component: '1" 2 Track Bottom', qty: '1', length: 'T==2 ? W : 0', desc: '2T Track Bottom' },
            { component: '1" 2 Track Top', qty: '2', length: 'T==2 ? H : 0', desc: '2T Track Sides' },

            { component: '1" 3 Track Top', qty: '1', length: 'T==3 ? W : 0', desc: '3T Track Top' },
            { component: '1" 3 Track Bottom', qty: '1', length: 'T==3 ? W : 0', desc: '3T Track Bottom' },
            { component: '1" 3 Track Top', qty: '2', length: 'T==3 ? H : 0', desc: '3T Track Sides' },

            // Mosquito
            { component: '1" Handle', qty: '1*MS', length: 'H-1.125', desc: 'MS Handle' },
            { component: '1" Interlock', qty: '1*MS', length: 'H-1.125', desc: 'MS Interlock' },
            { component: '1" Bearing Bottom', qty: '2*MS', length: '(W-5-2*(S-1))/S', desc: 'MS Bearing Bottom' }
        ],
        // Door Formulas (same as JK ALU for universal compatibility)
        'Door': [
            // Door Vertical Handle - 1 per leaf (L)
            { component: 'Door Vertical', qty: 'L', length: 'H - (F*(40/25.4))', desc: 'Vertical Handle' },
            // Door Vertical Hing - 1 per leaf (L)
            { component: 'Door Vertical', qty: 'L', length: 'H - (F*(40/25.4))', desc: 'Vertical Hing' },
            // Door Top - 1 per leaf, width minus handle + hinge stile widths
            { component: 'Door Top', qty: 'L', length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Top Rail' },
            // Door Bottom - 1 per leaf
            { component: 'Door Bottom', qty: 'L', length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Bottom Rail' },
            // Door Middle Double - 1 per leaf (always DMD, never DMS)
            { component: 'Door Middle Double', qty: 'L', length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Middle Rail' },
            // Frame - Leg Partition (Only if F=1), 3 sides: top, left, right (no bottom)
            { component: 'Door Leg Partition', qty: '1*F', length: 'W', desc: 'Frame Top' },
            { component: 'Door Leg Partition', qty: '1*F', length: 'H', desc: 'Frame Left' },
            { component: 'Door Leg Partition', qty: '1*F', length: 'H', desc: 'Frame Right' },
            // Door Glazing Clip - Vertical: split Top/Bottom so off-centre middle rail
            // gives correct independent lengths. MRPI injected by calculatePieces.
            { component: 'Door Glazing Clip', qty: '4*L', length: 'H - F*(20/25.4) - TW - MW/2 - MRPI',         desc: 'Glazing Clip Vertical Top' },
            { component: 'Door Glazing Clip', qty: '4*L', length: 'MRPI - F*(20/25.4) - BW - MW/2',             desc: 'Glazing Clip Vertical Bottom' },
            // Door Glazing Clip - Horizontal (4 per pane × 2 panes per leaf)
            { component: 'Door Glazing Clip', qty: '8*L', length: '(W - (F*(80/25.4))) / L - HandleVW - HingeVW', desc: 'Glazing Clip Horizontal' }
        ]
    },

    // 3. DEFAULT STOCK
    stock: {
        '3/4"': [
            { material: '3/4" Handle', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" Interlock', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" Sash Top/Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { component: '3/4" Bearing Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" Middle', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" 2 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" 2 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" 3 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" 3 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" 4 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" 4 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 }
        ],
        '1"': [
            { material: '1" Handle', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" Interlock', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" Sash Top/Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" Bearing Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" Middle', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 2 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 2 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 3 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 3 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 4 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 4 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 }
        ],
        '27mm Domal': [
            { material: '27mm Domal 2 Track', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '27mm Domal 3 Track', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '27mm Domal 4 Track', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '27mm Domal Shutter', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '27mm Domal Clip', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '27mm Domal C-channel', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 }
        ],
        'Door': [
            { material: 'Door Leg Partition', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: 'Door Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: 'Door Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: 'Door Vertical', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: 'Door Middle Double', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: 'Door Middle Single', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: 'Door Tips Vertical', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: 'Door Corner Section', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: 'Door Glazing Clip', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 }
        ]
    }
});
