const tokml = require("tokml");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const { imageSize } = require("image-size");

// Debug configuration

// Configuration Constants
const DEFAULT_ICON_SIZE = 32; // Target display height in pixels
const ICON_FILES = [
  "existing_transformer.png",
  "new_transformer.png",
  "existing_double_pole.png",
  "new_double_pole.png",
  "existing_standard_pole.png",
  "new_standard_pole.png",
];

// Improved haversine distance calculation
function haversineDistance(coord1, coord2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Improved path finding algorithm
function getShortestPath(waypoints) {
  if (waypoints.length < 2) return waypoints;

  const path = [waypoints[0]];
  let remaining = waypoints.slice(1);

  while (remaining.length > 0) {
    let lastPoint = path[path.length - 1];
    let minDistance = Infinity;
    let nearestIndex = 0;

    remaining.forEach((point, index) => {
      const dist = haversineDistance(lastPoint, point);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = index;
      }
    });

    path.push(remaining[nearestIndex]);
    remaining.splice(nearestIndex, 1);
  }

  return path;
}

// Generate path lines between waypoints
function generatePathLines(waypoints, routeType) {
  return waypoints.slice(0, -1).map((wp, i) => ({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [wp.longitude, wp.latitude],
        [waypoints[i + 1].longitude, waypoints[i + 1].latitude],
      ],
    },
    properties: {
      name: `Segment ${i + 1}`,
      description: `From ${wp.name} to ${waypoints[i + 1].name}`,
      styleUrl: `#${routeType}_line_style`,
    },
  }));
}

// Get icon configuration with dynamic scaling
function getIconConfig(iconPath) {
  try {
    const fileBuffer = fs.readFileSync(iconPath);
    const dimensions = imageSize(fileBuffer);

    if (!dimensions || !dimensions.width || !dimensions.height) {
      throw new Error("Invalid image dimensions");
    }

    const scale = DEFAULT_ICON_SIZE / dimensions.height;

    return {
      scale: scale.toFixed(1),
      hotSpot: {
        x: dimensions.width / 2,
        y: dimensions.height / 2,
        xunits: "pixels",
        yunits: "pixels",
      },
    };
  } catch (error) {
    return {
      scale: "1.0",
      hotSpot: { x: 16, y: 32, xunits: "pixels", yunits: "pixels" },
    };
  }
}

// Determine icon style based on waypoint properties
function getIconStyle(waypoint) {
  try {
    try {
      // Handle both array and object cases
      const gpsData = Array.isArray(waypoint.gpsDetails)
        ? waypoint.gpsDetails[0] // Array case
        : waypoint.gpsDetails; // Direct object case

      // Debug the actual structure

      // Check transformer type
      if (gpsData?.transformerType) {
        const transType = String(gpsData.transformerType).toLowerCase().trim();
        if (transType.includes("existing")) return "existing_transformer_style";
        if (transType.includes("new")) return "new_transformer_style";
      }

      // Rest of your pole detection logic...
    } catch (error) {
      return "default_style";
    }

    if (waypoint.poleDetails?.length > 0) {
      const pole = waypoint.poleDetails[0];
      const poleType = String(pole.poleType || "").toLowerCase();
      const status = String(pole.existingOrNewProposed || "").toLowerCase();

      const isDoublePole =
        poleType.includes("double") || poleType.includes("dtr");
      return isDoublePole
        ? `${status}_double_pole_style`
        : `${status}_standard_pole_style`;
    }

    return "default_style";
  } catch (error) {
    return "default_style";
  }
}

