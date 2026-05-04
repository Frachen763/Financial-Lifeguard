import mongoose from 'mongoose';

const categoryPatternSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  amountRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: Number.MAX_SAFE_INTEGER }
  },
  frequency: { type: Number, default: 1 }, // How many times this pattern occurred
  confidence: { type: Number, default: 0.5 }, // Confidence score for this pattern
  lastUsed: { type: Date, default: Date.now },
  timePatterns: [{
    dayOfWeek: Number, // 0-6 (Sunday-Saturday)
    timeOfDay: String, // 'morning', 'afternoon', 'evening', 'night'
    frequency: Number
  }]
});

const transactionSummarySchema = new mongoose.Schema({
  totalTransactions: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  averageAmount: { type: Number, default: 0 },
  firstTransaction: { type: Date },
  lastTransaction: { type: Date },
  monthlyFrequency: { type: Number, default: 0 }, // Avg transactions per month
  isRegular: { type: Boolean, default: false }, // Regular payments (rent, subscriptions)
});

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  normalizedIdentifier: {
    type: String,
    required: true,
    index: true,
    // Normalized version of name (lowercase, no spaces, special chars)
  },
  type: {
    type: String,
    enum: ['individual', 'business', 'unknown'],
    default: 'unknown',
  },
  categoryPatterns: [categoryPatternSchema],
  transactionSummary: transactionSummarySchema,
  confidenceScore: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    default: '',
  },
  // Learning metrics
  learningData: {
    totalCategorizations: { type: Number, default: 0 },
    correctPredictions: { type: Number, default: 0 },
    userCorrections: { type: Number, default: 0 },
    predictionAccuracy: { type: Number, default: 0 },
  }
}, {
  timestamps: true,
});

// Indexes for efficient queries
contactSchema.index({ userId: 1, normalizedIdentifier: 1 }, { unique: true });
contactSchema.index({ userId: 1, 'categoryPatterns.categoryId': 1 });
contactSchema.index({ userId: 1, confidenceScore: -1 });

// Static method to normalize identifier
contactSchema.statics.normalizeIdentifier = function(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
};

