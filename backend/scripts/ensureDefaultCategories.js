import dotenv from 'dotenv';
import Category from '../models/Category.js';
import { defaultCategories } from '../utils/categorizer.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const ensureDefaultCategories = async () => {
  try {
    console.log('🔍 Ensuring default categories exist...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Check existing categories
    const existingCategories = await Category.find({ isDefault: true });
    console.log(`📂 Found ${existingCategories.length} existing default categories`);
    
    // Create missing default categories
    let createdCount = 0;
    for (const defaultCat of defaultCategories) {
      const exists = existingCategories.find(cat => cat.name === defaultCat.name);
      
      if (!exists) {
        await Category.create({
          name: defaultCat.name,
          icon: defaultCat.icon,
          color: defaultCat.color,
          keywords: defaultCat.keywords,
          isDefault: true,
        });
        console.log(`✅ Created default category: ${defaultCat.name}`);
        createdCount++;
      } else {
        // Update keywords if they're different
        if (JSON.stringify(exists.keywords) !== JSON.stringify(defaultCat.keywords)) {
          await Category.findByIdAndUpdate(exists._id, {
            keywords: defaultCat.keywords,
          });
          console.log(`🔄 Updated keywords for: ${defaultCat.name}`);
        }
      }
    }
    
    // Verify all categories
    const allCategories = await Category.find({ isDefault: true });
    console.log(`\n📊 All default categories (${allCategories.length}):`);
    allCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.icon}) - ${cat.keywords.length} keywords`);
    });
    
    console.log(`\n✅ Default categories ensured! Created: ${createdCount}`);
    
  } catch (error) {
    console.error('❌ Failed to ensure default categories:', error);
  } finally {
    process.exit(0);
  }
};

ensureDefaultCategories();
