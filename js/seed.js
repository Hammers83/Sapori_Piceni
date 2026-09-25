// js/seed.js
// Script opzionale da eseguire manualmente in console per popolare il catalogo prodotti su Supabase.

const catalogProducts = [
  { name: "Olive Ascolane Classiche", price: 18.50, description: "Olive verdi denocciolate, carni selezionate, Parmigiano Reggiano e pangrattato.", image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80" },
  { name: "Olive Ascolane al Tartufo", price: 22.00, description: "Olive verdi denocciolate, carni selezionate, tartufo estivo macinato, Parmigiano Reggiano e pangrattato.", image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80" },
  { name: "Olive Vegetariane", price: 19.00, description: "Olive con Asiago, Emmental, Pecorino e salsa di tartufo.", image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80" },
  { name: "Cremini all'Ascolana", price: 14.00, description: "Cubetti di crema pasticcera con limone.", image_url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80" },
  { name: "Cremino al Cioccolato", price: 15.00, description: "Cubetti di crema pasticcera al cioccolato fondente al 70%.", image_url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80" },
  { name: "Bastoncini di Formaggio Pecorino Impanato", price: 16.50, description: "Formaggio Pecorino stagionato 20 giorni e pangrattato.", image_url: "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=600&q=80" },
  { name: "Pepite di Formaggio Pecorino Impanato", price: 16.50, description: "Formaggio Pecorino stagionato 20 giorni e pangrattato.", image_url: "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=600&q=80" },
  { name: "Fette di Formaggio Pecorino Impanato", price: 17.00, description: "Formaggio Pecorino stagionato 20 giorni e pangrattato.", image_url: "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=600&q=80" },
  { name: "Straccetti di Pollo", price: 15.50, description: "Straccetti di petti di pollo e pangrattato.", image_url: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80" },
  { name: "Carciofi Infarinati / Impanati", price: 16.00, description: "Carciofi infarinati a mano o impanati con pangrattato.", image_url: "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=600&q=80" },
  { name: "Zucchine Stick Impanate", price: 13.50, description: "Zucchine e pangrattato. Disponibile secondo stagionalità.", image_url: "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=600&q=80" },
  { name: "Saltimbocca Piceno", price: 18.00, description: "Oliva, spalla di maiale e formaggio.", image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80" },
  { name: "Mozzarelline Affumicate", price: 15.00, description: "Mozzarella ciliegina affumicata impanata.", image_url: "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=600&q=80" },
  { name: "Olivotta / Olivotta Mini", price: 19.50, description: "Stesso ripieno dell'oliva ascolana, in formato hamburger o finger food.", image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80" },
  { name: "Jalapeño Ripieno", price: 17.50, description: "Jalapeño ripieno di formaggio spalmabile e impanato. Stagionale.", image_url: "https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=600&q=80" },
  { name: "I Quattro Moschettieri", price: 18.00, description: "Rigatoni farciti con i sughi della tradizione: Amatriciana, Cacio e Pepe, Gricia, Carbonara.", image_url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80" },
  { name: "Mezzelune di Scamorza", price: 16.00, description: "Scamorza affumicata impanata.", image_url: "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?auto=format&fit=crop&w=600&q=80" }
];

async function seedDatabase() {
  const { data, error } = await supabaseClient.from('products').upsert(catalogProducts, { onConflict: 'name' });
  if (error) console.error("Errore inserimento prodotti:", error);
  else console.log("Database popolato con i prodotti del catalogo!", data);
}
