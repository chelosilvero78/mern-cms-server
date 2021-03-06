const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { hashPassword, comparePassword } = require("../helpers/auth");
const nanoid = require("nanoid");  //Un generador de ID de cadena unico, pequeno, seguro y compatible con URL para JavaScript.
import emaliValidator from "email-validator"; //check valid email
// sendgrid (Verificar la identidad del remitente)
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_KEY);

exports.signup = async (req, res) => {
  // console.log("HIT SIGNUP", req.body);
  try {
    // validation
    const { name, email, password } = req.body;
    if (!name) {
      return res.json({
        error: "Nambre es requerido",
      });
    }
    if (!email) {
      return res.json({
        error: "Email es requerido",
      });
    }
    if (!password || password.length < 6) {
      return res.json({
        error: "Password es requirido y debe ser minimo de 6 caracteres",
      });
    }
    const exist = await User.findOne({ email });
    if (exist) {
      return res.json({
        error: "Email ya fue registrado", //Email is taken
      });
    }
    // hash password
    const hashedPassword = await hashPassword(password);

    try {
      const user = await new User({
        name,
        email,
        password: hashedPassword,
      }).save();

      // console.log("user saved in signup", user);

      // create signed token
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      // console.log(user);
      const { password, ...rest } = user._doc;
      return res.json({
        token,
        user: rest,
      });
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    // check if our db has user with that email
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        error: "usuario no registrado" //"No user found",
      });
    }
    // check password
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.json({
        error:"password incorrecto"  // "Wrong password",
      });
    }
    // create signed token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    user.password = undefined;  //evitar exponer pass
    user.secret = undefined;    //evitar exponer secret
    res.json({
      token,
      user,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Error. Try again.");
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  // find user by email
  const user = await User.findOne({ email });
  console.log("USER ===> ", user);
  if (!user) {
    return res.json({ error: "User not found" });
  }
  // generate code
  const resetCode = nanoid(5).toUpperCase();
  // save to db
  user.resetCode = resetCode;
  user.save();
  // prepare email
  const emailData = {
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "codigo de restablecimiento de contrase??a",
    html: `<h1>Tu codigo de restableimiento de de contrase??a es: ${resetCode}</h1>`,
  };
  // send email
  try {
    const data = await sgMail.send(emailData);
    console.log(data);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.json({ ok: false });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, password, resetCode } = req.body;
    // find user based on email and resetCode
    const user = await User.findOne({ email, resetCode });
    // if user not found
    if (!user) {
      return res.json({ error: "Email o codigo de cambio de contrase??a es invalido" });
    }
    // if password is short
    if (!password || password.length < 6) {
      return res.json({
        error: "Password es requerido y debe ser como m??nimo de 6 caracteres de longitud",
      });
    }
    // hash password
    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    user.resetCode = "";
    user.save();
    return res.json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};

export const currentUser = async (req, res) => {
  try {
    // const user = await User.findById(req.user._id);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, checked, website } = req.body;
    if (!name) {
      return res.json({
        error: "Nombre es requerido", //"Name is required"
      });
    }
    if (!email) {
      return res.json({
        error:"Email es requerido", //"Email is required",
      });
    }
    if (!password || password.length < 6) {
      return res.json({
        error:"Password requerido y debe ser como m??nimo de 6 caracteres de longitud" //"Password is required and should be 6 characters long",
      });
    }
    // if user exist
    const exist = await User.findOne({ email });
    if (exist) {
      return res.json({ error: "Email is taken" });
    }
    // hash password
    const hashedPassword = await hashPassword(password);

    // if checked, send email with login details
    if (checked) {
      // prepare email
      const emailData = {
        to: email,
        from: process.env.EMAIL_FROM,
        subject: "Account created",
        // html: `
        // <h1>Hi ${name}</h1>
        // <p>Your CMS account has been created successfully.</p>
        // <h3>Your login details</h3>
        // <p style="color:red;">Email: ${email}</p>
        // <p style="color:red;">Password: ${password}</p>
        // <small>We recommend you to change your password after login.</small>
        // `,
        html: `
        <h1>Hola ${name}</h1>
        <p>Su cuenta de CMS se ha creado correctamente..</p>
        <h3>Sus datos de inicio de sesi??n</h3>
        <p style="color:red;">Email: ${email}</p>
        <p style="color:red;">Password: ${password}</p>
        <small>Le recomendamos que cambie su contrase??a despu??s de iniciar sesi??n.</small>
        `,
      };

      try {
        const data = await sgMail.send(emailData);
        console.log("email sent => ", data);
      } catch (err) {
        console.log(err);
      }
    }

    try {
      const user = await new User({
        name,
        email,
        password: hashedPassword,
        role,
        website,
      }).save();

      const { password, ...rest } = user._doc;
      return res.json(rest);
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
};

export const users = async (req, res) => {
  try {
    const all = await User.find().select("-password -secret -resetCode");
    res.json(all);
  } catch (err) {
    console.log(err);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id) return;
    const user = await User.findByIdAndDelete(userId);
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};

export const currentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("image");
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    const { id, name, email, password, website, role, image } = req.body;

    const userFromDb = await User.findById(id);

    // check valid email
    if (!emaliValidator.validate(email)) {
      return res.json({ error: "Email invalido" });        //"Invalid email"
    }
    // check if email is taken
    const exist = await User.findOne({ email });
    if (exist && exist._id.toString() !== userFromDb._id.toString()) {
      return res.json({ error: "Email es usado" });   //"Email is taken"
    }
    // check password length
    if (password && password.length < 6) {
      return res.json({
        error: "Password requerido y debe ser como m??nimo de 6 caracteres de longitud",   //Password is required and should be 6 characters long
      });
    }

    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updated = await User.findByIdAndUpdate(
      id,
      {
        name: name || userFromDb.name,
        email: email || userFromDb.email,
        password: hashedPassword || userFromDb.password,
        website: website || userFromDb.website,
        role: role || userFromDb.role,
        image: image || userFromDb.image,
      },
      { new: true }
    ).populate("image");

    res.json(updated);
  } catch (err) {
    console.log(err);
  }
};

export const updateUserByUser = async (req, res) => {
  try {
    const { id, name, email, password, website, role, image } = req.body;

    const userFromDb = await User.findById(id);

    // check if user is himself/herself     //comprobar si el usuario es ??l mismo
    if (userFromDb._id.toString() !== req.user._id.toString()) {
      return res.status(403).send("No tienes permiso para actualizar este usuario"); //You are not allowed to update this user
    }

    // check valid email
    if (!emaliValidator.validate(email)) {
      return res.json({ error: "Email invalido" });  //"Invalid email"
    }
    // check if email is taken
    const exist = await User.findOne({ email });
    if (exist && exist._id.toString() !== userFromDb._id.toString()) {
      return res.json({ error: "Email es usado" });  //Email is taken
    }
    // check password length
    if (password && password.length < 6) {
      return res.json({
        error: "Password requerido y debe ser como m??nimo de 6 caracteres de longitud",  //"Password is required and should be 6 characters long"
      });
    }

    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updated = await User.findByIdAndUpdate(
      id,
      {
        name: name || userFromDb.name,
        email: email || userFromDb.email,
        password: hashedPassword || userFromDb.password,
        website: website || userFromDb.website,
        // role: role || userFromDb.role,
        image: image || userFromDb.image,
      },
      { new: true }
    ).populate("image");

    res.json(updated);
  } catch (err) {
    console.log(err);
  }
};
