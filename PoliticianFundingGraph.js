
//Constructor for politician node
function Politician(name, fundingMap) {
  this.name = name;
  this.fundingMap = fundingMap; //map of funding sources and $ amount received

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


//Master lists of politicians and funding sources
let politicians = [];
let fundingSources = [];
