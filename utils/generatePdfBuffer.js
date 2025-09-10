const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const ICON_MAP = {
  existing_transformer: "existing_transformer.png",
  new_transformer: "new_transformer.png",
  existing_double_pole: "existing_double_pole.png",
  new_double_pole: "new_double_pole.png",
  existing_standard_pole: "existing_standard_pole.png",
  new_standard_pole: "new_standard_pole.png",
};

// Determine which icon to use based on waypoint
function determineIconKey(waypoint) {
  const gps = Array.isArray(waypoint.gpsDetails)
    ? waypoint.gpsDetails[0]
    : waypoint.gpsDetails;

  if (gps?.transformerType) {
    const type = gps.transformerType.toLowerCase();
    if (type.includes("existing")) return "existing_transformer";
    if (type.includes("new")) return "new_transformer";
  }

  if (waypoint.poleDetails?.length > 0) {
    const pole = waypoint.poleDetails[0];
    const poleType = (pole.poleType || "").toLowerCase();
    const status = (pole.existingOrNewProposed || "").toLowerCase();
    const isDouble = poleType.includes("double") || poleType.includes("dtr");
    return isDouble ? `${status}_double_pole` : `${status}_standard_pole`;
  }

  return null;
}

// Get color based on routeType
function getRouteColor(routeType) {
  const type = (routeType || "").toLowerCase();
  if (type.includes("existing")) return "black";
  if (type.includes("new")) return "#FB8500";
  return "black";
}

// Shortest path = original order for now
function getShortestPath(waypoints) {
  return waypoints;
}

