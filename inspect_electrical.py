import pandas as pd

file_path = r"c:\Users\edyKzaz\metkal-crm\archivos-excel2\E-MK-26-0153 2.xlsx"

try:
    xls = pd.ExcelFile(file_path)
    
    print("\n--- Sheet: 'Cálculos' ---")
    df = pd.read_excel(xls, sheet_name='Cálculos', nrows=100)
    # Search for rows containing "TENSION" or "ELECTRICA"
    for i, row in df.iterrows():
        row_str = str(row.values).upper()
        if "TENSION" in row_str or "TENSIN" in row_str or "VOLT" in row_str or "MV" in row_str:
            print(f"Row {i}:", [str(x) for x in row.values if pd.notna(x)])

    print("\n--- Sheet: 'Resultados I' ---")
    df = pd.read_excel(xls, sheet_name='Resultados I', nrows=100)
    for i, row in df.iterrows():
        row_str = str(row.values).upper()
        if "TENSION" in row_str or "TENSIN" in row_str or "VOLT" in row_str or "MV" in row_str:
            print(f"Row {i}:", [str(x) for x in row.values if pd.notna(x)])

except Exception as e:
    print("Error:", e)
