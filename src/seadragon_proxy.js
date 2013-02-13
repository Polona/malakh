var seadragonProxy = Object.create(Seadragon.prototype);

// We're making seadragon fields accessible from any Seadragon class via this.field
// instead of this.seadragon.field. But we still reflect all changes onto this.seadragon.field
[
    // properties
    'config',
    '$container', '$canvas', 'canvasContext',
    'tiledImages', 'viewport', 'canvasLayersManager',
    'magnifier', 'picker', 'markers',
    'imageLoader', 'drawer', 'controller',
    // constructors
    'AnimatedRectangle', 'CanvasLayersManager', 'Controller', 'Drawer',
    'DziImage', 'ImageLoader', 'LayoutManager', 'Magnifier', 'Markers', 'Picker',
    'Spring', 'Tile', 'TiledImage', 'Viewport'
].forEach(
    function (field) {
        Object.defineProperty(seadragonProxy, field, {
            get: function () {
                return this.seadragon[field];
            },
            set: function (value) {
                this.seadragon[field] = value;
            }
        });
    }
);
