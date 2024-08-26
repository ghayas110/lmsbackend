const multer = require('multer');
const util = require("util");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "paper_bg_image") {
      cb(null, './resources/static/assets/uploads/paperUploads/paper-bg-image/');
    } else if (file.fieldname === "papers") {
      cb(null, './resources/static/assets/uploads/paperUploads/papers/');
    }
    else {
      cb(new Error("Unexpected field"), null);
    }
  },
  filename: (req, file, cb) => {
        cb(null, `${Date.now().toString().slice(0, -3)}-${file.originalname}`);
    }
});
const uploadPapers = multer({ storage: storage }).fields([
  { name: 'paper_bg_image', maxCount: 1 },
  { name: 'papers', maxCount: 1 }
]);


let uploadPapersMiddleware = util.promisify(uploadPapers);
module.exports = uploadPapersMiddleware;

