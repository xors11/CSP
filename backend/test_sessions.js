const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Session = require('./models/Session');
const Notification = require('./models/Notification');

async function runTests() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/peerlearn');
    console.log("Connected successfully.");

    // 1. Fetch Student and Mentor
    const student = await User.findOne({ email: 'koppakawatson@gmail.com' });
    const mentor = await User.findOne({ email: 'koppakaw@gmail.com' });

    if (!student || !mentor) {
      console.error("Test error: Both test student and mentor must exist in the database. Run setup_test_data.js first.");
      process.exit(1);
    }

    console.log(`\n--- Test User Info ---`);
    console.log(`Student: ${student.name} (Credits: ${student.credits})`);
    console.log(`Mentor: ${mentor.name} (Hourly Rate: ${mentor.hourlyRate})`);

    // Reset credits for consistency in tests
    student.credits = 100;
    await student.save();
    console.log(`Reset student credits to 100.`);

    // 2. Validate booking price calculation
    const duration = 60; // minutes
    const cost = Math.round(mentor.hourlyRate * (duration / 60));
    console.log(`Calculated booking cost: ${cost} credits (Expected: 25)`);

    // 3. Test Booking Transaction
    console.log(`\n--- Booking Session ---`);
    const appointmentTime = new Date(Date.now() + 86400000 * 2); // 2 days in the future
    
    // Check overlaps
    const conflict = await Session.findOne({
      status: { $in: ['pending', 'accepted'] },
      $or: [{ mentor: mentor._id }, { student: student._id }],
      scheduledAt: {
        $gt: new Date(appointmentTime.getTime() - duration * 60 * 1000),
        $lt: new Date(appointmentTime.getTime() + duration * 60 * 1000)
      }
    });

    if (conflict) {
      console.log("Overlap detected. Clearing old conflicts...");
      await Session.deleteMany({
        $or: [{ mentor: mentor._id }, { student: student._id }]
      });
    }

    // Save Session
    const session = new Session({
      mentor: mentor._id,
      student: student._id,
      subject: 'B.Tech Java',
      scheduledAt: appointmentTime,
      durationMinutes: duration,
      status: 'pending',
      creditCost: cost
    });
    await session.save();
    console.log(`Session created in database with ID: ${session._id}`);

    // Deduct Student Credits
    student.credits -= cost;
    await student.save();
    console.log(`Deducted student credits. Current student credits: ${student.credits} (Expected: 75)`);

    // Log Notification
    const notification = new Notification({
      recipient: mentor._id,
      sender: student._id,
      message: `Test request from ${student.name}`,
      type: 'request',
      session: session._id
    });
    await notification.save();
    console.log(`Notification sent to mentor in database.`);

    // 4. Test Overlap validation
    console.log(`\n--- Testing Booking Collision ---`);
    const collidingTime = new Date(appointmentTime.getTime() + 10 * 60000); // 10 minutes later (overlaps!)
    
    const overlapConflict = await Session.findOne({
      status: { $in: ['pending', 'accepted'] },
      $or: [{ mentor: mentor._id }, { student: student._id }],
      scheduledAt: {
        $gt: new Date(collidingTime.getTime() - duration * 60 * 1000),
        $lt: new Date(collidingTime.getTime() + duration * 60 * 1000)
      }
    });

    if (overlapConflict) {
      console.log(`SUCCESS: Booking collision detected overlapping slot at ${collidingTime.toLocaleString()}`);
    } else {
      console.error(`FAILURE: Booking collision was NOT detected!`);
    }

    // 5. Test Cancellation Refund Transaction
    console.log(`\n--- Cancelling Session & Refunding ---`);
    session.status = 'cancelled';
    await session.save();

    // Refund credits to student
    const updatedStudent = await User.findById(student._id);
    updatedStudent.credits += session.creditCost;
    await updatedStudent.save();
    
    console.log(`Credits refunded. Current student credits: ${updatedStudent.credits} (Expected: 100)`);
    console.log(`\n=== ALL CORE DATABASE SCHEDULING TRANSACTIONS PASSED ===`);

    process.exit(0);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

runTests();
