# Malakh - deep zoom viewer

Research and development project requested by the National Library of Poland made by Laboratorium EE.

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
