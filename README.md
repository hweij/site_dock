# Remote site dock

Download, install, and run static web sites/apps.

Sites are downloaded as zip-files and extracted in the user app folder. Once extracted, they can be run locally.

## Development notes

### Distribution

For distribution of this application, a manual approachs has been chosen, which consists of a few steps only. See https://www.electronjs.org/docs/latest/tutorial/application-distribution for details:

- Download and extract the electron distributable binary for the target platform (https://github.com/electron/electron/releases)
- Copy the files/folders required at run-time (index.js, main, renderer, package.json) to the appropriate folder within the electron tree:

    **macOS**

    electron/Electron.app/Contents/Resources/app/\
    ├── package.json\
    ├── main.js\
    └── index.html

    **Windows and Linux**

    electron/resources/app\
    ├── package.json\
    ├── main.js\
    └── index.html
- To reduce distribution size, prune the node modules in the dist:\
npm prune --omit=dev
