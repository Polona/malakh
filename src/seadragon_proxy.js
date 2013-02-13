var seadragonProxy = Object.create(Seadragon.prototype);

// We're making seadragon fields accessible from any Seadragon class via this.field
// instead of this.seadragon.field. But we still reflect all changes onto this.seadragon.field
[
    // constructors: classes
    'AnimatedRectangle', 'DziImage', 'Spring', 'Tile', 'TiledImage',

    // constructors: class single instances
    'CanvasLayersManager', 'Controller', 'Drawer', 'ImageLoader',
    'LayoutManager', 'Magnifier', 'Markers', 'Picker', 'Viewport',

    // properties: class single instances
    'canvasLayersManager', 'controller', 'drawer', 'imageLoader',
    'layoutManager', 'magnifier', 'markers', 'picker', 'viewport',

    // properties: other
    'config', '$container', '$canvas', 'canvasContext', 'tiledImages',
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
