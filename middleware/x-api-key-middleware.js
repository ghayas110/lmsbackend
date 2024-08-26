exports.XAPIKEYMIDDLEWARE = (req, res, next) => {
    if (req.headers['x-api-key'] !== process.env.XAPIKEY) {
        return res.status(403).send({ message: "Failed", error: "Forbidden Request" });
    }
    next();
}