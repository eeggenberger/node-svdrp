svdrp = require('./lib/svdrpclient');
client = new svdrp.svdrpclient();
//client = new svdrp.svdrpclient('localhost', 6419);
//client.listTimers();
//client.listChannels( console.log );
//client.listChannels( console.log, 1 );
//client.nextTimer();
//client.nextTimer('abs');
client.nextTimer( console.log, 'rel');
