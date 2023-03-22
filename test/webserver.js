const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const staticPath = path.join(__dirname, "public");
app.use(express.json());
app.get("/index-Some4Hash-test.js", (req, res) => {
    const lines = fs.readFileSync("./index-Some4Hash-test.js", "utf8").split("\n");
    const builder = [];
    for (const line of lines) {
        if (line.includes("DUMMY")) {
            for (let i = 0; i < 100000; i++) {
                builder.push(line);
            }
        }
        builder.push(line);
    }
    res.header("content-type", "application/javascript");
    res.send(builder.join("\n"));
});

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
