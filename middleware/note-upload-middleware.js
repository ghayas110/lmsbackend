const multer = require('multer');
const util = require("util");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "note_bg_image") {
      cb(null, './resources/static/assets/uploads/notesUpload/notes-bg-image/');
    } else if (file.fieldname === "notes") {
      cb(null, './resources/static/assets/uploads/notesUpload/notes/');
    }
    else {
      cb(new Error("Unexpected field"), null);
    }
  },
  filename: (req, file, cb) => {
        cb(null, `${Date.now().toString().slice(0, -3)}-${file.originalname}`);
    }
});
const uploadNotes = multer({ storage: storage }).fields([
  { name: 'note_bg_image', maxCount: 1 },
  { name: 'notes', maxCount: 1 }
]);


let uploadNotesMiddleware = util.promisify(uploadNotes);
module.exports = uploadNotesMiddleware;



