/** Set up document by displaying options for dropdown menus */
$(document).ready(function() {

	$.getJSON("nodes.json", function(data) {

		// Initialize arrays to store options for dropdown menus
		let polNames = [];
    let fundNames = [];

    $.each(data, function(key,val) {
			// Store all nodes of type "politician" in polNames array
      if ((this.type == "politician") && ($.inArray(this.name, polNames) == -1)) {
        polNames.push(this.name);
      } // Store all nodes of type "funding source" in fundNames array
      if ((this.type == "funding source") && ($.inArray(this.name, fundNames) == -1)) {
        fundNames.push(this.name);
      }
    });

		// Sort arrays alphabetically, so options are organized
		polNames.sort();
		fundNames.sort();

		// Add all politician objects to the politician menu
		let selPol = $("selPol");
		$.each(polNames, function(index, value) {
			$("#selPol").append("<option>" + value + "</option>");
		});

		// Add all funding source options to the funding source menu
    let selFundHead = $("selFundSource");
    $.each(fundNames, function(index, value) {
      $("#selFundSource").append("<option>" + value + "</option>");
    });

	});
});

// Prevent browser from trying to reload page every time a button is pressed

$('#addPol').click(function(e){
    e.preventDefault();
});
$('#addFundSource').click(function(e){
    e.preventDefault();
});
$('#clear').click(function(e){
    e.preventDefault();
});

