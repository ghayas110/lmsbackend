const util = require("util");
const multer = require("multer");
const fs = require("fs").promises;

let storageposts = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./resources/static/assets/uploads/assignmentSubmissions/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now().toString().slice(0, -3)}-${file.originalname}`);
    },
});
let uploadAssignmentSubmission = multer({
    storage: storageposts,
}).single("submitAssignment");
let uploadAssignmentSubmissionMiddleware = util.promisify(uploadAssignmentSubmission);
module.exports = uploadAssignmentSubmissionMiddleware;
