/**
 * Created by U on 2013-12-18.
 */

var data = [];
var linesPerPage = 100;
var maxLines = 0;
var pageNo = 0;
var curPtr = 0;
var dataTable;
var filterMap = [];
var filterExpr1;
var filter_loglevel = "";
var filter_msg = "";
var filter_mod = "";
var filtered = false;
var logLevels = ["DEBUG","INFO","PROGRESS","WARN","MINOR","MAJOR","CRITICAL"];

$(document).ready( function() {
  dataTable = $("#logTable tbody");
  fetchData();
})

function fetchData() {
  $.get("logs/algRun.log", function(rawdata) {
    console.log("Got data");
    // fixFilter();
    pageNo = 1;
    var lines = rawdata.split("\n").reverse();
    //var re = new RegExp('([0-9]+)\ +([0-9]{2}:[0-9]{2}:[0-9]{2}):\ +([^ ]+)\ +\(([A-Za-z]+)\)\ +\-\ +(.*)');
    var re = new RegExp('([0-9]+)\\s+([0-9]{2}:[0-9]{2}:[0-9]{2}):\\s+([^ ]+)\ +\\(([^\\)]+)\\)\\s+-\\s+(.*)');
    
    for (var i=0; i<lines.length; i++) {
      var flds = re.exec(lines[i]);
      if (flds != null) {
        data.push({module: flds[3], msg: flds[5], date: flds[1], time: flds[2], severity: flds[4]});
      }
      
    }
    console.log("All done");
    console.log("DATA ROWS: " + lines.length);
    console.log("LOG ROWS: " + data.length);
    console.log(lines[25]);
    console.log(data[25].msg);
    displayLines(0);
    // plotVideoGraph();
    $("#filter_msg").focus().select();
  });
}

function fixFilter() {
  filter_loglevel = $("#filter_loglevel").val();
  filter_msg = $("#filter_msg").val();
  filter_mod = $("#filter_mod").val();
  filter(filter_msg, filter_mod);
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
  var maxLines = ( filtered ) ? filterMap.length : data.length;
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
  var lastLine = ( filtered ) ? filterMap.length - 1 : data.length - 1;
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
  filter_mod = "";
  filter_loglevel = "";
  pageNo=1;
  displayLines(0);
  $("#filter_msg").focus().select();
}

