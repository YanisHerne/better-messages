"use strict";

import fs from "fs";

import { babel } from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";

export default [
    {
        input: "src/background.ts",
        output: {
            file: "dist/background.js",
            format: "esm",
            sourcemap: true,
        },
        plugins: [
            nodeResolve(),
            typescript({
                sourceMap: true,
            }),
            babel({
                babelHelpers: "bundled",
                presets: ["solid"],
                extensions: [".ts", ".tsx"],
                presets: [["@babel/preset-typescript"]],
                sourceMaps: true,
            }),
        ],
    },
    {
        input: "src/content.ts",
        output: {
            file: "dist/content.js",
            format: "esm",
            sourcemap: true,
        },
        plugins: [
            nodeResolve(),
            typescript({
                sourceMap: true,
            }),
            babel({
                babelHelpers: "bundled",
                presets: ["solid"],
                extensions: [".ts", ".tsx"],
                presets: [["@babel/preset-typescript"]],
                sourceMaps: true,
            }),
        ],
    },
    {
        input: "src/popup.ts",
        output: {
            file: "dist/popup.js",
            format: "esm",
            sourcemap: true,
        },
        plugins: [
            nodeResolve(),
            typescript({
                sourceMap: true,
            }),
            babel({
                babelHelpers: "bundled",
                presets: ["solid"],
                extensions: [".ts", ".tsx"],
                presets: [["@babel/preset-typescript"]],
                sourceMaps: true,
            }),
            {
                writeBundle() {
                    fs.cpSync("./static", "./dist", { recursive: true });
                },
            },
        ],
    },
];
