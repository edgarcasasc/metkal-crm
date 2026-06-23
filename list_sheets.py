import pandas as pd

file_path = r"c:\Users\edyKzaz\metkal-crm\archivos-excel2\E-MK-26-0153 2.xlsx"

try:
    xls = pd.ExcelFile(file_path)
    print("Sheets:", xls.sheet_names)
except Exception as e:
    print("Error:", e)
