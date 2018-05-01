import csv
import json
import glob
import os

# Get all CSV files
fnames = glob.glob("*.csv")

# Start nodes json file
nodesjson = open('nodes.json', 'w')
nodesjson.write("[")

# Start edges json file
edgesjson = open('edges.json', 'w')
edgesjson.write("[")

# Loop through all CSV files
for fname in fnames:
  # Remove unneccesary columns from csv and add additional funding source column
  with open(fname,'r') as allcols:
      reader = csv.reader(allcols)
      with open(f'{fname.replace(".csv", "")}_fixed.csv','w') as finalcols:
        writer = csv.writer(finalcols)
        for row in reader:
          writer.writerow( (row[3], row[4]))

        finalcols.close()
        allcols.close()

  # Convert CSV to JSON
  csvfile = open(f'{fname.replace(".csv", "")}_fixed.csv', 'r')

  fieldnames = ("name","amount")
  reader = csv.DictReader(csvfile, fieldnames)
  next(reader); # Skip header row

  name = fname.replace(".csv", "").replace("_", " ").title()
  json.dump({"name": name, "type": "politician"}, nodesjson) # Add politician node

  for row in reader:
    nodesjson.write(',\n')
    json.dump({"name": row.get("name"), "type": "funding source"}, nodesjson)

    json.dump({"head": name, "tail": row.get("name"), "amount": row.get("amount")}, edgesjson)
    edgesjson.write(',\n')

  if (fname != fnames[len(fnames)-1]):
    nodesjson.write(',\n')

  csvfile.close()
  os.remove(f'{fname.replace(".csv", "")}_fixed.csv')

nodesjson.write("\n]")
nodesjson.close()

edgesjson.write("]")

edgesjson = open('edges.json', 'r')
edgesstr = edgesjson.read()
i = edgesstr.rfind(",")

edgesjson = open('edges.json', 'w')
edgesjson.write(edgesstr[:i] + edgesstr[i+1:])

edgesjson.close()
