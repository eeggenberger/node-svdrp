svdrp = require('./lib/svdrpclient');
client = new svdrp.svdrpclient();
//client = new svdrp.svdrpclient('localhost', 6419);
client.listTimers();
//client.nextTimer();
//client.nextTimer('abs');
//client.nextTimer('rel');
