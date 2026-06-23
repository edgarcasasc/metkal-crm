const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'archivos-excel2', 'M-MK-0497_1.xlsx');
const workbook = XLSX.readFile(filePath, { cellFormula: true });
const s = workbook.Sheets['CALCULOS'];

const rowsToInspect = [24, 25, 26, 27, 28, 29, 30, // Excentricidad
                       35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 49, // Repetibilidad
                       59, 60, 61, 62, 63, 64, 65, 66]; // Tabla de incertidumbres

rowsToInspect.forEach(R => {
    let rowFormulas = [];
    for (let C = 0; C <= 35; ++C) {
        const cellAddress = XLSX.utils.encode_cell({c: C, r: R-1});
        const cell = s[cellAddress];
        if (cell && cell.f) {
            rowFormulas.push(`[${XLSX.utils.encode_col(C)}]: ${cell.f}`);
        }
    }
    if (rowFormulas.length > 0) {
        console.log(`Fórmulas Fila ${R}: ${rowFormulas.join(', ')}`);
    }
});
