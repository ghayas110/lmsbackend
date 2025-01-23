const router = require('express').Router();
const cors = require("cors");
const { verifyToken } = require('../middleware/auth-middleware');
const { XAPIKEYMIDDLEWARE } = require('../middleware/x-api-key-middleware');
const { isAdmin } = require('../middleware/isAdmin-middleware')

const { createAssignment, updateAssignment, deleteAssignment, getAllAssignments, getAssignmentById, getAllAssignmentsAdmin } = require('../controllers/assignment-controller');

router.post('/assignments/create-assignment', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, createAssignment)

router.post('/assignments/update-assignment', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, updateAssignment)

router.post('/assignments/delete-assignment', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, deleteAssignment)

router.get('/assignments/get-all-assignments', verifyToken, XAPIKEYMIDDLEWARE, getAllAssignments)

router.get('/assignments/get-all-assignments-admin', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, getAllAssignmentsAdmin)

router.get('/assignments/get-assignment-by-Id/:assignment_id', verifyToken, XAPIKEYMIDDLEWARE, getAssignmentById)

module.exports = router;