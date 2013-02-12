/**
 * Constructs a drawer.
 *
 * @class Handles all the drawing when invoked by the controller.
 *
 * <p> See <code>Seadragon.Viewport</code> description for information about conventions around parameter
 * named <code>current</code> and names <strong>point</strong> and <strong>pixel</strong>.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @see Seadragon.Viewport
 *
 * @param {Seadragon} seadragon  Sets <code>this.seadragon</code>.
 */
Seadragon.Drawer = function Drawer(seadragon) {
    this.ensureArguments(arguments, 'Drawer');

    var that = this;

    var cacheNumTiles; // 1d dictionary [whichImage][level] --> Point
    var cachePixelOnImageSizeMax; // 1d dictionary [whichImage][level] --> max(point.x, point.y)
    var coverage; // 4d dictionary [whichImage][level][x][y] --> boolean
    var tilesMatrix; // 4d dictionary [whichImage][level][x][y] --> Tile
    var tileBoundsNotChangedMatrix; // like above

    var tilesLoaded; // unordered list of Tiles with loaded images
    var tilesDrawnLastFrame; // unordered list of Tiles drawn last frame
    var tilesDrawnLastFrameLayers; // layers of above tiles

    var currentTime;
    var lastResetTime;
    var midUpdate;

    /**
     * "Registers" a new tiled image at a given index. We assume <code>tiledImage = controller.tiledImages[index]</code>.
     *
     * @param {Seadragon.TiledImage} tiledImage
     * @param {number} index
     */
    this.registerTiledImage = function registerTiledImage(tiledImage, index) {
        if (midUpdate) { // We don't want to add a new image during the update process, deferring.
            console.log('Deferred adding a DZI to Drawer');
            var that = this;
            setTimeout(function () {
                that.registerTiledImage(tiledImage, index);
            }, 100);
            return this;
        }
        if (!tiledImage) {
            console.error('No DZI Image given to Drawer\'s registerDziImage method!');
            return this;
        }

        cacheNumTiles[index] = [];
        cachePixelOnImageSizeMax[index] = [];
        tilesMatrix[index] = [];
        coverage[index] = [];

        return this;
    };

    /**
     * Returns number of tiles for the image at a given level.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImages</code> table.
     * @param {number} level
     * @return {number}
     * @private
     */
    function getNumTiles(whichImage, level) {
        if (!cacheNumTiles[whichImage][level]) {
            cacheNumTiles[whichImage][level] = that.tiledImages[whichImage].getNumTiles(level);
        }

        return cacheNumTiles[whichImage][level];
    }

    /**
     * Says how many real pixels horizontally/vertically are covered by one pixel for the image at a given level.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImages</code> table.
     * @param {number} level
     * @return {number}
     * @private
     */
    function getPixelOnImageSizeMax(whichImage, level) {
        if (!cachePixelOnImageSizeMax[whichImage][level]) {
            var pixelOnImageSize = that.tiledImages[whichImage].getScaledDimensions(level).invert();
            cachePixelOnImageSizeMax[whichImage][level] = Math.max(pixelOnImageSize.x, pixelOnImageSize.y);
        }

        return cachePixelOnImageSizeMax[whichImage][level];
    }

    /**
     * Returns a tile given by parameters.
     * Results are cached.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @param {number} time Current time. It's passed as a parameter so that we don't compute time individually
     *                      for each tile.
     * @param {boolean} [current=false]
     * @return {Seadragon.Tile}
     * @private
     */
    function getTile(whichImage, level, x, y, time, current) {
        var tileMatrix, tiledImage, bounds, url, tile;
        var boundsAlreadyUpdated = false;

        tileMatrix = tilesMatrix[whichImage];
        tiledImage = that.tiledImages[whichImage];

        if (!tileMatrix[level]) {
            tileMatrix[level] = [];
        }
        if (!tileMatrix[level][x]) {
            tileMatrix[level][x] = [];
        }

        // Initialize tile object if first time.
        if (!tileMatrix[level][x][y]) {
            bounds = tiledImage.getTileBounds(level, x, y, current);
            url = tiledImage.getTileUrl(level, x, y);

            tileMatrix[level][x][y] = that.Tile({
                level: level,
                x: x,
                y: y,
                bounds: bounds,
                url: url
            });
            boundsAlreadyUpdated = true;
        }

        tile = tileMatrix[level][x][y];

        if (!boundsAlreadyUpdated && tiledImage.bounds.version > tile.version) {
            bounds = tiledImage.getTileBounds(level, x, y, current);
            tile.bounds = bounds;
            tile.updateVersion();
        }

        // Mark tile as touched so we don't reset it too soon.
        tile.lastTouchTime = time;

        return tile;
    }

    /**
     * Loads the tile's image file.
     *
     * @param {Seadragon.Tile} tile A tile for which we load an image file.
     * @param {number} time Current time. It's passed as a parameter because we compute it once
     *                      per one #update invocation.
     * @private
     */
    function loadTile(tile, time) {
        tile.loading = that.imageLoader.loadImage(tile.url, function (image) {
            onTileLoad(tile, time, image);
        });
    }

    /**
     * Handles actions performed on tile image file load. Sets tile's <code>image</code> parameter, marks it as loaded
     * (unless an error occured) and adds the tile to a table of tiles to draw. If the table exceedes the
     * given <code>that.config.imageCacheSize</code> length, one of existing tiles is removed from the table.
     * This is determined by tiles' levels and times they were "touched" for the last time.
     *
     * @param {Seadragon.Tile} tile
     * @param {number} time
     * @param {Image} image
     * @private
     */
    function onTileLoad(tile, time, image) {
        var i;

        tile.loading = false;

        if (midUpdate) {
            console.error('Tile load callback in the middle of drawing routine.');
            return;
        } else if (!image) {
            console.error('Tile ' + tile + ' failed to load: ' + tile.url);
            tile.failedToLoad = true;
            return;
        } else if (time < lastResetTime) {
            console.log('Ignoring tile ' + tile + ' loaded before reset: ' + tile.url);
            return;
        }

        tile.loaded = true;
        tile.image = image;

        var insertionIndex = tilesLoaded.length;

        if (tilesLoaded.length >= that.config.imageCacheSize) {
            var worstTile = null;
            var worstTileIndex = -1;

            for (i = tilesLoaded.length - 1; i >= 0; i--) {
                var prevTile = tilesLoaded[i];

                if (prevTile.beingDrawn) {
                    continue;
                } else if (!worstTile) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                    continue;
                }

                var prevTime = prevTile.lastTouchTime;
                var worstTime = worstTile.lastTouchTime;
                var prevLevel = prevTile.level;
                var worstLevel = worstTile.level;

                if (prevTime < worstTime || (prevTime === worstTime && prevLevel > worstLevel)) {
                    worstTile = prevTile;
                    worstTileIndex = i;
                }
            }

            if (worstTile && worstTileIndex >= 0) {
                worstTile.unload();
                insertionIndex = worstTileIndex;
                // Note: we don't want or need to delete the actual Tile
                // object from tilesMatrix; that's negligible memory.
            }
        }

        tilesLoaded[insertionIndex] = tile;
        that.$container.trigger('seadragon:forceredraw');
    }

    /**
     * <p>Returns true if the given tile provides coverage to lower-level tiles of
     * lower resolution representing the same content. If neither x nor y is
     * given, returns true if the entire visible level provides coverage.
     *
     * <p>Note that out-of-bounds tiles provide coverage in this sense, since
     * there's no content that they would need to cover. Tiles at non-existent
     * levels that are within the image bounds, however, do not.
     *
     * <p>Coverage scheme: it's required that in the draw routine, coverage for
     * every tile within the viewport is initially explicitly set to false.
     * This way, if a given level's coverage has been initialized, and a tile
     * isn't found, it means it's offscreen and thus provides coverage (since
     * there's no content needed to be covered). And if every tile that is found
     * does provide coverage, the entire visible level provides coverage.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @return {boolean}
     * @private
     */
    function providesCoverage(whichImage, level, x, y) {
        var i, j;
        if (!coverage[whichImage][level]) {
            return false;
        }
        if (x == null || y == null) {
            // Check that every visible tile provides coverage.
            // Update: protecting against properties added to the Object
            // class's prototype, which can definitely (and does) happen.
            var rows = coverage[whichImage][level];
            for (i in rows) {
                if (rows.hasOwnProperty(i)) {
                    var cols = rows[i];
                    for (j in cols) {
                        if (cols.hasOwnProperty(j) && !cols[j]) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }
        return (coverage[whichImage][level][x] == null ||
            coverage[whichImage][level][x][y] == null ||
            coverage[whichImage][level][x][y]);
    }

    /**
     * Returns true if the given tile is completely covered by higher-level
     * tiles of higher resolution representing the same content. If neither x
     * nor y is given, returns true if the entire visible level is covered.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @return {boolean}
     * @private
     */
    function isCovered(whichImage, level, x, y) {
        if (x == null || y == null) {
            return providesCoverage(whichImage, level + 1);
        } else {
            return (providesCoverage(whichImage, level + 1, 2 * x, 2 * y) &&
                providesCoverage(whichImage, level + 1, 2 * x, 2 * y + 1) &&
                providesCoverage(whichImage, level + 1, 2 * x + 1, 2 * y) &&
                providesCoverage(whichImage, level + 1, 2 * x + 1, 2 * y + 1));
        }
    }

    /**
     * Sets whether the given tile provides coverage or not.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImage</code> table.
     * @param {number} level Tile's level.
     * @param {number} x Tile's column.
     * @param {number} y Tile's row.
     * @param {boolean} covers Coverage is set to this value.
     * @private
     */
    function setCoverage(whichImage, level, x, y, covers) {
        if (!coverage[whichImage][level]) {
            console.error('Setting coverage for a tile before its level\'s coverage has been reset: ', level);
            return;
        }
        if (!coverage[whichImage][level][x]) {
            coverage[whichImage][level][x] = [];
        }
        coverage[whichImage][level][x][y] = covers;
    }

    /**
     * Resets coverage information for the given level. This should be called
     * after every draw routine. Note that at the beginning of the next draw
     * routine, coverage for every visible tile should be explicitly set.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImage</code> table.
     * @param {number} level Tile's level.
     * @private
     */
    function resetCoverage(whichImage, level) {
        coverage[whichImage][level] = [];
    }

    /**
     * <p>Figures out if this tile is "better" than the previous best tile and returns the result.
     * Note that if there is no <code>prevBestTile</code>, the given one is automatically chosen.
     *
     * <p>Choosing algorithm relies on comparing level visibility and - if it's the same - distance
     * to the <code>interestingPoint</code>, if one exists (if it doesn't and visibility is the same,
     * <code>prevBestTile</code> is returned).
     *
     * @param {Seadragon.Tile} prevBestTile The best tile so far.
     * @param {Seadragon.Tile} tile A tile that "tries" to be better than <code>prevBestTile</code>.
     * @param {Seadragon.Point} [interestingPoint] The point near which we prefer to draw tiles. Usually
     *                                             either the middle of the viewport or current mouse position.
     * @return {Seadragon.Tile} The "better" tile.
     * @private
     */
    function compareTiles(prevBestTile, tile, interestingPoint) {
        if (!prevBestTile) {
            return tile;
        }
        if (tile.visibility > prevBestTile.visibility) {
            return tile;
        } else if (tile.visibility === prevBestTile.visibility) {
            if (interestingPoint instanceof Seadragon.Point) {
                var tileDistance = interestingPoint.distanceTo(tile.targetCenter);
                var prevBestTileDistance = interestingPoint.distanceTo(prevBestTile.targetCenter);
                if (tileDistance < prevBestTileDistance) {
                    return tile;
                }
            }
        }
        return prevBestTile;
    }

    /**
     * Hides the image if <code>hide</code> is true, shows it otherwise.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImage</code> table.
     * @param {boolean} [hide=false]
     * @param {boolean} [immediately=false]
     * @private
     */
    function showOrHideDzi(whichImage, hide, immediately) {
        var tiledImage = that.tiledImages[whichImage];
        if (!(tiledImage instanceof Seadragon.DziImage)) {
            console.error('Can\'t ' + (hide ? 'hide' : 'show') +
                ' DZI of number ' + whichImage + '; there is no such DZI.');
            return;
        }
        var opacityTarget = hide ? 0 : 1;

        if (immediately) {
            tiledImage.opacity = opacityTarget;
        } else if (!tiledImage.blending) { // Otherwise we leave it where it was before updating.
            tiledImage.opacity = hide ? 1 : 0;
        }

        tiledImage.hiding = hide;
        tiledImage.blendStart = Date.now();
        if (tiledImage.blending) { // Fake that we started blending earlier.
            tiledImage.blendStart -= (1 - Math.abs(opacityTarget - tiledImage.opacity)) * that.config.blendTime;
        }
        tiledImage.blending = true;

        that.update();
    }

    /**
     * Shows the image.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImage</code> table.
     * @param {boolean} [immediately=false]
     */
    this.showImage = function showDzi(whichImage, immediately) {
        showOrHideDzi(whichImage, false, immediately);
        return this;
    };

    /**
     * Hides the image.
     *
     * @param {number} whichImage Index of an image in the <code>controller.tiledImage</code> table.
     * @param {boolean} [immediately=false]
     */
    this.hideImage = function hideDzi(whichImage, immediately) {
        showOrHideDzi(whichImage, true, immediately);
        return this;
    };


    // TODO this function is too large
    /**
     * The main update function.
     *
     * @return {boolean} Are there some actions left to perform (like showing a tile, blurring it in/out etc.)?
     *                   In such a case the function must be invoked again.
     */
    this.update = function update() {
        var tiledImage, tile, zeroDimensionMax, deltaTime, opacity;
        var i, j, x, y, level; // indexes for loops

        // Caching Seadragon.[a-zA-Z]* instances.
        var viewport = that.viewport,
            magnifier = that.magnifier;

        if (midUpdate) {
            // We don't want to run two updates at the same time but we do want to indicate
            // the update needs to re-run as there could have been some changes - making
            // it necessary - done after the currently running update checked for them.
            return true;
        }

        //noinspection JSUnusedAssignment
        midUpdate = true;

        // Assume we won't need to update again after this update.
        // We'll set this if we find a reason to update again.
        var updateAgain = false;

        // The tiles that were drawn last frame, but won't be this frame,
        // can be cleared from the cache, so they should be marked as such.
        while (tilesDrawnLastFrame.length) {
            tile = tilesDrawnLastFrame.pop();
            tilesDrawnLastFrameLayers.pop();
            tile.beingDrawn = false;
        }

        // Clear canvas, whether in <canvas> mode or HTML mode.
        // This is important as scene may be empty this frame.
        var viewportSize = viewport.containerSize;
        that.$canvas.attr('width', viewportSize.x);
        that.$canvas.attr('height', viewportSize.y);

        that.canvasLayersManager.clear();

        var viewportBounds = viewport.getRectangle(true);
        var viewportTL = viewportBounds.getTopLeft();
        var viewportBR = viewportBounds.getBottomRight();
        var viewportCenter = viewport.pixelFromPoint(viewport.getCenter());
        var viewportZoom = viewport.getZoom(true);

        var tiledImageTLs = [];
        var tiledImageBRs = [];
        var viewportTLs = [];
        var viewportBRs = [];

        var haveDrawns = [];
        var best = null;

        var zeroDimensionsMax = [];
        var drawingEnded = [];
        var drawnImageNumbers = [];

        currentTime = Date.now();

        // Drawing all images.
        that.tiledImages.forEach(function (tiledImage, whichImage) {
            if (!(tiledImage instanceof Seadragon.DziImage) || tiledImage.isHidden()) {
                return;
            }

            // We don't need to compute these two things on each update but filtering out cases where it's not needed
            // would create a little overhead on its own so it's probably not worth doing that.
            tiledImageTLs[whichImage] = tiledImage.bounds.getTopLeft();
            tiledImageBRs[whichImage] = tiledImage.bounds.getBottomRight();

            var tiledImageTL = tiledImageTLs[whichImage];
            var tiledImageBR = tiledImageBRs[whichImage];

            // If image is off image entirely, don't bother drawing.
            if (tiledImageBR.x < viewportTL.x || tiledImageBR.y < viewportTL.y ||
                tiledImageTL.x > viewportBR.x || tiledImageTL.y > viewportBR.y) {
                return;
            }

            // Restrain bounds of viewport relative to image.
            viewportTLs[whichImage] = new Seadragon.Point(
                Math.max(viewportTL.x, tiledImageTL.x),
                Math.max(viewportTL.y, tiledImageTL.y));
            viewportBRs[whichImage] = new Seadragon.Point(
                Math.min(viewportBR.x, tiledImageBR.x),
                Math.min(viewportBR.y, tiledImageBR.y));

            if (tiledImage.blending) {
                updateAgain = true;

                deltaTime = currentTime - tiledImage.blendStart;
                opacity = Math.min(1, deltaTime / that.config.blendTime);
                tiledImage.opacity = tiledImage.hiding ? 1 - opacity : opacity;
                if ((tiledImage.isHiding() && tiledImage.opacity === 0) ||
                    (tiledImage.isShowing() && tiledImage.opacity === 1)) {
                    tiledImage.blending = false; // We finished blending.
                }
            }

            // Optimal pixel ratio (?) -- this is based on the TARGET value.
            zeroDimensionsMax[whichImage] = getPixelOnImageSizeMax(whichImage, 0);

            haveDrawns[whichImage] = false;
            drawingEnded[whichImage] = false;

            // We'll draw this image.
            drawnImageNumbers.push(whichImage);
        });

        function updateBestTileForImageAtCurrentLevel(whichImage) { // TODO put it out of update()?
            if (drawingEnded[whichImage]) {
                return; // We could delete whichImage from drawnImageNumbers but cost would be higher.
            }

            tiledImage = that.tiledImages[whichImage];
            var adjustedLevel = tiledImage.getTiledImageLevel(level);

            viewportTL = viewportTLs[whichImage];
            viewportBR = viewportBRs[whichImage];

            zeroDimensionMax = zeroDimensionsMax[whichImage];

            if (adjustedLevel > tiledImage.maxLevel || adjustedLevel < tiledImage.minLevel) {
                return;
            }

            var drawLevel = false;
            var renderPixelDimensionC = viewportZoom / tiledImage.getScaledLevel(level);

            if (that.config.enableMagnifier) {
                // We need to load higher-level tiles as we need them
                // for the magnifier. Notice that we load these higher
                // levels for the whole space inside the viewport, not
                // only ones under the magnifier. It helps to reduce the
                // impression of slugishness as we move the magnifier. We
                // don't need to worry about the additional tiles to load
                // since before they're loaded we still see tiles from lower
                // levels so transitions are smooth.
                renderPixelDimensionC *= that.config.magnifierZoom;
            }

            // If we haven't drawn yet, only draw level if tiles are big enough.
            if ((!haveDrawns[whichImage] && renderPixelDimensionC >= that.config.minPixelRatio) ||
                adjustedLevel === tiledImage.minLevel) {
                drawLevel = true;
                haveDrawns[whichImage] = true;
            } else if (!haveDrawns[whichImage]) {
                return;
            }

            resetCoverage(whichImage, adjustedLevel);

            // Calculate scores applicable to all tiles on this level --
            // note that we're basing visibility on the TARGET pixel ratio.
            var renderPixelDimensionTMax = getPixelOnImageSizeMax(whichImage, adjustedLevel);
            var levelVisibility = zeroDimensionMax / Math.abs(zeroDimensionMax - renderPixelDimensionTMax);

            // Only iterate over visible tiles.
            var tileTL = tiledImage.getTileAtPoint(adjustedLevel, viewportTL, true);
            var tileBR = tiledImage.getTileAtPoint(adjustedLevel, viewportBR, true);
            var numTiles = getNumTiles(whichImage, adjustedLevel);
            var numTilesX = numTiles.x;
            var numTilesY = numTiles.y;
            tileTL.x = Math.max(tileTL.x, 0);
            tileTL.y = Math.max(tileTL.y, 0);
            tileBR.x = Math.min(tileBR.x, numTilesX - 1);
            tileBR.y = Math.min(tileBR.y, numTilesY - 1);

            for (x = tileTL.x; x <= tileBR.x; x++) {
                for (y = tileTL.y; y <= tileBR.y; y++) {
                    tile = getTile(whichImage, adjustedLevel, x, y, currentTime, true);
                    var drawTile = drawLevel;

                    // Assume this tile doesn't cover initially.
                    setCoverage(whichImage, adjustedLevel, x, y, false);

                    if (tile.failedToLoad) {
                        continue;
                    }

                    // If we've drawn a higher-resolution level and we're
                    // not going to draw this level, then say this tile does
                    // cover if it's covered by higher-resolution tiles. if
                    // we're not covered, then we should draw this tile regardless.
                    if (haveDrawns[whichImage] && !drawTile) {
                        if (isCovered(whichImage, adjustedLevel, x, y)) {
                            setCoverage(whichImage, adjustedLevel, x, y, true);
                        } else {
                            drawTile = true;
                        }
                    }

                    if (!drawTile) {
                        continue;
                    }

                    // Calculate tile's position and size in pixels.
                    var boundsTL = tile.bounds.getTopLeft();
                    var boundsSize = tile.bounds.getSize();

                    var positionC = viewport.pixelFromPoint(boundsTL, true);
                    var sizeC = viewport.deltaPixelsFromPoints(boundsSize, true);

                    var drawOnMagnifier = that.config.enableMagnifier && magnifier &&
                        magnifier.intersectsRectangle(new Seadragon.Rectangle(
                            positionC.x, positionC.y, sizeC.x, sizeC.y));

                    // Calculate distance from center of viewport --
                    // note that this is based on tile's TARGET position.
                    var positionT = viewport.pixelFromPoint(boundsTL, false);
                    var sizeT = viewport.deltaPixelsFromPoints(boundsSize, false);
                    var centerT = positionT.plus(sizeT.divide(2));

                    // Update tile's scores and values.
                    tile.position = positionC;
                    tile.size = sizeC;
                    tile.targetCenter = centerT;
                    tile.visibility = levelVisibility;

                    if (tile.loaded) {
                        if (!tile.blendStart) {
                            // Image was just added, blend it.
                            tile.blendStart = currentTime;
                        }

                        deltaTime = currentTime - tile.blendStart;
                        opacity = Math.min(1, deltaTime / that.config.blendTime);

                        tile.opacity = opacity * tiledImage.opacity;

                        // Queue tile for drawing in reverse order.
                        tilesDrawnLastFrame.push(tile);
                        tilesDrawnLastFrameLayers.push(drawOnMagnifier ? 1 : 0);

                        // If fully blended in, this tile now provides coverage,
                        // otherwise we need to update again to keep blending.
                        if (opacity >= 1) {
                            setCoverage(whichImage, adjustedLevel, x, y, true);
                        } else {
                            updateAgain = true;
                        }
                    } else if (!tile.loading) {
                        // Means tile isn't loaded yet, so score it.
                        var interestingPoint;
                        if (that.config.enableMagnifier) { // if magnifier shown, draw tiles close to its center
                            interestingPoint = magnifier.center;
                        } else { // otherwise prefer the middle of the screen
                            interestingPoint = viewportCenter;
                        }
                        best = compareTiles(best, tile, interestingPoint);
                    }
                }
            }

            // We may not need to draw any more lower-res levels.
            if (providesCoverage(whichImage, adjustedLevel)) {
                drawingEnded[whichImage] = true;
            }
        }


        for (level = that.viewport.maxLevel; level >= 0; level--) {
            drawnImageNumbers.forEach(updateBestTileForImageAtCurrentLevel);
        }

        // Load next tile if there is one to load.
        if (best) {
            loadTile(best, currentTime);
            // We haven't finished drawing, so we should be re-evaluating and re-scoring.
            updateAgain = true;
        }

        // Now draw the tiles, but in reverse order since we want higher-res
        // tiles to be drawn on top of lower-res ones. also mark each tile
        // as being drawn so it won't get cleared from the cache.
        for (i = tilesDrawnLastFrame.length - 1; i >= 0; i--) {
            tile = tilesDrawnLastFrame[i];
            for (j = 0; j <= tilesDrawnLastFrameLayers[i]; j++) {
                that.canvasLayersManager.addToLayer(j, tile);
            }
            tile.beingDrawn = true;
        }
        that.canvasLayersManager.draw();

        midUpdate = false;

        return updateAgain;
    };


    /**
     * Resets drawer state: clears all tiles, sets <code>lastResetTime</code> to now and
     * triggers the <code>seadragon:forceredraw.seadragon</code> event.
     * Restores drawer to its initial state.
     */
    this.reset = function reset() {
        cacheNumTiles = [];
        cachePixelOnImageSizeMax = [];
        coverage = [];
        tilesMatrix = [];
        tileBoundsNotChangedMatrix = [];

        tilesLoaded = [];
        tilesDrawnLastFrame = [];
        tilesDrawnLastFrameLayers = [];

        currentTime = Date.now();
        lastResetTime = 0;
        midUpdate = false;

        that.$container.trigger('seadragon:forceredraw');
        return this;
    };

    this.reset(); // initialize fields
};

Seadragon.Drawer.prototype = Object.create(seadragonBasePrototype);
