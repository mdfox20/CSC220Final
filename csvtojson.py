import csv
import json
import glob

# Get all CSV files
fnames = glob.glob("*.csv")

jsonfile = open('nodes.json', 'w')
jsonfile.write("[")

# Loop through all CSV files
for fname in fnames: 
  # Remove unneccesary columns from csv and add additional funding source column
  with open(fname,'r') as source:
      reader = csv.reader(source)
      with open(f'{fname.replace(".csv", "")}_fixed.csv','w') as result:
        writer = csv.writer(result)
        for row in reader:
          writer.writerow( (row[3], row[4], "funding source"))
          
        result.close()
        source.close()

  # Convert CSV to JSON
  csvfile = open(f'{fname.replace(".csv", "")}_fixed.csv', 'r')

  fieldnames = ("name","amountDonated", "type")
  reader = csv.DictReader(csvfile, fieldnames)
  next(reader); # Skip header row

  name = fname.replace(".csv", "").replace("_", " ").title()
  json.dump({"name": name, "type": "politician"}, jsonfile) # Add politician node
  
  for row in reader:
    jsonfile.write(',\n')
    json.dump(row, jsonfile)

  if (fname != fnames[len(fnames)-1]):
    jsonfile.write(',\n')
    
  csvfile.close()
  
jsonfile.write("\n]")
jsonfile.close()

