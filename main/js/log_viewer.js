/**
 * Created by U on 2013-12-18.
 */

var data;
var linesPerPage = 100;
var curPtr = 0;
var dataTable;
var filterMap = [];
var filterExpr;
var filter_loglevel = "";
var filter_msg = "";
var filtered = false;

$(document).ready( function() {
  dataTable = $("#logTable tbody");
  fetchData();
})

function fetchData() {
  $.getJSON("logs/RC.log.json", function(jsonData) {
    data = jsonData;
    console.log("Got data");
    // fixFilter();
    displayLines(0);
    console.log("All done");
    $("#filter_msg").focus().select();
  });
}

function fixFilter() {
  filter_loglevel = $("#filter_loglevel").val();
  filter_msg = $("#filter_msg").val();
  filter();
  displayLines(0);
  $("#filter_msg").focus().select();
}

function filter() {
  filtered = true;
  filterMap = [];
  filterExpr = new RegExp("("+filter_msg+")", "i");
  console.log("Starting filter...");
  for (var i=0; i < data.log.length; i++) {
    if (filter_msg != "")
      if (data.log[i].msg.search(filterExpr) < 0)
        continue;
    if (filter_loglevel != "")
      if (data.log[i].ll != filter_loglevel)
        continue;
    filterMap.push(i);
  }
  console.log("Filtering done.");
}

function zeroPad(src, padLen) {
  var s = src;
  while (s.length < padLen) {
    s = "0" + s;
  }
  return s;
}

function displayLines(start) {
  curPtr = start;

  var log_filter_elm = "<select id=\"filter_loglevel\" onChange=\"javascript:fixFilter();\">"
    + "<option " + "value=\"\">-- ANY --</option>";
  var opts = ["DEBUG","INFO","WARN","ERROR","FATAL"];
  $.each(opts, function(inx,val) {
    var sel = ( filter_loglevel == val ) ? " selected " : "";
    log_filter_elm += "<option " + sel + " value=\"" + val + "\">" + val + "</option>"
  });
  log_filter_elm += "</select>";

  var msg_filter_elm = "<input value=\"" + filter_msg + "\" id=\"filter_msg\" maxlength='30' size='10' onChange=\"javascript:fixFilter();\">"

  var html = "<tbody>"
    + "<tr class=\"big\">"
    + "<th>Timestamp</th>"
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
    + "<th>" + msg_filter_elm + "</th>"
    + "</tr>";

  for (var offset=0; offset<linesPerPage; offset++) {
    var lineNo = start + offset;
    if (filtered) {
      if (lineNo > filterMap.length - 1)
        break;
      lineNo = filterMap[lineNo];
    }
    var dt = new Date( Date(data.log[lineNo].ts));
    var mth = dt.getMonth()+1;
    var stamp = dt.getFullYear() + "-" + mth + "-" + dt.getDate() + " " +
      dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds() + "." + dt.getMilliseconds();
    stamp = sprintf("%04d-%02d-%02d %02d:%02d:%02d", dt.getFullYear(),
      mth, dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds());
    // Highlight GUIDs
    var msg = data.log[lineNo].msg.replace(/(guid[:= ]*)([0-9a-f]{20,})/ig, "$1\<span class=\"highlight-guid\"\>$2\<\/span\>");
    // Highlight search hits
    msg = msg.replace(filterExpr, "\<span class=\"highlight-text\"\>$1\<\/span\>");


    html += "<tr class=\"log-" + data.log[lineNo].ll.toLowerCase() + "\">"
      + "<td>" + stamp + "</td>"
      + "<td>" + data.log[lineNo].th + "</td>"
      + "<td>" + data.log[lineNo].ll + "</td>"
      + "<td>" + data.log[lineNo].cl + "</td>"
      + "<td>" + msg + "</td>"
      + "</tr>";
  }
  html += "</tbody>";
  dataTable.html(html);
}

