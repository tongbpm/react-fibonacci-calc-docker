const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const redis = require('redis');

const app = express();
app.use(cors());

app.use(express.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on('error', () => console.log('Lost Postgres connection'));

pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT);')
    .catch(err=> console.log(err))

// pgClient.on('connect', () => {
//   pgClient
//     .query('CREATE TABLE IF NOT EXISTS values (number INT)')
//     .catch((err) => console.log(err));
// });

// pgClient.on('connect', () => {
//   pgClient
//     .query('CREATE TABLE IF NOT EXISTS values (number integer);')
//     .catch((err) => console.log(err));
// });

// pgClient.on('connect', pgC => {
//   pgClient
//     .query('CREATE TABLE IF NOT EXISTS values (number integer);')
//     .then(res => console.log(res.rows[0].name))
//     .catch((err) => console.log(err));
// });


// Redis Client Setup
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values;');
  // const values = await pgClient.query('INSERT INTO values (integer) VALUES(1);');

  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  // pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
  pgClient.query('INSERT INTO values(number) VALUES($1);', [index]);

  res.send({ working: true });
});

app.listen(5499, (err) => {
  console.log('Listening');
});
