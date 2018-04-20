import csv
import json

# Remove unneccesary columns from csv
with open('paul_ryan.csv','r') as source:
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
  for row in reader:
    json.dump(row, jsonfile)
    jsonfile.write(', \n')
  jsonfile.write("]")

  csvfile.close()
  jsonfile.close()

# Remove trailing comma
with open('nodes.json', 'r') as fwithcomma:
  strcomma = fwithcomma.read()
  i = strcomma.rfind(",")
  print(i)
  strnocomma = strcomma[:i] + strcomma[i+1:]
  print(strnocomma)
  with open('nodes.json', 'w') as fnocomma:
    fnocomma.write(strnocomma)

    fwithcomma.close()
    fnocomma.close()
    
  
