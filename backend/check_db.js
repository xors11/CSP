const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/peerlearn')
  .then(async () => {
    const users = await User.find({});
    console.log("=== USERS IN DATABASE ===");
    console.log(`Total Users: ${users.length}`);
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error("Database connection error:", err);
    process.exit(1);
  });
