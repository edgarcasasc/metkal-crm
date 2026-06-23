import pandas as pd
import os

dir_path = r"c:\Users\edyKzaz\metkal-crm\archivos-excel"

files = [f for f in os.listdir(dir_path) if f.endswith('.xlsx')]

for f in files:
    print(f"\n{'='*50}\nFile: {f}")
    path = os.path.join(dir_path, f)
    try:
        xls = pd.ExcelFile(path)
        print("Sheets:", xls.sheet_names)
        for sheet in xls.sheet_names[:1]: # just print first sheet info
            df = pd.read_excel(xls, sheet_name=sheet, nrows=5)
            print(f"\nSheet '{sheet}' Columns:")
            print(df.columns.tolist())
            print(f"\nSheet '{sheet}' Data (first 2 rows):")
            print(df.head(2).to_string())
    except Exception as e:
        print("Error reading:", e)
