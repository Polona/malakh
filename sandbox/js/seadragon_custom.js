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

    var pickerOn = false,
        magnifierOn = false,
        animationsOff = false;

    var constrainImage3 = false,
        constrainImage17 = false;

    var dziDataArray;

    // Seadragon initialization:
    seadragon = new Seadragon(containerSelectorOrElement,
        $.extend({}, {backgroundColor: '#2d2a2b'}, configOverrides));

    dziDataArray = [];
    dziNamesArray.forEach(function (dziName, index) {
        dziDataArray[index] = {
            dziUrl: dziPrefix + dziName + '.dzi',
            bounds: new Seadragon.Rectangle(1000000, 1000000, 1000, 1000)
        };
    });
    seadragon.openDziArray(dziDataArray);
    seadragon.alignRows(6000, 0, Infinity, true);

    // Adjust -- not necessary, just removes the need to do it by ourselves.
    seadragon.viewport.zoomTo(0.1, true);
    seadragon.viewport.panTo(new Seadragon.Point(7000, 3000), true);


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

    var $magnifier = $('#magnifier');
    if (Seadragon.Magnifier) {
        $magnifier.on({
            click: function (event) {
                if (event.which !== 1) { // Only left-click is supported.
                    return false;
                }
                if (pickerOn) {
                    $('#picker').trigger(event); // turn off the picker
                }
                seadragon.toggleMagnifier();
                magnifierOn = !magnifierOn;
                $(this).css('background-color', buttonColors[magnifierOn]);
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
                if (magnifierOn) {
                    $('#magnifier').trigger(event); // turn off the magnifier
                }
                seadragon.togglePicker();
                pickerOn = !pickerOn;
                $(this).css('background-color', buttonColors[pickerOn]);
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
            if (constrainImage3 || constrainImage17) {
                return false;
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
            if (constrainImage3 || constrainImage17) {
                return false;
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
            if (constrainImage3 || constrainImage17) {
                return false;
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
            if (constrainImage3 || constrainImage17) {
                return false;
            }
            seadragon.alignColumns(6000, 100, 100000);
            return false;
        }
    });

    $('#fit_image_3').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainImage17) {
                return false;
            }
            seadragon.fitImage(2);
            return false;
        }
    });

    $('#fit_image_17').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (constrainImage3) {
                return false;
            }
            seadragon.fitImage(16);
            return false;
        }
    });

    $('#constrain_image_3').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (pickerOn) {
                return false;
            }
            constrainImage3 = !constrainImage3;
            $(this).css('background-color', buttonColors[constrainImage3]);
            constrainImage17 = false;
            $('#constrainImage17').css('background-color', buttonColors[false]);
            seadragon.config.constraintViewport = constrainImage3;
            seadragon.viewport.constraintBounds = new Seadragon.Rectangle(
                seadragon.tiledImages[2].boundsSprings.getRectangle()); // TODO better API
            seadragon.viewport.fitConstraintBounds();
            seadragon.viewport.applyConstraints();
            return false;
        }
    });

    $('#constrain_image_17').on({
        click: function (event) {
            if (event.which !== 1) { // Only left-click is supported.
                return false;
            }
            if (pickerOn) {
                return false;
            }
            constrainImage17 = !constrainImage17;
            $(this).css('background-color', buttonColors[constrainImage17]);
            constrainImage3 = false;
            $('#constrainImage3').css('background-color', buttonColors[false]);
            seadragon.config.constraintViewport = constrainImage17;
            seadragon.viewport.constraintBounds = new Seadragon.Rectangle(
                seadragon.tiledImages[16].boundsSprings.getRectangle()); // TODO better API
            seadragon.viewport.fitConstraintBounds();
            seadragon.viewport.applyConstraints();
            return false;
        }
    });
}
