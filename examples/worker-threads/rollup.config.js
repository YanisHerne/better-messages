"use strict"

import { babel } from "@rollup/plugin-babel";
import typescript from '@rollup/plugin-typescript'
import nodeResolve from "@rollup/plugin-node-resolve";

export default [
    {
        input: "src/index.ts",
        output: {
            file: "dist/index.js",
            format: "esm",
            sourcemap: true,
        },
        plugins: [
            nodeResolve(),
            typescript({
                sourceMap: true,
            }),
            babel({
                babelHelpers: 'bundled',
                extensions: ['.ts' ],
                presets: [
                    ["@babel/preset-typescript"],
                ],
                sourceMaps: true,
            }),
        ],
    },
    {
        input: "src/worker.ts",
        output: {
            file: "dist/worker.js",
            format: "esm",
            sourcemap: true,
        },
        plugins: [
            nodeResolve(),
            typescript({
                sourceMap: true,
            }),
            babel({
                babelHelpers: 'bundled',
                extensions: ['.ts' ],
                presets: [
                    ["@babel/preset-typescript"],
                ],
                sourceMaps: true,
            }),
        ],
    },
]
