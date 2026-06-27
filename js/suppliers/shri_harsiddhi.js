/**
 * js/suppliers/shri_harsiddhi.js
 * Definitions for Shri Harsiddhi Metals (SM)
 *
 * Series:
 *   - 27mm Domal  (mirrors the shared 27mm Domal cut logic, SM-specific profiles)
 *   - 25mm        (one-piece track frame)
 *   - 25mm Gulf   (split top-vertical + bottom-track frame)
 *
 * WEIGHTS: brochure gives a RANGE per thickness (kg/12'). We store the UPPER value
 *          (owner's instruction). A few 25mm profiles (Slim I/L SGU/DGU, their
 *          Reinforcements, and the 25mm Clip) had copy-paste errors in the brochure
 *          tables, so their weight is left null (t/weight to be supplied later — they
 *          cost ₹0 until filled).
 *
 * CONTEXT VARS used by the formulas below (injected by optimization.js calculatePieces):
 *   GT  = glass unit ('SGU' | 'DGU' | 'none')
 *   TS  = track style ('plain' | 'grill' | 'leg' | 'cut')
 *   TC  = track cap   ('none' | 'bulb' | 'vgroove')
 *   IL  = interlock   ('shutter' | 'sgu-slim' | 'sgu-reinf' | 'dgu-slim' | 'dgu-reinf')
 *   RED = reducer     (1 = fit SGU glass in a DGU shutter, 0 = no)
 */

