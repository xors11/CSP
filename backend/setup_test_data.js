const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/peerlearn')
  .then(async () => {
    console.log("Connected to MongoDB");
    
    // Find the user 'watson'
    const email = 'koppakaw@gmail.com';
    let user = await User.findOne({ email });
    
    if (user) {
      user.role = 'mentor';
      user.isVerifiedMentor = true;
      user.skillsToTeach = ['B.Tech Java', '10th English', 'B.Tech Data Structures'];
      user.availableTimings = ['Weekends 10AM - 2PM', 'Weekdays Evening 6PM - 9PM'];
      user.hourlyRate = 25; // 25 credits per hour
      await user.save();
      
      console.log("=== SUCCESSFULLY UPDATED USER TO MENTOR ===");
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log(`User with email ${email} not found.`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error("Database connection error:", err);
    process.exit(1);
  });