async function generatePdfBuffer(waypoints) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 30 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const sortedWaypoints = getShortestPath(waypoints);
      if (sortedWaypoints.length === 0) {
        doc.text("No waypoints to display").end();
        return;
      }

      // --- Dynamic Scaling Calculation ---
      const numWaypoints = sortedWaypoints.length;
      let waypointElementScale = 1.0; // Default scale for elements

      // Adjust scale factor based on waypoint count
      if (numWaypoints > 50) { // Start scaling down if more than 50 waypoints
        const maxScalingWaypoints = 1000; // Max waypoints for our scaling range
        const minElementScaleFactor = 0.2; // Elements will be 20% of their base size at max waypoints

        // Linear reduction from 1.0 down to minElementScaleFactor
        waypointElementScale = Math.max(
          minElementScaleFactor,
          1.0 - ((numWaypoints - 50) / (maxScalingWaypoints - 50)) * (1.0 - minElementScaleFactor)
        );
      }

      // Base sizes (before scaling)
      const baseIconSize = 12;
      const baseCircleRadius = 2;
      const baseLineWidth = 1;
      const baseWaypointNameFontSize = 6;
      const baseTextOffsetX = 5; // Initial offset from center of icon
      const baseTextOffsetY = -5; // Initial offset for Y

      // Scaled sizes
      const scaledIconSize = baseIconSize * waypointElementScale;
      const scaledCircleRadius = baseCircleRadius * waypointElementScale;
      const scaledLineWidth = baseLineWidth * waypointElementScale;
      const scaledWaypointNameFontSize = Math.max(3, baseWaypointNameFontSize * waypointElementScale); // Ensure min font size
      const scaledTextOffsetX = (scaledIconSize / 2) + (baseTextOffsetX * waypointElementScale);
      const scaledTextOffsetY = baseTextOffsetY * waypointElementScale;

      // Title
      doc.fontSize(14).text("Waypoint Map", { align: "center" });

      // Calculate bounds for map content
      const latitudes = sortedWaypoints.map((wp) => wp.latitude);
      const longitudes = sortedWaypoints.map((wp) => wp.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLon = Math.min(...longitudes);
      const maxLon = Math.max(...longitudes);

      // Map dimensions (smaller to fit within centered area and allow space for legend)
      const availableWidth = doc.page.width - 2 * doc.page.margins.left;
      const availableHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom - 100; // Adjusted for legend height
      const mapWidth = 400; // Adjusted map width
      const mapHeight = 300; // Further adjusted map height to ensure fit

      // Calculate top-left corner to center the map area
      const mapStartX = doc.page.margins.left + (availableWidth - mapWidth) / 2;
      const mapStartY = doc.page.margins.top + 30; // Leave space for the title

      function scaleX(lon) {
        const range = maxLon - minLon || 0.0001;
        return mapStartX + ((lon - minLon) / range) * mapWidth;
      }

      function scaleY(lat) {
        const range = maxLat - minLat || 0.0001;
        return mapStartY + ((maxLat - lat) / range) * mapHeight;
      }

      // Draw waypoints
      const coords = [];
      for (let i = 0; i < numWaypoints; i++) {
        const wp = sortedWaypoints[i];
        const x = scaleX(wp.longitude);
        const y = scaleY(wp.latitude);
        const iconKey = determineIconKey(wp);
        const iconPath = iconKey ? path.join(__dirname, "../icons", ICON_MAP[iconKey]) : null;

        coords.push({ x, y, routeColor: getRouteColor(wp.routeType) });

        if (iconPath && fs.existsSync(iconPath)) {
          // Draw icon
          doc.image(iconPath, x - (scaledIconSize / 2), y - (scaledIconSize / 2), { width: scaledIconSize, height: scaledIconSize });
        } else {
          // Draw fallback circle
          doc.circle(x, y, scaledCircleRadius).fill(getRouteColor(wp.routeType));
        }

        // Draw waypoint name, offset from the icon
        doc.fontSize(scaledWaypointNameFontSize).fillColor("black").text(wp.name, x + scaledTextOffsetX, y + scaledTextOffsetY);
      }

      // Draw connections
      for (let i = 0; i < numWaypoints - 1; i++) {
        const { x: x1, y: y1, routeColor } = coords[i];
        const { x: x2, y: y2 } = coords[i + 1];
        doc.moveTo(x1, y1)
           .lineTo(x2, y2)
           .strokeColor(routeColor)
           .lineWidth(scaledLineWidth)
           .stroke();
      }

      // --- Legend in bottom-right corner as a formal table ---
      const legendCol1Width = 25; // For icon/circle
      const legendCol2Width = 120; // For text
      const legendPadding = 5; // Internal padding for cells
      const legendRowHeight = 18; // Increased row height for better spacing
      const legendTableWidth = legendCol1Width + legendCol2Width + (legendPadding * 4); // Total width with padding and borders
      const legendLineColor = "#CCCCCC"; // Light grey for table lines

      const legendRows = [];

      // Add table header row data (for drawing purposes)
      legendRows.push({ type: 'header', text: 'Symbol' }); // Col 1 header
      legendRows.push({ type: 'header', text: 'Description' }); // Col 2 header

      // Route types for legend
      legendRows.push({ type: 'route', text: 'Existing Route', color: 'black' });
      legendRows.push({ type: 'route', text: 'New Route', color: '#FB8500' });

      // Icon legends
      Object.entries(ICON_MAP).forEach(([key, iconName]) => {
        const displayKey = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        legendRows.push({ type: 'icon', iconName: iconName, text: displayKey, color: getRouteColor(key.includes("new") ? "new" : "existing") });
      });

      const totalLegendContentRows = legendRows.length - 2; // Subtract header rows
      const totalLegendTableHeight = (totalLegendContentRows * legendRowHeight) + (legendRowHeight * 2); // Rows + Header row + extra for title/padding

      const legendTableX = doc.page.width - doc.page.margins.right - legendTableWidth;
      const legendTableY = doc.page.height - doc.page.margins.bottom - totalLegendTableHeight;

      // Draw Legend Title
      doc.fontSize(9)
         .text("LEGEND", legendTableX, legendTableY - 15, { width: legendTableWidth, align: "center" }); // Position title above table

      // --- Draw Table Borders ---
      // Outer border
      doc.lineWidth(0.5)
         .strokeColor(legendLineColor)
         .rect(legendTableX, legendTableY, legendTableWidth, totalLegendTableHeight - 15) // Adjusted height
         .stroke();

      // Header row line
      const headerRowY = legendTableY + legendRowHeight;
      doc.moveTo(legendTableX, headerRowY)
         .lineTo(legendTableX + legendTableWidth, headerRowY)
         .stroke();

      // Vertical line separating columns
      const colLineX = legendTableX + legendCol1Width + (legendPadding * 2);
      doc.moveTo(colLineX, legendTableY)
         .lineTo(colLineX, legendTableY + totalLegendTableHeight - 15) // Adjusted height
         .stroke();

      // Draw table headers
      doc.fontSize(7).fillColor("black");
      doc.text("Symbol", legendTableX + legendPadding, legendTableY + legendPadding + 2, { width: legendCol1Width, align: 'center' });
      doc.text("Description", colLineX + legendPadding, legendTableY + legendPadding + 2, { width: legendCol2Width, align: 'center' });

      // Draw table content
      legendRows.slice(2).forEach((row, i) => { // Start from index 2 to skip header data
        const currentY = legendTableY + legendRowHeight + (i * legendRowHeight) + legendPadding; // Position below header

        // Draw horizontal line for each row
        doc.moveTo(legendTableX, currentY + legendRowHeight - legendPadding)
           .lineTo(legendTableX + legendTableWidth, currentY + legendRowHeight - legendPadding)
           .stroke();

        // Place icon/circle in first column
        if (row.type === 'route') { // Route type row (draw circle)
          doc.circle(legendTableX + legendPadding + (legendCol1Width / 2), currentY + (legendRowHeight / 2) - 2, 3).fill(row.color).stroke();
        } else { // Icon row (draw image or fallback circle)
          const iconPath = path.join(__dirname, "../icons", row.iconName);
          if (fs.existsSync(iconPath)) {
            doc.image(iconPath, legendTableX + legendPadding + 2, currentY + 2, { width: 10, height: 10 });
          } else {
            doc.circle(legendTableX + legendPadding + 2 + 5, currentY + 2 + 5, 5)
               .fill(row.color)
               .stroke();
          }
        }

        // Place text in second column
        doc.fontSize(7).fillColor("black").text(row.text, colLineX + legendPadding, currentY + 2, {
          width: legendCol2Width,
          ellipsis: true // Handle long text
        });
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = generatePdfBuffer;