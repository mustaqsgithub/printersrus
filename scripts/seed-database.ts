// Seed script to populate the database with initial data
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
const envResult = config({ path: resolve(process.cwd(), '.env.local') });

// Check if POSTGRES_URL is set
if (!process.env.POSTGRES_URL) {
  console.error('❌ Error: POSTGRES_URL environment variable is not set!');
  console.error('\n📝 Please create a .env.local file in your project root with:');
  console.error('   POSTGRES_URL=your_connection_string');
  console.error('   POSTGRES_PRISMA_URL=your_connection_string');
  console.error('   POSTGRES_URL_NON_POOLING=your_connection_string');
  console.error('\n💡 See SETUP.md or QUICK-START.md for detailed instructions.');
  process.exit(1);
}

import { initDatabase, dbHelpers } from '../lib/database';

// Categories data
const mockCategories = [
  {
    id: '1',
    name: 'Printers',
    slug: 'printers',
    description: 'Professional printers for home and office use',
    image: '',
    parentId: null,
  },
  {
    id: '2',
    name: 'Ink & Toner',
    slug: 'ink-toner',
    description: 'Premium ink cartridges and toner for all printer brands',
    image: '',
    parentId: null,
  },
  {
    id: '3',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Essential printer accessories and supplies',
    image: '',
    parentId: null,
  },
];

