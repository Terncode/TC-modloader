const fs = require("fs");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env) => {
    const entry = {};

    const removeExtension = (string) => {
        const dotIndex = string.lastIndexOf(".");
        return dotIndex === -1 ? string : string.slice(0, dotIndex);
    };
    const addEntryFolder = (folder) => {
        const mods = fs.readdirSync(`./src/mods/${folder}`, {withFileTypes: true}).filter(f => f.isFile()).map(e => e.name);
        for (const mod of mods) {
            entry[removeExtension(mod)] = `./src/mods/${folder}/${mod}`;
        }
    };
    addEntryFolder("mods");
    if (env.all) {
        addEntryFolder("tests");
        addEntryFolder("examples");
    }


    return {
        mode: "production",
        entry,
        output: {
            path: __dirname,
            filename: `./build/[name].js`
        },
        resolve: {
            extensions: [".ts"]
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    extractComments: false,
                    terserOptions: {
                        sourceMap: true,
                        ecma: 5,
                        mangle: true,
                        output: {
                            comments: false
                        },
                    },
                }),
            ],
        },
        module: {
            rules: [{
                test: /\.(ts)$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            }]
        },
        plugins: [
            new webpack.DefinePlugin({
                IBaseMod: class BaseMod {}, // give webpack empty class for build process to finish successfully
            }, ),
        ]
    };
};
