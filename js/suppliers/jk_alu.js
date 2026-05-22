/**
 * js/suppliers/jk_alu.js
 * Definitions for JK ALU EXTRUSION
 */

window.registerSupplier("JK ALU EXTRUSION", {
    // 1. SECTION WEIGHTS
    sections: {
        "3/4\"": {
            "3/4\" Handle": [
                { sectionNo: "1101", t: 0.70, weight: 1.000 },
                { sectionNo: "1102", t: 0.80, weight: 1.200 },
                { sectionNo: "1103", t: 0.95, weight: 1.400 },
                { sectionNo: "1104", t: 1.10, weight: 1.600 },
                { sectionNo: "1105", t: 1.25, weight: 1.800 },
                { sectionNo: "1106", t: 1.40, weight: 2.000 },
                { sectionNo: "1107", t: 1.54, weight: 2.200 },
                { sectionNo: "1108", t: 1.66, weight: 2.400 }
            ],
            "3/4\" Interlock": [
                { sectionNo: "1201", t: 0.75, weight: 1.300 },
                { sectionNo: "1202", t: 0.85, weight: 1.400 },
                { sectionNo: "1203", t: 0.94, weight: 1.600 },
                { sectionNo: "1204", t: 1.10, weight: 1.800 },
                { sectionNo: "1205", t: 1.25, weight: 2.000 },
                { sectionNo: "1206", t: 1.31, weight: 2.200 },
                { sectionNo: "1207", t: 1.44, weight: 2.400 },
                { sectionNo: "1208", t: 1.55, weight: 2.600 }
            ],

            "3/4\" Bearing Bottom": [
                { sectionNo: "1311", t: 0.85, weight: 1.500 },
                { sectionNo: "1312", t: 1.00, weight: 1.800 },
                { sectionNo: "1313", t: 1.20, weight: 2.200 },
                { sectionNo: "1314", t: 1.50, weight: 2.600 }
            ],
            "3/4\" Middle": [
                { sectionNo: "1401", t: 0.70, weight: 1.100 },
                { sectionNo: "1402", t: 0.85, weight: 1.400 }
            ],
            "3/4\" C-channel": [
                { sectionNo: "PENDING", weight: 0.500, desc: "Mosquito C-channel" }
            ],
            "3/4\" 2 Track Top": [
                { sectionNo: "2101", t: 0.80, weight: 1.600 },
                { sectionNo: "2102", t: 0.87, weight: 1.800 },
                { sectionNo: "2103", t: 0.95, weight: 2.000 },
                { sectionNo: "2104", t: 1.05, weight: 2.200 },
                { sectionNo: "2105", t: 1.20, weight: 2.500 },
                { sectionNo: "2106", t: 1.50, weight: 3.000 },
                { sectionNo: "2107", t: 1.60, weight: 3.200 }
            ],
            "3/4\" 2 Track Bottom": [
                { sectionNo: "2201", t: 0.70, weight: 1.800 },
                { sectionNo: "2202", t: 0.80, weight: 2.000 },
                { sectionNo: "2203", t: 0.94, weight: 2.200 },
                { sectionNo: "2204", t: 1.10, weight: 2.500 },
                { sectionNo: "2205", t: 1.50, weight: 3.400 }
            ],
            "3/4\" 3 Track Top": [
                { sectionNo: "2301", t: 0.70, weight: 2.000 },
                { sectionNo: "2302", t: 0.75, weight: 2.200 },
                { sectionNo: "2303", t: 0.85, weight: 2.400 },
                { sectionNo: "2304", t: 0.90, weight: 2.600 },
                { sectionNo: "2305", t: 0.97, weight: 2.800 },
                { sectionNo: "2306", t: 1.04, weight: 3.000 },
                { sectionNo: "2307", t: 1.20, weight: 3.200 },
                { sectionNo: "2308", t: 1.25, weight: 3.600 },
                { sectionNo: "2309", t: 1.40, weight: 3.900 },
                { sectionNo: "2310", t: 1.50, weight: 4.400 }
            ],
            "3/4\" 3 Track Bottom": [
                { sectionNo: "2401", t: 0.70, weight: 2.400 },
                { sectionNo: "2402", t: 0.76, weight: 2.600 },
                { sectionNo: "2403", t: 0.84, weight: 2.800 },
                { sectionNo: "2404", t: 1.00, weight: 3.000 },
                { sectionNo: "2405", t: 1.15, weight: 3.400 },
                { sectionNo: "2406", t: 1.20, weight: 4.000 },
                { sectionNo: "2407", t: 1.32, weight: 4.400 },
                { sectionNo: "2408", t: 1.50, weight: 4.900 }
            ],
            "3/4\" 4 Track Top": [
                { sectionNo: "2501", t: 1.10, weight: 3.500 },
                { sectionNo: "2502", t: 1.20, weight: 4.300 },
                { sectionNo: "2503", t: 1.45, weight: 5.000 }
            ],
            "3/4\" 4 Track Bottom": [
                { sectionNo: "2601", t: 1.00, weight: 4.500 },
                { sectionNo: "2602", t: 1.28, weight: 5.200 }
            ],
            "3/4\" Singal Track Top": [
                { sectionNo: "1901", t: 0.90, weight: 1.200 }
            ],
            "3/4\" Singal Track Bottom": [
                { sectionNo: "2001", t: 0.90, weight: 1.300 }
            ]
        },
        "1\"": {
            "1\" Handle": [
                { sectionNo: "1151", t: 0.78, weight: 1.600 },
                { sectionNo: "1152", t: 0.93, weight: 1.800 },
                { sectionNo: "1153", t: 1.08, weight: 2.000 },
                { sectionNo: "1154", t: 1.23, weight: 2.200 },
                { sectionNo: "1155", t: 1.38, weight: 2.400 },
                { sectionNo: "1156", t: 1.53, weight: 2.600 }
            ],
            "1\" Interlock": [
                { sectionNo: "1251", t: 1.10, weight: 2.300 },
                { sectionNo: "1252", t: 1.20, weight: 2.600 },
                { sectionNo: "1253", t: 1.50, weight: 3.200 }
            ],
            "1\" Middle": [
                { sectionNo: "1451", t: 0.80, weight: 1.600 },
                { sectionNo: "1452", t: 0.90, weight: 1.800 },
                { sectionNo: "1453", t: 1.00, weight: 2.000 },
                { sectionNo: "1454", t: 1.12, weight: 2.200 },
                { sectionNo: "1455", t: 1.21, weight: 2.400 }
            ],
            "1\" Bearing Bottom": [
                { sectionNo: "1351", t: 1.05, weight: 2.400 },
                { sectionNo: "1352", t: 1.20, weight: 2.600 },
                { sectionNo: "1353", t: 1.30, weight: 2.800 },
                { sectionNo: "1354", t: 1.50, weight: 3.300 }
            ],
            "1\" C-channel": [
                { sectionNo: "PENDING", weight: 0.500, desc: "Mosquito C-channel" }
            ],
            "1\" 2 Track Top": [
                { sectionNo: "2151", t: 1.20, weight: 2.300 },
                { sectionNo: "2152", t: 1.30, weight: 2.500 }
            ],
            "1\" 2 Track Bottom": [
                { sectionNo: "2251", t: 1.20, weight: 2.600 },
                { sectionNo: "2252", t: 1.30, weight: 3.000 }
            ],
            "1\" 3 Track Top": [
                { sectionNo: "2351", t: 1.25, weight: 3.500 },
                { sectionNo: "2352", t: 1.35, weight: 3.800 }
            ],
            "1\" 3 Track Bottom": [
                { sectionNo: "2451", t: 1.18, weight: 3.800 },
                { sectionNo: "2452", t: 1.30, weight: 4.400 }
            ],
            "1\" 4 Track Top": [
                { sectionNo: "2551", t: 1.20, weight: 5.000 }
            ],
            "1\" 4 Track Bottom": [
                { sectionNo: "2651", t: 1.02, weight: 5.200 }
            ]
        },
        "27mm Domal": {
            "DOMAL 2 TRACK": [
                { sectionNo: "4201", t: 1.35, weight: 3.200 },
                { sectionNo: "4202", t: 1.54, weight: 3.500 }
            ],
            "DOMAL 3 TRACK": [
                { sectionNo: "4301", t: 1.40, weight: 5.000 },
                { sectionNo: "4302", t: 1.50, weight: 5.500 }
            ],
            "DOMAL 3 TRACK WITH LEG": [
                { sectionNo: "4310", t: 1.30, weight: 5.500 }
            ],
            "DOMAL 4 TRACK": [
                { sectionNo: "4401", t: 1.41, weight: 7.000 }
            ],
            "DOMAL SHUTTER (27MM)": [
                { sectionNo: "4551", t: 1.21, weight: 2.900 },
                { sectionNo: "4552", t: 1.45, weight: 3.300 }
            ],
            "DOMAL CLIP (27MM)": [
                { sectionNo: "4651", t: 1.20, weight: 1.150 }
            ],
            "DOMAL C-CHANNEL": [
                { sectionNo: "PENDING", t: 1.00, weight: 0.500, desc: "Mosquito C-channel" }
            ]
        },
        "Door": {
            // Door Top (W=47.5mm or 85.0mm, H=44.5mm)
            "Door Top": [
                { sectionNo: "3601", t: 1.05, weight: 2.600, w: 47.5, h: 44.5 },
                { sectionNo: "3602", t: 1.25, weight: 3.000, w: 47.5, h: 44.5 },
                { sectionNo: "3603", t: 1.48, weight: 3.600, w: 47.5, h: 44.5 },
                { sectionNo: "3604", t: 1.70, weight: 4.000, w: 47.5, h: 44.5 },
                { sectionNo: "3605", t: 2.00, weight: 4.800, w: 47.5, h: 44.5 },
                { sectionNo: "3651", t: 1.40, weight: 4.200, w: 85.0, h: 44.5 },
                { sectionNo: "3652", t: 1.60, weight: 4.800, w: 85.0, h: 44.5 },
                { sectionNo: "3653", t: 2.00, weight: 5.500, w: 85.0, h: 44.5 }
            ],
            // Door Vertical (W=47.5mm or 85.0mm, H=44.5mm)
            "Door Vertical": [
                { sectionNo: "3701", t: 1.05, weight: 2.600, w: 47.5, h: 44.5 },
                { sectionNo: "3702", t: 1.25, weight: 3.000, w: 47.5, h: 44.5 },
                { sectionNo: "3703", t: 1.48, weight: 3.600, w: 47.5, h: 44.5 },
                { sectionNo: "3704", t: 1.70, weight: 4.000, w: 47.5, h: 44.5 },
                { sectionNo: "3705", t: 2.00, weight: 4.800, w: 47.5, h: 44.5 },
                { sectionNo: "3751", t: 1.30, weight: 4.200, w: 85.0, h: 44.5 },
                { sectionNo: "3752", t: 1.50, weight: 4.800, w: 85.0, h: 44.5 },
                { sectionNo: "3753", t: 1.90, weight: 5.500, w: 85.0, h: 44.5 }
            ],
            // Door Middle Double (W=47.5mm or 85.0mm, H=44.5mm)
            "Door Middle Double": [
                { sectionNo: "3801", t: 1.10, weight: 2.500, w: 47.5, h: 44.5 },
                { sectionNo: "3802", t: 1.40, weight: 3.200, w: 47.5, h: 44.5 },
                { sectionNo: "3803", t: 1.85, weight: 4.200, w: 47.5, h: 44.5 },
                { sectionNo: "3851", t: 1.40, weight: 4.200, w: 85.0, h: 44.5 },
                { sectionNo: "3852", t: 1.85, weight: 5.500, w: 85.0, h: 44.5 }
            ],
            // Door Middle Single (W=47.5mm or 85.0mm, H=44.5mm)
            "Door Middle Single": [
                { sectionNo: "3901", t: 1.08, weight: 2.500, w: 47.5, h: 44.5 },
                { sectionNo: "3902", t: 1.40, weight: 3.000, w: 47.5, h: 44.5 },
                { sectionNo: "3903", t: 1.80, weight: 4.000, w: 47.5, h: 44.5 },
                { sectionNo: "3951", t: 1.40, weight: 4.000, w: 85.0, h: 44.5 }
            ],
            // Door Glazing Clip
            "Door Glazing Clip": [
                { sectionNo: "3201", t: 0.45, weight: 0.250 },
                { sectionNo: "3202", t: 0.50, weight: 0.270 },
                { sectionNo: "3203", t: 0.55, weight: 0.300 },
                { sectionNo: "3204", t: 0.63, weight: 0.350 },
                { sectionNo: "3205", t: 0.72, weight: 0.400 }
            ],
            // Door Leg Partition (Frame) - W=38.5mm, H=50mm
            "Door Leg Partition": [
                { sectionNo: "4001", t: 1.00, weight: 3.000, w: 38.5, h: 50.0 },
                { sectionNo: "4002", t: 1.10, weight: 3.400, w: 38.5, h: 50.0 },
                { sectionNo: "4003", t: 1.45, weight: 4.400, w: 38.5, h: 50.0 },
                { sectionNo: "4004", t: 1.58, weight: 5.000, w: 38.5, h: 50.0 }
            ],
            // Door Tips Vertical (W=47.5mm)
            "Door Tips Vertical": [
                { sectionNo: "4051", t: 1.30, weight: 3.000, w: 47.5 },
                { sectionNo: "4052", t: 1.50, weight: 3.400, w: 47.5 }
            ],
            // Door Bottom (L=25mm or 15mm)
            "Door Bottom": [
                { sectionNo: "4101", t: 1.16, weight: 4.400, l: 25, w: 114.5 },
                { sectionNo: "4102", t: 1.36, weight: 4.800, l: 25, w: 114.5 },
                { sectionNo: "4103", t: 1.60, weight: 5.500, l: 25, w: 114.5 },
                { sectionNo: "4110", t: 1.13, weight: 4.200, l: 15, w: 114.5 }
            ]
        }
    },

    // 2. SERIES FORMULAS
    formulas: {
        '3/4"': [
            { component: '3/4" Handle', qty: '2', length: 'H-1.5', desc: 'Handles' },
            { component: '3/4" Interlock', qty: '2*S-2', length: 'H-1.5', desc: 'Interlocks' },
            { component: '3/4" Bearing Bottom', qty: '4*S', length: '(W-5-1.5*(S-1))/S', desc: 'Horizontal Top & Bottom' },

            { component: '3/4" 2 Track Top', qty: '1', length: 'T==2 ? W : 0', desc: '2T Track Top' },
            { component: '3/4" 2 Track Bottom', qty: '1', length: 'T==2 ? W : 0', desc: '2T Track Bottom' },
            { component: '3/4" 2 Track Top', qty: '2', length: 'T==2 ? H : 0', desc: '2T Track Sides' },

            { component: '3/4" 3 Track Top', qty: '1', length: 'T==3 ? W : 0', desc: '3T Track Top' },
            { component: '3/4" 3 Track Bottom', qty: '1', length: 'T==3 ? W : 0', desc: '3T Track Bottom' },
            { component: '3/4" 3 Track Top', qty: '2', length: 'T==3 ? H : 0', desc: '3T Track Sides' },

            { component: '3/4" 4 Track Top', qty: '1', length: 'T==4 ? W : 0', desc: '4T Track Top' },
            { component: '3/4" 4 Track Bottom', qty: '1', length: 'T==4 ? W : 0', desc: '4T Track Bottom' },
            { component: '3/4" 4 Track Top', qty: '2', length: 'T==4 ? H : 0', desc: '4T Track Sides' },

            // Mosquito
            { component: '3/4" Handle', qty: '1*MS', length: 'H-1.5', desc: 'MS Handle' },
            { component: '3/4" Interlock', qty: '1*MS', length: 'H-1.5', desc: 'MS Interlock' },
            { component: '3/4" Bearing Bottom', qty: '2*MS', length: '(W-5-1.5*(S-1))/S', desc: 'MS Horizontal' },
            { component: '3/4" C-channel', qty: '2*MS', length: 'H-1.5', desc: 'MS C-channel V' },
            { component: '3/4" C-channel', qty: '2*MS', length: '(W-5-1.5*(S-1))/S', desc: 'MS C-channel H' }
        ],
        '1"': [
            { component: '1" Handle', qty: '2', length: 'H-1.125', desc: 'Handles' },
            { component: '1" Interlock', qty: '2*S-2', length: 'H-1.125', desc: 'Interlocks' },
            { component: '1" Bearing Bottom', qty: '4*S', length: '(W-5-2*(S-1))/S', desc: 'Horizontal Top & Bottom' },

            { component: '1" 2 Track Top', qty: '1', length: 'T==2 ? W : 0', desc: '2T Track Top' },
            { component: '1" 2 Track Bottom', qty: '1', length: 'T==2 ? W : 0', desc: '2T Track Bottom' },
            { component: '1" 2 Track Top', qty: '2', length: 'T==2 ? H : 0', desc: '2T Track Sides' },

            { component: '1" 3 Track Top', qty: '1', length: 'T==3 ? W : 0', desc: '3T Track Top' },
            { component: '1" 3 Track Bottom', qty: '1', length: 'T==3 ? W : 0', desc: '3T Track Bottom' },
            { component: '1" 3 Track Top', qty: '2', length: 'T==3 ? H : 0', desc: '3T Track Sides' },

            { component: '1" 4 Track Top', qty: '1', length: 'T==4 ? W : 0', desc: '4T Track Top' },
            { component: '1" 4 Track Bottom', qty: '1', length: 'T==4 ? W : 0', desc: '4T Track Bottom' },
            { component: '1" 4 Track Top', qty: '2', length: 'T==4 ? H : 0', desc: '4T Track Sides' },

            // Mosquito
            { component: '1" Handle', qty: '1*MS', length: 'H-1.125', desc: 'MS Handle' },
            { component: '1" Interlock', qty: '1*MS', length: 'H-1.125', desc: 'MS Interlock' },
            { component: '1" Bearing Bottom', qty: '2*MS', length: '(W-5-2*(S-1))/S', desc: 'MS Horizontal' },
            { component: '1" C-channel', qty: '2*MS', length: 'H-1.125', desc: 'MS C-channel V' },
            { component: '1" C-channel', qty: '2*MS', length: '(W-5-2*(S-1))/S', desc: 'MS C-channel H' }
        ],
        '27mm Domal': [
            // Glass Shutter
            { component: 'DOMAL SHUTTER (27MM)', qty: '2*S', length: 'H-2.75', desc: 'Shutter Verticals' },
            { component: 'DOMAL SHUTTER (27MM)', qty: '2*S', length: '(W-3+2.5*(S-1))/S', desc: 'Shutter Horizontals' },
            { component: 'DOMAL CLIP (27MM)', qty: '2*(S-1)', length: 'H-2.75', desc: 'Interlock Clips' },

            // Tracks (Dynamic based on T)
            { component: 'DOMAL 2 TRACK', qty: '1', length: 'T==2 ? W : 0', desc: '2 Track Top' },
            { component: 'DOMAL 2 TRACK', qty: '1', length: 'T==2 ? W : 0', desc: '2 Track Bottom' },
            { component: 'DOMAL 2 TRACK', qty: '2', length: 'T==2 ? H : 0', desc: '2 Track Sides' },

            { component: 'DOMAL 3 TRACK', qty: '1', length: 'T==3 ? W : 0', desc: '3 Track Top' },
            { component: 'DOMAL 3 TRACK', qty: '1', length: 'T==3 ? W : 0', desc: '3 Track Bottom' },
            { component: 'DOMAL 3 TRACK', qty: '2', length: 'T==3 ? H : 0', desc: '3 Track Sides' },

            { component: 'DOMAL 4 TRACK', qty: '1', length: 'T==4 ? W : 0', desc: '4 Track Top' },
            { component: 'DOMAL 4 TRACK', qty: '1', length: 'T==4 ? W : 0', desc: '4 Track Bottom' },
            { component: 'DOMAL 4 TRACK', qty: '2', length: 'T==4 ? H : 0', desc: '4 Track Sides' },

            // Mosquito (MS) - C-channel for mesh frame
            { component: 'DOMAL C-CHANNEL', qty: '2*MS', length: 'H-2.75', desc: 'MS C-channel Vert' },
            { component: 'DOMAL C-CHANNEL', qty: '2*MS', length: '(W-3+2.5*(S-1))/S', desc: 'MS C-channel Horiz' },
            // Mosquito (MS) - Shutter/Clip
            { component: 'DOMAL SHUTTER (27MM)', qty: '2*MS', length: 'H-2.75', desc: 'MS Shutter Vert' },
            { component: 'DOMAL SHUTTER (27MM)', qty: '2*MS', length: '(W-3+2.5*(S-1))/S', desc: 'MS Shutter Horiz' },
            { component: 'DOMAL CLIP (27MM)', qty: '1*MS', length: 'H-2.75', desc: 'MS Clip' }
        ],
        // Door Series - F = Frame (1=YES, 0=NO)
        // LEG_PARTITION_WIDTH = 38.5mm = 1.516", PLAY = 1.5mm = 0.059"
        // Frame Side Deduction = 40mm = 1.575" (each side)
        // Frame Top Deduction = 40mm = 1.575"
        // DW = Door Width = W - (F * 3.15)  [80mm/25.4 = 3.15"]
        // DH = Door Height = H - (F * 1.575) [40mm/25.4 = 1.575"]
        // Vertical deduction = 41.5mm = 1.634" (38.5 + 1.5 + 1.5)
        // HW = Handle/Hing Width = 47.5mm = 1.87" (default, or 85mm = 3.35")
        // TW = Door Top Width (from user selection)
        // BW = Door Bottom Width (from user selection)
        // MW = Door Middle Double Width (from user selection)
        // VW = Vertical Width (Handle + Hing, from user selection)
        'Door': [
            // Door Vertical Handle - 1 per leaf (L)
            { component: 'Door Vertical', qty: 'L', length: 'H - (F*1.575) - 1.634', desc: 'Vertical Handle' },

            // Door Vertical Hing - 1 per leaf (L)
            { component: 'Door Vertical', qty: 'L', length: 'H - (F*1.575) - 1.634', desc: 'Vertical Hing' },

            // Door Top - 1 per leaf, width split equally across leaves
            { component: 'Door Top', qty: 'L', length: '(W - (F*3.15)) / L - 2*VW', desc: 'Top Rail' },

            // Door Bottom - 1 per leaf, width split equally across leaves
            { component: 'Door Bottom', qty: 'L', length: '(W - (F*3.15)) / L - 2*VW', desc: 'Bottom Rail' },

            // Door Middle Double - 1 per leaf
            { component: 'Door Middle Double', qty: 'L', length: '(W - (F*3.15)) / L - 2*VW', desc: 'Middle Rail' },

            // Frame - Leg Partition (Only if F=1), 3 sides: top, left, right (no bottom)
            { component: 'Door Leg Partition', qty: '1*F', length: 'W', desc: 'Frame Top' },
            { component: 'Door Leg Partition', qty: '1*F', length: 'H', desc: 'Frame Left' },
            { component: 'Door Leg Partition', qty: '1*F', length: 'H', desc: 'Frame Right' },

            // Door Glazing Clip - Vertical (4 per pane × 2 panes per leaf)
            { component: 'Door Glazing Clip', qty: '8*L', length: '(H - (F*1.575) - TW - BW - MW) / 2', desc: 'Glazing Clip Vertical' },

            // Door Glazing Clip - Horizontal (4 per pane × 2 panes per leaf)
            { component: 'Door Glazing Clip', qty: '8*L', length: '(W - (F*3.15)) / L - 2*VW', desc: 'Glazing Clip Horizontal' }
        ]
    },

    // 3. STOCK DEFAULTS
    stock: {
        '3/4"': [
            { material: '3/4" Handle', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" Interlock', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" Bearing Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" Middle', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" C-channel', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" Singal Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '3/4" Singal Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
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
            { material: '1" Bearing Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" Middle', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" C-channel', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 2 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 2 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 3 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 3 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 4 Track Top', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 },
            { material: '1" 4 Track Bottom', stock1: 141, stock1Cost: 100, stock2: 177, stock2Cost: 125 }
        ],
        '27mm Domal': [
            { material: 'DOMAL 2 TRACK', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'DOMAL 3 TRACK', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'DOMAL 3 TRACK WITH LEG', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'DOMAL 4 TRACK', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'DOMAL SHUTTER (27MM)', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'DOMAL CLIP (27MM)', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'DOMAL C-CHANNEL', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 }
        ],
        'Door': [
            { material: 'Door Top', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'Door Vertical', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'Door Middle Double', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'Door Middle Single', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'Door Bottom', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'Door Glazing Clip', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'Door Leg Partition', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 },
            { material: 'Door Tips Vertical', stock1: 141, stock1Cost: 0, stock2: 177, stock2Cost: 0 }
        ]
    },

    // 4. HARDWARE DEFAULTS
    hardware: {
        '3/4"': [
            { hardware: 'Bearing (3/4")', qty: 4, unit: 'Nos', formula: '2 * S', rate: 45 }, // 2 per shutter
            { hardware: 'Window Lock (Touch)', qty: 2, unit: 'Nos', formula: '2 + (MS > 0 ? 1 : 0)', rate: 65 },
            { hardware: 'Wool Pile', qty: 10, unit: 'R.Ft', formula: '(GL("3/4\\" Interlock") + 4 * T * (W + H)) / 12', rate: 4 },
            { hardware: 'Silicon Sealant', qty: 1, unit: 'R.Ft', formula: '(W + H) * 2 / 12', rate: 10 },
            { hardware: 'Corner Joint (PVC)', qty: 4, unit: 'Nos', formula: '4 * F', rate: 5 }, // If Frames used
            { hardware: 'Acrylic Stopper', qty: 4, unit: 'Nos', formula: '4', rate: 2 }
        ],
        '1"': [
            { hardware: 'Bearing (1")', qty: 4, unit: 'Nos', formula: '2 * S', rate: 65 },
            { hardware: 'Window Lock (Touch)', qty: 2, unit: 'Nos', formula: '2 + (MS > 0 ? 1 : 0)', rate: 65 },
            { hardware: 'Wool Pile', qty: 10, unit: 'R.Ft', formula: '(GL("1\\" Interlock") + 4 * T * (W + H)) / 12', rate: 4 },
            { hardware: 'Silicon Sealant', qty: 1, unit: 'R.Ft', formula: '(W + H) * 2 / 12', rate: 10 },
            { hardware: 'Acrylic Stopper', qty: 4, unit: 'Nos', formula: '4', rate: 2 }
        ],
        '27mm Domal': [
            { hardware: 'Domal Bearing',                         unit: 'Nos',  formula: '2 * S + (MS*2)',                                                                         rate: 47 },
            { hardware: 'Concealed Lock',                        unit: 'Nos',  formula: '2 * (S/S) + (MS*1)',                                                                     rate: 118 },
            { hardware: 'Wool Pile (Domal)',                     unit: 'R.Ft', formula: '(((H * 3) + (W * 2)) * S) + (((H * 3) + (W * 2)) * MS)',                                rate: 7 },
            { hardware: 'Silicon Sealant',                       unit: 'R.Ft', formula: '(W + H) * 2 / 12',                                                                       rate: 8 },
            { hardware: 'Anti-Lift Plug',                        unit: 'Nos',  formula: '2 * S',                                                                                  rate: 2 },
            { hardware: 'Domal Cleat',                           unit: 'Nos',  formula: '4*S + (MS*4)',                                                                           rate: 18 },
            { hardware: 'Domal Inter Lock Cap',                  unit: 'Nos',  formula: '2*(S-1) + (2*(MS*1))',                                                                   rate: 2 },
            { hardware: 'Domal Wing Connector',                  unit: 'Nos',  formula: '8*S + (MS*8)',                                                                           rate: 0.6 },
            { hardware: 'Screw (13*6, 19*6, 25*7, 32*8, 60*10)', unit: 'Nos', formula: '(S/S) * 16 + (2*(S-1) * 5) + ((S*4) + (MS * 4)) + 4*(S/S) + 8*(S/S)',                  rate: 1 }
        ],
        'Door': [
            { hardware: 'Door Hinge',      unit: 'Nos',  formula: '4 * L',              rate: 52 },
            { hardware: 'Door Handle',     unit: 'Nos',  formula: '2 * L',              rate: 450 },
            { hardware: 'Door Closer',     unit: 'Nos',  formula: '1 * L',              rate: 1800 },
            { hardware: 'Lock Body',       unit: 'Nos',  formula: '1 * L',              rate: 850 },
            { hardware: 'Cylinder',        unit: 'Nos',  formula: '1 * L',              rate: 450 },
            { hardware: 'Silicon Sealant', unit: 'R.Ft', formula: '(W + H) * 2 / 12',  rate: 10 },
            { hardware: 'Door Road 12mm',  unit: 'Nos',  formula: '2 * L',              rate: 60 }
        ]
    }
});
