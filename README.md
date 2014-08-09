Malakh - deep zoom viewer
==================================================

Research and development project requested by the National Library of Poland made by Laboratorium EE.

How to build your own Malakh
----------------------------

First, clone a copy of the main Malakh git repo by running:

```bash
git clone https://github.com/Polona/malakh.git
```

Install the grunt-cli package so that you will have the correct version of grunt available from any project that needs it. This should be done as a global install:

```bash
npm install -g grunt-cli
```

Enter the `malakh` directory and install the Node dependencies, this time *without* specifying a global install:

```bash
cd malakh && npm install
```

Make sure you have `grunt` installed by testing:

```bash
grunt --version
```

Then, to get a complete, minified (w/ Uglify.js), linted (w/ JSHint) version of Malakh, type the following:

```bash
grunt
```

The built version of Malakh will be put in the `dist/` subdirectory, along with the minified copy and associated map file.


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
