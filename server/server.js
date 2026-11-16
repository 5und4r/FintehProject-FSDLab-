const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3001;
const MONGO_URI = "mongodb://127.0.0.1:27017/legalEyeDB";

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Local MongoDB Instance
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully to legalEyeDB");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
  });

// Mongoose Schema & Model for Pre-Settlement Transaction Audits
const transactionSchema = new mongoose.Schema(
  {
    txId: {
      type: String,
      required: true,
      unique: true
    },
    sender: {
      type: String,
      required: true,
      trim: true
    },
    beneficiary: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    rail: {
      type: String,
      default: "NPCI_UPI_2.0"
    },
    device: {
      type: String,
      default: "Trusted Everyday Smartphone"
    },
    verdict: {
      type: String,
      enum: ["CLEARED", "HALTED", "BLOCKED"],
      default: "CLEARED"
    },
    riskScore: {
      type: Number,
      default: 4.2
    },
    timestamp: {
      type: String,
      default: () => {
        const now = new Date();
        return `${now.toISOString().split("T")[0]} ${now.toLocaleTimeString()}`;
      }
    }
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

// Health Check Endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ONLINE",
    service: "Legal Eye Pre-Settlement MERN API",
    database: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED"
  });
});

// 1. CREATE -> POST /transactions
app.post("/transactions", async (req, res) => {
  try {
    const { sender, beneficiary, amount, rail, device, verdict } = req.body;

    if (!sender || !beneficiary || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Sender, beneficiary, and a positive transfer amount are required."
      });
    }

    let calculatedRisk = 4.2;
    if (verdict === "BLOCKED") calculatedRisk = 98.4;
    else if (verdict === "HALTED") calculatedRisk = 88.7;
    else if (device && (device.includes("SIM Swap") || device.includes("Rooted"))) {
      calculatedRisk = 76.5;
    }

    const generatedTxId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const formattedTime = `${now.toISOString().split("T")[0]} ${now.toLocaleTimeString()}`;

    const newTransaction = new Transaction({
      txId: generatedTxId,
      sender: sender.trim(),
      beneficiary: beneficiary.trim(),
      amount: Number(amount),
      rail: rail || "NPCI_UPI_2.0",
      device: device || "Trusted Everyday Smartphone",
      verdict: verdict || "CLEARED",
      riskScore: calculatedRisk,
      timestamp: formattedTime
    });

    const savedRecord = await newTransaction.save();

    res.status(201).json({
      message: `Transaction Record ${savedRecord.txId} Saved Successfully to MongoDB`,
      data: savedRecord
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to save transaction record to MongoDB",
      error: err.message
    });
  }
});

// 2. READ -> GET /transactions
app.get("/transactions", async (req, res) => {
  try {
    const records = await Transaction.find().sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch transaction records",
      error: err.message
    });
  }
});

// 3. SEARCH -> GET /transactions/search/:query
app.get("/transactions/search/:query", async (req, res) => {
  try {
    const searchRegex = new RegExp(req.params.query, "i");
    const matches = await Transaction.find({
      $or: [
        { txId: searchRegex },
        { sender: searchRegex },
        { beneficiary: searchRegex },
        { rail: searchRegex },
        { device: searchRegex },
        { verdict: searchRegex }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(matches);
  } catch (err) {
    res.status(500).json({
      message: "Search query failed",
      error: err.message
    });
  }
});

// 4. UPDATE -> PUT /transactions/:id
app.put("/transactions/:id", async (req, res) => {
  try {
    const { sender, beneficiary, amount, rail, device, verdict } = req.body;

    let calculatedRisk = 4.2;
    if (verdict === "BLOCKED") calculatedRisk = 98.4;
    else if (verdict === "HALTED") calculatedRisk = 88.7;
    else if (device && (device.includes("SIM Swap") || device.includes("Rooted"))) {
      calculatedRisk = 76.5;
    }

    const updatedRecord = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        sender: sender?.trim(),
        beneficiary: beneficiary?.trim(),
        amount: Number(amount),
        rail,
        device,
        verdict,
        riskScore: calculatedRisk
      },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: "Transaction record not found in MongoDB" });
    }

    res.status(200).json({
      message: `Transaction Record ${updatedRecord.txId} Updated Successfully`,
      data: updatedRecord
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update transaction record",
      error: err.message
    });
  }
});

// 5. DELETE -> DELETE /transactions/:id
app.delete("/transactions/:id", async (req, res) => {
  try {
    const deletedRecord = await Transaction.findByIdAndDelete(req.params.id);

    if (!deletedRecord) {
      return res.status(404).json({ message: "Transaction record not found in MongoDB" });
    }

    res.status(200).json({
      message: `Transaction Record ${deletedRecord.txId} Deleted from MongoDB`,
      data: deletedRecord
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete transaction record",
      error: err.message
    });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Legal Eye Express Server Running on Port ${PORT}`);
});