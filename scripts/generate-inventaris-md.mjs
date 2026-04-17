import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateInventarisMd() {
  console.log('Fetching distributors...');
  const { data: distributors, error: distError } = await supabase
    .from('master_distributor')
    .select('id, nama_pt, is_konsolidasi')
    .eq('is_active', true)
    .order('nama_pt', { ascending: true });

  if (distError) {
    console.error('Error fetching distributors:', distError.message);
    return;
  }

  let markdown = '# 📋 Daftar Inventaris Cathlab Lengkap (Per Distributor)\n\n';
  markdown += `*Terakhir diperbarui: ${new Date().toLocaleString('id-ID')}*\n\n---\n\n`;

  for (const dist of distributors) {
    console.log(`Fetching items for: ${dist.nama_pt}...`);
    
    const { data: items, error: itemError } = await supabase
      .from('distributor_barang')
      .select(`
        master_barang_id,
        lot,
        ukuran,
        ed,
        kategori,
        is_konsolidasi,
        master_barang (nama)
      `)
      .eq('distributor_id', dist.id)
      .order('kategori', { ascending: true });

    if (itemError) {
      console.error(`Error fetching items for ${dist.nama_pt}:`, itemError.message);
      continue;
    }

    if (items.length === 0) continue;

    markdown += `### 🏢 ${dist.nama_pt}\n`;
    markdown += `*Status Default Distributor: ${dist.is_konsolidasi ? 'Konsolidasi' : 'Non-Konsolidasi'}*\n\n`;
    markdown += '| Nama Barang | Kategori | LOT | Ukuran | ED | Status | Stok |\n';
    markdown += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';

    for (const item of items) {
      // Get stock for this item
      const { data: invData } = await supabase
        .from('inventaris')
        .select('stok')
        .eq('master_barang_id', (item as any).master_barang_id)
        .eq('distributor_id', dist.id)
        .eq('lokasi', 'Cathlab')
        .single();

      const stok = invData?.stok ?? 0;
      const status = item.is_konsolidasi ? 'Konsolidasi' : 'Non-Konsolidasi';
      const namaBarang = item.master_barang ? (item.master_barang as any).nama : '-';

      markdown += `| **${namaBarang}** | ${item.kategori || '-'} | ${item.lot || '-'} | ${item.ukuran || '-'} | ${item.ed || '-'} | ${status} | ${stok} |\n`;
    }

    markdown += '\n---\n\n';
  }

  fs.writeFileSync('docs/inventaris_lengkap.md', markdown);
  console.log('Markdown file generated: docs/inventaris_lengkap.md');
}

generateInventarisMd();
