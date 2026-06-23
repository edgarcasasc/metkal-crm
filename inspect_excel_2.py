import msoffcrypto
import os
import io
import pandas as pd

file_path = r"c:\Users\edyKzaz\metkal-crm\archivos-excel2\E-MK-26-0153 2.xlsx"
passwords = ["m", "M", "VelvetSweatshop"]

print(f"\n{'='*50}\nAnalyzing: {os.path.basename(file_path)}")

def analyze_excel(excel_file):
    try:
        xls = pd.ExcelFile(excel_file)
        print("\nSheets found:", xls.sheet_names)
        for sheet in xls.sheet_names:
            print(f"\n--- Sheet: '{sheet}' ---")
            df = pd.read_excel(xls, sheet_name=sheet, nrows=10)
            # Remove entirely empty columns/rows for better printing
            df = df.dropna(how='all', axis=1).dropna(how='all', axis=0)
            if not df.empty:
                print("Columns:", df.columns.tolist()[:15]) # up to 15 columns
                print("First few rows of data:")
                print(df.head(5).to_string())
            else:
                print("Sheet is empty or has no readable data in first 10 rows.")
    except Exception as e:
        print("Could not read excel content:", e)

with open(file_path, "rb") as file:
    office_file = msoffcrypto.OfficeFile(file)
    if office_file.is_encrypted():
        print("File is encrypted. Attempting decryption...")
        decrypted = None
        for pwd in passwords:
            try:
                office_file.load_key(password=pwd)
                decrypted_temp = io.BytesIO()
                office_file.decrypt(decrypted_temp)
                decrypted = decrypted_temp
                print(f"Successfully decrypted with password: '{pwd}'")
                break
            except Exception as e:
                pass
        
        if decrypted:
            analyze_excel(decrypted)
        else:
            print("Decryption failed with provided passwords.")
    else:
        print("Not encrypted. Reading directly...")
        file.seek(0)
        analyze_excel(file)
