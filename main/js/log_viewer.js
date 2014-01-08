/**
 * Created by U on 2013-12-18.
 */

var data;
var linesPerPage = 100;
var maxLines = 0;
var pageNo = 0;
var curPtr = 0;
var dataTable;
var filterMap = [];
var filterExpr;
var filter_loglevel = "";
var filter_msg = "";
var filtered = false;
var logLevels = ["DEBUG","INFO","WARN","ERROR","FATAL"];

$(document).ready( function() {
  dataTable = $("#logTable tbody");
  fetchData();
})

function fetchData() {
  // Make sure Swedish characters get treated with respect ;-)
  // $.ajaxSetup({ scriptCharset: "windows-1252" , contentType: "application/json; charset=windows-1252"});
  $.getJSON("logs/RC.log.json", function(jsonData) {
    data = jsonData;
    console.log("Got data");
    // fixFilter();
    pageNo = 1;
    displayLines(0);
    console.log("All done");
    // plotVideoGraph();
    $("#filter_msg").focus().select();
  });
}

function fixFilter() {
  filter_loglevel = $("#filter_loglevel").val();
  filter_msg = $("#filter_msg").val();
  filter(filter_msg);
  displayLines(0);
  $("#filter_msg").focus().select();
}

function loglevelOK(logLevel, filterLogLevel) {
  var ll1 = jQuery.inArray(logLevel, logLevels);
  var ll2 = jQuery.inArray(filterLogLevel, logLevels);
  return (ll1 >= ll2)
}

// Go to next page
function pageNext() {
  var maxLines = ( filtered ) ? filterMap.length : data.log.length;
  if (curPtr + linesPerPage < maxLines ) {
    pageNo++;
    displayLines(curPtr + linesPerPage);
  }
}

// Go to previous page
function pagePrev() {
  if (curPtr >= linesPerPage) {
    pageNo--;
    displayLines(curPtr - linesPerPage);
  }
}

// Go to specific page
function pageGoTo(pg) {
  var ptr = ( pg - 1 ) * linesPerPage;
  pageNo = pg;
  displayLines(ptr);
}

// Go to the last page
function pageEOF() {
  var lastLine = ( filtered ) ? filterMap.length - 1 : data.log.length - 1;
  var ptr = ( lastLine >= linesPerPage ) ? lastLine - linesPerPage + 1 : 0;
  pageNo = Math.floor( ptr / linesPerPage ) + 1;
  displayLines(ptr);
}

// Go to specific page
function setLinesPerPage(pg) {
  linesPerPage = pg;
  displayLines(curPtr);
}

function clearFilter() {
  filtered = false;
  $("#filter_msg").val("");
  filter_msg = "";
  filter_loglevel = "";
  pageNo=1;
  displayLines(0);
  $("#filter_msg").focus().select();
}

