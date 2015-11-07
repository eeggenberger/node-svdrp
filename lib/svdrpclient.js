var net = require('net');

function svdrpclient( host, port ) {
	this.host = host || 'localhost';
	this.port = port || 6419;
}

svdrpclient.prototype.listTimers = function( id, filter, orderby ) {
    this.executeCommand( 'LSTT', {}, function( line ) {
        console.log( line );
    });
}

svdrpclient.prototype.nextTimer = function( mode ) {
    if( mode !== 'abs' && mode !== 'rel' ) {
        mode = '';
    }
    this.executeCommand( 'NEXT ' + mode , {}, function( result ) {
        console.log( result );
    });
}

svdrpclient.prototype.executeCommand = function( cmd, params, callback ) {
    var data = '';

    var client = net.connect( this.port, this.host,
        function() { //'connect' listener
        client.write( cmd + '\n');
        });

    var result = [];
    client.on('data', function(chunk) {
        var lastfound = false;
        //console.log(chunk.toString());
        data += chunk.toString();
        var lines = data.split('\r\n');
        for( var i = 0; i < lines.length -1 ; i++ ) {
            var line = lines[i];
            var code = line.substr(0,3);
            var lastfound = line.substr(3,1) === '-' ? false : true;
            linedata = line.substr(4);
            switch(code) {
                case '220':
                    // TODO parse
                    continue;
                    break;
                case '250':
                    result.push(linedata);
                    //callback(linedata);
                    break;
            }
        }

        data = lines[lines.length-1];
        if( data == '' && lastfound ) {
            client.end();
            callback( result );
            console.log('end');
        }
    });
}

exports.svdrpclient = svdrpclient;
