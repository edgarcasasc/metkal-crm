const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'archivos-excel2', 'E-MK-26-0153 2.xlsx');
console.log("Leyendo archivo:", filePath);
const workbook = XLSX.readFile(filePath, { cellFormula: true });

const sheetName = 'Cálculos'; // Assuming the sheet is 'calculos' based on earlier context "calculos, certificado, resultados, Anexo, Etiqueta"
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
    console.log("No se encontro la hoja 'calculos'. Hojas disponibles:", workbook.SheetNames);
    process.exit(1);
}

// Buscar las palabras clave en la hoja y extraer las formulas de la primera fila de datos debajo de ellas
const keywords = [
    "TENSION ELECTRICA CONTINUA",
    "TENSION ELECTRICA ALTERNA (60 Hz)",
    "CORRIENTE ELECTRICA CONTINUA",
    "CORRIENTE ELECTRICA ALTERNA (60 Hz)",
    "RESISTENCIA ELECTRICA"
];

const range = XLSX.utils.decode_range(sheet['!ref']);

let currentSection = null;
const sections = {};

for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({c: C, r: R});
        const cell = sheet[cellAddress];
        if (cell && cell.v && typeof cell.v === 'string') {
            const val = cell.v.trim();
            if (keywords.includes(val)) {
                currentSection = val;
                if (!sections[currentSection]) {
                    sections[currentSection] = { row: R, formulas: {} };
                }
            }
        }
    }
}

// Para cada sección encontrada, miramos 5 filas más abajo (asumiendo que ahí están los datos) 
// para sacar las fórmulas de uA, uB, uC, Uexp.
for (const [section, data] of Object.entries(sections)) {
    console.log(`\n=== ${section} ===`);
    const dataRow = data.row + 9; // Approx offset based on screenshot (Header is row 1, data starts around row 9 or 10 relative to the title)
    
    // Check a few rows after the title to find a row that has formulas
    let foundFormulas = false;
    for(let rOffset = 5; rOffset < 15; rOffset++) {
        const r = data.row + rOffset;
        let rowFormulas = [];
        // uA is M, Tol_Patron is N, uB_Patron is O, uB_resol is P, uC is Q, Grados is R, Factor k is S, Uexp is T
        // Actually looking at screenshot:
        // L=uA, M=Tol Patron, N=uB Patron, O=uB resol, P=uC, Q=Grados, R=Factor k, S=Uexp, T=error, U=error+U, V=error-U, W=error_abs
        const cols = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]; 
        for(let c of cols) { 
            const cellAddress = XLSX.utils.encode_cell({c: c, r: r});
            const cell = sheet[cellAddress];
            if (cell && cell.f) {
                rowFormulas.push(`Col ${XLSX.utils.encode_col(c)}: ${cell.f}`);
            } else if (cell && cell.v !== undefined) {
                rowFormulas.push(`Col ${XLSX.utils.encode_col(c)} (val): ${cell.v}`);
            }
        }
        if (rowFormulas.length > 5) { // found the data row!
            console.log(`Fórmulas encontradas en fila ${r + 1}:`);
            rowFormulas.forEach(f => console.log(f));
            foundFormulas = true;
            break;
        }
    }
    if (!foundFormulas) {
        console.log("No se encontraron fórmulas cerca del título.");
    }
}
