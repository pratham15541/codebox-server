import UserModel from "../models/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import otpGenerator from "otp-generator";
import multer from "multer";
import fs from "fs";

export const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Destination folder for file uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Unique filename to avoid overwriting
  },
});

/** middleware for verify user */
export async function verifyUser(req, res, next) {
    try {
      const { emailOrUsername } = req.method == "GET" ? req.query : req.body;
  
      // check the user existence
      let exist = await UserModel.findOne({
        $and: [
          { $or: [{ email: emailOrUsername }, { username: emailOrUsername }] },
          { isDeleted: false } // Ensure the user is not deleted
        ]
      });
      if (!exist) return res.status(404).send({ error: "Can't find User!" });
      next();
    } catch (error) {
      return res.status(404).send({ error: "Authentication Error" });
    }
  }

export async function register(req, res) {
  try {
    const { username, password, email } = req.body;
    const profile = req.file ? req.file.path : ""; // Check if a file is uploaded and get its path

    // Check the existing user
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(400).send({ error: "Please use a unique username" });
    }

    // Check for existing email
    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return res.status(400).send({ error: "Please use a unique Email" });
    }

    if (!password) {
      return res.status(400).send({ error: "Password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new UserModel({
      username,
      password: hashedPassword,
      profile,
      email,
    });

    try {
      const result = await user.save();
      return res
        .status(201)
        .send({ message: "User Register Successfully", result });
    } catch (error) {
      return res.status(500).send({ error });
    }
  } catch (error) {
    return res
      .status(500)
      .send({ error: error.message || "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { emailOrUsername, password } = req.body;

    const user = await UserModel.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).send({ error: "Email Or Username not Found" });
    }

    const passwordCheck = await bcrypt.compare(password, user.password);

    if (!passwordCheck) {
      return res.status(400).send({ error: "Password does not Match" });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).send({
      message: "Login Successful...!",
      email: user.email,
      username: user.username,
      role: user.role,
      token,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ error: error.message || "Internal Server Error" });
  }
}

export async function getUser(req, res) {
  const { emailOrUsername } = req.params;

  try {
    if (!emailOrUsername) {
      return res.status(501).send({ error: "Invalid Username" });
    }

    const user = await UserModel.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).send({ error: "Couldn't Find the User" });
    }

    /** remove password from user */
    const { password, ...others } = Object.assign({}, user.toJSON());

    return res.status(200).send({ message: "User Found", others });
  } catch (error) {
    return res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function getAllUser(req, res) {
  try {
    const users = await UserModel.find({ isDeleted: false });
    return res.status(201).send({ message: "All Users", users });
  } catch (error) {
    return res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function getAllDeletedUser(req, res) {
  try {
    const users = await UserModel.find({ isDeleted: true });
    return res.status(201).send({ message: "All Deleted Users", users });
  } catch (error) {
    return res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function getUsersCount(req, res) {
  try {
    const usersCount = await UserModel.countDocuments({isDeleted: false});
    return res.status(201).send({ usersCount });
  } catch (error) {
    return res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function getDeleteUserCount(req, res) {
    try {
        const usersCount = await UserModel.countDocuments({isDeleted: true});
        return res.status(201).send({ usersCount });
    } catch (error) {
        return res.status(500).send({ error: "Internal Server Error" });
    }
}

export async function getUserById(req, res) {
  try {
    // Extract user ID from the request parameters
    const { id } = req.params;

    // Check if the ID is valid (optional)
    if (!id) {
      return res.status(400).send({ error: "Invalid user ID" });
    }

    // Use UserModel to find the user by ID
    const user = await UserModel.findById(id);

    // Check if the user is found
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Remove sensitive information (password) before sending the response
    const { password, ...userData } = user.toJSON();

    return res.status(200).send(userData);
  } catch (error) {
    return res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function deleteUser(req, res) {
  try {
    // Extract user ID from the request parameters
    const { id } = req.query;

    // Check if the ID is valid (optional)
    if (!id) {
      return res.status(400).send({ error: "Invalid user ID" });
    }

    // Use UserModel to find and update the user by ID
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    // Check if the user is found and updated
    if (!updatedUser) {
      return res.status(404).send({ error: "User not found" });
    }

    // Remove sensitive information (password) before sending the response
    const { password, ...updatedUserData } = updatedUser.toJSON();

    return res
      .status(200)
      .send({ message: "User soft-deleted successfully", updatedUserData });
  } catch (error) {
    return res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function revertDeletedUser(req, res) {
  try {
    // Extract user ID from the request parameters
    const { id } = req.query;

    // Check if the ID is valid (optional)
    if (!id) {
      return res.status(400).send({ error: "Invalid user ID" });
    }

    // Use UserModel to find and update the user by ID
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { isDeleted: false },
      { new: true }
    );

    // Check if the user is found and updated
    if (!updatedUser) {
      return res.status(404).send({ error: "User not found" });
    }

    // Remove sensitive information (password) before sending the response
    const { password, ...updatedUserData } = updatedUser.toJSON();

    return res
      .status(200)
      .send({ message: "User reverted successfully", updatedUserData });
  } catch (error) {
    return res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.query; // Use req.query to get the id from the query parameters

    if (!id) {
      return res.status(401).send({ error: "User ID not provided...!" });
    }

    const body = req.body;

    // Check if there is a profile file in the request
    if (req.file) {
      // Delete previously stored profile image if exists
      const user = await UserModel.findById(id);
      if (user && user.profile) {
        // Delete the previous profile image file
        fs.unlinkSync(user.profile);
      }

      // Update the profile field in the user data
      body.profile = req.file.path;
    }

    // Update the user data using promises
    await UserModel.updateOne({ _id: id }, body);

    // Fetch the updated user data
    const updatedUser = await UserModel.findById(id);

    if (!updatedUser) {
      return res.status(404).send({ error: "Updated user not found...!" });
    }

    return res.status(201).send({
      message: "Record Updated...!",
      user: updatedUser, // Include the updated user data in the response
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function generateOTP(req, res) {
  req.app.locals.OTP = await otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  res.status(201).send({ code: req.app.locals.OTP });
}

export async function verifyOTP(req, res) {
  const { code } = req.query;
  if (parseInt(req.app.locals.OTP) === parseInt(code)) {
    req.app.locals.OTP = null; // reset the OTP value
    req.app.locals.resetSession = true; // start session for reset password
    return res.status(201).send({ message: "Verify Successsfully!" });
  }
  return res.status(400).send({ error: "Invalid OTP" });
}

export async function createResetSession(req, res) {
  if (req.app.locals.resetSession) {
    return res.status(201).send({ flag: req.app.locals.resetSession });
  }
  return res.status(440).send({ error: "Session expired!" });
}

export async function resetPassword(req, res) {
  try {
    if (!req.app.locals.resetSession) {
      return res.status(440).send({ error: "Session expired!" });
    }

    const { emailOrUsername, password } = req.body;

    try {
      const user = await UserModel.findOne({
        $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
      });

      if (!user) {
        return res.status(404).send({ error: "Username or Email not found" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await UserModel.updateOne(
        { username: user.username },
        { password: hashedPassword }
      );

      req.app.locals.resetSession = false; // Reset session
      return res.status(201).send({ message: "Password reset successfully" });
    } catch (error) {
      return res.status(500).send({ error: "Internal Server Error" });
    }
  } catch (error) {
    return res.status(401).send({ error: "Unauthorized" });
  }
}
