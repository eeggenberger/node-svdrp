var assert = require('assert');
var sinon = require('sinon');
var net = require('net');
var svdrpclient = require('../lib/svdrpclient.js');
var EventEmitter = require('events').EventEmitter;
var fs = require("fs");

describe('svdrpclient base functions', function() {

  var rawResponse;

  beforeEach( function(done) {
    var self = this;
    rawResponse = '';

    var socket = new net.Socket({});
    self.socketStub = sinon.stub(socket, 'write', function ( data ) {
      this.emit('data', rawResponse);
    });
    
    var stub = sinon.stub(net, "connect");
    stub.returns( socket );
    stub.callsArgAsync( 2 );

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
      rawResponse = "220 krserver SVDRP VideoDiskRecorder 2.2.0; Tue Nov 10 22:38:02 2015; UTF-8\r\n" +
        "250 1 Thu Nov 12 22:25:00 2015\r\n" +
        "221 krserver closing connection\r\n"
      var response = { code: '250', data: { timer: '1', time: new Date('2015-11-12T22:25:00') } };

      var client = new svdrpclient.svdrpclient();
      client.nextTimer( function( result ) {
        //assert.deepEqual( result, response );
        assert.strictEqual( result.data.time.toJSON(), response.data.time.toJSON()   );
        assert( self.socketStub.calledOnce );
        assert.equal("NEXT \n", self.socketStub.args[0][0]);
        done();
        });

    });

    it('should return a timer id and a integer when called with rel as option', function ( done ) {
      var self = this;
      rawResponse = "220 krserver SVDRP VideoDiskRecorder 2.2.0; Tue Nov 10 22:38:02 2015; UTF-8\r\n" +
        "250 1 171412\r\n" +
        "221 krserver closing connection\r\n"
      var response = { code: '250', data: { timer: '1', time: '171412' } };

      var client = new svdrpclient.svdrpclient();
      client.nextTimer( function( result ) {
        assert.deepEqual( result, response );
        assert( parseInt( result.data.time ) > 0 );
        assert( self.socketStub.calledOnce );
        assert.equal("NEXT rel\n", self.socketStub.args[0][0]);
        done();
        },'rel');

    });

    it('should return a timer id and a timestamp integer when called with abs as option', function ( done ) {
      var self = this;

      rawResponse = "220 krserver SVDRP VideoDiskRecorder 2.2.0; Tue Nov 10 22:38:02 2015; UTF-8\r\n" +
        "250 1 1447363500\r\n" +
        "221 krserver closing connection\r\n"
      var response = { code: '250', data: { timer: '1', time: '1447363500' } };

      var client = new svdrpclient.svdrpclient();
      client.nextTimer( function( result ) {
        assert.deepEqual( result, response );
        assert( parseInt( result.data.time ) > 0 );
        assert( self.socketStub.calledOnce );
        assert.equal("NEXT abs\n", self.socketStub.args[0][0]);
        done();
        },'abs');

    });
  });

  describe('listTimers', function () {

    it('should call LSTT without parameter and return a timer struct', function ( done ) {
      var self = this;

      rawResponse = "220 krserver SVDRP VideoDiskRecorder 2.2.0; Wed Nov 11 23:12:52 2015; UTF-8\r\n" +
        "250-1 1:22:2015-11-12:2225:2315:50:99:NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don:" +
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
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal("LSTT\n", self.socketStub.args[0][0]);
        done();
        });

    });

    it('should call LSTT with a timer id when passed an integer', function ( done ) {
      var self = this;

      rawResponse = "220 krserver SVDRP VideoDiskRecorder 2.2.0; Wed Nov 11 23:12:52 2015; UTF-8\r\n" +
        "250 1 1:22:2015-11-12:2225:2315:50:99:NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don:" +
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
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal("LSTT 1\n", self.socketStub.args[0][0]);
        done();
        }, 1);
    });

    it('should call LSTT withthout a timer id when passed anything other than an integer', function ( done ) {
      var self = this;

      rawResponse = "220 krserver SVDRP VideoDiskRecorder 2.2.0; Wed Nov 11 23:12:52 2015; UTF-8\r\n" +
        "250 1 1:22:2015-11-12:2225:2315:50:99:NEO MAGAZIN ROYALE mit Jan Böhmermann~2015.11.12-22|30-Don:" +
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
        assert.deepEqual( result, response );
        assert( self.socketStub.calledOnce );
        assert.equal("LSTT\n", self.socketStub.args[0][0]);
        done();
        }, 'abc');
    });
  });

  describe('listEPG', function () {
    
    var emptyEpg = "220 krserver SVDRP VideoDiskRecorder 2.2.0; Sun Nov 15 11:07:40 2015; UTF-8\n" +
      "215-C C-1-1051-11100 Das Erste HD\n" +
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
        assert.equal("LSTE\n", self.socketStub.args[0][0]);
        done();
        });

    });

    it('should call LSTE with now as parameter if passed now as param', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal("LSTE now\n", self.socketStub.args[0][0]);
        done();
        }, null, 'now');
    });

    it('should call LSTE with next as parameter if passed next as param', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal("LSTE next\n", self.socketStub.args[0][0]);
        done();
        }, null, 'next');
    });

    it('should call LSTE with "at <timestamp>" as parameter if passed an integer', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal("LSTE at 1447578900\n", self.socketStub.args[0][0]);
        done();
        }, null, 1447578900);
    });

    it('should call LSTE with a channel as parameter if one is passed', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal("LSTE 2\n", self.socketStub.args[0][0]);
        done();
        }, 2 );
    });

    it('should call LSTE with "channel at <timestamp>" as parameters if passed a channel and an integer', function ( done ) {
      var self = this;

      rawResponse = emptyEpg;

      var client = new svdrpclient.svdrpclient();
      client.listEPG( function( result ) {
        assert( self.socketStub.calledOnce );
        assert.equal("LSTE 2 at 1447578900\n", self.socketStub.args[0][0]);
        done();
        }, 2, 1447578900);
    });

  });
});

