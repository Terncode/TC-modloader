const webpack = require("webpack");
const crypto = require("crypto");
const TerserPlugin = require("terser-webpack-plugin");
const { uid } = require("uid");
const WEBPACK_TC_BROADCAST_MESSAGE = uid(32).toUpperCase();
const WEBPACK_TC_BROADCAST_ATTRIBUTE = validAttribute();
let BROWSER_ENV = `chrome-mv2`;

try {
    BROWSER_ENV = process.env.BROWSER_ENV || "chrome-mv2";
} catch (_) {}

function validAttribute () {
    let generated = uid(32);
    for (let i = 0; i < generated.length; i++) {
        const num = isNaN(parseInt(generated[0], 10));
        if (num) break;
        if ( i === generated.length - 1) {
            return validAttribute();
        }
        generated =`${generated.slice(i)}${generated.slice(0, i)}`;
    }
    return generated;
}

function randomString(length = 8) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    if (typeof crypto === "undefined") {
        let str = "";
        for (let i = 0; i < length; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return str;
    } else {
        return crypto.randomBytes(length).toString("hex");
    }
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}
const WEBPACK_TC_EXTENSION_PACK = randomString(randomInt(16, 32));
const WEBPACK_TC_DECODER_KEY = randomString(512);

const pack = require("./package.json");

const DEV = process.env.NODE_ENV !== "production";

const scripts = [
    {
        entry: {
            venom: "./src/scripts/venom.ts",
        },
        scriptType: "venom",
    },
    {
        entry: {
            content: "./src/scripts/content.ts",
        },
        scriptType: "content",
    },
    {
        entry: {
            popup: "./src/scripts/popup.tsx",
        },
        scriptType: "popup",
    },
    {
        entry: {
            background: "./src/scripts/background.ts",
        },
        scriptType: "background",
    }
];


module.exports = scripts.map(s => ({
    mode: DEV ? "development" : "production",
    entry: s.entry,
    devtool: DEV ? "eval-source-map" : false,
    output: {
        path: __dirname,
        filename: `./build/${pack.name}-${pack.version}-${BROWSER_ENV}/assets/scripts/[name].js`
    },
    resolve: {
        extensions: [".ts", ".js", ".tsx", ".jsx"],
        fallback: {
            zlib: require.resolve("browserify-zlib"),
            stream: require.resolve("stream-browserify"),
            buffer: require.resolve("buffer/"),
            util: require.resolve("util/"),
            assert: require.resolve("assert/"),
        }
    },
    module: {
        rules: [{
            test: /\.(ts|tsx)$/,
            exclude: /node_modules/,
            use: {
                loader: "ts-loader"
            }
        }]
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
    plugins: [
        // new NodePolyfillPlugin(),
        new webpack.DefinePlugin({
            DEV,
            BROWSER_ENV: JSON.stringify(BROWSER_ENV),
            SCRIPT_TYPE: JSON.stringify(s.scriptType),
            WEBPACK_TC_BROADCAST_MESSAGE: JSON.stringify(WEBPACK_TC_BROADCAST_MESSAGE),
            WEBPACK_TC_BROADCAST_ATTRIBUTE: JSON.stringify(WEBPACK_TC_BROADCAST_ATTRIBUTE),
            WEBPACK_TC_DECODER_KEY: JSON.stringify(WEBPACK_TC_DECODER_KEY),
            WEBPACK_TC_EXTENSION_PACK: JSON.stringify(WEBPACK_TC_EXTENSION_PACK),
            VERSION: JSON.stringify(pack.version),
        }),
        new webpack.ProvidePlugin({
            process: "process/browser",
        })
    ]
}));
