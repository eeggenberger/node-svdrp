var net = require('net');

function svdrpclient( host, port ) {
  this.host = host || 'localhost';
  this.port = port || 6419;
}

svdrpclient.prototype.scanEPG = function( callback ) {
  var command = 'SCAN';
  this.runCommand( command, {}, function( result ) {
    callback( result );
  });
}

svdrpclient.prototype.listEPG = function( callback, channel, time ) {
  var self = this;
  var command = 'LSTE';
  if( channel ) {
    command += ' ' + channel;
  }
  if( time === 'now' || time === 'next' ) {
    command += ' ' + time;
  } else if ( ! isNaN( parseInt( time ) ) ) {
    command += ' at ' + time;
  }
  this.runCommand( command, {}, function( result ) {
    result.data = self.parseEPGData( result.data );
    callback( result );
  });
}

svdrpclient.prototype.parseEPGData = function( data ) {
  var entries = [];
  var entry = {};
  var channel;
  var channelId;
  for( var i = 0; i < data.length; i++ ) {
    var line = data[i].data;
    var type = line.substr(0,1);
    var linedata = line.substr( 2 );
    switch( type ) {
      case 'C':
        entry.channelId = channelId = linedata.substr(0, linedata.indexOf(' '));
        entry.channelName = channel = linedata.substr(linedata.indexOf(' ')+1);
        break;
      case 'E':
        var fields = linedata.split(/ /);
        entry.eventId    = parseInt(fields[0]);
        entry.start      = parseInt(fields[1]);
        entry.duration   = parseInt(fields[2]);
        entry.tableId    = fields[3];
        entry.version    = fields[4];
        break;
      case 'T':
        entry.title = linedata;
        break;
      case 'S':
        entry.shortdesc = linedata;
        break;
      case 'D':
        entry.description = linedata;
        break;
      case 'V':
        entry.vps = parseInt(linedata);
        break;
      case 'e':
        entries.push( entry );
        entry = {
          channelName : channel,
          channelId : channelId
          };
        break;
        //TODO handle unexpected types
        //TODO handle streams
    }
  }

  return entries;
}

svdrpclient.prototype.deleteTimer = function( callback, timerId ) {
  this.runCommand( 'DELT ' + timerId, {}, function( result ) {
    callback( result );
  });
}

svdrpclient.prototype.newTimer = function( callback, timerData ) {
  var self = this;
  var timerString = this.convertToTimerString( timerData );

  this.runCommand( 'NEWT ' + timerString, {}, function( result ) {
    result.data = self.parseTimers( result.data );
    callback( result );
  });
}

svdrpclient.prototype.updateTimer = function( callback, timerData ) {
  var self = this;
  var timerString = this.convertToTimerString( timerData );

  this.runCommand( 'UPDT ' + timerString, {}, function( result ) {
    result.data = self.parseTimers( result.data );
    callback( result );
  });
}


svdrpclient.prototype.modifyTimer = function( callback, timerId, timerData ) {
  var self = this;
  var timerString;
  if( typeof timerData === 'object' ) {
    timerString = this.convertToTimerString( timerData );
  } else {
    timerString = timerData;
  }

  this.runCommand( 'MODT ' + timerId + ' ' + timerString, {}, function( result ) {
    result.data = self.parseTimers( result.data );
    callback( result );
  });
}

svdrpclient.prototype.convertToTimerString = function( timerData ) {
  var timerParts = [];
  var params = [ 'status', 'channel', 'day', 'start', 'stop',
    'priority', 'lifetime', 'filename', 'extinfo' ];
  for( var i = 0; i < params.length; i++ ) {
    // TODO: colons probably need to be replaced, I just need to find out how 
    timerParts.push( timerData[params[i]] );
  }
  var timerString = timerParts.join(':');
  return timerString;
}

svdrpclient.prototype.listTimers = function( callback, id ) {
  var self = this;
  var command = 'LSTT';
  if( id !== undefined && ! isNaN( parseInt( id ) ) ) {
    command += " " + parseInt( id );
  }
  this.runCommand( command, {}, function( result ) {
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

svdrpclient.prototype.hitKey = function( callback, key ) {
  var self = this;
  var command = 'HITK';
  if( key ) {
    command += ' ' + key;
  }
  this.runCommand( command, {}, function( result ) {
    if( ! key ) {
      result.data = self.parseKeys( result.data );
    }
    callback( result );
  });
}

svdrpclient.prototype.parseKeys = function( data ) {
  var keys = [];
  for( var i = 0; i < data.length; i++ ) {
    var line = data[i];
    if( line.code == '214' ) {
      if( line.data.substr( 0, 4 ) === '    ' ) {
        keys.push( line.data.substr(4) );
      }
    }
  }
  return keys;
}

svdrpclient.prototype.runCommand = function( cmd, params, callback ) {
  var self = this;
  //TODO make sure were running only one command -> search for newline characters
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
    case '215':
    case '214':
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
    var lines = data.split('\n');

    // process all but the last line from the chunk
    for( var i = 0; i < lines.length - 1 ; i++ ) {
      var line = lines[i].replace("\r", '');
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
