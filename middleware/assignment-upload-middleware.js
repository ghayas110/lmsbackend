const util = require("util");
const multer = require("multer");
const fs = require("fs").promises;

let storageposts = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./resources/static/assets/uploads/assignmentUpload/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now().toString().slice(0, -3)}-${file.originalname}`);
    },
});
let uploadAssignments = multer({
    storage: storageposts,
}).single("assignment");
let uploadAssignmentsMiddleware = util.promisify(uploadAssignments);
module.exports = uploadAssignmentsMiddleware;
