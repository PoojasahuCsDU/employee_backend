const ExcelJS = require("exceljs");

/**
 * Generates an Excel workbook buffer summarizing waypoint inventory and materials.
 * @param {Array<Object>} waypoints - Ordered list of waypoint objects with `gpsDetails` and `poleDetails`.
 * @returns {Promise<Buffer>} XLSX buffer suitable for sending as a file response.
 */
async function generateExcelBuffer(waypoints) {
  const workbook = new ExcelJS.Workbook();

  // Create Inventory sheet
  const inventorySheet = workbook.addWorksheet("Inventory");
  setupInventorySheet(inventorySheet, waypoints);

  // Create Details of Material sheet
  const materialSheet = workbook.addWorksheet("Details of Material");
  setupMaterialSheet(materialSheet, waypoints);

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

function calculateDistanceInKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function setupInventorySheet(sheet, waypoints) {
  sheet.columns = [
    { header: "", key: "col1", width: 5 },
    { header: "", key: "col2", width: 30 },
    { header: "", key: "col3", width: 20 },
    { header: "", key: "col4", width: 20 },
    { header: "", key: "col5", width: 20 },
    { header: "", key: "col6", width: 20 },
    { header: "", key: "col7", width: 20 },
    { header: "", key: "col8", width: 20 },
    { header: "", key: "col9", width: 15 },
    { header: "", key: "col10", width: 15 },
  ];

  const defaultFont = { name: "Arial", size: 10 };
  const boldFont = { ...defaultFont, bold: true };

  const addFormattedRow = (values, isBold = false) => {
    const row = sheet.addRow(values);
    row.height = 15;
    row.eachCell((cell, colNumber) => {
      cell.font = isBold ? boldFont : defaultFont;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    return row;
  };

  // Add route length information
  //sheet.addRow([]);
  const totalLengthRowInMaterialSheet = waypoints.length + 3;

  addFormattedRow(
    [
      "",
      "Total Route Length",
      "",
      "",
      { formula: `'Details of Material'!G${totalLengthRowInMaterialSheet}` },
      "",
      "",
      "",
      "",
      "KM.",
    ],
    true
  );
  // addFormattedRow(
  //   [
  //     "",
  //     "Existing Length",
  //     "",
  //     "",
  //     existingLength.toFixed(3),
  //     "",
  //     "",
  //     "",
  //     "",
  //     "KM.",
  //   ],
  //   true
  // );

  // const newPropRow = addFormattedRow(
  //   [
  //     "",
  //     "New Proposed Length",
  //     "",
  //     "",
  //     { formula: "E2-E3" },
  //     "",
  //     "",
  //     "",
  //     "",
  //     "KM.",
  //   ],
  //   true
  // );
  // newPropRow.getCell("E").numFmt = "0.000";

  sheet.addRow([]);

  // Pole type headers
  const poleHeader = addFormattedRow(
    [
      "",
      "Type Of Pole",
      "PCC Pole/ PSC Pole",
      "RSJ Pole",
      "Rail Pole",
      "H-Beam Pole",
      "Tubular Pole",
      "Steel Tubular Pole",
      "Unit",
      "Total Qty.",
    ],
    true
  );
  poleHeader.height = 30;
  poleHeader.eachCell((cell, colNumber) => {
    if (colNumber > 2)
      cell.alignment = { ...cell.alignment, horizontal: "center" };
  });

  sheet.addRow([]);

  // Pole types with counts
  const poleTypes = {
    "Line Pole": "PCC Pole/ PSC Pole",
    "Angle Pole /Schackle Pole": "RSJ Pole", // Corrected typo: Schackle -> Shackle
    "Tapping Pole": "Rail Pole",
    "Double Pole Structure": "H-Beam Pole",
  };

  Object.entries(poleTypes).forEach(([type, poleType]) => {
    // poleDetails is already the first item or undefined
    const count = waypoints.filter(
      (wp) => wp.poleDetails?.poleType === poleType
    ).length;
    const row = addFormattedRow(["", type]);
    row.getCell("C").value = count;
    row.getCell("C").alignment = { horizontal: "center" };
  });

  sheet.addRow([]); // Add one empty row after pole types for spacing

  // Transformer section
  addFormattedRow(["", "Transformer KV", "", "", "", "", "", "", "", ""], true);
  sheet.addRow([]);

  const transformerKVs = [
    "5KV",
    "10KV",
    "25KV",
    "100KV",
    "200KV",
    "250KV",
    "315KV",
    "400KV",
    "500KV",
  ];
  transformerKVs.forEach((kv) => {
    // gpsDetails is already the first item or undefined
    const count = waypoints.filter(
      (wp) => wp.gpsDetails?.transformerKV === kv
    ).length;
    const row = addFormattedRow(["", kv]);
    row.getCell("J").value = count;
    row.getCell("J").alignment = { horizontal: "center" };
  });

  sheet.addRow([]);

  // Materials section
  addFormattedRow(
    ["", "Description", "", "", "", "", "", "", "Unit", "Total Qty."],
    true
  );

  const materials = [
    {
      name: "3 Phase L.T. Distribution box",
      unit: "Nos.",
      key: "ltDistributionBox3Phase",
      formulaColumn: "P+BO",
    }, // Maps to P column in Details of Material
    { name: "AB Switch", unit: "Set", key: "abSwitch", formulaColumn: "Q+BP" },
    {
      name: "Anchor Rod",
      unit: "Nos.",
      key: "anchorRod",
      formulaColumn: "R+BQ",
    },
    {
      name: "Anchoring Assembly",
      unit: "Set",
      key: "anchoringAssembly",
      formulaColumn: "S+BR",
    },
    {
      name: "Angle 4 Feet",
      unit: "Nos.",
      key: "angle4Feet",
      formulaColumn: "T+BS",
    },
    {
      name: "Angle 9 Feet",
      unit: "Nos.",
      key: "angle9Feet",
      formulaColumn: "U+BT",
    },
    { name: "Base Plat", unit: "Nos.", key: "basePlat", formulaColumn: "V+BU" },
    {
      name: "Channel 4 Feet",
      unit: "Nos.",
      key: "channel4Feet",
      formulaColumn: "W+BV",
    },
    {
      name: "Channel 9 Feet",
      unit: "Nos.",
      key: "channel9Feet",
      formulaColumn: "X+BW",
    },
    {
      name: "DO Channel",
      unit: "Nos.",
      key: "doChannel",
      formulaColumn: "Y+BX",
    },
    {
      name: "DO Channel Back Clamp",
      unit: "Nos.",
      key: "doChannelBackClamp",
      formulaColumn: "Z+BY",
    },
    { name: "DO Fuse", unit: "Set", key: "doFuse", formulaColumn: "AA+BZ" },
    {
      name: "Disc Hardware",
      unit: "Nos.",
      key: "discHardware",
      formulaColumn: "AB+CA",
    },
    {
      name: "Disc Insulator Polymeric",
      unit: "Nos.",
      key: "discInsulatorPolymeric",
      formulaColumn: "AC+CB",
    },
    {
      name: "Disc Insulator Porcelain",
      unit: "Nos.",
      key: "discInsulatorPorcelain",
      formulaColumn: "AD+CC",
    },
    {
      name: "DTR Base Channel",
      unit: "Nos.",
      key: "dtrBaseChannel",
      formulaColumn: "AE+CD",
    },
    {
      name: "DTR Spotting Angle",
      unit: "Nos.",
      key: "dtrSpottingAngle",
      formulaColumn: "AF+CE",
    },
    {
      name: "DTR Spotting Angle with Clamp",
      unit: "Nos.",
      key: "dtrSpottingAngleWithClamp",
      formulaColumn: "AG+CF",
    },
    {
      name: "DVC Conductor",
      unit: "Nos.",
      key: "dvcConductor",
      formulaColumn: "AH+CG",
    },
    {
      name: "Earthing Conductor",
      unit: "Nos.",
      key: "earthingConductor",
      formulaColumn: "AI+CH",
    },
    { name: "Elbow", unit: "Nos.", key: "elbow", formulaColumn: "AJ+CI" },
    { name: "Eye Bolt", unit: "Nos.", key: "eyeBolt", formulaColumn: "AK+CJ" },
    { name: "GI Pin", unit: "Nos.", key: "giPin", formulaColumn: "AL+CK" },
    { name: "GI Pipe", unit: "Nos.", key: "giPipe", formulaColumn: "AM+CL" },
    { name: "Greeper", unit: "Nos.", key: "greeper", formulaColumn: "AN+CM" },
    {
      name: "Guy Insulator",
      unit: "Nos.",
      key: "guyInsulator",
      formulaColumn: "AO+CN",
    },
    {
      name: "I Huck Clamp",
      unit: "Nos.",
      key: "iHuckClamp",
      formulaColumn: "AP+CO",
    },
    {
      name: "Lighting Arrestor",
      unit: "Nos.",
      key: "lightingArrestor",
      formulaColumn: "AQ+CP",
    },
    {
      name: "Pin Insulator Polymeric",
      unit: "Set",
      key: "pinInsulatorPolymeric",
      formulaColumn: "AR+CQ",
    },
    {
      name: "Pin Insulator Porcelain",
      unit: "Nos.",
      key: "pinInsulatorPorcelain",
      formulaColumn: "AS+CR",
    },
    {
      name: "Pole Earthing",
      unit: "Nos.",
      key: "poleEarthing",
      formulaColumn: "AT+CS",
    },
    {
      name: "Side Clamp",
      unit: "Nos.",
      key: "sideClamp",
      formulaColumn: "AU+CT",
    },
    {
      name: "Spotting Angle",
      unit: "Nos.",
      key: "spottingAngle",
      formulaColumn: "AV+CU",
    },
    {
      name: "Spotting Channel",
      unit: "Nos.",
      key: "spottingChannel",
      formulaColumn: "AW+CV",
    },
    {
      name: "Stay Clamp",
      unit: "Nos.",
      key: "stayClamp",
      formulaColumn: "AX+CW",
    },
    {
      name: "Stay Insulator",
      unit: "Nos.",
      key: "stayInsulator",
      formulaColumn: "AY+CX",
    },
    { name: "Stay Rod", unit: "Nos.", key: "stayRoad", formulaColumn: "AZ+CY" },
    {
      name: "Stay Wire 7/12",
      unit: "Kg.",
      key: "stayWire712",
      formulaColumn: "BA+CZ",
    },
    {
      name: "Suspension Assembly Clamp",
      unit: "Nos.",
      key: "suspensionAssemblyClamp",
      formulaColumn: "BB+DA",
    },
    {
      name: "Top Channel",
      unit: "Nos.",
      key: "topChannel",
      formulaColumn: "BC+DB",
    },
    {
      name: "Top Clamp",
      unit: "Nos.",
      key: "topClamp",
      formulaColumn: "BD+DC",
    },
    {
      name: "Turn Buckle",
      unit: "Nos.",
      key: "turnBuckle",
      formulaColumn: "BE+DD",
    },
    {
      name: "V Cross Arm",
      unit: "Nos.",
      key: "vCrossArm",
      formulaColumn: "BF+DE",
    },
    {
      name: "V Cross Arm Clamp",
      unit: "Nos.",
      key: "vCrossArmClamp",
      formulaColumn: "BG+DF",
    },
    {
      name: "X Bressing",
      unit: "Nos.",
      key: "xBressing",
      formulaColumn: "BH+DG",
    },
    {
      name: "Earthing Coil",
      unit: "Nos.",
      key: "earthingCoil",
      formulaColumn: "BI+DH",
    },
  ];

  materials.forEach((material) => {
    const row = addFormattedRow([
      "",
      material.name,
      "",
      "",
      "",
      "",
      "",
      "",
      material.unit,
    ]);
    // The formula will now correctly reference the 'Details of Material' sheet
    // The row number for the SUM total in 'Details of Material' is waypoints.length + 2
    const totalRowInMaterialSheet = waypoints.length + 2;
    let formula = "";
    if (material.formulaColumn.includes("+")) {
      // If it's a sum of two columns (e.g., "P+BO")
      const [col1, col2] = material.formulaColumn.split("+");
      formula = `SUM('Details of Material'!${col1}3:${col1}${
        totalRowInMaterialSheet - 1
      }) + SUM('Details of Material'!${col2}3:${col2}${
        totalRowInMaterialSheet - 1
      })`;
      // Note: I changed the end row for SUM from 'totalRowInMaterialSheet' to 'totalRowInMaterialSheet - 1'
      // because you want to sum the data rows, not the total row itself.
      // The total row is at waypoints.length + 2, so the last data row is waypoints.length + 1.
      // Also, the data starts from row 3 (after a blank row and a header row).
    } else {
      // If it's just a single column (e.g., "AG")
      formula = `SUM('Details of Material'!${material.formulaColumn}3:${
        material.formulaColumn
      }${totalRowInMaterialSheet - 1})`;
    }

    row.getCell("J").value = { formula };
    row.getCell("J").alignment = { horizontal: "right" };
  });
}

function setupMaterialSheet(sheet, waypoints) {
  // Define columns with exact widths
  const columns = [
    { header: "Sr No.", key: "srNo", width: 8 },
    { header: "Time & Date", key: "timestamp", width: 50 },
    { header: "User ID", key: "userId", width: 35 },
    { header: "District", key: "district", width: 20 },
    { header: "Route Start Point", key: "routeStartPoint", width: 20 },
    { header: "Route End Point", key: "routeEndPoint", width: 20 },
    { header: "Length / Km.", key: "lengthInKm", width: 15 },
    { header: "GPS Coordinates Start Point", key: "startCoords", width: 35 },
    { header: "GPS Coordinates End Point", key: "endCoords", width: 35 },
    { header: "Substation Name", key: "substationName", width: 25 },
    { header: "Feeder Name", key: "feederName", width: 20 },
    { header: "Conductor", key: "conductor", width: 20 },
    { header: "Cable", key: "cable", width: 20 },
    { header: "Transformer Location", key: "transformerLocation", width: 20 },
    { header: "Transformer KV", key: "transformerKV", width: 15 },
    {
      header: "3 Phase L.T. Distribution box",
      key: "ltDistributionBox3Phase",
      width: 10,
    },
    { header: "AB Switch", key: "abSwitch", width: 10 },
    { header: "Anchor Rod", key: "anchorRod", width: 10 },
    { header: "Anchoring Assembly", key: "anchoringAssembly", width: 10 },
    { header: "Angle(4 Feet)", key: "angle4Feet", width: 10 },
    { header: "Angle(9 Feet)", key: "angle9Feet", width: 10 },
    { header: "Base Plat", key: "basePlat", width: 10 },
    { header: "Channel(4 Feet)", key: "channel4Feet", width: 10 },
    { header: "Channel(9 Feet)", key: "channel9Feet", width: 10 },
    { header: "D.O. Channel", key: "doChannel", width: 10 },
    { header: "D.O. Channel Back Clamp", key: "doChannelBackClamp", width: 10 },
    { header: "D.O. Fuse", key: "doFuse", width: 10 },
    { header: "Disc Hardware", key: "discHardware", width: 10 },
    {
      header: "Disc Insulator(Polymeric)",
      key: "discInsulatorPolymeric",
      width: 10,
    },
    {
      header: "Disc Insulator(Porcelain)",
      key: "discInsulatorPorcelain",
      width: 10,
    },
    { header: "DTR Base Channel", key: "dtrBaseChannel", width: 10 },
    { header: "DTR Spotting Angle", key: "dtrSpottingAngle", width: 10 },
    {
      header: "DTR Spotting Angle with Clamp",
      key: "dtrSpottingAngleWithClamp",
      width: 10,
    },
    { header: "DVC Conductor", key: "dvcConductor", width: 10 },
    { header: "Earthing Conductor", key: "earthingConductor", width: 10 },
    { header: "Elbow", key: "elbow", width: 10 },
    { header: "Eye-Bolt", key: "eyeBolt", width: 10 },
    { header: "GI Pin", key: "giPin", width: 10 },
    { header: "GI Pipe", key: "giPipe", width: 10 },
    { header: "Greeper", key: "greeper", width: 10 },
    { header: "Guy Insulator", key: "guyInsulator", width: 10 },
    { header: "I Huck Clamp", key: "iHuckClamp", width: 10 },
    { header: "Lighting Arrestor", key: "lightingArrestor", width: 10 },
    {
      header: "Pin Insulator(Polymeric)",
      key: "pinInsulatorPolymeric",
      width: 10,
    },
    {
      header: "Pin Insulator (Porcelain)",
      key: "pinInsulatorPorcelain",
      width: 10,
    },
    { header: "Pole Earthing", key: "poleEarthing", width: 10 },
    { header: "Side Clamp", key: "sideClamp", width: 10 },
    { header: "Spotting Angle", key: "spottingAngle", width: 10 },
    { header: "Spotting Channel", key: "spottingChannel", width: 10 },
    { header: "Stay Clamp", key: "stayClamp", width: 10 },
    { header: "Stay Insulator", key: "stayInsulator", width: 10 },
    { header: "Stay Road", key: "stayRoad", width: 10 },
    { header: "Stay Wire 7/12", key: "stayWire712", width: 10 },
    {
      header: "Suspension Assembly Clamp",
      key: "suspensionAssemblyClamp",
      width: 10,
    },
    { header: "Top Channel", key: "topChannel", width: 10 },
    { header: "Top Clamp", key: "topClamp", width: 10 },
    { header: "Turn Buckle", key: "turnBuckle", width: 10 },
    { header: "V Cross Arm", key: "vCrossArm", width: 10 },
    { header: "V Cross Arm Clamp", key: "vCrossArmClamp", width: 10 },
    { header: "X Bressing", key: "xBressing", width: 10 },
    { header: "Earthing Coil", key: "earthingCoil", width: 10 },
    { header: "Pole No.", key: "poleNo", width: 10 },
    { header: "Existing / New Proposed", key: "proposalType", width: 20 },
    { header: "Pole Description", key: "poleDescription", width: 25 },
    { header: "Pole Type", key: "poleType", width: 20 },
    { header: "Pole Size / Mtr.", key: "poleSizeInMeter", width: 15 },
    {
      header: "3 Phase L.T. Distribution box",
      key: "poleltDistributionBox3Phase",
      width: 10,
    },
    { header: "AB Switch", key: "poleabSwitch", width: 10 },
    { header: "Anchor Rod", key: "poleanchorRod", width: 10 },
    { header: "Anchoring Assembly", key: "poleanchoringAssembly", width: 10 },
    { header: "Angle(4 Feet)", key: "poleangle4Feet", width: 10 },
    { header: "Angle(9 Feet)", key: "poleangle9Feet", width: 10 },
    { header: "Base Plat", key: "polebasePlat", width: 10 },
    { header: "Channel(4 Feet)", key: "polechannel4Feet", width: 10 },
    { header: "Channel(9 Feet)", key: "polechannel9Feet", width: 10 },
    { header: "D.O. Channel", key: "poledoChannel", width: 10 },
    {
      header: "D.O. Channel Back Clamp",
      key: "poledoChannelBackClamp",
      width: 10,
    },
    { header: "D.O. Fuse", key: "poledoFuse", width: 10 },
    { header: "Disc Hardware", key: "polediscHardware", width: 10 },
    {
      header: "Disc Insulator(Polymeric)",
      key: "polediscInsulatorPolymeric",
      width: 10,
    },
    {
      header: "Disc Insulator(Porcelain)",
      key: "polediscInsulatorPorcelain",
      width: 10,
    },
    { header: "DTR Base Channel", key: "poledtrBaseChannel", width: 10 },
    { header: "DTR Spotting Angle", key: "poledtrSpottingAngle", width: 10 },
    // {
    //   header: "DTR Spotting Angle with Clamp",
    //   key: "dtrSpottingAngleWithClamp",
    //   width: 10,
    // },
    { header: "DVC Conductor", key: "poledvcConductor", width: 10 },
    { header: "Earthing Conductor", key: "poleearthingConductor", width: 10 },
    { header: "Elbow", key: "poleelbow", width: 10 },
    { header: "Eye-Bolt", key: "poleeyeBolt", width: 10 },
    { header: "GI Pin", key: "polegiPin", width: 10 },
    { header: "GI Pipe", key: "polegiPipe", width: 10 },
    { header: "Greeper", key: "polegreeper", width: 10 },
    { header: "Guy Insulator", key: "poleguyInsulator", width: 10 },
    { header: "I Huck Clamp", key: "poleiHuckClamp", width: 10 },
    { header: "Lighting Arrestor", key: "polelightingArrestor", width: 10 },
    {
      header: "Pin Insulator(Polymeric)",
      key: "polepinInsulatorPolymeric",
      width: 10,
    },
    {
      header: "Pin Insulator (Porcelain)",
      key: "polepinInsulatorPorcelain",
      width: 10,
    },
    { header: "Pole Earthing", key: "polepoleEarthing", width: 10 },
    { header: "Side Clamp", key: "polesideClamp", width: 10 },
    { header: "Spotting Angle", key: "polespottingAngle", width: 10 },
    { header: "Spotting Channel", key: "polespottingChannel", width: 10 },
    { header: "Stay Clamp", key: "polestayClamp", width: 10 },
    { header: "Stay Insulator", key: "polestayInsulator", width: 10 },
    { header: "Stay Road", key: "polestayRoad", width: 10 },
    { header: "Stay Wire 7/12", key: "polestayWire712", width: 10 },
    {
      header: "Suspension Assembly Clamp",
      key: "polesuspensionAssemblyClamp",
      width: 10,
    },
    { header: "Top Channel", key: "poletopChannel", width: 10 },
    { header: "Top Clamp", key: "poletopClamp", width: 10 },
    { header: "Turn Buckle", key: "poleturnBuckle", width: 10 },
    { header: "V Cross Arm", key: "polevCrossArm", width: 10 },
    { header: "V Cross Arm Clamp", key: "polevCrossArmClamp", width: 10 },
    { header: "X Bressing", key: "polexBressing", width: 10 },
    { header: "Earthing Coil", key: "poleearthingCoil", width: 10 },
  ];

  const columnsWithoutHeaders = columns.map((col) => ({
    key: col.key,
    width: col.width,
  }));

  sheet.columns = columnsWithoutHeaders;

  sheet.addRow();
  const headerRow = sheet.addRow(columns.map((col) => col.header));
  //sheet.columns = columns;
  headerRow.height = 60;
  headerRow.eachCell((cell, colNumber) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    // Default to regular font for all cells
    cell.font = { name: "Arial", size: 9, bold: false };

    // Define keys that should have bold font and background color
    const specialHeaderKeys = [
      "srNo",
      "timestamp",
      "userId",
      "district",
      "routeStartPoint",
      "routeEndPoint",
      "lengthInKm",
      "startCoords",
      "endCoords",
      "substationName",
      "feederName",
      "conductor",
      "cable",
      "transformerLocation",
      "transformerKV",
      "poleNo",
      "proposalType",
      "poleDescription",
      "poleType",
      "poleSizeInMeter",
    ];

    // Get the key of the current column
    const currentColumnKey = columns[colNumber - 1]?.key;

    if (specialHeaderKeys.includes(currentColumnKey)) {
      // Apply special styling only to these columns
      cell.font = { name: "Arial", size: 9, bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF7CAAC" },
      };
    }
  });

  waypoints.forEach((wp, index) => {
    const poleDetails = wp.poleDetails || {};
    const gpsDetails = wp.gpsDetails || {};
    const nextGps = waypoints[index + 1]?.gpsDetails || {};
    const startLat = gpsDetails.currentWaypointCoordinates?.latitude;
    const startLon = gpsDetails.currentWaypointCoordinates?.longitude;
    const endLat = nextGps?.currentWaypointCoordinates?.latitude;
    const endLon = nextGps?.currentWaypointCoordinates?.longitude;

    const lengthInKm =
      startLat && startLon && endLat && endLon
        ? calculateDistanceInKm(startLat, startLon, endLat, endLon)
        : 0;

    const rowData = {
      srNo: index + 1,
      timestamp: formatDate(wp.timestamp),
      userId: gpsDetails.userId || "",
      district: gpsDetails.district || "",
      routeStartPoint: gpsDetails.routeStartPoint || "",
      routeEndPoint: waypoints[index + 1]?.gpsDetails?.routeStartPoint || "", // Assuming routeEndingPoint from WaypointSchema
      lengthInKm: Number(lengthInKm.toFixed(3)),

      // Convert meters to KM
      startCoords: `${gpsDetails.currentWaypointCoordinates?.latitude || ""}, ${
        gpsDetails.currentWaypointCoordinates?.longitude || ""
      }`,
      endCoords: `${
        waypoints[index + 1]?.gpsDetails.currentWaypointCoordinates?.latitude ||
        ""
      }, ${
        waypoints[index + 1]?.gpsDetails.currentWaypointCoordinates
          ?.longitude || ""
      }`, // Using current waypoint for end coords
      substationName: gpsDetails.substationName || "",
      feederName: gpsDetails.feederName || "",
      conductor: gpsDetails.conductor || "", // Conductor is in GpsDetailsSchema
      cable: gpsDetails.cable || "",
      transformerLocation: gpsDetails.transformerLocation || "",
      transformerKV: gpsDetails.transformerKV || "",
      ltDistributionBox3Phase: gpsDetails.ltDistributionBox3Phase || 0,
      abSwitch: gpsDetails.abSwitch || 0,
      anchorRod: gpsDetails.anchorRod || 0,
      anchoringAssembly: gpsDetails.anchoringAssembly || 0,
      angle4Feet: gpsDetails.angle4Feet || 0,
      angle9Feet: gpsDetails.angle9Feet || 0,
      basePlat: gpsDetails.basePlat || 0,
      channel4Feet: gpsDetails.channel4Feet || 0,
      channel9Feet: gpsDetails.channel9Feet || 0,
      doChannel: gpsDetails.doChannel || 0,
      doChannelBackClamp: gpsDetails.doChannelBackClamp || 0,
      doFuse: gpsDetails.doFuse || 0,
      discHardware: gpsDetails.discHardware || 0,
      discInsulatorPolymeric: gpsDetails.discInsulatorPolymeric || 0,
      discInsulatorPorcelain: gpsDetails.discInsulatorPorcelain || 0,
      dtrBaseChannel: gpsDetails.dtrBaseChannel || 0,
      dtrSpottingAngle: gpsDetails.dtrSpottingAngle || 0,
      dtrSpottingAngleWithClamp: gpsDetails.dtrSpottingAngleWithClamp || 0,
      dvcConductor: gpsDetails.dvcConductor || 0,
      earthingConductor: gpsDetails.earthingConductor || 0,
      elbow: gpsDetails.elbow || 0,
      eyeBolt: gpsDetails.eyeBolt || 0,
      giPin: gpsDetails.giPin || 0,
      giPipe: gpsDetails.giPipe || 0,
      greeper: gpsDetails.greeper || 0,
      guyInsulator: gpsDetails.guyInsulator || 0,
      iHuckClamp: gpsDetails.iHuckClamp || 0,
      lightingArrestor: gpsDetails.lightingArrestor || 0,
      pinInsulatorPolymeric: gpsDetails.pinInsulatorPolymeric || 0,
      pinInsulatorPorcelain: gpsDetails.pinInsulatorPorcelain || 0,
      poleEarthing: gpsDetails.poleEarthing || 0,
      sideClamp: gpsDetails.sideClamp || 0,
      spottingAngle: gpsDetails.spottingAngle || 0,
      spottingChannel: gpsDetails.spottingChannel || 0,
      stayClamp: gpsDetails.stayClamp || 0,
      stayInsulator: gpsDetails.stayInsulator || 0,
      stayRoad: gpsDetails.stayRoad || 0,
      stayWire712: gpsDetails.stayWire712 || 0,
      suspensionAssemblyClamp: gpsDetails.suspensionAssemblyClamp || 0,
      topChannel: gpsDetails.topChannel || 0,
      topClamp: gpsDetails.topClamp || 0,
      turnBuckle: gpsDetails.turnBuckle || 0,
      vCrossArm: gpsDetails.vCrossArm || 0,
      vCrossArmClamp: gpsDetails.vCrossArmClamp || 0,
      xBressing: gpsDetails.xBressing || 0,
      earthingCoil: gpsDetails.earthingCoil || 0,

      // Pole details are sourced from poleDetails object
      poleNo: poleDetails.poleNo || "",
      proposalType: poleDetails.existingOrNewProposed || "",
      poleDescription: poleDetails.poleDiscription || "", // Corrected typo here
      poleType: poleDetails.poleType || "",
      poleSizeInMeter: poleDetails.poleSizeInMeter || "",
      poleltDistributionBox3Phase: poleDetails._3PhaseLTDistributionBox || 0,
      poleabSwitch: poleDetails.abSwitch || 0,
      poleanchorRod: poleDetails.anchorRod || 0,
      poleanchoringAssembly: poleDetails.anchoringAssembly || 0,
      poleangle4Feet: poleDetails.angle4Feet || 0,
      poleangle9Feet: poleDetails.angle9Feet || 0,
      polebasePlat: poleDetails.basePlat || 0,
      polechannel4Feet: poleDetails.channel4Feet || 0,
      polechannel9Feet: poleDetails.channel9Feet || 0,
      poledoChannel: poleDetails.doChannel || 0,
      poledoChannelBackClamp: poleDetails.doChannelBackClamp || 0,
      poledoFuse: poleDetails.doFuse || 0,
      polediscHardware: poleDetails.discHardware || 0,
      polediscInsulatorPolymeric: poleDetails.discInsulatorPolymeric || 0,
      polediscInsulatorPorcelain: poleDetails.discInsulatorPorcelain || 0,
      poledtrBaseChannel: poleDetails.dtrBaseChannel || 0,
      poledtrSpottingAngle: poleDetails.dtrSpottingAngle || 0,
      //dtrSpottingAngleWithClamp: poleDetails.dtrSpottingAngleWithClamp || 0,
      poledvcConductor: poleDetails.dvcConductor || 0,
      poleearthingConductor: poleDetails.earthingConductor || 0,
      poleelbow: poleDetails.elbow || 0,
      poleeyeBolt: poleDetails.eyeBolt || 0,
      polegiPin: poleDetails.giPin || 0,
      polegiPipe: poleDetails.giPipe || 0,
      polegreeper: poleDetails.greeper || 0,
      poleguyInsulator: poleDetails.guyInsulator || 0,
      poleiHuckClamp: poleDetails.iHuckClamp || 0,
      polelightingArrestor: poleDetails.lightingArrestor || 0,
      polepinInsulatorPolymeric: poleDetails.pinInsulatorPolymeric || 0,
      polepinInsulatorPorcelain: poleDetails.pinInsulatorPorcelain || 0,
      polepoleEarthing: poleDetails.poleEarthing || 0,
      polesideClamp: poleDetails.sideClamp || 0,
      polespottingAngle: poleDetails.spottingAngle || 0,
      polespottingChannel: poleDetails.spottingChannel || 0,
      polestayClamp: poleDetails.stayClamp || 0,
      polestayInsulator: poleDetails.stayInsulator || 0,
      polestayRoad: poleDetails.stayRoad || 0,
      polestayWire712: poleDetails.stayWire712 || 0,
      polesuspensionAssemblyClamp: poleDetails.suspensionAssemblyClamp || 0,
      poletopChannel: poleDetails.topChannel || 0,
      poletopClamp: poleDetails.topClamp || 0,
      poleturnBuckle: poleDetails.turnBuckle || 0,
      polevCrossArm: poleDetails.vCrossArm || 0,
      polevCrossArmClamp: poleDetails.vCrossArmClamp || 0,
      polexBressing: poleDetails.xBressing || 0,
      poleearthingCoil: poleDetails.earthingCoil || 0,
    };

    const row = sheet.addRow(Object.values(rowData));
    row.height = 15;
    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "middle" };
    });

    // Format numeric cells.
    Object.keys(rowData).forEach((key, colIndex) => {
      // Find the column definition for the current key
      const columnDef = columns.find((col) => col.key === key);
      if (typeof rowData[key] === "number" && columnDef) {
        // Only apply numeric format if the column is one of the material quantities
        const materialKeys = [
          "ltDistributionBox3Phase",
          "abSwitch",
          "anchorRod",
          "anchoringAssembly",
          "angle4Feet",
          "angle9Feet",
          "basePlat",
          "channel4Feet",
          "channel9Feet",
          "doChannel",
          "doChannelBackClamp",
          "doFuse",
          "discHardware",
          "discInsulatorPolymeric",
          "discInsulatorPorcelain",
          "dtrBaseChannel",
          "dtrSpottingAngle",
          "dtrSpottingAngleWithClamp",
          "dvcConductor",
          "earthingConductor",
          "elbow",
          "eyeBolt",
          "giPin",
          "giPipe",
          "greeper",
          "guyInsulator",
          "iHuckClamp",
          "lightingArrestor",
          "pinInsulatorPolymeric",
          "pinInsulatorPorcelain",
          "poleEarthing",
          "sideClamp",
          "spottingAngle",
          "spottingChannel",
          "stayClamp",
          "stayInsulator",
          "stayRoad",
          "stayWire712",
          "suspensionAssemblyClamp",
          "topChannel",
          "topClamp",
          "turnBuckle",
          "vCrossArm",
          "vCrossArmClamp",
          "xBressing",
          "earthingCoil",
        ];
        if (materialKeys.includes(key)) {
          row.getCell(colIndex + 1).numFmt = "0";
        }
      }
    });
  });

  const totalRow = sheet.addRow([]);
  totalRow.height = 15;
  totalRow.getCell(1).value = "Total Length:";
  totalRow.getCell(7).value = { formula: `SUM(G3:G${waypoints.length + 2})` };
  totalRow.getCell(7).numFmt = "0.000";
  totalRow.getCell(15).value = "Total :";

  const materialRanges = [
    // General materials (P-BI)
    {
      firstCol:
        columns.findIndex((col) => col.key === "ltDistributionBox3Phase") + 1,
      lastCol: columns.findIndex((col) => col.key === "earthingCoil") + 1,
    },
    // Pole materials (BO-DG)
    {
      firstCol:
        columns.findIndex((col) => col.key === "poleltDistributionBox3Phase") +
        1,
      lastCol: columns.findIndex((col) => col.key === "poleearthingCoil") + 1,
    },
  ];

  // Apply totals to all material columns
  materialRanges.forEach((range) => {
    for (let i = range.firstCol; i <= range.lastCol; i++) {
      const colLetter = getColumnLetter(i);
      totalRow.getCell(i).value = {
        formula: `SUM(${colLetter}3:${colLetter}${waypoints.length + 1})`,
      };
      totalRow.getCell(i).numFmt = "0";
    }
  });

  // Style totals row
  totalRow.eachCell((cell) => {
    if (cell.value) {
      cell.font = { name: "Arial", size: 10, bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" },
      };
    }
  });
}

// Style totals row

function formatDate(timestamp) {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.log("Invalid date:", timestamp);
      return "";
    }

    const pad = (num) => num.toString().padStart(2, "0");

    // Get local time components
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();

    let hours = date.getHours();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours || 12; // Convert 0 to 12

    const minutes = pad(date.getMinutes());

    return `${day}-${month}-${year}_${hours}.${minutes}${ampm}`;
  } catch (e) {
    console.log("Error formatting date:", e);
    return "";
  }
}

// Helper function to convert column number to letter (e.g., 1 -> A, 27 -> AA)
function getColumnLetter(colIndex) {
  let temp,
    letter = "";
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
}

module.exports = generateExcelBuffer;