// Products data with UK prices and detailed specifications
const mockProducts = [
  {
    id: '1',
    sku: 'HP-LASERJET-M404DN',
    name: 'HP LaserJet Pro M404dn',
    slug: 'hp-laserjet-pro-m404dn',
    description: 'Professional monochrome laser printer with fast duplex printing',
    longDescription: `The HP LaserJet Pro M404dn is a high-performance monochrome laser printer designed for demanding small to medium-sized workgroups.

**Key Features:**
• Print speeds up to 40 pages per minute (A4)
• Automatic two-sided (duplex) printing saves time and paper
• First page out in as fast as 5.6 seconds
• 350-sheet input capacity (250-sheet tray + 100-sheet multipurpose tray)
• Built-in Gigabit Ethernet for network connectivity
• HP JetIntelligence toner cartridges for exceptional quality
• Energy Star® certified for efficiency

**Technical Specifications:**
• Print Resolution: Up to 1200 x 1200 dpi
• Processor: 1.2 GHz
• Memory: 256 MB RAM
• Monthly Duty Cycle: Up to 80,000 pages
• Recommended Monthly Page Volume: 750-4,000 pages
• Connectivity: USB 2.0, Gigabit Ethernet
• Dimensions: 364 x 360 x 280 mm
• Weight: 11.4 kg
• Warranty: 1 year standard, extendable

Ideal for businesses requiring reliable, high-volume black and white printing with professional results.`,
    price: 289.99,
    salePrice: null,
    mainImage: 'https://hp.widen.net/content/nzw0ujdalp/webp/nzw0ujdalp.png?w=800&h=800&fit=crop',
    images: JSON.stringify([
      'https://hp.widen.net/content/j4sk2tw2jr/webp/j4sk2tw2jr.png?w=800&h=800&fit=crop',
      'https://hp.widen.net/content/r9l2t20c1g/webp/r9l2t20c1g.png?w=800&h=800&fit=crop'
    ]),
    brand: 'HP',
    categoryId: '1',
    inStock: true,
    stockQuantity: 15,
    featured: true,
    onSale: false,
    isActive: true,
  },
  {
    id: '2',
    sku: 'CANON-PIXMA-TS9520',
    name: 'Canon PIXMA TS9520',
    slug: 'canon-pixma-ts9520',
    description: 'Premium wireless all-in-one printer with A3 printing capability',
    longDescription: `The Canon PIXMA TS9520 is a versatile wireless all-in-one inkjet printer perfect for creative professionals, photographers, and home offices.

**Key Features:**
• Print stunning borderless photos up to A3+ (329 x 483 mm / 13 x 19 inches)
• 5-colour individual ink system with dedicated photo blue
• 4.3" LCD touchscreen for easy operation
• Print, copy, scan functions all-in-one
• Built-in SD card slot for direct photo printing
• Wireless connectivity: Wi-Fi, AirPrint, Mopria, Google Cloud Print
• Auto 2-sided printing for documents

**Technical Specifications:**
• Print Resolution: Up to 4800 x 1200 dpi
• Print Speed: 15 ipm (black), 10 ipm (colour)
• Scanner: Flatbed with 2400 x 4800 dpi optical resolution
• Paper Capacity: 100 sheets rear tray, 20 sheets front tray
• Ink System: 5 individual ink tanks (PGI-280 PGBK, CLI-281 BK/C/M/Y, CLI-281 PB)
• Connectivity: USB, Wi-Fi, Ethernet
• Dimensions: 437 x 370 x 188 mm
• Weight: 8.3 kg
• Warranty: 1 year standard

Perfect for home photo enthusiasts and creative professionals who demand exceptional photo quality and versatile media handling.`,
    price: 219.99,
    salePrice: 179.99,
    mainImage: 'https://s7d1.scene7.com/is/image/canon/2988C032_TS9520a_3?fmt=webp-alpha&wid=800&hei=800&fit=crop',
    images: JSON.stringify([
      'https://s7d1.scene7.com/is/image/canon/2988C032_TS9520a_4?fmt=webp-alpha&wid=800&hei=800&fit=crop',
      'https://s7d1.scene7.com/is/image/canon/2988C032_TS9520a_7?fmt=webp-alpha&wid=800&hei=800&fit=crop'
    ]),
    brand: 'Canon',
    categoryId: '1',
    inStock: true,
    stockQuantity: 8,
    featured: true,
    onSale: true,
    isActive: true,
  },
  {
    id: '3',
    sku: 'BROTHER-MFC-L3770CDW',
    name: 'Brother MFC-L3770CDW',
    slug: 'brother-mfc-l3770cdw',
    description: 'Professional colour laser all-in-one with advanced features',
    longDescription: `The Brother MFC-L3770CDW is a reliable digital colour all-in-one printer offering exceptional print speeds and low-cost output for busy offices.

**Key Features:**
• Print, copy, scan, and fax in full colour
• Print speeds up to 25 ppm (colour and mono)
• Automatic two-sided printing, copying, scanning, and faxing
• 250-sheet paper capacity with single-sheet manual bypass
• 3.7" colour touchscreen LCD
• Wireless and wired network connectivity
• NFC for easy mobile printing
• Advanced security features including Secure Function Lock 3.0

**Technical Specifications:**
• Print Resolution: Up to 2400 x 600 dpi
• Print Speed: 25 ppm (colour and black)
• Scanner: Automatic Document Feeder (50 sheets), 1200 x 2400 dpi
• Fax: 33.6 Kbps modem speed
• Memory: 512 MB RAM
• Monthly Duty Cycle: Up to 30,000 pages
• Toner Yield: Standard 1,800 pages, High-yield 3,000 pages
• Connectivity: USB 2.0, Gigabit Ethernet, Wi-Fi, NFC
• Dimensions: 410 x 483 x 414 mm
• Weight: 23.5 kg
• Warranty: 3 years standard

Ideal for small to medium businesses requiring fast, reliable colour printing with comprehensive document management features.`,
    price: 379.99,
    salePrice: 329.99,
    mainImage: 'https://www.brother-usa.com/-/media/brother/product-catalog-media/images/2021/04/28/15/39/mfcl3770cdw-front1-min.png?w=800&h=800&fit=crop',
    images: JSON.stringify([
      'https://www.brother-usa.com/-/media/brother/product-catalog-media/images/2020/09/25/16/07/mfcl3770cdw-right1.png?w=800&h=800&fit=crop',
      'https://www.brother-usa.com/-/media/brother/product-catalog-media/images/2020/09/25/16/07/mfcl3770cdw-left1.png?w=800&h=800&fit=crop'
    ]),
    brand: 'Brother',
    categoryId: '1',
    inStock: true,
    stockQuantity: 5,
    featured: true,
    onSale: true,
    isActive: true,
  },
  {
    id: '5',
    sku: 'HP-INK-902XL-BLACK',
    name: 'HP 902XL High Yield Black Ink Cartridge',
    slug: 'hp-902xl-black-ink',
    description: 'Original HP high-yield black ink for exceptional page yield',
    longDescription: `Get more pages and vivid prints with Original HP 902XL high-yield black ink cartridge.

**Key Features:**
• Original HP ink cartridge for guaranteed quality
• High-yield capacity for fewer replacements
• Print up to 825 pages (ISO standard yield)
• Fade-resistant prints that last for decades
• Works seamlessly with HP's Smart App
• Individual cartridge replacement saves money

**Technical Specifications:**
• Cartridge Type: High-yield black pigment ink
• Page Yield: Up to 825 pages (ISO/IEC 24711)
• Compatible Printers: HP OfficeJet Pro 6960, 6962, 6968, 6970, 6975, 6978, 6979
• Ink Drop Volume: 10 picolitres
• Warranty: 1 year limited warranty

**Why Original HP Ink:**
Original HP inks are designed together with your HP printer to deliver reliable, consistent results every time. HP's exclusive ink formulation produces documents with sharp text and rich blacks that resist fading for decades.`,
    price: 34.99,
    salePrice: 29.99,
    mainImage: 'https://hp.widen.net/content/ptspliuqnb/png/ptspliuqnb.png?w=800&h=800&fit=crop',
    images: null,
    brand: 'HP',
    categoryId: '2',
    inStock: true,
    stockQuantity: 45,
    featured: false,
    onSale: true,
    isActive: true,
  },
  {
    id: '6',
    sku: 'CANON-PGI-280-CLI-281',
    name: 'Canon PGI-280 & CLI-281 5-Colour Ink Pack',
    slug: 'canon-pgi-280-cli-281-5-pack',
    description: 'Genuine Canon 5-colour ink pack for brilliant photo quality',
    longDescription: `Get vibrant, long-lasting prints with this genuine Canon 5-colour ink cartridge multipack.

**Package Includes:**
• 1 x PGI-280 Pigment Black ink cartridge
• 1 x CLI-281 Black ink cartridge
• 1 x CLI-281 Cyan ink cartridge
• 1 x CLI-281 Magenta ink cartridge
• 1 x CLI-281 Yellow ink cartridge

**Key Features:**
• ChromaLife100 ink system for beautiful, long-lasting photos
• Pigment black for sharp, crisp text
• Dye-based colour inks for brilliant photo reproduction
• Individual ink tanks - replace only what you need
• Genuine Canon quality and reliability

**Technical Specifications:**
• Cartridge Type: Hybrid ink system (pigment black + dye colours)
• Page Yield:
  - PGI-280 Black: up to 400 pages
  - CLI-281 Colours: up to 260 pages each (ISO/IEC 24711/24712)
• Compatible Printers: Canon PIXMA TR7520, TR7550, TR8520, TR8550, TS6120, TS6150, TS6220, TS6250, TS6320, TS6350, TS8120, TS8150, TS8220, TS8250, TS9120, TS9150, TS9520, TS9550, TS9521C
• Warranty: 1 year limited warranty

**ChromaLife100 System:**
When used with genuine Canon photo paper, the ChromaLife100 system produces beautiful photos that will last up to 100 years when stored in an archival-quality photo album.`,
    price: 64.99,
    salePrice: 54.99,
    mainImage: 'https://s7d1.scene7.com/is/image/canon/2075C006_pgi-280-cli-281-5-color-value-pack_primary?fmt=webp-alpha&wid=800&hei=800&fit=crop',
    images: null,
    brand: 'Canon',
    categoryId: '2',
    inStock: true,
    stockQuantity: 28,
    featured: true,
    onSale: true,
    isActive: true,
  },
  {
    id: '7',
    sku: 'BROTHER-TN760-TONER',
    name: 'Brother TN760 High-Yield Toner Cartridge',
    slug: 'brother-tn760-toner',
    description: 'Genuine Brother high-yield toner for exceptional value',
    longDescription: `Get outstanding print quality and excellent value with the genuine Brother TN760 high-yield toner cartridge.

**Key Features:**
• High-yield capacity for fewer cartridge changes
• Yields approximately 3,000 pages at 5% coverage
• Genuine Brother quality for reliable performance
• Consistent toner distribution for even coverage
• Easy installation and replacement
• Designed to work flawlessly with Brother printers

**Technical Specifications:**
• Cartridge Type: High-yield black toner
• Page Yield: Approximately 3,000 pages at 5% coverage
• Compatible Printers:
  - Brother DCP-L2550DW
  - Brother HL-L2350DW, HL-L2370DW, HL-L2375DW, HL-L2390DW, HL-L2395DW
  - Brother MFC-L2710DW, MFC-L2713DW, MFC-L2715DW, MFC-L2730DW, MFC-L2750DW, MFC-L2750DWXL
• Warranty: 1 year limited warranty

**Why Choose Genuine Brother Toner:**
Genuine Brother toner cartridges are manufactured to the same exacting specifications as your Brother printer. This ensures optimal print quality, reliability, and longevity for both your prints and your printer.

**Value Comparison:**
The high-yield TN760 offers a cost per page of approximately £0.02, making it an economical choice for high-volume printing while maintaining professional quality.`,
    price: 54.99,
    salePrice: null,
    mainImage: 'https://www.brother-usa.com/-/media/brother/product-catalog-media/images/2022/07/07/14/20/09_tn760_cartonfront_091321.png?w=800&h=800&fit=crop',
    images: null,
    brand: 'Brother',
    categoryId: '2',
    inStock: true,
    stockQuantity: 22,
    featured: false,
    onSale: false,
    isActive: true,
  },
  {
    id: '8',
    sku: 'PREMIUM-PHOTO-PAPER-A4',
    name: 'Premium Glossy Photo Paper A4 (100 Sheets)',
    slug: 'premium-photo-paper-a4',
    description: 'Professional-grade glossy photo paper for stunning prints',
    longDescription: `Print lab-quality photos at home with this premium glossy photo paper.

**Key Features:**
• Professional-grade 260gsm heavyweight paper
• Ultra-smooth, instant-dry glossy surface
• Vibrant colours and crisp details
• Water-resistant coating prevents smudges
• Compatible with all inkjet printers
• 100 sheets per pack for great value

**Technical Specifications:**
• Paper Size: A4 (210 x 297 mm / 8.3 x 11.7 inches)
• Paper Weight: 260gsm
• Surface Finish: High-gloss
• Brightness: 98% (ISO)
• Whiteness: Ultra white for maximum colour vibrancy
• Coating: Water-resistant microporous coating
• Drying Time: Instant-dry technology
• Compatibility: All inkjet printers (Canon, Epson, HP, Brother, etc.)
• Sheets per Pack: 100 sheets

**Perfect For:**
• Professional photo printing
• Portfolio presentations
• Marketing materials and brochures
• Photo albums and scrapbooking
• Art reproductions
• Greeting cards and invitations

**Print Settings:**
For best results, select "Photo Paper - Glossy" or "Premium Glossy" in your printer settings. Allow prints to dry for 24 hours before placing in albums or frames for maximum longevity.

**Storage:**
Store in original packaging in a cool, dry place. Keep away from direct sunlight and moisture.`,
    price: 19.99,
    salePrice: 16.99,
    mainImage: 'https://i8.amplience.net/i/epsonemear/new-c13s041624-premium-glossy-photo-paper-a4-50-sheets?w=800&h=800&fit=crop&fmt=auto&img404=missing_product',
    images: null,
    brand: 'Generic',
    categoryId: '3',
    inStock: true,
    stockQuantity: 65,
    featured: false,
    onSale: true,
    isActive: true,
  },
];

