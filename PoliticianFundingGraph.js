/* Maybe change the way we read in files later? Ideally, it might be better
   to be able to just grab all the files within a directory, rather than
  having to list each one? */
/* May have a JSON file that only contains the name of each politician and
   their CSV file name. Then we could just loop through entires in the JSON
   file instead of having to hard-code everything. */

// All file names will go in here (for now)
let nameArr = ["paul_ryan"];

// All Politician objects (extracted from files) will go here
let politicians = [];

// All funding sources (extracted from Politician objects) will go here
let fundingSources = [];

// Loop through list of files, open each one, and process each one
for (let i = 0; i < nameArr.length; i++){
  let fileName = nameArr[i] + ".csv";
  $(document).ready(function() { // This code block from https://stackoverflow.com/questions/7431268/how-to-read-data-from-csv-file-using-javascript
      $.ajax({
          type: "GET",
          url: fileName,
          dataType: "text",
          success: function(fileName) {processData(fileName, nameArr[i]);}
       });
  });
}

// Process the data for one politician
function processData(csv_text, person_name) { // Based off code from https://stackoverflow.com/questions/7431268/how-to-read-data-from-csv-file-using-javascript/12289296#12289296

  // Converts CSV string into array of objects
  let arrLines = $.csv.toObjects(csv_text);

  // Build map of companies -> amount donated
  let map = new Map();
  for (let i = 0; i < arrLines.length; i++){
    map.set(arrLines[i].ultorg, arrLines[i].total);
  }

  // Add new Politician object to list, using their name and contribution map
  politicians.push(new Politician(person_name, map));

  console.log(politicians.length);

}

//Constructor for politician node
function Politician(name, fundingMap) {
  this.name = name;
  this.fundingMap = findFundingSource(this, fundingMap); //map of funding sources (key) and amount of $ given (value)
  // politicians.push(this); // Took this out for now because I added it to array earlier -Hannah
}

//Constructor for funding source node
function FundingSource(name) {
  this.name = name;
  this.politiciansList = []; //list of politicians funded

  fundingSources.push(this);

  //adds a politician to the funding source's list of politicians funded
  this.addPolitician = function(politician) {
    this.politiciansList.push(politician);
  }
}

//Given a politician, identify if all funding source objects exist yet, and if not, create and add them to master list
function findFundingSource(politician, fundingMap) {
  //loop through current funding map
  for (let [source, amount] of fundingMap) {
    let found = false; //variable to keep track of if funding source object found
    //look through list of all funding source objects
    for (let fs of fundingSources) {
      //if funding source object already exists for source, update its politician list
      if (source == fs.name) {
        found = true;
        fs.addPolitician(politician);
        fundingMap.set(fs, amount); //update map so key is funding source object

        return fundingMap;
      }
    }
    //if funding source object doesn't exist for source, make one
    if (found == false) {
      let fs = new FundingSource(source);
      fs.addPolitician(politician);
      fundingMap.set(fs, amount); //update map so key is funding source object

      return fundingMap;
    }
  }
}