// Plot video related data
function plotVideoGraph() {
  // var filterExpr = new RegExp("(\[video\]\w+([0-9]+))", "i");
  // filterExpr.compile();
  var ww = $( window ).width()-30;
  var hh = $( window ).height()-30;
  $("#graph").dialog({
    width: ww,
    height: hh,
    title: "Video metrics",
    resizable: false
  });

  /*
  P2P avg down rate
  Fallback avg down rate
  total bufferings
  prefetch
  p2p Time
  Fallback Time
  fallback down size
  P2P down size
  playback buffer size
  bitrate

  0: elapsed
  1: agentTime
  2: p2pTime
  3: 0
  4: videoP2PAvgBps * 0.008D
  5: videoFallAvgBps * 0.008D
  6: id.getBitrate() / 1000
  7: agentDown / 1000
  8: downloaded / 1000
  9: 0
 10: playerBuffer
 11: totalBufferings
 12: fragmentTime
 13: playerVideoAvg * 0.008D
 14: (Mesmerizer.currentTimeMillis() - startPlaying)
 15: id.getTimestamp()
   */
  var dataSet = [];
  var colors = ['steelblue', 'orange', 'yellow', '#00ff00',
    '#a0a0a0', '#bc4923', '#981288', '#ffffff', '#10cc98',
    '#cc8888'];
  var metricIndex = [4, 5, 11, 7, 2, 3, 9, 8, 10, 6];
  var header = [ "P2P avg down rate", "Fallback avg down rt", "Total bufferings", "Prefetch",
      "P2P Time", "Fallback Time", "Fallback down size", "P2P down size", "Playback buffer size",
      "Bitrate" ];
  var xAxisValues = [];
  var tstamps = [];
  var ts_last = 0;

  // Initialise dataSet with empty arrays
  for (var i=0; i<metricIndex.length; i++) {
    dataSet.push([]);
  }

  var sample = 0,
    margin = {top: 5, right: 160, bottom: 30, left: 50},
    w = $("#graph").width() - margin.left - margin.right -20,
    h = $("#graph").height() - margin.top - margin.bottom -20;

  d3.select("#TheGraph").remove();

  var max1 = 0, min1, ts_first, ts_last;
  for (var pt=0; pt<data.length; pt++) {
    var isMatch = data[pt].msg.match(/\[video\]\s+([0-9.-]+)/ig);
    if (isMatch) {
      var grp1 = data[pt].msg.match(/([0-9.-]+)/ig);
      /* DEBUG
      var ls = "";
      for (var j=0; j<grp.length; j++) {
        ls += "[" + j + ":" + grp[j] + "] ";
      }
      */
      // Clean up the values and make them numeric
      var grp = $.map( grp1, function(val,i) {
        switch (i) {
          case 0:
            return Math.floor(val * 1.0);
            break;
          case 1:
            // return Math.floor(val * -1.0);
            return 0; // Not interested in this value
            break;
          case 4:
            return Math.floor(val / 100.0);
            break;
          case 5:
            return Math.floor(val / 100.0);
            break;
          case 10:
            return Math.floor(val / 100);
            break;
          case 11:
            return Math.floor(val * 1.0);
            break;
          case 14:
            return Math.floor(val / 1000.0);
            break;
          default:
            return val * 1.0;
        }
      });
      var dt = new Date( data[pt].date / 1 );
      var tstamp = dt.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/)[2];
      if (sample/1 == Math.floor(sample/1))
        tstamps.push(tstamp);

      if (ts_first == undefined) { ts_first = tstamp; ts_last = tstamp; }
      if (tstamp > ts_last) ts_last = tstamp;
      var minCandidate = Math.min.apply(Math,grp.slice(0,11));
      var maxCandidate = Math.max.apply(Math,grp.slice(0,11));

      // Fix max and min values
      if (min1 == undefined) { min1 =  minCandidate; }
      if (minCandidate < min1) { min1 = minCandidate; }
      if (maxCandidate > max1) max1 = maxCandidate;

      ts_last = grp[14];

      for (var i=0; i<metricIndex.length; i++) {
        // dataSet[i].push({x:tstamp, y:grp[metricIndex[i]]});
        dataSet[i].push({x:ts_last, y:grp[metricIndex[i]]});
      }
      sample++;
      console.log(tstamp + " (" + max1 + ") | " + grp.join("|"));
    }
  }
  // var parseDate = d3.time.format("%Y-%m-%d").parse;
  // var dataSet = [ mtrElapsed, mtrP2PBps, mtrFBBps, mtrBufferings ];
  // max1 = 500;

  // Samples per line
  var m = ( sample > 50 ) ? 50 : sample;
  // m = sample;
  var xScale = d3.scale.linear().domain([0, ts_last]).range([margin.left, w]);
  // var xScale = d3.scale.ordinal().domain(xAxisValues).range([margin.left, w]);
  // var xScale = d3.scale.ordinal().domain(tstamps).rangePoints([margin.left, w]);
  // var xScale = d3.scale.ordinal().domain(tstamps).rangeRoundBands([margin.left, w]);
  var y1 = d3.scale.linear().domain([min1, max1]).range([h+margin.top,margin.top]);
  /*
  var xScale = d3.scale.ordinal()
    .domain(tstamps)
    .rangeRoundBands([margin.left, w]);
    */

  // alert(min1 + "/" + max1 + "  -  Testing scale value for 15:36:55 => " + xScale("15:36:55"));

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

  // create an area function that can convert data[] into x and y points
  var area1 = d3.svg.area()
    .interpolate("basis")
    // assign the X function to plot our line as we wish
    .x(function(d,i) {
      // verbose logging to show what's actually being done
      // console.log('Plotting X1 value for data point: ' + d.x + ' using index: ' + i + '/' + sample + ' to be at: ' + xScale(d.x) + ' using our xScale.');
      // return the X coordinate where we want to plot this datapoint
      return xScale(d.x);
    })
    .y0(h+margin.top)
    .y1(function(d) {
      // verbose logging to show what's actually being done
      // console.log('Plotting Y1 value for data point: ' + d.y + ' to be at: ' + y1(d.y) + "/" + h + "/" + max1 + " using our y1 scale.");
      // return the Y coordinate where we want to plot this datapoint
      return y1(d.y);
    });

  // Add an SVG element with the desired dimensions and margin.
  var graph = d3.select("#graph")
    .append("svg")
    .attr("width", w + margin.left + margin.right)
    .attr("height", h + margin.bottom + margin.top)
    .attr("id", "TheGraph");

  // X Axis
  graph.append("svg:g")
    .classed("grid", "true")
    .attr("transform", "translate(0," + (margin.top + 20) + ")")
    .call(make_x_axis(xScale)
      .tickSize(h+margin.top - 10)
      //.tickFormat(d3.format("0f"))
    );

  // Y Axis
  graph.append("svg:g")
    .classed("grid", "true")
    .attr("transform", "translate(45,0)")
    .call(make_y_axis(y1)
      // .tickSize(-w - margin.left - margin.right, 0, 0)
      .tickSize(-w,0,0)
      .tickFormat(d3.format("0f"))
    );


  // Draw the lines
  for (var gn=0; gn < dataSet.length; gn++) {
  // for (var gn=3; gn<4; gn++) {
    // graph.append("svg:path").attr("d", area1(dataSet[gn])).classed("data1 area", "true");
    var l = graph.append("svg:path")
      .attr("d", (gn==8)? area1(dataSet[gn]) : line1(dataSet[gn]))
      .attr("stroke", colors[gn])
      .style("fill", (gn==8)? colors[gn] : "none")
      .style("fill-opacity", 0.1)
      .style("stroke-opacity", 0.5);

    if (gn==8)
      l.moveTo
  }
  /*
  graph.append("svg:path").attr("d", line1(mtrP2PBps)).attr("class", "data2");
  graph.append("svg:path").attr("d", line1(mtrFBBps)).attr("class", "data3");
  graph.append("svg:path").attr("d", line1(mtrBufferings)).attr("class", "data4");
  */

  var legend = graph.append("g")
    .attr("class", "legend");

  legend.selectAll('rect')
    .data(dataSet)
    .enter()
    .append("rect")
    .attr("x", margin.right + w - 110)
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
    .attr("x", margin.right + w - 90)
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