// Main KMZ generation function
// Main KMZ generation function - Updated Version
async function generateKmzBuffer(waypoints, routeType = "existing") {
  try {
    const iconsDir = path.join(__dirname, "../icons");

    if (!fs.existsSync(iconsDir)) {
      throw new Error(`Icons folder not found at: ${iconsDir}`);
    }

    // 1. Prepare styles with proper KML color format (AABBGGRR)
    const styles = {
      // Line Styles
      existing_line_style: {
        LineStyle: {
          color: "ff000000", // Black
          width: 4,
          // gx: {
          //   physicalWidth: 4,
          //   labelVisibility: 0,
          //   // These create the dashed effect:
          //   dashArray: "2 2", // 2px on, 2px off (simple dashed pattern)
          //   dashPhase: 0.5, // Controls alignment
          // },
        },
      },
      new_line_style: {
        LineStyle: {
          color: "ff00ffff", // Yellow
          width: 4,
        },
      },
      // Default Style
      default_style: {
        IconStyle: {
          Icon: {
            href: "http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png",
          },
          hotSpot: { x: 20, y: 2, xunits: "pixels", yunits: "pixels" },
        },
      },
    };

    // 2. Add custom icon styles
    const iconFilesInKmz = [];
    for (const iconFile of ICON_FILES) {
      const iconPath = path.join(iconsDir, iconFile);
      if (fs.existsSync(iconPath)) {
        const styleName = iconFile.replace(".png", "_style");
        const { scale, hotSpot } = getIconConfig(iconPath);

        styles[styleName] = {
          IconStyle: {
            Icon: {
              href: `files/${iconFile}`,
              scale: scale,
            },
            hotSpot: hotSpot,
          },
        };
        iconFilesInKmz.push(iconFile);
      }
    }

    // 3. Generate features
    const sortedWaypoints = getShortestPath(waypoints);
    const features = sortedWaypoints.map((wp, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [wp.longitude, wp.latitude],
      },
      properties: {
        name: wp.name || `Waypoint ${index + 1}`,
        description: wp.description || "",
        styleUrl: `#${getIconStyle(wp)}`,
      },
    }));

    // 4. Add path lines
    if (sortedWaypoints.length > 1) {
      features.push(...generatePathLines(sortedWaypoints, routeType));
    }

    // 5. Generate proper KML structure
    const kmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
   
    <description>Route type: ${routeType}</description>
    
    <!-- Styles -->
    ${Object.entries(styles)
      .map(
        ([id, style]) => `
    <Style id="${id}">
      ${
        style.IconStyle
          ? `
      <IconStyle>
        <scale>${style.IconStyle.Icon.scale || 1}</scale>
        <Icon>
          <href>${style.IconStyle.Icon.href}</href>
        </Icon>
        <hotSpot x="${style.IconStyle.hotSpot.x}" y="${
              style.IconStyle.hotSpot.y
            }" 
                 xunits="${style.IconStyle.hotSpot.xunits}" yunits="${
              style.IconStyle.hotSpot.yunits
            }"/>
      </IconStyle>
      `
          : ""
      }
      ${
        style.LineStyle
          ? `
      <LineStyle>
        <color>${style.LineStyle.color}</color>
        <width>${style.LineStyle.width}</width>
      </LineStyle>
      `
          : ""
      }
    </Style>
    `
      )
      .join("")}
    
    <!-- Placemarks -->
    ${features
      .map(
        (feature) => `
    <Placemark>
      <name>${feature.properties.name}</name>
      <description>${feature.properties.description}</description>
      <styleUrl>${feature.properties.styleUrl}</styleUrl>
      ${
        feature.geometry.type === "Point"
          ? `
      <Point>
        <coordinates>${feature.geometry.coordinates.join(",")},0</coordinates>
      </Point>
      `
          : `
      <LineString>
        <coordinates>
          ${feature.geometry.coordinates
            .map((coord) => coord.join(","))
            .join(" ")}
        </coordinates>
      </LineString>
      `
      }
    </Placemark>
    `
      )
      .join("")}
  </Document>
</kml>`;

    // 6. Create KMZ
    const zip = new AdmZip();
    zip.addFile("doc.kml", Buffer.from(kmlTemplate, "utf-8"));

    // 7. Add icons
    for (const iconFile of iconFilesInKmz) {
      const iconPath = path.join(iconsDir, iconFile);
      zip.addLocalFile(iconPath, "files");
    }

    // 8. Validate before returning
    const kmlEntry = zip.getEntry("doc.kml");
    if (!kmlEntry) {
      throw new Error("KMZ creation failed - missing doc.kml");
    }

    return zip.toBuffer();
  } catch (error) {
    throw error;
  }
}

module.exports = generateKmzBuffer;
