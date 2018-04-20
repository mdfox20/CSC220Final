import csv
import json

fname = "paul_ryan.csv"

# Remove unneccesary columns from csv
with open(fname,'r') as source:
    reader = csv.reader(source)
    with open('paul_ryan_fixed.csv','w') as result:
      writer = csv.writer(result)
      for r in reader:
        writer.writerow( (r[3], r[4], "funding source"))
        
      result.close()
      source.close()

# Convert CSV to JSON
csvfile = open('paul_ryan_fixed.csv', 'r')

fieldnames = ("name","amountDonated", "type")
reader = csv.DictReader(csvfile, fieldnames)
next(reader);

with open('nodes.json', 'w') as jsonfile:
  jsonfile.write("[")

  name = fname.replace(".csv", "").replace("_", " ").title()
  json.dump({"name": name, "type": "politician"}, jsonfile)
  
  for row in reader:
    jsonfile.write(',\n')
    json.dump(row, jsonfile)
  
  jsonfile.write("\n]")

  csvfile.close()
  jsonfile.close()
