module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 12
    },
    plugins: [
        "@typescript-eslint"
    ],
    rules: {
        indent: [
            "error",
            4,
            {
                SwitchCase: 1,
                ignoredNodes: ["ConditionalExpression"],
            },
        ],
        "linebreak-style": "off",
        quotes: [
            "error",
            "double",
            { allowTemplateLiterals: true }
        ],
        semi: [
            "error",
            "always"
        ],
        radix: [
            "error",
        ],
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-this-alias": "off",
        "no-unused-labels": "error",
        "no-underscore-dangle": "off",
        "no-trailing-spaces": "error",
        "no-redeclare": "off",
        "no-new-wrappers": "error",
        "no-debugger": "error",
        "no-eval": "error",
        "no-multiple-empty-lines": [
            "error",
            {
                "max": 2
            }
        ],
        "no-caller": "error",
        "eol-last": "error",
        "eqeqeq": [
            "error",
            "smart"
        ],
        "guard-for-in": "error",
        "id-denylist": "off",
        "id-match": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "no-unused-vars": "off",
        "no-empty-pattern": "off",
        "no-empty": "off",
        "no-case-declarations": "off",
        "no-cond-assign": "off",
        "no-sparse-arrays": "off",
        "prefer-const": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/ban-types" : "off",
        "@typescript-eslint/triple-slash-reference": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "no-constant-condition": "off",
        "no-mixed-spaces-and-tabs" : "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            { argsIgnorePattern: "^_" }
        ],
    },
    ignorePatterns: [
        "build",
        "node_modules"
    ],
};
