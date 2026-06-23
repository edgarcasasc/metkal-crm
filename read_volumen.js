const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'archivos-excel2', 'V-MK-3319.xlsx');
const workbook = XLSX.readFile(filePath, { cellFormula: true });
console.log("Hojas:", workbook.SheetNames);
const sheet = workbook.Sheets['Resultados I'];

for (let R = 15; R <= 35; ++R) {
    let rowText = [];
    let rowFormulas = [];
    for (let C = 0; C <= 10; ++C) {
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
        console.log(`Fila ${R+1}: ${rowText.join(' | ').substring(0, 150)}...`);
    }
    if (rowFormulas.length > 0) {
        console.log(`Fórmulas en Fila ${R+1}:`, rowFormulas.join(', '));
    }
}
