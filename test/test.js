var assert = require('assert');
var sinon = require('sinon');
var net = require('net');
var svdrpclient = require('../lib/svdrpclient.js');
var EventEmitter = require('events').EventEmitter;
var fs = require("fs");

var vdrBanner = '220 krserver SVDRP VideoDiskRecorder 2.2.0; Tue Nov 10 22:38:02 2015; UTF-8\r\n';

describe('svdrpclient base functions', function() {

  var rawResponse;

  beforeEach( function(done) {
    var self = this;
    rawResponse = '';

    self.socket = new net.Socket({});
    self.socketStub = sinon.stub(self.socket, 'write', function ( data ) {
      if( rawResponse.constructor === Array ) {
        for( var i = 0; i < rawResponse.length; i++ ) {
          this.emit('data', rawResponse[i]);
        }
      } else {
        this.emit('data', rawResponse);
      }
    });
    
    self.netStub = sinon.stub(net, "connect", function( port, host, cb ) {

      setTimeout( cb, 0 );
      setTimeout( function() { self.socket.emit('data', vdrBanner); }, 0 );
      return self.socket;
    });

    done();
  });

  afterEach( function(done) {
    net.connect.restore();
    this.socketStub = undefined;
    done();
  });

  describe('nextTimer', function () {


    it('should return a timer id and a date object when called without option', function ( done ) {
      var self = this;
      rawResponse = "250 1 Thu Nov 12 22:25:00 2015\r\n" +
        "221 krserver closing connection\r\n";
      var response = { code: '250', data: { timer: '1', time: new Date('2015-11-12T22:25:00') } };

      var client = new svdrpclient.svdrpclient();
      client.nextTimer( function( result ) {
        //assert.deepEqual( result, response );
        assert.strictEqual( response.data.time.toJSON(), result.data.time.toJSON() );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "NEXT \n");
        done();
        });

    });

    it('should return a timer id and a integer when called with rel as option', function ( done ) {
      var self = this;
      rawResponse = "250 1 171412\r\n" +
        "221 krserver closing connection\r\n";
      var response = { code: '250', data: { timer: '1', time: '171412' } };

      var client = new svdrpclient.svdrpclient();
      client.nextTimer( function( result ) {
        assert.deepEqual( response, result );
        assert( parseInt( result.data.time ) > 0 );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "NEXT rel\n");
        done();
        },'rel');

    });

    it('should return a timer id and a timestamp integer when called with abs as option', function ( done ) {
      var self = this;

      rawResponse = "250 1 1447363500\r\n" +
        "221 krserver closing connection\r\n";
      var response = { code: '250', data: { timer: '1', time: '1447363500' } };

      var client = new svdrpclient.svdrpclient();
      client.nextTimer( function( result ) {
        assert.deepEqual( response, result );
        assert( parseInt( result.data.time ) > 0 );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "NEXT abs\n");
        done();
        },'abs');

    });
  });

  describe('listTimers', function () {

    it('should call LSTT without parameter and return a timer struct', function ( done ) {
      var self = this;

      rawResponse = "250-1 1:22:2015-11-12:2225:2315:50:99:NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don:" +
        "<epgsearch><channel>22 - zdf_neo</channel><searchtimer>neo magazin</searchtimer><start>1447363500" + 
        "</start><stop>1447366500</stop><s-id>13</s-id><eventid>3411</eventid></epgsearch>\r\n" +
        "250 2 0:11:2015-11-13:2012:2126:50:99:Castle~Todesfall in der Familie," + 
        "Crime-Serie, U:<epgsearch><channel>11 - kabel eins</channel><searchtimer>Castle" + 
        "</searchtimer><start>1447441920</start><stop>1447446360</stop><s-id>1</s-id><eventid>14441</eventid></epgsearch>\r\n" +
        "221 krserver closing connection\r\n";

      var response = { code: '250', data: [
        {
          id : 1,
          status : 1,
          channel : 22,
          day : '2015-11-12',
          start : 2225,
          stop : 2315,
          priority : 50,
          lifetime : 99,
          filename : 'NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don',
          extinfo : '<epgsearch><channel>22 - zdf_neo</channel><searchtimer>neo magazin' +
            '</searchtimer><start>1447363500</start><stop>1447366500</stop><s-id>13' +
            '</s-id><eventid>3411</eventid></epgsearch>'
        },
        {
          id : 2,
          status : 0,
          channel : 11,
          day : '2015-11-13',
          start : 2012,
          stop : 2126,
          priority : 50,
          lifetime : 99,
          filename : 'Castle~Todesfall in der Familie,Crime-Serie, U',
          extinfo : '<epgsearch><channel>11 - kabel eins</channel><searchtimer>Castle' +
            '</searchtimer><start>1447441920</start><stop>1447446360</stop><s-id>1' +
            '</s-id><eventid>14441</eventid></epgsearch>'
        },
        ]};

      var client = new svdrpclient.svdrpclient();
      client.listTimers( function( result ) {
        assert.deepEqual( response, result );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTT\n");
        done();
        });

    });

    it('should call LSTT with a timer id when passed an integer', function ( done ) {
      var self = this;

      rawResponse = "250 1 1:22:2015-11-12:2225:2315:50:99:NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don:" +
        "<epgsearch><channel>22 - zdf_neo</channel><searchtimer>neo magazin</searchtimer><start>1447363500" + 
        "</start><stop>1447366500</stop><s-id>13</s-id><eventid>3411</eventid></epgsearch>\r\n" +
        "221 krserver closing connection\r\n";

      var response = { code: '250', data: [
        {
          id : 1,
          status : 1,
          channel : 22,
          day : '2015-11-12',
          start : 2225,
          stop : 2315,
          priority : 50,
          lifetime : 99,
          filename : 'NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don',
          extinfo : '<epgsearch><channel>22 - zdf_neo</channel><searchtimer>neo magazin' +
            '</searchtimer><start>1447363500</start><stop>1447366500</stop><s-id>13' +
            '</s-id><eventid>3411</eventid></epgsearch>'
        },
        ]};

      var client = new svdrpclient.svdrpclient();
      client.listTimers( function( result ) {
        assert.deepEqual( response, result );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTT 1\n");
        done();
        }, 1);
    });

    it('should call LSTT withthout a timer id when passed anything other than an integer', function ( done ) {
      var self = this;

      rawResponse = "250 1 1:22:2015-11-12:2225:2315:50:99:NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don:" +
        "<epgsearch><channel>22 - zdf_neo</channel><searchtimer>neo magazin</searchtimer><start>1447363500" + 
        "</start><stop>1447366500</stop><s-id>13</s-id><eventid>3411</eventid></epgsearch>\r\n" +
        "221 krserver closing connection\r\n";

      var response = { code: '250', data: [
        {
          id : 1,
          status : 1,
          channel : 22,
          day : '2015-11-12',
          start : 2225,
          stop : 2315,
          priority : 50,
          lifetime : 99,
          filename : 'NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don',
          extinfo : '<epgsearch><channel>22 - zdf_neo</channel><searchtimer>neo magazin' +
            '</searchtimer><start>1447363500</start><stop>1447366500</stop><s-id>13' +
            '</s-id><eventid>3411</eventid></epgsearch>'
        },
        ]};

      var client = new svdrpclient.svdrpclient();
      client.listTimers( function( result ) {
        assert.deepEqual( response, result );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTT\n");
        done();
        }, 'abc');
    });
  });

  describe('listEPG', function () {
    
    var emptyEpg = "215-C C-1-1051-11100 Das Erste HD\n" +
      "215-c\n" +
      "215 End of EPG data\n" +
      "221 krserver closing connection\n";

    it('should call LSTE without parameter and return an EPG struct', function ( done ) {
      var self = this;

      rawResponse = fs.readFileSync("test/data/epg_data1.txt");
      var jsonData = fs.readFileSync("test/data/epg_result1.json");
      var response = JSON.parse(jsonData);

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTE\n");
        done();
        });

    });

    it('should call LSTE with now as parameter if passed now as param', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTE now\n");
        done();
        }, null, 'now');
    });

    it('should call LSTE with next as parameter if passed next as param', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTE next\n");
        done();
        }, null, 'next');
    });

    it('should call LSTE with "at <timestamp>" as parameter if passed an integer', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTE at 1447578900\n");
        done();
        }, null, 1447578900);
    });

    it('should call LSTE with a channel as parameter if one is passed', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTE 2\n");
        done();
        }, 2 );
    });

    it('should call LSTE with "channel at <timestamp>" as parameters if passed a channel and an integer', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTE 2 at 1447578900\n");
        done();
        }, 2, 1447578900);
    });

  });

  describe('listChannels', function () { });
  //describe('modifyChannel', function () { }); //low prio
  //describe('moveChannel', function () { }); //low prio
  //describe('newChannel', function () { }); //low prio
  //describe('deleteChannel', function () { }); //low prio

  describe('newTimer', function () {
    it('should call NEWT with the timer data it got as parameter and return the result', function ( done ) {
      var self = this;

      //TODO test with colon in the filename param
      var rawTimerData = '1:22:2015-11-19:2230:2320:50:99:NEO MAGAZIN ROYALE mit ' +
        'Jan Böhmermann~2015.11.19-22|35-Don:<node-svdrp>test</node-svdrp>';
      rawResponse = "250 3 " + rawTimerData + "\n";
      var timerData = {
          status : 1, channel : 22, day : '2015-11-19', start : 2230,
          stop : 2320, priority : 50,
          lifetime : 99,
          filename : 'NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.19-22|35-Don',
          extinfo : '<node-svdrp>test</node-svdrp>'
        };

      var client = new svdrpclient.svdrpclient();
      client.newTimer( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "NEWT " + rawTimerData + "\n");
        assert.equal( result.code, '250' );
        var newTimer = result.data[0];
        timerData.id = newTimer.id;
        assert.deepEqual( newTimer, timerData );
        done();
        }, timerData );
    });
  });

  describe('deleteTimer', function () {
    it('should call DELT with the timer id that was passed as param and return the result', function ( done ) {
      var self = this;

      rawResponse = "250 Timer \"3\" deleted\n";
      var timerId = '3';

      var client = new svdrpclient.svdrpclient();
      client.deleteTimer( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "DELT " + timerId + "\n");
        assert.equal( result.code, '250' );
        done();
        }, timerId );
    });
  });

  describe('modifyTimer', function () { 
    it('should call MODT with the timer id and data it got as parameter and return the result', function ( done ) {
      var self = this;

      //TODO test with colon in the filename param
      var rawTimerData = '1:22:2015-11-19:2230:2320:50:99:NEO MAGAZIN ROYALE mit ' +
        'Jan Böhmermann~2015.11.19-22|35-Don:<node-svdrp>test</node-svdrp>';
      var timerId = 3;
      rawResponse = "250 " + timerId + " " + rawTimerData + "\n";
      var timerData = {
          status : 1, id : timerId, channel : 22, day : '2015-11-19',
          start : 2230, stop : 2320, priority : 50, lifetime : 99,
          filename : 'NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.19-22|35-Don',
          extinfo : '<node-svdrp>test</node-svdrp>'
        };

      var client = new svdrpclient.svdrpclient();
      client.modifyTimer( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "MODT " + timerId + ' ' + rawTimerData + "\n");
        assert.equal( result.code, '250' );
        var newTimer = result.data[0];
        assert.deepEqual( newTimer, timerData );
        done();
        }, timerId, timerData );
    });
    it('should call MODT with the timer id and the on|off flag it got as parameter and return the result', function ( done ) {
      var self = this;

      //TODO test with colon in the filename param
      var rawTimerData = '0:22:2015-11-19:2230:2320:50:99:NEO MAGAZIN ROYALE mit ' +
        'Jan Böhmermann~2015.11.19-22|35-Don:<node-svdrp>test</node-svdrp>';
      var timerId = 3;
      rawResponse = "250 " + timerId + " " + rawTimerData + "\n";
      var timerData = {
          status : 0, id : timerId, channel : 22, day : '2015-11-19',
          start : 2230, stop : 2320, priority : 50, lifetime : 99,
          filename : 'NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.19-22|35-Don',
          extinfo : '<node-svdrp>test</node-svdrp>'
        };
      var timerParam = 'off';

      var client = new svdrpclient.svdrpclient();
      client.modifyTimer( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "MODT " + timerId + ' ' + timerParam + "\n");
        assert.equal( result.code, '250' );
        var newTimer = result.data[0];
        assert.deepEqual( newTimer, timerData );
        done();
        }, timerId, timerParam );
    });
  });
  describe('updateTimer', function () {
    it('should call UPDT with the timer data it got as parameter and return the result', function ( done ) {
      var self = this;

      //TODO test with colon in the filename param
      var rawTimerData = '1:22:2015-11-19:2230:2320:50:99:NEO MAGAZIN ROYALE mit ' +
        'Jan Böhmermann~2015.11.19-22|35-Don:<node-svdrp>test</node-svdrp>';
      rawResponse = "250 3 " + rawTimerData + "\n";
      var timerData = {
          status : 1, channel : 22, day : '2015-11-19', start : 2230,
          stop : 2320, priority : 50, lifetime : 99,
          filename : 'NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.19-22|35-Don',
          extinfo : '<node-svdrp>test</node-svdrp>'
        };

      var client = new svdrpclient.svdrpclient();
      client.updateTimer( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "UPDT " + rawTimerData + "\n");
        assert.equal( result.code, '250' );
        var newTimer = result.data[0];
        timerData.id = newTimer.id;
        assert.deepEqual( newTimer, timerData );
        done();
        }, timerData );
    });
  });
  // low prio, my VDR doesn't seem to know it
  //describe('moveTimer', function () {
  //  it('should call MOVT with the timer id and position it was passed and return the result');
  //});

  describe('scanEPG', function () {
    it('should call SCAN and return the status', function ( done ) {
      var self = this;

      rawResponse = "250 EPG scan triggered\n";

      var client = new svdrpclient.svdrpclient();
      client.scanEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "SCAN\n");
        assert.equal( result.code, '250' );
        done();
        } );
    });
  });
  //describe('putEPGData', function () { }); //low prio
  

  // low prio, as I don't have a working vdr fronted to test it at the moment
  //describe('screengrab', function () {
  //  it('should call GRAB and return base64 encoded image data');
  //});
  describe('displayMessage', function () { 
    it('should call MESG with the message as parameter and return status code 250', function ( done ) {
      var self = this;

      var message = 'Foo Bar';
      rawResponse = "250 Message queued\n";

      var client = new svdrpclient.svdrpclient();
      client.displayMessage( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "MESG " + message + "\n");
        assert.equal( result.code, '250' );
        done();
        }, message );
    });
  });
  describe('changeRemote', function () { 
    it('should call REMO without parameter and return the current remote status', function ( done ) {
      var self = this;

      rawResponse = "250 Remote control is enabled\n";

      var client = new svdrpclient.svdrpclient();
      client.changeRemote( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "REMO\n");
        assert.equal( result.code, '250' );
        assert.equal( result.data, true );
        done();
        } );
    });
    it('should call REMO with off as parameter and return status code 250', function ( done ) {
      var self = this;

      rawResponse = "250 Remote control is disabled\n";

      var client = new svdrpclient.svdrpclient();
      client.changeRemote( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "REMO off\n");
        assert.equal( result.code, '250' );
        assert.equal( result.data, false );
        done();
        }, 'off' );
    });
  });

  describe('switchChannel', function () {
    it('should call CHAN with the parameter that it was passed and return the current channel', function ( done ) {
      var self = this;

      rawResponse = "250 5 3sat\n";
      var response = {
        number : 5,
        name : '3sat'
        };

      var client = new svdrpclient.svdrpclient();
      client.switchChannel( function( result ) {
        //assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "CHAN " + response.number + "\n");
        assert.equal( result.code, '250' );
        assert.deepEqual( result.data, response );
        done();
        }, response.number );

    });
  });
  describe('hitKey', function () {
    it('should call HITK and return a list of supported keys when called without parameter', function ( done ) {
      var self = this;

      rawResponse = fs.readFileSync("test/data/hitk_data1.txt");
      var jsonData = fs.readFileSync("test/data/hitk_result1.json");
      var response = JSON.parse(jsonData);

      var client = new svdrpclient.svdrpclient();
      client.hitKey( function( result ) {
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "HITK\n");
        done();
        });

    });
    it('should call HITK with the key that was passed as param and return the result', function ( done ) {
      var self = this;

      rawResponse = "250 Key \"1\" accepted\n";
      var key = 1;

      var client = new svdrpclient.svdrpclient();
      client.hitKey( function( result ) {
        //assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "HITK " + key + "\n");
        assert.equal( result.code, '250' );
        done();
        }, key);

    });
  });
  describe('changeVolume', function () {
    it('should call VOLU and return the current volume when called without parameter', function ( done ) {
      var self = this;

      rawResponse = "250 Audio volume is 255\n";

      var client = new svdrpclient.svdrpclient();
      client.changeVolume( function( result ) {
        //assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "VOLU\n");
        assert.equal( result.code, '250' );
        assert.equal( result.data, 255 );
        done();
        });

    });
    it('should call VOLU with the parameter it was passed and return the new volume', function ( done ) {
      var self = this;

      var volume = 50;
      rawResponse = "250 Audio volume is " + volume + "\n";

      var client = new svdrpclient.svdrpclient();
      client.changeVolume( function( result ) {
        //assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "VOLU " + volume + "\n");
        assert.equal( result.code, '250' );
        assert.equal( result.data, volume );
        done();
        }, volume);

    });
    it('should return "mute" as data when called with mute as parameter', function ( done ) {
      var self = this;

      var volume = 'mute';
      rawResponse = "250 Audio is mute\n";

      var client = new svdrpclient.svdrpclient();
      client.changeVolume( function( result ) {
        //assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "VOLU " + volume + "\n");
        assert.equal( result.code, '250' );
        assert.equal( result.data, volume );
        done();
        }, volume);

    });
  });

  describe('diskStats', function () { 
    it('should call STAT disk and return the disk statistics', function ( done ) {
      var self = this;

      rawResponse = "250 246507MB 93330MB 62%\n";
      var responseData = {
        total : 246507,
        free  : 93330,
        percent : 62
      };

      var client = new svdrpclient.svdrpclient();
      client.diskStats( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "STAT disk\n");
        assert.equal( result.code, '250' );
        assert.deepEqual( result.data, responseData );
        done();
        });

    });
  });

  describe('updateRecordings', function () {
    it('should call UPDR and return the status', function ( done ) {
      var self = this;

      rawResponse = "250 Re-read of recordings directory triggered\n";

      var client = new svdrpclient.svdrpclient();
      client.updateRecordings( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "UPDR\n");
        assert.equal( result.code, '250' );
        done();
        });

    });
  });
  describe('listRecordings', function () {
    it('should call LSTR and return all recordings when called without param', function ( done ) {
      var self = this;

      rawResponse = fs.readFileSync("test/data/lstr_data1.txt");
      var jsonData = fs.readFileSync("test/data/lstr_result1.txt");
      var response = JSON.parse(jsonData);

      var client = new svdrpclient.svdrpclient();
      client.listRecordings( function( result ) {
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTR\n");
        done();
        });

    });
    it('should call LSTR with the recording id it was passed as param', function ( done ) {
      var self = this;

      rawResponse = fs.readFileSync("test/data/lstr_data2.txt");
      var jsonData = fs.readFileSync("test/data/lstr_result2.json");
      var response = JSON.parse(jsonData);

      var client = new svdrpclient.svdrpclient();
      client.listRecordings( function( result ) {
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTR 1\n");
        done();
        }, 1);

    });
  });

  describe('deleteRecording', function () {
    it('should call DELR with the recording id it was passed and return the result', function ( done ) {
      var self = this;

      var recordingId = 44;
      rawResponse = "250 Recording \"" + recordingId + "\" deleted\n";

      var client = new svdrpclient.svdrpclient();
      client.deleteRecording( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "DELR " + recordingId + "\n");
        assert.equal( result.code, '250' );
        done();
        }, recordingId);

    });
  });
  //describe('playRecording', function () { }); // low prio
  //describe('copyRecording', function () { }); // low prio
  //describe('startEdit', function () { }); // low prio

  describe('runCommand', function() {
    it('should not allow commands with newlines, and return the "raw" result data', function ( done ) {
      var self = this;

      rawResponse = fs.readFileSync("test/data/lstr_data1.txt");
      var jsonData = fs.readFileSync("test/data/lstr_result1_raw.json");
      var response = JSON.parse(jsonData);
      var command = "LSTR\nDELR 1\n";

      var client = new svdrpclient.svdrpclient();
      client.runCommand( command, {}, function( result ) {
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTR\n");
        done();
        });

    });

    it('should work when receiving the response in several chunks', function ( done ) {
      var self = this;

      rawResponse = [];
      var responseString = fs.readFileSync("test/data/lstr_data1.txt").toString('utf8');
      var chunks = 4;
      var chunkLength = parseInt( responseString.length / chunks ) + 1;
      for( var i = 0; i < chunks; i++ ) {
        rawResponse.push( responseString.substr( i * chunkLength, chunkLength ) );
      }
      var jsonData = fs.readFileSync("test/data/lstr_result1_raw.json");
      var response = JSON.parse(jsonData);
      var command = "LSTR";

      var client = new svdrpclient.svdrpclient();
      client.runCommand( command, {}, function( result ) {
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal(self.socketStub.args[0][0], "LSTR\n");
        done();
        });

    });

    it('should use the passed options for the connection', function(done) {
      var self = this;

      var recordingId = 44;
      rawResponse = "250 Recording \"" + recordingId + "\" deleted\n";

      var timeoutStub = sinon.stub(self.socket, 'setTimeout');

      var options = { host : 'some.host.com', port : 1234, connectionTimeout: 5000 };
      var client = new svdrpclient.svdrpclient( options );
      client.deleteRecording( function( result ) {
        assert.equal(self.netStub.args[0][0], options.port );
        assert.equal(self.netStub.args[0][1], options.host );
        assert.equal(timeoutStub.args[0][0], options.connectionTimeout );
        assert( self.netStub.calledOnce );
        assert( timeoutStub.calledOnce );
        done();
        }, recordingId);
    });
  });
});

