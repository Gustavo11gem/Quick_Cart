// ssed.ts
// fills the database with demo data: npm run seed
// Running it again wipes the demo collections and start fresh, so it's always safe to re-run

import mongoose, { Types } from "mongoose";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { demoCategories, demoProducts, demoUsers } from "./demoData";
import { listProductPhotoId } from "../config/cloudinary";
import { products } from "./products";
import { connectDB } from "../config/database";
import { User } from "../models/User";
import { users } from "./users";
import { PromoCode } from "../models/PromoCode";
import { promoCodes } from "./promoCodes";
import { Order } from "../models/Order";
import { Counter } from "../models/Counter";
import { Review } from "../models/Review";
import { createDemoOrders, demoShoppers } from "./demoOrders";

// STEP 12: The seed command
// seedDatabase() does the work and is exported, so the demo panel can reuse it.
// The bottom of the file run it only when you type npm run seed.

export const seedDatabase = async () => {
  // 1. Empty the collection (both at the same with promise.all)
  await Promise.all([
    Order.deleteMany({}),
    Counter.deleteMany({}), // so the next order is #QC-1042 again
    Review.deleteMany({}),
    PromoCode.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
  ]);

  // 2. Save the categories, then remenber each ones id by slug: "electonics" -> ObjectId(...)
  const savedCategories = await Category.insertMany(demoCategories());
  const categoryIds = new Map<string, Types.ObjectId>(
    savedCategories.map((category) => {
      return [category.slug, category._id] as [string, Types.ObjectId];
    }),
  );

  // 3.   Which photos are on cloudinary?

  const photoIds = await listProductPhotoId();

  // 4. Save the products
  const savedProducts = await Product.insertMany(
    demoProducts(categoryIds, photoIds),
  );

  // 5. Link bundles and related products. product.ts usue names; we swap name for its id
  const productIds = new Map<string, Types.ObjectId>(
    savedProducts.map((product) => {
      return [product.name, product._id];
    }),
  );

  // ["Gold-plated 3.5mm AUX Cable", ...] -> [Object(...),...]
  // A misspelt name stops the sesd with a clear message instead of silently droppimg the link
  const idsFor = (names: string[] | undefined, owner: string) => {
    return (names ?? []).map((name) => {
      const id = productIds.get(name);
      if (!id) {
        throw new Error(
          `"${owner}" links to a product that does'nt exist: "${name}"`,
        );
      }
      return id;
    });
  };

  // bulkwrite sends all 40 updates to mongodb in one trip instead of 40 seperate saves
  await Product.bulkWrite(
    products.map((item) => {
      return {
        updateOne: {
          filter: { _id: productIds.get(item.name) },
          update: {
            $set: {
              bundleProducts: idsFor(item.bundle, item.name),
              relatedProducts: idsFor(item.related, item.name),
            },
          },
        },
      };
    }),
  );

  // 6. Save the demo users. User.create (NOT insertMany): only create/save runs the model's
  // pre("save") hook, which hashes the passwords. insertMany would store them as plain text!
  const savedUsers = await User.create(demoUsers());

  // 7. Save the promo codes (insertMany is fine here: promo codes have no save hooks)
  const savedPromoCodes = await PromoCode.insertMany(promoCodes);

  // 8. Demo orders (STEP 28): 4 more shoppers and ~40 orders, so the dashboard and Order History have data
  const demoOrderCount = await createDemoOrders(savedProducts);

  // 9. A summary for whoever ran the seed
  return {
    promoCodes: savedPromoCodes.length,
    categories: savedCategories.length,
    products: savedProducts.length,
    users: savedUsers.length,
    withoutPhotos: savedProducts
      .filter((product) => product.images.length === 0)
      .map((product) => product.name),
  };
};

// Runs when you type "npm run seed": connect, seed, report, disconnect.

const runSeed = async () => {
  try {
    await connectDB();
    const result = await seedDatabase();

    console.log(
      `Seeded ${result.categories} categories, ${result.products} products, ${result.users} users and ${result.promoCodes} promo codes`,
    );

    if (result.withoutPhotos.length > 0) {
      console.log(
        "These products have no photos:",
        result.withoutPhotos.join(", "),
      );
    }
  } catch (error) {
    console.error("Seed failed:", (error as Error).message);
    process.exitCode = 1; // tells the terminal it failed, without cutting off the disconnect below
  } finally {
    await mongoose.disconnect(); // without this the command would hang and never finish
  }
};

// import.meta.main === module is true only when this file is run directly (npm run seed),
// not when another file imports seedDatabase (the demo panel). so importing never re-seeds by accident.
if (require.main === module) {
  runSeed();
}
