const spawn = require("child_process").spawn;
const path = require("path");
const gulp = require("gulp");
const zlib = require("zlib");
const del = require("del");
const fs = require("fs");
const { noop } = require("lodash");

const cwd = process.cwd();
const build = path.join(cwd, "build");

const runAsync = (command, args) => new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: true	})
        .on("error", reject)
        .on("exit", resolve);

    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
});

const npmScript = (name, args = []) => {
    const func = () => runAsync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", name, ...args]);
    func.displayName = `npm run ${name}`;
    return func;
};

const clean = () => del([
    "build/*",
]);

const compile = async cb => {
    const files = fs.readdirSync(build, {withFileTypes: true}).filter(f => f.isFile() && f.name.endsWith(".js")).map(f=> f.name);
    for (const file of files) {
        console.log(`Compiling ${file}`);
        const jsPath = path.join(build, file);
        const content = fs.readFileSync(jsPath, "utf-8");


        try {
            const fn = new Function("TC_EXPORT", content);

            const captured = {};
            fn(captured);
            if (!captured["TC_MOD"]) {
                throw new Error(`Failed to compile ${file}! did you forgot to register mod?`);
            }

            const name = captured["TC_MOD"].modName;
            if (!name) throw new Error("Missing name");

            try {
                const compressed = zlib.gzipSync(content);
                const targetName = name;
                let suggestedName = targetName;
                let i = 0;
                const getPath = () => (path.join(build, `${suggestedName.replace(/ /g, "_").toLowerCase()}.tcmod`));
                while(fs.existsSync(getPath())) {
                    suggestedName = `${targetName}-${i}`;
                }
                try {
                    fs.writeFileSync(getPath(), compressed);
                    console.log(`Compiled ${name}`);
                    fs.unlinkSync(jsPath, noop);
                } catch (error) {
                    console.error(`Unable to write ${name}`, error);
                }
            } catch (error) {
                console.error(`Failed to compress ${name}`, error);
            }

        } catch (error) {
            console.error(error);
        }
    }

    cb();
};


module.exports = {
    default:  gulp.series(clean, npmScript("build-js"), compile),
    compile,
};
