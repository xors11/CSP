const mongoose = require('mongoose');
require('dotenv').config();
const Question = require('./models/Question');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/peerlearn')
  .then(async () => {
    console.log("Connected to MongoDB to check questions.");
    
    // Group questions by subject and type
    const stats = await Question.aggregate([
      { $group: { _id: { subject: "$subject", type: "$type" }, count: { $sum: 1 } } }
    ]);
    console.log("=== QUESTION COLLECTION STATS ===");
    console.log(JSON.stringify(stats, null, 2));
    
    // Fetch a sample of questions
    const samples = await Question.find({}).limit(5);
    console.log("\n=== SAMPLE QUESTIONS ===");
    console.log(JSON.stringify(samples, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error("Error checking questions:", err);
    process.exit(1);
  });
