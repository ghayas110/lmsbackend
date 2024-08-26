const express = require('express');
const dbConnection = require('../db-connection');
const { promisify } = require('util')
// const fs2 = require('fs');
const fs = require('fs').promises;
const unlinkAsync = promisify(fs.unlink)
const path = require('path');
const multer = require('multer');
const { videoDuration } = require('@numairawan/video-duration');
const fse = require('fs-extra');
const { listenerCount } = require('process');


exports.createLecture = async (req, res) => {
    try {
        var { chapter_id, title, file_type, chunkNumber, totalChunks, file_extension, fileName } = req.body;
        console.log(req.body);
        if (!chapter_id || !title || !file_type || !fileName) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        var date = Date.now().toString().slice(0, -3);
        var chunkFilePath = './resources/static/assets/uploads/lectureUploads/' + `${fileName}.part${chunkNumber}`;

        await fse.move(req.file.path, chunkFilePath, { overwrite: true });

        var finalFilePath;
        if (chunkNumber === totalChunks) {
            finalFilePath = './resources/static/assets/uploads/lectureUploads/' + date + '-' + fileName;
            var writeStream = fse.createWriteStream(finalFilePath);

            for (let i = 1; i <= totalChunks; i++) {
                var chunkFile = './resources/static/assets/uploads/lectureUploads/' + `${fileName}.part${i}`;
                var data = await fse.readFile(chunkFile);
                writeStream.write(data);
                await fse.remove(chunkFile);
            }

            writeStream.end();

            let duration = '0';
            var file_url = '/resources/static/assets/uploads/lectureUploads/' + date + '-' + fileName;

            if (file_extension === 'mp4' || file_extension === 'avi' || file_extension === 'mkv') {
                try {
                    var videoData = await videoDuration(finalFilePath);
                    duration = videoData.seconds.toString();
                    file_type = 'video';
                } catch (error) {
                    return res.status(500).json({
                        message: "Could not process the video file",
                        error: error.message
                    });
                }
            } else if (file_extension === 'pdf') {
                duration = '0';
                file_type = 'pdf';
            } else {
                return res.status(400).json({
                    message: "Invalid file type"
                });
            }

            console.log("INSERT INTO lectures (chapter_id, title, duration, file_type, file_url) VALUES (?, ?, ?, ?, ?)",
                [chapter_id, title, duration, file_type, file_url]);

            var [createLecture] = await dbConnection.execute(
                "INSERT INTO lectures (chapter_id, title, duration, file_type, file_url) VALUES (?, ?, ?, ?, ?)",
                [chapter_id, title, duration, file_type, file_url]
            );

            if (createLecture.affectedRows === 1) {
                return res.status(200).json({ message: "File uploaded and merged successfully!", filePath: finalFilePath });
            } else {
                return res.status(500).json({ message: "Could not add lecture" });
            }
        } else {
            res.json({ message: `Chunk ${chunkNumber} uploaded successfully!` });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

exports.updateLecture = async (req, res) => {
    try {
        const { lec_id, chapter_id, title } = req.body;

        if (!lec_id || !chapter_id || !title) {
            return res.status(400).json({
                message: "Lecture Id, chapter Id, and title are required"
            });
        }

        const [existingLecture] = await dbConnection.execute(`SELECT * FROM lectures WHERE lec_id = ?`, [lec_id]);
        if (existingLecture.length === 0) {
            return res.status(404).json({
                message: "Lecture not found"
            });
        }

        const [updateLecture] = await dbConnection.execute(
            `UPDATE lectures SET chapter_id = ?, title = ? WHERE lec_id = ?`,
            [chapter_id, title, lec_id]
        );

        if (updateLecture.affectedRows === 1) {
            return res.status(200).json({
                message: "Lecture updated successfully"
            });
        } else {
            return res.status(500).json({
                message: "Could not update lecture"
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.deleteLecture = async (req, res) => {
    try {
        const [lecture] = await dbConnection.execute(`SELECT file_url FROM lectures WHERE lec_id = ?`, [req.body.lec_id]);
        
           if (lecture.length === 0) {
            return res.status(404).json({
                message: "Lecture not found"
            });
        }
        
        const lectureImageUrl = lecture[0].file_url;

        if (lectureImageUrl) {
            const imagePath = path.join(__dirname, '..', lectureImageUrl);
            if (fs.access(imagePath)) {
                fs.unlink(imagePath);
            }
        }

        const [deleteLecture] = await dbConnection.execute(`DELETE FROM lectures WHERE lec_id = ?`, [req.body.lec_id]);

        return res.status(200).json({
            message: "lecture deleted successfully"
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.getAllLectures = async (req, res) => {
    try {
        const [getAllLectures] = await dbConnection.execute(`select l.*,c.chapter_name from lectures l left join chapters c on l.chapter_id = c.chap_id`);

        return res.status(200).json({
            message: "lectures retrieved successfully",
            data: getAllLectures
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.getLectureByLecId = async (req, res) => {
    try {
        const { lec_id } = req.params;
        const [getLectureByLecId] = await dbConnection.execute(`select l.*,c.chapter_name from lectures l left join chapters c on l.chapter_id = c.chap_id
        where l.lec_id=?`, [lec_id]);

        return res.status(200).json({
            message: "lecture retrieved successfully",
            data: getLectureByLecId[0]
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.getLectureByChapterId = async (req, res) => {
    try {
        const { chapter_id } = req.params;
        const [getLectureByLecId] = await dbConnection.execute(`select l.*,c.chapter_name from lectures l left join chapters c on l.chapter_id = c.chap_id
 where l.chapter_id=?`, [chapter_id]);

        return res.status(200).json({
            message: "lecture retrieved successfully",
            data: getLectureByLecId[0]
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};