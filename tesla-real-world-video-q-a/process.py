#!/usr/bin/env python3
import csv

# Specify the CSV file name (change if needed)
filename = "result.csv"

# Open the CSV file in append mode ("a")
with open(filename, "a", newline="") as csvfile:
    writer = csv.writer(csvfile)
    # Loop from 51 to 250 inclusive (adding 200 rows)
    for i in range(51, 251):
        # Format the number as five digits with leading zeros (e.g., '00051')
        row_id = f"{i:05d}"
        writer.writerow([row_id, "D"])

print("Rows appended successfully!")