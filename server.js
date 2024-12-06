const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const Redis = require('ioredis');

const app = express();
const port = 3000;

// MongoDB connection URI and database/collection
const mongoURI = 'mongodb://localhost:27017';
const dbName = 'FootLab';
const collectionName = 'Player';

// Initialize Redis client
const redisClient = new Redis();

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Increment Team Player Count
async function incrementTeamPlayerCount(teamName) {
  try {
    const count = await redisClient.hincrby('team:playerCount', teamName, 1);
    console.log(`Team ${teamName} now has ${count} players.`);
    return count;
  } catch (err) {
    console.error('Error incrementing team player count:', err);
  }
}

// Decrement Team Player Count
async function decrementTeamPlayerCount(teamName) {
  try {
    const count = await redisClient.hincrby('team:playerCount', teamName, -1);
    console.log(`Team ${teamName} now has ${count} players.`);
    return count;
  } catch (err) {
    console.error('Error decrementing team player count:', err);
  }
}

// Increment Total Player Count
async function incrementPlayerCount() {
  try {
    const count = await redisClient.incr('player:totalCount');
    console.log(`Total players in the database: ${count}`);
    return count;
  } catch (err) {
    console.error('Error incrementing total player count:', err);
  }
}

// Decrement Total Player Count
async function decrementPlayerCount() {
  try {
    const count = await redisClient.decr('player:totalCount');
    console.log(`Total players in the database: ${count}`);
    return count;
  } catch (err) {
    console.error('Error decrementing total player count:', err);
  }
}

// Add a Player
async function addPlayer(db, playerData) {
  try {
    // Check if the player already exists
    const existingPlayer = await db.collection(collectionName).findOne({
      'name.first': playerData.name.first,
      'name.last': playerData.name.last,
      'DOB': playerData.DOB
    });

    if (existingPlayer) {
      console.log('Player already exists:', existingPlayer._id);
      return { message: 'Player already exists', playerId: existingPlayer._id };
    }

    // Measure the time taken to add the player to the database
    const startTime = Date.now();

    // Insert the new player
    const result = await db.collection(collectionName).insertOne(playerData);

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    console.log('Player added with ID:', result.insertedId);

    // Update counters in Redis
    await incrementTeamPlayerCount(playerData.team[0].name);
    await incrementPlayerCount();

    return { message: 'Player added successfully in the cache', playerId: result.insertedId, timeTaken: `${timeTaken} milliseconds` };
  } catch (err) {
    console.error('Error adding player:', err);
    return { message: 'Error adding player', error: err };
  }
}

// Remove a Player
async function removePlayer(db, playerId) {
  try {
    const player = await db.collection(collectionName).findOneAndDelete({ _id: new ObjectId(playerId) });
    if (player.value) {
      console.log('Player removed:', player.value);

      // Update counters in Redis
      await decrementTeamPlayerCount(player.value.team[0].name);
      await decrementPlayerCount();

      return { message: 'Player removed successfully', playerId: playerId };
    } else {
      console.log('Player not found');
      return { message: 'Player not found', playerId: playerId };
    }
  } catch (err) {
    console.error('Error removing player:', err);
    return { message: 'Error removing player', error: err };
  }
}

// Connect to MongoDB
const client = new MongoClient(mongoURI, { useUnifiedTopology: true });
let db;

client.connect()
  .then(() => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/addPlayer', async (req, res) => {
  const playerData = req.body;
  const result = await addPlayer(db, playerData);
  res.send(result);
});

app.post('/removePlayer', async (req, res) => {
  const playerId = req.body.playerId;
  const result = await removePlayer(db, playerId);
  res.send(result);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});