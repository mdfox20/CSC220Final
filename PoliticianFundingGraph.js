$(document).ready(function() {
  // all custom jQuery will go here
	$.getJSON("nodes.json", function(data) {
    // console.log(data);
		let polNames = [];
    let fundNames = [];
    $.each(data, function(key,val) {
      if (this.type == "politician") {
        polNames.push(this.name);
      }
      if (this.type == "funding source") {
        fundNames.push(this.name);
      }
    });

		let selPol = $("selPol");
		$.each(polNames, function(index, value) {
			$("#selPol").append("<option>" + value + "</option>");
		});
    let selFundHead = $("selFundSource");
    $.each(fundNames, function(index, value) {
      $("#selFundSource").append("<option>" + value + "</option>");
    });

	});
});


function graphics() {

  document.onload = (function(d3, saveAs, Blob, undefined){
    "use strict";

    // define graphcreator object
    let GraphCreator = function(svg, nodes, edges){
      let thisGraph = this;
          thisGraph.idct = 0;

      thisGraph.nodes = nodes || [];
      thisGraph.edges = edges || [];

      thisGraph.state = {
        selectedNode: null,
        selectedEdge: null,
        mouseDownNode: null,
        mouseDownLink: null,
        justDragged: false,
        justScaleTransGraph: false,
        lastKeyDown: -1,
        shiftNodeDrag: false,
        selectedText: null
      };

      // define arrow markers for graph links
      let defs = svg.append('svg:defs');
      defs.append('svg:marker')
        .attr('name', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', "32")
        .attr('markerWidth', 3.5)
        .attr('markerHeight', 3.5)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

      // define arrow markers for leading arrow
      defs.append('svg:marker')
        .attr('name', 'mark-end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 7)
        .attr('markerWidth', 3.5)
        .attr('markerHeight', 3.5)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

      thisGraph.svg = svg;
      thisGraph.svgG = svg.append("g")
            .classed(thisGraph.consts.graphClass, true);
      let svgG = thisGraph.svgG;


      // svg nodes and edges
      thisGraph.paths = svgG.append("g").selectAll("g");
      thisGraph.circles = svgG.append("g").selectAll("g");

      thisGraph.drag = d3.behavior.drag()
            .origin(function(d){
              return {x: d.x, y: d.y};
            })
            .on("drag", function(args){
              thisGraph.state.justDragged = true;
              thisGraph.dragmove.call(thisGraph, args);
            })
            .on("dragend", function() {
              // todo check if edge-mode is selected
            });

      // listen for key events
      // d3.select(window).on("keydown", function(){
      //   thisGraph.svgKeyDown.call(thisGraph);
      // })
      // .on("keyup", function(){
      //   thisGraph.svgKeyUp.call(thisGraph);
      // });
      svg.on("mousedown", function(d){thisGraph.svgMouseDown.call(thisGraph, d);});
      svg.on("mouseup", function(d){thisGraph.svgMouseUp.call(thisGraph, d);});

      // listen for dragging
      let dragSvg = d3.behavior.zoom()
            .on("zoom", function(){
              // if (d3.event.headEvent.shiftKey){
              //   // TODO  the internal d3 state is still changing
              //   return false;
              // } else{
                thisGraph.zoomed.call(thisGraph);
              // }
              return true;
            })
            .on("zoomstart", function(){
              let ael = d3.select("#" + thisGraph.consts.activeEditId).node();
              if (ael){
                ael.blur();
              }
              d3.select('body').style("cursor", "move");
            })
            .on("zoomend", function(){
              d3.select('body').style("cursor", "auto");
            });

      svg.call(dragSvg).on("dblclick.zoom", null);

      // listen for resize
      window.onresize = function(){thisGraph.updateWindow(svg);};


      // handle delete graph
      d3.select("#delete-graph").on("click", function(){
        thisGraph.deleteGraph(false);
      });
    };

    GraphCreator.prototype.setIdCt = function(idct){
      this.idct = idct;
    };

    GraphCreator.prototype.consts =  {
      selectedClass: "selected",
      connectClass: "connect-node",
      circleGClass: "conceptG",
      graphClass: "graph",
      activeEditId: "active-editing",
      BACKSPACE_KEY: 8,
      DELETE_KEY: 46,
      ENTER_KEY: 13,
      nodeRadius: 50
    };

    /* PROTOTYPE FUNCTIONS */

    GraphCreator.prototype.dragmove = function(d) {
      let thisGraph = this;
      if (thisGraph.state.shiftNodeDrag){
        thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);
      } else{
        d.x += d3.event.dx;
        d.y +=  d3.event.dy;
        thisGraph.updateGraph();
      }
    };

    GraphCreator.prototype.deleteGraph = function(skipPrompt){
      let thisGraph = this,
          doDelete = true;
      if (!skipPrompt){
        doDelete = window.confirm("Press OK to delete this graph");
      }
      if(doDelete){
        thisGraph.nodes = [];
        thisGraph.edges = [];
        thisGraph.updateGraph();
      }
    };

    /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
    GraphCreator.prototype.selectElementContents = function(el) {
      let range = document.createRange();
      range.selectNodeContents(el);
      let sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };


    /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
    GraphCreator.prototype.insertNameLinebreaks = function (gEl, name) {
      let words = name.split(/\s+/g),
          nwords = words.length;
      let el = gEl.append("text")
            .attr("text-anchor","middle")
            .attr("dy", "-" + (nwords-1)*7.5);

      for (let i = 0; i < words.length; i++) {
        let tspan = el.append('tspan').text(words[i]);
        if (i > 0)
          tspan.attr('x', 0).attr('dy', '15');
      }
    };


    // remove edges associated with a node
    GraphCreator.prototype.spliceLinksForNode = function(node) {
      let thisGraph = this,
          toSplice = thisGraph.edges.filter(function(l) {
        return (l.head === node || l.tail === node);
      });
      toSplice.map(function(l) {
        thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
      });
    };

    GraphCreator.prototype.replaceSelectEdge = function(d3Path, edgeData){
      let thisGraph = this;
      d3Path.classed(thisGraph.consts.selectedClass, true);
      if (thisGraph.state.selectedEdge){
        thisGraph.removeSelectFromEdge();
      }
      thisGraph.state.selectedEdge = edgeData;
    };

    GraphCreator.prototype.replaceSelectNode = function(d3Node, nodeData){
      let thisGraph = this;
      d3Node.classed(this.consts.selectedClass, true);
      if (thisGraph.state.selectedNode){
        thisGraph.removeSelectFromNode();
      }
      thisGraph.state.selectedNode = nodeData;
    };

    GraphCreator.prototype.removeSelectFromNode = function(){
      let thisGraph = this;
      thisGraph.circles.filter(function(cd){
        return cd.name === thisGraph.state.selectedNode.name;
      }).classed(thisGraph.consts.selectedClass, false);
      thisGraph.state.selectedNode = null;
    };

    GraphCreator.prototype.removeSelectFromEdge = function(){
      let thisGraph = this;
      thisGraph.paths.filter(function(cd){
        return cd === thisGraph.state.selectedEdge;
      }).classed(thisGraph.consts.selectedClass, false);
      thisGraph.state.selectedEdge = null;
    };

    GraphCreator.prototype.pathMouseDown = function(d3path, d){
      let thisGraph = this,
          state = thisGraph.state;
      d3.event.stopPropagation();
      state.mouseDownLink = d;

      if (state.selectedNode){
        thisGraph.removeSelectFromNode();
      }

      let prevEdge = state.selectedEdge;
      if (!prevEdge || prevEdge !== d){
        thisGraph.replaceSelectEdge(d3path, d);
      } else{
        thisGraph.removeSelectFromEdge();
      }
    };

    // mousedown on node
    GraphCreator.prototype.circleMouseDown = function(d3node, d){
      let thisGraph = this,
          state = thisGraph.state;
      d3.event.stopPropagation();
      state.mouseDownNode = d;
    };

    // mouseup on nodes
    GraphCreator.prototype.circleMouseUp = function(d3node, d){
      let thisGraph = this,
          state = thisGraph.state,
          consts = thisGraph.consts;
      // reset the states
      state.shiftNodeDrag = false;
      d3node.classed(consts.connectClass, false);

      let mouseDownNode = state.mouseDownNode;

      if (!mouseDownNode) return;

      if (mouseDownNode !== d){
        // we're in a different node: create new edge for mousedown edge and add to graph
        let newEdge = {head: mouseDownNode, tail: d};
        let filtRes = thisGraph.paths.filter(function(d){
          if (d.head === newEdge.tail && d.tail === newEdge.head){
            thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
          }
          return d.head === newEdge.head && d.tail === newEdge.tail;
        });
        if (!filtRes[0].length){
          thisGraph.edges.push(newEdge);
          thisGraph.updateGraph();
        }
      } else{
        // we're in the same node
        if (state.justDragged) {
          // dragged, not clicked
          state.justDragged = false;
        } else{
            if (state.selectedEdge){
              thisGraph.removeSelectFromEdge();
            }
            let prevNode = state.selectedNode;

            if (!prevNode || prevNode.name !== d.name){
              thisGraph.replaceSelectNode(d3node, d);
            } else{
              thisGraph.removeSelectFromNode();
            }
        }
      }
      state.mouseDownNode = null;
      return;

    }; // end of circles mouseup

    // mousedown on main svg
    GraphCreator.prototype.svgMouseDown = function(){
      this.state.graphMouseDown = true;
    };

    // mouseup on main svg
    GraphCreator.prototype.svgMouseUp = function(){
      let thisGraph = this,
          state = thisGraph.state;
      if (state.justScaleTransGraph) {
        // dragged not clicked
        state.justScaleTransGraph = false;
      } else if (state.graphMouseDown && d3.event.shiftKey){ //ADDS NODE, CHANGE TO HTML SELECTION
        // clicked not dragged from svg
        let xycoords = d3.mouse(thisGraph.svgG.node()),
            d = {name: "new concept", x: xycoords[0], y: xycoords[1]}; //CHANGE TO CHOOSING NODE WITH MATCHING NAME
        thisGraph.nodes.push(d);
        thisGraph.updateGraph();
      } else if (state.shiftNodeDrag){
        // dragged from node
        state.shiftNodeDrag = false;
        thisGraph.dragLine.classed("hidden", true);
      }
      state.graphMouseDown = false;
    };

    // keydown on main svg
    GraphCreator.prototype.svgKeyDown = function() {
      let thisGraph = this,
          state = thisGraph.state,
          consts = thisGraph.consts;
      // make sure repeated key presses don't register for each keydown
      if(state.lastKeyDown !== -1) return;

      state.lastKeyDown = d3.event.keyCode;
      let selectedNode = state.selectedNode,
          selectedEdge = state.selectedEdge;

      switch(d3.event.keyCode) {
      case consts.BACKSPACE_KEY:
      case consts.DELETE_KEY:
        d3.event.preventDefault();
        if (selectedNode){
          thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
          thisGraph.spliceLinksForNode(selectedNode);
          state.selectedNode = null;
          thisGraph.updateGraph();
        } else if (selectedEdge){
          thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
          state.selectedEdge = null;
          thisGraph.updateGraph();
        }
        break;
      }
    };

    GraphCreator.prototype.svgKeyUp = function() {
      this.state.lastKeyDown = -1;
    };

    // call to propagate changes to graph
    GraphCreator.prototype.updateGraph = function(){

      let thisGraph = this,
          consts = thisGraph.consts,
          state = thisGraph.state;

      thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function(d){
        return String(d.head.name) + "+" + String(d.tail.name);
      });
      let paths = thisGraph.paths;
      // update existing paths
      paths.style('marker-end', 'url(#end-arrow)')
        .classed(consts.selectedClass, function(d){
          return d === state.selectedEdge;
        })
        .attr("d", function(d){
          return "M" + d.head.x + "," + d.head.y + "L" + d.tail.x + "," + d.tail.y;
        });

      // add new paths
      paths.enter()
        .append("path")
        .style('marker-end','url(#end-arrow)')
        .classed("link", true)
        .attr("d", function(d){
          return "M" + d.head.x + "," + d.head.y + "L" + d.tail.x + "," + d.tail.y;
        })
        .on("mousedown", function(d){
          thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
          }
        )
        .on("mouseup", function(d){
          state.mouseDownLink = null;
        });

      // remove old links
      paths.exit().remove();

      // update existing nodes
      thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function(d){ return d.name;});
      thisGraph.circles.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";});

      // add new nodes
      let newGs= thisGraph.circles.enter()
            .append("g");

      newGs.classed(consts.circleGClass, true)
        .attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")";})
        .on("mouseover", function(d){
          if (state.shiftNodeDrag){
            d3.select(this).classed(consts.connectClass, true);
          }
        })
        .on("mouseout", function(d){
          d3.select(this).classed(consts.connectClass, false);
        })
        .on("mousedown", function(d){
          thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
        })
        .on("mouseup", function(d){
          thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
        })
        .call(thisGraph.drag);

      newGs.append("circle")
        .attr("r", String(consts.nodeRadius));

      newGs.each(function(d){
        thisGraph.insertNameLinebreaks(d3.select(this), d.name);
      });

      // remove old nodes
      thisGraph.circles.exit().remove();
    };

    GraphCreator.prototype.zoomed = function(){
      this.state.justScaleTransGraph = true;
      d3.select("." + this.consts.graphClass)
        .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    };

    GraphCreator.prototype.updateWindow = function(svg){
      let docEl = document.documentElement,
          bodyEl = document.getElementsByTagName('body')[0];
      let x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
      let y = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
      svg.attr("width", x).attr("height", y);
    };



    /**** MAIN ****/

    // grab button elements from html
    let addPol = document.querySelector('#addPol');
    let addFundSource = document.querySelector('#addFundSource');

    // Return array of all politican nodes
    function getPolObjs() {
      let polObjs = [];

      // get all politician nodes from JSON of all nodes and push into array
      fetch("nodes.json").then(
         function(data) {
           $.each(data, function(key,val) {
             if (this.type == "politician") {
               polObjs.push(this);
             }
           });
          return polObjs;
         });
    }

    // Return array of all funding source nodes
    function getFundObjs() {
      let fundObjs = [];

      // get all funding source nodes from JSON of all nodes and push into array
      fetch("nodes.json").then(
         function(data) {
           $.each(data, function(key,val) {
             if (this.type == "funding source") {
               fundObjs.push(this);
             }
           });
          return fundObjs;
         });
    }


    // grab drop down menu selected elements from html when add buttons clicked
    let selPol;
    let selFund;

    // when add button for politicans clicked
    addPol.onclick = function(){
      // get name of politician from drop down menu
      selPol = document.getElementById("selPol").value;

      // get politician node with name matching html selected name
      let polObjs = getPolObjs();
      console.log("type of polObjs: ", typeof polObjs);
      console.log("polObjs: ", polObjs);
      let polNode;

      for (pol in polObjs) {
        console.log("pol: ", pol);
        if (pol.name == selPol) {
          polNode = pol;
        }
      }

      //polNode.x = 300;
      //polNode.y = 300;
      console.log("selected politician node: ", polNode)
    };

    // when add button for funding sources clicked
    addFundSource.onclick = function(){
      // get name of funding source from drop down menu
      let selFund = document.getElementById("selFundSource").value;

      // get funding source node with name matching html selected name
      let fundObjs = getFundObjs();

      let fsNode = fundObjs.filter(function(obj) {
        return obj.name == selFund;
      });
      //fsNode.x = 400;
      //fsNode.y = 400;
      console.log("selected funding source node: ", fsNode)
    };


    // warn the user when leaving
    window.onbeforeunload = function(){
      return "Make sure to save your graph locally before leaving :-)";
    };

    let docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];

    let width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
        height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

    let xLoc = width/2 - 25,
        yLoc = 100;

    // initial node data
    let nodes = [{name: "1", x: xLoc, y: yLoc},
                  {name: "2", x: xLoc, y: yLoc + 200}, {name: "3", x: xLoc, y: yLoc + 300}];
    let edges = []; // No edges displayed to begin with


    /** MAIN SVG **/
    let svg = d3.select("body").append("svg")
          .attr("width", width)
          .attr("height", height);
    let graph = new GraphCreator(svg, nodes, edges);
        graph.setIdCt(2);
    graph.updateGraph();
  } )(window.d3, window.saveAs, window.Blob);
}

graphics();
