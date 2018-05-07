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
  # Remove unneccesary columns from csv 
  with open(fname,'r') as allcols:
      reader = csv.reader(allcols)
      with open(f'{fname.replace(".csv", "")}_fixed.csv','w') as finalcols:
        writer = csv.writer(finalcols)
        numrows = 0;
        for row in reader:
          numrows += 1
          if numrows < 22:
            writer.writerow( (row[3], row[4]))
          else:
            break

        finalcols.close()
        allcols.close()

  csvfile = open(f'{fname.replace(".csv", "")}_fixed.csv', 'r')

  fieldnames = ("name","amount")
  reader = csv.DictReader(csvfile, fieldnames)
  next(reader); # Skip header row

  # Add politician to nodes.json
  name = fname.replace(".csv", "").replace("_", " ").title()
  json.dump({"name": name, "type": "politician"}, nodesjson) 
  for row in reader:
    # Add funding sources to nodes.json
    nodesjson.write(',\n')
    json.dump({"name": row.get("name"), "type": "funding source"}, nodesjson)

    # Add edges to edges.json
    json.dump({"head": name, "tail": row.get("name"), "amount": row.get("amount")}, edgesjson)
    edgesjson.write(',\n')

  # Add a comma as long as it isn't going after the last node
  if (fname != fnames[len(fnames)-1]):
    nodesjson.write(',\n')

  csvfile.close()
  os.remove(f'{fname.replace(".csv", "")}_fixed.csv')

# Fix some minor formatting issues
nodesjson.write("\n]")
nodesjson.close()

edgesjson.write("]")

edgesjson = open('edges.json', 'r')
edgesstr = edgesjson.read()
i = edgesstr.rfind(",")

edgesjson = open('edges.json', 'w')
edgesjson.write(edgesstr[:i] + edgesstr[i+1:])

edgesjson.close()
