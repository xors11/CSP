const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/peerlearn')
  .then(async () => {
    console.log("Connected to MongoDB for cleanup.");
    
    // Find all users who are 'student' but have skills in skillsToTeach
    const studentsWithSkills = await User.find({ role: 'student', skillsToTeach: { $gt: [] } });
    console.log(`Found ${studentsWithSkills.length} student(s) with skills to clean up.`);
    
    for (const student of studentsWithSkills) {
      console.log(`Cleaning up user: ${student.name} (${student.email})`);
      student.skillsToTeach = [];
      await student.save();
    }
    
    console.log("Cleanup completed successfully.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Cleanup script error:", err);
    process.exit(1);
  });