// Takes free-text parameters
function filter(logExpr, modExpr) {
  filtered = true;
  filterMap = [];
  filterExpr1 = new RegExp("("+logExpr+")", "i");
  filterExpr2 = new RegExp("("+modExpr+")", "i");
  console.log("Starting filter...");
  for (var i=0; i < data.length; i++) {
    if ((logExpr != "") || (modExpr != "")) {
      if (data[i].msg.search(filterExpr1) < 0)
        continue;
      if (data[i].module.search(filterExpr2) < 0)
        continue;
    }
    if (filter_loglevel != "")
      if (!loglevelOK(data[i].severity, filter_loglevel))
        continue;
    filterMap.push(i);
  }
  pageNo = 1;
  console.log("Filtering done.");
}

function displayLines(start) {
  curPtr = start;
  var lastLine = ( filtered ) ? filterMap.length - 1 : data.length - 1;
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
  var mod_filter_elm = "<input value=\"" + filter_mod + "\" id=\"filter_mod\" maxlength='30' size='10' onChange=\"javascript:fixFilter();\">"

  // var html = "<tbody class=\"hive\">"
  var html = ""
    + "<tr class=\"big\">"
    + "<th>#"
    + "</th>"
    + "<th class=\"tsheader\"><button id=\"prevPage\">&lt;</button>" + pageNo + "<button id=\"nextPage\">&gt;</button>"
    + "&nbsp;<button id=\"eofPage\">&gt;&gt;</button>"
    + "</th>"
    + "<th>Severity</th>"
    + "<th>Module</th>"
    + "<th>Message</th>"
    + "</tr>"
    + "<tr>"
    + "<th>"
    + "<span class=\"lineNumber\" id=\"linesFrom\" />"
    + "<br/><span class=\"lineNumber\" id=\"linesTo\" />"
    + "</th>"
    + "<th class=\"tsheader\">"
    + "<div id=\"tslide\" style=\"margin-top: 5px;\"></div>"
    + "<div id=\"pslide\" style=\"margin-top: 5px;\"></div>"
    + "</th>"
    + "<th>" + log_filter_elm + "</th>"
    + "<th>" + mod_filter_elm + "</th>"
    + "<th>" + msg_filter_elm
    + "&nbsp;<button id=\"clearFilter\">Clear</button>"
    // + "&nbsp;<button id=\"plotVideo\">Plot Video</button>"
    + "</th>"
    + "</tr>";

  var onGuidClick = "onClick=\"alert('This would take you to the associated GUID log.');\"";
  for (var offset=0; offset<linesPerPage; offset++) {
    var lineNo = start + offset;
    if (lineNo >= data.length)
      break; // We've reached EOF
    if (filtered) {
      if (lineNo >= filterMap.length)
        break; // We've reached EOF
      lineNo = filterMap[lineNo];
    }

    // var dt = new Date( Date(data.log[lineNo].ts ));
    // var dt = new Date( data.log[lineNo].ts / 1 );
    // var ltime = dt.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
    // Highlight GUIDs
    // var msg = data.msg[lineNo].msg.replace(/(guid[:= ]*)([0-9a-f]{20,})/ig, "$1\<span " + onGuidClick + " class=\"highlight-guid\"\>$2\<\/span\>");
    var msg = data[lineNo].msg;
    var modl = data[lineNo].module;
    // Highlight search hits
    if (filtered) {
      msg = msg.replace(filterExpr1, "\<span class=\"highlight-text\"\>$1\<\/span\>");
      modl = modl.replace(filterExpr2, "\<span class=\"highlight-text\"\>$1\<\/span\>");
    }

    html += "<tr class=\"log-" + data[lineNo].severity.toLowerCase() + "\">"
      + "<td>" + (lineNo+1) + "</td>"
      + "<td>" + data[lineNo].date + " " + data[lineNo].time + "</td>"
      + "<td>" + data[lineNo].severity + "</td>"
      + "<td>" + modl + "</td>"
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


