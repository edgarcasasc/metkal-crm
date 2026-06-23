const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'archivos-excel2', 'M-MK-0497_1.xlsx');
const workbook = XLSX.readFile(filePath, { cellFormula: true });

function inspectSheet(sheetName, maxR, maxC) {
    console.log(`\n--- Hoja: ${sheetName} ---`);
    const s = workbook.Sheets[sheetName];
    if (!s) return;
    for (let R = 0; R <= maxR; ++R) {
        let rowText = [];
        for (let C = 0; C <= maxC; ++C) {
            const cellAddress = XLSX.utils.encode_cell({c: C, r: R});
            const cell = s[cellAddress];
            if (cell && cell.v !== undefined && cell.v !== '') {
                rowText.push(`[${XLSX.utils.encode_col(C)}${R+1}]: ${cell.v}`);
            }
        }
        if (rowText.length > 0) {
            console.log(`Fila ${R+1}: ${rowText.join(' | ').substring(0, 200)}`);
        }
    }
}

inspectSheet('Clase', 30, 20);
inspectSheet('Pesas', 30, 20);
