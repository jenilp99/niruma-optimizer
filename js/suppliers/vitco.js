/**
 * js/suppliers/vitco.js
 * Definitions for VITCO (25mm and Premium Series)
 */

window.registerSupplier("VITCO", {
    // 1. SECTION WEIGHTS
    sections: {
        "25mm Gulf": {
            "25mm Shutter": [
                { sectionNo: "G-101", t: 1.20, weight: 2.500 },
                { sectionNo: "G-102", t: 1.50, weight: 3.100 }
            ],
            "25mm Interlock": [
                { sectionNo: "G-201", t: 1.20, weight: 2.800 },
                { sectionNo: "G-202", t: 1.50, weight: 3.400 }
            ],
            "25mm 2 Track Top": [
                { sectionNo: "G-301", t: 1.20, weight: 3.500 }
            ],
            "25mm 2 Track Bottom": [
                { sectionNo: "G-302", t: 1.20, weight: 3.800 }
            ],
            "25mm 3 Track Top": [
                { sectionNo: "G-401", t: 1.20, weight: 4.500 }
            ],
            "25mm 3 Track Bottom": [
                { sectionNo: "G-402", t: 1.20, weight: 4.900 }
            ]
        },
        "25mm High-End": {
            "25mm Shutter": [
                { sectionNo: "HE-101", t: 1.60, weight: 3.500 }, // Heavier
                { sectionNo: "HE-102", t: 2.00, weight: 4.200 }
            ],
            "25mm Interlock": [
                { sectionNo: "HE-201", t: 1.60, weight: 3.800 },
                { sectionNo: "HE-202", t: 2.00, weight: 4.500 }
            ],
            "25mm 2 Track Top": [
                { sectionNo: "HE-301", t: 1.80, weight: 4.500 }
            ],
            "25mm 2 Track Bottom": [
                { sectionNo: "HE-302", t: 1.80, weight: 4.800 }
            ],
            "25mm 3 Track Top": [
                { sectionNo: "HE-401", t: 1.80, weight: 5.500 }
            ],
            "25mm 3 Track Bottom": [
                { sectionNo: "HE-402", t: 1.80, weight: 5.900 }
            ]
        }
    },

    // 2. SERIES FORMULAS
    formulas: {
        '25mm Gulf': [
            { component: '25mm Shutter', qty: '2', length: 'H-32', desc: 'Shutter Vertical' },
            { component: '25mm Shutter', qty: '2', length: '(W/2)-5', desc: 'Shutter Horizontal' },
            { component: '25mm Interlock', qty: '1', length: 'H-32', desc: 'Interlock' },
            { component: '25mm 2 Track Top', qty: '1', length: 'T==2 ? W : 0', desc: '2T Top' },
            { component: '25mm 2 Track Bottom', qty: '1', length: 'T==2 ? W : 0', desc: '2T Bottom' },
            { component: '25mm 2 Track Top', qty: '2', length: 'T==2 ? H : 0', desc: '2T Sides' },
            { component: '25mm 3 Track Top', qty: '1', length: 'T==3 ? W : 0', desc: '3T Top' },
            { component: '25mm 3 Track Bottom', qty: '1', length: 'T==3 ? W : 0', desc: '3T Bottom' },
            { component: '25mm 3 Track Top', qty: '2', length: 'T==3 ? H : 0', desc: '3T Sides' }
        ],
        '25mm High-End': [
            // Similar logic but explicitly registered for High-End series
            { component: '25mm Shutter', qty: '2', length: 'H-32', desc: 'Shutter Vertical' },
            { component: '25mm Shutter', qty: '2', length: '(W/2)-5', desc: 'Shutter Horizontal' },
            { component: '25mm Interlock', qty: '1', length: 'H-32', desc: 'Interlock' },
            { component: '25mm 2 Track Top', qty: '1', length: 'T==2 ? W : 0', desc: '2T Top' },
            { component: '25mm 2 Track Bottom', qty: '1', length: 'T==2 ? W : 0', desc: '2T Bottom' },
            { component: '25mm 2 Track Top', qty: '2', length: 'T==2 ? H : 0', desc: '2T Sides' },
            { component: '25mm 3 Track Top', qty: '1', length: 'T==3 ? W : 0', desc: '3T Top' },
            { component: '25mm 3 Track Bottom', qty: '1', length: 'T==3 ? W : 0', desc: '3T Bottom' },
            { component: '25mm 3 Track Top', qty: '2', length: 'T==3 ? H : 0', desc: '3T Sides' }
        ]
    },

    // 3. STOCK Defaults
    stock: {
        '25mm Gulf': [
            { material: '25mm Shutter', stock1: 144, stock1Cost: 200, stock2: 192, stock2Cost: 250 },
            { material: '25mm Interlock', stock1: 144, stock1Cost: 200, stock2: 192, stock2Cost: 250 },
            { material: '25mm 2 Track Top', stock1: 144, stock1Cost: 200, stock2: 192, stock2Cost: 250 },
            { material: '25mm 2 Track Bottom', stock1: 144, stock1Cost: 200, stock2: 192, stock2Cost: 250 },
            { material: '25mm 3 Track Top', stock1: 144, stock1Cost: 200, stock2: 192, stock2Cost: 250 },
            { material: '25mm 3 Track Bottom', stock1: 144, stock1Cost: 200, stock2: 192, stock2Cost: 250 }
        ],
        '25mm High-End': [
            { material: '25mm Shutter', stock1: 144, stock1Cost: 300, stock2: 192, stock2Cost: 350 },
            { material: '25mm Interlock', stock1: 144, stock1Cost: 300, stock2: 192, stock2Cost: 350 },
            { material: '25mm 2 Track Top', stock1: 144, stock1Cost: 300, stock2: 192, stock2Cost: 350 },
            { material: '25mm 2 Track Bottom', stock1: 144, stock1Cost: 300, stock2: 192, stock2Cost: 350 },
            { material: '25mm 3 Track Top', stock1: 144, stock1Cost: 300, stock2: 192, stock2Cost: 350 },
            { material: '25mm 3 Track Bottom', stock1: 144, stock1Cost: 300, stock2: 192, stock2Cost: 350 }
        ]
    },

    // 4. HARDWARE
    hardware: {
        '25mm Gulf': [
            { name: 'Roller', formula: '2*S', unit: 'nos', rate: 50 },
            { name: 'Handle Lock', formula: '1*MS', unit: 'nos', rate: 150 },
            { name: 'Brush', formula: '(2*H + 2*W)*S/12', unit: 'ft', rate: 5 }
        ],
        '25mm High-End': [
            { name: 'Heavy Duty Roller', formula: '2*S', unit: 'nos', rate: 80 },
            { name: 'Touch Lock', formula: '1*MS', unit: 'nos', rate: 250 },
            { name: 'Weather Strip', formula: '(2*H + 2*W)*S/12', unit: 'ft', rate: 8 }
        ]
    }
});
