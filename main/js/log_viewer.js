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
  $.getJSON("logs/RC.log.json", function(jsonData) {
    data = jsonData;
    console.log("Got data");
    // fixFilter();
    pageNo = 1;
    displayLines(0);
    console.log("All done");
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
  var filterExpr = new RegExp("(\[video\]\w+([0-9]+))", "i");
  filterExpr.compile();
  var mtrElapsed = [];
  var mtrP2PBps = [];
  var mtrFBBps = [];
  var mtrBufferings = [];

  for (var pt=0; pt<data.log.length; pt++) {
    var grp = data.log[pt].msg.match(/\[video\]\s+([0-9]+)/i);
    if (grp) {
      mtrElapsed.push(grp[1]);
      mtrP2PBps.push(grp[5]);
      mtrFBBps.push(grp[6]);
      mtrBufferings.push(grp[12]);
    }
  }
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
    + "<th class=\"tsheader\"><button id=\"prevPage\">&lt;</button>" + pageNo + "<button id=\"nextPage\">&gt;</button>"
    + "&nbsp;<button id=\"eofPage\">&gt;&gt;</button>"
    + "<br/><div id=\"tslide\" style=\"margin-top: 5px;\"></div>"
    + "</th>"
    + "<th>Thread</th>"
    + "<th>LogLevel</th>"
    + "<th>Class</th>"
    + "<th>Message</th>"
    + "</tr>"
    + "<tr>"
    + "<th></th>"
    + "<th></th>"
    + "<th>" + log_filter_elm + "</th>"
    + "<th></th>"
    + "<th>" + msg_filter_elm
    + "&nbsp;<button id=\"clearFilter\">Clear</button>"
    + "&nbsp;<button id=\"plotVideo\">Plot Video</button>"
    + "</th>"
    + "</tr>";

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
    var msg = data.log[lineNo].msg.replace(/(guid[:= ]*)([0-9a-f]{20,})/ig, "$1\<span class=\"highlight-guid\"\>$2\<\/span\>");
    // Highlight search hits
    if (filtered)
      msg = msg.replace(filterExpr, "\<span class=\"highlight-text\"\>$1\<\/span\>");


    html += "<tr class=\"log-" + data.log[lineNo].ll.toLowerCase() + "\">"
      + "<td>" + ltime[1] + " " + ltime[2] + "</td>"
      + "<td>" + data.log[lineNo].th + "</td>"
      + "<td>" + data.log[lineNo].ll + "</td>"
      + "<td>" + data.log[lineNo].cl + "</td>"
      + "<td>" + msg + "</td>"
      + "</tr>";
  }
  // html += "</tbody>";
  dataTable.html(html);
  $("#tslide").slider( { value: pageNo, min: 1, max: lastPage, orientation: "horizontal",
      change: function(event, ui) {
        pageGoTo(ui.value);
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


