var net = require('net');

function svdrpclient( host, port ) {
  this.host = host || 'localhost';
  this.port = port || 6419;
}

svdrpclient.prototype.listTimers = function( id, filter, orderby ) {
  this.runCommand( 'LSTT', {}, function( line ) {
    console.log( line );
  });
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
      result.data = self.parseRelTimer(result.data[0]);
      callback( result );
  });
}

svdrpclient.prototype.parseRelTimer = function( timerData ) {
    var timerId = timerData.data.substr( 0, timerData.data.indexOf(' ') );
    var time = timerData.data.substr( timerData.data.indexOf(' ') + 1 );

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
