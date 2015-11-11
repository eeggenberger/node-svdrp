var assert = require('assert');
var sinon = require('sinon');
var net = require('net');
var svdrpclient = require('../lib/svdrpclient.js');
var EventEmitter = require('events').EventEmitter;

describe('svdrpclient base functions', function() {
  describe('nextTimer)', function () {
    beforeEach( function(done) {
      done();
    });

    afterEach( function(done) {
      done();
    });

    it('should return a timer id and a integer when called with rel as option', function ( done ) {

      var rawResponse = "220 krserver SVDRP VideoDiskRecorder 2.2.0; Tue Nov 10 22:38:02 2015; UTF-8\r\n" +
        "250 1 171412\r\n" +
        "221 krserver closing connection\r\n"
      var response = { code: '250', data: { timer: '1', time: '171412' } };


      var socket = new net.Socket({});
      var socketStub = sinon.stub(socket, 'write', function (data, encoding, cb) {
          this.emit('data', rawResponse);
      });
      
      var stub = sinon.stub(net, "connect");
      stub.returns( socket );
      stub.callsArgAsync( 2 );
      var client = new svdrpclient.svdrpclient();
      client.nextTimer( function( result ) {
        assert.deepEqual( result, response );
        done();
        },'rel');

    });
  });
});

