import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = mongoose.Schema;

const mediaSchema = new Schema(
  {
    url: String,          //url de cloudinary
    public_id: String,    //id public de cloudinary
    postedBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Media", mediaSchema);