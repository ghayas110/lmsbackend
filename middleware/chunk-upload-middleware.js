const multer = require('multer');
const path = require('path');

const uploadChunk = multer({
    dest: path.join(__dirname, './resources/static/assets/uploads/chunks') 
});

module.exports = uploadChunk;