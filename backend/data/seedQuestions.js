const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Question = require('../models/Question');
const { finalQuestionBank } = require('./questionBank');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/peerlearn';

async function seed() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    // Clear existing questions
    console.log('Cleaning existing questions collection...');
    await Question.deleteMany({});
    console.log('Collection cleaned.');

    const questionsToInsert = [];

    // Parse question bank
    for (const [subjectName, data] of Object.entries(finalQuestionBank)) {
      console.log(`Processing subject: ${subjectName}`);

      // Process MCQs
      if (data.mcqs && Array.isArray(data.mcqs)) {
        data.mcqs.forEach(mcq => {
          questionsToInsert.push({
            subject: subjectName,
            type: 'mcq',
            q: mcq.q,
            options: mcq.options,
            a: mcq.a
          });
        });
      }

      // Process Coding questions
      if (data.coding && Array.isArray(data.coding)) {
        data.coding.forEach(coding => {
          questionsToInsert.push({
            subject: subjectName,
            type: 'coding',
            q: coding.q
          });
        });
      }
    }

    console.log(`Inserting ${questionsToInsert.length} questions into the database...`);
    const result = await Question.insertMany(questionsToInsert);
    console.log(`Successfully seeded ${result.length} questions.`);

    await mongoose.disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
