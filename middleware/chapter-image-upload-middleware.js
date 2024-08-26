const util = require("util");
const multer = require("multer");
const fs = require("fs").promises;

let storageposts = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./resources/static/assets/uploads/chapterImageUpload/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now().toString().slice(0, -3)}-${file.originalname}`);
    },
});
let uploadChapters = multer({
    storage: storageposts,
}).single("chapter-image");
let uploadChaptersMiddleware = util.promisify(uploadChapters);
module.exports = uploadChaptersMiddleware;
