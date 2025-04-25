const router = require('express').Router();
const cors = require("cors");
const { verifyToken } = require('../middleware/auth-middleware');
const { XAPIKEYMIDDLEWARE } = require('../middleware/x-api-key-middleware');
const { isAdmin } = require('../middleware/isAdmin-middleware')
const { createChapter, updateChapter, deleteChapter, getAllChapters, getChapterById,copyChapter } = require('../controllers/chapter-controller');



router.post('/chapters/create-chapter', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, createChapter)

router.post('/chapters/update-chapter', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, updateChapter)

router.post('/chapters/delete-chapter', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, deleteChapter)

router.get('/chapters/get-all-chapters', verifyToken, XAPIKEYMIDDLEWARE, getAllChapters)

router.get('/chapters/get-chapter-by-Id/:chap_id', verifyToken, XAPIKEYMIDDLEWARE, getChapterById)

router.post('/chapters/copy-chapter',verifyToken,isAdmin,XAPIKEYMIDDLEWARE,copyChapter)

module.exports = router;
