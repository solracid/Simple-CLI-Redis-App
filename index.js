const
  redis = require('redis'),
  parseDuration = require('parse-duration');
let
  client;


function createConnection(argv) {
  client = redis.createClient(require(argv.connection));
}

require('yargs')
  .option('connection', {
    describe: 'JSON File with Redis connection options',
    demandOption: true,
  })
  .command({
    command: 'paint <userid> <room> <duration>',
    desc: 'Add a coat of paint',
    handler: (argv) => {
      createConnection(argv);
      let duration = parseDuration(argv.duration);
      let durationSeconds = duration > 999 ? Math.round(duration / 1000) : 1;
      client.multi()
        .sadd(
          `rooms:${argv.userid}`,
          argv.room
        )
        .set(
          `paint:${argv.userid}:${argv.room}`,
          'p',
          'EX',
          durationSeconds,
          'NX'
        )
        .exec((err, responses) => {
          if (err) { throw err; }
          let newRoom = Boolean(responses[0]);
          let ttlSet = responses[1] === 'OK' ? true : false;
          console.log(`Hi ${argv.userid}.`);
          if (newRoom) {
            if (ttlSet) {
              console.log(`The first coat for room ${argv.room} will be dry in ${durationSeconds} second(s).`);
            } else {
              console.log('This is impossible.');
            }
          } else {
            if (ttlSet) {
              console.log(`You can repaint ${argv.room} and it will be dry in ${durationSeconds} second(s).`);
            } else {
              console.log(`The room ${argv.room} was recently painted and you shouldn't repaint.`);
            }
          }
          client.quit();
        });
    }
  })
  .command({
    command: 'readytopaint <userid> <room>',
    desc: 'Check if you are ready to paint again',
    handler: (argv) => {
      createConnection(argv);
      client.multi()
        .sismember(`rooms:${argv.userid}`, argv.room)
        .ttl(`paint:${argv.userid}:${argv.room}`)
        .exec((err, responses) => {
          if (err) { throw err; }
          console.log(`Hi ${argv.userid}.`);
          let roomExists = Boolean(responses[0]);
          let ttlResponse = responses[1];
          let timeLeftToLive = ttlResponse >= 0;
          if (timeLeftToLive) {
            if (roomExists) {
              console.log(`The room ${argv.room} still needs to dry. It will be ready to re-coat in ${ttlResponse} second(s)`);
            } else {
              console.log('This is invalid.');
            }
          } else {
            if (roomExists) {
              console.log(`The room ${argv.room} can be repainted.`);
            } else {
              console.log(`${argv.room} doesn't exist.`);
            }
          }
          client.quit();
        });
    }
  })
  .demandCommand()
  .help()
  .argv;