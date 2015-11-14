var net = require('net');

function svdrpclient( host, port ) {
  this.host = host || 'localhost';
  this.port = port || 6419;
}

svdrpclient.prototype.listTimers = function( callback, id, filter, orderby ) {
  var self = this;
  this.runCommand( 'LSTT', {}, function( result ) {
    result.data = self.parseTimers( result.data );
    callback( result );
  });
}

svdrpclient.prototype.parseTimers = function( data ) {
  var timers = [];
  for( var i = 0; i < data.length; i++ ) {
    var line = data[i].data;
    var timer = {};
    timer.id = parseInt(line.substr(0, line.indexOf(' ')));

    var timerData = line.substr(line.indexOf(' ') + 1);
    var parts = timerData.split(':');
    timer.status = parseInt( parts[0] );
    timer.channel = parseInt( parts[1] );
    timer.day = parts[2];
    timer.start = parseInt( parts[3] );
    timer.stop = parseInt( parts[4] );
    timer.priority = parseInt( parts[5] );
    timer.lifetime = parseInt( parts[6] );
    timer.filename = parts[7];
    timer.extinfo = parts[8];

    timers.push( timer );
  }
  return timers;
}

svdrpclient.prototype.listChannels = function( callback, name ) {
  var cmd = 'LSTC';
  var self = this;
  if( name ) {
    cmd += " " + name;
  }
  this.runCommand( cmd, {}, function( result ) {
    var channels = [];
    for( var i = 0; i < result.data.length; i++ ) {
      var item = result.data[i];
      if( item.code === '250' ) {
        var channel = self.parseChannelData( item.data );
        channels.push( channel );
      }
    }
    result = {
      code : result.code,
      data : channels
    }
    callback(result);
  });
}

svdrpclient.prototype.parseChannelData = function( channelData ) {
  var data = {};
  var parts = channelData.split(':');
  var nameParts = parts[0].split(';');
  data.number = nameParts[0].substr( 0, nameParts[0].indexOf(' ') );
  data.name = nameParts[0].substr( nameParts[0].indexOf(' ') );
  data.bouquet = nameParts[1];

  var fields = [ 'frequency', 'params', 'source', 'rate', 
    'vpid', 'apid', 'tpid', 'caid', 'sid', 'nid', 'tid', 'rid', ];
  for( var i = 0; i < fields.length; i++ ) {
    data[fields[i]] = parts[i+1];
  }
  return data;
}

svdrpclient.prototype.nextTimer = function( callback, mode ) {
  var self = this;
  if( mode !== 'abs' && mode !== 'rel' ) {
    mode = '';
  }
  this.runCommand( 'NEXT ' + mode , {}, function( result ) {
      result.data = self.parseNextTimer(result.data[0], mode);
      callback( result );
  });
}

svdrpclient.prototype.parseNextTimer = function( timerData, mode ) {
    var timerId = timerData.data.substr( 0, timerData.data.indexOf(' ') );
    var time = timerData.data.substr( timerData.data.indexOf(' ') + 1 );
    if( mode === '' ) {
      var months = { Jan : '01', Feb : '02', Mar : '03', Apr : '04', May : '05',
        Jun : '06', Jul : '07', Aug : '08', Sep : '09', Okt : '10', Nov : '11', Dec : '12' };
      //Thu Nov 12 22:25:00 2015
      var matches = time.match(/\w{3} (\w{3}) (\d\d) (\d\d:\d\d:\d\d) (\d{4})/);
      if( matches ) {
        var datestring = matches[4] + '-' + months[matches[1]] + '-' + matches[2] + 'T' +
          matches[3];
        time = new Date(datestring);
      } else {
        time = null;
      }
    }

    return {
        timer : timerId,
        time : time
        };
}

svdrpclient.prototype.runCommand = function( cmd, params, callback ) {
  var self = this;
  var client = net.connect( this.port, this.host,
    function() { //'connect' listener
      self.executeCommand( client, cmd, params, function( result ) {
            client.end();
            callback( result );
      });
  });
}

svdrpclient.prototype.handleLine = function( line, result ) {
  var code = line.substr(0,3);
  var lastfound = line.substr(3,1) === '-' ? false : true;
  linedata = line.substr(4);

  if( code !== '221' ) {
      result.code = code;
  }
  switch(code) {
    case '220':
      // TODO parse
      return lastfound;
      break;
    case '250':
      result.data.push( { code : code, data : linedata } );
      //callback(linedata);
      break;
  }
  return lastfound;
}

svdrpclient.prototype.executeCommand = function( client, cmd, params, callback ) {
  var self = this;
  var data = '';
  var result = {
    code : 554,
    data : [],
  };


  client.on('data', function(chunk) {
    var lastfound = false;
    data += chunk.toString();
    var lines = data.split('\r\n');

    // process all but the last line from the chunk
    for( var i = 0; i < lines.length - 1 ; i++ ) {
      var line = lines[i];
      lastfound = self.handleLine( line, result );
    }

    // add the last (partial) line to the next chunk
    data = lines.pop();

	// if the last line was empty, and we've got a space after the response
	// code, indicating the last line, were done
        if( data == '' && lastfound ) {
            callback( result );
        }
    });

  client.write( cmd + '\n');
}

exports.svdrpclient = svdrpclient;
