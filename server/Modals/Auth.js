import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  plan: { type: String, default: "Free" }, // Free, Bronze, Silver, Gold
  phone: { type: String, default: "" },
  lastDownloadDate: { type: String, default: "" },
  downloadCount: { type: Number, default: 0 },
});

export default mongoose.model("user", userschema);
