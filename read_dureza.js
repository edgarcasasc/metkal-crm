const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'archivos-excel2', 'DU-MK-0373.xlsx');
console.log("Leyendo archivo:", filePath);
const workbook = XLSX.readFile(filePath, { cellFormula: true });

// Read the first sheet assuming it's the calculations
const sheetName = workbook.SheetNames[0]; 
console.log("Usando hoja:", sheetName);
const sheet = workbook.Sheets[sheetName];

const range = XLSX.utils.decode_range(sheet['!ref']);

for (let R = 0; R <= 30; ++R) {
    let rowText = [];
    let rowFormulas = [];
    for (let C = 0; C <= 35; ++C) {
        const cellAddress = XLSX.utils.encode_cell({c: C, r: R});
        const cell = sheet[cellAddress];
        if (cell) {
            rowText.push(cell.v !== undefined ? cell.v : '');
            if (cell.f) {
                rowFormulas.push(`Col ${XLSX.utils.encode_col(C)}: ${cell.f}`);
            }
        } else {
            rowText.push('');
        }
    }
    if (rowText.some(x => x !== '')) {
        console.log(`Fila ${R+1}: ${rowText.join(' | ').substring(0, 200)}...`);
    }
    if (rowFormulas.length > 0) {
        console.log(`Fórmulas en fila ${R+1}:`, rowFormulas.join(', '));
    }
}
