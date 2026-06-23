import msoffcrypto
import os
import io
import pandas as pd

dir_path = r"c:\Users\edyKzaz\metkal-crm\archivos-excel"

files = ["DU-MK-0373.xlsx", "E-MK-26-0153.xlsx", "F-MK-0415.xlsx", "M-MK-0497_1.xlsx", "O-MK-0285.xlsx", "TO-MK-0370.xlsx"]

passwords = ["m", "M"]

for f in files:
    print(f"\n{'='*50}\nFile: {f}")
    path = os.path.join(dir_path, f)
    with open(path, "rb") as file:
        office_file = msoffcrypto.OfficeFile(file)
        if office_file.is_encrypted():
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
                # Now try reading with pandas
                try:
                    xls = pd.ExcelFile(decrypted)
                    print("Sheets:", xls.sheet_names)
                    for sheet in xls.sheet_names[:1]:
                        df = pd.read_excel(xls, sheet_name=sheet, nrows=5)
                        print(f"Sheet '{sheet}' Columns:", df.columns.tolist()[:10]) # Print first 10 columns
                        print(f"Sheet '{sheet}' Data (first 2 rows):")
                        print(df.head(2).to_string())
                except Exception as e:
                    print("Could not read decrypted content:", e)
            else:
                print("Decryption failed with provided passwords.")
        else:
            print("Not encrypted, but in OLE2 format. Could be corrupted or other format.")
