const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      min: 6,
      max: 64,
    },
    role: {
      type: String,
      default: "Subscriber",
    },
    image: { type: ObjectId, ref: "Media" },
    website: {
      type: String,
    },
    resetCode: "",
    posts: [{ type: ObjectId, ref: "Post" }],
  },
  { timestamps: true }
);

//---quitar y no exponer contraseña del usuario
// UsuarioSchema.methods.toJSON = function() {
//   const { __v, password, _id, ...usuario  } = this.toObject();
//   usuario.uid = _id;
//   return usuario;
// }
userSchema.methods.toJSON = function() {
  const {password, ...rest  } = this.toObject();
  return rest;
}

module.exports = mongoose.model("User", userSchema);