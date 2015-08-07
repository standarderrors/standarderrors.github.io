function collager() {
    var public = {
        version: 1,
    };


    //==========================================================================
    // Define the function that arranges objects into a collage.

    function arrange(userOptions) {

        //--------------------------------------------------------------------------
        // Merge the user-supplied options with the default options.

        var options = {
            objects: null,
            containerWidth: null,
            containerHeight: null,
            numRows: null,
            hPaddingInner: 20,
            vPaddingInner: 20,
            hPaddingOuter: 0,
            vPaddingOuter: 0,
            perturbRate: 0.5,
            optimizeSteps: 100
        };

        d3.keys(userOptions).forEach(function(option) {
            options[option] = userOptions[option];
        });
        var objects = options.objects;


        //--------------------------------------------------------------------------
        // Determine the number of rows to split the objects into. Do this by
        // comparing the aspect ratio of all the objects laid out in a line to the
        // aspect ratio of the container.

        if (options.numRows === null) {
            // Scale the objects to have unit height.

            objects.forEach(function(object) {
                object.collagerHeight = 1;
                object.collagerWidth = object.width / object.height;
            });

            // Compute the aspect ratio of the full set of objects.

            var objectAspectRatio = d3.sum(objects, function(object) {
                return object.collagerWidth;
            });

            // Compute the aspect ratio of the container.

            var containerAspectRatio = options.containerWidth / options.containerHeight;

            // Compute the number of rows. The equation for the number of rows is derived as follows:
            //
            // Let R be the number of rows, and assume that each object has been
            // scaled to height H. Let W be the sum of the scaled object widths.
            // Once the full set of objects have been split into rows, the resulting
            // aspect ratio will be:
            //
            //   A = (W/R) / H*R
            //
            // Because we set H to 1 above, when we solve for R we get:
            //
            //   R = sqrt(W / A)
            //
            // Because we want our resulting aspect ratio to match the container
            // aspect ratio, we use the container aspect ratio in place of A.
            //
            // Note that this algorithm doesn't take into account the padding that
            // will be placed between objects, so it isn't a perfect algorithm.
            // Hopefully it's close enough, though.

            options.numRows = Math.min(objects.length, Math.round(Math.sqrt(objectAspectRatio / containerAspectRatio)));
        }

        //--------------------------------------------------------------------------
        // Scale the objects to have the same height, where the scaled height is
        // equal to the ideal height based on our container size and padding.

        var targetRowHeight = (options.containerHeight - options.vPaddingOuter * 2 - options.vPaddingInner * (options.numRows - 1)) / options.numRows;

        objects.forEach(function(object) {
            object.collagerHeight = targetRowHeight;
            object.collagerWidth = object.width * targetRowHeight / object.height;
        });

        //--------------------------------------------------------------------------
        // Assign objects to rows while attempting to minimize the difference in
        // total object width between rows.

        var sumObjectWidth = d3.sum(objects, function(object) {
            return object.collagerWidth;
        });

        var targetRowWidth = sumObjectWidth / options.numRows;

        var rows = d3.range(options.numRows)
            .map(function(d) {
                return {
                    height: targetRowHeight,
                    sumWidth: 0,
                    objects: []
                };
            });

        objects.forEach(function(object) {
            var foundRow = false;
            for (var r = 0; r < rows.length; r++) {
                var row = rows[r];
                if (object.collagerWidth * (options.numRows - 1) / options.numRows < targetRowWidth - row.sumWidth) {
                    row.sumWidth += object.collagerWidth;
                    row.objects.push(object);
                    foundRow = true;
                    break;
                }
            }
            if (!foundRow) {
                var minRow = 0;
                var minRowWidth = rows[0].sumWidth;
                for (var r = 1; r < rows.length; r++) {
                    if (rows[r].sumWidth < minRowWidth) {
                        minRow = r;
                        minRowWidth = rows[r].sumWidth;
                    }
                }
                rows[minRow].sumWidth += object.collagerWidth;
                rows[minRow].objects.push(object);
            }
        });

        // Look for improvements in row assignments by randomly swapping objects.

        var swaps = [];

        for (var i = 0; i < options.optimizeSteps; i++) {
            var row1 = rows[Math.floor(options.numRows * Math.random())];
            var row2 = rows[Math.floor(options.numRows * Math.random())];
            if (row1 === row2) continue;

            var index1 = Math.floor(row1.objects.length * Math.random());
            var index2 = Math.floor(row2.objects.length * Math.random());
            var object1 = row1.objects[index1];
            var object2 = row2.objects[index2];

            var diffOld =
                Math.abs(row1.sumWidth - targetRowWidth)
                + Math.abs(row2.sumWidth - targetRowWidth)
            ;
            var diffNew =
                Math.abs(row1.sumWidth + (object2.collagerWidth - object1.collagerWidth) - targetRowWidth)
                + Math.abs(row2.sumWidth + (object1.collagerWidth - object2.collagerWidth) - targetRowWidth)
            ;

            if (diffNew < diffOld) {
                swaps.push(i);

                row1.objects.splice(index1, 1);
                row2.objects.splice(index2, 1);

                row1.objects.push(object2);
                row2.objects.push(object1);

                row1.sumWidth += (object2.collagerWidth - object1.collagerWidth);
                row2.sumWidth += (object1.collagerWidth - object2.collagerWidth);
            }
        }

        //--------------------------------------------------------------------------
        // Scale the objects to fit the target width on each row. After this, the
        // height of each row will vary (and won't match our target container
        // height.)

        rows.forEach(function(row) {
            var scale = (options.containerWidth - options.hPaddingOuter * 2 - options.hPaddingInner * (row.objects.length - 1)) / row.sumWidth;
            row.objects.forEach(function(object) {
                object.collagerHeight *= scale;
                object.collagerWidth *= scale;
            });

            row.height *= scale;
            row.sumWidth = d3.sum(row.objects, function(object) {
                return object.collagerWidth;
            });
        });

        //--------------------------------------------------------------------------
        // Scale the objects down if the total height exceeds the target container
        // height.

        var sumRowHeight = d3.sum(rows, function(row) {
            return row.height;
        });

        var scale = (options.containerHeight - options.vPaddingOuter * 2 - options.vPaddingInner * (options.numRows - 1)) / sumRowHeight;

        if (scale < 1) {
            rows.forEach(function(row) {
                row.objects.forEach(function(object) {
                    object.collagerHeight *= scale;
                    object.collagerWidth *= scale;
                });

                row.height *= scale;
                row.sumWidth = d3.sum(row.objects, function(object) {
                    return object.collagerWidth;
                });
            });
        }

        //--------------------------------------------------------------------------
        // Shuffle the rows/columns.

        d3.shuffle(rows);

        rows.forEach(function(row) {
            d3.shuffle(row.objects);
        });

        //--------------------------------------------------------------------------
        // Assign the top/left positions for each object.

        sumRowHeight = d3.sum(rows, function(row) {
            return row.height;
        });

        var vPaddingOuter = (options.containerHeight - sumRowHeight - options.vPaddingInner * (options.numRows - 1)) / 2;
        var nextTop = vPaddingOuter;

        rows.forEach(function(row) {
            row.hPaddingOuter = (options.containerWidth - row.sumWidth - options.hPaddingInner * (row.objects.length - 1)) / 2;
            var nextLeft = row.hPaddingOuter;
            row.objects.forEach(function(object) {
                object.collagerTop = nextTop;
                object.collagerLeft = nextLeft;
                nextLeft += object.collagerWidth + options.hPaddingInner;
            });
            nextTop += row.height + options.vPaddingInner;
        });    

        //--------------------------------------------------------------------------
        // Randomly perturb the top/left positions.

        rows.forEach(function(row, rowIndex) {
            var paddingTop = rowIndex === 0 ? vPaddingOuter : options.vPaddingInner;
            var paddingBottom = rowIndex === rows.length - 1 ? vPaddingOuter : options.vPaddingInner;

            row.objects.forEach(function(object, objIndex) {
                var paddingLeft = objIndex === 0 ? row.hPaddingOuter : options.hPaddingInner;
                var paddingRight = objIndex === row.objects.length - 1 ? row.hPaddingOuter : options.hPaddingInner;

                object.collagerTopPerturbed = object.collagerTop + randBetween(-paddingTop, paddingBottom) * options.perturbRate;
                object.collagerLeftPerturbed = object.collagerLeft + randBetween(-paddingLeft, paddingRight) * options.perturbRate;
            });
        });
    }
    public.arrange = arrange;


    //==========================================================================
    // Define helper functions.

    function randBetween(low, high) {
        return low + (high - low) * Math.random();
    }


    //==========================================================================
    // Return the public API.

    return public;
}