describe('svdrpclient base function failures', function() {
  describe('runCommand', function() {
    it('should return error code 901 when unable to connect', function ( done ) {
      var self = this;

      var socket = new net.Socket({});
      self.socketStub = sinon.stub(socket, 'write', function ( data ) {
        //do nothing as we're not connected
      });

      // seems like this needs to be emitted asynchronously
      setTimeout( function() {
        socket.emit('error', { 
          //[Error: connect ECONNREFUSED]
          code: 'ECONNREFUSED',
          errno: 'ECONNREFUSED',
          syscall: 'connect' });

      }, 0);

      
      var stub = sinon.stub(net, "connect");
      stub.returns( socket );

      var command = "CHAN 1";

      var client = new svdrpclient.svdrpclient();
      client.runCommand( command, {}, function( result ) {
        assert.equal( result.code, "901" );
        done();
        });

      net.connect.restore();
    });
    it('should return error code 902 when unable to connect within the timeout set', function( done ) {
      var self = this;
      var timeout = 100;
      var options = { connectionTimeout : timeout };
      this.timeout( timeout + 100 );
      this.slow( timeout + 200 );

      var socket = new net.Socket({});
      self.socketStub = sinon.stub(socket, 'write', function ( data ) {
        //do nothing as we're not connected
      });

      // seems like this needs to be emitted asynchronously
      setTimeout( function() {
        socket.emit('timeout');
      }, timeout);

      
      var stub = sinon.stub(net, "connect");
      stub.returns( socket );

      var command = "CHAN 1";
      var client = new svdrpclient.svdrpclient();
      client.runCommand( command, {}, function( result ) {
        assert.equal( result.code, "902" );
        done();
        });
      net.connect.restore();
    });
    it('should return error code 903 when not receiving a complete response within the timeout set', function ( done ) {
      var self = this;
      var timeout = 100;
      var options = { responseTimeout : timeout };
      this.timeout( timeout + 100 );
      this.slow( timeout + 200 );

      self.socket = new net.Socket({});
      self.socketStub = sinon.stub(self.socket, 'write', function ( data ) {
        if( rawResponse.constructor === Array ) {
          for( var i = 0; i < rawResponse.length; i++ ) {
            this.emit('data', rawResponse[i]);
          }
        } else {
          this.emit('data', rawResponse);
        }
      });
      
      self.netStub = sinon.stub(net, "connect");
      self.netStub.returns( self.socket );
      self.netStub.callsArgAsync( 2 );

      rawResponse = [];
      var responseString = fs.readFileSync("test/data/lstr_data1_incomplete.txt").toString('utf8');
      var chunks = 4;
      var chunkLength = parseInt( responseString.length / chunks ) + 1;
      for( var i = 0; i < chunks; i++ ) {
        rawResponse.push( responseString.substr( i * chunkLength, chunkLength ) );
      }
      var jsonData = fs.readFileSync("test/data/lstr_result1_raw.json");
      var response = JSON.parse(jsonData);
      var command = "LSTR";

      var client = new svdrpclient.svdrpclient(options);
      client.runCommand( command, {}, function( result ) {
        assert.equal( result.code, "903" );
        done();
        });

      net.connect.restore();
    });
  });
});