/** Sets up the graph and provides various methods to update its display */
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
            });

      //listen for key events
      d3.select(window).on("keydown", function(){
        thisGraph.svgKeyDown.call(thisGraph);
      })
      .on("keyup", function(){
        thisGraph.svgKeyUp.call(thisGraph);
      });
      svg.on("mousedown", function(d){thisGraph.svgMouseDown.call(thisGraph, d);});
      svg.on("mouseup", function(d){thisGraph.svgMouseUp.call(thisGraph, d);});

      // listen for dragging
      let dragSvg = d3.behavior.zoom()
            .on("zoom", function(){
              thisGraph.zoomed.call(thisGraph);
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

      // we're in the same node
      if (state.justDragged) {
        // dragged, not clicked
        state.justDragged = false;
      } else{
				// clicked, not dragged
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

			// Delete a node when user selects it, then presses backspace or delete key
      switch(d3.event.keyCode) {
      case consts.BACKSPACE_KEY:
      case consts.DELETE_KEY:
        d3.event.preventDefault();
        if (selectedNode){
          thisGraph.nodes.splice(thisGraph.nodes.indexOf(selectedNode), 1);
					thisGraph.spliceLinksForNode(selectedNode);
          state.selectedNode = null;
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
        })

      // add new paths
      paths.enter()
        .append("path")
        .style('marker-end','url(#end-arrow)')
        .classed("link", true)
        .attr("d", function(d){
          return "M" + d.head.x + "," + d.head.y + "L" + d.tail.x + "," + d.tail.y;
        })
				.attr("stroke-width", function(d) {return d.amount/5000; })
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
			      .append("g")
			      .attr("class", function(d){ return d.type;});

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

		// Adapted from an initial D3 function to add edges
		GraphCreator.prototype.addEdge = function(startNode, endNode, amount) {

			// Draw edge between start node and end node
			let newEdge = {head: startNode, tail: endNode, amount: amount};
			let filtRes = graph.paths.filter(function(endNode){
				if (endNode.head === newEdge.tail && endNode.tail === newEdge.head){
					graph.edges.splice(graph.edges.indexOf(endNode), 1);
				}
				return endNode.head === newEdge.head && endNode.tail === newEdge.tail;
			});
			if (!filtRes[0].length){
				graph.edges.push(newEdge);
				graph.updateGraph();
			}

		}

    // Grab button elements from HTML
    let addPol = document.querySelector('#addPol');
    let addFundSource = document.querySelector('#addFundSource');
		let clear = document.querySelector('#clear');

		// Grab drop down menu selected elements from HTML when add buttons clicked
		let selPol;
		let selFund;

    // Arrays to store all politician nodes and all funding nodes
    let polObjs = [];
    let fundObjs = [];

    // Get all politician nodes from JSON of all nodes and push into array
    fetch("nodes.json").then(function(response){
      if(response.ok){
        response.json().then(function(json){
					let uniqueNodeNames = new Set(); // Keep track of unique nodes to prevent adding same node name twice
          for (let i = 0; i < json.length; i++) {
            if ((json[i].type == "politician") // If a new politician node
					 	&& (!(uniqueNodeNames.has(json[i].name)))) {
              polObjs.push(json[i]); // Add to politician array
							uniqueNodeNames.add(json[i].name);
            } else if (!(uniqueNodeNames.has(json[i].name))) { // If new fund node
              fundObjs.push(json[i]); // Add to funding array
							uniqueNodeNames.add(json[i].name);
            }
          }
        });
      }
    });

    // Get all edges from JSON of all edges
    let allEdges;
    let undisplayedEdges;
    fetch("edges.json").then(function(response){
      if(response.ok){
        response.json().then(function(json){
          allEdges = json;
          undisplayedEdges = allEdges;  // Initially, no edges are displayed
        });
      }
    });

    /** Executes whenever addPol button is clicked. Loads the node and
		    relevant edges of whichever politician user selected */
    addPol.onclick = function(){

			// Get name of politician from drop down menu
      selPol = document.getElementById("selPol").value;

			// Find selected politician
      let polNode;
			let posInList;
      for (let i = 0; i < polObjs.length; i++) { // Loop through polObjs
        if (polObjs[i].name == selPol) {
          polNode = polObjs[i];
					posInList = i;
        }
      }

			/* Check to see if node is already displayed. If it is, don't update
			   its position on the screen */

			let alreadyThere = false;
			for (let i = 0; i < graph.nodes.length; i++) {
				if (graph.nodes[i].name == selPol) {
					alreadyThere = true;
				}
			}

			if (alreadyThere == false) {
	      // Set coordinates to place polNode
				polNode.x = 3000*Math.cos(posInList*2*Math.PI/polObjs.length) - 2500;
	      polNode.y = 3000*Math.sin(posInList*2*Math.PI/polObjs.length) + 500;
			}

			graph.nodes.push(polNode); // Add to list of nodes
			addEdgesForNode(polNode); // Update the edges for this node
			graph.updateGraph(); // Update the display

    };

    /** Executes whenever addFundSource button is clicked. Loads the node and
		    relevant edges of whichever funding source user selected */
    addFundSource.onclick = function(){

      // Get name of funding source from drop down menu
      selFund = document.getElementById("selFundSource").value;

			// Find selected funding source
      let fundNode;
      for (let i = 0; i < fundObjs.length; i++) {
        if (fundObjs[i].name == selFund) {
          fundNode = fundObjs[i];
        }
      }

			/* Check to see if node is already displayed. If it is, don't update
				 its position on the screen */

			let alreadyThere = false;
			for (let i = 0; i < graph.nodes.length; i++) {
				if (graph.nodes[i].name == selFund) {
					alreadyThere = true;
				}
			}

			if (alreadyThere == false) {
	      // Set random coordinates for fundNode
				fundNode.x = Math.random()* 2 * (width + 10) + 10;
				fundNode.y = Math.random() * 2 * (height - 10) + 10;
			}

			graph.nodes.push(fundNode); // Add to list of nodes
			addEdgesForNode(fundNode); // Update edges for this given node
			graph.updateGraph(); // Update display
    }

		/** Executes whenever addFundSource button is clicked. Clears all nodes
		    and edges from the screen. */
		clear.onclick = function() {
			graph.deleteGraph();
			undisplayedEdges = allEdges;
		}

		/** Displays all currently undisplayed edges for a given node. */
		function addEdgesForNode(startNode) {

			let endNode; // Node to draw an edge to
			let endNodesDrawn = []; // End nodes that will be drawn in this function

			// Loop through all edges not currently displayed on screen
			for (let i = 0; i < undisplayedEdges.length; i++) {

				// Case where startNode is politician, find edges to funding sources
				if (undisplayedEdges[i].head == startNode.name) {
					// Search through fundObjs to find the proper endNode for the edge
					for (let j = 0; j < fundObjs.length; j++) {
						if (fundObjs[j].name == undisplayedEdges[i].tail) {
							endNode = fundObjs[j];
							endNode.x = startNode.x+(400*Math.cos(endNodesDrawn.length*Math.PI/10));
							endNode.y = startNode.y+(400*Math.sin(endNodesDrawn.length*Math.PI/10));
							break;
						}
					}

					// Check if endNode is already in nodes list before pushing it
					let nodeInList = false;
					for (let j = 0; j < graph.nodes.length; j++) {
						if (graph.nodes[j].name == endNode.name) {
							nodeInList = true;
						}
					}
					if (!(nodeInList)) {graph.nodes.push(endNode);}

					endNodesDrawn.push(endNode);

					graph.addEdge(startNode, endNode, undisplayedEdges[i].amount);

					/* Remove from undisplayedEdges the edge just added to the display,
					   to prevent the program from unecessarily redrawing edges.
					   This code block from https://stackoverflow.com/questions/5767325/how-do-i-remove-a-particular-element-from-an-array-in-javascript */
					let index = undisplayedEdges.indexOf(undisplayedEdges[i]);
					if (index > -1) {
						undisplayedEdges.splice(index, 1);
						i--; // Array indices have shifted, so we need to decrement loop varialbe
					}

				}

				// Case where startNode is funding source, find edges to politicians
				else if (undisplayedEdges[i].tail == startNode.name) {

					// Search through polObjs to find the proper endNode for this edge
					for (let j = 0; j < polObjs.length; j++) {
						if (polObjs[j].name == undisplayedEdges[i].head) {
							endNode = polObjs[j];
							endNode.x = startNode.x+(400*Math.cos(j));
							endNode.y = startNode.y+(400*Math.sin(j));
							break;
						}
					}

					// Check if node is already in nodes list before pushing it
					let nodeInList = false;
					for (let j = 0; j < graph.nodes.length; j++) {
						if (graph.nodes[j].name == endNode.name) {
							nodeInList = true;
						}
					}
					if (!(nodeInList)) {graph.nodes.push(endNode);}

					endNodesDrawn.push(endNode);

					graph.addEdge(startNode, endNode, undisplayedEdges[i].amount);

					/* Remove from undisplayedEdges the edge just added to the display,
					   to prevent the program from unecessarily redrawing edges.
					   This code block from https://stackoverflow.com/questions/5767325/how-do-i-remove-a-particular-element-from-an-array-in-javascript */
					let index = undisplayedEdges.indexOf(undisplayedEdges[i]);
					if (index > -1) {
						undisplayedEdges.splice(index, 1);
						i--; // Array indices have shifted, so we need to decrement loop varialbe
					}

				}

			}


			// Loop through nodes just drawn
			// If any of those nodes have undrawn edges with a node ALREAY DRAWN, draw the edge

			for (let i=0; i < undisplayedEdges.length; i++) {

				for (let j=0; j < endNodesDrawn.length; j++) {

					// A politician was the endNode; looking for a funding node

					/* If the name of one of the nodes just drawn is equal to the name
					of the head (which will be a politician) of an undisplayed edge
					AND the tail node (a funding source) of that undisplayed edge
					is already displayed */

					// Second line of if-statement from https://stackoverflow.com/questions/8217419/how-to-determine-if-javascript-array-contains-an-object-with-an-attribute-that-e

					if ( endNodesDrawn[j].name == undisplayedEdges[i].head &&
					graph.nodes.filter(e => e.name === undisplayedEdges[i].tail).length > 0 ){

						let startNode = endNodesDrawn[j]; // Starting node will be node just drawn
						let endNode;

						// Ending node will be another node that already is displayed
						for (let k = 0; k < fundObjs.length; k++) {
							if (fundObjs[k].name == undisplayedEdges[i].tail) {
								endNode = fundObjs[k];
								break;
							}
						}

						graph.addEdge(startNode, endNode, undisplayedEdges[i].amount);

						let index = undisplayedEdges.indexOf(undisplayedEdges[i]);
						if (index > -1) {
							undisplayedEdges.splice(index, 1);
							i--; // Array indices have shifted, so we need to decrement loop varialbe
						} // close if

					}

					// A funding source was the endNode; looking for a pol node

					/* If the name of one of the nodes just drawn is equal to the name
					of the tail (which will be a donor) of an undisplayed edge
					AND the head node (a politician) of that undisplayed edge
					is already displayed */

					// Second line of else-if statement from https://stackoverflow.com/questions/8217419/how-to-determine-if-javascript-array-contains-an-object-with-an-attribute-that-e

					else if (endNodesDrawn[j].name == undisplayedEdges[i].tail &&
					graph.nodes.filter(e => e.name === undisplayedEdges[i].head).length > 0 ) {

						let startNode = endNodesDrawn[j]; // Starting node will be node just drawn
						let endNode;

						// Endoing node will be another node that is already displayed
						for (let k = 0; k < polObjs.length; k++) {
							if (polObjs[k].name == undisplayedEdges[i].head) {
								endNode = polObjs[k];
								break;
							}
						}

						graph.addEdge(startNode, endNode, undisplayedEdges[i].amount);

						let index = undisplayedEdges.indexOf(undisplayedEdges[i]);
						if (index > -1) {
							undisplayedEdges.splice(index, 1);
							i--; // Array indices have shifted, so we need to decrement loop varialbe
						}
					}
				}
			}
	 } // close function


    /**** MAIN ****/

    let docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];

    var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
        height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

    // initial node data
    let nodes = []; // No nodes displayed to begin with
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

graphics(); // Set up d3
