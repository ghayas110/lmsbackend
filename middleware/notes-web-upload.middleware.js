const util = require("util");
const multer = require("multer");
const fs = require("fs").promises;

let storageposts = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "note") {
            cb(null, "./resources/static/assets/uploads/notesWeb/");
        } else if (file.fieldname === "noteImage") {
            cb(null, "./resources/static/assets/uploads/noteImages/");
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now().toString().slice(0, -3)}-${file.originalname}`);
    },
});

let uploadWebNotes = multer({
    storage: storageposts,
}).fields([
    { name: "note", maxCount: 1 },       // Field for the note file
    { name: "noteImage", maxCount: 1 }   // Field for the note image file
]);
let uploadWebNoteMiddleware = util.promisify(uploadWebNotes);
module.exports = uploadWebNoteMiddleware;
