const jwt = require('jsonwebtoken');
const base64 = Buffer.from("DPU").toString('base64');
module.exports = {
    generatetoken: async (payload) => {
        return jwt.sign({
            payload
        }, base64, {
            expiresIn: "1d"
        });
    },
    verifytoken: async (req, res, next) => {
        const bearer = req.headers["authorization"] === undefined ? null : req.headers["authorization"].split(" ");

        if (!bearer) {
            return res.status(401).send("unauthorized")
        }

        const token = bearer[1];

        jwt.verify(token, base64, async (err, decoded) => {
            req.jwtpayload = decoded.payload
            req.token = token
        })
        next();
    }
}