const express = require("express");
const path = require("path");
const app = express();

const staticPath = path.join(__dirname, "public");
app.use(express.json());
app.post("/chrome-extension", (req, res) => {
    console.log(req.body.url, `"${req.body.body.slice(0, 10)}..."`);
    res.status(200).end();
});
app.post("/report", (req, res) => {
    console.log(`reported`);
    res.status(200).end();
});
app.use(express.static(staticPath));
const port = 5000;
app.listen(port, () => {
    console.log(`Listening to port ${port}`);
});
