$(document).ready(function() {
    // all custom jQuery will go here
	  $.getJSON("nodes.json", function(data) {
      // console.log(data);
		let polvals = [];
    let fundvals = [];
    $.each(data, function(key,val) {
      if (this.type == "politician") {
        polvals.push(this.name);
      }
      if (this.type == "funding head") {
        fundvals.push(this.name);
      }
    });

		let selPol = $("selPol");
		$.each(polvals, function(index, value) {
			$("#selPol").append("<option>" + value + "</option>");
		});
    let selFundHead = $("selFundHead");
    $.each(fundvals, function(index, value) {
      $("#selFundHead").append("<option>" + value + "</option>");
    });

	});
});

function loadData() {

  // (This code block taken from Mozilla search tutorial)

  // Use fetch to retrieve JSON file
  // fetch('nodes.json').then(function(response) {
  //   if(response.ok) {
  //     response.json().then(function(json) {
  //       nodes = json;
  //     });
  //   } else { // If retrieval of JSON file fails, print error message
  //     console.log('Network request for nodes.json failed with response ' + response.status + ': ' + response.statusText);
  //   }
  // });
  //
  // // Use fetch to retrieve JSON file
  // fetch('edges.json').then(function(response) {
  //   if(response.ok) {
  //     response.json().then(function(json) {
  //       edges = json;
  //     });
  //   } else { // If retrieval of JSON file fails, print error message
  //     console.log('Network request for edges.json failed with response ' + response.status + ': ' + response.statusText);
  //   }
  // });

}


function graphics() {

  // loadData();

  // Add options to HTML dropdown menu based on nodes

  // Assumed format of node: [name, type (pol or comp), party (if pol)]
  // Type can either be "Politician" or "Donor"

  // Grab the dropdown menu elements from HTML
  // let selectPol = document.querySelector('#selPol');
  // let selectFundHead = document.querySelector('#selFundHead');
  //
  // // Loop through the nodes and add to appropriate menu
  // // Based on https://stackoverflow.com/questions/17730621/how-to-dynamically-add-options-to-an-existing-select-in-vanilla-javascript
  // for (let i = 0; i < nodes.length; i++) {
  //   if (nodes[i].type === "Politician") {
  //     selectPol.options[selectPol.options.length] = new Option(nodes[i].name, nodes[i].name);
  //   } else { // Otherwise it's a donor node
  //     selectFundHead.options[selectFundHead.options.length] = new Option(nodes[i].name, nodes[i].name);
  //   }
  // }

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
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', "32")
        .attr('markerWidth', 3.5)
        .attr('markerHeight', 3.5)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5');

      // define arrow markers for leading arrow
      defs.append('svg:marker')
        .attr('id', 'mark-end-arrow')
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

      // // displayed when dragging between nodes
      // thisGraph.dragLine = svgG.append('svg:path')
      //       .attr('class', 'link dragline hidden')
      //       .attr('d', 'M0,0L0,0')
      //       .style('marker-end', 'url(#mark-end-arrow)');

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
              //if (!d3.event.headEvent.shiftKey) d3.select('body').style("cursor", "move");
            })
            .on("zoomend", function(){
              d3.select('body').style("cursor", "auto");
            });

      svg.call(dragSvg).on("dblclick.zoom", null);

      // listen for resize
      window.onresize = function(){thisGraph.updateWindow(svg);};

      // handle download data
      d3.select("#download-input").on("click", function(){
        let saveEdges = [];
        thisGraph.edges.forEach(function(val, i){
          saveEdges.push({head: val.head.id, tail: val.tail.id});
        });
        let blob = new Blob([window.JSON.stringify({"nodes": thisGraph.nodes, "edges": saveEdges})], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "mydag.json");
      });


      // handle uploaded data
      d3.select("#upload-input").on("click", function(){
        document.getElementById("hidden-file-upload").click();
      });
      d3.select("#hidden-file-upload").on("change", function(){
        if (window.File && window.FileReader && window.FileList && window.Blob) {
          let uploadFile = this.files[0];
          let filereader = new window.FileReader();

          filereader.onload = function(){
            let txtRes = filereader.result;
            // TODO better error handling
            try{
              let jsonObj = JSON.parse(txtRes);
              thisGraph.deleteGraph(true);
              thisGraph.nodes = jsonObj.nodes;
              thisGraph.setIdCt(jsonObj.nodes.length + 1);
              let newEdges = jsonObj.edges;
              newEdges.forEach(function(e, i){
                newEdges[i] = {head: thisGraph.nodes.filter(function(n){return n.id == e.head;})[0],
                            tail: thisGraph.nodes.filter(function(n){return n.id == e.tail;})[0]};
              });
              thisGraph.edges = newEdges;
              thisGraph.updateGraph();
            }catch(err){
              window.alert("Error parsing uploaded file\nerror message: " + err.message);
              return;
            }
          };
          filereader.readAsText(uploadFile);

        } else {
          alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
        }

      });

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
        return cd.id === thisGraph.state.selectedNode.id;
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

            if (!prevNode || prevNode.id !== d.id){
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
      } else if (state.graphMouseDown && d3.event.shiftKey){
        // clicked not dragged from svg
        let xycoords = d3.mouse(thisGraph.svgG.node()),
            d = {id: thisGraph.idct++, name: "new concept", x: xycoords[0], y: xycoords[1]};
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
        return String(d.head.id) + "+" + String(d.tail.id);
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
      thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function(d){ return d.id;});
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
    let nodes = [{name: "1", id: 0, x: xLoc, y: yLoc},
                 {name: "2", id: 1, x: xLoc, y: yLoc + 200}, {name: "3", id: 2, x: xLoc, y: yLoc + 300}];
    let edges = [{head: nodes[1], tail: nodes[0]}];


    /** MAIN SVG **/
    let svg = d3.select("body").append("svg")
          .attr("width", width)
          .attr("height", height);
    let graph = new GraphCreator(svg, nodes, edges);
        graph.setIdCt(2);
    graph.updateGraph();
  })(window.d3, window.saveAs, window.Blob);
}

graphics();
