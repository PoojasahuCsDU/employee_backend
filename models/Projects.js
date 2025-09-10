const mongoose = require("mongoose");

const PoleDetailsSchema = new mongoose.Schema(
  {
    poleNo: { type: Number },
    existingOrNewProposed: { type: String, required: true },
    poleDiscription: { type: String, required: true },

    poleType: { type: String, required: true },
    poleSizeInMeter: { type: Number, required: true },
    poleStructure: { type: String, required: true },
    _3PhaseLTDistributionBox: { type: Number, default: 0 },
    abSwitch: { type: Number, default: 0 },
    anchorRod: { type: Number, default: 0 },
    anchoringAssembly: { type: Number, default: 0 },
    angle4Feet: { type: Number, default: 0 },
    angle9Feet: { type: Number, default: 0 },
    basePlat: { type: Number, default: 0 },
    channel4Feet: { type: Number, default: 0 },
    channel9Feet: { type: Number, default: 0 },
    doChannel: { type: Number, default: 0 },
    doChannelBackClamp: { type: Number, default: 0 },
    doFuse: { type: Number, default: 0 },
    discHardware: { type: Number, default: 0 },
    discInsulatorPolymeric: { type: Number, default: 0 },
    discInsulatorPorcelain: { type: Number, default: 0 },
    dtrBaseChannel: { type: Number, default: 0 },
    dtrSpottingAngle: { type: Number, default: 0 },
    dvcConductor: { type: Number, default: 0 },
    earthingConductor: { type: Number, default: 0 },
    elbow: { type: Number, default: 0 },
    eyeBolt: { type: Number, default: 0 },
    giPin: { type: Number, default: 0 },
    giPipe: { type: Number, default: 0 },
    greeper: { type: Number, default: 0 },
    guyInsulator: { type: Number, default: 0 },
    iHuckClamp: { type: Number, default: 0 },
    lightingArrestor: { type: Number, default: 0 },
    pinInsulatorPolymeric: { type: Number, default: 0 },
    pinInsulatorPorcelain: { type: Number, default: 0 },
    poleEarthing: { type: Number, default: 0 },
    sideClamp: { type: Number, default: 0 },
    spottingAngle: { type: Number, default: 0 },
    spottingChannel: { type: Number, default: 0 },
    stayClamp: { type: Number, default: 0 },
    stayInsulator: { type: Number, default: 0 },
    stayRoad: { type: Number, default: 0 },
    stayWire712: { type: Number, default: 0 },
    suspensionAssemblyClamp: { type: Number, default: 0 },
    topChannel: { type: Number, default: 0 },
    topClamp: { type: Number, default: 0 },
    turnBuckle: { type: Number, default: 0 },
    vCrossArm: { type: Number, default: 0 },
    vCrossArmClamp: { type: Number, default: 0 },
    xBressing: { type: Number, default: 0 },
    earthingCoil: { type: Number, default: 0 },
  },
  { _id: false }
);
const GpsDetailSchema = new mongoose.Schema(
  {
    timeAndDate: { type: String, required: true },
    userId: {
      type: String,
      required: true,
    },

    district: { type: String },
    routeStartPoint: { type: String },
    lengthInMeter: { type: Number },

    startPointCoordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    currentWaypointCoordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },

    substationName: { type: String },
    feederName: { type: String },
    conductor: { type: String },
    cable: { type: String,default:null },

    transformerLocation: { type: String,default:null },
    transformerType:{type:String,default:null},
    transformerPoleType:{type:String,default:null},
    transformerKV: { type: String,default:null },

    ltDistributionBox3Phase: { type: Number, default: 0 },
    abSwitch: { type: Number, default: 0 },
    anchorRod: { type: Number, default: 0 },
    anchoringAssembly: { type: Number, default: 0 },

    angle4Feet: { type: Number, default: 0 },
    angle9Feet: { type: Number, default: 0 },
    basePlat: { type: Number, default: 0 },
    channel4Feet: { type: Number, default: 0 },
    channel9Feet: { type: Number, default: 0 },
    doChannel: { type: Number, default: 0 },
    doChannelBackClamp: { type: Number, default: 0 },
    doFuse: { type: Number, default: 0 },
    discHardware: { type: Number, default: 0 },
    discInsulatorPolymeric: { type: Number, default: 0 },
    discInsulatorPorcelain: { type: Number, default: 0 },
    dtrBaseChannel: { type: Number, default: 0 },
    dtrSpottingAngle: { type: Number, default: 0 },
    dtrSpottingAngleWithClamp: { type: Number, default: 0 },
    dvcConductor: { type: Number, default: 0 },
    earthingConductor: { type: Number, default: 0 },
    elbow: { type: Number, default: 0 },
    eyeBolt: { type: Number, default: 0 },
    giPin: { type: Number, default: 0 },
    giPipe: { type: Number, default: 0 },
    greeper: { type: Number, default: 0 },
    guyInsulator: { type: Number, default: 0 },
    iHuckClamp: { type: Number, default: 0 },
    lightingArrestor: { type: Number, default: 0 },
    pinInsulatorPolymeric: { type: Number, default: 0 },
    pinInsulatorPorcelain: { type: Number, default: 0 },
    poleEarthing: { type: Number, default: 0 },
    sideClamp: { type: Number, default: 0 },
    spottingAngle: { type: Number, default: 0 },
    spottingChannel: { type: Number, default: 0 },
    stayClamp: { type: Number, default: 0 },
    stayInsulator: { type: Number, default: 0 },
    stayRoad: { type: Number, default: 0 },
    stayWire712: { type: Number, default: 0 },
    suspensionAssemblyClamp: { type: Number, default: 0 },
    topChannel: { type: Number, default: 0 },
    topClamp: { type: Number, default: 0 },
    turnBuckle: { type: Number, default: 0 },
    vCrossArm: { type: Number, default: 0 },
    vCrossArmClamp: { type: Number, default: 0 },
    xBressing: { type: Number, default: 0 },
    earthingCoil: { type: Number, default: 0 },
  },
  { _id: false }
);

const WaypointSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    distanceFromPrevious: { type: Number,default: 0 },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    routeType:{type:String, required:true},
    routeStartingPoint:{type:String, required:true},
    routeEndingPoint:{type:String, required:true},
    isEnd: { type: Boolean, default: false },
    isStart: { type: Boolean, default: false },
    image: { type: String, default: null },

    poleDetails: [PoleDetailsSchema],
    gpsDetails: [GpsDetailSchema],

    timestamp: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pathOwner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true }
);

const ProjectSchema = new mongoose.Schema({
  projectId: { type: String, unique: true },
  circle: { type: String, required: true },
  division: { type: String, required: true },
  description: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  waypoints: [[WaypointSchema]],
});

ProjectSchema.pre("save", async function (next) {
  if (this.isNew && !this.projectId) {
    const count = await mongoose.model("Project").countDocuments();
    this.projectId = `Project_${count + 1}`;
  }
  next();
});

module.exports = mongoose.model("Project", ProjectSchema);
