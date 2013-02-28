/* global Seadragon: false, dziNamesArray: false */
var seadragon;

function seadragonCustom(containerSelectorOrElement, configOverrides) {
    'use strict';

    var buttonColors = {
        false: '#cd5c5c',
        true: '#2e8b57',
    };
    var dziPrefix = 'seadragon_data/';
    var initialAnimationTime = 1000;

    var animationsOff = false;

    var constrainToImage2 = false,
        constrainToImage16 = false;

    var dziDataArray;

    // Seadragon initialization:
    seadragon = new Seadragon(containerSelectorOrElement,
        $.extend({}, {backgroundColor: '#2d2a2b'}, configOverrides));

    function openNorblinDZIsInARow() {
        dziDataArray = [];
        dziNamesArray.forEach(function (dziName, index) {
            dziDataArray[index] = {
                dziUrl: dziPrefix + dziName + '.dzi',
                bounds: new Seadragon.Rectangle(1000000, 1000000, 1000, 1000),
            };
        });
        seadragon.openDziArray(dziDataArray);
        seadragon.alignRows(6000, 0, Infinity, true);
        seadragon.viewport.zoomTo(0.1, true);
        seadragon.viewport.panTo(new Seadragon.Point(7000, 3000), true);
    }

    function openOneTestDZIFromAcademica() {
        seadragon
            .openDzi({
                dziUrl: 'http://127.0.0.1:8107/resource/image/280189/?DeepZoom=279868.tif.dzi',
                tilesUrl: 'http://127.0.0.1:8107/resource/image/280189/?DeepZoom=279868.tif_files/',
            }).showOnlyImage(0, {
                dontForceConstraints: true,
            });
    }

    openNorblinDZIsInARow();

    // Buttons.
    $('#animations_off').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            animationsOff = !animationsOff;
            if (animationsOff) {
                seadragon.config.animationTime = 0;
            } else {
                seadragon.config.animationTime = initialAnimationTime;
            }
            $(this).css('background-color', buttonColors[animationsOff]);
            return false;
        }
    });

    $('#tile_borders').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            seadragon.config.debugTileBorders = !seadragon.config.debugTileBorders;
            seadragon.$container.trigger('seadragon:force_redraw');
            $(this).css('background-color', buttonColors[seadragon.config.debugTileBorders]);
            return false;
        }
    });

    var $magnifier = $('#magnifier');
    if (Seadragon.Magnifier) {
        $magnifier.on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                if (seadragon.config.enablePicker) {
                    $('#picker').trigger(event); // turn off the picker
                }
                seadragon.toggleMagnifier();
                $(this).css('background-color', buttonColors[seadragon.config.enableMagnifier]);
                return false;
            }
        });
    } else {
        $magnifier.hide();
    }

    var $picker = $('#picker');
    if (Seadragon.Picker) {
        $picker.on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                if (seadragon.config.enableMagnifier) {
                    $('#magnifier').trigger(event); // turn off the magnifier
                }
                seadragon.togglePicker();
                $(this).css('background-color', buttonColors[seadragon.config.enablePicker]);
                return false;
            }
        });
    } else {
        $picker.hide();
    }


    $('#align_row').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainToImage2 || constrainToImage16) {
                return false;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(event); // turn off the picker
            }
            seadragon.alignRows(6000, 100, Infinity);
            return false;
        }
    });

    $('#align_column').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainToImage2 || constrainToImage16) {
                return false;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(event); // turn off the picker
            }
            seadragon.alignColumns(6000, 100, Infinity);
            return false;
        }
    });

    $('#align_rows').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainToImage2 || constrainToImage16) {
                return false;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(event); // turn off the picker
            }
            seadragon.alignRows(6000, 100, 100000);
            return false;
        }
    });

    $('#align_columns').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainToImage2 || constrainToImage16) {
                return false;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(event); // turn off the picker
            }
            seadragon.alignColumns(6000, 100, 100000);
            return false;
        }
    });

    $('#fit_image_2').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainToImage16) {
                return false;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(event); // turn off the picker
            }
            seadragon.fitImage(2);
            return false;
        }
    });

    $('#fit_image_16').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainToImage2) {
                return false;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(event); // turn off the picker
            }
            seadragon.fitImage(16);
            return false;
        }
    });

    $('#constrain_to_image_2').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(event); // turn off the picker
            }
            constrainToImage2 = !constrainToImage2;
            $(this).css('background-color', buttonColors[constrainToImage2]);
            constrainToImage16 = false;
            $('#constrain_to_image_16').css('background-color', buttonColors[false]);
            seadragon.constrainToImage(2);
            seadragon.config.constrainViewport = constrainToImage2;
            seadragon.viewport.fitConstraintBounds();
            seadragon.viewport.applyConstraints();
            return false;
        }
    });

    $('#constrain_to_image_16').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (seadragon.config.enablePicker) {
                $('#picker').trigger(event); // turn off the picker
            }
            constrainToImage16 = !constrainToImage16;
            $(this).css('background-color', buttonColors[constrainToImage16]);
            constrainToImage2 = false;
            $('#constrain_to_image_2').css('background-color', buttonColors[false]);
            seadragon.constrainToImage(16);
            seadragon.config.constrainViewport = constrainToImage16;
            seadragon.viewport.fitConstraintBounds();
            seadragon.viewport.applyConstraints();
            return false;
        }
    });
}
