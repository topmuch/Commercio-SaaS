import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCompanyId, getAuthSession, hashPassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // SECURITY: Only super_admin or admin can seed/force-delete data
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const role = (session.user as { role: string }).role
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Accès refusé. Seuls les administrateurs peuvent initialiser les données.' },
        { status: 403 }
      )
    }

    const companyId = await getCompanyId()

    // Check if data already exists
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    if (!force) {
      const existingClients = await db.client.count({ where: { companyId } })
      if (existingClients > 0) {
        return NextResponse.json({ message: 'Données déjà insérées', count: existingClients })
      }
    } else {
      // SECURITY: Clean existing data scoped to this company only
      await db.payment.deleteMany({ where: { companyId } })
      await db.invoiceItem.deleteMany({ where: { invoice: { companyId } } })
      await db.invoice.deleteMany({ where: { companyId } })
      await db.orderItem.deleteMany({ where: { order: { companyId } } })
      await db.order.deleteMany({ where: { companyId } })
      await db.quoteItem.deleteMany({ where: { quote: { companyId } } })
      await db.quote.deleteMany({ where: { companyId } })
      await db.stockMovement.deleteMany({ where: { companyId } })
      await db.visit.deleteMany({ where: { companyId } })
      await db.discussion.deleteMany({ where: { companyId } })
      await db.target.deleteMany({ where: { user: { companyId } } })
      await db.client.deleteMany({ where: { companyId } })
      await db.product.deleteMany({ where: { companyId } })
      await db.category.deleteMany({ where: { companyId } })
      await db.user.deleteMany({ where: { companyId } })
      await db.storeBanner.deleteMany({ where: { companyId } })
      await db.storeSettings.deleteMany({ where: { companyId } })
    }

    // =====================================================
    // Company — Generic Senegalese distribution company
    // =====================================================
    await db.company.upsert({
      where: { email: 'contact@distribusn.com' },
      update: {},
      create: {
        id: companyId,
        name: 'DistribuSN – Distribution Générale',
        email: 'contact@distribusn.com',
        phone: '+221 33 800 00 01',
        address: '45 Avenue Blaise Diagne, Dakar',
        plan: 'enterprise',
      },
    })

    // =====================================================
    // Users — 1 admin, 1 director, 3 commercials
    // =====================================================
    const users = await Promise.all([
      db.user.create({
        data: {
          id: 'usr_1', email: 'mamadou@distribusn.com', password: await hashPassword('password123'), name: 'Mamadou Diallo',
          phone: '+221 77 100 00 01', role: 'admin', companyId,
        },
      }),
      db.user.create({
        data: {
          id: 'usr_2', email: 'fatou@distribusn.com', password: await hashPassword('password123'), name: 'Fatou Sylla',
          phone: '+221 77 100 00 02', role: 'director', companyId,
        },
      }),
      db.user.create({
        data: {
          id: 'usr_3', email: 'ibrahima@distribusn.com', password: await hashPassword('password123'), name: 'Ibrahima Ndiaye',
          phone: '+221 77 100 00 03', role: 'commercial', companyId,
        },
      }),
      db.user.create({
        data: {
          id: 'usr_4', email: 'aissatou@distribusn.com', password: await hashPassword('password123'), name: 'Aissatou Ba',
          phone: '+221 77 100 00 04', role: 'commercial', companyId,
        },
      }),
      db.user.create({
        data: {
          id: 'usr_5', email: 'ousmane@distribusn.com', password: await hashPassword('password123'), name: 'Ousmane Diop',
          phone: '+221 77 100 00 05', role: 'commercial', companyId,
        },
      }),
    ])

    // =====================================================
    // Categories — 8 categories
    // =====================================================
    const categories = await Promise.all([
      db.category.create({ data: { id: 'cat_1', name: 'Boissons', companyId } }),
      db.category.create({ data: { id: 'cat_2', name: 'Alimentation', companyId } }),
      db.category.create({ data: { id: 'cat_3', name: 'Entretien', companyId } }),
      db.category.create({ data: { id: 'cat_4', name: 'Produits Laitiers', companyId } }),
      db.category.create({ data: { id: 'cat_5', name: 'Conserves', companyId } }),
      db.category.create({ data: { id: 'cat_6', name: 'Hygiène', companyId } }),
      db.category.create({ data: { id: 'cat_7', name: 'Jus & Sodas', parentId: 'cat_1', companyId } }),
      db.category.create({ data: { id: 'cat_8', name: 'Eau minérale', parentId: 'cat_1', companyId } }),
    ])

    // =====================================================
    // Products — 17 products, prices in FCFA (500 – 50 000)
    // =====================================================
    const products = await Promise.all([
      db.product.create({ data: { id: 'prod_1', name: 'Coca-Cola 33cl', reference: 'BOI-001', price: 350, resellerPrice: 280, stock: 500, minStock: 50, categoryId: 'cat_7', brand: 'Coca-Cola', image: '/uploads/products/coca-cola-33cl.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_2', name: 'Sprite 33cl', reference: 'BOI-002', price: 350, resellerPrice: 280, stock: 400, minStock: 50, categoryId: 'cat_7', brand: 'Coca-Cola', image: '/uploads/products/sprite-33cl.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_3', name: 'Youki Jus d\'Ananas 1L', reference: 'BOI-003', price: 500, resellerPrice: 400, stock: 300, minStock: 40, categoryId: 'cat_7', brand: 'Youki', image: '/uploads/products/youki-jus-ananas-1l.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_4', name: 'Folli Jus d\'Ananas 1L', reference: 'BOI-004', price: 600, resellerPrice: 480, stock: 250, minStock: 30, categoryId: 'cat_7', brand: 'Folli', image: '/uploads/products/folli-jus-ananas-1l.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_5', name: 'Aqua Terminale 1.5L', reference: 'BOI-005', price: 200, resellerPrice: 150, stock: 1200, minStock: 150, categoryId: 'cat_8', brand: 'Aqua Terminale', image: '/uploads/products/aqua-terminale-1-5l.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_6', name: 'Riz Tatam 25kg', reference: 'ALI-001', price: 16500, resellerPrice: 14500, stock: 200, minStock: 20, categoryId: 'cat_2', brand: 'Tatam', image: '/uploads/products/riz-tatam-25kg.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_7', name: 'Huile de table Djama 5L', reference: 'ALI-002', price: 8500, resellerPrice: 7500, stock: 150, minStock: 15, categoryId: 'cat_2', brand: 'Djama', image: '/uploads/products/huile-djama-5l.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_8', name: 'Café Moulu Kakao 250g', reference: 'ALI-003', price: 2800, resellerPrice: 2300, stock: 250, minStock: 30, categoryId: 'cat_2', brand: 'Kakao', image: null, companyId } }),
      db.product.create({ data: { id: 'prod_9', name: 'Cubes Maggi 12 pcs', reference: 'ALI-004', price: 750, resellerPrice: 600, stock: 400, minStock: 50, categoryId: 'cat_2', brand: 'Maggi', image: '/uploads/products/cubes-maggi-12pcs.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_10', name: 'Kiss Margarine 500g', reference: 'ALI-005', price: 1200, resellerPrice: 950, stock: 350, minStock: 40, categoryId: 'cat_2', brand: 'Kiss', image: '/uploads/products/kiss-margarine-500g.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_11', name: 'Omo Poudre 500g', reference: 'ENT-001', price: 1500, resellerPrice: 1200, stock: 180, minStock: 25, categoryId: 'cat_3', brand: 'Omo', image: null, companyId } }),
      db.product.create({ data: { id: 'prod_12', name: 'Savon de Marseille 400g', reference: 'ENT-002', price: 450, resellerPrice: 350, stock: 300, minStock: 30, categoryId: 'cat_3', brand: 'Marseille', image: '/uploads/products/savon-marseille-400g.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_13', name: 'Yaourt Dolce Gusto pack 6', reference: 'LAIT-001', price: 5000, resellerPrice: 4200, stock: 120, minStock: 15, categoryId: 'cat_4', brand: 'Dolce Gusto', image: '/uploads/products/yaourt-dolce-gusto-pack6.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_14', name: 'Lait UHT Vitalait 1L', reference: 'LAIT-002', price: 750, resellerPrice: 600, stock: 800, minStock: 100, categoryId: 'cat_4', brand: 'Vitalait', image: null, companyId } }),
      db.product.create({ data: { id: 'prod_15', name: 'Sardines John West 125g', reference: 'CON-001', price: 850, resellerPrice: 680, stock: 300, minStock: 30, categoryId: 'cat_5', brand: 'John West', image: '/uploads/products/sardines-john-west-125g.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_16', name: 'Conserve Tomate Mutti 400g', reference: 'CON-002', price: 650, resellerPrice: 520, stock: 250, minStock: 25, categoryId: 'cat_5', brand: 'Mutti', image: '/uploads/products/conserve-tomate-mutti-400g.jpg', companyId } }),
      db.product.create({ data: { id: 'prod_17', name: 'Shampooing Dove 400ml', reference: 'HYG-001', price: 3500, resellerPrice: 2800, stock: 180, minStock: 25, categoryId: 'cat_6', brand: 'Dove', image: null, companyId } }),
    ])

    // =====================================================
    // Clients — 15 clients across Senegalese cities & regions
    //   statuses: lead_rouge, negociation_orange, client_vert
    // =====================================================
    const clients = await Promise.all([
      // --- client_vert (active clients, have purchased) ---
      db.client.create({ data: { id: 'cli_1', companyName: 'SARL Boutique du Coin', contactName: 'Abdoulaye Sow', phone: '+221 77 200 00 01', whatsapp: '+221 77 200 00 01', email: 'boutique.ducoin@orange.sn', address: 'Rue 10, Plateau', city: 'Dakar', region: 'Dakar', latitude: 14.6937, longitude: -17.4441, type: 'boutique', status: 'client_vert', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),
      db.client.create({ data: { id: 'cli_2', companyName: 'Épicerie Chez Omar', contactName: 'Omar Fall', phone: '+221 77 200 00 02', whatsapp: '+221 77 200 00 02', email: 'omar.epicerie@gmail.com', address: 'Avenue Lamine Guèye', city: 'Dakar', region: 'Dakar', latitude: 14.7012, longitude: -17.4520, type: 'boutique', status: 'client_vert', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),
      db.client.create({ data: { id: 'cli_3', companyName: 'Supermarché Sobatex', contactName: 'Aminata Diop', phone: '+221 77 200 00 03', whatsapp: '+221 77 200 00 03', email: 'contact@sobatex.sn', address: 'Route de Rufisque, Liberté 6', city: 'Dakar', region: 'Dakar', latitude: 14.7350, longitude: -17.4600, type: 'supermarche', status: 'client_vert', sector: 'Grande distribution', commercialId: 'usr_4', companyId } }),
      db.client.create({ data: { id: 'cli_4', companyName: 'Grossiste Auchan Express', contactName: 'Cheikh Mbaye', phone: '+221 77 200 00 04', whatsapp: '+221 77 200 00 04', email: 'grossiste.auchan@gmail.com', address: 'Zone Commerciale, Diamniadio', city: 'Rufisque', region: 'Dakar', latitude: 14.7253, longitude: -17.2597, type: 'grossiste', status: 'client_vert', sector: 'Gros', commercialId: 'usr_4', companyId } }),
      db.client.create({ data: { id: 'cli_5', companyName: 'Alimentation Chez Fatou', contactName: 'Fatou Sarr', phone: '+221 77 200 00 05', whatsapp: '+221 77 200 00 05', address: 'Marché Sandaga', city: 'Dakar', region: 'Dakar', latitude: 14.6850, longitude: -17.4430, type: 'boutique', status: 'client_vert', sector: 'Alimentation', commercialId: 'usr_5', companyId } }),
      db.client.create({ data: { id: 'cli_6', companyName: 'Mini Market Liberté', contactName: 'Malick Ndiaye', phone: '+221 77 200 00 06', whatsapp: '+221 77 200 00 06', address: 'Carrefour Liberté', city: 'Pikine', region: 'Dakar', latitude: 14.7645, longitude: -17.3904, type: 'revendeur', status: 'client_vert', sector: 'Alimentation', commercialId: 'usr_5', companyId } }),
      db.client.create({ data: { id: 'cli_7', companyName: 'Épicerie Modou & Fils', contactName: 'Modou Gueye', phone: '+221 77 200 00 07', whatsapp: '+221 77 200 00 07', email: 'modou.fils@gmail.com', address: 'Avenue de la République', city: 'Thiès', region: 'Thiès', latitude: 14.7936, longitude: -16.9371, type: 'boutique', status: 'client_vert', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),
      db.client.create({ data: { id: 'cli_8', companyName: 'Superette le Saloum', contactName: 'Adama Dia', phone: '+221 77 200 00 08', address: 'Centre-ville, Kaolack', city: 'Kaolack', region: 'Kaolack', latitude: 14.1755, longitude: -16.0797, type: 'supermarche', status: 'client_vert', sector: 'Grande distribution', commercialId: 'usr_4', companyId } }),
      db.client.create({ data: { id: 'cli_9', companyName: 'Grossiste Teranga Wholesale', contactName: 'Boubacar Sy', phone: '+221 77 200 00 09', whatsapp: '+221 77 200 00 09', email: 'teranga.wholesale@gmail.com', address: 'Zone Industrielle', city: 'Saint-Louis', region: 'Saint-Louis', latitude: 16.4581, longitude: -16.4530, type: 'grossiste', status: 'client_vert', sector: 'Gros', commercialId: 'usr_5', companyId } }),

      // --- negociation_orange (negotiation in progress, quote sent) ---
      db.client.create({ data: { id: 'cli_10', companyName: 'Boutique Diallo Commerce', contactName: 'Moussa Diallo', phone: '+221 77 200 00 10', whatsapp: '+221 77 200 00 10', address: 'Quartier Médina', city: 'Dakar', region: 'Dakar', latitude: 14.6910, longitude: -17.4390, type: 'boutique', status: 'negociation_orange', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),
      db.client.create({ data: { id: 'cli_11', companyName: 'Dépôt Kolda Distribution', contactName: 'Seydou Bâ', phone: '+221 77 200 00 11', whatsapp: '+221 77 200 00 11', email: 'kolda.depot@gmail.com', address: 'Route Nationale 6', city: 'Kolda', region: 'Kolda', latitude: 12.8894, longitude: -14.9447, type: 'grossiste', status: 'negociation_orange', sector: 'Gros', commercialId: 'usr_4', companyId } }),
      db.client.create({ data: { id: 'cli_12', companyName: 'Épicerie Chez Aminata', contactName: 'Aminata Thioub', phone: '+221 77 200 00 12', address: 'Marché Kermel', city: 'Dakar', region: 'Dakar', latitude: 14.6720, longitude: -17.4370, type: 'boutique', status: 'negociation_orange', sector: 'Alimentation', commercialId: 'usr_5', companyId } }),
      db.client.create({ data: { id: 'cli_13', companyName: 'Alimentation du Quartier', contactName: 'Yacine Diouf', phone: '+221 77 200 00 13', whatsapp: '+221 77 200 00 13', address: 'Quartier Grand Yoff', city: 'Dakar', region: 'Dakar', latitude: 14.7480, longitude: -17.4760, type: 'revendeur', status: 'negociation_orange', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),
      db.client.create({ data: { id: 'cli_14', companyName: 'SARL Sénégal Boissons', contactName: 'Aliou Sow', phone: '+221 77 200 00 14', whatsapp: '+221 77 200 00 14', email: 'sn.boissons@gmail.com', address: 'Route de Ziguinchor', city: 'Ziguinchor', region: 'Ziguinchor', latitude: 12.5833, longitude: -16.2244, type: 'grossiste', status: 'negociation_orange', sector: 'Boissons', commercialId: 'usr_4', companyId } }),

      // --- lead_rouge (prospects, not yet purchased) ---
      db.client.create({ data: { id: 'cli_15', companyName: 'Marché Sandaga Provisions', contactName: 'Ousmane Wade', phone: '+221 77 200 00 15', address: 'Avenue Pompidou', city: 'Dakar', region: 'Dakar', latitude: 14.6830, longitude: -17.4410, type: 'revendeur', status: 'lead_rouge', sector: 'Alimentation', commercialId: 'usr_5', companyId } }),
      db.client.create({ data: { id: 'cli_16', companyName: 'Épicerie de Tambacounda', contactName: 'Demba Cissé', phone: '+221 77 200 00 16', address: 'Avenue du 4 Avril', city: 'Tambacounda', region: 'Tambacounda', latitude: 13.7708, longitude: -13.1942, type: 'boutique', status: 'lead_rouge', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),
      db.client.create({ data: { id: 'cli_17', companyName: 'Superette Diourbel', contactName: 'Mariama Ba', phone: '+221 77 200 00 17', whatsapp: '+221 77 200 00 17', address: 'Place de l\'Indépendance', city: 'Diourbel', region: 'Diourbel', latitude: 14.6500, longitude: -16.2364, type: 'boutique', status: 'lead_rouge', sector: 'Alimentation', commercialId: 'usr_4', companyId } }),
      db.client.create({ data: { id: 'cli_18', companyName: 'Grossiste Louga Market', contactName: 'Biram Diop', phone: '+221 77 200 00 18', address: 'Route de Louga', city: 'Louga', region: 'Louga', latitude: 15.6139, longitude: -16.2181, type: 'grossiste', status: 'lead_rouge', sector: 'Gros', commercialId: 'usr_5', companyId } }),

      // --- Additional clients across ALL 14 regions ---
      // Fatick (was missing)
      db.client.create({ data: { id: 'cli_19', companyName: 'Alimentation Fatick Provisions', contactName: 'Moustapha Seck', phone: '+221 77 300 00 01', whatsapp: '+221 77 300 00 01', address: 'Boulevard Jean-Paul Sartre', city: 'Fatick', region: 'Fatick', latitude: 13.9094, longitude: -16.4131, type: 'boutique', status: 'client_vert', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),
      db.client.create({ data: { id: 'cli_20', companyName: 'Épicerie du Siné-Saloum', contactName: 'Awa Ndong', phone: '+221 77 300 00 02', address: 'Marché central, Foundiougne', city: 'Foundiougne', region: 'Fatick', latitude: 14.1280, longitude: -16.4810, type: 'boutique', status: 'lead_rouge', sector: 'Alimentation', commercialId: 'usr_4', companyId } }),

      // Kaffrine (was missing)
      db.client.create({ data: { id: 'cli_21', companyName: 'Dépôt Kaffrine Distribution', contactName: 'Pape Mbaye', phone: '+221 77 400 00 01', whatsapp: '+221 77 400 00 01', address: 'Route Nationale 7', city: 'Kaffrine', region: 'Kaffrine', latitude: 14.1069, longitude: -15.5414, type: 'grossiste', status: 'negociation_orange', sector: 'Gros', commercialId: 'usr_5', companyId } }),
      db.client.create({ data: { id: 'cli_22', companyName: 'Mini Market Kaffrine', contactName: 'Khady Diop', phone: '+221 77 400 00 02', address: 'Carrefour Kaffrine', city: 'Kaffrine', region: 'Kaffrine', latitude: 14.1100, longitude: -15.5400, type: 'revendeur', status: 'client_vert', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),

      // Sédhiou (was missing)
      db.client.create({ data: { id: 'cli_23', companyName: 'Boutique Sédhiou Marketplace', contactName: 'Ibrahima Sagnane', phone: '+221 77 500 00 01', address: 'Avenue du Port', city: 'Sédhiou', region: 'Sédhiou', latitude: 12.7078, longitude: -15.5589, type: 'boutique', status: 'negociation_orange', sector: 'Alimentation', commercialId: 'usr_4', companyId } }),
      db.client.create({ data: { id: 'cli_24', companyName: 'Grossiste Casamance Sud', contactName: 'Abdoulaye Badji', phone: '+221 77 500 00 02', whatsapp: '+221 77 500 00 02', address: 'Route de Kolda', city: 'Sédhiou', region: 'Sédhiou', latitude: 12.7100, longitude: -15.5560, type: 'grossiste', status: 'lead_rouge', sector: 'Gros', commercialId: 'usr_5', companyId } }),

      // Kédougou (was missing)
      db.client.create({ data: { id: 'cli_25', companyName: 'Épicerie Kédougou Provisions', contactName: 'Mamadou Camara', phone: '+221 77 600 00 01', address: 'Centre-ville', city: 'Kédougou', region: 'Kédougou', latitude: 12.5564, longitude: -12.1733, type: 'boutique', status: 'lead_rouge', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),

      // Matam (was missing)
      db.client.create({ data: { id: 'cli_26', companyName: 'Superette Matam Express', contactName: 'Doudou Sow', phone: '+221 77 700 00 01', whatsapp: '+221 77 700 00 01', address: 'Route du Fleuve', city: 'Matam', region: 'Matam', latitude: 15.6581, longitude: -13.2978, type: 'supermarche', status: 'negociation_orange', sector: 'Grande distribution', commercialId: 'usr_4', companyId } }),
      db.client.create({ data: { id: 'cli_27', companyName: 'Grossiste Ferlo', contactName: 'Samba Ba', phone: '+221 77 700 00 02', address: 'Route de Louga', city: 'Matam', region: 'Matam', latitude: 15.6600, longitude: -13.3000, type: 'grossiste', status: 'client_vert', sector: 'Gros', commercialId: 'usr_5', companyId } }),

      // Extra Dakar clients for density
      db.client.create({ data: { id: 'cli_28', companyName: 'Supermarché Auchan Plateau', contactName: 'Rama Ndiaye', phone: '+221 77 800 00 01', whatsapp: '+221 77 800 00 01', email: 'auchan.plateau@sn.com', address: 'Boulevard de la République', city: 'Dakar', region: 'Dakar', latitude: 14.6680, longitude: -17.4320, type: 'supermarche', status: 'client_vert', sector: 'Grande distribution', commercialId: 'usr_3', companyId } }),
      db.client.create({ data: { id: 'cli_29', companyName: 'Épicerie Mermoz Alimentation', contactName: 'Cheikh Anta Diop', phone: '+221 77 800 00 02', address: 'Avenue Pasteur, Mermoz', city: 'Dakar', region: 'Dakar', latitude: 14.6950, longitude: -17.4650, type: 'boutique', status: 'client_vert', sector: 'Alimentation', commercialId: 'usr_4', companyId } }),
      db.client.create({ data: { id: 'cli_30', companyName: 'Dakar Distribution Services', contactName: 'Souleymane Diallo', phone: '+221 77 800 00 03', whatsapp: '+221 77 800 00 03', address: 'Zone Industrielle, Bargny', city: 'Rufisque', region: 'Dakar', latitude: 14.7400, longitude: -17.2400, type: 'grossiste', status: 'client_vert', sector: 'Gros', commercialId: 'usr_5', companyId } }),

      // Extra Thiès clients
      db.client.create({ data: { id: 'cli_31', companyName: 'Boutique Tivaouane Services', contactName: 'Moussa Thiam', phone: '+221 77 900 00 01', address: 'Place du Marché, Tivaouane', city: 'Tivaouane', region: 'Thiès', latitude: 14.7794, longitude: -16.9467, type: 'boutique', status: 'negociation_orange', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),

      // Extra Saint-Louis clients
      db.client.create({ data: { id: 'cli_32', companyName: 'Supermarché Ndioum du Nord', contactName: 'Aminata Sow', phone: '+221 77 100 01 01', whatsapp: '+221 77 100 01 01', address: 'Avenue André Gide', city: 'Saint-Louis', region: 'Saint-Louis', latitude: 16.4530, longitude: -16.4630, type: 'supermarche', status: 'client_vert', sector: 'Grande distribution', commercialId: 'usr_4', companyId } }),

      // Extra Kaolack clients
      db.client.create({ data: { id: 'cli_33', companyName: 'Grossiste Saloum King', contactName: 'Omar Ndiaye', phone: '+221 77 100 02 01', address: 'Route Nationale 4', city: 'Kaolack', region: 'Kaolack', latitude: 14.1820, longitude: -16.0850, type: 'grossiste', status: 'client_vert', sector: 'Gros', commercialId: 'usr_5', companyId } }),

      // Extra Ziguinchor clients
      db.client.create({ data: { id: 'cli_34', companyName: 'Boutique Casamance Provisions', contactName: 'Jean Mendy', phone: '+221 77 100 03 01', whatsapp: '+221 77 100 03 01', address: 'Avenue de la Resistance', city: 'Ziguinchor', region: 'Ziguinchor', latitude: 12.5800, longitude: -16.2300, type: 'boutique', status: 'negociation_orange', sector: 'Alimentation', commercialId: 'usr_3', companyId } }),
    ])

    // =====================================================
    // Orders — 25 orders (totals in FCFA)
    // =====================================================
    const statuses = ['new', 'validated', 'preparation', 'shipped', 'delivered']
    for (let i = 1; i <= 25; i++) {
      const clientIdx = (i - 1) % clients.length
      const commercialIdx = (i - 1) % 3 + 2 // usr_3, usr_4, usr_5
      const total = Math.round((Math.random() * 2000000 + 100000) * 100) / 100
      const status = statuses[i % statuses.length]
      const date = new Date()
      date.setDate(date.getDate() - Math.floor(Math.random() * 30))

      await db.order.create({
        data: {
          id: `ord_${i}`,
          number: `CMD-2024-${String(i).padStart(4, '0')}`,
          status,
          total,
          discount: Math.random() > 0.7 ? Math.round(total * 0.05 * 100) / 100 : 0,
          tax: 0, // FCFA transactions in Senegal are typically tax-inclusive
          clientId: clients[clientIdx].id,
          commercialId: users[commercialIdx].id,
          companyId,
          createdAt: date,
          items: {
            create: [
              {
                productId: products[Math.floor(Math.random() * products.length)].id,
                quantity: Math.floor(Math.random() * 50 + 5),
                unitPrice: Math.round(Math.random() * 5000 + 350),
                totalPrice: Math.round(Math.random() * 200000 + 15000),
              },
              {
                productId: products[Math.floor(Math.random() * products.length)].id,
                quantity: Math.floor(Math.random() * 30 + 3),
                unitPrice: Math.round(Math.random() * 3000 + 200),
                totalPrice: Math.round(Math.random() * 100000 + 8000),
              },
            ],
          },
        },
      })
    }

    // =====================================================
    // Quotes — 15 quotes
    // =====================================================
    const quoteStatuses = ['draft', 'sent', 'accepted', 'refused']
    for (let i = 1; i <= 15; i++) {
      const clientIdx = (i - 1) % clients.length
      const commercialIdx = (i - 1) % 3 + 2
      const total = Math.round((Math.random() * 1500000 + 80000) * 100) / 100

      await db.quote.create({
        data: {
          id: `quo_${i}`,
          number: `DEV-2024-${String(i).padStart(4, '0')}`,
          status: quoteStatuses[i % quoteStatuses.length],
          total,
          discount: Math.random() > 0.7 ? Math.round(total * 0.05 * 100) / 100 : 0,
          tax: 0,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: clients[clientIdx].id,
          commercialId: users[commercialIdx].id,
          companyId,
          items: {
            create: [
              {
                productId: products[Math.floor(Math.random() * products.length)].id,
                quantity: Math.floor(Math.random() * 40 + 5),
                unitPrice: Math.round(Math.random() * 4000 + 350),
                totalPrice: Math.round(Math.random() * 150000 + 10000),
              },
            ],
          },
        },
      })
    }

    // =====================================================
    // Invoices — 15 invoices
    // =====================================================
    const invStatuses = ['paid', 'partially_paid', 'unpaid', 'overdue']
    for (let i = 1; i <= 15; i++) {
      const clientIdx = (i - 1) % clients.length
      const commercialIdx = (i - 1) % 3 + 2
      const total = Math.round((Math.random() * 2500000 + 100000) * 100) / 100
      const status = invStatuses[i % invStatuses.length]

      await db.invoice.create({
        data: {
          id: `inv_${i}`,
          number: `FAC-2024-${String(i).padStart(4, '0')}`,
          status,
          total,
          paid: status === 'paid' ? total : status === 'partially_paid' ? Math.round(total * 0.6) : 0,
          discount: 0,
          tax: 0,
          dueDate: new Date(Date.now() + (i % 3 === 0 ? -5 : 30) * 24 * 60 * 60 * 1000),
          clientId: clients[clientIdx].id,
          commercialId: users[commercialIdx].id,
          companyId,
          items: {
            create: [
              {
                productId: products[Math.floor(Math.random() * products.length)].id,
                quantity: Math.floor(Math.random() * 50 + 5),
                unitPrice: Math.round(Math.random() * 5000 + 350),
                totalPrice: Math.round(Math.random() * 200000 + 15000),
              },
            ],
          },
          payments: status !== 'unpaid' ? {
            create: {
              amount: status === 'paid' ? total : Math.round(total * 0.6),
              method: ['cash', 'mobile_payment', 'bank_transfer'][i % 3],
              status: 'completed',
              clientId: clients[clientIdx].id,
              companyId,
            },
          } : undefined,
        },
      })
    }

    // =====================================================
    // Stock Movements — 25 entries
    // =====================================================
    const movementReasons: Record<number, string> = {
      0: 'Livraison CMD-2024-0003',
      1: 'Réception fournisseur',
      2: 'Correction inventaire',
    }
    for (let i = 1; i <= 25; i++) {
      const moveType = (['entry', 'exit', 'adjustment'] as const)[i % 3]
      await db.stockMovement.create({
        data: {
          id: `stm_${i}`,
          type: moveType,
          quantity: Math.floor(Math.random() * 100 + 10) * (moveType === 'exit' ? -1 : 1),
          reason: movementReasons[i % 3],
          productId: products[Math.floor(Math.random() * products.length)].id,
          companyId,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        },
      })
    }

    // =====================================================
    // Visits — 20 visits
    // =====================================================
    const visitNotes = [
      'Client satisfait, commande prévue la semaine prochaine.',
      'Appel de suivi devis DEV-2024-0005.',
      'Prospect intéressé par les produits Youki et Folli.',
      'Visite de prise de commande — 3 produits commandés.',
      'Client demande une réduction sur les grosses commandes.',
      'Rendez-vous reporté au lundi suivant.',
      'Nouveau prospect rencontré au marché Sandaga.',
      'Livraison retardée, client informé.',
    ]
    for (let i = 1; i <= 20; i++) {
      const visitType = (['visit', 'call', 'note'] as const)[i % 3]
      await db.visit.create({
        data: {
          id: `vis_${i}`,
          type: visitType,
          status: (['planned', 'completed', 'completed'] as const)[i % 3],
          notes: visitNotes[i % visitNotes.length],
          latitude: 14.6937 + (Math.random() - 0.5) * 2,
          longitude: -17.4441 + (Math.random() - 0.5) * 4,
          clientId: clients[(i - 1) % clients.length].id,
          commercialId: users[((i % 3) + 2) % 5]?.id || users[2].id,
          companyId,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        },
      })
    }

    // =====================================================
    // Discussions — 20 messages
    // =====================================================
    const discussionTypes = ['message', 'call', 'note', 'whatsapp']
    const messages = [
      'Bonjour, pouvez-vous me confirmer la livraison de demain ?',
      'Votre commande CMD-2024-0015 a été expédiée.',
      'Merci pour le devis, je vais l\'étudier avec mon associé.',
      'N\'oubliez pas la promotion sur les boissons Youki ce mois-ci.',
      'Le paiement de la facture FAC-2024-0003 a été effectué via Orange Money.',
      'Est-ce que le riz Tatam 25kg est en stock ?',
      'Je souhaite passer une commande pour 50 cartons de Coca-Cola.',
      'Le prix du Kiss Margarine a changé, voici le nouveau tarif.',
      'Livraison prévue samedi matin à Pikine.',
      'Merci, à la prochaine !',
    ]
    for (let i = 1; i <= 20; i++) {
      await db.discussion.create({
        data: {
          id: `dis_${i}`,
          type: discussionTypes[i % 4],
          content: messages[i % messages.length],
          direction: i % 2 === 0 ? 'incoming' : 'outgoing',
          clientId: clients[(i - 1) % clients.length].id,
          commercialId: users[((i % 3) + 2) % 5]?.id || users[2].id,
          companyId,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
        },
      })
    }

    // =====================================================
    // Targets — Revenue & client targets for commercials
    // =====================================================
    await db.target.createMany({
      data: [
        // Revenue targets (in FCFA)
        { id: 'tgt_1', type: 'revenue', value: 5000000, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 3850000, userId: 'usr_3' },
        { id: 'tgt_2', type: 'revenue', value: 4500000, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 3200000, userId: 'usr_4' },
        { id: 'tgt_3', type: 'revenue', value: 4000000, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 4100000, userId: 'usr_5' },
        // Client acquisition targets
        { id: 'tgt_4', type: 'clients', value: 20, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 15, userId: 'usr_3' },
        { id: 'tgt_5', type: 'clients', value: 18, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 12, userId: 'usr_4' },
        { id: 'tgt_6', type: 'clients', value: 15, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 16, userId: 'usr_5' },
        // Visit targets
        { id: 'tgt_7', type: 'visits', value: 60, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 48, userId: 'usr_3' },
        { id: 'tgt_8', type: 'visits', value: 55, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 40, userId: 'usr_4' },
        { id: 'tgt_9', type: 'visits', value: 50, period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'), achieved: 52, userId: 'usr_5' },
      ],
    })

    // Store Settings for public boutique
    await db.storeSettings.upsert({
      where: { companyId },
      update: {},
      create: {
        companyId,
        whatsappNumber: '+221 77 100 00 01',
        storeTitle: 'DistribuSN Boutique',
        storeDescription: 'Votre distributeur de confiance au Sénégal. Boissons, alimentation, entretien et plus.',
        currency: 'CFA',
        isActive: true,
        publicSlug: 'distribusn',
        logoUrl: null,
        primaryColor: '#10B981',
      },
    })

    // Banners for public boutique
    await db.storeBanner.createMany({
      data: [
        {
          companyId,
          imageUrl: '/uploads/boutique/promo-boissons.jpg',
          title: 'Promo Spéciale !',
          subtitle: '-15% sur toutes les boissons ce mois-ci',
          displayOrder: 0,
          isActive: true,
          startDate: new Date('2025-01-01'),
        },
        {
          companyId,
          imageUrl: '/uploads/boutique/nouveautes.jpg',
          title: 'Nouveautés',
          subtitle: 'Découvrez nos nouveaux produits alimentaires',
          displayOrder: 1,
          isActive: true,
          startDate: new Date('2025-01-01'),
        },
        {
          companyId,
          imageUrl: '/uploads/boutique/livraison.jpg',
          title: 'Livraison Gratuite',
          subtitle: 'À partir de 50 000 FCFA de commande',
          displayOrder: 2,
          isActive: true,
          startDate: new Date('2025-01-01'),
        },
      ],
    })

    return NextResponse.json({
      message: 'Base de données peuplée avec succès (Sénégal)',
      clients: clients.length,
      products: products.length,
      categories: categories.length,
      users: users.length,
      banners: 3,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const clients = await db.client.count()
    const products = await db.product.count()
    const orders = await db.order.count()
    return NextResponse.json({ clients, products, orders })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
