
const { App } = require("uWebSockets.js");
const fs = require("fs");
const zlib = require("zlib");
const { debounce } = require("lodash");

const PORTS = [ 3000, 3005, 3010, 3015, 3020, 3030 ];


function getInstalledModsBuffer() {
    return new Promise(resolve => {
        fs.readdir("./build", async (err, files) => {
            if(err) {
                console.error(err);
                return;
            }
            const mods = [];
            for (const file of files) {
                await new Promise(r => {
                    fs.readFile(`./build/${file}`, (err, data) => {
                        if(err) {
                            console.error(err);
                            r();
                            return;
                        }
                        zlib.gunzip(data, (err, decoded) => {
                            const decoder = new TextDecoder("utf-8");
                            const text = decoder.decode(new Uint8Array(decoded));
                            mods.push(text);
                            if (err) {
                                console.error(err);
                            }
                            r();
                        });
                    });
                });
            }
            const pack = {
                type: "install-mods",
                data: mods,
            };
            resolve(pack);
        });
    });
}

function tryPort(port) {
    return new Promise((resolve, reject) => {
        const app = App();
        const sockets = [];
        const socketMods = new Map();
        app.ws("/*", {
            open(ws) {
                console.log("Connection established");
                sockets.push(ws);
            },
            message(ws, buffer) {
                const decoder = new TextDecoder("utf-8");
                const text = decoder.decode(new Uint8Array(buffer));
                if (socketMods.has(ws)) {

                } else if(text.startsWith("TC_MODLOADER")) {
                    const version = text.split(":");
                    console.info(`TC Modloader version ${version[1]} has connected`);
                    socketMods.set(ws, version);
                    getInstalledModsBuffer().then(e => {
                        if (socketMods.get(ws)) {
                            ws.send(JSON.stringify(e));
                        }
                    });
                } else {
                    console.log("unknown data");
                }
            },
            close(ws) {
                console.log("Connection lost");
                const modLoader = socketMods.get(ws);
                socketMods.delete(ws);
                const index = sockets.indexOf(ws);
                sockets.splice(index, 1);
                if (modLoader) {
                    console.log(`Mod loader ${modLoader} has disconnected`);
                } else {
                    console.log(`Unidentified socket disconnected`);
                }
            }
        }).listen(port, listenSocket => {
            if (listenSocket) {
                console.log(`Development protocol open on port ${port}`);
                resolve();

                const onFileChange = debounce(() => {
                    console.log("Packing mods");
                    getInstalledModsBuffer().then(e => {
                        console.log("Sending update");
                        socketMods.forEach((_, ws) => {
                            ws.send(JSON.stringify(e));
                        });
                    });
                }, 5000);

                fs.watch("./build", {}, (watch, filename) => {
                    if (watch === "change", filename.endsWith(".tcmod")) {
                        onFileChange();
                    }
                });

            } else {
                reject(new Error("Failed to start"));
            }
        });
    });
}

async function startTurboServer() {
    for (const port of PORTS) {
        try {
            await tryPort(port);
            return;
        } catch (error) {
            console.error(error);
        }
    }
};

startTurboServer();
