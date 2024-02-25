import UserCodeModel from "../models/UserCode.model.js";

export async function createCode(req, res) {
  try {
    const { code, codeLanguage, title, description, username } = req.body;
    const { id } = req.query;
    const userCode = await UserCodeModel.create({
      code,
      codeLanguage,
      user: id,
      title,
      description,
      username,
    });
    res.status(201).json({ userCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllCodes(req, res) {
  try {
    const userCodes = await UserCodeModel.find({ isDeleted: false });
    res.status(200).json({ userCodes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAllCodesByUsername(req, res) {
  try {
    // Fetch all codes from the database
    const allCodes = await UserCodeModel.find({ isDeleted: false })
      .populate("user", "username isDeleted")
      .sort({ "user.username": 1, updatedAt: -1 }) // Sort by username ascending and updatedAt descending
      .exec();

    // Create an object to store codes grouped by username
    const codesByUser = {};

    // Iterate through each code and group them by username
    allCodes.forEach((code) => {
      const { username, isDeleted } = code.user;
      if (!isDeleted) {
        if (!codesByUser[username]) {
          codesByUser[username] = [code];
        } else {
          codesByUser[username].push(code);
        }
      }
    });

    // Sort the codesByUser object by username
    const sortedCodesByUser = Object.keys(codesByUser).sort().reduce((acc, key) => {
      acc[key] = codesByUser[key];
      return acc;
    }, {});

    res.status(200).json({ codesByUser: sortedCodesByUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getOnlyDeletedCodesByUsername(req, res) {
  try {
    // Fetch all codes from the database
    const allCodes = await UserCodeModel.find({ isDeleted: true })
      .populate("user", "username isDeleted")
      .sort({ "user.username": 1, updatedAt: -1 }) // Sort by username ascending and updatedAt descending
      .exec();

    // Create an object to store codes grouped by username
    const codesByUser = {};

    // Iterate through each code and group them by username
    allCodes.forEach((code) => {
      const { username, isDeleted } = code.user;
      if (!isDeleted) {
        if (!codesByUser[username]) {
          codesByUser[username] = [code];
        } else {
          codesByUser[username].push(code);
        }
      }
    });

    // Sort the codesByUser object by username
    const sortedCodesByUser = Object.keys(codesByUser).sort().reduce((acc, key) => {
      acc[key] = codesByUser[key];
      return acc;
    }, {});

    res.status(200).json({ codesByUser: sortedCodesByUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCodeById(req, res) {
  try {
    const { id } = req.query;
    const userCode = await UserCodeModel.findById(id);
    res.status(200).json({ userCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getCodesByUserId(req, res) {
  try {
    const { id } = req.query;
    const userCodes = await UserCodeModel.find({ user: id, isDeleted: false })
      .sort({ updatedAt: -1 }); // Sort by updatedAt in descending order
    res.status(200).json({ userCodes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateCode(req, res) {
  try {
    const { id } = req.query; // Assuming you are passing the ID as a parameter
    const { code, title, description } = req.body; // Include the fields you want to update
    const userCode = await UserCodeModel.findByIdAndUpdate(
      id,
      { code, title, description },
      { new: true }
    );

    if (!userCode) {
      return res.status(404).json({ error: "Code not found" });
    }

    res.status(200).json({ userCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCode(req, res) {
  try {
    const { id } = req.query;
    const deleteCode = await UserCodeModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    res.status(200).json({ deleteCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function revertDeletedCode(req, res) {
  try {
    const { id } = req.query;
    const revertDeletedCode = await UserCodeModel.findByIdAndUpdate(
      id,
      { isDeleted: false },
      { new: true }
    );
    res.status(200).json({ revertDeletedCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}