// Instance method to predict category
contactSchema.methods.predictCategory = function(amount, transactionDate = new Date()) {
  if (!this.categoryPatterns.length) {
    return { category: null, confidence: 0 };
  }

  // Find patterns matching the amount range
  const matchingPatterns = this.categoryPatterns.filter(pattern => 
    amount >= pattern.amountRange.min && amount <= pattern.amountRange.max
  );

  if (!matchingPatterns.length) {
    // If no amount match, use the most frequent category
    const topPattern = this.categoryPatterns.reduce((prev, current) => 
      (prev.frequency > current.frequency) ? prev : current
    );
    return {
      category: topPattern.categoryId,
      confidence: Math.min(topPattern.confidence * 0.7, 0.4) // Lower confidence for amount mismatch
    };
  }

  // Find best matching pattern considering amount and time
  let bestPattern = matchingPatterns[0];
  let bestScore = 0;

  const dayOfWeek = transactionDate.getDay();
  const hour = transactionDate.getHours();
  let timeOfDay = 'morning';
  if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else if (hour >= 21 || hour < 6) timeOfDay = 'night';

  for (const pattern of matchingPatterns) {
    let score = pattern.confidence * pattern.frequency;
    
    // Boost score if time pattern matches
    const timePattern = pattern.timePatterns.find(tp => 
      tp.dayOfWeek === dayOfWeek && tp.timeOfDay === timeOfDay
    );
    if (timePattern) {
      score *= 1.2; // 20% boost for time pattern match
    }
    
    // Boost score if amount is close to average for this pattern
    const avgAmount = (pattern.amountRange.min + pattern.amountRange.max) / 2;
    const amountDiff = Math.abs(amount - avgAmount) / avgAmount;
    if (amountDiff < 0.2) { // Within 20% of average
      score *= 1.1; // 10% boost
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  // Normalize confidence score
  const maxPossibleScore = Math.max(...matchingPatterns.map(p => p.confidence * p.frequency));
  const normalizedConfidence = Math.min(bestScore / maxPossibleScore, 1);

  return {
    category: bestPattern.categoryId,
    confidence: normalizedConfidence,
    pattern: bestPattern
  };
};

// Instance method to update learning data
contactSchema.methods.updateLearning = function(categoryId, amount, wasCorrect = true) {
  this.learningData.totalCategorizations++;
  
  if (wasCorrect) {
    this.learningData.correctPredictions++;
  } else {
    this.learningData.userCorrections++;
  }
  
  this.learningData.predictionAccuracy = 
    this.learningData.correctPredictions / this.learningData.totalCategorizations;
  
  // Update or create category pattern
  let pattern = this.categoryPatterns.find(p => 
    p.categoryId.toString() === categoryId.toString()
  );
  
  if (!pattern) {
    pattern = {
      categoryId,
      amountRange: { min: amount * 0.8, max: amount * 1.2 },
      frequency: 1,
      confidence: wasCorrect ? 0.6 : 0.4,
      timePatterns: [],
      lastUsed: new Date()
    };
    this.categoryPatterns.push(pattern);
  } else {
    // Update amount range
    pattern.amountRange.min = Math.min(pattern.amountRange.min, amount * 0.8);
    pattern.amountRange.max = Math.max(pattern.amountRange.max, amount * 1.2);
    
    // Update frequency and confidence
    pattern.frequency++;
    if (wasCorrect) {
      pattern.confidence = Math.min(pattern.confidence * 1.1, 0.95);
    } else {
      pattern.confidence = Math.max(pattern.confidence * 0.9, 0.3);
    }
    pattern.lastUsed = new Date();
    
    // Update time patterns
    const transactionDate = new Date();
    const dayOfWeek = transactionDate.getDay();
    const hour = transactionDate.getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else if (hour >= 21 || hour < 6) timeOfDay = 'night';
    
    let timePattern = pattern.timePatterns.find(tp => 
      tp.dayOfWeek === dayOfWeek && tp.timeOfDay === timeOfDay
    );
    
    if (!timePattern) {
      pattern.timePatterns.push({
        dayOfWeek,
        timeOfDay,
        frequency: 1
      });
    } else {
      timePattern.frequency++;
    }
  }
  
  // Update overall confidence score
  this.confidenceScore = this.calculateOverallConfidence();
  this.lastUpdated = new Date();
  
  return this.save();
};

// Instance method to calculate overall confidence
contactSchema.methods.calculateOverallConfidence = function() {
  if (!this.categoryPatterns.length) return 0.5;
  
  const totalFrequency = this.categoryPatterns.reduce((sum, p) => sum + p.frequency, 0);
  const weightedConfidence = this.categoryPatterns.reduce((sum, p) => 
    sum + (p.confidence * p.frequency), 0
  );
  
  const baseConfidence = weightedConfidence / totalFrequency;
  
  // Adjust based on learning accuracy
  const accuracyBonus = this.learningData.predictionAccuracy * 0.2;
  
  return Math.min(baseConfidence + accuracyBonus, 1);
};

// Static method to find or create contact
contactSchema.statics.findOrCreate = async function(userId, name) {
  const normalizedIdentifier = this.normalizeIdentifier(name);
  
  let contact = await this.findOne({
    userId,
    normalizedIdentifier
  });
  
  if (!contact) {
    contact = new this({
      userId,
      name,
      normalizedIdentifier,
      type: this.detectContactType(name)
    });
    await contact.save();
  }
  
  return contact;
};

// Static method to detect contact type
contactSchema.statics.detectContactType = function(name) {
  const businessKeywords = [
    'zomato', 'swiggy', 'uber', 'ola', 'amazon', 'flipkart', 'myntra',
    'paytm', 'phonepe', 'gpay', 'googlepay', 'netflix', 'spotify',
    'hotstar', 'prime', 'youtube', 'instagram', 'facebook', 'twitter',
    'linkedin', 'microsoft', 'apple', 'google', 'samsung', 'xiaomi',
    'oneplus', 'realme', 'vivo', 'oppo', 'nokia', 'motorola',
    'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'pnb', 'bob', 'canara',
    'reliance', 'airtel', 'jio', 'vi', 'bsnl', 'tatasky', 'd2h',
    'bigbasket', 'grofers', 'blinkit', 'zepto', 'swiggyinstamart',
    'dominos', 'pizzahut', 'kfc', 'mcdonalds', 'burgerking',
    'starbucks', 'cafe', 'costa', 'barista', 'chayos'
  ];
  
  const normalizedName = name.toLowerCase();
  
  if (businessKeywords.some(keyword => normalizedName.includes(keyword))) {
    return 'business';
  }
  
  // Check if it's a UPI ID or contains business-like patterns
  if (normalizedName.includes('@') || 
      normalizedName.includes('pay') || 
      normalizedName.includes('bank') ||
      normalizedName.includes('ltd') ||
      normalizedName.includes('pvt') ||
      normalizedName.includes('services')) {
    return 'business';
  }
  
  return 'individual';
};

export default mongoose.model('Contact', contactSchema);
