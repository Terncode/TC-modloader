const gulp = require("gulp");
const pack = require("./package.json");
const del = require("del");
const fs = require("fs-extra");
const path = require("path");
const spawn = require("child_process").spawn;
const packName = ["build", `${pack.name}-${pack.version}`];
const paths = [...packName , "assets"];

let production = false;

const runAsync = (command, args) => new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: true	})
        .on("error", reject)
        .on("exit", resolve);

    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
});


const runWebpack = (name) => {
    const func = () => runAsync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", production ? "build-scripts-prod" : "build-scripts"]);
    func.displayName = `npm run ${name}`;
    return func;
};

const clean = () => del([
    "build/*",
]);

const ensureDirs = cb => {
    let currentPath = process.cwd();
    const ensure = (location) => {
        if (!fs.existsSync(location)) {
            fs.mkdirSync(location);
        }
    };
    for (const p of paths) {
        currentPath = path.join(currentPath,p);
        ensure(currentPath);
    }
    cb();
};

const copyAssets = () => gulp.src("assets/**/*").pipe(gulp.dest(path.join.apply(null, paths)));

const genManifest = cb => {
    const jsonRaw = fs.readFileSync(path.join(process.cwd(), "manifest.template.json"), "utf-8");
    const json = JSON.parse(jsonRaw);
    //json.name = pack.name;
    json.name = "TC's Mod loader";
    json.description = pack.description;
    json.version = pack.version;

    const assetsPath = path.join.apply(null, [process.cwd(), ...paths]);
    const folders = fs.readdirSync(assetsPath).filter(e => e !== "scripts");

    const getResources = (file) => {
        if (file.endsWith(".zip")) {
            return [file];
        }
        const dirs = fs.readdirSync(file, { withFileTypes: true });
        const builder = [];
        for (const dir of dirs) {
            if (dir.isDirectory()) {
                const res = getResources(path.join(file, dir.name));
                for (const r of res) {
                    builder.push(r);
                }
            } else {
                const fullPath = path.join(file, dir.name).substring(process.cwd().length);
                builder.push(fullPath);
            }
        }

        return builder;
    };

    const webAccessibleResources = [];
    for (const folder of folders) {
        const targetPath = path.join(assetsPath, folder);
        const res = getResources(targetPath);
        for (const r of res) {
            const array = r.split(/\\|\//);
            for (let i = 0; i < 3; i++) {
                array.shift();
            }
            webAccessibleResources.push(array.join("/"));
        }
    }

    const injectScript = ["assets", "scripts", "venom.js"];
    webAccessibleResources.push(injectScript.join("/"));

    // const maps = ['venom.js', 'content.js', 'background.js', 'popup.js'];
    // maps.forEach(m => {
    // 	webAccessibleResources.push(['assets', 'scripts', `${m}.map`].join("/"));
    // });

    json.web_accessible_resources = webAccessibleResources;

    const manifestPath = path.join.apply(null, [process.cwd(), ...packName, "manifest.json"]);
    fs.writeFileSync(manifestPath, JSON.stringify(json));
    cb();
};

const copyInterface = cb => {
    const interface = fs.readFileSync(path.join(process.cwd(), "src", "commonInterface.ts"), "utf-8");
    const lines = interface.split("\n");

    const ex = "export";
    for (let i = 0; i < lines.length; i++) {
        if(lines[i].startsWith(ex)) {
            lines[i] = `declare${lines[i].slice(ex.length)}`;
        }
    }
    const newInterface = lines.join("\n");
    fs.writeFileSync(path.join(process.cwd(), "mod-builder", "src", "helpers", "global.d.ts"), newInterface);
    cb();
};

const zipModBuilder = async cb => {
    const modBuilderClean = path.join(process.cwd(), "mod-builder-clean");
    const modBuilder = path.join(process.cwd(), "mod-builder");
    if (fs.existsSync(modBuilderClean)) {
        await del(modBuilderClean);
    }
    fs.copySync(modBuilder, modBuilderClean, {
        filter: name => {
            return !(name.includes("/mod-builder/node_modules") ||
                     name.includes("/mod-builder/build") ||
                     name.includes("/mod-builder/src/mods/tests"));
        }
    });
    const exportZip =  path.join(process.cwd(), "assets", `mod-builder.zip`);
    const zipFolder = require("zip-folder");
    zipFolder(modBuilderClean, exportZip, err => {
        if (err) {
            console.error(err);
        } else {
            fs.rmdirSync(modBuilderClean, {recursive: true});
        }
        cb();
    });
};

const build = gulp.series(
    clean,
    ensureDirs,
    copyAssets,
    //generateInjectableHash,
    runWebpack(),
    genManifest);

const buildAssets = gulp.series(copyAssets, genManifest);
const buildScript = gulp.series(copyInterface, runWebpack("build-scripts"), genManifest);
const watchTools = cb => {
    gulp.watch(["src/**/*", "!src/generated/**/*"], buildScript);
    gulp.watch(["assets/**/*"], buildAssets);
    cb();
};

const buildFull = gulp.series(copyInterface, zipModBuilder, build);
const setProd = cb => {
    production = true;
    cb();
};
const buildProd = gulp.series(setProd, buildFull);

const dev = gulp.series(watchTools, build);
module.exports = {
    zipmodbuilder: zipModBuilder,
    build: buildFull,
    interface: copyInterface,
    default: dev,
    buildProd
};
