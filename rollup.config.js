import svelte from "rollup-plugin-svelte"
import resolve from "@rollup/plugin-node-resolve"
import del from "rollup-plugin-delete"
import html from "@rollup/plugin-html"

const template = (options) => `<!doctype html>
<html>
    <head>
        <title>Test Title</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,minimum-scale=1,width=device-width" />
    </head>

    <body>
        <script src="${options.files.js[0].fileName}"></script>
    </body>
</html>
`

export default {
  input: "src/main.js",
  output: {
    file: `builds/app-d${Date.now()}.js`,
    format: "iife",
  },
  plugins: [
    del({
        targets: [
            "./builds/app-*.js",
            "./builds/index.html"
        ]
    }),
    svelte({
      emitCss: false,
    }),
    resolve(),
    html({
        template,
        filename: "./bulids/index.html"
    }),
  ],
}