const router = require('express').Router();
const cors = require("cors");
const { verifyToken } = require('../middleware/auth-middleware');
const { XAPIKEYMIDDLEWARE } = require('../middleware/x-api-key-middleware');
const { isAdmin } = require('../middleware/isAdmin-middleware')


const { submitAssignment, updateSubmittedAssignment, deleteSubmittedAssignment, getAllSubmittedAssignments, getSubmittedAssignmentsById, getAllSubmittedAssignmentsAdmin, checkAssignment } = require('../controllers/assignment-submission-controller')

router.post('/submission/submit-assignment', verifyToken, XAPIKEYMIDDLEWARE, submitAssignment)

router.post('/submission/update-submitted-assignment', verifyToken, XAPIKEYMIDDLEWARE, updateSubmittedAssignment)

router.post('/submission/delete-submitted-assignment', verifyToken, XAPIKEYMIDDLEWARE, deleteSubmittedAssignment)

router.get('/submission/get-all-submitted-assignment', verifyToken, XAPIKEYMIDDLEWARE, getAllSubmittedAssignments)

router.get('/submission/get-submitted-assignment-by-Id/:submission_id', verifyToken, XAPIKEYMIDDLEWARE, getSubmittedAssignmentsById)

router.get('/submission/get-all-submitted-assignments-admin', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, getAllSubmittedAssignmentsAdmin)

router.post('/submission/check-assignment', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, checkAssignment)

module.exports = router;