const router = require('express').Router();
const cors = require("cors");
const { verifyToken } = require('../middleware/auth-middleware');
const { XAPIKEYMIDDLEWARE } = require('../middleware/x-api-key-middleware');
const { isAdmin } = require('../middleware/isAdmin-middleware')
const { checkFeeStatus } = require('../middleware/fee-approval-check-middleware')
const uploadChunk = require('../middleware/chunk-upload-middleware');
const {createLecture,updateLecture,deleteLecture,getAllLectures,getLectureByLecId,getLectureByChapterId} = require('../controllers/lecture-controller')


router.post('/lectures/create-lecture', uploadChunk.single('lecture'), createLecture);

router.post('/lectures/update-lecture', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, updateLecture)

router.post('/lectures/delete-lecture', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, deleteLecture)

router.get('/lectures/get-all-lectures', verifyToken, XAPIKEYMIDDLEWARE,checkFeeStatus, getAllLectures)

router.get('/lectures/get-lecture-by-Id/:lec_id', verifyToken, XAPIKEYMIDDLEWARE,checkFeeStatus, getLectureByLecId)

router.get('/lectures/get-lecture-by-chapter_id/:chapter_id', verifyToken, XAPIKEYMIDDLEWARE,checkFeeStatus, getLectureByChapterId)

module.exports = router;