(function () {
    // ── Shared shutter / interlock / accessory sections (used by BOTH 25mm series) ──
    const shared25Sections = {
        "25mm SGU Shutter": [
            { sectionNo: "25023", t: 1.10, weight: 3.000 },
            { sectionNo: "25023", t: 1.20, weight: 3.000 }
        ],
        "25mm DGU Shutter": [
            { sectionNo: "—", t: 1.20, weight: 3.000, desc: "DGU" }
        ],
        // Interlock options — brochure weight tables were copy-paste errors; left null.
        "25mm SGU Slim I/L": [
            { sectionNo: "—", t: null, weight: null, desc: "fill T+weight later" }
        ],
        "25mm SGU Slim I/L Reinforcement": [
            { sectionNo: "—", t: null, weight: null, desc: "fill T+weight later" }
        ],
        "25mm DGU Slim I/L": [
            { sectionNo: "—", t: null, weight: null, desc: "fill T+weight later" }
        ],
        "25mm DGU Slim I/L Reinforcement": [
            { sectionNo: "—", t: null, weight: null, desc: "fill T+weight later" }
        ],
        "25mm Clip": [
            { sectionNo: "—", t: null, weight: null, desc: "fill T+weight later" }
        ],
        // Accessories
        "25mm Mosquito Clip": [
            { sectionNo: "5113", t: 1.00, weight: 0.400 }
        ],
        "25mm SGU Reducer": [
            { sectionNo: "—", t: 1.20, weight: 0.900 }
        ],
        "25mm Bulb Track Cap": [
            { sectionNo: "6133", t: 1.00, weight: 0.700 }
        ],
        "25mm V Groove Track Cap": [
            { sectionNo: "6131", t: 1.20, weight: 0.600 }
        ],
        "25mm Domal Box Angle": [
            { sectionNo: "4069", t: 1.50, weight: 2.300, w: 38, h: 38 }
        ]
    };

    // ── Shared shutter / interlock / cap / reducer / mosquito CUT FORMULAS ──
    // Reused by both 25mm and 25mm Gulf. `widthDeduct` differs (Gulf jambs are wider).
    function shared25Formulas(widthDeduct) {
        const vert = 'H-2.5';                                  // shutter height (est. — confirm)
        const horiz = '(W-' + widthDeduct + '+2.5*(S-1))/S';   // per-shutter width
        return [
            // Glass shutter frame — SGU vs DGU driven by glass unit (GT)
            { component: '25mm SGU Shutter', qty: 'GT=="DGU" ? 0 : 2*S', length: vert,  desc: 'Shutter Verticals' },
            { component: '25mm SGU Shutter', qty: 'GT=="DGU" ? 0 : 2*S', length: horiz, desc: 'Shutter Horizontals' },
            { component: '25mm DGU Shutter', qty: 'GT=="DGU" ? 2*S : 0', length: vert,  desc: 'DGU Shutter Verticals' },
            { component: '25mm DGU Shutter', qty: 'GT=="DGU" ? 2*S : 0', length: horiz, desc: 'DGU Shutter Horizontals' },

            // Interlock — user picks ONE. Slim/Reinf = dedicated profile (no clip);
            // "shutter" = meeting stile is the shutter profile + a 25mm Clip (like 27mm).
            { component: '25mm Clip',                        qty: 'IL=="shutter"  ? 2*(S-1) : 0', length: vert, desc: 'Interlock Clip' },
            { component: '25mm SGU Slim I/L',                qty: 'IL=="sgu-slim" ? 2*(S-1) : 0', length: vert, desc: 'Interlock (SGU Slim)' },
            { component: '25mm SGU Slim I/L Reinforcement',  qty: 'IL=="sgu-reinf"? 2*(S-1) : 0', length: vert, desc: 'Interlock (SGU Reinf)' },
            { component: '25mm DGU Slim I/L',                qty: 'IL=="dgu-slim" ? 2*(S-1) : 0', length: vert, desc: 'Interlock (DGU Slim)' },
            { component: '25mm DGU Slim I/L Reinforcement',  qty: 'IL=="dgu-reinf"? 2*(S-1) : 0', length: vert, desc: 'Interlock (DGU Reinf)' },

            // Bottom-track cap (bearing runs on it) — one per track groove, full width.
            { component: '25mm Bulb Track Cap',     qty: 'TC=="bulb"    ? T : 0', length: 'W', desc: 'Bottom Track Cap' },
            { component: '25mm V Groove Track Cap', qty: 'TC=="vgroove" ? T : 0', length: 'W', desc: 'Bottom Track Cap' },

            // SGU Reducer — fit single glass inside a DGU shutter (4 sides per shutter).
            { component: '25mm SGU Reducer', qty: 'RED==1 ? 2*S : 0', length: vert,  desc: 'Reducer Verticals' },
            { component: '25mm SGU Reducer', qty: 'RED==1 ? 2*S : 0', length: horiz, desc: 'Reducer Horizontals' },

            // Mosquito shutter — uses Mosquito Clip in place of a C-channel.
            { component: '25mm SGU Shutter',  qty: '2*MS', length: vert,  desc: 'MS Shutter Verticals' },
            { component: '25mm SGU Shutter',  qty: '2*MS', length: horiz, desc: 'MS Shutter Horizontals' },
            { component: '25mm Mosquito Clip', qty: '2*MS', length: vert,  desc: 'MS Clip Verticals' },
            { component: '25mm Mosquito Clip', qty: '2*MS', length: horiz, desc: 'MS Clip Horizontals' }
        ];
    }

    // Stock helper — 12' (144") sticks; cost 0 (weight×rate drives profile cost; SM rates TBD)
    function stockFor(materials) {
        return materials.map(m => ({ material: m, stock1: 144, stock1Cost: 0, stock2: 0, stock2Cost: 0 }));
    }

    // Hardware — SAME quantities/formulas as 27mm Domal (owner's instruction),
    // with "Domal" relabelled "25mm". Rates are 27mm defaults (SM rates TBD).
    const hardware25 = [
        { hardware: '25mm Bearing',                          unit: 'Nos',  formula: '2 * S + 2 * MS',                                                          rate: 47 },
        { hardware: 'Concealed Lock',                        unit: 'Nos',  formula: '2 * (S/S) + (MS*1)',                                                       rate: 118 },
        { hardware: 'Wool Pile (25mm)',                      unit: 'R.Ft', formula: '((((H * 3) + (W * 2)) * S) + (((H * 3) + (W * 2)) * MS)) / 12',           rate: 7 },
        { hardware: 'Silicon Sealant',                       unit: 'R.Ft', formula: '(W + H) * 4 / 12',                                                         rate: 2.875 },
        { hardware: 'Anti-Lift Plug',                        unit: 'Nos',  formula: '2 * S',                                                                    rate: 2 },
        { hardware: '25mm Cleat',                            unit: 'Nos',  formula: '4*S + (MS*4)',                                                             rate: 18 },
        { hardware: '25mm Inter Lock Cap',                   unit: 'Nos',  formula: '2*(S-1) + (2*(MS*1))',                                                     rate: 2 },
        { hardware: '25mm Wing Connector',                   unit: 'Nos',  formula: '8*S + (MS*8)',                                                             rate: 0.6 },
        { hardware: 'Screw (13*6, 19*6, 25*7, 32*8, 60*10)', unit: 'Nos',  formula: '(S/S) * 16 + (2*(S-1) * 5) + ((S*4) + (MS * 4)) + 4*(S/S) + 8*(S/S)',     rate: 1 }
    ];

    window.registerSupplier("Shri Harsiddhi Metals", {

        // ════════════════════════════════════════════════════════════════════
        // 1. SECTION WEIGHTS
        // ════════════════════════════════════════════════════════════════════
        sections: {
            // 3/4" — same component names as the shared 3/4" series (weights = SM brochure, upper value)
            "3/4\"": {
                "3/4\" Handle": [
                    { sectionNo: "1001", t: 0.75, weight: 1.000 },
                    { sectionNo: "1002", t: 0.80, weight: 1.200 },
                    { sectionNo: "1003", t: 0.95, weight: 1.400 },
                    { sectionNo: "1004", t: 1.10, weight: 1.600 },
                    { sectionNo: "1005", t: 1.25, weight: 1.800 }
                ],
                "3/4\" Interlock": [
                    { sectionNo: "1021", t: 0.75, weight: 1.300 },
                    { sectionNo: "1022", t: 0.80, weight: 1.400 },
                    { sectionNo: "1023", t: 0.95, weight: 1.600 },
                    { sectionNo: "1024", t: 1.10, weight: 1.800 },
                    { sectionNo: "1025", t: 1.25, weight: 2.200 }
                ],
                "3/4\" Sash Top/Bottom": [
                    { sectionNo: "1031", t: 0.75, weight: 1.000 },
                    { sectionNo: "1032", t: 0.80, weight: 1.200 },
                    { sectionNo: "1033", t: 0.95, weight: 1.400 },
                    { sectionNo: "1034", t: 1.10, weight: 1.600 },
                    { sectionNo: "1035", t: 1.25, weight: 1.800 }
                ],
                "3/4\" Bearing Bottom": [
                    { sectionNo: "1041", t: 0.79, weight: 1.300 },
                    { sectionNo: "1042", t: 0.85, weight: 1.400 },
                    { sectionNo: "1045", t: 1.50, weight: 2.150 }
                ],
                "3/4\" Middle": [
                    { sectionNo: "1052", t: 0.80, weight: 1.200 }
                ],
                "3/4\" 2 Track Top": [
                    { sectionNo: "1063", t: 0.95, weight: 1.600 },
                    { sectionNo: "1065", t: 1.10, weight: 2.000 },
                    { sectionNo: "1066", t: 1.20, weight: 2.400 },
                    { sectionNo: "1068", t: 1.30, weight: 3.000 }
                ],
                "3/4\" 2 Track Bottom": [
                    { sectionNo: "1075", t: 1.50, weight: 1.800 },
                    { sectionNo: "1076", t: 1.60, weight: 2.200 },
                    { sectionNo: "1077", t: 1.70, weight: 2.800 }
                ],
                "3/4\" 3 Track Top": [
                    { sectionNo: "1085", t: 0.97, weight: 2.000 },
                    { sectionNo: "1086", t: 1.05, weight: 2.400 },
                    { sectionNo: "1087", t: 1.12, weight: 2.600 },
                    { sectionNo: "1089", t: 1.20, weight: 3.000 },
                    { sectionNo: "1090", t: 1.25, weight: 3.500 }
                ],
                "3/4\" 3 Track Bottom": [
                    { sectionNo: "1095", t: 1.15, weight: 1.800 },
                    { sectionNo: "1096", t: 1.18, weight: 2.400 },
                    { sectionNo: "1097", t: 1.20, weight: 2.600 },
                    { sectionNo: "1098", t: 1.25, weight: 3.200 },
                    { sectionNo: "1099", t: 1.30, weight: 4.400 }
                ],
                "3/4\" 4 Track Top": [
                    { sectionNo: "1105", t: 1.50, weight: 4.200 }
                ],
                "3/4\" 4 Track Bottom": [
                    { sectionNo: "1114", t: 1.30, weight: 4.400 }
                ]
            },
            // 1" — same component names as the shared 1" series
            "1\"": {
                "1\" Handle": [
                    { sectionNo: "1123", t: 1.08, weight: 1.600 },
                    { sectionNo: "1124", t: 1.23, weight: 1.800 },
                    { sectionNo: "1125", t: 1.30, weight: 2.100 }
                ],
                "1\" Interlock": [
                    { sectionNo: "1136", t: 1.55, weight: 2.200 }
                ],
                "1\" Middle": [
                    { sectionNo: "1144", t: 1.12, weight: 1.600 },
                    { sectionNo: "1145", t: 1.21, weight: 1.800 }
                ],
                "1\" Bearing Bottom": [
                    { sectionNo: "1156", t: 1.55, weight: 2.400 }
                ],
                "1\" Sash Top/Bottom": [
                    { sectionNo: "1163", t: 1.25, weight: 1.600 },
                    { sectionNo: "1164", t: 1.30, weight: 1.800 },
                    { sectionNo: "1166", t: 1.35, weight: 2.200 }
                ],
                "1\" Sash Top/Bottom Single Leg": [
                    { sectionNo: "1172", t: 1.25, weight: 1.500 },
                    { sectionNo: "1173", t: 1.30, weight: 1.800 },
                    { sectionNo: "1175", t: 1.35, weight: 2.300 }
                ],
                "1\" 2 Track Top": [
                    { sectionNo: "1183", t: 1.30, weight: 2.200 }
                ],
                "1\" 2 Track Bottom": [
                    { sectionNo: "1195", t: 1.35, weight: 2.500 }
                ],
                "1\" 3 Track Top": [
                    { sectionNo: "1204", t: 1.20, weight: 2.800 },
                    { sectionNo: "1205", t: 1.23, weight: 3.200 },
                    { sectionNo: "1206", t: 1.25, weight: 3.400 }
                ],
                "1\" 3 Track Bottom": [
                    { sectionNo: "1215", t: 1.18, weight: 3.200 },
                    { sectionNo: "1217", t: 1.25, weight: 3.700 }
                ]
            },
            "27mm Domal": {
                "27mm Domal Single Track": [
                    { sectionNo: "H/16031", t: 1.20, weight: 2.300 }
                ],
                "27mm Domal 2 Track": [
                    { sectionNo: "HDC-1", t: 1.10, weight: 2.500 },
                    { sectionNo: "HDC-1", t: 1.20, weight: 2.600 },
                    { sectionNo: "HDC-1", t: 1.30, weight: 2.900 },
                    { sectionNo: "HDC-1", t: 1.50, weight: 3.200 }
                ],
                "27mm Domal 3 Track": [
                    { sectionNo: "HDC-2", t: 1.10, weight: 3.900 },
                    { sectionNo: "HDC-2", t: 1.20, weight: 4.200 },
                    { sectionNo: "HDC-2", t: 1.30, weight: 4.500 },
                    { sectionNo: "HDC-2", t: 1.50, weight: 5.000 }
                ],
                "27mm Domal 4 Track": [
                    { sectionNo: "1604", t: 1.30, weight: 6.500 }
                ],
                "27mm Domal 2 Track Grill": [
                    { sectionNo: "—", t: 1.25, weight: 4.000 }
                ],
                "27mm Domal 3 Track Grill": [
                    { sectionNo: "6013", t: 1.25, weight: 5.800 }
                ],
                "27mm Domal 2 Track Leg": [
                    { sectionNo: "—", t: 1.40, weight: 4.600 }
                ],
                "27mm Domal 3 Track Leg": [
                    { sectionNo: "6045", t: 1.20, weight: 6.600 }
                ],
                "27mm Domal Shutter": [
                    { sectionNo: "HDC-3", t: 1.10, weight: 2.500 },
                    { sectionNo: "HDC-3", t: 1.20, weight: 2.600 },
                    { sectionNo: "HDC-3", t: 1.30, weight: 2.900 },
                    { sectionNo: "HDC-3", t: 1.50, weight: 3.200 }
                ],
                "27mm Domal DGU Shutter": [
                    { sectionNo: "HDC-5", t: 1.30, weight: 3.000 }
                ],
                "27mm Domal Clip": [
                    { sectionNo: "HDC-4", t: 1.10, weight: 1.000 },
                    { sectionNo: "HDC-4", t: 1.20, weight: 1.200 }
                ],
                "27mm Domal Center Patti": [
                    { sectionNo: "16032", t: 1.10, weight: 1.300 }
                ]
            },

            "25mm": Object.assign({
                "25mm 2 Track": [
                    { sectionNo: "25021", t: 1.20, weight: 3.000 },
                    { sectionNo: "25021", t: 1.30, weight: 3.200 }
                ],
                "25mm 2 Track Leg": [
                    { sectionNo: "25017", t: 1.20, weight: 3.800 },
                    { sectionNo: "25017", t: 1.30, weight: 4.000 }
                ],
                "25mm 3 Track": [
                    { sectionNo: "25022", t: 1.20, weight: 4.500 },
                    { sectionNo: "25022", t: 1.30, weight: 4.900 }
                ],
                "25mm 3 Track Leg": [
                    { sectionNo: "25019", t: 1.20, weight: 5.500 },
                    { sectionNo: "25019", t: 1.30, weight: 5.900 }
                ],
                "25mm Cut 2 Track": [
                    { sectionNo: "25020", t: 1.10, weight: 2.300 },
                    { sectionNo: "25020", t: 1.20, weight: 2.500 }
                ]
            }, shared25Sections),

            "25mm Gulf": Object.assign({
                "25mm 2T Bottom": [
                    { sectionNo: "—", t: 1.20, weight: 4.100 }
                ],
                "25mm 2T Top Vertical": [
                    { sectionNo: "—", t: 1.20, weight: 2.800 }
                ],
                "25mm 3T Bottom": [
                    { sectionNo: "—", t: 1.25, weight: 4.900 }
                ],
                "25mm 3T Top Vertical": [
                    { sectionNo: "—", t: 1.20, weight: 3.700 }
                ],
                "25mm Single Toage": [
                    { sectionNo: "—", t: 1.20, weight: 0.600 }
                ]
            }, shared25Sections),

            // Door — SM is a buildable door vendor. Functional components use canonical
            // names so generateDoorProfileFormulas (optimization.js) resolves SM weights;
            // the rest are reference-only accessories.
            "Door": {
                // ── Functional (used by the door cut engine) ──
                "Door Top": [
                    { sectionNo: "4101", t: 1.05, weight: 2.000, w: 47,  h: 44 },
                    { sectionNo: "4102", t: 1.15, weight: 2.600, w: 47,  h: 44 },
                    { sectionNo: "4107", t: 1.48, weight: 4.000, w: 85,  h: 44 }
                ],
                "Door Bottom": [ // 114-wide "Door Top" (4110) used as the bottom rail
                    { sectionNo: "4110", t: 1.15, weight: 4.000, w: 114, h: 44 }
                ],
                "Door Vertical": [
                    { sectionNo: "4126", t: 0.90, weight: 2.000, w: 47, h: 44 },
                    { sectionNo: "4127", t: 1.05, weight: 2.400, w: 47, h: 44 },
                    { sectionNo: "4128", t: 1.20, weight: 2.600, w: 47, h: 44 },
                    { sectionNo: "4132", t: 1.35, weight: 4.000, w: 85, h: 44 }
                ],
                "Door Middle Double": [
                    { sectionNo: "4116", t: 1.12, weight: 2.600, w: 47, h: 44 },
                    { sectionNo: "4117", t: 1.20, weight: 2.800, w: 47, h: 44 },
                    { sectionNo: "4114", t: 1.20, weight: 3.350, w: 85, h: 44 },
                    { sectionNo: "4120", t: 1.35, weight: 4.000, w: 85, h: 44 }
                ],
                "Door Middle Single": [
                    { sectionNo: "4121", t: 0.95, weight: 2.000, w: 47, h: 44 },
                    { sectionNo: "4123", t: 1.40, weight: 3.000, w: 47, h: 44 },
                    { sectionNo: "4125", t: 1.35, weight: 4.000, w: 85, h: 44 }
                ],
                "Door Tips Vertical": [
                    { sectionNo: "4135", t: 0.84, weight: 2.000, w: 63.5, h: 49.5 },
                    { sectionNo: "4137", t: 1.50, weight: 3.500, w: 63.5, h: 49.5 }
                ],
                "Door Leg Partition": [ // SM "Leg Partition" = the 3-side door frame
                    { sectionNo: "3126", t: 1.20, weight: 2.900, w: 63.5, h: 49.5 },
                    { sectionNo: "3127", t: 1.30, weight: 3.500, w: 63.5, h: 49.5 },
                    { sectionNo: "3130", t: 1.30, weight: 2.600, w: 63.5, h: 25.0 }
                ],
                "Door Glazing Clip": [
                    { sectionNo: "4061", t: null, weight: 0.200, w: 18, h: 17 },
                    { sectionNo: "4062", t: null, weight: 0.250, w: 18, h: 17 },
                    { sectionNo: "4063", t: null, weight: 0.360, w: 18, h: 17 },
                    { sectionNo: "4064", t: null, weight: 0.440, w: 18, h: 17 }
                ],
                "Door Tie Angle": [ // SM Box Angle 38×38 (4069) serves as the tie angle
                    { sectionNo: "4069", t: 1.50, weight: 2.300, w: 38, h: 38 }
                ],
                // ── Reference-only accessories / variants ──
                "Door Middle Single Leg": [
                    { sectionNo: "4136", t: 1.15, weight: 2.100, w: 47, h: 44 },
                    { sectionNo: "4138", t: 1.20, weight: 3.700, w: 85, h: 44 }
                ],
                "Glazing Plate": [
                    { sectionNo: "4067", t: 0.80, weight: 0.750, w: 63, h: 3.30 }
                ],
                "Square Clip": [
                    { sectionNo: "4070", t: null, weight: 0.900, w: 17.76, h: 16.81 }
                ],
                "63mm Louvers Patta": [
                    { sectionNo: "6161", t: 1.10, weight: 1.000, w: 63, h: 11.55 }
                ],
                "Flush Door P Pipe": [
                    { sectionNo: "H/3118", t: null, weight: 3.200, w: 63, h: 38 }
                ],
                "G Section": [
                    { sectionNo: "4170", t: null, weight: 2.400 }
                ],
                "Small Leg Partition": [
                    { sectionNo: "H/3125", t: 1.30, weight: 2.900, w: 63.5, h: 25 }
                ],
                "1.5x1 P Pipe": [
                    { sectionNo: "3101", t: 0.75, weight: 1.000, w: 37, h: 24.3 },
                    { sectionNo: "3102", t: 0.95, weight: 1.300, w: 37, h: 24.3 }
                ],
                "2x1 P Pipe": [
                    { sectionNo: "3112", t: 0.90, weight: 1.300, w: 45, h: 24 },
                    { sectionNo: "3113", t: 1.00, weight: 1.500, w: 45, h: 24 },
                    { sectionNo: "3114", t: 1.15, weight: 1.700, w: 45, h: 24 },
                    { sectionNo: "3115", t: 1.27, weight: 1.900, w: 45, h: 24 },
                    { sectionNo: "3118", t: 1.30, weight: 3.200, w: 63.5, h: 38 }
                ]
            },

            // New 'Partition' series (reference-only) — Single + Double box partition.
            "Partition": {
                "2.5x1.5 Single Partition": [
                    { sectionNo: "4004", t: 0.87, weight: 2.000, w: 63, h: 38 },
                    { sectionNo: "4005", t: 0.94, weight: 2.200, w: 63, h: 38 },
                    { sectionNo: "4006", t: 1.02, weight: 2.400, w: 63, h: 38 },
                    { sectionNo: "4007", t: 1.12, weight: 2.700, w: 63, h: 38 },
                    { sectionNo: "4008", t: 1.22, weight: 3.000, w: 63, h: 38 },
                    { sectionNo: "4012", t: 1.60, weight: 3.700, w: 63, h: 38 },
                    { sectionNo: "4013", t: 1.85, weight: 4.000, w: 63, h: 38 },
                    { sectionNo: "4021", t: 1.00, weight: 3.900, w: 100, h: 44 }
                ],
                "2.5x1.5 Double Partition": [
                    { sectionNo: "4034", t: 0.80, weight: 2.000, w: 63, h: 38 },
                    { sectionNo: "4035", t: 0.90, weight: 2.200, w: 63, h: 38 },
                    { sectionNo: "4036", t: 1.00, weight: 2.400, w: 63, h: 38 },
                    { sectionNo: "4037", t: 1.10, weight: 2.700, w: 63, h: 38 },
                    { sectionNo: "4039", t: 1.30, weight: 3.000, w: 63, h: 38 },
                    { sectionNo: "4042", t: 1.60, weight: 3.700, w: 63, h: 38 },
                    { sectionNo: "4043", t: 1.75, weight: 3.900, w: 63, h: 38 },
                    { sectionNo: "4051", t: 0.95, weight: 3.900, w: 100, h: 44 },
                    { sectionNo: "4053", t: 1.30, weight: 4.600, w: 100, h: 44 },
                    { sectionNo: "H/4046", t: 1.20, weight: 3.400, w: 86, h: 38 }
                ]
            }
        },

        // ════════════════════════════════════════════════════════════════════
        // 2. SERIES FORMULAS
        // ════════════════════════════════════════════════════════════════════
        formulas: {
            // ── 27mm Domal — SM-specific (mirrors shared 27mm logic + SM extras) ──
            '27mm Domal': [
                // Glass shutter — SGU vs DGU by glass unit
                { component: '27mm Domal Shutter',     qty: 'GT=="DGU" ? 0 : 2*S', length: 'H-2.75',              desc: 'Shutter Verticals' },
                { component: '27mm Domal Shutter',     qty: 'GT=="DGU" ? 0 : 2*S', length: '(W-3+2.5*(S-1))/S',   desc: 'Shutter Horizontals' },
                { component: '27mm Domal DGU Shutter', qty: 'GT=="DGU" ? 2*S : 0', length: 'H-2.75',              desc: 'DGU Shutter Verticals' },
                { component: '27mm Domal DGU Shutter', qty: 'GT=="DGU" ? 2*S : 0', length: '(W-3+2.5*(S-1))/S',   desc: 'DGU Shutter Horizontals' },

                // Interlock clip
                { component: '27mm Domal Clip', qty: '2*(S-1)', length: 'H-2.75', desc: 'Interlock Clips' },

                // Center Patti — centre-opening (4 shutters/2 track, 6 shutters/3 track)
                { component: '27mm Domal Center Patti', qty: 'S==2*T ? 1 : 0', length: 'H-2.75', desc: 'Center Patti' },

                // Single Track frame (T==1)
                { component: '27mm Domal Single Track', qty: 'T==1 ? 1 : 0', length: 'W', desc: '1T Track Top' },
                { component: '27mm Domal Single Track', qty: 'T==1 ? 1 : 0', length: 'W', desc: '1T Track Bottom' },
                { component: '27mm Domal Single Track', qty: 'T==1 ? 2 : 0', length: 'H', desc: '1T Track Sides' },

                // 2 Track frame — plain / grill / leg
                { component: '27mm Domal 2 Track',       qty: 'T==2 && TS=="plain" ? 1 : 0', length: 'W', desc: '2T Track Top' },
                { component: '27mm Domal 2 Track',       qty: 'T==2 && TS=="plain" ? 1 : 0', length: 'W', desc: '2T Track Bottom' },
                { component: '27mm Domal 2 Track',       qty: 'T==2 && TS=="plain" ? 2 : 0', length: 'H', desc: '2T Track Sides' },
                { component: '27mm Domal 2 Track Grill', qty: 'T==2 && TS=="grill" ? 1 : 0', length: 'W', desc: '2T Grill Top' },
                { component: '27mm Domal 2 Track Grill', qty: 'T==2 && TS=="grill" ? 1 : 0', length: 'W', desc: '2T Grill Bottom' },
                { component: '27mm Domal 2 Track Grill', qty: 'T==2 && TS=="grill" ? 2 : 0', length: 'H', desc: '2T Grill Sides' },
                { component: '27mm Domal 2 Track Leg',   qty: 'T==2 && TS=="leg"   ? 1 : 0', length: 'W', desc: '2T Leg Top' },
                { component: '27mm Domal 2 Track Leg',   qty: 'T==2 && TS=="leg"   ? 1 : 0', length: 'W', desc: '2T Leg Bottom' },
                { component: '27mm Domal 2 Track Leg',   qty: 'T==2 && TS=="leg"   ? 2 : 0', length: 'H', desc: '2T Leg Sides' },

                // 3 Track frame — plain / grill / leg
                { component: '27mm Domal 3 Track',       qty: 'T==3 && TS=="plain" ? 1 : 0', length: 'W', desc: '3T Track Top' },
                { component: '27mm Domal 3 Track',       qty: 'T==3 && TS=="plain" ? 1 : 0', length: 'W', desc: '3T Track Bottom' },
                { component: '27mm Domal 3 Track',       qty: 'T==3 && TS=="plain" ? 2 : 0', length: 'H', desc: '3T Track Sides' },
                { component: '27mm Domal 3 Track Grill', qty: 'T==3 && TS=="grill" ? 1 : 0', length: 'W', desc: '3T Grill Top' },
                { component: '27mm Domal 3 Track Grill', qty: 'T==3 && TS=="grill" ? 1 : 0', length: 'W', desc: '3T Grill Bottom' },
                { component: '27mm Domal 3 Track Grill', qty: 'T==3 && TS=="grill" ? 2 : 0', length: 'H', desc: '3T Grill Sides' },
                { component: '27mm Domal 3 Track Leg',   qty: 'T==3 && TS=="leg"   ? 1 : 0', length: 'W', desc: '3T Leg Top' },
                { component: '27mm Domal 3 Track Leg',   qty: 'T==3 && TS=="leg"   ? 1 : 0', length: 'W', desc: '3T Leg Bottom' },
                { component: '27mm Domal 3 Track Leg',   qty: 'T==3 && TS=="leg"   ? 2 : 0', length: 'H', desc: '3T Leg Sides' },

                // 4 Track frame (T==4, plain only)
                { component: '27mm Domal 4 Track', qty: 'T==4 ? 1 : 0', length: 'W', desc: '4T Track Top' },
                { component: '27mm Domal 4 Track', qty: 'T==4 ? 1 : 0', length: 'W', desc: '4T Track Bottom' },
                { component: '27mm Domal 4 Track', qty: 'T==4 ? 2 : 0', length: 'H', desc: '4T Track Sides' },

                // Mosquito (Clip as the interlock element, like the shared 27mm logic)
                { component: '27mm Domal Shutter', qty: '2*MS', length: 'H-2.75',            desc: 'MS Shutter Verticals' },
                { component: '27mm Domal Shutter', qty: '2*MS', length: '(W-3+2.5*(S-1))/S', desc: 'MS Shutter Horizontals' },
                { component: '27mm Domal Clip',    qty: '1*MS', length: 'H-2.75',            desc: 'MS Clip' }
            ],

            // ── 25mm (one-piece track frame) ──
            '25mm': [
                // 2 Track frame — plain / leg / cut
                { component: '25mm 2 Track',     qty: 'T==2 && TS=="plain" ? 1 : 0', length: 'W', desc: '2T Top' },
                { component: '25mm 2 Track',     qty: 'T==2 && TS=="plain" ? 1 : 0', length: 'W', desc: '2T Bottom' },
                { component: '25mm 2 Track',     qty: 'T==2 && TS=="plain" ? 2 : 0', length: 'H', desc: '2T Sides' },
                { component: '25mm 2 Track Leg', qty: 'T==2 && TS=="leg"   ? 1 : 0', length: 'W', desc: '2T Leg Top' },
                { component: '25mm 2 Track Leg', qty: 'T==2 && TS=="leg"   ? 1 : 0', length: 'W', desc: '2T Leg Bottom' },
                { component: '25mm 2 Track Leg', qty: 'T==2 && TS=="leg"   ? 2 : 0', length: 'H', desc: '2T Leg Sides' },
                { component: '25mm Cut 2 Track', qty: 'T==2 && TS=="cut"   ? 1 : 0', length: 'W', desc: '2T Cut Top' },
                { component: '25mm Cut 2 Track', qty: 'T==2 && TS=="cut"   ? 1 : 0', length: 'W', desc: '2T Cut Bottom' },
                { component: '25mm Cut 2 Track', qty: 'T==2 && TS=="cut"   ? 2 : 0', length: 'H', desc: '2T Cut Sides' },

                // 3 Track frame — plain / leg
                { component: '25mm 3 Track',     qty: 'T==3 && TS=="leg" ? 0 : (T==3 ? 1 : 0)', length: 'W', desc: '3T Top' },
                { component: '25mm 3 Track',     qty: 'T==3 && TS=="leg" ? 0 : (T==3 ? 1 : 0)', length: 'W', desc: '3T Bottom' },
                { component: '25mm 3 Track',     qty: 'T==3 && TS=="leg" ? 0 : (T==3 ? 2 : 0)', length: 'H', desc: '3T Sides' },
                { component: '25mm 3 Track Leg', qty: 'T==3 && TS=="leg" ? 1 : 0', length: 'W', desc: '3T Leg Top' },
                { component: '25mm 3 Track Leg', qty: 'T==3 && TS=="leg" ? 1 : 0', length: 'W', desc: '3T Leg Bottom' },
                { component: '25mm 3 Track Leg', qty: 'T==3 && TS=="leg" ? 2 : 0', length: 'H', desc: '3T Leg Sides' }
            ].concat(shared25Formulas(3)),

            // ── 25mm Gulf (split top-vertical jambs + bottom-track rails) ──
            '25mm Gulf': [
                // 2 Track: top+bottom = 2T Bottom; sides = 2T Top Vertical
                { component: '25mm 2T Bottom',       qty: 'T==2 ? 1 : 0', length: 'W', desc: '2T Top Rail' },
                { component: '25mm 2T Bottom',       qty: 'T==2 ? 1 : 0', length: 'W', desc: '2T Bottom Rail' },
                { component: '25mm 2T Top Vertical', qty: 'T==2 ? 2 : 0', length: 'H', desc: '2T Side Jambs' },
                // 3 Track: top+bottom = 3T Bottom; sides = 3T Top Vertical
                { component: '25mm 3T Bottom',       qty: 'T==3 ? 1 : 0', length: 'W', desc: '3T Top Rail' },
                { component: '25mm 3T Bottom',       qty: 'T==3 ? 1 : 0', length: 'W', desc: '3T Bottom Rail' },
                { component: '25mm 3T Top Vertical', qty: 'T==3 ? 2 : 0', length: 'H', desc: '3T Side Jambs' },
                // Single Toage — MS lock when both mosquito + glass shutters present
                { component: '25mm Single Toage', qty: 'MS>0 && S>0 ? 1 : 0', length: 'H', desc: 'Single Toage (MS lock)' }
            ].concat(shared25Formulas(4))
        },

        // ════════════════════════════════════════════════════════════════════
        // 3. DEFAULT STOCK (12' / 144" sticks; cost 0 — SM rates supplied later)
        // ════════════════════════════════════════════════════════════════════
        stock: {
            "3/4\"": stockFor([
                "3/4\" Handle", "3/4\" Interlock", "3/4\" Sash Top/Bottom", "3/4\" Bearing Bottom",
                "3/4\" Middle", "3/4\" 2 Track Top", "3/4\" 2 Track Bottom", "3/4\" 3 Track Top",
                "3/4\" 3 Track Bottom", "3/4\" 4 Track Top", "3/4\" 4 Track Bottom"
            ]),
            "1\"": stockFor([
                "1\" Handle", "1\" Interlock", "1\" Middle", "1\" Bearing Bottom",
                "1\" Sash Top/Bottom", "1\" Sash Top/Bottom Single Leg",
                "1\" 2 Track Top", "1\" 2 Track Bottom", "1\" 3 Track Top", "1\" 3 Track Bottom"
            ]),
            "27mm Domal": stockFor([
                "27mm Domal Single Track", "27mm Domal 2 Track", "27mm Domal 3 Track",
                "27mm Domal 4 Track", "27mm Domal 2 Track Grill", "27mm Domal 3 Track Grill",
                "27mm Domal 2 Track Leg", "27mm Domal 3 Track Leg", "27mm Domal Shutter",
                "27mm Domal DGU Shutter", "27mm Domal Clip", "27mm Domal Center Patti"
            ]),
            "25mm": stockFor([
                "25mm 2 Track", "25mm 2 Track Leg", "25mm 3 Track", "25mm 3 Track Leg",
                "25mm Cut 2 Track", "25mm SGU Shutter", "25mm DGU Shutter",
                "25mm SGU Slim I/L", "25mm SGU Slim I/L Reinforcement",
                "25mm DGU Slim I/L", "25mm DGU Slim I/L Reinforcement", "25mm Clip",
                "25mm Mosquito Clip", "25mm SGU Reducer", "25mm Bulb Track Cap",
                "25mm V Groove Track Cap", "25mm Domal Box Angle"
            ]),
            "25mm Gulf": stockFor([
                "25mm 2T Bottom", "25mm 2T Top Vertical", "25mm 3T Bottom", "25mm 3T Top Vertical",
                "25mm Single Toage", "25mm SGU Shutter", "25mm DGU Shutter",
                "25mm SGU Slim I/L", "25mm SGU Slim I/L Reinforcement",
                "25mm DGU Slim I/L", "25mm DGU Slim I/L Reinforcement", "25mm Clip",
                "25mm Mosquito Clip", "25mm SGU Reducer", "25mm Bulb Track Cap",
                "25mm V Groove Track Cap", "25mm Domal Box Angle"
            ]),
            // Door — functional components + reference accessories
            "Door": stockFor([
                "Door Top", "Door Bottom", "Door Vertical", "Door Middle Double",
                "Door Middle Single", "Door Tips Vertical", "Door Leg Partition",
                "Door Glazing Clip", "Door Tie Angle", "Door Middle Single Leg",
                "Glazing Plate", "Square Clip", "63mm Louvers Patta", "Flush Door P Pipe",
                "G Section", "Small Leg Partition", "1.5x1 P Pipe", "2x1 P Pipe"
            ]),
            "Partition": stockFor([
                "2.5x1.5 Single Partition", "2.5x1.5 Double Partition"
            ])
        },

        // ════════════════════════════════════════════════════════════════════
        // 4. HARDWARE (25mm & 25mm Gulf mirror 27mm Domal; rates are placeholders)
        // ════════════════════════════════════════════════════════════════════
        hardware: {
            "25mm": hardware25,
            "25mm Gulf": hardware25
        }
    });
})();
