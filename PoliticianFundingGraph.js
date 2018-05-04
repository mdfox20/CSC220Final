// Set up document by displaying options for dropdown menus
$(document).ready(function() {
	$.getJSON("nodes.json", function(data) {
		let polNames = [];
    let fundNames = [];
    $.each(data, function(key,val) {
      if ((this.type == "politician") && ($.inArray(this.name, polNames) == -1)) {
        polNames.push(this.name);
      }
      if ((this.type == "funding source") && ($.inArray(this.name, fundNames) == -1)) {
        fundNames.push(this.name);
      }
    });
		polNames.sort();
		fundNames.sort();
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


    // ADDED CODE BLOCKS //


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
					// Keep track of unique nodes to prevent adding same node name twice
					let uniqueNodeNames = new Set();
          for (let i = 0; i < json.length; i++) {
            if ((json[i].type == "politician") // If a new politician node
					 	&& (!(uniqueNodeNames.has(json[i].name)))) {
              polObjs.push(json[i]);
							uniqueNodeNames.add(json[i].name);
            } else if (!(uniqueNodeNames.has(json[i].name))) { // If new fund node
              fundObjs.push(json[i]);
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

    // Executes whenever addPol button is clicked
    addPol.onclick = function(){
			// Get name of politician from drop down menu
      selPol = document.getElementById("selPol").value;

			// Make sure node isn't already displayed
			let alreadyThere = false;

			for (let i = 0; i < nodes.length; i++) {
				if (nodes[i].name == selPol) {
					alreadyThere = true;
				}
			}

      let polNode;
      // Find selected politician
      for (let i = 0; i < polObjs.length; i++) {
        if (polObjs[i].name == selPol) {
          polNode = polObjs[i];
        }
      }

			if (alreadyThere == false) {
	      // Set coordinates to place polNode
				polNode.x = 3000*Math.cos(nodes.length) - 2500;
	      polNode.y = 3000*Math.sin(nodes.length) + 500;
			}

			nodes.push(polNode); // Add to list of nodes
			updateEdges(polNode); // Update the edges for this node
			graph.updateGraph(); // Update the display

    };

    // Executes whenever addFundSource button is clicked
    addFundSource.onclick = function(){

      // Get name of funding source from drop down menu
      selFund = document.getElementById("selFundSource").value;

			// Make sure node isn't already displayed
			let alreadyThere = false;

			for (let i = 0; i < nodes.length; i++) {
				if (nodes[i].name == selFund) {
					alreadyThere = true;
				}
			}

      let fundNode;
      // Find selected funding source
      for (let i = 0; i < fundObjs.length; i++) {
        if (fundObjs[i].name == selFund) {
          fundNode = fundObjs[i];
        }
      }

			if (alreadyThere == false) {
	      // Set random coordinates for fundNode
				fundNode.x = Math.random()* 2 * (width + 10) + 10;
				fundNode.y = Math.random() * 2 * (height - 10) + 10;
			}

			nodes.push(fundNode); // Add to list of nodes
			updateEdges(fundNode); // Update edges for this given node
			graph.updateGraph(); // Update display
    }

    // Executes whenever clear button is clicked
		clear.onclick = function() {

			// Clear nodes and edges from d3 variables
			nodes.length = 0;
			edges.length = 0;

			// Now reload the edges from JSON and reset edge variables
			fetch("edges.json").then(function(response){
				if(response.ok){
					response.json().then(function(json){
						allEdges = json;
						undisplayedEdges = allEdges;  // Initially, no edges are displayed
					});
				}
			});

			graph.updateGraph(); // Update display

		}

		// Displays all currently undisplayed edges for a given node
		function updateEdges(startNode) {

			let endNode; // Node to draw an edge to

			let endNodesDrawn = []; // End nodes that will be drawn in this function

			// Loop through all edges not currently displayed on screen
			for (let i = 0; i < undisplayedEdges.length; i++) {

				/* If the current node is the "head" of this edge, it is a pol node,
				   because all head nodes in edges.json are politicians */
				if (undisplayedEdges[i].head == startNode.name) {

					// Search through fundObjs to find the proper endNode for the edge
					for (let j = 0; j < fundObjs.length; j++) {
						if (fundObjs[j].name == undisplayedEdges[i].tail) {
							endNode = fundObjs[j];
							endNode.x = startNode.x+(400*Math.cos(j));
							endNode.y = startNode.y+(400*Math.sin(j));
							break;
						}
					}

					// Check if endNode is already in nodes list before pushing it
					let nodeInList = false;
					for (let j = 0; j < nodes.length; j++) {
						if (nodes[j].name == endNode.name) {
							nodeInList = true;
						}
					}
					if (!(nodeInList)) {
						nodes.push(endNode);
					}

					// Adapted from d3 function to add edges
					// Draw edge between start node and end node
					let newEdge = {head: startNode, tail: endNode, amount: undisplayedEdges[i].amount};
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

					endNodesDrawn.push(endNode);

					/* Remove from undisplayedEdges the edge just added to the display,
					   to prevent the program from unecessarily redrawing edges.
					   This code block from https://stackoverflow.com/questions/5767325/how-do-i-remove-a-particular-element-from-an-array-in-javascript */
					let index = undisplayedEdges.indexOf(undisplayedEdges[i]);
					if (index > -1) {
						undisplayedEdges.splice(index, 1);
						i--; // Array indices have shifted, so we need to decrement loop varialbe
					}


				} // close if-statement

				/* If the current node is the "tail" of this edge, it is a fund node,
					 because all tail nodes in edges.json are funding sources */
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
					for (let j = 0; j < nodes.length; j++) {
						if (nodes[j].name == endNode.name) {
							nodeInList = true;
						}
					}
					if (!(nodeInList)) {
						nodes.push(endNode);
					}

					// Adapted from d3 function to add edges
					// Draw edge between start node and end node
					let newEdge = {head: startNode, tail: endNode, amount: undisplayedEdges[i].amount};
					let filtRes = graph.paths.filter(function(endNode){
						if (endNode.head === newEdge.tail && endNode.tail === newEdge.head){
							graph.edges.splice(graph.edges.indexOf(endNode), 1);
						} // close if-statement
						return endNode.head === newEdge.head && endNode.tail === newEdge.tail;
					}); // close filtRes
					if (!filtRes[0].length){
						graph.edges.push(newEdge);
						graph.updateGraph();
					} // close if-statement

					endNodesDrawn.push(endNode);

					/* Remove from undisplayedEdges the edge just added to the display,
					   to prevent the program from unecessarily redrawing edges.
					   This code block from https://stackoverflow.com/questions/5767325/how-do-i-remove-a-particular-element-from-an-array-in-javascript */
					let index = undisplayedEdges.indexOf(undisplayedEdges[i]);
					if (index > -1) {
						undisplayedEdges.splice(index, 1);
						i--; // Array indices have shifted, so we need to decrement loop varialbe
					} // close if

				} // close else

			} // close for loop


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
					nodes.filter(e => e.name === undisplayedEdges[i].tail).length > 0 ){

						let startNode = endNodesDrawn[j]; // Starting node will be node just drawn
						let endNode = [];

						// Ending node will be another node that already is displayed
						for (let k = 0; k < fundObjs.length; k++) {
							if (fundObjs[k].name == undisplayedEdges[i].tail) {
								endNode = fundObjs[k];
								break;
							}
						}

						// Add the edge
						let newEdge = {head: startNode, tail: endNode, amount: undisplayedEdges[i].amount};
						let filtRes = graph.paths.filter(function(endNode){
							if (endNode.head === newEdge.tail && endNode.tail === newEdge.head){
								graph.edges.splice(graph.edges.indexOf(endNode), 1);
							} // close if-statement
							return endNode.head === newEdge.head && endNode.tail === newEdge.tail;
						}); // close filtRes
						if (!filtRes[0].length){
							graph.edges.push(newEdge);
							graph.updateGraph();
						} // close if-statement

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
					nodes.filter(e => e.name === undisplayedEdges[i].head).length > 0 ) {

						let startNode = endNodesDrawn[j]; // Starting node will be node just drawn
						let endNode = [];

						// Endoing node will be another node that is already displayed
						for (let k = 0; k < polObjs.length; k++) {
							if (polObjs[k].name == undisplayedEdges[i].head) {
								endNode = polObjs[k];
								break;
							}
						}

						// Add the edge
						let newEdge = {head: startNode, tail: endNode, amount: undisplayedEdges[i].amount};
						let filtRes = graph.paths.filter(function(endNode){
							if (endNode.head === newEdge.tail && endNode.tail === newEdge.head){
								graph.edges.splice(graph.edges.indexOf(endNode), 1);
							} // close if-statement
							return endNode.head === newEdge.head && endNode.tail === newEdge.tail;
						}); // close filtRes
						if (!filtRes[0].length){
							graph.edges.push(newEdge);
							graph.updateGraph();
						} // close if-statement

						let index = undisplayedEdges.indexOf(undisplayedEdges[i]);
						if (index > -1) {
							undisplayedEdges.splice(index, 1);
							i--; // Array indices have shifted, so we need to decrement loop varialbe
						} // close if

					}


				} // close j loop

			} // close i loop


	 } // close function


    /**** MAIN ****/

    // warn the user when leaving
    window.onbeforeunload = function(){
    	return "Make sure to save your graph locally before leaving :-)";
    };

    let docEl = document.documentElement,
        bodyEl = document.getElementsByTagName('body')[0];

    var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
        height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

    // initial node data
    let nodes = [];
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
