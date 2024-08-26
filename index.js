const express = require('express');
var bodyParser = require('body-parser');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

const userRoutes = require('./routes/user-routes');
const chapterRoutes = require('./routes/chapter-routes');
const lectureRoutes = require('./routes/lecture-routes');
const notesRoutes = require('./routes/note-routes');
const assignmentRoutes = require('./routes/assignment-routes');
const pastPaperRoutes = require('./routes/past-paper-routes');
const assignmentSubmissionRoutes = require('./routes/assignment-submission-routes');
const feesInvoicesRoutes = require('./routes/fee-routes')

const cors = require('cors');
app.use(cors());
app.use(bodyParser.json({ limit: '250mb' }));
app.use(bodyParser.urlencoded({ limit: '250mb', extended: true }));
app.use(express.json());
app.use(userRoutes, chapterRoutes, lectureRoutes, notesRoutes, assignmentRoutes, pastPaperRoutes, assignmentSubmissionRoutes, feesInvoicesRoutes);
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";
    res.status(err.statusCode).json({
        message: err.message,
    });
});
app.use((req, res, next) => {
    req.setTimeout(900000); // Set to 500 seconds (adjust as needed)
    next();
});
app.get('/', (req, res) => {
    res.send('welcome to Learning Management System')
})
app.listen(process.env.PORT, () => console.log(`server is running on port ${process.env.PORT}`));
