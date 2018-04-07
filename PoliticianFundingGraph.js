
// Array of all filenames will go in here
let nameArr = ["paul_ryan"];

// Loop through list of files, and open each one
for (let i = 0; i < nameArr.length; i++){
  let fileName = nameArr[i] + ".csv";
  $(document).ready(function() { // Code from https://stackoverflow.com/questions/7431268/how-to-read-data-from-csv-file-using-javascript
      $.ajax({
          type: "GET",
          url: fileName,
          dataType: "text",
          success: function(fileName) {processData(fileName);}
       });
  });
}

function processData(csv_text) { // Code from https://stackoverflow.com/questions/7431268/how-to-read-data-from-csv-file-using-javascript/12289296#12289296
  let data = $.csv.toObjects(csv_text); // Changed from original var to let
  console.log(data);
}

//Constructor for politician node
function Politician(name, fundingMap) {
  this.name = name;
  this.fundingMap = findFundingSource(this, fundingMap); //map of funding sources (key) and amount of $ given (value)

  politicians.push(this);
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

//Master lists of politicians and funding sources
let politicians = [];
let fundingSources = [];