// Plot video related data
function plotVideoGraph() {
  // var filterExpr = new RegExp("(\[video\]\w+([0-9]+))", "i");
  // filterExpr.compile();
  $("#graph").dialog({
    width: 640,
    height: 480,
    title: "Video metrics",
    resizable: false
  });

  var mtrElapsed = [];
  var mtrP2PBps = [];
  var mtrFBBps = [];
  var mtrBufferings = [];
  var colors = ['steelblue', 'orange', 'yellow', '#00ff00'];
  var header =
    [ "Elapsed", "P2PBps", "FallbackBps", "Bufferings" ];


  var sample = 0,
    margin = {top: 5, right: 5, bottom: 15, left: 5},
    w = $("#graph").width() - margin.left - margin.right,
    h = $("#graph").height() - margin.top - margin.bottom;

  d3.select("#TheGraph").remove();

  var max1 = 0, min1;
  for (var pt=0; pt<data.log.length; pt++) {
    var isMatch = data.log[pt].msg.match(/\[video\]\s+([0-9.-]+)/ig);
    if (isMatch) {
      var grp = data.log[pt].msg.match(/([0-9.-]+)/ig);
      /* DEBUG
      var ls = "";
      for (var j=0; j<grp.length; j++) {
        ls += "[" + j + ":" + grp[j] + "] ";
      }
      */
      sample++;
      if (min1 == undefined) { min1 = grp[0] * 1.0; }
      if (grp[0] * 1.0 < min1) { min1 = grp[0] * 1.0; }
      if (grp[0] * 1.0 > max1) max1 = grp[0];
      mtrElapsed.push({x:sample, y:grp[0] * 1.0});
      mtrP2PBps.push({x:sample, y:Math.floor(grp[4]*1.0)});
      mtrFBBps.push({x:sample, y:Math.floor(grp[5]/100.0)});
      mtrBufferings.push({x:sample, y:grp[11]*1.0});
      // console.log(grp[0] + " : " + grp[4] + " : " + Math.floor(grp[5]/100.0) + " : " + grp[11]);
    }
  }
  var parseDate = d3.time.format("%Y-%m-%d").parse;
  var dataSet = [ mtrElapsed, mtrP2PBps, mtrFBBps, mtrBufferings ];

  // Samples per line
  var m = ( sample > 50 ) ? 50 : sample;
  // m = sample;
  var xScale = d3.scale.linear().domain([0, m - 1]).range([margin.left, w]);
  var y1 = d3.scale.linear().domain([min1, max1]).range([h,margin.bottom]);

  // create a line function that can convert data[] into x and y points
  var line1 = d3.svg.line()
    .interpolate("basis")
    // assign the X function to plot our line as we wish
    .x(function(d,i) {
      // verbose logging to show what's actually being done
      // console.log('Plotting X1 value for data point: ' + d.x + ' using index: ' + i + '/' + sample + ' to be at: ' + xScale(d.x) + ' using our xScale.');
      // return the X coordinate where we want to plot this datapoint
      return xScale(d.x);
    })
    .y(function(d) {
      // verbose logging to show what's actually being done
      // console.log('Plotting Y1 value for data point: ' + d.y + ' to be at: ' + y1(d.y) + "/" + h + "/" + max1 + " using our y1 scale.");
      // return the Y coordinate where we want to plot this datapoint
      return y1(d.y);
    });

  // Add an SVG element with the desired dimensions and margin.
  var graph = d3.select("#graph")
    .append("svg")
    .attr("width", w + margin.left + margin.right)
    .attr("height", h + margin.top + margin.bottom)
    .attr("id", "TheGraph");

  graph.append("svg:g")
    .attr("class", "grid")
    .attr("transform", "translate(0," + h + ")")
    .call(make_x_axis(xScale)
      .tickSize(-h, 0, 0)
      .tickFormat(d3.format("0f"))
    );

  graph.append("svg:g")
    .attr("class", "grid")
    .call(make_y_axis(y1)
      .tickSize(-w - margin.left - margin.right, 0, 0)
      .tickFormat("")
    );

  graph.append("svg:path").attr("d", line1(mtrElapsed)).attr("class", "data1")
  graph.append("svg:path").attr("d", line1(mtrP2PBps)).attr("class", "data2");
  graph.append("svg:path").attr("d", line1(mtrFBBps)).attr("class", "data3");
  graph.append("svg:path").attr("d", line1(mtrBufferings)).attr("class", "data4");

  var legend = graph.append("g")
    .attr("class", "legend");

  legend.selectAll('rect')
    .data(dataSet)
    .enter()
    .append("rect")
    .attr("x", w - 95)
    .attr("y", function(d, i){ return i *  20 + 9;})
    .attr("width", 10)
    .attr("height", 10)
    .style("fill", function(d) {
      var color = colors[dataSet.indexOf(d)];
      return color;
    })

  legend.selectAll('text')
    .data(dataSet)
    .enter()
    .append("text")
    .attr("class", "legend-text")
    .attr("x", w - 82)
    .attr("y", function(d, i){ return i *  20 + 19;})
    .style("fill", "white")
    .text(function(d) {
      var text = header[dataSet.indexOf(d)];
      return text;
    });

  // ZOOMING //
  /*
  var zoomSVG = d3.select("#zoomSVG");
  var zoomRect = d3.select("#zoomRect");
  var zoom = d3.behavior.zoom()
    .scaleExtent([Math.pow(2, -2), Math.pow(2,10)])
    .on("zoom", function () {
      thePlot.xScale(xScale).update();
    });

  zoomSVG.attr("width", document.getElementById("chartContainer").offsetWidth)
    .attr("height", plotHeight);

  zoomRect.attr("width", document.getElementById("chartContainer").offsetWidth - margin.left - margin.right)
    .attr("height", plotHeight)
    .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

  zoomRect.attr("fill", "rgba(0,0,0,0)")
    .call(zoom);

  // apply zooming
  xScale = thePlot.xScale();
  yScale = thePlot.yScale();
  zoom.x(xScale);
  zoom.y(yScale);


  // UPDATING LINES //

  function changeLines () {
    thePlot.setSelectedLines().update();
  }

  document.getElementById("render-lines").addEventListener("change", changeLines, false);
  document.getElementById("render-depth").addEventListener("change", changeLines, false);
  document.getElementById("render-method").addEventListener("change", changeLines, false);
  */

  function make_x_axis(xScale) {
    return d3.svg.axis()
      .scale(xScale)
      .orient("bottom")
      .ticks(10)
  }

  function make_y_axis(yScale) {
    return d3.svg.axis()
      .scale(yScale)
      .orient("left")
      .ticks(10)
  }


}

// Inspired by Lee Byron's test data generator.
function bumpLayer(n, o) {

  function bump(a) {
    var x = 1 / (.1 + Math.random()),
      y = 2 * Math.random() - .5,
      z = 10 / (.1 + Math.random());
    for (var i = 0; i < n; i++) {
      var w = (i / n - y) * z;
      a[i] += x * Math.exp(-w * w);
    }
  }

  var a = [], i;
  for (i = 0; i < n; ++i) a[i] = o + o * Math.random();
  for (i = 0; i < 5; ++i) bump(a);
  return a.map(function(d, i) { return {x: i, y: Math.max(0, d)}; });
}


