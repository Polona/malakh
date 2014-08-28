# Malakh - deep zoom viewer

Research and development project requested by the National Library of Poland made by Laboratorium EE.

## How to run a viewer on your own image?

### Generating DZI files

First, prepare the environment:

1. Get Python 2.7.
2. Install the `libjpeg` development package with a system package manager, e.g. on OS X: `brew install libjpeg`, on Ubuntu: `sudo apt-get install libjpeg-dev`.
3. Install the `Pillow` package: `sudo pip install Pillow` or `sudo easy_install Pillow`.

Now, run:
```bash
./utils/deepzoom.py PATH_TO_THE_IMAGE_FILE
```

### Firing up the viewer

First, construct a new Malakh object:
```js
var malakh = new Malakh(containerSelectorOrElement, [configOverrides]);
```
for example:
```js
var malakh = new Malakh('#malakh_container');
```

Then, open an image:
```js
malakh.openDzi({
    imageDataUrl: PATH_TO_DZI,
});
```

Malakh will automatically deduce the tiles directory path from the above. If this path is non-canonical, you can provide it as an additional argument:

```js
malakh.openDzi({
    imageDataUrl: PATH_TO_DZI,
    tilesUrl: PATH_TO_TILES_DIRECTORY,
});
```

## How to build your own Malakh

First, clone a copy of the main Malakh git repo by running:

```bash
git clone https://github.com/Polona/malakh.git
```

Enter the `malakh` directory and install the Node dependencies:

```bash
cd malakh && npm install
```

The built version of Malakh will be put in the `dist/` subdirectory, along with the minified copy and an associated map file.

### Customizing own Malakh version

If you want to build your own, modified version, the above process may last too long. In that case, install the `grunt-cli` package, this time globally, to have the `grunt` binary available:

```bash
npm install -g grunt-cli
```

Make sure you have `grunt` installed by testing:

```bash
grunt --version
```

Then, to get a complete, minified, linted version of Malakh, type the following:

```bash
grunt
```

If you don't want to build minified files (e.g. during development), run:
```bash
grunt dev
```

### Modules

Special builds can be created that optionally exclude or include any of the following modules:

- magnifier
- picker
- markers

Make sure all Node dependencies are installed and all Git submodules are checked out:

```bash
npm install && grunt
```

To create a custom build, use the following special `grunt` commands:

Exclude **magnifier**:

```bash
grunt custom:-magnifier
```

The same applies to other modules.

Exclude **all** optional modules:

```bash
grunt custom:-magnifier,-picker,-markers
```

Note: dependencies will be handled internally, by the build process.
