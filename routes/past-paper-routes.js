const router = require('express').Router();
const cors = require("cors");
const { verifyToken } = require('../middleware/auth-middleware');
const { XAPIKEYMIDDLEWARE } = require('../middleware/x-api-key-middleware');
const { isAdmin } = require('../middleware/isAdmin-middleware')

const { createPastPaper, updatePastPaper, deletePastPaper, getAllPastPapers, getPastPaperById } = require('../controllers/past-papers-controller')


router.post('/papers/create-past-paper', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, createPastPaper)

router.post('/papers/update-past-paper', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, updatePastPaper)

router.post('/papers/delete-past-paper', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, deletePastPaper)

router.get('/papers/get-all-past-papers', verifyToken, XAPIKEYMIDDLEWARE, getAllPastPapers)

router.get('/papers/get-past-paper-by-Id/:paper_id', verifyToken, XAPIKEYMIDDLEWARE, getPastPaperById)

module.exports = router;