// Takes free-text parameter
function filter(expr) {
  filtered = true;
  filterMap = [];
  filterExpr = new RegExp("("+expr+")", "i");
  console.log("Starting filter...");
  for (var i=0; i < data.log.length; i++) {
    if (expr != "")
      if (data.log[i].msg.search(filterExpr) < 0)
        continue;
    if (filter_loglevel != "")
      if (!loglevelOK(data.log[i].ll, filter_loglevel))
        continue;
    filterMap.push(i);
  }
  pageNo = 1;
  console.log("Filtering done.");
}

function displayLines(start) {
  curPtr = start;
  var lastLine = ( filtered ) ? filterMap.length - 1 : data.log.length - 1;
  var lastPage = Math.floor( ( lastLine + 1 ) / linesPerPage );
  var lp2 = Math.ceil( ( lastLine + 1 ) / linesPerPage );
  if (lp2 > lastPage )
    lastPage++;

  var log_filter_elm = "<select id=\"filter_loglevel\" onChange=\"javascript:fixFilter();\">"
    + "<option " + "value=\"\">-- ANY --</option>";
  $.each(logLevels, function(inx,val) {
    var sel = ( filter_loglevel == val ) ? " selected " : "";
    log_filter_elm += "<option " + sel + " value=\"" + val + "\">" + val + "+</option>"
  });
  log_filter_elm += "</select>";

  var msg_filter_elm = "<input value=\"" + filter_msg + "\" id=\"filter_msg\" maxlength='30' size='10' onChange=\"javascript:fixFilter();\">"

  // var html = "<tbody class=\"hive\">"
  var html = ""
    + "<tr class=\"big\">"
    + "<th>#"
    + "<br/><span class=\"lineNumber\" id=\"linesFrom\" />"
    + "<br/><span class=\"lineNumber\" id=\"linesTo\" />"
    + "</th>"
    + "<th class=\"tsheader\"><button id=\"prevPage\">&lt;</button>" + pageNo + "<button id=\"nextPage\">&gt;</button>"
    + "&nbsp;<button id=\"eofPage\">&gt;&gt;</button>"
    + "<br/><div id=\"tslide\" style=\"margin-top: 5px;\"></div>"
    + "<br/><div id=\"pslide\" style=\"margin-top: 5px;\"></div>"
    + "</th>"
    + "<th>Thread</th>"
    + "<th>LogLevel</th>"
    + "<th>Class</th>"
    + "<th>Message</th>"
    + "</tr>"
    + "<tr>"
    + "<th></th>"
    + "<th></th>"
    + "<th></th>"
    + "<th>" + log_filter_elm + "</th>"
    + "<th></th>"
    + "<th>" + msg_filter_elm
    + "&nbsp;<button id=\"clearFilter\">Clear</button>"
    + "&nbsp;<button id=\"plotVideo\">Plot Video</button>"
    + "</th>"
    + "</tr>";

  var onGuidClick = "onClick=\"alert('This would take you to the associated GUID log.');\"";
  for (var offset=0; offset<linesPerPage; offset++) {
    var lineNo = start + offset;
    if (lineNo >= data.log.length)
      break; // We've reached EOF
    if (filtered) {
      if (lineNo >= filterMap.length)
        break; // We've reached EOF
      lineNo = filterMap[lineNo];
    }

    // var dt = new Date( Date(data.log[lineNo].ts ));
    var dt = new Date( data.log[lineNo].ts / 1 );
    var ltime = dt.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
    // Highlight GUIDs
    var msg = data.log[lineNo].msg.replace(/(guid[:= ]*)([0-9a-f]{20,})/ig, "$1\<span " + onGuidClick + " class=\"highlight-guid\"\>$2\<\/span\>");
    // Highlight search hits
    if (filtered)
      msg = msg.replace(filterExpr, "\<span class=\"highlight-text\"\>$1\<\/span\>");

    html += "<tr class=\"log-" + data.log[lineNo].ll.toLowerCase() + "\">"
      + "<td>" + (lineNo+1) + "</td>"
      + "<td>" + ltime[1] + " " + ltime[2] + "</td>"
      + "<td>" + data.log[lineNo].th + "</td>"
      + "<td>" + data.log[lineNo].ll + "</td>"
      + "<td>" + data.log[lineNo].cl + "</td>"
      + "<td>" + msg + "</td>"
      + "</tr>";
  }
  // html += "</tbody>";
  // return;
  dataTable.html(html);

  $("#linesFrom").text(start+1);
  $("#linesTo").text(start+linesPerPage);

  $("#tslide").slider( { value: pageNo, min: 1, max: lastPage, orientation: "horizontal",
      change: function(event, ui) {
        pageGoTo(ui.value);
      }
    });
  $("#pslide").slider( { value: linesPerPage, min: 1, max: 1000, orientation: "horizontal",
    change: function(event, ui) {
      setLinesPerPage(ui.value);
    }
  });
  $("#nextPage").click(
    function() { pageNext(); }
  );
  $("#prevPage").click(
    function() { pagePrev(); }
  );
  $("#eofPage").click(
    function() { pageEOF(); }
  );
  $("#clearFilter").click(
    function() { clearFilter(); }
  );
  $("#plotVideo").click(
    function() { plotVideoGraph(); }
  );
}