async function seedDatabase() {
  console.log('🌱 Seeding database...\n');

  // Initialize database schema
  await initDatabase();

  // Seed categories
  console.log('📦 Seeding categories...');
  for (const category of mockCategories) {
    try {
      // Check if category already exists
      const existingCategory = await dbHelpers.getCategoryBySlug(category.slug);
      
      if (existingCategory) {
        // Update existing category (we'll need to add an updateCategory function or just skip)
        // For now, we'll skip updating categories since they rarely change
        console.log(`  ⊙ Category already exists: ${category.name}`);
      } else {
        // Insert new category
        await dbHelpers.insertCategory(category);
        console.log(`  ✓ Added category: ${category.name}`);
      }
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint') || error.message?.includes('duplicate key')) {
        console.log(`  ⊙ Category already exists: ${category.name}`);
      } else {
        console.error(`  ✗ Error adding category ${category.name}:`, error.message);
      }
    }
  }

  console.log('\n🛍️  Seeding products...');
  for (const product of mockProducts) {
    try {
      // Check if product already exists
      const existingProduct = await dbHelpers.getProductById(product.id);
      
      if (existingProduct) {
        // Update existing product
        await dbHelpers.updateProduct(product.id, {
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          description: product.description,
          long_description: product.longDescription,
          price: product.price,
          sale_price: product.salePrice,
          main_image: product.mainImage,
          images: product.images,
          brand: product.brand,
          category_id: product.categoryId,
          in_stock: product.inStock ? 1 : 0,
          stock_quantity: product.stockQuantity,
          featured: product.featured ? 1 : 0,
          on_sale: product.onSale ? 1 : 0,
          is_active: product.isActive ? 1 : 0,
        });
        console.log(`  ↻ Updated product: ${product.name}`);
      } else {
        // Insert new product
        await dbHelpers.insertProduct({
          id: product.id,
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          description: product.description,
          longDescription: product.longDescription,
          price: product.price,
          salePrice: product.salePrice,
          mainImage: product.mainImage,
          images: product.images,
          brand: product.brand,
          categoryId: product.categoryId,
          inStock: product.inStock,
          stockQuantity: product.stockQuantity,
          featured: product.featured,
          onSale: product.onSale,
          isActive: product.isActive,
        });
        console.log(`  ✓ Added product: ${product.name}`);
      }
    } catch (error: any) {
      console.error(`  ✗ Error processing product ${product.name}:`, error.message);
    }
  }

  // Print summary
  const categories = await dbHelpers.getAllCategories();
  const products = await dbHelpers.getAllProducts();

  console.log('\n📊 Database Summary:');
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Featured Products: ${products.filter((p: any) => p.featured).length}`);
  console.log(`  Sale Products: ${products.filter((p: any) => p.on_sale).length}`);

  console.log('\n✅ Database seeded successfully!\n');
  console.log('💡 You can now start the dev server: npm run dev\n');
}

// Run the seed function
seedDatabase().catch((error) => {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
});
