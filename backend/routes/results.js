const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');

// Submit exam results
router.post('/submit', resultController.submitResult);

// Get a single result details by result ID
router.get('/:result_id', resultController.getResultById);

// Get all results for a particular student
router.get('/student/:student_id', resultController.getStudentResults);

// Get all student results for a particular exam (mentor dashboard view)
router.get('/exam/:exam_id', resultController.getExamResults);

module.exports = router;
