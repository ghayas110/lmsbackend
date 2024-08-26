const util = require("util");
const multer = require("multer");
const fs = require("fs").promises;

let storageposts = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./resources/static/assets/uploads/lectureUploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now().toString().slice(0, -3)}-${file.originalname}`);
    },
});
let uploadLectures = multer({
    storage: storageposts,
    limits: {
        fileSize: 250 * 1024 * 1024, // Set file size limit to 50MB (adjust as needed)
    },
}).single("lecture");
let uploadLecturesMiddleware = util.promisify(uploadLectures);
module.exports = uploadLecturesMiddleware;
