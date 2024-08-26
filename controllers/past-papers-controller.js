const dbConnection = require('../db-connection');
const uploadPapers = require('../middleware/paper-upload-middleware');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');


exports.createPastPaper = async (req, res) => {
    try {
        await uploadPapers(req, res);
        const { paper_title, paper_type, course_type } = req.body;
        let paper_bg_image = null;
        let paper_attachment = null;

        if (!paper_title || !paper_type) {
            await removeUploadedFiles(req.files);
            return res.status(400).json({
                message: "Paper title and type are required"
            });
        }

        if (req.files && req.files.paper_bg_image) {
            paper_bg_image = `/resources/static/assets/uploads/paperUploads/paper-bg-image/${req.files.paper_bg_image[0].filename}`;
        }

        if (req.files && req.files.papers) {
            if (paper_type === 'light_mode') {
                paper_attachment = `/resources/static/assets/uploads/paperUploads/papers/${req.files.papers[0].filename}`;
            } else {
                await removeUploadedFiles(req.files);
                return res.status(400).json({
                    message: "PDFs must be in light mode"
                });
            }
        }

        const [createPastPaper] = await dbConnection.execute(
            "INSERT INTO topical_past_papers (`paper_title`, `paper_bg_image`, `paper_attachment`, `paper_type`,`course_type`) VALUES (?,?,?,?,?)",
            [paper_title, paper_bg_image, paper_attachment, paper_type, course_type]
        );

        if (createPastPaper.affectedRows === 1) {
            return res.status(200).json({
                message: "Paper added successfully"
            });
        } else {
            await removeUploadedFiles(req.files);
            return res.status(500).json({
                message: "Could not add paper"
            });
        }
    } catch (err) {
        await removeUploadedFiles(req.files);
        return res.status(500).json({
            message: err.message
        });
    }
};

async function removeUploadedFiles(files) {
    try {
        if (files && files.paper_bg_image) {
            await Promise.all(files.paper_bg_image.map(async (file) => {
                const filePath = path.join(__dirname, '..', file.path);
                await fs.unlink(filePath).catch(err => console.error("Error deleting background image:", err.message));
            }));
        }

        if (files && files.papers) {
            await Promise.all(files.papers.map(async (file) => {
                const filePath = path.join(__dirname, '..', file.path);
                await fs.unlink(filePath).catch(err => console.error("Error deleting paper file:", err.message));
            }));
        }
    } catch (error) {
        console.error("Error removing files:", error.message);
    }
}

exports.updatePastPaper = async (req, res) => {
    try {
        await uploadPapers(req, res);

        const { paper_id, paper_title, paper_type, course_type } = req.body;

        if (!paper_id) {
            await removeUploadedFiles(req.files);
            return res.status(400).json({
                message: "Paper Id is required"
            });
        }

        const [existingPaper] = await dbConnection.execute("SELECT * FROM topical_past_papers WHERE paper_id = ?", [paper_id]);

        if (existingPaper.length === 0) {
            await removeUploadedFiles(req.files);
            return res.status(404).json({
                message: "Paper not found"
            });
        }

        let paper_bg_image = existingPaper[0].paper_bg_image;
        let paper_attachment = existingPaper[0].paper_attachment;

        // Handle paper_bg_image update
        if (req.files && req.files.paper_bg_image) {
            if (paper_bg_image) {
                const oldImagePath = path.join(__dirname, '..', paper_bg_image);
                try {
                    await fs.access(oldImagePath);
                    await fs.unlink(oldImagePath);
                } catch (error) {
                    console.warn("Could not delete old paper background image:", error.message);
                }
            }
            paper_bg_image = `/resources/static/assets/uploads/paperUploads/paper-bg-image/${req.files.paper_bg_image[0].filename}`;
        }

        // Handle paper_attachment update
        if (req.files && req.files.papers) {
            if (paper_type === 'light_mode') {
                if (paper_attachment) {
                    const oldAttachmentPath = path.join(__dirname, '..', paper_attachment);
                    try {
                        await fs.access(oldAttachmentPath);
                        await fs.unlink(oldAttachmentPath);
                    } catch (error) {
                        console.warn("Could not delete old paper attachment:", error.message);
                    }
                }
                paper_attachment = `/resources/static/assets/uploads/paperUploads/papers/${req.files.papers[0].filename}`;
            } else {
                await removeUploadedFiles(req.files);
                return res.status(400).json({
                    message: "PDFs must be in light mode"
                });
            }
        }

        const [updatePaper] = await dbConnection.execute(
            "UPDATE topical_past_papers SET paper_title = ?, paper_bg_image = ?, paper_attachment = ?, paper_type = ?, course_type = ? WHERE paper_id = ?",
            [paper_title, paper_bg_image, paper_attachment, paper_type, course_type, paper_id]
        );

        if (updatePaper.affectedRows === 1) {
            return res.status(200).json({
                message: "Paper updated successfully"
            });
        } else {
            await removeUploadedFiles(req.files);
            return res.status(500).json({
                message: "Could not update paper"
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.deletePastPaper = async (req, res) => {
    try {
        const { paper_id } = req.body;
       
        const [paper] = await dbConnection.execute(`SELECT * FROM topical_past_papers WHERE paper_id = ?`, [paper_id]);
        if (paper.length < 1) {
            return res.status(404).json({ message: "paper not found" });
        }

        const existingPaper = paper[0];

        const filesToDelete = [];
        if (existingPaper.paper_bg_image) {
            filesToDelete.push(path.join(__dirname, '..', existingPaper.paper_bg_image));
        }
        if (existingPaper.paper_attachment) {
            filesToDelete.push(path.join(__dirname, '..', existingPaper.paper_attachment));
        }

        for (const filePath of filesToDelete) {
            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
            } catch (error) {
                console.error(error.message);
            }
        }

        const [deletePastPaperResult] = await dbConnection.execute(`DELETE FROM topical_past_papers WHERE paper_id = ?`, [paper_id]);

        if (deletePastPaperResult.affectedRows === 1) {
            return res.status(200).json({ message: "Paper deleted successfully" });
        } else {
            return res.status(500).json({ message: "Failed to delete paper" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getAllPastPapers = async (req, res) => {
    try {
        const [getAllPastPapersBoth] = await dbConnection.execute(`SELECT * FROM topical_past_papers where course_type IN ('OS','AS')`);

        const [getAllPastPapers] = await dbConnection.execute(`SELECT * FROM topical_past_papers where course_type =?`, [req.data.selected_course]);        
        
            return res.status(200).json({
                message: "Papers retrieved successfully",
                data: req.data.selected_course == "Both" ? getAllPastPapersBoth : getAllPastPapers
            });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.getPastPaperById = async (req, res) => {
    try {
        const { paper_id } = req.params;
        const [paper] = await dbConnection.execute(`SELECT * FROM topical_past_papers WHERE paper_id = ?`, [paper_id]);
        
        if (paper.length > 0) {
            return res.status(200).json({
                message: "Paper retrieved successfully",
                data: paper[0] 
            });
        } else {
            return res.status(404).json({
                message: "paper not found"
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};
