const router = require('express').Router();

const cors = require("cors");

const { verifyToken } = require('../middleware/auth-middleware');

const { XAPIKEYMIDDLEWARE } = require('../middleware/x-api-key-middleware');

const { isAdmin } = require('../middleware/isAdmin-middleware')



const { signUp, loginUser, deleteStudent, getAllUsers, getUserById, updateUserProfile, changePassword, approveStudentAccess, rejectStudentAccess, getDashboardCounts } = require('../controllers/user-controller');



router.post('/users/create-user', XAPIKEYMIDDLEWARE, signUp)



router.post('/users/login-user', XAPIKEYMIDDLEWARE, loginUser)



router.post('/users/update-user-profile', verifyToken, XAPIKEYMIDDLEWARE, updateUserProfile)



router.get('/users/get-all-users', verifyToken, XAPIKEYMIDDLEWARE, getAllUsers)



router.get('/users/get-user-by-Id/:id', verifyToken, XAPIKEYMIDDLEWARE, getUserById)



router.post('/users/approve-student-access', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, approveStudentAccess)



router.post('/users/reject-student-access', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, rejectStudentAccess)



router.post('/users/change-password', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, changePassword)



router.get('/users/get-dashboard-counts', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, getDashboardCounts)



router.post('/users/delete-student', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, deleteStudent)




module.exports = router;
