import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
  },
  currency: {
    type: String,
    default: 'INR',
  },
  merchant: {
    type: String,
    required: [true, 'Merchant name is required'],
    trim: true,
  },
  accountNumber: {
    type: String,
    trim: true,
    index: true,
    // Last 3-4 digits of account number (e.g., "0633", "5830")
  },
  accountName: {
    type: String,
    trim: true,
    // Optional friendly name for the account (e.g., "HDFC Savings", "ICICI Credit Card")
  },
  bankName: {
    type: String,
    trim: true,
    // Extracted bank name (e.g., "HDFC Bank", "ICICI Bank")
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false,
  },
  transactionDate: {
    type: Date,
    required: true,
    index: true,
  },
  transactionType: {
    type: String,
    enum: ['debit', 'credit', 'upi', 'card', 'bank_transfer'],
    default: 'debit',
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'FamPay Card', 'Other'],
    default: 'Other',
  },
  emailId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values
  },
  emailSubject: {
    type: String,
  },
  emailSnippet: {
    type: String,
  },
  isManual: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
  },
  tags: [{
    type: String,
    lowercase: true,
  }],
  categorySuggestion: {
    suggestedCategory: {
      _id: String,
      name: String,
      icon: String,
      color: String
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    autoCategorize: {
      type: Boolean,
      default: false
    },
    totalTransactions: {
      type: Number,
      min: 0
    },
    message: {
      type: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
transactionSchema.index({ userId: 1, transactionDate: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, merchant: 1 });
transactionSchema.index({ userId: 1, accountNumber: 1 });
transactionSchema.index({ userId: 1, accountNumber: 1, transactionDate: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
