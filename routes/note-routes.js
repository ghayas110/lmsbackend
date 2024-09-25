const router = require('express').Router();
const cors = require("cors");
const { verifyToken } = require('../middleware/auth-middleware');
const { XAPIKEYMIDDLEWARE } = require('../middleware/x-api-key-middleware');
const { isAdmin } = require('../middleware/isAdmin-middleware')
const { checkFeeStatus } = require('../middleware/fee-approval-check-middleware')

const { createNote, updateNote, deleteNote, getAllNotes, getNoteById, createWebNote, getAllWebNotes, getWebNotesById ,updateWebNote,deleteWebNote} = require('../controllers/notes-controller')


router.post('/notes/create-notes', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, createNote)

router.post('/notes/update-notes', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, updateNote)

router.post('/notes/delete-notes', verifyToken, isAdmin, XAPIKEYMIDDLEWARE, deleteNote)

router.get('/notes/get-all-notes', verifyToken, XAPIKEYMIDDLEWARE, checkFeeStatus, getAllNotes)

router.get('/notes/get-note-by-Id/:note_id', verifyToken, XAPIKEYMIDDLEWARE, checkFeeStatus, getNoteById)

router.post('/notes/create-web-notes', createWebNote)

router.post('/notes/update-web-notes', updateWebNote)

router.post('/notes/delete-web-notes', deleteWebNote)

router.get('/notes/get-all-web-notes', getAllWebNotes)

router.get('/notes/get-web-note-by-Id/:note_id', getWebNotesById)


module.exports = router;