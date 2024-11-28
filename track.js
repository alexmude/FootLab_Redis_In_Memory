const { MongoClient, ObjectId } = require('mongodb');
const Redis = require('ioredis');

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

// Increment Team Player Count
async function incrementTeamPlayerCount(teamId) {
  try {
    const count = await redisClient.hincrby('team:playerCount', teamId, 1);
    console.log(`Team ${teamId} now has ${count} players.`);
    return count;
  } catch (err) {
    console.error('Error incrementing team player count:', err);
  }
}

// Decrement Team Player Count
async function decrementTeamPlayerCount(teamId) {
  try {
    const count = await redisClient.hincrby('team:playerCount', teamId, -1);
    console.log(`Team ${teamId} now has ${count} players.`);
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
    const result = await db.collection(collectionName).insertOne(playerData);
    console.log('Player added with ID:', result.insertedId);

    // Update counters in Redis
    await incrementTeamPlayerCount(playerData.team[0].team_id);
    await incrementPlayerCount();

    return result.insertedId;
  } catch (err) {
    console.error('Error adding player:', err);
  }
}

// Remove a Player
async function removePlayer(db, playerId) {
  try {
    const player = await db.collection(collectionName).findOneAndDelete({ _id: new ObjectId(playerId) });
    if (player.value) {
      console.log('Player removed:', player.value);

      // Update counters in Redis
      await decrementTeamPlayerCount(player.value.team[0].team_id);
      await decrementPlayerCount();
    } else {
      console.log('Player not found');
    }
  } catch (err) {
    console.error('Error removing player:', err);
  }
}

async function main() {
    const client = new MongoClient(mongoURI, { useUnifiedTopology: true });
  
    try {
      // Connect to MongoDB
      await client.connect();
      console.log('Connected to MongoDB');
      const db = client.db(dbName);
  
      // Add a new player to Real Madrid
      const newPlayer = {
        name: { first: 'Dani', last: 'Carvajal', surname: 'Carvajal' },
        description: 'Reliable right-back known for his defensive skills',
        DOB: new Date('1992-01-11'),
        statistics: [
          {
            statistics_id: 6,
            goals: 2,
            assists: 5,
            penalty_scored: 0,
            yellow_card: 3,
            red_card: 0,
            game_played: 30,
            season_year: 2023,
            competition: 'La Liga',
            team: 'Real Madrid'
          }
        ],
        trophy: [
          { trophy_id: 6, name: 'La Liga' }
        ],
        team: [
          { team_id: 1, name: 'Real Madrid', type: 'club' }
        ],
        injury: [
          {
            injury_id: 6,
            name: 'Ankle Sprain',
            type: 'Ligament',
            duration: '2 weeks',
            date: new Date('2023-03-15'),
            time: '16:00',
            cause: 'Tackle'
          }
        ]
      };
  
      const playerId = await addPlayer(db, newPlayer);
  
      // Remove a player (replace with a valid ObjectId from your database)
      // await removePlayer(db, playerId);
  
    } catch (err) {
      console.error('Error in main execution:', err);
    } finally {
      // Clean up connections
      await redisClient.quit();
      await client.close();
    }
  }
  
  // Run the script
  main();