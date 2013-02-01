/**
 * Constructs the <code>CanvasLayerManager</code> instance based of canvas context
 * and a magnifier instance.
 *
 * @class <p>Manages two virtual layers on one canvas. This is needed to properly handle magnifier
 * as its tiles have to be drawn after all usual ones. Layer 0 is responsible for usual tiles, layer 1
 * for magnifier ones. Layer 1 is not drawn if magnifier is not shown.
 *
 * <ul>
 *     <li>Author: <a href="mailto:michal.golebiowski@laboratorium.ee">Michał Z. Gołębiowski</a>
 *     <li>Publisher: <a href="http://laboratorium.ee/">Laboratorium EE</a></li>
 *     <li>License: New BSD (see the license.txt file for copyright information)</li>
 * <ul>
 *
 * @param {CanvasRenderingContext2D} viewport  Sets <code>this.viewport</code>.
 * @param {CanvasRenderingContext2D} context Sets <code>this.context</code>.
 * @param {Seadragon.Magnifier} [magnifier]
 */
Seadragon.CanvasLayersManager = function CanvasLayersManager(viewport, context, magnifier) {
    if (context == null) {
        throw new Error('Can\'t create a CanvasLayersManager instance without a context parameter!');
    }
    this.clear();
    /**
     * The viewport handling current Seadragon instance.
     * @type Seadragon.Viewport
     */
    this.viewport = viewport;
    /**
     * '2d' context of canvas on which we are drawing.
     * @type CanvasRenderingContext2D
     */
    this.context = context;
    /**
     * @type Seadragon.Magnifier
     */
    if (magnifier) {
        this.magnifier = magnifier;
    }
    /**
     * Magnifier is drawn only this field is true.
     * @type boolean
     */
    /**
     * An array containing all tiles currently scheduled to draw
     * @type Array.<Array.<Seadragon.Tile>>
     */
    this.tiles = [
        [],
        []
    ];
};

Seadragon.CanvasLayersManager.prototype = {
    /**
     * Adds a tile to the layer idenfified by <code>layerNum</code>.
     * Magnifier's layer number is 1, the "standard" layer is 0.
     *
     * @param {number} layerNum
     * @param {Seadragon.Tile} tile
     */
    addToLayer: function addToLayer(layerNum, tile) {
        this.tiles[layerNum].push(tile);
    },

    /**
     * Draws the layer idenfified by <code>layerNum</code>.
     *
     * @param {number} layerNum
     */
    drawLayer: function drawLayer(layerNum) {
        var tilesOnLayer, drawLayer1, zoom;
        var that = this;

        tilesOnLayer = that.tiles[layerNum];
        drawLayer1 = layerNum === 1 && that.drawMagnifier && that.magnifier;

        if (drawLayer1) { // magnifier level
            that.context.save();
            that.magnifier.drawPath(that.context);
        }
        tilesOnLayer.forEach(function (tile) {
            if (drawLayer1) {
                zoom = Seadragon.Config.magnifierZoom;
            } else {
                zoom = 1;
            }
            if (drawLayer1) {
                tile.drawCanvas(that.context, zoom, that.magnifier.center);
            } else {
                tile.drawCanvas(that.context, zoom, that.viewport.getCenter());
            }
        });
        if (drawLayer1) { // magnifier level
            that.magnifier.drawOnFinish(that.context);
            that.context.restore();
        }
    },

    /**
     * Draws both canvas layers.
     */
    drawCanvas: function drawCanvas() {
        this.drawLayer(0);
        this.drawLayer(1);
    },

    /**
     * Clears the set of tiles to draw.
     */
    clear: function clear() {
        this.tiles = [
            [],
            []
        ];
    }
};
