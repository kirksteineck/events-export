(function(window) {
  window.w = {
    getGuide: getGuide,
    getAirings: getAirings,
    getEvents: getEvents,
    reset: reset,
    message, message,
    getAllUrlParams: getAllUrlParams,
    copy: copy,
    airings: [],
    events: [],
    uuids: [],
    keys: [],
    channel: null,
    key: null,
    guide: null,
    start: null,
    end: null

  }

  function getGuide() {

    // Button
    $('#go').attr('disabled', true);
    $('#no').hide();
    $('#yes').show();

    // Reset
    w.airings = [];
    w.events = [];
    w.uuids = [];
    w.keys = [];
    $('#columns-0, #columns-1, #columns-2, #columns-3').html('');

    w.channel = $('#channel').val();
    w.key = $('#key').val();
    w.start = Date.parse($('#start').val());
    w.end = Date.parse($('#end').val());
    var url = 'https://api.watchwith.com/v3/schedules/' + w.channel + '?startDateUtc='+w.start+'&endDateUtc='+w.end+'&key=' + w.key;

    $.get(url, function(data, status){
      w.guide = data;
      w.getAirings(w.guide, w.key);
    }).fail(function(x){
        $('.alert').removeClass('hidden').addClass('show');
        w.message('Request Failed: ' + x.status + ', ' + x.statusText, 'danger');
    });

  }

  function getAirings(data) {

    var content = data.airings;

    if (content.length == 0) {
      w.reset();
      w.message('No airings in that time range on this channel.', 'warning')
      return;
    }

    for (i = 0; i < content.length; i++) { 
      w.uuids.push(content[i].uuid);
    }

    for (i = 0; i < w.uuids.length; i++) { 
      var url = 'http://api.watchwith.com/v3/airings/' + w.uuids[i] + '?key=' + w.key;
      $.get(url, function(result, status){
        w.airings.push(result);
        if (w.airings.length == w.uuids.length) {
          w.getEvents();
        }
      }).fail(function(x){
        $('.alert').removeClass('hidden').addClass('show');
        w.message('Request Failed: ' + x.status + ', ' + x.statusText, 'danger');
      });
    }

  }

  function getEvents() {
    var count = 0;
    for (i = 0; i < w.airings.length; i++) { 
      if (w.airings[i].timeline.events) {
        for (j = 0; j < w.airings[i].timeline.events.length; j++) {
          w.airings[i].timeline.events[j].primaryLinkId = w.airings[i].externalIds.primaryLinkId;
          w.events.push(w.airings[i].timeline.events[j]);
        }
      }
    };

    for (i = 0; i < w.events.length; i++) { 
      w.events[i] = flattenObject(w.events[i]);
      $.each(w.events[i], function(k, v){
         w.events[i][k] = v.toString().replace(/(\r\n|\n|\r)/gm, ' ');
        if ($.inArray(k, w.keys) == -1) {
          w.keys.push(k);
          if (count < 199) {
            $('#columns-'+Math.floor(count / 50)).append('<li>'+k+'</li>');
          } else if (count == 199) {
            $('#columns-'+Math.floor(count / 50)).append('<li><i>Etc. <span id="last"></span> columns remain</i></li>');
          } else {
            $('#last').text((count + 1) - 199);
          }
          count++;
        }
      });
    }

    for (l = 0; l < w.keys.length; l++) { 
      for (i = 0; i < w.events.length; i++) { 
        if (!(w.keys[l] in w.events[i])) {
          w.events[i][w.keys[l]] = null;
        }
      }
    }

    CSVExport(w.events);

    w.reset();

    var d = new Date();

    $('tbody').prepend('<tr><td>'+moment().format('MMMM Do YYYY, h:mm:ss a')+'</td><td>'+w.channel+'</td><td>'+w.key+'</td><td>'+w.uuids.length+'</td><td>'+w.events.length+'</td></tr>');
  }

  var flattenObject = function(ob) {
    var toReturn = {};
    var flatObject;
    for (var i in ob) {
      if (!ob.hasOwnProperty(i)) {
        continue;
      }
      if ((typeof ob[i]) === 'object') {
        flatObject = flattenObject(ob[i]);
        for (var x in flatObject) {
          if (!flatObject.hasOwnProperty(x)) {
            continue;
          }
          toReturn[i + (!!isNaN(x) ? '.' + x : '')] = flatObject[x];
        }
      } else {
        toReturn[i] = ob[i];
      }
    }
    return toReturn;
  };

  function message(message, type) {
    
    w.reset();

    var html =  '<div class="alert fade in alert-'+type+' alert-dismissible" role="alert" style="overflow: hidden;">'+
                  '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+
                  '<div id="alert-text">'+
                    message +
                  '</div>'+
                '</div>';

    $('.message').html(html);

    setTimeout(function(){
      $('.alert').animate({'height': 0, 'padding-top': 0, 'padding-bottom': 0, 'border-top': 0, 'border-bottom': 0, 'margin-top': 0, 'margin-bottom': 0}, function(){
        $(this).alert('close');
      });
    }, 5000);

  }

  function reset() {
    // Button
    $('#go').attr('disabled', false);
    $('#no').show();
    $('#yes').hide();

  }

  $(document).ready(function(){

    // Hover tooltipx
    $('button').tooltip();

    $("#start, #end").datepicker();

    var channel = w.getAllUrlParams().channel || '';
    var key     = w.getAllUrlParams().key || '';

    var start   = new Date();
    var end     = new Date();
    start       = parseInt(w.getAllUrlParams().start) || start.getTime() - 4838400000;
    end         = parseInt(w.getAllUrlParams().end) || end.getTime();
    start       = new Date(start);
    end         = new Date(end);
    start       = (start.getMonth()+1)+'/'+start.getDate()+'/'+start.getFullYear();
    end         = (end.getMonth()+1)+'/'+end.getDate()+'/'+end.getFullYear();

    $('#channel').attr('value', channel);
    $('#key').attr('value', key)
    $('#start').attr('value', start);
    $('#end').attr('value', end);

  });

  function getAllUrlParams(url) {

    // get query string from url (optional) or window
    var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

    // we'll store the parameters here
    var obj = {};

    // if query string exists
    if (queryString) {

      // stuff after # is not part of query string, so get rid of it
      queryString = queryString.split('#')[0];

      // split our query string into its component parts
      var arr = queryString.split('&');

      for (var i=0; i<arr.length; i++) {
        // separate the keys and the values
        var a = arr[i].split('=');

        // in case params look like: list[]=thing1&list[]=thing2
        var paramNum = undefined;
        var paramName = a[0].replace(/\[\d*\]/, function(v) {
          paramNum = v.slice(1,-1);
          return '';
        });

        // set parameter value (use 'true' if empty)
        var paramValue = typeof(a[1])==='undefined' ? true : a[1];

        // if parameter name already exists
        if (obj[paramName]) {
          // convert value to array (if still string)
          if (typeof obj[paramName] === 'string') {
            obj[paramName] = [obj[paramName]];
          }
          // if no array index number specified...
          if (typeof paramNum === 'undefined') {
            // put the value on the end of the array
            obj[paramName].push(paramValue); 
          }
          // if array index number specified...
          else {
            // put the value at that index number
            obj[paramName][paramNum] = paramValue;
          }
        }
        // if param name doesn't exist yet, set it
        else {
          obj[paramName] = paramValue;
        }
      }
    }

    return obj;
  }

  function copy() {

    channel = $('#channel').val(); 
    key = $('#key').val();
    start = Date.parse($('#start').val());
    end = Date.parse($('#end').val()); 

    var copyUrl = window.location.origin+window.location.pathname+'?channel='+channel+'&key='+key+'&start='+start+'&end='+end;
    $('#copy').attr('value', copyUrl);

    $('#copy').select();
    // Copy its contents
    document.execCommand("copy");

    w.message('URL copied to clipboard', 'success');

  }

})(window);






