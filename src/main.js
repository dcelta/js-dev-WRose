/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */
//@ts-check - Get type warnings from the TypeScript language server. Remove if not wanted.

// Used the js-dev-starter template and following the TIBCO Mods tutorial, I modified it to plot a Wind Rose using the Highcharts wind rose chart
// Disclaimer: Highcharts requires purchasing of a license when the software is to be used for comercial/for profit purposes.
// Highcharts would grant a developer not for profit license at no cost upon request.

/**
 * Get access to the Spotfire Mod API by providing a callback to the initialize method.
 * @param {Spotfire.Mod} mod - mod api
 */
Spotfire.initialize(async (mod) => {
    /**
     * Create the read function.
     */
    const reader = mod.createReader(
	mod.visualization.data(),
	mod.windowSize(),
	mod.property("myProperty"),
	mod.document.property("WRSize"),
	mod.document.property("AxisLabelColor"),
	mod.document.property("align"),
	mod.document.property("verticalAlign"),
	mod.document.property("layout"));

    /**
     * Store the context.
     */
    const context = mod.getRenderContext();
    /**
     * Initiate the read loop
     */
    reader.subscribe(render);
    /**
     * @param {Spotfire.DataView} dataView
     * @param {Spotfire.Size} windowSize
     * @param {Spotfire.ModProperty<string>} prop
     * @param {Spotfire.ModDocumentProperty<string>} docProp
     * @param {Spotfire.ModDocumentProperty<string>} axisProp
     */

//    const docProp = await mod.document.property("WRSize");

    async function render(dataView, windowSize, prop, docProp, axisProp, alignLeg, verticalAlignLeg, layoutLeg) {
        /**
         * Check the data view for errors
         */

        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            // Showing an error overlay will hide the mod iframe.
            // Clear the mod content here to avoid flickering effect of
            // an old configuration when next valid data view is received.
            mod.controls.errorOverlay.show(errors);
            return;
        }
        mod.controls.errorOverlay.hide();
        /**
         * Get rows from dataView
         */
        const rows = await dataView.allRows();
        if (rows == null) {
            // User interaction caused the data view to expire.
            // Don't clear the mod content here to avoid flickering.
            return;
        }

	const colorHierarchy = await dataView.hierarchy("Color");
        const colorLeafNodes = (await colorHierarchy.root()).leaves();
        const colorDomain = colorHierarchy.isEmpty ? ["All Values"] : colorLeafNodes.map((node) => node.formattedPath());
        const xHierarchy = await dataView.hierarchy("X");
        const xLeafNodes = (await xHierarchy.root()).leaves();
        const xDomain = xLeafNodes.map(node => node.formattedValue());
        const dataColumns = ["Columns"];
	const sizeChart = await docProp.value();
	const axisColor = await axisProp.value();
	const align = await alignLeg.value();
	const verticalAlign = await verticalAlignLeg.value();
	const layout = await layoutLeg.value();

	console.log(docProp.value());

        colorDomain.forEach(value => dataColumns.push(value, { role: "style" }));

	// Creating an array with the data freq distributions
        const dataRows = [];
        xLeafNodes.forEach(
            (node) => {
		let valueAndColor = new Array(colorLeafNodes.length).fill([0]).flat()
		node.rows().forEach((r) => {
                    let colorIndex = !colorHierarchy.isEmpty ? r.categorical("Color").leafIndex : 0;
                    let yValue = r.continuous("Y").value();
		    valueAndColor[colorIndex] = yValue;
		});
		const dataRow = [node.formattedPath(), valueAndColor].flat();
		dataRows.push(dataRow)
            }
        );

	// hexColors, these I need to pass it to highcharts and control the colors from the Spotfire properties
	const hexColors = [];
        colorLeafNodes.forEach(
            (node) => {
		node.rows().forEach((r) => {
                    let colorIndex = !colorHierarchy.isEmpty ? r.categorical("Color").leafIndex : 0;
                    hexColors[colorIndex] = r.color().hexCode;
		});
            }
        );

	// console.log(hexColors);

	//this table includes all the data to pass to the highcharts API
	const table = document.createElement('table');
	table.border = "1";
	var columnCount = dataRows[0].length;

	// Creating the column headers 
	var row = table.insertRow(-1);
	for (var i = -1; i < columnCount - 1; i++) {
	    var headerCell = document.createElement("TH");
	    headerCell.innerHTML = colorDomain[i];
	    row.appendChild(headerCell);
	}
	// Populating the table cells
	for (let row of dataRows) {
	    table.insertRow();
	    for (let cell of row) {
		let newCell = table.rows[table.rows.length - 1].insertCell();
		newCell.textContent = cell;
	    }
	}

	// Calling the Highcharts API
	Highcharts.chart("mod-container", {
	    data: {
		table: table,
		startRow: 0
	    },
	    colors: hexColors,
	    chart: {
		polar: true,
		type: 'column',
		height: '100%',
		backgroundColor: 'transparent',
		zoomType: 'xy',
		panning: {
		    enabled: true,
		    type: 'xy'
		},
	    },
	    title: {
		text: undefined
	    },
	    pane: {
		size: sizeChart
	    },
	    legend: {
		floating: true,
		align: align,
		verticalAlign: verticalAlign,
		y: 10,
		layout: layout,
		itemStyle: {
		    color: axisColor
		}
	    },
	    xAxis: {
		tickmarkPlacement: 'on'
	    },
	    yAxis: {
		min: 0,
		endOnTick: false,
		showLastLabel: true,
		title: {
		    text: 'Frequency (%)',
 		    style: {
			color: axisColor
		    }
		},
		labels: {
		    formatter: function () {
			return this.value + '%';
		    },
		    style: {
			color: axisColor
		    },
		},
		reversedStacks: false
	    },
	    xAxis: {
		labels: {
		    style: {
			color: axisColor
		    }
		}
	    },
	    tooltip: {
		valueSuffix: '%'
	    },
	    plotOptions: {
		series: {
		    stacking: 'normal',
		    shadow: false,
		    groupPadding: 0,
		    pointPlacement: 'on'
		}
	    }
	});

    }
});
